/**
 * Tool: arweave_upload
 * Upload data permanently to Arweave.
 */

import { z } from 'zod'

export const arweaveUploadTool = {
    name: 'arweave_upload',
    description: 'Upload data permanently to Arweave. Requires a wallet with AR balance.',
    schema: z.object({
        data: z.string().describe('The content to upload'),
        contentType: z.string().default('text/plain').describe('The MIME type of the content'),
        tags: z.array(z.object({
            name: z.string(),
            value: z.string()
        })).optional().describe('Custom tags for the transaction')
    }),
    async handler({ data, tags, contentType }) {
        try {
            const { loadWallet } = await import('../ao-client.js')
            const jwk = loadWallet()
            if (!jwk) throw new Error('No wallet found. Upload requires a funded Arweave wallet.')

            const ArweavePkg = await import('arweave/node/index.js')
            const Arweave = ArweavePkg.default || ArweavePkg
            const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })

            const tx = await arweave.createTransaction({ data }, jwk)
            tx.addTag('Content-Type', contentType || 'text/plain')
            if (tags) {
                tags.forEach(t => tx.addTag(t.name, t.value))
            }

            await arweave.transactions.sign(tx, jwk)
            const response = await arweave.transactions.post(tx)

            if (response.status !== 200) {
                throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`)
            }

            return {
                status: 'success',
                id: tx.id,
                url: `https://arweave.net/${tx.id}`,
                message: 'Transaction broadcasted to Arweave network.'
            }
        } catch (e) {
            throw new Error(`Arweave upload failed: ${e.message}`)
        }
    }
}
