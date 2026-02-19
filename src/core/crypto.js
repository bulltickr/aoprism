/**
 * crypto.js
 * Client-side encryption standards for AOPRISM Vault.
 * Pattern: Arweave Signature -> HKDF -> AES-GCM-256
 */

const ENC_ALGO = { name: 'AES-GCM', length: 256 }

function getCrypto() {
    return globalThis.crypto || window.crypto
}

/**
 * Generates a random 16-byte salt.
 * @returns {Uint8Array}
 */
export function generateSalt() {
    return getCrypto().getRandomValues(new Uint8Array(16))
}

/**
 * Derives a connection key from a wallet signature using HKDF.
 * @param {Uint8Array} signature - The raw signature bytes from the wallet
 * @param {Uint8Array} salt - Random salt stored with the encrypted data
 * @returns {CryptoKey} The derived AES-GCM key
 */
export async function deriveKeyFromSignature(signature, salt) {
    const crypto = getCrypto().subtle

    // 1. Import Signature as Key Material
    const rawKey = await crypto.importKey(
        'raw',
        signature,
        'HKDF',
        false,
        ['deriveKey']
    )

    // 2. Derive AES Key using HKDF
    return await crypto.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt,
            info: new TextEncoder().encode('AOPRISM_MASTER_KEY')
        },
        rawKey,
        ENC_ALGO,
        false, // Non-exportable for security
        ['encrypt', 'decrypt']
    )
}

/**
 * Encrypts a JSON object.
 * @param {Object} data - The data to encrypt
 * @param {CryptoKey} key - The derived AES key
 * @returns {Object} { iv, ciphertext } in base64
 */
export async function encryptData(data, key) {
    const crypto = getCrypto().subtle
    const iv = getCrypto().getRandomValues(new Uint8Array(12)) // 96-bit IV
    const encodedData = new TextEncoder().encode(JSON.stringify(data))

    const ciphertext = await crypto.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedData
    )

    return {
        iv: arrayBufferToBase64(iv),
        ciphertext: arrayBufferToBase64(ciphertext)
    }
}

/**
 * Decrypts data to JSON.
 * @param {Object} encryptedPackage - { iv, ciphertext } (base64)
 * @param {CryptoKey} key - The derived AES key
 * @returns {Object} The original JSON data
 */
export async function decryptData(encryptedPackage, key) {
    const crypto = getCrypto().subtle
    const iv = base64ToArrayBuffer(encryptedPackage.iv)
    const ciphertext = base64ToArrayBuffer(encryptedPackage.ciphertext)

    try {
        const decrypted = await crypto.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        )
        const text = new TextDecoder().decode(decrypted)
        return JSON.parse(text)
    } catch (e) {
        throw new Error('Decryption Failed: Invalid Key or Corrupted Data')
    }
}

// --- Helpers ---

function arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    // Handle Node.js vs Browser for btoa
    if (typeof btoa === 'function') {
        return btoa(binary)
    } else {
        return Buffer.from(binary, 'binary').toString('base64')
    }
}

function base64ToArrayBuffer(base64) {
    // Handle Node.js vs Browser for atob
    if (typeof atob === 'function') {
        const binary_string = atob(base64)
        const len = binary_string.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i)
        }
        return bytes.buffer
    } else {
        const buffer = Buffer.from(base64, 'base64')
        return new Uint8Array(buffer).buffer
    }
}
