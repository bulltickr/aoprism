/**
 * Tool: skills_execute
 * Execute a dynamic skill from the AO registry.
 * Requires a wallet — state-changing operation via aoSend.
 */

import { z } from 'zod'
import { executeSkill } from '../executor.js'

export const skillsExecuteTool = {
    name: 'skills_execute',
    description: 'Execute a decentralized AI skill from the AO registry. You must provide the skill ID or name and the arguments required by the skill.',

    schema: z.object({
        id: z.string().optional().describe('43-character skill ID (hash)'),
        name: z.string().optional().describe('Skill name (if ID is not known)'),
        arguments: z.string().describe('JSON string of arguments for the skill handler')
    }).refine(data => data.id || data.name, {
        message: "Either id or name must be provided"
    }),

    async handler({ id, name, arguments: argsString }) {
        try {
            let args = {}
            try {
                args = JSON.parse(argsString)
            } catch {
                throw new Error('Arguments must be a valid JSON string')
            }

            const result = await executeSkill({ id, name, arguments: args })

            return result
        } catch (err) {
            throw new Error(`Failed to execute skill on AO: ${err.message}`)
        }
    },
}
