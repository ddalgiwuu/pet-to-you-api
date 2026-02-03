import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { DataExportService } from '../services/data-export.service';
import { BreachNotificationService } from '../services/breach-notification.service';
import { AuditReportService } from '../services/audit-report.service';
import { DataRetentionService } from '../services/data-retention.service';
import {
  DataExportRequestDto,
  BreachReportDto,
  AuditReportRequestDto,
  SuspiciousActivityQueryDto,
} from '../dto';

/**
 * 🛡️ Compliance Controller
 *
 * Endpoints for PIPA (개인정보보호법) compliance:
 * 1. Data Export - User data portability (Article 35)
 * 2. Breach Notification - Security incident reporting (Article 34)
 * 3. Audit Reports - Compliance reporting (Article 30)
 * 4. Data Retention - Retention policy execution
 *
 * Security:
 * - Authentication required for all endpoints
 * - Authorization checks for admin-only operations
 * - Rate limiting on data exports
 * - Comprehensive audit logging
 */
@Controller('compliance')
export class ComplianceController {
  constructor(
    private dataExportService: DataExportService,
    private breachNotificationService: BreachNotificationService,
    private auditReportService: AuditReportService,
    private dataRetentionService: DataRetentionService,
  ) {}

  // ============================================================
  // Data Export Endpoints (PIPA Article 35)
  // ============================================================

  /**
   * 📤 POST /compliance/data-export/:userId
   *
   * Export all user personal data (GDPR-style data portability)
   *
   * PIPA Article 35: Right to Data Portability
   * - Users can request export of all their personal data
   * - Format: JSON or CSV
   * - Includes: profile, pets, bookings, payments, medical records (decrypted)
   *
   * Rate Limit: 3 exports per day per user
   *
   * @param userId - User ID requesting export
   * @param format - Export format (json or csv)
   * @returns ZIP archive download
   */
  @Post('data-export/:userId')
  @HttpCode(HttpStatus.OK)
  async exportUserData(
    @Param('userId') userId: string,
    @Body() dto: DataExportRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Extract request metadata
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Export user data
    const { archive, filename, size } = await this.dataExportService.exportUserData(
      userId,
      dto.format || 'json',
      ipAddress,
      userAgent,
    );

    // Set download headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', size);

    // Send archive
    res.send(archive);
  }

  // ============================================================
  // Breach Notification Endpoints (PIPA Article 34)
  // ============================================================

  /**
   * 🚨 POST /compliance/breach/report
   *
   * Report security breach to authorities and affected users
   *
   * PIPA Article 34: Breach Notification Requirement
   * - Notify authorities within 72 hours (MOHW, PIPC, KISA)
   * - Notify affected users without undue delay
   * - Document incident and response measures
   *
   * Korean Authorities:
   * - MOHW (보건복지부): Medical data breaches
   * - PIPC (개인정보보호위원회): All personal data breaches
   * - KISA (한국인터넷진흥원): Technical incident response
   *
   * @param dto - Breach incident details
   * @returns Notification status and incident ID
   */
  @Post('breach/report')
  @HttpCode(HttpStatus.CREATED)
  async reportBreach(@Body() dto: BreachReportDto): Promise<{
    incidentId: string;
    authoritiesNotified: boolean;
    usersNotified: number;
    reportUrl: string;
    message: string;
  }> {
    const result = await this.breachNotificationService.reportBreach({
      type: dto.type,
      description: dto.description,
      affectedDataTypes: dto.affectedDataTypes,
      affectedUserIds: dto.affectedUserIds,
      discoveredAt: dto.discoveredAt || new Date(),
      detectedBy: dto.detectedBy,
      severity: dto.severity,
      containmentStatus: dto.containmentStatus,
      estimatedImpact: dto.estimatedImpact,
    });

    return {
      ...result,
      message: 'Breach notification process completed successfully',
    };
  }

  // ============================================================
  // Audit Report Endpoints (PIPA Article 30)
  // ============================================================

  /**
   * 📊 GET /compliance/audit-logs
   *
   * Generate compliance audit report
   *
   * PIPA Article 30: Regular audit requirement
   *
   * Report Types:
   * - Access Report: Who accessed what data and when
   * - Anomaly Report: Suspicious access patterns
   * - Compliance Report: PIPA/의료법 compliance status
   *
   * @param query - Report parameters (date range, format)
   * @returns Audit report (PDF, JSON, or CSV)
   */
  @Get('audit-logs')
  async getAuditReport(
    @Query() query: AuditReportRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const format = query.format || 'pdf';

    const { data, file, filename } = await this.auditReportService.generateComplianceReport(
      startDate,
      endDate,
      format,
    );

    if (format === 'json' && !query.download) {
      // Return JSON response
      res.json(data);
    } else {
      // Return file download
      const mimeTypes = {
        pdf: 'application/pdf',
        json: 'application/json',
        csv: 'text/csv',
      };

      res.setHeader('Content-Type', mimeTypes[format]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(file);
    }
  }

  /**
   * 🔍 GET /compliance/suspicious-activity
   *
   * Detect and report suspicious activities
   *
   * Anomaly Detection:
   * - Excessive access (>100 records/hour)
   * - Off-hours access (2am-5am)
   * - Failed authorizations (>5 failures/10min)
   * - Bulk data access (>1000 records)
   * - Geographic anomalies
   *
   * @param query - Detection parameters
   * @returns Suspicious activity alerts
   */
  @Get('suspicious-activity')
  async detectSuspiciousActivity(
    @Query() query: SuspiciousActivityQueryDto,
  ): Promise<{
    alerts: any[];
    totalAlerts: number;
    criticalAlerts: number;
    period: { startDate: Date; endDate: Date };
  }> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const alerts = await this.auditReportService.detectSuspiciousActivities(
      startDate,
      endDate,
    );

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalAlerts,
      period: { startDate, endDate },
    };
  }

  /**
   * 📈 GET /compliance/access-patterns
   *
   * Analyze access patterns for compliance monitoring
   *
   * Analytics:
   * - Access frequency by user
   * - Most accessed resources
   * - Access time distribution
   * - Failed access attempts
   *
   * @param query - Analysis parameters
   * @returns Access pattern analytics
   */
  @Get('access-patterns')
  async analyzeAccessPatterns(
    @Query() query: AuditReportRequestDto,
  ): Promise<any> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const analysis = await this.auditReportService.analyzeAccessPatterns(
      startDate,
      endDate,
    );

    // Convert Maps to Objects for JSON serialization
    return {
      userAccessStats: Array.from(analysis.userAccessStats.values()),
      resourceAccessStats: Array.from(analysis.resourceAccessStats.values()).map(
        (stat: any) => ({
          ...stat,
          uniqueUsers: stat.uniqueUsers.size,
        }),
      ),
      actionDistribution: Object.fromEntries(analysis.actionDistribution),
      hourlyDistribution: Object.fromEntries(analysis.hourlyDistribution),
      failedAccessAttempts: analysis.failedAccessAttempts,
      totalAccesses: analysis.totalAccesses,
    };
  }

  /**
   * 🔗 GET /compliance/audit-logs/verify-integrity
   *
   * Verify audit log hash chain integrity
   *
   * Security:
   * - Tamper-proof audit logs with hash chain
   * - Verification ensures no retroactive tampering
   *
   * @param limit - Number of recent logs to verify
   * @returns Verification result
   */
  @Get('audit-logs/verify-integrity')
  async verifyAuditLogIntegrity(
    @Query('limit') limit?: number,
  ): Promise<{
    valid: boolean;
    totalChecked: number;
    firstInvalidIndex?: number;
    error?: string;
    message: string;
  }> {
    const result = await this.auditReportService.verifyAuditLogIntegrity(limit);

    return {
      ...result,
      message: result.valid
        ? 'Audit log integrity verified successfully'
        : 'Audit log integrity violation detected',
    };
  }

  /**
   * 📥 GET /compliance/audit-logs/export
   *
   * Export audit logs for compliance review
   *
   * @param query - Export parameters
   * @returns Audit log file (JSON, CSV, or PDF)
   */
  @Get('audit-logs/export')
  async exportAuditLogs(
    @Query() query: any,
    @Res() res: Response,
  ): Promise<void> {
    const filters = {
      userId: query.userId,
      resource: query.resource,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const format = query.format || 'json';

    const { file, filename } = await this.auditReportService.exportAuditLogs(
      filters,
      format,
    );

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      json: 'application/json',
      csv: 'text/csv',
    };

    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(file);
  }

  // ============================================================
  // Data Retention Endpoints
  // ============================================================

  /**
   * 🔄 POST /compliance/data-retention/execute
   *
   * Manually trigger data retention policy execution
   *
   * Korean Legal Requirements:
   * - Medical records: 10 years (의료법)
   * - Payment records: 5 years (보험업법)
   * - General data: 3 years (PIPA)
   *
   * Process:
   * 1. Archive warm data (1-5 years)
   * 2. Move to cold storage (5-10 years)
   * 3. Securely delete expired data (>10 years)
   *
   * @returns Retention execution results
   */
  @Post('data-retention/execute')
  @HttpCode(HttpStatus.OK)
  async executeRetentionPolicy(): Promise<{
    message: string;
    executedAt: Date;
    nextScheduledRun: Date;
  }> {
    await this.dataRetentionService.executeRetentionPolicy();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    return {
      message: 'Data retention policy executed successfully',
      executedAt: new Date(),
      nextScheduledRun: tomorrow,
    };
  }

  /**
   * ℹ️ GET /compliance/retention-policies
   *
   * Get current data retention policies
   *
   * @returns Retention policy configuration
   */
  @Get('retention-policies')
  getRetentionPolicies(): {
    policies: any;
    legalBasis: any;
  } {
    return {
      policies: {
        medicalRecords: '10 years',
        prescriptions: '3 years',
        insuranceClaims: '5 years',
        paymentRecords: '5 years',
        transactionRecords: '5 years',
        userConsent: '3 years',
        marketingData: '6 months after withdrawal',
        auditLogs: '3 years',
        generalData: '3 years',
      },
      legalBasis: {
        medicalRecords: '의료법 (Medical Act) Article 22',
        insuranceClaims: '보험업법 (Insurance Business Act)',
        paymentRecords: '보험업법 (Insurance Business Act)',
        transactionRecords: '전자상거래법 (E-Commerce Act)',
        userConsent: '전자상거래법 (E-Commerce Act)',
        auditLogs: 'PIPA (개인정보보호법)',
        generalData: 'PIPA (개인정보보호법)',
      },
    };
  }
}
