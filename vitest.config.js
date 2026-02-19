import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom', // Emulate browser APIs (App.js, DOM)
        include: ['src/**/*.test.js', 'src/**/*.spec.js'],
        setupFiles: [], // Add setup file if needed for localStorage mocks
    },
})
