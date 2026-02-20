
import React from 'react'
import ReactDOM from 'react-dom/client'
import { getState, setState } from '../../state.js'
import { AgentComposerCanvas } from '../../components/AgentComposer/Canvas.jsx'

/**
 * Since the shell uses innerHTML to switch modules, we must ensure we don't
 * hold onto detached roots. We'll create a new root per attachment.
 */
// Keep track of roots associated with DOM nodes to prevent multiple roots on the same element
const roots = new WeakMap();

export function renderComposer(state) {
    return `
        <div id="composer-root" style="width: 100%; height: 800px; min-height: 800px; display: block; position: relative; background: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border);">
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted);">
                <div class="spinner" style="margin-right: 12px;"></div>
                Initializing Neural DAG Engine...
            </div>
        </div>
    `
}

export function attachComposerEvents(root) {
    const container = root.querySelector('#composer-root')
    if (!container) return

    let reactRoot = roots.get(container);
    if (!reactRoot) {
        reactRoot = ReactDOM.createRoot(container);
        roots.set(container, reactRoot);
    }

    const state = getState()

    // Tiny delay to ensure DOM dimensions are reported correctly
    setTimeout(() => {
        reactRoot.render(
            <React.StrictMode>
                <AgentComposerCanvas
                    initialNodes={state.agentNodes || []}
                    initialEdges={state.agentEdges || []}
                    onChange={(data) => {
                        // Update global state without triggering a full shell re-render
                        setState({
                            agentNodes: data.nodes,
                            agentEdges: data.edges
                        }, false)
                    }}
                />
            </React.StrictMode>
        )
    }, 50);
}
