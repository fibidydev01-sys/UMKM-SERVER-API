import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREATE CUSTOMER
  // ==========================================
  async create(tenantId: string, dto: CreateCustomerDto) {
    // Normalize phone number
    const phone = this.normalizePhone(dto.phone);

    // Check phone uniqueness within tenant
    const existing = await this.prisma.customer.findUnique({
      where: {
        tenantId_phone: { tenantId, phone },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Pelanggan dengan nomor ${phone} sudah terdaftar`,
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        phone,
        email: dto.email,
        address: dto.address,
        metadata: dto.metadata ?? {},
      },
    });

    return {
      message: 'Pelanggan berhasil ditambahkan',
      customer,
    };
  }

  // ==========================================
  // FIND ALL CUSTOMERS
  // ==========================================
  async findAll(tenantId: string, query: QueryCustomerDto) {
    const {
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.CustomerWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          metadata: true,
          totalOrders: true,
          totalSpent: true,
          createdAt: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // FIND ONE CUSTOMER
  // ==========================================
  async findOne(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    return customer;
  }

  // ==========================================
  // UPDATE CUSTOMER
  // ==========================================
  async update(tenantId: string, customerId: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    // Check phone uniqueness if updating phone
    if (dto.phone) {
      const phone = this.normalizePhone(dto.phone);
      const phoneExists = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          phone,
          id: { not: customerId },
        },
      });

      if (phoneExists) {
        throw new ConflictException(
          `Nomor ${phone} sudah digunakan pelanggan lain`,
        );
      }
      dto.phone = phone;
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        metadata: dto.metadata,
      },
    });

    return {
      message: 'Pelanggan berhasil diupdate',
      customer,
    };
  }

  // ==========================================
  // DELETE CUSTOMER
  // ==========================================
  async remove(tenantId: string, customerId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { _count: { select: { orders: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    if (existing._count.orders > 0) {
      throw new ConflictException(
        `Tidak dapat menghapus pelanggan yang memiliki ${existing._count.orders} order`,
      );
    }

    await this.prisma.customer.delete({
      where: { id: customerId },
    });

    return { message: 'Pelanggan berhasil dihapus' };
  }

  // ==========================================
  // GET CUSTOMER ORDERS
  // ==========================================
  async findCustomerOrders(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    return { customer: { id: customer.id, name: customer.name }, orders };
  }

  // ==========================================
  // HELPER: Normalize phone number
  // ==========================================
  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }
    return normalized;
  }
}
