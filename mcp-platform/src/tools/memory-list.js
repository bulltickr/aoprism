/**
 * Tool: memory_list
 * List all memory keys for an agent.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

const MEMORY_ID = process.env.AO_MEMORY_ID || 'X_X9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8m'

export const memoryListTool = {
    name: 'memory_list',
    description: 'List all keys and update timestamps of persistent memories stored for an agent on AO.',

    schema: z.object({
        agentId: z.string().optional().describe('Optional custom agent ID')
    }),

    async handler({ agentId }) {
        try {
            const tags = [{ name: 'Action', value: 'ListMemory' }]
            if (agentId) tags.push({ name: 'AgentId', value: agentId })

            const memories = await aoDryrunJson({
                process: MEMORY_ID,
                tags
            })

            return {
                count: (memories || []).length,
                memories: memories || []
            }
        } catch (err) {
            throw new Error(`Failed to list memories from AO: ${err.message}`)
        }
    },
}
