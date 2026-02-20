# 🧪 AOPRISM: Manual Testing Guide (v1.0.0-alpha.7)

This document provides a step-by-step walkthrough for manually verifying the 5 flagship tools and core infrastructure of AOPRISM.

---

## 🔐 1. Core Infrastructure & Security

### A. Secure Enclave (Rust-WASM)
1. **Wallet Generation**:
   - Refresh the page.
   - Click "Connect Wallet" -> "Generate New".
   - **Check**: Open Browser DevTools (F12) -> Console. Ensure no "JWK Leaked" errors.
   - **Check**: Type `window.appState.jwk` in the console. It should be `null`.
2. **Address Derivation**:
   - Ensure the sidebar reflects a valid Arweave address (43 chars).
   - Click the address to copy; verify it matches the clipboard.

### B. Persistence (AutoSave & Encryption)
1. **Form Encryption**:
   - Open the "Settings" or "Profile" tab.
   - Enter dummy data.
   - Reload the page.
   - **Check**: Data should persist.
   - **Verification**: Check Application -> IndexedDB. Encrypted blobs should not be human-readable.

---

## ⌨️ 2. The Hacker Console

### A. Basic Connectivity
1. Type `/ping` in the console.
   - **Expected**: "Neural Bridge: Online (Stdio/SSE)" or a latency check to HyperBEAM.
2. Type `/spawn` without arguments.
   - **Expected**: A help message or an error indicating missing parameters.

### B. Process Interaction
1. Type `/eval print(1+1)`.
   - **Expected**: Result `2` from the AO execution unit.
2. Type `/bridge status`.
   - **Expected**: Current MCP tool connection status.

---

## 🤖 3. AI Agent Composer

### A. Visual Flow Construction
1. Navigate to the "Composer" tab.
2. Drag a "Process" node onto the grid.
3. Drag a "Trigger" node and connect it to the Process node.
4. **Check**: Visual edges should snap correctly.

### B. Execution Runner
1. Click the "Play" (Execute) icon.
2. **Check**: Nodes should light up sequentially (Blue/Green).
3. **Verification**: Look for "Execution simulated (MCP tool integration)" in the node logs.

---

## 🛰️ 4. Social Mesh & Holographic Audit

### A. The Feed
1. Navigate to "Social Mesh".
2. **Check**: Mock feed items should load instantly.
3. Click "Audit" on any post.
   - **Expected**: A "Shield" icon should animate.
   - **Verification**: The audit log should show "Verified by Rust-WASM: OK".

---

## 🪐 5. Marketplace & Discovery

### A. Search & Resolution
1. Navigate to "Marketplace".
2. Type "Registry" in the search bar.
   - **Expected**: Results should filter in real-time.
3. Click "Dependencies" on a result.
   - **Expected**: A tree-view of linked processes should appear.

---

## 🌉 6. Cross-Chain Bridge

### A. Quote Aggregation
1. Navigate to "Bridge".
2. Select "AR" to "ETH".
3. Click "Get Quotes".
   - **Expected**: deBridge, LayerZero, and Across should show comparison prices.
4. Click "Execute" (Simulated).
   - **Expected**: A transaction hash (Simulated) should appear in the activity log.

---

## 🛠️ 7. Developer Workspace (MCP Server)

### A. Tool Hub
1. Run `npm run mcp:start` in a terminal.
2. Connect your AI assistant (Claude/Gemini/GPT) to the MCP endpoint.
3. Ask the AI: "AOPRISM: List my current AO processes."
   - **Check**: The AI should call `ao_list_processes` and return your local process list.

---

## 📱 8. UI/UX & Responsive Build

### A. Focus Mode
1. Click the "Zen" icon in the top right.
   - **Expected**: Sidebar and header should fade; focal workspace remains.
2. Press `Esc` to exit.

### B. Production Build Check
1. Run `npm run build`.
2. Check the `dist/` folder size.
   - **Expected**: ~8-9MB total.

---
*Found a bug? Record the console logs and add it to [OPEN_ISSUES.md](file:///c:/Users/quint/Desktop/aoprism/OPEN_ISSUES.md).*
