/**
 * mcp-client.js
 * Client module for communicating with MCP Server Hub
 * Manages connection state and provides API for UI
 */

import { getState, setState } from '../../state.js'

// Default configuration
const DEFAULT_MCP_PORT = 3002
const DEFAULT_MCP_HOST = 'localhost'

let eventSource = null
let sessionId = null

/**
 * Get MCP configuration from state or defaults
 */
function getMcpConfig() {
    const state = getState()
    return {
        host: state.mcpHost || DEFAULT_MCP_HOST,
        port: state.mcpPort || DEFAULT_MCP_PORT,
        apiKey: state.mcpApiKey || null
    }
}

/**
 * Start the MCP server connection
 */
export async function startMcpServer() {
    const state = getState()
    
    if (state.mcpRunning) {
        console.log('[MCP Client] Server already running')
        return { success: true, message: 'Already running' }
    }

    try {
        const config = getMcpConfig()
        const baseUrl = `http://${config.host}:${config.port}`

        // Test if server is available
        const healthCheck = await fetch(`${baseUrl}/health`)
        
        if (!healthCheck.ok) {
            throw new Error('MCP server not responding')
        }

        const health = await healthCheck.json()
        
        // Establish SSE connection
        await connectSse(baseUrl, config.apiKey)

        // Update state
        await setState({
            mcpRunning: true,
            mcpPort: config.port,
            mcpTools: health.tools,
            mcpConnectedAt: new Date().toISOString()
        })

        // Dispatch event
        window.dispatchEvent(new CustomEvent('aoprism-mcp-started'))

        console.log('[MCP Client] Server started successfully')
        return { 
            success: true, 
            message: `Connected to ${health.tools} tools`,
            tools: health.tools
        }

    } catch (error) {
        console.error('[MCP Client] Failed to start:', error)
        
        await setState({
            mcpRunning: false,
            mcpError: error.message
        })

        return { 
            success: false, 
            message: error.message 
        }
    }
}

/**
 * Stop the MCP server connection
 */
export async function stopMcpServer() {
    const state = getState()
    
    if (!state.mcpRunning) {
        return { success: true, message: 'Not running' }
    }

    try {
        // Close SSE connection
        if (eventSource) {
            eventSource.close()
            eventSource = null
        }

        sessionId = null

        // Update state
        await setState({
            mcpRunning: false,
            mcpClients: [],
            mcpRequestCount: 0,
            mcpError: null
        })

        // Dispatch event
        window.dispatchEvent(new CustomEvent('aoprism-mcp-stopped'))

        console.log('[MCP Client] Server stopped')
        return { success: true, message: 'Disconnected' }

    } catch (error) {
        console.error('[MCP Client] Error stopping:', error)
        return { success: false, message: error.message }
    }
}

/**
 * Connect to SSE endpoint
 */
async function connectSse(baseUrl, apiKey) {
    return new Promise((resolve, reject) => {
        const headers = apiKey ? { 'X-API-Key': apiKey } : {}
        
        eventSource = new EventSource(`${baseUrl}/sse`, {
            headers
        })

        eventSource.onopen = () => {
            console.log('[MCP Client] SSE connection opened')
        }

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)
            
            if (data.sessionId) {
                sessionId = data.sessionId
                console.log('[MCP Client] Session established:', sessionId)
                resolve()
            }

            // Handle other messages
            handleSseMessage(data)
        }

        eventSource.onerror = (error) => {
            console.error('[MCP Client] SSE error:', error)
            reject(new Error('SSE connection failed'))
        }

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!sessionId) {
                reject(new Error('Connection timeout'))
            }
        }, 10000)
    })
}

/**
 * Handle incoming SSE messages
 */
function handleSseMessage(data) {
    // Update request count if this is a response
    if (data.id && data.result) {
        const state = getState()
        setState({
            mcpRequestCount: (state.mcpRequestCount || 0) + 1
        })
    }
}

/**
 * Get MCP server status
 */
export async function getMcpStatus() {
    try {
        const config = getMcpConfig()
        const baseUrl = `http://${config.host}:${config.port}`

        const response = await fetch(`${baseUrl}/health`)
        
        if (!response.ok) {
            return { running: false, error: 'Server not responding' }
        }

        const health = await response.json()
        
        // Get sessions info
        const sessionsResponse = await fetch(`${baseUrl}/sessions`)
        const sessions = sessionsResponse.ok ? await sessionsResponse.json() : { sessions: [] }

        return {
            running: true,
            tools: health.tools,
            activeSessions: health.activeSessions,
            uptime: health.uptime,
            sessions: sessions.sessions
        }

    } catch (error) {
        return { running: false, error: error.message }
    }
}

/**
 * Call an MCP tool
 */
export async function callMcpTool(toolName, args = {}) {
    const state = getState()
    
    if (!state.mcpRunning || !sessionId) {
        throw new Error('MCP server not connected')
    }

    const config = getMcpConfig()
    const baseUrl = `http://${config.host}:${config.port}`

    const response = await fetch(`${baseUrl}/messages?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey && { 'X-API-Key': config.apiKey })
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args
            }
        })
    })

    if (!response.ok) {
        throw new Error(`Tool call failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Log request
    logMcpRequest(toolName, args, result)

    return result
}

/**
 * Get list of available tools
 */
export async function getMcpTools() {
    try {
        const config = getMcpConfig()
        const baseUrl = `http://${config.host}:${config.port}`

        const response = await fetch(`${baseUrl}/tools`)
        
        if (!response.ok) {
            throw new Error('Failed to fetch tools')
        }

        return await response.json()

    } catch (error) {
        console.error('[MCP Client] Failed to get tools:', error)
        return { count: 0, tools: [] }
    }
}

/**
 * Log MCP request for display in UI
 */
function logMcpRequest(toolName, args, result) {
    const state = getState()
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        tool: toolName,
        args: JSON.stringify(args).slice(0, 200), // Truncate
        success: !result.error && !result.isError,
        duration: result.duration || 0
    }

    const logs = state.mcpLogs || []
    logs.unshift(logEntry)

    // Keep last 100 logs
    if (logs.length > 100) {
        logs.pop()
    }

    setState({ mcpLogs: logs })
}

/**
 * Toggle MCP server on/off
 */
export async function toggleMcpServer() {
    const state = getState()
    
    if (state.mcpRunning) {
        return await stopMcpServer()
    } else {
        return await startMcpServer()
    }
}

/**
 * Update MCP configuration
 */
export async function updateMcpConfig(config) {
    const state = getState()
    
    // If running, stop first
    if (state.mcpRunning) {
        await stopMcpServer()
    }

    await setState({
        mcpHost: config.host || state.mcpHost,
        mcpPort: config.port || state.mcpPort,
        mcpApiKey: config.apiKey !== undefined ? config.apiKey : state.mcpApiKey
    })

    // Restart if was running
    if (state.mcpRunning) {
        return await startMcpServer()
    }

    return { success: true }
}
