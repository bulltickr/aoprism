/**
 * executor.js
 * Logic for executing AO-based skills.
 *
 * Flow:
 * 1. Get skill metadata (processId, schema)
 * 2. Validate arguments against schema
 * 3. Send message with Action="Execute" and arguments as Data (JSON)
 * 4. Wait for result and return to agent
 */

import { aoSend, aoDryrunJson } from './ao-client.js'

const REGISTRY_ID = process.env.AO_REGISTRY_ID || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'

/**
 * Execute a skill by its ID or name.
 *
 * @param {object} opts
 * @param {string} [opts.id] - Skill ID
 * @param {string} [opts.name] - Skill name
 * @param {object} opts.arguments - Arguments for the skill
 * @param {string} [opts.walletPath] - Path to wallet
 * @returns {Promise<object>} - Execution result
 */
export async function executeSkill({ id, name, arguments: args, walletPath }) {
    // 1. Look up skill in registry
    const getTags = [{ name: 'Action', value: 'GetSkill' }]
    if (id) getTags.push({ name: 'Id', value: id })
    if (name) getTags.push({ name: 'Name', value: name })

    const skill = await aoDryrunJson({
        process: REGISTRY_ID,
        tags: getTags
    })

    if (!skill) {
        throw new Error(`Skill not found: ${id || name}`)
    }

    const processId = skill.processId
    if (!processId) {
        throw new Error(`Skill ${skill.name} has no associated processId`)
    }

    // 2. Validate arguments against schema
    if (skill.schema) {
        const schema = typeof skill.schema === 'string' ? JSON.parse(skill.schema) : skill.schema
        if (schema.required) {
            for (const field of schema.required) {
                if (args[field] === undefined) {
                    throw new Error(`Execution failed: Missing required argument "${field}" for skill "${skill.name}"`)
                }
            }
        }
    }

    // 3. Prepare execution message
    const execTags = [
        { name: 'Action', value: 'Execute' },
        { name: 'Skill-Name', value: skill.name },
        { name: 'Skill-Id', value: skill.id }
    ]

    // 4. Send message and wait for result
    const { messageId, result } = await aoSend({
        process: processId,
        tags: execTags,
        data: JSON.stringify(args),
        walletPath
    })

    // 4. Handle result from skill process
    if (result.Error) {
        throw new Error(`Execution error on AO: ${result.Error}`)
    }

    // Look for a response message from the skill
    // Typically skills send back a message with Action="ExecuteResponse"
    const responseMsg = result.Messages?.find(m =>
        m.Tags?.some(t => t.name === 'Action' && t.value === 'ExecuteResponse')
    ) || result.Messages?.[0]

    let data = responseMsg?.Data
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data)
        } catch {
            // return as string
        }
    }

    return {
        skillId: skill.id,
        skillName: skill.name,
        messageId,
        result: data || 'Execution completed with no data returned'
    }
}
