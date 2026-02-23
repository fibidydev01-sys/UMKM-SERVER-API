import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * 🌐 DOMAIN CONTROLLER (CLEAN VERSION)
 *
 * Flow yang benar:
 * 1. POST /request  → Simpan domain ke DB + return DNS instruksi static
 *                     User bisa refresh, data tetap ada dari DB!
 * 2. User pasang DNS di Cloudflare/GoDaddy/Niagahoster
 * 3. Tunggu propagasi DNS (10 menit - 48 jam)
 * 4. GET  /status   → User klik "Cek Status"
 *                     → Add ke Vercel (idempotent)
 *                     → Vercel cek apakah DNS sudah propagate
 *                     → Kalau YES → verified + SSL diproses otomatis Vercel
 * 5. DELETE /remove → Hapus dari Vercel + reset DB
 */

@Controller('tenants/domain')
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. RESOLVE (Internal — dipanggil Next.js middleware)
  // ==========================================

  @Get('resolve')
  async resolveDomain(@Query('hostname') hostname: string) {
    if (!hostname) {
      throw new HttpException('hostname required', HttpStatus.BAD_REQUEST);
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        customDomain: hostname,
        customDomainVerified: true,
        status: 'ACTIVE',
      },
      select: { slug: true, id: true },
    });

    if (!tenant) {
      throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);
    }

    return { slug: tenant.slug, tenantId: tenant.id };
  }

  // ==========================================
  // 2. REQUEST DOMAIN
  // → Simpan domain ke DB
  // → Return DNS instruksi static
  // → BELUM add ke Vercel!
  // → User bisa refresh, data tetap ada!
  // ==========================================

  @Post('request')
  async requestDomain(
    @Body() body: { tenantId: string; customDomain: string },
  ) {
    const { tenantId, customDomain } = body;

    this.logger.log(`[Request] ${tenantId} → ${customDomain}`);

    // Validasi format domain
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(customDomain)) {
      throw new HttpException('Invalid domain format', HttpStatus.BAD_REQUEST);
    }

    // Cek domain sudah dipakai tenant lain yang sudah verified
    const existing = await this.prisma.tenant.findFirst({
      where: {
        customDomain,
        customDomainVerified: true,
        id: { not: tenantId },
      },
    });

    if (existing) {
      throw new HttpException('Domain already taken', HttpStatus.CONFLICT);
    }

    // DNS instruksi static — standard Vercel
    // Ini instruksi yang user pasang di registrar mereka
    const dnsRecords = [
      {
        type: 'CNAME',
        name: '@',
        value: 'cname.vercel-dns.com',
        ttl: 'Auto',
      },
      {
        type: 'CNAME',
        name: 'www',
        value: 'cname.vercel-dns.com',
        ttl: 'Auto',
      },
    ];

    // Simpan ke DB — dnsRecords disimpan agar tampil lagi saat user refresh!
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain,
        customDomainVerified: false,
        customDomainToken: null,
        customDomainAddedAt: new Date(),
        sslStatus: null,
        dnsRecords: dnsRecords as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.domainLog.create({
      data: {
        tenantId,
        action: 'requested',
        domain: customDomain,
        status: 'pending',
        message: 'Domain registered. Waiting for user to set DNS records.',
      },
    });

    this.logger.log(`[Request] Domain saved to DB: ${customDomain}`);

    return {
      success: true,
      tenant,
      dnsRecords, // ✅ Array — langsung render di frontend
      verified: false,
    };
  }

  // ==========================================
  // 3. CHECK STATUS (Manual — user klik "Cek Status")
  //
  // Flow:
  // 1. Add domain ke Vercel (idempotent)
  // 2. Vercel cek apakah DNS sudah propagate
  // 3. Kalau verified → update DB + SSL diproses Vercel otomatis
  // 4. Return status terkini
  // ==========================================

  @Get('status')
  async checkStatus(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new HttpException('tenantId required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`[Status] Manual check for tenant: ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.customDomain) {
      throw new HttpException(
        'No custom domain configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const domain = tenant.customDomain;

    // Add ke Vercel + cek status (idempotent)
    let vercelVerified = false;
    let sslStatus = 'pending';

    try {
      const result = await this.addAndCheckVercel(domain);
      vercelVerified = result.verified;
      sslStatus = result.sslStatus;
      this.logger.log(
        `[Status] Vercel: verified=${vercelVerified}, ssl=${sslStatus}`,
      );
    } catch (error) {
      this.logger.error(`[Status] Vercel error: ${error.message}`);
      // Jangan throw — tetap return status dari DB
    }

    // Update DB kalau ada perubahan
    const updates: Prisma.TenantUpdateInput = {};

    if (vercelVerified && !tenant.customDomainVerified) {
      updates.customDomainVerified = true;
      updates.customDomainVerifiedAt = new Date();
      updates.sslStatus = sslStatus;

      await this.prisma.domainLog.create({
        data: {
          tenantId,
          action: 'verified',
          domain,
          status: 'success',
          message: 'Domain verified by Vercel',
        },
      });

      this.logger.log(`[Status] ✅ Domain verified: ${domain}`);
    }

    if (sslStatus === 'active' && tenant.sslStatus !== 'active') {
      updates.sslStatus = 'active';
      updates.sslIssuedAt = new Date();
      this.logger.log(`[Status] ✅ SSL active: ${domain}`);
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: updates,
      });
    }

    // Return status terkini
    return {
      domain,
      verified: vercelVerified || tenant.customDomainVerified,
      configured: vercelVerified,
      sslStatus:
        sslStatus !== 'pending' ? sslStatus : tenant.sslStatus || 'pending',
      // DNS records dari DB — tetap ada meski user refresh!
      dnsRecords: Array.isArray(tenant.dnsRecords)
        ? tenant.dnsRecords
        : [
            {
              type: 'CNAME',
              name: '@',
              value: 'cname.vercel-dns.com',
              ttl: 'Auto',
            },
            {
              type: 'CNAME',
              name: 'www',
              value: 'cname.vercel-dns.com',
              ttl: 'Auto',
            },
          ],
    };
  }

  // ==========================================
  // 4. REMOVE DOMAIN
  // ==========================================

  @Delete('remove')
  async removeDomain(@Body() body: { tenantId: string }) {
    const { tenantId } = body;

    this.logger.log(`[Remove] Removing domain for tenant: ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.customDomain) {
      throw new HttpException(
        'No custom domain to remove',
        HttpStatus.BAD_REQUEST,
      );
    }

    const domain = tenant.customDomain;

    // Hapus dari Vercel
    try {
      await this.removeDomainFromVercel(domain);
    } catch (error) {
      this.logger.warn(`[Remove] Vercel removal failed: ${error.message}`);
      // Tetap lanjut reset DB
    }

    // Reset semua domain fields
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainToken: null,
        sslStatus: null,
        sslIssuedAt: null,
        dnsRecords: Prisma.DbNull,
        customDomainAddedAt: null,
        customDomainVerifiedAt: null,
        customDomainRemovedAt: new Date(),
      },
    });

    await this.prisma.domainLog.create({
      data: {
        tenantId,
        action: 'removed',
        domain,
        status: 'success',
        message: 'Custom domain removed',
      },
    });

    return { success: true, message: 'Custom domain removed successfully' };
  }

  // ==========================================
  // VERCEL HELPERS
  // ==========================================

  /**
   * Add domain ke Vercel + cek status
   * Idempotent — aman dipanggil berkali-kali
   */
  private async addAndCheckVercel(domain: string): Promise<{
    verified: boolean;
    sslStatus: string;
  }> {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) {
      throw new Error('Vercel credentials not configured');
    }

    // Add domain ke Vercel (idempotent)
    const addRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      },
    );

    const addData = await addRes.json();
    this.logger.log(`[Vercel] Add: ${JSON.stringify(addData)}`);

    // Cek status domain dari Vercel
    const statusRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
      {
        headers: { Authorization: `Bearer ${vercelToken}` },
      },
    );

    if (!statusRes.ok) {
      return { verified: false, sslStatus: 'pending' };
    }

    const statusData = await statusRes.json();
    this.logger.log(`[Vercel] Status: ${JSON.stringify(statusData)}`);

    const verified = statusData.verified === true;
    const sslStatus = verified ? 'active' : 'pending';

    return { verified, sslStatus };
  }

  /**
   * Hapus domain dari Vercel project
   */
  private async removeDomainFromVercel(domain: string): Promise<void> {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) return;

    await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${vercelToken}` },
      },
    );
  }
}
