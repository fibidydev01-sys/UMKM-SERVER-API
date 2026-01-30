import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, CACHE_KEYS } from '../redis/redis.service';
import { CustomersService } from '../customers/customers.service';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  QueryOrderDto,
  CheckoutDto,
} from './dto';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private customersService: CustomersService,
    private autoReply: AutoReplyService,
    private config: ConfigService,
  ) {}

  // ==========================================
  // CREATE ORDER
  // ==========================================
  async create(tenantId: string, dto: CreateOrderDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) {
        throw new BadRequestException('Pelanggan tidak ditemukan');
      }
    }

    const itemsWithSubtotal = dto.items.map((item) => ({
      ...item,
      subtotal: item.price * item.qty,
    }));

    const subtotal = itemsWithSubtotal.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = subtotal - discount + tax;

    const orderNumber = await this.generateOrderNumber(tenantId);

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        orderNumber,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        notes: dto.notes,
        metadata: dto.metadata ?? {},
        items: {
          create: itemsWithSubtotal.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            qty: item.qty,
            subtotal: item.subtotal,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (dto.customerId) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { totalOrders: { increment: 1 } },
      });
    }

    // 🔥 Invalidate dashboard stats
    await this.redis.invalidateStats(tenantId);

    return {
      message: 'Order berhasil dibuat',
      order,
    };
  }

  // ==========================================
  // FIND ALL ORDERS
  // ==========================================
  async findAll(tenantId: string, query: QueryOrderDto) {
    const {
      search,
      status,
      paymentStatus,
      customerId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.OrderWhereInput = { tenantId };

    if (search) {
      where.orderNumber = { contains: search, mode: 'insensitive' };
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (customerId) where.customerId = customerId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          subtotal: true,
          discount: true,
          total: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          customerName: true,
          customerPhone: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // FIND ONE ORDER
  // ==========================================
  async findOne(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, images: true },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return order;
  }

  // ==========================================
  // UPDATE ORDER
  // ==========================================
  async update(tenantId: string, orderId: string, dto: UpdateOrderDto) {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new BadRequestException(
        'Tidak dapat mengubah order yang sudah selesai atau dibatalkan',
      );
    }

    let total = existing.total;
    if (dto.discount !== undefined) {
      total = existing.subtotal - dto.discount + existing.tax;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        discount: dto.discount,
        total: dto.discount !== undefined ? total : undefined,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: { items: true },
    });

    // 🔥 Invalidate stats
    await this.redis.invalidateStats(tenantId);

    return { message: 'Order berhasil diupdate', order };
  }

  // ==========================================
  // 🚀 OPTIMIZED: UPDATE ORDER STATUS
  // Fixed N+1 Query Problem!
  // ==========================================
  async updateStatus(
    tenantId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: dto.status,
    };

    if (dto.status === 'COMPLETED') {
      updateData.completedAt = new Date();

      // Update customer totalSpent
      if (existing.customerId && existing.paymentStatus === 'PAID') {
        await this.prisma.customer.update({
          where: { id: existing.customerId },
          data: { totalSpent: { increment: existing.total } },
        });
      }

      // ==========================================
      // 🚀 OPTIMIZATION: Batch stock update
      // Instead of N queries, we do 1 query to get all products
      // Then 1 updateMany per product (but batched)
      // ==========================================
      const productIds = existing.items
        .map((item) => item.productId)
        .filter((id): id is string => id !== null);

      if (productIds.length > 0) {
        // Get all products at once (1 query instead of N)
        const products = await this.prisma.product.findMany({
          where: {
            id: { in: productIds },
            trackStock: true,
          },
          select: { id: true, stock: true },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Prepare batch updates
        const stockUpdates: Promise<any>[] = [];

        for (const item of existing.items) {
          if (item.productId && productMap.has(item.productId)) {
            stockUpdates.push(
              this.prisma.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.qty } },
              }),
            );
          }
        }

        // Execute all updates in parallel
        if (stockUpdates.length > 0) {
          await Promise.all(stockUpdates);
        }
      }
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    // 🔥 Invalidate stats and low stock cache
    await this.redis.invalidateStats(tenantId);
    await this.redis.del(CACHE_KEYS.PRODUCT_LOW_STOCK(tenantId));

    // ✅ Trigger auto-reply notification for order status change
    const phone = order.customer?.phone || order.customerPhone;

    if (phone) {
      // Get tenant slug for tracking link
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      });

      if (tenant) {
        const trackingLink = `${this.config.get('FRONTEND_URL')}/store/${tenant.slug}/track/${order.id}`;

        // Skip PENDING (will be handled by WELCOME auto-reply when integrated)
        if (dto.status !== 'PENDING') {
          await this.autoReply
            .triggerOrderStatusNotification(
              tenantId,
              phone,
              'ORDER_STATUS',
              dto.status,
              {
                name: order.customer?.name || order.customerName || 'Customer',
                orderNumber: order.orderNumber,
                total: order.total,
                trackingLink,
              },
            )
            .catch((error) => {
              // Don't block order update if notification fails
              console.error('Failed to send order status notification:', error);
            });
        }
      }
    }

    return { message: `Status order diubah ke ${dto.status}`, order };
  }

  // ==========================================
  // UPDATE PAYMENT STATUS
  // ==========================================
  async updatePaymentStatus(
    tenantId: string,
    orderId: string,
    dto: UpdatePaymentStatusDto,
  ) {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: dto.paymentStatus,
        paidAmount: dto.paidAmount ?? existing.paidAmount,
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    // 🔥 Invalidate stats
    await this.redis.invalidateStats(tenantId);

    // ✅ Trigger auto-reply notification for payment status change
    const phone = order.customer?.phone || order.customerPhone;

    if (phone) {
      // Get tenant slug for tracking link
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      });

      if (tenant) {
        const trackingLink = `${this.config.get('FRONTEND_URL')}/store/${tenant.slug}/track/${order.id}`;

        await this.autoReply
          .triggerOrderStatusNotification(
            tenantId,
            phone,
            'PAYMENT_STATUS',
            dto.paymentStatus,
            {
              name: order.customer?.name || order.customerName || 'Customer',
              orderNumber: order.orderNumber,
              total: order.total,
              trackingLink,
            },
          )
          .catch((error) => {
            // Don't block order update if notification fails
            console.error('Failed to send payment status notification:', error);
          });
      }
    }

    return {
      message: `Status pembayaran diubah ke ${dto.paymentStatus}`,
      order,
    };
  }

  // ==========================================
  // DELETE ORDER
  // ==========================================
  async remove(tenantId: string, orderId: string) {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(
        'Tidak dapat menghapus order yang sudah selesai',
      );
    }

    if (existing.customerId) {
      await this.prisma.customer.update({
        where: { id: existing.customerId },
        data: { totalOrders: { decrement: 1 } },
      });
    }

    await this.prisma.order.delete({ where: { id: orderId } });

    // 🔥 Invalidate stats
    await this.redis.invalidateStats(tenantId);

    return { message: 'Order berhasil dihapus' };
  }

  // ==========================================
  // CANCEL ORDER
  // ==========================================
  async cancelOrder(tenantId: string, orderId: string) {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(
        'Tidak dapat membatalkan order yang sudah selesai',
      );
    }

    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Order sudah dibatalkan');
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (existing.customerId) {
      await this.prisma.customer.update({
        where: { id: existing.customerId },
        data: { totalOrders: { decrement: 1 } },
      });
    }

    // 🔥 Invalidate stats
    await this.redis.invalidateStats(tenantId);

    return {
      message: 'Order berhasil dibatalkan',
      order,
    };
  }

  // ==========================================
  // HELPER: Generate Order Number
  // ==========================================
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await this.prisma.order.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `ORD-${dateStr}-${sequence}`;
  }

  // ==========================================
  // CREATE ORDER FROM CHECKOUT (PUBLIC)
  // ==========================================
  async createFromCheckout(tenantId: string, tenantSlug: string, dto: CheckoutDto) {
    // 1. Find or create customer by phone
    const customer = await this.customersService.findOrCreateCustomer(
      tenantId,
      {
        phone: dto.phone,
        name: dto.name,
        email: dto.email,
        address: dto.address,
      },
    );

    // 2. Prepare metadata for order
    const metadata = {
      courier: dto.courier,
      shippingAddress: dto.address,
    };

    // 3. Create order using existing create() method
    const result = await this.create(tenantId, {
      customerId: customer.id,
      items: dto.items,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      metadata,
    });

    // 4. Generate tracking URL with tenant slug
    const trackingUrl = `/store/${tenantSlug}/track/${result.order.id}`;

    return {
      message: 'Pesanan berhasil dibuat',
      order: result.order,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
      trackingUrl,
    };
  }

  // ==========================================
  // FIND ONE ORDER (PUBLIC - for tracking)
  // ==========================================
  async findOnePublic(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            whatsapp: true,
            logo: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    return order;
  }

  // ==========================================
  // GET SAMPLE ORDER FOR PREVIEW
  // ==========================================
  async getSampleOrderForPreview(tenantId: string) {
    // Get most recent order for this tenant
    const order = await this.prisma.order.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        tenant: {
          select: {
            slug: true,
          },
        },
      },
    });

    // If no orders exist, return dummy data as fallback
    if (!order) {
      return {
        name: 'Budi Santoso',
        phone: '+628123456789',
        orderNumber: 'ORD-20260130-001',
        total: 'Rp 150.000',
        trackingLink: 'https://tokosaya.com/store/toko-saya/track/550e8400-e29b-41d4-a716-446655440000',
      };
    }

    // Format tracking link with tenant slug and order UUID
    const FRONTEND_URL = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const trackingLink = `${FRONTEND_URL}/store/${order.tenant.slug}/track/${order.id}`;

    // Format price
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(order.total);

    return {
      name: order.customer?.name || order.customerName || 'Customer',
      phone: order.customer?.phone || order.customerPhone || '+62',
      orderNumber: order.orderNumber,
      total: formattedTotal,
      trackingLink,
    };
  }
}
