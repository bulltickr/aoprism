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

// WebGPU Multi-Browser Compatibility Patch
// Safely removes unrecognized limits (like maxInterStageShaderComponents) that cause requestDevice to throw on some environments.
if (typeof GPUAdapter !== 'undefined' && GPUAdapter.prototype.requestDevice) {
  const originalRequestDevice = GPUAdapter.prototype.requestDevice;
  GPUAdapter.prototype.requestDevice = function (descriptor) {
    if (descriptor && descriptor.requiredLimits) {
      // Some versions of Chrome/Edge (Feb 2026) throw if this limit is passed with a value they don't recognize
      delete descriptor.requiredLimits.maxInterStageShaderComponents;
    }
    return originalRequestDevice.call(this, descriptor);
  };
}
