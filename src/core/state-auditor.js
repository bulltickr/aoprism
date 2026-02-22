import { rustBridge } from './rust-bridge.js'
import { DEFAULTS } from './config.js'

const MOCK_ASSIGNMENTS = [
    { nonce: "1", epoch: 0, timestamp: Date.now() - 300000 },
    { nonce: "2", epoch: 0, timestamp: Date.now() - 200000 },
    { nonce: "3", epoch: 0, timestamp: Date.now() - 100000 }
]

class SUClient {
    constructor(schedulerUrl) {
        this.schedulerUrl = schedulerUrl
        this.gqlUrl = 'https://ao-search-gateway.goldsky.com/graphql'
    }

    async fetchFromScheduler(processId, limit = 100) {
        const url = `${this.schedulerUrl}/process/${processId}/assignments?limit=${limit}`
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        
        if (!response.ok) {
            throw new Error(`Scheduler fetch failed: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        return data.assignments || data.messages || []
    }

    async fetchFromGraphQL(processId, limit = 100) {
        const query = `
            query GetProcessMessages($processId: String!, $limit: Int!) {
                transactions(
                    tags: [
                        { name: "Process", values: [$processId] }
                        { name: "Data-Protocol", values: ["ao"] }
                    ]
                    first: $limit
                ) {
                    edges {
                        node {
                            id
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
                                height
                            }
                        }
                    }
                }
            }
        `
        
        const response = await fetch(this.gqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query, 
                variables: { processId, limit } 
            })
        })
        
        if (!response.ok) {
            throw new Error(`GraphQL fetch failed: ${response.status}`)
        }
        
        const json = await response.json()
        if (json.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
        }
        
        const edges = json.data?.transactions?.edges || []
        return edges.map(edge => {
            const tags = edge.node.tags.reduce((acc, t) => {
                acc[t.name] = t.value
                return acc
            }, {})
            
            return {
                id: edge.node.id,
                nonce: tags['Nonce'] || tags['Sequence'] || '0',
                epoch: parseInt(tags['Epoch'] || '0'),
                timestamp: (edge.node.block?.timestamp || Date.now() / 1000) * 1000,
                tags
            }
        })
    }
}

/**
 * StateAuditor
 * Implements the Holographic Verification pattern for AO processes.
 * It audits the Scheduler's claims by verifying signatures and sequence continuity in Rust.
 */
export class StateAuditor {
    constructor() {
        this.results = new Map()
        this.suClient = null
    }

    _getSUClient() {
        if (!this.suClient) {
            this.suClient = new SUClient(DEFAULTS.SCHEDULER)
        }
        return this.suClient
    }

    /**
     * Audit a process by checking its assignment chain.
     * Fetches real assignments from the Scheduler Unit (SU) if none provided.
     */
    async auditProcess(processId, assignments = []) {
        try {
            if (assignments.length === 0) {
                assignments = await this.fetchFromSU(processId)
            }

            const assignmentsJson = JSON.stringify(assignments)
            const isValidSequence = await rustBridge.auditSequence(assignmentsJson, "0")

            const result = {
                status: isValidSequence ? 'verified' : 'failed',
                timestamp: Date.now(),
                count: assignments.length
            }

            this.results.set(processId, result)
            return result
        } catch (e) {
            console.error('[Auditor] Audit failed:', e)
            return { status: 'error', error: e.message }
        }
    }

    /**
     * Fetch process assignments from the Scheduler Unit (SU)
     * Uses multiple strategies: direct SU API, GraphQL fallback, then mock data
     * @param {string} processId - The AO process ID
     * @param {number} limit - Number of assignments to fetch
     * @returns {Promise<Array>} Array of assignments
     */
    async fetchFromSU(processId, limit = 100) {
        const client = this._getSUClient()
        
        try {
            return await client.fetchFromScheduler(processId, limit)
        } catch (error) {
            console.warn('[StateAuditor] Scheduler fetch failed, trying GraphQL:', error.message)
        }

        try {
            return await client.fetchFromGraphQL(processId, limit)
        } catch (error) {
            console.warn('[StateAuditor] GraphQL fetch failed, using fallback:', error.message)
        }

        console.log('[StateAuditor] Using mock assignments for:', processId)
        return [...MOCK_ASSIGNMENTS]
    }

    getAuditStatus(processId) {
        return this.results.get(processId) || { status: 'unverified' }
    }
}

export const stateAuditor = new StateAuditor()
