/**
 * Tool: ao_dryrun
 * Send a read-only dryrun to any AO process and get the result instantly.
 * No wallet required. Perfect for querying process state.
 */

import { z } from 'zod'
import { aoDryrun } from '../ao-client.js'

export const aoDryrunTool = {
    name: 'ao_dryrun',
    description:
        'Send a read-only message (dryrun) to any AO process and get the result instantly. No wallet required. Use this to query process state, check balances, list items, or call any read handler on an AO process.',

    schema: z.object({
        process: z
            .string()
            .length(43)
            .describe('AO process ID (43-character Arweave transaction ID)'),
        tags: z
            .array(
                z.object({
                    name: z.string().describe('Tag name, e.g. "Action"'),
                    value: z.string().describe('Tag value, e.g. "Info"'),
                })
            )
            .default([{ name: 'Action', value: 'Info' }])
            .describe('Message tags. The Action tag determines which handler runs.'),
        data: z.string().default('').describe('Optional message data/body'),
    }),

    async handler({ process, tags, data }) {
        const result = await aoDryrun({ process, tags, data })

        // Try to parse Messages[0].Data as JSON for nicer output
        const messages = result.Messages.map(msg => {
            let parsedData = msg.Data
            if (typeof msg.Data === 'string') {
                try {
                    parsedData = JSON.parse(msg.Data)
                } catch {
                    // keep as string
                }
            }
            return { ...msg, Data: parsedData }
        })

        return {
            process,
            messages,
            spawns: result.Spawns,
            output: result.Output,
            gasUsed: result.GasUsed,
            error: result.Error || null,
        }
    },
}
