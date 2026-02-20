import { test, expect } from '@playwright/test'

test('RustSigner should sign data correctly', async ({ page }) => {
    // Capture browser logs
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`))

    await page.goto('/')

    // Wait for rustBridge to be exposed (retry until available)
    try {
        await page.waitForFunction(() => window.rustBridge, { timeout: 5000 })
    } catch (e) {
        console.error('Timeout waiting for window.rustBridge')
    }

    // Verify rustBridge is available
    const result = await page.evaluate(async () => {
        try {
            if (!window.rustBridge) {
                return { error: 'window.rustBridge is not defined. Check if DEV mode is active and script is loaded.' }
            }

            console.log('[E2E-Test] Initializing rustBridge...')
            await window.rustBridge.init()
            console.log('[E2E-Test] rustBridge Initialized.')

            const data = new Uint8Array(2048).fill(1)
            console.log('[E2E-Test] Generating Test JWK...')
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-PSS",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["sign", "verify"]
            )
            const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)
            console.log('[E2E-Test] JWK Generated. Components valid:', !!jwk.n && !!jwk.d)

            console.log('[E2E-Test] Calling signPss...')
            const t0 = performance.now()
            const sig = await window.rustBridge.signPss(jwk, data)
            const t1 = performance.now()
            console.log('[E2E-Test] signPss completed.')

            return {
                duration: t1 - t0,
                sigLength: sig?.length,
                sigType: sig?.constructor?.name,
                success: true
            }
        } catch (e) {
            console.error('[E2E-Test] ERROR:', e)
            return { error: e.toString(), stack: e.stack }
        }
    })

    console.log('Rust Signing Result Details:', JSON.stringify(result, null, 2))

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
    expect(result.sigLength).toBe(512)
})

test('Secure Enclave should strip JWK from JS heap', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.rustBridge, { timeout: 5000 })

    const heapCheck = await page.evaluate(async () => {
        const { setState, getState } = await import('/src/state.js')

        // 1. Generate a dummy key
        const keyPair = await window.crypto.subtle.generateKey(
            { name: "RSA-PSS", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true, ["sign"]
        )
        const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey)

        // 2. Load into state (which triggers enclave loading)
        await setState({ jwk })

        // 3. Verify state heap
        const currentState = getState()
        return {
            stateJwkIsNull: currentState.jwk === null,
            stateAddressIsSet: !!currentState.address,
            stateHasKeyFlag: currentState.hasKey === true
        }
    })

    expect(heapCheck.stateJwkIsNull).toBe(true)
    expect(heapCheck.stateAddressIsSet).toBe(true)
    expect(heapCheck.stateHasKeyFlag).toBe(true)
})
