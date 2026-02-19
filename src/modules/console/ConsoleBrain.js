/**
 * ConsoleBrain.js
 * "The Universal Cortex"
 * Supports: OpenAI, Google Gemini, Anthropic, DeepSeek, Mistral, Groq, Moonshot (Kimi), and OpenRouter.
 */

// 🌍 The Great Library of Models
const PROVIDER_MAP = {
    // Standard OpenAI Compatible
    'openai': {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4-turbo-preview',
        adapter: 'openai'
    },
    'deepseek': {
        url: 'https://api.deepseek.com/chat/completions',
        model: 'deepseek-chat',
        adapter: 'openai'
    },
    'mistral': {
        url: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-large-latest',
        adapter: 'openai'
    },
    'moonshot': {
        url: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'moonshot-v1-8k', // Kimi
        adapter: 'openai'
    },
    'groq': {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama3-70b-8192',
        adapter: 'openai'
    },
    'openrouter': {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'openai/gpt-4-turbo',
        adapter: 'openai',
        headers: { 'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'https://aoprism.io' }
    },
    'siliconflow': {
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        model: 'THUDM/glm-4-9b-chat', // GLM Support
        adapter: 'openai'
    },
    // Specialized Adapters
    'google': { adapter: 'google', model: 'gemini-1.5-pro-latest' },
    'anthropic': { adapter: 'anthropic', model: 'claude-3-opus-20240229' }
}

import { generateSalt, deriveKeyFromSignature, encryptData, decryptData } from '../../core/crypto.js'

export class ConsoleBrain {
    constructor() {
        this.key = null
        this.provider = localStorage.getItem('aoprism_brain_provider') || 'openai'
        this.baseUrl = localStorage.getItem('aoprism_brain_url') || null
        this.model = localStorage.getItem('aoprism_brain_model') || null
        this.controller = null
        this.isLocked = true // Default state
    }

    /**
     * Unlocks the Brain using the wallet signature.
     * @param {Uint8Array} signature 
     */
    async unlock(signature) {
        try {
            const stored = localStorage.getItem('aoprism_brain_enc')
            if (!stored) return false

            const { iv, ciphertext, salt: saltBase64 } = JSON.parse(stored)

            // Convert base64 salt back to Uint8Array
            const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0))

            const key = await deriveKeyFromSignature(signature, salt)
            const decryptedData = await decryptData({ iv, ciphertext }, key)

            if (decryptedData && decryptedData.key) {
                this.key = decryptedData.key
                this.provider = decryptedData.provider || 'openai'
                this.isLocked = false
                return true
            }
            return false
        } catch (e) {
            console.error("Unlock failed", e)
            return false
        }
    }

    async lock(apiKey, signature, provider = 'openai') {
        try {
            const salt = generateSalt()
            const key = await deriveKeyFromSignature(signature, salt)

            const dataToEncrypt = { key: apiKey, provider }
            const { iv, ciphertext } = await encryptData(dataToEncrypt, key)

            // Convert salt to base64 for storage
            const saltBase64 = btoa(String.fromCharCode(...salt))

            const payload = JSON.stringify({ iv, ciphertext, salt: saltBase64 })
            localStorage.setItem('aoprism_brain_enc', payload)

            // Clear old insecure keys if they exist
            localStorage.removeItem('aoprism_brain_key')

            this.key = apiKey
            this.provider = provider
            this.isLocked = false
            return true
        } catch (e) {
            console.error("Locking failed", e)
            return false
        }
    }

    abort() {
        if (this.controller) {
            this.controller.abort()
            this.controller = null
        }
    }

    setConfig(key, providerName = 'openai', url = null, model = null) {
        // This is now legacy/insecure or needs to route through lock()
        // We will throw an error if user tries to set key without signature or just update props
        throw new Error("Use /brain set-key to securely configure the Brain.")
    }

    hasKey() {
        return !!this.key
    }

    async ask(query, systemPrompt = 'You are a helpful assistant for the AO Computer.') {
        if (!this.key) throw new Error("No API Key found. Run: /brain set-key <key> <provider>")

        const config = PROVIDER_MAP[this.provider] || { adapter: 'openai' } // Default to OpenAI adapter for custom URLs

        // 1. Specialized Adapters
        if (config.adapter === 'google') return this.callGoogleGemini(query, systemPrompt)
        if (config.adapter === 'anthropic') return this.callAnthropic(query, systemPrompt)

        // 2. Generic OpenAI Adapter (DeepSeek, Mistral, Groq, Kimi, etc.)
        return this.callOpenAICompatible(query, systemPrompt, config)
    }

    async autoDev(task) {
        const systemPrompt = `You are an expert Lua Developer for the Arweave AO Computer. Return ONLY valid Lua code.`
        return this.ask(task, systemPrompt)
    }

    // --- ADAPTERS ---

    async callOpenAICompatible(userMsg, systemMsg, config) {
        // Priority: Custom URL -> Provider URL -> Default OpenAI
        const url = this.baseUrl || config.url || 'https://api.openai.com/v1/chat/completions'
        const model = this.model || config.model || 'gpt-4-turbo-preview'
        const customHeaders = config.headers || {}

        this.controller = new AbortController()

        const res = await fetch(url, {
            method: 'POST',
            signal: this.controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.key}`,
                ...customHeaders
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemMsg },
                    { role: 'user', content: userMsg }
                ],
                stream: false
            })
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
            throw new Error(`${this.provider.toUpperCase()} Error: ${err.error?.message || res.statusText}`)
        }
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || "Error: No response content."
    }

    async callGoogleGemini(userMsg, systemMsg) {
        // Gemini doesn't use 'system' roles in the same way in v1beta, but we can prepend it.
        const model = this.model || 'gemini-1.5-pro-latest'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.key}`

        this.controller = new AbortController()

        const res = await fetch(url, {
            method: 'POST',
            signal: this.controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: `${systemMsg}\n\nUser Question: ${userMsg}` }] }
                ]
            })
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(`Gemini Error: ${err.error?.message || res.statusText}`)
        }
        const data = await res.json()
        return data.candidates[0].content.parts[0].text.trim()
    }

    async callAnthropic(userMsg, systemMsg) {
        // Anthropic requires a proxy due to CORS (usually). attempting direct.
        // If this fails, user must use OpenRouter for Anthropic.
        const url = 'https://api.anthropic.com/v1/messages'
        this.controller = new AbortController()

        const res = await fetch(url, {
            method: 'POST',
            signal: this.controller.signal,
            headers: {
                'x-api-key': this.key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'anthropic-dangerous-direct-browser-access': 'true' // Required for browser calls
            },
            body: JSON.stringify({
                model: this.model || 'claude-3-opus-20240229',
                system: systemMsg,
                messages: [{ role: 'user', content: userMsg }],
                max_tokens: 1024
            })
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(`Anthropic Error: ${err.error?.message || res.statusText}`)
        }
        const data = await res.json()
        return data.content[0].text.trim()
    }
}

export const brain = new ConsoleBrain()
