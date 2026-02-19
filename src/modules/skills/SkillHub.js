/**
 * SkillHub.js
 * The "Marketplace" for decentralized AO skills.
 */

import { getState, setState } from '../../state.js'
import { makeAoClient, sendAndGetResult } from '../../core/aoClient.js'
import { renderFormBySchema } from '../../components/FormBuilder.js'

async function fetchSkills() {
    const state = getState()
    setState({ loading: true })

    try {
        const { ao } = await makeAoClient({ URL: state.url })
        const result = await ao.dryrun({
            process: state.registryId,
            tags: [{ name: 'Action', value: 'ListSkills' }]
        })

        // Parse response
        const data = JSON.parse(result.Messages[0].Data)
        setState({ skills: data, loading: false })
    } catch (err) {
        console.error('Failed to fetch skills:', err)
        setState({ error: 'Failed to connect to AO registry', loading: false })
    }
}

export function renderSkillHub() {
    const state = getState()

    if (state.loading && state.skills.length === 0) {
        return `
      <div class="card">
        <h2 class="card-title">Scanning AO Registry...</h2>
        <div class="loading-spinner"></div>
      </div>
    `
    }

    const skillCards = state.skills.map(skill => `
    <div class="skill-card fade-in">
      <div class="skill-badge">${skill.Tags?.find(t => t.name === 'Category')?.value || 'General'}</div>
      <h3 class="skill-name">${skill.Name || 'Unnamed Skill'}</h3>
      <p class="skill-desc">${skill.Description || 'No description provided.'}</p>
      <button class="btn btn-ghost execute-btn" data-id="${skill.Id}">Execute Skill</button>
    </div>
  `).join('')

    return `
    <div class="skill-hub">
      <div class="hub-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div>
          <h2 class="card-title">AO Skill Marketplace</h2>
          <p class="text-muted">Discover and execute decentralized AI logic directly from the Arweave ecosystem.</p>
        </div>
        <button id="refresh-skills-btn" class="btn btn-ghost">Refresh</button>
      </div>
      
      <div class="skill-grid">
        ${skillCards || '<div class="card">No skills found in registry.</div>'}
      </div>
      
      <div id="execution-overlay" style="display:none;">
        <!-- Dynamic form mounts here via JS -->
      </div>
    </div>
  `
}

export function attachSkillEvents(root) {
    root.querySelector('#refresh-skills-btn')?.addEventListener('click', () => fetchSkills())

    root.querySelectorAll('.execute-btn').forEach(btn => {
        btn.onclick = () => {
            const skillId = btn.dataset.id
            const skill = getState().skills.find(s => s.Id === skillId)

            const overlay = root.querySelector('#execution-overlay')
            overlay.style.display = 'block'
            overlay.innerHTML = renderFormBySchema(skill)

            // Close logic
            overlay.querySelector('.btn-close-form').onclick = () => {
                overlay.style.display = 'none'
            }

            // Submit logic
            const form = overlay.querySelector('#active-skill-form')
            form.onsubmit = async (e) => {
                e.preventDefault()
                const { getFormData } = await import('../../components/FormBuilder.js')
                const args = getFormData(form)

                const resEl = overlay.querySelector('#skill-result')
                const resJson = overlay.querySelector('#skill-result-json')

                resEl.style.display = 'block'
                resJson.textContent = 'Executing on AO...'

                try {
                    const state = getState()
                    const { makeAoClient, sendAndGetResult } = await import('../../core/aoClient.js')
                    const { ao, signer } = await makeAoClient({ jwk: state.jwk, URL: state.url })

                    const result = await sendAndGetResult({
                        ao, signer,
                        process: skill.Process || skill.Id,
                        tags: [
                            { name: 'Action', value: 'Execute' },
                            { name: 'Arguments', value: JSON.stringify(args) }
                        ]
                    })

                    resJson.textContent = JSON.stringify(result.result, null, 2)
                } catch (err) {
                    resJson.textContent = `Error: ${err.message}`
                }
            }
        }
    })
}
