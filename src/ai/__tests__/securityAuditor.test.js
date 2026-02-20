/**
 * securityAuditor.test.js
 * Unit tests for Security Auditor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auditSecurity, scanVulnerabilities, SecurityAuditor } from '../securityAuditor.js'

vi.mock('../../modules/console/ConsoleBrain.js', () => ({
  brain: {
    ask: vi.fn()
  }
}))

describe('SecurityAuditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('auditSecurity', () => {
    it('should detect pattern-based vulnerabilities', async () => {
      const vulnerableCode = `
Handlers.add("mint", function(msg) 
  local amount = tonumber(msg.Tags.Amount)
  Balances[msg.From] = (Balances[msg.From] or 0) + amount
end)
`
      const result = await auditSecurity(vulnerableCode)
      
      expect(result.success).toBe(true)
      expect(result.score).toBeLessThan(100)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues.some(i => i.category === 'authorization')).toBe(true)
    })

    it('should include AI analysis when available', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockResolvedValue(`
[{
  "id": "ai-1",
  "severity": "high",
  "category": "validation",
  "description": "Missing validation",
  "line": 5,
  "fix": "Add assert"
}]
`)

      const code = 'local x = 1'
      const result = await auditSecurity(code)
      
      expect(result.issues.some(i => i.source === 'ai')).toBe(true)
    })

    it('should handle AI analysis failure gracefully', async () => {
      const { brain } = await import('../../modules/console/ConsoleBrain.js')
      brain.ask.mockRejectedValue(new Error('API Error'))

      const code = 'Handlers.add("test", function() end)'
      const result = await auditSecurity(code)
      
      expect(result.success).toBe(true)
      expect(result.metadata.aiIssues).toBe(0)
    })

    it('should calculate security score correctly', async () => {
      const criticalCode = `
Handlers.add("destroy", function(msg)
  Owner = nil
end)
`
      const result = await auditSecurity(criticalCode)
      
      expect(result.score).toBeLessThan(80)
      expect(result.safe).toBe(false)
      expect(result.summary.bySeverity.critical).toBeGreaterThan(0)
    })

    it('should provide recommendations based on score', async () => {
      // Code with only low-severity issues
      const codeWithMinorIssues = `
local json = require("json")
Balances = Balances or {}
TotalSupply = TotalSupply or 0
Owner = Owner or msg.From

Handlers.add("info",
  function(msg) return msg.Tags.Action == "Info" end,
  function(msg)
    assert(msg.From, "Sender required")
    return json.encode({ owner = Owner, supply = TotalSupply })
  end
)
`
      const result = await auditSecurity(codeWithMinorIssues)
      
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.summary.recommendation).toBeDefined()
    })
  })

  describe('scanVulnerabilities', () => {
    it('should perform quick pattern-only scan', () => {
      const code = `
Handlers.add("mint", function(msg)
  Balances[msg.From] = Balances[msg.From] + msg.Tags.Amount
end)
`
      const result = scanVulnerabilities(code)
      
      expect(result.safe).toBe(false)
      expect(result.criticalCount).toBeGreaterThan(0)
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should return safe for secure code', () => {
      // Truly minimal safe code
      const safeCode = `
local Value = Value or 0
function getValue()
  return Value
end
`
      const result = scanVulnerabilities(safeCode)
      
      expect(result.criticalCount).toBe(0)
    })
  })

  describe('SecurityAuditor API', () => {
    it('should export all methods', () => {
      expect(SecurityAuditor.audit).toBeDefined()
      expect(SecurityAuditor.scan).toBeDefined()
      expect(SecurityAuditor.PATTERNS).toBeDefined()
      expect(SecurityAuditor.SEVERITY_WEIGHTS).toBeDefined()
    })

    it('should have security patterns defined', () => {
      expect(SecurityAuditor.PATTERNS.length).toBeGreaterThan(0)
      
      const pattern = SecurityAuditor.PATTERNS[0]
      expect(pattern.id).toBeDefined()
      expect(pattern.severity).toBeDefined()
      expect(pattern.pattern).toBeDefined()
    })
  })
})
