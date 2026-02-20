import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react', () => {
  const useState = vi.fn((initial) => [initial, vi.fn()]);
  const useCallback = (fn) => fn;
  const useRef = () => ({ current: null });
  const createElement = vi.fn(() => null);
  
  return {
    __esModule: true,
    default: {
      useState,
      useCallback,
      useRef,
      createElement,
    },
    useState,
    useCallback,
    useRef,
    createElement,
  };
});

vi.mock('reactflow', () => ({
  __esModule: true,
  default: vi.fn(() => null),
  Background: vi.fn(() => null),
  Controls: vi.fn(() => null),
  MiniMap: vi.fn(() => null),
  Panel: vi.fn(() => null),
  addEdge: (params, edges) => [...edges, { ...params, id: `e${params.source}-${params.target}` }],
  useNodesState: (initial) => [initial || [], vi.fn(), vi.fn()],
  useEdgesState: (initial) => [initial || [], vi.fn(), vi.fn()],
  ConnectionMode: { Loose: 'loose' },
}));

vi.mock('./nodes/ProcessNode.jsx', () => ({
  __esModule: true,
  default: () => null,
  ProcessNode: vi.fn(() => null),
}));

vi.mock('./nodes/TriggerNode.jsx', () => ({
  __esModule: true,
  default: () => null,
  TriggerNode: vi.fn(() => null),
}));

vi.mock('./nodes/ActionNode.jsx', () => ({
  __esModule: true,
  default: () => null,
  ActionNode: vi.fn(() => null),
}));

describe('AgentComposerCanvas', () => {
  let AgentComposerCanvas;
  let mockOnChange;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockOnChange = vi.fn();
    
    const module = await import('./Canvas.jsx');
    AgentComposerCanvas = module.AgentComposerCanvas;
  });

  it('should be defined', () => {
    expect(AgentComposerCanvas).toBeDefined();
  });

  it('should accept initialNodes prop', () => {
    expect(() => AgentComposerCanvas({
      initialNodes: [{ id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Test' } }],
      onChange: mockOnChange,
    })).not.toThrow();
  });

  it('should accept initialEdges prop', () => {
    expect(() => AgentComposerCanvas({
      initialEdges: [{ id: 'e1-2', source: '1', target: '2' }],
      onChange: mockOnChange,
    })).not.toThrow();
  });

  it('should accept onChange callback', () => {
    expect(() => AgentComposerCanvas({ onChange: mockOnChange })).not.toThrow();
  });

  it('should handle empty initial state', () => {
    expect(() => AgentComposerCanvas({})).not.toThrow();
  });

  it('should handle multiple nodes', () => {
    expect(() => AgentComposerCanvas({
      initialNodes: [
        { id: '1', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: '2', type: 'process', position: { x: 0, y: 100 }, data: {} },
        { id: '3', type: 'action', position: { x: 0, y: 200 }, data: {} },
      ],
      onChange: mockOnChange,
    })).not.toThrow();
  });

  it('should handle complex graph with edges', () => {
    expect(() => AgentComposerCanvas({
      initialNodes: [
        { id: 'trigger', type: 'trigger', position: { x: 250, y: 50 }, data: {} },
        { id: 'process1', type: 'process', position: { x: 250, y: 200 }, data: {} },
        { id: 'action1', type: 'action', position: { x: 250, y: 350 }, data: {} },
      ],
      initialEdges: [
        { id: 'e1', source: 'trigger', target: 'process1' },
        { id: 'e2', source: 'process1', target: 'action1' },
      ],
      onChange: mockOnChange,
    })).not.toThrow();
  });

  it('should support all node types', () => {
    ['trigger', 'process', 'action'].forEach((type) => {
      expect(() => AgentComposerCanvas({
        initialNodes: [{ id: '1', type, position: { x: 0, y: 0 }, data: {} }],
      })).not.toThrow();
    });
  });
});
