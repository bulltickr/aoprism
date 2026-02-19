/**
 * Tool: memory_store
 * Store a piece of persistent memory on AO.
 * Requires a wallet — state-changing.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

const MEMORY_ID = process.env.AO_MEMORY_ID || 'X_X9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8m'

export const memoryStoreTool = {
    name: 'memory_store',
    description: 'Store a persistent piece of information (memory) on the AO/Arweave blockchain. This information will persist across sessions and can be retrieved by your agent ID.',

    schema: z.object({
        key: z.string().describe('Unique key for this memory item (e.g. "user_preference", "last_task_id")'),
        value: z.string().describe('The content to store (stringified JSON is recommended for complex data)'),
        agentId: z.string().optional().describe('Optional custom agent ID. Defaults to your wallet address.')
    }),

    async handler({ key, value, agentId }) {
        try {
            const tags = [
                { name: 'Action', value: 'StoreMemory' },
                { name: 'Key', value: key }
            ]
            if (agentId) tags.push({ name: 'AgentId', value: agentId })

            const { messageId, result } = await aoSend({
                process: MEMORY_ID,
                tags,
                data: value
            })

            if (result.Error) {
                throw new Error(`Memory store error: ${result.Error}`)
            }

            return {
                messageId,
                key,
                success: true,
                message: 'Memory stored permanently on AO.'
            }
        } catch (err) {
            throw new Error(`Failed to store memory on AO: ${err.message}`)
        }
    },
}
