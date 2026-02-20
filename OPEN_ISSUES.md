# � Open Issues & Technical Debt

This document tracks known issues, connectivity blockers, and technical debt in the **AOPRISM** Alpha. We believe in building in the open and being transparent about what isn't working yet.

## 🔴 High Priority: Architecture & Security

### 1. Social Mesh: Real Data Integration
- **Current State**: `SocialMesh.js` uses 100% mock data for the feed.
- **Goal**: Implement real AO Social protocol handlers (Arweave/AO) to fetch and broadcast messages.
- **Contributor Task**: Research Moltbook or Permaweb Social standards and implement the query logic in `fetchFeed`.

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

### 2. Sandbox vs. Main Persistence
- **Inconsistency**: The "Seed" app (`walletApp.js`) is intentionally ephemeral, but this confuses users who expect the `AutoSave` persistence of the main UI.
- **Goal**: Implement an optional "Persistent Sandbox" toggle using the `MemoryVault` core.

### 3. Holographic Reputation Scaling
- **Issue**: Calculating trust scores for 1,000+ posts in the `SocialMesh` in the main thread will block the UI.
- **Goal**: Move reputation auditing to a Web Worker using the `StateAuditor` logic.

### 4. Hardware Signer: Address Cache
- **Issue**: In Enclave-only mode, the address is derived every time a signer is created, even if the public key modulus (N) is already known.
- **Goal**: Implement a secure global cache for derived addresses maped to modulus hashes.

##  Low Priority: Developer Experience (Good First Issues)

### 1. Hacker Console: Tab Completion
- **Improvement**: Add auto-complete for `/spawn` and `/eval` using Process IDs stored in the `MemoryVault`.

### 2. Markdown Post Formatting
- **Improvement**: Add a lightweight markdown renderer to `SocialMesh.js` for enriched post content.

### 3. skill-scaffold Dependency Injection
- **Improvement**: Enhance the `skill-scaffold` MCP tool to automatically include dependencies from the Marketplace.

### 4. Accessibility (a11y) Audit
- **Task**: Pass through all components and ensure full keyboard navigation and screen reader support (ARIA 1.2 compliance).

---
*AOPRISM: Building the Neural Network of the Permaweb.*
