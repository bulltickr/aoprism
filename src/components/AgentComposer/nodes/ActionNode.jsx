import React from 'react';
import { Handle, Position } from 'reactflow';

export function ActionNode({ data, selected }) {
  return (
    <div className={`action-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span className="icon">🔔</span>
        <span className="title">{data.label}</span>
        {data.status && (
          <span className={`status-badge ${data.status}`}>{data.status}</span>
        )}
      </div>
      
      <div className="node-body">
        {data.actionType && (
          <div className="field">
            <label>Action Type</label>
            <value>{data.actionType}</value>
          </div>
        )}
        
        {data.recipient && (
          <div className="field">
            <label>Recipient</label>
            <value className="mono small">{truncate(data.recipient, 16)}</value>
          </div>
        )}
        
        {data.message && (
          <div className="field">
            <label>Message</label>
            <value className="small">{truncate(data.message, 30)}</value>
          </div>
        )}
        
        {data.lastExecuted && (
          <div className="field">
            <label>Last Executed</label>
            <value>{formatTime(data.lastExecuted)}</value>
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#f59e0b' }}
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

export default ActionNode;
