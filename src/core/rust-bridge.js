// WASM module is loaded lazily to avoid evaluation at module import time
// (which would break Vitest and cause ECONNREFUSED in test environments)
let _wasmModule = null
async function getWasmModule() {
    if (!_wasmModule) {
        _wasmModule = await import('../../crates/aoprism-crypto/pkg/aoprism_crypto.js')
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
export class RustSigner {
    constructor(jwkOrPublic) {
        if (typeof jwkOrPublic === 'object' && jwkOrPublic !== null) {
            this.jwk = jwkOrPublic
            this.publicKey = this._b64UrlToBuffer(jwkOrPublic.n)
        } else if (typeof jwkOrPublic === 'string') {
            this.jwk = null
            this.publicKey = this._b64UrlToBuffer(jwkOrPublic)
        }

        this.signatureType = 1 // Arweave
        this.ownerLength = 512 // 4096 bit key / 8
        this.signatureLength = 512
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
