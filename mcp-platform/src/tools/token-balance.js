/**
 * Tool: token_balance
 * Check balance for AO Token standard.
 */

import { z } from 'zod'
import { aoDryrunJson } from '../ao-client.js'

export const tokenBalanceTool = {
    name: 'token_balance',
    description: 'Check the balance of an AO Token for a specific address.',
    schema: z.object({
        token: z.string().describe('The AO process ID of the token contract'),
        recipient: z.string().optional().describe('The wallet address to check. Defaults to the current user if omitted.')
    }),
    async handler({ token, recipient }) {
        try {
            const { loadWallet, aoDryrunJson } = await import('../ao-client.js')
            const jwk = loadWallet()
            const ArweavePkg = await import('arweave/node/index.js')
            const Arweave = ArweavePkg.default || ArweavePkg
            const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })
            const owner = recipient || (jwk ? await arweave.wallets.jwkToAddress(jwk) : null)

            if (!owner) throw new Error('No owner address provided and no wallet found.')

            // 1. Fetch Balance
            const balanceData = await aoDryrunJson({
                process: token,
                tags: [
                    { name: 'Action', value: 'Balance' },
                    { name: 'Recipient', value: owner }
                ]
            })

            // 2. Fetch Token Metadata (Dynamic)
            const metadata = await aoDryrunJson({
                process: token,
                tags: [{ name: 'Action', value: 'Info' }]
            })

            return {
                token,
                name: metadata?.Name || 'Unknown Token',
                ticker: metadata?.Ticker || 'TOKEN',
                denomination: metadata?.Denomination || 0,
                owner,
                balance: balanceData || '0'
            }
        } catch (e) {
            throw new Error(`Token balance check failed: ${e.message}`)
        }
    }
}
