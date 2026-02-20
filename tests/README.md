# QA Testing Infrastructure

## Agent 7: QA Testing Agent - Implementation Guide

### Overview
This document defines the testing infrastructure for AOPRISM project.

### Test Stack
- **Unit Tests:** Vitest + happy-dom
- **Integration Tests:** Vitest + happy-dom
- **E2E Tests:** Playwright
- **Performance Tests:** Built-in benchmarks

### Directory Structure
```
tests/
├── e2e/                          # Playwright E2E tests
│   ├── *.spec.js                 # E2E test files
│   └── fixtures/                 # Test fixtures
├── unit/                         # Unit test templates
│   ├── mcp-server/
│   ├── agent-composer/
│   ├── testing-framework/
│   ├── marketplace/
│   ├── bridge/
│   └── ai-copilot/
└── coverage/                     # Coverage reports
    └── .gitkeep

src/
├── **/*.test.js                  # Co-located unit tests
└── **/__tests__/**/*.test.js     # Alternative test location
```

### Test Commands
```bash
# Run all tests
npm test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:frontend -- --coverage

# Run tests in watch mode
npx vitest --watch
```

### Coverage Requirements
- **Lines:** 80% minimum (currently 60% threshold set)
- **Functions:** 80% minimum (currently 60% threshold set)
- **Branches:** 70% minimum (currently 50% threshold set)

### Performance Benchmarks
- **MCP Operations:** < 100ms
- **AI Response:** < 3s
- **Page Load:** < 2s

### QA Workflow
1. Receive chunk from Coordinator
2. Pull code and dependencies
3. Run test suite
4. Report results
5. Approve or reject

### Status Report Format
```
QA STATUS - Day [X]

Tested Today:
- [Agent Y Chunk Z]: PASS/FAIL - [details]

Pending Testing:
- [List of chunks waiting]

Coverage Report:
- Overall: [X]%
- By feature: [breakdown]
```
