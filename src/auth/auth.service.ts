import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import type { Tenant } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ==========================================
  // REGISTER
  // ==========================================
  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });

    if (existingSlug) {
      throw new ConflictException('Slug sudah digunakan');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // In register method, update the create data:
    const tenant = await this.prisma.tenant.create({
      data: {
        slug: dto.slug.toLowerCase(),
        name: dto.name,
        category: dto.category,
        email: dto.email,
        password: hashedPassword,
        whatsapp: dto.whatsapp,
        description: dto.description,
        phone: dto.phone,
        address: dto.address,
        // ==========================================
        // DEFAULT PAYMENT & SHIPPING (NEW)
        // ==========================================
        currency: 'IDR',
        taxRate: 0,
        paymentMethods: {
          bankAccounts: [],
          eWallets: [],
          cod: { enabled: false, note: '' },
        },
        freeShippingThreshold: null,
        defaultShippingCost: 0,
        shippingMethods: {
          couriers: [
            { id: 'jne', name: 'JNE', enabled: true, note: '' },
            { id: 'jt', name: 'J&T Express', enabled: true, note: '' },
            { id: 'sicepat', name: 'SiCepat', enabled: false, note: '' },
            { id: 'anteraja', name: 'AnterAja', enabled: false, note: '' },
            { id: 'ninja', name: 'Ninja Express', enabled: false, note: '' },
          ],
        },
        // ==========================================
        // DEFAULT LANDING CONFIG (AUTO-ENABLED)
        // ==========================================
        landingConfig: {
          enabled: true,
          hero: {
            enabled: true,
            title: '',
            subtitle: '',
            config: {
              layout: 'centered',
              showCta: true,
              ctaText: 'Lihat Produk',
              overlayOpacity: 0.5,
            },
          },
          about: {
            enabled: false,
            title: 'Tentang Kami',
            subtitle: '',
            config: { showImage: true, features: [] },
          },
          products: {
            enabled: true,
            title: 'Produk Kami',
            subtitle: 'Pilihan produk terbaik untuk Anda',
            config: { displayMode: 'featured', limit: 8, showViewAll: true },
          },
          testimonials: {
            enabled: false,
            title: 'Testimoni',
            subtitle: 'Apa kata pelanggan kami',
            config: { items: [] },
          },
          contact: {
            enabled: true,
            title: 'Hubungi Kami',
            subtitle: '',
            config: { showMap: false, showForm: false, showSocialMedia: true },
          },
          cta: {
            enabled: false,
            title: 'Siap Berbelanja?',
            subtitle: '',
            config: { buttonText: 'Mulai Belanja', style: 'primary' },
          },
        },
      },
    });

    const token = this.generateToken(tenant);

    return {
      access_token: token,
      tenant: this.sanitizeTenant(tenant),
    };
  }

  // ==========================================
  // LOGIN
  // ==========================================
  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });

    if (!tenant) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, tenant.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    const token = this.generateToken(tenant);

    return {
      access_token: token,
      tenant: this.sanitizeTenant(tenant),
    };
  }

  // ==========================================
  // GET ME
  // ==========================================
  async me(tenantId: string) {
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
  }

  // ==========================================
  // REFRESH TOKEN
  // ==========================================
  async refresh(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    const token = this.generateToken(tenant);

    return {
      access_token: token,
      tenant: this.sanitizeTenant(tenant),
    };
  }

  // ==========================================
  // VERIFY TOKEN
  // ==========================================
  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.sub },
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
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!tenant) {
        throw new UnauthorizedException('Invalid token');
      }

      return tenant;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  private generateToken(tenant: Tenant): string {
    const payload = {
      sub: tenant.id,
      email: tenant.email,
      slug: tenant.slug,
    };

    return this.jwtService.sign(payload);
  }

  private sanitizeTenant(tenant: Tenant) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = tenant;
    return result;
  }
}
