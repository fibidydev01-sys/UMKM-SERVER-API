import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, CACHE_TTL, CACHE_KEYS } from '../redis/redis.service';
import { SeoService } from '../seo/seo.service';
import { Prisma } from '@prisma/client';
import { UpdateTenantDto, ChangePasswordDto } from './dto';
import * as bcrypt from 'bcrypt';

// 🔥 Import validator
import { validateAndSanitizeLandingConfig } from '../validators/landing-config.validator';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private seoService: SeoService,
  ) {}

  // ==========================================
  // PUBLIC: GET TENANT BY SLUG (dengan caching)
  // ==========================================
  async findBySlug(slug: string) {
    const normalizedSlug = slug.toLowerCase();
    const cacheKey = CACHE_KEYS.TENANT_SLUG(normalizedSlug);

    this.logger.debug(`[findBySlug] Looking for slug: ${normalizedSlug}`);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        this.logger.debug(`[findBySlug] Cache MISS - fetching from DB`);

        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: normalizedSlug },
          select: {
            id: true,
            slug: true,
            name: true,
            category: true,
            description: true,
            whatsapp: true,
            phone: true,
            address: true,
            logo: true,
            banner: true,
            theme: true,
            landingConfig: true,
            metaTitle: true,
            metaDescription: true,
            socialLinks: true,
            currency: true,
            taxRate: true,
            paymentMethods: true,
            freeShippingThreshold: true,
            defaultShippingCost: true,
            shippingMethods: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                products: {
                  where: { isActive: true },
                },
              },
            },
          },
        });

        if (!tenant) {
          throw new NotFoundException(
            `Toko dengan slug "${slug}" tidak ditemukan`,
          );
        }

        if (tenant.status !== 'ACTIVE') {
          throw new NotFoundException(`Toko tidak aktif`);
        }

        this.logger.debug(
          `[findBySlug] Found tenant, landingConfig enabled: ${(tenant.landingConfig as any)?.enabled}`,
        );

        return tenant;
      },
      CACHE_TTL.TENANT_PUBLIC,
    );
  }

  // ==========================================
  // PUBLIC: GET PRODUCTS BY SLUG (dengan caching)
  // ==========================================
  async findProductsBySlug(slug: string, category?: string) {
    const cacheKey = category
      ? `${CACHE_KEYS.TENANT_PRODUCTS_PUBLIC(slug)}:${category}`
      : CACHE_KEYS.TENANT_PRODUCTS_PUBLIC(slug);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: slug.toLowerCase() },
          select: { id: true, status: true },
        });

        if (!tenant) {
          throw new NotFoundException(
            `Toko dengan slug "${slug}" tidak ditemukan`,
          );
        }

        if (tenant.status !== 'ACTIVE') {
          throw new NotFoundException(`Toko tidak aktif`);
        }

        const products = await this.prisma.product.findMany({
          where: {
            tenantId: tenant.id,
            isActive: true,
            ...(category && { category }),
          },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            price: true,
            comparePrice: true,
            stock: true,
            trackStock: true,
            unit: true,
            images: true,
            isFeatured: true,
            slug: true,
          },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        });

        return products;
      },
      CACHE_TTL.PRODUCT_LIST,
    );
  }

  // ==========================================
  // PROTECTED: GET ME
  // ==========================================
  async findMe(tenantId: string) {
    const cacheKey = CACHE_KEYS.TENANT_ID(tenantId);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            slug: true,
            name: true,
            email: true,
            category: true,
            description: true,
            whatsapp: true,
            phone: true,
            address: true,
            logo: true,
            banner: true,
            theme: true,
            landingConfig: true,
            metaTitle: true,
            metaDescription: true,
            socialLinks: true,
            currency: true,
            taxRate: true,
            paymentMethods: true,
            freeShippingThreshold: true,
            defaultShippingCost: true,
            shippingMethods: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
                customers: true,
                orders: true,
              },
            },
          },
        });

        if (!tenant) {
          throw new NotFoundException('Tenant tidak ditemukan');
        }

        return tenant;
      },
      CACHE_TTL.TENANT_PRIVATE,
    );
  }

  // ==========================================
  // 🔥 FIXED: UPDATE ME with Proper LandingConfig Handling
  // ==========================================
  async updateMe(tenantId: string, dto: UpdateTenantDto) {
    this.logger.log(`[updateMe] Starting update for tenant: ${tenantId}`);

    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, landingConfig: true },
    });

    if (!existing) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    // ==========================================
    // 🔥 FIX: Build update data object dynamically
    // Only include fields that are explicitly provided
    // ==========================================
    const updateData: Prisma.TenantUpdateInput = {};

    // Basic info - only set if provided
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.whatsapp !== undefined) updateData.whatsapp = dto.whatsapp;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.logo !== undefined) updateData.logo = dto.logo;
    if (dto.banner !== undefined) updateData.banner = dto.banner;
    if (dto.theme !== undefined)
      updateData.theme = dto.theme as Prisma.InputJsonValue;

    // SEO
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined)
      updateData.metaDescription = dto.metaDescription;
    if (dto.socialLinks !== undefined)
      updateData.socialLinks =
        dto.socialLinks as unknown as Prisma.InputJsonValue;

    // Payment & Shipping
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.paymentMethods !== undefined)
      updateData.paymentMethods =
        dto.paymentMethods as unknown as Prisma.InputJsonValue;
    if (dto.freeShippingThreshold !== undefined)
      updateData.freeShippingThreshold = dto.freeShippingThreshold;
    if (dto.defaultShippingCost !== undefined)
      updateData.defaultShippingCost = dto.defaultShippingCost;
    if (dto.shippingMethods !== undefined)
      updateData.shippingMethods =
        dto.shippingMethods as unknown as Prisma.InputJsonValue;

    // ==========================================
    // 🔥 FIX: Handle landingConfig with detailed logging
    // ==========================================
    if (dto.landingConfig !== undefined) {
      this.logger.log(`[updateMe] Processing landingConfig...`);
      this.logger.debug(
        `[updateMe] Raw landingConfig type: ${typeof dto.landingConfig}`,
      );
      this.logger.debug(
        `[updateMe] Raw landingConfig: ${JSON.stringify(dto.landingConfig, null, 2)}`,
      );

      // Validate the landing config
      const validationResult = validateAndSanitizeLandingConfig(
        dto.landingConfig,
      );

      this.logger.debug(
        `[updateMe] Validation result: valid=${validationResult.valid}`,
      );

      if (!validationResult.valid) {
        this.logger.error(
          `[updateMe] Validation failed: ${JSON.stringify(validationResult.errors)}`,
        );
        throw new BadRequestException({
          message: 'Invalid landing page configuration',
          errors: validationResult.errors,
          code: 'INVALID_LANDING_CONFIG',
        });
      }

      if (validationResult.warnings?.length) {
        this.logger.warn(
          `[updateMe] Validation warnings: ${validationResult.warnings.join(', ')}`,
        );
      }

      // 🔥 KEY FIX: Use validated data if available, otherwise use original dto
      // This ensures we always have data to save
      const configToSave = validationResult.data ?? dto.landingConfig;

      this.logger.debug(
        `[updateMe] Config to save: ${JSON.stringify(configToSave, null, 2)}`,
      );

      updateData.landingConfig =
        configToSave as unknown as Prisma.InputJsonValue;
    }

    // ==========================================
    // Perform the update
    // ==========================================
    this.logger.log(`[updateMe] Executing Prisma update...`);
    this.logger.debug(
      `[updateMe] Update data keys: ${Object.keys(updateData).join(', ')}`,
    );

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        category: true,
        description: true,
        whatsapp: true,
        phone: true,
        address: true,
        logo: true,
        banner: true,
        theme: true,
        landingConfig: true,
        metaTitle: true,
        metaDescription: true,
        socialLinks: true,
        currency: true,
        taxRate: true,
        paymentMethods: true,
        freeShippingThreshold: true,
        defaultShippingCost: true,
        shippingMethods: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(`[updateMe] Update successful`);
    this.logger.debug(
      `[updateMe] Saved landingConfig enabled: ${(tenant.landingConfig as any)?.enabled}`,
    );

    // ==========================================
    // 🔥 FIX: Invalidate ALL related caches
    // ==========================================
    this.logger.log(
      `[updateMe] Invalidating caches for slug: ${existing.slug}`,
    );

    await Promise.all([
      this.redis.invalidateTenant(tenantId, existing.slug),
      // Also explicitly delete the slug cache with lowercase
      this.redis.del(CACHE_KEYS.TENANT_SLUG(existing.slug.toLowerCase())),
    ]);

    // Trigger SEO reindex (fire and forget)
    this.seoService.onTenantUpdated(existing.slug).catch((error) => {
      this.logger.error(`[SEO] Failed to reindex tenant: ${error.message}`);
    });

    return {
      message: 'Profil berhasil diupdate',
      tenant,
    };
  }

  // ==========================================
  // PROTECTED: CHANGE PASSWORD
  // ==========================================
  async changePassword(tenantId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Konfirmasi password tidak cocok');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, password: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      tenant.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Password lama tidak sesuai');
    }

    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      tenant.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password berhasil diubah',
    };
  }

  // ==========================================
  // 🚀 OPTIMIZED: GET DASHBOARD STATS
  // ==========================================
  async getDashboardStats(tenantId: string) {
    const cacheKey = CACHE_KEYS.TENANT_STATS(tenantId);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);

        const [productStats, customerStats, orderStats, revenueStats] =
          await Promise.all([
            this.prisma.$queryRaw<
              [{ total: bigint; active: bigint; low_stock: bigint }]
            >`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE "isActive" = true) as active,
              COUNT(*) FILTER (WHERE "isActive" = true AND "trackStock" = true AND stock <= 5) as low_stock
            FROM "Product"
            WHERE "tenantId" = ${tenantId}
          `,
            this.prisma.$queryRaw<
              [{ total: bigint; this_month: bigint; last_month: bigint }]
            >`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfMonth}) as this_month,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfLastMonth} AND "createdAt" <= ${endOfLastMonth}) as last_month
            FROM "Customer"
            WHERE "tenantId" = ${tenantId}
          `,
            this.prisma.$queryRaw<
              [
                {
                  total: bigint;
                  today: bigint;
                  this_week: bigint;
                  this_month: bigint;
                  last_month: bigint;
                  pending: bigint;
                },
              ]
            >`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfToday}) as today,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfWeek}) as this_week,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfMonth}) as this_month,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfLastMonth} AND "createdAt" <= ${endOfLastMonth}) as last_month,
              COUNT(*) FILTER (WHERE status = 'PENDING') as pending
            FROM "Order"
            WHERE "tenantId" = ${tenantId}
          `,
            this.prisma.$queryRaw<
              [
                {
                  this_week: number | null;
                  this_month: number | null;
                  last_month: number | null;
                },
              ]
            >`
            SELECT 
              COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${startOfWeek} AND status IN ('PROCESSING', 'COMPLETED')), 0) as this_week,
              COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${startOfMonth} AND status IN ('PROCESSING', 'COMPLETED')), 0) as this_month,
              COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${startOfLastMonth} AND "createdAt" <= ${endOfLastMonth} AND status IN ('PROCESSING', 'COMPLETED')), 0) as last_month
            FROM "Order"
            WHERE "tenantId" = ${tenantId}
          `,
          ]);

        const [recentOrders, lowStockItems] = await Promise.all([
          this.prisma.order.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
              customer: {
                select: { id: true, name: true, phone: true },
              },
              customerName: true,
              customerPhone: true,
            },
          }),
          this.prisma.product.findMany({
            where: {
              tenantId,
              isActive: true,
              trackStock: true,
              stock: { lte: 5 },
            },
            orderBy: { stock: 'asc' },
            take: 5,
            select: {
              id: true,
              name: true,
              stock: true,
              sku: true,
            },
          }),
        ]);

        const calculateTrend = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };

        const products = {
          total: Number(productStats[0]?.total ?? 0),
          active: Number(productStats[0]?.active ?? 0),
          lowStock: Number(productStats[0]?.low_stock ?? 0),
        };

        const customersThisMonth = Number(customerStats[0]?.this_month ?? 0);
        const customersLastMonth = Number(customerStats[0]?.last_month ?? 0);
        const ordersThisMonth = Number(orderStats[0]?.this_month ?? 0);
        const ordersLastMonth = Number(orderStats[0]?.last_month ?? 0);
        const thisMonthRevenue = Number(revenueStats[0]?.this_month ?? 0);
        const lastMonthRevenue = Number(revenueStats[0]?.last_month ?? 0);

        return {
          products,
          customers: {
            total: Number(customerStats[0]?.total ?? 0),
            thisMonth: customersThisMonth,
            trend: calculateTrend(customersThisMonth, customersLastMonth),
          },
          orders: {
            total: Number(orderStats[0]?.total ?? 0),
            today: Number(orderStats[0]?.today ?? 0),
            thisWeek: Number(orderStats[0]?.this_week ?? 0),
            thisMonth: ordersThisMonth,
            pending: Number(orderStats[0]?.pending ?? 0),
            trend: calculateTrend(ordersThisMonth, ordersLastMonth),
          },
          revenue: {
            thisWeek: Number(revenueStats[0]?.this_week ?? 0),
            thisMonth: thisMonthRevenue,
            lastMonth: lastMonthRevenue,
            trend: calculateTrend(thisMonthRevenue, lastMonthRevenue),
          },
          alerts: {
            lowStock: products.lowStock,
            pendingOrders: Number(orderStats[0]?.pending ?? 0),
          },
          recentOrders,
          lowStockItems,
        };
      },
      CACHE_TTL.DASHBOARD_STATS,
    );
  }

  // ==========================================
  // HELPER: Check slug availability
  // ==========================================
  async checkSlugAvailability(slug: string) {
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true },
    });

    return {
      slug: slug.toLowerCase(),
      available: !existing,
    };
  }
}
