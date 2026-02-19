# AOPRISM - Development Roadmap

## Project Status: ✅ ALPHA (Functional Viewer)

AOPRISM is currently in the **"Viewer Phase"** - a functional Operating System interface for the AO Network.
We are now moving into the **"Persistence Phase"** (Real Data, Managed Identity, Security).

---

## ✅ Completed Phases

### Phase 1-5: Foundation & Core Systems
- [x] **MCP Server**: Localhost bridge established.
- [x] **AO Registry**: Skills stored on-chain.
- [x] **Execution**: Live `ao.message` and `ao.result` support.
- [x] **Agent Memory**: Local state management.
- [x] **Social Mesh**: Feed and Broadcasting.

### Phase 7: The Neural Bridge
- [x] **Hive Mind**: Skill Discovery UI.
- [x] **Dev Tools**: Command Console & Legacy Net (DryRun) support.
- [x] **Stats Engine**: Dashboard with live metrics simulation.

---

## 🚧 Active Development

### Phase 6: Privacy & Security (The Vault)
- [x] **Data Vault**: `crypto.subtle` AES-GCM encryption for local blobs.
- [x] **Tracing Mode**: Incognito toggle to disable logging.
- [x] **Verification**: 100% Test Coverage for security modules.

### Phase 8: Production Polish
**Goal**: Prepare for public release.
- [ ] **Network Monitor Agent**:
    - *Complexity*: High.
    - *Description*: A standalone AO Process that runs 24/7 to record historical stats (messages, CU usage).
    - *Cost*: One-time spawn fee (~0.05 AR) + standard compute fees per event.
- [ ] **Documentation**: Video walkthroughs and `AutoDev` demos.

### Phase 9: Frictionless Onboarding (Managed Identity)
**Goal**: Abstract away "Process IDs" for new users.
- [ ] **Guest Mode**: Read-only browsing without a wallet.
- [ ] **Sponsored Spawn Backend**:
    - *Description*: A server that pays the Process Spawn fee for new users.
    - *Security*: Captcha / Gitcoin Passport to prevent bot draining.
- [ ] **Universal Resolver**: Auto-lookup of Profiles via Wallet Address.

---

## Future Concepts
- **Voice Interface**: `browser_media` integration for voice commands.
- **VR / Spatial Mode**: 3D interface for the Neural Bridge.
- **Mobile Native**: React Native port.
