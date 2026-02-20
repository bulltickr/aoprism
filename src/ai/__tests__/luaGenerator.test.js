/**
 * luaGenerator.test.js
 * Unit tests for Natural Language to Lua generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateLua, enhanceLua, generateHandler, LuaGenerator } from '../luaGenerator.js'

// Mock ConsoleBrain
vi.mock('../../modules/console/ConsoleBrain.js', () => ({
  brain: {
    ask: vi.fn()
  }
}))

describe('LuaGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateLua', () => {
    it('should generate Lua code from description', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
Here's a simple token contract:

\`\`\`lua
local json = require("json")

Balances = Balances or {}
TotalSupply = TotalSupply or 0
Owner = Owner or msg.From

Handlers.add("transfer",
  function(msg) return msg.Tags.Action == "Transfer" end,
  function(msg)
    local quantity = tonumber(msg.Tags.Quantity)
    assert(quantity > 0, "Invalid quantity")
    assert(Balances[msg.From] >= quantity, "Insufficient balance")
    
    Balances[msg.From] = Balances[msg.From] - quantity
    Balances[msg.Tags.Recipient] = (Balances[msg.Tags.Recipient] or 0) + quantity
    
    ao.send({
      Target = msg.Tags.Recipient,
      Tags = { Action = "Credit-Notice" }
    })
  end
)
\`\`\`

Features:
- Balance tracking
- Transfer functionality
- Credit notices
`)

      const result = await generateLua('Create a token contract', { processType: 'token' })
      
      expect(result.success).toBe(true)
      expect(result.code).toContain('Handlers.add')
      expect(result.code).toContain('transfer')
      expect(result.validation.valid).toBe(true)
      expect(result.processType).toBe('token')
    })

    it('should handle generation errors gracefully', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockRejectedValue(new Error('API Error'))

      const result = await generateLua('Create a token')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('API Error')
    })

    it('should validate generated code', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
\`\`\`lua
-- Bad code without handlers
local x = 1
\`\`\`
`)

      const result = await generateLua('Create something')
      
      expect(result.success).toBe(true)
      expect(result.validation.valid).toBe(false)
      expect(result.validation.issues.length).toBeGreaterThan(0)
    })

    it('should inject process type context', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue('```lua\n-- code\n```')

      await generateLua('Create a token', { processType: 'token' })
      
      const callArgs = brain.ask.mock.calls[0]
      expect(callArgs[0]).toContain('Process Type: Token Contract')
      expect(callArgs[0]).toContain('Required State: Balances')
    })
  })

  describe('enhanceLua', () => {
    it('should enhance existing code', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
Enhanced code:
\`\`\`lua
local json = require("json")
Balances = Balances or {}
\`\`\`
`)

      const existingCode = 'Balances = {}'
      const result = await enhanceLua(existingCode, 'Add json require')
      
      expect(result.success).toBe(true)
      expect(result.code).toContain('json')
      expect(result.originalCode).toBe(existingCode)
    })
  })

  describe('generateHandler', () => {
    it('should generate specific handler', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
\`\`\`lua
Handlers.add("mint", ...)
\`\`\`
`)

      const result = await generateHandler('mint', { ownerOnly: true })
      
      expect(result.success).toBe(true)
      expect(result.handlerType).toBe('mint')
    })
  })

  describe('LuaGenerator API', () => {
    it('should export all methods', () => {
      expect(LuaGenerator.generate).toBeDefined()
      expect(LuaGenerator.enhance).toBeDefined()
      expect(LuaGenerator.generateHandler).toBeDefined()
      expect(LuaGenerator.batchGenerate).toBeDefined()
      expect(LuaGenerator.PROCESS_TYPES).toContain('token')
      expect(LuaGenerator.PROCESS_TYPES).toContain('nft')
    })
  })
})
