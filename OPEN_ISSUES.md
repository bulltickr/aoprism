# 🐛 Open Issues & Technical Debt

This document tracks known issues, connectivity blockers, and technical debt in the **AOPRISM** Alpha. We believe in building in the open and being transparent about what isn't working yet.

## 🔴 High Priority

### 1. Browser Connectivity to HyperBEAM MU
- **Issue**: Attempting to send messages (`/eval`, `/ping`) or spawn processes via `https://push.forward.computer` from the browser results in **CORS Policy blocks**.
- **Symptom**: `Access-Control-Allow-Origin` header is missing on the MU response, causing the browser to reject the request.
- **Workaround**: None currently for direct browser-to-node communication. Requires a proxy or MU-side configuration update.

### 2. "Failed to format request for signing"
- **Issue**: Some operations in the `CommandConsole` return a signing format error when using the standard `createDataItemSigner`.
- **Symptom**: `Error: Failed to format request for signing`.
- **Root Cause**: Likely a discrepancy in how `aoconnect` handles the `PASSTHROUGH` mode vs the custom `createBrowserJwkSigner`.

## 🟡 Medium Priority

### 1. Gateway Reporting Inconsistency
- **Issue**: Utility commands like `/whoami` and `/network` sometimes report `https://mu.ao-testnet.xyz` even when the application is configured for HyperBEAM Mainnet.
- **Root Cause**: Persistent state in `localStorage` (`aoprism:state`) may cache old gateway URLs.
- **Status**: 🟢 **Partially Fixed**. `state.js` refactor improved defaults, but legacy local storage keys might persist for old users. Clearing cache recommended.


## 🟢 Low Priority

### 1. UX: Response Truncation
- **Issue**: Large Lua return values from `/eval` can overwhelm the console buffer.
- **Improvement**: Implement better result pagination or "View in Memory Hub" links.

### 2. UI: Mobile Responsiveness
- **Issue**: The Hacker Console is difficult to use on small screens.
- **Improvement**: Implement a simplified mobile terminal view.

---
*Found a new issue? Please report it on GitHub.*
