import { Injectable, Logger } from '@nestjs/common';
import { GoogleIndexingService } from './services/google-indexing.service';
import { IndexNowService } from './services/index-now.service';
import { GooglePingService } from './services/google-ping.service';
import { QuotaTrackerService } from './managers/quota-tracker.service';
import {
  SeoIndexResult,
  SeoServiceStatus,
  ProductIndexResult,
} from './interfaces';

// ==========================================
// SEO SERVICE - MAIN ORCHESTRATOR
// Combines all indexing engines for maximum coverage
// Fire-and-forget pattern for async indexing
// ==========================================

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private readonly googleIndexing: GoogleIndexingService,
    private readonly indexNow: IndexNowService,
    private readonly googlePing: GooglePingService,
    private readonly quotaTracker: QuotaTrackerService,
  ) {
    this.logger.log('🚀 SEO Service initialized - All engines ready');
  }

  // ==========================================
  // 🚀 ON TENANT CREATED
  // Maximum power: use ALL indexing methods!
  // ==========================================

  async onTenantCreated(slug: string): Promise<SeoIndexResult> {
    this.logger.log(`🚀 FULL INDEX: New tenant "${slug}"`);

    const timestamp = new Date().toISOString();

    try {
      // Fire all engines in parallel for speed
      const [googleResult, indexNowResult, pingResult] = await Promise.all([
        this.googleIndexing.submitTenantPages(slug),
        this.indexNow.submitTenantPages(slug),
        this.googlePing.pingTenantSitemap(slug),
      ]);

      // Also ping platform sitemap (fire-and-forget)
      this.googlePing.pingPlatformSitemap().catch(() => {});

      // Track tenant indexed
      await this.quotaTracker.trackTenantIndexed(slug);

      // Get current quota stats
      const quotaStats = this.googleIndexing.getQuotaStats();

      const result: SeoIndexResult = {
        tenant: slug,
        googleIndexing: {
          success: googleResult.success,
          urlsSubmitted: googleResult.results.filter((r) => r.success).length,
          quotaRemaining: quotaStats.remainingToday,
          results: googleResult.results,
        },
        indexNow: {
          success: indexNowResult.success,
          urlsSubmitted: indexNowResult.urls.length,
        },
        googlePing: {
          success: pingResult.success,
          status: pingResult.status,
        },
        timestamp,
      };

      this.logger.log(`✅ Tenant "${slug}" indexed successfully`, {
        google: result.googleIndexing.success,
        indexNow: result.indexNow.success,
        ping: result.googlePing.success,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to index tenant "${slug}": ${errorMessage}`);

      return {
        tenant: slug,
        googleIndexing: { success: false, urlsSubmitted: 0, quotaRemaining: 0 },
        indexNow: { success: false, urlsSubmitted: 0 },
        googlePing: { success: false },
        timestamp,
      };
    }
  }

  // ==========================================
  // 🔄 ON TENANT UPDATED
  // Re-index when tenant updates profile/settings
  // ==========================================

  async onTenantUpdated(slug: string): Promise<SeoIndexResult> {
    this.logger.log(`🔄 RE-INDEX: Tenant "${slug}" updated`);
    return this.onTenantCreated(slug);
  }

  // ==========================================
  // 📦 ON PRODUCT CREATED
  // Index new product page
  // ==========================================

  async onProductCreated(
    tenantSlug: string,
    productId: string,
    productSlug?: string,
  ): Promise<ProductIndexResult> {
    this.logger.log(
      `📦 INDEX: New product "${productSlug || productId}" for "${tenantSlug}"`,
    );

    const baseUrl = `https://${tenantSlug}.fibidy.com`;
    const productUrl = productSlug
      ? `${baseUrl}/p/${productSlug}`
      : `${baseUrl}/product/${productId}`;

    try {
      const [googleResult, indexNowResult, pingResult] = await Promise.all([
        this.googleIndexing.submitUrl(productUrl),
        this.indexNow.submitUrls([productUrl, `${baseUrl}/products`]),
        this.googlePing.pingTenantSitemap(tenantSlug),
      ]);

      // Track product indexed
      await this.quotaTracker.trackProductIndexed();

      const success =
        googleResult.success || indexNowResult.success || pingResult.success;

      this.logger.log(`✅ Product indexed: ${success ? 'SUCCESS' : 'PARTIAL'}`);

      return {
        success,
        productUrl,
        googleIndexing: googleResult,
        indexNow: {
          success: indexNowResult.success,
          urlsSubmitted: indexNowResult.submittedUrls,
        },
        googlePing: {
          success: pingResult.success,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to index product: ${errorMessage}`);

      return {
        success: false,
        productUrl,
      };
    }
  }

  // ==========================================
  // 📝 ON PRODUCT UPDATED
  // Re-index when product is modified
  // ==========================================

  async onProductUpdated(
    tenantSlug: string,
    productId: string,
    productSlug?: string,
  ): Promise<ProductIndexResult> {
    this.logger.log(
      `📝 RE-INDEX: Product "${productSlug || productId}" updated`,
    );
    return this.onProductCreated(tenantSlug, productId, productSlug);
  }

  // ==========================================
  // 🗑️ ON PRODUCT DELETED
  // Refresh sitemap after deletion
  // ==========================================

  async onProductDeleted(tenantSlug: string): Promise<{ success: boolean }> {
    this.logger.log(`🗑️ REFRESH: Product deleted from "${tenantSlug}"`);

    try {
      const result = await this.googlePing.pingTenantSitemap(tenantSlug);
      return { success: result.success };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh sitemap: ${errorMessage}`);
      return { success: false };
    }
  }

  // ==========================================
  // 📊 BATCH REINDEX
  // Reindex multiple tenants (for maintenance)
  // ==========================================

  async batchReindex(slugs: string[]): Promise<{
    total: number;
    successful: number;
    failed: string[];
    results: SeoIndexResult[];
  }> {
    this.logger.log(`📊 BATCH REINDEX: ${slugs.length} tenants`);

    const results: SeoIndexResult[] = [];
    const failed: string[] = [];
    let successful = 0;

    // Process in batches of 10 to avoid overwhelming
    const batchSize = 10;

    for (let i = 0; i < slugs.length; i += batchSize) {
      const batch = slugs.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (slug) => {
          try {
            const result = await this.onTenantUpdated(slug);
            return { slug, result, error: null };
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            return { slug, result: null, error: errorMessage };
          }
        }),
      );

      for (const { slug, result, error } of batchResults) {
        if (
          result &&
          (result.googleIndexing.success || result.indexNow.success)
        ) {
          successful++;
          results.push(result);
        } else {
          failed.push(slug);
          this.logger.warn(`Failed to reindex: ${slug} - ${error}`);
        }
      }

      // Delay between batches
      if (i + batchSize < slugs.length) {
        await this.delay(2000);
      }
    }

    // Ping platform sitemap at the end
    await this.googlePing.pingPlatformSitemap();

    this.logger.log(
      `✅ Batch reindex complete: ${successful}/${slugs.length} successful`,
    );

    return {
      total: slugs.length,
      successful,
      failed,
      results,
    };
  }

  // ==========================================
  // 📊 GET SERVICE STATUS
  // ==========================================

  getStatus(): SeoServiceStatus {
    const quotaStats = this.googleIndexing.getQuotaStats();

    return {
      googleIndexing: {
        enabled: this.googleIndexing.isAvailable(),
        totalKeys: quotaStats.totalKeys,
        totalCapacity: quotaStats.totalCapacity,
        totalUsed: quotaStats.totalUsed,
        remainingToday: quotaStats.remainingToday,
      },
      indexNow: {
        enabled: this.indexNow.isServiceEnabled(),
      },
      googlePing: {
        enabled: true, // Always enabled
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // 📈 GET DETAILED STATS
  // ==========================================

  async getDetailedStats() {
    const status = this.getStatus();
    const quotaStats = this.googleIndexing.getQuotaStats();
    const summary = await this.quotaTracker.getSummary();

    return {
      status,
      keys: quotaStats.keys,
      today: summary.today,
      last7Days: summary.last7Days,
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
