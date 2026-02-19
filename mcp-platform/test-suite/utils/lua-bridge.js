/**
 * lua-bridge.js
 * Bridges Node.js and Lua for testing AO processes locally.
 * Uses 'wasmoon' to run a Lua VM inside Node.
 */

import { LuaFactory } from 'wasmoon'
import { readFile } from 'fs/promises'
import { resolve } from 'path'

// Mock the AO environment globals
export async function createLuaEnvironment() {
    const factory = new LuaFactory()
    const lua = await factory.createEngine()

    // 1. Mock 'ao' global
    const aoMock = {
        send: (msg) => {
            // Store sent messages in a global array for inspection
            const inbox = lua.global.get('Inbox') || []
            inbox.push(msg)
            lua.global.set('Inbox', inbox)
        },
        spawn: (module, msg) => {
            const spawns = lua.global.get('Spawns') || []
            spawns.push({ module, msg })
            lua.global.set('Spawns', spawns)
        }
    }

    // Expose 'ao' to Lua
    lua.global.set('ao', aoMock)
    lua.global.set('Inbox', []) // Output messages go here
    lua.global.set('Spawns', [])

    // 2. Mock 'json' global (ao processes usually have this)
    const jsonMock = {
        encode: (val) => JSON.stringify(val),
        decode: (str) => JSON.parse(str)
    }
    lua.global.set('json', jsonMock)

    // 3. Mock 'Handlers' global list
    // In AO, Handlers is a library. We need to implement a basic version of it
    // so the Lua files can call Handlers.add(...)

    const handlersList = []
    const HandlersMock = {
        add: (name, pattern, handle) => {
            handlersList.push({ name, pattern, handle })
        },
        utils: {
            hasMatchingTag: (name, value) => {
                // Return a function that verifies the msg
                return (msg) => {
                    if (!msg.Tags) return false
                    // Lua tables come back as Maps or Objects depending on implementation
                    // Simplification: Assume msg.Tags is a JS object here
                    return msg.Tags[name] === value
                }
            }
        },
        // Helper to run a message against registered handlers (Simulate AO execution)
        _run: (msg) => {
            let handled = false
            for (const h of handlersList) {
                // In a real env, patterns are functions. 
                // We simplified hasMatchingTag to return a JS function.
                // We need to execute the pattern checker.
                // Problem: The pattern checker is a Lua function (if defined in lua) OR a JS function (if defined here)
                // The file calls Handlers.utils.hasMatchingTag, which we defined above in JS.
                // So 'h.pattern' is a JS function.

                if (h.pattern(msg)) {
                    h.handle(msg) // valid match
                    handled = true
                }
            }
            return handled
        }
    }

    lua.global.set('Handlers', HandlersMock)
    lua.global.set('AgentMemory', {}) // Global state for the specifically tested file

    return { lua, HandlersMock }
}

export async function loadLuaFile(lua, filePath) {
    const code = await readFile(filePath, 'utf8')
    await lua.doString(code)
}
