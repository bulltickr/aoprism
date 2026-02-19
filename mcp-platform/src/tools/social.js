/**
 * Tool: social
 * Interaction with the AOPRISM Social Hub.
 */

import { z } from 'zod'
import { aoSend, aoDryrunJson } from '../ao-client.js'

// This should be the Process ID of the Social Hub
const SOCIAL_HUB = process.env.PRISM_SOCIAL_HUB || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o';

export const socialPostTool = {
    name: 'social_post',
    description: 'Post a message to the AOPRISM decentralized social mesh.',
    schema: z.object({
        content: z.string().describe('The message content to post'),
        tags: z.array(z.string()).optional().describe('Hashtags or categories')
    }),
    async handler({ content, tags = [] }) {
        try {
            const result = await aoSend({
                process: SOCIAL_HUB,
                tags: [
                    { name: 'Action', value: 'Post' },
                    { name: 'Ticker', value: 'PRISM' }
                ],
                data: content
            })

            return {
                status: 'success',
                messageId: result.messageId,
                message: 'Post broadcasted to the mesh.'
            }
        } catch (e) {
            throw new Error(`Social post failed: ${e.message}`)
        }
    }
}

export const socialFeedTool = {
    name: 'social_feed',
    description: 'Retrieve the decentralized social feed from AOPRISM.',
    schema: z.object({
        limit: z.number().optional().default(20).describe('Number of posts to fetch'),
        discovery: z.boolean().optional().default(true).describe('Whether to fetch global discovery feed')
    }),
    async handler({ limit, discovery }) {
        try {
            const feed = await aoDryrunJson({
                process: SOCIAL_HUB,
                tags: [
                    { name: 'Action', value: discovery ? 'Discovery' : 'Feed' },
                    { name: 'Limit', value: String(limit) }
                ]
            })

            return {
                posts: feed || [],
                hub: SOCIAL_HUB
            }
        } catch (e) {
            throw new Error(`Social feed failed: ${e.message}`)
        }
    }
}
