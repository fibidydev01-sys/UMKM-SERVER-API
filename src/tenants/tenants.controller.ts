import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  /**
   * Get tenant by slug (for store frontend)
   * GET /api/tenants/by-slug/:slug
   * Public - No auth required
   */
  @Get('by-slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug);
  }

  /**
   * Get products by tenant slug (for store frontend)
   * GET /api/tenants/by-slug/:slug/products
   * Public - No auth required
   */
  @Get('by-slug/:slug/products')
  async findProductsBySlug(
    @Param('slug') slug: string,
    @Query('category') category?: string,
  ) {
    return this.tenantsService.findProductsBySlug(slug, category);
  }

  /**
   * Check slug availability (for registration form)
   * GET /api/tenants/check-slug/:slug
   * Public - No auth required
   */
  @Get('check-slug/:slug')
  async checkSlug(@Param('slug') slug: string) {
    return this.tenantsService.checkSlugAvailability(slug);
  }

  // ==========================================
  // PROTECTED ENDPOINTS
  // ==========================================

  /**
   * Get current tenant profile
   * GET /api/tenants/me
   * Requires: Bearer token
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMe(@CurrentTenant('id') tenantId: string) {
    return this.tenantsService.findMe(tenantId);
  }

  /**
   * Update current tenant profile
   * PATCH /api/tenants/me
   * Requires: Bearer token
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateMe(tenantId, dto);
  }

  /**
   * Change password
   * PATCH /api/tenants/me/password
   * Requires: Bearer token
   */
  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.tenantsService.changePassword(tenantId, dto);
  }

  /**
   * Get dashboard stats
   * GET /api/tenants/me/stats
   * Requires: Bearer token
   */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentTenant('id') tenantId: string) {
    return this.tenantsService.getDashboardStats(tenantId);
  }
}
