/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hook: Encryption Utilities
 *
 * Provides functions for encrypting and decrypting sensitive fields using AES-256-GCM.
 * The encryption key is retrieved from the 'ENCRYPTION_KEY' environment variable.
 */

// Helper function to get encryption key from environment
function getEncryptionKey() {
  const key = $os.getenv("ENCRYPTION_KEY");
  if (!key || key.length !== 32) {
    throw new Error("ENCRYPTION_KEY environment variable is not set or is not 32 characters long.");
  }
  return key;
}

/**
 * Encrypts a given value.
 * @param {string} value The value to encrypt.
 * @returns {string} The encrypted value.
 */
function encryptValue(value) {
  if (!value) {
    return value;
  }
  const key = getEncryptionKey();
  return $security.encrypt(value, key);
}

/**
 * Decrypts a given value.
 * @param {string} value The value to decrypt.
 * @returns {string} The decrypted value.
 */
function decryptValue(value) {
  if (!value) {
    return value;
  }
  const key = getEncryptionKey();
  try {
    return $security.decrypt(value, key);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "[DECRYPTION_FAILED]"; // Or throw error, depending on desired behavior
  }
}

// Hook to encrypt sensitive fields before saving a record
onRecordBeforeCreateRequest((e) => {
  if (e.collection.name === "orders") {
    const record = e.record;
    if (record.get("customer_email")) {
      record.set("customer_email", encryptValue(record.get("customer_email")));
    }
    if (record.get("esim_qr_code")) {
      record.set("esim_qr_code", encryptValue(record.get("esim_qr_code")));
    }
  }
}, "orders");

onRecordBeforeUpdateRequest((e) => {
  if (e.collection.name === "orders") {
    const record = e.record;
    // Only encrypt if the field has changed or is new
    if (record.get("customer_email") !== record.originalCopy().get("customer_email")) {
      record.set("customer_email", encryptValue(record.get("customer_email")));
    }
    if (record.get("esim_qr_code") !== record.originalCopy().get("esim_qr_code")) {
      record.set("esim_qr_code", encryptValue(record.get("esim_qr_code")));
    }
  }
}, "orders");

// Hook to decrypt sensitive fields after loading a record
onRecordAfterLoadRequest((e) => {
  if (e.collection.name === "orders") {
    const record = e.record;
    if (record.get("customer_email")) {
      record.set("customer_email", decryptValue(record.get("customer_email")));
    }
    if (record.get("esim_qr_code")) {
      record.set("esim_qr_code", decryptValue(record.get("esim_qr_code")));
    }
  }
}, "orders");
