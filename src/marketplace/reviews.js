import { DEFAULTS } from '../core/config.js'
import { makeAoClient } from '../core/aoClient.js'

export class ReviewSystem {
  constructor(config = {}) {
    this.reviews = new Map();
    this.aoProcess = config.aoProcess || DEFAULTS.REGISTRY_ID
    this.cacheEnabled = config.cacheEnabled !== false
    this.useAO = config.useAO !== false
  }

  async syncWithAO() {
    if (!this.useAO) return

    try {
      const state = {}
      const { ao } = await makeAoClient({
        jwk: state.jwk,
        URL: DEFAULTS.URL,
        SCHEDULER: DEFAULTS.SCHEDULER
      })

      const result = await ao.dryrun({
        process: this.aoProcess,
        tags: [{ name: 'Action', value: 'GetReviews' }]
      })

      if (result?.Output?.messages) {
        for (const msg of result.Output.messages) {
          try {
            const reviewData = JSON.parse(msg.Data || msg.data)
            if (reviewData.processId && reviewData.rating) {
              this.reviews.set(reviewData.processId, reviewData.reviews || [])
            }
          } catch (e) {
            // Skip invalid review data
          }
        }
      }
    } catch (error) {
      console.warn('[ReviewSystem] AO sync failed:', error.message)
    }
  }

  async addReview(processId, review) {
    const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newReview = {
      id: reviewId,
      processId,
      author: {
        name: review.author?.name || 'Anonymous',
        address: review.author?.address || '',
        avatar: review.author?.avatar || '',
      },
      rating: Math.min(5, Math.max(1, review.rating || 3)),
      title: review.title || '',
      content: review.content || '',
      verified: review.verified || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      helpful: 0,
      notHelpful: 0,
      responses: [],
    };

    if (!this.reviews.has(processId)) {
      this.reviews.set(processId, []);
    }

    this.reviews.get(processId).push(newReview);

    // Persist to AO
    if (this.useAO) {
      await this.persistToAO(processId)
    }

    return newReview;
  }

  async persistToAO(processId) {
    try {
      const state = {}
      const { ao, signer } = await makeAoClient({
        jwk: state.jwk,
        URL: DEFAULTS.URL,
        SCHEDULER: DEFAULTS.SCHEDULER
      })

      const reviews = this.reviews.get(processId) || []

      await ao.message({
        process: this.aoProcess,
        tags: [
          { name: 'Action', value: 'SaveReviews' },
          { name: 'ProcessId', value: processId }
        ],
        data: JSON.stringify({ processId, reviews }),
        signer
      })
    } catch (error) {
      console.warn('[ReviewSystem] Persist failed:', error.message)
      // Data stays in memory cache
    }
  }

  async updateReview(processId, reviewId, updates) {
    const processReviews = this.reviews.get(processId);
    if (!processReviews) return null;

    const review = processReviews.find(r => r.id === reviewId);
    if (!review) return null;

    if (updates.rating !== undefined) {
      review.rating = Math.min(5, Math.max(1, updates.rating));
    }
    if (updates.title !== undefined) {
      review.title = updates.title;
    }
    if (updates.content !== undefined) {
      review.content = updates.content;
    }

    review.updatedAt = new Date().toISOString();

    // Persist to AO
    if (this.useAO) {
      await this.persistToAO(processId)
    }

    return review;
  }

  async deleteReview(processId, reviewId) {
    const processReviews = this.reviews.get(processId);
    if (!processReviews) return false;

    const index = processReviews.findIndex(r => r.id === reviewId);
    if (index === -1) return false;

    processReviews.splice(index, 1);

    // Persist to AO
    if (this.useAO) {
      await this.persistToAO(processId)
    }

    return true;
  }

  getReviews(processId) {
    return (this.reviews.get(processId) || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  getReview(processId, reviewId) {
    const processReviews = this.reviews.get(processId);
    if (!processReviews) return null;

    return processReviews.find(r => r.id === reviewId) || null;
  }

  getAverageRating(processId) {
    const reviews = this.reviews.get(processId);
    if (!reviews || reviews.length === 0) {
      return { rating: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      rating: sum / reviews.length,
      count: reviews.length,
    };
  }

  getRatingDistribution(processId) {
    const reviews = this.reviews.get(processId);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (!reviews) return distribution;

    for (const review of reviews) {
      const rating = Math.round(review.rating);
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    }

    return distribution;
  }

  addResponse(processId, reviewId, response) {
    const review = this.getReview(processId, reviewId);
    if (!review) return null;

    const newResponse = {
      id: `response-${Date.now()}`,
      author: {
        name: response.author?.name || 'Author',
        address: response.author?.address || '',
      },
      content: response.content || '',
      createdAt: new Date().toISOString(),
    };

    review.responses.push(newResponse);
    return newResponse;
  }

  markHelpful(processId, reviewId) {
    const review = this.getReview(processId, reviewId);
    if (!review) return false;

    review.helpful++;

    if (this.useAO) {
      this.persistToAO(processId).catch(console.warn)
    }

    return true;
  }

  markNotHelpful(processId, reviewId) {
    const review = this.getReview(processId, reviewId);
    if (!review) return false;

    review.notHelpful++;

    if (this.useAO) {
      this.persistToAO(processId).catch(console.warn)
    }

    return true;
  }

  getVerifiedReviews(processId) {
    return this.getReviews(processId).filter(r => r.verified);
  }

  getRecentReviews(processId, limit = 10) {
    return this.getReviews(processId).slice(0, limit);
  }

  getTopReviews(processId, limit = 10) {
    return this.getReviews(processId)
      .sort((a, b) => b.helpful - a.helpful)
      .slice(0, limit);
  }

  exportReviews(processId) {
    const reviews = this.getReviews(processId);
    return JSON.stringify(reviews, null, 2);
  }

  importReviews(processId, jsonData) {
    try {
      const reviews = JSON.parse(jsonData);

      if (!Array.isArray(reviews)) {
        throw new Error('Invalid review data');
      }

      if (!this.reviews.has(processId)) {
        this.reviews.set(processId, []);
      }

      for (const review of reviews) {
        if (review.id && review.rating) {
          this.reviews.get(processId).push(review);
        }
      }

      return { success: true, count: reviews.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export function createReviewSystem(config) {
  return new ReviewSystem(config);
}

export default ReviewSystem;
