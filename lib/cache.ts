/**
 * In-Memory TTL Cache Engine for Çiçekana ERP
 * Delivers ultra-low latency (<5ms) for frequently accessed system configs,
 * branch prices, FAQs, user roles & permissions.
 */

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cleanupIntervalMs: number = 60000 // Clean expired keys every 60 seconds

  constructor() {
    if (typeof window === "undefined") {
      setInterval(() => this.cleanupExpired(), this.cleanupIntervalMs)
    }
  }

  /**
   * Set a value in cache with a specified TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.cache.set(key, { value, expiresAt })
  }

  /**
   * Get a cached value if present and not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * Get cached value or fetch fresh from provider if missing/expired.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const freshValue = await fetcher()
    this.set(key, freshValue, ttlSeconds)
    return freshValue
  }

  /**
   * Invalidate specific key or keys matching pattern prefix.
   */
  delete(keyOrPattern: string): void {
    if (this.cache.has(keyOrPattern)) {
      this.cache.delete(keyOrPattern)
      return
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(keyOrPattern)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached keys.
   */
  clear(): void {
    this.cache.clear()
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

export const memoryCache = new InMemoryCache()
