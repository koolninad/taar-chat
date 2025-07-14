import crypto from 'crypto';
import { config } from '../config';

/**
 * Generate a random OTP code
 */
export function generateOtp(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
}

/**
 * Generate a registration ID for Signal Protocol
 */
export function generateRegistrationId(): number {
  // Registration ID should be a random number between 1 and 16380
  return crypto.randomInt(1, 16380);
}

/**
 * Generate a random key ID
 */
export function generateKeyId(): number {
  return crypto.randomInt(1, 2147483647); // Max signed 32-bit integer
}

/**
 * Generate a secure random session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash a password using bcrypt-compatible method
 */
export function hashData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
  return `${actualSalt}:${hash.toString('hex')}`;
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
  try {
    const [salt, hash] = hashedData.split(':');
    if (!salt || !hash) return false;
    
    const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    return hash === verifyHash.toString('hex');
  } catch {
    return false;
  }
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string, key?: Buffer): { encrypted: string; key: string; iv: string; tag: string } {
  const encryptionKey = key || crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
  cipher.setAAD(Buffer.from('taar-app'));
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    key: encryptionKey.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encrypted: string, key: string, iv: string, tag: string): string {
  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const tagBuffer = Buffer.from(tag, 'hex');
  
  const decipher = crypto.createDecipher('aes-256-gcm', keyBuffer);
  decipher.setAAD(Buffer.from('taar-app'));
  decipher.setAuthTag(tagBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a secure file encryption key
 */
export function generateFileKey(): Buffer {
  return crypto.randomBytes(32); // 256-bit key
}

/**
 * Encrypt file data
 */
export function encryptFile(fileData: Buffer, key?: Buffer): { encrypted: Buffer; key: Buffer; iv: Buffer } {
  const encryptionKey = key || generateFileKey();
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  
  const encrypted = Buffer.concat([
    cipher.update(fileData),
    cipher.final()
  ]);
  
  return {
    encrypted,
    key: encryptionKey,
    iv
  };
}

/**
 * Decrypt file data
 */
export function decryptFile(encryptedData: Buffer, key: Buffer, iv: Buffer): Buffer {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  
  return Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);
}

/**
 * Generate HMAC signature
 */
export function generateHmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmac(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate UUID v4
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Time-safe string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(userAgent: string, ip: string): string {
  const data = `${userAgent}:${ip}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Key derivation function
 */
export function deriveKey(password: string, salt: string, iterations: number = 10000): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
}

/**
 * Generate entropy for randomness
 */
export function generateEntropy(bytes: number = 32): Buffer {
  return crypto.randomBytes(bytes);
}