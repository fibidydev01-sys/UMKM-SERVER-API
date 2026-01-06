import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, CACHE_TTL, CACHE_KEYS } from '../redis/redis.service';
import { Prisma } from '@prisma/client';
import { UpdateTenantDto, ChangePasswordDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ==========================================
  // PUBLIC: GET BY SLUG (dengan caching)
  // ==========================================
  async findBySlug(slug: string) {
    const cacheKey = CACHE_KEYS.TENANT_SLUG(slug.toLowerCase());

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: slug.toLowerCase() },
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

        return tenant;
      },
      CACHE_TTL.TENANT_PUBLIC,
    );
  }

  // ==========================================
  // PUBLIC: GET PRODUCTS BY SLUG (dengan caching)
  // ==========================================
  async findProductsBySlug(slug: string, category?: string) {
    // Untuk products dengan filter, kita cache per kombinasi
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
            // OPTIMIZATION: Skip metadata kalau ga perlu di public
            // metadata: true,
          },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        });

        return products;
      },
      CACHE_TTL.PRODUCT_LIST,
    );
  }

  // ==========================================
  // PROTECTED: GET CURRENT TENANT
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
  // PROTECTED: UPDATE CURRENT TENANT
  // ==========================================
  async updateMe(tenantId: string, dto: UpdateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    if (!existing) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        description: dto.description,
        whatsapp: dto.whatsapp,
        phone: dto.phone,
        address: dto.address,
        logo: dto.logo,
        banner: dto.banner,
        theme: dto.theme,
        landingConfig: dto.landingConfig as unknown as Prisma.InputJsonValue,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        socialLinks: dto.socialLinks as unknown as Prisma.InputJsonValue,
      },
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
        status: true,
        updatedAt: true,
      },
    });

    // 🔥 INVALIDATE CACHE
    await this.redis.invalidateTenant(tenantId, existing.slug);

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

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

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
  // Dari 15+ queries jadi lebih efisien dengan caching
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

        // ==========================================
        // OPTIMIZATION 1: Raw SQL untuk aggregate queries
        // Menggabungkan multiple counts jadi 1 query
        // ==========================================
        const [productStats, customerStats, orderStats, revenueStats] =
          await Promise.all([
            // Product stats - 1 query instead of 3
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

            // Customer stats - 1 query instead of 3
            this.prisma.$queryRaw<
              [
                {
                  total: bigint;
                  this_month: bigint;
                  last_month: bigint;
                },
              ]
            >`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfMonth}) as this_month,
              COUNT(*) FILTER (WHERE "createdAt" >= ${startOfLastMonth} AND "createdAt" <= ${endOfLastMonth}) as last_month
            FROM "Customer"
            WHERE "tenantId" = ${tenantId}
          `,

            // Order stats - 1 query instead of 6
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

            // Revenue stats - 1 query instead of 3
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

        // Recent data - these we still need separate queries but they're light
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

        // Calculate trends
        const calculateTrend = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };

        // Convert BigInt to Number (PostgreSQL returns bigint for COUNT)
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
