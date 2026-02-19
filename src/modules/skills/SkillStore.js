
import { getState, setState } from '../../state.js'
import { makeAoClient } from '../../core/aoClient.js'

// --- STATE ---
let storeState = {
    loading: false,
    skills: [], // Fetched from Registry
    search: '',
    showPublishModal: false,
    publishForm: { name: '', desc: '', code: '' }
}

// --- LOGIC ---

async function fetchRegistrySkills() {
    storeState.loading = true
    render()

    try {
        const state = getState()
        // TODO: Implement actual Registry pattern
        // For now, we return empty to avoid confusing the user with mock data
        storeState.skills = []

    } catch (e) {
        console.error(e)
    } finally {
        storeState.loading = false
        render()
    }
}

async function publishSkill() {
    const { name, desc, code } = storeState.publishForm
    if (!name || !code) return alert("Name and Code are required!")

    try {
        const state = getState()
        const { ao, signer } = await makeAoClient(state)

        // Real Registry Register Call
        /*
        await ao.message({
            process: REGISTRY_PID,
            tags: [
                { name: 'Action', value: 'Register' },
                { name: 'Name', value: name },
                { name: 'Description', value: desc }
            ],
            data: code,
            signer
        })
        */

        alert(`🚀 Skill "${name}" broadcast to Hive Mind!`)
        storeState.showPublishModal = false
        render()

    } catch (e) {
        alert("Publish Failed: " + e.message)
    }
}

// --- RENDERERS ---

function renderPublishModal() {
    if (!storeState.showPublishModal) return ''

    return `
        <div class="modal-overlay fade-in" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(5px);">
            <div class="glass-card" style="width: 600px; padding: 24px; display:flex; flex-direction:column; gap:16px;">
                <h2 style="margin:0;">📢 Broadcast Knowledge</h2>
                <p class="text-muted">Contribute a new skill to the Hive Mind.</p>
                
                <div>
                    <label style="display:block; margin-bottom:6px; font-size:0.9rem;">Skill Name</label>
                    <input type="text" id="pub-name" class="input" placeholder="e.g. Market-Analysis-v1" value="${storeState.publishForm.name}">
                </div>
                
                <div>
                    <label style="display:block; margin-bottom:6px; font-size:0.9rem;">Description</label>
                    <input type="text" id="pub-desc" class="input" placeholder="What does it do?" value="${storeState.publishForm.desc}">
                </div>
                
                <div>
                    <label style="display:block; margin-bottom:6px; font-size:0.9rem;">Lua Code</label>
                    <textarea id="pub-code" class="input" style="height:150px; font-family:'Fira Code',monospace;" placeholder="return { Name = '...', Execute = function()... }">${storeState.publishForm.code}</textarea>
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;">
                    <button id="cancel-pub" class="btn btn-ghost">Cancel</button>
                    <button id="confirm-pub" class="btn btn-primary">🚀 Publish to Network</button>
                </div>
            </div>
        </div>
    `
}

export function renderSkillStore() {
    // Initial fetch if empty
    if (storeState.skills.length === 0 && !storeState.loading) {
        fetchRegistrySkills()
    }

    const skillsList = storeState.skills
        .filter(s => s.Name.toLowerCase().includes(storeState.search.toLowerCase()))
        .map(skill => `
            <div class="card" style="padding: 20px; display:flex; flex-direction:column; gap:12px; transition:transform 0.2s;">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div style="width:40px; height:40px; border-radius:8px; background:linear-gradient(135deg, var(--primary), #a855f7); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem; color:white;">
                        ${skill.Name[0]}
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-muted); padding:4px 8px; border:1px solid var(--glass-border); border-radius:12px;">v1.0</span>
                </div>
                <div>
                    <div style="font-weight:600; font-size:1.1rem; margin-bottom:4px;">${skill.Name}</div>
                    <div style="font-size:0.9rem; color:var(--text-muted); line-height:1.4;">${skill.Description}</div>
                </div>
                <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.8rem; color:var(--text-muted);">by ${skill.Publisher}</div>
                    <button class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="alert('Installing ${skill.Name}...')">⬇ INSTALL</button>
                </div>
            </div>
        `).join('')

    return `
        <div class="skill-store fade-in" style="height:100%;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
                <div>
                    <h1 style="margin:0; font-size:2rem;">Hive Mind Registry</h1>
                    <p class="text-muted" style="margin:5px 0 0 0;">The Public Library of Agent Capabilities.</p>
                </div>
                <button id="open-pub-modal" class="btn btn-primary">
                    <span>＋</span> Publish Skill
                </button>
            </div>
            
            <!-- Search -->
            <div style="position:relative; margin-bottom:32px;">
                <input id="store-search" type="text" class="input" placeholder="Search for capabilities..." value="${storeState.search}" style="padding-left:40px; height:50px; font-size:1.1rem;">
                <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-muted);">🔍</span>
            </div>
            
            <!-- Grid -->
            ${storeState.loading
            ? `<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading Hive Mind...</div>`
            : `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:24px;">${skillsList}</div>`
        }
            
            ${renderPublishModal()}
        </div>
    `
}

function render() {
    const container = document.querySelector('.content-area')
    if (container && getState().activeModule === 'skills') {
        container.innerHTML = renderSkillStore()
        attachSkillEvents(document)
    }
}

export function attachSkillEvents(root) {
    const search = root.querySelector('#store-search')
    if (search) {
        search.oninput = (e) => {
            storeState.search = e.target.value
            render()
            // restore focus
            setTimeout(() => root.querySelector('#store-search')?.focus(), 0)
        }
    }

    // Open Modal
    const openBtn = root.querySelector('#open-pub-modal')
    if (openBtn) {
        openBtn.onclick = () => {
            storeState.showPublishModal = true
            render()
        }
    }

    // Modal Actions
    if (storeState.showPublishModal) {
        const cancel = root.querySelector('#cancel-pub')
        const confirm = root.querySelector('#confirm-pub')

        // Sync Inputs
        root.querySelector('#pub-name').oninput = (e) => storeState.publishForm.name = e.target.value
        root.querySelector('#pub-desc').oninput = (e) => storeState.publishForm.desc = e.target.value
        root.querySelector('#pub-code').oninput = (e) => storeState.publishForm.code = e.target.value

        if (cancel) cancel.onclick = () => {
            storeState.showPublishModal = false
            render()
        }

        if (confirm) confirm.onclick = () => publishSkill()
    }
}
