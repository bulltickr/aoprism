/**
 * Tool: ao_monitor
 * Monitor recent messages for an AO process.
 */

import { z } from 'zod'
import { connect } from '@permaweb/aoconnect'
import { AO_CONFIG } from '../ao-client.js'

export const aoMonitorTool = {
    name: 'ao_monitor',
    description: 'Monitor the most recent messages and actions for a specific AO process.',
    schema: z.object({
        process: z.string().describe('The AO process ID to monitor'),
        limit: z.number().default(10).describe('Number of recent messages to fetch')
    }),
    handler: async ({ process, limit }) => {
        const ao = connect({
            MODE: AO_CONFIG.MODE,
            URL: AO_CONFIG.URL,
            SCHEDULER: AO_CONFIG.SCHEDULER
        })

        try {
            // result() can fetch the last interaction or we dryrun a "Recent" action 
            // Most standard AO processes support an 'Info' or 'History' action.
            const result = await ao.dryrun({
                process,
                tags: [{ name: 'Action', value: 'History' }, { name: 'Limit', value: String(limit) }]
            })

            return {
                process,
                messages: result.Messages || [],
                spawns: result.Spawns || [],
                output: result.Output || 'Monitor active. Result set returned.'
            }
        } catch (e) {
            throw new Error(`AO monitoring failed: ${e.message}`)
        }
    }
}
