import React from 'react';
import { Handle, Position } from 'reactflow';

export function ProcessNode({ data, selected }) {
  return (
    <div className={`process-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <span className="icon">⚙️</span>
        <span className="title">{data.label}</span>
        {data.status && (
          <span className={`status-badge ${data.status}`}>{data.status}</span>
        )}
      </div>
      
      <div className="node-body">
        {data.processId && (
          <div className="field">
            <label>Process ID</label>
            <value className="mono">{truncate(data.processId, 12)}</value>
          </div>
        )}
        
        {data.action && (
          <div className="field">
            <label>Action</label>
            <value>{data.action}</value>
          </div>
        )}
        
        {data.lastExecution && (
          <div className="field">
            <label>Last Run</label>
            <value>{formatTime(data.lastExecution)}</value>
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#3b82f6' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ background: '#3b82f6' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="error"
        style={{ background: '#ef4444' }}
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

export default ProcessNode;
