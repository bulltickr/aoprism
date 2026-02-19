/**
 * prism-kernel.spec.js
 * Tests the PRISM Micro-OS (Kernel).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createLuaEnvironment, loadLuaFile } from './utils/lua-bridge.js'
import { resolve } from 'path'

describe('PRISM Kernel', () => {
    let lua
    let Handlers

    const KERNEL_FILE = resolve(__dirname, '../lua/kernel/prism_kernel.lua')

    beforeEach(async () => {
        const env = await createLuaEnvironment()
        lua = env.lua
        Handlers = env.HandlersMock

        // Mock Owner
        lua.global.set('Owner', 'User-123')
        lua.global.set('ao', {
            id: 'Process-123',
            send: env.lua.global.get('ao').send,
            spawn: env.lua.global.get('ao').spawn
        })

        await loadLuaFile(lua, KERNEL_FILE)
    })

    it('Should load successfully and initialize state', () => {
        const kernel = lua.global.get('Kernel')
        expect(kernel).toBeDefined()
        expect(kernel.Version).toBe('1.0.0')
    })

    it('LoadSkill should reject unauthorized users', async () => {
        Handlers._run({
            From: 'Stranger-Danger',
            Tags: { Action: 'LoadSkill' },
            Data: 'return {}'
        })

        // Should not have sent any error response with "LoadError" 
        // because the handler prints to stdout and returns early in our mocked implementation
        // But let's check input/output
        const inbox = lua.global.get('Inbox')
        expect(inbox.length).toBe(0)
        // Note: Our Lua print() goes to stdout, we can't assert it easily here without mocking print.
    })

    it('LoadSkill should load a valid Skill', async () => {
        const skillCode = `
            return {
                Name = "TestSkill",
                Description = "A test",
                Patterns = {
                    { check = "Action", value = "Test" }
                },
                Execute = function(msg, kernel)
                    ao.send({Target = msg.From, Data = "Skill Works!"})
                end
            }
        `

        // 1. Load the Skill
        Handlers._run({
            From: 'User-123',
            Tags: { Action: 'LoadSkill', SkillName: 'test' },
            Data: skillCode
        })

        // Check success message
        const inbox = lua.global.get('Inbox')
        expect(inbox.length).toBe(1)
        expect(inbox[0].Action).toBe('LoadSuccess')

        // 2. Verify Helper is registered
        // We mocked Handlers.add to push to a list.
        // We expect:
        // 1. Kernel.LoadSkill (from init)
        // 2. Kernel.ListSkills (from init)
        // 3. Skill.TestSkill.1 (from dynamic load)

        // Since we re-initialized env, the list in HandlersMock is fresh? 
        // Actually createLuaEnvironment creates a new mock each time. 
        // The Kernel file calls Handlers.add twice on load. 
        // Then LoadSkill calls it once more.

        // We can't easily inspect the internal JS list of handlers because we didn't expose it in lua-bridge 
        // Wait, we did expose HandlersMock object in the test! 
        // But we need to inspect the 'handlersList' array inside the closure? 
        // Ah, in `lua-bridge.js` we didn't expose the array. We exposed `_run`.

        // Let's test by RUNNING the new pattern!

        // 3. Execute the new Skill
        lua.global.set('Inbox', []) // Clear

        const handled = Handlers._run({
            From: 'Tester',
            Tags: { Action: 'Test' }
        })

        expect(handled).toBe(true)
        const newInbox = lua.global.get('Inbox')
        expect(newInbox.length).toBe(1)
        expect(newInbox[0].Data).toBe('Skill Works!')
    })
})
