import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { KeyManagerService } from '../managers/key-manager.service';
import { QuotaTrackerService } from '../managers/quota-tracker.service';
import { GoogleIndexingResult, KeyStats } from '../interfaces';

// ==========================================
// GOOGLE INDEXING SERVICE
// Handles URL submission to Google Indexing API
// With automatic key rotation
// ==========================================

@Injectable()
export class GoogleIndexingService {
  private readonly logger = new Logger(GoogleIndexingService.name);

  constructor(
    private readonly keyManager: KeyManagerService,
    private readonly quotaTracker: QuotaTrackerService,
  ) {}

  // ==========================================
  // SUBMIT SINGLE URL
  // ==========================================

  async submitUrl(
    url: string,
    type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED',
  ): Promise<GoogleIndexingResult> {
    // Get next available key
    const key = await this.keyManager.getNextAvailableKey();

    if (!key) {
      this.logger.warn(`No API keys available for: ${url}`);
      return {
        url,
        success: false,
        keyUsed: 'none',
        error: 'No API keys available (quota exhausted)',
      };
    }

    try {
      // Create JWT auth client
      const auth = new google.auth.JWT({
        email: key.clientEmail,
        key: key.privateKey,
        scopes: ['https://www.googleapis.com/auth/indexing'],
      });

      // Create indexing client
      const indexing = google.indexing({ version: 'v3', auth });

      // Submit URL notification
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type,
        },
      });

      // Track usage
      await this.keyManager.incrementUsage(key.id);
      await this.quotaTracker.trackGoogleIndexing(true);

      this.logger.log(`✅ Google Indexed: ${url} (${key.id})`);

      return {
        url,
        success: true,
        keyUsed: key.id,
        response: response.data as GoogleIndexingResult['response'],
      };
    } catch (error: unknown) {
      // Track failure
      await this.keyManager.incrementUsage(key.id);
      await this.quotaTracker.trackGoogleIndexing(false);

      // Handle specific errors
      const errorObj = error as {
        message?: string;
        response?: { status?: number };
        code?: number;
      };
      const errorMessage = errorObj.message || 'Unknown error';
      const statusCode = errorObj.response?.status || errorObj.code;

      this.logger.error(
        `❌ Google Index failed: ${url} - ${statusCode}: ${errorMessage}`,
      );

      // If auth error, mark key as failed
      if (statusCode === 401 || statusCode === 403) {
        this.keyManager.markKeyAsFailed(key.id);
      }

      return {
        url,
        success: false,
        keyUsed: key.id,
        error: `${statusCode}: ${errorMessage}`,
      };
    }
  }

  // ==========================================
  // SUBMIT BATCH URLs
  // ==========================================

  async submitBatch(
    urls: string[],
    type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED',
  ): Promise<GoogleIndexingResult[]> {
    const results: GoogleIndexingResult[] = [];

    // Process URLs with small delay between requests
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      // Check if we have quota
      if (!this.keyManager.hasAvailableQuota()) {
        this.logger.warn(`Quota exhausted at ${i}/${urls.length} URLs`);

        // Mark remaining as failed
        for (let j = i; j < urls.length; j++) {
          results.push({
            url: urls[j],
            success: false,
            keyUsed: 'none',
            error: 'Quota exhausted',
          });
        }
        break;
      }

      const result = await this.submitUrl(url, type);
      results.push(result);

      // Small delay to avoid rate limiting (100ms)
      if (i < urls.length - 1) {
        await this.delay(100);
      }
    }

    return results;
  }

  // ==========================================
  // SUBMIT TENANT PAGES
  // ==========================================

  async submitTenantPages(slug: string): Promise<{
    success: boolean;
    results: GoogleIndexingResult[];
  }> {
    const baseUrl = `https://${slug}.fibidy.com`;

    const urls = [
      baseUrl, // Homepage
      `${baseUrl}/products`, // Products listing
    ];

    const results = await this.submitBatch(urls);
    const success = results.some((r) => r.success);

    return { success, results };
  }

  // ==========================================
  // SUBMIT PRODUCT PAGE
  // ==========================================

  async submitProductPage(
    tenantSlug: string,
    productSlug?: string,
    productId?: string,
  ): Promise<GoogleIndexingResult> {
    const baseUrl = `https://${tenantSlug}.fibidy.com`;

    let productUrl: string;
    if (productSlug) {
      productUrl = `${baseUrl}/p/${productSlug}`;
    } else if (productId) {
      productUrl = `${baseUrl}/product/${productId}`;
    } else {
      productUrl = `${baseUrl}/products`;
    }

    return this.submitUrl(productUrl);
  }

  // ==========================================
  // CHECK SERVICE STATUS
  // ==========================================

  isAvailable(): boolean {
    return this.keyManager.hasAvailableQuota();
  }

  getQuotaStats(): KeyStats {
    return this.keyManager.getStats();
  }

  getRemainingQuota(): number {
    return this.keyManager.getTotalRemainingQuota();
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
