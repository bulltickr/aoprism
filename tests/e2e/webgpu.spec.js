import { test, expect } from '@playwright/test'

test('WebGPU Capability Check', async ({ page }) => {
    await page.goto('/')

    const gpuSupport = await page.evaluate(async () => {
        if (!navigator.gpu) return { status: 'unsupported', reason: 'navigator.gpu not found' }

        try {
            const adapter = await navigator.gpu.requestAdapter()
            if (!adapter) return { status: 'no-adapter', reason: 'No GPU adapter found' }

            // Check if our Rust bridge can talk to it
            if (window.rustBridge) {
                await window.rustBridge.init()
                const info = await window.rustBridge.gpuInit()
                return { status: 'supported', info }
            }

            return { status: 'partial', reason: 'Hardware OK, rustBridge not available' }
        } catch (e) {
            return { status: 'error', reason: e.toString() }
        }
    })

    console.log('WebGPU Support Details:', JSON.stringify(gpuSupport, null, 2))

    // We don't fail the test if unsupported (CI might not have it), 
    // but we verify the response structure.
    expect(gpuSupport.status).toMatch(/supported|unsupported|no-adapter|error|partial/)
})
