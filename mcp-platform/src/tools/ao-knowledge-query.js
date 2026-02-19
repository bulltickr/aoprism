/**
 * Tool: ao_knowledge_query
 * Provides factual AO/Hyperbeam documentation to the agent.
 */

import { z } from 'zod'

// A curated "Knowledge Base" of official AO patterns to prevent hallucinations
const KNOWLEDGE_BASE = [
    {
        topic: 'AO Token Standard',
        content: 'The standard Action is "Transfer". Required tags: Action, Recipient (address), Quantity (string). Optional: Data. Decimals are usually 12.'
    },
    {
        topic: 'AOS Handlers',
        content: 'Handlers.add(name, matcher, action). Common matchers: Handlers.utils.hasMatchingTag("Action", "Value").'
    },
    {
        topic: 'Blueprint Architecture',
        content: 'Official blueprints (Token, Staking, DEX) use the "MCH" (Meta-Compute Handler) pattern. Processes should include an Info action to return their specification.'
    },
    {
        topic: 'Hyperbeam Protocol',
        content: 'The foundational messaging layer. Connection URL: https://push.forward.computer. Default Scheduler: YUsEnCSlxvOMxRd1qG6rkaPwMgi3xOorfDfYJoMDndA.'
    }
]

export const aoKnowledgeQueryTool = {
    name: 'ao_knowledge_query',
    description: 'Query official AO/Hyperbeam technical documentation and best practices to ensure on-chain accuracy.',
    schema: z.object({
        query: z.string().describe('Technical topic (e.g. "Token Standard", "Handlers")')
    }),
    handler: async ({ query }) => {
        const results = KNOWLEDGE_BASE.filter(kb =>
            kb.topic.toLowerCase().includes(query.toLowerCase()) ||
            kb.content.toLowerCase().includes(query.toLowerCase())
        )

        return {
            results: results.length > 0 ? results : ['No specific match found. Refer to cookbook_ao.arweave.net/'],
            reference: 'Official AO Cookbook & Hyperbeam Specs'
        }
    }
}
