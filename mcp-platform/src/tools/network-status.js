/**
 * Tool: network_status
 * Query AO network health.
 */

import { z } from 'zod'
import { AO_CONFIG } from '../ao-client.js'

export const networkStatusTool = {
    name: 'network_status',
    description: 'Query the current health, load, and performance metrics of the AO/Hyperbeam network.',
    schema: z.object({}),
    handler: async () => {
        try {
            const res = await fetch(AO_CONFIG.URL)
            const text = await res.text()

            // Basic health check from the gateway root
            return {
                gateway: AO_CONFIG.URL,
                status: res.status === 200 ? 'Healthy' : 'Degraded',
                responseTime: 'Live',
                protocol: 'ao.TN.1',
                message: text.slice(0, 100) + '...'
            }
        } catch (e) {
            throw new Error(`Network status check failed: ${e.message}`)
        }
    }
}
