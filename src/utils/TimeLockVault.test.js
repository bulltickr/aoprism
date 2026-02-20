import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { initTimeLockVault, lockVault, unlockVault, resetTimeLockVault } from '../utils/TimeLockVault.js'
import { getState, setState } from '../state.js'

// Mock state
vi.mock('../state.js', () => ({
    getState: vi.fn(() => ({ jwk: { mock: 'key' } })),
    setState: vi.fn()
}))

// Mock rust-bridge so clearSensitiveData() doesn't cascade to McpBridge/localhost:3000
vi.mock('../core/rust-bridge.js', () => ({
    rustBridge: {
        enclaveClear: vi.fn().mockResolvedValue(undefined)
    }
}))

describe('Time-Lock Vault', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        resetTimeLockVault() // Destroy singleton between tests
    })

    afterEach(() => {
        resetTimeLockVault() // Cleanup
        vi.useRealTimers()
    })

    it('should initialize with correct timeout', () => {
        const onLock = vi.fn()
        const vault = initTimeLockVault({
            timeout: 300000, // 5 minutes
            warningTime: 30000, // 30 seconds
            onLock
        })

        expect(vault.timeout).toBe(300000)
        expect(vault.warningTime).toBe(30000)
    })

    it('should lock after inactivity timeout', () => {
        const onLock = vi.fn()

        initTimeLockVault({
            timeout: 5000, // 5 seconds for test
            warningTime: 1000,
            onLock
        })

        // Fast forward past timeout
        vi.advanceTimersByTime(6000)

        expect(onLock).toHaveBeenCalled()
        expect(setState).toHaveBeenCalledWith(expect.objectContaining({
            vaultLocked: true
        }))
    })

    it('should reset timer on activity', () => {
        const onLock = vi.fn()

        initTimeLockVault({
            timeout: 5000,
            warningTime: 1000,
            onLock
        })

        // Advance almost to timeout
        vi.advanceTimersByTime(4000)

        // Simulate activity
        document.dispatchEvent(new Event('mousemove'))

        // Advance past original timeout
        vi.advanceTimersByTime(3000)

        // Should NOT have locked yet (timer was reset)
        expect(onLock).not.toHaveBeenCalled()
    })

    it('should clear sensitive data on lock', () => {
        initTimeLockVault({
            timeout: 1000,
            warningTime: 500,
            onLock: () => { }
        })

        vi.runAllTimers()

        // Should clear JWK from state
        expect(setState).toHaveBeenCalledWith(expect.objectContaining({
            jwk: null
        }), false)
    })

    it('should dispatch custom events', () => {
        const lockHandler = vi.fn()
        const unlockHandler = vi.fn()

        window.addEventListener('aoprism-vault-locked', lockHandler)
        window.addEventListener('aoprism-vault-unlocked', unlockHandler)

        initTimeLockVault({
            timeout: 1000,
            warningTime: 500
        })

        vi.runAllTimers()

        expect(lockHandler).toHaveBeenCalled()

        // Cleanup
        window.removeEventListener('aoprism-vault-locked', lockHandler)
        window.removeEventListener('aoprism-vault-unlocked', unlockHandler)
    })
})
