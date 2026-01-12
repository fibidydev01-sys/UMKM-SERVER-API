import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Global Exception Filter
 *
 * Catches all exceptions and returns consistent error responses.
 * Prevents internal error details from leaking to clients in production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errors: string[] | undefined;
    let code: string | undefined;

    // Handle HTTP exceptions (BadRequest, NotFound, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string | string[]) || message;
        errors = responseObj.errors as string[] | undefined;
        code = responseObj.code as string | undefined;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      code = prismaError.code;
    }
    // Handle other errors
    else if (exception instanceof Error) {
      // Log full error internally
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
      } else {
        message = exception.message;
      }
    }

    // Log all errors
    const messageStr = Array.isArray(message) ? message.join(', ') : message;
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${messageStr}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      errors,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    code: string;
  } {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        // ✅ FIX: Wrap case content in braces to fix no-case-declarations
        const target = error.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `Data dengan ${field} tersebut sudah ada`,
          code: 'DUPLICATE_ENTRY',
        };
      }

      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Data tidak ditemukan',
          code: 'NOT_FOUND',
        };

      case 'P2003':
        // Foreign key constraint
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referensi data tidak valid',
          code: 'INVALID_REFERENCE',
        };

      case 'P2014':
        // Relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Tidak dapat menghapus data yang masih memiliki relasi',
          code: 'RELATION_VIOLATION',
        };

      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
        };
    }
  }
}
