import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Sanitize Pipe - XSS Prevention
 *
 * Removes potentially dangerous HTML/script content from string inputs.
 * Applied globally before ValidationPipe.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // Sanitize ALL input types (body, query, param, custom)
    return this.sanitizeValue(value);
  }

  private sanitizeValue(value: unknown): unknown {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Sanitize strings
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // Sanitize arrays
    if (Array.isArray(value)) {
      return value.map((item: unknown) => this.sanitizeValue(item));
    }

    // Sanitize objects
    if (typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>)) {
        sanitized[key] = this.sanitizeValue(
          (value as Record<string, unknown>)[key],
        );
      }
      return sanitized;
    }

    // Return other types as-is (number, boolean, etc.)
    return value;
  }

  private sanitizeString(str: string): string {
    // Remove script tags and their content
    str = str.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );

    // Remove onclick, onerror, and other event handlers
    str = str.replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
    str = str.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

    // Remove javascript: protocol
    str = str.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    str = str.replace(/data:/gi, '');

    // Encode dangerous characters
    str = str.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return str.trim();
  }
}
