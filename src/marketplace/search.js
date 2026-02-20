export class MarketplaceSearch {
  constructor(processes = []) {
    this.processes = new Map();
    this.index = new Map();
    
    for (const process of processes) {
      this.addProcess(process);
    }
  }

  addProcess(process) {
    this.processes.set(process.id, process);
    this.indexProcess(process);
  }

  removeProcess(processId) {
    const process = this.processes.get(processId);
    if (process) {
      this.removeFromIndex(process);
      this.processes.delete(processId);
    }
  }

  indexProcess(process) {
    const tokens = this.tokenize(process);
    
    for (const token of tokens) {
      if (!this.index.has(token)) {
        this.index.set(token, new Set());
      }
      this.index.get(token).add(process.id);
    }
  }

  removeFromIndex(process) {
    const tokens = this.tokenize(process);
    
    for (const token of tokens) {
      const set = this.index.get(token);
      if (set) {
        set.delete(process.id);
        if (set.size === 0) {
          this.index.delete(token);
        }
      }
    }
  }

  tokenize(process) {
    const text = [
      process.name,
      process.description,
      ...(process.tags || []),
      process.category,
      process.author?.name || '',
    ].join(' ').toLowerCase();

    return text
      .split(/\s+/)
      .filter(token => token.length > 2)
      .filter(token => !this.stopWords.has(token));
  }

  get stopWords() {
    return new Set([
      'the', 'and', 'for', 'that', 'this', 'with', 'from',
      'have', 'will', 'been', 'were', 'their', 'what', 'about',
      'which', 'when', 'make', 'like', 'time', 'just', 'know',
      'take', 'people', 'into', 'year', 'your', 'good', 'some',
      'could', 'them', 'see', 'other', 'than', 'then', 'now',
      'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work',
      'first', 'well', 'way', 'even', 'new', 'want', 'because',
      'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are',
    ]);
  }

  search(query, filters = {}) {
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    if (queryTokens.length === 0) {
      return this.applyFilters(this.getAllProcesses(), filters);
    }

    const matches = new Map();

    for (const token of queryTokens) {
      const processIds = this.index.get(token) || new Set();
      
      for (const id of processIds) {
        matches.set(id, (matches.get(id) || 0) + 1);
      }
      
      const partialMatches = this.partialMatch(token);
      for (const id of partialMatches) {
        matches.set(id, (matches.get(id) || 0) + 0.5);
      }
    }

    const results = Array.from(matches.entries())
      .map(([id, score]) => ({
        process: this.processes.get(id),
        relevanceScore: score,
      }))
      .filter(item => item.process !== undefined)
      .filter(item => this.matchesFilters(item.process, filters))
      .sort((a, b) => {
        const scoreA = this.calculateFinalScore(a);
        const scoreB = this.calculateFinalScore(b);
        return scoreB - scoreA;
      });

    return results.map(r => r.process);
  }

  partialMatch(token) {
    const matches = new Set();
    
    for (const indexedToken of this.index.keys()) {
      if (indexedToken.includes(token)) {
        const processIds = this.index.get(indexedToken);
        for (const id of processIds) {
          matches.add(id);
        }
      }
    }
    
    return matches;
  }

  getAllProcesses() {
    return Array.from(this.processes.values());
  }

  applyFilters(processes, filters) {
    return processes.filter(p => this.matchesFilters(p, filters));
  }

  matchesFilters(process, filters) {
    if (filters.category && process.category !== filters.category) {
      return false;
    }

    if (filters.minRating && (process.stats?.rating || 0) < filters.minRating) {
      return false;
    }

    if (filters.pricing && process.pricing?.type !== filters.pricing) {
      return false;
    }

    if (filters.verified && !process.verification?.audited) {
      return false;
    }

    if (filters.tags && filters.tags.length > 0) {
      const hasTag = filters.tags.some(tag => 
        (process.tags || []).includes(tag)
      );
      if (!hasTag) return false;
    }

    if (filters.author) {
      const authorMatch = process.author?.name?.toLowerCase().includes(filters.author.toLowerCase());
      if (!authorMatch) return false;
    }

    if (filters.minDownloads && (process.stats?.downloads || 0) < filters.minDownloads) {
      return false;
    }

    return true;
  }

  calculateFinalScore({ process, relevanceScore }) {
    const ratingWeight = (process.stats?.rating || 0) * 0.2;
    const downloadWeight = Math.log((process.stats?.downloads || 0) + 1) * 0.1;
    const recencyWeight = this.calculateRecencyScore(process) * 0.1;
    const reviewWeight = (process.stats?.reviewCount || 0) * 0.05;
    
    return relevanceScore + ratingWeight + downloadWeight + recencyWeight + reviewWeight;
  }

  calculateRecencyScore(process) {
    if (!process.updatedAt) return 0;
    
    const age = Date.now() - new Date(process.updatedAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    return Math.max(0, 30 - days) / 30;
  }

  getSuggestions(query, limit = 5) {
    const results = this.search(query, {}, limit);
    return results.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
    }));
  }

  getTrending(limit = 10) {
    return this.getAllProcesses()
      .sort((a, b) => (b.stats?.downloads || 0) - (a.stats?.downloads || 0))
      .slice(0, limit);
  }

  getRecentlyUpdated(limit = 10) {
    return this.getAllProcesses()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limit);
  }

  getTopRated(limit = 10) {
    return this.getAllProcesses()
      .sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0))
      .slice(0, limit);
  }

  getByCategory(category, limit = 20) {
    return this.search('', { category }).slice(0, limit);
  }

  getAllCategories() {
    const categories = new Set();
    
    for (const process of this.processes.values()) {
      categories.add(process.category);
    }
    
    return Array.from(categories);
  }

  getAllTags() {
    const tags = new Set();
    
    for (const process of this.processes.values()) {
      for (const tag of (process.tags || [])) {
        tags.add(tag);
      }
    }
    
    return Array.from(tags).sort();
  }
}

export function createSearch(processes) {
  return new MarketplaceSearch(processes);
}

export default MarketplaceSearch;
