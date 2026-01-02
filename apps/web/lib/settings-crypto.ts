/**
 * Settings Encryption/Decryption Utility
 *
 * AES-256-GCM encryption for sensitive settings (API keys, secrets)
 * Uses separate key from PII encryption (SETTINGS_ENCRYPTION_KEY)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface EncryptedValue {
  encrypted: string;
  iv: string;
  tag: string;
}

// =============================================================================
// Constants
// =============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// =============================================================================
// Key Management
// =============================================================================

/**
 * Get settings encryption key from environment variable
 */
export function getSettingsEncryptionKey(): Buffer {
  const keyBase64 = process.env.SETTINGS_ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate with: openssl rand -base64 32'
    );
  }

  const key = Buffer.from(keyBase64, 'base64');

  if (key.length !== 32) {
    throw new Error(
      `Invalid SETTINGS_ENCRYPTION_KEY length: expected 32 bytes, got ${key.length}`
    );
  }

  return key;
}

// =============================================================================
// Encryption/Decryption
// =============================================================================

/**
 * Encrypt a setting value
 */
export function encryptSetting(plaintext: string): string {
  const key = getSettingsEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  const data: EncryptedValue = {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };

  return JSON.stringify(data);
}

/**
 * Decrypt a setting value
 */
export function decryptSetting(encryptedJson: string): string {
  const key = getSettingsEncryptionKey();

  const data: EncryptedValue = JSON.parse(encryptedJson);

  if (!data.encrypted || !data.iv || !data.tag) {
    throw new Error('Invalid encrypted setting format');
  }

  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');
  const encrypted = Buffer.from(data.encrypted, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
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
 * Check if a value is encrypted
 */
export function isEncryptedSetting(value: string): boolean {
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
 * Mask a sensitive value for display
 * Shows last 4 characters only: ••••••••XXXX
 */
export function maskSensitiveValue(value: string): string {
  if (!value || value.length <= 4) {
    return '••••••••';
  }
  const lastFour = value.slice(-4);
  return `••••••••${lastFour}`;
}

/**
 * Safely decrypt setting for use
 */
export function getSettingValue(valueOrEncrypted: string): string {
  if (isEncryptedSetting(valueOrEncrypted)) {
    return decryptSetting(valueOrEncrypted);
  }
  return valueOrEncrypted;
}
