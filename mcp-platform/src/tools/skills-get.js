/**
 * Tool: skills_get
 * Get detailed metadata for a specific skill by ID or name.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

const REGISTRY_ID = process.env.AO_REGISTRY_ID || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'

export const skillsGetTool = {
    name: 'skills_get',
    description: 'Get detailed metadata for a specific skill by its ID or name from the AO registry.',

    schema: z.object({
        id: z.string().optional().describe('43-character skill ID (hash)'),
        name: z.string().optional().describe('Skill name (if ID is not known)')
    }).refine(data => data.id || data.name, {
        message: "Either id or name must be provided"
    }),

    async handler({ id, name }) {
        try {
            const tags = [{ name: 'Action', value: 'GetSkill' }]
            if (id) tags.push({ name: 'Id', value: id })
            if (name) tags.push({ name: 'Name', value: name })

            const skill = await aoDryrunJson({
                process: REGISTRY_ID,
                tags
            })

            if (!skill) {
                throw new Error('Skill not found')
            }

            return { registryId: REGISTRY_ID, skill }
        } catch (err) {
            throw new Error(`Failed to get skill from AO: ${err.message}`)
        }
    },
}
