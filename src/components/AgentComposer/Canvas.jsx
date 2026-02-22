import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
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

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type === 'process' ? 'AO Process' : type === 'trigger' ? 'Trigger' : 'Action',
          status: 'idle',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      onChange?.({ nodes: [...nodes, newNode], edges });
    },
    [reactFlowInstance, nodes, edges, onChange, setNodes]
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
  }, [nodes, edges, onChange, setNodes]);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

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
  }, [nodes, edges, selectedNode, onChange, setNodes, setEdges]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => ({ ...prev, data: { ...prev.data, ...newData } }));
    }
  }, [selectedNode, setNodes]);

  return (
    <div 
      className="agent-composer" 
      style={{ width: '100%', height: '100%' }} 
      ref={reactFlowWrapper}
      role="application"
      aria-label="Agent workflow composer. Use keyboard to add nodes."
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
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
        aria-label="Agent workflow canvas"
      >
        <Background color="#94a3b8" gap={15} size={1} />
        <Controls aria-label="Canvas controls" />
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
          aria-label="Mini map of workflow"
        />
        <Panel position="top-left" className="composer-toolbar" aria-label="Node toolbar">
          <div className="toolbar-section">
            <h4 id="toolbar-add-nodes">Add Nodes (Drag)</h4>
            <div
              className="dnd-node trigger"
              onDragStart={(event) => onDragStart(event, 'trigger')}
              draggable
              role="button"
              tabIndex={0}
              aria-label="Add trigger node, press Enter to add"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  addNode('trigger')
                }
              }}
            >
              Trigger
            </div>
            <div
              className="dnd-node process"
              onDragStart={(event) => onDragStart(event, 'process')}
              draggable
              role="button"
              tabIndex={0}
              aria-label="Add process node, press Enter to add"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  addNode('process')
                }
              }}
            >
              Process
            </div>
            <div
              className="dnd-node action"
              onDragStart={(event) => onDragStart(event, 'action')}
              draggable
              role="button"
              tabIndex={0}
              aria-label="Add action node, press Enter to add"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  addNode('action')
                }
              }}
            >
              Action
            </div>
          </div>
          <div className="toolbar-section">
            <h4 id="toolbar-quick-add">Quick Add</h4>
            <button 
              className="btn btn-primary" 
              onClick={() => addNode('trigger')}
              aria-describedby="toolbar-quick-add"
            >
              + Trigger
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => addNode('process')}
              aria-describedby="toolbar-quick-add"
            >
              + Process
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => addNode('action')}
              aria-describedby="toolbar-quick-add"
            >
              + Action
            </button>
          </div>
          {selectedNode && (
            <div className="toolbar-section" role="region" aria-label="Selected node details">
              <h4 id="selected-node-label">Selected: {selectedNode.data.label}</h4>
              <button
                className="btn btn-danger"
                onClick={() => deleteNode(selectedNode.id)}
                aria-describedby="selected-node-label"
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
