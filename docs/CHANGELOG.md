# Changelog

All notable changes to the **AOPRISM** project will be documented in this file.

## [1.0.0-alpha.9] - 2026-02-20

### 🛡️ Security Hardening (Stream B + CTO Audit Pass)
- **AO Ownership Fix**: Patched `msg.From` race condition in `skills-registry/init.lua` and `prism_kernel.lua` — switched to `ao.env.Process.Owner` to prevent front-running ownership hijacks (reported via `ao-lens`).
- **Rust Memory Safety**: Added `zeroize` crate with `#[zeroize(drop)]` on the `Jwk` struct. Decoded private key bytes are explicitly zeroed after enclave load. Added IV length validation in `decrypt_data` to prevent panics.
- **GraphQL Injection**: Introduced `escapeGql()` sanitizer in `mcp-platform/src/ao-client.js` covering all tag names, values, owner addresses, and cursors.
- **MCP Rate Limiting**: Added per-tool 200ms throttle across all 37 MCP tools to prevent DoS and cost abuse.
- **Token Transfer Validation**: Added Zod `.length(43).regex()` enforcement for AO address fields + numeric-only validation for quantity.
- **Key Storage Hardening**: Plaintext JWK `localStorage` fallback in `state.js` now restricted to debug mode only.
- **Identity Vault**: Implemented secure Arweave JWK storage with password-based AES-GCM encryption.
- **XSS Protection**: Added robust HTML sanitization to Social Mesh feeds to prevent script injection.
- **Dependency Isolation**: Moved core cryptographic operations into a hardened Rust-WASM enclave.

### 🛠️ Fixed
- **Rust Build**: Corrected `Cargo.toml` `edition = "2024"` → `"2021"` (invalid edition, build failures on some toolchains).
- **ReferenceError**: Defined missing `httpSigKeyPromise` in `aoClient.js` (guaranteed crash for HTTP-sig users).
- **Bridge URL**: Fixed `apiUrl` typo `api.debridge.desk` → `api.debridge.finance`. Removed duplicate `case 'debridge'` in `adapters.js`.
- **SSE Cleanup**: Fixed `sseTransport.on('close')` ("not a function") — replaced with `req.on('close')`.
- **Code Quality**: Removed 29-line duplicate block in `marketplace/reviews.js`.
- **Agent Execution**: Fixed a critical `Promise.race` logic error in `AgentRunner` preventing orphaned tasks and hangs.
- **AI Parity**: Fully implemented the Anthropic Claude adapter for browser-side AI assistance.
- **MCP Stability**: Resolved `/health` and `/sessions` endpoint discrepancies in the neural bridge.

### 🧹 Workspace & DevX
- **OPEN_ISSUES.md**: Added 5 missing tracked issues from the CTO audit (SSE auth, WASM SRI, `npm audit`, ESLint, `.env.example`).
- **Repository Hygiene**: Purged legacy files (`walletApp.js`, `mcp-server`) and consolidated technical reports.
- **Public Metadata**: Released the `.agent` context file to the public repo for enhanced AI-assisted development.
- **Documentation**: Relocated Lua developer snippets to `examples/lua/` for improved discoverability.

## [1.0.0-alpha.8] - 2026-02-20
### 🚀 Added
- **AI Agent Composer (Enhanced)**: Implemented high-fidelity toolbar and professional drag-and-drop node creation.

### 🛠️ Fixed
- **App Shell Stability**: Implemented guards in `App.js` to prevent redundant DOM overwrites and state loss for self-managing modules.
- **Composition Engine**: Refactored `ComposerUI.jsx` with robust React root management to eliminate loading race conditions.
- **Bridge Precision**: Corrected property mapping in `BridgeUI.js` for accurate cross-chain quote displays.
- **Console Parity**: Updated `/help` to include the `/bridge` command.

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
