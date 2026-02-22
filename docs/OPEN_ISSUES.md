# � Open Issues & Technical Debt

This document tracks known issues, connectivity blockers, and technical debt in the **AOPRISM** Alpha. We believe in building in the open and being transparent about what isn't working yet.

## 🔴 High Priority: Architecture & Security

### 0f. Vault Unlock Bypasses Cryptography (App.js)
- **Issue**: `App.js:281` — The vault unlock handler sets `vaultKey = password` (raw string) and never calls `deriveKeyFromPassword()` / `generateSalt()` from `crypto.js`. These functions exist but are imported and discarded. The vault can be "unlocked" with any string and the JWK decryption will silently fail or use an incorrect key.
- **Impact**: Password-based vault protection is non-functional. The AES-GCM decrypt path in `rust-bridge.js` receives an underived key.
- **Fix**: Persist a salt alongside the ciphertext in `localStorage`, then call `const key = await deriveKeyFromPassword(password, storedSalt)` before calling `setState({ vaultKey: key, vaultLocked: false })`.

### 0g. `dryrun` ReferenceError in LegacyNet Path (aoClient.js)
- **Issue**: `aoClient.js:421` — `sendAndGetResultLegacy()` calls `dryrun(...)` but only imports `createDataItemSigner` from `@permaweb/aoconnect`. `dryrun` is never declared in this scope. This is a guaranteed `ReferenceError` crash when the LegacyNet path is invoked.
- **Fix**: Destructure `dryrun` alongside `createDataItemSigner`: `const { createDataItemSigner, dryrun } = await import('@permaweb/aoconnect')`.

### 0h. `httpsig` Signing Crashes in Enclave-Only Mode (aoClient.js)
- **Issue**: `aoClient.js:95` — The `httpsig` branch accesses `jwk.n` directly. In enclave-only mode, `jwk` is `null` (stripped from state after being loaded into the WASM enclave). This throws `Cannot read properties of null (reading 'n')`.
- **Fix**: Use `effectivePublicKey` (already available in closure) as the fallback: `publicKey: jwk?.n ?? effectivePublicKey`.

### 0i. `DEFAULTS.CU` is Undefined (config.js)
- **Issue**: `state.js:58` references `DEFAULTS.CU` for `devWallet.cuUrl`, but `config.js` never defines a `CU` key. This silently evaluates to `undefined`, meaning the CU URL field in Dev Tools is always blank.
- **Fix**: Add `CU: 'https://cu.ao-testnet.xyz'` (or the appropriate HyperBEAM CU URL) to `config.js`.

### 0j. `reviews.js` AO Sync Is Dead Code (marketplace/reviews.js)
- **Issue**: Both `syncWithAO()` (line 16) and `persistToAO()` (line 83) construct an AO client with `jwk: state.jwk` where `state` is a local empty object `{}`. The real app state is never imported. The signer is always `null`, so all AO writes fail silently staying in-memory only.
- **Fix**: Import `getState` from `../../state.js` and use `const { jwk, publicKey } = getState()` before building the AO client.

### 0k. SSE Transport Only Supports One Concurrent Client (server.js)
- **Issue**: `server.js:104` — `sseTransport` is a single module-level variable. A second SSE connection from a new AI client overwrites the reference, silently breaking the first session with no cleanup.
- **Fix**: Use a `Map<sessionId, SSEServerTransport>` and route `POST /messages` requests using a `sessionId` query param (standard MCP pattern).

### 0l. `eventAttachmenets` Typo Throughout App.js
- **Issue**: `App.js:26` — The object is named `eventAttachmenets` (missing an 'h'). Used in 10+ places. Not a runtime bug but creates confusion for contributors.
- **Fix**: Rename to `eventAttachments` across the file.

### 0. SSE Endpoint: Missing Session Validation
- **Issue**: `mcp-platform/src/server.js` — SSE connections are accepted without any session token check, meaning any local app can connect.
- **Goal**: Add session token validation before establishing an SSE stream.

### 0b. WASM Module: SRI Integrity Verification
- **Issue**: `src/core/rust-bridge.js` loads the `.wasm` binary without verifying a Subresource Integrity (SRI) hash. A compromised module could exfiltrate keys silently.
- **Goal**: Embed the SHA-256 hash of the compiled `.wasm` in the build pipeline and verify it via `SubtleCrypto` before calling `init()`.

### 0c. Dependency Vulnerabilities (`npm audit`)
- **Issue**: 20 low-severity vulnerabilities exist via the `@permaweb/aoconnect` → `ethers.js` → `elliptic <=6.6.1` chain.
- **Goal**: Run `npm audit fix` after testing compatibility with the latest `@permaweb/aoconnect`.

### 0d. No ESLint / Prettier Configuration
- **Issue**: The project has no `.eslintrc` or `.prettierrc`, making code style inconsistent across contributors.
- **Goal**: Add ESLint + Prettier configs and integrate them into the `npm run dev` / CI pipeline.

### 0e. No `.env.example` File
- **Issue**: New contributors have no reference for required environment variables, blocking onboarding.
- **Goal**: Create a `.env.example` listing all required variables with placeholder values and add it to the repo root.

### 1. E2E Test Suite Failures (Alpha Hardened)
- **Status**: **RESOLVED for Core Logic**.
- **Progress**: All 219 frontend vitest and 28 backend vitest tests are passing (100% success rate). 
- **Task**: Finalize Playwright E2E coverage for the new Agent Composer React components.

### 2. Bridge Aggregator: Real API Integration
- **Current State**: `src/bridge/adapters.js` uses 100% simulation/static logic for quotes.
- **Goal**: Implement real REST/RPC calls to deBridge, LayerZero, and Across.
- **Task**: Replace static `calculateQuote` methods with real `fetch()` calls to provider endpoints.

### 3. Social Mesh: Real Data Integration
- **Current State**: `SocialMesh.js` uses mock data.
- **Goal**: Implement real AO Social protocol handlers to fetch and broadcast messages.

### 2. Marketplace: Verified Reputation
- **Current State**: `Marketplace/reviews.js` is an in-memory simulation.
- **Goal**: Deploy an AO "Reputation Registry" process and move review storage to the Permaweb.
- **Contributor Task**: Build the Lua handler for review storage and link it to the `ReviewSystem` class.

### 3. State Auditor: SU Live Fetching
- **Current State**: `state-auditor.js` contains the Rust verification logic but lacks the network layer to fetch assignment chains from a real SU.
- **Goal**: Implement `fetchFromSU()` to pull sequence data from the AO Scheduler units.

### 4. Browser Connectivity: HyperBEAM CORS
- **Issue**: Direct browser-to-MU communication is blocked by CORS.
- **Workaround**: Currently relies on the MCP Server relay.
- **Goal**: Implement a browser-native "CORS Proxy" detection or MU-side headers alignment.

## � Medium Priority: Performance & Scalability

### 1. UI Virtualization (Infinite Scroll)
- **Issue**: Social and Marketplace lists render hundreds of DOM elements at once, degrading performance.
- **Goal**: Implement list virtualization in `SocialMesh.js` and `Marketplace` components.

### 2. State Persistence: IndexedDB Migration
- **Issue**: Large skill graphs or many memory items can exceed the 5MB `localStorage` limit.
- **Goal**: Migrate the `AutoSave` and `state.js` persistence layers to IndexedDB for unlimited, local-first storage.

### 3. Edge Intelligence: WebGPU CPU Fallback
- **Issue**: Devices without WebGPU cannot run the SLM runner.
- **Goal**: Implement a pure WASM (CPU) fallback for the matrix multiplication logic in `rust-bridge.js`.

### 4. Agent Composition: Conditional Branching
- **Issue**: `AgentRunner.js` only handles linear DAGs.
- **Goal**: Add support for `if/else` nodes and looping structures ($next, $prev) in the execution engine.

## 🧠 Advanced Logic & Memory Isolation

### 1. WASM Memory Pressure & Cleanup
- **Issue**: High-frequency signing operations in the `AgentRunner` may lead to Rust memory leaks if `RustSigner` instances aren't explicitly destroyed.
- **Goal**: Implement a `Dispose()` pattern or use a FinalizationRegistry to free the WASM heap.

### 2. Resolved: Sandbox Inconsistency
- **Status**: **FIXED**.
- **Action**: The legacy `walletApp.js` seed app was removed to prevent user confusion regarding persistence layers. All development now occurs in the main hardened environment.

### 3. Holographic Reputation Scaling
- **Issue**: Calculating trust scores for 1,000+ posts in the `SocialMesh` in the main thread will block the UI.
- **Goal**: Move reputation auditing to a Web Worker using the `StateAuditor` logic.

### 4. Hardware Signer: Address Cache
- **Issue**: In Enclave-only mode, the address is derived every time a signer is created, even if the public key modulus (N) is already known.
- **Goal**: Implement a secure global cache for derived addresses maped to modulus hashes.

##  Low Priority: Developer Experience (Good First Issues)

### 1. Operator Console: Tab Completion
- **Improvement**: Add auto-complete for `/spawn` and `/eval` using Process IDs stored in the `MemoryVault`.

### 2. Markdown Post Formatting
- **Improvement**: Add a lightweight markdown renderer to `SocialMesh.js` for enriched post content.

### 3. skill-scaffold Dependency Injection
- **Improvement**: Enhance the `skill-scaffold` MCP tool to automatically include dependencies from the Marketplace.

### 4. Accessibility (a11y) Audit
- **Task**: Pass through all components and ensure full keyboard navigation and screen reader support (ARIA 1.2 compliance).

### 5. SkillStore: Formal Registry Pattern
- **Issue**: `SkillStore.js` uses an ad-hoc registry.
- **Goal**: Implement a formal registry pattern for hot-swappable agent skills, as noted in the source code TODO.

---
*AOPRISM: Building the Neural Network of the Permaweb.*
