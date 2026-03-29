import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV_LENGTH = 16;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Get encryption key from environment
 * Falls back to a development key with warning
 */
function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    console.warn(
      '[WARNING] ENCRYPTION_KEY not set. Using development key. ' +
      'Set ENCRYPTION_KEY in production for proper security!'
    );
    // Development fallback - 32 characters for AES-256
    return Buffer.from('dev-encryption-key-32-chars-long!!');
  }

  // Ensure key is exactly 32 bytes for AES-256
  const key = Buffer.from(ENCRYPTION_KEY);
  if (key.length !== 32) {
    // Hash or pad to 32 bytes
    return Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  }
  return key;
}

export interface EncryptedData {
  iv: string;
  authTag: string;
  encrypted: string;
}

/**
 * Encrypt data using AES-256-GCM
 * Returns base64-encoded components
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';

  const key = getEncryptionKey();
  const iv = randomBytes(ENCRYPTION_IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 * Expects format: iv:authTag:encrypted (all base64)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';

  const parts = encryptedData.split(':');

  // Handle legacy format (iv:encrypted from old AES-256-CBC)
  if (parts.length === 2) {
    console.warn('[WARNING] Legacy encrypted data detected. Re-encrypt recommended.');
    return decryptLegacy(encryptedData);
  }

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivBase64, authTagBase64, encrypted] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Decrypt legacy AES-256-CBC encrypted data
 * For backward compatibility during migration
 */
function decryptLegacy(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid legacy encrypted data format');
  }

  const [ivHex, encrypted] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');

  const decipher = createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if data appears to be encrypted
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;
  // Check for our format (contains colons and base64 characters)
  return /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(data) ||
         /^[a-f0-9]+:[a-f0-9]+$/.test(data); // Legacy format
}
