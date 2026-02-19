/**
 * Tool: token_metadata
 * Fetch metadata for an AO token.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

export const tokenMetadataTool = {
    name: 'token_metadata',
    description: 'Fetch Ticker, Name, and Denomination for any AO-native token process.',
    schema: z.object({
        token: z.string().describe('The AO process ID of the token contract')
    }),
    handler: async ({ token }) => {
        try {
            const metadata = await aoDryrunJson({
                process: token,
                tags: [{ name: 'Action', value: 'Info' }]
            })

            return {
                token,
                name: metadata?.Name || 'Unknown Token',
                ticker: metadata?.Ticker || 'TOKEN',
                denomination: metadata?.Denomination || 0,
                logo: metadata?.Logo || null
            }
        } catch (e) {
            throw new Error(`Failed to fetch token metadata: ${e.message}`)
        }
    }
}
