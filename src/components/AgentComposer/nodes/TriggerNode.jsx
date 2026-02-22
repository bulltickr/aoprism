import React from 'react';
import { Handle, Position } from 'reactflow';

export function TriggerNode({ data, selected }) {
  return (
    <div 
      className={`trigger-node ${selected ? 'selected' : ''}`}
      role="article"
      aria-label={`Trigger node: ${data.label}`}
      aria-selected={selected}
    >
      <div className="node-header">
        <span className="icon" aria-hidden="true">⚡</span>
        <span className="title">{data.label}</span>
        {data.status && (
          <span className={`status-badge ${data.status}`} aria-label={`Status: ${data.status}`}>
            {data.status}
          </span>
        )}
      </div>
      
      <div className="node-body">
        {data.triggerType && (
          <div className="field">
            <label>Type</label>
            <value>{data.triggerType}</value>
          </div>
        )}
        
        {data.cronExpression && (
          <div className="field">
            <label>Schedule</label>
            <value className="mono">{data.cronExpression}</value>
          </div>
        )}
        
        {data.webhookUrl && (
          <div className="field">
            <label>Webhook</label>
            <value className="mono small">{truncate(data.webhookUrl, 20)}</value>
          </div>
        )}
        
        {data.eventName && (
          <div className="field">
            <label>Event</label>
            <value>{data.eventName}</value>
          </div>
        )}
        
        {data.lastTriggered && (
          <div className="field">
            <label>Last Triggered</label>
            <value>{formatTime(data.lastTriggered)}</value>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ background: '#10b981' }}
        aria-label="Trigger output connection"
      />
    </div>
  );
}

function truncate(str, length) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length / 2) + '...' + str.substring(str.length - length / 2);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

export default TriggerNode;
