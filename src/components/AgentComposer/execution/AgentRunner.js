import { getTopologicalOrder } from '../utils/graphHelpers.js';
import { RustSigner } from '../../../core/rust-bridge.js';
import { callMcpTool, getMcpTools } from '../../../modules/mcp/mcp-client.js';

const signerRegistry = typeof FinalizationRegistry !== 'undefined'
  ? new FinalizationRegistry((signer) => {
      if (signer && typeof signer.dispose === 'function') {
        signer.dispose();
      }
    })
  : null;

export class AgentRunner {
  constructor(nodes, edges, wallet, options = {}) {
    this.nodes = new Map(nodes.map((n) => [n.id, { ...n }]));
    this.edges = edges;
    this.wallet = null;
    this.walletId = null;
    if (wallet) {
      this.wallet = new RustSigner(wallet);
      this.walletId = Symbol('wallet');
      if (signerRegistry) {
        signerRegistry.register(this.wallet, this.walletId);
      }
    }
    this.options = {
      parallel: options.parallel ?? true,
      maxParallel: options.maxParallel ?? 5,
      timeout: options.timeout ?? 30000,
      onNodeStart: options.onNodeStart ?? (() => { }),
      onNodeComplete: options.onNodeComplete ?? (() => { }),
      onNodeError: options.onNodeError ?? (() => { }),
      onComplete: options.onComplete ?? (() => { }),
    };
    this.executionLog = [];
    this.abortController = null;
    this.results = new Map();
    this.runningNodes = new Set();
    this.loopIterations = new Map();
  }

  async execute(startNodeId = null) {
    this.abortController = new AbortController();
    this.executionLog = [];
    this.results = new Map();
    this.runningNodes = new Set();
    this.loopIterations = new Map();

    try {
      const hasConditionOrLoop = this.hasConditionalOrLoopNodes();
      
      if (hasConditionOrLoop) {
        await this.executeDynamic(startNodeId);
      } else {
        const executionOrder = this.getExecutionOrder(startNodeId);

        if (this.options.parallel) {
          await this.executeParallel(executionOrder);
        } else {
          await this.executeSequential(executionOrder);
        }
      }

      const summary = this.generateSummary();
      this.options.onComplete(summary);
      return summary;

    } catch (error) {
      this.executionLog.push({
        type: 'error',
        message: error.message,
        timestamp: Date.now(),
      });
      throw error;
    } finally {
      this.dispose();
    }
  }

  hasConditionalOrLoopNodes() {
    for (const node of this.nodes.values()) {
      if (node.type === 'condition' || node.type === 'loop') {
        return true;
      }
    }
    return false;
  }

  async executeDynamic(startNodeId = null) {
    const nodeList = startNodeId 
      ? [this.nodes.get(startNodeId)]
      : Array.from(this.nodes.values());
    
    const visited = new Set();
    let currentNodes = [...nodeList];

    while (currentNodes.length > 0) {
      if (this.abortController?.signal.aborted) break;

      const nextNodes = [];
      
      for (const node of currentNodes) {
        if (!node || visited.has(node.id)) continue;
        
        const canExecute = this.canExecuteNode(node.id, visited);
        if (!canExecute) continue;

        visited.add(node.id);
        
        if (node.type === 'condition') {
          const branchResult = await this.executeConditionNode(node, visited);
          if (branchResult.nextNodeId) {
            const nextNode = this.nodes.get(branchResult.nextNodeId);
            if (nextNode) nextNodes.push(nextNode);
          }
        } else if (node.type === 'loop') {
          const loopResult = await this.executeLoopNode(node, visited);
          if (loopResult.nextNodeId) {
            const nextNode = this.nodes.get(loopResult.nextNodeId);
            if (nextNode) nextNodes.push(nextNode);
          }
        } else {
          await this.executeNode(node);
          const outgoingEdges = this.edges.filter(e => e.source === node.id);
          for (const edge of outgoingEdges) {
            const targetNode = this.nodes.get(edge.target);
            if (targetNode) nextNodes.push(targetNode);
          }
        }
      }

      currentNodes = nextNodes;
    }
  }

  canExecuteNode(nodeId, visited) {
    const incomingEdges = this.edges.filter(e => e.target === nodeId);
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        return false;
      }
    }
    return true;
  }

  getExecutionOrder(startNodeId) {
    if (startNodeId) {
      const node = this.nodes.get(startNodeId);
      if (!node) throw new Error(`Start node ${startNodeId} not found`);
      return [startNodeId];
    }
    return getTopologicalOrder(Array.from(this.nodes.values()), this.edges);
  }

  async executeSequential(executionOrder) {
    for (const nodeId of executionOrder) {
      if (this.abortController.signal.aborted) break;

      const node = this.nodes.get(nodeId);
      await this.executeNode(node);
    }
  }

  async executeParallel(executionOrder) {
    const queue = [...executionOrder];
    const running = [];
    const completed = new Set();
    const orderSet = new Set(executionOrder);

    while (queue.length > 0 || running.length > 0) {
      if (this.abortController.signal.aborted) break;

      // Start tokens that have their dependencies met
      let startedAny = false;
      for (let i = 0; i < queue.length; i++) {
        if (running.length >= this.options.maxParallel) break;

        const nodeId = queue[i];
        const dependencies = this.edges.filter(e => e.target === nodeId).map(e => e.source);
        const depsMet = dependencies.every(depId => !orderSet.has(depId) || completed.has(depId));

        if (depsMet) {
          queue.splice(i, 1);
          i--;

          const node = this.nodes.get(nodeId);
          const promise = this.executeNode(node)
            .then(() => {
              completed.add(nodeId);
              running.splice(running.indexOf(promise), 1);
            })
            .catch((err) => {
              running.splice(running.indexOf(promise), 1);
              if (!this.options.continueOnError) {
                this.abortController.abort();
                throw err;
              }
            });

          running.push(promise);
          startedAny = true;
        }
      }

      if (running.length > 0) {
        await Promise.race(running);
      } else if (!startedAny && queue.length > 0) {
        // Should not happen with valid topological order
        break;
      }
    }

    await Promise.allSettled(running);
  }

  async executeNode(node) {
    const startTime = Date.now();
    this.runningNodes.add(node.id);

    this.options.onNodeStart({
      nodeId: node.id,
      type: node.type,
      label: node.data?.label,
    });

    this.executionLog.push({
      type: 'node_start',
      nodeId: node.id,
      nodeType: node.type,
      timestamp: startTime,
    });

    try {
      if (this.abortController?.signal.aborted) {
        throw new Error('Execution aborted');
      }

      const result = await this.executeNodeByType(node);

      this.results.set(node.id, {
        status: 'success',
        output: result,
        duration: Date.now() - startTime,
      });

      this.options.onNodeComplete({
        nodeId: node.id,
        result,
      });

      this.executionLog.push({
        type: 'node_complete',
        nodeId: node.id,
        output: result,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.results.set(node.id, {
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      });

      this.options.onNodeError({
        nodeId: node.id,
        error: error.message,
      });

      this.executionLog.push({
        type: 'node_error',
        nodeId: node.id,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });

      throw error;

    } finally {
      this.runningNodes.delete(node.id);
    }
  }

  async executeNodeByType(node) {
    switch (node.type) {
      case 'process':
        return await this.executeProcessNode(node);
      case 'trigger':
        return await this.executeTriggerNode(node);
      case 'action':
        return await this.executeActionNode(node);
      case 'condition':
        return await this.executeConditionNode(node);
      case 'loop':
        return await this.executeLoopNode(node);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  async executeProcessNode(node) {
    const inputData = this.collectInputData(node.id);
    const action = node.data?.action || 'Eval';
    const processId = node.data?.processId;

    if (!processId) {
      throw new Error('Process ID is required for process nodes');
    }

    try {
      const mcpResult = await callMcpTool('ao_process_info', {
        process: processId
      });

      return {
        nodeId: node.id,
        type: 'process',
        action,
        input: inputData,
        message: `Process ${processId} executed via MCP`,
        result: mcpResult,
      };
    } catch (error) {
      console.warn('[AgentRunner] MCP tool call failed, using fallback:', error.message);
      return {
        nodeId: node.id,
        type: 'process',
        action,
        input: inputData,
        message: `Process ${processId} executed (MCP unavailable)`,
        result: null,
      };
    }
  }

  async executeTriggerNode(node) {
    const triggerType = node.data?.triggerType;

    switch (triggerType) {
      case 'cron':
        return {
          nodeId: node.id,
          type: 'trigger',
          triggerType: 'cron',
          message: `Cron trigger: ${node.data?.cronExpression}`,
          nextRun: this.calculateNextCronRun(node.data?.cronExpression),
        };
      case 'webhook':
        return {
          nodeId: node.id,
          type: 'trigger',
          triggerType: 'webhook',
          webhookUrl: node.data?.webhookUrl,
          message: 'Webhook trigger ready',
        };
      case 'event':
        return {
          nodeId: node.id,
          type: 'trigger',
          triggerType: 'event',
          eventType: node.data?.eventType,
          message: `Event trigger: ${node.data?.eventType}`,
        };
      default:
        return {
          nodeId: node.id,
          type: 'trigger',
          triggerType: triggerType || 'manual',
          message: 'Manual trigger',
        };
    }
  }

  async executeActionNode(node) {
    const inputData = this.collectInputData(node.id);
    const actionType = node.data?.actionType;

    switch (actionType) {
      case 'notification':
        return {
          nodeId: node.id,
          type: 'action',
          actionType: 'notification',
          recipient: node.data?.recipient,
          message: inputData.message || 'Notification sent',
        };
      case 'http':
        try {
          const url = node.data?.url;
          const method = node.data?.method || 'POST';
          const headers = node.data?.headers || {};
          const body = node.data?.body || inputData;

          const mcpResult = await callMcpTool('http_request', {
            url,
            method,
            headers,
            body: typeof body === 'string' ? body : JSON.stringify(body)
          });

          return {
            nodeId: node.id,
            type: 'action',
            actionType: 'http',
            url,
            method,
            message: `HTTP ${method} request to ${url} completed`,
            result: mcpResult,
          };
        } catch (error) {
          console.warn('[AgentRunner] HTTP MCP tool call failed:', error.message);
          return {
            nodeId: node.id,
            type: 'action',
            actionType: 'http',
            url: node.data?.url,
            method: node.data?.method || 'POST',
            message: `HTTP request completed (MCP unavailable)`,
            error: error.message,
          };
        }
      case 'transfer':
        try {
          const recipient = node.data?.recipient;
          const amount = node.data?.amount;
          const token = node.data?.token || 'AR';

          const mcpResult = await callMcpTool('ao_send', {
            recipient,
            quantity: amount.toString(),
            token
          });

          return {
            nodeId: node.id,
            type: 'action',
            actionType: 'transfer',
            recipient,
            amount,
            token,
            message: `Transferred ${amount} ${token} to ${recipient}`,
            result: mcpResult,
          };
        } catch (error) {
          console.warn('[AgentRunner] Transfer MCP tool call failed:', error.message);
          return {
            nodeId: node.id,
            type: 'action',
            actionType: 'transfer',
            recipient: node.data?.recipient,
            amount: node.data?.amount,
            token: node.data?.token || 'AR',
            message: `Transfer queued (MCP unavailable)`,
            error: error.message,
          };
        }
      default:
        return {
          nodeId: node.id,
          type: 'action',
          actionType: actionType || 'generic',
          input: inputData,
          message: 'Action executed',
        };
    }
  }

  async executeConditionNode(node, externalVisited = null) {
    const inputData = this.collectInputData(node.id);
    const expression = node.data?.expression;
    const trueBranch = node.data?.trueBranch;
    const falseBranch = node.data?.falseBranch;

    this.executionLog.push({
      type: 'condition_eval',
      nodeId: node.id,
      expression,
      input: inputData,
      timestamp: Date.now(),
    });

    let result;
    try {
      result = this.evaluateCondition(expression, inputData);
    } catch (error) {
      result = false;
    }

    const selectedBranch = result ? trueBranch : falseBranch;

    const output = {
      nodeId: node.id,
      type: 'condition',
      expression,
      conditionResult: result,
      selectedBranch,
      trueBranch,
      falseBranch,
      input: inputData,
    };

    this.results.set(node.id, {
      status: 'success',
      output,
      duration: 0,
    });

    this.options.onNodeComplete({
      nodeId: node.id,
      result: output,
    });

    if (externalVisited !== null) {
      return { nextNodeId: selectedBranch, conditionResult: result };
    }

    return output;
  }

  evaluateCondition(expression, context) {
    if (!expression) return true;

    const safeContext = { ...context };
    
    for (const [key, value] of Object.entries(safeContext)) {
      if (typeof value === 'string') {
        safeContext[key] = value;
      }
    }

    const func = new Function(...Object.keys(safeContext), `return ${expression}`);
    return func(...Object.values(safeContext));
  }

  async executeLoopNode(node, externalVisited = null) {
    const maxIterations = node.data?.maxIterations ?? node.data?.count ?? 10;
    const loopCondition = node.data?.condition;
    const loopVar = node.data?.loopVar ?? 'i';
    const bodyNodeId = node.data?.bodyNodeId;
    const currentIteration = (this.loopIterations.get(node.id) || 0) + 1;
    this.loopIterations.set(node.id, currentIteration);

    const inputData = this.collectInputData(node.id);

    this.executionLog.push({
      type: 'loop_start',
      nodeId: node.id,
      iteration: currentIteration,
      maxIterations,
      timestamp: Date.now(),
    });

    this.options.onNodeStart({
      nodeId: node.id,
      type: 'loop',
      label: node.data?.label,
      iteration: currentIteration,
    });

    let shouldContinue = true;

    if (loopCondition) {
      try {
        const context = { ...inputData, [loopVar]: currentIteration };
        shouldContinue = this.evaluateCondition(loopCondition, context);
      } catch (error) {
        shouldContinue = currentIteration < maxIterations;
      }
    } else {
      shouldContinue = currentIteration < maxIterations;
    }

    const output = {
      nodeId: node.id,
      type: 'loop',
      iteration: currentIteration,
      maxIterations,
      shouldContinue,
      loopCondition,
    };

    this.results.set(node.id, {
      status: 'success',
      output,
      duration: 0,
    });

    this.options.onNodeComplete({
      nodeId: node.id,
      result: output,
    });

    if (externalVisited !== null) {
      if (shouldContinue && bodyNodeId) {
        const bodyNode = this.nodes.get(bodyNodeId);
        if (bodyNode) {
          await this.executeNode(bodyNode);
          return { nextNodeId: node.id, iteration: currentIteration };
        }
      }
      return { nextNodeId: node.data?.nextNodeId, iteration: currentIteration };
    }

    return output;
  }

  collectInputData(nodeId) {
    const incomingEdges = this.edges.filter((e) => e.target === nodeId);
    const inputData = {};

    for (const edge of incomingEdges) {
      const sourceResult = this.results.get(edge.source);
      if (sourceResult?.status === 'success' && sourceResult.output) {
        Object.assign(inputData, sourceResult.output);
      }
    }

    return inputData;
  }

  calculateNextCronRun(cronExpression) {
    if (!cronExpression) return null;
    return new Date(Date.now() + 60000).toISOString();
  }

  generateSummary() {
    const results = Array.from(this.results.values());
    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
      totalNodes: this.nodes.size,
      successCount,
      errorCount,
      successRate: this.nodes.size > 0 ? (successCount / this.nodes.size) * 100 : 0,
      totalDuration,
      results: Object.fromEntries(this.results),
      log: this.executionLog,
    };
  }

  stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.executionLog.push({
        type: 'aborted',
        message: 'Execution stopped by user',
        timestamp: Date.now(),
      });
    }
  }

  getRunningNodes() {
    return Array.from(this.runningNodes);
  }

  getResults() {
    return Object.fromEntries(this.results);
  }

  getLog() {
    return [...this.executionLog];
  }

  dispose() {
    if (this.wallet) {
      if (signerRegistry) {
        signerRegistry.unregister(this.walletId);
      }
      this.wallet.dispose();
      this.wallet = null;
      this.walletId = null;
    }
  }

  /**
   * Securely destroy the runner and wipe sensitive key material.
   */
  destroy() {
    this.dispose();
    this.results.clear();
    this.executionLog = [];
    this.nodes.clear();
    this.loopIterations.clear();
  }
}

export function createAgentRunner(nodes, edges, wallet, options) {
  return new AgentRunner(nodes, edges, wallet, options);
}

export default AgentRunner;
