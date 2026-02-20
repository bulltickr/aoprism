/**
 * monacoIntegration.js
 * Monaco Editor integration for AI Copilot
 * Provides inline completions, hover info, and AI-assisted editing
 */

import { brain } from '../modules/console/ConsoleBrain.js'
import { generateLua } from './luaGenerator.js'

// Configuration for completion provider
const COMPLETION_CONFIG = {
  triggerCharacters: ['.', ':', ' ', '(', '{', '\n'],
  debounceMs: 100,
  maxContextLines: 50,
  maxSuggestions: 3,
  minLineLength: 3
}

// Cache for completion results
const completionCache = new Map()
const CACHE_TTL = 30000 // 30 seconds

/**
 * Sets up AI completion provider for Monaco Editor
 * @param {Object} editor - Monaco editor instance
 * @param {Object} options - Configuration options
 */
export function setupAICompletion(editor, options = {}) {
  const config = { ...COMPLETION_CONFIG, ...options }
  
  // Register inline completion provider
  const disposable = registerCompletionProvider(editor, config)
  
  // Set up keyboard shortcuts
  setupKeyboardShortcuts(editor)
  
  // Set up hover provider for AI explanations
  setupHoverProvider(editor)
  
  // Set up command for inline generation
  setupGenerationCommand(editor)
  
  return {
    disposable,
    
    /**
     * Trigger manual AI completion
     */
    triggerCompletion: () => {
      editor.trigger('ai-copilot', 'editor.action.inlineSuggest.trigger', {})
    },
    
    /**
     * Generate code from comment
     * @param {string} comment - Comment describing desired code
     */
    generateFromComment: async (comment) => {
      const position = editor.getPosition()
      const result = await generateLua(comment, { processType: 'generic' })
      
      if (result.success && result.code) {
        editor.executeEdits('ai-copilot', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: '\n' + result.code
        }])
        return { success: true, inserted: true }
      }
      
      return { success: false, error: result.error }
    },
    
    /**
     * Dispose of all providers
     */
    dispose: () => {
      disposable.dispose()
    }
  }
}

/**
 * Registers the inline completion provider
 * @param {Object} editor - Monaco editor
 * @param {Object} config - Configuration
 * @returns {Object} Disposable provider
 */
export function registerCompletionProvider(editor, config) {
  const provider = {
    provideInlineCompletions: async (model, position, context, token) => {
      // Check debounce
      const cacheKey = `${model.uri.toString()}:${position.lineNumber}:${position.column}`
      const cached = completionCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < config.debounceMs) {
        return cached.result
      }
      
      // Get line content
      const line = model.getLineContent(position.lineNumber)
      const prefix = line.substring(0, position.column - 1)
      
      // Skip if line too short
      if (prefix.trim().length < config.minLineLength) {
        return null
      }
      
      // Get context
      const fullContext = getEditorContext(model, position, config.maxContextLines)
      
      try {
        // Generate completion
        const suggestion = await generateCompletion(prefix, fullContext, token)
        
        if (!suggestion || !suggestion.code) {
          return null
        }
        
        const result = {
          items: [{
            insertText: suggestion.code,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
            command: {
              id: 'ai.acceptCompletion',
              title: 'Accept AI Suggestion',
              arguments: [{
                explanation: suggestion.explanation,
                confidence: suggestion.confidence
              }]
            }
          }]
        }
        
        // Cache result
        completionCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        })
        
        // Cleanup old cache entries
        cleanupCache()
        
        return result
      } catch (error) {
        console.error('[AI Completion] Error:', error)
        return null
      }
    },
    
    handleItemDidShow: () => {
      // Track completion shown
      window.dispatchEvent(new CustomEvent('aoprism-ai-completion-shown'))
    },
    
    handlePartialAccept: () => {
      // Track partial acceptance
      window.dispatchEvent(new CustomEvent('aoprism-ai-completion-partial'))
    }
  }
  
  // Register with Monaco
  return monaco.languages.registerInlineCompletionsProvider('lua', provider)
}

/**
 * Gets editor context for completion generation
 * @param {Object} model - Monaco model
 * @param {Object} position - Cursor position
 * @param {number} maxLines - Maximum context lines
 * @returns {Object} Context information
 */
function getEditorContext(model, position, maxLines) {
  const startLine = Math.max(1, position.lineNumber - maxLines)
  const endLine = Math.min(model.getLineCount(), position.lineNumber + 5)
  
  const beforeLines = []
  for (let i = startLine; i < position.lineNumber; i++) {
    beforeLines.push(model.getLineContent(i))
  }
  
  const currentLine = model.getLineContent(position.lineNumber)
  const afterLines = []
  for (let i = position.lineNumber + 1; i <= endLine; i++) {
    afterLines.push(model.getLineContent(i))
  }
  
  // Extract state variables
  const stateVars = extractStateVariables(beforeLines.join('\n'))
  
  // Extract handlers
  const handlers = extractHandlers(beforeLines.join('\n'))
  
  return {
    before: beforeLines.join('\n'),
    current: currentLine,
    after: afterLines.join('\n'),
    stateVars,
    handlers,
    lineNumber: position.lineNumber
  }
}

/**
 * Extracts state variables from code
 * @param {string} code - Lua code
 * @returns {Array} State variable names
 */
function extractStateVariables(code) {
  const vars = []
  const regex = /(\w+)\s*=\s*\1\s+or/g
  let match
  while ((match = regex.exec(code)) !== null) {
    vars.push(match[1])
  }
  return vars
}

/**
 * Extracts handler names from code
 * @param {string} code - Lua code  
 * @returns {Array} Handler names
 */
function extractHandlers(code) {
  const handlers = []
  const regex = /Handlers\.add\s*\(\s*["'](\w+)["']/g
  let match
  while ((match = regex.exec(code)) !== null) {
    handlers.push(match[1])
  }
  return handlers
}

/**
 * Generates completion using AI
 * @param {string} prefix - Current line prefix
 * @param {Object} context - Editor context
 * @param {Object} token - Cancellation token
 * @returns {Promise<Object|null>} Completion suggestion
 */
async function generateCompletion(prefix, context, token) {
  // Check cancellation
  if (token.isCancellationRequested) {
    return null
  }
  
  const prompt = buildCompletionPrompt(prefix, context)
  
  const SYSTEM_PROMPT = `You are an expert AO Lua developer. Provide code completions.
Rules:
1. Complete the current line or suggest next line
2. Use AO patterns (Handlers, ao.send, json)
3. Be concise (1-3 lines max)
4. Only provide code, no explanations
5. Match existing code style`

  try {
    const response = await Promise.race([
      brain.ask(prompt, SYSTEM_PROMPT),
      new Promise((_, reject) => {
        token.onCancellationRequested(() => reject(new Error('Cancelled')))
      })
    ])
    
    if (!response) return null
    
    // Extract code from response
    const codeMatch = response.match(/```lua\n([\s\S]*?)```/)
    const code = codeMatch ? codeMatch[1].trim() : response.trim()
    
    // Calculate confidence based on response quality
    const confidence = calculateConfidence(code, context)
    
    return {
      code,
      explanation: 'AI-generated completion',
      confidence,
      latency: Date.now()
    }
  } catch (error) {
    if (error.message === 'Cancelled') return null
    throw error
  }
}

/**
 * Builds completion prompt
 * @param {string} prefix - Current line prefix
 * @param {Object} context - Editor context
 * @returns {string} Prompt
 */
function buildCompletionPrompt(prefix, context) {
  return `Complete this AO Lua code:

Context:
${context.before.slice(-1000)}

State variables: ${context.stateVars.join(', ')}
Handlers: ${context.handlers.join(', ')}

Current line: ${prefix}█

Provide the completion (just code, no explanation):`
}

/**
 * Calculates confidence score for suggestion
 * @param {string} code - Generated code
 * @param {Object} context - Editor context
 * @returns {number} Confidence 0-100
 */
function calculateConfidence(code, context) {
  let score = 70 // Base score
  
  // Boost for using known patterns
  if (code.includes('Handlers')) score += 10
  if (code.includes('ao.send')) score += 5
  if (code.includes('assert')) score += 5
  
  // Boost for using existing state variables
  for (const varName of context.stateVars) {
    if (code.includes(varName)) score += 3
  }
  
  // Penalty for very long completions
  if (code.split('\n').length > 5) score -= 10
  
  return Math.min(95, Math.max(30, score))
}

/**
 * Sets up keyboard shortcuts
 * @param {Object} editor - Monaco editor
 */
function setupKeyboardShortcuts(editor) {
  // Tab to accept completion
  editor.addCommand(monaco.KeyCode.Tab, () => {
    const completion = editor.getContribution('editor.contrib.inlineCompletions')
    if (completion && completion.getGhostText()) {
      editor.trigger('keyboard', 'acceptInlineCompletion', {})
      window.dispatchEvent(new CustomEvent('aoprism-ai-completion-accepted'))
    } else {
      // Normal tab behavior
      editor.trigger('keyboard', 'type', { text: '\t' })
    }
  })
  
  // Ctrl+Space for AI generation
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
    editor.trigger('ai-copilot', 'editor.action.inlineSuggest.trigger', {})
  })
  
  // Esc to hide completion
  editor.addCommand(monaco.KeyCode.Escape, () => {
    editor.trigger('keyboard', 'hideInlineCompletion', {})
  })
}

/**
 * Sets up hover provider for AI explanations
 * @param {Object} editor - Monaco editor
 */
function setupHoverProvider(editor) {
  monaco.languages.registerHoverProvider('lua', {
    provideHover: async (model, position) => {
      const word = model.getWordAtPosition(position)
      if (!word) return null
      
      // Get surrounding context
      const line = model.getLineContent(position.lineNumber)
      
      // Check if it's an AO-specific term
      const aoTerms = {
        'Handlers': 'Message handler registry for AO processes',
        'ao.send': 'Send a message to another AO process',
        'msg.From': 'Address of the message sender',
        'msg.Tags': 'Table of message tags/metadata',
        'json.encode': 'Encode Lua table to JSON string',
        'json.decode': 'Decode JSON string to Lua table',
        'assert': 'Assert condition with optional message'
      }
      
      const info = aoTerms[word.word]
      if (info) {
        return {
          contents: [
            { value: `**${word.word}**` },
            { value: info }
          ]
        }
      }
      
      return null
    }
  })
}

/**
 * Sets up command for inline generation
 * @param {Object} editor - Monaco editor
 */
function setupGenerationCommand(editor) {
  editor.addAction({
    id: 'ai-generate-from-comment',
    label: 'AI: Generate from Comment',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space
    ],
    run: async (ed) => {
      const position = ed.getPosition()
      const line = ed.getModel().getLineContent(position.lineNumber)
      
      // Extract comment content
      const commentMatch = line.match(/--+\s*(.+)/)
      if (commentMatch) {
        const result = await generateLua(commentMatch[1], { processType: 'generic' })
        
        if (result.success && result.code) {
          ed.executeEdits('ai-copilot', [{
            range: new monaco.Range(
              position.lineNumber,
              line.length + 1,
              position.lineNumber,
              line.length + 1
            ),
            text: '\n' + result.code
          }])
          
          window.dispatchEvent(new CustomEvent('aoprism-ai-generated', {
            detail: { prompt: commentMatch[1], code: result.code }
          }))
        }
      }
    }
  })
}

/**
 * Cleans up old cache entries
 */
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of completionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      completionCache.delete(key)
    }
  }
}

// Export Monaco integration API
export const MonacoIntegration = {
  setup: setupAICompletion,
  registerProvider: registerCompletionProvider,
  COMPLETION_CONFIG
}

export default MonacoIntegration
