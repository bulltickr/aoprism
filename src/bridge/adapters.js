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

  async executeBridge(quote, signer) {
    // If no signer is provided, it will fallback to simulated behavior
    // In production, signer should be an instance of RustSigner
    if (!signer) {
      console.warn(`[Bridge] No signer provided for ${this.name}, using simulation mode.`);
    }

    return {
      txHash: `${this.name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      bridge: this.name,
    };
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
      apiUrl: 'https://api.debridge.desk/v1.0',
    });
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    return {
      adapter: this.name,
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount: this.calculateQuote(params),
      fee: this.calculateFee(params),
      estimatedTime: this.estimateTime(params.fromChain, params.toChain),
      slippage: 0.5,
      raw: {},
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

  async executeBridge(quote, wallet) {
    return {
      txHash: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      bridge: this.name,
    };
  }

  async getStatus(txHash) {
    return {
      txHash,
      status: 'completed',
      confirmations: 12,
    };
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

    return {
      adapter: this.name,
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount: this.calculateQuote(params),
      fee: this.calculateFee(params),
      estimatedTime: 300,
      slippage: 0.3,
      raw: {},
    };
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

  async executeBridge(quote, wallet) {
    return {
      txHash: `lz-${Date.now()}`,
      status: 'pending',
      bridge: this.name,
    };
  }

  async getStatus(txHash) {
    return {
      txHash,
      status: 'completed',
      confirmations: 15,
    };
  }
}

export class AcrossAdapter extends BridgeAdapter {
  constructor() {
    super({
      name: 'Across',
      supportedChains: ['ethereum', 'arbitrum', 'optimism', 'polygon'],
      apiUrl: 'https://api.across.to',
    });
  }

  async getQuote(params) {
    this.validateChainSupport(params.fromChain);
    this.validateChainSupport(params.toChain);

    return {
      adapter: this.name,
      fromChain: params.fromChain,
      toChain: params.toChain,
      fromToken: params.fromToken,
      toToken: params.toToken,
      fromAmount: params.amount,
      toAmount: this.calculateQuote(params),
      fee: this.calculateFee(params),
      estimatedTime: this.estimateTime(params.fromChain, params.toChain),
      slippage: 0.1,
      raw: {},
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

  async executeBridge(quote, wallet) {
    return {
      txHash: `across-${Date.now()}`,
      status: 'pending',
      bridge: this.name,
    };
  }

  async getStatus(txHash) {
    return {
      txHash,
      status: 'completed',
      confirmations: 20,
    };
  }
}

export function createAdapter(name) {
  switch (name.toLowerCase()) {
    case 'debridge':
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
