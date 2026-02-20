/**
 * Tool: ao_test
 * Run a suite of unit tests against Lua code in an isolated environment.
 */

import { z } from 'zod'
import { LuaFactory } from 'wasmoon'

export const aoTestTool = {
    name: 'ao_test',
    description:
        'Run a suite of unit tests against Lua code in an isolated environment using the AOPRISM Testing Framework. Use this to verify contract logic, check for bugs, and ensure handlers behave correctly before deployment.',

    schema: z.object({
        processCode: z.string().describe('The Lua source code of the contract to test'),
        testSuites: z.array(z.object({
            name: z.string().describe('Name of the test suite'),
            tests: z.array(z.object({
                name: z.string().describe('Name of the test case'),
                code: z.string().describe('Lua code for the test case (includes assertions)')
            })),
            beforeEach: z.string().optional().describe('Lua code to run before each test'),
            beforeAll: z.string().optional().describe('Lua code to run before all tests in the suite')
        })).describe('Array of test suites to execute')
    }),

    async handler({ processCode, testSuites }) {
        const factory = new LuaFactory()
        const lua = await factory.createEngine()

        const results = []
        let totalPassed = 0
        let totalFailed = 0

        try {
            // Mock Handlers and ao globals
            lua.global.set('Handlers', {
                handlers: {},
                add: (name, fn) => {
                    lua.global.get('Handlers').handlers[name] = fn
                }
            })

            lua.global.set('ao', {
                id: 'test-process-id',
                send: (msg) => {
                    return { id: 'test-msg-' + Date.now() }
                }
            })

            // Run individual suites
            for (const suite of testSuites) {
                const suiteResult = {
                    name: suite.name,
                    tests: [],
                    passed: 0,
                    failed: 0
                }

                // Load base process code
                await lua.doString(processCode)

                if (suite.beforeAll) {
                    await lua.doString(suite.beforeAll)
                }

                for (const test of suite.tests) {
                    if (suite.beforeEach) {
                        await lua.doString(suite.beforeEach)
                    }

                    try {
                        await lua.doString(test.code)
                        suiteResult.tests.push({ name: test.name, status: 'passed' })
                        suiteResult.passed++
                        totalPassed++
                    } catch (err) {
                        suiteResult.tests.push({ name: test.name, status: 'failed', error: err.message })
                        suiteResult.failed++
                        totalFailed++
                    }
                }

                results.push(suiteResult)
            }

            return {
                summary: {
                    totalTests: totalPassed + totalFailed,
                    passed: totalPassed,
                    failed: totalFailed,
                    allPassed: totalFailed === 0
                },
                suites: results
            }
        } finally {
            // Cleanup engine
            // wasmoon doesn't always need explicit cleanup if GC'd, but good practice
        }
    },
}
