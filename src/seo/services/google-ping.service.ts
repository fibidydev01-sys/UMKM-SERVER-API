import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { QuotaTrackerService } from '../managers/quota-tracker.service';
import { GooglePingResult } from '../interfaces';

// ==========================================
// GOOGLE PING SERVICE
// Notifies Google about sitemap updates
// FREE & UNLIMITED - No API key needed!
// ==========================================

@Injectable()
export class GooglePingService {
  private readonly logger = new Logger(GooglePingService.name);
  private readonly pingUrl = 'https://www.google.com/ping';

  constructor(
    private readonly httpService: HttpService,
    private readonly quotaTracker: QuotaTrackerService,
  ) {
    this.logger.log('✅ Google Ping service ready (FREE & unlimited)');
  }

  // ==========================================
  // PING SITEMAP URL
  // ==========================================

  async pingSitemap(sitemapUrl: string): Promise<GooglePingResult> {
    try {
      const url = `${this.pingUrl}?sitemap=${encodeURIComponent(sitemapUrl)}`;

      this.logger.debug(`Pinging Google: ${sitemapUrl}`);

      // ✅ Use axiosRef directly - returns Promise, not Observable
      const response = await this.httpService.axiosRef.get(url, {
        validateStatus: () => true,
        timeout: 10000,
      });

      const success = response.status === 200;

      // Track result
      await this.quotaTracker.trackGooglePing(success);

      this.logger.log(
        `Google Ping: ${response.status} ${success ? '✅' : '❌'} - ${sitemapUrl}`,
      );

      return {
        sitemapUrl,
        success,
        status: response.status,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Google Ping failed: ${sitemapUrl} - ${errorMessage}`);

      await this.quotaTracker.trackGooglePing(false);

      return {
        sitemapUrl,
        success: false,
        status: 500,
        error: errorMessage,
      };
    }
  }

  // ==========================================
  // PING TENANT SITEMAP
  // ==========================================

  async pingTenantSitemap(slug: string): Promise<GooglePingResult> {
    const sitemapUrl = `https://${slug}.fibidy.com/sitemap.xml`;
    return this.pingSitemap(sitemapUrl);
  }

  // ==========================================
  // PING PLATFORM SITEMAP INDEX
  // ==========================================

  async pingPlatformSitemap(): Promise<GooglePingResult> {
    const sitemapUrl = 'https://fibidy.com/server-sitemap-index.xml';
    return this.pingSitemap(sitemapUrl);
  }

  // ==========================================
  // PING MULTIPLE SITEMAPS
  // ==========================================

  async pingMultipleSitemaps(
    sitemapUrls: string[],
  ): Promise<GooglePingResult[]> {
    const results: GooglePingResult[] = [];

    for (const sitemapUrl of sitemapUrls) {
      const result = await this.pingSitemap(sitemapUrl);
      results.push(result);

      // Small delay between pings
      await this.delay(200);
    }

    return results;
  }

  // ==========================================
  // PING ALL (Platform + Tenant)
  // ==========================================

  async pingAll(tenantSlug: string): Promise<{
    platform: GooglePingResult;
    tenant: GooglePingResult;
  }> {
    const [platform, tenant] = await Promise.all([
      this.pingPlatformSitemap(),
      this.pingTenantSitemap(tenantSlug),
    ]);

    return { platform, tenant };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
