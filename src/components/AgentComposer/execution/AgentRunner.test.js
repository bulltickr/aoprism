import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentRunner, createAgentRunner } from './AgentRunner.js';

describe('AgentRunner', () => {
  let runner;
  let nodes;
  let edges;
  let wallet;
  let onNodeStart;
  let onNodeComplete;

  beforeEach(() => {
    nodes = [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: { label: 'Start Trigger', triggerType: 'manual' },
      },
      {
        id: 'process-1',
        type: 'process',
        position: { x: 0, y: 100 },
        data: { label: 'Process 1', processId: 'test-process-123', action: 'Eval' },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 0, y: 200 },
        data: { label: 'Send Notification', actionType: 'notification' },
      },
    ];

    edges = [
      { id: 'e1', source: 'trigger-1', target: 'process-1' },
      { id: 'e2', source: 'process-1', target: 'action-1' },
    ];

    wallet = {
      n: 'test-key-modulus-string-that-is-long-enough-to-be-valid'
    };
    onNodeStart = vi.fn();
    onNodeComplete = vi.fn();
  });

  describe('constructor', () => {
    it('should create runner with nodes and edges', () => {
      runner = new AgentRunner(nodes, edges, wallet);
      expect(runner.nodes.size).toBe(3);
      expect(runner.edges.length).toBe(2);
    });

    it('should use default options', () => {
      runner = new AgentRunner(nodes, edges, wallet);
      expect(runner.options.parallel).toBe(true);
      expect(runner.options.maxParallel).toBe(5);
      expect(runner.options.timeout).toBe(30000);
    });

    it('should accept custom options', () => {
      runner = new AgentRunner(nodes, edges, wallet, {
        parallel: false,
        maxParallel: 10,
        timeout: 60000,
      });
      expect(runner.options.parallel).toBe(false);
      expect(runner.options.maxParallel).toBe(10);
      expect(runner.options.timeout).toBe(60000);
    });
  });

  describe('execute', () => {
    it('should execute all nodes in topological order', async () => {
      runner = new AgentRunner(nodes, edges, wallet, {
        onNodeStart,
        onNodeComplete,
      });

      const result = await runner.execute();

      expect(result.totalNodes).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(0);
    });

    it('should call onNodeStart callback', async () => {
      runner = new AgentRunner(nodes, edges, wallet, {
        onNodeStart,
        onNodeComplete,
      });

      await runner.execute();

      expect(onNodeStart).toHaveBeenCalledTimes(3);
    });

    it('should call onNodeComplete callback', async () => {
      runner = new AgentRunner(nodes, edges, wallet, {
        onNodeStart,
        onNodeComplete,
      });

      await runner.execute();

      expect(onNodeComplete).toHaveBeenCalledTimes(3);
    });

    it('should return execution summary', async () => {
      runner = new AgentRunner(nodes, edges, wallet);
      const result = await runner.execute();

      expect(result).toHaveProperty('totalNodes');
      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('errorCount');
      expect(result).toHaveProperty('successRate');
      expect(result).toHaveProperty('totalDuration');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('log');
    });

    it('should execute from specific start node', async () => {
      runner = new AgentRunner(nodes, edges, wallet, {
        onNodeStart,
        onNodeComplete,
      });

      const result = await runner.execute('process-1');

      expect(result.successCount).toBe(1);
      expect(result.results['process-1']).toBeDefined();
    });

    it('should throw error for invalid start node', async () => {
      runner = new AgentRunner(nodes, edges, wallet);

      await expect(runner.execute('nonexistent')).rejects.toThrow(
        'Start node nonexistent not found'
      );
    });

    it('should handle process node execution', async () => {
      runner = new AgentRunner(nodes, edges, wallet);
      await runner.execute();

      const processResult = runner.results.get('process-1');
      expect(processResult.status).toBe('success');
      expect(processResult.output.type).toBe('process');
    });

    it('should handle trigger node execution', async () => {
      runner = new AgentRunner(nodes, edges, wallet);
      await runner.execute();

      const triggerResult = runner.results.get('trigger-1');
      expect(triggerResult.status).toBe('success');
      expect(triggerResult.output.type).toBe('trigger');
    });

    it('should handle action node execution', async () => {
      runner = new AgentRunner(nodes, edges, wallet);
      await runner.execute();

      const actionResult = runner.results.get('action-1');
      expect(actionResult.status).toBe('success');
      expect(actionResult.output.type).toBe('action');
    });

    it('should pass data between nodes', async () => {
      nodes[1].data.testOutput = 'hello from process';
      runner = new AgentRunner(nodes, edges, wallet);
      await runner.execute();

      const actionResult = runner.results.get('action-1');
      expect(actionResult.output).toBeDefined();
    });

    it('should calculate success rate correctly', async () => {
      runner = new AgentRunner(nodes, edges, wallet);
      const result = await runner.execute();

      expect(result.successRate).toBe(100);
    });
  });

  describe('stop', () => {
    it('should abort execution when stopped', async () => {
      nodes = [
        { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'process', position: { x: 0, y: 100 }, data: { processId: 'test' } },
        { id: '3', type: 'process', position: { x: 0, y: 200 }, data: { processId: 'test' } },
      ];
      edges = [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
      ];

      runner = new AgentRunner(nodes, edges, wallet, { parallel: false });

      const executePromise = runner.execute();
      runner.stop();

      await executePromise.catch(() => { });

      const log = runner.getLog();
      const hasAbort = log.some((entry) => entry.type === 'aborted');
      expect(hasAbort).toBe(true);
    });
  });

  describe('getRunningNodes', () => {
    it('should return empty array when not running', () => {
      runner = new AgentRunner(nodes, edges, wallet);
      expect(runner.getRunningNodes()).toEqual([]);
    });
  });

  describe('getResults', () => {
    it('should return empty object before execution', () => {
      runner = new AgentRunner(nodes, edges, wallet);
      expect(runner.getResults()).toEqual({});
    });
  });

  describe('getLog', () => {
    it('should return empty array before execution', () => {
      runner = new AgentRunner(nodes, edges, wallet);
      expect(runner.getLog()).toEqual([]);
    });
  });

  describe('createAgentRunner factory', () => {
    it('should create runner with factory function', () => {
      const factoryRunner = createAgentRunner(nodes, edges, wallet);
      expect(factoryRunner).toBeInstanceOf(AgentRunner);
    });
  });

  describe('error handling', () => {
    it('should handle node without processId', async () => {
      nodes = [
        {
          id: 'process-no-id',
          type: 'process',
          position: { x: 0, y: 0 },
          data: { label: 'Process without ID' },
        },
      ];
      edges = [];

      runner = new AgentRunner(nodes, edges, wallet);

      await expect(runner.execute()).rejects.toThrow('Process ID is required');
    });

    it('should handle unknown node type', async () => {
      nodes = [
        {
          id: 'unknown',
          type: 'unknown-type',
          position: { x: 0, y: 0 },
          data: {},
        },
      ];
      edges = [];

      runner = new AgentRunner(nodes, edges, wallet);

      await expect(runner.execute()).rejects.toThrow('Unknown node type');
    });
  });
});
