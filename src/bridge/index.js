export { BridgeAdapter, DeBridgeAdapter, LayerZeroAdapter, AcrossAdapter, createAdapter } from './adapters.js';
export { BridgeAggregator, createBridgeAggregator } from './aggregator.js';
export { BridgeSecurity, createBridgeSecurity } from './security.js';

export class CrossChainBridge {
  constructor() {
    this.aggregator = null;
    this.security = null;
  }

  initialize() {
    const { createBridgeAggregator } = require('./aggregator.js');
    const { createBridgeSecurity } = require('./security.js');

    this.aggregator = createBridgeAggregator();
    this.security = createBridgeSecurity();

    return this;
  }

  async getQuotes(params) {
    return await this.aggregator.getQuotes(params);
  }

  async getBestQuote(params) {
    return await this.aggregator.findBestQuote(params);
  }

  async executeBridge(params, wallet) {
    const quote = await this.getBestQuote(params);
    const security = await this.security.verifyTransaction(quote.quote);

    if (!security.safe) {
      throw new Error(`Bridge transaction failed security check: ${security.warnings.join(', ')}`);
    }

    const adapter = this.aggregator.getAdapter(quote.adapter);
    return await adapter.executeBridge(quote.quote, wallet);
  }

  async getTransactionStatus(txHash, adapterName) {
    const adapter = this.aggregator.getAdapter(adapterName);
    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }
    return await adapter.getStatus(txHash);
  }

  verifyTransaction(quote) {
    return this.security.verifyTransaction(quote);
  }

  getSupportedChains() {
    return this.aggregator.getSupportedChains();
  }

  isChainSupported(chain) {
    return this.aggregator.isChainSupported(chain);
  }

  compareRoutes(params) {
    return this.aggregator.compareRoutes(params);
  }
}

export function createCrossChainBridge() {
  const bridge = new CrossChainBridge();
  return bridge.initialize();
}

export default CrossChainBridge;
