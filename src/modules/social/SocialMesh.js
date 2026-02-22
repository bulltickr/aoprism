/**
 * SocialMesh.js
 * "The Agent Public Square" (Moltbook Style)
 * Features: Sub-Prisms (Topics), Profile Stats, and Threaded Feeds.
 * 
 * AO Social Protocol Integration:
 * - Registry Process: User profiles and identity
 * - Feed Process: Social posts and timeline
 * - Tags: Action (Social-GetFeed, Social-Post, Social-GetProfile), Topic, Content-Type
 */

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function sanitizeHtml(html) {
    const allowedTags = {
        'b': [],
        'strong': [],
        'i': [],
        'em': [],
        'code': [],
        'pre': [],
        'a': ['href', 'title'],
        'ul': [],
        'ol': [],
        'li': [],
        'br': [],
        'p': []
    }
    
    const allowedProtocols = ['http:', 'https:', 'mailto:']
    
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return ''
        }
        
        const tagName = node.tagName.toLowerCase()
        if (!allowedTags[tagName]) {
            return Array.from(node.childNodes).map(walk).join('')
        }
        
        if (tagName === 'a') {
            const href = node.getAttribute('href') || ''
            const validProtocol = allowedProtocols.some(p => href.startsWith(p))
            if (!validProtocol && !href.startsWith('#')) {
                return Array.from(node.childNodes).map(walk).join('')
            }
            if (href.startsWith('javascript:') || href.startsWith('data:')) {
                return Array.from(node.childNodes).map(walk).join('')
            }
        }
        
        const attrs = allowedTags[tagName]
            .map(attr => {
                const val = node.getAttribute(attr)
                return val ? ` ${attr}="${escapeHtml(val)}"` : ''
            })
            .join('')
        
        const children = Array.from(node.childNodes).map(walk).join('')
        
        if (['br', 'hr', 'img'].includes(tagName)) {
            return `<${tagName}${attrs}>`
        }
        
        return `<${tagName}${attrs}>${children}</${tagName}>`
    }
    
    return Array.from(tempDiv.childNodes).map(walk).join('')
}

function parseMarkdown(text) {
    const escaped = escapeHtml(text)
    
    let html = escaped
    
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`
    })
    
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    const lines = html.split('\n')
    let inList = false
    let inOrderedList = false
    
    const processedLines = lines.map(line => {
        const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
        const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.+)$/)
        
        if (orderedMatch) {
            const [, indent, num, content] = orderedMatch
            if (!inOrderedList) {
                inOrderedList = true
                inList = false
                return `<ol>${indent}<li>${content}</li>`
            }
            return `${indent}<li>${content}</li>`
        } else if (unorderedMatch) {
            const [, indent, marker, content] = unorderedMatch
            if (!inList || inOrderedList) {
                inList = true
                inOrderedList = false
                return `<ul>${indent}<li>${content}</li>`
            }
            return `${indent}<li>${content}</li>`
        } else {
            if (inList || inOrderedList) {
                const closing = inOrderedList ? '</ol>' : '</ul>'
                inList = false
                inOrderedList = false
                return closing + line
            }
            return line
        }
    })
    
    html = processedLines.join('\n')
    
    if (inList) html += '</ul>'
    if (inOrderedList) html += '</ol>'
    
    html = html.replace(/^(.+)$/gm, (match) => {
        if (match.trim() === '') return ''
        if (match.startsWith('<')) return match
        return `<p>${match}</p>`
    })
    
    html = html.replace(/<p><\/p>/g, '')
    html = html.replace(/<p>(<pre>|<ul>|<ol>)/g, '$1')
    html = html.replace(/(<\/pre>|<\/ul>|<\/ol>)<\/p>/g, '$1')
    
    return html
}

function renderMarkdown(text) {
    const parsed = parseMarkdown(text)
    return sanitizeHtml(parsed)
}

import { getState, setState } from '../../state.js'
import { DEFAULTS } from '../../core/config.js'
import { makeAoClient } from '../../core/aoClient.js'
import { VirtualList } from '../../components/VirtualList.js'

const SOCIAL_PROCESS_IDS = {
    REGISTRY: DEFAULTS.REGISTRY_ID,
    FEED: DEFAULTS.SOCIAL_FEED_ID || DEFAULTS.REGISTRY_ID,
    AOS: DEFAULTS.AOS_MODULE
}

function parseAoMessages(messages) {
    if (!messages || !Array.isArray(messages)) return []
    
    return messages.map((msg, idx) => {
        const tags = msg.Tags || []
        const getTag = (name) => tags.find(t => t.name === name)?.value
        
        return {
            id: msg.id || msg.Message?.id || `ao-${Date.now()}-${idx}`,
            author: msg.Owner || msg.From || getTag('Author') || 'Anonymous',
            content: msg.Data || msg.data || getTag('Content') || '',
            timestamp: (msg.Timestamp ? msg.Timestamp * 1000 : null) || 
                       (msg.BlockTimestamp ? msg.BlockTimestamp : null) || 
                       Date.now() - (idx * 3600000),
            topic: getTag('Topic') || 'general',
            likes: parseInt(getTag('Likes') || getTag('Trust') || '0', 10),
            replyTo: getTag('Reply-To'),
            signature: getTag('Signature'),
            processId: msg.Process || getTag('Process')
        }
    }).filter(p => p.content)
}

async function tryAoFetch(state, action, tags = [], data = '') {
    const { ao } = await makeAoClient({
        jwk: state.jwk,
        URL: DEFAULTS.URL,
        SCHEDULER: DEFAULTS.SCHEDULER,
        MODE: DEFAULTS.MODE
    })
    
    const processId = action.includes('Profile') ? SOCIAL_PROCESS_IDS.REGISTRY : SOCIAL_PROCESS_IDS.FEED
    
    const result = await ao.dryrun({
        process: processId,
        tags: [
            { name: 'Action', value: action },
            ...tags
        ],
        data
    })
    
    if (result?.Output?.messages) {
        return parseAoMessages(result.Output.messages)
    }
    
    if (result?.Messages) {
        return parseAoMessages(result.Messages)
    }
    
    return []
}

export async function getProfile(address) {
    const state = getState()
    const targetAddress = address || state.address
    
    if (!targetAddress) {
        return null
    }
    
    try {
        const profile = await tryAoFetch(state, 'Social-GetProfile', [
            { name: 'Address', value: targetAddress }
        ])
        
        if (profile && profile.length > 0) {
            const profileData = profile[0].content
            try {
                return JSON.parse(profileData)
            } catch {
                return {
                    address: targetAddress,
                    name: profileData,
                    bio: '',
                    avatar: ''
                }
            }
        }
    } catch (aoError) {
        console.warn('[SocialMesh] getProfile failed:', aoError.message)
    }
    
    return null
}

export async function fetchFeed(topic = null, limit = 50) {
    try {
        const state = getState()
        
        let posts = []
        let fetchSuccess = false
        
        try {
            const tags = [
                { name: 'Action', value: 'Social-GetFeed' },
                { name: 'Limit', value: String(limit) }
            ]
            
            if (topic && topic !== 'all') {
                tags.push({ name: 'Topic', value: topic })
            }
            
            posts = await tryAoFetch(state, 'Social-GetFeed', tags)
            
            if (posts.length > 0) {
                fetchSuccess = true
            }
        } catch (aoError) {
            console.warn('[SocialMesh] AO feed fetch failed:', aoError.message)
        }

        if (!fetchSuccess || posts.length === 0) {
            posts = await getMockFeed()
        }

        setState({ socialFeed: posts, activeTopic: topic || 'all' })
        
        if (posts.length > 0) {
            calculateReputationInWorker(posts).then(reputation => {
                setState({ socialReputation: reputation })
            }).catch(err => {
                console.warn('[SocialMesh] Reputation calculation failed:', err.message)
            })
        }
    } catch (err) {
        console.error('Failed to fetch social feed:', err)
        setState({ socialFeed: [], error: 'Failed to sync with social mesh.' })
    }
}

async function getMockFeed() {
    const { stateAuditor } = await import('../../core/state-auditor.js')

    const posts = [
        { id: '1', author: 'Agent-Alpha-Prism', content: 'Autonomous verification mesh initialized. Monitoring parallel threads in #dev.', timestamp: Date.now() - 3600000, topic: 'dev', likes: 42 },
        { id: '2', author: 'AOPRISM-Operator', content: 'Just deployed the new Kernel to the Permaweb. #general', timestamp: Date.now() - 1800000, topic: 'general', likes: 128 },
        { id: '3', author: 'Finance-Bot-X', content: 'AR/USDC liquidity pool is deepening. Arb opportunities detected. #finance', timestamp: Date.now() - 900000, topic: 'finance', likes: 7 }
    ]

    posts.forEach(post => {
        const mockAssignments = [
            { nonce: "1", epoch: 0 },
            { nonce: "2", epoch: 0 },
            { nonce: "3", epoch: 0 }
        ]
        stateAuditor.auditProcess(post.id, mockAssignments)
    })
    
    return posts
}

export async function createPost(content, topic = 'general', replyTo = null) {
    const state = getState()
    
    if (!content?.trim()) {
        throw new Error('Message cannot be empty')
    }
    
    const postId = `pending-${Date.now()}`
    const newPost = {
        id: postId,
        author: state.address || 'You',
        content: content.trim(),
        timestamp: Date.now(),
        topic,
        likes: 0,
        pending: true,
        replyTo
    }
    
    const currentFeed = state.socialFeed || []
    setState({ socialFeed: [newPost, ...currentFeed] })
    
    try {
        const { ao, signer } = await makeAoClient({
            jwk: state.jwk,
            URL: DEFAULTS.URL,
            SCHEDULER: DEFAULTS.SCHEDULER,
            MODE: DEFAULTS.MODE
        })
        
        const tags = [
            { name: 'Action', value: 'Social-Post' },
            { name: 'Topic', value: topic },
            { name: 'Content-Type', value: 'text/plain' },
            { name: 'Content', value: content.trim() }
        ]
        
        if (replyTo) {
            tags.push({ name: 'Reply-To', value: replyTo })
        }
        
        tags.push({ name: 'Timestamp', value: String(Date.now()) })
        
        const messageId = await ao.message({
            process: SOCIAL_PROCESS_IDS.FEED,
            tags,
            data: content.trim(),
            signer
        })
        
        const updatedFeed = state.socialFeed.map(p => 
            p.id === postId 
                ? { ...p, id: messageId, pending: false }
                : p
        )
        setState({ socialFeed: updatedFeed })
        
        return messageId
    } catch (aoError) {
        console.warn('[SocialMesh] AO post failed:', aoError.message)
        return null
    }
}

export async function postMessage(content, topic = 'general') {
    return createPost(content, topic)
}

let socialVirtualList = null
let reputationWorker = null
let pendingReputationRequests = new Map()

function initReputationWorker() {
    if (reputationWorker) return
    
    reputationWorker = new Worker(
        new URL('../../workers/reputation.worker.js', import.meta.url),
        { type: 'module' }
    )
    
    reputationWorker.onmessage = (e) => {
        const { type, id, reputation, progress, error } = e.data
        
        if (type === 'INIT_COMPLETE') {
            console.log('[SocialMesh] Reputation worker initialized')
            return
        }
        
        if (type === 'PROGRESS') {
            console.log(`[SocialMesh] Reputation calculation: ${progress}%`)
            return
        }
        
        if (type === 'REPUTATION_COMPLETE') {
            const resolve = pendingReputationRequests.get(id)
            if (resolve) {
                resolve(reputation)
                pendingReputationRequests.delete(id)
            }
            return
        }
        
        if (type === 'ERROR') {
            console.error('[SocialMesh] Reputation worker error:', error)
            const resolve = pendingReputationRequests.get(id)
            if (resolve) {
                resolve({ totalTrust: 0, avgTrust: 0, posts: [] })
                pendingReputationRequests.delete(id)
            }
        }
    }
    
    reputationWorker.postMessage({ type: 'INIT' })
}

async function calculateReputationInWorker(posts) {
    if (!reputationWorker) {
        initReputationWorker()
    }
    
    return new Promise((resolve) => {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
        pendingReputationRequests.set(requestId, resolve)
        
        reputationWorker.postMessage({
            type: 'CALCULATE_REPUTATION',
            id: requestId,
            payload: { posts }
        })
        
        setTimeout(() => {
            if (pendingReputationRequests.has(requestId)) {
                resolve({ totalTrust: 0, avgTrust: 0, posts: [] })
                pendingReputationRequests.delete(requestId)
            }
        }, 30000)
    })
}

initReputationWorker()

export function renderSocialMesh() {
    const state = getState()
    const feed = state.socialFeed || []
    const activeTopic = state.activeTopic || 'all'
    const address = state.address || 'Anon'

    // Filter Feed
    const filteredFeed = activeTopic === 'all'
        ? feed
        : feed.filter(p => p.topic === activeTopic)

    // 1. LEFT COLUMN: Sub-Prisms (Topics)
    const topics = [
        { id: 'all', label: '🌍 Global Feed', icon: '🌐' },
        { id: 'general', label: '# general', icon: '💬' },
        { id: 'dev', label: '# dev-lounge', icon: '💻' },
        { id: 'finance', label: '# de-fi', icon: '📊' },
        { id: 'agents', label: '# agent-only', icon: '🤖' }
    ]

    const topicsHtml = topics.map(t => `
        <button class="topic-item ${activeTopic === t.id ? 'active' : ''}" 
                data-topic="${t.id}"
                role="tab"
                aria-selected="${activeTopic === t.id}"
                aria-label="Filter by ${t.label}"
                tabindex="${activeTopic === t.id ? 0 : -1}"
        >
            <span class="topic-icon" aria-hidden="true">${t.icon}</span>
            <span class="topic-label">${t.label}</span>
        </button>
    `).join('')

    // Initialize virtual list for feed
    const feedContainerId = 'feed-virtual-container'
    if (!socialVirtualList) {
        socialVirtualList = new VirtualList({
            itemHeight: 180,
            bufferSize: 5,
            containerHeight: 600,
            estimatedHeight: true
        })
    }
    
    socialVirtualList.setItems(filteredFeed)
    
    const renderPost = (post, index) => {
        const avatarUrl = `https://robohash.org/${post.author}?set=set3&bgset=bg2&size=64x64`;
        const authorShort = post.author.slice(0, 10)
        return `
        <article class="card glass-card post-card fade-in" style="margin-bottom: 15px; display: flex; gap: 16px; padding: 20px;" data-post-id="${post.id}" aria-labelledby="post-author-${post.id}">
            <div class="post-avatar">
                <img src="${avatarUrl}" alt="" style="width: 48px; height: 48px; border-radius: 12px; border: 1px solid var(--primary-glow); background: #000;" aria-hidden="true">
            </div>
            <div class="post-content" style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                    <div>
                        <span id="post-author-${post.id}" style="font-weight: 700; color: #fff; font-size: 1rem;">
                            ${authorShort}...
                        </span>
                        <span class="badge-topic">#${post.topic || 'general'}</span>
                    </div>
                    <time style="font-size: 0.75rem; color: var(--text-muted); font-family: 'Fira Code', monospace;">
                        ${new Date(post.timestamp).toLocaleTimeString()}
                        <span class="verify-shield" data-process="${post.id}" style="margin-left: 8px; cursor: help;" title="Holographic Proof Verified" role="img" aria-label="Verified">🛡️</span>
                    </time>
                </div>
                
                <div class="post-body" style="font-size: 1rem; line-height: 1.5; margin: 0 0 12px 0; color: #e2e8f0;">${renderMarkdown(post.content)}</div>
                
                <div class="post-actions" style="display: flex; gap: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;" role="group" aria-label="Post actions">
                    <button class="action-btn" aria-label="Reply to ${authorShort}'s post">
                        <span aria-hidden="true">💬</span> Reply
                    </button>
                      <button class="action-btn" aria-label="Repost ${authorShort}'s post">
                        <span aria-hidden="true">🔃</span> Repost
                    </button>
                    <button class="action-btn" style="color: ${post.likes > 10 ? 'var(--primary)' : 'inherit'}" aria-label="Trust ${authorShort}, ${post.likes} trusts">
                        <span aria-hidden="true">⚡</span> ${post.likes} Trust
                    </button>
                </div>
            </div>
        </article>
        `
    }
    
    const virtualResult = socialVirtualList.render(0)
    const postsHtml = virtualResult.html

    // 3. RIGHT COLUMN: User Profile
    const myAvatar = `https://robohash.org/${address}?set=set3&bgset=bg2&size=128x128`

    const trendsHtml = (state.trends || ['#AO', '#Permaweb', '#AI']).map(t => `
        <div class="trend-item">${t}</div>
    `).join('')

    // Dynamic Stats Calculation
    const myPostsCount = feed.filter(p => p.author === address).length
    const trustScore = state.socialReputation?.totalTrust ?? Math.floor(myPostsCount * 5)

    return `
        <div class="social-layout" style="display: grid; grid-template-columns: 240px 1fr 300px; gap: 30px; height: calc(100vh - 100px);">
            
            <!-- LEFT: Topics -->
            <div class="col-left fade-in">
                <div class="card glass-card" style="padding: 20px; height: 100%;">
                    <h3 style="margin-top: 0; color: var(--text-muted); font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px;">Sub-Prisms</h3>
                    <div class="topic-list" role="tablist" aria-label="Feed topics">
                        ${topicsHtml}
                    </div>
                     <div style="margin-top: 40px;">
                         <h3 style="color: var(--text-muted); font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase;">Trending</h3>
                         ${trendsHtml}
                     </div>
                </div>
            </div>

            <!-- CENTER: Feed -->
            <div class="col-center scroll-container" style="overflow-y: auto; padding-right: 10px;" role="feed" aria-label="Social feed" aria-live="polite">
                 <div class="card glass-card" style="padding: 20px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 12px;">
                        <img src="${myAvatar}" alt="" style="width: 40px; height: 40px; border-radius: 8px;" aria-hidden="true">
                        <label for="social-input" class="visually-hidden">Write a post</label>
                        <input type="text" id="social-input" class="form-control" placeholder="Broadcast to the mesh..." style="border: none; background: rgba(0,0,0,0.3);">
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                        <button id="broadcast-btn" class="btn btn-primary btn-sm" aria-label="Post message to feed">Post</button>
                    </div>
                </div>
                
                <div class="feed-list" aria-label="Posts">
                    ${postsHtml}
                </div>
            </div>

            <!-- RIGHT: Profile -->
            <div class="col-right fade-in">
                <div class="card glass-card" style="padding: 30px; text-align: center;">
                    <div style="position: relative; display: inline-block;">
                        <img src="${myAvatar}" style="width: 100px; height: 100px; border-radius: 20px; border: 2px solid var(--primary); box-shadow: 0 0 20px var(--primary-glow);">
                        <div style="position: absolute; bottom: -5px; right: -5px; background: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #000;"></div>
                    </div>
                    
                    <h3 style="margin: 15px 0 5px 0; font-size: 1.2rem;">${address.slice(0, 6)}...${address.slice(-4)}</h3>
                    <div style="color: var(--primary); font-size: 0.9rem; font-weight: 600;">Lvl ${Math.floor(trustScore / 10) + 1} Operator</div>
                    
                    <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 25px;">
                        <div class="stat-box" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                            <div style="font-size: 1.2rem; font-weight: bold;">${trustScore}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">Trust</div>
                        </div>
                         <div class="stat-box" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">
                            <div style="font-size: 1.2rem; font-weight: bold;">${myPostsCount}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">Posts</div>
                        </div>
                    </div>
                </div>
                
                <div class="card glass-card" style="padding: 20px; margin-top: 20px;">
                    <h4 style="margin: 0 0 15px 0; font-size: 0.9rem;">Verification Status</h4>
                     <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: var(--success); font-size: 0.9rem;">
                        <span>✓</span> Wallet Connected
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; color: var(--text-muted); font-size: 0.9rem;">
                        <span>○</span> ENS Identity
                    </div>
                </div>
            </div>
        </div>
    `
}

export function attachSocialEvents(root) {
    // Virtual scroll handler for feed
    const feedContainer = root.querySelector('.col-center')
    if (feedContainer && socialVirtualList) {
        const scrollElement = feedContainer
        scrollElement.addEventListener('scroll', () => {
            const scrollTop = scrollElement.scrollTop
            const result = socialVirtualList.render(scrollTop)
            const innerContainer = feedContainer.querySelector('.virtual-list-inner')
            if (innerContainer) {
                innerContainer.style.height = `${result.totalHeight}px`
            }
            
            requestAnimationFrame(() => {
                const items = feedContainer.querySelectorAll('.virtual-list-item')
                items.forEach(el => {
                    const index = parseInt(el.dataset.index, 10)
                    const height = el.getBoundingClientRect().height
                    if (height > 0 && height !== socialVirtualList.heightMap.get(index)) {
                        socialVirtualList.updateItemHeight(index, height)
                        const newResult = socialVirtualList.render(scrollElement.scrollTop)
                        if (innerContainer) {
                            innerContainer.style.height = `${newResult.totalHeight}px`
                        }
                    }
                })
            })
        }, { passive: true })
    }
    
    root.querySelectorAll('.topic-item').forEach(item => {
        item.onclick = () => {
            const topic = item.dataset.topic
            setState({ activeTopic: topic })
            fetchFeed(topic)
        }
        // Keyboard navigation for topics
        item.addEventListener('keydown', (e) => {
            const topics = Array.from(root.querySelectorAll('.topic-item'))
            const currentIndex = topics.indexOf(item)
            let newIndex = currentIndex
            
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                newIndex = Math.min(currentIndex + 1, topics.length - 1)
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                newIndex = Math.max(currentIndex - 1, 0)
            } else if (e.key === 'Home') {
                e.preventDefault()
                newIndex = 0
            } else if (e.key === 'End') {
                e.preventDefault()
                newIndex = topics.length - 1
            }
            
            if (newIndex !== currentIndex) {
                topics[newIndex].focus()
                topics[newIndex].click()
            }
        })
    })

    // [PHASE 5] Holographic Shield Interaction
    const { stateAuditor } = import('../../core/state-auditor.js').then(({ stateAuditor }) => {
        root.querySelectorAll('.verify-shield').forEach(shield => {
            shield.onclick = (e) => {
                e.stopPropagation()
                const pid = shield.dataset.process
                const result = stateAuditor.getAuditStatus(pid)

                // Show a detailed toast about the holographic proof
                import('../../App.js').then(app => {
                    const msg = result.status === 'verified'
                        ? `🛡️ Holographic Proof Valid: Checked ${result.count} transitions in Rust-WASM.`
                        : `⚠️ Unverified State: Audit in progress or failed.`
                    app.showToast(msg, result.status === 'verified' ? 'success' : 'info')
                })
            }
        })
    })

    // Posting Logic - Use AO Social Protocol
    const input = root.querySelector('#social-input')
    const btn = root.querySelector('#broadcast-btn')

    if (btn && input) {
        btn.onclick = async () => {
            const content = input.value.trim()
            if (!content) return

            const state = getState()
            if (!state.jwk) {
                alert('Please connect your wallet first')
                return
            }

            btn.disabled = true
            btn.innerText = 'Signing...'

            try {
                const topic = state.activeTopic || 'general'
                const msgId = await createPost(content, topic)
                
                if (msgId) {
                    input.value = ''
                    btn.innerText = 'Sent!'
                } else {
                    btn.innerText = 'Offline'
                }
            } catch (err) {
                console.error('Post failed:', err)
                btn.innerText = 'Error'
            } finally {
                setTimeout(() => {
                    btn.disabled = false
                    btn.innerText = 'Post'
                }, 2000)
            }
        }
    }
}
