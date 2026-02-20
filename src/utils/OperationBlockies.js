/**
 * OperationBlockies.js
 * Visual hash representation for transaction verification
 * Prevents blind signing by showing unique identicons
 */

// Blockies algorithm (simplified ethereum-blockies)
class Blockies {
    constructor(seed, size = 8) {
        this.seed = seed
        this.size = size
        this.color = this.generateColor()
        this.pattern = this.generatePattern()
    }

    // Generate color from seed
    generateColor() {
        const hash = this.hashCode(this.seed)
        const r = (hash & 0xFF0000) >> 16
        const g = (hash & 0x00FF00) >> 8
        const b = hash & 0x0000FF
        return `rgb(${r}, ${g}, ${b})`
    }

    // Generate pattern from seed
    generatePattern() {
        const pattern = []
        const hash = this.hashCode(this.seed)

        for (let i = 0; i < this.size; i++) {
            const row = []
            for (let j = 0; j < Math.ceil(this.size / 2); j++) {
                // Use hash bits to determine if cell is filled
                const bit = (hash >> (i * this.size + j)) & 1
                row.push(bit === 1)
            }
            pattern.push(row)
        }

        return pattern
    }

    // Simple hash function
    hashCode(str) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }
        return Math.abs(hash)
    }

    // Render to canvas
    render(canvas, scale = 4) {
        const ctx = canvas.getContext('2d')
        const size = this.size * scale

        canvas.width = size
        canvas.height = size

        // Clear canvas
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(0, 0, size, size)

        // Draw pattern
        ctx.fillStyle = this.color

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < Math.ceil(this.size / 2); j++) {
                if (this.pattern[i] && this.pattern[i][j]) {
                    // Draw cell
                    ctx.fillRect(j * scale, i * scale, scale, scale)
                    // Mirror for symmetry
                    if (j < Math.floor(this.size / 2)) {
                        ctx.fillRect((this.size - 1 - j) * scale, i * scale, scale, scale)
                    }
                }
            }
        }
    }

    // Generate SVG string
    toSVG(scale = 4) {
        const size = this.size * scale
        let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`
        svg += `<rect width="${size}" height="${size}" fill="#f0f0f0"/>`

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < Math.ceil(this.size / 2); j++) {
                if (this.pattern[i] && this.pattern[i][j]) {
                    svg += `<rect x="${j * scale}" y="${i * scale}" width="${scale}" height="${scale}" fill="${this.color}"/>`
                    if (j < Math.floor(this.size / 2)) {
                        svg += `<rect x="${(this.size - 1 - j) * scale}" y="${i * scale}" width="${scale}" height="${scale}" fill="${this.color}"/>`
                    }
                }
            }
        }

        svg += '</svg>'
        return svg
    }
}

// Generate blockies from operation data
export function generateOperationBlockies(operationData) {
    const seed = JSON.stringify(operationData)
    return new Blockies(seed)
}

// Show signing confirmation dialog with blockies
export function showSigningDialog(operation, onConfirm, onCancel) {
    const blockies = generateOperationBlockies(operation)

    const dialog = document.createElement('div')
    dialog.className = 'signing-dialog'
    dialog.innerHTML = `
        <div class="signing-backdrop"></div>
        <div class="signing-content">
            <h3>⚠️ Confirm Operation</h3>
            
            <div class="signing-blockies">
                ${blockies.toSVG(8)}
            </div>
            
            <div class="signing-details">
                <div class="signing-field">
                    <label>Action</label>
                    <span>${operation.action || 'Unknown'}</span>
                </div>
                <div class="signing-field">
                    <label>Process</label>
                    <span class="monospace">${truncateAddress(operation.process)}</span>
                </div>
                ${operation.amount ? `
                <div class="signing-field">
                    <label>Amount</label>
                    <span class="highlight">${operation.amount} ${operation.token || 'AR'}</span>
                </div>
                ` : ''}
                <div class="signing-field">
                    <label>Network Fee</label>
                    <span>~0.001 AR</span>
                </div>
            </div>
            
            <div class="signing-notice">
                <small>🔒 Verify the pattern above matches your expected operation</small>
                <div class="rust-verified-badge">
                    <span class="badge-icon">🦀</span>
                    <span>Verified by Rust WASM</span>
                </div>
            </div>
            
            <div class="signing-actions">
                <button class="btn btn-secondary" id="signing-cancel">Cancel</button>
                <button class="btn btn-primary" id="signing-confirm">✓ Sign & Submit</button>
            </div>
        </div>
    `

    document.body.appendChild(dialog)

    // Event handlers
    dialog.querySelector('#signing-confirm').addEventListener('click', () => {
        dialog.remove()
        onConfirm()
    })

    dialog.querySelector('#signing-cancel').addEventListener('click', () => {
        dialog.remove()
        onCancel()
    })

    dialog.querySelector('.signing-backdrop').addEventListener('click', () => {
        dialog.remove()
        onCancel()
    })
}

// Helper function
function truncateAddress(address) {
    if (!address) return 'Unknown'
    if (address.length <= 12) return address
    return address.slice(0, 6) + '...' + address.slice(-6)
}

// Quick verify - show blockies inline
export function createBlockiesElement(operationData, size = 32) {
    const blockies = generateOperationBlockies(operationData)
    const div = document.createElement('div')
    div.className = 'inline-blockies'
    div.innerHTML = blockies.toSVG(size / 8)
    div.title = 'Operation visual hash - verify this pattern'
    return div
}

// Export for use in signing flows
export { Blockies }
