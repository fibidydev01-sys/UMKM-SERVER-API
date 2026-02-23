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
import { RedisService } from '../redis/redis.service';
import { Prisma } from '@prisma/client';
import { parse } from 'tldts'; // ✅ Detect apex vs subdomain (support .co.id, .ac.id, dll)

/**
 * 🌐 DOMAIN CONTROLLER (FINAL VERSION)
 *
 * Flow:
 * 1. POST /request
 *    → Validasi + simpan domain ke DB
 *    → Call Vercel GET /v6/domains/{domain}/config
 *    → Dapat recommendedCNAME + recommendedIPv4 (dinamis, akurat!)
 *    → Detect apex vs subdomain pakai tldts
 *    → Simpan dnsRecords ke DB sebagai array
 *    → Return DNS instruksi ke user
 *    → User pasang di Cloudflare/GoDaddy/Niagahoster
 *    → User bisa refresh kapan saja — data tetap ada dari DB!
 *
 * 2. GET /status (user klik "Cek Status" — MANUAL)
 *    → Add domain ke Vercel project (idempotent)
 *    → Vercel cek apakah DNS sudah propagate
 *    → Update DB kalau verified/SSL active
 *    → Return status terkini
 *
 * 3. DELETE /remove
 *    → Hapus dari Vercel project
 *    → Reset semua domain fields di DB
 *
 * 4. GET /resolve (internal — dipanggil Next.js middleware)
 *    → Lookup custom domain → return tenant slug
 *
 * DNS Records Logic:
 *   Apex domain (tokoku.com, brand.co.id)  → A record @ + CNAME www
 *   Subdomain   (shop.tokoku.com)           → CNAME shop saja
 */

@Controller('tenants/domain')
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService, // ✅ FIX: Inject RedisService untuk cache invalidation
  ) {}

  // ==========================================
  // 1. RESOLVE (Internal — Next.js middleware)
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
  //
  // → Simpan domain ke DB
  // → Ambil DNS records DINAMIS dari Vercel API
  //   (bukan hardcode! Vercel punya records baru yg dinamis)
  // → Detect apex vs subdomain → DNS records beda!
  // → Return dnsRecords[] ke frontend
  // → User pasang di registrar, bisa refresh kapan saja
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

    // ==========================================
    // AMBIL DNS RECORDS DINAMIS DARI VERCEL
    // GET /v6/domains/{domain}/config
    // + detect apex vs subdomain pakai tldts
    // ==========================================
    const dnsRecords = await this.getRecommendedDnsRecords(customDomain);

    this.logger.log(
      `[Request] DNS records untuk ${customDomain}: ${JSON.stringify(dnsRecords)}`,
    );

    // Simpan ke DB — dnsRecords sebagai array
    // Disimpan agar tampil lagi saat user refresh!
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

    // ✅ FIX: Invalidate Redis cache setelah update domain
    await this.redis.invalidateTenant(tenantId, tenant.slug);

    await this.prisma.domainLog.create({
      data: {
        tenantId,
        action: 'requested',
        domain: customDomain,
        status: 'pending',
        message: 'Domain registered. Waiting for user to configure DNS.',
        metadata: { dnsRecords } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`[Request] Domain saved: ${customDomain}`);

    return {
      success: true,
      tenant,
      dnsRecords, // ✅ Array dengan records dinamis dari Vercel (apex / subdomain aware)
      verified: false,
    };
  }

  // ==========================================
  // 3. CHECK STATUS (Manual — user klik "Cek Status")
  //
  // Flow:
  // 1. Add domain ke Vercel project (idempotent)
  // 2. Vercel cek apakah DNS sudah propagate
  // 3. Kalau verified → update DB
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

    // Add ke Vercel project + cek status (idempotent)
    let vercelVerified = false;
    let sslStatus = 'pending';

    try {
      const result = await this.addAndCheckVercel(domain);
      vercelVerified = result.verified;
      sslStatus = result.sslStatus;
      this.logger.log(
        `[Status] Vercel result: verified=${vercelVerified}, ssl=${sslStatus}`,
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

      // ✅ FIX: Invalidate Redis cache setelah update status domain
      await this.redis.invalidateTenant(tenantId, tenant.slug);
    }

    // DNS records dari DB (sudah disimpan saat request)
    // Fallback ke records default kalau somehow kosong
    const dnsRecords = Array.isArray(tenant.dnsRecords)
      ? tenant.dnsRecords
      : await this.getRecommendedDnsRecords(domain);

    return {
      domain,
      verified: vercelVerified || tenant.customDomainVerified,
      configured: vercelVerified,
      sslStatus:
        sslStatus !== 'pending' ? sslStatus : tenant.sslStatus || 'pending',
      dnsRecords,
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
    const tenantSlug = tenant.slug;

    // Hapus dari Vercel project
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

    // ✅ FIX: Invalidate Redis cache setelah remove domain
    await this.redis.invalidateTenant(tenantId, tenantSlug);

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
   * Ambil recommended DNS records dari Vercel
   * GET /v6/domains/{domain}/config
   *
   * ✅ Pakai tldts untuk detect apex vs subdomain
   *    Support semua TLD: .com .co.id .ac.id .net .ai dll
   *
   * Apex domain  (tokoku.com, brand.co.id)
   *   → A record @ + CNAME www
   *
   * Subdomain    (shop.tokoku.com, toko.brand.co.id)
   *   → CNAME <label> saja (misal: CNAME shop → cname.vercel-dns.com)
   *
   * Fallback ke nilai default kalau Vercel API gagal
   */
  private async getRecommendedDnsRecords(
    domain: string,
  ): Promise<
    Array<{ type: string; name: string; value: string; ttl: string }>
  > {
    const vercelToken = process.env.VERCEL_API_TOKEN;

    // ✅ Detect apex vs subdomain pakai tldts
    // Support semua TLD: .co.id, .ac.id, .com.au, .net.id, dll
    const parsed = parse(domain);
    const isSubdomain = !!parsed.subdomain;
    const subdomainLabel = parsed.subdomain ?? null; // "shop" dari "shop.tokoku.com"

    this.logger.log(
      `[DNS] ${domain} → isSubdomain=${isSubdomain}, label="${subdomainLabel}"`,
    );

    // ==========================================
    // SUBDOMAIN → cukup 1 CNAME record saja
    // shop.tokoku.com   → CNAME shop → cname.vercel-dns.com
    // toko.brand.co.id  → CNAME toko → cname.vercel-dns.com
    // ==========================================
    if (isSubdomain && subdomainLabel) {
      const fallbackSubdomain = [
        {
          type: 'CNAME',
          name: subdomainLabel,
          value: 'cname.vercel-dns.com',
          ttl: 'Auto',
        },
      ];

      if (!vercelToken) {
        this.logger.warn(
          '[DNS] No VERCEL_API_TOKEN, using fallback subdomain records',
        );
        return fallbackSubdomain;
      }

      try {
        const res = await fetch(
          `https://api.vercel.com/v6/domains/${domain}/config`,
          {
            headers: { Authorization: `Bearer ${vercelToken}` },
          },
        );

        if (!res.ok) {
          this.logger.warn(
            `[DNS] Config API returned ${res.status}, using fallback subdomain`,
          );
          return fallbackSubdomain;
        }

        const config = await res.json();

        this.logger.log(
          `[DNS] Vercel config for ${domain}: ${JSON.stringify(config)}`,
        );

        const bestCNAME =
          config.recommendedCNAME?.find(
            (r: { rank: number }) => r.rank === 1,
          ) ?? config.recommendedCNAME?.[0];

        return [
          {
            type: 'CNAME',
            name: subdomainLabel,
            value: bestCNAME?.value ?? 'cname.vercel-dns.com',
            ttl: 'Auto',
          },
        ];
      } catch (error) {
        this.logger.error(
          `[DNS] Failed to get config: ${error.message}, using fallback subdomain`,
        );
        return fallbackSubdomain;
      }
    }

    // ==========================================
    // APEX DOMAIN → A record @ + CNAME www
    // tokoku.com   → A @ + CNAME www
    // brand.co.id  → A @ + CNAME www  (tldts tahu ini apex, bukan subdomain!)
    // ==========================================
    const fallbackApex = [
      { type: 'A', name: '@', value: '76.76.21.21', ttl: 'Auto' },
      {
        type: 'CNAME',
        name: 'www',
        value: 'cname.vercel-dns.com',
        ttl: 'Auto',
      },
    ];

    if (!vercelToken) {
      this.logger.warn(
        '[DNS] No VERCEL_API_TOKEN, using fallback apex records',
      );
      return fallbackApex;
    }

    try {
      const res = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config`,
        {
          headers: { Authorization: `Bearer ${vercelToken}` },
        },
      );

      if (!res.ok) {
        this.logger.warn(
          `[DNS] Config API returned ${res.status}, using fallback apex`,
        );
        return fallbackApex;
      }

      const config = await res.json();

      this.logger.log(
        `[DNS] Vercel config for ${domain}: ${JSON.stringify(config)}`,
      );

      // Apex domain (@ / root) → pakai A record (rank=1 = preferred)
      const bestIPv4 =
        config.recommendedIPv4?.find((r: { rank: number }) => r.rank === 1) ??
        config.recommendedIPv4?.[0];

      // www subdomain → pakai CNAME (rank=1 = preferred)
      const bestCNAME =
        config.recommendedCNAME?.find((r: { rank: number }) => r.rank === 1) ??
        config.recommendedCNAME?.[0];

      return [
        {
          type: 'A',
          name: '@',
          value: bestIPv4?.value?.[0] ?? '76.76.21.21',
          ttl: 'Auto',
        },
        {
          type: 'CNAME',
          name: 'www',
          value: bestCNAME?.value ?? 'cname.vercel-dns.com',
          ttl: 'Auto',
        },
      ];
    } catch (error) {
      this.logger.error(
        `[DNS] Failed to get config: ${error.message}, using fallback apex`,
      );
      return fallbackApex;
    }
  }

  /**
   * Add domain ke Vercel project + cek verified status
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

    // Add domain ke project (idempotent)
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
    this.logger.log(`[Vercel] Add domain response: ${JSON.stringify(addData)}`);

    // Cek status domain dari Vercel project
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
    this.logger.log(`[Vercel] Domain status: ${JSON.stringify(statusData)}`);

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
