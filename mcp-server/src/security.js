/**
 * security.js
 * Authentication and rate limiting utilities for MCP Server Hub
 */

import rateLimit from 'express-rate-limit'
import crypto from 'crypto'

/**
 * Create a rate limiter middleware
 * @param {object} options - Rate limit options
 * @returns {function} Express middleware
 */
export function createRateLimiter(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // 100 requests per window
        keyGenerator = (req) => req.ip,
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options

    return rateLimit({
        windowMs,
        max,
        keyGenerator,
        skipSuccessfulRequests,
        skipFailedRequests,
        message: {
            error: 'Too many requests, please try again later.',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            })
        }
    })
}

/**
 * Create API key authentication middleware
 * @param {object} options - Auth options
 * @returns {function} Express middleware
 */
export function createApiKeyAuth(options = {}) {
    const {
        apiKeys = [], // Array of valid API keys
        headerName = 'x-api-key',
        excludePaths = ['/health', '/ping'],
        keyGenerator = null // Function to generate keys dynamically
    } = options

    return (req, res, next) => {
        // Skip excluded paths
        if (excludePaths.some(path => req.path === path || req.path.startsWith(path))) {
            return next()
        }

        const apiKey = req.headers[headerName.toLowerCase()]

        if (!apiKey) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'API key required. Include ' + headerName + ' header.'
            })
        }

        // Check against static keys
        if (apiKeys.length > 0 && !apiKeys.includes(apiKey)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid API key'
            })
        }

        // Check against dynamic generator if provided
        if (keyGenerator && !keyGenerator(apiKey)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Invalid API key'
            })
        }

        // Attach key info to request
        req.apiKey = apiKey
        next()
    }
}

/**
 * Generate a secure API key
 * @param {number} length - Key length
 * @returns {string} Generated API key
 */
export function generateApiKey(length = 32) {
    return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash an API key for storage
 * @param {string} apiKey - API key to hash
 * @returns {string} Hashed key
 */
export function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Verify an API key against a hash
 * @param {string} apiKey - API key to verify
 * @param {string} hash - Stored hash
 * @returns {boolean} Whether key matches
 */
export function verifyApiKey(apiKey, hash) {
    const computed = crypto.createHash('sha256').update(apiKey).digest('hex')
    return computed === hash
}

/**
 * Create IP whitelist middleware
 * @param {string[]} allowedIps - Array of allowed IPs
 * @returns {function} Express middleware
 */
export function createIpWhitelist(allowedIps = []) {
    const ipSet = new Set(allowedIps)

    return (req, res, next) => {
        const clientIp = req.ip || req.connection.remoteAddress

        if (ipSet.size > 0 && !ipSet.has(clientIp)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'IP not whitelisted'
            })
        }

        next()
    }
}

/**
 * Security event logger
 */
export class SecurityLogger {
    constructor(options = {}) {
        this.logLevel = options.logLevel || 'info'
        this.logFunction = options.logFunction || console.log
        this.events = []
        this.maxEvents = options.maxEvents || 1000
    }

    log(event) {
        const entry = {
            timestamp: new Date().toISOString(),
            ...event
        }

        this.events.push(entry)

        // Trim old events
        if (this.events.length > this.maxEvents) {
            this.events.shift()
        }

        if (this.shouldLog(event.level)) {
            this.logFunction(`[SECURITY] ${entry.timestamp} - ${event.type}: ${event.message}`)
        }
    }

    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 }
        return levels[level] >= levels[this.logLevel]
    }

    getEvents(filter = {}) {
        let events = [...this.events]

        if (filter.type) {
            events = events.filter(e => e.type === filter.type)
        }

        if (filter.level) {
            events = events.filter(e => e.level === filter.level)
        }

        if (filter.since) {
            events = events.filter(e => new Date(e.timestamp) >= filter.since)
        }

        return events
    }

    audit(accessEvent) {
        this.log({
            type: 'audit',
            level: 'info',
            ...accessEvent
        })
    }

    warn(event) {
        this.log({
            type: 'warning',
            level: 'warn',
            ...event
        })
    }

    error(event) {
        this.log({
            type: 'error',
            level: 'error',
            ...event
        })
    }
}

// Default security logger instance
export const securityLogger = new SecurityLogger()
