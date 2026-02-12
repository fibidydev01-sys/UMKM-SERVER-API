import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// Import custom pipes, filters, interceptors
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ==========================================
  // 🔥 NEW: Compression middleware (gzip)
  // ==========================================
  app.use(compression());

  // Cookie Parser
  app.use(cookieParser());

  // ==========================================
  // 🔥 HYBRID: Whitelist + Wildcard Subdomain
  // ==========================================

  // Whitelist domain utama
  const whitelistedDomains = [
    'https://fibidy.com', // Main domain
    'https://www.fibidy.com', // WWW variant
  ];

  // Wildcard subdomain pattern
  const wildcardPattern = /^https?:\/\/([a-z0-9-]+)\.fibidy\.com$/;

  // Localhost untuk development
  const localhostPattern = /^http:\/\/localhost(:\d+)?$/;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      // 1. Check whitelist (exact match)
      if (whitelistedDomains.includes(origin)) {
        logger.log(`✅ CORS allowed (whitelist): ${origin}`);
        return callback(null, true);
      }

      // 2. Check wildcard subdomain (*.fibidy.com)
      if (wildcardPattern.test(origin)) {
        logger.log(`✅ CORS allowed (wildcard): ${origin}`);
        return callback(null, true);
      }

      // 3. Check localhost for development
      if (localhostPattern.test(origin)) {
        logger.log(`✅ CORS allowed (localhost): ${origin}`);
        return callback(null, true);
      }

      // Block everything else
      logger.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Cache-Control',
      'Pragma',
      'Expires',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // ==========================================
  // 🔥 NEW: Global Exception Filter
  // ==========================================
  app.useGlobalFilters(new AllExceptionsFilter());

  // ==========================================
  // 🔥 NEW: Global Logging Interceptor
  // ==========================================
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ==========================================
  // 🔥 UPDATED: Add SanitizePipe before ValidationPipe
  // ==========================================
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // ==========================================
  // 🔥 FIXED: Graceful shutdown handlers
  // Use void to explicitly ignore the promise
  // ==========================================
  process.on('SIGTERM', () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    void app.close().then(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.log('SIGINT received, shutting down gracefully...');
    void app.close().then(() => {
      process.exit(0);
    });
  });

  const port = process.env.PORT || 8000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`📚 API endpoint: http://localhost:${port}/api`);
  logger.log(`🌐 CORS enabled for:`);
  logger.log(`   ✅ Whitelist: ${whitelistedDomains.join(', ')}`);
  logger.log(`   ✅ Wildcard: *.fibidy.com`);
  logger.log(`   ✅ Localhost: http://localhost:*`);
  logger.log(`🗜️ Compression: enabled`);
  logger.log(`🛡️ XSS Protection: enabled`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start:', error);
  process.exit(1);
});
