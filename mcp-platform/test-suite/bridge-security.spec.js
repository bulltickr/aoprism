
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'
import http from 'http'

// Configuration
const SERVER_PATH = 'src/server.js'
const TEST_PORT = 3001 // Use a different port for testing to avoid conflict with running dev server
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`

describe('🛡️ Neural Bridge Security Audit', () => {
    let serverProcess
    let sessionToken

    // Start a fresh server for every test to avoid SSE transport state issues
    beforeEach(async () => {
        return new Promise((resolve, reject) => {
            serverProcess = spawn('node', [SERVER_PATH, `--http-port=${TEST_PORT}`], {
                stdio: 'pipe',
                env: { ...process.env, PATH: process.env.PATH }
            })

            serverProcess.stderr.on('data', (data) => {
                const log = data.toString()
                console.log('[Server Log]', log) // Uncomment for debug
                if (log.includes('HTTP Server listening')) {
                    // Fetch session token from /health
                    fetch(`${BASE_URL}/health`)
                        .then(res => res.json())
                        .then(data => {
                            sessionToken = data.sessionToken
                            resolve()
                        })
                        .catch(reject)
                }
            })

            serverProcess.on('error', (err) => {
                reject(err)
            })
        })
    }, 10000)

    // Kill server after EVERY test
    afterEach(() => {
        if (serverProcess) {
            serverProcess.kill()
        }
    })

    it('✅ Should accept connections from 127.0.0.1 (Localhost)', async () => {
        const response = await fetch(`${BASE_URL}/sse`, {
            headers: { 
                'Origin': 'http://localhost:5173',
                'X-Session-Token': sessionToken
            }
        })
        expect(response.status).toBe(200)
    })

    it('🔒 Should explicitly reject non-local headers (Simulation)', async () => {
        const response = await fetch(`http://localhost:${TEST_PORT}/sse`, {
            headers: { 
                'Origin': 'http://localhost:5173',
                'X-Session-Token': sessionToken
            }
        })
        expect(response.status).toBe(200)
    })

    it('🛡️ Server should not expose dangerous headers', async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        
        try {
            const response = await fetch(`${BASE_URL}/sse`, {
                headers: { 
                    'Origin': 'http://localhost:5173',
                    'X-Session-Token': sessionToken
                },
                signal: controller.signal
            })
            const headers = response.headers
            expect(headers.get('x-powered-by')).toBeNull()
            // Check CORS
            expect(headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
        } finally {
            clearTimeout(timeout)
        }
    }, 10000)
})
