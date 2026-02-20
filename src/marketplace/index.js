export * from './schema.js';
export * from './search.js';
export * from './dependencies.js';
export * from './reviews.js';

export class ProcessMarketplace {
  constructor() {
    this.processes = new Map();
    this.search = null;
    this.dependencies = null;
    this.reviews = null;
  }

  initialize(processes = []) {
    const { MarketplaceSearch } = require('./search.js');
    const { DependencyResolver } = require('./dependencies.js');
    const { ReviewSystem } = require('./reviews.js');

    for (const process of processes) {
      this.processes.set(process.id, process);
    }

    this.search = new MarketplaceSearch(processes);
    this.dependencies = new DependencyResolver(processes);
    this.reviews = new ReviewSystem();

    return this;
  }

  addProcess(process) {
    this.processes.set(process.id, process);
    this.search?.addProcess(process);
    this.dependencies?.addProcess(process);
  }

  updateProcess(processId, updates) {
    const process = this.processes.get(processId);
    if (!process) return null;

    const updated = { ...process, ...updates, updatedAt: new Date().toISOString() };
    this.processes.set(processId, updated);

    this.search?.removeProcess(processId);
    this.search?.addProcess(updated);

    this.dependencies?.removeProcess(processId);
    this.dependencies?.addProcess(updated);

    return updated;
  }

  removeProcess(processId) {
    this.processes.delete(processId);
    this.search?.removeProcess(processId);
    this.dependencies?.removeProcess(processId);
    this.reviews?.reviews.delete(processId);
  }

  getProcess(processId) {
    return this.processes.get(processId) || null;
  }

  getAllProcesses() {
    return Array.from(this.processes.values());
  }

  searchProcesses(query, filters) {
    return this.search?.search(query, filters) || [];
  }

  getTrending() {
    return this.search?.getTrending() || [];
  }

  getRecentlyUpdated() {
    return this.search?.getRecentlyUpdated() || [];
  }

  getTopRated() {
    return this.search?.getTopRated() || [];
  }

  getByCategory(category) {
    return this.search?.getByCategory(category) || [];
  }

  getDependencies(processId) {
    return this.dependencies?.resolve(processId) || [];
  }

  getDependents(processId) {
    return this.dependencies?.getDependents(processId) || [];
  }

  getReviews(processId) {
    return this.reviews?.getReviews(processId) || [];
  }

  addReview(processId, review) {
    return this.reviews?.addReview(processId, review);
  }

  getAverageRating(processId) {
    return this.reviews?.getAverageRating(processId) || { rating: 0, count: 0 };
  }

  exportData() {
    return JSON.stringify({
      processes: Array.from(this.processes.values()),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.processes && Array.isArray(data.processes)) {
        for (const process of data.processes) {
          this.addProcess(process);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export function createMarketplace(processes) {
  const marketplace = new ProcessMarketplace();
  return marketplace.initialize(processes);
}

export default ProcessMarketplace;
