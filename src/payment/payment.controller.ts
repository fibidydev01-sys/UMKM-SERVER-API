import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly midtransService: MidtransService) {}

  /**
   * Get Midtrans Client Key (untuk frontend load Snap.js)
   * GET /api/payment/client-key
   * PUBLIC
   */
  @Get('client-key')
  getClientKey() {
    return { clientKey: this.midtransService.getClientKey() };
  }

  /**
   * Create subscription payment (upgrade to Business)
   * POST /api/payment/subscribe
   * PROTECTED
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async createSubscription(@CurrentTenant('id') tenantId: string) {
    return this.midtransService.createSubscriptionPayment(tenantId);
  }

  /**
   * Webhook dari Midtrans
   * POST /api/payment/webhook
   * PUBLIC - TANPA AUTH (dipanggil Midtrans server, diamankan via signature)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() notification: any) {
    this.logger.log(
      `Webhook: ${notification.order_id} -> ${notification.transaction_status}`,
    );

    try {
      await this.midtransService.handleNotification(notification);
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      // Return 200 agar Midtrans tidak retry terus
      return { status: 'error', message: error.message };
    }
  }
}
