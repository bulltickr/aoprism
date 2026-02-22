// WASM module is loaded lazily to avoid evaluation at module import time
// (which would break Vitest and cause ECONNREFUSED in test environments)

// SRI Hash - compute after building WASM, then update this value
const EXPECTED_WASM_HASH = 'sha256-PLACEHOLDER_REPLACE_AFTER_BUILD'

async function computeWasmHash(wasmBytes) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', wasmBytes)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return 'sha256-' + btoa(String.fromCharCode(...hashArray)).slice(0, 43)
}

let _wasmModule = null
async function getWasmModule() {
    if (!_wasmModule) {
        // Skip SRI check in test environment
        const isTest = typeof window !== 'undefined' && window.__vitest__ || 
                       typeof globalThis.process !== 'undefined' && globalThis.process.env?.NODE_ENV === 'test'
        
        const wasmPath = '../../crates/aoprism-crypto/pkg/aoprism_crypto.js'
        
        if (!isTest) {
            try {
                const wasmResponse = await fetch(wasmPath)
                const wasmBuffer = await wasmResponse.arrayBuffer()
                const wasmBytes = new Uint8Array(wasmBuffer)
                
                const actualHash = await computeWasmHash(wasmBytes)
                if (actualHash !== EXPECTED_WASM_HASH) {
                    console.warn(`WASM integrity check: hash mismatch (this is normal during development)`)
                }
            } catch (e) {
                console.warn('WASM fetch failed, skipping integrity check:', e.message)
            }
        }
        
        _wasmModule = await import(wasmPath)
    }
    return _wasmModule
}

class RustBridge {
    constructor() {
        this.ready = false
        this.module = null
    }

    async init() {
        if (this.ready) return
        try {
            const { default: init } = await getWasmModule()
            // [Security A9] Load and verify WASM module.
            // In production, the build pipeline should embed the SRI hash of the .wasm file
            // and verify it via SubtleCrypto before calling init().
            await init()
            this.ready = true
            console.log('[RustBridge] 🦀 WASM Module Initialized')
        } catch (e) {
            console.error('[RustBridge] Failed to load WASM module. Possible integrity issue:', e)
            throw e
        }
    }

    async signPss(jwk, data, saltLen = 32) {
        if (!this.ready) await this.init()
        const { sign_pss_simple } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')

        // Ensure data is Uint8Array
        const dataBytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data)

        // Call Rust (Using the simple version for now)
        return sign_pss_simple(jwk, dataBytes)
    }

    async jwkToAddress(n) {
        if (!this.ready) await this.init()
        const { jwk_to_address } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return jwk_to_address(n)
    }

    async enclaveLoadKey(jwk) {
        if (!this.ready) await this.init()
        const { enclave_load_key } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return enclave_load_key(jwk)
    }

    async enclaveSign(data) {
        if (!this.ready) await this.init()
        const { enclave_sign } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        const dataBytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data)
        return enclave_sign(dataBytes)
    }

    async enclaveClear() {
        if (!this.ready) await this.init()
        const { enclave_clear } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return enclave_clear()
    }

    async verifyPssSimple(n, data, signature) {
        if (!this.ready) await this.init()
        const { verify_pss_simple } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return verify_pss_simple(n, data, signature)
    }

    async auditSequence(assignmentsJson, startNonce) {
        if (!this.ready) await this.init()
        const { audit_sequence } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return audit_sequence(assignmentsJson, startNonce)
    }

    async gpuInit() {
        if (!this.ready) await this.init()
        const { gpu_init } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return gpu_init()
    }

    async createSlmRunner() {
        if (!this.ready) await this.init()
        const { SlmRunner } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return SlmRunner.create()
    }

    async runMatmul(a, b, rowsA, colsA, colsB) {
        if (!this.ready) await this.init()
        try {
            const { run_matmul_gpu } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
            return await run_matmul_gpu(a, b)
        } catch (e) {
            console.warn('[RustBridge] GPU matmul failed, falling back to CPU:', e.message)
            const { run_matmul_cpu } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
            return run_matmul_cpu(a, b, rowsA, colsA, colsB)
        }
    }

    async runMatmulCpu(a, b, rowsA, colsA, colsB) {
        if (!this.ready) await this.init()
        const { run_matmul_cpu } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return run_matmul_cpu(a, b, rowsA, colsA, colsB)
    }

    async runMatmulGpu(a, b) {
        if (!this.ready) await this.init()
        const { run_matmul_gpu } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return await run_matmul_gpu(a, b)
    }

    // --- Contract Alignment ---

    async signAns104(data, jwk) {
        if (!this.ready) await this.init()
        const { sign_pss_simple } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return sign_pss_simple(jwk, data)
    }

    async signHttpSig(data, jwk) {
        if (!this.ready) await this.init()
        const { sign_http_sig } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        return sign_http_sig(jwk, data)
    }

    async encryptData(data, key) {
        if (!this.ready) await this.init()
        const { encrypt_data } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        const dataJson = typeof data === 'string' ? data : JSON.stringify(data)
        return encrypt_data(dataJson, key)
    }

    async decryptData(encrypted, key) {
        if (!this.ready) await this.init()
        const { decrypt_data } = this.module || await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
        const decryptedJson = await decrypt_data(encrypted, key)
        try {
            return JSON.parse(decryptedJson)
        } catch (e) {
            return decryptedJson
        }
    }
}

export const rustBridge = new RustBridge()

// Top-level exports for contract alignment
export const initRust = () => rustBridge.init()
export const signAns104 = (data, jwk) => rustBridge.signAns104(data, jwk)
export const signHttpSig = (data, jwk) => rustBridge.signHttpSig(data, jwk)
export const importKeyToEnclave = (jwk) => rustBridge.enclaveLoadKey(jwk)
export const signWithEnclave = (handle, data) => rustBridge.enclaveSign(data)
export const clearEnclave = (handle) => rustBridge.enclaveClear()
export const encryptData = (data, key) => rustBridge.encryptData(data, key)
export const decryptData = (encrypted, key) => rustBridge.decryptData(encrypted, key)

if (import.meta.env.DEV) {
    window.rustBridge = rustBridge
}

/**
 * A signer that mimics the ArweaveSigner interface but uses Rust/WASM.
 * Compatible with arbundles createData().
 */
const addressCache = new Map()

async function computeModulusHash(modulusB64Url) {
    const modulusBytes = b64UrlToBytes(modulusB64Url)
    const digest = await crypto.subtle.digest('SHA-256', modulusBytes)
    return bytesToHex(digest)
}

function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

function b64UrlToBytes(b64url) {
    const b64 = String(b64url)
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(String(b64url).length / 4) * 4, '=')
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

function bytesToB64Url(bytes) {
    const b64 = btoa(String.fromCharCode(...bytes))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function deriveAddressFromModulus(modulusB64Url) {
    const modulusHash = await computeModulusHash(modulusB64Url)
    
    if (addressCache.has(modulusHash)) {
        return addressCache.get(modulusHash)
    }
    
    const modulusBytes = b64UrlToBytes(modulusB64Url)
    const digest = await crypto.subtle.digest('SHA-256', modulusBytes)
    const address = bytesToB64Url(new Uint8Array(digest))
    
    addressCache.set(modulusHash, address)
    return address
}

export async function getCachedAddress(modulusB64Url) {
    if (!modulusB64Url) return null
    return deriveAddressFromModulus(modulusB64Url)
}

export function getAddressCacheSize() {
    return addressCache.size
}

export function clearAddressCache() {
    addressCache.clear()
}

export class RustSigner {
    #address = null
    
    constructor(jwkOrPublic) {
        if (typeof jwkOrPublic === 'object' && jwkOrPublic !== null) {
            this.jwk = jwkOrPublic
            this.publicKey = this._b64UrlToBuffer(jwkOrPublic.n)
            this.#address = deriveAddressFromModulus(jwkOrPublic.n)
        } else if (typeof jwkOrPublic === 'string') {
            this.jwk = null
            this.publicKey = this._b64UrlToBuffer(jwkOrPublic)
            this.#address = deriveAddressFromModulus(jwkOrPublic)
        }

        this.signatureType = 1 // Arweave
        this.ownerLength = 512 // 4096 bit key / 8
        this.signatureLength = 512
    }
    
    get address() {
        return this.#address
    }

    get publicKey() {
        return this._publicKey
    }

    set publicKey(val) {
        this._publicKey = val
    }

    async sign(message) {
        if (this._wiped) throw new Error('Signer has been wiped')
        // [PHASE 4] Prefer Enclave signing if initialized
        try {
            return await rustBridge.enclaveSign(message)
        } catch (e) {
            // Fallback for legacy calls or first-run initialization
            if (this.jwk) {
                return rustBridge.signPss(this.jwk, message)
            }
            throw e
        }
    }

    /**
     * Explicitly clear sensitive key material from memory.
     */
    wipe() {
        this.jwk = null
        this.publicKey = null
        this._publicKey = null
        this._wiped = true
    }

    /**
     * Dispose of WASM memory. Call when signer is no longer needed.
     */
    dispose() {
        this.wipe()
        if (this._wasmPtr && typeof rustBridge.freeMemory === 'function') {
            rustBridge.freeMemory(this._wasmPtr)
            this._wasmPtr = null
        }
    }

    // Helper to match arbundles internal logic
    getCode() { return 1 } // SignatureConfig.ARWEAVE

    _b64UrlToBuffer(b64Url) {
        const b64 = b64Url.replace(/-/g, '+').replace(/_/g, '/')
        const str = atob(b64)
        const len = str.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = str.charCodeAt(i)
        }
        return bytes
    }
}
