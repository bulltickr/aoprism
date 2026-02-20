/**
 * Tool: token_transfer
 * Transfer AO-standard tokens.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

export const tokenTransferTool = {
    name: 'token_transfer',
    description: 'Transfer AO-standard tokens to another address.',
    schema: z.object({
        token: z.string().length(43).regex(/^[A-Za-z0-9_-]+$/).describe('The AO process ID of the token contract'),
        recipient: z.string().length(43).regex(/^[A-Za-z0-9_-]+$/).describe('The recipient wallet address'),
        quantity: z.string().regex(/^\d+(\.\d+)?$/).describe('The amount of tokens to transfer (as a string to handle decimals)')
    }),
    handler: async ({ token, recipient, quantity }) => {
        try {
            const result = await aoSend({
                process: token,
                tags: [
                    { name: 'Action', value: 'Transfer' },
                    { name: 'Recipient', value: recipient },
                    { name: 'Quantity', value: quantity }
                ]
            })

            return {
                status: 'success',
                message: `Transferred ${quantity} tokens to ${recipient}`,
                messageId: result.messageId,
                details: result.result
            }
        } catch (e) {
            throw new Error(`Token transfer failed: ${e.message}`)
        }
    }
}
