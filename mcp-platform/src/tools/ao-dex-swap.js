/**
 * Tool: ao_dex_swap
 * Execute automated token swaps.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

export const aoDexSwapTool = {
    name: 'ao_dex_swap',
    description: 'Execute an automated token swap on an AO DEX. Requires sufficient token allowance.',
    schema: z.object({
        dexProcess: z.string().describe('The AO process ID of the DEX'),
        fromToken: z.string().describe('The input token process ID'),
        toToken: z.string().describe('The output token process ID'),
        amount: z.string().describe('The amount to swap'),
        minOutput: z.string().optional().describe('Minimum output amount for slippage protection')
    }),
    async handler({ dexProcess, fromToken, toToken, amount, minOutput }) {
        try {
            const result = await aoSend({
                process: dexProcess,
                tags: [
                    { name: 'Action', value: 'Swap' },
                    { name: 'From-Token', value: fromToken },
                    { name: 'To-Token', value: toToken },
                    { name: 'Amount', value: amount },
                    { name: 'Min-Output', value: minOutput || '0' }
                ]
            })

            return {
                status: 'success',
                message: `Swap executed on DEX ${dexProcess}.`,
                messageId: result.messageId,
                details: result.result
            }
        } catch (e) {
            throw new Error(`DEX Swap failed: ${e.message}`)
        }
    }
}
