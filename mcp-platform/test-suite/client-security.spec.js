/**
 * client-security.spec.js
 * Unit tests for AO Client internal logic and sanitization.
 * Tests real functions, not mocks.
 */

import { describe, it, expect, vi } from 'vitest'

// We need to import the real file, but it has node dependencies (fs).
// Vitest environment is node, so it should be fine.
// However, we want to avoid mocking everything again.
// We can use `vi.unmock` or just import it directly if not globally mocked.
// Since `tools.spec.js` mocks it, we create a new file where it is NOT mocked.

import { aoSend } from '../src/ao-client.js'

describe('AO Client Security', () => {
    it('throws error when tags contain control characters', async () => {
        const evilTags = [{ name: 'Action', value: 'Hello\x00World' }]

        // We expect aoSend to throw synchronously during tag normalization 
        // OR return a rejected promise if it's async.
        // normalizeTags is called inside aoSend before anything else.

        await expect(aoSend({
            process: 'abc',
            tags: evilTags,
            walletPath: 'invalid' // Doesn't matter, should fail before wallet check
        })).rejects.toThrow('Invalid characters')
    })

    it('throws error when tags contain newlines', async () => {
        const evilTags = [{ name: 'Header\nInjection', value: 'Value' }]

        // Newlines are control characters (0x0A)
        await expect(aoSend({
            process: 'abc',
            tags: evilTags
        })).rejects.toThrow('Invalid characters')
    })
})
