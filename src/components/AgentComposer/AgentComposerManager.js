export { AgentComposerCanvas } from './Canvas.jsx';
export { ProcessNode, TriggerNode, ActionNode } from './nodes/index.js';
export { AgentRunner, createAgentRunner } from './execution/AgentRunner.js';
export * from './utils/graphHelpers.js';
export * from './templates/index.js';

import { getState, setState } from '../../state.js';
import { saveToVault, loadFromVault } from '../../modules/memory/MemoryVault.js';

const AGENT_COMPOSER_KEY = 'aoprism_current_agent';
const AUTO_SAVE_KEY = 'aoprism_agent_autosave';

export class AgentComposerManager {
  constructor() {
    this.currentAgent = null;
    this.isRunning = false;
    this.autoSaveInterval = null;
  }

  initialize() {
    const state = getState();
    setState({
      ...state,
      agentComposerOpen: false,
      currentAgent: null,
      agentNodes: [],
      agentEdges: [],
      agentRunning: false,
      agentResults: null,
    });

    this.setupEventListeners();
    this.loadAutoSave();
  }

  setupEventListeners() {
    window.addEventListener('aoprism-agent-save', (e) => {
      this.saveAgent(e.detail);
    });

    window.addEventListener('aoprism-agent-load', (e) => {
      this.loadAgent(e.detail?.id);
    });

    window.addEventListener('aoprism-agent-run', () => {
      this.runAgent();
    });

    window.addEventListener('aoprism-agent-stop', () => {
      this.stopAgent();
    });
  }

  open() {
    const state = getState();
    setState({ ...state, agentComposerOpen: true });
    window.dispatchEvent(new CustomEvent('aoprism-module-opened', { detail: { module: 'agent-composer' } }));
  }

  close() {
    const state = getState();
    setState({ ...state, agentComposerOpen: false });
  }

  createNewAgent(name = 'Untitled Agent') {
    this.currentAgent = {
      id: `agent-${Date.now()}`,
      name,
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const state = getState();
    setState({
      ...state,
      currentAgent: this.currentAgent,
      agentNodes: [],
      agentEdges: [],
      agentResults: null,
    });

    return this.currentAgent;
  }

  loadTemplate(templateId) {
    const { getTemplate } = require('./templates/index.js');
    const template = getTemplate(templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    this.currentAgent = {
      id: `agent-${Date.now()}`,
      name: template.name,
      description: template.description,
      nodes: JSON.parse(JSON.stringify(template.nodes)),
      edges: JSON.parse(JSON.stringify(template.edges)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemplate: true,
      templateId,
    };

    const state = getState();
    setState({
      ...state,
      currentAgent: this.currentAgent,
      agentNodes: this.currentAgent.nodes,
      agentEdges: this.currentAgent.edges,
    });

    return this.currentAgent;
  }

  updateAgent(nodes, edges) {
    if (!this.currentAgent) {
      this.createNewAgent();
    }

    this.currentAgent.nodes = nodes;
    this.currentAgent.edges = edges;
    this.currentAgent.updatedAt = new Date().toISOString();

    const state = getState();
    setState({
      ...state,
      agentNodes: nodes,
      agentEdges: edges,
    });
  }

  async saveAgent(agent = null) {
    const agentToSave = agent || this.currentAgent;
    if (!agentToSave) {
      throw new Error('No agent to save');
    }

    try {
      await saveToVault(AGENT_COMPOSER_KEY, agentToSave);
      this.saveAutoSave(agentToSave);

      window.dispatchEvent(new CustomEvent('aoprism-agent-saved', {
        detail: { agent: agentToSave }
      }));

      return agentToSave;
    } catch (error) {
      console.error('Failed to save agent:', error);
      throw error;
    }
  }

  async loadAgent(agentId = null) {
    try {
      let agent;

      if (agentId) {
        const saved = await loadFromVault(AGENT_COMPOSER_KEY);
        if (saved && saved.id === agentId) {
          agent = saved;
        }
      } else {
        agent = await loadFromVault(AGENT_COMPOSER_KEY);
      }

      if (agent) {
        this.currentAgent = agent;

        const state = getState();
        setState({
          ...state,
          currentAgent: agent,
          agentNodes: agent.nodes || [],
          agentEdges: agent.edges || [],
        });

        return agent;
      }

      return null;
    } catch (error) {
      console.error('Failed to load agent:', error);
      return null;
    }
  }

  saveAutoSave(agent) {
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
        agent,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  }

  loadAutoSave() {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const { agent, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < 3600000) {
          return agent;
        }
      }
    } catch (e) {
      console.warn('Load auto-save failed:', e);
    }
    return null;
  }

  enableAutoSave(intervalMs = 30000) {
    this.disableAutoSave();

    this.autoSaveInterval = setInterval(() => {
      if (this.currentAgent) {
        this.saveAutoSave(this.currentAgent);
      }
    }, intervalMs);
  }

  disableAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  async runAgent() {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    const state = getState();
    const nodes = state.agentNodes || [];
    const edges = state.agentEdges || [];

    if (nodes.length === 0) {
      throw new Error('No nodes to execute');
    }

    this.isRunning = true;

    setState({
      ...getState(),
      agentRunning: true,
      agentResults: null,
    });

    const { AgentRunner } = await import('./execution/AgentRunner.js');

    const runner = new AgentRunner(nodes, edges, state.jwk, {
      onNodeStart: (nodeInfo) => {
        this.updateNodeStatus(nodeInfo.nodeId, 'running');
        window.dispatchEvent(new CustomEvent('aoprism-agent-node-start', { detail: nodeInfo }));
      },
      onNodeComplete: (result) => {
        this.updateNodeStatus(result.nodeId, 'success');
        window.dispatchEvent(new CustomEvent('aoprism-agent-node-complete', { detail: result }));
      },
      onNodeError: (error) => {
        this.updateNodeStatus(error.nodeId, 'error');
        window.dispatchEvent(new CustomEvent('aoprism-agent-node-error', { detail: error }));
      },
      onComplete: (summary) => {
        window.dispatchEvent(new CustomEvent('aoprism-agent-complete', { detail: summary }));
      },
    });

    try {
      const results = await runner.execute();

      setState({
        ...getState(),
        agentRunning: false,
        agentResults: results,
      });

      this.isRunning = false;
      return results;
    } catch (error) {
      this.isRunning = false;

      setState({
        ...getState(),
        agentRunning: false,
        agentResults: { error: error.message },
      });

      throw error;
    }
  }

  stopAgent() {
    if (!this.isRunning) return;

    this.runner?.stop();
    this.isRunning = false;

    const state = getState();
    setState({
      ...state,
      agentRunning: false,
    });

    window.dispatchEvent(new CustomEvent('aoprism-agent-stopped'));
  }

  updateNodeStatus(nodeId, status) {
    const state = getState();
    const nodes = state.agentNodes || [];

    const updatedNodes = nodes.map((n) => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, status } };
      }
      return n;
    });

    setState({
      ...state,
      agentNodes: updatedNodes,
    });
  }

  exportToLua() {
    const state = getState();
    const nodes = state.agentNodes || [];
    const edges = state.agentEdges || [];

    let lua = `-- Generated by AOPRISM Agent Composer\n`;
    lua += `-- Agent: ${this.currentAgent?.name || 'Untitled'}\n`;
    lua += `-- Exported: ${new Date().toISOString()}\n\n`;

    lua += `-- Node Configuration\n`;
    lua += `local AgentConfig = {\n`;
    lua += `  nodes = ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, data: n.data })), null, 2).replace(/\n/g, '\n  ')},\n`;
    lua += `  edges = ${JSON.stringify(edges, null, 2).replace(/\n/g, '\n  ')},\n`;
    lua += `}\n\n`;

    lua += `-- Agent Handlers\n`;
    lua += `Handlers.add("agent_trigger", function(msg)\n`;
    lua += `  return msg.Tags.Action == "Trigger"\n`;
    lua += `end, function(msg)\n`;
    lua += `  -- Agent execution logic here\n`;
    lua += `  return { status = "executed", agent = "${this.currentAgent?.name || 'unknown'}" }\n`;
    lua += `end)\n`;

    return lua;
  }

  destroy() {
    this.disableAutoSave();
    this.stopAgent();
    this.currentAgent = null;
  }
}

export const agentComposer = new AgentComposerManager();
export default agentComposer;
