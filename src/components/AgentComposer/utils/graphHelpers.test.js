import { describe, it, expect } from 'vitest';
import {
  validateConnection,
  detectCycle,
  getTopologicalOrder,
} from './graphHelpers.js';

describe('validateConnection', () => {
  const createNode = (id, type) => ({ id, type });

  it('should validate connection between trigger and process', () => {
    const source = createNode('1', 'trigger');
    const target = createNode('2', 'process');

    const result = validateConnection(source, target, 'output', 'input');
    expect(result.valid).toBe(true);
  });

  it('should validate connection between trigger and action', () => {
    const source = createNode('1', 'trigger');
    const target = createNode('2', 'action');

    const result = validateConnection(source, target, 'output', 'input');
    expect(result.valid).toBe(true);
  });

  it('should validate connection between process and process', () => {
    const source = createNode('1', 'process');
    const target = createNode('2', 'process');

    const result = validateConnection(source, target, 'output', 'input');
    expect(result.valid).toBe(true);
  });

  it('should validate connection between process and action', () => {
    const source = createNode('1', 'process');
    const target = createNode('2', 'action');

    const result = validateConnection(source, target, 'output', 'input');
    expect(result.valid).toBe(true);
  });

  it('should reject self-connection', () => {
    const node = createNode('1', 'process');

    const result = validateConnection(node, node, 'output', 'input');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Cannot connect node to itself');
  });

  it('should reject connection to trigger node', () => {
    const source = createNode('1', 'process');
    const target = createNode('2', 'trigger');

    const result = validateConnection(source, target, 'output', 'input');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Trigger nodes cannot receive input');
  });

  it('should reject action node as source', () => {
    const source = createNode('1', 'action');
    const target = createNode('2', 'process');

    const result = validateConnection(source, target, 'output', 'input');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Cannot connect');
  });

  it('should allow error handle to connect to process', () => {
    const source = createNode('1', 'process');
    const target = createNode('2', 'process');

    const result = validateConnection(source, target, 'error', 'input');
    expect(result.valid).toBe(true);
  });

  it('should allow error handle to connect to action', () => {
    const source = createNode('1', 'process');
    const target = createNode('2', 'action');

    const result = validateConnection(source, target, 'error', 'input');
    expect(result.valid).toBe(true);
  });

  it('should reject error handle to trigger', () => {
    const source = createNode('1', 'process');
    const target = createNode('2', 'trigger');

    const result = validateConnection(source, target, 'error', 'input');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Error output can only connect to');
  });
});

describe('detectCycle', () => {
  it('should return false for acyclic graph', () => {
    const nodes = [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'process' },
      { id: '3', type: 'action' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
    ];

    expect(detectCycle(nodes, edges)).toBe(false);
  });

  it('should detect simple cycle', () => {
    const nodes = [
      { id: '1', type: 'process' },
      { id: '2', type: 'process' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
    ];
    const newEdge = { id: 'e2', source: '2', target: '1' };

    expect(detectCycle(nodes, edges, newEdge)).toBe(true);
  });

  it('should detect cycle with three nodes', () => {
    const nodes = [
      { id: '1', type: 'process' },
      { id: '2', type: 'process' },
      { id: '3', type: 'process' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
    ];
    const newEdge = { id: 'e3', source: '3', target: '1' };

    expect(detectCycle(nodes, edges, newEdge)).toBe(true);
  });

  it('should return false for linear chain', () => {
    const nodes = [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'process' },
      { id: '3', type: 'process' },
      { id: '4', type: 'action' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
    ];

    expect(detectCycle(nodes, edges)).toBe(false);
  });

  it('should handle empty graph', () => {
    expect(detectCycle([], [])).toBe(false);
  });

  it('should handle single node without edges', () => {
    const nodes = [{ id: '1', type: 'trigger' }];
    expect(detectCycle(nodes, [])).toBe(false);
  });

  it('should detect cycle in complex graph', () => {
    const nodes = [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'process' },
      { id: '3', type: 'process' },
      { id: '4', type: 'process' },
      { id: '5', type: 'action' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' },
    ];
    const newEdge = { id: 'e5', source: '4', target: '2' };

    expect(detectCycle(nodes, edges, newEdge)).toBe(true);
  });
});

describe('getTopologicalOrder', () => {
  it('should return correct order for linear chain', () => {
    const nodes = [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'process' },
      { id: '3', type: 'action' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
    ];

    const order = getTopologicalOrder(nodes, edges);
    expect(order).toEqual(['1', '2', '3']);
  });

  it('should return correct order for branching graph', () => {
    const nodes = [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'process' },
      { id: '3', type: 'action' },
      { id: '4', type: 'action' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '2', target: '4' },
    ];

    const order = getTopologicalOrder(nodes, edges);
    expect(order[0]).toBe('1');
    expect(order[1]).toBe('2');
    expect(order).toHaveLength(4);
  });

  it('should throw error for cyclic graph', () => {
    const nodes = [
      { id: '1', type: 'process' },
      { id: '2', type: 'process' },
    ];
    const edges = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '1' },
    ];

    expect(() => getTopologicalOrder(nodes, edges)).toThrow('Graph contains a cycle');
  });

  it('should handle independent nodes', () => {
    const nodes = [
      { id: '1', type: 'trigger' },
      { id: '2', type: 'trigger' },
      { id: '3', type: 'action' },
    ];
    const edges = [];

    const order = getTopologicalOrder(nodes, edges);
    expect(order).toHaveLength(3);
    expect(order).toContain('1');
    expect(order).toContain('2');
    expect(order).toContain('3');
  });

  it('should handle empty graph', () => {
    const order = getTopologicalOrder([], []);
    expect(order).toEqual([]);
  });

  it('should return correct order for complex graph', () => {
    const nodes = [
      { id: 'trigger', type: 'trigger' },
      { id: 'process1', type: 'process' },
      { id: 'process2', type: 'process' },
      { id: 'action1', type: 'action' },
      { id: 'action2', type: 'action' },
    ];
    const edges = [
      { id: 'e1', source: 'trigger', target: 'process1' },
      { id: 'e2', source: 'trigger', target: 'process2' },
      { id: 'e3', source: 'process1', target: 'action1' },
      { id: 'e4', source: 'process2', target: 'action2' },
    ];

    const order = getTopologicalOrder(nodes, edges);
    expect(order[0]).toBe('trigger');
    expect(order).toHaveLength(5);
  });
});
