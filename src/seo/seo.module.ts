import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Controller
import { SeoController } from './seo.controller';

// Main Orchestrator
import { SeoService } from './seo.service';

// Individual Indexing Services
import { GoogleIndexingService } from './services/google-indexing.service';
import { IndexNowService } from './services/index-now.service';
import { GooglePingService } from './services/google-ping.service';

// Key & Quota Management
import { KeyManagerService } from './managers/key-manager.service';
import { QuotaTrackerService } from './managers/quota-tracker.service';

// ==========================================
// SEO MODULE
// Combines all indexing engines into one powerful module
// ==========================================

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  controllers: [SeoController],
  providers: [
    // Main orchestrator service
    SeoService,

    // Individual indexing services
    GoogleIndexingService,
    IndexNowService,
    GooglePingService,

    // Key rotation & quota management
    KeyManagerService,
    QuotaTrackerService,
  ],
  exports: [SeoService],
})
export class SeoModule {}
