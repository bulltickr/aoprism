# MCP Server Implementation Research
## Prepared for: Agent 1 (MCP Server Hub)
## Date: 2026-02-19
## Agent: AGENT 8 (Research)

---

## RESEARCH RESULTS for Agent 1

### Key Findings:

1. **MCP Architecture Overview**
   - MCP follows client-server architecture with three participants: MCP Host (AI app), MCP Client (protocol client), and MCP Server (your code)
   - Two transport layers: STDIO (local) and Streamable HTTP (remote, supports SSE)
   - Protocol is transport-agnostic and uses JSON-RPC 2.0

2. **Core Primitives (Server-Side)**
   - **Tools**: Executable functions for AI actions (DB queries, API calls, file ops)
   - **Resources**: Read-only data sources (files, DB records, API responses)
   - **Prompts**: Reusable templates for structured LLM interactions

3. **Client-Side Primitives**
   - **Sampling**: Servers request LLM completions from host
   - **Elicitation**: Servers request additional user input
   - **Logging**: Servers send debug messages to clients

4. **Official SDK Status**
   - TypeScript SDK v1.27.0 is current stable (v2 in development, pre-alpha)
   - Multiple language SDKs available: Python, Go, Java, Kotlin, Rust, C#, Ruby, Swift, PHP

---

### Code Examples:

**TypeScript Server Implementation (Modern SDK v1.10+)**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize server
const server = new McpServer({
  name: "aoprism-mcp-server",
  version: "1.0.0"
});

// Register a tool
server.tool(
  "query_database",
  "Execute a read-only SQL SELECT query",
  {
    query: z.string().describe("SQL query to execute")
  },
  async ({ query }) => {
    // Tool implementation
    const result = await db.query(query);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Register a resource
server.resource(
  "db-schema",
  "db://schema",
  "Complete database schema information",
  async (uri) => {
    const schema = await getSchema();
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(schema)
      }]
    };
  }
);

// Start with STDIO transport (local)
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Python Server Implementation (FastMCP)**
```python
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("aoprism-server")

@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.
    
    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    # Tool implementation
    return f"Alerts for {state}"

@mcp.resource("db://schema")
async def get_schema() -> str:
    """Get database schema"""
    return "{schema_json}"

# Run server
if __name__ == "__main__":
    mcp.run()
```

**Complete Working Node.js Example**
```javascript
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { McpError, ErrorCode } = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const path = require("path");
const fs = require("fs").promises;

// Initialize MCP server
const server = new McpServer({
  name: "custom-mcp-server",
  version: "1.0.0"
});

// Static resource
server.resource(
  "system-status",
  "status://system",
  "Current system status and health",
  async (uri) => {
    const status = { uptime: process.uptime(), memory: process.memoryUsage() };
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(status)
      }]
    };
  }
);

// Dynamic resource with template
const { ResourceTemplate } = require("@modelcontextprotocol/sdk/server/mcp.js");

server.resource(
  "file-contents",
  new ResourceTemplate("file://{path}", { list: undefined }),
  async (uri, { path }) => {
    const content = await fs.readFile(path, "utf-8");
    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/plain",
        text: content
      }]
    };
  }
);

// Tool with validation
server.tool(
  "read_file",
  "Read contents of a file",
  {
    path: z.string().describe("Absolute path to file")
  },
  async ({ path: filePath }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Failed to read file: ${error.message}`
      );
    }
  }
);

// Main function
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

---

### Best Practices:

- **Input Validation**: Use Zod (TypeScript) or Pydantic (Python) for strict schema validation
- **Error Handling**: Use McpError with appropriate ErrorCode for consistent error responses
- **Graceful Shutdown**: Close DB connections and flush logs on SIGINT/SIGTERM
- **Logging**: Always log to stderr, never stdout in stdio transport mode
- **Tool Design**: Keep tools focused and composable; the model chains multiple calls effectively
- **Security**: Validate all path arguments to prevent directory traversal attacks
- **Testing**: Test with in-memory transport before testing with Claude Desktop
- **Configuration**: Pass sensitive config via env vars, not command-line arguments
- **Absolute Paths**: Use absolute paths in MCP server configuration
- **Documentation**: Clear tool descriptions help LLM understand when to use each tool

---

### Reference Servers to Study:

1. **Everything** - Complete reference with all primitives
2. **Filesystem** - Secure file operations with access controls
3. **Git** - Repository manipulation tools
4. **Fetch** - Web content fetching
5. **Memory** - Knowledge graph persistence
6. **PostgreSQL** - Database interaction patterns

---

### Sources:
- https://modelcontextprotocol.io/docs/concepts/architecture
- https://github.com/modelcontextprotocol/servers
- https://github.com/modelcontextprotocol/typescript-sdk
- https://www.grizzlypeaksoftware.com/library/building-production-ready-mcp-servers
- https://github.com/ALucek/quick-mcp-example
- https://www.mcpstack.org/learn/custom-server-development

---

### Recommended Next Steps for Agent 1:

1. Start with TypeScript SDK v1.27.0 (stable)
2. Use STDIO transport for local development/testing
3. Implement 1-2 core tools first, then expand
4. Study the "Everything" reference server for patterns
5. Use Zod for input validation from day one
6. Set up MCP Inspector for debugging: https://github.com/modelcontextprotocol/inspector

---

*Research compiled by AGENT 8 for the AOPrism project*
