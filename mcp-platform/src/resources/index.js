/**
 * resources/index.js
 * Registers all MCP resources on the server.
 */

import { aoDryrunJson } from '../ao-client.js'

const REGISTRY_ID = process.env.AO_REGISTRY_ID || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'
const MEMORY_ID = process.env.AO_MEMORY_ID || 'X_X9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8m'

/**
 * Register all resources on an McpServer instance.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerResources(server) {
    // 1. skills://catalog — Full skills list as a resource
    server.resource(
        'skills-catalog',
        'skills://catalog',
        {
            name: 'Dynamic Skills Catalog',
            description: 'The live list of all dynamic AI skills registered on the AO/Arweave blockchain.'
        },
        async (uri) => {
            try {
                const skills = await aoDryrunJson({
                    process: REGISTRY_ID,
                    tags: [{ name: 'Action', value: 'ListSkills' }]
                })

                return {
                    contents: [{
                        uri: uri.href,
                        text: JSON.stringify(skills || [], null, 2),
                        mimeType: 'application/json'
                    }]
                }
            } catch (err) {
                throw new Error(`Failed to fetch skills catalog from AO: ${err.message}`)
            }
        }
    )

    // 2. skills://skill/{id} — Individual skill detail
    server.resource(
        'skill-detail',
        'skills://skill/{id}',
        {
            name: 'Skill Detail',
            description: 'Detailed metadata for a specific skill from the AO registry.'
        },
        async (uri, { id }) => {
            try {
                const skill = await aoDryrunJson({
                    process: REGISTRY_ID,
                    tags: [
                        { name: 'Action', value: 'GetSkill' },
                        { name: 'Id', value: id }
                    ]
                })

                return {
                    contents: [{
                        uri: uri.href,
                        text: JSON.stringify(skill || { error: 'Not found' }, null, 2),
                        mimeType: 'application/json'
                    }]
                }
            } catch (err) {
                throw new Error(`Failed to fetch skill ${id} from AO: ${err.message}`)
            }
        }
    )

    // 3. memory://agent/{id} — Full memory list for an agent as a resource
    server.resource(
        'agent-memory',
        'memory://agent/{id}',
        {
            name: 'Agent Memory Store',
            description: 'The full key-value store of persistent memories for a specific agent.'
        },
        async (uri, { id }) => {
            try {
                const memories = await aoDryrunJson({
                    process: MEMORY_ID,
                    tags: [
                        { name: 'Action', value: 'ListMemory' },
                        { name: 'AgentId', value: id }
                    ]
                })

                return {
                    contents: [{
                        uri: uri.href,
                        text: JSON.stringify(memories || [], null, 2),
                        mimeType: 'application/json'
                    }]
                }
            } catch (err) {
                throw new Error(`Failed to fetch agent memory from AO: ${err.message}`)
            }
        }
    )

    return ['skills://catalog', 'skills://skill/{id}', 'memory://agent/{id}']
}
