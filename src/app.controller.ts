import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck() {
    const checks: {
      status: string;
      timestamp: string;
      database: string;
      cache: { status: string; latency?: number };
      uptime: number;
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'unknown',
      cache: { status: 'unknown' },
      uptime: process.uptime(),
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    // Check Redis
    try {
      checks.cache = await this.redis.healthCheck();
      if (checks.cache.status === 'error') {
        checks.status = 'degraded';
      }
    } catch {
      checks.cache = { status: 'error' };
      checks.status = 'degraded';
    }

    return checks;
  }
}
