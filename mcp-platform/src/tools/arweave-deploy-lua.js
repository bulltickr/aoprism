/**
 * Tool: arweave_deploy_lua
 * Upload Lua code as a permanent Arweave module.
 */

import { z } from 'zod'

export const arweaveDeployLuaTool = {
    name: 'arweave_deploy_lua',
    description: 'Deploy Lua source code as a permanent Arweave module. Returns the Module ID for spawning.',
    schema: z.object({
        code: z.string().describe('The Lua source code to deploy'),
        tags: z.array(z.object({
            name: z.string(),
            value: z.string()
        })).optional().describe('Additional metadata tags')
    }),
    async handler({ code, tags = [] }) {
        try {
            const { loadWallet } = await import('../ao-client.js')
            const jwk = loadWallet()
            if (!jwk) throw new Error('Wallet required for deployment.')

            const ArweavePkg = await import('arweave/node/index.js')
            const Arweave = ArweavePkg.default || ArweavePkg
            const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })

            const tx = await arweave.createTransaction({ data: code }, jwk)
            tx.addTag('Content-Type', 'application/x-lua')
            tx.addTag('Type', 'Module')
            tx.addTag('Data-Protocol', 'ao')
            tx.addTag('Variant', 'ao.TN.1')
            tags.forEach(t => tx.addTag(t.name, t.value))

            await arweave.transactions.sign(tx, jwk)
            const response = await arweave.transactions.post(tx)

            if (response.status !== 200) {
                throw new Error(`Deployment failed: ${response.status}`)
            }

            return {
                status: 'success',
                moduleId: tx.id,
                url: `https://arweave.net/${tx.id}`,
                message: 'Lua module deployed successfully.'
            }
        } catch (e) {
            throw new Error(`Lua deployment failed: ${e.message}`)
        }
    }
}
