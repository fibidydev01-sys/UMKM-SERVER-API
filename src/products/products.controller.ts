import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  UpdateStockDto,
  BulkDeleteDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // ══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (No Auth Required)
  // ══════════════════════════════════════════════════════════════

  /**
   * Get public product by ID (for OG images, SEO)
   * GET /api/products/public/:id
   */
  @Get('public/:id')
  async findPublicProduct(@Param('id') productId: string) {
    return this.productsService.findPublicProduct(productId);
  }

  /**
   * Get product by tenant slug and product slug (SEO-friendly URL)
   * GET /api/products/by-slug/:tenantSlug/:productSlug
   */
  @Get('by-slug/:tenantSlug/:productSlug')
  async findBySlug(
    @Param('tenantSlug') tenantSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.productsService.findBySlug(tenantSlug, productSlug);
  }

  /**
   * Get products by store slug (for public store)
   * GET /api/products/store/:slug
   */
  @Get('store/:slug')
  async findByStoreSlug(
    @Param('slug') slug: string,
    @Query() query: QueryProductDto,
  ) {
    return this.productsService.findByStoreSlug(slug, query);
  }

  /**
   * Get single product by store slug and product ID (for public store)
   * GET /api/products/store/:slug/:productId
   */
  @Get('store/:slug/:productId')
  async findByStoreSlugAndProductId(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findByStoreSlugAndProductId(slug, productId);
  }

  // ══════════════════════════════════════════════════════════════
  // PROTECTED ENDPOINTS (Auth Required)
  // ══════════════════════════════════════════════════════════════

  /**
   * Create new product
   * POST /api/products
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(tenantId, dto);
  }

  /**
   * Get all products (with filters & pagination)
   * GET /api/products
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentTenant('id') tenantId: string,
    @Query() query: QueryProductDto,
  ) {
    return this.productsService.findAll(tenantId, query);
  }

  /**
   * Get product categories (for filter dropdown)
   * GET /api/products/categories
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories(@CurrentTenant('id') tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  /**
   * Get low stock products
   * GET /api/products/low-stock
   */
  @Get('low-stock')
  @UseGuards(JwtAuthGuard)
  async getLowStock(@CurrentTenant('id') tenantId: string) {
    return this.productsService.getLowStock(tenantId);
  }

  /**
   * Bulk delete products
   * DELETE /api/products/bulk
   */
  @Delete('bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bulkDelete(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: BulkDeleteDto,
  ) {
    return this.productsService.bulkDelete(tenantId, dto.ids);
  }

  /**
   * Get single product
   * GET /api/products/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.findOne(tenantId, productId);
  }

  /**
   * Update product
   * PATCH /api/products/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, productId, dto);
  }

  /**
   * Update stock only
   * PATCH /api/products/:id/stock
   */
  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard)
  async updateStock(
    @CurrentTenant('id') tenantId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(tenantId, productId, dto);
  }

  /**
   * Toggle active status
   * PATCH /api/products/:id/toggle
   */
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleActive(
    @CurrentTenant('id') tenantId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.toggleActive(tenantId, productId);
  }

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') productId: string,
  ) {
    return this.productsService.remove(tenantId, productId);
  }
}
