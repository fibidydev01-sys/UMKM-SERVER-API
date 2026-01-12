import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Logging Interceptor
 *
 * Logs all HTTP requests with timing information.
 * Useful for debugging, monitoring, and audit trails.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;

    // Get tenant ID from authenticated user (if available)
    const tenantId = (request as any).user?.id || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - now;

          // Log successful requests
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${duration}ms - ${ip} - ${tenantId}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;

          // Log failed requests
          this.logger.error(
            `${method} ${url} ${error.status || 500} - ${duration}ms - ${ip} - ${tenantId} - ${error.message}`,
          );
        },
      }),
    );
  }
}
