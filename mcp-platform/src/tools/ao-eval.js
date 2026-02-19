/**
 * Tool: ao_eval
 * Evaluate LUA code within an AO process.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

export const aoEvalTool = {
    name: 'ao_eval',
    description: 'Evaluate LUA code directly within an AO process for remote debugging or logic execution.',
    schema: z.object({
        process: z.string().describe('The AO process ID to evaluate code in'),
        code: z.string().describe('The LUA code snippet to execute')
    }),
    execute: async ({ process, code }) => {
        try {
            const result = await aoSend({
                process,
                tags: [{ name: 'Action', value: 'Eval' }],
                data: code
            })

            // Extract eval result from messages or output
            const evalMsg = result.result.Messages?.find(m =>
                m.Tags?.some(t => t.name === 'Action' && t.value === 'EvalResponse')
            )

            return {
                status: 'success',
                output: evalMsg?.Data || 'Code executed (No output returned)',
                details: result.result
            }
        } catch (e) {
            throw new Error(`AO eval failed: ${e.message}`)
        }
    }
}
