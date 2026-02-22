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
      supportedChains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'avalanche', 'optimism', 'base', 'arweave'],
      apiUrl: 'https://api.dln.trade/v1.0',
    });
    this.chainIdMap = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
      base: 8453,
      arweave: 100,
    };
    this.nativeTokenAddress = '0x0000000000000000000000000000000000000000';
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    let toAmount, fee, estimatedTime, slippage, rawData;

    try {
      const apiResult = await this.fetchQuoteFromApi(params);
      toAmount = apiResult.toAmount;
      fee = apiResult.fee;
      estimatedTime = apiResult.estimatedTime;
      slippage = apiResult.slippage;
      rawData = apiResult.raw;
    } catch (error) {
      console.warn(`[deBridge] API fetch failed, using fallback:`, error.message);
      toAmount = this.calculateQuote(params);
      fee = this.calculateFee(params);
      estimatedTime = this.estimateTime(params.fromChain, params.toChain);
      slippage = 0.5;
      rawData = {};
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
      raw: rawData,
    };
  }

  async fetchQuoteFromApi(params) {
    const fromChainId = this.chainIdMap[params.fromChain];
    const toChainId = this.chainIdMap[params.toChain];

    if (!fromChainId || !toChainId) {
      throw new Error('Unsupported chain for API');
    }

    const srcTokenIn = params.fromToken || this.nativeTokenAddress;
    const dstTokenOut = params.toToken || this.nativeTokenAddress;

    const queryParams = new URLSearchParams({
      srcChainId: fromChainId.toString(),
      dstChainId: toChainId.toString(),
      srcChainTokenIn: srcTokenIn,
      dstChainTokenOut: dstTokenOut,
      srcChainTokenInAmount: params.amount,
      dstChainTokenOutAmount: '0',
      slippage: '0.5',
    });

    const url = `${this.apiUrl}/dln/quote?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`deBridge API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.errorCode) {
      throw new Error(`deBridge API error: ${data.errorCode} - ${data.message || 'Unknown error'}`);
    }

    const estimation = data.estimation || {};

    return {
      toAmount: estimation.dstChainTokenOutAmount || this.calculateQuote(params),
      fee: {
        fixed: estimation.feeAmount || 0,
        percentage: estimation.priceImpact || 0.1,
        token: estimation.feeToken || '',
      },
      estimatedTime: estimation.estimatedDuration || 600,
      slippage: estimation.slippageTolerance || 0.5,
      raw: data,
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
      apiUrl: 'https://transfer.layerzero-api.com/v1',
    });
    this.eidMap = {
      ethereum: 30101,
      bsc: 30156,
      polygon: 30109,
      arbitrum: 30110,
      avalanche: 30106,
      optimism: 30111,
      base: 30184,
      arweave: 100,
    };
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    let toAmount, fee, estimatedTime, slippage, rawData;

    try {
      const apiResult = await this.fetchQuoteFromApi(params);
      toAmount = apiResult.toAmount;
      fee = apiResult.fee;
      estimatedTime = apiResult.estimatedTime;
      slippage = apiResult.slippage;
      rawData = apiResult.raw;
    } catch (error) {
      console.warn(`[LayerZero] API fetch failed, using fallback:`, error.message);
      toAmount = this.calculateQuote(params);
      fee = this.calculateFee(params);
      estimatedTime = this.estimateTime(params.fromChain, params.toChain);
      slippage = 0.3;
      rawData = {};
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
      raw: rawData,
    };
  }

  async fetchQuoteFromApi(params) {
    const fromEid = this.eidMap[params.fromChain];
    const toEid = this.eidMap[params.toChain];

    if (!fromEid || !toEid) {
      throw new Error('Unsupported chain for LayerZero API');
    }

    const fromChainId = this.getChainId(params.fromChain);
    const toChainId = this.getChainId(params.toChain);

    const queryParams = new URLSearchParams({
      fromChainId: fromChainId.toString(),
      toChainId: toChainId.toString(),
      fromToken: params.fromToken || 'ETH',
      toToken: params.toToken || 'ETH',
      amount: params.amount,
    });

    const url = `${this.apiUrl}/quotes?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LayerZero API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`LayerZero API error: ${data.error}`);
    }

    const quote = data[0] || {};
    const route = quote.route?.[0] || {};

    return {
      toAmount: route.amountOut || this.calculateQuote(params),
      fee: {
        fixed: quote.fixedFee || 0,
        percentage: (quote.priceImpact || 0.1) / 100,
        token: quote.feeToken || '',
      },
      estimatedTime: route.estimatedTime || this.estimateTime(params.fromChain, params.toChain),
      slippage: quote.slippageTolerance || 0.3,
      raw: data,
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
      base: 0.999,
    };
    const rate = rates[params.toChain] || 0.99;
    return (parseFloat(params.amount) * rate).toString();
  }

  calculateFee(params) {
    const amount = parseFloat(params.amount);
    if (amount > 10000) return { fixed: 5, percentage: 0.1 };
    if (amount > 1000) return { fixed: 3, percentage: 0.15 };
    return { fixed: 1, percentage: 0.2 };
  }

  estimateTime(fromChain, toChain) {
    const times = {
      ethereum: { bsc: 180, polygon: 300, arbitrum: 600, avalanche: 300, optimism: 300, base: 300 },
      bsc: { ethereum: 180, polygon: 300, arbitrum: 600, avalanche: 300, optimism: 300, base: 300 },
      polygon: { ethereum: 300, bsc: 300, arbitrum: 300, avalanche: 180, optimism: 300, base: 300 },
      arbitrum: { ethereum: 600, bsc: 600, polygon: 300, avalanche: 600, optimism: 180, base: 180 },
      avalanche: { ethereum: 300, bsc: 300, polygon: 180, arbitrum: 600, optimism: 300, base: 300 },
      optimism: { ethereum: 300, bsc: 600, polygon: 300, arbitrum: 180, avalanche: 300, base: 180 },
      base: { ethereum: 300, bsc: 600, polygon: 300, arbitrum: 180, avalanche: 300, optimism: 180 },
    };
    return times[fromChain]?.[toChain] || 300;
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
      supportedChains: ['ethereum', 'arbitrum', 'optimism', 'polygon', 'bsc', 'avalanche', 'base'],
      apiUrl: 'https://app.across.to/api',
    });

    this.chainIdMap = {
      ethereum: 1,
      arbitrum: 42161,
      optimism: 10,
      polygon: 137,
      bsc: 56,
      avalanche: 43114,
      base: 8453,
    };

    this.tokenAddresses = {
      ETH: { symbol: 'ETH', decimals: 18, addresses: {} },
      USDC: { symbol: 'USDC', decimals: 6, addresses: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', 8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 10: '0x0b2C639c533813f4Aa9D7837CAf62653d1035f7', 137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' } },
      USDT: { symbol: 'USDT', decimals: 6, addresses: { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 56: '0x55d398326f99059fF775485246999027B3197955', 43114: '0x9702230A8Ea53601f5cD2dc00f3c0d8537543aA', 8453: '0x06eFdBFf2a14a7c8E1c1A78b7172faB0b7aB3b5e', 42161: '0xFd086b7C32E92cc94c94fe33E8a08A1b41Fa39d17', 10: '0x94b008aA00579c1307B0EF2c494a66954683812B', 137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' } },
      WBTC: { symbol: 'WBTC', decimals: 8, addresses: { 1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 56: '0x5a6dA4334bD8D8eB09dCd8C8b56B8aB5d8C8B8B8', 43114: '0x408D4cD0ADb7ceBd1F1A1C33A0Ba7398A20fABAF', 8453: '0x98078cE980A9cBC9C3F95Ce4B54a3B2E0F7eF4a8', 42161: '0x47c031236e19d024aff5f9A9a8381b8aCdFB7f73', 10: '0x4f8A4E616eDa39ECc46D84D3cf8C54D4A4A3F8F6', 137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6' } },
    };
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    const fromToken = params.fromToken || 'ETH';
    const toToken = params.toToken || fromToken;
    this.validateTokenSupport(fromToken);

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
    const fromChainId = this.chainIdMap[params.fromChain];
    const toChainId = this.chainIdMap[params.toChain];
    const fromToken = params.fromToken || 'ETH';
    const toToken = params.toToken || fromToken;

    const tokenSymbol = fromToken.toUpperCase();
    const tokenInfo = this.tokenAddresses[tokenSymbol] || this.tokenAddresses.ETH;
    const tokenAddress = tokenInfo.addresses?.[fromChainId] || '';

    let url = `${this.apiUrl}/suggestedRoutes?originChainId=${fromChainId}&destinationChainId=${toChainId}&token=${tokenSymbol}&amount=${params.amount}`;

    if (tokenAddress && tokenSymbol !== 'ETH') {
      url += `&tokenAddress=${tokenAddress}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Across API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Across API error: ${data.error}`);
    }

    const route = data.routes?.[0] || data.route;
    const quote = data.quote || data;

    if (!route && !quote) {
      return {
        toAmount: this.calculateQuote(params),
        fee: this.calculateFee(params),
        estimatedTime: this.estimateTime(params.fromChain, params.toChain),
        slippage: 0.1,
      };
    }

    return {
      toAmount: quote?.toAmount || route?.quote?.toAmount || this.calculateQuote(params),
      fee: { fixed: parseFloat(quote?.totalBridgeFee || route?.quote?.totalBridgeFee || 0) / 100 || 1, percentage: parseFloat(quote?.totalBridgeFeePct || route?.quote?.totalBridgeFeePct || 0.05) },
      estimatedTime: quote?.estimatedFillTime || route?.quote?.estimatedFillTime || this.estimateTime(params.fromChain, params.toChain),
      slippage: quote?.slippage || route?.quote?.slippage || 0.1,
    };
  }

  validateTokenSupport(token) {
    const supportedTokens = ['ETH', 'USDC', 'USDT', 'WBTC'];
    if (!supportedTokens.includes(token.toUpperCase())) {
      console.warn(`[Across] Token ${token} not fully supported, using ETH fallback`);
    }
  }

  calculateQuote(params) {
    const fromToken = params.fromToken?.toUpperCase() || 'ETH';
    const tokenInfo = this.tokenAddresses[fromToken] || this.tokenAddresses.ETH;
    const decimals = tokenInfo.decimals || 18;
    const amount = parseFloat(params.amount);
    const adjustedAmount = decimals === 6 ? amount * 0.9995 : amount * 0.999;
    return adjustedAmount.toFixed(decimals);
  }

  calculateFee(params) {
    const fromToken = params.fromToken?.toUpperCase() || 'ETH';
    const feeMap = {
      ETH: { fixed: 1, percentage: 0.05 },
      USDC: { fixed: 0.01, percentage: 0.03 },
      USDT: { fixed: 0.01, percentage: 0.03 },
      WBTC: { fixed: 0.0001, percentage: 0.05 },
    };
    return feeMap[fromToken] || feeMap.ETH;
  }

  estimateTime(fromChain, toChain) {
    const times = {
      'ethereum-arbitrum': 180,
      'ethereum-optimism': 180,
      'ethereum-polygon': 300,
      'ethereum-bsc': 600,
      'ethereum-avalanche': 600,
      'ethereum-base': 300,
      'arbitrum-ethereum': 180,
      'optimism-ethereum': 180,
      'polygon-ethereum': 300,
      'bsc-ethereum': 600,
      'avalanche-ethereum': 600,
      'base-ethereum': 300,
    };
    return times[`${fromChain}-${toChain}`] || 600;
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
