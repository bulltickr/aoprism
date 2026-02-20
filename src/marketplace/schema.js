export const ProcessCategory = {
  TOKENS: 'tokens',
  DEFI: 'defi',
  DAO: 'dao',
  GAMING: 'gaming',
  SOCIAL: 'social',
  INFRASTRUCTURE: 'infrastructure',
  AI: 'ai',
  OTHER: 'other',
};

export const PricingType = {
  FREE: 'free',
  PAID: 'paid',
  FREEMIUM: 'freemium',
};

export const LicenseType = {
  PERPETUAL: 'perpetual',
  SUBSCRIPTION: 'subscription',
};

export function createProcessMetadata(data) {
  return {
    id: data.id || `process-${Date.now()}`,
    name: data.name,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    description: data.description || '',
    
    version: data.version || '1.0.0',
    changelog: data.changelog || [],
    
    author: {
      name: data.author?.name || 'Anonymous',
      address: data.author?.address || '',
      avatar: data.author?.avatar || '',
      reputation: data.author?.reputation || 0,
    },
    
    code: {
      lua: data.code?.lua || '',
      size: data.code?.size || 0,
      hash: data.code?.hash || '',
      url: data.code?.url || '',
    },
    
    category: data.category || ProcessCategory.OTHER,
    tags: data.tags || [],
    
    dependencies: data.dependencies || [],
    
    documentation: {
      readme: data.documentation?.readme || '',
      examples: data.documentation?.examples || [],
      api: data.documentation?.api || [],
    },
    
    stats: {
      downloads: data.stats?.downloads || 0,
      activeInstalls: data.stats?.activeInstalls || 0,
      rating: data.stats?.rating || 0,
      reviewCount: data.stats?.reviewCount || 0,
    },
    
    pricing: {
      type: data.pricing?.type || PricingType.FREE,
      amount: data.pricing?.amount || 0,
      token: data.pricing?.token || '',
      license: data.pricing?.license || LicenseType.PERPETUAL,
    },
    
    verification: {
      audited: data.verification?.audited || false,
      auditor: data.verification?.auditor || '',
      auditReport: data.verification?.auditReport || '',
      auditDate: data.verification?.auditDate || '',
    },
    
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function validateProcessMetadata(metadata) {
  const errors = [];

  if (!metadata.name || metadata.name.length < 1) {
    errors.push('Name is required');
  }

  if (!metadata.name || metadata.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  if (!metadata.description || metadata.description.length > 5000) {
    errors.push('Description must be less than 5000 characters');
  }

  if (!metadata.code?.lua) {
    errors.push('Lua code is required');
  }

  if (metadata.tags && metadata.tags.length > 10) {
    errors.push('Maximum 10 tags allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function serializeMetadata(metadata) {
  return JSON.stringify(metadata, null, 2);
}

export function deserializeMetadata(json) {
  try {
    const metadata = JSON.parse(json);
    return { success: true, data: metadata };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function calculateHash(luaCode) {
  let hash = 0;
  for (let i = 0; i < luaCode.length; i++) {
    const char = luaCode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export default {
  ProcessCategory,
  PricingType,
  LicenseType,
  createProcessMetadata,
  validateProcessMetadata,
  serializeMetadata,
  deserializeMetadata,
  calculateHash,
};
