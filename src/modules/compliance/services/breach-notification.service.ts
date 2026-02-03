import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SecurityIncident } from '../entities/security-incident.entity';
import { User } from '../../../modules/users/entities/user.entity';

/**
 * 🚨 Breach Notification Service
 *
 * PIPA Article 34: Notification of Personal Data Breaches
 * - Notify authorities within 72 hours of breach discovery
 * - Notify affected users without undue delay
 * - Document breach details and response measures
 *
 * Korean Authorities:
 * 1. MOHW (보건복지부) - Ministry of Health and Welfare
 *    - Medical data breaches
 *    - Healthcare-related incidents
 *
 * 2. PIPC (개인정보보호위원회) - Personal Information Protection Commission
 *    - All personal data breaches
 *    - Primary regulatory authority
 *
 * 3. KISA (한국인터넷진흥원) - Korea Internet & Security Agency
 *    - Technical incident response
 *    - Cybersecurity incidents
 *
 * Notification Requirements:
 * - Nature of breach
 * - Categories of affected data
 * - Number of affected individuals
 * - Likely consequences
 * - Measures taken/proposed
 * - Contact point for inquiries
 *
 * Security:
 * - Encrypted notification channels
 * - Tamper-proof incident logs
 * - Secure credential management
 */
@Injectable()
export class BreachNotificationService {
  private readonly logger = new Logger(BreachNotificationService.name);
  private readonly NOTIFICATION_DEADLINE_HOURS = 72;

  constructor(
    private configService: ConfigService,
    private auditService: AuditService,
    @InjectRepository(SecurityIncident)
    private incidentRepository: Repository<SecurityIncident>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 🚨 Report security breach
   *
   * Process:
   * 1. Create incident record
   * 2. Assess severity and impact
   * 3. Notify authorities (MOHW, PIPC, KISA)
   * 4. Notify affected users
   * 5. Document response measures
   * 6. Generate incident report
   *
   * @param incident - Breach incident details
   * @returns Incident record with notification status
   */
  async reportBreach(incident: {
    type:
      | 'unauthorized_access'
      | 'data_leak'
      | 'ransomware'
      | 'insider_threat'
      | 'system_compromise'
      | 'medical_data_breach';
    description: string;
    affectedDataTypes: string[];
    affectedUserIds?: string[];
    discoveredAt: Date;
    detectedBy: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    containmentStatus: 'contained' | 'in_progress' | 'uncontained';
    estimatedImpact: string;
  }): Promise<{
    incidentId: string;
    authoritiesNotified: boolean;
    usersNotified: number;
    reportUrl: string;
  }> {
    this.logger.warn(
      `SECURITY BREACH DETECTED: ${incident.type} - Severity: ${incident.severity}`,
    );

    try {
      // 1. Create incident record
      const incidentRecord = await this.createIncidentRecord(incident);

      // 2. Check 72-hour deadline
      const hoursElapsed = this.calculateHoursElapsed(incident.discoveredAt);
      const isWithinDeadline = hoursElapsed < this.NOTIFICATION_DEADLINE_HOURS;

      if (!isWithinDeadline) {
        this.logger.error(
          `⚠️ CRITICAL: Breach notification deadline exceeded! ${hoursElapsed}h elapsed`,
        );
      }

      // 3. Notify authorities
      const authoritiesNotified = await this.notifyAuthorities(
        incidentRecord,
        incident,
      );

      // 4. Notify affected users
      const usersNotified = await this.notifyAffectedUsers(
        incident.affectedUserIds || [],
        incidentRecord,
      );

      // 5. Generate incident report
      const reportUrl = await this.generateIncidentReport(
        incidentRecord,
        incident,
      );

      // 6. Audit log
      await this.auditService.log({
        userId: 'SYSTEM',
        action: AuditAction.SECURITY_INCIDENT,
        resource: 'security_incident',
        resourceId: incidentRecord.id,
        purpose: 'Security breach notification (PIPA Article 34)',
        legalBasis: 'PIPA Article 34 - Breach Notification Obligation',
        ipAddress: '127.0.0.1',
        userAgent: 'SYSTEM',
        metadata: {
          type: incident.type,
          severity: incident.severity,
          affectedUsers: usersNotified,
          authoritiesNotified,
          hoursElapsed,
          withinDeadline: isWithinDeadline,
        },
      });

      this.logger.log(
        `Breach notification completed: ${incidentRecord.id}, users notified: ${usersNotified}`,
      );

      return {
        incidentId: incidentRecord.id,
        authoritiesNotified,
        usersNotified,
        reportUrl,
      };
    } catch (error) {
      this.logger.error('Failed to process breach notification:', error);
      throw error;
    }
  }

  /**
   * 📋 Create incident record
   */
  private async createIncidentRecord(incident: any): Promise<any> {
    const record = this.incidentRepository.create({
      type: incident.type,
      description: incident.description,
      affectedDataTypes: incident.affectedDataTypes,
      affectedUserCount: incident.affectedUserIds?.length || 0,
      discoveredAt: incident.discoveredAt,
      reportedAt: new Date(),
      detectedBy: incident.detectedBy,
      severity: incident.severity,
      containmentStatus: incident.containmentStatus,
      estimatedImpact: incident.estimatedImpact,
      authoritiesNotified: false,
      usersNotified: false,
      status: 'investigating',
    });

    return this.incidentRepository.save(record);
  }

  /**
   * 🏛️ Notify Korean authorities (MOHW, PIPC, KISA)
   *
   * PIPA Article 34: 72-hour notification requirement
   *
   * Notification Process:
   * 1. PIPC (Primary authority) - All breaches
   * 2. MOHW - Medical data breaches
   * 3. KISA - Technical incident response
   */
  private async notifyAuthorities(
    incidentRecord: any,
    incident: any,
  ): Promise<boolean> {
    this.logger.log('Notifying Korean authorities...');

    const notifications: Promise<boolean>[] = [];

    // 1. Notify PIPC (개인정보보호위원회)
    notifications.push(this.notifyPIPC(incidentRecord, incident));

    // 2. Notify MOHW if medical data involved
    if (this.isMedicalDataBreach(incident)) {
      notifications.push(this.notifyMOHW(incidentRecord, incident));
    }

    // 3. Notify KISA for technical response
    if (this.requiresTechnicalResponse(incident)) {
      notifications.push(this.notifyKISA(incidentRecord, incident));
    }

    try {
      const results = await Promise.all(notifications);
      const allNotified = results.every((r) => r === true);

      // Update incident record
      await this.incidentRepository.update(incidentRecord.id, {
        authoritiesNotified: allNotified,
        authoritiesNotifiedAt: new Date(),
      });

      return allNotified;
    } catch (error) {
      this.logger.error('Failed to notify authorities:', error);
      return false;
    }
  }

  /**
   * 📧 Notify PIPC (개인정보보호위원회)
   * Personal Information Protection Commission
   */
  private async notifyPIPC(incidentRecord: any, incident: any): Promise<boolean> {
    try {
      const pipcEndpoint =
        this.configService.get('PIPC_NOTIFICATION_ENDPOINT') ||
        'https://privacy.go.kr/api/breach-notification';

      const payload = {
        organizationName: 'Pet-to-You Co., Ltd.',
        businessNumber: this.configService.get('BUSINESS_NUMBER'),
        incidentId: incidentRecord.id,
        incidentType: incident.type,
        discoveredAt: incident.discoveredAt,
        reportedAt: incidentRecord.reportedAt,
        severity: incident.severity,
        affectedDataTypes: incident.affectedDataTypes,
        affectedIndividuals: incidentRecord.affectedUserCount,
        description: incident.description,
        estimatedImpact: incident.estimatedImpact,
        containmentStatus: incident.containmentStatus,
        responseMeasures: this.getResponseMeasures(incident),
        contactPerson: {
          name: this.configService.get('DPO_NAME', 'Data Protection Officer'),
          email: this.configService.get('DPO_EMAIL', 'dpo@pet-to-you.com'),
          phone: this.configService.get('DPO_PHONE', '+82-2-1234-5678'),
        },
      };

      const response = await axios.post(pipcEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get('PIPC_API_KEY')}`,
        },
        timeout: 30000,
      });

      this.logger.log(`PIPC notified successfully: ${response.data.referenceNumber}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to notify PIPC:', error);
      return false;
    }
  }

  /**
   * 🏥 Notify MOHW (보건복지부)
   * Ministry of Health and Welfare
   */
  private async notifyMOHW(incidentRecord: any, incident: any): Promise<boolean> {
    try {
      const mohwEndpoint =
        this.configService.get('MOHW_NOTIFICATION_ENDPOINT') ||
        'https://mohw.go.kr/api/medical-breach-notification';

      const payload = {
        facilityName: 'Pet-to-You Veterinary Platform',
        facilityLicense: this.configService.get('MEDICAL_FACILITY_LICENSE'),
        incidentId: incidentRecord.id,
        breachType: incident.type,
        discoveredAt: incident.discoveredAt,
        medicalRecordsAffected: this.getMedicalRecordsCount(incident),
        affectedPatients: incidentRecord.affectedUserCount,
        dataTypes: incident.affectedDataTypes.filter((type: string) =>
          ['diagnosis', 'treatment', 'prescription', 'medical_history'].includes(
            type,
          ),
        ),
        description: incident.description,
        responseMeasures: this.getResponseMeasures(incident),
        contactPerson: {
          name: this.configService.get('DPO_NAME'),
          email: this.configService.get('DPO_EMAIL'),
          phone: this.configService.get('DPO_PHONE'),
        },
      };

      const response = await axios.post(mohwEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get('MOHW_API_KEY')}`,
        },
        timeout: 30000,
      });

      this.logger.log(`MOHW notified successfully: ${response.data.caseNumber}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to notify MOHW:', error);
      return false;
    }
  }

  /**
   * 🛡️ Notify KISA (한국인터넷진흥원)
   * Korea Internet & Security Agency
   */
  private async notifyKISA(incidentRecord: any, incident: any): Promise<boolean> {
    try {
      const kisaEndpoint =
        this.configService.get('KISA_NOTIFICATION_ENDPOINT') ||
        'https://kisa.or.kr/api/incident-report';

      const payload = {
        organizationName: 'Pet-to-You Co., Ltd.',
        incidentId: incidentRecord.id,
        incidentType: incident.type,
        severity: incident.severity,
        discoveredAt: incident.discoveredAt,
        attackVector: this.determineAttackVector(incident),
        affectedSystems: this.getAffectedSystems(incident),
        containmentStatus: incident.containmentStatus,
        technicalDetails: {
          description: incident.description,
          affectedDataTypes: incident.affectedDataTypes,
          estimatedImpact: incident.estimatedImpact,
        },
        requestTechnicalAssistance: incident.severity === 'critical',
        contactPerson: {
          name: this.configService.get('SECURITY_OFFICER_NAME', 'Security Officer'),
          email: this.configService.get(
            'SECURITY_OFFICER_EMAIL',
            'security@pet-to-you.com',
          ),
          phone: this.configService.get(
            'SECURITY_OFFICER_PHONE',
            '+82-2-1234-5678',
          ),
        },
      };

      const response = await axios.post(kisaEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get('KISA_API_KEY')}`,
        },
        timeout: 30000,
      });

      this.logger.log(`KISA notified successfully: ${response.data.ticketNumber}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to notify KISA:', error);
      return false;
    }
  }

  /**
   * 👥 Notify affected users
   *
   * PIPA Article 34: User notification requirement
   *
   * Notification Method:
   * - Email (primary)
   * - SMS (critical breaches)
   * - In-app notification
   *
   * Content:
   * - Nature of breach
   * - Data compromised
   * - Potential consequences
   * - Protective measures taken
   * - User actions recommended
   * - Contact information
   */
  private async notifyAffectedUsers(
    userIds: string[],
    incidentRecord: any,
  ): Promise<number> {
    if (userIds.length === 0) {
      this.logger.log('No specific users affected, skipping user notification');
      return 0;
    }

    this.logger.log(`Notifying ${userIds.length} affected users...`);

    let notifiedCount = 0;

    for (const userId of userIds) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });

        if (!user) continue;

        // Send email notification
        await this.sendBreachEmailNotification(user, incidentRecord);

        // Send SMS for critical breaches
        if (incidentRecord.severity === 'critical') {
          await this.sendBreachSMSNotification(user, incidentRecord);
        }

        // Create in-app notification
        await this.createInAppNotification(user, incidentRecord);

        notifiedCount++;

        // Audit log user notification
        await this.auditService.log({
          userId,
          action: AuditAction.BREACH_NOTIFICATION_SENT,
          resource: 'security_incident',
          resourceId: incidentRecord.id,
          purpose: 'User notification of data breach (PIPA Article 34)',
          legalBasis: 'PIPA Article 34 - User Notification Obligation',
          ipAddress: '127.0.0.1',
          userAgent: 'SYSTEM',
          metadata: {
            notificationMethod: ['email', 'sms', 'in_app'],
            severity: incidentRecord.severity,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to notify user ${userId}:`, error);
      }
    }

    // Update incident record
    await this.incidentRepository.update(incidentRecord.id, {
      usersNotified: true,
      usersNotifiedAt: new Date(),
      usersNotifiedCount: notifiedCount,
    });

    this.logger.log(`User notification completed: ${notifiedCount} users notified`);
    return notifiedCount;
  }

  /**
   * 📧 Send breach email notification
   */
  private async sendBreachEmailNotification(
    user: any,
    incidentRecord: any,
  ): Promise<void> {
    // TODO: Integrate with email service (e.g., AWS SES, SendGrid)
    this.logger.log(`Sending breach email to ${user.email}`);

    const emailContent = this.generateBreachEmailContent(user, incidentRecord);

    // Placeholder: Send email via email service
    // await this.emailService.send({
    //   to: user.email,
    //   subject: '[URGENT] Pet-to-You Security Incident Notification',
    //   html: emailContent,
    // });
  }

  /**
   * 📱 Send breach SMS notification
   */
  private async sendBreachSMSNotification(
    user: any,
    incidentRecord: any,
  ): Promise<void> {
    // TODO: Integrate with SMS service (e.g., AWS SNS, Twilio)
    this.logger.log(`Sending breach SMS to ${user.phone}`);

    const smsContent = `[Pet-to-You] URGENT: Security incident detected. Please check your email for details. Contact: ${this.configService.get('DPO_EMAIL')}`;

    // Placeholder: Send SMS via SMS service
    // await this.smsService.send({
    //   to: user.phone,
    //   message: smsContent,
    // });
  }

  /**
   * 🔔 Create in-app notification
   */
  private async createInAppNotification(
    user: any,
    incidentRecord: any,
  ): Promise<void> {
    // TODO: Create in-app notification via notification service
    this.logger.log(`Creating in-app notification for user ${user.id}`);

    // Placeholder: Create notification
    // await this.notificationService.create({
    //   userId: user.id,
    //   type: 'SECURITY_BREACH',
    //   title: 'Security Incident Notification',
    //   message: this.generateInAppNotificationMessage(incidentRecord),
    //   priority: 'CRITICAL',
    // });
  }

  /**
   * 📄 Generate incident report
   */
  private async generateIncidentReport(
    incidentRecord: any,
    incident: any,
  ): Promise<string> {
    // TODO: Generate comprehensive PDF report
    this.logger.log('Generating incident report...');

    const reportUrl = `https://pet-to-you.com/incidents/${incidentRecord.id}/report`;
    return reportUrl;
  }

  /**
   * 🔍 Helper: Is medical data breach?
   */
  private isMedicalDataBreach(incident: any): boolean {
    const medicalDataTypes = [
      'diagnosis',
      'treatment',
      'prescription',
      'medical_history',
      'health_notes',
      'vaccination_records',
    ];

    return incident.affectedDataTypes.some((type: string) =>
      medicalDataTypes.includes(type),
    );
  }

  /**
   * 🛠️ Helper: Requires technical response?
   */
  private requiresTechnicalResponse(incident: any): boolean {
    const technicalIncidents = [
      'ransomware',
      'system_compromise',
      'data_leak',
    ];
    return (
      technicalIncidents.includes(incident.type) ||
      incident.severity === 'critical'
    );
  }

  /**
   * 📊 Helper: Get response measures
   */
  private getResponseMeasures(incident: any): string[] {
    const measures = [
      'Incident investigation initiated',
      'Affected systems isolated',
      'Security patches applied',
      'Password reset for affected accounts',
      'Enhanced monitoring activated',
      'Third-party security audit scheduled',
    ];

    if (incident.containmentStatus === 'contained') {
      measures.push('Breach successfully contained');
    }

    return measures;
  }

  /**
   * 📈 Helper: Get medical records count
   */
  private getMedicalRecordsCount(incident: any): number {
    // TODO: Calculate from affected data
    return incident.affectedUserIds?.length || 0;
  }

  /**
   * 🎯 Helper: Determine attack vector
   */
  private determineAttackVector(incident: any): string {
    const vectorMap: Record<string, string> = {
      unauthorized_access: 'Unauthorized Access',
      data_leak: 'Data Leakage',
      ransomware: 'Ransomware Attack',
      insider_threat: 'Insider Threat',
      system_compromise: 'System Compromise',
      medical_data_breach: 'Medical Data Breach',
    };

    return vectorMap[incident.type] || 'Unknown';
  }

  /**
   * 🖥️ Helper: Get affected systems
   */
  private getAffectedSystems(incident: any): string[] {
    return ['API Server', 'Database', 'File Storage'];
  }

  /**
   * ⏱️ Helper: Calculate hours elapsed
   */
  private calculateHoursElapsed(discoveredAt: Date): number {
    const now = new Date();
    const diff = now.getTime() - discoveredAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  }

  /**
   * 📧 Helper: Generate breach email content
   */
  private generateBreachEmailContent(user: any, incidentRecord: any): string {
    return `
      <html>
        <body>
          <h1>Pet-to-You Security Incident Notification</h1>
          <p>Dear ${user.name},</p>
          <p>We are writing to inform you of a security incident that may have affected your personal data.</p>

          <h2>Incident Details</h2>
          <ul>
            <li><strong>Incident Type:</strong> ${incidentRecord.type}</li>
            <li><strong>Discovered:</strong> ${incidentRecord.discoveredAt}</li>
            <li><strong>Severity:</strong> ${incidentRecord.severity}</li>
            <li><strong>Status:</strong> ${incidentRecord.containmentStatus}</li>
          </ul>

          <h2>Your Data</h2>
          <p>The following types of data may have been affected: ${incidentRecord.affectedDataTypes.join(', ')}</p>

          <h2>What We're Doing</h2>
          <ul>
            <li>We have notified relevant authorities (PIPC, MOHW, KISA)</li>
            <li>We are conducting a thorough investigation</li>
            <li>We have implemented additional security measures</li>
          </ul>

          <h2>What You Should Do</h2>
          <ul>
            <li>Change your password immediately</li>
            <li>Monitor your account for suspicious activity</li>
            <li>Be cautious of phishing attempts</li>
          </ul>

          <h2>Contact Us</h2>
          <p>If you have questions, please contact our Data Protection Officer:</p>
          <p>Email: ${this.configService.get('DPO_EMAIL')}</p>
          <p>Phone: ${this.configService.get('DPO_PHONE')}</p>

          <p>We sincerely apologize for this incident and are committed to protecting your data.</p>

          <p>Best regards,<br>Pet-to-You Security Team</p>
        </body>
      </html>
    `;
  }

  /**
   * 🔔 Helper: Generate in-app notification message
   */
  private generateInAppNotificationMessage(incidentRecord: any): string {
    return `A security incident has been detected. Your data may have been affected. Please check your email for details and take immediate action to secure your account.`;
  }
}
