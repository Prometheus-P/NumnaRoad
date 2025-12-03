/**
 * Email Encryption/Decryption Utility
 *
 * Implements AES-256-GCM encryption for customer email addresses
 * at rest in PocketBase.
 *
 * Security Requirements:
 * - SR-001: Customer email addresses MUST be encrypted at rest using AES-256-GCM
 * - SR-002: Encryption keys MUST be stored in environment variables
 * - SR-003: Email addresses MUST be decrypted only at point of use
 *
 * Task: T064
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface EncryptedData {
  /** Base64 encoded encrypted data */
  encrypted: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag */
  tag: string;
}

export interface CryptoConfig {
  /** AES-256 encryption key (32 bytes, base64 encoded) */
  encryptionKey: string;
}

// =============================================================================
// Constants
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

// =============================================================================
// Key Management
// =============================================================================

/**
 * Get encryption key from environment variable
 * @throws Error if key is not configured or invalid
 */
export function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.EMAIL_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      'EMAIL_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate a 32-byte key with: openssl rand -base64 32'
    );
  }

  const key = Buffer.from(keyBase64, 'base64');

  if (key.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes, got ${key.length}. ` +
        'Generate a new key with: openssl rand -base64 32'
    );
  }

  return key;
}

/**
 * Generate a new encryption key (for setup)
 * @returns Base64 encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64');
}

// =============================================================================
// Encryption
// =============================================================================

/**
 * Encrypt a string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @param key - Optional encryption key (defaults to env var)
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string, key?: Buffer): EncryptedData {
  const encryptionKey = key ?? getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Encrypt an email address
 *
 * @param email - Email address to encrypt
 * @returns Encrypted data as a JSON string (for storage)
 */
export function encryptEmail(email: string): string {
  const encrypted = encrypt(email);
  return JSON.stringify(encrypted);
}

// =============================================================================
// Decryption
// =============================================================================

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param encryptedData - The encrypted data with IV and tag
 * @param key - Optional encryption key (defaults to env var)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encryptedData: EncryptedData, key?: Buffer): string {
  const encryptionKey = key ?? getEncryptionKey();

  const iv = Buffer.from(encryptedData.iv, 'base64');
  const tag = Buffer.from(encryptedData.tag, 'base64');
  const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Decrypt an email address
 *
 * @param encryptedJson - JSON string from encryptEmail()
 * @returns Decrypted email address
 * @throws Error if decryption fails or data is malformed
 */
export function decryptEmail(encryptedJson: string): string {
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedJson);

    if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.tag) {
      throw new Error('Invalid encrypted email format');
    }

    return decrypt(encryptedData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid encrypted email: not valid JSON');
    }
    throw error;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a string appears to be encrypted email data
 *
 * @param value - String to check
 * @returns true if value looks like encrypted data
 */
export function isEncryptedEmail(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === 'object' &&
      typeof parsed.encrypted === 'string' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.tag === 'string'
    );
  } catch {
    return false;
  }
}

/**
 * Safely get email for display (decrypt if encrypted, return as-is if not)
 *
 * @param emailOrEncrypted - Plain email or encrypted email JSON
 * @returns Decrypted email address
 */
export function getEmailForUse(emailOrEncrypted: string): string {
  if (isEncryptedEmail(emailOrEncrypted)) {
    return decryptEmail(emailOrEncrypted);
  }
  return emailOrEncrypted;
}
