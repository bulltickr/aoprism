/**
 * Tool: ao_spawn
 * Spawn a new AO process on Hyperbeam.
 */

import { z } from 'zod'
import { connect } from '@permaweb/aoconnect'
import { AO_CONFIG, getSigner } from '../ao-client.js'

export const aoSpawnTool = {
    name: 'ao_spawn',
    description: 'Spawn a new AO process with a specific WASM module and scheduler.',
    schema: z.object({
        module: z.string().describe('The WASM module ID to use for the process'),
        scheduler: z.string().default(AO_CONFIG.SCHEDULER).describe('The AO scheduler ID'),
        tags: z.array(z.object({
            name: z.string(),
            value: z.string()
        })).optional().describe('Custom tags for the new process'),
        data: z.string().optional().describe('Initial data for the process')
    }),
    async handler({ module, scheduler, tags = [], data = '' }) {
        try {
            const { loadWallet } = await import('../ao-client.js')
            const jwk = loadWallet()
            if (!jwk) throw new Error('Wallet required for spawn.')

            const { spawn, createDataItemSigner } = await import('@permaweb/aoconnect')
            const signer = createDataItemSigner(jwk)

            const processId = await spawn({
                module: module || 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s',
                scheduler: scheduler || 'n_XZJhUnmldNFo4dhajoPZWhBXuJk-OcQr5JQ49c4Zo',
                tags: tags || [],
                data: data || '',
                signer
            })

            return {
                status: 'success',
                processId,
                message: `Spawned process ${processId} on AO.`
            }
        } catch (e) {
            console.error('[ao_spawn] Error:', e)
            throw new Error(`AO spawn failed: ${e.message || 'Unknown error'}`)
        }
    }
}
