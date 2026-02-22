const rustBridge = {
    ready: false,
    module: null,
    
    async init() {
        if (this.ready) return
        try {
            const wasmPath = '../../crates/aoprism-crypto/pkg/aoprism_crypto.js'
            const wasmModule = await import(wasmPath)
            const { default: init } = wasmModule
            await init()
            this.module = wasmModule
            this.ready = true
        } catch (e) {
            console.warn('[ReputationWorker] WASM init failed:', e.message)
            throw e
        }
    },

    async auditSequence(assignmentsJson, startNonce) {
        if (!this.ready) await this.init()
        const { audit_sequence } = this.module
        return audit_sequence(assignmentsJson, startNonce)
    }
}

const results = new Map()

async function auditProcess(processId, assignments = []) {
    try {
        if (assignments.length === 0) {
            assignments = await fetchFromSU(processId)
        }

        const assignmentsJson = JSON.stringify(assignments)
        const isValidSequence = await rustBridge.auditSequence(assignmentsJson, "0")

        const result = {
            status: isValidSequence ? 'verified' : 'failed',
            timestamp: Date.now(),
            count: assignments.length
        }

        results.set(processId, result)
        return result
    } catch (e) {
        console.error('[ReputationWorker] Audit failed:', e)
        return { status: 'error', error: e.message }
    }
}

async function fetchFromSU(processId, limit = 100) {
    try {
        const suUrl = 'https://scheduler.aoai.com'
        const url = `${suUrl}/process/${processId}/assignments?limit=${limit}`
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        
        if (!response.ok) {
            throw new Error(`SU fetch failed: ${response.status}`)
        }
        
        const data = await response.json()
        return data.assignments || data.messages || []
    } catch (error) {
        console.warn('[ReputationWorker] SU fetch failed:', error.message)
        return []
    }
}

function calculateReputation(posts, auditResults) {
    let totalTrust = 0
    const postResults = []

    for (const post of posts) {
        const audit = auditResults.get(post.id) || { status: 'unverified', count: 0 }
        
        let postTrust = post.likes || 0
        
        if (audit.status === 'verified') {
            postTrust += audit.count * 2
        } else if (audit.status === 'failed') {
            postTrust = Math.max(0, postTrust - 5)
        }

        totalTrust += postTrust
        
        postResults.push({
            postId: post.id,
            trust: postTrust,
            auditStatus: audit.status,
            verifiedCount: audit.count
        })
    }

    const avgTrust = posts.length > 0 ? Math.floor(totalTrust / posts.length) : 0
    
    return {
        totalTrust,
        avgTrust,
        posts: postResults
    }
}

self.onmessage = async function(e) {
    const { type, payload, id } = e.data

    try {
        switch (type) {
            case 'INIT':
                await rustBridge.init()
                self.postMessage({ type: 'INIT_COMPLETE', id })
                break

            case 'CALCULATE_REPUTATION': {
                const { posts } = payload
                
                const auditPromises = posts.map(post => 
                    auditProcess(post.id, []).then(result => ({
                        postId: post.id,
                        result
                    }))
                )
                
                const auditResults = new Map()
                const batchSize = 10
                
                for (let i = 0; i < auditPromises.length; i += batchSize) {
                    const batch = auditPromises.slice(i, i + batchSize)
                    const results = await Promise.all(batch)
                    
                    for (const { postId, result } of results) {
                        auditResults.set(postId, result)
                    }
                    
                    self.postMessage({ 
                        type: 'PROGRESS', 
                        id,
                        progress: Math.min(100, Math.floor(((i + batchSize) / posts.length) * 100))
                    })
                }

                const reputation = calculateReputation(posts, auditResults)
                
                self.postMessage({ 
                    type: 'REPUTATION_COMPLETE', 
                    id, 
                    reputation 
                })
                break
            }

            case 'AUDIT_POST': {
                const { postId, assignments } = payload
                const result = await auditProcess(postId, assignments)
                self.postMessage({ 
                    type: 'AUDIT_COMPLETE', 
                    id, 
                    postId, 
                    result 
                })
                break
            }

            default:
                self.postMessage({ 
                    type: 'ERROR', 
                    id, 
                    error: `Unknown message type: ${type}` 
                })
        }
    } catch (error) {
        self.postMessage({ 
            type: 'ERROR', 
            id, 
            error: error.message 
        })
    }
}
