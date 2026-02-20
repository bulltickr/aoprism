/**
 * luaGenerator.js
 * Natural Language to Lua Code Generator for AO Computer
 * Extends ConsoleBrain with AO-specific code generation capabilities
 */

import { brain } from '../modules/console/ConsoleBrain.js'

// AO-specific system prompt for Lua generation
const AO_LUA_SYSTEM_PROMPT = `You are an expert AO (Arweave/Computer) developer specializing in Lua smart contracts.

Your task is to convert natural language requests into production-ready Lua code for AO processes.

AO COMPUTER CONTEXT:
- AO is a decentralized computer on Arweave
- Processes are Lua-based smart contracts
- Messages are the primary communication mechanism
- Handlers process incoming messages
- State persists across messages

LUA BEST PRACTICES FOR AO:
1. Use Handlers.add() to register message handlers
2. Use ao.send() for cross-process communication
3. Use json.encode/decode for data serialization
4. Validate all inputs before processing
5. Implement proper access control with Owner checks
6. Use global variables for state (Balances, TotalSupply, etc.)
7. Always check for nil before table operations
8. Use assert() for validation with descriptive messages
9. Return meaningful responses from handlers
10. Send Credit-Notice after transfers

COMMON AO PATTERNS:
- Token: Balances table, Transfer/Mint/Burn handlers
- NFT: Owners table, Transfer/Approve handlers  
- DAO: Proposals table, Vote/Execute handlers
- Staking: Staked table, Stake/Unstake/Claim handlers
- Oracle: Data table, Update/Query handlers

OUTPUT FORMAT:
Provide ONLY the complete Lua code wrapped in triple backticks with 'lua' language identifier. Include:
1. Brief header comment explaining the contract
2. All necessary requires (json)
3. State initialization with defaults
4. All handlers with proper validation
5. Error handling with assert()

Example output structure:
\`\`\`lua
-- Contract Name: Brief description
local json = require("json")

-- State variables
Variable = Variable or defaultValue

-- Handler implementation
Handlers.add("action",
  function(msg) return msg.Tags.Action == "ActionName" end,
  function(msg)
    -- Validation
    assert(condition, "Error message")
    
    -- Logic
    -- ...
    
    -- Response
    ao.send({...})
  end
)
\`\`\``

// Process type context injection
const PROCESS_TYPE_CONTEXTS = {
  token: `
    Process Type: Token Contract
    Required State: Balances (table), TotalSupply (number), Owner (string)
    Required Handlers: Transfer, Balance, Mint (owner only), Burn
    Patterns: Check balance before transfer, update balances atomically, send Credit-Notice
  `,
  nft: `
    Process Type: NFT Contract
    Required State: Owners (table), TokenURIs (table), Approvals (table)
    Required Handlers: Transfer, Approve, OwnerOf, TokenURI
    Patterns: Check ownership, clear approvals on transfer
  `,
  dao: `
    Process Type: DAO/Governance
    Required State: Proposals (table), Votes (table), Members (table)
    Required Handlers: Propose, Vote, Execute, GetProposal
    Patterns: Voting periods, quorum checks, proposal states
  `,
  staking: `
    Process Type: Staking/Yield
    Required State: Staked (table), Rewards (table), RewardRate (number)
    Required Handlers: Stake, Unstake, Claim, UpdateRewards
    Patterns: Calculate rewards, time-weighted staking
  `,
  oracle: `
    Process Type: Oracle/Data Feed
    Required State: Data (table), AuthorizedProviders (table)
    Required Handlers: Update, Query, AddProvider, RemoveProvider
    Patterns: Multi-sig validation, data freshness checks
  `,
  generic: `
    Process Type: Generic AO Process
    Flexible structure based on requirements
  `
}

/**
 * Generates Lua code from natural language description
 * @param {string} description - Natural language description of desired contract
 * @param {Object} options - Generation options
 * @param {string} options.processType - Type of process (token, nft, dao, staking, oracle, generic)
 * @param {string} options.existingCode - Existing code to extend/modify
 * @param {Object} options.context - Additional context about the process
 * @returns {Promise<Object>} Generated code with metadata
 */
export async function generateLua(description, options = {}) {
  const {
    processType = 'generic',
    existingCode = null,
    context = {}
  } = options

  // Build context-aware prompt
  let contextPrompt = PROCESS_TYPE_CONTEXTS[processType] || PROCESS_TYPE_CONTEXTS.generic
  
  if (existingCode) {
    contextPrompt += `\n\nEXISTING CODE TO EXTEND/MODIFY:\n${existingCode.slice(0, 2000)}`
  }

  if (Object.keys(context).length > 0) {
    contextPrompt += `\n\nADDITIONAL CONTEXT:\n${JSON.stringify(context, null, 2)}`
  }

  const fullPrompt = `${contextPrompt}\n\nREQUEST:\n${description}\n\nGenerate complete, production-ready Lua code for AO Computer.`

  try {
    const response = await brain.ask(fullPrompt, AO_LUA_SYSTEM_PROMPT)
    
    // Parse response
    const result = parseGeneratedCode(response)
    
    // Validate generated code
    const validation = validateLuaCode(result.code)
    
    return {
      success: true,
      code: result.code,
      explanation: result.explanation,
      features: result.features,
      assumptions: result.assumptions,
      validation: validation,
      processType,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: null,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Parses AI response to extract code and metadata
 * @param {string} response - Raw AI response
 * @returns {Object} Parsed code and metadata
 */
function parseGeneratedCode(response) {
  // Extract code block
  const codeMatch = response.match(/```lua\n([\s\S]*?)```/)
  const code = codeMatch ? codeMatch[1].trim() : response.trim()

  // Extract explanation (text before code)
  const beforeCode = response.split('```lua')[0].trim()
  
  // Extract features (bullet points after code)
  const afterCode = response.split('```').slice(2).join('```').trim()
  const featureMatches = afterCode.match(/[-*]\s*(.+)/g)
  const features = featureMatches ? featureMatches.map(f => f.replace(/^[-*]\s*/, '')) : []

  // Find assumptions
  const assumptionMatch = afterCode.match(/(?:Assumptions?|Note)[:\s]+([\s\S]+?)(?:\n\n|$)/i)
  const assumptions = assumptionMatch ? assumptionMatch[1].trim() : ''

  return {
    code,
    explanation: beforeCode,
    features,
    assumptions
  }
}

/**
 * Validates generated Lua code for common issues
 * @param {string} code - Lua code to validate
 * @returns {Object} Validation results
 */
function validateLuaCode(code) {
  const issues = []
  const warnings = []
  
  // Check for required patterns
  const checks = [
    {
      pattern: /local\s+json\s*=\s*require\s*\(\s*["']json["']\s*\)/,
      message: 'Missing json require',
      severity: 'warning'
    },
    {
      pattern: /Handlers\.add/,
      message: 'No handlers defined',
      severity: 'error'
    },
    {
      pattern: /assert\s*\(/,
      message: 'No validation with assert()',
      severity: 'warning'
    },
    {
      pattern: /msg\.From/,
      message: 'No access to msg.From',
      severity: 'info'
    },
    {
      pattern: /ao\.send/,
      message: 'No ao.send for responses',
      severity: 'info'
    }
  ]

  for (const check of checks) {
    if (!check.pattern.test(code)) {
      const item = {
        message: check.message,
        severity: check.severity
      }
      if (check.severity === 'error') {
        issues.push(item)
      } else {
        warnings.push(item)
      }
    }
  }

  // Check for common mistakes
  if (/if\s+.*==\s*nil/.test(code) && !/if\s+.*~=\s*nil/.test(code)) {
    warnings.push({
      message: 'Consider using ~= nil for not-nil checks',
      severity: 'info'
    })
  }

  // Calculate score
  const score = Math.max(0, 100 - (issues.length * 20) - (warnings.length * 5))

  return {
    valid: issues.length === 0,
    score,
    issues,
    warnings,
    lineCount: code.split('\n').length,
    handlerCount: (code.match(/Handlers\.add/g) || []).length
  }
}

/**
 * Enhances existing Lua code based on instructions
 * @param {string} existingCode - Current Lua code
 * @param {string} instruction - Modification instruction
 * @returns {Promise<Object>} Enhanced code
 */
export async function enhanceLua(existingCode, instruction) {
  const prompt = `Enhance this AO Lua code based on the instruction.

CURRENT CODE:
${existingCode}

INSTRUCTION:
${instruction}

Provide the complete updated code with comments explaining changes.`

  try {
    const response = await brain.ask(prompt, AO_LUA_SYSTEM_PROMPT)
    const result = parseGeneratedCode(response)
    
    return {
      success: true,
      code: result.code,
      changes: result.explanation,
      originalCode: existingCode,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Generates specific handler code
 * @param {string} handlerType - Type of handler (transfer, mint, etc.)
 * @param {Object} config - Handler configuration
 * @returns {Promise<Object>} Generated handler code
 */
export async function generateHandler(handlerType, config = {}) {
  const handlerPrompt = `Generate a ${handlerType} handler for AO Lua.

Configuration:
${JSON.stringify(config, null, 2)}

Provide ONLY the handler code wrapped in triple backticks.`

  try {
    const response = await brain.ask(handlerPrompt, AO_LUA_SYSTEM_PROMPT)
    const result = parseGeneratedCode(response)
    
    return {
      success: true,
      handlerType,
      code: result.code,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      handlerType,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Batch generates multiple Lua contracts
 * @param {Array<Object>} requests - Array of generation requests
 * @returns {Promise<Array<Object>>} Array of generation results
 */
export async function batchGenerate(requests) {
  const results = []
  
  for (const request of requests) {
    const result = await generateLua(request.description, request.options)
    results.push({
      id: request.id,
      ...result
    })
  }
  
  return results
}

// Export main API
export const LuaGenerator = {
  generate: generateLua,
  enhance: enhanceLua,
  generateHandler,
  batchGenerate,
  PROCESS_TYPES: Object.keys(PROCESS_TYPE_CONTEXTS)
}

export default LuaGenerator
