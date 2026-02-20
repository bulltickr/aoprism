/**
 * HTTP/SSE Transport Server
 * Provides HTTP endpoints for MCP protocol with Server-Sent Events
 * 
 * Endpoints:
 * - GET /sse - SSE endpoint for MCP communication
 * - POST /messages - Message endpoint for client-to-server communication
 * - GET /health - Health check
 * - GET /tools - List available tools (convenience endpoint)
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { toolRegistry, getToolNames, TOOL_COUNT } from './tools/index.js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.MCP_PORT || 3002
const HOST = process.env.MCP_HOST || '0.0.0.0'

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}))

app.use(cors({
    origin: process.env.MCP_CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}))

app.use(express.json({ limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.MCP_RATE_LIMIT || 100,
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false
})
app.use(limiter)

// API Key authentication middleware (optional)
const authenticateApiKey = (req, res, next) => {
    // Skip auth for health check
    if (req.path === '/health') {
        return next()
    }

    const apiKey = req.headers['x-api-key']
    const validApiKey = process.env.MCP_API_KEY

    // If no API key is configured, allow all
    if (!validApiKey) {
        return next()
    }

    if (!apiKey) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key required. Include X-API-Key header.'
        })
    }

    if (apiKey !== validApiKey) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key'
        })
    }

    next()
}

app.use(authenticateApiKey)

// Session management
const transports = new Map()
const sessions = new Map()

/**
 * Create MCP server instance
 */
function createMcpServer(sessionId) {
    const server = new Server(
        {
            name: 'aoprism-ao',
            version: '1.0.0'
        },
        {
            capabilities: {
                tools: {}
            }
        }
    )

    // ListTools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = Object.entries(toolRegistry).map(([name, tool]) => {
            const jsonSchema = zodToJsonSchema(tool.schema, {
                name: name,
                $refStrategy: 'none'
            })

            return {
                name: name,
                description: tool.description,
                inputSchema: jsonSchema.definitions ?
                    jsonSchema.definitions[name] :
                    jsonSchema
            }
        })

        return { tools }
    })

    // CallTool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params
        
        console.log(`[HTTP Server] Session ${sessionId} executing tool: ${name}`)

        const tool = toolRegistry[name]
        
        if (!tool) {
            return {
                content: [{
                    type: 'text',
                    text: `Error: Unknown tool: ${name}. Available: ${getToolNames().join(', ')}`
                }],
                isError: true
            }
        }

        try {
            const validatedArgs = tool.schema.parse(args)
            const startTime = Date.now()
            const result = await tool.handler(validatedArgs)
            const duration = Date.now() - startTime

            console.log(`[HTTP Server] Tool ${name} executed in ${duration}ms`)

            // Update session stats
            const session = sessions.get(sessionId)
            if (session) {
                session.requestCount++
                session.lastActivity = new Date().toISOString()
                session.toolsUsed.add(name)
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }],
                isError: false
            }
        } catch (error) {
            console.error(`[HTTP Server] Error executing ${name}:`, error)

            if (error.name === 'ZodError') {
                const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
                return {
                    content: [{
                        type: 'text',
                        text: `Validation error: ${issues}`
                    }],
                    isError: true
                }
            }

            return {
                content: [{
                    type: 'text',
                    text: `Error: ${error.message || 'Unknown error'}`
                }],
                isError: true
            }
        }
    })

    return server
}

// SSE endpoint
app.get('/sse', async (req, res) => {
    console.log('[HTTP Server] New SSE connection request')

    try {
        const transport = new SSEServerTransport('/messages', res)
        const sessionId = transport.sessionId

        // Store transport
        transports.set(sessionId, transport)

        // Create session info
        sessions.set(sessionId, {
            id: sessionId,
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            requestCount: 0,
            toolsUsed: new Set(),
            clientInfo: req.headers['user-agent'] || 'Unknown'
        })

        console.log(`[HTTP Server] Session ${sessionId} connected`)

        // Create and connect MCP server
        const server = createMcpServer(sessionId)
        await server.connect(transport)

        // Handle disconnect
        req.on('close', () => {
            console.log(`[HTTP Server] Session ${sessionId} disconnected`)
            transports.delete(sessionId)
            sessions.delete(sessionId)
        })

    } catch (error) {
        console.error('[HTTP Server] SSE connection error:', error)
        res.status(500).json({ error: 'Failed to establish SSE connection' })
    }
})

// Message endpoint
app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId

    if (!sessionId) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'sessionId query parameter required'
        })
    }

    const transport = transports.get(sessionId)

    if (!transport) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Session not found. Connect via /sse first.'
        })
    }

    try {
        await transport.handlePostMessage(req, res)
    } catch (error) {
        console.error(`[HTTP Server] Message handling error for session ${sessionId}:`, error)
        if (!res.headersSent) {
            res.status(500).json({ error: 'Message handling failed' })
        }
    }
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: 'aoprism-mcp-server',
        version: '1.0.0',
        tools: TOOL_COUNT,
        activeSessions: transports.size,
        uptime: process.uptime()
    })
})

// Tools list endpoint (convenience)
app.get('/tools', (req, res) => {
    const tools = Object.entries(toolRegistry).map(([name, tool]) => ({
        name,
        description: tool.description,
        category: getToolCategory(name)
    }))

    res.json({
        count: tools.length,
        tools
    })
})

// Session info endpoint
app.get('/sessions', (req, res) => {
    const sessionList = Array.from(sessions.values()).map(s => ({
        ...s,
        toolsUsed: Array.from(s.toolsUsed)
    }))

    res.json({
        count: sessionList.length,
        sessions: sessionList
    })
})

// Helper function to determine tool category
function getToolCategory(name) {
    const categories = {
        'AO Core': ['ao_spawn', 'ao_send', 'ao_dryrun', 'ao_eval', 'ao_info', 'ao_monitor'],
        'Tokens': ['token_balance', 'token_transfer', 'token_metadata'],
        'DEX': ['ao_dex_quote', 'ao_dex_swap'],
        'Arweave': ['arweave_query', 'arweave_upload', 'arweave_deploy_lua', 'arweave_id_update'],
        'Skills': ['skills_list', 'skills_get', 'skills_search', 'skills_register', 'skills_execute', 'skill_scaffold'],
        'Memory': ['memory_store', 'memory_retrieve', 'memory_list', 'memory_delete'],
        'AI': ['ao_inference', 'ao_knowledge_query'],
        'Social': ['social_post', 'social_feed'],
        'Utilities': ['network_status', 'gateway_config', 'wallet_spawn', 'ao_cron_register', 'ao_ecosystem_search']
    }

    for (const [cat, tools] of Object.entries(categories)) {
        if (tools.includes(name)) return cat
    }
    return 'Other'
}

// Start server
app.listen(PORT, HOST, () => {
    console.log('='.repeat(60))
    console.log('AOPRISM MCP Server Hub - HTTP/SSE Transport')
    console.log('='.repeat(60))
    console.log(`Server: http://${HOST}:${PORT}`)
    console.log(`Tools: ${TOOL_COUNT} available`)
    console.log(`Endpoints:`)
    console.log(`  - SSE:     http://${HOST}:${PORT}/sse`)
    console.log(`  - Health:  http://${HOST}:${PORT}/health`)
    console.log(`  - Tools:   http://${HOST}:${PORT}/tools`)
    console.log('='.repeat(60))
    console.log('Ready for MCP connections!')
})

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[HTTP Server] SIGTERM received, shutting down...')
    process.exit(0)
})

process.on('SIGINT', () => {
    console.log('[HTTP Server] SIGINT received, shutting down...')
    process.exit(0)
})
