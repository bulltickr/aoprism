import Arweave from 'arweave/web'
import { connect } from '@permaweb/aoconnect/browser'
import { dryrun, message, result, createDataItemSigner } from '@permaweb/aoconnect'
import { ArweaveSigner, createData, getSignatureAndId } from '@dha-team/arbundles/web'
import { DEFAULTS } from './config.js'

function bytesToB64Url(bytes) {
  const b64 = bytesToB64(bytes)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function b64UrlToBytes(b64url) {
  const b64 = String(b64url)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(b64url).length / 4) * 4, '=')
  return b64ToBytes(b64)
}

async function jwkToAddress(jwk) {
  // Arweave address = base64url(sha256(modulusBytes))
  const modulusBytes = b64UrlToBytes(jwk.n)
  const digest = await crypto.subtle.digest('SHA-256', modulusBytes)
  return bytesToB64Url(new Uint8Array(digest))
}

async function importHttpSigKey(jwk) {
  // HTTP-SIG path in ao-core-libs requests RSA-PSS SHA-512 signatures.
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-PSS', hash: 'SHA-512' },
    false,
    ['sign']
  )
}

function createBrowserJwkSigner(jwk) {
  if (!jwk || typeof jwk !== 'object') throw new Error('Missing wallet key (jwk).')
  if (!jwk.n || !jwk.e || !jwk.d) throw new Error('Invalid JWK: missing required RSA private key fields.')
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto not available (crypto.subtle missing).')

  // Initialize lazily so wallet creation remains snappy.
  const addressPromise = jwkToAddress(jwk)
  const httpSigKeyPromise = importHttpSigKey(jwk)
  const arSigner = new ArweaveSigner(jwk)

  return async (create, format) => {
    if (typeof create !== 'function') throw new Error('Invalid signer invocation (missing create callback).')

    if (format === 'ans104') {
      // Ask the request builder for the data/tags/target/anchor, then build+sign the data item ourselves.
      const { data, tags, target, anchor } = await create({
        type: 1,
        publicKey: jwk.n,
        alg: 'rsa-v1_5-sha256',
        passthrough: true
      })

      const item = createData(data, arSigner, { tags, target, anchor })
      await item.sign(arSigner)

      const { id } = await getSignatureAndId(item, arSigner)
      return { id: bytesToB64Url(new Uint8Array(id)), raw: item.getRaw() }
    }

    if (format === 'httpsig') {
      const address = await addressPromise
      const key = await httpSigKeyPromise

      const dataToSign = await create({
        type: 1,
        publicKey: jwk.n,
        address,
        alg: 'rsa-pss-sha512'
      })

      const sig = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 64 }, key, dataToSign)
      return { signature: new Uint8Array(sig), address }
    }

    throw new Error(`Unknown signer format: ${format}`)
  }
}

function bytesToB64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function b64ToBytes(b64) {
  const binary = atob(String(b64))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}


function normalizeTags(tags) {
  if (!tags) return []
  if (!Array.isArray(tags)) throw new Error('Tags must be an array of { name, value }.')
  return tags
    .filter(Boolean)
    .map((t) => ({ name: String(t?.name ?? ''), value: String(t?.value ?? '') }))
    .filter((t) => t.name.length > 0)
}

function isDebug() {
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get('debug') === '1') return true
    return localStorage.getItem('hb-demo-wallet:debug') === '1'
  } catch {
    return false
  }
}

function previewData(data, maxLen = 600) {
  if (data == null) return ''
  const s = typeof data === 'string' ? data : String(data)
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen) + '…'
}

function installFetchDebug() {
  if (!isDebug()) return
  if (globalThis.__hbDemoWalletFetchWrapped) return
  if (typeof globalThis.fetch !== 'function') return

  globalThis.__hbDemoWalletFetchWrapped = true
  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url
    let res
    try {
      res = await originalFetch(input, init)
    } catch (e) {
      console.warn('[Demo-Wallet][fetch] network error', { url, message: e?.message ?? String(e) })
      throw e
    }

    try {
      const u = String(url ?? '')
      const shouldLog =
        res &&
        !res.ok &&
        (u.includes('~process@1.0/push') || u.endsWith('/push') || u.includes('/push') || u.includes('/tx'))

      if (shouldLog) {
        let bodyText = ''
        try {
          // clone() so consumers can still read the body.
          bodyText = await res.clone().text()
        } catch {
          bodyText = ''
        }
        if (bodyText && bodyText.length > 6000) bodyText = bodyText.slice(0, 6000) + '…'
        console.warn('[Demo-Wallet][fetch] non-OK response', {
          url: res.url || url,
          status: res.status,
          statusText: res.statusText,
          bodyText
        })
      }
    } catch {
      // ignore debug wrapper failures
    }

    return res
  }
}

export async function generateJwkAndAddress() {
  const debug = isDebug()
  const t0 = performance.now()

  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('WebCrypto not available in this browser context (crypto.subtle missing).')
  }

  const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })

  if (debug) {
    console.groupCollapsed('[Demo-Wallet] Generating JWK')
    console.log('WebCrypto:', !!globalThis.crypto?.subtle)
  }

  const jwk = await arweave.wallets.generate()
  const address = await arweave.wallets.jwkToAddress(jwk)

  if (debug) {
    const ms = Math.round(performance.now() - t0)
    console.log('Generated JWK fields:', {
      kty: jwk?.kty,
      nLen: typeof jwk?.n === 'string' ? jwk.n.length : null,
      e: jwk?.e,
      hasD: !!jwk?.d
    })
    console.log('Derived address:', address)
    console.log('Keygen time (ms):', ms)
    console.groupEnd()
  }

  return { jwk, address }
}

export async function getArBalance(address) {
  const arweave = Arweave.init({ host: 'arweave.net', protocol: 'https', port: 443 })
  try {
    const winston = await arweave.wallets.getBalance(address)
    const ar = arweave.ar.winstonToAr(winston)
    return parseFloat(ar).toFixed(4)
  } catch (e) {
    console.error('Failed to fetch balance:', e)
    return '0.0000'
  }
}

// HyperBEAM client (mainnet with MODE flag)
export function makeAoClient({ URL, SCHEDULER, CU_URL, MODE, jwk }) {
  installFetchDebug()
  const signer = createBrowserJwkSigner(jwk)

  // HyperBEAM uses MODE flag for mainnet
  const ao = connect({
    MODE: MODE ?? DEFAULTS.MODE,
    signer,
    URL: URL ?? DEFAULTS.URL,
    SCHEDULER: SCHEDULER ?? DEFAULTS.SCHEDULER,
    CU_URL: CU_URL ?? undefined
  })

  return { ao, signer }
}

// LegacyNet client (just creates signer - message/result use default nodes)
export function makeAoClientLegacy({ jwk }) {
  installFetchDebug()
  const signer = createDataItemSigner(jwk)
  return { signer }
}

function flattenErrorChain(err) {
  const out = []
  const seen = new Set()
  let cur = err
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    out.push(cur)
    cur = cur?.cause
  }
  return out
}

async function tryExtractHttpDetails(err) {
  const chain = flattenErrorChain(err)
  for (const e of chain) {
    const resp = e?.response
    if (resp && typeof resp === 'object' && typeof resp.status === 'number' && typeof resp.text === 'function') {
      let bodyText = ''
      try {
        bodyText = await resp.text()
      } catch {
        bodyText = ''
      }
      if (bodyText && bodyText.length > 6000) bodyText = bodyText.slice(0, 6000) + '…'
      return {
        status: resp.status,
        statusText: resp.statusText,
        url: resp.url,
        bodyText
      }
    }

    // Some libs surface HTTP-ish fields without a Response object.
    const status = e?.status ?? e?.statusCode
    const body = e?.body ?? e?.data
    const url = e?.url
    if (typeof status === 'number' || typeof body === 'string') {
      return {
        status: typeof status === 'number' ? status : undefined,
        statusText: undefined,
        url: typeof url === 'string' ? url : undefined,
        bodyText: typeof body === 'string' ? body : ''
      }
    }
  }
  return null
}

function formatErrorForHumans(label, err, httpDetails) {
  const msg = String(err?.message ?? err ?? '')
  const bits = [label, msg].filter(Boolean)
  if (httpDetails?.status) bits.push(`HTTP ${httpDetails.status}${httpDetails.statusText ? ` ${httpDetails.statusText}` : ''}`)
  if (httpDetails?.url) bits.push(httpDetails.url)
  if (httpDetails?.bodyText) bits.push(httpDetails.bodyText)
  return bits.join('\n')
}

export async function sendAndGetResult({ ao, signer, process, tags, data }) {
  let messageId = null
  try {
    const normalized = normalizeTags(tags)
    if (isDebug()) {
      console.log('[Demo-Wallet] ao.message request', {
        process,
        tags: normalized,
        dataLen: typeof data === 'string' ? data.length : null,
        dataPreview: previewData(data)
      })
    }
    messageId = await ao.message({ process, tags: normalized, data, signer })
  } catch (e) {
    const httpDetails = await tryExtractHttpDetails(e)
    console.error('[Demo-Wallet] ao.message failed', {
      process,
      tags: normalizeTags(tags),
      message: e?.message,
      stack: e?.stack,
      cause: e?.cause,
      causeMessage: e?.cause?.message,
      httpDetails,
      keys: e ? Object.getOwnPropertyNames(e) : null
    })
    throw new Error(formatErrorForHumans('AO message failed', e, httpDetails), { cause: e })
  }

  try {
    const res = await ao.result({ process, message: messageId })
    return { messageId, result: res }
  } catch (e) {
    const httpDetails = await tryExtractHttpDetails(e)
    console.error('[Demo-Wallet] ao.result failed', {
      process,
      messageId,
      message: e?.message,
      stack: e?.stack,
      cause: e?.cause,
      causeMessage: e?.cause?.message,
      httpDetails,
      keys: e ? Object.getOwnPropertyNames(e) : null
    })
    throw new Error(formatErrorForHumans('AO result failed', e, httpDetails), { cause: e })
  }
}

// LegacyNet message sender - calls message() and result() directly (uses default nodes)
export async function sendAndGetResultLegacy({ signer, process, tags, data }) {
  try {
    const normalized = normalizeTags(tags)
    if (isDebug()) {
      console.log('[Demo-Wallet][LegacyNet] dryrun request', {
        process,
        tags: normalized,
        dataLen: typeof data === 'string' ? data.length : null,
        dataPreview: previewData(data)
      })
    }

    // Use dryrun for instant response (no message/result needed)
    const res = await dryrun({
      process,
      tags: normalized,
      data: data || '',
      signer
    })

    if (isDebug()) {
      console.log('[Demo-Wallet][LegacyNet] dryrun response', res)
    }

    // Format the dryrun response for display
    const formatted = {
      Messages: res.Messages || [],
      Spawns: res.Spawns || [],
      Output: res.Output || [],
      GasUsed: res.GasUsed,
      Error: res.Error
    }

    return { messageId: 'dryrun', result: formatted }
  } catch (e) {
    const httpDetails = await tryExtractHttpDetails(e)
    console.error('[Demo-Wallet][LegacyNet] dryrun failed', {
      process,
      tags: normalizeTags(tags),
      message: e?.message,
      stack: e?.stack,
      cause: e?.cause,
      causeMessage: e?.cause?.message,
      httpDetails,
      keys: e ? Object.getOwnPropertyNames(e) : null
    })
    throw new Error(formatErrorForHumans('AO dryrun failed', e, httpDetails), { cause: e })
  }
}
