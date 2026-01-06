import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantsService } from '../tenants/tenants.service';

// ==========================================
// COOKIE CONFIGURATION
// ==========================================

const COOKIE_NAME = 'fibidy_auth';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private tenantsService: TenantsService,
  ) {}

  // ==========================================
  // REGISTER
  // ==========================================
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    res.cookie(COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    return {
      message: 'Pendaftaran berhasil',
      tenant: result.tenant,
    };
  }

  // ==========================================
  // LOGIN
  // ==========================================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    return {
      message: 'Login berhasil',
      tenant: result.tenant,
    };
  }

  // ==========================================
  // LOGOUT
  // ==========================================
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    });

    return { message: 'Logout berhasil' };
  }

  // ==========================================
  // GET ME
  // ==========================================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentTenant() tenant: { id: string }) {
    return this.authService.me(tenant.id);
  }

  // ==========================================
  // REFRESH TOKEN
  // ==========================================
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentTenant() tenant: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(tenant.id);
    res.cookie(COOKIE_NAME, result.access_token, COOKIE_OPTIONS);

    return {
      message: 'Token refreshed',
      tenant: result.tenant,
    };
  }

  // ==========================================
  // CHECK AUTH STATUS
  // ==========================================
  @Get('status')
  async checkStatus(@Req() req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.[COOKIE_NAME];

    if (!token) {
      return { authenticated: false, tenant: null };
    }

    try {
      const tenant = await this.authService.verifyToken(token);
      return { authenticated: true, tenant };
    } catch {
      return { authenticated: false, tenant: null };
    }
  }

  // ==========================================
  // CHECK SLUG
  // ==========================================
  @Get('check-slug/:slug')
  async checkSlug(@Param('slug') slug: string) {
    return this.tenantsService.checkSlugAvailability(slug);
  }
}
