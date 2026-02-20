
import { getState, setState } from '../../state.js'
import { createCrossChainBridge } from '../../bridge/index.js'

let bridgeState = {
    fromChain: 'arweave',
    toChain: 'ethereum',
    amount: '100',
    quotes: [],
    loading: false,
    error: null
}

let bridgeClient = null;

function getBridge() {
    if (!bridgeClient) {
        bridgeClient = createCrossChainBridge();
    }
    return bridgeClient;
}

export function renderBridge(state) {
    const quotesList = bridgeState.quotes.map(q => {
        const quote = q.quote || q;
        return `
        <div class="card glass-card fade-in" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--glass-border); margin-bottom: 12px;">
            <div>
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--primary);">${q.adapter || 'Adapter'}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Est. Time: ${Math.floor((quote.estimatedTime || 600) / 60)} mins</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.2rem; font-weight: 700; color: var(--success);">${parseFloat(quote.toAmount || 0).toFixed(4)} ETH</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Fee: ${(quote.fee?.percentage) || 0}% + ${(quote.fee?.fixed) || 0} bits</div>
                <div style="font-size: 0.65rem; color: var(--danger); margin-top: 4px; font-weight: 600;">SIMULATED</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="alert('Bridge execution simulated: No real tokens were moved. This is an Alpha UI preview.')">BRIDGE</button>
        </div>
    `}).join('')

    return `
        <div class="bridge-module fade-in" style="max-width: 800px; margin: 0 auto; padding-top: 20px;">
            <div style="margin-bottom: 32px; text-align: center;">
                <h1 style="font-size: 2.2rem; margin: 0; background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Cross-Chain Bridge</h1>
                <div style="display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); color: var(--danger); border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; margin-bottom: 12px;">Alpha Simulation</div>
                <p style="color: var(--text-muted); max-width: 600px; margin: 0 auto;">Aggregate liquidity across the Permaweb and EVM ecosystems. <br/><span style="color: var(--danger); font-size: 0.8rem;">Note: This module is currently a UX simulation and does not execute real blockchain transactions.</span></p>
            </div>

            <div class="card glass-card" style="padding: 32px; margin-bottom: 32px; border: 1px solid var(--glass-border); position: relative; overflow: hidden;">
                <div style="display: grid; grid-template-columns: 1fr 40px 1fr; gap: 20px; align-items: end; margin-bottom: 24px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">From Chain</label>
                        <select id="bridge-from" class="input" style="width: 100%; height: 48px; background: rgba(0,0,0,0.3);">
                            <option value="arweave" ${bridgeState.fromChain === 'arweave' ? 'selected' : ''}>Arweave (AO)</option>
                            <option value="ethereum" ${bridgeState.fromChain === 'ethereum' ? 'selected' : ''}>Ethereum</option>
                            <option value="polygon" ${bridgeState.fromChain === 'polygon' ? 'selected' : ''}>Polygon</option>
                            <option value="arbitrum" ${bridgeState.fromChain === 'arbitrum' ? 'selected' : ''}>Arbitrum</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; height: 48px; font-size: 1.5rem; opacity: 0.5;">󰁔</div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">To Chain</label>
                        <select id="bridge-to" class="input" style="width: 100%; height: 48px; background: rgba(0,0,0,0.3);">
                            <option value="ethereum" ${bridgeState.toChain === 'ethereum' ? 'selected' : ''}>Ethereum</option>
                            <option value="bsc" ${bridgeState.toChain === 'bsc' ? 'selected' : ''}>BSC</option>
                            <option value="polygon" ${bridgeState.toChain === 'polygon' ? 'selected' : ''}>Polygon</option>
                            <option value="base" ${bridgeState.toChain === 'base' ? 'selected' : ''}>Base</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Amount</label>
                    <input type="number" id="bridge-amount" class="input" style="width: 100%; height: 52px; font-size: 1.5rem; font-weight: 600; background: rgba(0,0,0,0.3);" value="${bridgeState.amount}">
                </div>

                <button id="get-quotes-btn" class="btn btn-primary" style="width: 100%; height: 56px; font-size: 1.1rem; font-weight: 600;">
                    ${bridgeState.loading ? '🔍 AGGREGATING QUOTES...' : 'GET QUOTES'}
                </button>
            </div>

            <div id="bridge-results-container">
                ${bridgeState.quotes.length > 0 ? `
                    <div class="quotes-container fade-in">
                        <h3 style="margin-bottom: 16px; font-size: 1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Aggregated Quotes</h3>
                        ${quotesList}
                    </div>
                ` : bridgeState.loading ? '' : bridgeState.error ? `
                    <div class="card" style="padding: 20px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid var(--danger); border-radius: 12px;">
                        <div style="font-weight: 600; margin-bottom: 4px;">Aggregation Error</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">${bridgeState.error}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `
}

export function attachBridgeEvents(root) {
    const from = root.querySelector('#bridge-from')
    const to = root.querySelector('#bridge-to')
    const amount = root.querySelector('#bridge-amount')
    const btn = root.querySelector('#get-quotes-btn')

    if (from) from.onchange = (e) => bridgeState.fromChain = e.target.value
    if (to) to.onchange = (e) => bridgeState.toChain = e.target.value
    if (amount) amount.oninput = (e) => bridgeState.amount = e.target.value

    if (btn) {
        btn.onclick = async () => {
            if (bridgeState.loading) return;

            bridgeState.loading = true
            bridgeState.error = null
            bridgeState.quotes = []

            // Local UI refresh to show loading state
            btn.innerText = '🔍 AGGREGATING QUOTES...';
            btn.disabled = true;

            try {
                const results = await getBridge().getQuotes({
                    fromChain: bridgeState.fromChain,
                    toChain: bridgeState.toChain,
                    fromToken: bridgeState.fromChain === 'arweave' ? 'AR' : 'ETH',
                    toToken: bridgeState.toChain === 'ethereum' ? 'ETH' : 'USDC',
                    amount: bridgeState.amount
                });

                bridgeState.quotes = results;

                if (results.length === 0) {
                    bridgeState.error = 'No liquidity routes found for this chain pair. Try Arweave -> Ethereum.';
                }
            } catch (e) {
                console.error('[Bridge] Failed to fetch quotes:', e);
                bridgeState.error = e.message
            } finally {
                bridgeState.loading = false
                // Re-render full module
                const content = document.querySelector('.content-area')
                if (content && getState().activeModule === 'bridge') {
                    content.innerHTML = renderBridge(getState())
                    attachBridgeEvents(document)
                }
            }
        }
    }
}
