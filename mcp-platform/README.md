# 🤖 AO MCP Platform Server

The backbone of the AOPRISM ecosystem. This Node.js server implements the Model Context Protocol (MCP) to expose AO/Arweave infrastructure as actionable tools for AI agents.

## 🚀 Key capabilities
- **33 Native Tools**: From basic dryruns to complex DEX swaps and AI inference.
- **Agent Autonomy**: Built-in support for mission-specific sub-wallets.
- **Network Agnostic**: Optimized for AO Mainnet and Hyperbeam messaging.

## 🛠️ Server Architecture

- **`src/server.js`**: The main entry point using the `@modelcontextprotocol/sdk`.
- **`src/ao-client.js`**: A high-performance wrapper for `@permaweb/aoconnect`.
- **`src/executor.js`**: The orchestration layer that maps tool calls to on-chain messages.
- **`src/tools/`**: Individual tool definitions (Zod schemas + execution logic).

## ⚙️ Setup & Configuration

### Prerequisites
- Node.js v18+
- An Arweave wallet (`wallet.json`)

### Installation
```bash
cd mcp-platform
npm install
```

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `ARWEAVE_WALLET` | Your JWK JSON string | Required for writes |
| `AO_URL` | Hyperbeam Gateway | `https://push.forward.computer` |
| `AO_SCHEDULER` | AO Scheduler ID | `n_XZJhUnmldNFo4dhajoPZWhBXuJk-OcQr5JQ49c4Zo` |

## 🧪 Testing

We carry a comprehensive validation suite:
- `npm run test`: Unit tests for local schema validation (Zod).
- `npm run test:live`: Integration tests with the live AO Mainnet.
- `npm run test:deep`: Protocol-level verification for DEX and AI tools.

## 📖 Related Documents
- [Handbook](../docs/handbook.md): The operator's guide for agent missions.
- [Security templates](./lua/templates/): Safety-first handler patterns.

## License
MIT
