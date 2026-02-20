import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { visualizer } from 'rollup-plugin-visualizer'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Required for deploying under a path prefix like https://arweave.net/<manifestId>/
  // so built assets load as ./assets/... instead of /assets/...
  base: './',
  plugins: [
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'crypto'],
      globals: {
        Buffer: true,
        process: true
      },
      protocolImports: true
    }),
    visualizer({
      open: false,
      filename: 'bundle-analysis.html',
      gzipSize: true,
      brotliSize: true
    }),
    react(),
    wasm(),
    topLevelAwait()
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})
