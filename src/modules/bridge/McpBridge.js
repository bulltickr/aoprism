
import { getState, setState } from '../../state.js'

/**
 * MCP Bridge Client
 * Connects the Browser to the Local MCP Server (The "Body")
 */
class McpBridge {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl
        this.eventSource = null
        this.isConnected = false
        this.requestId = 1
    }

    connect() {
        console.log('[Neural Bridge] Connecting to Local Body...')

        try {
            this.eventSource = new EventSource(`${this.baseUrl}/sse`)

            this.eventSource.onopen = () => {
                console.log('[Neural Bridge] ✅ Connected to Local Body')
                this.isConnected = true
                setState({ mcpConnected: true })
            }

            this.eventSource.onerror = (err) => {
                // Determine if it's a disconnect or just initial fail
                if (this.isConnected) {
                    console.warn('[Neural Bridge] ❌ Connection Lost')
                }
                this.isConnected = false
                setState({ mcpConnected: false })
            }

            // We don't actually need to listen to SSE *from* the server for *incoming* tool calls
            // because in the "Reverse Oracle" model, the **Browser** initiates the call 
            // based on an AO Message. 
            // The SSE connection is mostly to keep the session alive and receive server-initiated events if any.

        } catch (e) {
            console.error('[Neural Bridge] Connection Failed', e)
        }
    }

    /**
     * Executes a tool on the Local Machine (via MCP Server)
     * 🛡️ PERFORMS SECURITY CHECK (The Human Firewall)
     */
    async executeTool(toolName, args, sessionId) {
        if (!this.isConnected) throw new Error("Neural Bridge not connected. Run 'npm run dev' in mcp-platform.")

        // 1. THE HUMAN FIREWALL 🛡️
        // User must explicitly approve this action.
        const approved = await this.requestUserApproval(toolName, args)
        if (!approved) {
            throw new Error("User denied local execution.")
        }

        // 2. Execute via JSON-RPC over HTTP
        console.log(`[Neural Bridge] executing ${toolName}...`, args)

        try {
            const response = await fetch(`${this.baseUrl}/messages?sessionId=${sessionId || 'demo-session'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: this.requestId++,
                    method: "tools/call",
                    params: {
                        name: toolName,
                        arguments: args
                    }
                })
            })

            if (!response.ok) {
                throw new Error(`Bridge Error: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.error) {
                throw new Error(`MCP Error: ${data.error.message}`)
            }

            return data.result
        } catch (e) {
            console.error(e)
            throw e
        }
    }

    async requestUserApproval(toolName, args) {
        // In a real React app, this would trigger a Modal state.
        // For prototype, we use native confirm (blocking).
        const message = `
⚠️ SECURITY WARNING ⚠️

The Cloud Agent wants to execute a command on YOUR computer.

Tool: ${toolName}
Args: ${JSON.stringify(args, null, 2)}

Do you allow this?
        `
        return confirm(message)
    }
}

export const mcpBridge = new McpBridge()
