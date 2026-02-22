
import { getState, setState } from '../../state.js'
import { makeAoClient } from '../../core/aoClient.js'

// --- REGISTRY PATTERN ---

class SkillRegistry {
    constructor() {
        this.cache = new Map()
        this.listeners = new Set()
        this.registryProcessId = 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'
    }

    subscribe(callback) {
        this.listeners.add(callback)
        return () => this.listeners.delete(callback)
    }

    notify() {
        this.listeners.forEach(cb => cb())
    }

    async fetch() {
        try {
            const state = getState()
            const { ao, signer } = await makeAoClient({
                jwk: state.jwk,
                publicKey: state.publicKey
            })

            const result = await ao.message({
                process: this.registryProcessId,
                tags: [
                    { name: 'Action', value: 'ListSkills' }
                ],
                signer
            })

            return this.parseResult(result)
        } catch (e) {
            console.warn('[SkillRegistry] Fetch failed, using cache:', e.message)
            return Array.from(this.cache.values())
        }
    }

    async register(name, description, code) {
        const state = getState()
        const { ao, signer } = await makeAoClient({
            jwk: state.jwk,
            publicKey: state.publicKey
        })

        await ao.message({
            process: this.registryProcessId,
            tags: [
                { name: 'Action', value: 'Register' },
                { name: 'Name', value: name },
                { name: 'Description', value: description }
            ],
            data: code,
            signer
        })

        const skill = { name, description, publisher: state.address }
        this.cache.set(name, skill)
        this.notify()
        return skill
    }

    async unregister(name) {
        const state = getState()
        const { ao, signer } = await makeAoClient({
            jwk: state.jwk,
            publicKey: state.publicKey
        })

        await ao.message({
            process: this.registryProcessId,
            tags: [
                { name: 'Action', value: 'Unregister' },
                { name: 'Name', value: name }
            ],
            signer
        })

        this.cache.delete(name)
        this.notify()
    }

    get(name) {
        return this.cache.get(name)
    }

    list() {
        return Array.from(this.cache.values())
    }

    parseResult(result) {
        const skills = []
        try {
            const messages = result?.Messages || []
            for (const msg of messages) {
                const data = msg?.Data
                if (data) {
                    const parsed = JSON.parse(data)
                    skills.push(parsed)
                    this.cache.set(parsed.name, parsed)
                }
            }
        } catch (e) {
            console.warn('[SkillRegistry] Parse error:', e.message)
        }
        return skills
    }
}

const registry = new SkillRegistry()

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
        storeState.skills = await registry.fetch()
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
        await registry.register(name, desc, code)
        alert(`🚀 Skill "${name}" registered to Hive Mind!`)
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
                
                <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px;" role="group" aria-label="Publish actions">
                    <button id="cancel-pub" class="btn btn-ghost" aria-label="Cancel publishing">Cancel</button>
                    <button id="confirm-pub" class="btn btn-primary" aria-label="Confirm and publish to network">🚀 Publish to Network</button>
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
            <article class="card" style="padding: 20px; display:flex; flex-direction:column; gap:12px; transition:transform 0.2s;" aria-labelledby="skill-${skill.Name}">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div style="width:40px; height:40px; border-radius:8px; background:linear-gradient(135deg, var(--primary), #a855f7); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem; color:white;" aria-hidden="true">
                        ${skill.Name[0]}
                    </div>
                    <span style="font-size:0.7rem; color:var(--text-muted); padding:4px 8px; border:1px solid var(--glass-border); border-radius:12px;" aria-label="Version 1.0">v1.0</span>
                </div>
                <div>
                    <h3 id="skill-${skill.Name}" style="font-weight:600; font-size:1.1rem; margin: 0 0 4px 0;">${skill.Name}</h3>
                    <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.4; margin: 0;">${skill.Description}</p>
                </div>
                <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.8rem; color:var(--text-muted);">by ${skill.Publisher}</div>
                    <button class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;" aria-label="Install ${skill.Name}" onclick="alert('Installing ${skill.Name}...')">⬇ INSTALL</button>
                </div>
            </article>
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

export { registry, SkillRegistry }
export default { render: renderSkillStore, init: initSkillStore }
