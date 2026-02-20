/**
 * debugAssistant.js
 * AI-powered debugging assistant for AO Lua development
 * Analyzes errors, suggests fixes, and explains code
 */

import { brain } from '../modules/console/ConsoleBrain.js'

// AO-specific error patterns and solutions
const AO_ERROR_PATTERNS = {
  // Runtime errors
  'attempt to index': {
    category: 'nil-reference',
    description: 'Trying to access a field on a nil value',
    commonCauses: [
      'Table variable not initialized',
      'Message tag missing or misspelled',
      'State variable not set with default'
    ],
    solutions: [
      'Initialize tables with: Variable = Variable or {}',
      'Check if tag exists: if msg.Tags.Action then ... end',
      'Use safe access: (table or {}).field'
    ]
  },
  'attempt to perform arithmetic': {
    category: 'type-mismatch',
    description: 'Math operation on non-numeric value',
    commonCauses: [
      'Message tag value is still a string',
      'tonumber() returned nil',
      'Nil value in calculation'
    ],
    solutions: [
      'Convert with tonumber(): local amount = tonumber(msg.Tags.Amount)',
      'Validate before math: assert(amount, "Amount required")',
      'Use fallback: tonumber(value) or 0'
    ]
  },
  'assertion failed': {
    category: 'validation',
    description: 'Assertion condition was false',
    commonCauses: [
      'Input validation failed',
      'Insufficient balance or permission',
      'Invalid state transition'
    ],
    solutions: [
      'Check assertion message for details',
      'Validate inputs before processing',
      'Add descriptive assert messages'
    ]
  },
  // AO-specific errors
  'Message not found': {
    category: 'ao-runtime',
    description: 'AO message processing error',
    commonCauses: [
      'Handler pattern did not match',
      'Message format incorrect',
      'Missing required tags'
    ],
    solutions: [
      'Check handler pattern matches message',
      'Verify all required tags are present',
      'Review message structure in logs'
    ]
  },
  'Process not found': {
    category: 'ao-runtime',
    description: 'Target process does not exist',
    commonCauses: [
      'Invalid process ID',
      'Process not spawned yet',
      'Typo in process address'
    ],
    solutions: [
      'Verify process ID is correct',
      'Check process is running',
      'Use process ID from spawn result'
    ]
  },
  'Insufficient balance': {
    category: 'business-logic',
    description: 'Not enough tokens for operation',
    commonCauses: [
      'User balance too low',
      'Fee calculation error',
      'Race condition in concurrent requests'
    ],
    solutions: [
      'Check balance before operation',
      'Show user their current balance',
      'Implement proper locking for concurrent ops'
    ]
  },
  // Syntax errors
  "unexpected symbol near '%?'": {
    category: 'syntax',
    description: 'Lua syntax error',
    commonCauses: [
      'Missing closing bracket/parenthesis',
      'Invalid operator',
      'Unicode character issue'
    ],
    solutions: [
      'Check matching brackets and parentheses',
      'Use standard ASCII operators',
      'Validate Lua syntax with linter'
    ]
  },
  "'}' expected": {
    category: 'syntax',
    description: 'Missing closing brace',
    commonCauses: [
      'Unclosed table definition',
      'Missing end for function/block',
      'Nested table syntax error'
    ],
    solutions: [
      'Check all opening { have closing }',
      'Verify function...end blocks',
      'Format code to visualize structure'
    ]
  }
}

// System prompt for error analysis
const ERROR_ANALYSIS_PROMPT = `You are an expert AO (Arweave/Computer) debugger specializing in Lua smart contracts.

Analyze the error and provide:
1. Root cause (2-3 clear sentences)
2. Specific solution with code fix
3. Prevention tips for future
4. Similar common errors to watch for

Be specific and actionable. Focus on AO-specific context.`

/**
 * Analyzes an error and provides solution suggestions
 * @param {Error|string} error - Error object or message
 * @param {string} processCode - Current process Lua code
 * @param {Array} messageHistory - Recent message history
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeError(error, processCode, messageHistory = []) {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'string' ? '' : (error.stack || '')

  // First, check for known patterns
  const patternMatch = findMatchingPattern(errorMessage)

  const contextPrompt = buildErrorContext(errorMessage, errorStack, processCode, messageHistory)

  try {
    const response = await brain.ask(contextPrompt, ERROR_ANALYSIS_PROMPT)
    
    const analysis = parseAnalysisResponse(response)
    
    return {
      success: true,
      error: {
        message: errorMessage,
        stack: errorStack,
        category: patternMatch?.category || 'unknown'
      },
      rootCause: analysis.rootCause,
      solution: analysis.solution,
      fix: analysis.fix,
      prevention: analysis.prevention,
      similarErrors: analysis.similarErrors,
      patternMatch: patternMatch ? {
        pattern: patternMatch.pattern,
        category: patternMatch.category,
        description: patternMatch.description
      } : null,
      timestamp: new Date().toISOString()
    }
  } catch (apiError) {
    // Fallback to pattern-based analysis if AI fails
    if (patternMatch) {
      return {
        success: true,
        error: {
          message: errorMessage,
          category: patternMatch.category
        },
        rootCause: patternMatch.description,
        solution: patternMatch.solutions.join('\n'),
        fix: null,
        prevention: patternMatch.commonCauses.join('\n'),
        similarErrors: [],
        patternMatch: {
          pattern: patternMatch.pattern,
          category: patternMatch.category,
          description: patternMatch.description
        },
        timestamp: new Date().toISOString(),
        fallback: true
      }
    }

    return {
      success: false,
      error: errorMessage,
      apiError: apiError.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Finds matching error pattern
 * @param {string} errorMessage - Error message to match
 * @returns {Object|null} Matched pattern or null
 */
function findMatchingPattern(errorMessage) {
  for (const [pattern, details] of Object.entries(AO_ERROR_PATTERNS)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return { pattern, ...details }
    }
  }
  return null
}

/**
 * Builds error context for AI analysis
 * @param {string} errorMessage - Error message
 * @param {string} errorStack - Stack trace
 * @param {string} processCode - Process code
 * @param {Array} messageHistory - Message history
 * @returns {string} Formatted context
 */
function buildErrorContext(errorMessage, errorStack, processCode, messageHistory) {
  return `ERROR:
${errorMessage}

STACK TRACE:
${errorStack || 'No stack trace available'}

PROCESS CODE (relevant portion):
${processCode ? processCode.slice(0, 3000) : 'No code provided'}

RECENT MESSAGES:
${messageHistory.length > 0 
  ? JSON.stringify(messageHistory.slice(-5), null, 2).slice(0, 1000)
  : 'No message history'
}

Provide detailed analysis and solution.`
}

/**
 * Parses AI analysis response
 * @param {string} response - AI response
 * @returns {Object} Parsed analysis
 */
function parseAnalysisResponse(response) {
  const lines = response.split('\n')
  
  // Extract sections
  let currentSection = null
  const sections = {
    rootCause: [],
    solution: [],
    fix: [],
    prevention: [],
    similarErrors: []
  }

  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    
    if (lowerLine.includes('root cause')) {
      currentSection = 'rootCause'
      continue
    } else if (lowerLine.includes('solution')) {
      currentSection = 'solution'
      continue
    } else if (lowerLine.includes('fix') || lowerLine.includes('code:')) {
      currentSection = 'fix'
      continue
    } else if (lowerLine.includes('prevention')) {
      currentSection = 'prevention'
      continue
    } else if (lowerLine.includes('similar')) {
      currentSection = 'similarErrors'
      continue
    }

    if (currentSection && line.trim()) {
      sections[currentSection].push(line.trim())
    }
  }

  // Extract code fix if present
  const codeMatch = response.match(/```lua\n([\s\S]*?)```/)
  if (codeMatch) {
    sections.fix = [codeMatch[1].trim()]
  }

  return {
    rootCause: sections.rootCause.join('\n') || 'Unknown root cause',
    solution: sections.solution.join('\n') || 'No specific solution provided',
    fix: sections.fix.join('\n') || null,
    prevention: sections.prevention.join('\n') || 'No prevention tips provided',
    similarErrors: sections.similarErrors
      .join('\n')
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e)
  }
}

/**
 * Suggests code optimizations
 * @param {string} processCode - Code to analyze
 * @returns {Promise<Object>} Optimization suggestions
 */
export async function suggestOptimization(processCode) {
  const prompt = `Review this AO Lua process for optimizations and improvements:

CODE:
${processCode}

Look for:
1. Performance issues (inefficient loops, redundant operations)
2. Security vulnerabilities (missing validation, access control)
3. Code quality (readability, maintainability)
4. Gas efficiency (state changes, message sends)
5. AO best practices compliance

Provide specific recommendations with code examples.`

  const OPTIMIZATION_PROMPT = `You are an expert AO code reviewer. Provide actionable optimization suggestions.`

  try {
    const response = await brain.ask(prompt, OPTIMIZATION_PROMPT)
    
    const suggestions = parseOptimizationResponse(response)
    
    return {
      success: true,
      suggestions,
      summary: {
        total: suggestions.length,
        critical: suggestions.filter(s => s.severity === 'critical').length,
        high: suggestions.filter(s => s.severity === 'high').length,
        medium: suggestions.filter(s => s.severity === 'medium').length,
        low: suggestions.filter(s => s.severity === 'low').length
      },
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
 * Parses optimization response
 * @param {string} response - AI response
 * @returns {Array} Optimization suggestions
 */
function parseOptimizationResponse(response) {
  const suggestions = []
  
  // Look for numbered or bulleted suggestions
  const suggestionMatches = response.match(/(?:\d+\.|[\-\*])\s*([\s\S]*?)(?=\n(?:\d+\.|[\-\*])|$)/g)
  
  if (suggestionMatches) {
    for (const match of suggestionMatches) {
      const severity = match.includes('critical') || match.includes('security')
        ? 'critical'
        : match.includes('high') || match.includes('important')
        ? 'high'
        : match.includes('medium')
        ? 'medium'
        : 'low'

      const type = match.includes('performance') || match.includes('gas')
        ? 'performance'
        : match.includes('security') || match.includes('vulnerability')
        ? 'security'
        : match.includes('quality') || match.includes('readability')
        ? 'quality'
        : 'best-practice'

      const codeMatch = match.match(/```lua\n([\s\S]*?)```/)

      suggestions.push({
        description: match.replace(/```lua[\s\S]*?```/g, '').trim(),
        severity,
        type,
        code: codeMatch ? codeMatch[1].trim() : null
      })
    }
  }

  return suggestions
}

/**
 * Explains code functionality
 * @param {string} code - Code to explain
 * @param {string} detailLevel - 'brief', 'normal', or 'detailed'
 * @returns {Promise<Object>} Code explanation
 */
export async function explainCode(code, detailLevel = 'normal') {
  const detailPrompt = {
    brief: 'Provide a brief 1-2 sentence summary',
    normal: 'Explain the main functionality and key handlers',
    detailed: 'Provide detailed line-by-line explanation'
  }[detailLevel] || detailPrompt.normal

  const prompt = `Explain this AO Lua code:

${code}

${detailPrompt}

Include:
1. What the contract does
2. Main handlers and their purposes
3. State management approach
4. Security mechanisms`  

  const EXPLAIN_PROMPT = `You are an expert AO developer explaining code to others.`

  try {
    const response = await brain.ask(prompt, EXPLAIN_PROMPT)
    
    return {
      success: true,
      explanation: response.trim(),
      detailLevel,
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
 * Batch analyzes multiple errors
 * @param {Array<Object>} errors - Array of error objects
 * @returns {Promise<Array<Object>>} Array of analysis results
 */
export async function batchAnalyze(errors) {
  const results = []
  
  for (const error of errors) {
    const result = await analyzeError(
      error.error,
      error.code,
      error.history
    )
    results.push({
      id: error.id,
      ...result
    })
  }
  
  return results
}

// Export API
export const DebugAssistant = {
  analyze: analyzeError,
  optimize: suggestOptimization,
  explain: explainCode,
  batchAnalyze,
  ERROR_PATTERNS: AO_ERROR_PATTERNS
}

export default DebugAssistant
