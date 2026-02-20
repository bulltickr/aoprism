/**
 * securityAuditor.js
 * AI-powered security auditing for AO Lua contracts
 * Detects vulnerabilities, rates severity, suggests fixes
 */

import { brain } from '../modules/console/ConsoleBrain.js'

// Pattern-based security rules - simplified to avoid regex backtracking
const SECURITY_PATTERNS = [
  {
    id: 'reentrancy-risk',
    name: 'Reentrancy Risk',
    pattern: /ao\.send\s*\(/,
    severity: 'critical',
    category: 'reentrancy',
    description: 'External call (ao.send) before state update can enable reentrancy attacks',
    fix: 'Update all state variables before calling ao.send()',
    example: `// Safe:
Balances[msg.From] = Balances[msg.From] - amount
Balances[recipient] = (Balances[recipient] or 0) + amount
ao.send({Target = recipient, ...})`
  },
  {
    id: 'weak-auth-owner-literal',
    name: 'Weak Authorization (Literal)',
    pattern: /msg\.From.*==.*owner/,
    severity: 'high',
    category: 'authorization',
    description: 'Using literal "owner" string instead of Owner variable',
    fix: 'Use Owner variable: if msg.From == Owner then',
    example: `// Wrong:
if msg.From == "owner" then

// Correct:
if msg.From == Owner then`
  },
  {
    id: 'missing-owner-check',
    name: 'Missing Owner Check',
    pattern: /Handlers\.add.*mint/,
    negativePattern: /msg\.From.*==/,
    severity: 'critical',
    category: 'authorization',
    description: 'Mint function lacks owner authorization check',
    fix: 'Add owner check: assert(msg.From == Owner, "Unauthorized")',
    example: `Handlers.add("mint", ...,
  function(msg)
    assert(msg.From == Owner, "Only owner can mint")
  end
)`
  },
  {
    id: 'no-input-validation',
    name: 'Missing Input Validation',
    pattern: /tonumber.*msg\.Tags/,
    severity: 'high',
    category: 'validation',
    description: 'Converting message tag to number without validation',
    fix: 'Validate input exists and is positive before conversion',
    example: `assert(msg.Tags.Quantity, "Quantity required")
local amount = tonumber(msg.Tags.Quantity)
assert(amount and amount > 0, "Invalid quantity")`
  },
  {
    id: 'nil-table-access',
    name: 'Potential Nil Table Access',
    pattern: /Balances\[/,
    negativePattern: /Balances.*or.*\{/,
    severity: 'medium',
    category: 'data-integrity',
    description: 'Table may not be initialized before access',
    fix: 'Initialize tables at top of file: Balances = Balances or {}',
    example: `-- Add at file top:
Balances = Balances or {}`
  },
  {
    id: 'overflow-risk',
    name: 'Integer Overflow Risk',
    pattern: /Balances\[.*\].*\+.*amount/,
    severity: 'medium',
    category: 'math',
    description: 'Addition without overflow check (though Lua uses doubles)',
    fix: 'Consider using checked arithmetic or limiting max values',
    example: `local newBalance = Balances[recipient] + amount
assert(newBalance >= Balances[recipient], "Overflow detected")`
  },
  {
    id: 'unprotected-self-destruct',
    name: 'Unprotected Critical Function',
    pattern: /Handlers\.add.*(?:destroy|kill|upgrade)/,
    negativePattern: /assert/,
    severity: 'critical',
    category: 'access-control',
    description: 'Critical function without access control',
    fix: 'Add owner-only access control with assert()',
    example: `Handlers.add("upgrade", ...,
  function(msg)
    assert(msg.From == Owner, "Unauthorized")
  end
)`
  },
  {
    id: 'hardcoded-values',
    name: 'Hardcoded Values',
    pattern: /[=\s]\d{5,}/,
    severity: 'low',
    category: 'maintainability',
    description: 'Large hardcoded numbers should be constants',
    fix: 'Define constants at top: local MAX_SUPPLY = 1000000',
    example: `local MAX_SUPPLY = 1000000`
  },
  {
    id: 'missing-event-logs',
    name: 'Missing Event Notifications',
    pattern: /Balances\[.*\].*=/,
    negativePattern: /Credit-Notice/,
    severity: 'medium',
    category: 'best-practice',
    description: 'State changes without notifying affected parties',
    fix: 'Send Credit-Notice to recipients of transfers',
    example: `ao.send({
  Target = recipient,
  Tags = { Action = "Credit-Notice" }
})`
  },
  {
    id: 'insufficient-gas-check',
    name: 'No Gas/Resource Check',
    pattern: /while.*do/,
    severity: 'medium',
    category: 'dos',
    description: 'Loops without bounds can cause gas exhaustion',
    fix: 'Limit iterations or use pagination',
    example: `for i = 1, math.min(#largeTable, 100) do ... end`
  }
]

// Severity weights for scoring
const SEVERITY_WEIGHTS = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1
}

/**
 * Performs comprehensive security audit
 * @param {string} luaCode - Code to audit
 * @returns {Promise<Object>} Audit results
 */
export async function auditSecurity(luaCode) {
  // Pattern-based analysis
  const patternIssues = runPatternAnalysis(luaCode)
  
  // AI-based analysis
  let aiIssues = []
  try {
    const aiResult = await runAIAnalysis(luaCode)
    aiIssues = aiResult.issues || []
  } catch (error) {
    console.warn('[SecurityAuditor] AI analysis failed:', error.message)
  }
  
  // Combine and deduplicate
  const allIssues = combineIssues(patternIssues, aiIssues)
  
  // Calculate security score
  const score = calculateSecurityScore(allIssues)
  
  // Generate summary
  const summary = generateAuditSummary(allIssues, score)
  
  return {
    success: true,
    score,
    safe: score >= 80,
    issues: allIssues,
    summary,
    metadata: {
      totalLines: luaCode.split('\n').length,
      patternIssues: patternIssues.length,
      aiIssues: aiIssues.length,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Runs pattern-based security analysis
 * @param {string} code - Lua code
 * @returns {Array} Found issues
 */
function runPatternAnalysis(code) {
  const issues = []
  const lines = code.split('\n')
  
  for (const rule of SECURITY_PATTERNS) {
    const matches = findPatternMatches(code, lines, rule)
    
    for (const match of matches) {
      // Check negative pattern (things that should NOT be present)
      if (rule.negativePattern) {
        const surroundingContext = lines.slice(
          Math.max(0, match.line - 5),
          Math.min(lines.length, match.line + 5)
        ).join('\n')
        
        if (rule.negativePattern.test(surroundingContext)) {
          continue // Skip if negative pattern found
        }
      }
      
      issues.push({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        category: rule.category,
        description: rule.description,
        fix: rule.fix,
        example: rule.example,
        line: match.line,
        column: match.column,
        code: match.code,
        source: 'pattern'
      })
    }
  }
  
  return issues
}

/**
 * Finds all matches for a pattern
 * @param {string} code - Full code
 * @param {Array} lines - Code lines
 * @param {Object} rule - Pattern rule
 * @returns {Array} Match locations
 */
function findPatternMatches(code, lines, rule) {
  const matches = []
  
  // Create a new regex with global flag for iteration
  const globalPattern = new RegExp(rule.pattern.source, 'gi')
  let match
  
  // Limit iterations to prevent infinite loops
  let iterations = 0
  const MAX_ITERATIONS = 100
  
  while ((match = globalPattern.exec(code)) !== null && iterations < MAX_ITERATIONS) {
    iterations++
    
    const lineNumber = code.substring(0, match.index).split('\n').length
    const line = lines[lineNumber - 1]
    
    matches.push({
      line: lineNumber,
      column: match.index - (code.lastIndexOf('\n', match.index - 1) + 1),
      code: line?.trim() || match[0]
    })
    
    // Prevent zero-length matches from causing infinite loop
    if (match[0].length === 0) {
      globalPattern.lastIndex++
    }
  }
  
  return matches
}

/**
 * Runs AI-based security analysis
 * @param {string} code - Lua code
 * @returns {Promise<Object>} AI analysis results
 */
async function runAIAnalysis(code) {
  const prompt = `Perform a security audit on this AO Lua smart contract:

\`\`\`lua
${code.slice(0, 4000)}
\`\`\`

Analyze for:
1. Authorization flaws (missing owner checks, weak auth)
2. Input validation issues (unvalidated parameters)
3. Reentrancy vulnerabilities
4. Logic errors and race conditions
5. Economic vulnerabilities (overflows, rounding errors)
6. Access control problems
7. Missing safety checks

For each issue found, provide:
- Severity: critical/high/medium/low
- Line number (if identifiable)
- Category: authorization/validation/reentrancy/logic/economic/access/safety
- Description of the vulnerability
- Specific fix with code example

Format as JSON array of issues.`

  const SYSTEM_PROMPT = `You are a security auditor specializing in AO (Arweave/Computer) smart contracts. Be thorough and specific.`

  const response = await brain.ask(prompt, SYSTEM_PROMPT)
  
  // Try to parse JSON from response
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const issues = JSON.parse(jsonMatch[0])
      return {
        issues: issues.map(issue => ({
          ...issue,
          source: 'ai'
        }))
      }
    }
  } catch (e) {
    // Fallback: parse text format
    return parseTextIssues(response)
  }
  
  return { issues: [] }
}

/**
 * Parses text-formatted issues
 * @param {string} text - AI response text
 * @returns {Object} Parsed issues
 */
function parseTextIssues(text) {
  const issues = []
  const lines = text.split('\n')
  let currentIssue = null
  
  for (const line of lines) {
    if (line.match(/^\d+\.|Issue:|Vulnerability:/i)) {
      if (currentIssue) issues.push(currentIssue)
      currentIssue = {
        id: `ai-${issues.length + 1}`,
        source: 'ai',
        description: line.replace(/^\d+\.|Issue:|Vulnerability:/i, '').trim()
      }
    } else if (currentIssue) {
      if (line.toLowerCase().includes('severity:')) {
        currentIssue.severity = line.match(/critical|high|medium|low/i)?.[0] || 'medium'
      } else if (line.toLowerCase().includes('line:')) {
        currentIssue.line = parseInt(line.match(/\d+/)?.[0]) || 0
      } else if (line.toLowerCase().includes('category:')) {
        currentIssue.category = line.split(':')[1]?.trim() || 'general'
      } else if (line.toLowerCase().includes('fix:')) {
        currentIssue.fix = line.split(':').slice(1).join(':').trim()
      }
    }
  }
  
  if (currentIssue) issues.push(currentIssue)
  
  return { issues }
}

/**
 * Combines and deduplicates issues from multiple sources
 * @param {Array} patternIssues - Pattern-based issues
 * @param {Array} aiIssues - AI-detected issues
 * @returns {Array} Combined unique issues
 */
function combineIssues(patternIssues, aiIssues) {
  const combined = [...patternIssues]
  
  for (const aiIssue of aiIssues) {
    // Check for duplicates (same line/category)
    const isDuplicate = patternIssues.some(p => 
      p.category === aiIssue.category &&
      Math.abs(p.line - aiIssue.line) <= 2
    )
    
    if (!isDuplicate) {
      combined.push(aiIssue)
    }
  }
  
  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  return combined.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

/**
 * Calculates security score
 * @param {Array} issues - Found issues
 * @returns {number} Score 0-100
 */
function calculateSecurityScore(issues) {
  let penalty = 0
  
  for (const issue of issues) {
    penalty += SEVERITY_WEIGHTS[issue.severity] || 5
  }
  
  // Bonus for no critical issues
  const hasCritical = issues.some(i => i.severity === 'critical')
  const bonus = hasCritical ? 0 : 10
  
  return Math.max(0, Math.min(100, 100 - penalty + bonus))
}

/**
 * Generates audit summary
 * @param {Array} issues - All issues
 * @param {number} score - Security score
 * @returns {Object} Summary
 */
function generateAuditSummary(issues, score) {
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
    info: issues.filter(i => i.severity === 'info').length
  }
  
  const byCategory = issues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1
    return acc
  }, {})
  
  let status = 'excellent'
  if (score < 60) status = 'critical'
  else if (score < 80) status = 'warning'
  else if (score < 90) status = 'good'
  
  return {
    status,
    bySeverity,
    byCategory,
    totalIssues: issues.length,
    recommendation: getRecommendation(score, bySeverity)
  }
}

/**
 * Gets recommendation based on score
 * @param {number} score - Security score
 * @param {Object} bySeverity - Issues by severity
 * @returns {string} Recommendation
 */
function getRecommendation(score, bySeverity) {
  if (score >= 90) {
    return 'Contract appears secure. Continue with standard testing.'
  } else if (score >= 80) {
    return 'Minor issues found. Address low-priority items before deployment.'
  } else if (score >= 60) {
    return 'Several issues detected. Fix all medium+ severity issues before deployment.'
  } else {
    return 'Critical security issues found! Do not deploy until all critical and high issues are resolved.'
  }
}

/**
 * Quick vulnerability scan (pattern only)
 * @param {string} luaCode - Code to scan
 * @returns {Object} Quick scan results
 */
export function scanVulnerabilities(luaCode) {
  const issues = runPatternAnalysis(luaCode)
  
  return {
    safe: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    criticalCount: issues.filter(i => i.severity === 'critical').length,
    highCount: issues.filter(i => i.severity === 'high').length,
    issues: issues.slice(0, 10), // Limit to first 10
    timestamp: new Date().toISOString()
  }
}

// Export API
export const SecurityAuditor = {
  audit: auditSecurity,
  scan: scanVulnerabilities,
  PATTERNS: SECURITY_PATTERNS,
  SEVERITY_WEIGHTS
}

export default SecurityAuditor
