
import { describe, it, expect } from 'vitest'
import { deriveKeyFromSignature, encryptData, decryptData, generateSalt } from '../../src/core/crypto.js'

describe('Crypto Core (Client-Side Encryption)', () => {

    it('Should derive a key from a signature', async () => {
        const mockSignature = new Uint8Array(32).fill(1) // 32 bytes of deterministic noise
        const salt = generateSalt()
        const key = await deriveKeyFromSignature(mockSignature, salt)

        expect(key).toBeDefined()
        expect(key.algorithm.name).toBe('AES-GCM')
        expect(key.algorithm.length).toBe(256)
        expect(key.extractable).toBe(false)
    })

    it('Should encrypt and decrypt data correctly', async () => {
        const mockSignature = new Uint8Array(32).fill(2)
        const salt = generateSalt()
        const key = await deriveKeyFromSignature(mockSignature, salt)

        const secretData = { note: 'Top Secret Plan', id: 123 }

        // Encrypt
        const encrypted = await encryptData(secretData, key)
        expect(encrypted.iv).toBeDefined()
        expect(encrypted.ciphertext).toBeDefined()
        expect(typeof encrypted.ciphertext).toBe('string') // Base64

        // Decrypt
        const decrypted = await decryptData(encrypted, key)
        expect(decrypted).toEqual(secretData)
    })

    it('Should fail to decrypt with wrong key', async () => {
        const sigA = new Uint8Array(32).fill(1)
        const sigB = new Uint8Array(32).fill(2) // Different signature
        const salt = generateSalt()

        const keyA = await deriveKeyFromSignature(sigA, salt)
        const keyB = await deriveKeyFromSignature(sigB, salt)

        const secretData = { foo: 'bar' }
        const encrypted = await encryptData(secretData, keyA)

        // Try to decrypt with wrong key
        await expect(decryptData(encrypted, keyB)).rejects.toThrow()
    })

    it('Should fail to decrypt tampered ciphertext', async () => {
        const sig = new Uint8Array(32).fill(1)
        const salt = generateSalt()
        const key = await deriveKeyFromSignature(sig, salt)

        const secretData = { foo: 'bar' }
        const encrypted = await encryptData(secretData, key)

        // Tamper with ciphertext (base64 string)
        // Just changing the last char is enough to break GCM auth tag usually
        const tamperedCipher = encrypted.ciphertext.slice(0, -1) + '0'

        const tamperedPackage = { ...encrypted, ciphertext: tamperedCipher }

        await expect(decryptData(tamperedPackage, key)).rejects.toThrow()
    })
})
