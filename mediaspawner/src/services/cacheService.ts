/**
 * In-memory cache service for localStorage data optimization
 * Provides automatic invalidation and performance tracking
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export interface CacheStats {
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

export class CacheService {
  private static cache = new Map<string, CacheEntry<unknown>>();
  private static maxSize = 50; // Prevent memory leaks
  private static defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  private static stats = {
    totalHits: 0,
    totalMisses: 0,
  };

  /**
   * Get cached data or fetch from source with caching
   */
  static get<T>(
    key: string,
    fetcher: () => T,
    ttl: number = this.defaultTTL
  ): T {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if we have valid cached data
    if (entry && now - entry.timestamp < ttl) {
      entry.hits++;
      this.stats.totalHits++;
      return entry.data as T;
    }

    // Cache miss - fetch fresh data
    this.stats.totalMisses++;
    const freshData = fetcher();

    // Store in cache
    this.set(key, freshData);

    return freshData;
  }

  /**
   * Set data in cache
   */
  static set<T>(key: string, data: T): void {
    // Enforce size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry (Map maintains insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Invalidate specific cache entry
   */
  static invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple cache entries
   */
  static invalidateMultiple(keys: string[]): void {
    keys.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  static getStats(): CacheStats {
    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate =
      totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0;

    // Estimate memory usage (rough approximation)
    let memoryUsage = 0;
    this.cache.forEach((entry) => {
      // Rough estimation: JSON string length * 2 (for UTF-16) + overhead
      memoryUsage += JSON.stringify(entry.data).length * 2 + 100;
    });

    return {
      totalKeys: this.cache.size,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: Math.round(memoryUsage / 1024), // KB
    };
  }

  /**
   * Check if key exists in cache (without updating hit count)
   */
  static has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cache entry details for debugging
   */
  static getEntry(key: string): CacheEntry<unknown> | undefined {
    return this.cache.get(key);
  }

  /**
   * Reset statistics
   */
  static resetStats(): void {
    this.stats.totalHits = 0;
    this.stats.totalMisses = 0;
  }

  /**
   * Configure cache settings
   */
  static configure(options: { maxSize?: number; defaultTTL?: number }): void {
    if (options.maxSize !== undefined) {
      this.maxSize = options.maxSize;
    }
    if (options.defaultTTL !== undefined) {
      this.defaultTTL = options.defaultTTL;
    }
  }
}

// Export cache keys as constants to prevent typos
export const CACHE_KEYS = {
  CONFIGURATIONS: "configurations",
  ASSETS: "assets",
  SETTINGS: "settings",
  PROFILES: "profiles",
} as const;
