/**
 * openclaw.js
 * Compatibility wrapper for OpenClaw AgentSkills.
 */

import { skillsExecuteTool } from '../tools/skills-execute.js'

/**
 * Execute an OpenClaw-formatted skill.
 * OpenClaw skills usually have a 'run' or 'execute' function in a .js file.
 */
export async function executeOpenClawSkill(skillSource, args) {
    try {
        // In AOPRISM, we use skills_execute which runs logic on AO or isolated node.
        // For local-style JS skills, we wrap them in an AO process or use our internal executor.

        console.log('[openclaw-compat] Executing skill source with args:', args)

        // Mocking the bridge for now - in production, this would parse the OpenClaw manifest
        // and map it to our internal Lua/JS execution pattern.

        const result = await skillsExecuteTool.handler({
            skillId: 'openclaw-bridge',
            args: JSON.stringify({ source: skillSource, ...args })
        })

        return result
    } catch (e) {
        throw new Error(`OpenClaw compatibility error: ${e.message}`)
    }
}
