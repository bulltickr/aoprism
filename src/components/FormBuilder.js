/**
 * FormBuilder.js
 * Translates Skill Schemas into dynamic HTML forms.
 */

export function renderFormBySchema(skill) {
    // If no schema, provide a default JSON input
    const schema = skill.Schema || {
        type: 'object',
        properties: {
            data: { type: 'string', description: 'Data for the skill' }
        }
    }

    const fields = Object.entries(schema.properties || {}).map(([key, prop]) => {
        const type = prop.type === 'number' ? 'number' : 'text'
        return `
      <div class="form-group">
        <label class="label">${prop.description || key}</label>
        <input 
          type="${type}" 
          class="input skill-input" 
          data-key="${key}" 
          placeholder="${prop.example || ''}"
        />
      </div>
    `
    }).join('')

    return `
    <div class="skill-execution-form card fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 class="card-title" style="margin-bottom: 0;">Execute: ${skill.Name}</h3>
        <button class="btn-close-form btn btn-ghost" style="padding: 5px 10px;">✕</button>
      </div>
      
      <form id="active-skill-form">
        ${fields}
        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 10px;">
          Call AO Process
        </button>
      </form>
      
      <div id="skill-result" style="margin-top: 24px; display: none;">
        <label class="label">Result from AO</label>
        <pre class="response-json" id="skill-result-json"></pre>
      </div>
    </div>
  `
}

export function getFormData(formEl) {
    const data = {}
    formEl.querySelectorAll('.skill-input').forEach(input => {
        const val = input.value
        data[input.dataset.key] = input.type === 'number' ? Number(val) : val
    })
    return data
}
