import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { TenantsService } from '../tenants/tenants.service';
import { CheckoutDto } from '../orders/dto';

/**
 * Store Controller
 * Handles PUBLIC endpoints for store frontend
 * - Checkout (create order from customer)
 * - Order tracking
 */
@Controller('store')
export class StoreController {
  constructor(
    private ordersService: OrdersService,
    private tenantsService: TenantsService,
  ) {}

  // ==========================================
  // CREATE ORDER FROM CHECKOUT
  // ==========================================

  /**
   * Create order from store checkout
   * POST /api/store/:slug/checkout
   * PUBLIC - No auth required
   *
   * Flow:
   * 1. Get tenant by slug
   * 2. Find or create customer by phone
   * 3. Create order with PENDING status
   * 4. Return order + tracking URL
   */
  @Post(':slug/checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Param('slug') slug: string,
    @Body() dto: CheckoutDto,
  ) {
    // 1. Get tenant by slug
    const tenant = await this.tenantsService.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Toko tidak ditemukan');
    }

    // 2. Create order from checkout (auto-create customer)
    return this.ordersService.createFromCheckout(tenant.id, slug, dto);
  }

  // ==========================================
  // TRACK ORDER (PUBLIC)
  // ==========================================

  /**
   * Get order details for tracking
   * GET /api/store/track/:orderId
   * PUBLIC - No auth required
   *
   * Returns:
   * - Order details
   * - Order status & timeline
   * - Store contact info (WhatsApp)
   */
  @Get('track/:orderId')
  async trackOrder(@Param('orderId') orderId: string) {
    return this.ordersService.findOnePublic(orderId);
  }
}
