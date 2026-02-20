/**
 * McpPanel.js
 * UI panel for MCP Server Hub controls and monitoring
 * Integrated into AOPRISM dashboard
 */

import { getState, setState } from '../../state.js'
import { 
    toggleMcpServer, 
    getMcpStatus, 
    getMcpTools,
    updateMcpConfig 
} from './mcp-client.js'

// Styles
const styles = `
.mcp-panel {
    padding: 16px;
    background: var(--surface-1, #1a1a2e);
    border-radius: 12px;
    color: var(--text-primary, #e0e0e0);
    font-family: system-ui, -apple-system, sans-serif;
}

.mcp-panel h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.mcp-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-weight: 500;
}

.mcp-status.online {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
}

.mcp-status.offline {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.mcp-status .indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.mcp-status.online .indicator {
    background: #22c55e;
}

.mcp-status.offline .indicator {
    background: #ef4444;
    animation: none;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.mcp-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.mcp-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
}

.mcp-btn-primary {
    background: #3b82f6;
    color: white;
}

.mcp-btn-primary:hover {
    background: #2563eb;
}

.mcp-btn-danger {
    background: #ef4444;
    color: white;
}

.mcp-btn-danger:hover {
    background: #dc2626;
}

.mcp-btn-secondary {
    background: #374151;
    color: #e0e0e0;
}

.mcp-btn-secondary:hover {
    background: #4b5563;
}

.mcp-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
}

.mcp-stat {
    background: rgba(255, 255, 255, 0.05);
    padding: 12px;
    border-radius: 8px;
}

.mcp-stat label {
    display: block;
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 4px;
}

.mcp-stat value {
    display: block;
    font-size: 20px;
    font-weight: 600;
    color: #e0e0e0;
}

.mcp-section {
    margin-bottom: 16px;
}

.mcp-section h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.mcp-tools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
}

.mcp-tool-chip {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #60a5fa;
    cursor: pointer;
    transition: all 0.2s;
}

.mcp-tool-chip:hover {
    background: rgba(59, 130, 246, 0.3);
}

.mcp-logs {
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 8px;
}

.mcp-log-entry {
    padding: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
}

.mcp-log-entry:last-child {
    border-bottom: none;
}

.mcp-log-entry.success {
    border-left: 3px solid #22c55e;
}

.mcp-log-entry.error {
    border-left: 3px solid #ef4444;
}

.mcp-log-time {
    color: #6b7280;
    font-size: 11px;
}

.mcp-log-tool {
    color: #60a5fa;
    font-weight: 500;
}

.mcp-config {
    background: rgba(255, 255, 255, 0.05);
    padding: 12px;
    border-radius: 8px;
}

.mcp-config-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.mcp-config-row:last-child {
    margin-bottom: 0;
}

.mcp-config label {
    min-width: 80px;
    font-size: 12px;
    color: #9ca3af;
}

.mcp-config input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 6px 10px;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 13px;
}

.mcp-config input:focus {
    outline: none;
    border-color: #3b82f6;
}

.mcp-empty {
    text-align: center;
    padding: 20px;
    color: #6b7280;
    font-size: 14px;
}

.mcp-clients-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.mcp-client-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
}

.mcp-client-name {
    font-weight: 500;
    font-size: 13px;
}

.mcp-client-time {
    font-size: 11px;
    color: #6b7280;
}
`

/**
 * Inject styles into document
 */
function injectStyles() {
    if (!document.getElementById('mcp-panel-styles')) {
        const styleEl = document.createElement('style')
        styleEl.id = 'mcp-panel-styles'
        styleEl.textContent = styles
        document.head.appendChild(styleEl)
    }
}

/**
 * Render the MCP Panel
 */
export function renderMcpPanel() {
    injectStyles()
    
    const state = getState()
    const isRunning = state.mcpRunning
    
    const tools = state.mcpToolsList || []
    const logs = state.mcpLogs || []
    const clients = state.mcpClients || []
    
    return `
        <div class="mcp-panel">
            <h3>🔌 MCP Server Hub</h3>
            
            <div class="mcp-status ${isRunning ? 'online' : 'offline'}">
                <div class="indicator"></div>
                <span>${isRunning ? '🟢 Connected' : '🔴 Disconnected'}</span>
                ${isRunning ? `<span style="margin-left: auto; font-size: 12px; opacity: 0.7">${state.mcpPort || 3002}</span>` : ''}
            </div>
            
            <div class="mcp-controls">
                <button id="mcp-toggle" class="mcp-btn ${isRunning ? 'mcp-btn-danger' : 'mcp-btn-primary'}">
                    ${isRunning ? 'Stop Server' : 'Start Server'}
                </button>
                <button id="mcp-refresh" class="mcp-btn mcp-btn-secondary" title="Refresh Status">
                    🔄
                </button>
            </div>
            
            ${isRunning ? `
                <div class="mcp-stats">
                    <div class="mcp-stat">
                        <label>Available Tools</label>
                        <value>${state.mcpTools || 34}</value>
                    </div>
                    <div class="mcp-stat">
                        <label>Requests</label>
                        <value>${state.mcpRequestCount || 0}</value>
                    </div>
                </div>
                
                ${tools.length > 0 ? `
                    <div class="mcp-section">
                        <h4>Tools</h4>
                        <div class="mcp-tools-grid">
                            ${tools.slice(0, 12).map(tool => `
                                <div class="mcp-tool-chip" title="${tool.description}">
                                    ${tool.name}
                                </div>
                            `).join('')}
                            ${tools.length > 12 ? `<div class="mcp-tool-chip">+${tools.length - 12} more</div>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${clients.length > 0 ? `
                    <div class="mcp-section">
                        <h4>Active Connections (${clients.length})</h4>
                        <div class="mcp-clients-list">
                            ${clients.slice(0, 5).map(client => `
                                <div class="mcp-client-item">
                                    <span class="mcp-client-name">${client.name || 'Unknown'}</span>
                                    <span class="mcp-client-time">${formatTime(client.connectedAt)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${logs.length > 0 ? `
                    <div class="mcp-section">
                        <h4>Recent Requests</h4>
                        <div class="mcp-logs">
                            ${logs.slice(0, 10).map(log => `
                                <div class="mcp-log-entry ${log.success ? 'success' : 'error'}">
                                    <div class="mcp-log-time">${formatTime(log.timestamp)}</div>
                                    <div>
                                        <span class="mcp-log-tool">${log.tool}</span>
                                        <span style="color: #6b7280; margin-left: 8px;">${log.success ? '✓' : '✗'}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            ` : `
                <div class="mcp-config">
                    <div class="mcp-config-row">
                        <label>Host:</label>
                        <input type="text" id="mcp-host" value="${state.mcpHost || 'localhost'}" placeholder="localhost">
                    </div>
                    <div class="mcp-config-row">
                        <label>Port:</label>
                        <input type="number" id="mcp-port" value="${state.mcpPort || 3002}" placeholder="3002">
                    </div>
                    <div class="mcp-config-row">
                        <label>API Key:</label>
                        <input type="password" id="mcp-api-key" value="${state.mcpApiKey || ''}" placeholder="Optional">
                    </div>
                </div>
            `}
        </div>
    `
}

/**
 * Attach event handlers to panel elements
 */
export function attachMcpEvents() {
    // Toggle button
    const toggleBtn = document.getElementById('mcp-toggle')
    if (toggleBtn) {
        toggleBtn.addEventListener('click', async () => {
            toggleBtn.disabled = true
            toggleBtn.textContent = '⏳ Working...'
            
            const result = await toggleMcpServer()
            
            if (result.success) {
                // Refresh panel
                refreshMcpPanel()
            } else {
                alert('Failed: ' + result.message)
                toggleBtn.disabled = false
                toggleBtn.textContent = getState().mcpRunning ? 'Stop Server' : 'Start Server'
            }
        })
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('mcp-refresh')
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true
            await refreshMcpPanel()
            refreshBtn.disabled = false
        })
    }
    
    // Config inputs (only when stopped)
    const state = getState()
    if (!state.mcpRunning) {
        const hostInput = document.getElementById('mcp-host')
        const portInput = document.getElementById('mcp-port')
        const apiKeyInput = document.getElementById('mcp-api-key')
        
        const saveConfig = () => {
            updateMcpConfig({
                host: hostInput?.value,
                port: parseInt(portInput?.value) || 3002,
                apiKey: apiKeyInput?.value || null
            })
        }
        
        hostInput?.addEventListener('change', saveConfig)
        portInput?.addEventListener('change', saveConfig)
        apiKeyInput?.addEventListener('change', saveConfig)
    }
}

/**
 * Refresh the MCP panel with current data
 */
async function refreshMcpPanel() {
    const state = getState()
    
    if (state.mcpRunning) {
        // Get fresh status
        const status = await getMcpStatus()
        
        if (status.running) {
            await setState({
                mcpTools: status.tools,
                mcpClients: status.sessions || []
            })
        }
        
        // Get tools list if not cached
        if (!state.mcpToolsList || state.mcpToolsList.length === 0) {
            const toolsData = await getMcpTools()
            await setState({ mcpToolsList: toolsData.tools || [] })
        }
    }
    
    // Re-render panel
    const panelEl = document.querySelector('.mcp-panel')
    if (panelEl) {
        const parent = panelEl.parentNode
        parent.innerHTML = renderMcpPanel()
        attachMcpEvents()
    }
}

/**
 * Format timestamp to relative time
 */
function formatTime(timestamp) {
    if (!timestamp) return 'Unknown'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)
    
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString()
}

/**
 * Initialize MCP panel when module loads
 */
export function initMcpPanel() {
    // Listen for state changes
    window.addEventListener('aoprism-mcp-started', () => {
        console.log('[MCP Panel] Server started')
        refreshMcpPanel()
    })
    
    window.addEventListener('aoprism-mcp-stopped', () => {
        console.log('[MCP Panel] Server stopped')
        refreshMcpPanel()
    })
    
    // Auto-refresh every 30 seconds if running
    setInterval(() => {
        const state = getState()
        if (state.mcpRunning) {
            refreshMcpPanel()
        }
    }, 30000)
}
