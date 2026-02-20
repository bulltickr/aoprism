/**
 * aiCopilot.example.js
 * Usage examples for AI Copilot module
 * 
 * This file demonstrates how to integrate AI Copilot
 * with existing AOPRISM infrastructure
 */

import { aiCopilot, generateLua, analyzeError, auditSecurity } from '../src/ai/index.js'
import { brain } from '../src/modules/console/ConsoleBrain.js'

// ============================================================================
// EXAMPLE 1: Basic Setup and Code Generation
// ============================================================================

async function example1_BasicGeneration() {
  console.log('=== Example 1: Basic Code Generation ===\n')
  
  // Initialize AI Copilot
  const initialized = await aiCopilot.initialize()
  if (!initialized) {
    console.log('Please configure API key with: /brain set-key <key> <provider>')
    return
  }
  
  // Generate a token contract
  const result = await aiCopilot.generate(
    'Create a token called "AO Coin" with symbol "AOC", 18 decimals, and 10M supply minted to the owner',
    { processType: 'token' }
  )
  
  if (result.success) {
    console.log('✅ Generated Code:')
    console.log(result.code)
    console.log('\n📊 Validation Score:', result.validation.score + '/100')
    console.log('📝 Explanation:', result.explanation)
  } else {
    console.log('❌ Generation failed:', result.error)
  }
}

// ============================================================================
// EXAMPLE 2: Debug Assistant
// ============================================================================

async function example2_DebugAssistant() {
  console.log('\n=== Example 2: Debug Assistant ===\n')
  
  const buggyCode = `
Handlers.add("transfer", function(msg)
  local amount = tonumber(msg.Tags.Quantity)
  Balances[msg.From] = Balances[msg.From] - amount
  Balances[msg.Tags.Recipient] = Balances[msg.Tags.Recipient] + amount
end)
`
  
  const error = new Error("attempt to perform arithmetic on a nil value")
  
  const analysis = await analyzeError(error, buggyCode, [
    { From: 'user1', Tags: { Action: 'Transfer', Quantity: '100' } }
  ])
  
  if (analysis.success) {
    console.log('🔍 Root Cause:', analysis.rootCause)
    console.log('💡 Solution:', analysis.solution)
    console.log('🛠️  Fix:', analysis.fix)
    console.log('⚠️  Prevention:', analysis.prevention)
  }
}

// ============================================================================
// EXAMPLE 3: Security Audit
// ============================================================================

async function example3_SecurityAudit() {
  console.log('\n=== Example 3: Security Audit ===\n')
  
  const untrustedCode = `
Handlers.add("mint", function(msg)
  local amount = tonumber(msg.Tags.Amount)
  Balances[msg.From] = (Balances[msg.From] or 0) + amount
end)

Handlers.add("destroy", function(msg)
  Balances = {}
end)
`
  
  const audit = await auditSecurity(untrustedCode)
  
  console.log('🔒 Security Score:', audit.score + '/100')
  console.log('✅ Safe to Deploy:', audit.safe ? 'Yes' : 'No')
  console.log('\n📋 Issues Found:', audit.summary.totalIssues)
  
  audit.issues.slice(0, 3).forEach((issue, i) => {
    console.log(`\n${i + 1}. [${issue.severity.toUpperCase()}] ${issue.name}`)
    console.log(`   ${issue.description}`)
    console.log(`   Line ${issue.line}: ${issue.code}`)
  })
}

// ============================================================================
// EXAMPLE 4: Monaco Editor Integration
// ============================================================================

async function example4_MonacoIntegration() {
  console.log('\n=== Example 4: Monaco Editor Integration ===\n')
  
  // This would be used in a real editor context
  console.log(`
// In your Monaco editor setup:
import { setupAICompletion } from './src/ai/monacoIntegration.js'

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: '-- Start coding...',
  language: 'lua'
})

const aiCompletion = setupAICompletion(editor, {
  triggerCharacters: ['.', ':', ' '],
  debounceMs: 100
})

// User types: "Create a balance check handler"
// AI suggests: Handlers.add("balance", ...)

// When user accepts:
aiCompletion.triggerCompletion()
`)
}

// ============================================================================
// EXAMPLE 5: Enhancing Existing Code
// ============================================================================

async function example5_EnhanceExisting() {
  console.log('\n=== Example 5: Enhance Existing Code ===\n')
  
  const existingCode = `
Handlers.add("transfer", function(msg)
  assert(Balances[msg.From] >= msg.Tags.Quantity)
  Balances[msg.From] = Balances[msg.From] - msg.Tags.Quantity
  Balances[msg.Tags.Recipient] = Balances[msg.Tags.Recipient] + msg.Tags.Quantity
end)
`
  
  const { enhance } = await import('../src/ai/luaGenerator.js')
  
  const enhanced = await enhance(existingCode, 
    'Add proper validation, Credit-Notice, and error messages'
  )
  
  if (enhanced.success) {
    console.log('✨ Enhanced Code:')
    console.log(enhanced.code)
  }
}

// ============================================================================
// EXAMPLE 6: Batch Operations
// ============================================================================

async function example6_BatchOperations() {
  console.log('\n=== Example 6: Batch Operations ===\n')
  
  const { batchGenerate } = await import('../src/ai/luaGenerator.js')
  
  const requests = [
    { id: 'token', description: 'Create a basic token', options: { processType: 'token' } },
    { id: 'nft', description: 'Create a simple NFT', options: { processType: 'nft' } },
    { id: 'dao', description: 'Create a voting contract', options: { processType: 'dao' } }
  ]
  
  console.log('Generating 3 contracts in parallel...')
  const results = await batchGenerate(requests)
  
  results.forEach(result => {
    console.log(`${result.id}: ${result.success ? '✅' : '❌'} (${result.validation?.score || 'N/A'}/100)`)
  })
}

// ============================================================================
// EXAMPLE 7: Integration with Console Commands
// ============================================================================

async function example7_ConsoleCommands() {
  console.log('\n=== Example 7: Console Commands ===\n')
  
  console.log(`
// Add to CommandPalette.js:
{
  id: 'ai-generate',
  label: 'AI: Generate Code',
  action: async () => {
    const description = await prompt('What do you want to create?')
    const result = await generateLua(description)
    if (result.success) {
      insertIntoEditor(result.code)
    }
  }
},
{
  id: 'ai-debug',
  label: 'AI: Debug Current Error',
  action: async () => {
    const error = getLastError()
    const code = getEditorContent()
    const analysis = await analyzeError(error, code)
    showDebugPanel(analysis)
  }
},
{
  id: 'ai-audit',
  label: 'AI: Security Audit',
  action: async () => {
    const code = getEditorContent()
    const audit = await auditSecurity(code)
    showSecurityReport(audit)
  }
}
`)
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function runAllExamples() {
  console.log('🚀 AI Copilot Examples\n')
  
  // Check if brain is configured
  if (!brain.hasKey()) {
    console.log('⚠️  Warning: No API key configured')
    console.log('Run: /brain set-key <your-key> <provider>\n')
  }
  
  try {
    await example1_BasicGeneration()
    await example2_DebugAssistant()
    await example3_SecurityAudit()
    await example4_MonacoIntegration()
    await example5_EnhanceExisting()
    await example6_BatchOperations()
    await example7_ConsoleCommands()
    
    console.log('\n✨ All examples completed!')
  } catch (error) {
    console.error('\n❌ Example failed:', error)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples()
}

export {
  example1_BasicGeneration,
  example2_DebugAssistant,
  example3_SecurityAudit,
  example4_MonacoIntegration,
  example5_EnhanceExisting,
  example6_BatchOperations,
  example7_ConsoleCommands
}
