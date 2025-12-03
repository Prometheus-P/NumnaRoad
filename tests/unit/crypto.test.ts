/**
 * Unit tests for email encryption/decryption
 *
 * Tests T064: Email encryption utility
 * Task: T065
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptEmail,
  decryptEmail,
  isEncryptedEmail,
  getEmailForUse,
  generateEncryptionKey,
  getEncryptionKey,
  type EncryptedData,
} from '@/lib/crypto';
import { randomBytes } from 'crypto';

describe('Email Encryption - T064/T065', () => {
  // Test key (32 bytes base64 encoded)
  const testKey = randomBytes(32);
  const testKeyBase64 = testKey.toString('base64');

  beforeEach(() => {
    vi.stubEnv('EMAIL_ENCRYPTION_KEY', testKeyBase64);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Key Management', () => {
    it('should generate a valid 32-byte encryption key', () => {
      const key = generateEncryptionKey();
      const decoded = Buffer.from(key, 'base64');

      expect(decoded.length).toBe(32);
    });

    it('should retrieve encryption key from environment', () => {
      const key = getEncryptionKey();

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('should throw error when key is not set', () => {
      vi.stubEnv('EMAIL_ENCRYPTION_KEY', '');

      expect(() => getEncryptionKey()).toThrow(
        'EMAIL_ENCRYPTION_KEY environment variable is not set'
      );
    });

    it('should throw error when key is invalid length', () => {
      vi.stubEnv('EMAIL_ENCRYPTION_KEY', Buffer.from('short').toString('base64'));

      expect(() => getEncryptionKey()).toThrow('Invalid encryption key length');
    });
  });

  describe('encrypt()', () => {
    it('should encrypt plaintext and return encrypted data structure', () => {
      const plaintext = 'user@example.com';

      const result = encrypt(plaintext, testKey);

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
      expect(typeof result.encrypted).toBe('string');
      expect(typeof result.iv).toBe('string');
      expect(typeof result.tag).toBe('string');
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'user@example.com';

      const result1 = encrypt(plaintext, testKey);
      const result2 = encrypt(plaintext, testKey);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should produce valid base64 encoded values', () => {
      const result = encrypt('test@example.com', testKey);

      expect(() => Buffer.from(result.encrypted, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.tag, 'base64')).not.toThrow();
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data back to original plaintext', () => {
      const plaintext = 'user@example.com';
      const encrypted = encrypt(plaintext, testKey);

      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '한글이메일@example.com';
      const encrypted = encrypt(plaintext, testKey);

      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long email addresses', () => {
      const plaintext = 'very.long.email.address.with.many.parts@subdomain.example.com';
      const encrypted = encrypt(plaintext, testKey);

      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong key', () => {
      const encrypted = encrypt('user@example.com', testKey);
      const wrongKey = randomBytes(32);

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should fail with tampered ciphertext', () => {
      const encrypted = encrypt('user@example.com', testKey);
      const tampered: EncryptedData = {
        ...encrypted,
        encrypted: Buffer.from('tampered').toString('base64'),
      };

      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should fail with tampered IV', () => {
      const encrypted = encrypt('user@example.com', testKey);
      const tampered: EncryptedData = {
        ...encrypted,
        iv: randomBytes(12).toString('base64'),
      };

      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should fail with tampered auth tag', () => {
      const encrypted = encrypt('user@example.com', testKey);
      const tampered: EncryptedData = {
        ...encrypted,
        tag: randomBytes(16).toString('base64'),
      };

      expect(() => decrypt(tampered, testKey)).toThrow();
    });
  });

  describe('encryptEmail()', () => {
    it('should return a JSON string', () => {
      const result = encryptEmail('user@example.com');

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should contain all required fields', () => {
      const result = encryptEmail('user@example.com');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('encrypted');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('tag');
    });
  });

  describe('decryptEmail()', () => {
    it('should decrypt email from JSON string', () => {
      const email = 'user@example.com';
      const encrypted = encryptEmail(email);

      const decrypted = decryptEmail(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should throw on invalid JSON', () => {
      expect(() => decryptEmail('not-json')).toThrow('Invalid encrypted email: not valid JSON');
    });

    it('should throw on missing fields', () => {
      expect(() => decryptEmail('{"encrypted":"abc"}')).toThrow(
        'Invalid encrypted email format'
      );
    });
  });

  describe('isEncryptedEmail()', () => {
    it('should return true for encrypted email data', () => {
      const encrypted = encryptEmail('user@example.com');

      expect(isEncryptedEmail(encrypted)).toBe(true);
    });

    it('should return false for plain email', () => {
      expect(isEncryptedEmail('user@example.com')).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(isEncryptedEmail('not-json')).toBe(false);
    });

    it('should return false for incomplete data', () => {
      expect(isEncryptedEmail('{"encrypted":"abc"}')).toBe(false);
    });
  });

  describe('getEmailForUse()', () => {
    it('should decrypt encrypted email', () => {
      const email = 'user@example.com';
      const encrypted = encryptEmail(email);

      const result = getEmailForUse(encrypted);

      expect(result).toBe(email);
    });

    it('should return plain email as-is', () => {
      const email = 'user@example.com';

      const result = getEmailForUse(email);

      expect(result).toBe(email);
    });
  });

  describe('Round-trip encryption', () => {
    it('should encrypt and decrypt email correctly', () => {
      const testEmails = [
        'simple@example.com',
        'user.name+tag@example.co.kr',
        'korean@한글.com',
        'a@b.c',
        'very-long-email-address-with-many-characters@subdomain.example.org',
      ];

      for (const email of testEmails) {
        const encrypted = encryptEmail(email);
        const decrypted = decryptEmail(encrypted);

        expect(decrypted).toBe(email);
      }
    });
  });
});
