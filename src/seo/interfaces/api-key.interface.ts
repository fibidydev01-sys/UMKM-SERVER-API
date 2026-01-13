// ==========================================
// API KEY INTERFACE
// Type definitions for Google Indexing API keys
// ==========================================

export interface GoogleApiKeyConfig {
  /** Unique identifier for this key (e.g., key_1, key_2) */
  id: string;

  /** Google Cloud Project ID */
  projectId: string;

  /** Service Account Email */
  clientEmail: string;

  /** Private Key (PEM format) */
  privateKey: string;

  /** Daily quota limit (default: 200) */
  dailyQuota: number;

  /** Number of requests used today */
  usedToday: number;

  /** Date of last quota reset (YYYY-MM-DD) */
  lastReset: string;

  /** Whether this key is currently active */
  isActive: boolean;
}

export interface GoogleApiKeyInput {
  projectId?: string;
  project_id?: string;
  clientEmail?: string;
  client_email?: string;
  privateKey?: string;
  private_key?: string;
}

export interface KeyStats {
  totalKeys: number;
  totalCapacity: number;
  totalUsed: number;
  remainingToday: number;
  keys: Array<{
    id: string;
    used: number;
    remaining: number;
    isActive: boolean;
  }>;
}
