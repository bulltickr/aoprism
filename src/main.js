/**
 * main.js
 * Browser entry point for AOPRISM.
 */

import './core/polyfills.js'
import './style.css'
import { mount } from './App.js'

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app')
    if (!root) {
        console.error('Core error: #app element not found')
        return
    }

    mount(root)
})
