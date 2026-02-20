import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.test.js', 'tests/**/*.spec.js', 'src/**/*.test.js'],
        globals: true,
        environment: 'node',
        timeout: 30000
    },
})
