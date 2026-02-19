/**
 * Tool: memory_retrieve
 * Retrieve a persistent memory item from AO.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

const MEMORY_ID = process.env.AO_MEMORY_ID || 'X_X9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8m'

export const memoryRetrieveTool = {
    name: 'memory_retrieve',
    description: 'Retrieve a piece of persistent memory previously stored on AO.',

    schema: z.object({
        key: z.string().describe('The key of the memory item to retrieve'),
        agentId: z.string().optional().describe('Optional custom agent ID (if different from current wallet)')
    }),

    async handler({ key, agentId }) {
        try {
            const tags = [
                { name: 'Action', value: 'GetMemory' },
                { name: 'Key', value: key }
            ]
            if (agentId) tags.push({ name: 'AgentId', value: agentId })

            // We use aoDryrunJson but remember manual response handling might be needed 
            // if it's not JSON. The handler returns { Action, Key, Data }
            const res = await aoDryrunJson({
                process: MEMORY_ID,
                tags
            })

            // If res is null or doesn't have data, it might be GetMemoryError
            if (!res || res.Action === 'GetMemoryError') {
                throw new Error(`Memory not found for key: ${key}`)
            }

            return {
                key,
                value: res, // aoDryrunJson tries to parse it
                registryId: MEMORY_ID
            }
        } catch (err) {
            throw new Error(`Failed to retrieve memory from AO: ${err.message}`)
        }
    },
}
