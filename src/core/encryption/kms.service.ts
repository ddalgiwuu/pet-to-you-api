import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class KmsService {
  private readonly logger = new Logger(KmsService.name);
  private masterKey: Buffer;

  constructor(private configService: ConfigService) {
    // 🔑 Load master key from environment
    // In production, this should be fetched from AWS KMS, Google Cloud KMS, or fly.io Secrets
    const masterKeyBase64 = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKeyBase64) {
      throw new Error('ENCRYPTION_MASTER_KEY not configured');
    }

    try {
      this.masterKey = Buffer.from(masterKeyBase64, 'base64');

      // Validate key length (should be 32 bytes for AES-256)
      if (this.masterKey.length !== 32) {
        throw new Error('Master key must be 32 bytes (256 bits)');
      }

      this.logger.log('✅ KMS initialized with master key');
    } catch (error) {
      this.logger.error('❌ Failed to initialize KMS:', error);
      throw error;
    }
  }

  /**
   * 🔒 Encrypt Data Encryption Key (DEK) with master key
   *
   * In production, replace this with actual KMS service:
   * - AWS KMS: kms.encrypt()
   * - Google Cloud KMS: cloudkms.encrypt()
   * - fly.io: Use fly.io Secrets API
   *
   * Current implementation uses AES-256-GCM with master key
   *
   * @param dek - Data Encryption Key to encrypt (32 bytes)
   * @returns Encrypted DEK (IV + authTag + encrypted)
   */
  async encrypt(dek: Buffer): Promise<Buffer> {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

      // Encrypt DEK
      const encrypted = Buffer.concat([
        cipher.update(dek),
        cipher.final(),
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Return: IV (16 bytes) + authTag (16 bytes) + encrypted (32 bytes) = 64 bytes total
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      this.logger.error('KMS encryption failed:', error);
      throw new Error('KMS encryption failed');
    }
  }

  /**
   * 🔓 Decrypt Data Encryption Key (DEK) with master key
   *
   * @param encryptedDek - Encrypted DEK (64 bytes: IV + authTag + encrypted)
   * @returns Decrypted DEK (32 bytes)
   */
  async decrypt(encryptedDek: Buffer): Promise<Buffer> {
    try {
      // Extract IV, authTag, and encrypted data
      const iv = encryptedDek.subarray(0, 16);
      const authTag = encryptedDek.subarray(16, 32);
      const encrypted = encryptedDek.subarray(32);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt DEK
      const dek = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return dek;
    } catch (error) {
      this.logger.error('KMS decryption failed:', error);
      throw new Error('KMS decryption failed');
    }
  }

  /**
   * 🔄 Generate new master key (for key rotation)
   *
   * Returns a random 32-byte (256-bit) key in base64 format
   * Use this to generate new ENCRYPTION_MASTER_KEY for .env
   *
   * @returns Base64-encoded 32-byte key
   */
  static generateMasterKey(): string {
    const key = crypto.randomBytes(32);
    return key.toString('base64');
  }
}

// 🔑 Helper function to generate master key
// Run: ts-node -e "console.log(require('./src/core/encryption/kms.service').KmsService.generateMasterKey())"
if (require.main === module) {
  console.log('Generated Master Key (base64):');
  console.log(KmsService.generateMasterKey());
  console.log('\nAdd this to .env as ENCRYPTION_MASTER_KEY');
}
