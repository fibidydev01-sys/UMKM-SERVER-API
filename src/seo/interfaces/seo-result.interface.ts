// ==========================================
// SEO RESULT INTERFACES
// Type definitions for indexing results
// ==========================================

/** Result from Google Indexing API submission */
export interface GoogleIndexingResult {
  url: string;
  success: boolean;
  keyUsed: string;
  response?: {
    urlNotificationMetadata?: {
      url?: string;
      latestUpdate?: {
        type?: string;
        notifyTime?: string;
      };
    };
  };
  error?: string;
}

/** Result from IndexNow submission */
export interface IndexNowResult {
  endpoint: string;
  status: number;
  success: boolean;
  error?: string;
}

/** Result from Google Sitemap Ping */
export interface GooglePingResult {
  sitemapUrl: string;
  success: boolean;
  status: number;
  error?: string;
}

/** Combined result from all SEO engines */
export interface SeoIndexResult {
  tenant: string;
  googleIndexing: {
    success: boolean;
    urlsSubmitted: number;
    quotaRemaining: number;
    results?: GoogleIndexingResult[];
  };
  indexNow: {
    success: boolean;
    urlsSubmitted: number;
    results?: IndexNowResult[];
  };
  googlePing: {
    success: boolean;
    status?: number;
  };
  timestamp: string;
}

/** Status response for SEO service */
export interface SeoServiceStatus {
  googleIndexing: {
    enabled: boolean;
    totalKeys: number;
    totalCapacity: number;
    totalUsed: number;
    remainingToday: number;
  };
  indexNow: {
    enabled: boolean;
  };
  googlePing: {
    enabled: boolean;
  };
  timestamp: string;
}

/** Product indexing result */
export interface ProductIndexResult {
  success: boolean;
  productUrl: string;
  googleIndexing?: GoogleIndexingResult;
  indexNow?: {
    success: boolean;
    urlsSubmitted: number;
  };
  googlePing?: {
    success: boolean;
  };
}
