/**
 * Tool: memory_delete
 * Delete a memory item from AO.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

const MEMORY_ID = process.env.AO_MEMORY_ID || 'X_X9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8m'

export const memoryDeleteTool = {
    name: 'memory_delete',
    description: 'Delete a persistent memory item from the AO blockchain.',

    schema: z.object({
        key: z.string().describe('The key of the memory item to delete'),
        agentId: z.string().optional().describe('Optional custom agent ID')
    }),

    async handler({ key, agentId }) {
        try {
            const tags = [
                { name: 'Action', value: 'DeleteMemory' },
                { name: 'Key', value: key }
            ]
            if (agentId) tags.push({ name: 'AgentId', value: agentId })

            const { messageId, result } = await aoSend({
                process: MEMORY_ID,
                tags
            })

            if (result.Error) {
                throw new Error(`Memory delete error: ${result.Error}`)
            }

            return {
                messageId,
                key,
                success: true,
                message: 'Memory deleted from AO.'
            }
        } catch (err) {
            throw new Error(`Failed to delete memory from AO: ${err.message}`)
        }
    },
}
