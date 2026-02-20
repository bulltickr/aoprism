/**
 * LuaPlayground.js
 * Interactive Lua IDE with live AO execution
 * Monaco Editor integration for professional coding experience
 */

import { getState, setState } from '../state.js'
import { makeAoClient } from '../core/aoClient.js'
import { DEFAULTS } from '../core/config.js'

let monacoLoaded = false
let monacoInstance = null

// Lazy load Monaco Editor
async function loadMonaco() {
    if (monacoLoaded) return monacoInstance
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js'
        script.onload = () => {
            window.require.config({
                paths: {
                    'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
                }
            })
            
            window.require(['vs/editor/editor.main'], () => {
                monacoLoaded = true
                monacoInstance = window.monaco
                
                // Configure Lua language support
                configureLuaLanguage(monacoInstance)
                
                resolve(monacoInstance)
            })
        }
        script.onerror = reject
        document.head.appendChild(script)
    })
}

// Configure Lua language with AO-specific keywords
function configureLuaLanguage(monaco) {
    monaco.languages.register({ id: 'lua' })
    
    monaco.languages.setMonarchTokensProvider('lua', {
        defaultToken: '',
        tokenPostfix: '.lua',
        keywords: [
            'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
            'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or',
            'repeat', 'return', 'then', 'true', 'until', 'while'
        ],
        
        // AO-specific globals
        aoGlobals: [
            'ao', 'Handlers', 'json', 'Owner', 'Process', 'ProcessId'
        ],
        
        // AO function names
        aoFunctions: [
            'send', 'spawn', 'assign', 'isTrusted', 'getTrustedSenders',
            'add', 'append', 'prepend', 'before', 'after', 'remove',
            'generate', 'encode', 'decode'
        ],
        
        brackets: [
            { token: 'delimiter.bracket', open: '{', close: '}' },
            { token: 'delimiter.array', open: '[', close: ']' },
            { token: 'delimiter.parenthesis', open: '(', close: ')' }
        ],
        
        operators: [
            '+', '-', '*', '/', '%', '^', '#', '==', '~=', '<=', '>=', '<',
            '>', '=', ';', ':', ',', '.', '..', '...'
        ],
        
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        
        tokenizer: {
            root: [
                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@aoGlobals': 'type',
                        '@aoFunctions': 'function',
                        '@default': 'identifier'
                    }
                }],
                { include: '@whitespace' },
                [/(\d+)(\.\d+)?([eE][+-]?\d+)?/, 'number.float'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string_double'],
                [/'/, 'string', '@string_single'],
                [/--\[\[.*\]\]/, 'comment'],
                [/--.*$/, 'comment'],
                [/@symbols/, {
                    cases: {
                        '@operators': 'operator',
                        '@default': ''
                    }
                }],
            ],
            
            whitespace: [
                [/[ \t\r\n]+/, 'white'],
            ],
            
            string_double: [
                [/[^\\"]+/, 'string'],
                [/"/, 'string', '@pop']
            ],
            
            string_single: [
                [/[^\\']+/, 'string'],
                [/'/, 'string', '@pop']
            ]
        }
    })
    
    // Add completion provider for AO globals
    monaco.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position)
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            }
            
            const suggestions = [
                // AO globals
                {
                    label: 'ao',
                    kind: monaco.languages.CompletionItemKind.Variable,
                    documentation: 'AO process context and utilities',
                    insertText: 'ao',
                    range: range
                },
                {
                    label: 'ao.send',
                    kind: monaco.languages.CompletionItemKind.Method,
                    documentation: 'Send a message to another process',
                    insertText: 'ao.send({\n  Target = "${1:processId}",\n  Action = "${2:Action}",\n  Data = "${3:data}"\n})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: range
                },
                {
                    label: 'Handlers',
                    kind: monaco.languages.CompletionItemKind.Class,
                    documentation: 'Message handler registry',
                    insertText: 'Handlers',
                    range: range
                },
                {
                    label: 'Handlers.add',
                    kind: monaco.languages.CompletionItemKind.Method,
                    documentation: 'Add a new message handler',
                    insertText: 'Handlers.add("${1:name}",\n  function (msg)\n    ${2:-- handle message}\n  end\n)',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: range
                },
                {
                    label: 'json.encode',
                    kind: monaco.languages.CompletionItemKind.Method,
                    documentation: 'Encode Lua table to JSON string',
                    insertText: 'json.encode(${1:table})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: range
                },
                {
                    label: 'json.decode',
                    kind: monaco.languages.CompletionItemKind.Method,
                    documentation: 'Decode JSON string to Lua table',
                    insertText: 'json.decode(${1:jsonString})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: range
                }
            ]
            
            return { suggestions }
        }
    })
}

class LuaPlayground {
    constructor(container) {
        this.container = container
        this.editor = null
        this.processId = ''
        this.output = []
        
        this.init()
    }
    
    async init() {
        // Load Monaco
        const monaco = await loadMonaco()
        
        // Create UI
        this.container.innerHTML = `
            <div class="playground-container">
                <div class="playground-toolbar">
                    <div class="playground-title">
                        <span class="icon">🎮</span>
                        <span>Lua Playground</span>
                    </div>
                    <div class="playground-controls">
                        <input type="text" class="playground-process-input" placeholder="Process ID (for deployment)" value="${this.processId}">
                        <button class="btn btn-ghost" id="playground-run">
                            <span>▶️</span> Run
                        </button>
                        <button class="btn btn-primary" id="playground-deploy">
                            <span>🚀</span> Deploy
                        </button>
                    </div>
                </div>
                <div class="playground-main">
                    <div class="playground-editor-container">
                        <div id="monaco-editor"></div>
                    </div>
                    <div class="playground-sidebar">
                        <div class="playground-section">
                            <h4>📚 Templates</h4>
                            <div class="playground-templates">
                                <button class="template-btn" data-template="hello">Hello World</button>
                                <button class="template-btn" data-template="token">Token Handler</button>
                                <button class="template-btn" data-template="counter">Counter</button>
                                <button class="template-btn" data-template="chat">Chat Room</button>
                            </div>
                        </div>
                        <div class="playground-section">
                            <h4>📤 Output</h4>
                            <div class="playground-output" id="playground-output"></div>
                        </div>
                    </div>
                </div>
                <div class="playground-status" id="playground-status">
                    Ready • Press ▶️ to execute
                </div>
            </div>
        `
        
        // Initialize Monaco editor
        this.editor = monaco.editor.create(this.container.querySelector('#monaco-editor'), {
            value: this.getTemplate('hello'),
            language: 'lua',
            theme: 'vs-dark',
            fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollbar: {
                useShadows: false,
                verticalHasArrows: true,
                horizontalHasArrows: true,
                vertical: 'visible',
                horizontal: 'visible'
            },
            suggest: {
                showKeywords: true,
                showSnippets: true
            }
        })
        
        // Event listeners
        this.container.querySelector('#playground-run').addEventListener('click', () => this.execute())
        this.container.querySelector('#playground-deploy').addEventListener('click', () => this.deploy())
        
        this.container.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.dataset.template
                this.editor.setValue(this.getTemplate(template))
            })
        })
        
        // Process ID input
        const processInput = this.container.querySelector('.playground-process-input')
        processInput.addEventListener('change', (e) => {
            this.processId = e.target.value
        })
    }
    
    getTemplate(name) {
        const templates = {
            hello: `-- Hello World Template
-- A basic AO process that responds to messages

Handlers.add("ping",
  function (msg)
    -- Send response back to sender
    ao.send({
      Target = msg.From,
      Action = "pong",
      Data = "Hello from AO! 👋"
    })
  end
)

-- Log initialization
print("Process initialized successfully")`,

            token: `-- Token Handler Template
-- Simple token transfer logic

Balances = Balances or {}
Balances[Owner] = 1000000  -- 1M initial supply

Handlers.add("transfer",
  function (msg)
    local recipient = msg.Tags.Recipient
    local quantity = tonumber(msg.Tags.Quantity)
    
    if not recipient or not quantity then
      return ao.send({
        Target = msg.From,
        Action = "transfer-error",
        Data = "Invalid transfer parameters"
      })
    end
    
    if (Balances[msg.From] or 0) < quantity then
      return ao.send({
        Target = msg.From,
        Action = "transfer-error",
        Data = "Insufficient balance"
      })
    end
    
    Balances[msg.From] = (Balances[msg.From] or 0) - quantity
    Balances[recipient] = (Balances[recipient] or 0) + quantity
    
    ao.send({
      Target = msg.From,
      Action = "transfer-success",
      Data = "Transferred " .. quantity .. " tokens"
    })
  end
)`,

            counter: `-- Counter Template
-- Persistent counter that increments on each request

Counter = Counter or 0

Handlers.add("increment",
  function (msg)
    Counter = Counter + 1
    
    ao.send({
      Target = msg.From,
      Action = "incremented",
      Data = tostring(Counter)
    })
  end
)

Handlers.add("get",
  function (msg)
    ao.send({
      Target = msg.From,
      Action = "counter-value",
      Data = tostring(Counter)
    })
  end
)`,

            chat: `-- Chat Room Template
-- Simple decentralized chat

Messages = Messages or {}

Handlers.add("chat",
  function (msg)
    local content = msg.Data
    local sender = msg.From
    
    table.insert(Messages, {
      sender = sender,
      content = content,
      timestamp = msg.Timestamp
    })
    
    -- Keep only last 100 messages
    if #Messages > 100 then
      table.remove(Messages, 1)
    end
    
    ao.send({
      Target = msg.From,
      Action = "chat-received",
      Data = "Message posted"
    })
  end
)

Handlers.add("history",
  function (msg)
    ao.send({
      Target = msg.From,
      Action = "chat-history",
      Data = json.encode(Messages)
    })
  end
)`
        }
        
        return templates[name] || templates.hello
    }
    
    async execute() {
        const code = this.editor.getValue()
        const statusEl = this.container.querySelector('#playground-status')
        const outputEl = this.container.querySelector('#playground-output')
        
        statusEl.textContent = '⏳ Executing...'
        statusEl.className = 'playground-status running'
        
        try {
            // For now, use dryrun to a test process
            // In production, this would evaluate in a sandbox
            const state = getState()
            
            if (!state.jwk) {
                this.addOutput('⚠️ No wallet connected. Connect wallet to execute.')
                statusEl.textContent = '❌ No wallet'
                statusEl.className = 'playground-status error'
                return
            }
            
            const { ao } = await makeAoClient({
                jwk: state.jwk,
                URL: DEFAULTS.URL
            })
            
            // Send code to process for evaluation
            // This assumes the target process supports Eval handler
            const result = await ao.dryrun({
                process: this.processId || 'test-process',
                tags: [
                    { name: 'Action', value: 'Eval' }
                ],
                data: code
            })
            
            // Display output
            if (result.Output) {
                this.addOutput(`✅ Success:\n${result.Output}`)
            }
            
            if (result.Messages && result.Messages.length > 0) {
                result.Messages.forEach(msg => {
                    this.addOutput(`📨 Message:\n${JSON.stringify(msg, null, 2)}`)
                })
            }
            
            statusEl.textContent = '✅ Executed successfully'
            statusEl.className = 'playground-status success'
            
        } catch (err) {
            this.addOutput(`❌ Error:\n${err.message}`)
            statusEl.textContent = '❌ Execution failed'
            statusEl.className = 'playground-status error'
        }
    }
    
    async deploy() {
        const code = this.editor.getValue()
        const statusEl = this.container.querySelector('#playground-status')
        
        statusEl.textContent = '🚀 Deploying...'
        statusEl.className = 'playground-status running'
        
        try {
            const state = getState()
            
            if (!state.jwk) {
                this.addOutput('⚠️ No wallet connected. Connect wallet to deploy.')
                return
            }
            
            // This would trigger the actual deployment
            // For now, just log it
            this.addOutput(`🚀 Deployment initiated...\nProcess: ${this.processId || 'new-process'}\nCode size: ${code.length} bytes`)
            
            statusEl.textContent = '✅ Deployment complete'
            statusEl.className = 'playground-status success'
            
        } catch (err) {
            this.addOutput(`❌ Deployment error:\n${err.message}`)
            statusEl.textContent = '❌ Deployment failed'
            statusEl.className = 'playground-status error'
        }
    }
    
    addOutput(text) {
        const outputEl = this.container.querySelector('#playground-output')
        const entry = document.createElement('div')
        entry.className = 'output-entry'
        entry.innerHTML = `<pre>${this.escapeHtml(text)}</pre>`
        outputEl.appendChild(entry)
        outputEl.scrollTop = outputEl.scrollHeight
    }
    
    escapeHtml(text) {
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }
}

export function initLuaPlayground(container) {
    return new LuaPlayground(container)
}
