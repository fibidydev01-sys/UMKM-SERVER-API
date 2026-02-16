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
import * as dns from 'dns/promises';
import * as crypto from 'crypto';

/**
 * 🌐 DOMAIN CONTROLLER (AUTO-POLLING VERSION)
 * Handles custom domain management for multi-tenant platform
 *
 * Endpoints:
 * - GET  /api/tenants/domain/resolve       → Resolve custom domain to slug (internal)
 * - GET  /api/tenants/domain/check-status  → Check individual DNS record status (NEW!)
 * - POST /api/tenants/domain/request       → Request custom domain
 * - POST /api/tenants/domain/verify        → Verify DNS records (now just adds to Vercel)
 * - GET  /api/tenants/domain/ssl-status    → Check SSL certificate status
 * - DELETE /api/tenants/domain/remove      → Remove custom domain
 */

@Controller('tenants/domain')
export class DomainController {
  private readonly logger = new Logger(DomainController.name);

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 🆕 NEW: CHECK DNS STATUS (Auto-Polling Endpoint)
  // Called by frontend every 10 seconds
  // ==========================================

  @Get('check-status')
  async checkDnsStatus(@Query('domain') domain: string) {
    if (!domain) {
      throw new HttpException('domain required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`[Check Status] Checking DNS for: ${domain}`);

    try {
      // Get tenant to retrieve verification token
      const tenant = await this.prisma.tenant.findFirst({
        where: { customDomain: domain },
        select: { customDomainToken: true, id: true },
      });

      if (!tenant?.customDomainToken) {
        throw new HttpException('Domain not configured', HttpStatus.NOT_FOUND);
      }

      // Check all 3 records in parallel
      const [cnameOk, cnameWwwOk, txtOk] = await Promise.all([
        this.checkCNAME(domain),
        this.checkCNAME(`www.${domain}`),
        this.checkTXT(domain, tenant.customDomainToken),
      ]);

      const allVerified = cnameOk && cnameWwwOk && txtOk;

      this.logger.log(
        `[Check Status] ${domain} - CNAME: ${cnameOk}, WWW: ${cnameWwwOk}, TXT: ${txtOk}`,
      );

      // If all verified but tenant not marked as verified yet, update it
      if (allVerified && tenant) {
        const existingTenant = await this.prisma.tenant.findUnique({
          where: { id: tenant.id },
          select: { customDomainVerified: true },
        });

        if (!existingTenant?.customDomainVerified) {
          this.logger.log(`[Check Status] Auto-verifying domain: ${domain}`);

          // Add to Vercel
          try {
            await this.addDomainToVercel(domain);
          } catch (error) {
            this.logger.error(`[Check Status] Vercel error: ${error.message}`);
          }

          // Update tenant
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              customDomainVerified: true,
              customDomainVerifiedAt: new Date(),
              sslStatus: 'pending',
            },
          });

          // Create log
          await this.prisma.domainLog.create({
            data: {
              tenantId: tenant.id,
              action: 'verified',
              domain,
              status: 'success',
              message: 'Domain auto-verified via polling',
            },
          });
        }
      }

      return {
        cname: cnameOk ? 'verified' : 'pending',
        cnameWWW: cnameWwwOk ? 'verified' : 'pending',
        txt: txtOk ? 'verified' : 'pending',
        allVerified,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`[Check Status] Error: ${error.message}`);
      throw new HttpException(
        'Failed to check DNS status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================================
  // 1. RESOLVE CUSTOM DOMAIN (Internal API)
  // Called by Next.js middleware via internal API
  // ==========================================

  @Get('resolve')
  async resolveDomain(@Query('hostname') hostname: string) {
    if (!hostname) {
      throw new HttpException('hostname required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`[Resolve] Looking up custom domain: ${hostname}`);

    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          customDomain: hostname,
          customDomainVerified: true,
          status: 'ACTIVE',
        },
        select: {
          slug: true,
          id: true,
        },
      });

      if (!tenant) {
        this.logger.warn(`[Resolve] Domain not found: ${hostname}`);
        throw new HttpException('Domain not found', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`[Resolve] Found tenant: ${tenant.slug}`);
      return {
        slug: tenant.slug,
        tenantId: tenant.id,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`[Resolve] Error: ${error.message}`);
      throw new HttpException(
        'Failed to resolve domain',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================================
  // 2. REQUEST CUSTOM DOMAIN
  // User submits domain → generate token + DNS instructions
  // ==========================================

  @Post('request')
  async requestDomain(
    @Body() body: { tenantId: string; customDomain: string },
  ) {
    const { tenantId, customDomain } = body;

    this.logger.log(
      `[Request] Tenant ${tenantId} requesting domain: ${customDomain}`,
    );

    // Validate domain format
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(customDomain)) {
      throw new HttpException('Invalid domain format', HttpStatus.BAD_REQUEST);
    }

    // Check if domain already taken by another tenant
    const existing = await this.prisma.tenant.findFirst({
      where: {
        customDomain,
        customDomainVerified: true,
        id: { not: tenantId },
      },
    });

    if (existing) {
      this.logger.warn(`[Request] Domain already taken: ${customDomain}`);
      throw new HttpException('Domain already taken', HttpStatus.CONFLICT);
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');

    // DNS instructions
    const dnsInstructions = {
      cname: {
        type: 'CNAME',
        name: '@',
        value: 'cname.vercel-dns.com',
        ttl: 'Auto',
        note: 'Point your root domain to Vercel',
      },
      cnameWWW: {
        type: 'CNAME',
        name: 'www',
        value: 'cname.vercel-dns.com',
        ttl: 'Auto',
        note: 'Point www subdomain to Vercel (optional)',
      },
      txtVerification: {
        type: 'TXT',
        name: '_vercel',
        value: `vc-domain-verify=${customDomain},${token}`,
        ttl: 'Auto',
        note: 'Verification record',
      },
    };

    // Update tenant
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain,
        customDomainToken: token,
        customDomainVerified: false,
        customDomainAddedAt: new Date(),
        sslStatus: 'pending',
        dnsRecords: dnsInstructions,
      },
    });

    // Create log
    await this.prisma.domainLog.create({
      data: {
        tenantId,
        action: 'requested',
        domain: customDomain,
        status: 'pending',
        message: 'Custom domain requested',
        metadata: { dnsInstructions },
      },
    });

    this.logger.log(`[Request] Domain registered: ${customDomain}`);

    return {
      success: true,
      tenant,
      instructions: dnsInstructions,
    };
  }

  // ==========================================
  // 3. VERIFY DNS RECORDS (Simplified - no longer does DNS checks)
  // Frontend auto-polling handles DNS checks via /check-status
  // This endpoint now just manually triggers Vercel addition
  // ==========================================

  @Post('verify')
  async verifyDomain(@Body() body: { tenantId: string }) {
    const { tenantId } = body;

    this.logger.log(`[Verify] Manual verify for tenant: ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.customDomain || !tenant?.customDomainToken) {
      throw new HttpException('No custom domain set', HttpStatus.BAD_REQUEST);
    }

    // Check DNS
    const hasCNAME = await this.checkCNAME(tenant.customDomain);
    const hasTXT = await this.checkTXT(
      tenant.customDomain,
      tenant.customDomainToken,
    );

    this.logger.log(`[Verify] DNS checks - CNAME: ${hasCNAME}, TXT: ${hasTXT}`);

    if (!hasCNAME || !hasTXT) {
      throw new HttpException(
        {
          error: 'DNS verification failed',
          checks: { cname: hasCNAME, txt: hasTXT },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Add to Vercel
    try {
      await this.addDomainToVercel(tenant.customDomain);
    } catch (error) {
      this.logger.error(`[Verify] Vercel error: ${error.message}`);
      throw new HttpException(
        'Failed to add domain to Vercel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Update tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomainVerified: true,
        customDomainVerifiedAt: new Date(),
        sslStatus: 'pending',
      },
    });

    // Create log
    await this.prisma.domainLog.create({
      data: {
        tenantId,
        action: 'verified',
        domain: tenant.customDomain,
        status: 'success',
        message: 'Domain verified successfully',
      },
    });

    this.logger.log(`[Verify] Domain verified: ${tenant.customDomain}`);

    return {
      success: true,
      message: 'Domain verified! SSL certificate is being issued.',
      domain: tenant.customDomain,
    };
  }

  // ==========================================
  // 4. CHECK SSL STATUS
  // Poll Vercel API for SSL certificate status
  // ==========================================

  @Get('ssl-status')
  async sslStatus(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new HttpException('tenantId required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`[SSL] Checking SSL for tenant: ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant?.customDomain || !tenant.customDomainVerified) {
      return {
        sslStatus: 'not_configured',
        message: 'Custom domain not configured or not verified',
      };
    }

    // Check Vercel SSL
    const sslStatus = await this.checkVercelSSL(tenant.customDomain);

    this.logger.log(`[SSL] Status for ${tenant.customDomain}: ${sslStatus}`);

    // Update if active
    if (sslStatus === 'active' && tenant.sslStatus !== 'active') {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          sslStatus: 'active',
          sslIssuedAt: new Date(),
        },
      });

      this.logger.log(`[SSL] SSL activated for ${tenant.customDomain}`);
    }

    return {
      sslStatus,
      domain: tenant.customDomain,
      issuedAt: tenant.sslIssuedAt,
    };
  }

  // ==========================================
  // 5. REMOVE CUSTOM DOMAIN
  // Remove from Vercel + reset DB fields
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

    // Remove from Vercel
    try {
      await this.removeDomainFromVercel(domain);
    } catch (error) {
      this.logger.warn(`[Remove] Vercel removal failed: ${error.message}`);
    }

    // Update tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainToken: null,
        sslStatus: null,
        sslIssuedAt: null,
        dnsRecords: Prisma.DbNull,
      },
    });

    // Create log
    await this.prisma.domainLog.create({
      data: {
        tenantId,
        action: 'removed',
        domain,
        status: 'success',
        message: 'Custom domain removed',
      },
    });

    this.logger.log(`[Remove] Domain removed: ${domain}`);

    return {
      success: true,
      message: 'Custom domain removed successfully',
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async checkCNAME(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveCname(domain);
      const hasVercelCname = records.some(
        (r) =>
          r.includes('vercel-dns.com') || r.includes('cname.vercel-dns.com'),
      );
      return hasVercelCname;
    } catch {
      // If CNAME fails, check A record (CNAME flattening)
      try {
        const aRecords = await dns.resolve4(domain);
        return aRecords.length > 0;
      } catch {
        return false;
      }
    }
  }

  private async checkTXT(domain: string, token: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(`_vercel.${domain}`);
      const flat = records.flat();
      const expected = `vc-domain-verify=${domain},${token}`;
      return flat.some((r) => r === expected);
    } catch {
      return false;
    }
  }

  private async addDomainToVercel(domain: string): Promise<void> {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) {
      throw new Error('Vercel credentials not configured in .env');
    }

    const res = await fetch(
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

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || 'Failed to add domain to Vercel');
    }
  }

  private async checkVercelSSL(domain: string): Promise<string> {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) return 'unknown';

    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
        {
          headers: { Authorization: `Bearer ${vercelToken}` },
        },
      );

      if (!res.ok) return 'unknown';

      const data = await res.json();
      return data.verified ? 'active' : 'pending';
    } catch {
      return 'unknown';
    }
  }

  private async removeDomainFromVercel(domain: string): Promise<void> {
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !projectId) {
      throw new Error('Vercel credentials not configured in .env');
    }

    const res = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${vercelToken}` },
      },
    );

    if (!res.ok) {
      throw new Error('Failed to remove domain from Vercel');
    }
  }
}
