import { test, expect } from '@playwright/test';

test.describe('Phase 5: Holographic State Verification', () => {
    test('Rust Auditor should validate sequence continuity', async ({ page }) => {
        await page.goto('http://localhost:5173/');

        const result = await page.evaluate(async () => {
            // Wait for WASM
            const { rustBridge } = await import('/src/core/rust-bridge.js');
            await rustBridge.init();

            const valid = [
                { nonce: "1", epoch: 0 },
                { nonce: "2", epoch: 0 },
                { nonce: "3", epoch: 0 }
            ];
            const tampered = [
                { nonce: "1", epoch: 0 },
                { nonce: "3", epoch: 0 } // GAP
            ];

            const ok = await rustBridge.auditSequence(JSON.stringify(valid), "0");
            const bad = await rustBridge.auditSequence(JSON.stringify(tampered), "0");

            return { ok, bad };
        });

        expect(result.ok).toBe(true);
        expect(result.bad).toBe(false);
    });

    test('Rust Auditor should verify RSA-PSS signatures (Holographic Proof)', async ({ page }) => {
        await page.goto('http://localhost:5173/');

        const signatureValid = await page.evaluate(async () => {
            const { rustBridge } = await import('/src/core/rust-bridge.js');
            await rustBridge.init();

            // 1. Generate a key to test with
            const keyPair = await crypto.subtle.generateKey(
                { name: 'RSA-PSS', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                true,
                ['sign', 'verify']
            );
            const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
            const n = jwk.n;

            // 2. Sign data in JS
            const data = new TextEncoder().encode("AO_BLOCK_ASSIGNMENT_42");
            const sig = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, keyPair.privateKey, data);

            // 3. Verify in Rust
            return await rustBridge.verifyPssSimple(n, data, new Uint8Array(sig));
        });

        expect(signatureValid).toBe(true);
    });
});
