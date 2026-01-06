import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

// ==========================================
// SITEMAP MODULE
// Public endpoints for sitemap data
// ==========================================

@Module({
  controllers: [SitemapController],
  providers: [SitemapService],
  exports: [SitemapService],
})
export class SitemapModule {}
