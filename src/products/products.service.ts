import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, CACHE_TTL, CACHE_KEYS } from '../redis/redis.service';
import { SeoService } from '../seo/seo.service'; // 🚀 SEO SERVICE
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  UpdateStockDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private seoService: SeoService, // 🚀 SEO SERVICE INJECTION
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(
    tenantId: string,
    baseSlug: string,
    excludeProductId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          tenantId,
          slug,
          ...(excludeProductId && { id: { not: excludeProductId } }),
        },
        select: { id: true },
      });

      if (!existing) return slug;

      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 100) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  }

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  async findPublicProduct(productId: string) {
    const cacheKey = CACHE_KEYS.PRODUCT_DETAIL(productId);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            price: true,
            comparePrice: true,
            images: true,
            stock: true,
            trackStock: true,
            unit: true,
            isActive: true,
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                whatsapp: true,
                logo: true,
                status: true,
              },
            },
          },
        });

        if (!product) {
          throw new NotFoundException('Produk tidak ditemukan');
        }

        if (!product.isActive || product.tenant.status !== 'ACTIVE') {
          throw new NotFoundException('Produk tidak tersedia');
        }

        return product;
      },
      CACHE_TTL.PRODUCT_DETAIL,
    );
  }

  async findBySlug(tenantSlug: string, productSlug: string) {
    const cacheKey = CACHE_KEYS.PRODUCT_BY_SLUG(tenantSlug, productSlug);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: tenantSlug.toLowerCase() },
          select: { id: true, status: true },
        });

        if (!tenant || tenant.status !== 'ACTIVE') {
          throw new NotFoundException('Toko tidak ditemukan');
        }

        const product = await this.prisma.product.findFirst({
          where: {
            tenantId: tenant.id,
            slug: productSlug.toLowerCase(),
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            price: true,
            comparePrice: true,
            images: true,
            stock: true,
            trackStock: true,
            unit: true,
            metadata: true,
            tenant: {
              select: {
                id: true,
                slug: true,
                name: true,
                whatsapp: true,
                logo: true,
              },
            },
          },
        });

        if (!product) {
          throw new NotFoundException('Produk tidak ditemukan');
        }

        return product;
      },
      CACHE_TTL.PRODUCT_DETAIL,
    );
  }

  async findByStoreSlug(slug: string, query: QueryProductDto) {
    const queryHash = this.redis.hashQuery({ ...query });
    const cacheKey = `store:products:${slug}:${queryHash}`;

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
          throw new NotFoundException('Toko tidak aktif');
        }

        const {
          search,
          category,
          isFeatured,
          sortBy = 'createdAt',
          sortOrder = 'desc',
          page = 1,
          limit = 20,
        } = query;

        const where: Prisma.ProductWhereInput = {
          tenantId: tenant.id,
          isActive: true,
        };

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (category) where.category = category;
        if (typeof isFeatured === 'boolean') where.isFeatured = isFeatured;

        const orderBy: Prisma.ProductOrderByWithRelationInput = {
          [sortBy]: sortOrder,
        };

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              category: true,
              price: true,
              comparePrice: true,
              stock: true,
              trackStock: true,
              unit: true,
              images: true,
              isFeatured: true,
              createdAt: true,
            },
          }),
          this.prisma.product.count({ where }),
        ]);

        return {
          data: products,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      CACHE_TTL.PRODUCT_LIST,
    );
  }

  async findByStoreSlugAndProductId(slug: string, productId: string) {
    const cacheKey = `store:product:${slug}:${productId}`;

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
          throw new NotFoundException('Toko tidak aktif');
        }

        const product = await this.prisma.product.findFirst({
          where: {
            id: productId,
            tenantId: tenant.id,
            isActive: true,
          },
          select: {
            id: true,
            tenantId: true,
            name: true,
            description: true,
            category: true,
            sku: true,
            price: true,
            comparePrice: true,
            stock: true,
            minStock: true,
            trackStock: true,
            unit: true,
            images: true,
            metadata: true,
            isActive: true,
            isFeatured: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!product) {
          throw new NotFoundException(
            'Produk tidak ditemukan atau tidak aktif',
          );
        }

        return product;
      },
      CACHE_TTL.PRODUCT_DETAIL,
    );
  }

  // ==========================================
  // 🚀 CREATE - dengan SEO indexing
  // ==========================================
  async create(tenantId: string, dto: CreateProductDto) {
    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { tenantId_sku: { tenantId, sku: dto.sku } },
      });

      if (existingSku) {
        throw new ConflictException(`SKU "${dto.sku}" sudah digunakan`);
      }
    }

    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(tenantId, baseSlug);

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        category: dto.category,
        sku: dto.sku,
        price: dto.price,
        comparePrice: dto.comparePrice,
        costPrice: dto.costPrice,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        trackStock: dto.trackStock ?? false,
        unit: dto.unit,
        images: dto.images ?? [],
        metadata: dto.metadata ?? {},
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    await this.redis.invalidateAllProductCaches(tenantId, tenant?.slug);

    // 🚀 SEO: Index new product
    if (tenant) {
      this.seoService
        .onProductCreated(tenant.slug, product.id, product.slug ?? undefined)
        .catch((error) => {
          console.error('[SEO] Failed to index new product:', error.message);
        });
    }

    return {
      message: 'Produk berhasil ditambahkan',
      product,
    };
  }

  // ==========================================
  // PROTECTED METHODS
  // ==========================================

  async findAll(tenantId: string, query: QueryProductDto) {
    const queryHash = this.redis.hashQuery({ ...query, tenantId });
    const cacheKey = CACHE_KEYS.PRODUCT_LIST(tenantId, queryHash);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const {
          search,
          category,
          isActive,
          isFeatured,
          lowStock,
          sortBy = 'createdAt',
          sortOrder = 'desc',
          page = 1,
          limit = 20,
        } = query;

        const where: Prisma.ProductWhereInput = { tenantId };

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (category) where.category = category;
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (typeof isFeatured === 'boolean') where.isFeatured = isFeatured;

        if (lowStock === true) {
          where.trackStock = true;
          where.stock = { lte: this.prisma.product.fields.minStock };
        }

        const orderBy: Prisma.ProductOrderByWithRelationInput = {
          [sortBy]: sortOrder,
        };

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              category: true,
              sku: true,
              price: true,
              comparePrice: true,
              costPrice: true,
              stock: true,
              minStock: true,
              trackStock: true,
              unit: true,
              images: true,
              isActive: true,
              isFeatured: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          this.prisma.product.count({ where }),
        ]);

        return {
          data: products,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      CACHE_TTL.PRODUCT_LIST,
    );
  }

  async getCategories(tenantId: string) {
    const cacheKey = CACHE_KEYS.PRODUCT_CATEGORIES(tenantId);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const products = await this.prisma.product.findMany({
          where: {
            tenantId,
            category: { not: null },
          },
          select: { category: true },
          distinct: ['category'],
          orderBy: { category: 'asc' },
        });

        const categories = products
          .map((p) => p.category)
          .filter((c): c is string => c !== null);

        return { categories };
      },
      CACHE_TTL.CATEGORIES,
    );
  }

  async getLowStock(tenantId: string) {
    const cacheKey = CACHE_KEYS.PRODUCT_LOW_STOCK(tenantId);

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        const products = await this.prisma.product.findMany({
          where: {
            tenantId,
            trackStock: true,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            stock: true,
            minStock: true,
            unit: true,
          },
        });

        const lowStockProducts = products.filter(
          (p) => (p.stock ?? 0) <= (p.minStock ?? 0),
        );

        return {
          count: lowStockProducts.length,
          products: lowStockProducts,
        };
      },
      CACHE_TTL.LOW_STOCK,
    );
  }

  async findOne(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return product;
  }

  // ==========================================
  // 🚀 UPDATE - dengan SEO reindexing
  // ==========================================
  async update(tenantId: string, productId: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, slug: true, sku: true },
    });

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (dto.sku && dto.sku !== existing.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { tenantId, sku: dto.sku, id: { not: productId } },
      });

      if (existingSku) {
        throw new ConflictException(`SKU "${dto.sku}" sudah digunakan`);
      }
    }

    let slug = existing.slug;
    if (dto.name && dto.name !== existing.name) {
      const baseSlug = this.generateSlug(dto.name);
      slug = await this.ensureUniqueSlug(tenantId, baseSlug, productId);
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        slug: dto.name ? slug : undefined,
        description: dto.description,
        category: dto.category,
        sku: dto.sku,
        price: dto.price,
        comparePrice: dto.comparePrice,
        costPrice: dto.costPrice,
        stock: dto.stock,
        minStock: dto.minStock,
        trackStock: dto.trackStock,
        unit: dto.unit,
        images: dto.images,
        metadata: dto.metadata,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    await this.redis.invalidateAllProductCaches(tenantId, tenant?.slug);

    // 🚀 SEO: Reindex updated product
    if (tenant) {
      this.seoService
        .onProductUpdated(tenant.slug, product.id, product.slug ?? undefined)
        .catch((error) => {
          console.error('[SEO] Failed to reindex product:', error.message);
        });
    }
    return {
      message: 'Produk berhasil diupdate',
      product,
    };
  }

  async updateStock(tenantId: string, productId: string, dto: UpdateStockDto) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, stock: true, trackStock: true },
    });

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    if (!existing.trackStock) {
      throw new BadRequestException(
        'Produk ini tidak menggunakan tracking stok',
      );
    }

    const newStock = (existing.stock ?? 0) + dto.quantity;

    if (newStock < 0) {
      throw new BadRequestException(
        `Stok tidak mencukupi. Stok saat ini: ${existing.stock}`,
      );
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
      select: { id: true, name: true, stock: true, minStock: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    await this.redis.invalidateAllProductCaches(tenantId, tenant?.slug);

    return {
      message:
        dto.quantity > 0
          ? `Stok berhasil ditambah ${dto.quantity}`
          : `Stok berhasil dikurangi ${Math.abs(dto.quantity)}`,
      product,
      previousStock: existing.stock,
      adjustment: dto.quantity,
      reason: dto.reason,
    };
  }

  async toggleActive(tenantId: string, productId: string) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, isActive: true, slug: true },
    });

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { isActive: !existing.isActive },
      select: { id: true, name: true, isActive: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    await this.redis.invalidateAllProductCaches(tenantId, tenant?.slug);

    return {
      message: product.isActive
        ? 'Produk berhasil diaktifkan'
        : 'Produk berhasil dinonaktifkan',
      product,
    };
  }

  // ==========================================
  // 🚀 REMOVE - dengan SEO notification
  // ==========================================
  async remove(tenantId: string, productId: string) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, slug: true },
    });

    if (!existing) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    await this.prisma.product.delete({ where: { id: productId } });

    await this.redis.invalidateAllProductCaches(tenantId, tenant?.slug);

    // 🚀 SEO: Notify search engines about deleted product
    if (tenant) {
      this.seoService.onProductDeleted(tenant.slug).catch((error) => {
        console.error(
          '[SEO] Failed to notify product deletion:',
          error.message,
        );
      });
    }

    return {
      message: 'Produk berhasil dihapus',
    };
  }

  // ==========================================
  // 🚀 BULK DELETE - dengan SEO notification
  // ==========================================
  async bulkDelete(tenantId: string, ids: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    });

    if (products.length === 0) {
      throw new NotFoundException('Tidak ada produk yang ditemukan');
    }

    const validIds = products.map((p) => p.id);

    const result = await this.prisma.product.deleteMany({
      where: { id: { in: validIds }, tenantId },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });

    await this.redis.invalidateAllProductCaches(tenantId, tenant?.slug);

    // 🚀 SEO: Notify search engines about bulk deletion
    if (tenant) {
      this.seoService.onProductDeleted(tenant.slug).catch((error) => {
        console.error(
          '[SEO] Failed to notify bulk product deletion:',
          error.message,
        );
      });
    }

    return {
      message: `${result.count} produk berhasil dihapus`,
      count: result.count,
    };
  }
}
