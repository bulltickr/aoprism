import { describe, it, expect, vi } from 'vitest';
import { TriggerNode } from './TriggerNode.jsx';

// Mock reactflow Handle component
vi.mock('reactflow', () => ({
  Handle: function Handle({ type, position, id, style }) {
    const div = document.createElement('div');
    div.setAttribute('data-testid', `handle-${type}-${position}-${id}`);
    return div;
  },
  Position: { Top: 'top', Bottom: 'bottom', Right: 'right', Left: 'left' },
}));

describe('TriggerNode', () => {
  const defaultData = {
    label: 'Test Trigger',
    status: 'idle',
  };

  it('should be defined', () => {
    expect(TriggerNode).toBeDefined();
    expect(typeof TriggerNode).toBe('function');
  });

  it('should accept data and selected props', () => {
    const props = {
      data: defaultData,
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
  });

  it('should handle data with triggerType', () => {
    const props = {
      data: { ...defaultData, triggerType: 'cron' },
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
  });

  it('should handle data with cronExpression', () => {
    const props = {
      data: { ...defaultData, cronExpression: '0 0 * * 1' },
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
  });

  it('should handle data with webhookUrl', () => {
    const props = {
      data: { ...defaultData, webhookUrl: 'https://example.com/webhook' },
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
  });

  it('should handle data with eventName', () => {
    const props = {
      data: { ...defaultData, eventName: 'TokenTransfer' },
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
  });

  it('should handle data with lastTriggered', () => {
    const props = {
      data: { ...defaultData, lastTriggered: Date.now() },
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
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
    
    expect(() => TriggerNode(propsSelected)).not.toThrow();
    expect(() => TriggerNode(propsNotSelected)).not.toThrow();
  });

  it('should handle empty data gracefully', () => {
    const props = {
      data: {},
      selected: false,
    };
    
    expect(() => TriggerNode(props)).not.toThrow();
  });
});
