import { describe, it, expect, beforeEach, vi } from 'vitest'
import { autoSave, loadAutoSave, clearAutoSave, setupAutoSave, showRecoveryDialog } from '../utils/AutoSave.js'

// Mock IndexedDB
const mockDB = {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn()
}

vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(mockDB))
}))

// Mock state so tests can control encryptionKey presence
vi.mock('../state.js', () => ({
    getState: vi.fn(() => ({})), // default: no encryption key
    setState: vi.fn()
}))

// Mock rust-bridge to prevent WASM/network side effects
vi.mock('../core/rust-bridge.js', () => ({
    encryptData: vi.fn().mockResolvedValue({ iv: 'mock-iv', ciphertext: 'mock-ct' }),
    decryptData: vi.fn().mockResolvedValue({ decrypted: 'data' }),
    rustBridge: {
        encryptData: vi.fn().mockResolvedValue({ iv: 'mock-iv', ciphertext: 'mock-ct' }),
        decryptData: vi.fn().mockResolvedValue({ decrypted: 'data' })
    }
}))

describe('AutoSave', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should save form data with debounce', async () => {
        const formId = 'test-form'
        const data = { field1: 'value1', field2: 'value2' }

        autoSave(formId, data)

        // Should not save immediately (debounce)
        expect(mockDB.put).not.toHaveBeenCalled()

        // Wait for debounce
        await new Promise(r => setTimeout(r, 350))

        expect(mockDB.put).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                id: formId,
                data: data,
                timestamp: expect.any(Number)
            })
        )
    })

    it('should load saved form data', async () => {
        const formId = 'test-form'
        const mockData = {
            id: formId,
            data: { field: 'value' },
            timestamp: Date.now() - 1000 // 1 second ago
        }

        mockDB.get.mockResolvedValue(mockData)

        const result = await loadAutoSave(formId)

        expect(result).toEqual(expect.objectContaining({
            data: mockData.data,
            timestamp: mockData.timestamp,
            age: expect.any(Number)
        }))
    })

    it('should return null for expired data (>7 days)', async () => {
        const formId = 'old-form'
        const oldData = {
            id: formId,
            data: { field: 'value' },
            timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
        }

        mockDB.get.mockResolvedValue(oldData)

        const result = await loadAutoSave(formId)

        expect(result).toBeNull()
        expect(mockDB.delete).toHaveBeenCalled()
    })

    it('should clear auto-saved data', async () => {
        const formId = 'test-form'

        await clearAutoSave(formId)

        expect(mockDB.delete).toHaveBeenCalledWith(expect.any(String), formId)
    })

    it('should encrypt data via Rust if encryptionKey is present', async () => {
        // Use already-mocked modules (vi.mock hoisted at top)
        const { getState: gs } = await import('../state.js')
        const { encryptData } = await import('../core/rust-bridge.js')

        // Make getState return a state with an encryptionKey
        gs.mockReturnValue({ encryptionKey: new Uint8Array(32).fill(1) })

        const formId = 'secure-form'
        const rawData = { secret: 'top-secret' }

        autoSave(formId, rawData)

        await new Promise(r => setTimeout(r, 350))

        // Verify encryptData was called
        expect(encryptData).toHaveBeenCalled()

        // Verify record in DB marked as encrypted
        expect(mockDB.put).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                encrypted: true
            })
        )
    })
})
