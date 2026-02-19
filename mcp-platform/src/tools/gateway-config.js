/**
 * Tool: gateway_config
 * Manage API keys and secrets for external gateways (Telegram, Discord, etc).
 */

import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export const gatewayConfigTool = {
    name: 'gateway_config',
    description: 'Configure external messaging bot tokens (Telegram/Discord) for the AO gateway bridge.',
    schema: z.object({
        platform: z.enum(['telegram', 'discord']).describe('The platform to configure'),
        token: z.string().describe('The bot API token (will be stored in gateway-secrets.json)')
    }),
    async handler({ platform, token }) {
        try {
            const secretsPath = resolve(process.cwd(), 'gateway-secrets.json')
            let secrets = {}

            if (existsSync(secretsPath)) {
                secrets = JSON.parse(readFileSync(secretsPath, 'utf8'))
            }

            secrets[platform] = token
            writeFileSync(secretsPath, JSON.stringify(secrets, null, 2))

            return {
                status: 'success',
                message: `${platform} gateway configured. You can now start the gateway bridge.`,
                platform
            }
        } catch (e) {
            throw new Error(`Gateway configuration failed: ${e.message}`)
        }
    }
}
