# MCP Server Setup Guide

Connect Claude Desktop, Cursor, or any MCP client to AOPRISM.

## Prerequisites

- Node.js v18+
- Dependencies installed: `cd mcp-platform && npm install`

## Quick Start

```bash
# From the project root:
npm run mcp:dev
```

You should see the startup banner printed to stderr:
```
╔════════════════════════════════════════╗
║   AOPRISM: AO Agent OS  v0.1.0         ║
╠════════════════════════════════════════╣
║  Transport:  STDIO                     ║
║  AO URL:     https://push.forward.co   ║
║  Wallet:     ○ No wallet (read-only)   ║
║  Tools:      37                        ║
╠════════════════════════════════════════╣
║  • social_post                         ║
║  • ao_spawn                            ║
║  • ao_inference                        ║
║  • ... and 34 more                     ║
╚════════════════════════════════════════╝
```

## Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "aoprism": {
      "command": "node",
      "args": ["/path/to/aoprism/mcp-platform/src/server.js"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop. You should see the 37 AO tools available.

## Enable Write Tools (Wallet Required)

Write tools (`ao_send`) require an Arweave wallet. Two options:

### Option A: Environment variable
```json
{
  "mcpServers": {
    "aoprism": {
      "command": "node",
      "args": ["/path/to/aoprism/mcp-platform/src/server.js"],
      "env": {
        "ARWEAVE_WALLET": "{\"kty\":\"RSA\", ...your JWK here...}"
      }
    }
  }
}
```

### Option B: Wallet file flag
```json
{
  "mcpServers": {
    "aoprism": {
      "command": "node",
      "args": [
        "/path/to/aoprism/mcp-platform/src/server.js",
        "--wallet=/path/to/wallet.json"
      ]
    }
  }
}
```

Generate a new wallet: `npm run wallet:new` (creates `wallet.json` in project root)

## Connect to Cursor

In Cursor settings → MCP → Add server:
- **Name:** `aoprism`
- **Command:** `node /path/to/aoprism/mcp-platform/src/server.js`

## Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node mcp-platform/src/server.js
```

Opens a browser UI where you can call each tool manually.

## Available Tools

### `arweave_query`
Search Arweave transactions by tags and/or owner address.

**Example prompt:** *"Search Arweave for transactions tagged with Action=Info"*

```json
{
  "tags": [{"name": "Action", "values": ["Info"]}],
  "first": 10
}
```

### `ao_dryrun`
Send a read-only message to any AO process. No wallet needed.

**Example prompt:** *"Query the state of AO process XYZ"*

```json
{
  "process": "XYZ...43chars",
  "tags": [{"name": "Action", "value": "Info"}]
}
```

### `ao_send`
Send a real message to an AO process (requires wallet).

**Example prompt:** *"Send a Transfer message to AO process XYZ"*

```json
{
  "process": "XYZ...43chars",
  "tags": [
    {"name": "Action", "value": "Transfer"},
    {"name": "Recipient", "value": "ABC...43chars"},
    {"name": "Quantity", "value": "1000"}
  ]
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ARWEAVE_WALLET` | — | Wallet JWK as JSON string |
| `AO_URL` | `https://push.forward.computer` | HyperBEAM node URL |
| `AO_SCHEDULER` | `n_XZJhUnm...` | AO scheduler process ID |
| `AO_GQL` | `https://ao-search-gateway.goldsky.com/graphql` | GraphQL gateway |
| `ARWEAVE_GATEWAY` | `https://arweave.net` | Arweave gateway for URLs |
