/**
 * server.test.js
 * Unit and integration tests for MCP Server Hub
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test configuration
const TEST_TIMEOUT = 30000
const SERVER_STARTUP_TIME = 2000

describe('MCP Server Hub', () => {
    describe('Tool Registry', () => {
        it('should have all 34 tools registered', async () => {
            const { toolRegistry, TOOL_COUNT } = await import('../src/tools/index.js')
            
            expect(TOOL_COUNT).toBe(34)
            expect(Object.keys(toolRegistry).length).toBe(34)
        })

        it('should have valid tool structure', async () => {
            const { toolRegistry } = await import('../src/tools/index.js')
            
            for (const [name, tool] of Object.entries(toolRegistry)) {
                expect(tool).toHaveProperty('name')
                expect(tool).toHaveProperty('description')
                expect(tool).toHaveProperty('schema')
                expect(tool).toHaveProperty('handler')
                expect(typeof tool.handler).toBe('function')
                expect(tool.description.length).toBeGreaterThan(0)
            }
        })

        it('should categorize tools correctly', async () => {
            const { toolCategories, getToolNames } = await import('../src/tools/index.js')
            
            const allCategorizedTools = Object.values(toolCategories).flat()
            const uniqueTools = [...new Set(allCategorizedTools)]
            
            expect(uniqueTools.length).toBe(getToolNames().length)
        })
    })

    describe('Security', () => {
        it('should generate secure API keys', async () => {
            const { generateApiKey, hashApiKey, verifyApiKey } = await import('../src/security.js')
            
            const key1 = generateApiKey()
            const key2 = generateApiKey()
            
            expect(key1).not.toBe(key2)
            expect(key1.length).toBe(64) // 32 bytes hex = 64 chars
            
            const hash = hashApiKey(key1)
            expect(verifyApiKey(key1, hash)).toBe(true)
            expect(verifyApiKey(key2, hash)).toBe(false)
        })

        it('should create rate limiter middleware', async () => {
            const { createRateLimiter } = await import('../src/security.js')
            
            const limiter = createRateLimiter({
                windowMs: 60000,
                max: 10
            })
            
            expect(typeof limiter).toBe('function')
        })
    })
})

describe('MCP Server Integration', () => {
    let serverProcess

    beforeAll(async () => {
        // Start the STDIO server for testing
        serverProcess = spawn('node', ['src/index.js'], {
            cwd: join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe']
        })

        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, SERVER_STARTUP_TIME))

        // Check for startup errors
        if (serverProcess.exitCode !== null) {
            throw new Error('Server failed to start')
        }
    }, TEST_TIMEOUT)

    afterAll(() => {
        if (serverProcess) {
            serverProcess.kill()
        }
    })

    it('should start without errors', () => {
        expect(serverProcess.exitCode).toBeNull()
    })

    it('should respond to ListTools request', async () => {
        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
        }

        return new Promise((resolve, reject) => {
            let response = ''

            serverProcess.stdout.on('data', (data) => {
                response += data.toString()
                
                try {
                    const lines = response.trim().split('\n')
                    for (const line of lines) {
                        const parsed = JSON.parse(line)
                        if (parsed.id === 1 && parsed.result) {
                            expect(parsed.result.tools).toBeDefined()
                            expect(parsed.result.tools.length).toBe(34)
                            resolve()
                        }
                    }
                } catch (e) {
                    // Continue collecting data
                }
            })

            serverProcess.stdin.write(JSON.stringify(request) + '\n')

            setTimeout(() => {
                reject(new Error('Timeout waiting for response'))
            }, 5000)
        })
    }, TEST_TIMEOUT)
})

describe('HTTP Server Integration', () => {
    let serverProcess
    const PORT = 3003

    beforeAll(async () => {
        // Start HTTP server on different port
        serverProcess = spawn('node', ['src/http-server.js'], {
            cwd: join(__dirname, '..'),
            env: { ...process.env, MCP_PORT: PORT.toString() },
            stdio: 'pipe'
        })

        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, SERVER_STARTUP_TIME))
    }, TEST_TIMEOUT)

    afterAll(() => {
        if (serverProcess) {
            serverProcess.kill()
        }
    })

    it('should respond to health check', async () => {
        const response = await fetch(`http://localhost:${PORT}/health`)
        expect(response.status).toBe(200)
        
        const data = await response.json()
        expect(data.status).toBe('healthy')
        expect(data.tools).toBe(34)
    })

    it('should list all tools', async () => {
        const response = await fetch(`http://localhost:${PORT}/tools`)
        expect(response.status).toBe(200)
        
        const data = await response.json()
        expect(data.count).toBe(34)
        expect(data.tools.length).toBe(34)
    })

    it('should establish SSE connection', async () => {
        const response = await fetch(`http://localhost:${PORT}/sse`)
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('text/event-stream')
    })
})

describe('Performance', () => {
    it('should respond to tool listing in <100ms', async () => {
        const { toolRegistry } = await import('../src/tools/index.js')
        
        const start = performance.now()
        Object.keys(toolRegistry).forEach(name => {
            const tool = toolRegistry[name]
            expect(tool).toBeDefined()
        })
        const duration = performance.now() - start
        
        expect(duration).toBeLessThan(100)
    })
})
