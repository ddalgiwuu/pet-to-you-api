/**
 * Security Configuration Constants
 * Centralized security settings for Pet-to-You platform
 */

export const SecurityConfig = {
  // Rate Limiting
  RATE_LIMIT: {
    // Global limits
    GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    GLOBAL_MAX_REQUESTS: 1000,

    // Endpoint-specific limits
    CLAIM_SUBMISSION: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_PER_USER: 5, // 5 claims per user per hour
      MAX_PER_IP: 10, // 10 claims per IP per hour
    },

    PAYMENT_CREATION: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_PER_USER: 10,
      MAX_PER_IP: 20,
    },

    MEDICAL_RECORD: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_PER_USER: 20,
      MAX_PER_IP: 50,
    },

    AUTH_LOGIN: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_ATTEMPTS: 5,
      LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
    },
  },

  // Cost Validation Limits (KRW)
  COST_LIMITS: {
    GENERAL: {
      MIN: 1000, // ₩1,000
      MAX: 1_000_000, // ₩1,000,000
      ALERT_THRESHOLD: 500_000, // Alert if >₩500,000
    },
    SURGERY: {
      MIN: 100_000, // ₩100,000
      MAX: 10_000_000, // ₩10,000,000
      ALERT_THRESHOLD: 5_000_000, // Alert if >₩5,000,000
    },
    EMERGENCY: {
      MIN: 50_000, // ₩50,000
      MAX: 5_000_000, // ₩5,000,000
      ALERT_THRESHOLD: 3_000_000, // Alert if >₩3,000,000
    },
    HOSPITALIZATION: {
      MIN: 100_000, // ₩100,000
      MAX: 3_000_000, // ₩3,000,000
      ALERT_THRESHOLD: 2_000_000, // Alert if >₩2,000,000
    },
    DIAGNOSTIC: {
      MIN: 10_000, // ₩10,000
      MAX: 500_000, // ₩500,000
      ALERT_THRESHOLD: 300_000, // Alert if >₩300,000
    },
    DENTAL: {
      MIN: 30_000, // ₩30,000
      MAX: 1_500_000, // ₩1,500,000
      ALERT_THRESHOLD: 1_000_000, // Alert if >₩1,000,000
    },
    CHRONIC: {
      MIN: 20_000, // ₩20,000
      MAX: 500_000, // ₩500,000 per visit
      ALERT_THRESHOLD: 300_000,
    },
  },

  // Password Policy
  PASSWORD: {
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    EXPIRATION_DAYS: 90, // Hospital staff only
    PREVENT_REUSE_COUNT: 5, // Cannot reuse last 5 passwords
    MAX_CONSECUTIVE_CHARS: 3, // No more than 3 consecutive identical chars
  },

  // Session Management
  SESSION: {
    JWT_EXPIRATION: '7d',
    REFRESH_TOKEN_EXPIRATION: '30d',
    MAX_CONCURRENT_SESSIONS: 3,
    IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    ABSOLUTE_TIMEOUT_MS: 12 * 60 * 60 * 1000, // 12 hours
    REQUIRE_REFRESH_AFTER_MS: 60 * 60 * 1000, // Re-auth after 1 hour for sensitive ops
  },

  // File Upload Validation
  FILE_UPLOAD: {
    MAX_FILE_SIZE_MB: 10,
    MAX_FILES_PER_REQUEST: 5,
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.heif'],
    SCAN_FOR_MALWARE: true,
    SANITIZE_FILENAME: true,
  },

  // XSS Protection
  XSS: {
    ALLOWED_TAGS: [], // No HTML allowed by default
    ALLOWED_ATTRIBUTES: {},
    MAX_TEXT_LENGTH: 10_000,
    SANITIZE_BEFORE_STORAGE: true,
  },

  // CSRF Protection
  CSRF: {
    ENABLED: true,
    COOKIE_NAME: '__Host-csrf',
    COOKIE_OPTIONS: {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },

  // Audit Logging
  AUDIT: {
    LOG_ALL_ACCESS: true,
    LOG_FAILED_AUTH: true,
    LOG_SENSITIVE_OPS: true,
    RETENTION_DAYS: 365 * 3, // 3 years
    ALERT_ON_CHAIN_BREAK: true,
  },

  // Data Masking
  DATA_MASKING: {
    BANK_ACCOUNT_SHOW_LAST: 4, // Show last 4 digits only
    PHONE_SHOW_LAST: 4,
    EMAIL_MASK_USERNAME: true,
    LOG_MASKING_ENABLED: true,
  },

  // Security Headers
  HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 year
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'no-referrer',
    PERMISSIONS_POLICY: 'geolocation=(), microphone=(), camera=()',
  },

  // Encryption
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm' as const,
    KEY_ROTATION_DAYS: 90,
    VERSION: 'v1',
  },

  // Alert Thresholds
  ALERTS: {
    FAILED_LOGIN_THRESHOLD: 5, // Alert after 5 failed logins
    HIGH_VALUE_PAYMENT_KRW: 5_000_000, // Alert on payments >₩5M
    SUSPICIOUS_CLAIM_PATTERNS: true,
    ANOMALY_DETECTION: true,
  },
};

/**
 * Cost reasonability check
 */
export function isCostReasonable(
  amount: number,
  coverageType: string,
): { valid: boolean; alertRequired: boolean; reason?: string } {
  const limits = SecurityConfig.COST_LIMITS[coverageType.toUpperCase() as keyof typeof SecurityConfig.COST_LIMITS];

  if (!limits) {
    return {
      valid: true,
      alertRequired: true,
      reason: `Unknown coverage type: ${coverageType}`,
    };
  }

  if (amount < limits.MIN) {
    return {
      valid: false,
      alertRequired: false,
      reason: `Amount ₩${amount.toLocaleString()} below minimum ₩${limits.MIN.toLocaleString()} for ${coverageType}`,
    };
  }

  if (amount > limits.MAX) {
    return {
      valid: false,
      alertRequired: true,
      reason: `Amount ₩${amount.toLocaleString()} exceeds maximum ₩${limits.MAX.toLocaleString()} for ${coverageType}`,
    };
  }

  if (amount > limits.ALERT_THRESHOLD) {
    return {
      valid: true,
      alertRequired: true,
      reason: `High value amount ₩${amount.toLocaleString()} exceeds alert threshold ₩${limits.ALERT_THRESHOLD.toLocaleString()}`,
    };
  }

  return {
    valid: true,
    alertRequired: false,
  };
}

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const policy = SecurityConfig.PASSWORD;

  if (password.length < policy.MIN_LENGTH) {
    errors.push(`Password must be at least ${policy.MIN_LENGTH} characters`);
  }

  if (password.length > policy.MAX_LENGTH) {
    errors.push(`Password must not exceed ${policy.MAX_LENGTH} characters`);
  }

  if (policy.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (policy.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (policy.REQUIRE_NUMBER && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (policy.REQUIRE_SPECIAL) {
    const specialRegex = new RegExp(`[${policy.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  // Check for consecutive characters
  for (let i = 0; i < password.length - policy.MAX_CONSECUTIVE_CHARS; i++) {
    const char = password[i];
    let consecutive = 1;
    for (let j = i + 1; j < password.length && password[j] === char; j++) {
      consecutive++;
    }
    if (consecutive > policy.MAX_CONSECUTIVE_CHARS) {
      errors.push(`Password cannot contain more than ${policy.MAX_CONSECUTIVE_CHARS} consecutive identical characters`);
      break;
    }
  }

  // Check for common patterns
  const commonPatterns = ['12345', 'abcde', 'qwerty', 'password', '00000'];
  for (const pattern of commonPatterns) {
    if (password.toLowerCase().includes(pattern)) {
      errors.push('Password contains common patterns and is too weak');
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
