/**
 * Tool: skills_register
 * Register a new skill in the AO registry.
 * Requires a wallet — state-changing operation via ao_send.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

const REGISTRY_ID = process.env.AO_REGISTRY_ID || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'

export const skillsRegisterTool = {
    name: 'skills_register',
    description: 'Register a new skill in the decentralized AO Skills Registry. This makes the skill discoverable by other agents. Requires a wallet.',

    schema: z.object({
        name: z.string().describe('Readable name of the skill'),
        description: z.string().describe('Detailed description of what the skill does'),
        processId: z.string().length(43).describe('AO process ID that executes this skill'),
        version: z.string().default('0.1.0').describe('Semver version of the skill'),
        tags: z.array(z.string()).optional().describe('List of category/discovery tags'),
        inputSchema: z.string().describe('JSON schema string defining input arguments')
    }),

    async handler({ name, description, processId, version, tags, inputSchema }) {
        try {
            const aoTags = [
                { name: 'Action', value: 'RegisterSkill' },
                { name: 'Name', value: name },
                { name: 'Description', value: description },
                { name: 'ProcessId', value: processId },
                { name: 'Version', value: version }
            ]

            if (tags && tags.length > 0) {
                aoTags.push({ name: 'Tags', value: tags.join(',') })
            }

            const { messageId, result } = await aoSend({
                process: REGISTRY_ID,
                tags: aoTags,
                data: inputSchema
            })

            // Check for AO error
            if (result.Error) {
                throw new Error(`Registry error: ${result.Error}`)
            }

            // Find the RegisterSuccess or RegisterError message
            const response = result.Messages?.[0]
            const action = (response?.Tags?.find(t => t.name === 'Action') || {}).value

            if (action === 'RegisterError') {
                throw new Error(`Registry rejected: ${response.Data}`)
            }

            const id = (response?.Tags?.find(t => t.name === 'Id') || {}).value

            return {
                messageId,
                id,
                success: true,
                message: 'Skill registered successfully in the decentralized registry.'
            }
        } catch (err) {
            throw new Error(`Failed to register skill on AO: ${err.message}`)
        }
    },
}
