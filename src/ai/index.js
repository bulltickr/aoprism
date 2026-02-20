/**
 * AI Copilot Module Index
 * Central export point for AI Copilot functionality
 */

export { LuaGenerator, generateLua, enhanceLua, generateHandler, batchGenerate } from './luaGenerator.js'
export { DebugAssistant, analyzeError, suggestOptimization, explainCode } from './debugAssistant.js'
export { MonacoIntegration, setupAICompletion, registerCompletionProvider } from './monacoIntegration.js'
export { SecurityAuditor, auditSecurity, scanVulnerabilities } from './securityAuditor.js'
export { AIChatPanel } from './chat/AIChatPanel.jsx'

// Main AI Copilot class combining all features
export class AICopilot {
  constructor() {
    this.initialized = false
  }

  async initialize() {
    // Check if ConsoleBrain has API key configured
    const { brain } = await import('../modules/console/ConsoleBrain.js')
    if (!brain.hasKey()) {
      console.warn('[AICopilot] No API key configured. Run /brain set-key to enable AI features.')
      return false
    }
    
    this.initialized = true
    console.log('[AICopilot] AI Copilot initialized successfully')
    return true
  }

  // Natural Language to Lua
  async generate(description, options) {
    if (!this.initialized) await this.initialize()
    const { generateLua } = await import('./luaGenerator.js')
    return generateLua(description, options)
  }

  // Debug assistance
  async debug(error, code, history) {
    if (!this.initialized) await this.initialize()
    const { analyzeError } = await import('./debugAssistant.js')
    return analyzeError(error, code, history)
  }

  // Security audit
  async audit(code) {
    if (!this.initialized) await this.initialize()
    const { auditSecurity } = await import('./securityAuditor.js')
    return auditSecurity(code)
  }
}

// Singleton instance
export const aiCopilot = new AICopilot()
export default aiCopilot
