/**
 * state.js
 * Central "Single Source of Truth" for AOPRISM.
 * Using a simple observable pattern for manual re-renders.
 */

import { DEFAULTS } from './core/config.js'
import { rustBridge } from './core/rust-bridge.js'
import { brain } from './modules/console/ConsoleBrain.js'
import { saveToIDB, loadFromIDB, getIDBStorageEstimate, clearStore } from './utils/IndexedDB.js'

export const initialState = {
    // Navigation
    activeModule: 'dashboard', // dashboard, skills, memory, wallet

    // Auth / Wallet
    jwk: null,
    address: null,
    username: null,
    isGuest: false,
    hasKey: false,

    // AO Configuration
    network: 'hyperbeam',
    url: DEFAULTS.URL,
    scheduler: DEFAULTS.SCHEDULER,

    // Registry & Memory IDs
    registryId: 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o',
    memoryId: 'X_X9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8m',

    // Data State
    skills: [],
    memories: [],
    tokens: [
        { name: 'AO Token', ticker: 'AO', balance: '0', processId: '0syS7fS0_N9V9B8m' }
    ],
    recentSpawns: [],
    deployedModules: [],
    identity: {
        name: 'AO Agent',
        bio: 'Autonomous agent on AO Mainnet',
        avatar: null
    },

    // UI State
    loading: false,
    sending: false,
    tracingEnabled: true, // Default to true (Full Logging)
    error: null,
    response: null,

    // Legacy Demo State (preserved for modularity)
    devWallet: {
        activeTab: 'hyperbeam', // hyperbeam or legacy
        processId: '',
        muUrl: DEFAULTS.URL, // Gateway
        schedulerUrl: DEFAULTS.SCHEDULER, // Scheduler
        cuUrl: DEFAULTS.CU, // Compute Unit
        tags: [{ name: 'Action', value: 'Info' }],
        data: ''
    },

    // MCP Server Hub State
    mcpRunning: false,
    mcpHost: 'localhost',
    mcpPort: 3002,
    mcpApiKey: null,
    mcpTools: 37,
    mcpToolsList: [],
    mcpClients: [],
    mcpRequestCount: 0,
    mcpLogs: [],
    mcpError: null,
    mcpConnectedAt: null,

    // Vault Security
    vaultKey: null, // In-memory Master Key
    vaultLocked: false
}

const STORAGE_KEY = 'aoprism:state'

async function saveToStorage(state) {
    const toSave = {
        address: state.address,
        username: state.username,
        isGuest: state.isGuest,
        hasKey: state.hasKey,
        activeModule: state.activeModule,
        network: state.network,
        mcpHost: state.mcpHost,
        mcpPort: state.mcpPort,
        mcpApiKey: state.mcpApiKey
    }

    try {
        await saveToIDB('state', 'main', toSave)
    } catch (e) {
        console.warn('[State] Failed to save to IndexedDB, falling back to localStorage:', e)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
        } catch (e2) {
            console.warn('[State] Failed to save state to localStorage:', e2)
        }
    }
}

async function loadFromStorage() {
    try {
        const idbData = await loadFromIDB('state', 'main')
        if (idbData) {
            console.log('[State] Loaded state from IndexedDB')
            return idbData
        }
    } catch (e) {
        console.warn('[State] Failed to load from IndexedDB, trying localStorage:', e)
    }

    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) return {}
        return JSON.parse(saved)
    } catch (e) {
        console.warn('[State] Failed to load state from localStorage:', e)
        return {}
    }
}

let state = { ...initialState } // Initialize with initialState, will be updated by initializeState
const listeners = []

export async function initializeState() {
    const saved = await loadFromStorage()
    state = { ...initialState, ...saved }

    const walletData = localStorage.getItem('aoprism:wallet')
    if (walletData) {
        try {
            const parsed = JSON.parse(walletData)
            if (parsed.ciphertext) {
                state.vaultLocked = true
                state.hasKey = true
            } else {
                state.jwk = parsed
                state.hasKey = true
            }
        } catch (e) {
            console.error('Failed to parse wallet data:', e)
        }
    }

    const storageInfo = await getIDBStorageEstimate()
    if (storageInfo) {
        console.log(`[State] IndexedDB storage: ${(storageInfo.usage / 1024 / 1024).toFixed(2)}MB / ${(storageInfo.quota / 1024 / 1024).toFixed(2)}MB (${storageInfo.usagePercent}%)`)
    }
}

export function getState() {
    return state
}

export async function setState(patch, notify = true) {
    const oldState = { ...state }

    // [PHASE 4] Secure Enclave Integration
    // If JWK is being set, load it into Rust Enclave and strip from state heap
    if (patch.jwk) {
        try {
            const result = await rustBridge.enclaveLoadKey(patch.jwk)

            const { address, n } = result

            // [B2 FIX] Encrypt JWK before storing
            if (state.vaultKey) {
                const encrypted = await rustBridge.encryptData(patch.jwk, state.vaultKey)
                localStorage.setItem('aoprism:wallet', JSON.stringify(encrypted))
            }

            // Set address and flag, but null out the actual JWK in the state
            patch.address = address
            patch.publicKey = n
            patch.hasKey = true
            patch.jwk = null
        } catch (e) {
            console.error('[State] Failed to load key into enclave:', e)
        }
    }

    // Handle vault unlocking
    if (patch.vaultKey && state.vaultLocked) {
        try {
            const walletData = localStorage.getItem('aoprism:wallet')
            const passAudit = localStorage.getItem('aoprism:vault_audit')

            if (passAudit) {
                const { salt, hash } = JSON.parse(passAudit)
                const { verifyPassword } = await import('./core/crypto.js')
                const isValid = await verifyPassword(patch.vaultKey, salt, hash)
                if (!isValid) throw new Error('Invalid Vault Password')
            }

            if (walletData) {
                const encrypted = JSON.parse(walletData)
                const decryptedJwk = await rustBridge.decryptData(encrypted, patch.vaultKey)

                // If this is the first unlock and no audit exists, create it
                if (!passAudit) {
                    const { derivePasswordAudit } = await import('./core/crypto.js')
                    const audit = await derivePasswordAudit(patch.vaultKey)
                    localStorage.setItem('aoprism:vault_audit', JSON.stringify(audit))
                }

                patch.jwk = decryptedJwk
                patch.vaultLocked = false
            }
        } catch (e) {
            console.error('[State] Failed to unlock vault:', e)
            throw new Error(e.message === 'Invalid Vault Password' ? e.message : 'Decryption failed (Check password)')
        }
    }

    state = { ...state, ...patch }

    // Simple shallow comparison to prevent redundant renders
    const changed = Object.keys(patch).some(key => oldState[key] !== state[key])

    if (notify && changed) {
        listeners.forEach(cb => cb(state))
    }

    // Persist critical fields (excluding raw JWK from general state storage)
    await saveToStorage(state)
}

export function subscribe(fn) {
    listeners.push(fn)
    return () => {
        const idx = listeners.indexOf(fn)
        if (idx > -1) listeners.splice(idx, 1)
    }
}

export async function resetState() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('aoprism:wallet')

    // Clear IndexedDB stores
    try {
        await clearStore('state')
        await clearStore('memories')
        await clearStore('skills')
        await clearStore('cache')
    } catch (e) {
        console.warn('[State] Failed to clear IndexedDB during reset:', e)
    }

    // Nuclear wipe: clear enclave and in-memory key material
    try {
        await rustBridge.enclaveClear()
        brain.wipe()
    } catch (e) {
        console.warn('[State] Failed to clear enclave during reset:', e)
    }

    setState(initialState)
}
