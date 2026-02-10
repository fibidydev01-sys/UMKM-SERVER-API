import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Get current plan info + usage
   * GET /api/subscription/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPlan(@CurrentTenant('id') tenantId: string) {
    return this.subscriptionService.getPlanInfo(tenantId);
  }

  /**
   * Get payment history
   * GET /api/subscription/payments
   */
  @Get('payments')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@CurrentTenant('id') tenantId: string) {
    return this.subscriptionService.getPaymentHistory(tenantId);
  }

  /**
   * Cancel subscription (no refund, access until period end)
   * POST /api/subscription/cancel
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @CurrentTenant('id') tenantId: string,
    @Body('reason') reason?: string,
  ) {
    return this.subscriptionService.cancelSubscription(tenantId, reason);
  }
}
