/**
 * state.js
 * Central "Single Source of Truth" for AOPRISM.
 * Using a simple observable pattern for manual re-renders.
 */

import { DEFAULTS } from './core/config.js'

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
    mcpTools: 34,
    mcpToolsList: [],
    mcpClients: [],
    mcpRequestCount: 0,
    mcpLogs: [],
    mcpError: null,
    mcpConnectedAt: null
}

const STORAGE_KEY = 'aoprism:state'

// Helper to save sensitive state to localStorage
function saveToStorage(state) {
    try {
        const toSave = {
            jwk: state.jwk,
            address: state.address,
            username: state.username,
            isGuest: state.isGuest,
            hasKey: state.hasKey,
            activeModule: state.activeModule,
            network: state.network,
            // MCP Server config
            mcpHost: state.mcpHost,
            mcpPort: state.mcpPort,
            mcpApiKey: state.mcpApiKey
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (e) {
        console.warn('Failed to save state to localStorage:', e)
    }
}

// Helper to load state from localStorage
function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) return {}
        return JSON.parse(saved)
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e)
        return {}
    }
}

const savedState = loadFromStorage()
let state = { ...initialState, ...savedState }
const listeners = []

export function getState() {
    return state
}

export async function setState(patch, notify = true) {
    const oldState = { ...state }

    // [PHASE 4] Secure Enclave Integration
    // If JWK is being set, load it into Rust Enclave and strip from state heap
    if (patch.jwk) {
        try {
            const { rustBridge } = await import('./core/rust-bridge.js')
            const result = await rustBridge.enclaveLoadKey(patch.jwk)
            console.log('[State] 🛡️ Key moved to Secure Enclave. Result:', result)

            // Result is now an object { address, n }
            const { address, n } = result

            // Persist encrypted/raw as requested, but remove from active heap
            localStorage.setItem('aoprism:wallet', JSON.stringify(patch.jwk))

            // Set address and flag, but null out the actual JWK in the state
            patch.address = address
            patch.publicKey = n
            patch.hasKey = true
            patch.jwk = null
        } catch (e) {
            console.error('[State] Failed to load key into enclave:', e)
        }
    }

    state = { ...state, ...patch }

    // Simple shallow comparison to prevent redundant renders
    const changed = Object.keys(patch).some(key => oldState[key] !== state[key])

    if (notify && changed) {
        listeners.forEach(cb => cb(state))
    }

    // Persist critical fields (excluding raw JWK from general state storage)
    saveToStorage(state)
}

export function subscribe(fn) {
    listeners.push(fn)
    return () => {
        const idx = listeners.indexOf(fn)
        if (idx > -1) listeners.splice(idx, 1)
    }
}

export function resetState() {
    localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
}
