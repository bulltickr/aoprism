import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ProcessNode } from './nodes/ProcessNode.jsx';
import { TriggerNode } from './nodes/TriggerNode.jsx';
import { ActionNode } from './nodes/ActionNode.jsx';

const nodeTypes = {
  process: ProcessNode,
  trigger: TriggerNode,
  action: ActionNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1 };

const snapGrid = [15, 15];

export function AgentComposerCanvas({ initialNodes = [], initialEdges = [], onChange }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const reactFlowWrapper = useRef(null);

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      onChange?.({ nodes, edges: [...edges, newEdge] });
    },
    [nodes, edges, onChange]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = useCallback((type, position) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: position || { x: 100, y: 100 },
      data: {
        label: type === 'process' ? 'AO Process' : type === 'trigger' ? 'Trigger' : 'Action',
        status: 'idle',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    onChange?.({ nodes: [...nodes, newNode], edges });
  }, [nodes, edges, onChange]);

  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    onChange?.({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  }, [nodes, edges, selectedNode, onChange]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => ({ ...prev, data: { ...prev.data, ...newData } }));
    }
  }, [selectedNode]);

  return (
    <div className="agent-composer" style={{ width: '100%', height: '100vh' }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        snapGrid={snapGrid}
        snapToGrid={true}
        fitView
        attributionPosition="bottom-left"
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#94a3b8" gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'process') return '#3b82f6';
            if (n.type === 'trigger') return '#10b981';
            if (n.type === 'action') return '#f59e0b';
            return '#94a3b8';
          }}
          nodeColor={(n) => {
            if (n.type === 'process') return '#dbeafe';
            if (n.type === 'trigger') return '#d1fae5';
            if (n.type === 'action') return '#fef3c7';
            return '#f1f5f9';
          }}
        />
        <Panel position="top-left" className="composer-toolbar">
          <div className="toolbar-section">
            <h4>Add Nodes</h4>
            <button className="btn btn-primary" onClick={() => addNode('trigger')}>
              + Trigger
            </button>
            <button className="btn btn-primary" onClick={() => addNode('process')}>
              + Process
            </button>
            <button className="btn btn-primary" onClick={() => addNode('action')}>
              + Action
            </button>
          </div>
          {selectedNode && (
            <div className="toolbar-section">
              <h4>Selected: {selectedNode.data.label}</h4>
              <button
                className="btn btn-danger"
                onClick={() => deleteNode(selectedNode.id)}
              >
                Delete Node
              </button>
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default AgentComposerCanvas;
