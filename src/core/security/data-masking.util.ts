/**
 * Data Masking Utilities
 * Prevents sensitive data exposure in logs, error messages, and API responses
 */

import { SecurityConfig } from './security-config.constants';

/**
 * Mask bank account number
 * Example: "1234567890" → "******7890"
 */
export function maskBankAccount(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }

  const lastDigits = accountNumber.slice(-SecurityConfig.DATA_MASKING.BANK_ACCOUNT_SHOW_LAST);
  const maskedPart = '*'.repeat(Math.max(0, accountNumber.length - lastDigits.length));

  return maskedPart + lastDigits;
}

/**
 * Mask phone number
 * Example: "010-1234-5678" → "***-****-5678"
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    return '***-****-****';
  }

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length < 4) {
    return '***-****-****';
  }

  const lastDigits = digits.slice(-SecurityConfig.DATA_MASKING.PHONE_SHOW_LAST);
  const maskedPart = '*'.repeat(Math.max(0, digits.length - lastDigits.length));

  // Format with hyphens if original had them
  if (phoneNumber.includes('-')) {
    return `${maskedPart.slice(0, 3)}-${maskedPart.slice(3, 7)}-${lastDigits}`;
  }

  return maskedPart + lastDigits;
}

/**
 * Mask email address
 * Example: "user@example.com" → "u***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***@***';
  }

  const [username, domain] = email.split('@');

  if (!SecurityConfig.DATA_MASKING.EMAIL_MASK_USERNAME) {
    return email;
  }

  if (username.length <= 1) {
    return `***@${domain}`;
  }

  const maskedUsername = username[0] + '***';
  return `${maskedUsername}@${domain}`;
}

/**
 * Mask medical diagnosis (for logs)
 * Example: "Patellar Luxation Grade 3" → "Pat*** Lux*** Grade 3"
 */
export function maskDiagnosis(diagnosis: string): string {
  if (!diagnosis || diagnosis.length < 6) {
    return '*** (masked)';
  }

  // Keep first 3 chars of each word
  return diagnosis
    .split(' ')
    .map((word) => {
      if (word.length <= 3) return word;
      return word.slice(0, 3) + '***';
    })
    .join(' ');
}

/**
 * Mask treatment details (for logs)
 * Example: "Surgery with anesthesia" → "Sur*** with ane***"
 */
export function maskTreatment(treatment: string): string {
  return maskDiagnosis(treatment); // Same logic
}

/**
 * Mask name
 * Example: "김동물" → "김**", "John Smith" → "J*** S***"
 */
export function maskName(name: string): string {
  if (!name || name.length === 0) {
    return '***';
  }

  // For Korean names (typically 2-3 characters)
  if (/[가-힣]/.test(name)) {
    if (name.length === 2) {
      return name[0] + '*';
    }
    if (name.length >= 3) {
      return name[0] + '*'.repeat(name.length - 1);
    }
  }

  // For Western names
  return name
    .split(' ')
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + '***';
    })
    .join(' ');
}

/**
 * Mask JWT token for logs
 * Example: "eyJhbGci..." → "eyJh...****"
 */
export function maskJWT(token: string): string {
  if (!token || token.length < 10) {
    return '***';
  }

  return `${token.slice(0, 4)}...****`;
}

/**
 * Mask object recursively for logging
 * Automatically detects and masks sensitive fields
 */
export function maskObjectForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskObjectForLogging(item));
  }

  const masked: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Sensitive field detection
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key') && !lowerKey.includes('keyid')
    ) {
      masked[key] = '***REDACTED***';
    } else if (
      lowerKey.includes('account') &&
      (lowerKey.includes('number') || lowerKey.includes('no'))
    ) {
      masked[key] = typeof value === 'string' ? maskBankAccount(value) : value;
    } else if (
      lowerKey.includes('phone') ||
      lowerKey.includes('mobile') ||
      lowerKey.includes('tel')
    ) {
      masked[key] = typeof value === 'string' ? maskPhoneNumber(value) : value;
    } else if (lowerKey.includes('email')) {
      masked[key] = typeof value === 'string' ? maskEmail(value) : value;
    } else if (lowerKey.includes('diagnosis')) {
      masked[key] = typeof value === 'string' ? maskDiagnosis(value) : value;
    } else if (lowerKey.includes('treatment')) {
      masked[key] = typeof value === 'string' ? maskTreatment(value) : value;
    } else if (
      lowerKey.includes('name') &&
      !lowerKey.includes('filename') &&
      !lowerKey.includes('username')
    ) {
      masked[key] = typeof value === 'string' ? maskName(value) : value;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively mask nested objects
      masked[key] = maskObjectForLogging(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Safe stringify for logging (masks sensitive data)
 */
export function safeStringify(obj: any): string {
  try {
    const masked = maskObjectForLogging(obj);
    return JSON.stringify(masked, null, 2);
  } catch (error) {
    return '[Circular or Error]';
  }
}

/**
 * Mask transaction ID for logs
 * Example: "TXN-1234567890-abc123" → "TXN-***-***"
 */
export function maskTransactionId(transactionId: string): string {
  if (!transactionId) {
    return 'TXN-***';
  }

  const parts = transactionId.split('-');
  if (parts.length === 1) {
    return transactionId.slice(0, 4) + '-***';
  }

  return `${parts[0]}-***-***`;
}

/**
 * Mask settlement ID for logs
 */
export function maskSettlementId(settlementId: string): string {
  return maskTransactionId(settlementId);
}

/**
 * Mask payment key for logs
 */
export function maskPaymentKey(paymentKey: string): string {
  if (!paymentKey || paymentKey.length < 8) {
    return '***';
  }

  return paymentKey.slice(0, 4) + '***' + paymentKey.slice(-4);
}

/**
 * Format amount for logs (safe, not masked)
 */
export function formatAmount(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/**
 * Create audit log safe message
 * Automatically masks sensitive fields
 */
export function createAuditMessage(
  action: string,
  resource: string,
  details: Record<string, any>,
): string {
  const masked = maskObjectForLogging(details);
  return `${action} on ${resource}: ${JSON.stringify(masked)}`;
}
