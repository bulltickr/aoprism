/**
 * TimeLockVault.js
 * Auto-lock vault after inactivity
 * Security enhancement that clears sensitive data
 */

import { getState, setState } from '../state.js'
import { brain } from '../modules/console/ConsoleBrain.js'

// Lazy-load rust-bridge so it doesn't evaluate WASM at module init time
let _rustBridge = null
async function getRustBridge() {
    if (!_rustBridge) {
        const mod = await import('../core/rust-bridge.js')
        _rustBridge = mod.rustBridge
    }
    return _rustBridge
}

const DEFAULT_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const WARNING_BEFORE = 30 * 1000 // 30 seconds warning

class TimeLockVault {
    constructor(options = {}) {
        this.timeout = options.timeout || DEFAULT_TIMEOUT
        this.warningTime = options.warningTime || WARNING_BEFORE
        this.onLock = options.onLock || (() => { })
        this.onWarning = options.onWarning || (() => { })
        this.onUnlock = options.onUnlock || (() => { })

        this.lastActivity = Date.now()
        this.isLocked = false
        this.warningShown = false
        this.lockTimer = null
        this.warningTimer = null

        this.init()
    }

    init() {
        // Track user activity
        this.trackers = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ]

        this.trackers.forEach(event => {
            document.addEventListener(event, () => this.recordActivity(), { passive: true })
        })

        // Listen for manual lock/unlock events
        window.addEventListener('aoprism-lock-vault', () => this.lock())
        window.addEventListener('aoprism-unlock-vault', () => this.unlock())

        // Start monitoring
        this.startMonitoring()

        console.log('[TimeLock] Vault auto-lock initialized:', this.timeout / 1000 / 60, 'minutes')
    }

    recordActivity() {
        if (this.isLocked) return

        this.lastActivity = Date.now()
        this.warningShown = false

        // Reset timers
        this.resetTimers()
    }

    startMonitoring() {
        this.resetTimers()
    }

    resetTimers() {
        // Clear existing timers
        if (this.lockTimer) clearTimeout(this.lockTimer)
        if (this.warningTimer) clearTimeout(this.warningTimer)

        if (this.isLocked) return

        // Set warning timer
        this.warningTimer = setTimeout(() => {
            this.showWarning()
        }, this.timeout - this.warningTime)

        // Set lock timer
        this.lockTimer = setTimeout(() => {
            this.lock()
        }, this.timeout)
    }

    showWarning() {
        if (this.warningShown || this.isLocked) return

        this.warningShown = true

        // Dispatch warning event
        window.dispatchEvent(new CustomEvent('aoprism-vault-warning', {
            detail: {
                timeRemaining: this.warningTime,
                lockTime: new Date(Date.now() + this.warningTime)
            }
        }))

        // Show UI warning
        this.showWarningToast()

        // Call callback
        this.onWarning()
    }

    showWarningToast() {
        const toast = document.createElement('div')
        toast.className = 'vault-warning-toast'
        toast.innerHTML = `
            <div class="vault-warning-content">
                <span>🔒</span>
                <span>Vault locking in 30s due to inactivity</span>
                <button id="vault-stay-active">Stay Active</button>
            </div>
        `

        document.body.appendChild(toast)

        // Auto-remove after 25 seconds
        const removeTimer = setTimeout(() => {
            toast.remove()
        }, 25000)

        // Stay active button
        toast.querySelector('#vault-stay-active').addEventListener('click', () => {
            clearTimeout(removeTimer)
            toast.remove()
            this.recordActivity()
        })
    }

    lock() {
        if (this.isLocked) return

        console.log('[TimeLock] Vault locking...')
        this.isLocked = true
        this.warningShown = false

        // Clear timers
        if (this.lockTimer) clearTimeout(this.lockTimer)
        if (this.warningTimer) clearTimeout(this.warningTimer)

        // Clear sensitive state (may be async internally, but state update is synchronous)
        try {
            this.clearSensitiveData()
        } catch (e) {
            console.warn('[TimeLock] clearSensitiveData error:', e)
        }

        // Update state
        setState({ vaultLocked: true })

        // Show lock screen (non-critical, UI only)
        try {
            this.showLockScreen()
        } catch (e) {
            console.warn('[TimeLock] showLockScreen error:', e)
        }

        // Dispatch event (always)
        window.dispatchEvent(new CustomEvent('aoprism-vault-locked'))

        // Call callback (always)
        this.onLock()
    }

    unlock() {
        if (!this.isLocked) return

        console.log('[TimeLock] Vault unlocking...')

        this.isLocked = false
        this.lastActivity = Date.now()

        // Update state
        setState({ vaultLocked: false })

        // Hide lock screen
        this.hideLockScreen()

        // Restart monitoring
        this.startMonitoring()

        // Dispatch event
        window.dispatchEvent(new CustomEvent('aoprism-vault-unlocked'))

        // Call callback
        this.onUnlock()
    }

    clearSensitiveData() {
        // Get current state
        const state = getState()

        // [PHASE 7] Clear Rust Enclave (fire-and-forget via lazy import)
        getRustBridge()
            .then(bridge => bridge.enclaveClear())
            .then(() => {
                console.log('[TimeLock] 🛡️ Rust Secure Enclave cleared')
                // Also wipe the AI Brain memory
                brain.wipe()
                console.log('[TimeLock] 🧠 AI Brain memory wiped')
            })
            .catch(e => console.warn('[TimeLock] Failed to clear enclave/brain:', e))

        // Clear sensitive fields in JS (synchronous)
        const cleared = {
            ...state,
            jwk: null,
        }

        setState(cleared, false)
        console.log('[TimeLock] Sensitive data cleared')
    }

    showLockScreen() {
        // Remove existing lock screen
        this.hideLockScreen()

        const lockScreen = document.createElement('div')
        lockScreen.id = 'vault-lock-screen'
        lockScreen.className = 'vault-lock-screen'
        lockScreen.innerHTML = `
            <div class="vault-lock-content">
                <div class="vault-lock-icon">🔒</div>
                <h2>Vault Locked</h2>
                <p>Your vault has been locked due to inactivity</p>
                <button class="btn btn-primary" id="vault-unlock-btn">
                    Unlock Vault
                </button>
            </div>
        `

        document.body.appendChild(lockScreen)

        // Unlock button
        lockScreen.querySelector('#vault-unlock-btn').addEventListener('click', () => {
            // Prompt for password/wallet reconnection
            this.promptForUnlock()
        })
    }

    hideLockScreen() {
        const existing = document.getElementById('vault-lock-screen')
        if (existing) {
            existing.remove()
        }
    }

    promptForUnlock() {
        // Simple unlock for now - in production, this would prompt for password
        // or wallet reconnection
        const state = getState()

        if (state.jwk) {
            // Already have key (user reconnected wallet)
            this.unlock()
        } else {
            // Show wallet connection prompt
            window.dispatchEvent(new CustomEvent('aoprism-prompt-wallet'))
        }
    }

    // Manual controls
    extendTime(minutes) {
        this.timeout = minutes * 60 * 1000
        this.recordActivity()
        console.log(`[TimeLock] Timeout extended to ${minutes} minutes`)
    }

    disable() {
        if (this.lockTimer) clearTimeout(this.lockTimer)
        if (this.warningTimer) clearTimeout(this.warningTimer)
        console.log('[TimeLock] Auto-lock disabled')
    }

    enable() {
        this.startMonitoring()
        console.log('[TimeLock] Auto-lock enabled')
    }
}

// Singleton instance
let vaultInstance = null

export function initTimeLockVault(options = {}) {
    if (!vaultInstance) {
        vaultInstance = new TimeLockVault(options)
    }
    return vaultInstance
}

export function resetTimeLockVault() {
    if (vaultInstance) {
        vaultInstance.disable()
        vaultInstance = null
    }
}

export function lockVault() {
    if (vaultInstance) {
        vaultInstance.lock()
    }
}

export function unlockVault() {
    if (vaultInstance) {
        vaultInstance.unlock()
    }
}

export function extendVaultTime(minutes) {
    if (vaultInstance) {
        vaultInstance.extendTime(minutes)
    }
}
