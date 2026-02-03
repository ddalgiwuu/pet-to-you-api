/**
 * Sanitization Service
 * Prevents XSS and injection attacks through input sanitization
 */

import { Injectable, Logger } from '@nestjs/common';
import { SecurityConfig } from './security-config.constants';

@Injectable()
export class SanitizationService {
  private readonly logger = new Logger(SanitizationService.name);

  /**
   * Sanitize plain text input (remove all HTML)
   * Use for: medical records, user comments, descriptions
   */
  sanitizePlainText(input: string): string {
    if (!input) return '';

    let clean = input;

    // Remove HTML tags
    clean = clean.replace(/<[^>]*>/g, '');

    // Remove script content (even if tags removed)
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: protocol
    clean = clean.replace(/javascript:/gi, '');

    // Remove data: protocol (can embed scripts)
    clean = clean.replace(/data:text\/html/gi, '');

    // Remove vbscript: protocol
    clean = clean.replace(/vbscript:/gi, '');

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Limit length
    if (clean.length > SecurityConfig.XSS.MAX_TEXT_LENGTH) {
      clean = clean.substring(0, SecurityConfig.XSS.MAX_TEXT_LENGTH);
      this.logger.warn(`Text truncated to ${SecurityConfig.XSS.MAX_TEXT_LENGTH} chars`);
    }

    return clean;
  }

  /**
   * Sanitize URL (validate and whitelist)
   * Use for: document URLs, attachment URLs
   */
  sanitizeUrl(url: string): string {
    if (!url) return '';

    // Remove whitespace
    const clean = url.trim();

    // Validate URL format
    try {
      const parsed = new URL(clean);

      // Only allow HTTPS (production)
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs allowed in production');
      }

      // Whitelist allowed domains
      const allowedDomains = [
        's3.amazonaws.com',
        'cdn.pettoyou.com',
        'storage.pettoyou.com',
      ];

      const isAllowed = allowedDomains.some((domain) =>
        parsed.hostname.endsWith(domain),
      );

      if (!isAllowed) {
        throw new Error(`Domain not whitelisted: ${parsed.hostname}`);
      }

      return clean;
    } catch (error) {
      this.logger.warn(`Invalid URL: ${url}`, error.message);
      throw new Error(`Invalid or disallowed URL: ${error.message}`);
    }
  }

  /**
   * Sanitize email address
   * Use for: user emails, contact emails
   */
  sanitizeEmail(email: string): string {
    if (!email) return '';

    const clean = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(clean)) {
      throw new Error('Invalid email format');
    }

    // Check for suspicious patterns
    if (clean.includes('javascript:') || clean.includes('<script')) {
      throw new Error('Potentially malicious email');
    }

    return clean;
  }

  /**
   * Sanitize phone number (Korean format)
   * Use for: user phones, hospital phones
   */
  sanitizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Validate Korean phone format
    // Mobile: 010-XXXX-XXXX (10-11 digits)
    // Landline: 0X-XXX-XXXX or 0XX-XXX-XXXX (9-10 digits)

    if (digitsOnly.length < 9 || digitsOnly.length > 11) {
      throw new Error('Invalid phone number length');
    }

    // Format based on length
    if (digitsOnly.length === 10) {
      // 02-1234-5678 or 010-123-4567
      if (digitsOnly.startsWith('02')) {
        return `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
      } else {
        return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      }
    } else if (digitsOnly.length === 11) {
      // 010-1234-5678
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
    } else if (digitsOnly.length === 9) {
      // 031-123-4567
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }

    return digitsOnly;
  }

  /**
   * Sanitize file name
   * Use for: uploaded files, document names
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName) return '';

    // Remove path traversal attempts
    let clean = fileName.replace(/\.\./g, '');
    clean = clean.replace(/[/\\]/g, '');

    // Allow only alphanumeric, dash, underscore, dot
    clean = clean.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');

    // Remove leading dots (hidden files)
    clean = clean.replace(/^\.+/, '');

    // Limit length
    if (clean.length > 200) {
      const ext = clean.split('.').pop();
      clean = clean.substring(0, 190) + '.' + ext;
    }

    // Ensure has extension
    if (!clean.includes('.')) {
      clean += '.bin';
    }

    return clean;
  }

  /**
   * Sanitize SQL LIKE pattern (prevent injection via wildcards)
   * Use for: search queries with LIKE
   */
  sanitizeSqlLikePattern(pattern: string): string {
    if (!pattern) return '';

    // Escape special LIKE characters
    let clean = pattern;
    clean = clean.replace(/\\/g, '\\\\'); // Backslash
    clean = clean.replace(/%/g, '\\%'); // Percent
    clean = clean.replace(/_/g, '\\_'); // Underscore

    return clean;
  }

  /**
   * Sanitize JSON input (prevent prototype pollution)
   * Use for: metadata fields, JSONB columns
   */
  sanitizeJson(input: any): any {
    if (!input || typeof input !== 'object') {
      return input;
    }

    // Prevent prototype pollution
    const dangerous = ['__proto__', 'constructor', 'prototype'];

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeJson(item));
    }

    const clean: any = {};

    for (const [key, value] of Object.entries(input)) {
      // Skip dangerous keys
      if (dangerous.includes(key)) {
        this.logger.warn(`Blocked dangerous key: ${key}`);
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        clean[key] = this.sanitizeJson(value);
      } else if (typeof value === 'string') {
        clean[key] = this.sanitizePlainText(value);
      } else {
        clean[key] = value;
      }
    }

    return clean;
  }

  /**
   * Sanitize entire DTO object
   * Use in: interceptor for all incoming requests
   */
  sanitizeDto<T>(dto: T): T {
    if (!dto || typeof dto !== 'object') {
      return dto;
    }

    if (Array.isArray(dto)) {
      return dto.map((item) => this.sanitizeDto(item)) as unknown as T;
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(dto)) {
      // Skip null/undefined
      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      // String sanitization
      if (typeof value === 'string') {
        // Special handling for specific fields
        if (key.toLowerCase().includes('email')) {
          try {
            sanitized[key] = this.sanitizeEmail(value);
          } catch (error) {
            sanitized[key] = value; // Keep original if validation fails
          }
        } else if (
          key.toLowerCase().includes('phone') ||
          key.toLowerCase().includes('tel')
        ) {
          try {
            sanitized[key] = this.sanitizePhoneNumber(value);
          } catch (error) {
            sanitized[key] = value;
          }
        } else if (
          key.toLowerCase().includes('url') ||
          key.toLowerCase().includes('uri')
        ) {
          // URLs validated separately, just remove scripts
          sanitized[key] = value.replace(/<script/gi, '');
        } else if (key.toLowerCase().includes('filename')) {
          sanitized[key] = this.sanitizeFileName(value);
        } else {
          // Generic text sanitization
          sanitized[key] = this.sanitizePlainText(value);
        }
      }
      // Nested object sanitization
      else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeDto(value);
      }
      // Pass through numbers, booleans, etc.
      else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Validate and sanitize correlation ID
   * Use for: request tracking, audit logging
   */
  sanitizeCorrelationId(correlationId: string): string {
    if (!correlationId) return '';

    // Must be UUID v4 format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(correlationId)) {
      throw new Error('Invalid correlation ID format (must be UUID v4)');
    }

    return correlationId.toLowerCase();
  }

  /**
   * Sanitize diagnosis/treatment text
   * Special handling for medical terminology
   */
  sanitizeMedicalText(text: string): string {
    if (!text) return '';

    // Remove HTML/scripts but preserve medical formatting
    let clean = this.sanitizePlainText(text);

    // Preserve Korean medical terms and scientific names
    // (no additional processing needed, already cleaned)

    // Limit length for medical fields
    const MAX_MEDICAL_TEXT_LENGTH = 5000;
    if (clean.length > MAX_MEDICAL_TEXT_LENGTH) {
      clean = clean.substring(0, MAX_MEDICAL_TEXT_LENGTH);
      this.logger.warn('Medical text truncated to 5000 chars');
    }

    return clean;
  }

  /**
   * Detect potential SQL injection patterns
   * Returns true if suspicious pattern detected
   */
  detectSqlInjection(input: string): boolean {
    if (!input) return false;

    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION\s+SELECT)/gi,
      /(;\s*DROP)/gi,
      /(--|\#|\/\*)/g, // SQL comments
      /('\s*OR\s*'1'\s*=\s*'1)/gi,
      /('\s*OR\s*1\s*=\s*1)/gi,
    ];

    return sqlPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Detect potential XSS patterns
   * Returns true if suspicious pattern detected
   */
  detectXss(input: string): boolean {
    if (!input) return false;

    const xssPatterns = [
      /<script/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /eval\(/gi,
      /expression\(/gi, // CSS expression
    ];

    return xssPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validate input against common attack patterns
   * Throws error if malicious pattern detected
   */
  validateAgainstAttackPatterns(input: string, fieldName: string): void {
    if (this.detectSqlInjection(input)) {
      this.logger.warn(`SQL injection attempt detected in ${fieldName}`, {
        field: fieldName,
        pattern: 'SQL injection',
      });
      throw new Error('Invalid input: potentially malicious pattern detected');
    }

    if (this.detectXss(input)) {
      this.logger.warn(`XSS attempt detected in ${fieldName}`, {
        field: fieldName,
        pattern: 'XSS',
      });
      throw new Error('Invalid input: potentially malicious pattern detected');
    }

    // Check for path traversal
    if (input.includes('../') || input.includes('..\\')) {
      this.logger.warn(`Path traversal attempt detected in ${fieldName}`);
      throw new Error('Invalid input: path traversal detected');
    }

    // Check for null byte injection
    if (input.includes('\0')) {
      this.logger.warn(`Null byte injection attempt in ${fieldName}`);
      throw new Error('Invalid input: null byte detected');
    }
  }

  /**
   * Comprehensive sanitization with attack detection
   * Use as primary sanitization method
   */
  sanitizeAndValidate(input: string, fieldName: string): string {
    if (!input) return '';

    // First, detect attacks (throws if malicious)
    this.validateAgainstAttackPatterns(input, fieldName);

    // Then sanitize
    const clean = this.sanitizePlainText(input);

    return clean;
  }
}
