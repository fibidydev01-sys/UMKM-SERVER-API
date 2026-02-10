import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private readonly snap: any;
  private readonly core: any;
  private readonly serverKey: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    this.serverKey = this.configService.get<string>('midtrans.serverKey', '');
    this.isProduction = this.configService.get<boolean>('midtrans.isProduction', false);

    const clientKey = this.configService.get<string>('midtrans.clientKey', '');

    this.snap = new midtransClient.Snap({
      isProduction: this.isProduction,
      serverKey: this.serverKey,
      clientKey,
    });

    this.core = new midtransClient.CoreApi({
      isProduction: this.isProduction,
      serverKey: this.serverKey,
      clientKey,
    });
  }

  /**
   * Create Snap transaction untuk upgrade subscription
   */
  async createSubscriptionPayment(tenantId: string) {
    // 1. Get tenant info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true, email: true, phone: true, whatsapp: true },
    });

    if (!tenant) throw new BadRequestException('Tenant tidak ditemukan');

    // 2. Get current subscription
    const subscription = await this.subscriptionService.getSubscription(tenantId);

    // Allow payment if: trial user (converting to paid), or expired/cancelled
    // Block only paid BUSINESS that's still active
    if (
      subscription.plan === 'BUSINESS' &&
      subscription.status === 'ACTIVE' &&
      !subscription.isTrial
    ) {
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()) {
        throw new BadRequestException('Subscription Business masih aktif');
      }
    }

    // 3. Expire all old pending payments, then create fresh
    await this.prisma.subscriptionPayment.updateMany({
      where: { tenantId, paymentStatus: 'pending' },
      data: { paymentStatus: 'expire' },
    });

    // 4. Pricing
    const price = parseInt(this.configService.get('SUBSCRIPTION_BUSINESS_PRICE', '100000'));
    const periodDays = parseInt(this.configService.get('SUBSCRIPTION_BUSINESS_PERIOD_DAYS', '30'));

    // 5. Generate unique order ID
    const timestamp = Date.now();
    const midtransOrderId = `SUB-${tenant.slug}-${timestamp}`;

    // 6. Calculate period
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    // 7. Build Midtrans parameter
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: price,
      },
      item_details: [
        {
          id: 'business-plan',
          name: `Fibidy Business Plan (${periodDays} hari)`,
          price: price,
          quantity: 1,
        },
      ],
      customer_details: {
        first_name: tenant.name,
        email: tenant.email,
        phone: tenant.whatsapp || tenant.phone || '',
      },
      callbacks: {
        finish: `${frontendUrl}/dashboard/subscription?payment=finish`,
        unfinish: `${frontendUrl}/dashboard/subscription?payment=unfinish`,
        error: `${frontendUrl}/dashboard/subscription?payment=error`,
      },
    };

    this.logger.log(`Creating subscription payment: ${midtransOrderId} for tenant ${tenant.slug}`);

    try {
      // 8. Call Midtrans Snap
      const snapResponse = await this.snap.createTransaction(parameter);

      // 9. Save payment record
      const payment = await this.prisma.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          tenantId,
          midtransOrderId,
          snapToken: snapResponse.token,
          snapRedirectUrl: snapResponse.redirect_url,
          amount: price,
          currency: 'IDR',
          paymentStatus: 'pending',
          periodStart,
          periodEnd,
        },
      });

      this.logger.log(`Payment created: ${payment.id}`);

      return {
        token: snapResponse.token,
        redirect_url: snapResponse.redirect_url,
        payment_id: payment.id,
        order_id: midtransOrderId,
      };
    } catch (error) {
      this.logger.error(`Midtrans error: ${error.message}`, error.stack);
      throw new BadRequestException(`Gagal membuat pembayaran: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature (SHA-512)
   */
  verifySignature(notification: any): boolean {
    const { order_id, status_code, gross_amount, signature_key } = notification;
    const input = `${order_id}${status_code}${gross_amount}${this.serverKey}`;
    const hash = crypto.createHash('sha512').update(input).digest('hex');
    return hash === signature_key;
  }

  /**
   * Handle webhook notification dari Midtrans
   */
  async handleNotification(notification: any) {
    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      payment_type,
      gross_amount,
      settlement_time,
    } = notification;

    this.logger.log(`Webhook: ${order_id} -> ${transaction_status}`);

    // 1. Verify signature
    if (!this.verifySignature(notification)) {
      this.logger.warn(`Invalid signature: ${order_id}`);
      throw new BadRequestException('Invalid signature');
    }

    // 2. Find payment
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { midtransOrderId: order_id },
      include: { subscription: true },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${order_id}`);
      throw new BadRequestException('Payment not found');
    }

    // 3. Idempotency: skip kalau sudah terminal status yang sama
    const terminalStatuses = ['settlement', 'capture', 'cancel', 'deny', 'expire', 'refund'];
    if (
      terminalStatuses.includes(payment.paymentStatus) &&
      payment.paymentStatus === transaction_status
    ) {
      return { status: 'already_processed' };
    }

    // 4. Update payment record
    await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        midtransTransactionId: transaction_id,
        paymentStatus: transaction_status,
        fraudStatus: fraud_status,
        paymentType: payment_type,
        bank:
          payment_type === 'bank_transfer'
            ? notification.va_numbers?.[0]?.bank
            : payment_type === 'echannel'
              ? 'mandiri'
              : null,
        vaNumber:
          payment_type === 'bank_transfer'
            ? notification.va_numbers?.[0]?.va_number
            : payment_type === 'echannel'
              ? notification.bill_key
              : null,
        rawNotification: notification,
        paidAt:
          transaction_status === 'settlement' || transaction_status === 'capture'
            ? new Date(settlement_time || new Date())
            : null,
      },
    });

    // 5. Activate subscription kalau bayar sukses
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const price = parseFloat(gross_amount);
      const periodDays = parseInt(
        this.configService.get('SUBSCRIPTION_BUSINESS_PERIOD_DAYS', '30'),
      );

      await this.subscriptionService.activateBusinessPlan(payment.tenantId, periodDays, price);

      this.logger.log(`Subscription activated for tenant: ${payment.tenantId}`);
    }

    // 6. Handle failed/cancelled
    if (['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)) {
      this.logger.log(`Payment failed for ${order_id}: ${transaction_status}`);
    }

    return { status: 'success' };
  }

  /**
   * Get client key untuk frontend
   */
  getClientKey(): string {
    return this.configService.get<string>('midtrans.clientKey', '');
  }
}
