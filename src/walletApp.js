import { DEFAULTS } from './config.js'
import {
  generateJwkAndAddress,
  makeAoClient,
  sendAndGetResult,
  makeAoClientLegacy,
  sendAndGetResultLegacy
} from './aoClient.js'

// ===== UTILITY FUNCTIONS =====

function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

function setText(node, text) {
  node.textContent = text
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}

function toastRootEl() {
  return document.getElementById('toasts')
}

function ensureToastRoot() {
  if (toastRootEl()) return
  const root = el('<div id="toasts" aria-live="polite" aria-relevant="additions"></div>')
  document.body.appendChild(root)
}

function showToast(message, { type = 'info', timeoutMs = 3500 } = {}) {
  ensureToastRoot()
  const root = toastRootEl()
  if (!root) return

  const node = el(`
    <div class="toast" data-type="${escapeHtml(type)}" role="status">
      <div class="toast-msg">${escapeHtml(message)}</div>
      <button class="toast-close" type="button" aria-label="Close">✕</button>
    </div>
  `)

  const remove = () => {
    node.classList.add('toast-out')
    window.setTimeout(() => node.remove(), 200)
  }

  node.querySelector('.toast-close')?.addEventListener('click', remove)
  root.appendChild(node)

  if (timeoutMs && timeoutMs > 0) {
    window.setTimeout(remove, timeoutMs)
  }
}

// ===== RENDER FUNCTIONS =====

function renderLanding(state, actions) {
  return `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">PermawebOS-Seed 0.0.1</h2>
      </div>
      <div class="card-body">
        <div class="warning-banner">
          ⚠️ Demo only. No persistence. Data lost on refresh.
        </div>
        <form id="create-wallet-form">
          <div class="form-group">
            <label for="username" class="label">Username (optional)</label>
            <input
              type="text"
              id="username"
              name="username"
              class="input"
              placeholder="alice"
              autocomplete="off"
            />
          </div>
          <button type="submit" class="btn btn-primary btn-lg">Create Wallet</button>
        </form>
      </div>
    </div>
  `
}

function renderWalletInfo(state, actions) {
  const displayName = state.username || 'Wallet'
  const shortAddress = state.address ? `${state.address.slice(0, 8)}...${state.address.slice(-8)}` : ''

  return `
    <div class="wallet-info">
      <div class="wallet-header">
        <div class="wallet-name">${escapeHtml(displayName)}</div>
        <button id="reset-btn" class="btn btn-sm btn-danger" type="button">Reset</button>
      </div>
      <div class="wallet-address-row">
        <div class="wallet-address" title="${escapeHtml(state.address || '')}">${escapeHtml(shortAddress)}</div>
        <button id="copy-address-btn" class="btn btn-sm" type="button">Copy Address</button>
      </div>
    </div>
  `
}

function renderTagBuilder(state, actions) {
  const rows = state.tags.map((tag, index) => `
    <div class="tag-row">
      <input
        type="text"
        class="tag-name input"
        placeholder="Name"
        value="${escapeHtml(tag.name)}"
        data-index="${index}"
      />
      <input
        type="text"
        class="tag-value input"
        placeholder="Value"
        value="${escapeHtml(tag.value)}"
        data-index="${index}"
      />
      <button
        class="tag-remove btn btn-sm btn-danger"
        data-index="${index}"
        type="button"
      >✕</button>
    </div>
  `).join('')

  return `
    <div class="form-group">
      <label class="label">Tags</label>
      <div class="tag-list">${rows}</div>
      <button id="add-tag-btn" class="btn btn-sm" type="button">+ Add Tag</button>
    </div>
  `
}

function renderTabs(state, actions) {
  return `
    <div class="tabs">
      <button
        class="tab ${state.activeTab === 'hyperbeam' ? 'tab-active' : ''}"
        data-tab="hyperbeam"
        type="button"
      >HyperBEAM</button>
      <button
        class="tab ${state.activeTab === 'legacynet' ? 'tab-active' : ''}"
        data-tab="legacynet"
        type="button"
      >LegacyNet</button>
    </div>
  `
}

function renderHyperBeamConfig(state) {
  return `
    <div class="form-group">
      <label for="url" class="label">AO URL</label>
      <input
        type="text"
        id="url"
        name="url"
        class="input"
        placeholder="https://jonny-ringo.xyz"
        value="${escapeHtml(state.url)}"
        autocomplete="off"
      />
    </div>
    <div class="form-group">
      <label for="scheduler" class="label">Scheduler ID</label>
      <input
        type="text"
        id="scheduler"
        name="scheduler"
        class="input"
        placeholder="Scheduler process ID"
        value="${escapeHtml(state.scheduler)}"
        autocomplete="off"
      />
    </div>
  `
}

function renderLegacyNetConfig(state) {
  return `
    <div class="form-group">
      <label for="mu-url" class="label">MU URL</label>
      <input
        type="text"
        id="mu-url"
        name="mu-url"
        class="input"
        placeholder="https://mu-testnet.ao-testnet.xyz"
        value="${escapeHtml(state.muUrl)}"
        autocomplete="off"
      />
    </div>
    <div class="form-group">
      <label for="cu-url" class="label">CU URL</label>
      <input
        type="text"
        id="cu-url"
        name="cu-url"
        class="input"
        placeholder="https://cu-testnet.ao-testnet.xyz"
        value="${escapeHtml(state.cuUrl)}"
        autocomplete="off"
      />
    </div>
    <div class="form-group">
      <label for="gateway-url" class="label">Gateway URL</label>
      <input
        type="text"
        id="gateway-url"
        name="gateway-url"
        class="input"
        placeholder="https://arweave.net"
        value="${escapeHtml(state.gatewayUrl)}"
        autocomplete="off"
      />
    </div>
  `
}

function renderResponse(state, actions) {
  if (!state.response && !state.lastError) {
    return `
      <div class="response-container">
        <label class="label">Response</label>
        <div class="response-empty">No response yet. Send a command to see results.</div>
      </div>
    `
  }

  if (state.lastError) {
    return `
      <div class="response-container">
        <label class="label">Response</label>
        <div class="response-error">
          <strong>Error:</strong> ${escapeHtml(state.lastError)}
        </div>
      </div>
    `
  }

  let json = JSON.stringify(state.response, null, 2)
  const MAX_DISPLAY = 50000
  if (json.length > MAX_DISPLAY) {
    json = json.slice(0, MAX_DISPLAY) + '\n... (truncated)'
  }

  return `
    <div class="response-container">
      <div class="response-header">
        <label class="label">Response</label>
        <button id="copy-response-btn" class="btn btn-sm" type="button">Copy</button>
      </div>
      <pre class="response-json">${escapeHtml(json)}</pre>
    </div>
  `
}

function renderCommandBuilder(state, actions) {
  const configFields = state.activeTab === 'hyperbeam'
    ? renderHyperBeamConfig(state)
    : renderLegacyNetConfig(state)

  return `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">PermawebOS-Seed 0.0.1</h2>
      </div>
      <div class="card-body">
        ${renderWalletInfo(state, actions)}
        ${renderTabs(state, actions)}

        <form id="command-form">
          ${configFields}

          <div class="form-group">
            <label for="process-id" class="label">Target Process ID</label>
            <input
              type="text"
              id="process-id"
              name="process-id"
              class="input"
              placeholder="Enter AO process ID (43 characters)"
              value="${escapeHtml(state.processId)}"
              autocomplete="off"
            />
          </div>

          ${renderTagBuilder(state, actions)}

          <button type="submit" class="btn btn-primary btn-lg" ${state.sending ? 'disabled' : ''}>
            ${state.sending ? 'Sending...' : 'Send Command'}
          </button>
        </form>

        ${renderResponse(state, actions)}
      </div>
    </div>
  `
}

function render(root, state, actions) {
  const html = state.jwk ? renderCommandBuilder(state, actions) : renderLanding(state, actions)

  root.innerHTML = html

  // Wire up event handlers
  if (!state.jwk) {
    // Landing page
    const form = root.querySelector('#create-wallet-form')
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const username = form.username.value.trim()
        await actions.createWallet({ username })
      })
    }
  } else {
    // Command builder page
    const resetBtn = root.querySelector('#reset-btn')
    if (resetBtn) {
      resetBtn.addEventListener('click', () => actions.reset())
    }

    const copyAddressBtn = root.querySelector('#copy-address-btn')
    if (copyAddressBtn) {
      copyAddressBtn.addEventListener('click', async () => {
        try {
          await copyToClipboard(state.address)
          showToast('Address copied to clipboard', { type: 'success' })
        } catch (e) {
          showToast('Failed to copy address', { type: 'error' })
        }
      })
    }

    // Tab switching
    root.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab
        actions.switchTab(tab)
      })
    })

    // HyperBEAM inputs
    const urlInput = root.querySelector('#url')
    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        state.url = e.target.value
      })
    }

    const schedulerInput = root.querySelector('#scheduler')
    if (schedulerInput) {
      schedulerInput.addEventListener('input', (e) => {
        state.scheduler = e.target.value
      })
    }

    // LegacyNet inputs
    const muUrlInput = root.querySelector('#mu-url')
    if (muUrlInput) {
      muUrlInput.addEventListener('input', (e) => {
        state.muUrl = e.target.value
      })
    }

    const cuUrlInput = root.querySelector('#cu-url')
    if (cuUrlInput) {
      cuUrlInput.addEventListener('input', (e) => {
        state.cuUrl = e.target.value
      })
    }

    const gatewayUrlInput = root.querySelector('#gateway-url')
    if (gatewayUrlInput) {
      gatewayUrlInput.addEventListener('input', (e) => {
        state.gatewayUrl = e.target.value
      })
    }

    const processInput = root.querySelector('#process-id')
    if (processInput) {
      processInput.addEventListener('input', (e) => {
        state.processId = e.target.value
      })
    }

    const addTagBtn = root.querySelector('#add-tag-btn')
    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => actions.addTag())
    }

    root.querySelectorAll('.tag-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index)
        actions.removeTag(index)
      })
    })

    root.querySelectorAll('.tag-name').forEach((input) => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index)
        state.tags[index].name = e.target.value
      })
    })

    root.querySelectorAll('.tag-value').forEach((input) => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index)
        state.tags[index].value = e.target.value
      })
    })

    const commandForm = root.querySelector('#command-form')
    if (commandForm) {
      commandForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        await actions.sendCommand()
      })
    }

    const copyResponseBtn = root.querySelector('#copy-response-btn')
    if (copyResponseBtn) {
      copyResponseBtn.addEventListener('click', async () => {
        try {
          const json = JSON.stringify(state.response, null, 2)
          await copyToClipboard(json)
          showToast('Response copied to clipboard', { type: 'success' })
        } catch (e) {
          showToast('Failed to copy response', { type: 'error' })
        }
      })
    }
  }
}

// ===== APP INITIALIZATION =====

export function mountApp(root) {
  if (!root) throw new Error('Missing root element')

  // In-memory state (no persistence)
  let state = {
    activeTab: 'hyperbeam', // or 'legacynet'
    jwk: null,
    address: null,
    username: null,
    processId: '',

    // HyperBEAM config
    url: DEFAULTS.URL,
    scheduler: DEFAULTS.SCHEDULER,

    // LegacyNet config
    muUrl: 'https://mu-testnet.ao-testnet.xyz',
    cuUrl: 'https://cu-testnet.ao-testnet.xyz',
    gatewayUrl: 'https://arweave.net',

    tags: [{ name: 'Action', value: 'Info' }],
    response: null,
    lastError: null,
    sending: false
  }

  function setState(patch) {
    state = { ...state, ...patch }
    render(root, state, actions)
  }

  const actions = {
    switchTab(tab) {
      setState({ activeTab: tab })
    },

    async createWallet({ username }) {
      try {
        showToast('Generating wallet...', { type: 'info' })
        const { jwk, address } = await generateJwkAndAddress()
        setState({ jwk, address, username: username || null })
        showToast('Wallet created successfully', { type: 'success' })
      } catch (e) {
        console.error('Failed to create wallet:', e)
        showToast(`Failed to create wallet: ${e.message}`, { type: 'error' })
      }
    },

    reset() {
      if (!confirm('Reset wallet? All data will be lost (no persistence).')) return

      state = {
        activeTab: 'hyperbeam',
        jwk: null,
        address: null,
        username: null,
        processId: '',
        url: DEFAULTS.URL,
        scheduler: DEFAULTS.SCHEDULER,
        muUrl: 'https://mu-testnet.ao-testnet.xyz',
        cuUrl: 'https://cu-testnet.ao-testnet.xyz',
        gatewayUrl: 'https://arweave.net',
        tags: [{ name: 'Action', value: 'Info' }],
        response: null,
        lastError: null,
        sending: false
      }

      render(root, state, actions)
      showToast('Wallet reset', { type: 'info' })
    },

    addTag() {
      setState({ tags: [...state.tags, { name: '', value: '' }] })
    },

    removeTag(index) {
      const tags = state.tags.filter((_, i) => i !== index)
      setState({ tags })
    },

    updateTag(index, field, value) {
      const tags = [...state.tags]
      tags[index] = { ...tags[index], [field]: value }
      setState({ tags })
    },

    updateUrl(value) {
      setState({ url: value })
    },

    updateScheduler(value) {
      setState({ scheduler: value })
    },

    updateProcessId(value) {
      setState({ processId: value })
    },

    async sendCommand() {
      if (!state.jwk) {
        showToast('No wallet created', { type: 'error' })
        return
      }

      const processId = state.processId.trim()
      if (!processId) {
        showToast('Process ID is required', { type: 'error' })
        return
      }

      // Filter out empty tags
      const tags = state.tags.filter(t => t.name.trim())

      if (tags.length === 0) {
        showToast('At least one tag is required', { type: 'error' })
        return
      }

      setState({ sending: true, lastError: null })

      try {
        showToast('Sending command...', { type: 'info' })

        let result

        if (state.activeTab === 'hyperbeam') {
          // Use HyperBEAM client
          const { ao, signer } = await makeAoClient({
            URL: state.url || DEFAULTS.URL,
            SCHEDULER: state.scheduler || DEFAULTS.SCHEDULER,
            MODE: DEFAULTS.MODE,
            jwk: state.jwk
          })

          result = await sendAndGetResult({
            ao,
            signer,
            process: processId,
            tags: tags,
            data: ''
          })
        } else {
          // Use LegacyNet client (standard aoconnect - uses default testnet nodes)
          const { signer } = await makeAoClientLegacy({
            jwk: state.jwk
          })

          result = await sendAndGetResultLegacy({
            signer,
            process: processId,
            tags: tags,
            data: ''
          })
        }

        setState({
          response: result.result,
          lastError: null,
          sending: false
        })

        showToast('Command sent successfully', { type: 'success' })
      } catch (e) {
        console.error('Failed to send command:', e)
        const errorMsg = e.message || String(e)
        setState({
          response: null,
          lastError: errorMsg,
          sending: false
        })
        showToast(`Command failed: ${errorMsg}`, { type: 'error' })
      }
    }
  }

  // Initial render
  render(root, state, actions)
}
