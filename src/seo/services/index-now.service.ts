import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { QuotaTrackerService } from '../managers/quota-tracker.service';
import { IndexNowResult } from '../interfaces';

// ==========================================
// INDEXNOW SERVICE
// Push notifications to multiple search engines:
// - Bing
// - Yandex
// - Naver
// - Seznam
// ==========================================

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);
  private readonly apiKey: string;
  private readonly isEnabled: boolean;

  // All IndexNow-compatible endpoints
  private readonly endpoints = [
    'https://api.indexnow.org/indexnow', // Universal (shared by all)
    'https://www.bing.com/indexnow', // Bing
    'https://yandex.com/indexnow', // Yandex
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly quotaTracker: QuotaTrackerService,
  ) {
    this.apiKey = this.configService.get<string>('INDEXNOW_API_KEY') || '';
    this.isEnabled = !!this.apiKey && this.apiKey.length >= 8;

    if (this.isEnabled) {
      this.logger.log('✅ IndexNow service enabled');
      this.logger.log(`📊 API Key: ${this.apiKey.substring(0, 4)}...`);
    } else {
      this.logger.warn('⚠️ IndexNow not configured (INDEXNOW_API_KEY missing)');
    }
  }

  // ==========================================
  // SUBMIT URLs TO ALL ENDPOINTS
  // ==========================================

  async submitUrls(urls: string[]): Promise<{
    success: boolean;
    results: IndexNowResult[];
    submittedUrls: number;
  }> {
    if (!this.isEnabled) {
      this.logger.debug('IndexNow disabled - skipping');
      return { success: false, results: [], submittedUrls: 0 };
    }

    if (!urls || urls.length === 0) {
      return { success: true, results: [], submittedUrls: 0 };
    }

    // Limit to 10,000 URLs per request (IndexNow limit)
    const urlsToSubmit = urls.slice(0, 10000);

    // Extract host from first URL
    let host: string;
    try {
      const parsedUrl = new URL(urlsToSubmit[0]);
      host = parsedUrl.host;
    } catch {
      this.logger.error(`Invalid URL: ${urlsToSubmit[0]}`);
      return { success: false, results: [], submittedUrls: 0 };
    }

    const payload: IndexNowPayload = {
      host,
      key: this.apiKey,
      keyLocation: `https://${host}/${this.apiKey}.txt`,
      urlList: urlsToSubmit,
    };

    this.logger.log(`📤 IndexNow: Submitting ${urlsToSubmit.length} URLs...`);

    // Submit to all endpoints in parallel
    const results = await Promise.all(
      this.endpoints.map((endpoint) =>
        this.submitToEndpoint(endpoint, payload),
      ),
    );

    const anySuccess = results.some((r) => r.success);

    // Track results
    await this.quotaTracker.trackIndexNow(anySuccess, urlsToSubmit.length);

    return {
      success: anySuccess,
      results,
      submittedUrls: urlsToSubmit.length,
    };
  }

  // ==========================================
  // SUBMIT TO SINGLE ENDPOINT
  // ==========================================

  private async submitToEndpoint(
    endpoint: string,
    payload: IndexNowPayload,
  ): Promise<IndexNowResult> {
    try {
      // ✅ Use axiosRef directly - returns Promise, not Observable
      const response = await this.httpService.axiosRef.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        validateStatus: () => true, // Don't throw on non-2xx
        timeout: 10000,
      });

      // 200 = OK, 202 = Accepted
      const success = response.status === 200 || response.status === 202;

      this.logger.log(
        `IndexNow ${this.getEndpointName(endpoint)}: ${response.status} ${success ? '✅' : '❌'}`,
      );

      return {
        endpoint,
        status: response.status,
        success,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `IndexNow ${this.getEndpointName(endpoint)} error: ${errorMessage}`,
      );

      return {
        endpoint,
        status: 500,
        success: false,
        error: errorMessage,
      };
    }
  }

  // ==========================================
  // SUBMIT SINGLE URL
  // ==========================================

  async submitUrl(url: string): Promise<{ success: boolean }> {
    const result = await this.submitUrls([url]);
    return { success: result.success };
  }

  // ==========================================
  // SUBMIT TENANT PAGES
  // ==========================================

  async submitTenantPages(slug: string): Promise<{
    success: boolean;
    urls: string[];
  }> {
    const baseUrl = `https://${slug}.fibidy.com`;

    const urls = [
      baseUrl, // Homepage
      `${baseUrl}/products`, // Products listing
    ];

    const result = await this.submitUrls(urls);
    return { success: result.success, urls };
  }

  // ==========================================
  // SUBMIT PRODUCT PAGE
  // ==========================================

  async submitProductPage(
    tenantSlug: string,
    productSlug?: string,
  ): Promise<{ success: boolean }> {
    const baseUrl = `https://${tenantSlug}.fibidy.com`;

    const urls = [
      productSlug ? `${baseUrl}/p/${productSlug}` : `${baseUrl}/products`,
      `${baseUrl}/products`, // Also refresh products list
    ];

    const result = await this.submitUrls(urls);
    return { success: result.success };
  }

  // ==========================================
  // SERVICE STATUS
  // ==========================================

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  getApiKeyPreview(): string {
    if (!this.apiKey) return 'not configured';
    return `${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private getEndpointName(endpoint: string): string {
    if (endpoint.includes('bing')) return 'Bing';
    if (endpoint.includes('yandex')) return 'Yandex';
    if (endpoint.includes('indexnow.org')) return 'IndexNow';
    return 'Unknown';
  }
}
