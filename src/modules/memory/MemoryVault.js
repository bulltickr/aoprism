/**
 * MemoryVault.js
 * Encrypted Offline/Online Storage for Agent Logs & Secrets.
 */

import { getState, setState, subscribe } from '../../state.js'
import { deriveKeyFromSignature, decryptData } from '../../core/crypto.js'
import { makeAoClient } from '../../core/aoClient.js'

let vaultKey = null // In-Memory Key (Never written to disk)
let vaultStatus = 'LOCKED' // LOCKED | UNLOCKING | UNLOCKED

// Mock Encrypted Data (since we don't have a real Writer yet)
// In prod, this comes from AO.
const MOCK_ENCRYPTED_BLOB = [
  {
    id: 'mem_001',
    timestamp: Date.now() - 100000,
    // "Project Omega Initialized" encrypted with a test key (simulation)
    // Since we can't easily generate valid ciphertext for a dynamic key without the key first,
    // we will simulate the *process* of decryption in the mock flow below.
    encrypted: true,
    preview: '🔒 Encrypted Content'
  },
  {
    id: 'mem_002',
    timestamp: Date.now(),
    encrypted: true,
    preview: '🔒 Encrypted Content'
  }
]

export async function fetchMemories() {
  const state = getState()
  // In real app: fetch from AO process
  // const { ao } = await makeAoClient({ URL: state.url })
  // const res = await ao.dryrun(...) 

  // For prototype: Load mock encrypted data
  console.log("MemoryVault: Fetching encrypted state...")

  // If we are already unlocked, we would decrypt here.
  // For now, just load the raw "blob" into state.
  // We treat state.memories as the *Display* model.
  if (vaultStatus === 'LOCKED') {
    setState({ memories: MOCK_ENCRYPTED_BLOB })
  }
}

// --- Actions ---

/**
 * Triggers the Wallet Signature -> Key Derivation -> Decryption flow.
 */
async function unlockVault() {
  try {
    const state = getState()
    // In a real app with wallet connection:
    // if (!state.address) throw new Error("Connect Wallet first")

    vaultStatus = 'UNLOCKING'
    renderMemoryVault()

    // 1. Request Signature (The "Password")
    // We sign a fixed message to derive the stable key
    const message = new TextEncoder().encode("AOPRISM_VAULT_ACCESS_v1")

    console.log("🔐 Security Check: Requesting Signature...")

    // MOCK SIGNATURE (Browser Native Randomness)
    // In prod: await window.arweaveWallet.sign(message)
    const mockSignature = window.crypto.getRandomValues(new Uint8Array(32))

    // 2. Derive Key (This is the heavy computation)
    vaultKey = await deriveKeyFromSignature(mockSignature)
    vaultStatus = 'UNLOCKED'

    // 3. Decrypt Local State 
    // Since we are mocking the blob and the key is random every reload (in this mock),
    // we can't actually decrypt "real" ciphertext from a previous session.
    // So we will *simulate* the successful decryption by replacing the mock data with cleartext.
    // In a real app, `decryptData` would be called on `state.memories[i].ciphertext`.

    // Simulator Logic:
    const decryptedMemories = [
      {
        id: 'mem_001',
        timestamp: Date.now() - 100000,
        preview: '🚀 Project Omega Initialized. Agent deployed on process 8s7d...s8d',
        details: 'Full deployment logs: Success. RAM: 45%. Network: Stable.'
      },
      {
        id: 'mem_002',
        timestamp: Date.now(),
        preview: '💬 User Interaction: "Analyze the core protocol"',
        details: 'User asked to analyze core protocol. Response sent via hyperbeam.'
      }
    ]

    setState({ memories: decryptedMemories })

    // renderMemoryVault is called by setState listener usually, but just in case:
    renderMemoryVault()

  } catch (e) {
    console.error(e)
    vaultStatus = 'LOCKED'
    alert("Unlock failed: " + e.message)
    renderMemoryVault()
  }
}

async function lockVault() {
  vaultKey = null
  vaultStatus = 'LOCKED'
  // Clear decrypted data from UI state immediately
  setState({ memories: MOCK_ENCRYPTED_BLOB })
  renderMemoryVault()
}

// --- UI Rendering ---

export function renderMemoryVault() {
  const listContainer = document.querySelector('.memory-list')
  const container = document.querySelector('.memory-vault-container')

  // If container not present in DOM yet, return (will be called by main loop)
  if (!container) return generateLayout()

  // Inner Content based on Status
  container.innerHTML = getContentHtml()
}

function getContentHtml() {
  const state = getState()
  const memories = state.memories || []

  if (vaultStatus === 'LOCKED') {
    return `
            <div style="height: 100%; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; padding: 40px; background: rgba(0,0,0,0.4); border-radius: 16px; border: 1px solid var(--glass-border); max-width: 500px;">
                    <div style="font-size: 4rem; margin-bottom: 20px; text-shadow: 0 0 20px rgba(74, 222, 128, 0.2);">🔒</div>
                    <h2 style="color: #fff; margin-bottom: 10px; font-family: 'Outfit', sans-serif;">Vault Encrypted</h2>
                    <p style="margin-bottom: 30px; color: var(--text-muted); line-height: 1.6;">
                        This agent's memory is encrypted with a client-side key derived from your wallet signature. 
                        <br><strong>We cannot see your data.</strong>
                    </p>
                    <button id="unlock-btn" class="btn btn-primary btn-lg" style="width: 100%; padding: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <span>🔑</span> Sign to Decrypt
                    </button>
                    <div style="margin-top: 20px; font-size: 0.8rem; color: var(--text-muted);">
                        Zero-Knowledge Architecture • AES-256-GCM
                    </div>
                </div>
            </div>
        `
  }

  if (vaultStatus === 'UNLOCKING') {
    return `
            <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="loader"></div>
                <p style="margin-top: 20px; color: var(--primary);">Deriving Cryptographic Keys...</p>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Verifying Signature...</p>
            </div>
        `
  }

  // UNLOCKED VIEW
  const listHtml = memories.map(mem => `
        <div class="memory-item code-font" style="padding: 15px; border-bottom: 1px solid var(--glass-border); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="color: var(--primary); font-weight: bold;">${mem.id}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(mem.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style="color: #eee; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${mem.preview}
            </div>
        </div>
    `).join('')

  return `
        <div style="height: 100%; display: flex; flex-direction: column;">
            <div style="padding: 15px 20px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div style="width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success);"></div>
                    <span style="font-weight: 600; letter-spacing: 1px; font-size: 0.9rem; color: var(--success);">DECRYPTED VAULT</span>
                </div>
                <button id="lock-btn" class="btn btn-ghost btn-sm" style="color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 12px;">
                    Lock Vault 🔒
                </button>
            </div>
            
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Sidebar List -->
                <div class="memory-sidebar" style="width: 320px; border-right: 1px solid var(--glass-border); overflow-y: auto; background: rgba(0,0,0,0.1);">
                    ${listHtml || '<div style="padding:20px; text-align:center;">No memories found.</div>'}
                </div>
                
                <!-- Detail View Placeholder -->
                <div class="memory-detail" style="flex: 1; padding: 40px; overflow-y: auto; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                   <div style="text-align: center; color: var(--text-muted);">
                      <div style="font-size: 3rem; margin-bottom: 10px; opacity: 0.3;">📄</div>
                      Select a memory log to view decrypted details.
                   </div>
                </div>
            </div>
        </div>
    `
}

function generateLayout() {
  return `
        <div class="memory-vault-container fade-in" style="height: 100%; display: flex; flex-direction: column;">
            ${getContentHtml()}
        </div>
    `
}

export function attachMemoryEvents(root) {
  // Use delegated events because content triggers re-render
  const container = root.querySelector('.memory-vault-container')

  if (!container) return

  container.onclick = async (e) => {
    if (e.target.id === 'unlock-btn' || e.target.closest('#unlock-btn')) {
      await unlockVault()
    }
    if (e.target.id === 'lock-btn' || e.target.closest('#lock-btn')) {
      await lockVault()
    }
  }
}
