/**
 * CommandPalette.js
 * VS Code-style command palette with fuzzy search
 * Press Cmd+K or Ctrl+K to open
 */

import { getState, setState } from '../state.js'

// Command registry - all available commands
const commands = [
    {
        id: 'nav-dashboard',
        label: 'Dashboard',
        shortcut: 'g d',
        icon: '📊',
        action: () => setState({ activeModule: 'dashboard' }),
        keywords: ['home', 'main', 'stats', 'analytics']
    },
    {
        id: 'nav-social',
        label: 'Social Mesh',
        shortcut: 'g s',
        icon: '🌐',
        action: () => setState({ activeModule: 'social' }),
        keywords: ['feed', 'posts', 'network', 'mesh']
    },
    {
        id: 'nav-skills',
        label: 'Skill Store',
        shortcut: 'g k',
        icon: '🧠',
        action: () => setState({ activeModule: 'skills' }),
        keywords: ['skills', 'abilities', 'store', 'marketplace']
    },
    {
        id: 'nav-console',
        label: 'Command Console',
        shortcut: 'g c',
        icon: '💻',
        action: () => setState({ activeModule: 'console' }),
        keywords: ['terminal', 'cli', 'commands', 'hack']
    },
    {
        id: 'nav-memory',
        label: 'Memory Vault',
        shortcut: 'g m',
        icon: '🔐',
        action: () => setState({ activeModule: 'memory' }),
        keywords: ['vault', 'encrypted', 'storage', 'secrets']
    },
    {
        id: 'nav-wallet',
        label: 'Wallet',
        shortcut: 'g w',
        icon: '💰',
        action: () => setState({ activeModule: 'wallet' }),
        keywords: ['wallet', 'balance', 'tokens', 'dev tools']
    },
    {
        id: 'action-spawn',
        label: 'Spawn New Process',
        shortcut: 's p',
        icon: '🚀',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/spawn '
                    input.focus()
                }
            }, 100)
        },
        keywords: ['create', 'deploy', 'agent', 'process', 'new']
    },
    {
        id: 'action-eval',
        label: 'Evaluate Lua Code',
        shortcut: 's e',
        icon: '📜',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/eval '
                    input.focus()
                }
            }, 100)
        },
        keywords: ['lua', 'code', 'execute', 'run', 'eval']
    },
    {
        id: 'action-whoami',
        label: 'Show Identity',
        shortcut: 's i',
        icon: '🆔',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/whoami'
                    input.focus()
                    // Auto-execute
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
                }
            }, 100)
        },
        keywords: ['identity', 'address', 'wallet', 'whoami']
    },
    {
        id: 'action-balance',
        label: 'Check Balance',
        shortcut: 's b',
        icon: '💵',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/balance'
                    input.focus()
                }
            }, 100)
        },
        keywords: ['balance', 'ar', 'tokens', 'funds', 'money']
    },
    {
        id: 'action-clear',
        label: 'Clear Console',
        shortcut: 'c c',
        icon: '🧹',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/clear'
                    input.focus()
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
                }
            }, 100)
        },
        keywords: ['clear', 'clean', 'reset', 'console']
    },
    {
        id: 'action-settings',
        label: 'Open Settings',
        shortcut: 's o',
        icon: '⚙️',
        action: () => setState({ showProfileModal: true }),
        keywords: ['settings', 'config', 'preferences', 'options']
    },
    {
        id: 'action-bridge-connect',
        label: 'Connect Neural Bridge',
        shortcut: 'b c',
        icon: '🔌',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/bridge connect'
                    input.focus()
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
                }
            }, 100)
        },
        keywords: ['mcp', 'bridge', 'connect', 'neural', 'local']
    },
    {
        id: 'action-lock',
        label: 'Lock Vault',
        shortcut: 'v l',
        icon: '🔒',
        action: () => {
            // Trigger vault lock
            window.dispatchEvent(new CustomEvent('aoprism-lock-vault'))
        },
        keywords: ['lock', 'vault', 'security', 'secure', 'encrypt']
    },
    {
        id: 'action-help',
        label: 'Show Help',
        shortcut: '?',
        icon: '❓',
        action: () => {
            setState({ activeModule: 'console' })
            setTimeout(() => {
                const input = document.querySelector('.console-input')
                if (input) {
                    input.value = '/help'
                    input.focus()
                    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
                }
            }, 100)
        },
        keywords: ['help', 'commands', 'support', 'docs']
    },
    {
        id: 'action-shortcuts',
        label: 'Keyboard Shortcuts',
        shortcut: 's h',
        icon: '⌨️',
        action: () => {
            // Show shortcuts modal
            window.dispatchEvent(new CustomEvent('aoprism-show-shortcuts'))
        },
        keywords: ['shortcuts', 'keys', 'hotkeys', 'commands']
    }
]

// Fuzzy search implementation (lightweight, no dependencies)
function fuzzySearch(query, items) {
    if (!query) return items
    
    const lowerQuery = query.toLowerCase()
    const scored = items.map(item => {
        let score = 0
        const label = item.label.toLowerCase()
        const keywords = item.keywords.join(' ').toLowerCase()
        
        // Exact match in label
        if (label === lowerQuery) score += 100
        // Starts with query
        else if (label.startsWith(lowerQuery)) score += 50
        // Contains query
        else if (label.includes(lowerQuery)) score += 30
        // Exact match in keywords
        else if (keywords.includes(lowerQuery)) score += 20
        // Partial matches
        else {
            const queryWords = lowerQuery.split(' ')
            for (const word of queryWords) {
                if (label.includes(word)) score += 10
                if (keywords.includes(word)) score += 5
            }
        }
        
        return { item, score }
    })
    
    return scored
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
}

class CommandPalette {
    constructor() {
        this.element = null
        this.input = null
        this.list = null
        this.isOpen = false
        this.selectedIndex = 0
        this.filteredCommands = commands
        
        this.init()
    }
    
    init() {
        // Create palette element
        this.element = document.createElement('div')
        this.element.className = 'command-palette'
        this.element.style.display = 'none'
        this.element.innerHTML = `
            <div class="palette-overlay"></div>
            <div class="palette-container">
                <div class="palette-input-wrapper">
                    <span class="palette-icon">⌘</span>
                    <input type="text" class="palette-input" placeholder="Type a command or search..." autocomplete="off">
                    <span class="palette-shortcut">ESC to close</span>
                </div>
                <div class="palette-list"></div>
                <div class="palette-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                    <span><kbd>↵</kbd> to select</span>
                </div>
            </div>
        `
        
        document.body.appendChild(this.element)
        
        this.input = this.element.querySelector('.palette-input')
        this.list = this.element.querySelector('.palette-list')
        
        // Event listeners
        this.input.addEventListener('input', () => this.handleInput())
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e))
        
        this.element.querySelector('.palette-overlay').addEventListener('click', () => this.close())
        
        // Global keyboard shortcut
        document.addEventListener('keydown', (e) => {
            // Cmd+K or Ctrl+K
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                this.toggle()
            }
            // ESC to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close()
            }
            // Cmd+Shift+P (VS Code style)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
                e.preventDefault()
                this.open()
            }
        })
    }
    
    open() {
        this.isOpen = true
        this.element.style.display = 'block'
        this.input.value = ''
        this.input.focus()
        this.filteredCommands = commands
        this.selectedIndex = 0
        this.render()
        
        // Add active class for animation
        setTimeout(() => {
            this.element.classList.add('active')
        }, 10)
    }
    
    close() {
        this.isOpen = false
        this.element.classList.remove('active')
        setTimeout(() => {
            this.element.style.display = 'none'
        }, 200)
    }
    
    toggle() {
        if (this.isOpen) {
            this.close()
        } else {
            this.open()
        }
    }
    
    handleInput() {
        const query = this.input.value
        this.filteredCommands = fuzzySearch(query, commands)
        this.selectedIndex = 0
        this.render()
    }
    
    handleKeydown(e) {
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault()
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1)
                this.render()
                this.scrollToSelected()
                break
            case 'ArrowUp':
                e.preventDefault()
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
                this.render()
                this.scrollToSelected()
                break
            case 'Enter':
                e.preventDefault()
                this.executeSelected()
                break
        }
    }
    
    scrollToSelected() {
        const items = this.list.querySelectorAll('.palette-item')
        const selected = items[this.selectedIndex]
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' })
        }
    }
    
    executeSelected() {
        const command = this.filteredCommands[this.selectedIndex]
        if (command) {
            this.close()
            command.action()
        }
    }
    
    render() {
        if (this.filteredCommands.length === 0) {
            this.list.innerHTML = `
                <div class="palette-empty">
                    No commands found
                    <br>
                    <small>Try different keywords</small>
                </div>
            `
            return
        }
        
        this.list.innerHTML = this.filteredCommands.map((cmd, index) => `
            <div class="palette-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
                <span class="palette-item-icon">${cmd.icon}</span>
                <span class="palette-item-label">${cmd.label}</span>
                <span class="palette-item-shortcut">${cmd.shortcut}</span>
            </div>
        `).join('')
        
        // Click handlers
        this.list.querySelectorAll('.palette-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectedIndex = index
                this.executeSelected()
            })
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index
                this.render()
            })
        })
    }
}

// Singleton instance
let paletteInstance = null

export function initCommandPalette() {
    if (!paletteInstance) {
        paletteInstance = new CommandPalette()
    }
    return paletteInstance
}

export function openCommandPalette() {
    if (!paletteInstance) {
        paletteInstance = new CommandPalette()
    }
    paletteInstance.open()
}

export function closeCommandPalette() {
    if (paletteInstance) {
        paletteInstance.close()
    }
}
