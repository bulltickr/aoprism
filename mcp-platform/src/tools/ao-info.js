/**
 * Tool: ao_info
 * Detailed inspection of an AO process.
 */

import { z } from 'zod'
import { arweaveQuery } from '../ao-client.js'

export const aoInfoTool = {
    name: 'ao_info',
    description: 'Fetch detailed metadata, tags, and spawner info for any AO process.',
    schema: z.object({
        processId: z.string().describe('The AO process ID to inspect')
    }),
    async handler({ processId }) {
        try {
            const { arweaveQuery } = await import('../ao-client.js')

            // Unified query via core client (ID support enabled)
            const result = await arweaveQuery({ id: processId })
            const node = result.node

            if (!node) {
                throw new Error(`Process ${processId} not found in Arweave index.`)
            }

            return {
                id: node.id,
                owner: node.owner?.address,
                tags: node.tags || [],
                block: node.block || {},
                isAoProcess: node.tags?.some(t => t.name === 'Data-Protocol' && t.value === 'ao')
            }
        } catch (e) {
            throw new Error(`AO info failed: ${e.message}`)
        }
    }
}
