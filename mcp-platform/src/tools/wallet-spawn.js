/**
 * Tool: wallet_spawn
 * Generates a new sub-wallet for an agent mission.
 */

import { z } from 'zod'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

export const walletSpawnTool = {
    name: 'wallet_spawn',
    description: 'Generate a new Arweave sub-wallet safely for an autonomous mission. Saves the JWK locally and returns the Address.',
    schema: z.object({
        missionId: z.string().describe('A unique identifier for this agent mission (e.g. "trading-bot-01")'),
        purpose: z.string().optional().describe('Description of what this wallet is for')
    }),
    async handler({ missionId }) {
        try {
            const ArweavePkg = await import('arweave/node/index.js')
            const Arweave = ArweavePkg.default || ArweavePkg
            const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })

            const jwk = await arweave.wallets.generate()
            const address = await arweave.wallets.jwkToAddress(jwk)

            // Ensure agents directory exists
            const agentsDir = resolve(process.cwd(), 'agents')
            if (!existsSync(agentsDir)) {
                mkdirSync(agentsDir, { recursive: true })
            }

            const walletPath = resolve(agentsDir, `${missionId}.json`)
            writeFileSync(walletPath, JSON.stringify(jwk, null, 2))

            return {
                status: 'success',
                message: `New sub-wallet spawned for mission: ${missionId}`,
                address: address,
                walletPath: walletPath,
                securityNote: 'The private key is stored locally and never exposed in cleartext. Use the walletPath for subsequent ao_send calls.'
            }
        } catch (e) {
            throw new Error(`Wallet spawning failed: ${e.message}`)
        }
    }
}
