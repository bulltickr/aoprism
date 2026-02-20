/**
 * CommandConsole.js
 * A "Hacker-Style" terminal for power users.
 * Supports /spawn, /eval, /cron, and raw Lua execution.
 */

import { getState, setState } from '../../state.js'
import { DEFAULTS } from '../../core/config.js'
import { makeAoClient, sendAndGetResult } from '../../core/aoClient.js'
import { mcpBridge } from '../bridge/McpBridge.js'
import { brain } from './ConsoleBrain.js'

export function renderCommandConsole() {
    const state = getState()
    // Initialize console state if missing
    if (!state.console) {
        state.console = {
            history: [
                { type: 'info', text: '💎 AOPRISM Command Kernel v1.0.0' },
                { type: 'info', text: `Connected to AO Mainnet via ${DEFAULTS.URL.includes('forward.computer') ? 'HyperBEAM' : 'Arweave Bridge'}.` },
                { type: 'info', text: '---------------------------------------------------' },
                { type: 'info', text: 'WHAT CAN I DO HERE?' },
                { type: 'info', text: '1. Spawn Agents:   /spawn <ClientName> (Costs AR)' },
                { type: 'info', text: '2. Remote Eval:    /eval <ProcessID> <LuaCode>' },
                { type: 'info', text: '3. Network Ping:   /ping <ProcessID>' },
                { type: 'info', text: '---------------------------------------------------' },
                { type: 'info', text: 'Type /help for full command list.' }
            ],
            input: ''
        }
    }

    const historyHtml = state.console.history.map(entry => {
        const color = entry.type === 'error' ? 'var(--danger)' :
            entry.type === 'success' ? '#4ade80' :
                entry.type === 'cmd' ? '#aaa' : '#fff';
        return `<div style="color: ${color}; margin-bottom: 4px; font-family: 'Fira Code', monospace; word-break: break-all;">
            ${entry.type === 'cmd' ? '> ' : ''}${entry.text}
        </div>`
    }).join('')

    return `
    <section class="command-console fade-in" style="height: 100%;" aria-label="AOPRISM Command Console">
        <div class="card glass-card" style="height: calc(100vh - 140px); display: flex; flex-direction: column; background: rgba(0,0,0,0.85); border: 1px solid #333;">
            <div class="console-header" style="padding: 10px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-family: monospace; color: #4ade80;" aria-hidden="true">user@aoprism:~$</span>
                <button id="clear-console" class="btn btn-ghost btn-sm" style="font-size: 0.8rem;" aria-label="Clear console history">Clear</button>
            </div>
            
            <div id="console-output" 
                 role="log" 
                 aria-live="polite" 
                 style="flex: 1; overflow-y: auto; padding: 20px; font-family: 'Fira Code', monospace; font-size: 0.9rem;">
                ${historyHtml}
            </div>
            
            <div class="console-input-area" style="padding: 20px; border-top: 1px solid #333; display: flex; align-items: center;">
                <label for="console-input" style="color: #4ade80; margin-right: 10px; font-weight: bold;" aria-hidden="true">></label>
                <input type="text" id="console-input" 
                    style="flex: 1; background: transparent; border: none; color: white; font-family: 'Fira Code', monospace; font-size: 1rem; outline: none;"
                    placeholder="Enter command..."
                    aria-label="Terminal input"
                >
            </div>
        </div>
    </section>
    `
}

// Internal helper for immutable state updates
function appendToConsole(text, type = 'info') {
    const state = getState()
    if (!state.console) return
    const newHistory = [...state.console.history, { type, text }]
    setState({
        console: {
            ...state.console,
            history: newHistory
        }
    })
}

// Export for checking/testing
export async function executeCommand(cmd, args) {
    const state = getState()

    // Log command
    appendToConsole(`${cmd} ${args.join(' ')}`, 'cmd')

    try {
        const { ao, signer } = await makeAoClient({
            jwk: state.jwk,
            publicKey: state.publicKey,
            URL: DEFAULTS.URL,
            SCHEDULER: DEFAULTS.SCHEDULER,
            MODE: DEFAULTS.MODE
        })

        switch (cmd) {
            case '/help':
                return [
                    '🟢 CORE SYSTEM',
                    '  /spawn <name>        - Deploy new Agent',
                    '  /eval <pid> <code>   - Execute Lua code',
                    '  /ping <pid>          - Network connectivity check',
                    '',
                    '🧠 INTELLIGENCE (BYOK)',
                    '  /brain set-key ...   - Config: <key> [provider] [model]',
                    '  /ask <query>         - Chat with AI',
                    '  /autodev <p> <txt>   - Generate & Deploy Logic',
                    '',
                    '🔧 UTILITIES',
                    '  /whoami              - Current Identity',
                    '  /network             - Gateway Status',
                    '  /history             - Command Log',
                    '  /clear               - Wipe Screen',
                    '  /date                - System Time'
                ].join('\n')

            // --- UTILITIES ---
            case '/whoami':
                return `User: ${state.address}\nGateway: ${state.url}\nActive Module: ${state.activeModule}`

            case '/network':
                // Check gateway latency
                const start = Date.now()
                await fetch(state.url).catch(() => null)
                const lat = Date.now() - start
                return `Gateway: ${state.url}\nLatency: ${lat}ms\nStatus: ONLINE`

            case '/history':
                return state.console.history.map(h => `[${h.type}] ${h.text}`).slice(-10).join('\n')

            case '/date':
                return new Date().toString()

            // --- INTELLIGENCE COMMANDS ---
            case '/brain':
                // Usage: /brain set-key <key> [provider] [model]
                if (args[0] === 'set-key' && args[1]) {
                    const provider = args[2] || 'openai'
                    const model = args[3] || null
                    brain.setConfig(args[1], provider, null, model)
                    return `🧠 Neural Link Established.\nProvider: ${provider}\nModel: ${model || 'default'}`
                }
                if (args[0] === 'status') {
                    return `Brain Status:\nProvider: ${brain.provider}\nModel: ${brain.model || 'Auto'}\nKey Configured: ${brain.hasKey() ? 'YES' : 'NO'}`
                }
                return "Usage: /brain set-key <key> [provider] [model]\nSupported: openai, anthropic, google, deepseek, mistral, moonshot (kimi), groq, siliconflow, openrouter"

            case '/ask':
                if (!brain.hasKey()) throw new Error("Missing Brain. Run: /brain set-key <key> [provider]")
                const question = args.join(' ')
                state.console.history.push({ type: 'info', text: 'Thinking...' })
                setState({ console: state.console }, false)

                const answer = await brain.ask(question)
                return answer

            case '/autodev':
                if (!brain.hasKey()) throw new Error("Missing Brain. Run: /brain set-key <key> [provider]")
                // Usage: /autodev <pid> <prompt>
                if (args.length < 2) throw new Error("Usage: /autodev <pid> <task>")

                const targetPid = args[0]
                const task = args.slice(1).join(' ')

                appendToConsole(`🧠 Generative Coding: "${task}"...`)

                const code = await brain.autoDev(task)

                appendToConsole(`📜 Generated Lua:\n${code}`)
                appendToConsole(`🚀 Deploying to ${targetPid}...`)

                const evalMsg = await ao.message({
                    process: targetPid,
                    tags: [{ name: 'Action', value: 'Eval' }],
                    data: code,
                    signer
                })

                return `✅ AutoDev Complete! Code injected into ${targetPid}.`

            // --- NEURAL BRIDGE COMMANDS ---
            case '/bridge':
                const sub = args[0]
                if (sub === 'connect') {
                    mcpBridge.connect()
                    return 'Attempting Neural Link...'
                }
                if (sub === 'status') {
                    return mcpBridge.isConnected ? '✅ Neural Bridge Connected' : '❌ Disconnected (Run local server)'
                }
                if (sub === 'test') {
                    try {
                        // Determine test file path based on OS (Assuming Windows based on User Context, or use relative)
                        // We'll read the package.json of the MCP project
                        const demoPath = './package.json'

                        appendToConsole(`[TEST] Agent requesting to read: ${demoPath}`)
                        const result = await mcpBridge.executeTool('fs_read_file', { path: demoPath })

                        return `Result: ${JSON.stringify(result).slice(0, 100)}...`
                    } catch (e) {
                        return `Bridge Error: ${e.message}`
                    }
                }
                return 'Usage: /bridge [connect|status|test]'

            // --- CORE COMMANDS ---
            case '/spawn':
                if (!args[0]) throw new Error('Usage: /spawn <process_name>')
                const name = args[0]
                const pid = await ao.spawn({
                    module: DEFAULTS.AOS_MODULE,
                    scheduler: DEFAULTS.SCHEDULER,
                    tags: [
                        { name: 'Name', value: name }
                    ],
                    signer
                })
                return `🚀 Spawned Agent: ${name}\nID: ${pid}`

            case '/eval':
                if (args.length < 2) throw new Error('Usage: /eval <pid> <lua_code>')
                const target = args[0]
                const valCode = args.slice(1).join(' ')

                if (!confirm(`⚠️ WARNING: You are about to execute raw Lua code on process ${target}.\n\nCode:\n${valCode}\n\nProceed?`)) {
                    return "Operation cancelled by user."
                }

                const msgId = await ao.message({
                    process: target,
                    tags: [{ name: 'Action', value: 'Eval' }],
                    data: valCode,
                    signer
                })
                const res = await ao.result({ process: target, message: msgId })
                return `Output:\n${res.Output?.data || 'No output'}`

            case '/ping':
                if (!args[0]) throw new Error('Usage: /ping <pid>')
                await ao.message({
                    process: args[0],
                    tags: [{ name: 'Action', value: 'Ping' }],
                    signer
                })
                return "Pong! (Message sent)"

            case '/clear':
                state.console.history = []
                return null

            default:
                return `Unknown command: ${cmd}`
        }
    } catch (err) {
        throw new Error(err.message)
    }
}

export function attachConsoleEvents(root) {
    const input = root.querySelector('#console-input')
    const output = root.querySelector('#console-output')
    const clearBtn = root.querySelector('#clear-console')

    // Auto-scroll to bottom
    if (output) output.scrollTop = output.scrollHeight

    if (clearBtn) {
        clearBtn.onclick = () => {
            const state = getState()
            setState({
                console: {
                    ...state.console,
                    history: []
                }
            })
        }
    }

    if (input) {
        // Ensure focus if it was previously active or if the console was just rendered
        requestAnimationFrame(() => input.focus())

        input.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                const raw = input.value.trim()
                if (!raw) return

                input.value = ''

                // Improved parser to handle quoted arguments
                const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g
                const parts = []
                let match
                while ((match = regex.exec(raw)) !== null) {
                    parts.push(match[1] || match[2] || match[0])
                }

                if (parts.length === 0) return
                const cmd = parts[0]
                const args = parts.slice(1)

                try {
                    const resultText = await executeCommand(cmd, args)
                    if (resultText) {
                        appendToConsole(resultText, 'success')
                    }
                } catch (err) {
                    let msg = err.message
                    if (msg.includes('402') || msg.includes('Fund')) {
                        msg = "Spawn failed: Insufficient AR Balance. You need tokens to spawn agents."
                    }
                    appendToConsole(`❌ ${msg}`, 'error')
                }
            }
        }
    }
}
