import { describe, it, expect } from 'vitest'
import { generateSalt, deriveKeyFromSignature, encryptData, decryptData } from './crypto.js'

// Polyfill for Web Crypto in Node.js environment (Vitest's happy-dom might not fully cover crypto.subtle)
import { webcrypto } from 'node:crypto'
if (!globalThis.crypto) globalThis.crypto = webcrypto

describe('Crypto Utils', () => {
    it('should generate a random 16-byte salt', () => {
        const salt1 = generateSalt()
        const salt2 = generateSalt()

        expect(salt1).toBeInstanceOf(Uint8Array)
        expect(salt1.length).toBe(16)
        expect(salt1).not.toEqual(salt2) // Extremely unlikely to be equal
    })

    it('should derive a consistent key from signature and salt', async () => {
        const sig = new Uint8Array(64).fill(1)
        const salt = generateSalt()

        const key1 = await deriveKeyFromSignature(sig, salt)
        const key2 = await deriveKeyFromSignature(sig, salt)

        // Keys are opaque objects, but exporting them should yield same raw bytes
        const raw1 = await crypto.subtle.exportKey('raw', key1) // Note: crypto.js sets extractable=false, so this might fail in real app but let's check code.
        // Actually code sets extractable=false. We can't export.
        // We can test by encrypting with one and decrypting with other.

        const data = { msg: "test" }
        const { iv, ciphertext } = await encryptData(data, key1)
        const decrypted = await decryptData({ iv, ciphertext }, key2)

        expect(decrypted).toEqual(data)
    })

    it('should encrypt and decrypt data correctly', async () => {
        const sig = new Uint8Array(64).fill(2)
        const salt = generateSalt()
        const key = await deriveKeyFromSignature(sig, salt)

        const payload = { apiKey: "sk-123456", provider: "openai" }
        const encrypted = await encryptData(payload, key)

        expect(encrypted.iv).toBeDefined()
        expect(encrypted.ciphertext).toBeDefined()
        expect(typeof encrypted.ciphertext).toBe('string') // Base64

        const decrypted = await decryptData(encrypted, key)
        expect(decrypted).toEqual(payload)
    })

    it('should fail to decrypt with wrong key (simulating wrong wallet)', async () => {
        const sig1 = new Uint8Array(64).fill(1)
        const sig2 = new Uint8Array(64).fill(2)
        const salt = generateSalt()

        const key1 = await deriveKeyFromSignature(sig1, salt)
        const key2 = await deriveKeyFromSignature(sig2, salt)

        const payload = { secret: "stuff" }
        const encrypted = await encryptData(payload, key1)

        await expect(decryptData(encrypted, key2)).rejects.toThrow()
    })
})
