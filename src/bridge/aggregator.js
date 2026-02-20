import { DeBridgeAdapter, LayerZeroAdapter, AcrossAdapter, createAdapter } from './adapters.js';

export class BridgeAggregator {
  constructor() {
    this.adapters = [
      new DeBridgeAdapter(),
      new LayerZeroAdapter(),
      new AcrossAdapter(),
    ];
  }

  addAdapter(adapter) {
    this.adapters.push(adapter);
  }

  removeAdapter(name) {
    this.adapters = this.adapters.filter(a => a.name !== name);
  }

  getAdapter(name) {
    return this.adapters.find(a => a.name === name);
  }

  getSupportedChains() {
    const chains = new Set();
    for (const adapter of this.adapters) {
      for (const chain of adapter.supportedChains) {
        chains.add(chain);
      }
    }
    return Array.from(chains);
  }

  isChainSupported(chain) {
    return this.adapters.some(a => a.isChainSupported(chain));
  }

  async getQuotes(params) {
    const quotes = await Promise.allSettled(
      this.adapters.map(async adapter => {
        try {
          if (!adapter.isChainSupported(params.fromChain) || !adapter.isChainSupported(params.toChain)) {
            return null;
          }
          
          const quote = await adapter.getQuote(params);
          return {
            adapter: adapter.name,
            quote,
            score: this.calculateScore(quote),
          };
        } catch (error) {
          return null;
        }
      })
    );

    return quotes
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .sort((a, b) => b.score - a.score);
  }

  async findBestQuote(params) {
    const quotes = await this.getQuotes(params);

    if (quotes.length === 0) {
      throw new Error('No bridges available for this route');
    }

    return quotes[0];
  }

  calculateScore(quote) {
    const amount = parseFloat(quote.quote.toAmount) || 0;
    const fromAmount = parseFloat(quote.quote.fromAmount) || 1;
    const fee = quote.quote.fee || {};
    const time = quote.quote.estimatedTime || 60;
    const slippage = quote.quote.slippage || 0;

    const receiveScore = fromAmount > 0 ? amount / fromAmount : 0;
    const feeScore = fromAmount > 0 ? 1 - ((fee.fixed || 0) / fromAmount) - (fee.percentage || 0) / 100 : 0;
    const timeScore = 1 / Math.max(time / 60, 1);
    const slippageScore = 1 - slippage / 100;

    return Math.max(0, receiveScore * 0.4 + feeScore * 0.3 + timeScore * 0.2 + slippageScore * 0.1);
  }

  async executeBestQuote(params, wallet) {
    const best = await this.findBestQuote(params);
    const adapter = this.adapters.find(a => a.name === best.adapter);
    
    if (!adapter) {
      throw new Error(`Adapter ${best.adapter} not found`);
    }

    return await adapter.executeBridge(best.quote, wallet);
  }

  compareRoutes(params) {
    return this.adapters
      .filter(a => a.isChainSupported(params.fromChain) && a.isChainSupported(params.toChain))
      .map(a => ({
        name: a.name,
        supported: true,
      }));
  }
}

export function createBridgeAggregator() {
  return new BridgeAggregator();
}

export default BridgeAggregator;
