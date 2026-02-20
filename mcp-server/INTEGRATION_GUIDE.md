# MCP Server Hub - Integration Guide

## For Other Development Agents

This guide helps other agents integrate with the MCP Server Hub.

---

## 🎯 What You Get

The MCP Server Hub exposes **34 AO tools** that any AI assistant can use:
- Spawn processes
- Send messages
- Transfer tokens
- Query Arweave
- Execute skills
- Store/retrieve memory
- And 27 more...

---

## 🔌 How to Use

### Option 1: HTTP API (Recommended for Services)

```javascript
// Connect to MCP server
const MCP_URL = 'http://localhost:3002';

// 1. Get available tools
const tools = await fetch(`${MCP_URL}/tools`).then(r => r.json());

// 2. Establish SSE connection
const eventSource = new EventSource(`${MCP_URL}/sse`);

// 3. Call a tool
await fetch(`${MCP_URL}/messages?sessionId=${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: 'ao_spawn',
            arguments: {
                module: 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s'
            }
        }
    })
});
```

### Option 2: Import Directly (For Node.js)

```javascript
import { callMcpTool, getMcpTools } from './src/modules/mcp/index.js';

// Start the server first
await startMcpServer();

// Call any tool
const result = await callMcpTool('ao_spawn', {
    module: 'your-module-id'
});

console.log(result);
// { processId: "xxx", status: "success", message: "..." }
```

### Option 3: From AOPRISM UI

The MCP panel is automatically available in the dashboard:
- Toggle server on/off
- View tool list
- Monitor requests
- Configure settings

---

## 🛠️ Available Tools by Category

### For Agent Composer (Opportunity 2)
```javascript
// Process Management
ao_spawn, ao_send, ao_dryrun, ao_eval, ao_info, ao_monitor

// Skills
skills_execute, skills_get, skills_search, skills_list

// Memory
memory_store, memory_retrieve
```

### For AI Copilot (Opportunity 6)
```javascript
// Knowledge & Inference
ao_knowledge_query, ao_inference

// Code Deployment
arweave_deploy_lua, ao_eval

// Token Operations
token_balance, token_transfer, token_metadata
```

### For Process Marketplace (Opportunity 4)
```javascript
// Discovery
skills_search, ao_ecosystem_search

// Deployment
skills_register, arweave_deploy_lua, ao_spawn

// Social
social_post, social_feed
```

---

## 📡 Events

Listen for MCP events in the browser:

```javascript
// Server started
window.addEventListener('aoprism-mcp-started', (e) => {
    console.log('MCP server ready');
});

// Server stopped
window.addEventListener('aoprism-mcp-stopped', (e) => {
    console.log('MCP server stopped');
});

// New client connected
window.addEventListener('aoprism-mcp-client-connected', (e) => {
    console.log('New client:', e.detail);
});
```

---

## 🔐 Security

Default security settings:
- Rate limit: 100 requests / 15 minutes
- CORS: Enabled for all origins
- API key: Optional (set `MCP_API_KEY` env var)

For production:
```bash
MCP_API_KEY=your-secret-key
MCP_RATE_LIMIT=50
MCP_CORS_ORIGIN=https://yourdomain.com
```

---

## 🐛 Debugging

### Check server status:
```bash
curl http://localhost:3002/health
```

### View logs:
```javascript
const state = getState();
console.log(state.mcpLogs);
```

### Test a tool:
```bash
curl http://localhost:3002/tools | jq '.tools[0]'
```

---

## 📝 Common Patterns

### Pattern 1: Execute then Monitor
```javascript
// 1. Send a message
const result = await callMcpTool('ao_send', {
    process: 'process-id',
    tags: [{ name: 'Action', value: 'Transfer' }]
});

// 2. Monitor the process
const monitor = await callMcpTool('ao_monitor', {
    process: 'process-id'
});
```

### Pattern 2: Skill + Memory
```javascript
// 1. Execute a skill
const skill = await callMcpTool('skills_execute', {
    skillId: 'my-skill',
    input: { query: 'hello' }
});

// 2. Store result
await callMcpTool('memory_store', {
    key: `skill-${Date.now()}`,
    value: skill.result
});
```

### Pattern 3: Deploy & Interact
```javascript
// 1. Deploy Lua code
const deploy = await callMcpTool('arweave_deploy_lua', {
    code: luaCode,
    tags: [{ name: 'Action', value: 'Deploy' }]
});

// 2. Spawn process with deployed code
const spawn = await callMcpTool('ao_spawn', {
    module: deploy.moduleId
});

// 3. Send initial message
await callMcpTool('ao_send', {
    process: spawn.processId,
    tags: [{ name: 'Action', value: 'Initialize' }]
});
```

---

## 🆘 Troubleshooting

### "MCP server not responding"
- Check if server is running: `curl http://localhost:3002/health`
- Verify port is not in use: `lsof -i :3002`
- Check firewall settings

### "Unknown tool" error
- Verify tool name is correct (use underscores: `ao_spawn`)
- Check `/tools` endpoint for available tools
- Ensure tool is in registry: `src/modules/mcp/tools/index.js`

### "Session not found"
- Connect to SSE first: `GET /sse`
- Use session ID from SSE connection
- Session expires after disconnect

### Rate limit exceeded
- Wait 15 minutes
- Or restart server: `npm run start:http`
- Or increase limit: `MCP_RATE_LIMIT=1000`

---

## 📚 Documentation

- **README**: `mcp-server/README.md`
- **Tests**: `mcp-server/tests/server.test.js`
- **Implementation**: `IMPLEMENTATION_GUIDE.md` Section 1
- **Roadmap**: `PROJECT_ROADMAP.md` Week 1

---

## 🤝 Support

Questions? Check:
1. This guide
2. The README in mcp-server/
3. The test files for examples
4. Implementation Guide Section 1

---

**Happy building! 🚀**
