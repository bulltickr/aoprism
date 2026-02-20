
import { getState, setState } from '../../state.js'
import { makeAoClient, sendAndGetResult, makeAoClientLegacy, sendAndGetResultLegacy } from '../../core/aoClient.js'
import { DEFAULTS } from '../../core/config.js'

export function renderDevWallet() {
  const state = getState()
  const dw = state.devWallet || {}
  const activeTab = dw.activeTab || 'hyperbeam'

  const tags = (dw.tags || []).map((tag, i) => `
    <div class="tag-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
      <input type="text" class="input tag-name" value="${tag.name}" data-idx="${i}" placeholder="Name" style="flex: 1;">
      <input type="text" class="input tag-value" value="${tag.value}" data-idx="${i}" placeholder="Value" style="flex: 2;">
      <button class="btn btn-ghost tag-remove" data-idx="${i}">✕</button>
    </div>
  `).join('')

  return `
    <section class="dev-wallet fade-in" aria-labelledby="dev-tools-title">
      <div class="hub-header" style="margin-bottom: 20px;">
        <h1 id="dev-tools-title" class="card-title" style="font-size: 1.5rem; margin: 0;">Dev Tools</h1>
        <p class="text-muted">Advanced interactions and debugging utilities.</p>
        
        <!-- Tab Navigation -->
        <div style="display:flex; gap:12px; margin-top:16px; border-bottom:1px solid var(--glass-border);" role="tablist">
            <button class="tab-btn ${activeTab === 'hyperbeam' ? 'active' : ''}" data-tab="hyperbeam" 
                    role="tab"
                    aria-selected="${activeTab === 'hyperbeam'}"
                    aria-label="HyperBEAM Mainnet mode"
                    style="padding: 8px 16px; background:none; border:none; border-bottom: 2px solid ${activeTab === 'hyperbeam' ? 'var(--primary)' : 'transparent'}; color: ${activeTab === 'hyperbeam' ? 'var(--text-main)' : 'var(--text-muted)'}; cursor:pointer; font-weight:600;">
                HyperBEAM (Mainnet)
            </button>
            <button class="tab-btn ${activeTab === 'legacy' ? 'active' : ''}" data-tab="legacy"
                    role="tab"
                    aria-selected="${activeTab === 'legacy'}"
                    aria-label="Legacy Network Demo mode"
                    style="padding: 8px 16px; background:none; border:none; border-bottom: 2px solid ${activeTab === 'legacy' ? 'var(--primary)' : 'transparent'}; color: ${activeTab === 'legacy' ? 'var(--text-main)' : 'var(--text-muted)'}; cursor:pointer; font-weight:600;">
                Legacy Net (Demo)
            </button>
        </div>
      </div>

      <div class="card">
        <div style="margin-bottom:20px;">
            ${activeTab === 'hyperbeam'
      ? '<div class="badge badge-primary">Mode: AO Message (Production)</div>'
      : '<div class="badge badge-warning">Mode: DryRun (Legacy/Test)</div>'}
        </div>
        
        <!-- Advanced Legacy Options -->
        <div style="display: ${activeTab === 'legacy' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
            <div class="form-group" style="margin-bottom:0;">
                <label class="label" style="font-size:0.75rem;">MU / Gateway URL</label>
                <input type="text" id="dev-mu-url" class="input" style="font-size:0.8rem; padding:6px;" value="${dw.muUrl || DEFAULTS.URL}">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label class="label" style="font-size:0.75rem;">Scheduler (SU)</label>
                <input type="text" id="dev-su-url" class="input" style="font-size:0.8rem; padding:6px;" value="${dw.schedulerUrl || DEFAULTS.SCHEDULER}">
            </div>
             <div class="form-group" style="margin-bottom:0; grid-column: span 2;">
                <label class="label" style="font-size:0.75rem;">Compute Unit (CU)</label>
                <input type="text" id="dev-cu-url" class="input" style="font-size:0.8rem; padding:6px;" value="${dw.cuUrl || ''}" placeholder="Optional CU URL">
            </div>
        </div>

        <div class="form-group">
          <label class="label">Target Process ID</label>
          <input type="text" id="dev-process-id" class="input" placeholder="AO Process ID (43 chars)" value="${dw.processId || ''}">
        </div>

        <div class="form-group">
          <label class="label">Message Tags</label>
          <div id="tag-container">${tags}</div>
          <button id="add-tag-btn" class="btn btn-ghost" style="margin-top: 10px;">+ Add Tag</button>
        </div>
        
        <div class="form-group">
          <label class="label">Data / Payload</label>
           <textarea id="dev-data" class="input" style="height:80px;" placeholder="Optional data string...">${dw.data || ''}</textarea>
        </div>

        <button id="send-btn" class="btn btn-primary btn-lg" style="width: 100%;" ${state.sending ? 'disabled' : ''}>
          ${state.sending
      ? 'Transmitted...'
      : (activeTab === 'hyperbeam' ? 'Broadcast to HyperBEAM' : 'Send to Legacy Net')}
        </button>
      </div>

      ${state.response ? `
        <div class="response-container fade-in" style="margin-top:20px;">
          <label class="label">Response Details</label>
          <div class="glass-card" style="padding:16px; background:rgba(0,0,0,0.3);">
            <pre class="response-json" style="margin:0; overflow-x:auto;">${JSON.stringify(state.response, null, 2)}</pre>
          </div>
        </div>
      ` : ''}
      
      ${state.error ? `
        <div class="fade-in" style="margin-top:20px; color:var(--danger); padding:16px; border:1px solid var(--danger); border-radius:8px; background:rgba(239,68,68,0.1);">
            <strong>Error:</strong> ${state.error}
        </div>
      ` : ''}
    </section>
  `
}

export function attachDevEvents(root) {
  const state = getState()

  // Tab Switching
  root.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      setState({
        devWallet: {
          ...state.devWallet,
          activeTab: btn.dataset.tab
        },
        response: null,
        error: null
      })
    }
  })

  root.querySelector('#dev-process-id')?.addEventListener('input', (e) => {
    setState({
      devWallet: {
        ...state.devWallet,
        processId: e.target.value
      }
    })
  })

  root.querySelector('#dev-data')?.addEventListener('input', (e) => {
    setState({
      devWallet: {
        ...state.devWallet,
        data: e.target.value
      }
    })
  })

  // Advanced config listeners
  root.querySelector('#dev-mu-url')?.addEventListener('change', (e) => {
    setState({ devWallet: { ...state.devWallet, muUrl: e.target.value } })
  })
  root.querySelector('#dev-su-url')?.addEventListener('change', (e) => {
    setState({ devWallet: { ...state.devWallet, schedulerUrl: e.target.value } })
  })
  root.querySelector('#dev-cu-url')?.addEventListener('change', (e) => {
    setState({ devWallet: { ...state.devWallet, cuUrl: e.target.value } })
  })

  // Tag interactions
  root.querySelector('#add-tag-btn')?.addEventListener('click', () => {
    setState({
      devWallet: {
        ...state.devWallet,
        tags: [...(state.devWallet.tags || []), { name: '', value: '' }]
      }
    })
  })

  root.querySelectorAll('.tag-remove').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx)
      const newTags = (state.devWallet.tags || []).filter((_, i) => i !== idx)
      setState({
        devWallet: {
          ...state.devWallet,
          tags: newTags
        }
      })
    }
  })

  root.querySelectorAll('.tag-name, .tag-value').forEach(input => {
    input.oninput = (e) => {
      const idx = parseInt(e.target.dataset.idx)
      const field = e.target.classList.contains('tag-name') ? 'name' : 'value'
      const newTags = (state.devWallet.tags || []).map((tag, i) =>
        i === idx ? { ...tag, [field]: e.target.value } : tag
      )
      setState({
        devWallet: {
          ...state.devWallet,
          tags: newTags
        }
      })
    }
  })

  // Send Logic
  root.querySelector('#send-btn')?.addEventListener('click', async () => {
    setState({ sending: true, response: null, error: null })
    const activeTab = state.devWallet.activeTab || 'hyperbeam'

    try {
      if (activeTab === 'hyperbeam') {
        const { ao, signer } = await makeAoClient({
          jwk: state.jwk,
          publicKey: state.publicKey,
          URL: state.devWallet.muUrl || DEFAULTS.URL,
          SCHEDULER: state.devWallet.schedulerUrl || DEFAULTS.SCHEDULER,
          CU_URL: state.devWallet.cuUrl
        })
        const res = await sendAndGetResult({
          ao, signer,
          process: state.devWallet.processId,
          tags: state.devWallet.tags.filter(t => t.name),
          data: state.devWallet.data || ''
        })
        setState({ sending: false, response: res.result })
      } else {
        // Legacy Mode
        const { signer } = await makeAoClientLegacy({ jwk: state.jwk })
        const res = await sendAndGetResultLegacy({
          signer,
          process: state.devWallet.processId,
          tags: state.devWallet.tags.filter(t => t.name),
          data: state.devWallet.data || ''
        })
        setState({ sending: false, response: res.result })
      }
    } catch (err) {
      console.error(err)
      setState({ sending: false, error: err.message })
    }
  })
}
