# Changelog

All notable changes to the **AOPRISM** project will be documented in this file.

## [1.0.0-alpha.7] - 2026-02-20
### 🚀 Added
- **AI Agent Composer**: Visual builder for AO agents.
- **AI Copilot**: intelligent dev assistant with Lua code generation.
- **AO Testing Framework**: Standardized test suite for contracts.
- **Process Marketplace**: Enhanced skill discovery and reviews.
- **Cross-Chain Bridge**: Multi-bridge aggregator (deBridge, LayerZero).
- **Rust Secure Enclave**: Hardware-backed signing and memory isolation.
- **MCP Tool Hub**: Exposed 3 new tools (`ao_test`, `ao_bridge`, `ao_agent_execute`) for full AI-native parity.
- **Documentation**: Condensed Roadmap to a 1-page vision doc and expanded Open Issues with 15+ architectural debt items.
- **Production Build**: Verified 8.7MB optimized production bundle.

### 🛠️ Fixed
- **WASM Loading**: Resolved `ECONNREFUSED` issues via lazy evaluation.
- **State Pollution**: Fixed singleton leaks in `TimeLockVault`.
- **Dependencies**: Restored missing `idb` runtime.

## [1.0.0-alpha.6] - 2026-02-19

### 🚀 Major Features
- **Security Vault (Phase 2)**:
    - Implemented **AES-GCM 256-bit encryption** for all API keys.
    - Added **HKDF key derivation** using Arweave Wallet signatures.
    - Enforced **randomized salting** (16-byte) for every vault instance to prevent rainbow table attacks.
    - Removed all insecure Base64 storage mechanisms.

### 🧪 Testing & Quality
- **Test Suite**:
    - Added `vitest` unit testing methodology for `src/core`.
    - Added `playwright` E2E smoke tests for critical user flows.
    - Achieved **100% pass rate** on backend (`mcp-platform`) and frontend core tests.
- **CI/CD**:
    - Added `npm run test:frontend` and `npm run test:e2e` scripts.

### 🐛 Bug Fixes & Polish
- **Project Hygiene**:
    - Purged 5+ redundant log files (`server_log.txt`, etc.).
    - Terminated phantom background processes locking file resources.
    - Added explicit `.gitignore` rules for test artifacts.
- **Documentation**:
    - Updated `README.md` with verified security specs.
    - Updated `OPEN_ISSUES.md` to reflect partial fixes in Gateway state management.

### 🔮 Ongoing / Known Issues
- **Gateway Caching**: Old gateway URLs may persist in `localStorage` for returning users (mitigated but not fully solved).
- **Mobile UI**: Console view requires optimization for small screens.
