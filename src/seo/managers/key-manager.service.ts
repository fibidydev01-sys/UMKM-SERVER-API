import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { GoogleApiKeyConfig, GoogleApiKeyInput, KeyStats } from '../interfaces';

// ==========================================
// KEY MANAGER SERVICE
// Handles multi-key rotation for Google Indexing API
// Round-robin distribution across multiple API keys
// ==========================================

@Injectable()
export class KeyManagerService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagerService.name);
  private keys: GoogleApiKeyConfig[] = [];
  private currentKeyIndex = 0;

  // Redis key prefix for quota tracking
  private readonly QUOTA_PREFIX = 'seo:quota:';
  private readonly DAILY_QUOTA = 200; // Google's limit per key

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async onModuleInit(): Promise<void> {
    this.loadKeys(); // Remove await
    await this.syncQuotasFromRedis();

    if (this.keys.length > 0) {
      this.logger.log(`✅ Key Manager initialized`);
      this.logger.log(`📊 Total keys: ${this.keys.length}`);
      this.logger.log(
        `📊 Daily capacity: ${this.keys.length * this.DAILY_QUOTA} URLs`,
      );
    } else {
      this.logger.warn('⚠️ No Google Indexing API keys configured');
    }
  }

  // ==========================================
  // LOAD KEYS FROM ENVIRONMENT
  // ==========================================

  // ==========================================
  // LOAD KEYS FROM ENVIRONMENT
  // ==========================================

  private loadKeys(): void {
    const keysJson = this.configService.get<string>('GOOGLE_INDEXING_KEYS');

    if (!keysJson) {
      this.logger.warn('GOOGLE_INDEXING_KEYS not found in environment');
      return;
    }

    try {
      const parsedKeys: GoogleApiKeyInput[] = JSON.parse(keysJson);

      if (!Array.isArray(parsedKeys)) {
        throw new Error('GOOGLE_INDEXING_KEYS must be a JSON array');
      }

      this.keys = parsedKeys.map((key, index) => ({
        id: `key_${index + 1}`,
        projectId: key.projectId || key.project_id || '',
        clientEmail: key.clientEmail || key.client_email || '',
        privateKey: (key.privateKey || key.private_key || '').replace(
          /\\n/g,
          '\n',
        ),
        dailyQuota: this.DAILY_QUOTA,
        usedToday: 0,
        lastReset: this.getTodayDate(),
        isActive: true,
      }));

      // Validate keys
      this.keys = this.keys.filter((key) => {
        if (!key.clientEmail || !key.privateKey) {
          this.logger.warn(`Key ${key.id} is invalid (missing credentials)`);
          return false;
        }
        return true;
      });
    } catch (error) {
      this.logger.error('Failed to parse GOOGLE_INDEXING_KEYS:', error);
      this.keys = [];
    }
  }
  // ==========================================
  // SYNC QUOTAS FROM REDIS
  // ==========================================

  private async syncQuotasFromRedis(): Promise<void> {
    const today = this.getTodayDate();

    for (const key of this.keys) {
      const redisKey = `${this.QUOTA_PREFIX}${key.id}`;
      const storedData = await this.redis.get<{
        used: number;
        date: string;
      }>(redisKey);

      if (storedData && storedData.date === today) {
        key.usedToday = storedData.used;
      } else {
        // New day - reset quota
        key.usedToday = 0;
        key.lastReset = today;
      }
    }
  }

  // ==========================================
  // GET NEXT AVAILABLE KEY (Round Robin)
  // ==========================================

  async getNextAvailableKey(): Promise<GoogleApiKeyConfig | null> {
    if (this.keys.length === 0) {
      return null;
    }

    // Sync from Redis first
    await this.syncQuotasFromRedis();

    // Try each key starting from current index
    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentKeyIndex + i) % this.keys.length;
      const key = this.keys[index];

      if (key.isActive && key.usedToday < key.dailyQuota) {
        // Move to next key for next request (round robin)
        this.currentKeyIndex = (index + 1) % this.keys.length;

        this.logger.debug(
          `Using ${key.id}: ${key.usedToday}/${key.dailyQuota}`,
        );
        return key;
      }
    }

    // All keys exhausted
    this.logger.warn('⚠️ All API keys quota exhausted for today');
    return null;
  }

  // ==========================================
  // INCREMENT KEY USAGE
  // ==========================================

  async incrementUsage(keyId: string): Promise<void> {
    const key = this.keys.find((k) => k.id === keyId);
    if (!key) {
      this.logger.warn(`Key ${keyId} not found`);
      return;
    }

    const today = this.getTodayDate();
    const redisKey = `${this.QUOTA_PREFIX}${keyId}`;

    // Increment usage
    key.usedToday += 1;
    key.lastReset = today;

    // Calculate TTL until midnight
    const ttlSeconds = this.getSecondsUntilMidnight();

    // Store in Redis
    await this.redis.set(
      redisKey,
      { used: key.usedToday, date: today },
      ttlSeconds,
    );

    this.logger.debug(`${keyId}: ${key.usedToday}/${key.dailyQuota} used`);
  }

  // ==========================================
  // MARK KEY AS FAILED (Temporary disable)
  // ==========================================

  markKeyAsFailed(keyId: string): void {
    const key = this.keys.find((k) => k.id === keyId);
    if (key) {
      key.isActive = false;
      this.logger.warn(`Key ${keyId} marked as inactive`);

      // Re-enable after 5 minutes
      setTimeout(
        () => {
          key.isActive = true;
          this.logger.log(`Key ${keyId} re-enabled`);
        },
        5 * 60 * 1000,
      );
    }
  }

  // ==========================================
  // GET STATISTICS
  // ==========================================

  getStats(): KeyStats {
    const totalUsed = this.keys.reduce((sum, k) => sum + k.usedToday, 0);
    const totalCapacity = this.keys.length * this.DAILY_QUOTA;

    return {
      totalKeys: this.keys.length,
      totalCapacity,
      totalUsed,
      remainingToday: totalCapacity - totalUsed,
      keys: this.keys.map((k) => ({
        id: k.id,
        used: k.usedToday,
        remaining: k.dailyQuota - k.usedToday,
        isActive: k.isActive,
      })),
    };
  }

  // ==========================================
  // CHECK IF ANY QUOTA AVAILABLE
  // ==========================================

  hasAvailableQuota(): boolean {
    return this.keys.some((k) => k.isActive && k.usedToday < k.dailyQuota);
  }

  // ==========================================
  // GET TOTAL REMAINING QUOTA
  // ==========================================

  getTotalRemainingQuota(): number {
    return this.keys.reduce((sum, k) => sum + (k.dailyQuota - k.usedToday), 0);
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }
}
