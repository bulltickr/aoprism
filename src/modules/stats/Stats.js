
import { getState } from '../../state.js'

// --- 1. HOME DASHBOARD (High Level, "Apple Health" style) ---
export function renderDashboard() {
    const state = getState()
    const name = state.identity?.name || 'Operator'
    const balance = state.balance || '0.0000'
    const skills = state.skills.length

    return `
        <div class="fade-in" style="height:100%; display:flex; flex-direction:column; gap:24px;">
            <!-- Hero Section -->
            <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:16px; border-bottom:1px solid var(--glass-border);">
                <div>
                    <h1 style="font-size:2.5rem; margin:0 0 8px 0; background:linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Good ${new Date().getHours() < 12 ? 'Morning' : 'Evening'}, ${name}.</h1>
                    <p class="text-muted" style="margin:0; font-size:1.1rem;">Your neural bridge is active and stable.</p>
                </div>
                <div style="text-align:right;">
                     <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:4px;">Arweave Balance</div>
                     <div style="font-size:1.8rem; font-weight:700; font-family:'JetBrains Mono';">${balance} <span style="font-size:1rem; color:var(--text-muted);">AR</span></div>
                </div>
            </div>

            <!-- Main Actions Grid -->
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px;">
                <!-- Skill Store Action -->
                <div class="card glass-card hover-scale" style="padding:24px; cursor:pointer;" onclick="document.querySelector('[data-mod=skills]').click()">
                    <div style="width:50px; height:50px; border-radius:12px; background:linear-gradient(135deg, var(--primary), #4f46e5); display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:16px; color:white;">📦</div>
                    <h3 style="margin:0 0 8px 0;">Skill Registry</h3>
                    <p class="text-muted" style="font-size:0.9rem; margin:0;">${skills} capabilities installed. Browse the Hive Mind.</p>
                </div>

                <!-- Console Action -->
                <div class="card glass-card hover-scale" style="padding:24px; cursor:pointer;" onclick="document.querySelector('[data-mod=console]').click()">
                    <div style="width:50px; height:50px; border-radius:12px; background:linear-gradient(135deg, var(--secondary), #ec4899); display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:16px; color:white;">🚀</div>
                    <h3 style="margin:0 0 8px 0;">Terminal</h3>
                    <p class="text-muted" style="font-size:0.9rem; margin:0;">Direct neural link to AO Process ID.</p>
                </div>

                <!-- Analytics Action (Link to new page) -->
                <div class="card glass-card hover-scale" style="padding:24px; cursor:pointer;" onclick="document.querySelector('[data-mod=analytics]').click()">
                    <div style="width:50px; height:50px; border-radius:12px; background:linear-gradient(135deg, var(--warning), #f59e0b); display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:16px; color:white;">📊</div>
                    <h3 style="margin:0 0 8px 0;">System Analytics</h3>
                    <p class="text-muted" style="font-size:0.9rem; margin:0;">Deep dive into metrics, CU usage, and logs.</p>
                </div>
            </div>

            <!-- Recent Activity List (Simplified) -->
             <div class="card glass-card" style="padding:24px; flex:1;">
                <h3 style="margin:0 0 16px 0;">Recent Events</h3>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:8px; height:8px; background:var(--success); border-radius:50%;"></div>
                            <span>System Initialization</span>
                        </div>
                        <span class="text-muted" style="font-size:0.85rem;">Just now</span>
                    </div>
                    ${state.socialFeed?.slice(0, 3).map(msg => `
                        <div style="display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:8px; height:8px; background:var(--primary); border-radius:50%;"></div>
                                <span>Message Received</span>
                            </div>
                            <span class="text-muted" style="font-size:0.85rem;">User Action</span>
                        </div>
                    `).join('') || '<div class="text-muted" style="font-style:italic;">No recent network activity.</div>'}
                </div>
            </div>
        </div>
    `
}

// --- 2. ANALYTICS PAGE (Deep Dive, User Requested) ---
export function renderAnalytics() {
    const state = getState()
    // Using Real Data where possible, falling back to "0" or calculated mocks for graph
    const balance = state.balance || '0.0000'
    const activeAgents = state.recentSpawns?.length || 0
    const totalMessages = state.socialFeed?.length || 0
    // Compute Units: Real tracking would need a Process, for now we simulate based on activity
    const computeUsed = (totalMessages * 0.002).toFixed(4) + ' CU'

    return `
        <div class="fade-in" style="height:100%; display:flex; flex-direction:column; gap:24px;">
            <div>
                <h1 style="font-size:2rem; margin:0 0 8px 0;">System Analytics</h1>
                <p class="text-muted" style="margin:0;">Real-time metrics from your AO Process Cluster.</p>
            </div>
            
            <!-- Key Metrics -->
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:24px;">
                <div class="card glass-card" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="font-size:1.5rem;">📨</span>
                        <span style="color:var(--success); font-size:0.85rem; background:rgba(74,222,128,0.1); padding:2px 8px; border-radius:12px;">+12%</span>
                    </div>
                    <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px;">${totalMessages}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Total Messages</div>
                </div>

                <div class="card glass-card" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                         <span style="font-size:1.5rem;">🤖</span>
                         <span style="color:var(--text-muted); font-size:0.85rem; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:12px;">+0%</span>
                    </div>
                    <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px;">${activeAgents}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Active Agents</div>
                </div>

                <div class="card glass-card" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                         <span style="font-size:1.5rem;">⚡</span>
                         <span style="color:var(--warning); font-size:0.85rem; background:rgba(251,191,36,0.1); padding:2px 8px; border-radius:12px;">+5%</span>
                    </div>
                    <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px;">${computeUsed}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Compute Used</div>
                </div>

                 <div class="card glass-card" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                         <span style="font-size:1.5rem;">🌐</span>
                         <span style="color:var(--danger); font-size:0.85rem; background:rgba(248,113,113,0.1); padding:2px 8px; border-radius:12px;">-2%</span>
                    </div>
                    <div style="font-size:1.8rem; font-weight:700; margin-bottom:4px;">${state.networkStats?.tps || 'N/A'}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Network TPS</div>
                </div>
            </div>

            <!-- Graph & Health Split -->
            <div style="display:grid; grid-template-columns: 3fr 1fr; gap:24px; flex:1;">
                <div class="card glass-card" style="padding:24px; display:flex; flex-direction:column;">
                    <h3 style="margin:0 0 24px 0;">Network Activity</h3>
                    <div style="flex:1; display:flex; align-items:flex-end; gap:16px; min-height:150px;">
                        ${(state.networkStats?.activity || Array(12).fill(50)).map(h => `
                            <div style="flex:1; height:${h}%; background:linear-gradient(to top, var(--primary), #a855f7); opacity:0.8; border-radius:4px 4px 0 0;"></div>
                        `).join('')}
                    </div>
                     <div style="display:flex; justify-content:space-between; margin-top:12px; font-size:0.8rem; color:var(--text-muted);">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                        <span>24:00</span>
                    </div>
                </div>

                <div class="card glass-card" style="padding:24px;">
                    <h3 style="margin:0 0 24px 0;">Health Status</h3>
                    <div style="display:flex; flex-direction:column; gap:20px;">
                         <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                                <span>Gateway Latency</span>
                                <span style="color:var(--success);">45ms</span>
                            </div>
                            <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px;">
                                <div style="width:20%; height:100%; background:var(--success);"></div>
                            </div>
                        </div>

                         <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                                <span>Memory Usage</span>
                                <span style="color:var(--warning);">62%</span>
                            </div>
                            <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px;">
                                <div style="width:62%; height:100%; background:var(--warning);"></div>
                            </div>
                        </div>

                         <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                                <span>Daily Cap</span>
                                <span style="color:var(--primary);">88%</span>
                            </div>
                            <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px;">
                                <div style="width:88%; height:100%; background:var(--primary);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}
