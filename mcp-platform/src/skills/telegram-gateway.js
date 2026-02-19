/**
 * telegram-gateway.js
 * AOPRISM Messaging Bridge for Telegram.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { aoDryrun, aoSend } from '../ao-client.js'

/**
 * Note: In a real production environment, we would use 'telegraf' or 'node-telegram-bot-api'.
 * To keep dependencies minimal for this platform, we implement a simple long-polling bridge.
 */

export async function startTelegramGateway() {
    const secretsPath = resolve(process.cwd(), 'gateway-secrets.json')
    if (!existsSync(secretsPath)) {
        console.error('[telegram-gateway] No gateway-secrets.json found. Run gateway_config first.')
        return
    }

    const secrets = JSON.parse(readFileSync(secretsPath, 'utf8'))
    const token = secrets.telegram

    if (!token) {
        console.error('[telegram-gateway] No Telegram token found.')
        return
    }

    console.log('[telegram-gateway] Starting AOPRISM bridge...')

    let lastUpdateId = 0

    // Long polling loop
    while (true) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`)
            const data = await response.json()

            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    lastUpdateId = update.update_id
                    if (update.message && update.message.text) {
                        await handleTelegramMessage(token, update.message)
                    }
                }
            }
        } catch (e) {
            console.error('[telegram-gateway] Polling error:', e.message)
            await new Promise(r => setTimeout(r, 5000))
        }
    }
}

async function handleTelegramMessage(token, message) {
    const chatId = message.chat.id
    const text = message.text

    console.log(`[telegram-gateway] Message from ${chatId}: ${text}`)

    // Routing logic:
    // /balance [token] -> check balance
    // /post [content] -> post to Prism Social
    // default -> search ecosystem

    let responseText = ""

    try {
        if (text.startsWith('/balance')) {
            const tokenAddress = text.split(' ')[1] || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'
            // We use dryrun for balance check
            const res = await aoDryrun({
                process: tokenAddress,
                tags: [{ name: 'Action', value: 'Balance' }]
            })
            responseText = `💎 Balance: ${res.Messages[0]?.Data || '0'}`
        }
        else if (text.startsWith('/post')) {
            const content = text.replace('/post ', '')
            const hub = process.env.PRISM_SOCIAL_HUB || 'B_B9N28fJ0X9E0j0V6xWJ-3s2_9fN_qK8f_R3V9B8o'
            await aoSend({
                process: hub,
                tags: [{ name: 'Action', value: 'Post' }],
                data: content
            })
            responseText = "✅ Post broadcasted to Prism Social Mesh!"
        }
        else {
            responseText = "🤖 AOPRISM Gateway\n\nCommands:\n/balance [id] - Check token balance\n/post [text] - Post to social mesh"
        }
    } catch (e) {
        responseText = `⚠️ Error: ${e.message}`
    }

    // Send reply back to Telegram
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: responseText
        })
    })
}
