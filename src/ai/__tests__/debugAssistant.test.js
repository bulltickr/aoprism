/**
 * debugAssistant.test.js
 * Unit tests for Debug Assistant
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeError, suggestOptimization, explainCode, DebugAssistant } from '../debugAssistant.js'

vi.mock('../../modules/console/ConsoleBrain.js', () => ({
  brain: {
    ask: vi.fn()
  }
}))

describe('DebugAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeError', () => {
    it('should analyze error with AI', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
Root cause:
The variable is nil

Solution:
Initialize the table

Fix:
\`\`\`lua
Balances = Balances or {}
\`\`\`

Prevention:
Always use default values

Similar errors:
Table access errors
`)

      const error = new Error('attempt to index field \'Balances\' (a nil value)')
      const result = await analyzeError(error, '-- code')
      
      expect(result.success).toBe(true)
      expect(result.error.category).toBe('nil-reference')
      expect(result.rootCause).toBeDefined()
      expect(result.solution).toBeDefined()
    })

    it('should use pattern matching as fallback', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockRejectedValue(new Error('API Error'))

      const error = new Error('attempt to index field (a nil value)')
      const result = await analyzeError(error, '-- code')
      
      expect(result.success).toBe(true)
      expect(result.fallback).toBe(true)
      expect(result.patternMatch.category).toBe('nil-reference')
    })

    it('should handle missing patterns gracefully', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockRejectedValue(new Error('API Error'))

      const error = new Error('Some unknown error')
      const result = await analyzeError(error)
      
      expect(result.success).toBe(false)
      expect(result.apiError).toBe('API Error')
    })

    it('should accept string errors', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue('Root cause: Error found')

      const result = await analyzeError('Custom error message')
      
      expect(result.success).toBe(true)
      expect(result.error.message).toBe('Custom error message')
    })
  })

  describe('suggestOptimization', () => {
    it('should suggest optimizations', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
1. Use local variables for performance (high)
2. Add input validation (critical)
\`\`\`lua
assert(msg.Tags.Amount, "Amount required")
\`\`\`
`)

      const result = await suggestOptimization('code here')
      
      expect(result.success).toBe(true)
      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.summary.total).toBeGreaterThan(0)
    })

    it('should categorize suggestions by severity', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
1. Critical security issue found
2. High performance impact
3. Medium quality issue
4. Low priority suggestion
`)

      const result = await suggestOptimization('code')
      
      expect(result.success).toBe(true)
      expect(result.summary.critical).toBeGreaterThanOrEqual(0)
      expect(result.summary.high).toBeGreaterThanOrEqual(0)
    })
  })

  describe('explainCode', () => {
    it('should explain code at different detail levels', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue('This is a token contract that handles transfers.')

      const result = await explainCode('lua code', 'brief')
      
      expect(result.success).toBe(true)
      expect(result.explanation).toContain('token')
      expect(result.detailLevel).toBe('brief')
    })
  })

  describe('DebugAssistant API', () => {
    it('should export all methods', () => {
      expect(DebugAssistant.analyze).toBeDefined()
      expect(DebugAssistant.optimize).toBeDefined()
      expect(DebugAssistant.explain).toBeDefined()
      expect(DebugAssistant.ERROR_PATTERNS).toBeDefined()
      expect(DebugAssistant.ERROR_PATTERNS['attempt to index']).toBeDefined()
    })
  })
})
