# AI Copilot Module

AI-powered development assistant for AO (Arweave/Computer) with natural language to Lua conversion, debugging, and security auditing.

## Features

### 1. Natural Language to Lua (Chunk 6.1)
Convert plain English descriptions into production-ready AO Lua code.

```javascript
import { generateLua } from './src/ai/luaGenerator.js'

// Generate a token contract
const result = await generateLua(
  'Create a token called "MyToken" with 1M supply minted to owner',
  { processType: 'token' }
)

if (result.success) {
  console.log(result.code)        // Generated Lua code
  console.log(result.validation)  // Code validation results
  console.log(result.explanation) // What the code does
}
```

**Supported Process Types:**
- `token` - ERC-20 style tokens
- `nft` - NFT contracts
- `dao` - Governance contracts
- `staking` - Staking/yield contracts
- `oracle` - Data feed contracts
- `generic` - Custom contracts

### 2. Debug Assistant (Chunk 6.2)
Analyze errors and get AI-powered solutions.

```javascript
import { analyzeError, suggestOptimization } from './src/ai/debugAssistant.js'

try {
  // Run your AO process
} catch (error) {
  const analysis = await analyzeError(error, processCode, messageHistory)
  
  console.log(analysis.rootCause)   // Why it failed
  console.log(analysis.solution)    // How to fix it
  console.log(analysis.fix)         // Specific code fix
  console.log(analysis.prevention)  // How to avoid in future
}

// Get optimization suggestions
const optimizations = await suggestOptimization(processCode)
console.log(optimizations.suggestions) // Performance & security tips
```

### 3. Monaco Editor Integration (Chunk 6.3)
Inline AI completions and code generation in the editor.

```javascript
import { setupAICompletion } from './src/ai/monacoIntegration.js'

// Setup AI completion in Monaco editor
const aiCompletion = setupAICompletion(editor, {
  triggerCharacters: ['.', ':', ' '],
  debounceMs: 100
})

// Trigger manual completion
aiCompletion.triggerCompletion()

// Generate from comment
await aiCompletion.generateFromComment('Create transfer handler')

// Cleanup
aiCompletion.dispose()
```

**Keyboard Shortcuts:**
- `Tab` - Accept inline completion
- `Ctrl+Space` - Trigger AI completion
- `Ctrl+Shift+Space` - Generate from comment
- `Escape` - Hide completion

### 4. Security Auditor (Chunk 6.6)
Automated vulnerability detection and security scoring.

```javascript
import { auditSecurity, scanVulnerabilities } from './src/ai/securityAuditor.js'

// Full security audit
const audit = await auditSecurity(luaCode)
console.log(audit.score)      // 0-100 security score
console.log(audit.safe)       // Boolean: safe to deploy?
console.log(audit.issues)     // List of vulnerabilities
console.log(audit.summary)    // Summary by severity/category

// Quick scan (pattern only)
const quickScan = scanVulnerabilities(luaCode)
console.log(quickScan.safe)   // Safe to proceed?
```

**Detected Vulnerabilities:**
- Reentrancy risks
- Authorization flaws
- Missing input validation
- Nil table access
- Integer overflow
- Unprotected critical functions
- And more...

## Quick Start

### Basic Usage

```javascript
import { aiCopilot } from './src/ai/index.js'

// Initialize (checks for API key)
await aiCopilot.initialize()

// Generate code
const generated = await aiCopilot.generate('Create a staking contract')

// Debug error
const debugged = await aiCopilot.debug(error, code, history)

// Audit security
const audited = await aiCopilot.audit(code)
```

### Integration with ConsoleBrain

The AI Copilot extends the existing `ConsoleBrain.js` infrastructure:

```javascript
import { brain } from './src/modules/console/ConsoleBrain.js'

// Configure AI provider
await brain.lock(apiKey, signature, 'openai')

// Now AI Copilot will use this configuration
const result = await generateLua('Create token')
```

## API Reference

### LuaGenerator

```typescript
interface LuaGenerator {
  generate(description: string, options?: {
    processType?: 'token' | 'nft' | 'dao' | 'staking' | 'oracle' | 'generic'
    existingCode?: string
    context?: object
  }): Promise<{
    success: boolean
    code: string
    explanation: string
    features: string[]
    validation: {
      valid: boolean
      score: number
      issues: object[]
    }
  }>
  
  enhance(existingCode: string, instruction: string): Promise<object>
  generateHandler(type: string, config: object): Promise<object>
  batchGenerate(requests: object[]): Promise<object[]>
}
```

### DebugAssistant

```typescript
interface DebugAssistant {
  analyze(error: Error, code: string, history: object[]): Promise<{
    rootCause: string
    solution: string
    fix: string | null
    prevention: string
    similarErrors: string[]
  }>
  
  optimize(code: string): Promise<{
    suggestions: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low'
      type: 'performance' | 'security' | 'quality'
      description: string
      code: string | null
    }>
  }>
  
  explain(code: string, detailLevel?: 'brief' | 'normal' | 'detailed'): Promise<object>
}
```

### MonacoIntegration

```typescript
interface MonacoIntegration {
  setup(editor: MonacoEditor, options?: {
    triggerCharacters?: string[]
    debounceMs?: number
    maxContextLines?: number
  }): {
    triggerCompletion(): void
    generateFromComment(comment: string): Promise<object>
    dispose(): void
  }
}
```

### SecurityAuditor

```typescript
interface SecurityAuditor {
  audit(code: string): Promise<{
    score: number  // 0-100
    safe: boolean  // score >= 80
    issues: Array<{
      id: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      category: string
      description: string
      fix: string
      line: number
    }>
    summary: {
      status: 'critical' | 'warning' | 'good' | 'excellent'
      bySeverity: object
      byCategory: object
      recommendation: string
    }
  }>
  
  scan(code: string): {
    safe: boolean
    criticalCount: number
    highCount: number
    issues: object[]
  }
}
```

## Testing

Run all tests:

```bash
# All AI module tests
npm test src/ai/__tests__/

# Individual test files
npm test src/ai/__tests__/luaGenerator.test.js
npm test src/ai/__tests__/debugAssistant.test.js
npm test src/ai/__tests__/monacoIntegration.test.js
npm test src/ai/__tests__/securityAuditor.test.js
```

## Architecture

```
src/ai/
├── index.js                    # Main exports & AICopilot class
├── luaGenerator.js             # NL → Lua conversion
├── debugAssistant.js           # Error analysis & debugging
├── monacoIntegration.js        # Editor integration
├── securityAuditor.js          # Security scanning
└── __tests__/
    ├── luaGenerator.test.js
    ├── debugAssistant.test.js
    ├── monacoIntegration.test.js
    └── securityAuditor.test.js
```

## Performance Targets

- **Code Generation:** < 3 seconds
- **Debug Analysis:** < 2 seconds  
- **Inline Completion:** < 100ms (debounced)
- **Security Audit:** < 5 seconds

## Success Criteria

- [x] Can generate Lua from natural language (Chunk 6.1)
- [x] Debug assistant identifies errors (Chunk 6.2)
- [x] Inline completion works in Monaco (Chunk 6.3)
- [x] Security auditor detects vulnerabilities (Chunk 6.6)
- [ ] Local SLM integration (Chunk 6.5) - WAIT FOR RUST
- [x] Response time < 3 seconds average
- [ ] 70%+ code generation accuracy (requires testing)

## Dependencies

- **ConsoleBrain.js** - AI provider integration (existing)
- **Monaco Editor** - For inline completions (existing)
- **AO SDK** - For process context (existing)

## Future Enhancements (Chunk 6.5)

Once Rust SLM is ready:
- Local inference for privacy
- Offline capability
- Faster response times
- Custom AO model fine-tuning

## Contributing

When adding features:
1. Follow existing code patterns
2. Add comprehensive tests
3. Update this README
4. Run the linter

## License

Same as AOPRISM project
