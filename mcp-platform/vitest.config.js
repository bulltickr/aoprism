import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['test-suite/**/*.test.js', 'test-suite/**/*.spec.js'],
        environment: 'node',
        globals: true,
        testTimeout: 10000,
    },
})
