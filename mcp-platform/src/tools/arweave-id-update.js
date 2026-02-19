/**
 * Tool: arweave_id_update
 * Update Arweave ID profile (identity).
 */

import { z } from 'zod'

export const arweaveIdUpdateTool = {
    name: 'arweave_id_update',
    description: 'Update the on-chain identity (Name, Bio, Avatar) for the current wallet using Arweave ID standard.',
    schema: z.object({
        name: z.string().optional().describe('Display name'),
        bio: z.string().optional().describe('Short biography'),
        avatar: z.string().optional().describe('Arweave Transaction ID of the avatar image')
    }),
    async handler({ name, bio, avatar }) {
        try {
            const { loadWallet } = await import('../ao-client.js')
            const jwk = loadWallet()
            if (!jwk) throw new Error('Wallet required for identity update.')

            const ArweavePkg = await import('arweave/node/index.js')
            const Arweave = ArweavePkg.default || ArweavePkg
            const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })

            // Arweave ID uses specifically tagged transactions directed back to the owner
            const tx = await arweave.createTransaction({ data: 'update-id' }, jwk)
            tx.addTag('App-Name', 'ArweaveID')
            tx.addTag('App-Version', '0.0.2')
            if (name) tx.addTag('Name', name)
            if (bio) tx.addTag('Bio', bio)
            if (avatar) tx.addTag('Avatar', avatar)

            await arweave.transactions.sign(tx, jwk)
            const response = await arweave.transactions.post(tx)

            return {
                status: response.status === 200 ? 'success' : 'pending',
                id: tx.id,
                message: 'Identity update broadcasted to the Arweave network.'
            }
        } catch (e) {
            throw new Error(`Identity update failed: ${e.message}`)
        }
    }
}
