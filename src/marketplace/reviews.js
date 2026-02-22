import { DEFAULTS } from '../core/config.js'
import { makeAoClient, sendAndGetResult } from '../core/aoClient.js'

const REPUTATION_PROCESS = 'REP_OCD6pWMJPgU8g2MKg3E6vMnLgA2XrTkBhCjF9VmQz0'

export class ReputationRegistry {
  constructor(config = {}) {
    this.reviews = new Map()
    this.aoProcess = config.aoProcess || REPUTATION_PROCESS
    this.useAO = config.useAO !== false
    this.cacheEnabled = config.cacheEnabled !== false
    this.signer = null
    this.ao = null
    this.relayUrl = null
    this.autoRelay = null
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) return
    
    try {
      const result = await makeAoClient({
        URL: DEFAULTS.URL,
        SCHEDULER: DEFAULTS.SCHEDULER
      })
      this.ao = result.ao
      this.signer = result.signer
      this.relayUrl = result.relayUrl
      this.autoRelay = result.autoRelay
      this.initialized = true
    } catch (error) {
      console.warn('[ReputationRegistry] Initialize failed:', error.message)
    }
  }

  async submitReview(processId, rating, comment, reviewer = {}) {
    if (!processId || !rating) {
      throw new Error('processId and rating are required')
    }

    const validatedRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 3))
    const timestamp = Date.now()
    const reviewId = `rev_${timestamp}_${Math.random().toString(36).substr(2, 9)}`

    const review = {
      id: reviewId,
      processId,
      reviewer: reviewer.address || reviewer.name || 'Anonymous',
      rating: validatedRating,
      comment: String(comment || ''),
      timestamp: timestamp,
      createdAt: new Date(timestamp).toISOString()
    }

    if (this.cacheEnabled) {
      if (!this.reviews.has(processId)) {
        this.reviews.set(processId, [])
      }
      this.reviews.get(processId).push(review)
    }

    if (this.useAO && this.ao) {
      try {
        await this.persistReviewToAO(review)
      } catch (error) {
        console.warn('[ReputationRegistry] Submit to AO failed:', error.message)
      }
    }

    return review
  }

  async persistReviewToAO(review) {
    const tags = [
      { name: 'Action', value: 'SubmitReview' },
      { name: 'Reviewer', value: review.reviewer },
      { name: 'Rating', value: String(review.rating) },
      { name: 'Comment', value: review.comment },
      { name: 'ProcessId', value: review.processId },
      { name: 'Timestamp', value: String(review.timestamp) },
      { name: 'ReviewId', value: review.id }
    ]

    const data = JSON.stringify({
      id: review.id,
      processId: review.processId,
      reviewer: review.reviewer,
      rating: review.rating,
      comment: review.comment,
      timestamp: review.timestamp
    })

    await sendAndGetResult({
      ao: this.ao,
      signer: this.signer,
      process: this.aoProcess,
      tags,
      data,
      relayUrl: this.relayUrl,
      autoRelay: this.autoRelay
    })
  }

  async getReviews(processId) {
    if (this.cacheEnabled && this.reviews.has(processId)) {
      return this.reviews.get(processId).sort((a, b) => b.timestamp - a.timestamp)
    }

    if (!this.useAO || !this.ao) {
      return []
    }

    try {
      const result = await this.ao.dryrun({
        process: this.aoProcess,
        tags: [
          { name: 'Action', value: 'GetReviews' },
          { name: 'ProcessId', value: processId }
        ]
      })

      const reviews = this.parseReviewsFromResult(result, processId)

      if (this.cacheEnabled) {
        this.reviews.set(processId, reviews)
      }

      return reviews.sort((a, b) => b.timestamp - a.timestamp)
    } catch (error) {
      console.warn('[ReputationRegistry] Get reviews failed:', error.message)
      return this.cacheEnabled ? (this.reviews.get(processId) || []) : []
    }
  }

  parseReviewsFromResult(result, processId) {
    const reviews = []
    
    if (!result?.Output?.messages) {
      return reviews
    }

    for (const msg of result.Output.messages) {
      try {
        const data = msg.Data || msg.data
        if (!data) continue

        const reviewData = JSON.parse(data)
        
        if (reviewData.processId === processId || reviewData.ProcessId === processId) {
          reviews.push({
            id: reviewData.id || reviewData.ReviewId,
            processId: reviewData.processId || reviewData.ProcessId,
            reviewer: reviewData.reviewer || reviewData.Reviewer,
            rating: parseInt(reviewData.rating || reviewData.Rating, 10),
            comment: reviewData.comment || reviewData.Comment,
            timestamp: parseInt(reviewData.timestamp || reviewData.Timestamp, 10),
            createdAt: reviewData.createdAt || new Date(parseInt(reviewData.timestamp, 10)).toISOString()
          })
        }
      } catch (e) {
        // Skip invalid review data
      }
    }

    return reviews
  }

  async getAverageRating(processId) {
    const reviews = await this.getReviews(processId)
    
    if (!reviews || reviews.length === 0) {
      return { rating: 0, count: 0 }
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return {
      rating: parseFloat((sum / reviews.length).toFixed(1)),
      count: reviews.length
    }
  }

  async getRatingDistribution(processId) {
    const reviews = await this.getReviews(processId)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    for (const review of reviews) {
      const rating = Math.round(review.rating)
      if (distribution[rating] !== undefined) {
        distribution[rating]++
      }
    }

    return distribution
  }

  async getReviewerReputation(reviewer) {
    const allReviews = []
    
    for (const [processId, reviews] of this.reviews) {
      allReviews.push(...reviews.filter(r => r.reviewer === reviewer))
    }

    if (allReviews.length === 0) {
      return { totalReviews: 0, averageGiven: 0 }
    }

    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0)
    return {
      totalReviews: allReviews.length,
      averageGiven: parseFloat((sum / allReviews.length).toFixed(1))
    }
  }

  async getTopRatedProcesses(limit = 10) {
    const processRatings = new Map()

    for (const [processId, reviews] of this.reviews) {
      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
        processRatings.set(processId, {
          processId,
          rating: parseFloat((sum / reviews.length).toFixed(1)),
          count: reviews.length
        })
      }
    }

    return Array.from(processRatings.values())
      .sort((a, b) => b.rating - a.rating || b.count - a.count)
      .slice(0, limit)
  }

  clearCache() {
    this.reviews.clear()
  }
}

export class ReviewSystem {
  constructor(config = {}) {
    this.reviews = new Map()
    this.aoProcess = config.aoProcess || DEFAULTS.REGISTRY_ID
    this.cacheEnabled = config.cacheEnabled !== false
    this.useAO = config.useAO !== false
    this.reputationRegistry = config.useAO !== false ? new ReputationRegistry({
      aoProcess: config.aoProcess,
      cacheEnabled: config.cacheEnabled,
      useAO: config.useAO
    }) : null
  }

  async syncWithAO() {
    if (!this.useAO) return

    try {
      const { ao } = await makeAoClient({
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
    if (this.reputationRegistry && this.useAO) {
      return await this.reputationRegistry.submitReview(
        processId,
        review.rating,
        review.content || review.comment || '',
        review.author || {}
      )
    }

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

    if (this.useAO) {
      await this.persistToAO(processId)
    }

    return newReview;
  }

  async submitReview(processId, rating, comment, reviewer = {}) {
    if (this.reputationRegistry) {
      return await this.reputationRegistry.submitReview(processId, rating, comment, reviewer)
    }
    return await this.addReview(processId, { rating, content: comment, author: reviewer })
  }

  async persistToAO(processId) {
    try {
      const { ao, signer } = await makeAoClient({
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

    if (this.useAO) {
      await this.persistToAO(processId)
    }

    return true;
  }

  async getReviews(processId) {
    if (this.reputationRegistry && this.useAO) {
      return await this.reputationRegistry.getReviews(processId)
    }
    return (this.reviews.get(processId) || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  getReview(processId, reviewId) {
    const processReviews = this.reviews.get(processId);
    if (!processReviews) return null;

    return processReviews.find(r => r.id === reviewId) || null;
  }

  async getAverageRating(processId) {
    if (this.reputationRegistry && this.useAO) {
      return await this.reputationRegistry.getAverageRating(processId)
    }
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

export function createReputationRegistry(config) {
  return new ReputationRegistry(config);
}

export { ReputationRegistry as Reputation };
export default ReviewSystem;
