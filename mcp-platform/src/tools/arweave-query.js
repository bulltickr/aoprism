/**
 * Tool: arweave_query
 * Search Arweave transactions by tags and/or owner address.
 * Uses the Goldsky GraphQL gateway (same as config.js).
 * No wallet required — pure read.
 */

import { z } from 'zod'
import { arweaveQuery, AO_CONFIG } from '../ao-client.js'

export const arweaveQueryTool = {
    name: 'arweave_query',
    description:
        'Search Arweave transactions by tags and/or owner address. Returns transaction IDs, tags, block info, and data size. Useful for finding AO processes, uploaded files, or any on-chain data.',

    schema: z.object({
        tags: z
            .array(
                z.object({
                    name: z.string().describe('Tag name, e.g. "Action" or "App-Name"'),
                    values: z.array(z.string()).describe('Tag values to match (OR logic)'),
                })
            )
            .optional()
            .describe('Tag filters. Multiple tags use AND logic between them.'),
        owner: z
            .string()
            .optional()
            .describe('Filter by owner wallet address (43-char Arweave address)'),
        first: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10)
            .describe('Number of results to return (max 100)'),
        after: z.string().optional().describe('Pagination cursor from a previous query'),
    }),

    async handler({ tags, owner, first, after }) {
        const result = await arweaveQuery({ tags: tags || [], owner, first, after })

        const transactions = result.edges.map(edge => ({
            id: edge.node.id,
            url: `${AO_CONFIG.GATEWAY}/${edge.node.id}`,
            owner: edge.node.owner?.address,
            tags: edge.node.tags,
            block: edge.node.block
                ? {
                    height: edge.node.block.height,
                    timestamp: edge.node.block.timestamp,
                    date: new Date(edge.node.block.timestamp * 1000).toISOString(),
                }
                : null,
            dataSize: edge.node.data?.size,
            cursor: edge.cursor,
        }))

        return {
            count: transactions.length,
            hasNextPage: result.pageInfo?.hasNextPage || false,
            transactions,
            nextCursor: transactions[transactions.length - 1]?.cursor || null,
        }
    },
}
