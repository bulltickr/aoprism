export const agentTemplates = [
  {
    id: 'token-distribution',
    name: 'Token Distribution Agent',
    description: 'Automatically distribute tokens on a schedule',
    category: 'Finance',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Weekly Trigger',
          triggerType: 'cron',
          cronExpression: '0 0 * * 1',
        },
      },
      {
        id: 'check-balance',
        type: 'process',
        position: { x: 250, y: 200 },
        data: {
          label: 'Check Treasury Balance',
          processId: '',
          action: 'GetBalance',
        },
      },
      {
        id: 'distribute',
        type: 'process',
        position: { x: 250, y: 350 },
        data: {
          label: 'Distribute Tokens',
          processId: '',
          action: 'Distribute',
        },
      },
      {
        id: 'notify',
        type: 'action',
        position: { x: 250, y: 500 },
        data: {
          label: 'Notify Recipients',
          actionType: 'notification',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'check-balance' },
      { id: 'e2', source: 'check-balance', target: 'distribute' },
      { id: 'e3', source: 'distribute', target: 'notify' },
    ],
  },
  {
    id: 'data-aggregation',
    name: 'Data Aggregation Agent',
    description: 'Collect data from multiple sources and aggregate',
    category: 'Data',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 400, y: 50 },
        data: {
          label: 'Daily Trigger',
          triggerType: 'cron',
          cronExpression: '0 0 * * *',
        },
      },
      {
        id: 'fetch-1',
        type: 'process',
        position: { x: 200, y: 200 },
        data: {
          label: 'Fetch Source 1',
          processId: '',
          action: 'Fetch',
        },
      },
      {
        id: 'fetch-2',
        type: 'process',
        position: { x: 400, y: 200 },
        data: {
          label: 'Fetch Source 2',
          processId: '',
          action: 'Fetch',
        },
      },
      {
        id: 'fetch-3',
        type: 'process',
        position: { x: 600, y: 200 },
        data: {
          label: 'Fetch Source 3',
          processId: '',
          action: 'Fetch',
        },
      },
      {
        id: 'aggregate',
        type: 'process',
        position: { x: 400, y: 350 },
        data: {
          label: 'Aggregate Data',
          processId: '',
          action: 'Aggregate',
        },
      },
      {
        id: 'store',
        type: 'process',
        position: { x: 400, y: 500 },
        data: {
          label: 'Store Results',
          processId: '',
          action: 'Save',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'fetch-1' },
      { id: 'e2', source: 'trigger', target: 'fetch-2' },
      { id: 'e3', source: 'trigger', target: 'fetch-3' },
      { id: 'e4', source: 'fetch-1', target: 'aggregate' },
      { id: 'e5', source: 'fetch-2', target: 'aggregate' },
      { id: 'e6', source: 'fetch-3', target: 'aggregate' },
      { id: 'e7', source: 'aggregate', target: 'store' },
    ],
  },
  {
    id: 'notification-router',
    name: 'Notification Router',
    description: 'Route notifications based on conditions',
    category: 'Communication',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Event Trigger',
          triggerType: 'event',
          eventType: 'Alert',
        },
      },
      {
        id: 'check-priority',
        type: 'process',
        position: { x: 250, y: 200 },
        data: {
          label: 'Check Priority',
          processId: '',
          action: 'CheckPriority',
        },
      },
      {
        id: 'email-high',
        type: 'action',
        position: { x: 100, y: 350 },
        data: {
          label: 'Email High Priority',
          actionType: 'notification',
          recipient: 'admin@example.com',
        },
      },
      {
        id: 'slack-medium',
        type: 'action',
        position: { x: 250, y: 350 },
        data: {
          label: 'Slack Medium Priority',
          actionType: 'notification',
          recipient: '#alerts',
        },
      },
      {
        id: 'log-low',
        type: 'action',
        position: { x: 400, y: 350 },
        data: {
          label: 'Log Low Priority',
          actionType: 'http',
          url: '/api/logs',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'check-priority' },
      { id: 'e2', source: 'check-priority', target: 'email-high' },
      { id: 'e3', source: 'check-priority', target: 'slack-medium' },
      { id: 'e4', source: 'check-priority', target: 'log-low' },
    ],
  },
  {
    id: 'backup-automation',
    name: 'Backup Automation',
    description: 'Automated backup and recovery agent',
    category: 'Infrastructure',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Daily Backup',
          triggerType: 'cron',
          cronExpression: '0 2 * * *',
        },
      },
      {
        id: 'create-backup',
        type: 'process',
        position: { x: 250, y: 200 },
        data: {
          label: 'Create Backup',
          processId: '',
          action: 'Backup',
        },
      },
      {
        id: 'verify-backup',
        type: 'process',
        position: { x: 250, y: 350 },
        data: {
          label: 'Verify Backup',
          processId: '',
          action: 'Verify',
        },
      },
      {
        id: 'notify-success',
        type: 'action',
        position: { x: 150, y: 500 },
        data: {
          label: 'Notify Success',
          actionType: 'notification',
        },
      },
      {
        id: 'alert-failure',
        type: 'action',
        position: { x: 350, y: 500 },
        data: {
          label: 'Alert on Failure',
          actionType: 'notification',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'create-backup' },
      { id: 'e2', source: 'create-backup', target: 'verify-backup' },
      { id: 'e3', source: 'verify-backup', target: 'notify-success' },
      { id: 'e4', source: 'verify-backup', target: 'alert-failure' },
    ],
  },
  {
    id: 'simple-hello',
    name: 'Hello World',
    description: 'Simple agent that sends a greeting',
    category: 'Tutorial',
    nodes: [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'Manual Trigger',
          triggerType: 'manual',
        },
      },
      {
        id: 'greet',
        type: 'action',
        position: { x: 250, y: 200 },
        data: {
          label: 'Send Greeting',
          actionType: 'notification',
          message: 'Hello from AOPRISM Agent!',
        },
      },
    ],
    edges: [{ id: 'e1', source: 'trigger', target: 'greet' }],
  },
];

export function getTemplate(id) {
  return agentTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category) {
  return agentTemplates.filter((t) => t.category === category);
}

export function getCategories() {
  return [...new Set(agentTemplates.map((t) => t.category))];
}

export function exportTemplate(nodes, edges, name, description) {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    description,
    category: 'Custom',
    nodes,
    edges,
    exportedAt: new Date().toISOString(),
  };
}

export function validateTemplate(template) {
  const errors = [];

  if (!template.name) errors.push('Template must have a name');
  if (!template.nodes || template.nodes.length === 0) {
    errors.push('Template must have at least one node');
  }
  if (!template.edges || template.edges.length === 0) {
    errors.push('Template must have at least one connection');
  }

  const nodeIds = new Set(template.nodes.map((n) => n.id));
  for (const edge of template.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge references non-existent source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge references non-existent target: ${edge.target}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  agentTemplates,
  getTemplate,
  getTemplatesByCategory,
  getCategories,
  exportTemplate,
  validateTemplate,
};
