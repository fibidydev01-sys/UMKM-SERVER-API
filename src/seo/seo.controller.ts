import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SeoService } from './seo.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BatchReindexTenantsDto, IndexUrlDto } from './dto';

// ==========================================
// SEO CONTROLLER
// API endpoints for SEO operations
// ==========================================

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  // ==========================================
  // PUBLIC: Get SEO service status
  // GET /api/seo/status
  // ==========================================

  @Get('status')
  async getStatus() {
    return this.seoService.getStatus();
  }

  // ==========================================
  // PUBLIC: Get detailed stats
  // GET /api/seo/stats
  // ==========================================

  @Get('stats')
  async getStats() {
    return this.seoService.getDetailedStats();
  }

  // ==========================================
  // PROTECTED: Manual reindex single tenant
  // POST /api/seo/reindex/:slug
  // ==========================================

  @Post('reindex/:slug')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reindexTenant(@Param('slug') slug: string) {
    const result = await this.seoService.onTenantUpdated(slug);

    return {
      message: `Tenant "${slug}" submitted for reindexing`,
      ...result,
    };
  }

  // ==========================================
  // PROTECTED: Batch reindex multiple tenants
  // POST /api/seo/reindex/batch
  // ==========================================

  @Post('reindex/batch')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async batchReindex(@Body() dto: BatchReindexTenantsDto) {
    const result = await this.seoService.batchReindex(dto.slugs);

    return {
      message: `Batch reindex completed: ${result.successful}/${result.total} successful`,
      ...result,
    };
  }

  // ==========================================
  // PROTECTED: Index single URL
  // POST /api/seo/index-url
  // ==========================================

  @Post('index-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async indexUrl(@Body() dto: IndexUrlDto) {
    // Extract slug from URL
    const urlObj = new URL(dto.url);
    const hostParts = urlObj.hostname.split('.');
    const slug = hostParts[0];

    // Determine if it's a product or tenant page
    if (
      urlObj.pathname.includes('/p/') ||
      urlObj.pathname.includes('/product/')
    ) {
      const result = await this.seoService.onProductCreated(
        slug,
        'manual',
        urlObj.pathname.split('/').pop(),
      );
      return { message: 'Product URL submitted for indexing', ...result };
    }

    const result = await this.seoService.onTenantUpdated(slug);
    return { message: 'Tenant URL submitted for indexing', ...result };
  }
}
