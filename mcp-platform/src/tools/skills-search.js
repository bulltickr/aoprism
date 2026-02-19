/**
 * Tool: skills_search
 * Search the AO registry for skills by name, description, or tag.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

const REGISTRY_ID = process.env.AO_REGISTRY_ID || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'

export const skillsSearchTool = {
    name: 'skills_search',
    description: 'Search the decentralized AO registry for skills by keyword or category tag.',

    schema: z.object({
        query: z.string().optional().describe('Keywords to search in name or description'),
        tag: z.string().optional().describe('Filter by specific category tag')
    }).refine(data => data.query || data.tag, {
        message: "Either query or tag must be provided"
    }),

    async handler({ query, tag }) {
        try {
            const tags = [{ name: 'Action', value: 'SearchSkills' }]
            if (query) tags.push({ name: 'Query', value: query })
            if (tag) tags.push({ name: 'Tag', value: tag })

            const results = await aoDryrunJson({
                process: REGISTRY_ID,
                tags
            })

            return {
                registryId: REGISTRY_ID,
                results: results || []
            }
        } catch (err) {
            throw new Error(`Failed to search skills on AO: ${err.message}`)
        }
    },
}
