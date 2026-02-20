import { describe, it, expect, vi } from 'vitest';
import { ActionNode } from './ActionNode.jsx';

// Mock reactflow Handle component
vi.mock('reactflow', () => ({
  Handle: function Handle({ type, position, id, style }) {
    const div = document.createElement('div');
    div.setAttribute('data-testid', `handle-${type}-${position}-${id}`);
    return div;
  },
  Position: { Top: 'top', Bottom: 'bottom', Right: 'right', Left: 'left' },
}));

describe('ActionNode', () => {
  const defaultData = {
    label: 'Test Action',
    status: 'idle',
  };

  it('should be defined', () => {
    expect(ActionNode).toBeDefined();
    expect(typeof ActionNode).toBe('function');
  });

  it('should accept data and selected props', () => {
    const props = {
      data: defaultData,
      selected: false,
    };
    
    expect(() => ActionNode(props)).not.toThrow();
  });

  it('should handle data with actionType', () => {
    const props = {
      data: { ...defaultData, actionType: 'notification' },
      selected: false,
    };
    
    expect(() => ActionNode(props)).not.toThrow();
  });

  it('should handle data with recipient', () => {
    const props = {
      data: { ...defaultData, recipient: 'user-address-123' },
      selected: false,
    };
    
    expect(() => ActionNode(props)).not.toThrow();
  });

  it('should handle data with message', () => {
    const props = {
      data: { ...defaultData, message: 'Hello, this is a notification' },
      selected: false,
    };
    
    expect(() => ActionNode(props)).not.toThrow();
  });

  it('should handle data with lastExecuted', () => {
    const props = {
      data: { ...defaultData, lastExecuted: Date.now() },
      selected: false,
    };
    
    expect(() => ActionNode(props)).not.toThrow();
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
    
    expect(() => ActionNode(propsSelected)).not.toThrow();
    expect(() => ActionNode(propsNotSelected)).not.toThrow();
  });

  it('should handle empty data gracefully', () => {
    const props = {
      data: {},
      selected: false,
    };
    
    expect(() => ActionNode(props)).not.toThrow();
  });

  it('should handle all action types', () => {
    const actionTypes = ['notification', 'email', 'webhook', 'sms'];
    
    actionTypes.forEach(actionType => {
      const props = {
        data: { ...defaultData, actionType },
        selected: false,
      };
      
      expect(() => ActionNode(props)).not.toThrow();
    });
  });
});
