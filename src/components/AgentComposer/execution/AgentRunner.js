import { getTopologicalOrder } from '../utils/graphHelpers.js';
import { RustSigner } from '../../../core/rust-bridge.js';

export class AgentRunner {
  constructor(nodes, edges, wallet, options = {}) {
    this.nodes = new Map(nodes.map((n) => [n.id, { ...n }]));
    this.edges = edges;
    // Wrap the wallet in a RustSigner for hardware-backed enclave signing
    this.wallet = wallet ? new RustSigner(wallet) : null;
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
  }

  async execute(startNodeId = null) {
    this.abortController = new AbortController();
    this.executionLog = [];
    this.results = new Map();
    this.runningNodes = new Set();

    try {
      const executionOrder = this.getExecutionOrder(startNodeId);

      if (this.options.parallel) {
        await this.executeParallel(executionOrder);
      } else {
        await this.executeSequential(executionOrder);
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
    }
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

    return {
      nodeId: node.id,
      type: 'process',
      action,
      input: inputData,
      message: 'Process execution simulated (MCP tool integration)',
    };
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
        return {
          nodeId: node.id,
          type: 'action',
          actionType: 'http',
          url: node.data?.url,
          method: node.data?.method || 'POST',
          message: 'HTTP request simulated',
        };
      case 'transfer':
        return {
          nodeId: node.id,
          type: 'action',
          actionType: 'transfer',
          recipient: node.data?.recipient,
          amount: node.data?.amount,
          message: 'Transfer simulated',
        };
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

  /**
   * Securely destroy the runner and wipe sensitive key material.
   */
  destroy() {
    if (this.wallet && typeof this.wallet.wipe === 'function') {
      this.wallet.wipe();
    }
    this.wallet = null;
    this.results.clear();
    this.executionLog = [];
    this.nodes.clear();
  }
}

export function createAgentRunner(nodes, edges, wallet, options) {
  return new AgentRunner(nodes, edges, wallet, options);
}

export default AgentRunner;
