/**
 * monacoIntegration.test.js
 * Unit tests for Monaco Editor Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupAICompletion, registerCompletionProvider, MonacoIntegration } from '../monacoIntegration.js'

// Mock Monaco and ConsoleBrain
const mockEditor = {
  getPosition: vi.fn(() => ({ lineNumber: 5, column: 10 })),
  getModel: vi.fn(() => ({
    getLineContent: vi.fn((n) => `line ${n}`),
    getLineCount: vi.fn(() => 100),
    uri: { toString: () => 'file:///test.lua' }
  })),
  executeEdits: vi.fn(),
  addCommand: vi.fn(),
  addAction: vi.fn(),
  trigger: vi.fn(),
  getContribution: vi.fn(() => ({ getGhostText: vi.fn(() => null) }))
}

global.monaco = {
  KeyCode: { Tab: 2, Space: 10, Escape: 9 },
  KeyMod: { CtrlCmd: 2048, Shift: 1024 },
  Range: class {
    constructor(sl, sc, el, ec) {
      this.startLineNumber = sl
      this.startColumn = sc
      this.endLineNumber = el
      this.endColumn = ec
    }
  },
  languages: {
    registerInlineCompletionsProvider: vi.fn(() => ({ dispose: vi.fn() })),
    registerHoverProvider: vi.fn()
  }
}

vi.mock('../../modules/console/ConsoleBrain.js', () => ({
  brain: {
    ask: vi.fn()
  }
}))

describe('MonacoIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setupAICompletion', () => {
    it('should set up completion provider', () => {
      const result = setupAICompletion(mockEditor)
      
      expect(result).toHaveProperty('disposable')
      expect(result).toHaveProperty('triggerCompletion')
      expect(result).toHaveProperty('generateFromComment')
      expect(result).toHaveProperty('dispose')
      expect(monaco.languages.registerInlineCompletionsProvider).toHaveBeenCalled()
    })

    it('should register keyboard shortcuts', () => {
      setupAICompletion(mockEditor)
      
      expect(mockEditor.addCommand).toHaveBeenCalled()
    })

    it('should trigger manual completion', () => {
      const result = setupAICompletion(mockEditor)
      result.triggerCompletion()
      
      expect(mockEditor.trigger).toHaveBeenCalledWith(
        'ai-copilot',
        'editor.action.inlineSuggest.trigger',
        {}
      )
    })

    it('should generate from comment', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue('```lua\ncode here\n```')

      const result = setupAICompletion(mockEditor)
      const genResult = await result.generateFromComment('create token')
      
      expect(genResult.success).toBe(true)
      expect(mockEditor.executeEdits).toHaveBeenCalled()
    })

    it('should dispose providers', () => {
      const disposeSpy = vi.fn()
      monaco.languages.registerInlineCompletionsProvider.mockReturnValue({ dispose: disposeSpy })
      
      const result = setupAICompletion(mockEditor)
      result.dispose()
      
      expect(disposeSpy).toHaveBeenCalled()
    })
  })

  describe('registerCompletionProvider', () => {
    it('should provide completions', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue('completion code')

      const disposable = registerCompletionProvider(mockEditor, {
        debounceMs: 0,
        minLineLength: 1
      })

      const model = {
        getLineContent: vi.fn(() => 'local x = '),
        getLineCount: vi.fn(() => 100),
        uri: { toString: () => 'file:///test.lua' }
      }
      const position = { lineNumber: 5, column: 10 }
      
      // Get the registered provider
      const provider = monaco.languages.registerInlineCompletionsProvider.mock.calls[0][1]
      const result = await provider.provideInlineCompletions(model, position, {}, { isCancellationRequested: false })
      
      expect(result).not.toBeNull()
      expect(result.items).toHaveLength(1)
    })

    it('should skip short lines', async () => {
      registerCompletionProvider(mockEditor, { minLineLength: 10 })

      const model = {
        getLineContent: vi.fn(() => 'x ='),
        getLineCount: vi.fn(() => 100),
        uri: { toString: () => 'file:///test.lua' }
      }
      const position = { lineNumber: 5, column: 4 }
      
      const provider = monaco.languages.registerInlineCompletionsProvider.mock.calls[0][1]
      const result = await provider.provideInlineCompletions(model, position, {}, { isCancellationRequested: false })
      
      expect(result).toBeNull()
    })

    it('should respect cancellation', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      registerCompletionProvider(mockEditor, { debounceMs: 0, minLineLength: 1 })

      const model = {
        getLineContent: vi.fn(() => 'local x = test'),
        getLineCount: vi.fn(() => 100),
        uri: { toString: () => 'file:///test.lua' }
      }
      const position = { lineNumber: 5, column: 15 }
      const token = { isCancellationRequested: true, onCancellationRequested: vi.fn() }
      
      const provider = monaco.languages.registerInlineCompletionsProvider.mock.calls[0][1]
      const result = await provider.provideInlineCompletions(model, position, {}, token)
      
      expect(result).toBeNull()
    })
  })

  describe('MonacoIntegration API', () => {
    it('should export all methods', () => {
      expect(MonacoIntegration.setup).toBeDefined()
      expect(MonacoIntegration.registerProvider).toBeDefined()
      expect(MonacoIntegration.COMPLETION_CONFIG).toBeDefined()
    })
  })
})
