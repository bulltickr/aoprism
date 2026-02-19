/**
 * Tool: ao_cron_register
 * Register a process for recurring cron actions.
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

export const aoCronRegisterTool = {
    name: 'ao_cron_register',
    description: 'Register an AO process for recurring "Cron" heartbeat actions by the AO scheduler.',
    schema: z.object({
        process: z.string().describe('The AO process ID to register for cron'),
        interval: z.string().describe('The cron interval (e.g. "1-minute", "1-hour")')
    }),
    execute: async ({ process, interval }) => {
        try {
            const result = await aoSend({
                process,
                tags: [
                    { name: 'Action', value: 'Cron-Register' },
                    { name: 'Interval', value: interval }
                ]
            })

            return {
                status: 'success',
                message: `Cron registered for ${process} at interval: ${interval}`,
                details: result.result
            }
        } catch (e) {
            throw new Error(`Cron registration failed: ${e.message}`)
        }
    }
}
