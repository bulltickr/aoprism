/**
 * AutoSave.js
 * Automatic form persistence using IndexedDB
 * Recovers unsaved work on crashes/reloads
 */

import { openDB } from 'idb'

const DB_NAME = 'aoprism-autosave'
const DB_VERSION = 1
const STORE_NAME = 'forms'

let db = null

// Initialize IndexedDB
async function initDB() {
    if (db) return db

    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
    })

    return db
}

// Save form data with debouncing
const saveQueue = new Map()
const DEBOUNCE_MS = 300

import { encryptData, decryptData } from '../core/rust-bridge.js'
import { getState } from '../state.js'

export async function autoSave(formId, data) {
    // Clear existing timeout for this form
    if (saveQueue.has(formId)) {
        clearTimeout(saveQueue.get(formId))
    }

    // Set new timeout
    const timeoutId = setTimeout(async () => {
        try {
            const db = await initDB()
            const state = getState()

            let dataToSave = data

            // [PHASE 7] Encrypt if key is available
            if (state.encryptionKey) {
                console.log(`[AutoSave] 🔒 Encrypting ${formId} via Rust...`)
                dataToSave = await encryptData(data, state.encryptionKey)
            }

            await db.put(STORE_NAME, {
                id: formId,
                data: dataToSave,
                timestamp: Date.now(),
                encrypted: !!state.encryptionKey
            })
            console.log(`[AutoSave] Saved ${formId}`)
        } catch (err) {
            console.error('[AutoSave] Failed to save:', err)
        }
        saveQueue.delete(formId)
    }, DEBOUNCE_MS)

    saveQueue.set(formId, timeoutId)
}

// Load saved form data
export async function loadAutoSave(formId) {
    try {
        const db = await initDB()
        const record = await db.get(STORE_NAME, formId)

        if (record) {
            const state = getState()

            // Check if data is fresh (less than 7 days old)
            const age = Date.now() - record.timestamp
            const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

            if (age < maxAge) {
                let data = record.data

                // [PHASE 7] Decrypt if encrypted and key matches
                if (record.encrypted && state.encryptionKey) {
                    console.log(`[AutoSave] 🔓 Decrypting ${formId} via Rust...`)
                    data = await decryptData(record.data, state.encryptionKey)
                }

                return {
                    data: data,
                    timestamp: record.timestamp,
                    age: Math.round(age / 1000 / 60) // minutes
                }
            } else {
                // Delete old data
                await db.delete(STORE_NAME, formId)
            }
        }
    } catch (err) {
        console.error('[AutoSave] Failed to load:', err)
    }

    return null
}

// Delete saved form data
export async function clearAutoSave(formId) {
    try {
        const db = await initDB()
        await db.delete(STORE_NAME, formId)
        console.log(`[AutoSave] Cleared ${formId}`)
    } catch (err) {
        console.error('[AutoSave] Failed to clear:', err)
    }
}

// Check for recoverable forms on page load
export async function checkForRecovery() {
    try {
        const db = await initDB()
        const allRecords = await db.getAll(STORE_NAME)

        const recoverable = allRecords
            .filter(record => {
                const age = Date.now() - record.timestamp
                return age < 24 * 60 * 60 * 1000 // Less than 24 hours
            })
            .map(record => ({
                id: record.id,
                age: Math.round((Date.now() - record.timestamp) / 1000 / 60) // minutes
            }))

        return recoverable
    } catch (err) {
        console.error('[AutoSave] Failed to check recovery:', err)
        return []
    }
}

// Setup auto-save for a form element
export function setupAutoSave(formId, formElement, fields) {
    // Load saved data on setup
    loadAutoSave(formId).then(saved => {
        if (saved) {
            // Dispatch event for UI to handle recovery prompt
            window.dispatchEvent(new CustomEvent('aoprism-autosave-available', {
                detail: { formId, data: saved.data, age: saved.age }
            }))
        }
    })

    // Watch for changes
    fields.forEach(field => {
        const element = formElement.querySelector(`[name="${field}"]`)
        if (element) {
            element.addEventListener('input', () => {
                const data = {}
                fields.forEach(f => {
                    const el = formElement.querySelector(`[name="${f}"]`)
                    if (el) data[f] = el.value
                })
                autoSave(formId, data)
            })
        }
    })

    // Clear on successful submit
    formElement.addEventListener('submit', () => {
        clearAutoSave(formId)
    })
}

// Recovery dialog
export function showRecoveryDialog(formId, data, age) {
    const minutes = age < 60 ? `${age}m` : `${Math.round(age / 60)}h`

    const dialog = document.createElement('div')
    dialog.className = 'recovery-dialog'
    dialog.innerHTML = `
        <div class="recovery-backdrop"></div>
        <div class="recovery-content">
            <div class="recovery-icon">💾</div>
            <h3>Recover Unsaved Changes?</h3>
            <p>Found autosaved data from ${minutes} ago.</p>
            <div class="recovery-actions">
                <button class="btn btn-primary" id="recovery-restore">Restore</button>
                <button class="btn btn-secondary" id="recovery-discard">Discard</button>
            </div>
        </div>
    `

    document.body.appendChild(dialog)

    return new Promise((resolve) => {
        dialog.querySelector('#recovery-restore').addEventListener('click', () => {
            dialog.remove()
            resolve(true)
        })

        dialog.querySelector('#recovery-discard').addEventListener('click', () => {
            clearAutoSave(formId)
            dialog.remove()
            resolve(false)
        })

        dialog.querySelector('.recovery-backdrop').addEventListener('click', () => {
            dialog.remove()
            resolve(false)
        })
    })
}
