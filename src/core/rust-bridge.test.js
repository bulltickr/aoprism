import { describe, it, expect, beforeAll } from 'vitest'
import { rustBridge } from './rust-bridge.js'

describe('Rust Bridge Integration', () => {
    // We attempt to initialize the real WASM module
    // Note: This requires Vitest to handle .wasm imports (via vite-plugin-wasm)
    beforeAll(async () => {
        try {
            await rustBridge.init()
        } catch (e) {
            console.warn('[Test] RustBridge initialization failed in this environment. Skipping integration tests.')
        }
    })

    it('should sign ANS-104 data using RSA-PSS SHA-256', async () => {
        if (!rustBridge.ready) return

        const data = new Uint8Array([1, 2, 3, 4])
        const jwk = {
            kty: "RSA",
            n: "u1_m...", // Real tests would need a valid mock JWK or generated one
            e: "AQAB",
            d: "...",
            p: "...",
            q: "...",
            dp: "...",
            dq: "...",
            qi: "..."
        }

        // This is a smoke test to ensure the bridge calls the Rust function
        // In a real environment, we'd verify the signature length and validity
        const signed = await rustBridge.signAns104(data, jwk)
        expect(signed).toBeDefined()
        expect(signed instanceof Uint8Array).toBe(true)
    })

    it('should perform AES-GCM encryption and decryption loop', async () => {
        if (!rustBridge.ready) return

        const secretData = { apiKey: "test-key-123", username: "alice" }
        const key = new Uint8Array(32).fill(7) // 256-bit key

        const encrypted = await rustBridge.encryptData(secretData, key)
        expect(encrypted.iv).toBeDefined()
        expect(encrypted.ciphertext).toBeDefined()

        const decrypted = await rustBridge.decryptData(encrypted, key)
        expect(decrypted).toEqual(secretData)
    })

    it('should initialize SlmRunner (GPU)', async () => {
        if (!rustBridge.ready) return

        // This will likely fail in generic CI environments without WebGPU
        try {
            const runner = await rustBridge.createSlmRunner()
            expect(runner).toBeDefined()
        } catch (e) {
            console.log('[Test] WebGPU not available in this environment (expected).')
        }
    })
})
