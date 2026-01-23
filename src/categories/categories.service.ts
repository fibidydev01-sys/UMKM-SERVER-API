import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, CACHE_TTL, CACHE_KEYS } from '../redis/redis.service';

// ==========================================
// CATEGORIES SERVICE
// Returns unique categories from active tenants
// WITH REDIS CACHING 🔥
// ==========================================

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Get all unique categories from active tenants
   * Returns array of unique category strings
   * CACHED: 5 minutes
   */
  async getAllUniqueCategories(): Promise<string[]> {
    const cacheKey = CACHE_KEYS.CATEGORIES_ALL;

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug('[getAllUniqueCategories] Cache MISS - fetching from DB');

        const result = await this.prisma.tenant.findMany({
          where: {
            status: 'ACTIVE',
          },
          select: {
            category: true,
          },
          distinct: ['category'],
          orderBy: {
            category: 'asc',
          },
        });

        const categories = result.map((t) => t.category);
        this.logger.debug(`[getAllUniqueCategories] Found ${categories.length} categories`);

        return categories;
      },
      CACHE_TTL.MEDIUM, // 5 minutes
    );
  }

  /**
   * Get category statistics (count of tenants per category)
   * Returns array of { category, count } objects
   * CACHED: 5 minutes
   */
  async getCategoryStats(): Promise<{ category: string; count: number }[]> {
    const cacheKey = CACHE_KEYS.CATEGORIES_STATS;

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug('[getCategoryStats] Cache MISS - fetching from DB');

        const result = await this.prisma.tenant.groupBy({
          by: ['category'],
          where: {
            status: 'ACTIVE',
          },
          _count: {
            category: true,
          },
          orderBy: {
            _count: {
              category: 'desc',
            },
          },
        });

        const stats = result.map((r) => ({
          category: r.category,
          count: r._count.category,
        }));

        this.logger.debug(`[getCategoryStats] Found stats for ${stats.length} categories`);

        return stats;
      },
      CACHE_TTL.MEDIUM, // 5 minutes
    );
  }

  /**
   * Search categories by query string (case insensitive)
   * Returns array of matching category strings
   * CACHED: 1 minute per query
   * @param query - Search query (min 2 chars)
   */
  async searchCategories(query: string): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = CACHE_KEYS.CATEGORIES_SEARCH(normalizedQuery);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`[searchCategories] Cache MISS for query: "${normalizedQuery}"`);

        const result = await this.prisma.tenant.findMany({
          where: {
            status: 'ACTIVE',
            category: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          select: {
            category: true,
          },
          distinct: ['category'],
          take: 20, // Limit to 20 results for autocomplete
          orderBy: {
            category: 'asc',
          },
        });

        const categories = result.map((t) => t.category);
        this.logger.debug(`[searchCategories] Found ${categories.length} matches for "${normalizedQuery}"`);

        return categories;
      },
      CACHE_TTL.SHORT, // 1 minute
    );
  }

  /**
   * Check if a category exists (has active tenants)
   * CACHED: 30 seconds
   * @param category - Category key to check
   */
  async categoryExists(category: string): Promise<boolean> {
    const cacheKey = CACHE_KEYS.CATEGORY_EXISTS(category);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`[categoryExists] Cache MISS for category: "${category}"`);

        const count = await this.prisma.tenant.count({
          where: {
            status: 'ACTIVE',
            category,
          },
        });

        const exists = count > 0;
        this.logger.debug(`[categoryExists] Category "${category}" exists: ${exists}`);

        return exists;
      },
      30, // 30 seconds
    );
  }

  /**
   * Invalidate all category caches
   * Call this when a tenant is created/updated/deleted
   */
  async invalidateCategoryCache(): Promise<void> {
    this.logger.log('[invalidateCategoryCache] Invalidating all category caches');

    const keysToDelete = [
      CACHE_KEYS.CATEGORIES_ALL,
      CACHE_KEYS.CATEGORIES_STATS,
      // Search caches will expire naturally (1 min TTL)
    ];

    await Promise.all(keysToDelete.map((key) => this.redis.del(key)));

    this.logger.log('[invalidateCategoryCache] Category caches invalidated');
  }
}
