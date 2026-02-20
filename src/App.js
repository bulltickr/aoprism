/**
 * App.js
 * Modern, modular shell for AOPRISM.
 * Refactored for scalability, code-splitting, and accessibility.
 */

import { getState, setState, subscribe } from './state.js'
import { UI } from './components/UI.js'
import { getArBalance } from './core/aoClient.js'
import { initCommandPalette } from './components/CommandPalette.js'
import { initTimeLockVault } from './utils/TimeLockVault.js'

// Cache for module renderers to support code-splitting
const renderers = {
  dashboard: null,
  analytics: null,
  social: null,
  skills: null,
  console: null,
  memory: null,
  wallet: null
}

const eventAttachmenets = {
  social: null,
  skills: null,
  memory: null,
  console: null,
  wallet: null
}

async function loadModule(name) {
  if (renderers[name]) return

  setState({ loading: true })
  try {
    let module;
    switch (name) {
      case 'dashboard':
      case 'analytics':
        module = await import('./modules/stats/Stats.js')
        renderers.dashboard = module.renderDashboard
        renderers.analytics = module.renderAnalytics
        break
      case 'social':
        module = await import('./modules/social/SocialMesh.js')
        renderers.social = module.renderSocialMesh
        eventAttachmenets.social = module.attachSocialEvents
        // Fetch feed naturally when loading social
        module.fetchFeed()
        break
      case 'skills':
        module = await import('./modules/skills/SkillStore.js')
        renderers.skills = module.renderSkillStore
        eventAttachmenets.skills = module.attachSkillEvents
        break
      case 'memory':
        module = await import('./modules/memory/MemoryVault.js')
        renderers.memory = module.renderMemoryVault
        eventAttachmenets.memory = module.attachMemoryEvents
        break
      case 'console':
        module = await import('./modules/console/CommandConsole.js')
        renderers.console = module.renderCommandConsole
        eventAttachmenets.console = module.attachConsoleEvents
        break
      case 'wallet':
        module = await import('./modules/wallet/DevWallet.js')
        renderers.wallet = module.renderDevWallet
        eventAttachmenets.wallet = module.attachDevEvents
        break
    }
  } catch (err) {
    console.error(`Failed to load module ${name}:`, err)
    showToast(`Failed to load ${name}`, 'error')
  } finally {
    setState({ loading: false })
  }
}

// --- Notifications (Toasts) ---
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.setAttribute('role', 'alert')

  const iconSpan = document.createElement('span')
  iconSpan.className = 'toast-icon'
  iconSpan.setAttribute('aria-hidden', 'true')
  iconSpan.textContent = type === 'success' ? '✅' : type === 'error' ? '🚫' : '💡'

  const textSpan = document.createElement('span')
  textSpan.textContent = message

  toast.appendChild(iconSpan)
  toast.appendChild(textSpan)
  container.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

function renderSidebar(state) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '󰕒' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'social', label: 'Social Mesh', icon: '󰭹' },
    { id: 'skills', label: 'Skill Hub', icon: '󰈙' },
    { id: 'console', label: 'Console', icon: '󰆍' },
    { id: 'memory', label: 'Memory', icon: '󰆼' },
    { id: 'wallet', label: 'Dev Tools', icon: '󰆧' }
  ]

  const links = navItems.map(item => `
    <button class="nav-item ${state.activeModule === item.id ? 'active' : ''}" 
            data-mod="${item.id}" 
            aria-label="Navigate to ${item.label}"
            role="tab"
            aria-selected="${state.activeModule === item.id}"
    >
      <span class="nav-icon" aria-hidden="true">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </button>
  `).join('')

  return `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-icon" aria-hidden="true">AO</div>
        <div class="brand-name">AOPRISM</div>
      </div>
      <nav class="nav-links" role="tablist">${links}</nav>
      <div class="sidebar-footer" style="padding: 20px;">
        <button id="logout-btn" class="btn btn-ghost" style="width: 100%; color: var(--danger); justify-content: flex-start;" aria-label="Sign out">
          <span style="font-size: 1.1rem;" aria-hidden="true">󰗽</span> Sign Out
        </button>
      </div>
    </aside>
  `
}

function renderHeader(state) {
  const address = state.address || 'Guest'
  const shortAddr = address !== 'Guest'
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Guest'

  return `
    <header class="main-header">
      <div class="header-path">
        <span style="color: var(--text-muted); font-size: 0.9rem;">Workspace /</span> 
        <h1 style="display: inline; font-weight: 600; font-size: 1rem; margin: 0;">${state.activeModule.charAt(0).toUpperCase() + state.activeModule.slice(1)}</h1>
      </div>
      
      <div class="header-actions">
           <div class="profile-badge-container" style="position: relative;">
               <button id="profile-btn" aria-haspopup="true" aria-expanded="false" style="cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 20px; border: 1px solid var(--glass-border); transition: background 0.2s;">
                  <div style="text-align: right; line-height: 1.1;">
                      <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">${shortAddr}</div>
                      <div style="font-size: 0.7rem; color: var(--success); display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                        <span style="width: 6px; height: 6px; background: var(--success); border-radius: 50%; display: inline-block;"></span>
                        Online
                      </div>
                  </div>
                  <div class="avatar-circle" style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                      ${shortAddr[0]}
                  </div>
               </button>
               
               <div id="profile-dropdown" class="glass-card dropdown-menu" style="display: none; position: absolute; top: 45px; right: 0; width: 220px; padding: 8px; z-index: 100; flex-direction: column; gap: 4px;">
                    <div style="padding: 8px 12px; border-bottom: 1px solid var(--glass-border); margin-bottom: 4px;">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Balance</div>
                        <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); font-family:'JetBrains Mono';">${state.balance || '0.0000'} AR</div>
                    </div>
                    
                    <button class="btn btn-ghost" style="width: 100%; justify-content: flex-start; font-size: 0.9rem;" id="open-settings-btn">
                         <span aria-hidden="true">⚙️</span> Identity Settings
                     </button>

                    <button class="btn btn-ghost" style="width: 100%; justify-content: flex-start; font-size: 0.85rem;" id="copy-addr-btn">
                        <span aria-hidden="true">📋</span> Copy Address
                    </button>
                    <button class="btn btn-ghost" style="width: 100%; justify-content: flex-start; font-size: 0.85rem; color: var(--danger);" id="header-logout-btn">
                        <span aria-hidden="true">🚪</span> Disconnect
                    </button>
               </div>
           </div>
      </div>
    </header>
  `
}

function renderActiveModule(state) {
  const renderer = renderers[state.activeModule]
  if (!renderer) return UI.emptyState('Loading Kernel Module...', '󰈙')
  return renderer(state)
}

function renderProfileModal(state) {
  if (!state.showProfileModal) return ''
  return `
    <div class="modal-overlay fade-in" role="dialog" aria-labelledby="modal-title" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:2000; backdrop-filter:blur(8px);">
        <div class="glass-card" style="width: 500px; padding: 32px; display:flex; flex-direction:column; gap:20px;">
            <h2 id="modal-title" style="margin:0; font-size:1.5rem;">Identity Settings</h2>
            <!-- Modal Body -->
            <div style="display:flex; align-items:center; gap:20px;">
                <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--secondary)); display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:bold; color:white;">
                    ${(state.identity?.name || 'A')[0]}
                </div>
                <div style="flex:1;">
                    <label for="pref-name" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Display Name</label>
                    <input type="text" id="pref-name" class="input" value="${state.identity?.name || ''}" placeholder="Agent Name">
                </div>
            </div>
            <div>
                 <label for="pref-bio" style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Bio / System Prompt</label>
                 <textarea id="pref-bio" class="input" style="height:100px; font-family:'Inter', sans-serif;">${state.identity?.bio || ''}</textarea>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
                <button id="cancel-pref" class="btn btn-ghost">Cancel</button>
                <button id="save-pref" class="btn btn-primary">Save Settings</button>
            </div>
        </div>
    </div>
  `
}

export function renderApp(root) {
  const state = getState()

  // 1. Check Auth State
  if (!state.jwk) {
    if (root.dataset.state !== 'auth') {
      root.innerHTML = `
        <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1e1b4b 0%, #020617 100%);">
          <div class="card glass-card fade-in" style="width: 440px; padding: 48px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 24px;">💎</div>
            <h1 style="font-size: 2rem; margin-bottom: 12px; font-weight: 600;">AOPRISM</h1>
            <p class="text-muted" style="margin-bottom: 32px; font-size: 1rem;">Seamless Interface for Decentralized Intelligence.</p>
            <button id="auth-btn" class="btn btn-primary" style="width: 100%; height: 48px; font-size: 1rem;">Connect Wallet</button>
          </div>
        </div>
        <div id="toast-container"></div>
      `
      root.dataset.state = 'auth'

      root.querySelector('#auth-btn').onclick = async () => {
        try {
          setState({ loading: true })
          const { generateJwkAndAddress, getArBalance, signMessage } = await import('./core/aoClient.js')
          const { jwk, address } = await generateJwkAndAddress()
          const balance = await getArBalance(address)

          // Attempt to unlock Brain
          const { brain } = await import('./modules/console/ConsoleBrain.js')

          // We need a stable signature for the "Device ID"
          // We'll sign a static message "AOPRISM_DEVICE_LOCK"
          // This is deterministic for the same JWK, serving as our key material seed.
          const sig = await signMessage(jwk, 'AOPRISM_DEVICE_LOCK')
          const unlocked = await brain.unlock(sig)

          if (unlocked) {
            showToast('Neural Interface Unlocked', 'success')
          } else {
            console.log("Brain not unlocked (no keys or invalid signature)")
          }

          await setState({ jwk, address, balance, activeModule: 'dashboard', loading: false })
          showToast('Identity Verified.', 'success')
        } catch (e) {
          console.error(e)
          setState({ loading: false })
          showToast('Authentication Failed', 'error')
        }
      }
    }
    return
  }

  // 2. Initialize App Layout (Only once)
  if (root.dataset.state !== 'app') {
    root.innerHTML = `
      <div id="app-layout">
        <div id="sidebar-container"></div>
        <main class="main-content">
          <div id="header-container"></div>
          <div id="content-container" class="content-area"></div>
        </main>
      </div>
      <div id="toast-container"></div>
      <div id="modal-container"></div>
      <div id="loading-container"></div>
    `
    root.dataset.state = 'app'
    root.dataset.module = '' // track current rendered module
  }

  // 3. Granular Updates
  const sidebar = root.querySelector('#sidebar-container')
  const header = root.querySelector('#header-container')
  const content = root.querySelector('#content-container')
  const modal = root.querySelector('#modal-container')
  const loading = root.querySelector('#loading-container')

  sidebar.innerHTML = renderSidebar(state)
  header.innerHTML = renderHeader(state)
  modal.innerHTML = renderProfileModal(state)
  loading.innerHTML = state.loading ? UI.loadingOverlay() : ''

  // Load backend code for module if needed
  if (root.dataset.module !== state.activeModule) {
    loadModule(state.activeModule).then(() => {
      content.innerHTML = renderActiveModule(state)
      // Attach events
      const attacher = eventAttachmenets[state.activeModule]
      if (attacher) attacher(root)
      root.dataset.module = state.activeModule
    })
  } else {
    content.innerHTML = renderActiveModule(state)
    const attacher = eventAttachmenets[state.activeModule]
    if (attacher) attacher(root)
  }

  // Event Delegation and Binding (simplified for demo)
  root.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => setState({ activeModule: item.dataset.mod })
  })

  // Dropdown Logic
  const profileBtn = root.querySelector('#profile-btn')
  const dropdown = root.querySelector('#profile-dropdown')
  if (profileBtn) {
    profileBtn.onclick = (e) => {
      e.stopPropagation()
      const isVisible = dropdown.style.display === 'flex'
      dropdown.style.display = isVisible ? 'none' : 'flex'
      profileBtn.setAttribute('aria-expanded', !isVisible)
    }
  }

  const identityBtn = root.querySelector('#open-settings-btn')
  if (identityBtn) identityBtn.onclick = () => setState({ showProfileModal: true })

  const logoutBtns = root.querySelectorAll('#logout-btn, #header-logout-btn')
  logoutBtns.forEach(btn => {
    btn.onclick = () => {
      if (confirm('Disconnect secure session?')) {
        import('./state.js').then(m => m.resetState())
        root.dataset.state = ''
      }
    }
  })

  const copyBtn = root.querySelector('#copy-addr-btn')
  if (copyBtn) copyBtn.onclick = () => {
    navigator.clipboard.writeText(state.address)
    showToast('Address Copied', 'success')
  }
}

export function mount(root) {
  subscribe(() => renderApp(root))
  renderApp(root)

  // Initialize Command Palette (Cmd+K)
  initCommandPalette()

  // Initialize Time-Lock Vault (5 minute timeout)
  initTimeLockVault({
    timeout: 5 * 60 * 1000, // 5 minutes
    warningTime: 30 * 1000, // 30 second warning
    onLock: () => {
      console.log('[AOPRISM] Vault auto-locked')
    },
    onUnlock: () => {
      console.log('[AOPRISM] Vault unlocked')
    }
  })
}
