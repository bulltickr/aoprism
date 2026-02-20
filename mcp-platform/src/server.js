#!/usr/bin/env node
/**
 * server.js — AOPRISM
 * MCP server entry point. 
 */

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { registerTools } from './tools/index.js'
import { registerResources } from './resources/index.js'
import { loadWallet } from './ao-client.js'

const args = process.argv.slice(2)
const walletArg = args.find(a => a.startsWith('--wallet='))
const walletPath = walletArg ? walletArg.replace('--wallet=', '') : undefined
const httpPortArg = args.find(a => a.startsWith('--http-port='))
const HTTP_PORT = httpPortArg ? parseInt(httpPortArg.replace('--http-port=', '')) : 3002

const wallet = loadWallet(walletPath)

// We create two server instances to support both Stdio and SSE in parallel 
// (McpServer connects 1:1 to a transport)
function createBaseServer() {
    const server = new McpServer({
        name: 'aoprism',
        version: '0.1.0',
        description: 'AOPRISM — The Parallel Reactive Intelligent System Mesh for AO',
    })
    registerTools(server)
    registerResources(server)
    return server
}

async function startHttpServer() {
    const app = express()
    const server = createBaseServer() // Dedicated HTTP instance

    // Security Hardening
    app.disable('x-powered-by')

    const whitelist = ['http://localhost:5173', 'http://127.0.0.1:5173']
    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl) or whitelisted origins
            if (!origin || whitelist.indexOf(origin) !== -1) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }))

    // Localhost-only firewall
    app.use((req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || req.connection?.remoteAddress
        const isLocal = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === 'localhost' || !ip
        if (isLocal) {
            next()
        } else {
            console.error(`[Security] Blocked non-local attempt from ${ip}`)
            res.status(403).send('Forbidden: Localhost Only')
        }
    })

    app.use(bodyParser.json())

    // Track active sessions
    const sessions = new Map()
    let sessionCounter = 0

    // Health check endpoint (A7)
    app.get('/health', (req, res) => {
        const toolCount = server.server?.['__toolCount'] || server._registeredTools?.size || 39
        res.json({
            status: 'ok',
            tools: toolCount,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        })
    })

    // Sessions endpoint (A8)
    app.get('/sessions', (req, res) => {
        const sessionList = Array.from(sessions.values()).map(s => ({
            id: s.id,
            connectedAt: s.connectedAt,
            name: s.name || 'Anonymous'
        }))
        res.json({ sessions: sessionList })
    })

    // Tools listing endpoint
    app.get('/tools', (req, res) => {
        const tools = server.server?.['__tools'] || []
        res.json({ count: tools.length, tools })
    })

    let sseTransport = null

    app.get('/sse', async (req, res) => {
        try {
            console.error(`[Neural Bridge] 🔌 SSE Client Connecting...`)
            const sessionId = `session-${++sessionCounter}`
            sseTransport = new SSEServerTransport('/messages', res)

            // Track session
            sessions.set(sessionId, {
                id: sessionId,
                connectedAt: new Date().toISOString(),
                name: req.query.name || 'Client'
            })

            await server.connect(sseTransport)

            // Clean up session on disconnect
            req.on('close', () => {
                sessions.delete(sessionId)
                console.error(`[Neural Bridge] 🔌 Session ${sessionId} disconnected`)
            })
        } catch (err) {
            console.error('[SSE Error]', err)
            if (!res.headersSent) res.status(500).send('Internal Server Error')
        }
    })

    app.post('/messages', async (req, res) => {
        if (!sseTransport) return res.status(400).send('No active transport')
        try {
            await sseTransport.handlePostMessage(req, res)
        } catch (err) {
            console.error('[POST Error]', err)
            if (!res.headersSent) res.status(500).send('Message Processing Error')
        }
    })

    // Error Handler
    app.use((err, req, res, next) => {
        console.error('[Internal Error]', err.stack || err)
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error')
        }
    })

    app.listen(HTTP_PORT, '127.0.0.1', () => {
        console.error(`[Neural Bridge] 🌉 HTTP Server listening on port ${HTTP_PORT}`)
    })
}

async function startStdioServer() {
    const server = createBaseServer() // Dedicated Stdio instance
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error(`[Neural Bridge] ⌨️  STDIO Transport Active`)
}

async function main() {
    startHttpServer().catch(e => console.error("HTTP Error:", e))
    startStdioServer().catch(e => console.error("Stdio Error:", e))
}

main().catch(err => {
    console.error('[ao-mcp] Fatal error:', err)
    process.exit(1)
})
