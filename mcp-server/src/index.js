#!/usr/bin/env node

/**
 * MCP Server Hub - STDIO Transport
 * Exposes AOPRISM's 34 MCP tools as a universal MCP server
 * 
 * Usage: node src/index.js
 * Or: npx @aoprism/mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ErrorCode,
    McpError
} from '@modelcontextprotocol/sdk/types.js'
import { toolRegistry, getToolNames } from './tools/index.js'
import { zodToJsonSchema } from 'zod-to-json-schema'

const SERVER_NAME = 'aoprism-ao'
const SERVER_VERSION = '1.0.0'

/**
 * Create and configure the MCP server
 */
function createServer() {
    const server = new Server(
        {
            name: SERVER_NAME,
            version: SERVER_VERSION
        },
        {
            capabilities: {
                tools: {}
            }
        }
    )

    // Handler: ListTools - Returns all available tools
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

    // Handler: CallTool - Execute a specific tool
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params
        
        console.error(`[MCP Server] Executing tool: ${name}`)
        console.error(`[MCP Server] Arguments:`, JSON.stringify(args))

        const tool = toolRegistry[name]
        
        if (!tool) {
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}. Available tools: ${getToolNames().join(', ')}`
            )
        }

        try {
            // Validate arguments against schema
            const validatedArgs = tool.schema.parse(args)
            
            // Execute the tool
            const startTime = Date.now()
            const result = await tool.handler(validatedArgs)
            const duration = Date.now() - startTime

            console.error(`[MCP Server] Tool ${name} executed in ${duration}ms`)

            // Format response for MCP
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ],
                isError: false
            }
        } catch (error) {
            console.error(`[MCP Server] Error executing ${name}:`, error)

            // Handle Zod validation errors
            if (error.name === 'ZodError') {
                const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Validation error: ${issues}`
                        }
                    ],
                    isError: true
                }
            }

            // Handle other errors
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message || 'Unknown error'}`
                    }
                ],
                isError: true
            }
        }
    })

    return server
}

/**
 * Main entry point
 */
async function main() {
    console.error('[MCP Server] Starting AOPRISM MCP Server Hub...')
    console.error('[MCP Server] Server:', SERVER_NAME, 'v' + SERVER_VERSION)
    console.error('[MCP Server] Available tools:', getToolNames().length)

    try {
        const server = createServer()
        const transport = new StdioServerTransport()

        console.error('[MCP Server] Connecting to transport...')
        await server.connect(transport)
        console.error('[MCP Server] Ready for connections')

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.error('[MCP Server] Shutting down...')
            await server.close()
            process.exit(0)
        })

        process.on('SIGTERM', async () => {
            console.error('[MCP Server] Shutting down...')
            await server.close()
            process.exit(0)
        })

    } catch (error) {
        console.error('[MCP Server] Fatal error:', error)
        process.exit(1)
    }
}

// Start the server
main().catch(console.error)
