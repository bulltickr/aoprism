/**
 * Tool: ao_send
 * Send a real (state-changing) message to an AO process via HyperBEAM mainnet.
 * Requires a wallet configured via ARWEAVE_WALLET env var or --wallet flag.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

export const aoSendTool = {
    name: 'ao_send',
    description:
        'Send a real message to an AO process on HyperBEAM mainnet. This creates an on-chain transaction and changes process state. Requires a wallet. Use ao_dryrun first to preview the result without committing.',

    schema: z.object({
        process: z
            .string()
            .length(43)
            .describe('AO process ID (43-character Arweave transaction ID)'),
        tags: z
            .array(
                z.object({
                    name: z.string().describe('Tag name, e.g. "Action"'),
                    value: z.string().describe('Tag value, e.g. "Transfer"'),
                })
            )
            .min(1)
            .describe('Message tags. Must include at least one tag (typically Action).'),
        data: z.string().default('').describe('Optional message data/body'),
    }),

    async handler({ process, tags, data }) {
        const { messageId, result } = await aoSend({ process, tags, data })

        // Try to parse Messages[0].Data as JSON
        const messages = (result.Messages || []).map(msg => {
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
            messageId,
            process,
            messages,
            spawns: result.Spawns || [],
            output: result.Output || [],
            error: result.Error || null,
        }
    },
}
