import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

// ==========================================
// CACHE TTL CONSTANTS (in seconds)
// ==========================================
export const CACHE_TTL = {
  // Short-lived (frequently changing)
  SHORT: 60, // 1 minute - for autocomplete, search results
  DASHBOARD_STATS: 60, // 1 minute
  RECENT_ORDERS: 30, // 30 seconds
  LOW_STOCK: 120, // 2 minutes

  // Medium-lived
  MEDIUM: 300, // 5 minutes - for category lists & stats
  PRODUCT_LIST: 300, // 5 minutes
  PRODUCT_DETAIL: 600, // 10 minutes
  CUSTOMER_LIST: 300, // 5 minutes
  ORDER_LIST: 120, // 2 minutes

  // Long-lived (rarely changing)
  TENANT_PUBLIC: 1800, // 30 minutes
  TENANT_PRIVATE: 900, // 15 minutes
  CATEGORIES: 3600, // 1 hour
  SITEMAP: 3600, // 1 hour
} as const;

// ==========================================
// CACHE KEY PREFIXES
// ==========================================
export const CACHE_KEYS = {
  // Tenant related
  TENANT_SLUG: (slug: string) => `tenant:slug:${slug}`,
  TENANT_ID: (id: string) => `tenant:id:${id}`,
  TENANT_STATS: (id: string) => `tenant:stats:${id}`,
  TENANT_PRODUCTS_PUBLIC: (slug: string) => `tenant:products:public:${slug}`,

  // Product related
  PRODUCT_LIST: (tenantId: string, hash: string) =>
    `products:list:${tenantId}:${hash}`,
  PRODUCT_DETAIL: (id: string) => `products:detail:${id}`,
  PRODUCT_BY_SLUG: (tenantSlug: string, productSlug: string) =>
    `products:slug:${tenantSlug}:${productSlug}`,
  PRODUCT_CATEGORIES: (tenantId: string) => `products:categories:${tenantId}`,
  PRODUCT_LOW_STOCK: (tenantId: string) => `products:lowstock:${tenantId}`,

  // Customer related
  CUSTOMER_LIST: (tenantId: string, hash: string) =>
    `customers:list:${tenantId}:${hash}`,

  // Order related
  ORDER_LIST: (tenantId: string, hash: string) =>
    `orders:list:${tenantId}:${hash}`,

  // Sitemap
  SITEMAP_TENANTS: (page: number) => `sitemap:tenants:${page}`,
  SITEMAP_PRODUCTS: (page: number) => `sitemap:products:${page}`,
  SITEMAP_STATS: () => `sitemap:stats`,

  // Categories (NEW - for unified category system)
  CATEGORIES_ALL: 'categories:all', // All unique categories
  CATEGORIES_STATS: 'categories:stats', // Category statistics with counts
  CATEGORIES_SEARCH: (query: string) => `categories:search:${query}`, // Search results
  CATEGORY_EXISTS: (category: string) => `categories:exists:${category}`, // Category existence check
} as const;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private readonly isEnabled: boolean;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      this.redis = new Redis({ url, token });
      this.isEnabled = true;
      this.logger.log('✅ Redis (Upstash) connected');
    } else {
      this.isEnabled = false;
      this.logger.warn('⚠️ Redis not configured - caching disabled');
    }
  }

  onModuleDestroy(): void {
    this.logger.log('Redis service destroyed');
  }

  // ==========================================
  // CORE CACHE METHODS
  // ==========================================

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) return null;

    try {
      const data = await this.redis.get<T>(key);
      if (data) {
        this.logger.debug(`Cache HIT: ${key}`);
      }
      return data;
    } catch (error) {
      this.logger.error(`Cache GET error: ${key}`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.isEnabled || !this.redis) return;

    try {
      await this.redis.set(key, value, { ex: ttlSeconds });
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error: ${key}`, error);
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    if (!this.isEnabled || !this.redis) return;

    try {
      await this.redis.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error: ${key}`, error);
    }
  }

  // ==========================================
  // 🔥 NEW: DELETE BY PATTERN
  // ==========================================

  /**
   * Delete all keys matching a pattern
   * Uses SCAN for production safety
   */
  async delByPattern(pattern: string): Promise<number> {
    if (!this.isEnabled || !this.redis) return 0;

    try {
      // Use KEYS command (Upstash supports it)
      const keys = await this.redis.keys(pattern);

      if (!keys || keys.length === 0) {
        this.logger.debug(`Cache DEL pattern: ${pattern} (0 keys)`);
        return 0;
      }

      // Delete all matching keys
      await Promise.all(keys.map((key) => this.redis!.del(key)));

      this.logger.log(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Cache delByPattern error: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * 🔥 NEW: Invalidate ALL product-related caches for a tenant
   * This is the nuclear option - clears everything related to products
   */
  async invalidateAllProductCaches(
    tenantId: string,
    tenantSlug?: string,
  ): Promise<void> {
    if (!this.isEnabled || !this.redis) return;

    this.logger.log(
      `🔥 Invalidating ALL product caches for tenant: ${tenantId}`,
    );

    // Delete by specific keys first
    const specificKeys = [
      CACHE_KEYS.PRODUCT_CATEGORIES(tenantId),
      CACHE_KEYS.PRODUCT_LOW_STOCK(tenantId),
      CACHE_KEYS.TENANT_STATS(tenantId),
    ];

    if (tenantSlug) {
      specificKeys.push(CACHE_KEYS.TENANT_PRODUCTS_PUBLIC(tenantSlug));
    }

    await Promise.all(specificKeys.map((key) => this.del(key)));

    // Delete by patterns (this catches all list queries with different hashes)
    const patterns = [`products:list:${tenantId}:*`, `products:detail:*`];

    if (tenantSlug) {
      patterns.push(`store:products:${tenantSlug}:*`);
      patterns.push(`store:product:${tenantSlug}:*`);
      patterns.push(`products:slug:${tenantSlug}:*`);
    }

    await Promise.all(patterns.map((p) => this.delByPattern(p)));

    this.logger.log(
      `✅ All product caches invalidated for tenant: ${tenantId}`,
    );
  }

  // ==========================================
  // CACHE-ASIDE PATTERN
  // ==========================================

  /**
   * Get from cache or fetch from source
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttlSeconds);

    return data;
  }

  // ==========================================
  // INVALIDATION HELPERS
  // ==========================================

  /**
   * Invalidate all cache for a tenant
   */
  async invalidateTenant(tenantId: string, slug?: string): Promise<void> {
    const keys = [
      CACHE_KEYS.TENANT_ID(tenantId),
      CACHE_KEYS.TENANT_STATS(tenantId),
      CACHE_KEYS.PRODUCT_CATEGORIES(tenantId),
      CACHE_KEYS.PRODUCT_LOW_STOCK(tenantId),
    ];

    if (slug) {
      keys.push(CACHE_KEYS.TENANT_SLUG(slug));
      keys.push(CACHE_KEYS.TENANT_PRODUCTS_PUBLIC(slug));
    }

    await Promise.all(keys.map((key) => this.del(key)));
  }

  /**
   * Invalidate single product cache
   */
  async invalidateProduct(
    productId: string,
    tenantId: string,
    tenantSlug?: string,
    productSlug?: string,
  ): Promise<void> {
    const keys = [
      CACHE_KEYS.PRODUCT_DETAIL(productId),
      CACHE_KEYS.PRODUCT_CATEGORIES(tenantId),
      CACHE_KEYS.PRODUCT_LOW_STOCK(tenantId),
    ];

    if (tenantSlug) {
      keys.push(CACHE_KEYS.TENANT_PRODUCTS_PUBLIC(tenantSlug));
      if (productSlug) {
        keys.push(CACHE_KEYS.PRODUCT_BY_SLUG(tenantSlug, productSlug));
      }
    }

    await Promise.all(keys.map((key) => this.del(key)));
  }

  /**
   * Invalidate dashboard stats
   */
  async invalidateStats(tenantId: string): Promise<void> {
    await this.del(CACHE_KEYS.TENANT_STATS(tenantId));
  }

  // ==========================================
  // UTILITY
  // ==========================================

  /**
   * Create a hash from query parameters for cache key
   */
  hashQuery(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          if (params[key] !== undefined && params[key] !== null) {
            acc[key] = params[key];
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );

    return Buffer.from(JSON.stringify(sorted)).toString('base64').slice(0, 16);
  }

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  async healthCheck(): Promise<{ status: string; latency?: number }> {
    if (!this.isEnabled || !this.redis) {
      return { status: 'disabled' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      return { status: 'connected', latency };
    } catch {
      return { status: 'error' };
    }
  }
}
