import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { KmsService } from './kms.service';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  encryptedDek: string;
  version: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly version = 'v1';

  constructor(
    private configService: ConfigService,
    private kmsService: KmsService,
  ) {}

  /**
   * 🔒 Encrypt sensitive data using AES-256-GCM with envelope encryption
   *
   * Envelope Encryption Process:
   * 1. Generate Data Encryption Key (DEK) - random 32 bytes
   * 2. Encrypt DEK with KMS master key (envelope encryption)
   * 3. Encrypt plaintext data with DEK
   * 4. Return encrypted data + encrypted DEK + IV + auth tag
   *
   * Security Benefits:
   * - Master key never leaves KMS
   * - Each field uses unique DEK
   * - Authenticated encryption (GCM mode)
   * - Key rotation support via version
   *
   * @param plaintext - Sensitive data to encrypt
   * @returns EncryptedData object
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    try {
      // 1. Generate random Data Encryption Key (DEK) - 32 bytes for AES-256
      const dek = crypto.randomBytes(32);

      // 2. Encrypt DEK with KMS master key (envelope encryption)
      const encryptedDek = await this.kmsService.encrypt(dek);

      // 3. Generate random Initialization Vector (IV) - 16 bytes for GCM
      const iv = crypto.randomBytes(16);

      // 4. Create cipher with DEK and IV
      const cipher = crypto.createCipheriv(this.algorithm, dek, iv);

      // 5. Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 6. Get authentication tag (GCM mode provides message authentication)
      const authTag = cipher.getAuthTag();

      // 7. Securely wipe DEK from memory (prevent memory dumps)
      dek.fill(0);

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encryptedDek: encryptedDek.toString('base64'),
        version: this.version,
      };
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * 🔓 Decrypt data encrypted with encrypt()
   *
   * Decryption Process:
   * 1. Decrypt DEK using KMS master key
   * 2. Create decipher with DEK and IV
   * 3. Set authentication tag
   * 4. Decrypt ciphertext
   * 5. Securely wipe DEK from memory
   *
   * @param data - EncryptedData object
   * @returns Decrypted plaintext
   * @throws Error if authentication fails or decryption fails
   */
  async decrypt(data: EncryptedData): Promise<string> {
    try {
      // 1. Decrypt DEK with KMS master key
      const dek = await this.kmsService.decrypt(
        Buffer.from(data.encryptedDek, 'base64'),
      );

      // 2. Create decipher with DEK and IV
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        dek,
        Buffer.from(data.iv, 'hex'),
      );

      // 3. Set authentication tag (GCM mode verifies message integrity)
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

      // 4. Decrypt data
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // 5. Securely wipe DEK from memory
      dek.fill(0);

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Decryption failed or data corrupted');
    }
  }

  /**
   * 🔑 Create HMAC for searchable encryption
   *
   * Use Case: Search on encrypted fields (e.g., email, phone number)
   * - HMAC produces deterministic output for same input
   * - Cannot reverse HMAC to get original value
   * - Safe to index in database for equality searches
   *
   * Example:
   * ```typescript
   * const emailHmac = await encryptionService.createHmac('user@example.com');
   * // Store emailHmac in database index
   * // Query: WHERE email_hmac = createHmac(searchEmail)
   * ```
   *
   * @param value - Value to create HMAC for
   * @returns HMAC hex string (64 characters for SHA-256)
   */
  async createHmac(value: string): Promise<string> {
    const secret = this.configService.get<string>('ENCRYPTION_MASTER_KEY') || 'default-hmac-key';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(value);
    return hmac.digest('hex');
  }

  /**
   * 🔐 Hash password with bcrypt (for user authentication)
   * Note: Use bcrypt for passwords, NOT encryption
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    const rounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    return bcrypt.hash(password, rounds);
  }

  /**
   * ✅ Verify password against hash
   *
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }
}
