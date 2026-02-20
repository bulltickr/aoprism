import { describe, it, expect, beforeEach } from 'vitest';
import { DeBridgeAdapter, LayerZeroAdapter, AcrossAdapter, createAdapter } from './adapters.js';
import { BridgeAggregator } from './aggregator.js';
import { BridgeSecurity } from './security.js';

describe('Bridge Adapters', () => {
  describe('DeBridgeAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new DeBridgeAdapter();
    });

    it('should be defined', () => {
      expect(adapter.name).toBe('deBridge');
    });

    it('should support ethereum and bsc', () => {
      expect(adapter.isChainSupported('ethereum')).toBe(true);
      expect(adapter.isChainSupported('bsc')).toBe(true);
    });

    it('should not support solana', () => {
      expect(adapter.isChainSupported('solana')).toBe(false);
    });

    it('should get quote', async () => {
      const quote = await adapter.getQuote({
        fromChain: 'ethereum',
        toChain: 'bsc',
        fromToken: 'ETH',
        toToken: 'ETH',
        amount: '1',
      });

      expect(quote.adapter).toBe('deBridge');
      expect(quote.fromChain).toBe('ethereum');
      expect(quote.toChain).toBe('bsc');
      expect(quote.toAmount).toBeDefined();
    });

    it('should throw for unsupported chains', async () => {
      await expect(
        adapter.getQuote({ fromChain: 'solana', toChain: 'ethereum', amount: '1' })
      ).rejects.toThrow('does not support solana');
    });
  });

  describe('LayerZeroAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new LayerZeroAdapter();
    });

    it('should be defined', () => {
      expect(adapter.name).toBe('LayerZero');
    });

    it('should support base chain', () => {
      expect(adapter.isChainSupported('base')).toBe(true);
    });
  });

  describe('createAdapter', () => {
    it('should create deBridge adapter', () => {
      const adapter = createAdapter('deBridge');
      expect(adapter.name).toBe('deBridge');
    });

    it('should create LayerZero adapter', () => {
      const adapter = createAdapter('LayerZero');
      expect(adapter.name).toBe('LayerZero');
    });

    it('should throw for unknown adapter', () => {
      expect(() => createAdapter('unknown')).toThrow('Unknown adapter');
    });
  });
});

describe('BridgeAggregator', () => {
  let aggregator;

  beforeEach(() => {
    aggregator = new BridgeAggregator();
  });

  it('should have default adapters', () => {
    expect(aggregator.adapters.length).toBe(3);
  });

  it('should get supported chains', () => {
    const chains = aggregator.getSupportedChains();
    expect(chains).toContain('ethereum');
    expect(chains).toContain('bsc');
  });

  it('should check chain support', () => {
    expect(aggregator.isChainSupported('ethereum')).toBe(true);
    expect(aggregator.isChainSupported('polygon')).toBe(true);
  });

  it('should compare routes', () => {
    const routes = aggregator.compareRoutes({
      fromChain: 'ethereum',
      toChain: 'polygon',
    });

    expect(routes.length).toBeGreaterThan(0);
  });
});

describe('BridgeSecurity', () => {
  let security;

  beforeEach(() => {
    security = new BridgeSecurity();
  });

  it('should verify transaction', async () => {
    const quote = {
      fromAmount: '100',
      fee: { fixed: 1, percentage: 0.1 },
      slippage: 0.5,
      estimatedTime: 300,
      adapter: 'deBridge',
    };

    const result = await security.verifyTransaction(quote);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeDefined();
    expect(result.warnings).toBeDefined();
  });

  it('should analyze risk factors', async () => {
    const quote = {
      fromAmount: '100000',
      fee: { fixed: 5, percentage: 2 },
      slippage: 5,
      estimatedTime: 4000,
    };

    const result = await security.analyzeRisk(quote);

    expect(result.score).toBeGreaterThan(0);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('should generate warnings for high risk', async () => {
    const warnings = security.generateWarnings(false, true, { score: 50, factors: [] });

    expect(warnings.length).toBeGreaterThan(0);
  });

  it('should add verified contracts', () => {
    security.addVerifiedContract('0x123');
    expect(security.isContractVerified('0x123')).toBe(true);
  });

  it('should add scam addresses', () => {
    security.addScamAddress('0xSCAM');
    expect(security.isScamAddress('0xSCAM')).toBe(true);
  });
});
