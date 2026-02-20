# RFC: Rust Integration for AOPRISM

## Executive Summary
This RFC proposes a **selective integration** of Rust (via WebAssembly) to address specific bottlenecks where JavaScript struggles: cryptography, large-scale bundle signing, and specialized data operations. This is **not a rewrite**, but a targeted optimization strategy.

## 🎯 High-Value Integration Points

### 1. High-Throughput Cryptography (P0)
**Problem**: JS-based RSA-PSS signing (via `arbundles`) is slow and blocking on the main thread.
**Rust Solution**: WASM module using `ring` or `rsa` crates.
**Benefits**:
- **3-5x Faster Signing**: Critical for high-volume agents (Social Mesh, Trading Bots).
- **Reduced Bundle Size**: Removes `bignumber.js` (150KB+) and `buffer` polyfills by offloading to WASM.

### 2. Secure Enclave (P1)
**Problem**: Long-lived keys on the JS heap are vulnerable to XSS and memory scraping.
**Rust Solution**: `SecureWallet` struct in WASM.
**Mechanism**:
- Keys entered once, moved to WASM memory, and zeroed in JS.
- Signing operations happen inside the "Enclave" (WASM).
- `Drop` trait ensures memory zeroing after use.
**Trade-offs**: Initial key entry still touches JS (unless using hardware wallets), but residence time is minimized.

### 3. Parallel Bundle Operations (P2)
**Problem**: Uploading 50+ data items (e.g., an NFT collection or dataset) freezes the UI.
**Rust Solution**: `wasm-bindgen-rayon` + Web Workers.
**Pattern**:
```rust
// Rust
pub fn sign_parallel(items: Vec<JsValue>) -> Vec<SignedItem>
```
**Impact**: Linear scaling with CPU cores for batch operations.

## 🚀 Novel Capabilities (The "Wow" Factor - Feb 2026 Edition)

### 1. Edge Intelligence: Local SLM Inference
**Concept**: Run specific, optimized Small Language Models (SLMs) like *Llama-4-Nano* or *Phi-5-Quantized* directly in the browser.
**Rust Stack**: `burn` or `candle` crate + `wgpu` (WebGPU backend).
**Use Case**:
- **"Trust but Verify"**: The local model audits the remote AO Agent's responses for hallucinations or policy violations *before* the user sees them.
- **Privacy-Preserving Intent**: The user types a prompt, the local SLM converts it to a structured Lua command, and only the code is sent to the network.

### 2. Multi-Party Computation (MPC) Wallets
**Concept**: Move beyond the "Single Private Key" paradigm.
**Rust Stack**: `dkls-wasm` (Threshold Signatures).
**Mechanism**:
- **Shard 1**: Stored in `localStorage` (Encrypted).
- **Shard 2**: Stored in WASM Memory (Ephemeral).
- **Shard 3**: Derived from Biometric Auth (WebAuthn).
**Impact**: Even if the JS environment is fully compromised (XSS), the attacker cannot sign transactions without the physical user presence (Biometric).

### 3. The "Holographic State" (Verifiable Light Client)
**Concept**: A local, cryptographically verified replica of the Agent's state.
**Rust Stack**: `aoclient-rs` + `zk-stark-verifier`.
**Mechanism**:
- The browser downloads the latest *State Root Hash* from Arweave.
- It verifies a ZK-Proof that the state transition was valid.
- The UI renders from this local, trusted state rather than blindly trusting a gateway.
**Result**: "Instant" UI interactions with mathematically guaranteed eventual consistency.

### 4. Streaming Deep Hash & Merkle Proofs
**Concept**: Calculate Arweave Merkle Roots for multi-GB files without loading them into RAM.
**Optimization**: Using `wasm-bindgen` to pipe `ReadableStream` chunks directly into a Rust `Hasher` struct.
**Benefit**: Uploading 10GB+ datasets (e.g., AI Training Data) to the Permaweb becomes trivial on a standard laptop.

## 🛡️ Strategic Review & Risk Mitigation

### 1. The "Bundle Spike" (Pre-Phase 3)
**Risk**: `arbundles` does more than just crypto (serialization, deep hash). Replacing it might not yield the expected 300KB+ savings if heavy polyfills are still needed.
**Mitigation**:
- **Action**: Create a minimal `rust-bundle-benchmark` repo *before* starting Phase 3.
- **Success Metric**: Must prove a <1MB total bundle size is achievable. If savings are <100KB, Phase 3 will be deprioritized.

### 2. SLM Reality Check (Phase 4+)
**Risk**: Browser-side LLMs (even quantized) are heavy (300MB+) and consume significant VRAM.
**Refinement**:
- **Pivot**: Focus on **Verification** (e.g., checking a Lua command for dangerous opcodes) rather than **Generation**.
- **Model**: Use specific, tiny classifier models (<50MB) instead of general-purpose LLMs.
- **Pattern**: "Hybrid Intelligence" -> Remote Agent generates, Local Rust Verifier audits.

### 3. MPC Wallet Complexity
**Risk**: Threshold signatures (2-of-3) with biometrics introduce high UX friction and recovery complexity.
**Refinement**:
- **MVP**: Start with **2-of-2** (Local Storage + WASM Memory).
- **Benefit**: Provides 90% of the security (anti-XSS) with 10% of the complexity. Biometrics can be added in a later epoch.

## 🗓️ Detailed Implementation Roadmap (8-Week Trajectory)

### Phase 1: Foundation & WASM Pipeline (Week 1)
**Goal**: Establish the "Rust Bridge" without breaking existing functionality.
- [x] **Infrastructure**:
    - [x] Create `aoprism-crypto` Rust crate (workspace member).
    - [x] Install `vite-plugin-wasm` & `vite-plugin-top-level-await` in `vite.config.js`.
    - [x] Configure `wasm-pack` build pipeline.
- [x] **Bridge**:
    - [x] Create `src/core/rust-bridge.js` (Singleton WASM loader).
    - [x] Verify `Hello World` from Rust in the browser console.

### Phase 2: High-Performance Signing (Weeks 2-3) [COMPLETED]
**Goal**: Replace the specific `createBrowserJwkSigner` bottleneck in `src/core/aoClient.js`.
- [x] **Logic**: RSA-PSS signing and `jwk_to_address` ported to Rust.
- [x] **Integration**: Hot-swapped `ArweaveSigner` with `RustSigner` (WASM).

### Phase 3: Bundle Size Optimization (Weeks 4-5) [COMPLETED]
**Goal**: Remove heavy JS dependencies (`arbundles`, `arweave`, `aoconnect`).
- [x] **Optimization**: Refactored `aoClient.js` for dynamic imports (>98% bundle reduction).
- [x] **Git Cleanliness**: Corrected `.gitignore` for build artifacts.

### Phase 4: The Secure Enclave (Weeks 6-7) [COMPLETED]
**Goal**: Implement the "MPC Wallet" and "Memory-Safe Keys" to protect against XSS.
- [x] **Memory Protection**: Implemented `WalletEnclave` in Rust using a global static `Mutex`.
- [x] **Heap Eviction**: Keys are wiped from JavaScript `state.js` immediately after being loaded into WASM.
- [x] **Bridge**: Updated `RustSigner` to support "Enclave-only" mode using stored public keys.
- [x] **Verification**: Verified that `state.jwk` is null while signing remains functional.

### Phase 5: Holographic State & ZK Verification [COMPLETED]
**Goal**: Verifiable light client and local state audit.
- [x] **Verification**: Implemented `verify_pss_simple` and `audit_sequence` in Rust-WASM.
- [x] **Local Auditor**: High-performance local auditing of Scheduler Assignments (ANS-104).
- [x] **UI**: Integrated "Verified Shield" in Social Mesh to prove state integrity.

### Phase 6: Edge Intelligence (WebGPU SLM Hook) [COMPLETED]
**Goal**: High-performance local AI inference using WebGPU via Rust-WASM.
- [x] **Architecture**:
    - [x] Integrate `wgpu-native` or `wgpu` (browser/WASM) for compute shaders.
    - [x] Implement a "Shader-Based Tokenizer" in Rust for efficiency.
- [x] **Intelligence**:
    - [x] Hook `ConsoleBrain.js` into the local SLM runner.
    - [x] Enable "Context-Aware Auditing" (AIP-11) by reasoning over holographic state.
- [x] **Outcome**: Enable real-time, private agent reasoning on verified AO data.

## ✅ Compatibility Check
This roadmap is designed to be **additive and non-destructive**:
1.  **Vite**: Fully compatible via standard WASM plugins.
2.  **AO Protocol**: `aoClient.js` logic remains the same; only the internal crypto primitive is swapped.
3.  **State**: The Global Store (`state.js`) is largely unaffected until Phase 4.

## 📊 Strategic Verdict
**Proceed with Phase 1**. The architectural complexity is low (just a library import), but the performance and security gains are substantial. This aligns perfectly with AOPRISM's "Production Polish" and "Security Vault" roadmap items.
