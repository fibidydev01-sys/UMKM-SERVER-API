import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ==========================================
// SITEMAP SERVICE
// Provides data for sitemap generation
// ==========================================

@Injectable()
export class SitemapService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PAGINATED: TENANTS
  // ==========================================

  async getTenantsForSitemapPaginated(page: number = 1, limit: number = 1000) {
    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.tenant.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    return {
      tenants: tenants.map((t) => ({
        slug: t.slug,
        updatedAt: t.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // PAGINATED: PRODUCTS
  // ==========================================

  async getProductsForSitemapPaginated(page: number = 1, limit: number = 1000) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          tenant: { status: 'ACTIVE' },
        },
        select: {
          id: true,
          slug: true,
          updatedAt: true,
          tenant: {
            select: { slug: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({
        where: {
          isActive: true,
          tenant: { status: 'ACTIVE' },
        },
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        tenantSlug: p.tenant.slug,
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // SIMPLE: ALL TENANTS (for small scale)
  // ==========================================

  async getTenantsForSitemap() {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      tenants: tenants.map((t) => ({
        slug: t.slug,
        updatedAt: t.updatedAt.toISOString(),
      })),
      total: tenants.length,
    };
  }

  // ==========================================
  // SIMPLE: ALL PRODUCTS (for small scale)
  // ==========================================

  async getProductsForSitemap() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        tenant: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        tenant: {
          select: { slug: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        tenantSlug: p.tenant.slug,
        updatedAt: p.updatedAt.toISOString(),
      })),
      total: products.length,
    };
  }

  // ==========================================
  // STATS
  // ==========================================

  async getSitemapStats() {
    const [tenantCount, productCount, lastTenantUpdate, lastProductUpdate] =
      await Promise.all([
        this.prisma.tenant.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.product.count({
          where: {
            isActive: true,
            tenant: { status: 'ACTIVE' },
          },
        }),
        this.prisma.tenant.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
        this.prisma.product.findFirst({
          where: {
            isActive: true,
            tenant: { status: 'ACTIVE' },
          },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

    // Calculate estimated URLs
    // Static pages (8) + tenant URLs (2 per tenant) + product URLs
    const staticPages = 8;
    const tenantPages = tenantCount * 2; // store homepage + products page per tenant
    const totalUrls = staticPages + tenantPages + productCount;

    return {
      stats: {
        tenants: tenantCount,
        products: productCount,
        estimatedUrls: totalUrls,
        lastTenantUpdate: lastTenantUpdate?.updatedAt?.toISOString() || null,
        lastProductUpdate: lastProductUpdate?.updatedAt?.toISOString() || null,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
