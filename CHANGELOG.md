# Changelog

All notable changes to the **AOPRISM** project will be documented in this file.

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
