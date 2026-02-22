/**
 * IndexedDB.js
 * IndexedDB-based persistence layer for AOPRISM
 * Provides unlimited storage for skills, memories, and cache
 */

import { openDB } from 'idb'

const DB_NAME = 'aoprism-db'
const DB_VERSION = 1
const STORES = ['state', 'memories', 'skills', 'cache']

let db = null

export async function initIDB() {
    if (db) return db

    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            STORES.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'key' })
                }
            })
        }
    })

    return db
}

export async function saveToIDB(storeName, key, data) {
    try {
        const database = await initIDB()
        await database.put(storeName, {
            key,
            data,
            timestamp: Date.now()
        })
        console.log(`[IDB] Saved to ${storeName}:${key}`)
    } catch (err) {
        console.error(`[IDB] Failed to save ${storeName}:${key}:`, err)
        throw err
    }
}

export async function loadFromIDB(storeName, key) {
    try {
        const database = await initIDB()
        const record = await database.get(storeName, key)
        return record ? record.data : null
    } catch (err) {
        console.error(`[IDB] Failed to load ${storeName}:${key}:`, err)
        return null
    }
}

export async function deleteFromIDB(storeName, key) {
    try {
        const database = await initIDB()
        await database.delete(storeName, key)
        console.log(`[IDB] Deleted from ${storeName}:${key}`)
    } catch (err) {
        console.error(`[IDB] Failed to delete ${storeName}:${key}:`, err)
    }
}

export async function getAllFromIDB(storeName) {
    try {
        const database = await initIDB()
        const records = await database.getAll(storeName)
        return records.map(r => ({ key: r.key, data: r.data, timestamp: r.timestamp }))
    } catch (err) {
        console.error(`[IDB] Failed to get all from ${storeName}:`, err)
        return []
    }
}

export async function clearStore(storeName) {
    try {
        const database = await initIDB()
        await database.clear(storeName)
        console.log(`[IDB] Cleared ${storeName}`)
    } catch (err) {
        console.error(`[IDB] Failed to clear ${storeName}:`, err)
    }
}

export async function migrate() {
    console.log('[IDB] Starting migration from localStorage...')
    
    const migrated = { state: false, memories: false, skills: false }

    try {
        // Migrate main state
        const localState = localStorage.getItem('aoprism:state')
        if (localState) {
            await saveToIDB('state', 'main', JSON.parse(localState))
            migrated.state = true
            console.log('[IDB] Migrated state')
        }

        // Migrate memories (if stored in localStorage)
        const localMemories = localStorage.getItem('aoprism:memories')
        if (localMemories) {
            await saveToIDB('memories', 'all', JSON.parse(localMemories))
            migrated.memories = true
            console.log('[IDB] Migrated memories')
        }

        // Migrate skills (if stored in localStorage)
        const localSkills = localStorage.getItem('aoprism:skills')
        if (localSkills) {
            await saveToIDB('skills', 'all', JSON.parse(localSkills))
            migrated.skills = true
            console.log('[IDB] Migrated skills')
        }

        console.log('[IDB] Migration complete:', migrated)
        return migrated
    } catch (err) {
        console.error('[IDB] Migration failed:', err)
        return migrated
    }
}

export async function getIDBStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        return {
            usage: estimate.usage,
            quota: estimate.quota,
            usagePercent: Math.round((estimate.usage / estimate.quota) * 100)
        }
    }
    return null
}
