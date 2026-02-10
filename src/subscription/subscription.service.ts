import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS, PlanFeature } from './plan-limits';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get subscription tenant.
   * New user → BUSINESS trial 30 hari (gratis, tanpa kartu kredit).
   */
  async getSubscription(tenantId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 30);

      subscription = await this.prisma.subscription.create({
        data: {
          tenantId,
          plan: 'BUSINESS',
          status: 'ACTIVE',
          isTrial: true,
          trialEndsAt: trialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          priceAmount: 0,
        },
      });

      this.logger.log(
        `New tenant ${tenantId} → BUSINESS trial until ${trialEnd.toISOString()}`,
      );
    }

    return subscription;
  }

  /**
   * Auto-downgrade ke STARTER kalau trial/period sudah habis.
   * Dipanggil sebelum return data ke user.
   */
  private async autoDowngradeIfExpired(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription || subscription.plan !== 'BUSINESS') return subscription;

    const now = new Date();
    const isExpired = subscription.currentPeriodEnd && subscription.currentPeriodEnd < now;
    const isTrialExpired = subscription.isTrial && subscription.trialEndsAt && subscription.trialEndsAt < now;

    if (isExpired || isTrialExpired) {
      const updated = await this.prisma.subscription.update({
        where: { tenantId },
        data: {
          plan: 'STARTER',
          status: 'ACTIVE',
          isTrial: false,
          trialEndsAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          priceAmount: 0,
          cancelledAt: null,
          cancelReason: null,
        },
      });

      this.logger.log(
        `Tenant ${tenantId} auto-downgraded to STARTER (${isTrialExpired ? 'trial expired' : 'period expired'})`,
      );

      return updated;
    }

    return subscription;
  }

  /**
   * Get plan info + usage counts.
   * Auto-downgrade kalau trial/period expired.
   */
  async getPlanInfo(tenantId: string) {
    // Ensure subscription exists (creates trial for new users)
    await this.getSubscription(tenantId);

    // Check and auto-downgrade if expired
    const subscription = await this.autoDowngradeIfExpired(tenantId);
    const plan = subscription!.plan;
    const limits = PLAN_LIMITS[plan];

    const [productCount, customerCount] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    return {
      subscription,
      limits,
      usage: {
        products: productCount,
        customers: customerCount,
      },
      isAtLimit: {
        products: productCount >= limits.maxProducts,
        customers: customerCount >= limits.maxCustomers,
      },
      isOverLimit: {
        products: productCount > limits.maxProducts,
        customers: customerCount > limits.maxCustomers,
      },
    };
  }

  /**
   * Cek apakah tenant boleh pakai fitur tertentu.
   * Auto-downgrade dulu kalau expired.
   */
  async checkFeatureAccess(tenantId: string, feature: PlanFeature): Promise<boolean> {
    await this.getSubscription(tenantId);
    const subscription = await this.autoDowngradeIfExpired(tenantId);

    if (!subscription) return false;

    if (subscription.plan === 'BUSINESS' && subscription.status !== 'ACTIVE') {
      return false;
    }

    return !!PLAN_LIMITS[subscription.plan][feature];
  }

  /**
   * Cek limit produk sebelum create.
   * Throw error kalau sudah mentok.
   */
  async checkProductLimit(tenantId: string) {
    await this.getSubscription(tenantId);
    const subscription = (await this.autoDowngradeIfExpired(tenantId))!;
    const limit = PLAN_LIMITS[subscription.plan].maxProducts;

    if (limit === Infinity) return;

    const count = await this.prisma.product.count({ where: { tenantId } });

    if (count >= limit) {
      throw new ForbiddenException(
        `Batas ${limit} produk tercapai. Upgrade ke Business untuk produk unlimited.`,
      );
    }
  }

  /**
   * Cek limit customer sebelum create.
   */
  async checkCustomerLimit(tenantId: string) {
    await this.getSubscription(tenantId);
    const subscription = (await this.autoDowngradeIfExpired(tenantId))!;
    const limit = PLAN_LIMITS[subscription.plan].maxCustomers;

    if (limit === Infinity) return;

    const count = await this.prisma.customer.count({ where: { tenantId } });

    if (count >= limit) {
      throw new ForbiddenException(
        `Batas ${limit} pelanggan tercapai. Upgrade ke Business untuk pelanggan unlimited.`,
      );
    }
  }

  /**
   * Activate Business plan (dipanggil setelah payment success via webhook).
   * Clear trial flags - ini sekarang paid BUSINESS.
   */
  async activateBusinessPlan(tenantId: string, periodDays: number, price: number) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: 'BUSINESS',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        priceAmount: price,
      },
      update: {
        plan: 'BUSINESS',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        priceAmount: price,
        isTrial: false,
        trialEndsAt: null,
        cancelledAt: null,
        cancelReason: null,
      },
    });

    this.logger.log(
      `Tenant ${tenantId} upgraded to BUSINESS (paid) until ${periodEnd.toISOString()}`,
    );

    return subscription;
  }

  /**
   * Get payment history tenant
   */
  async getPaymentHistory(tenantId: string) {
    return this.prisma.subscriptionPayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Cancel subscription / trial.
   * - Akses Business tetap aktif sampai currentPeriodEnd / trialEndsAt
   * - Setelah expired, otomatis turun ke STARTER (via autoDowngradeIfExpired)
   * - NO REFUND
   */
  async cancelSubscription(tenantId: string, reason?: string) {
    const subscription = await this.getSubscription(tenantId);

    if (subscription.plan !== 'BUSINESS') {
      throw new BadRequestException('Tidak ada langganan aktif yang bisa dibatalkan.');
    }

    if (subscription.cancelledAt) {
      throw new BadRequestException('Langganan sudah dalam proses pembatalan.');
    }

    const defaultReason = subscription.isTrial
      ? 'Trial dibatalkan oleh user'
      : 'Dibatalkan oleh user';

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason || defaultReason,
      },
    });

    this.logger.log(
      `Tenant ${tenantId} cancelled ${subscription.isTrial ? 'TRIAL' : 'BUSINESS'}. Access until ${updated.currentPeriodEnd?.toISOString()}`,
    );

    return updated;
  }
}
