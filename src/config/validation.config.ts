/**
 * Validation Configuration
 * Central configuration for all input validation and sanitization settings.
 */

export const validationConfig = {
  /** Maximum allowed request body size in bytes (10 MB) */
  maxBodySize: 10 * 1024 * 1024,

  /** Maximum allowed URL length in characters */
  maxUrlLength: 2048,

  /** Maximum query string parameter value length */
  maxQueryParamLength: 500,

  /** String field length limits */
  string: {
    /** Very short strings: names, codes */
    minShort: 1,
    maxShort: 100,
    /** Medium strings: titles, subjects */
    minMedium: 1,
    maxMedium: 500,
    /** Long strings: bios, descriptions */
    maxLong: 2000,
    /** Extra-long strings: content, messages */
    maxXLong: 10000,
  },

  /** Pagination defaults and limits */
  pagination: {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
    minLimit: 1,
  },

  /** Password policy */
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  },

  /** File upload constraints */
  fileUpload: {
    /** Allowed MIME types for general image uploads */
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    /** Allowed MIME types for document uploads */
    allowedDocumentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    /** Max file size: 5 MB */
    maxImageSizeBytes: 5 * 1024 * 1024,
    /** Max document size: 20 MB */
    maxDocumentSizeBytes: 20 * 1024 * 1024,
    /** Max base64 avatar string length (approx 5 MB encoded) */
    maxBase64AvatarLength: 7 * 1024 * 1024,
  },

  /** Stellar-specific validation */
  stellar: {
    /** Stellar public key (G-address) length */
    publicKeyLength: 56,
    /** Stellar public key prefix */
    publicKeyPrefix: 'G',
    /** Stellar transaction hash length */
    txHashLength: 64,
  },

  /** XSS / injection prevention patterns */
  security: {
    /** Characters/patterns that are stripped from string inputs */
    dangerousPatterns: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
    ],
    /** SQL injection detection patterns (for logging/blocking) */
    sqlInjectionPatterns: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|UNION|DECLARE)\b)/gi,
      /(-{2}|\/\*|\*\/|;--)/g,
      /(\bOR\b|\bAND\b)\s+[\w'"]+=[\w'"]+/gi,
    ],
  },

  /** Validation logging */
  logging: {
    /** Log failed validation attempts */
    logFailures: true,
    /** Log suspicious injection attempts */
    logSuspicious: true,
    /** Truncate long field values in logs */
    maxLogFieldLength: 200,
  },
} as const;

export type ValidationConfig = typeof validationConfig;
