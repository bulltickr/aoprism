/**
 * Tool: skills_list
 * List all available skills from the AO registry.
 * No wallet required — pure read via dryrun.
 */

import { z } from 'zod'
import { aoDryrunJson, AO_CONFIG } from '../ao-client.js'

// Registry process ID (set via env var or use placeholder)
const REGISTRY_ID = process.env.AO_REGISTRY_ID || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'

export const skillsListTool = {
    name: 'skills_list',
    description: 'List all dynamic skills registered in the AO Skills Registry. Returns a list of skills with their descriptions, process IDs, and tags.',

    schema: z.object({}),

    async handler() {
        try {
            const skills = await aoDryrunJson({
                process: REGISTRY_ID,
                tags: [{ name: 'Action', value: 'ListSkills' }]
            })

            if (!skills || !Array.isArray(skills)) {
                return { skills: [], message: 'No skills found or registry not available.' }
            }

            return {
                count: skills.length,
                registryId: REGISTRY_ID,
                skills
            }
        } catch (err) {
            throw new Error(`Failed to list skills from AO: ${err.message}`)
        }
    },
}
