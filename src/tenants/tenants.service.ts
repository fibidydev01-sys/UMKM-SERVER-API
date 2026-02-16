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

// Import validator
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
            // Store Information Fields
            heroTitle: true,
            heroSubtitle: true,
            heroCtaText: true,
            heroCtaLink: true,
            heroBackgroundImage: true,
            aboutTitle: true,
            aboutSubtitle: true,
            aboutContent: true,
            aboutImage: true,
            aboutFeatures: true,
            testimonialsTitle: true,
            testimonialsSubtitle: true,
            testimonials: true,
            contactTitle: true,
            contactSubtitle: true,
            contactMapUrl: true,
            contactShowMap: true,
            contactShowForm: true,
            ctaTitle: true,
            ctaSubtitle: true,
            ctaButtonText: true,
            ctaButtonLink: true,
            ctaButtonStyle: true,
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
          `[findBySlug] Found tenant, has landingConfig: ${!!tenant.landingConfig}`,
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
            // Store Information Fields
            heroTitle: true,
            heroSubtitle: true,
            heroCtaText: true,
            heroCtaLink: true,
            heroBackgroundImage: true,
            aboutTitle: true,
            aboutSubtitle: true,
            aboutContent: true,
            aboutImage: true,
            aboutFeatures: true,
            testimonialsTitle: true,
            testimonialsSubtitle: true,
            testimonials: true,
            contactTitle: true,
            contactSubtitle: true,
            contactMapUrl: true,
            contactShowMap: true,
            contactShowForm: true,
            ctaTitle: true,
            ctaSubtitle: true,
            ctaButtonText: true,
            ctaButtonLink: true,
            ctaButtonStyle: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                products: true,
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
  // UPDATE ME with Proper LandingConfig Handling
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

    // Build update data object dynamically
    const updateData: Prisma.TenantUpdateInput = {};

    // Basic info
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.whatsapp !== undefined) updateData.whatsapp = dto.whatsapp;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.logo !== undefined) updateData.logo = dto.logo;
    if (dto.theme !== undefined)
      updateData.theme = dto.theme as Prisma.InputJsonValue;

    // SEO
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined)
      updateData.metaDescription = dto.metaDescription;
    if (dto.socialLinks !== undefined)
      updateData.socialLinks = dto.socialLinks as Prisma.InputJsonValue;

    // Payment & Shipping
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.paymentMethods !== undefined)
      updateData.paymentMethods = dto.paymentMethods as Prisma.InputJsonValue;
    if (dto.freeShippingThreshold !== undefined)
      updateData.freeShippingThreshold = dto.freeShippingThreshold;
    if (dto.defaultShippingCost !== undefined)
      updateData.defaultShippingCost = dto.defaultShippingCost;
    if (dto.shippingMethods !== undefined)
      updateData.shippingMethods = dto.shippingMethods as Prisma.InputJsonValue;

    // HERO SECTION
    if (dto.heroTitle !== undefined) updateData.heroTitle = dto.heroTitle;
    if (dto.heroSubtitle !== undefined)
      updateData.heroSubtitle = dto.heroSubtitle;
    if (dto.heroCtaText !== undefined) updateData.heroCtaText = dto.heroCtaText;
    if (dto.heroCtaLink !== undefined) updateData.heroCtaLink = dto.heroCtaLink;
    if (dto.heroBackgroundImage !== undefined)
      updateData.heroBackgroundImage = dto.heroBackgroundImage;

    // ABOUT SECTION
    if (dto.aboutTitle !== undefined) updateData.aboutTitle = dto.aboutTitle;
    if (dto.aboutSubtitle !== undefined)
      updateData.aboutSubtitle = dto.aboutSubtitle;
    if (dto.aboutContent !== undefined)
      updateData.aboutContent = dto.aboutContent;
    if (dto.aboutImage !== undefined) updateData.aboutImage = dto.aboutImage;
    if (dto.aboutFeatures !== undefined)
      updateData.aboutFeatures =
        dto.aboutFeatures as unknown as Prisma.InputJsonValue;

    // TESTIMONIALS SECTION
    if (dto.testimonialsTitle !== undefined)
      updateData.testimonialsTitle = dto.testimonialsTitle;
    if (dto.testimonialsSubtitle !== undefined)
      updateData.testimonialsSubtitle = dto.testimonialsSubtitle;
    if (dto.testimonials !== undefined)
      updateData.testimonials =
        dto.testimonials as unknown as Prisma.InputJsonValue;

    // CONTACT SECTION
    if (dto.contactTitle !== undefined)
      updateData.contactTitle = dto.contactTitle;
    if (dto.contactSubtitle !== undefined)
      updateData.contactSubtitle = dto.contactSubtitle;
    if (dto.contactMapUrl !== undefined)
      updateData.contactMapUrl = dto.contactMapUrl;
    if (dto.contactShowMap !== undefined)
      updateData.contactShowMap = dto.contactShowMap;
    if (dto.contactShowForm !== undefined)
      updateData.contactShowForm = dto.contactShowForm;

    // CTA SECTION
    if (dto.ctaTitle !== undefined) updateData.ctaTitle = dto.ctaTitle;
    if (dto.ctaSubtitle !== undefined) updateData.ctaSubtitle = dto.ctaSubtitle;
    if (dto.ctaButtonText !== undefined)
      updateData.ctaButtonText = dto.ctaButtonText;
    if (dto.ctaButtonLink !== undefined)
      updateData.ctaButtonLink = dto.ctaButtonLink;
    if (dto.ctaButtonStyle !== undefined)
      updateData.ctaButtonStyle = dto.ctaButtonStyle;

    // Handle landingConfig
    if (dto.landingConfig !== undefined) {
      this.logger.log(`[updateMe] Processing landingConfig...`);

      const validationResult = validateAndSanitizeLandingConfig(
        dto.landingConfig,
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

      const configToSave = validationResult.data ?? dto.landingConfig;
      updateData.landingConfig = configToSave as Prisma.InputJsonValue;
    }

    // Perform the update
    this.logger.log(`[updateMe] Executing Prisma update...`);

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
        // Store Information Fields
        heroTitle: true,
        heroSubtitle: true,
        heroCtaText: true,
        heroCtaLink: true,
        heroBackgroundImage: true,
        aboutTitle: true,
        aboutSubtitle: true,
        aboutContent: true,
        aboutImage: true,
        aboutFeatures: true,
        testimonialsTitle: true,
        testimonialsSubtitle: true,
        testimonials: true,
        contactTitle: true,
        contactSubtitle: true,
        contactMapUrl: true,
        contactShowMap: true,
        contactShowForm: true,
        ctaTitle: true,
        ctaSubtitle: true,
        ctaButtonText: true,
        ctaButtonLink: true,
        ctaButtonStyle: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log(`[updateMe] Update successful`);

    // Invalidate caches
    await Promise.all([
      this.redis.invalidateTenant(tenantId, existing.slug),
      this.redis.del(CACHE_KEYS.TENANT_SLUG(existing.slug.toLowerCase())),
    ]);

    // Trigger SEO reindex
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
  // GET DASHBOARD STATS (CLEANED - No Customer/Order)
  // ==========================================
  async getDashboardStats(tenantId: string) {
    const cacheKey = CACHE_KEYS.TENANT_STATS(tenantId);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        // Product stats
        const productStats = await this.prisma.$queryRaw<
          [{ total: bigint; active: bigint; low_stock: bigint }]
        >`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE "isActive" = true) as active,
            COUNT(*) FILTER (WHERE "isActive" = true AND "trackStock" = true AND stock <= 5) as low_stock
          FROM "Product"
          WHERE "tenantId" = ${tenantId}
        `;

        // Low stock items
        const lowStockItems = await this.prisma.product.findMany({
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
        });

        const products = {
          total: Number(productStats[0]?.total ?? 0),
          active: Number(productStats[0]?.active ?? 0),
          lowStock: Number(productStats[0]?.low_stock ?? 0),
        };

        return {
          products,
          alerts: {
            lowStock: products.lowStock,
          },
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
