const CORS_PROBE_TIMEOUT = 5000
const CORS_PROBE_RETRIES = 2

export const CONNECTION_METHOD = {
  DIRECT: 'direct',
  RELAY: 'relay',
  UNKNOWN: 'unknown'
}

let _connectionMethod = CONNECTION_METHOD.UNKNOWN
let _corsAvailable = null

export function getConnectionMethod() {
  return _connectionMethod
}

export function isCorsAvailable() {
  return _corsAvailable
}

async function probeCors(url) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CORS_PROBE_TIMEOUT)

  try {
    await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return true
  } catch (e) {
    clearTimeout(timeoutId)
    const isAbort = e?.name === 'AbortError'
    const isCorsError = e?.message?.includes('CORS') || e?.message?.includes('Failed to fetch')
    if (isAbort) {
      console.debug('[CorsProxy] Probe timeout:', url)
    } else if (isCorsError) {
      console.debug('[CorsProxy] CORS blocked:', url)
    }
    return false
  }
}

export async function detectCorsSupport(urls) {
  if (_corsAvailable !== null) {
    return _corsAvailable
  }

  const probeUrls = Array.isArray(urls) ? urls : [urls]

  for (let attempt = 0; attempt < CORS_PROBE_RETRIES; attempt++) {
    const results = await Promise.all(probeUrls.map(u => probeCors(u)))
    if (results.some(r => r === true)) {
      _corsAvailable = true
      _connectionMethod = CONNECTION_METHOD.DIRECT
      console.log('[CorsProxy] ✅ CORS available - using direct connection')
      return true
    }
    if (attempt < CORS_PROBE_RETRIES - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  _corsAvailable = false
  console.log('[CorsProxy] ⚠️ CORS unavailable - will use relay')
  return false
}

export function useRelay() {
  _connectionMethod = CONNECTION_METHOD.RELAY
  _corsAvailable = false
  console.log('[CorsProxy] 🔄 Using relay connection')
}

export function logConnectionMethod() {
  console.log('[CorsProxy] Connection method:', _connectionMethod)
}

export function createCorsAwareFetch(relayUrl) {
  return async function corsAwareFetch(url, options = {}) {
    if (_corsAvailable === true) {
      return fetch(url, options)
    }

    if (_corsAvailable === false || _connectionMethod === CONNECTION_METHOD.RELAY) {
      const relayTarget = `${relayUrl}/proxy?url=${encodeURIComponent(url)}`
      const method = options?.method || 'GET'
      const headers = options?.headers || {}
      const body = options?.body

      return fetch(relayTarget, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({ method, headers, body })
      })
    }

    try {
      return await fetch(url, options)
    } catch (e) {
      const isCorsError = e?.message?.includes('CORS') || e?.message?.includes('Failed to fetch')
      if (isCorsError) {
        console.warn('[CorsProxy] Direct fetch failed, falling back to relay:', url)
        useRelay()
        return corsAwareFetch(url, options)
      }
      throw e
    }
  }
}

export function setupCorsDetection(muUrl, schedulerUrl) {
  const urls = [muUrl, schedulerUrl].filter(Boolean)
  detectCorsSupport(urls).catch(e => {
    console.warn('[CorsProxy] Detection failed:', e)
    useRelay()
  })
}
