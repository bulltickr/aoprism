# AOPRISM MCP Server Hub

A universal MCP (Model Context Protocol) server exposing AOPRISM's 34 AO (Arweave/Compute) tools. This enables any AI assistant (Claude, Cursor, Copilot, etc.) to interact with the AO ecosystem.

## Features

- **34 AO Tools**: Complete suite for AO development
- **Multiple Transports**: STDIO for local CLI, HTTP/SSE for remote services
- **AI-Optimized**: Responses formatted for AI consumption
- **Secure**: Rate limiting, API key auth, IP whitelisting
- **Fast**: <100ms response time
- **Observable**: Request logging, metrics, health checks

## Quick Start

### STDIO Mode (Local CLI)

```bash
# Install dependencies
npm install

# Run the server
npm start
```

### HTTP Mode (Remote Services)

```bash
# Start HTTP server
npm run start:http

# Server will be available at http://localhost:3002
```

## Configuration

Create a `.env` file:

```env
# Server Configuration
MCP_PORT=3002
MCP_HOST=0.0.0.0

# Security
MCP_API_KEY=your-secret-key
MCP_RATE_LIMIT=100
MCP_CORS_ORIGIN=*

# AO Configuration
ARWEAVE_WALLET=path/to/wallet.json
AO_SCHEDULER=n_XZJhUnmldNFo4dhajoPZWhBXuJk-OcQr5JQ49c4Zo
```

## Available Tools

### AO Core (6 tools)
- `ao_spawn` - Spawn a new AO process
- `ao_send` - Send message to AO process
- `ao_dryrun` - Dry run message (no state change)
- `ao_eval` - Evaluate Lua code
- `ao_info` - Get process info
- `ao_monitor` - Monitor process activity

### Tokens (3 tools)
- `token_balance` - Check token balance
- `token_transfer` - Transfer tokens
- `token_metadata` - Get token metadata

### DEX (2 tools)
- `ao_dex_quote` - Get swap quote
- `ao_dex_swap` - Execute swap

### Arweave (4 tools)
- `arweave_query` - Query Arweave transactions
- `arweave_upload` - Upload data
- `arweave_deploy_lua` - Deploy Lua code
- `arweave_id_update` - Update Arweave ID

### Skills (6 tools)
- `skills_list` - List available skills
- `skills_get` - Get skill details
- `skills_search` - Search skills
- `skills_register` - Register new skill
- `skills_execute` - Execute skill
- `skill_scaffold` - Generate skill template

### Memory (4 tools)
- `memory_store` - Store data
- `memory_retrieve` - Retrieve data
- `memory_list` - List stored data
- `memory_delete` - Delete data

### AI (2 tools)
- `ao_inference` - Run AI inference
- `ao_knowledge_query` - Query knowledge base

### Social (2 tools)
- `social_post` - Post to social mesh
- `social_feed` - Get social feed

### Utilities (5 tools)
- `network_status` - Check network status
- `gateway_config` - Configure gateway
- `wallet_spawn` - Spawn wallet process
- `ao_cron_register` - Register cron job
- `ao_ecosystem_search` - Search AO ecosystem

## API Endpoints

### HTTP Server

- `GET /sse` - SSE endpoint for MCP communication
- `POST /messages?sessionId={id}` - Send message to session
- `GET /health` - Health check
- `GET /tools` - List available tools
- `GET /sessions` - List active sessions

### MCP Protocol

The server implements the Model Context Protocol:

```json
// List tools
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}

// Call tool
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "ao_spawn",
    "arguments": {
      "module": "ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s"
    }
  }
}
```

## Integration Examples

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aoprism-ao": {
      "command": "node",
      "args": ["/path/to/mcp-server/src/index.js"]
    }
  }
}
```

### Cursor

Add to Cursor settings:

```json
{
  "mcpServers": {
    "aoprism-ao": {
      "url": "http://localhost:3002/sse"
    }
  }
}
```

### VS Code Copilot

Configure MCP server in settings:

```json
{
  "github.copilot.advanced": {
    "mcpServers": {
      "aoprism-ao": {
        "command": "node",
        "args": ["/path/to/mcp-server/src/index.js"]
      }
    }
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-restart)
npm run dev

# Lint code
npm run lint
```

## Docker

```bash
# Build image
docker build -t aoprism-mcp-server .

# Run container
docker run -p 3002:3002 \
  -e MCP_API_KEY=your-secret \
  -v /path/to/wallet.json:/app/wallet.json \
  aoprism-mcp-server
```

## Security

- Always use HTTPS in production
- Set strong API keys
- Enable rate limiting
- Use IP whitelisting for sensitive deployments
- Review audit logs regularly

## Support

For support, join the AOPRISM Discord or open an issue on GitHub.

## License

MIT License - see LICENSE file for details.
