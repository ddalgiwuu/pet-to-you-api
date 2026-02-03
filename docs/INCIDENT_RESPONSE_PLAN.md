# 🚨 Security Incident Response Plan

**Classification**: CONFIDENTIAL
**Owner**: Security Team
**Last Updated**: 2026-01-29
**Review Cycle**: Semi-annual

---

## 1. Incident Classification

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 - Critical** | Active data breach, system compromise | < 15 minutes | Database breach, ransomware, mass data exposure |
| **P1 - High** | Potential breach, significant vulnerability | < 1 hour | Suspected unauthorized access, vulnerability exploit |
| **P2 - Medium** | Security incident, limited impact | < 4 hours | Failed authentication spike, suspicious activity |
| **P3 - Low** | Security event, monitoring required | < 24 hours | Policy violation, configuration issue |

---

## 2. Incident Response Team

### Core Team

| Role | Name | Primary Phone | Email | Responsibilities |
|------|------|---------------|-------|------------------|
| **Incident Commander** | [CTO] | +82-10-xxxx-xxxx | cto@pettoyou.com | Overall coordination, executive decisions |
| **Security Lead** | [Name] | +82-10-xxxx-xxxx | security@pettoyou.com | Technical investigation, remediation |
| **DevOps Lead** | [Name] | +82-10-xxxx-xxxx | devops@pettoyou.com | Infrastructure, containment |
| **Legal Counsel** | [Name] | +82-2-xxxx-xxxx | legal@pettoyou.com | Legal compliance, notifications |
| **PR/Communications** | [Name] | +82-10-xxxx-xxxx | pr@pettoyou.com | External communications |
| **DPO** | [Name] | +82-10-xxxx-xxxx | dpo@pettoyou.com | PIPA compliance, user notifications |

### Extended Team (On-Call)

- Backend Developers (2)
- Frontend Developers (1)
- Database Administrator (1)
- Cloud Infrastructure Engineer (1)

---

## 3. Incident Response Phases

### Phase 1: Detection & Initial Response (0-15 minutes)

**Trigger Events**:
- Automated security alerts
- Unusual audit log patterns
- User reports of suspicious activity
- External notification (security researcher, customer)

**Immediate Actions**:

1. **Alert Verification** (< 5 min)
   - [ ] Confirm alert is genuine (not false positive)
   - [ ] Identify affected systems/data
   - [ ] Assign severity level (P0-P3)
   - [ ] Page Incident Commander

2. **Initial Assessment** (< 10 min)
   - [ ] Document incident start time
   - [ ] Create incident ticket (JIRA/Confluence)
   - [ ] Assemble response team based on severity
   - [ ] Open war room (physical/Slack channel)

3. **Communication** (< 15 min)
   - [ ] Notify core response team
   - [ ] Brief Incident Commander
   - [ ] Activate communication protocols

**Decision Point**: Proceed to containment or escalate to executive team?

---

### Phase 2: Containment (15 min - 4 hours)

**Objective**: Prevent further damage while preserving evidence.

#### P0 Critical Containment (< 30 min)

**For Data Breach**:
- [ ] Isolate affected systems (firewall rules)
- [ ] Revoke all active user sessions
- [ ] Rotate all API keys and secrets
- [ ] Enable read-only mode for affected databases
- [ ] Block suspicious IP addresses
- [ ] Capture memory dumps and disk images (forensics)

**For Ransomware**:
- [ ] Isolate infected systems immediately
- [ ] Disable network shares and backups
- [ ] Snapshot all systems before taking any action
- [ ] Do NOT pay ransom (company policy)
- [ ] Contact law enforcement (cybercrime unit)

**For SQL Injection / Remote Code Execution**:
- [ ] Take affected application offline
- [ ] Deploy WAF rules to block attack patterns
- [ ] Review recent application logs (last 72 hours)
- [ ] Identify data accessed/modified
- [ ] Patch vulnerability immediately

#### P1 High Containment (< 2 hours)

**For Unauthorized Access**:
- [ ] Lock compromised user accounts
- [ ] Review access logs for lateral movement
- [ ] Change passwords for affected accounts
- [ ] Review and revoke API tokens
- [ ] Enable enhanced monitoring

**For Vulnerability Exploitation**:
- [ ] Deploy temporary mitigation (WAF rule, rate limit)
- [ ] Isolate vulnerable service if possible
- [ ] Begin patch development
- [ ] Monitor for exploitation attempts

#### Evidence Preservation

**Critical**: Preserve all evidence before containment actions.

```bash
# Capture system state
systemctl status --all > /tmp/services-$(date +%s).log
ps aux > /tmp/processes-$(date +%s).log
netstat -tulpn > /tmp/network-$(date +%s).log

# Capture database state
pg_dump pettoyou_db > /tmp/db-snapshot-$(date +%s).sql

# Capture application logs
cp -r /var/log/pettoyou /tmp/logs-backup-$(date +%s)

# Capture Redis state
redis-cli --rdb /tmp/redis-dump-$(date +%s).rdb

# Archive and preserve
tar -czf /secure-storage/incident-evidence-$(date +%s).tar.gz /tmp/*-$(date +%s)*
```

---

### Phase 3: Eradication (4 hours - 2 days)

**Objective**: Remove threat completely and close vulnerabilities.

#### Root Cause Analysis

1. **Identify Attack Vector**
   - [ ] Review application logs
   - [ ] Review web server logs
   - [ ] Review firewall logs
   - [ ] Review audit logs
   - [ ] Analyze malware samples (if applicable)

2. **Determine Scope**
   - [ ] List all compromised systems
   - [ ] List all accessed data
   - [ ] Identify persistence mechanisms
   - [ ] Timeline reconstruction

3. **Vulnerability Analysis**
   - [ ] Identify exploited vulnerability
   - [ ] Check for similar vulnerabilities
   - [ ] Review security controls that failed

#### Threat Removal

- [ ] Remove malware/backdoors
- [ ] Close exploited vulnerabilities (patch)
- [ ] Remove unauthorized accounts/access
- [ ] Rebuild compromised systems from clean backups
- [ ] Update firewall rules
- [ ] Rotate all credentials (passwords, keys, tokens)

#### Verification

- [ ] Scan systems for residual threats
- [ ] Verify patches applied
- [ ] Test security controls
- [ ] Confirm no unauthorized access remains

---

### Phase 4: Recovery (2 days - 1 week)

**Objective**: Restore normal operations safely.

#### System Recovery

1. **Staged Rollout**
   - [ ] Restore systems in isolated environment first
   - [ ] Test functionality thoroughly
   - [ ] Verify security controls working
   - [ ] Monitor for 24 hours before full rollout

2. **Data Recovery**
   - [ ] Restore from clean, verified backups
   - [ ] Validate data integrity
   - [ ] Test application functionality
   - [ ] Verify encryption working

3. **Security Enhancements**
   - [ ] Implement additional monitoring
   - [ ] Deploy new security controls
   - [ ] Update security policies
   - [ ] Conduct security scan

#### Service Restoration

- [ ] Restore services in priority order:
  1. Authentication/Authorization
  2. Medical records access (read-only)
  3. Hospital dashboard (limited functionality)
  4. Full patient application
  5. Payment processing
  6. Auto-claim system

- [ ] Monitor closely for 72 hours
- [ ] Maintain enhanced logging
- [ ] Daily security scans

---

### Phase 5: Post-Incident Activities (1 week - 1 month)

#### Mandatory Notifications (PIPA Article 30)

**Within 24 hours of discovery**:

1. **Korea Internet & Security Agency (KISA)**
   - [ ] Report via KISA incident reporting system
   - [ ] Provide: Date, time, scope, affected users, actions taken
   - [ ] Contact: 118 (cyber crime hotline)

2. **Affected Users** (if PII compromised)
   - [ ] Email notification (using approved template)
   - [ ] In-app notification
   - [ ] FAQ page on website
   - [ ] Provide: What happened, what data, remediation, support contact

3. **Insurance Provider** (if covered)
   - [ ] Cyber insurance claim notification
   - [ ] Provide incident report

**Notification Template** (Email):

```
Subject: [Pet-to-You] Important Security Notice

Dear [User Name],

We are writing to inform you of a security incident that may have affected your personal information.

What Happened:
On [DATE], we discovered [BRIEF DESCRIPTION]. We immediately took action to [CONTAINMENT ACTIONS].

What Information Was Involved:
[LIST: e.g., name, email, medical records (encrypted), etc.]

What We Are Doing:
[REMEDIATION ACTIONS: patches, monitoring, etc.]

What You Should Do:
- Change your Pet-to-You password immediately
- Monitor your account for suspicious activity
- [OTHER SPECIFIC ACTIONS]

We sincerely apologize for this incident and any concern it may cause.

For questions or support:
- Email: security@pettoyou.com
- Phone: +82-2-xxxx-xxxx
- FAQ: https://pettoyou.com/security-incident-faq

Sincerely,
Pet-to-You Security Team
```

#### Root Cause Analysis Report

**Required Sections**:

1. Executive Summary
2. Incident Timeline (minute-by-minute)
3. Attack Vector Analysis
4. Affected Systems and Data
5. Containment Actions Taken
6. Eradication Steps
7. Recovery Process
8. Lessons Learned
9. Preventive Measures
10. Long-term Recommendations

#### Security Improvements

- [ ] Implement fixes for identified gaps
- [ ] Update security policies
- [ ] Conduct security training
- [ ] Update incident response plan
- [ ] Improve monitoring/detection

#### Team Debrief

- [ ] What went well?
- [ ] What could be improved?
- [ ] Were roles clear?
- [ ] Were tools adequate?
- [ ] Documentation complete?

---

## 4. Specific Incident Playbooks

### 4.1 Database Breach Playbook

**Indicators**:
- Unauthorized database connections
- Unusual query patterns
- Data exfiltration detected
- SQL injection attempts in logs

**Immediate Actions**:
1. [ ] Isolate database (firewall rules)
2. [ ] Kill suspicious connections
3. [ ] Enable query logging (if not already)
4. [ ] Rotate database credentials
5. [ ] Review recent backups for integrity

**Investigation**:
1. [ ] Review pg_stat_activity for suspicious queries
2. [ ] Check audit logs for unauthorized access
3. [ ] Analyze slow query log for injection attempts
4. [ ] Review user privilege changes

**Remediation**:
1. [ ] Patch SQL injection vulnerability
2. [ ] Implement WAF rules
3. [ ] Enhance database monitoring
4. [ ] Rotate all application credentials
5. [ ] Consider data re-encryption with new keys

---

### 4.2 Ransomware Playbook

**Indicators**:
- File encryption in progress
- Ransom note files
- Unusual disk activity
- Backup deletion attempts

**Immediate Actions** (< 5 minutes):
1. [ ] **DO NOT** shut down infected systems (preserves memory)
2. [ ] Isolate infected systems (network only)
3. [ ] Disable all scheduled backups
4. [ ] Snapshot running systems (for forensics)
5. [ ] Contact law enforcement

**DO NOT**:
- Pay ransom (company policy)
- Negotiate with attackers
- Decrypt files with attacker's tool

**Recovery**:
1. [ ] Wipe infected systems completely
2. [ ] Restore from clean, verified backups
3. [ ] Patch vulnerability that allowed entry
4. [ ] Implement EDR solution
5. [ ] Conduct full security audit

---

### 4.3 Credential Theft Playbook

**Indicators**:
- Login from unusual locations
- Multiple failed login attempts
- Session hijacking detected
- Credential stuffing attacks

**Immediate Actions**:
1. [ ] Force logout all sessions
2. [ ] Rotate JWT signing keys
3. [ ] Invalidate all refresh tokens
4. [ ] Enable MFA for all users (if not already)
5. [ ] Monitor for continued attempts

**Investigation**:
1. [ ] Review authentication logs
2. [ ] Check for password database breaches
3. [ ] Analyze login patterns
4. [ ] Check for phishing campaigns

**Remediation**:
1. [ ] Force password reset for affected users
2. [ ] Implement rate limiting on auth endpoints
3. [ ] Deploy CAPTCHA
4. [ ] Educate users about phishing
5. [ ] Consider implementing WebAuthn

---

### 4.4 XSS/Injection Attack Playbook

**Indicators**:
- Suspicious scripts in medical records
- Malicious payloads in logs
- User reports of unusual behavior
- WAF alerts

**Immediate Actions**:
1. [ ] Deploy WAF rule to block pattern
2. [ ] Sanitize affected data
3. [ ] Review all user-generated content
4. [ ] Patch vulnerable endpoint

**Investigation**:
1. [ ] Identify injection point
2. [ ] Review affected user sessions
3. [ ] Check for data exfiltration
4. [ ] Analyze attack payloads

**Remediation**:
1. [ ] Implement input sanitization
2. [ ] Deploy CSP headers
3. [ ] Conduct code review of all input handlers
4. [ ] Add automated XSS testing

---

## 5. Communication Templates

### Internal Alert (Slack)

```
@channel SECURITY INCIDENT - P[0/1/2/3]

Summary: [Brief description]
Affected Systems: [List]
Status: [Detection/Containment/Eradication/Recovery]
Incident Commander: [@name]

War Room: #incident-[timestamp]
Ticket: JIRA-[number]

Action Required: [If any]
```

### Executive Briefing (Email)

```
Subject: URGENT: Security Incident - P[Level] - [Brief Description]

Incident Details:
- Detected: [DATE TIME]
- Severity: P[0/1/2/3]
- Status: [Phase]
- Systems Affected: [List]
- Data Exposure: [Yes/No/Unknown]

Immediate Actions Taken:
1. [Action]
2. [Action]
3. [Action]

Current Status:
[Description of ongoing work]

Next Steps:
[Planned actions with timeline]

Estimated Resolution: [TIME]

Business Impact:
[Description of customer/business impact]

Regulatory: [PIPA notification required: Yes/No]

Incident Commander: [Name] ([Phone])
```

---

## 6. Tools and Resources

### Monitoring & Detection

- **SIEM**: [To be implemented - ELK Stack]
- **Audit Logs**: PostgreSQL audit tables with hash chain
- **Application Logs**: Winston logger with structured logging
- **Intrusion Detection**: [To be implemented]

### Forensics Tools

```bash
# Memory forensics
volatility -f memory.dump --profile=Linux linux_bash

# Disk forensics
sleuthkit / autopsy

# Network forensics
wireshark / tcpdump

# Log analysis
jq, grep, awk for JSON log parsing
```

### Communication Channels

- **War Room**: Slack #security-incident-[ID]
- **Ticketing**: JIRA project SEC
- **Documentation**: Confluence wiki
- **Secure File Share**: [To be set up]

### External Contacts

| Organization | Contact | Purpose |
|--------------|---------|---------|
| **KISA** | 118 | Mandatory breach notification |
| **Police Cybercrime** | 112 | Criminal investigation |
| **Cyber Insurance** | [Provider] | Insurance claim |
| **Forensics Firm** | [Name] | External investigation support |
| **Legal Counsel** | [Firm] | Legal guidance |

---

## 7. Testing & Drills

### Quarterly Tabletop Exercises

**Scenarios**:
1. Database breach via SQL injection
2. Ransomware attack on production servers
3. Phishing campaign targeting hospital staff
4. Insider threat (malicious employee)
5. Third-party vendor compromise

**Evaluation Criteria**:
- Response time
- Communication effectiveness
- Technical accuracy
- Documentation quality
- Team coordination

### Annual Penetration Test

- External assessment by certified firm
- Scope: Web application, API, infrastructure
- Report with findings and remediation timeline
- Re-test after fixes applied

---

## 8. Continuous Improvement

### Metrics to Track

- Mean Time to Detect (MTTD): Target < 15 minutes
- Mean Time to Contain (MTTC): Target < 1 hour
- Mean Time to Recover (MTTR): Target < 24 hours
- False Positive Rate: Target < 5%

### Post-Incident Review Checklist

- [ ] Update incident response plan
- [ ] Update security policies
- [ ] Conduct training for gaps identified
- [ ] Implement technical improvements
- [ ] Update monitoring rules
- [ ] Share lessons learned (anonymized)

---

**Document Status**: APPROVED
**Next Review**: 2026-07-29 (Semi-annual)
**Version**: 1.0
