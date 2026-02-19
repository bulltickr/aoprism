#!/usr/bin/env node
/**
 * server.js — AOPRISM
 * MCP server entry point. 
 * Supports Dual Transport:
 * 1. STDIO (for Claude Desktop, Cursor, etc.)
 * 2. SSE/HTTP (for AOPRISM Browser Client)
 */

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { registerTools } from './tools/index.js'
import { registerResources } from './resources/index.js'
import { loadWallet, AO_CONFIG } from './ao-client.js'

// ─── Parse CLI args ─────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const walletArg = args.find(a => a.startsWith('--wallet='))
const walletPath = walletArg ? walletArg.replace('--wallet=', '') : undefined
const httpPortArg = args.find(a => a.startsWith('--http-port='))
const HTTP_PORT = httpPortArg ? parseInt(httpPortArg.replace('--http-port=', '')) : 3000

// ─── Load wallet ───────────────

const wallet = loadWallet(walletPath)
const walletStatus = wallet ? '✓ Wallet loaded (write tools enabled)' : '○ No wallet (read-only mode)'

// ─── Create MCP Server ──────────────────────────────────────────────────────

const server = new McpServer({
    name: 'aoprism',
    version: '0.1.0',
    description: 'AOPRISM — The Parallel Reactive Intelligent System Mesh for AO',
})

// ─── Register Tools & Resources ─────────────────────────────────────────────

const registeredTools = registerTools(server)
const registeredResources = registerResources(server)

// ─── Transport Handling ─────────────────────────────────────────────────────

async function startHttpServer() {
    const app = express()

    // Security: Only allow local connections for now (The "Human Firewall" foundation)
    // Defense in Depth: Explicitly bind to loopback AND check request IP.
    app.use((req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress
        if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
            next()
        } else {
            console.error(`[Security Block] Rejected connection from ${ip}`)
            res.status(403).send('Access Denied: Localhost Only')
        }
    })

    app.use(cors({ origin: '*' })) // Allow Browser Client (which visits as localhost)
    app.use(bodyParser.json())

    // SSE Transport Instance
    let sseTransport = null

    app.get('/sse', async (req, res) => {
        console.error(`[Neural Bridge] 🔌 Client Connected via SSE`)
        sseTransport = new SSEServerTransport('/messages', res)
        await server.connect(sseTransport)
    })

    app.post('/messages', async (req, res) => {
        if (!sseTransport) {
            res.sendStatus(400)
            return
        }
        await sseTransport.handlePostMessage(req, res)
    })

    // BIND TO LOCALHOST ONLY
    app.listen(HTTP_PORT, '127.0.0.1', () => {
        console.error(`[Neural Bridge] 🌉 HTTP Server listening on port ${HTTP_PORT} (Localhost Only)`)
        console.error(`[Neural Bridge] 🔗 Endpoint: http://localhost:${HTTP_PORT}/sse`)
    })
}

async function startStdioServer() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error(`[Neural Bridge] ⌨️  STDIO Transport Active`)
}

// ─── Main Entry ─────────────────────────────────────────────────────────────

async function main() {
    const aoUrl = (process.env.AO_URL && process.env.AO_URL !== 'undefined')
        ? process.env.AO_URL
        : 'https://push.forward.computer'

    console.error('╔════════════════════════════════════════╗')
    console.error('║   💎 AOPRISM: AO Agent OS  v0.2.0      ║')
    console.error('║   "The Neural Bridge" Edition          ║')
    console.error('╠════════════════════════════════════════╣')
    console.error(`║  AO URL:     ${aoUrl.replace('https://', '').slice(0, 24).padEnd(24)} ║`)
    console.error(`║  Wallet:     ${walletStatus.slice(0, 24).padEnd(24)} ║`)
    console.error(`║  HTTP Port:  ${String(HTTP_PORT).padEnd(24)} ║`)
    console.error('╚════════════════════════════════════════╝')

    // Start Both Transports
    // 1. HTTP/SSE for Browser Client ("Neural Bridge")
    await startHttpServer()

    // 2. STDIO for IDEs ("Direct Link")
    // Note: Stdio might block the thread if not handled carefully, but awaits should be fine 
    // as McpServer supports multiple connections (it manages a set of connections).
    // Actually, McpServer currently documentation implies 1:1, but the JS SDK allows multiple connect() calls 
    // creating new sessions. Let's try parallel.
    startStdioServer().catch(e => console.error("Stdio Error:", e))
}

main().catch(err => {
    console.error('[ao-mcp] Fatal error:', err)
    process.exit(1)
})
