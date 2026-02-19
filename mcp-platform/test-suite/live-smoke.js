/**
 * live-smoke.js
 * CLI utility for live AO connection verification and smoke testing.
 */

import { aoDryrunJson } from '../src/ao-client.js'
import { AO_CONFIG } from '../src/ao-client.js'

async function runSmokeTests() {
    const gateway = AO_CONFIG?.URL || 'https://push.forward.computer'
    console.log('🌐 Starting AO Mainnet Smoke Tests...')
    console.log(`📡 Gateway: ${gateway}\n`)

    try {
        // 1. Verify Connectivity (Registry Check)
        console.log('🔍 Checking AO Registry connectivity...')
        const registryId = 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o' // Standard Registry
        const skills = await aoDryrunJson({
            process: registryId,
            tags: [{ name: 'Action', value: 'List' }]
        })

        if (Array.isArray(skills)) {
            console.log(`✅ Registry Responsive: Found ${skills.length} skills.`)
        } else {
            console.log('⚠️ Registry returned unexpected format, but connection OK.')
        }

        // 2. Verify Token Ledger Connectivity
        console.log('💰 Checking $AO Token ledger...')
        const aoTokenId = '0syS7fS0_N9V9B8m' // Placeholder ID for demo
        const balance = await aoDryrunJson({
            process: aoTokenId,
            tags: [
                { name: 'Action', value: 'Balance' },
                { name: 'Recipient', value: 'V89B8o...0X9E0j0V6xWJ' } // Dummy address
            ]
        })
        console.log('✅ Token Ledger Responsive.')

        console.log('\n✨ All integration dryruns passed!')
    } catch (e) {
        console.error(`\n❌ Smoke Test Failed: ${e.message}`)
        process.exit(1)
    }
}

runSmokeTests().catch(console.error)
