/**
 * Event Type Definitions
 * Domain events for event-driven architecture
 */

import { HealthNote } from '../../modules/medical-records/entities/health-note.entity';
import { InsuranceClaim } from '../../modules/insurance/entities/insurance-claim.entity';

// ==================== Medical Record Events ====================

/**
 * Emitted when a new medical record is created
 * Triggers: Auto-claim generation, notifications
 */
export class MedicalRecordCreatedEvent {
  constructor(
    public readonly medicalRecordId: string,
    public readonly petId: string,
    public readonly userId: string,
    public readonly hospitalId?: string,
    public readonly actualCost?: number,
    public readonly hasDocuments?: boolean,
  ) {}
}

/**
 * Emitted when a medical record is updated
 * Triggers: Re-evaluation of auto-claim eligibility
 */
export class MedicalRecordUpdatedEvent {
  constructor(
    public readonly medicalRecordId: string,
    public readonly petId: string,
    public readonly userId: string,
    public readonly costChanged: boolean,
    public readonly documentsAdded: boolean,
  ) {}
}

// ==================== Insurance Claim Events ====================

/**
 * Emitted when an auto-claim suggestion is generated
 * Triggers: Push notification to patient
 */
export class AutoClaimSuggestionCreatedEvent {
  constructor(
    public readonly suggestionId: string,
    public readonly userId: string,
    public readonly petId: string,
    public readonly medicalRecordId: string,
    public readonly estimatedClaimAmount: number,
    public readonly confidence: number,
  ) {}
}

/**
 * Emitted when a claim is submitted
 * Triggers: AI review, manual review queue
 */
export class ClaimSubmittedEvent {
  constructor(
    public readonly claimId: string,
    public readonly userId: string,
    public readonly policyId: string,
    public readonly claimAmount: number,
    public readonly medicalRecordId?: string,
  ) {}
}

/**
 * Emitted when a claim is approved
 * Triggers: Hospital payment settlement, patient notification
 */
export class ClaimApprovedEvent {
  constructor(
    public readonly claimId: string,
    public readonly userId: string,
    public readonly approvedAmount: number,
    public readonly hospitalId?: string,
    public readonly medicalRecordId?: string,
  ) {}
}

/**
 * Emitted when a claim is rejected
 * Triggers: Patient notification with reason
 */
export class ClaimRejectedEvent {
  constructor(
    public readonly claimId: string,
    public readonly userId: string,
    public readonly rejectionReason: string,
  ) {}
}

/**
 * Emitted when a claim payment is completed
 * Triggers: Patient reimbursement, final notifications
 */
export class ClaimPaidEvent {
  constructor(
    public readonly claimId: string,
    public readonly userId: string,
    public readonly paidAmount: number,
    public readonly hospitalId?: string,
  ) {}
}

// ==================== Payment Events ====================

/**
 * Emitted when hospital payment is initiated
 * Triggers: Bank transfer, payment tracking
 */
export class HospitalPaymentInitiatedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly hospitalId: string,
    public readonly claimId: string,
    public readonly amount: number,
  ) {}
}

/**
 * Emitted when hospital payment is completed
 * Triggers: Hospital notification, patient reimbursement
 */
export class HospitalPaymentCompletedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly hospitalId: string,
    public readonly claimId: string,
    public readonly amount: number,
    public readonly transactionId: string,
  ) {}
}

/**
 * Emitted when patient reimbursement is processed
 * Triggers: Patient notification
 */
export class PatientReimbursementProcessedEvent {
  constructor(
    public readonly reimbursementId: string,
    public readonly userId: string,
    public readonly claimId: string,
    public readonly amount: number,
  ) {}
}

// ==================== Event Names (for @OnEvent decorator) ====================

export const EventNames = {
  // Medical Records
  MEDICAL_RECORD_CREATED: 'medical-record.created',
  MEDICAL_RECORD_UPDATED: 'medical-record.updated',

  // Auto-Claims
  AUTO_CLAIM_SUGGESTION_CREATED: 'auto-claim.suggestion.created',

  // Claims
  CLAIM_SUBMITTED: 'claim.submitted',
  CLAIM_APPROVED: 'claim.approved',
  CLAIM_REJECTED: 'claim.rejected',
  CLAIM_PAID: 'claim.paid',

  // Payments
  HOSPITAL_PAYMENT_INITIATED: 'hospital-payment.initiated',
  HOSPITAL_PAYMENT_COMPLETED: 'hospital-payment.completed',
  PATIENT_REIMBURSEMENT_PROCESSED: 'patient-reimbursement.processed',
} as const;
