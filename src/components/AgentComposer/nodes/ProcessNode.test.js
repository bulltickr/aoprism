import { describe, it, expect, vi } from 'vitest';
import { ProcessNode } from './ProcessNode.jsx';

// Mock reactflow Handle component
vi.mock('reactflow', () => ({
  Handle: function Handle({ type, position, id, style }) {
    const div = document.createElement('div');
    div.setAttribute('data-testid', `handle-${type}-${position}-${id}`);
    return div;
  },
  Position: { Top: 'top', Bottom: 'bottom', Right: 'right', Left: 'left' },
}));

describe('ProcessNode', () => {
  const defaultData = {
    label: 'Test Process',
    status: 'idle',
  };

  it('should be defined', () => {
    expect(ProcessNode).toBeDefined();
    expect(typeof ProcessNode).toBe('function');
  });

  it('should accept data and selected props', () => {
    const props = {
      data: defaultData,
      selected: false,
    };
    
    // Component should render without errors
    expect(() => ProcessNode(props)).not.toThrow();
  });

  it('should handle data with processId', () => {
    const props = {
      data: { ...defaultData, processId: 'test-process-123' },
      selected: false,
    };
    
    expect(() => ProcessNode(props)).not.toThrow();
  });

  it('should handle data with action', () => {
    const props = {
      data: { ...defaultData, action: 'Transfer' },
      selected: false,
    };
    
    expect(() => ProcessNode(props)).not.toThrow();
  });

  it('should handle data with lastExecution', () => {
    const props = {
      data: { ...defaultData, lastExecution: Date.now() },
      selected: false,
    };
    
    expect(() => ProcessNode(props)).not.toThrow();
  });

  it('should handle selected state', () => {
    const propsSelected = {
      data: defaultData,
      selected: true,
    };
    
    const propsNotSelected = {
      data: defaultData,
      selected: false,
    };
    
    expect(() => ProcessNode(propsSelected)).not.toThrow();
    expect(() => ProcessNode(propsNotSelected)).not.toThrow();
  });

  it('should handle empty data gracefully', () => {
    const props = {
      data: {},
      selected: false,
    };
    
    expect(() => ProcessNode(props)).not.toThrow();
  });

  it('should handle all status types', () => {
    const statuses = ['idle', 'running', 'success', 'error'];
    
    statuses.forEach(status => {
      const props = {
        data: { ...defaultData, status },
        selected: false,
      };
      
      expect(() => ProcessNode(props)).not.toThrow();
    });
  });
});
