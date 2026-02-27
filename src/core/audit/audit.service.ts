import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import * as crypto from 'crypto';

export interface AuditEvent {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  purpose: string; // Required for 의료법 Article 19
  legalBasis: string; // Required for PIPA
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * 📝 Create tamper-proof audit log with hash chain
   *
   * Compliance Requirements:
   * - 개인정보보호법 (PIPA): Track all access to personal data
   * - 의료법 (Medical Act) Article 19: Record purpose of medical data access
   * - Hash Chain: Prevents retroactive tampering of audit logs
   *
   * Hash Chain Process:
   * 1. Get hash of previous log entry
   * 2. Create new entry with previousHash field
   * 3. Hash entire entry (including previousHash)
   * 4. Store new entry with computed hash
   *
   * Verification:
   * - Recompute hash for each entry
   * - Verify previousHash matches previous entry's hash
   * - Any tampering breaks the chain
   *
   * @param event - Audit event to log
   * @returns Created audit log
   */
  async log(event: AuditEvent): Promise<AuditLog> {
    try {
      // 1. Get previous log entry for hash chain
      const previousLog = await this.getLatestLog();

      // 2. Create new audit entry
      const auditEntry = this.auditRepository.create({
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        purpose: event.purpose,
        legalBasis: event.legalBasis,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: event.metadata || {},
        timestamp: new Date(),
        previousHash: previousLog?.hash || undefined,
        hash: '', // Will be computed below
      });

      // 3. Compute hash for this entry (including previousHash)
      auditEntry.hash = this.createHash(auditEntry);

      // 4. Save audit log
      const savedLog = await this.auditRepository.save(auditEntry);

      this.logger.log(
        `Audit: ${event.action} on ${event.resource} by ${event.userId}`,
      );

      return savedLog;
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // ⚠️ CRITICAL: Audit failures should not break operations
      // but should trigger alerts for security monitoring
      throw error;
    }
  }

  /**
   * 🔗 Verify audit log chain integrity
   *
   * Verifies that no audit logs have been tampered with by:
   * 1. Recomputing hash for each entry
   * 2. Verifying hash matches stored hash
   * 3. Verifying previousHash matches previous entry's hash
   *
   * @param limit - Number of recent logs to verify (default: all)
   * @returns Verification result
   */
  async verifyChain(limit?: number): Promise<{
    valid: boolean;
    totalChecked: number;
    firstInvalidIndex?: number;
    error?: string;
  }> {
    try {
      const logs = await this.auditRepository.find({
        order: { timestamp: 'ASC' },
        ...(limit && { take: limit }),
      });

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Recompute hash
        const computedHash = this.createHash({
          userId: log.userId,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          purpose: log.purpose,
          legalBasis: log.legalBasis,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
          timestamp: log.timestamp,
          previousHash: log.previousHash,
          hash: '', // Exclude hash from computation
        });

        // Verify hash matches
        if (computedHash !== log.hash) {
          return {
            valid: false,
            totalChecked: i + 1,
            firstInvalidIndex: i,
            error: `Hash mismatch at index ${i}`,
          };
        }

        // Verify chain link (except for first entry)
        if (i > 0) {
          const previousLog = logs[i - 1];
          if (log.previousHash !== previousLog.hash) {
            return {
              valid: false,
              totalChecked: i + 1,
              firstInvalidIndex: i,
              error: `Chain broken at index ${i}`,
            };
          }
        }
      }

      return {
        valid: true,
        totalChecked: logs.length,
      };
    } catch (error) {
      this.logger.error('Chain verification failed:', error);
      throw error;
    }
  }

  /**
   * 📊 Get audit logs for a user
   *
   * @param userId - User ID to search for
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async getLogsForUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * 📊 Get audit logs for a resource
   *
   * @param resource - Resource type (e.g., 'health_note', 'insurance_claim')
   * @param resourceId - Resource ID
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async getLogsForResource(
    resource: string,
    resourceId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { resource, resourceId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * 🔒 Private helper to get latest log entry
   */
  private async getLatestLog(): Promise<AuditLog | null> {
    const results = await this.auditRepository.find({
      order: { timestamp: 'DESC' },
      take: 1,
    });
    return results[0] || null;
  }

  /**
   * 🔐 Private helper to create SHA-256 hash
   */
  private createHash(data: any): string {
    // Remove hash field from data before hashing
    const { hash, ...dataWithoutHash } = data;

    // Create deterministic JSON string (sorted keys)
    const jsonString = JSON.stringify(dataWithoutHash, Object.keys(dataWithoutHash).sort());

    // Compute SHA-256 hash
    return crypto
      .createHash('sha256')
      .update(jsonString)
      .digest('hex');
  }
}
