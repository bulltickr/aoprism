export class BridgeAdapter {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.supportedChains = config.supportedChains || [];
    this.apiUrl = config.apiUrl || '';
  }

  async getQuote(params) {
    throw new Error(`${this.name}: getQuote must be implemented`);
  }

  /**
   * Returns a deeplink URL to the native platform to execute the bridge.
   * AOPRISM is a quote aggregator only — no transactions are signed or submitted.
   */
  getPlatformLink(quote) {
    return {
      url: this.buildPlatformUrl(quote),
      label: `Bridge on ${this.name}`,
      bridge: this.name,
    };
  }

  buildPlatformUrl(quote) {
    // Subclasses override this with their specific deep-link format
    return `https://app.${this.name.toLowerCase()}.finance`;
  }

  async getStatus(txHash) {
    throw new Error(`${this.name}: getStatus must be implemented`);
  }

  async estimateTime(fromChain, toChain) {
    throw new Error(`${this.name}: estimateTime must be implemented`);
  }

  validateChainSupport(chain) {
    if (!this.supportedChains.includes(chain)) {
      throw new Error(`${this.name} does not support ${chain}. Supported: ${this.supportedChains.join(', ')}`);
    }
  }

  isChainSupported(chain) {
    return this.supportedChains.includes(chain);
  }

  getChainId(chainName) {
    const chainIds = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
      solana: 7565164,
      base: 8453,
      arweave: 100,
    };
    return chainIds[chainName];
  }

  getChainName(chainId) {
    const names = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      43114: 'avalanche',
      7565164: 'solana',
      8453: 'base',
      100: 'arweave',
    };
    return names[chainId];
  }
}

export class DeBridgeAdapter extends BridgeAdapter {
  constructor() {
    super({
      name: 'deBridge',
      supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche', 'optimism', 'arweave'],
      apiUrl: 'https://api.debridge.finance/v1.0',
    });
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    // Try real API first, fallback to calculation
    let toAmount, fee, estimatedTime, slippage;

    try {
      const apiResult = await this.fetchQuoteFromApi(params);
      toAmount = apiResult.toAmount;
      fee = apiResult.fee;
      estimatedTime = apiResult.estimatedTime;
      slippage = apiResult.slippage;
    } catch (error) {
      console.warn(`[deBridge] API fetch failed, using fallback:`, error.message);
      // Fallback to calculation
      toAmount = this.calculateQuote(params);
      fee = this.calculateFee(params);
      estimatedTime = this.estimateTime(params.fromChain, params.toChain);
      slippage = 0.5;
    }

    return {
      adapter: this.name,
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount,
      fee,
      estimatedTime,
      slippage,
      raw: {},
    };
  }

  async fetchQuoteFromApi(params) {
    const chainIdMap = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
      base: 8453,
    };

    const fromChainId = chainIdMap[params.fromChain];
    const toChainId = chainIdMap[params.toChain];

    if (!fromChainId || !toChainId) {
      throw new Error('Unsupported chain for API');
    }

    // deBridge API for quote estimation
    const url = `${this.apiUrl}/quote?fromChainId=${fromChainId}&toChainId=${toChainId}&fromTokenAddress=${params.fromToken || '0x0000000000000000000000000000000000000000'}&toTokenAddress=${params.toToken || '0x0000000000000000000000000000000000000000'}&amount=${params.amount}&fromAddress=0x0000000000000000000000000000000000000000`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`deBridge API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      toAmount: data.toAmount || this.calculateQuote(params),
      fee: { fixed: data.fixedFee || 1, percentage: data.priceImpact || 0.1 },
      estimatedTime: data.estimatedDuration || 600,
      slippage: data.slippageTolerance || 0.5,
    };
  }

  calculateQuote(params) {
    const rates = {
      ethereum: 1,
      bsc: 0.998,
      polygon: 0.997,
      arbitrum: 0.999,
      avalanche: 0.996,
      optimism: 0.998,
    };
    const rate = rates[params.toChain] || 0.99;
    return (parseFloat(params.amount) * rate).toString();
  }

  calculateFee(params) {
    const amount = parseFloat(params.amount);
    if (amount > 10000) return { fixed: 5, percentage: 0.1 };
    if (amount > 1000) return { fixed: 3, percentage: 0.2 };
    return { fixed: 1, percentage: 0.3 };
  }

  estimateTime(fromChain, toChain) {
    const times = {
      ethereum: { bsc: 300, polygon: 600, arbitrum: 900 },
      bsc: { ethereum: 300, polygon: 600, arbitrum: 900 },
      polygon: { ethereum: 600, bsc: 600, arbitrum: 300 },
      arbitrum: { ethereum: 900, bsc: 900, polygon: 300 },
    };
    return times[fromChain]?.[toChain] || 600;
  }

  buildPlatformUrl(quote) {
    const chainIdMap = { ethereum: 1, bsc: 56, polygon: 137, arbitrum: 42161, optimism: 10, avalanche: 43114, base: 8453 };
    const srcChainId = chainIdMap[quote.fromChain] || 1;
    const dstChainId = chainIdMap[quote.toChain] || 42161;
    const token = quote.fromToken || '0x0000000000000000000000000000000000000000';
    return `https://app.debridge.finance/deport?inputChain=${srcChainId}&outputChain=${dstChainId}&inputCurrency=${token}&amount=${quote.fromAmount}`;
  }
}

export class LayerZeroAdapter extends BridgeAdapter {
  constructor() {
    super({
      name: 'LayerZero',
      supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche', 'optimism', 'base', 'arweave'],
      apiUrl: 'https://api.layerzero.network',
    });
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    // Try real API first
    let toAmount, fee, estimatedTime, slippage;

    try {
      const apiResult = await this.fetchQuoteFromApi(params);
      toAmount = apiResult.toAmount;
      fee = apiResult.fee;
      estimatedTime = apiResult.estimatedTime;
      slippage = apiResult.slippage;
    } catch (error) {
      console.warn(`[LayerZero] API fetch failed, using fallback:`, error.message);
      toAmount = this.calculateQuote(params);
      fee = this.calculateFee(params);
      estimatedTime = 300;
      slippage = 0.3;
    }

    return {
      adapter: this.name,
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount,
      fee,
      estimatedTime,
      slippage,
      raw: {},
    };
  }

  async fetchQuoteFromApi(params) {
    // LayerZero doesn't have a public quote API, but we can check
    // their docs for aggregator integration
    // For now, throw to trigger fallback
    throw new Error('LayerZero quote API not publicly available');
  }

  calculateQuote(params) {
    return (parseFloat(params.amount) * 0.998).toString();
  }

  calculateFee(params) {
    return { fixed: 2, percentage: 0.15 };
  }

  estimateTime() {
    return 300;
  }

  buildPlatformUrl(quote) {
    // LayerZero's primary end-user bridge UI is Stargate
    const chainMap = { ethereum: 'ethereum', arbitrum: 'arbitrum', optimism: 'optimism', polygon: 'polygon', base: 'base', avalanche: 'avalanche' };
    const src = chainMap[quote.fromChain] || 'ethereum';
    const dst = chainMap[quote.toChain] || 'arbitrum';
    return `https://stargate.finance/bridge?srcChain=${src}&dstChain=${dst}`;
  }
}

export class AcrossAdapter extends BridgeAdapter {
  constructor() {
    super({
      name: 'Across',
      supportedChains: ['ethereum', 'arbitrum', 'optimism', 'polygon'],
      apiUrl: 'https://app.across.to',
    });
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    // Try real API first
    let toAmount, fee, estimatedTime, slippage;

    try {
      const apiResult = await this.fetchQuoteFromApi(params);
      toAmount = apiResult.toAmount;
      fee = apiResult.fee;
      estimatedTime = apiResult.estimatedTime;
      slippage = apiResult.slippage;
    } catch (error) {
      console.warn(`[Across] API fetch failed, using fallback:`, error.message);
      toAmount = this.calculateQuote(params);
      fee = this.calculateFee(params);
      estimatedTime = this.estimateTime(params.fromChain, params.toChain);
      slippage = 0.1;
    }

    return {
      adapter: this.name,
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount,
      fee,
      estimatedTime,
      slippage,
      raw: {},
    };
  }

  async fetchQuoteFromApi(params) {
    const chainIdMap = {
      ethereum: 1,
      arbitrum: 42161,
      optimism: 10,
      polygon: 137,
    };

    const fromChainId = chainIdMap[params.fromChain];
    const toChainId = chainIdMap[params.toChain];

    const url = `${this.apiUrl}/api/suggestedRoutes?originChainId=${fromChainId}&destinationChainId=${toChainId}&token=${params.fromToken || 'ETH'}&amount=${params.amount}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Across API error: ${response.status}`);
    }

    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
      throw new Error('No route found');
    }

    return {
      toAmount: route.quote?.toAmount || this.calculateQuote(params),
      fee: { fixed: 1, percentage: route.quote?.totalBridgeFee || 0.05 },
      estimatedTime: route.quote?.estimatedFillTime || this.estimateTime(params.fromChain, params.toChain),
      slippage: route.quote?.slippage || 0.1,
    };
  }

  calculateQuote(params) {
    return (parseFloat(params.amount) * 0.999).toString();
  }

  calculateFee(params) {
    return { fixed: 1, percentage: 0.05 };
  }

  estimateTime(fromChain, toChain) {
    if (fromChain === 'ethereum' && toChain === 'arbitrum') return 180;
    return 600;
  }

  buildPlatformUrl(quote) {
    const chainIdMap = { ethereum: 1, arbitrum: 42161, optimism: 10, polygon: 137 };
    const originId = chainIdMap[quote.fromChain] || 1;
    const destId = chainIdMap[quote.toChain] || 42161;
    const token = quote.fromToken || '0x0000000000000000000000000000000000000000';
    return `https://app.across.to/?originChainId=${originId}&destinationChainId=${destId}&inputToken=${token}&amount=${quote.fromAmount}`;
  }
}

export function createAdapter(name) {
  switch (name.toLowerCase()) {
    case 'debridge':
      return new DeBridgeAdapter();
    case 'layerzero':
    case 'lz':
      return new LayerZeroAdapter();
    case 'across':
      return new AcrossAdapter();
    default:
      throw new Error(`Unknown adapter: ${name}`);
  }
}

export default BridgeAdapter;
