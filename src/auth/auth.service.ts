import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SeoService } from '../seo/seo.service';
import { RegisterDto, LoginDto } from './dto';
import { getDefaultLandingConfig } from '../validators/landing-config.validator';
import type { Tenant, Prisma } from '@prisma/client'; // ✅ FIX: Import Prisma

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 900;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private seoService: SeoService,
  ) {}

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

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        slug: dto.slug.toLowerCase(),
        name: dto.name,
        category: dto.category,
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        whatsapp: dto.whatsapp,
        description: dto.description,
        phone: dto.phone,
        address: dto.address,
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
        // ✅ FIX: Cast to Prisma.InputJsonValue
        landingConfig:
          getDefaultLandingConfig() as unknown as Prisma.InputJsonValue,
      },
    });

    this.seoService.onTenantCreated(tenant.slug).catch((error) => {
      console.error('[SEO] Failed to index new tenant:', error.message);
    });

    const token = this.generateToken(tenant);

    return {
      access_token: token,
      tenant: this.sanitizeTenant(tenant),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const lockKey = `login:lockout:${email}`;
    const failKey = `login:fails:${email}`;

    const isLocked = await this.redis.get<string>(lockKey);
    if (isLocked) {
      throw new UnauthorizedException(
        'Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
    });

    if (!tenant) {
      await this.trackFailedLogin(email, failKey, lockKey);
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, tenant.password);

    if (!isPasswordValid) {
      await this.trackFailedLogin(email, failKey, lockKey);
      throw new UnauthorizedException('Email atau password salah');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Akun tidak aktif');
    }

    await this.redis.del(failKey);

    const token = this.generateToken(tenant);

    return {
      access_token: token,
      tenant: this.sanitizeTenant(tenant),
    };
  }

  private async trackFailedLogin(
    email: string,
    failKey: string,
    lockKey: string,
  ): Promise<void> {
    const currentFails = await this.redis.get<number>(failKey);
    const failCount = (currentFails || 0) + 1;

    await this.redis.set(failKey, failCount, LOCKOUT_DURATION_SECONDS);

    if (failCount >= MAX_LOGIN_ATTEMPTS) {
      await this.redis.set(lockKey, 'locked', LOCKOUT_DURATION_SECONDS);
      console.warn(`[Security] Account locked due to failed logins: ${email}`);
    }
  }

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
