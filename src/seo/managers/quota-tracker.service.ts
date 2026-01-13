import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

// ==========================================
// QUOTA TRACKER SERVICE
// Tracks overall SEO engine usage and statistics
// ==========================================

// Export the interface
export interface DailyStats {
  date: string;
  googleIndexing: {
    submitted: number;
    success: number;
    failed: number;
  };
  indexNow: {
    submitted: number;
    success: number;
    failed: number;
  };
  googlePing: {
    submitted: number;
    success: number;
    failed: number;
  };
  tenants: {
    indexed: number;
    slugs: string[];
  };
  products: {
    indexed: number;
  };
}

@Injectable()
export class QuotaTrackerService {
  private readonly logger = new Logger(QuotaTrackerService.name);
  private readonly STATS_PREFIX = 'seo:stats:';
  private readonly STATS_TTL = 7 * 24 * 60 * 60; // 7 days

  constructor(private readonly redis: RedisService) {}

  // ==========================================
  // TRACK GOOGLE INDEXING RESULT
  // ==========================================

  async trackGoogleIndexing(success: boolean): Promise<void> {
    const stats = await this.getTodayStats();
    stats.googleIndexing.submitted += 1;
    if (success) {
      stats.googleIndexing.success += 1;
    } else {
      stats.googleIndexing.failed += 1;
    }
    await this.saveTodayStats(stats);
  }

  // ==========================================
  // TRACK INDEXNOW RESULT
  // ==========================================

  async trackIndexNow(success: boolean, urlCount: number = 1): Promise<void> {
    const stats = await this.getTodayStats();
    stats.indexNow.submitted += urlCount;
    if (success) {
      stats.indexNow.success += urlCount;
    } else {
      stats.indexNow.failed += urlCount;
    }
    await this.saveTodayStats(stats);
  }

  // ==========================================
  // TRACK GOOGLE PING RESULT
  // ==========================================

  async trackGooglePing(success: boolean): Promise<void> {
    const stats = await this.getTodayStats();
    stats.googlePing.submitted += 1;
    if (success) {
      stats.googlePing.success += 1;
    } else {
      stats.googlePing.failed += 1;
    }
    await this.saveTodayStats(stats);
  }

  // ==========================================
  // TRACK TENANT INDEXED
  // ==========================================

  async trackTenantIndexed(slug: string): Promise<void> {
    const stats = await this.getTodayStats();
    stats.tenants.indexed += 1;
    if (!stats.tenants.slugs.includes(slug)) {
      stats.tenants.slugs.push(slug);
    }
    await this.saveTodayStats(stats);
  }

  // ==========================================
  // TRACK PRODUCT INDEXED
  // ==========================================

  async trackProductIndexed(): Promise<void> {
    const stats = await this.getTodayStats();
    stats.products.indexed += 1;
    await this.saveTodayStats(stats);
  }

  // ==========================================
  // GET TODAY'S STATS
  // ==========================================

  async getTodayStats(): Promise<DailyStats> {
    const today = this.getTodayDate();
    const key = `${this.STATS_PREFIX}${today}`;

    const stored = await this.redis.get<DailyStats>(key);

    if (stored) {
      return stored;
    }

    // Return empty stats
    return this.createEmptyStats(today);
  }

  // ==========================================
  // GET STATS FOR DATE RANGE
  // ==========================================

  async getStatsRange(
    days: number = 7,
  ): Promise<{ date: string; stats: DailyStats }[]> {
    const results: { date: string; stats: DailyStats }[] = [];

    for (let i = 0; i < days; i++) {
      const date = this.getDateDaysAgo(i);
      const key = `${this.STATS_PREFIX}${date}`;
      const stats = await this.redis.get<DailyStats>(key);

      results.push({
        date,
        stats: stats || this.createEmptyStats(date),
      });
    }

    return results;
  }

  // ==========================================
  // GET SUMMARY
  // ==========================================

  async getSummary(): Promise<{
    today: DailyStats;
    last7Days: {
      totalSubmitted: number;
      totalSuccess: number;
      totalFailed: number;
      tenantsIndexed: number;
      productsIndexed: number;
    };
  }> {
    const today = await this.getTodayStats();
    const rangeStats = await this.getStatsRange(7);

    const last7Days = rangeStats.reduce(
      (acc, { stats }) => {
        acc.totalSubmitted +=
          stats.googleIndexing.submitted +
          stats.indexNow.submitted +
          stats.googlePing.submitted;
        acc.totalSuccess +=
          stats.googleIndexing.success +
          stats.indexNow.success +
          stats.googlePing.success;
        acc.totalFailed +=
          stats.googleIndexing.failed +
          stats.indexNow.failed +
          stats.googlePing.failed;
        acc.tenantsIndexed += stats.tenants.indexed;
        acc.productsIndexed += stats.products.indexed;
        return acc;
      },
      {
        totalSubmitted: 0,
        totalSuccess: 0,
        totalFailed: 0,
        tenantsIndexed: 0,
        productsIndexed: 0,
      },
    );

    return { today, last7Days };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async saveTodayStats(stats: DailyStats): Promise<void> {
    const key = `${this.STATS_PREFIX}${stats.date}`;
    await this.redis.set(key, stats, this.STATS_TTL);
  }

  private createEmptyStats(date: string): DailyStats {
    return {
      date,
      googleIndexing: { submitted: 0, success: 0, failed: 0 },
      indexNow: { submitted: 0, success: 0, failed: 0 },
      googlePing: { submitted: 0, success: 0, failed: 0 },
      tenants: { indexed: 0, slugs: [] },
      products: { indexed: 0 },
    };
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}
