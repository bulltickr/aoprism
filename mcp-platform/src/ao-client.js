/**
 * ao-client.js
 * Node.js AO/Arweave client for the MCP server.
 * Wraps @permaweb/aoconnect for server-side use (no WebCrypto browser APIs needed).
 *
 * Reads:  dryrun()  — instant, no wallet required
 * Writes: message() + result() — requires wallet
 */

import { dryrun, message, result, createDataItemSigner, connect } from '@permaweb/aoconnect'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ─── Config ────────────────────────────────────────────────────────────────

export const AO_CONFIG = {
    // HyperBEAM mainnet (active)
    URL: process.env.AO_URL ?? 'https://push.forward.computer',
    SCHEDULER: process.env.AO_SCHEDULER ?? 'n_XZJhUnmldNFo4dhajoPZWhBXuJk-OcQr5JQ49c4Zo',
    MODE: 'mainnet',
    // Arweave GraphQL gateway
    GQL: process.env.AO_GQL ?? 'https://ao-search-gateway.goldsky.com/graphql',
    GATEWAY: process.env.ARWEAVE_GATEWAY ?? 'https://arweave.net',
}


// ─── Wallet Loading ─────────────────────────────────────────────────────────

let _cachedJwk = null

/**
 * Load wallet JWK from file path or ARWEAVE_WALLET env var (JSON string).
 * Returns null if no wallet configured (read-only mode).
 */
export function loadWallet(walletPath) {
    if (_cachedJwk) return _cachedJwk

    // 1. Explicit path argument
    if (walletPath && existsSync(walletPath)) {
        _cachedJwk = JSON.parse(readFileSync(resolve(walletPath), 'utf8'))
        return _cachedJwk
    }

    // 2. ARWEAVE_WALLET env var (JSON string)
    if (process.env.ARWEAVE_WALLET) {
        try {
            _cachedJwk = JSON.parse(process.env.ARWEAVE_WALLET)
            return _cachedJwk
        } catch {
            console.error('[ao-client] ARWEAVE_WALLET env var is not valid JSON')
        }
    }

    // 3. Default wallet.json in project root
    const defaultPath = resolve(process.cwd(), '..', 'wallet.json')
    if (existsSync(defaultPath)) {
        _cachedJwk = JSON.parse(readFileSync(defaultPath, 'utf8'))
        return _cachedJwk
    }

    // SECURITY: Ensure we don't log the wallet content if found
    if (_cachedJwk) console.log('[ao-client] Wallet loaded securely.')

    return null
}

/**
 * Clear the cached wallet from memory.
 */
export function clearWallet() {
    _cachedJwk = null
}

/**
 * Get a signer from the loaded wallet. Throws if no wallet available.
 */
export function getSigner(walletPath) {
    const jwk = loadWallet(walletPath)
    if (!jwk) {
        throw new Error(
            'No wallet configured. Set ARWEAVE_WALLET env var, pass --wallet flag, or place wallet.json in project root.'
        )
    }
    return createDataItemSigner(jwk)
}

// ─── Read Operations (no wallet needed) ────────────────────────────────────

/**
 * Send a dryrun to an AO process and return the result.
 * Instant, read-only, no wallet required.
 *
 * @param {object} opts
 * @param {string} opts.process - AO process ID
 * @param {Array<{name:string,value:string}>} opts.tags - Message tags
 * @param {string} [opts.data] - Message data
 * @returns {Promise<object>} - { Messages, Spawns, Output, Error }
 */
export async function aoDryrun({ process: processId, tags = [], data = '' }) {
    const normalized = normalizeTags(tags)
    try {
        const res = await dryrun({
            process: processId,
            tags: normalized,
            data,
        })
        return {
            Messages: res.Messages || [],
            Spawns: res.Spawns || [],
            Output: res.Output || [],
            GasUsed: res.GasUsed,
            Error: res.Error,
        }
    } catch (e) {
        throw new Error(`AO dryrun failed: ${e.message}`)
    }
}

/**
 * Send a dryrun and extract the first message's Data field as parsed JSON.
 * Useful for registry reads that return JSON in Messages[0].Data.
 */
export async function aoDryrunJson({ process: processId, tags = [], data = '' }) {
    const res = await aoDryrun({ process: processId, tags, data })
    if (res.Error) throw new Error(`AO process error: ${res.Error}`)
    const raw = res.Messages?.[0]?.Data
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return raw // return as string if not JSON
    }
}

// ─── Write Operations (wallet required) ────────────────────────────────────

/**
 * Send a real message to an AO process and wait for the result.
 * Requires a wallet. Uses HyperBEAM mainnet.
 *
 * @param {object} opts
 * @param {string} opts.process - AO process ID
 * @param {Array<{name:string,value:string}>} opts.tags - Message tags
 * @param {string} [opts.data] - Message data
 * @param {string} [opts.walletPath] - Path to wallet.json (optional)
 * @returns {Promise<{messageId:string, result:object}>}
 */
let _ao = null
function getAo() {
    if (!_ao) {
        _ao = connect({
            MODE: AO_CONFIG.MODE,
            URL: AO_CONFIG.URL,
            SCHEDULER: AO_CONFIG.SCHEDULER,
        })
    }
    return _ao
}

/**
 * Send a real message to an AO process and wait for the result.
 */
export async function aoSend({ process: processId, tags = [], data = '', walletPath }) {
    const normalized = normalizeTags(tags)
    const signer = getSigner(walletPath)
    const ao = getAo()

    let messageId
    try {
        messageId = await ao.message({ process: processId, tags: normalized, data, signer })
    } catch (e) {
        throw new Error(`AO Message failed: ${e.message}`)
    }

    try {
        const res = await ao.result({ process: processId, message: messageId })
        if (res.Error) {
            // Sanitize potential sensitive info in Error
            const safeError = String(res.Error).replace(/[\w-]{30,}/g, '[REDACTED]')
            throw new Error(`AO process execution error: ${safeError}`)
        }
        return { messageId, result: res }
    } catch (e) {
        throw new Error(`AO Result failed (ID: ${messageId}): ${e.message}`)
    }
}

// ─── Arweave GraphQL ────────────────────────────────────────────────────────

/**
 * Query Arweave GraphQL for transactions.
 *
 * @param {object} opts
 * @param {Array<{name:string,values:string[]}>} [opts.tags] - Tag filters
 * @param {string} [opts.owner] - Owner wallet address
 * @param {number} [opts.first] - Number of results (default 10)
 * @param {string} [opts.after] - Cursor for pagination
 * @returns {Promise<object[]>} - Array of transaction edges
 */
const escapeGql = (s) => String(s).replace(/"/g, '\\"')

export async function arweaveQuery({ tags = [], owner, first = 10, after, id }) {
    let query;
    if (id) {
        query = `{
            transaction(id: "${escapeGql(id)}") {
                id
                owner { address }
                tags { name value }
                block { timestamp height }
                data { size }
            }
        }`
    } else {
        const tagFilter = tags.length
            ? `tags: [${tags.map(t => {
                const vals = t.values || (t.value ? [t.value] : [])
                return `{name: "${escapeGql(t.name)}", values: [${vals.map(v => `"${escapeGql(v)}"`).join(', ')}]}`
            }).join(', ')}]`
            : ''

        const ownerFilter = owner ? `owners: ["${escapeGql(owner)}"]` : ''
        const afterFilter = after ? `after: "${escapeGql(after)}"` : ''

        query = `{
            transactions(
                first: ${first}
                ${ownerFilter}
                ${tagFilter}
                ${afterFilter}
            ) {
                edges {
                    cursor
                    node {
                        id
                        owner { address }
                        tags { name value }
                        block { timestamp height }
                        data { size }
                    }
                }
                pageInfo { hasNextPage }
            }
        }`
    }

    const res = await fetch(AO_CONFIG.GQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    })

    if (!res.ok) {
        throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()
    if (json.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
    }

    if (id) {
        return {
            node: json.data?.transaction,
            edges: json.data?.transaction ? [{ node: json.data.transaction }] : [],
            pageInfo: { hasNextPage: false }
        }
    }

    return json.data?.transactions || { edges: [], pageInfo: { hasNextPage: false } }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function normalizeTags(tags) {
    if (!tags) return []
    if (!Array.isArray(tags)) throw new Error('Tags must be an array of { name, value }')
    return tags
        .filter(Boolean)
        .map(t => {
            const name = String(t?.name ?? '')
            const value = String(t?.value ?? '')

            // SECURITY: Basic sanitization to prevent potential injection or weird protocol behavior
            // Allow alphanumeric, spaces, and common punctuation. Block control characters.
            if (/[\x00-\x1F\x7F]/.test(name) || /[\x00-\x1F\x7F]/.test(value)) {
                throw new Error(`Invalid characters detected in tag: ${name}=${value}`)
            }

            return { name, value }
        })
        .filter(t => t.name.length > 0)
}
