// Vite (browser) polyfills for some Node globals used by dependencies.
// Keep this file minimal: we only polyfill what we actually hit.

if (!globalThis.process) {
  globalThis.process = { env: {} }
}

if (!globalThis.process.env) {
  globalThis.process.env = {}
}

// Some libs check this flag.
if (globalThis.process.browser === undefined) {
  globalThis.process.browser = true
}
