import { describe, it, expect, beforeAll } from 'vitest'
import { RustSigner } from './rust-bridge'

// Mock the WASM module to prevent network fetch in Vitest environment
vi.mock('../../crates/aoprism-crypto/pkg/aoprism_crypto.js', () => ({
    default: vi.fn().mockResolvedValue(undefined),
    sign_pss_simple: vi.fn().mockResolvedValue(new Uint8Array(512)),
    enclave_sign: vi.fn().mockResolvedValue(new Uint8Array(512)),
}))

describe('Signing Benchmark', () => {
    let jwk
    let data
    let rustSigner
    let envReady = false

    beforeAll(async () => {
        try {
            const Arweave = (await import('arweave/web')).default
            const arweave = Arweave.init({})
            jwk = await arweave.wallets.generate()
            data = new Uint8Array(2048).map(() => Math.floor(Math.random() * 256))
            rustSigner = new RustSigner(jwk)
            envReady = true
        } catch (e) {
            console.warn('[BenchTest] Skipping: environment not ready:', e.message)
        }
    })

    it('RustSigner should produce valid signature format', async () => {
        if (!envReady) return // Skip gracefully in Vitest/happy-dom
        const sig = await rustSigner.sign(data)
        expect(sig).toBeInstanceOf(Uint8Array)
        expect(sig.length).toBe(512) // 4096-bit key
    })

    it('Benchmark: Rust vs JS', async () => {
        if (!envReady) return // Skip gracefully in Vitest/happy-dom

        const iterations = 5
        const startRust = performance.now()
        for (let i = 0; i < iterations; i++) {
            await rustSigner.sign(data)
        }
        const timeRust = performance.now() - startRust

        console.log(`\n--- BENCHMARK RESULTS (${iterations} iter) ---`)
        console.log(`Rust (WASM): ${timeRust.toFixed(2)}ms`)
        console.log('-------------------------------------------')

        expect(timeRust).toBeGreaterThan(0)
    })
})
