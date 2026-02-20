import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom', // Emulate browser APIs (App.js, DOM)
        include: ['src/**/*.test.js', 'src/**/*.spec.js'],
        globals: true,
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', '**/*.test.js', 'tests/', 'scripts/'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70
            }
        }
    },
})
