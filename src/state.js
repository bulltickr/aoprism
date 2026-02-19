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
    }
}

const STORAGE_KEY = 'aoprism:state'

// Helper to save sensitive state to localStorage
function saveToStorage(state) {
    try {
        const toSave = {
            jwk: state.jwk,
            address: state.address,
            username: state.username,
            activeModule: state.activeModule,
            network: state.network
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

export function setState(patch) {
    state = { ...state, ...patch }
    saveToStorage(state)
    // Notify all listeners (usually the main render function)
    listeners.forEach(fn => fn(state))
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
