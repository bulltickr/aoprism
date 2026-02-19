/**
 * Tool: ao_dex_quote
 * Get price quotes from AO DEXes.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

export const aoDexQuoteTool = {
    name: 'ao_dex_quote',
    description: 'Get real-time swap quotes from AO-based Decentralized Exchanges.',
    schema: z.object({
        dexProcess: z.string().describe('The AO process ID of the DEX'),
        fromToken: z.string().describe('The input token process ID'),
        toToken: z.string().describe('The output token process ID'),
        amount: z.string().describe('The amount to swap')
    }),
    async handler({ dexProcess, fromToken, toToken, amount }) {
        try {
            const quote = await aoDryrunJson({
                process: dexProcess,
                tags: [
                    { name: 'Action', value: 'Quote' },
                    { name: 'From-Token', value: fromToken },
                    { name: 'To-Token', value: toToken },
                    { name: 'Amount', value: amount }
                ]
            })

            if (!quote) {
                throw new Error(`DEX ${dexProcess} returned no quote data.`)
            }

            return {
                dex: dexProcess,
                rate: quote.Rate || '0',
                outputAmount: quote.ExpectedOutput || '0',
                priceImpact: quote.PriceImpact || '0%',
                quoteId: quote.QuoteId || null
            }
        } catch (e) {
            console.error(`[ao_dex_quote] Error: ${e.message}`, e)
            throw new Error(`DEX Quote failed: ${e.message}`)
        }
    }
}
