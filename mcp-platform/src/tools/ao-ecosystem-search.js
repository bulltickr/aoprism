/**
 * Tool: ao_ecosystem_search
 * Global search across all of AO.
 */

import { z } from 'zod'
import { arweaveQuery } from '../ao-client.js'

export const aoEcosystemSearchTool = {
    name: 'ao_ecosystem_search',
    description: 'Global search for AO processes, tokens, and modules across the entire network.',
    schema: z.object({
        query: z.string().describe('Search term (e.g. "Llama", "Token", "Dex")'),
        type: z.enum(['Process', 'Module', 'Token']).optional().describe('Filter by type')
    }),
    handler: async ({ query, type }) => {
        try {
            // Arweave GQL query to find things by tags or content
            const tags = [
                { name: 'Data-Protocol', values: ['ao'] }
            ]
            if (type) tags.push({ name: 'Type', values: [type] })

            const results = await arweaveQuery({
                tags,
                first: 20
            })

            // Basic filtering for demo purposes (real search would use a dedicated indexer)
            const filtered = results.edges.filter(edge => {
                const nameTag = edge.node.tags.find(t => t.name.toLowerCase() === 'name')
                return !query || (nameTag && nameTag.value.toLowerCase().includes(query.toLowerCase()))
            })

            return filtered.map(edge => ({
                id: edge.node.id,
                name: edge.node.tags.find(t => t.name === 'Name')?.value || 'Unnamed',
                type: edge.node.tags.find(t => t.name === 'Type')?.value || 'Unknown',
                tags: edge.node.tags
            }))
        } catch (e) {
            throw new Error(`Ecosystem search failed: ${e.message}`)
        }
    }
}
