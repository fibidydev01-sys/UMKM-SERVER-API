import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SitemapService } from './sitemap.service';

// ==========================================
// SITEMAP CONTROLLER
// Public endpoints - NO AUTH REQUIRED
// ==========================================

@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  // ==========================================
  // PAGINATED ENDPOINTS (For scalable sitemap)
  // ==========================================

  /**
   * Get paginated tenants for sitemap
   * GET /api/sitemap/tenants/paginated?page=1&limit=1000
   */
  @Get('tenants/paginated')
  async getTenantsPaginated(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit: number,
  ) {
    return this.sitemapService.getTenantsForSitemapPaginated(
      page,
      Math.min(limit, 5000), // Max 5000 per request
    );
  }

  /**
   * Get paginated products for sitemap
   * GET /api/sitemap/products/paginated?page=1&limit=1000
   */
  @Get('products/paginated')
  async getProductsPaginated(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit: number,
  ) {
    return this.sitemapService.getProductsForSitemapPaginated(
      page,
      Math.min(limit, 5000), // Max 5000 per request
    );
  }

  // ==========================================
  // SIMPLE ENDPOINTS (For small scale / backward compat)
  // ==========================================

  /**
   * Get all active tenants for sitemap
   * GET /api/sitemap/tenants
   */
  @Get('tenants')
  async getTenants() {
    return this.sitemapService.getTenantsForSitemap();
  }

  /**
   * Get all active products for sitemap
   * GET /api/sitemap/products
   */
  @Get('products')
  async getProducts() {
    return this.sitemapService.getProductsForSitemap();
  }

  /**
   * Get sitemap statistics
   * GET /api/sitemap/stats
   */
  @Get('stats')
  async getStats() {
    return this.sitemapService.getSitemapStats();
  }
}
