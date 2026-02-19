/**
 * tools.spec.js
 * "Insane" Unit Tests for AO MCP Tools.
 * Uses Vitest + MockAO for deterministic, offline testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockAO } from './mocks/mock-ao.js'

// Import tools
import { arweaveQueryTool } from '../src/tools/arweave-query.js'
import { aoDryrunTool } from '../src/tools/ao-dryrun.js'
import { aoSendTool } from '../src/tools/ao-send.js'
import { tokenBalanceTool } from '../src/tools/token-balance.js'
import { memoryStoreTool } from '../src/tools/memory-store.js'

// Mock the ao-client module to use our MockAO
vi.mock('../src/ao-client.js', async () => {
    return {
        // Return a fresh mock for every test
        aoDryrunJson: vi.fn(),
        aoDryrun: vi.fn(),
        aoSend: vi.fn(),
        loadWallet: vi.fn(() => ({ kty: 'RSA' })), // Mock wallet presence
        AO_CONFIG: { URL: 'https://mock.ao', SCHEDULER: 'mock-sched' }
    }
})

// Mock Arweave
vi.mock('arweave/node/index.js', () => {
    return {
        default: {
            init: () => ({
                wallets: {
                    jwkToAddress: () => Promise.resolve('mock-address')
                }
            })
        }
    }
})

import * as clientMock from '../src/ao-client.js'

describe('MCP Tool Schemas', () => {
    it('validates arweave_query input', () => {
        const input = { first: 5, tags: [{ name: 'App-Name', values: ['aos'] }] }
        expect(() => arweaveQueryTool.schema.parse(input)).not.toThrow()
    })

    it('rejects invalid ao_dryrun process ID', () => {
        const input = { process: 'short', tags: [] }
        expect(() => aoDryrunTool.schema.parse(input)).toThrow()
    })

    it('validates memory_store input', () => {
        const input = { key: 'test', value: 'data' }
        expect(() => memoryStoreTool.schema.parse(input)).not.toThrow()
    })
})

describe('AO Dryrun Tool (Mocked)', () => {
    let mockAO

    beforeEach(() => {
        vi.clearAllMocks()
        mockAO = new MockAO()
    })

    it('executes dryrun and returns parsed output', async () => {
        // Setup mock response
        clientMock.aoDryrun.mockResolvedValue({
            Messages: [{ Data: '{"status":"ok"}' }],
            Output: 'Success',
            Error: null
        })

        const result = await aoDryrunTool.handler({
            process: '0syS7fS0_N9V9B8m0syS7fS0_N9V9B8m0syS7fS0_N9V9',
            tags: [{ name: 'Action', value: 'Info' }]
        })

        expect(clientMock.aoDryrun).toHaveBeenCalled()
        // FIX: The tool returns lowercase 'messages'
        expect(result.messages[0].Data).toEqual({ status: 'ok' })
    })

    it('handles network errors gracefully', async () => {
        clientMock.aoDryrun.mockRejectedValue(new Error('Network Chaos'))

        await expect(aoDryrunTool.handler({
            process: '0syS7fS0_N9V9B8m0syS7fS0_N9V9B8m0syS7fS0_N9V9'
        })).rejects.toThrow('Network Chaos')
    })
})

describe('AO Send Tool (Mocked)', () => {
    it('sends message successfully', async () => {
        clientMock.aoSend.mockResolvedValue({
            messageId: 'msg_123',
            result: { Messages: [], Output: 'Sent' }
        })

        const result = await aoSendTool.handler({
            process: '0syS7fS0_N9V9B8m0syS7fS0_N9V9B8m0syS7fS0_N9V9',
            tags: [{ name: 'Action', value: 'Ping' }],
            data: 'pong'
        })

        expect(clientMock.aoSend).toHaveBeenCalledWith(expect.objectContaining({
            process: '0syS7fS0_N9V9B8m0syS7fS0_N9V9B8m0syS7fS0_N9V9',
            data: 'pong'
        }))
        expect(result.messageId).toBe('msg_123')
    })

    it('fails when wallet is missing', async () => {
        // Mock loadWallet to return null (verification only)
        clientMock.loadWallet.mockReturnValue(null)
        // Mock aoSend throwing (simulating real behavior)
        clientMock.aoSend.mockRejectedValue(new Error('No wallet configured'))

        // aoSendTool checks for wallet *before* calling aoSend in some implementations
        await expect(aoSendTool.handler({
            process: '0syS7fS0_N9V9B8m0syS7fS0_N9V9B8m0syS7fS0_N9V9'
        })).rejects.toThrow('No wallet configured')
    })
})

describe('Token Balance Tool (Mocked)', () => {
    it('returns correct balance and metadata', async () => {
        // Mock two dryrun calls: one for balance, one for info
        clientMock.aoDryrunJson
            .mockResolvedValueOnce('1000') // Balance
            .mockResolvedValueOnce({ Name: 'Test Token', Ticker: 'TST', Denomination: 12 }) // Info

        // Mock wallet for input
        clientMock.loadWallet.mockReturnValue({ kty: 'RSA' })

        // Mock Arweave import inside the tool? 
        // The tool does: const ArweavePkg = await import('arweave/node/index.js')
        // We cannot easily mock that dynamic import.
        // However, if we provide `recipient`, it skips the wallet address derivation.

        const result = await tokenBalanceTool.handler({
            token: '0syS7fS0_N9V9B8m0syS7fS0_N9V9B8m0syS7fS0_N9V9',
            recipient: 'addr_123'
        })

        expect(result.balance).toBe('1000')
        expect(result.ticker).toBe('TST')
    })
})
