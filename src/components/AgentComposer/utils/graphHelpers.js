export function validateConnection(sourceNode, targetNode, sourceHandle, targetHandle) {
  // Prevent connecting to self
  if (sourceNode.id === targetNode.id) {
    return { valid: false, error: 'Cannot connect node to itself' };
  }

  // Validate source handle
  if (sourceHandle === 'error') {
    // Error handles can only connect to process or action nodes
    if (targetNode.type !== 'process' && targetNode.type !== 'action') {
      return { valid: false, error: 'Error output can only connect to Process or Action nodes' };
    }
  }

  // Validate target handle
  if (targetHandle === 'input') {
    // Trigger nodes cannot be targets
    if (targetNode.type === 'trigger') {
      return { valid: false, error: 'Trigger nodes cannot receive input' };
    }
  }

  // Validate node type combinations
  const validConnections = {
    trigger: ['process', 'action'],
    process: ['process', 'action'],
    action: [], // Action nodes are terminal
  };

  if (!validConnections[sourceNode.type]?.includes(targetNode.type)) {
    return {
      valid: false,
      error: `Cannot connect ${sourceNode.type} node to ${targetNode.type} node`,
    };
  }

  return { valid: true };
}

export function detectCycle(nodes, edges, newEdge) {
  const graph = buildAdjacencyList(nodes, edges);
  
  // Add the new edge to check
  if (newEdge) {
    if (!graph[newEdge.source]) graph[newEdge.source] = [];
    graph[newEdge.source].push(newEdge.target);
  }

  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(nodeId) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of Object.keys(graph)) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) return true;
    }
  }

  return false;
}

function buildAdjacencyList(nodes, edges) {
  const graph = {};
  
  nodes.forEach((node) => {
    graph[node.id] = [];
  });

  edges.forEach((edge) => {
    if (!graph[edge.source]) graph[edge.source] = [];
    graph[edge.source].push(edge.target);
  });

  return graph;
}

export function getTopologicalOrder(nodes, edges) {
  const graph = buildAdjacencyList(nodes, edges);
  const inDegree = {};

  // Calculate in-degrees
  nodes.forEach((node) => {
    inDegree[node.id] = 0;
  });

  edges.forEach((edge) => {
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });

  // Find all nodes with no incoming edges
  const queue = [];
  nodes.forEach((node) => {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  });

  const result = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    result.push(nodeId);

    const neighbors = graph[nodeId] || [];
    neighbors.forEach((neighbor) => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  // If result doesn't contain all nodes, there's a cycle
  if (result.length !== nodes.length) {
    throw new Error('Graph contains a cycle');
  }

  return result;
}

export default {
  validateConnection,
  detectCycle,
  getTopologicalOrder,
};
