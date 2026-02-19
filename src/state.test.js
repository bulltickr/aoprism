import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getState, setState, subscribe, resetState } from './state.js'

describe('State Store', () => {
    beforeEach(() => {
        resetState()
    })

    it('should initialize with default state', () => {
        const state = getState()
        expect(state.activeModule).toBe('dashboard')
        expect(state.loading).toBe(false)
    })

    it('should update state immutably', () => {
        const oldState = getState()
        setState({ activeModule: 'console' })
        const newState = getState()

        expect(newState.activeModule).toBe('console')
        expect(newState).not.toBe(oldState) // Reference equality check
        expect(newState.loading).toBe(false) // Preserves other keys
    })

    it('should notify subscribers', () => {
        let called = false
        const unsub = subscribe((s) => {
            called = true
            expect(s.activeModule).toBe('settings')
        })

        setState({ activeModule: 'settings' })
        expect(called).toBe(true)
        unsub()
    })

    it('should perform shallow comparison to avoid redundant updates', () => {
        let callCount = 0
        subscribe(() => callCount++)

        setState({ activeModule: 'dashboard' }) // Initial is 'dashboard'
        expect(callCount).toBe(0) // Should not trigger

        setState({ activeModule: 'console' })
        expect(callCount).toBe(1)

        setState({ activeModule: 'console' })
        expect(callCount).toBe(1) // No change
    })
})
