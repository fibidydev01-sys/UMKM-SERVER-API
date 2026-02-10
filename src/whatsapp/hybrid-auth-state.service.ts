import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HybridAuthStateService
 *
 * Hybrid backup system for WhatsApp sessions:
 * - Primary: Local disk storage (fast)
 * - Backup: Supabase Storage (persistent, survives restarts)
 *
 * Features:
 * - Auto-restore from Supabase on server startup
 * - Periodic backup every 5 minutes
 * - Handles ephemeral filesystems (Railway, Vercel)
 */
@Injectable()
export class HybridAuthStateService {
  private readonly logger = new Logger(HybridAuthStateService.name);
  private supabase: SupabaseClient;
  private backupIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Configuration
  private readonly sessionsDir = path.join(process.cwd(), 'whatsapp-sessions');
  private readonly backupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private readonly bucketName =
    process.env.SUPABASE_BUCKET || 'whatsapp-sessions';

  constructor(private prisma: PrismaService) {
    this.initializeSupabase();
    this.ensureSessionsDir();
  }

  /**
   * Initialize Supabase client
   */
  private initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        '⚠️  Supabase credentials not found. Backup feature disabled. ' +
        'Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable.',
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('✅ Supabase Storage initialized for session backups');
  }

  /**
   * Ensure sessions directory exists
   */
  private ensureSessionsDir() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
      this.logger.log(`📁 Created sessions directory: ${this.sessionsDir}`);
    }
  }

  /**
   * Get session directory path for a tenant
   */
  private getSessionPath(tenantId: string): string {
    return path.join(this.sessionsDir, tenantId);
  }

  /**
   * Initialize auth state for a tenant
   * Restores from Supabase if local files don't exist
   */
  async initialize(tenantId: string): Promise<string> {
    const sessionPath = this.getSessionPath(tenantId);

    // Check if local session exists
    const localExists = fs.existsSync(path.join(sessionPath, 'creds.json'));

    if (!localExists && this.supabase) {
      this.logger.log(
        `🔄 Local session not found for ${tenantId}, attempting restore from Supabase...`,
      );
      await this.restoreFromSupabase(tenantId);
    }

    // Ensure directory exists
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      this.logger.log(`📁 Created session directory for tenant: ${tenantId}`);
    }

    // Start periodic backup
    this.startPeriodicBackup(tenantId);

    return sessionPath;
  }

  /**
   * Backup session to Supabase Storage
   */
  async backupToSupabase(tenantId: string): Promise<void> {
    if (!this.supabase) {
      this.logger.debug('Supabase not configured, skipping backup');
      return;
    }

    const sessionPath = this.getSessionPath(tenantId);

    try {
      // Check if session directory exists
      if (!fs.existsSync(sessionPath)) {
        this.logger.debug(
          `No session directory found for ${tenantId}, skipping backup`,
        );
        return;
      }

      // Backup creds.json
      const credsPath = path.join(sessionPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const credsData = fs.readFileSync(credsPath);
        const credsUploadPath = `${tenantId}/creds.json`;

        const { error: credsError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(credsUploadPath, credsData, {
            contentType: 'application/json',
            upsert: true,
          });

        if (credsError) {
          throw new Error(`Failed to upload creds.json: ${credsError.message}`);
        }

        this.logger.debug(`✅ Backed up creds.json for ${tenantId}`);
      }

      // Backup all files in keys directory
      const keysDir = path.join(sessionPath, 'keys');
      if (fs.existsSync(keysDir)) {
        const keyFiles = fs.readdirSync(keysDir);

        for (const keyFile of keyFiles) {
          const keyPath = path.join(keysDir, keyFile);
          const keyData = fs.readFileSync(keyPath);
          const keyUploadPath = `${tenantId}/keys/${keyFile}`;

          const { error: keyError } = await this.supabase.storage
            .from(this.bucketName)
            .upload(keyUploadPath, keyData, {
              upsert: true,
            });

          if (keyError) {
            this.logger.warn(
              `⚠️  Failed to upload ${keyFile}: ${keyError.message}`,
            );
          }
        }

        this.logger.debug(
          `✅ Backed up ${keyFiles.length} key files for ${tenantId}`,
        );
      }

      // Update lastBackupAt in database
      await this.prisma.whatsAppSession.updateMany({
        where: { tenantId },
        data: { lastBackupAt: new Date() },
      });

      this.logger.log(
        `☁️  Session backed up to Supabase for tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to backup session for ${tenantId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Restore session from Supabase Storage
   */
  async restoreFromSupabase(tenantId: string): Promise<boolean> {
    if (!this.supabase) {
      this.logger.debug('Supabase not configured, skipping restore');
      return false;
    }

    const sessionPath = this.getSessionPath(tenantId);

    try {
      // Create session directory
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      // Restore creds.json
      const credsUploadPath = `${tenantId}/creds.json`;
      const { data: credsData, error: credsError } = await this.supabase.storage
        .from(this.bucketName)
        .download(credsUploadPath);

      if (credsError) {
        const errMsg = credsError.message || JSON.stringify(credsError);
        // Treat any download error for creds as "no backup" - don't crash
        this.logger.debug(
          `No backup found or failed to download for ${tenantId}: ${errMsg}`,
        );
        return false;
      }

      if (credsData) {
        const credsBuffer = Buffer.from(await credsData.arrayBuffer());
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), credsBuffer);
        this.logger.debug(`✅ Restored creds.json for ${tenantId}`);
      }

      // Restore keys directory
      const keysDir = path.join(sessionPath, 'keys');
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }

      // List all files in keys directory in Supabase
      const { data: keysList, error: listError } = await this.supabase.storage
        .from(this.bucketName)
        .list(`${tenantId}/keys`);

      if (listError) {
        this.logger.warn(`⚠️  Failed to list keys: ${listError.message}`);
      } else if (keysList && keysList.length > 0) {
        for (const keyFile of keysList) {
          const keyUploadPath = `${tenantId}/keys/${keyFile.name}`;
          const { data: keyData, error: keyError } = await this.supabase.storage
            .from(this.bucketName)
            .download(keyUploadPath);

          if (keyError) {
            this.logger.warn(
              `⚠️  Failed to download ${keyFile.name}: ${keyError.message}`,
            );
            continue;
          }

          if (keyData) {
            const keyBuffer = Buffer.from(await keyData.arrayBuffer());
            fs.writeFileSync(path.join(keysDir, keyFile.name), keyBuffer);
          }
        }

        this.logger.debug(
          `✅ Restored ${keysList.length} key files for ${tenantId}`,
        );
      }

      this.logger.log(
        `✅ Session restored from Supabase for tenant: ${tenantId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Failed to restore session for ${tenantId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Start periodic backup for a tenant
   */
  startPeriodicBackup(tenantId: string): void {
    // Clear existing interval if any
    this.stopPeriodicBackup(tenantId);

    if (!this.supabase) {
      this.logger.debug(
        'Supabase not configured, skipping periodic backup setup',
      );
      return;
    }

    // Set up new interval
    const interval = setInterval(async () => {
      await this.backupToSupabase(tenantId);
    }, this.backupIntervalMs);

    this.backupIntervals.set(tenantId, interval);

    this.logger.log(
      `⏰ Started periodic backup for ${tenantId} (every ${this.backupIntervalMs / 1000}s)`,
    );
  }

  /**
   * Stop periodic backup for a tenant
   */
  stopPeriodicBackup(tenantId: string): void {
    const interval = this.backupIntervals.get(tenantId);
    if (interval) {
      clearInterval(interval);
      this.backupIntervals.delete(tenantId);
      this.logger.log(`⏹️  Stopped periodic backup for ${tenantId}`);
    }
  }

  /**
   * Delete session (local + Supabase)
   */
  async deleteSession(tenantId: string): Promise<void> {
    // Stop periodic backup
    this.stopPeriodicBackup(tenantId);

    const sessionPath = this.getSessionPath(tenantId);

    // Delete local session
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      this.logger.log(`🗑️  Deleted local session for ${tenantId}`);
    }

    // Delete from Supabase
    if (this.supabase) {
      try {
        // List all files for this tenant
        const { data: filesList, error: listError } =
          await this.supabase.storage
            .from(this.bucketName)
            .list(tenantId, { limit: 1000 });

        if (listError) {
          throw new Error(`Failed to list files: ${listError.message}`);
        }

        if (filesList && filesList.length > 0) {
          // Delete all files
          const filePaths = filesList.map((file) => `${tenantId}/${file.name}`);

          const { error: deleteError } = await this.supabase.storage
            .from(this.bucketName)
            .remove(filePaths);

          if (deleteError) {
            throw new Error(`Failed to delete files: ${deleteError.message}`);
          }
        }

        // Also try to delete keys directory
        const { data: keysList } = await this.supabase.storage
          .from(this.bucketName)
          .list(`${tenantId}/keys`);

        if (keysList && keysList.length > 0) {
          const keyPaths = keysList.map(
            (file) => `${tenantId}/keys/${file.name}`,
          );
          await this.supabase.storage.from(this.bucketName).remove(keyPaths);
        }

        this.logger.log(`☁️  Deleted Supabase backup for ${tenantId}`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to delete Supabase backup for ${tenantId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Cleanup on service destroy
   */
  onModuleDestroy() {
    // Stop all periodic backups
    for (const tenantId of this.backupIntervals.keys()) {
      this.stopPeriodicBackup(tenantId);
    }
  }
}
