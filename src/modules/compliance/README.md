# 🛡️ Compliance Module

Complete PIPA (개인정보보호법) compliance implementation for Pet-to-You API.

## 📋 Overview

This module provides comprehensive compliance features required by Korean data protection laws:

- **PIPA** (개인정보보호법) - Personal Information Protection Act
- **의료법** (Medical Act) - Medical data retention and protection
- **보험업법** (Insurance Business Act) - Financial record retention
- **전자상거래법** (E-Commerce Act) - Transaction record retention

## 🚀 Features

### 1. Data Export Service (PIPA Article 35)

**Right to Data Portability** - Users can export all their personal data.

#### Endpoints

```typescript
POST /compliance/data-export/:userId
Body: { format: "json" | "csv" }
Returns: ZIP archive download
```

#### What's Exported

- User Profile (name, email, phone, address)
- Pets (pet details, photos)
- Bookings (daycare, hospital appointments)
- Payments (transaction history)
- Medical Records (health notes, vaccinations - **decrypted**)
- Reviews (user reviews and ratings)
- Audit Logs (access history - recent 1000 entries)

#### Security

- Verify user identity before export
- Rate limiting: 3 exports per day per user
- Comprehensive audit trail
- Decrypt medical records for export

#### Example

```bash
curl -X POST http://localhost:3000/compliance/data-export/user-123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"format": "json"}' \
  --output user-data.zip
```

---

### 2. Breach Notification Service (PIPA Article 34)

**72-Hour Notification Requirement** - Report security incidents to authorities and users.

#### Endpoints

```typescript
POST /compliance/breach/report
Body: BreachReportDto
Returns: { incidentId, authoritiesNotified, usersNotified, reportUrl }
```

#### Korean Authorities Notified

1. **PIPC** (개인정보보호위원회) - Personal Information Protection Commission
   - All personal data breaches
   - Primary regulatory authority

2. **MOHW** (보건복지부) - Ministry of Health and Welfare
   - Medical data breaches
   - Healthcare-related incidents

3. **KISA** (한국인터넷진흥원) - Korea Internet & Security Agency
   - Technical incident response
   - Cybersecurity incidents

#### Notification Process

1. Create incident record
2. Assess severity and impact
3. Notify authorities within 72 hours
4. Notify affected users (email + SMS)
5. Document response measures
6. Generate incident report

#### Example

```bash
curl -X POST http://localhost:3000/compliance/breach/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "unauthorized_access",
    "description": "Unauthorized access detected to medical records database",
    "affectedDataTypes": ["diagnosis", "treatment", "prescription"],
    "affectedUserIds": ["user-123", "user-456"],
    "detectedBy": "Security Monitoring System",
    "severity": "high",
    "containmentStatus": "contained",
    "estimatedImpact": "Approximately 100 medical records accessed"
  }'
```

---

### 3. Audit Report Service (PIPA Article 30)

**Regular Audit Requirement** - Generate compliance reports and detect anomalies.

#### Endpoints

**Compliance Report**
```typescript
GET /compliance/audit-logs?startDate=2024-01-01&endDate=2024-12-31&format=pdf
Returns: PDF/JSON/CSV report
```

**Suspicious Activity Detection**
```typescript
GET /compliance/suspicious-activity?startDate=2024-01-01&endDate=2024-12-31
Returns: Array of suspicious activity alerts
```

**Access Pattern Analysis**
```typescript
GET /compliance/access-patterns?startDate=2024-01-01&endDate=2024-12-31
Returns: Access statistics and analytics
```

**Hash Chain Verification**
```typescript
GET /compliance/audit-logs/verify-integrity?limit=1000
Returns: { valid: true/false, totalChecked, ... }
```

**Export Audit Logs**
```typescript
GET /compliance/audit-logs/export?format=csv&startDate=2024-01-01
Returns: CSV/JSON/PDF file download
```

#### Anomaly Detection Rules

1. **Excessive Access**: >100 records in 1 hour
2. **Off-Hours Access**: Access between 2am-5am
3. **Failed Authorizations**: >5 failures in 10 minutes
4. **Bulk Data Access**: >1000 records in single query
5. **Geographic Anomalies**: Unusual IP locations

#### Example

```bash
# Generate compliance report
curl -X GET "http://localhost:3000/compliance/audit-logs?startDate=2024-01-01&endDate=2024-12-31&format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output compliance-report.pdf

# Detect suspicious activities
curl -X GET "http://localhost:3000/compliance/suspicious-activity?startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Data Retention Service

**Automated Retention Policy** - Enforce legal retention requirements.

#### Retention Policies

| Data Type | Retention Period | Legal Basis |
|-----------|-----------------|-------------|
| Medical Records | 10 years | 의료법 Article 22 |
| Prescriptions | 3 years | 의료법 Article 22 |
| Insurance Claims | 5 years | 보험업법 |
| Payment Records | 5 years | 보험업법 |
| Transaction Records | 5 years | 전자상거래법 |
| User Consent | 3 years | 전자상거래법 |
| Marketing Data | 6 months after withdrawal | 전자상거래법 |
| Audit Logs | 3 years | PIPA |
| General Data | 3 years | PIPA |

#### Archival Strategy

1. **Active Data** (0-1 year): Hot storage (Database)
2. **Warm Data** (1-5 years): Warm storage (Compressed DB or S3)
3. **Cold Data** (5-10 years): Cold storage (S3 Glacier)
4. **Expired Data** (>10 years): Secure deletion

#### Automated Execution

Cron job runs **daily at 2:00 AM**:

```typescript
@Cron(CronExpression.EVERY_DAY_AT_2AM)
async executeRetentionPolicy(): Promise<void>
```

#### Endpoints

**Manual Execution**
```typescript
POST /compliance/data-retention/execute
Returns: { message, executedAt, nextScheduledRun }
```

**View Retention Policies**
```typescript
GET /compliance/retention-policies
Returns: { policies, legalBasis }
```

#### Example

```bash
# Manually trigger retention policy
curl -X POST http://localhost:3000/compliance/data-retention/execute \
  -H "Authorization: Bearer YOUR_TOKEN"

# View retention policies
curl -X GET http://localhost:3000/compliance/retention-policies \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Installation

### 1. Install Dependencies

```bash
npm install archiver pdfkit @nestjs/schedule
```

### 2. Configure Environment Variables

Add to `.env`:

```env
# Data Protection Officer (DPO) Contact
DPO_NAME=Data Protection Officer
DPO_EMAIL=dpo@pet-to-you.com
DPO_PHONE=+82-2-1234-5678

# Security Officer Contact
SECURITY_OFFICER_NAME=Security Officer
SECURITY_OFFICER_EMAIL=security@pet-to-you.com
SECURITY_OFFICER_PHONE=+82-2-1234-5678

# Business Information
BUSINESS_NUMBER=123-45-67890
MEDICAL_FACILITY_LICENSE=MED-2024-12345

# Korean Authority API Endpoints
PIPC_NOTIFICATION_ENDPOINT=https://privacy.go.kr/api/breach-notification
PIPC_API_KEY=your_pipc_api_key

MOHW_NOTIFICATION_ENDPOINT=https://mohw.go.kr/api/medical-breach-notification
MOHW_API_KEY=your_mohw_api_key

KISA_NOTIFICATION_ENDPOINT=https://kisa.or.kr/api/incident-report
KISA_API_KEY=your_kisa_api_key
```

### 3. Database Migration

Run migrations to create compliance tables:

```bash
npm run migration:run
```

Tables created:
- `security_incidents`
- `data_retention_logs`

### 4. Import Module

Add to `app.module.ts`:

```typescript
import { ComplianceModule } from './modules/compliance/compliance.module';

@Module({
  imports: [
    // ... other modules
    ComplianceModule,
  ],
})
export class AppModule {}
```

---

## 📊 Database Schema

### Security Incidents

```sql
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  affected_data_types TEXT[] NOT NULL,
  affected_user_count INT DEFAULT 0,
  discovered_at TIMESTAMP NOT NULL,
  reported_at TIMESTAMP NOT NULL,
  detected_by VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  containment_status VARCHAR(20) NOT NULL,
  estimated_impact TEXT NOT NULL,
  authorities_notified BOOLEAN DEFAULT FALSE,
  authorities_notified_at TIMESTAMP,
  users_notified BOOLEAN DEFAULT FALSE,
  users_notified_at TIMESTAMP,
  users_notified_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'investigating',
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Data Retention Logs

```sql
CREATE TABLE data_retention_logs (
  id UUID PRIMARY KEY,
  record_type VARCHAR(100) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL,
  retention_policy VARCHAR(255) NOT NULL,
  storage_location VARCHAR(255),
  deletion_reason TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 🔒 Security Considerations

### Data Export

- ✅ Verify user identity before export
- ✅ Rate limiting (3 exports per day)
- ✅ Comprehensive audit logging
- ✅ Decrypt medical records securely
- ✅ Generate tamper-proof archives

### Breach Notification

- ✅ 72-hour notification deadline tracking
- ✅ Encrypted notification channels
- ✅ Tamper-proof incident logs
- ✅ Secure credential management
- ✅ Multi-channel user notification (email + SMS)

### Audit Reports

- ✅ Hash chain integrity verification
- ✅ Anomaly detection algorithms
- ✅ Access pattern analysis
- ✅ Suspicious activity alerts
- ✅ Export with access controls

### Data Retention

- ✅ Automated archival workflows
- ✅ Secure deletion (overwrite + audit)
- ✅ Legal hold capability
- ✅ Compliance verification
- ✅ Cold storage integration (S3 Glacier)

---

## 📈 Performance Optimization

### Data Export

- **Parallel Processing**: Collect data from all modules concurrently
- **Streaming**: Stream large archives to avoid memory issues
- **Caching**: Cache frequently exported data (5-minute TTL)
- **Batch Processing**: Process large datasets in batches

### Breach Notification

- **Async Notifications**: Send notifications asynchronously
- **Retry Logic**: Exponential backoff for failed notifications
- **Circuit Breaker**: Prevent cascading failures
- **Batch User Notifications**: Group user notifications for efficiency

### Audit Reports

- **Indexed Queries**: Database indexes on timestamp, userId, resource
- **Aggregation**: Pre-aggregate statistics for common queries
- **Pagination**: Paginate large result sets
- **Background Processing**: Generate large reports in background

### Data Retention

- **Batch Processing**: Process data in batches (1000 records per batch)
- **Off-Peak Execution**: Run at 2am to minimize impact
- **Incremental Archival**: Archive incrementally, not all at once
- **Parallel Workers**: Use multiple workers for large datasets

---

## 🧪 Testing

### Unit Tests

```bash
npm run test compliance
```

### Integration Tests

```bash
npm run test:e2e compliance
```

### Manual Testing

```bash
# Test data export
curl -X POST http://localhost:3000/compliance/data-export/user-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"format": "json"}' \
  --output test-export.zip

# Test breach notification
curl -X POST http://localhost:3000/compliance/breach/report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @breach-test-payload.json

# Test audit report
curl -X GET "http://localhost:3000/compliance/audit-logs?format=json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test retention execution
curl -X POST http://localhost:3000/compliance/data-retention/execute \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Legal References

### PIPA (개인정보보호법)

- **Article 30**: Regular security audits
- **Article 34**: Breach notification within 72 hours
- **Article 35**: Right to data portability
- **Article 36**: Right to data access

### 의료법 (Medical Act)

- **Article 22**: Medical records retention (10 years)
- **Article 19**: Purpose documentation for medical data access

### 보험업법 (Insurance Business Act)

- Insurance claims retention (5 years)
- Payment records retention (5 years)

### 전자상거래법 (E-Commerce Act)

- Transaction records retention (5 years)
- User consent retention (3 years)
- Marketing data retention (6 months after withdrawal)

---

## 🛠️ Troubleshooting

### Export Fails with "Rate Limit Exceeded"

**Issue**: User has exceeded 3 exports per day.

**Solution**: Wait until tomorrow or contact support to increase limit.

### Breach Notification Fails

**Issue**: Authority API endpoints are unreachable.

**Solution**:
1. Check API credentials in `.env`
2. Verify network connectivity
3. Check authority API status
4. Implement retry logic with exponential backoff

### Audit Report Shows "Hash Chain Broken"

**Issue**: Audit logs have been tampered with.

**Solution**:
1. Immediately investigate security breach
2. Identify when tampering occurred
3. Restore from backup if available
4. Report incident to authorities

### Retention Policy Not Executing

**Issue**: Cron job not running.

**Solution**:
1. Verify ScheduleModule is imported
2. Check application logs for cron errors
3. Manually trigger with `/compliance/data-retention/execute`
4. Ensure database connection is stable

---

## 📞 Support

For compliance-related questions or issues:

- **Data Protection Officer**: dpo@pet-to-you.com
- **Security Officer**: security@pet-to-you.com
- **Technical Support**: support@pet-to-you.com

---

## 📝 License

Copyright © 2024 Pet-to-You Co., Ltd. All rights reserved.

This compliance module is proprietary software and is subject to Korean data protection laws.
