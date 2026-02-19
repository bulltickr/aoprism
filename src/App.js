/**
 * App.js
 * Modern, modular shell for AOPRISM.
 * Updated for "Agent OS" 2026 Polish.
 */

import { getState, setState, subscribe } from './state.js'
import { renderSkillStore, attachSkillEvents } from './modules/skills/SkillStore.js'
import { renderMemoryVault, attachMemoryEvents } from './modules/memory/MemoryVault.js'
import { renderDevWallet, attachDevEvents } from './modules/wallet/DevWallet.js'
import { renderSocialMesh, attachSocialEvents, fetchFeed } from './modules/social/SocialMesh.js'
import { renderCommandConsole, attachConsoleEvents } from './modules/console/CommandConsole.js'
import { renderDashboard, renderAnalytics } from './modules/stats/Stats.js'
import { getArBalance } from './core/aoClient.js'

// --- Profile Settings Modal ---
function renderProfileModal(state) {
  if (!state.showProfileModal) return ''

  return `
        <div class="modal-overlay fade-in" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:2000; backdrop-filter:blur(8px);">
            <div class="glass-card" style="width: 500px; padding: 32px; display:flex; flex-direction:column; gap:20px;">
                <h2 style="margin:0; font-size:1.5rem;">Identity Settings</h2>
                <div style="display:flex; align-items:center; gap:20px;">
                    <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--secondary)); display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:bold; color:white;">
                        ${(state.identity?.name || 'A')[0]}
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Display Name</label>
                        <input type="text" id="pref-name" class="input" value="${state.identity?.name || ''}" placeholder="Agent Name">
                    </div>
                </div>
                
                <div>
                     <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Bio / System Prompt</label>
                     <textarea id="pref-bio" class="input" style="height:100px; font-family:'Inter', sans-serif;">${state.identity?.bio || ''}</textarea>
                </div>
                
                 <div>
                     <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--text-muted);">Avatar URL (Optional)</label>
                     <input type="text" id="pref-avatar" class="input" value="${state.identity?.avatar || ''}" placeholder="https://arweave.net/...">
                </div>

                <div>
                     <label style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                        <div>
                            <span style="display:block; font-size:0.9rem; font-weight:600;">Tracing Mode</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">Log all network events to console. Disable for privacy.</span>
                        </div>
                        <input type="checkbox" id="pref-tracing" ${state.tracingEnabled ? 'checked' : ''} style="transform:scale(1.5);">
                     </label>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
                    <button id="cancel-pref" class="btn btn-ghost">Cancel</button>
                    <button id="save-pref" class="btn btn-primary">Save Settings</button>
                </div>
                <p style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin:0; margin-top:8px;">
                    * Vault Process: <span style="font-family:monospace; color:var(--primary);">Initialized (Local)</span><br>
                    * Registry Sync: <span style="font-family:monospace; color:var(--warning);">Pending (No Process ID)</span>
                </p>
            </div>
        </div>
    `
}

// --- Notifications (Toasts) ---
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `
        <span class="toast-icon">
            ${type === 'success' ? '✅' : type === 'error' ? '🚫' : '💡'}
        </span>
        <span>${message}</span>
    `
  container.appendChild(toast)

  // Auto dismiss
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

function renderSidebar(state) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '󰕒' },
    { id: 'analytics', label: 'Analytics', icon: '📊' }, // New Item
    { id: 'social', label: 'Social Mesh', icon: '󰭹' },
    { id: 'skills', label: 'Skill Hub', icon: '󰈙' },
    { id: 'console', label: 'Console', icon: '󰆍' }, // Reordered
    { id: 'memory', label: 'Memory', icon: '󰆼' },
    { id: 'wallet', label: 'Dev Tools', icon: '󰆧' }
  ]

  const links = navItems.map(item => `
    <div class="nav-item ${state.activeModule === item.id ? 'active' : ''}" data-mod="${item.id}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </div>
  `).join('')

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="brand-icon">AO</div>
        <div class="brand-name">AOPRISM</div>
      </div>
      <nav class="nav-links">${links}</nav>
      <div class="sidebar-footer" style="padding: 20px;">
        <button id="logout-btn" class="btn btn-ghost" style="width: 100%; color: var(--danger); justify-content: flex-start;">
          <span style="font-size: 1.1rem;">󰗽</span> Sign Out
        </button>
      </div>
    </div>
  `
}

function renderHeader(state) {
  const address = state.address || 'Guest'
  // Safer truncation to avoid overflow glitches
  const shortAddr = address !== 'Guest'
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Guest'

  return `
    <header class="main-header">
      <div class="header-path">
        <span style="color: var(--text-muted); font-size: 0.9rem;">Workspace /</span> 
        <span style="font-weight: 600; font-size: 1rem;">${state.activeModule.charAt(0).toUpperCase() + state.activeModule.slice(1)}</span>
      </div>
      
      <div class="header-actions" style="display: flex; align-items: center; gap: 12px; height: 100%;">
           <!-- Profile Badge -->
           <div class="profile-badge-container" style="position: relative;">
               <div id="profile-btn" style="cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 4px 8px; background: rgba(0,0,0,0.2); border-radius: 20px; border: 1px solid var(--glass-border); transition: background 0.2s;">
                  <div style="text-align: right; line-height: 1.1;">
                      <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">${shortAddr}</div>
                      <div style="font-size: 0.7rem; color: var(--success); display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                        <span style="width: 6px; height: 6px; background: var(--success); border-radius: 50%; display: inline-block;"></span>
                        Online
                      </div>
                  </div>
                  <div style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                      ${shortAddr[0]}
                  </div>
               </div>
               
               <!-- Dropdown Menu -->
               <div id="profile-dropdown" class="glass-card" style="display: none; position: absolute; top: 45px; right: 0; width: 220px; padding: 8px; z-index: 100; flex-direction: column; gap: 4px;">
                    <div style="padding: 8px 12px; border-bottom: 1px solid var(--glass-border); margin-bottom: 4px;">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Balance</div>
                        <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); font-family:'JetBrains Mono';">${state.balance || '0.0000'} AR</div>
                    </div>
                    
                    <button class="btn btn-ghost" style="width: 100%; justify-content: flex-start; font-size: 0.9rem;" id="open-settings-btn">
                         <span>⚙️</span> Identity Settings
                     </button>

                    <button class="btn btn-ghost" style="width: 100%; justify-content: flex-start; font-size: 0.85rem;" onclick="navigator.clipboard.writeText('${address}'); alert('Address Copied!')">
                        <span>📋</span> Copy Address
                    </button>
                    <button class="btn btn-ghost" style="width: 100%; justify-content: flex-start; font-size: 0.85rem; color: var(--danger);" id="header-logout-btn">
                        <span>🚪</span> Disconnect
                    </button>
               </div>
           </div>
      </div>
    </header>
  `
}

function renderActiveModule(state) {
  switch (state.activeModule) {
    case 'analytics': return renderAnalytics()
    case 'social': return renderSocialMesh()
    case 'skills': return renderSkillStore()
    case 'memory': return renderMemoryVault()
    case 'console': return renderCommandConsole()
    case 'wallet': return renderDevWallet()
    case 'dashboard':
    default:
      return renderDashboard()
  }
}

export function renderApp(root) {
  const state = getState()

  if (!state.jwk) {
    // Auth Screen
    root.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1e1b4b 0%, #020617 100%);">
        <div class="card glass-card fade-in" style="width: 440px; padding: 48px; text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 24px;">💎</div>
          <h1 style="font-size: 2rem; margin-bottom: 12px; font-weight: 600;">AOPRISM</h1>
          <p class="text-muted" style="margin-bottom: 32px; font-size: 1rem;">Seamless Interface for Decentralized Intelligence.</p>
          <button id="auth-btn" class="btn btn-primary" style="width: 100%; height: 48px; font-size: 1rem;">Connect Wallet</button>
          <p style="margin-top: 24px; font-size: 0.8rem; color: var(--text-muted);">Secured by Arweave • Powered by AO</p>
        </div>
      </div>
      <div id="toast-container"></div>
    `
    root.querySelector('#auth-btn').onclick = async () => {
      try {
        const { generateJwkAndAddress, getArBalance } = await import('./core/aoClient.js')
        const { jwk, address } = await generateJwkAndAddress()

        // Fetch Balance
        const balance = await getArBalance(address)

        setState({ jwk, address, balance, activeModule: 'dashboard' })
        showToast('Identity Verified. Welcome back, Operator.', 'success')
      } catch (e) {
        showToast('Authentication Failed', 'error')
      }
    }
    return
  }

  // Main App
  root.innerHTML = `
    <div id="app-layout">
      ${renderSidebar(state)}
      <main class="main-content">
        ${renderHeader(state)}
        <div class="content-area">
          ${renderActiveModule(state)}
        </div>
      </main>
    </div>
    <div id="toast-container"></div>
    ${renderProfileModal(state)}
  `

  root.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
      const mod = item.dataset.mod
      setState({ activeModule: mod })
      if (mod === 'social') fetchFeed()
    }
  })

  // Settings Logic
  const settingsBtn = root.querySelector('#open-settings-btn')
  if (settingsBtn) {
    settingsBtn.onclick = (e) => {
      e.stopPropagation()
      setState({ showProfileModal: true })
      root.querySelector('#profile-dropdown').style.display = 'none'
    }
  }

  if (state.showProfileModal) {
    const save = root.querySelector('#save-pref')
    const cancel = root.querySelector('#cancel-pref')

    if (cancel) cancel.onclick = () => setState({ showProfileModal: false })
    if (save) save.onclick = () => {
      const name = root.querySelector('#pref-name').value
      const bio = root.querySelector('#pref-bio').value
      const avatar = root.querySelector('#pref-avatar').value
      const tracingEnabled = root.querySelector('#pref-tracing').checked

      setState({
        identity: { ...state.identity, name, bio, avatar },
        tracingEnabled,
        showProfileModal: false
      })
      showToast(tracingEnabled ? 'Settings Saved. Tracing Active.' : 'Settings Saved. Incognito Mode.', 'success')
    }
  }

  // Header Profile Dropdown
  const profileBtn = root.querySelector('#profile-btn')
  const dropdown = root.querySelector('#profile-dropdown')

  if (profileBtn && dropdown) {
    profileBtn.onclick = (e) => {
      e.stopPropagation()
      const isHidden = dropdown.style.display === 'none'
      dropdown.style.display = isHidden ? 'flex' : 'none'
    }

    // Close on click outside
    document.addEventListener('click', () => {
      dropdown.style.display = 'none'
    }, { once: true }) // simple hack, better to have a global listener

    dropdown.onclick = (e) => e.stopPropagation() // Prevent closing when clicking inside
  }

  const headerLogout = root.querySelector('#header-logout-btn')
  if (headerLogout) {
    headerLogout.onclick = () => {
      if (confirm('Disconnect secure session?')) {
        import('./state.js').then(m => m.resetState())
      }
    }
  }

  // Sidebar Sign Out (Legacy)
  const logoutBtn = root.querySelector('#logout-btn')
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('Disconnect secure session?')) {
        import('./state.js').then(m => m.resetState())
      }
    }
  }

  // Module Post-Render Attachments
  if (state.activeModule === 'social') attachSocialEvents(root)
  if (state.activeModule === 'skills') attachSkillEvents(root)
  if (state.activeModule === 'memory') attachMemoryEvents(root)
  if (state.activeModule === 'console') attachConsoleEvents(root)
  if (state.activeModule === 'wallet') attachDevEvents(root)
}

export function mount(root) {
  subscribe(() => renderApp(root))
  renderApp(root)
}
