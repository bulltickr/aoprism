
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeCommand } from '../../src/modules/console/CommandConsole.js'
import * as stateModule from '../../src/state.js'
import * as aoClientModule from '../../src/core/aoClient.js'
import { brain } from '../../src/modules/console/ConsoleBrain.js'

// Mock dependencies
vi.mock('../../src/state.js', () => ({
    getState: vi.fn(),
    setState: vi.fn()
}))

vi.mock('../../src/core/aoClient.js', () => ({
    makeAoClient: vi.fn()
}))

vi.mock('../../src/modules/console/ConsoleBrain.js', () => ({
    brain: {
        setConfig: vi.fn(),
        hasKey: vi.fn(),
        ask: vi.fn(),
        autoDev: vi.fn(),
        provider: 'openai',
        model: 'gpt-4'
    }
}))

describe('Command Console Logic', () => {
    let mockState

    beforeEach(() => {
        mockState = {
            console: { history: [] },
            jwk: {}, // Mock logged in
            url: 'https://arweave.net',
            address: '0x123',
            activeModule: 'dashboard'
        }

        stateModule.getState.mockReturnValue(mockState)

        aoClientModule.makeAoClient.mockResolvedValue({
            ao: {
                spawn: vi.fn().mockResolvedValue('pid-123'),
                message: vi.fn().mockResolvedValue('msg-123'),
                result: vi.fn().mockResolvedValue({ Output: { data: 'ok' } })
            },
            signer: {}
        })
    })

    it('Should return help text for /help', async () => {
        const output = await executeCommand('/help', [])
        expect(output).toContain('CORE SYSTEM')
        expect(output).toContain('INTELLIGENCE')
        expect(output).toContain('UTILITIES')
    })

    it('Should return identity for /whoami', async () => {
        const output = await executeCommand('/whoami', [])
        expect(output).toContain('User: 0x123')
        expect(output).toContain('Active Module: dashboard')
    })

    it('Should show error for /brain check without key', async () => {
        // executeCommand handles errors directly for some commands, but others it returns string
        // For /brain status, it returns string
        brain.hasKey.mockReturnValue(false)
        const output = await executeCommand('/brain', ['status'])
        expect(output).toContain('Key Configured: NO')
    })

    it('Should set brain key config', async () => {
        const output = await executeCommand('/brain', ['set-key', 'sk-test', 'openai'])
        expect(output).toContain('Neural Link Established')
        expect(brain.setConfig).toHaveBeenCalledWith('sk-test', 'openai', null, null)
    })

    it('Should fail unknown command', async () => {
        const output = await executeCommand('/foobar', [])
        expect(output).toContain('Unknown command: /foobar')
    })

    // Note: /network tries to fetch(), we might need to mock global fetch if we test it.
    // We skip it for now to avoid environment issues.
})
