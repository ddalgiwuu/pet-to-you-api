-- ============================================================
-- Manual Migration Script for Auto-Claim System
-- 병원-환자-보험 자동화 시스템 Database Schema
-- ============================================================
--
-- 이 스크립트는 Phase 1-4 구현에 필요한 모든 DB 변경사항을 포함합니다.
--
-- 실행 방법:
-- 1. PostgreSQL 접속: psql -U postgres -d pet_to_you
-- 2. 이 파일 실행: \i migrations/manual-migration.sql
-- 3. 확인: \dt
--
-- ============================================================

-- ============================================================
-- Table 1: health_notes - Enhanced Fields (35 new columns)
-- ============================================================

-- Category 1: Booking Connection
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS booking_id UUID;
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS hospital_id UUID;

-- Category 2: Cost Tracking (Enhanced)
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS estimated_cost INTEGER;
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS actual_cost INTEGER;
-- Note: cost_breakdown column type will change from array to structured object

-- Category 3: Service Items
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS service_items JSONB;

-- Category 4: Payment Tracking
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS payment JSONB;

-- Category 5: Document Management
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS documents JSONB;

-- Category 6: Insurance Matching
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS is_insurance_covered BOOLEAN DEFAULT FALSE;
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS insurance_coverage_type VARCHAR(50);
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS insurance_eligibility_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;

-- Category 7: Claim History
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS claim_history JSONB;

-- Category 8: Follow-up (Enhanced)
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS follow_up JSONB;

-- Category 9: Procedure Codes
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(50);
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS diagnosis_code VARCHAR(50);

-- Category 10: Metadata
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'patient';
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS record_status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS hospital_payment_status VARCHAR(50);
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS hospital_paid_at TIMESTAMP;
ALTER TABLE health_notes ADD COLUMN IF NOT EXISTS auto_claim_generated BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_notes_booking_id ON health_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_health_notes_hospital_id ON health_notes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_health_notes_auto_claim ON health_notes(auto_claim_generated);
CREATE INDEX IF NOT EXISTS idx_health_notes_insurance_claim ON health_notes(insurance_claim_id);

-- ============================================================
-- Table 2: auto_claim_suggestions (NEW) ⭐
-- ============================================================

CREATE TABLE IF NOT EXISTS auto_claim_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  medical_record_id UUID NOT NULL REFERENCES health_notes(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Medical snapshot
  incident_date TIMESTAMP NOT NULL,
  diagnosis TEXT NOT NULL,
  treatment TEXT NOT NULL,
  hospital_name VARCHAR(200) NOT NULL,
  hospital_id UUID,

  -- Cost & Claim calculation
  estimated_cost INTEGER NOT NULL,
  estimated_claim_amount INTEGER NOT NULL,
  coverage_type VARCHAR(50) NOT NULL,
  coverage_percent INTEGER NOT NULL,
  deductible INTEGER NOT NULL,

  -- AI analysis
  confidence DECIMAL(3,2) NOT NULL,
  is_eligible BOOLEAN DEFAULT TRUE,
  ineligibility_reason TEXT,
  analysis_details JSONB,

  -- Pre-filled data
  prefilled_documents JSONB,
  service_items JSONB,
  cost_breakdown JSONB,

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'pending',
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_claim_id UUID,
  expires_at TIMESTAMP,

  -- Notification
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_medical_record ON auto_claim_suggestions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_policy ON auto_claim_suggestions(policy_id);
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_pet_status ON auto_claim_suggestions(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_user_status ON auto_claim_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_created ON auto_claim_suggestions(created_at);
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_expires ON auto_claim_suggestions(expires_at);

-- ============================================================
-- Table 3: hospital_users (NEW)
-- ============================================================

CREATE TABLE IF NOT EXISTS hospital_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hospital relationship
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

  -- User information
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),

  -- Role & Permissions
  role VARCHAR(20) DEFAULT 'staff',
  permissions TEXT[],
  title VARCHAR(100),
  veterinarian_license VARCHAR(50),
  specialization VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(100),

  -- Security
  refresh_token TEXT,
  refresh_token_expires_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_users_email ON hospital_users(hospital_id, email);
CREATE INDEX IF NOT EXISTS idx_hospital_users_role ON hospital_users(hospital_id, role);
CREATE INDEX IF NOT EXISTS idx_hospital_users_email_search ON hospital_users(email);
CREATE INDEX IF NOT EXISTS idx_hospital_users_active ON hospital_users(is_active);

-- ============================================================
-- Table 4: hospital_payments (NEW) ⭐
-- ============================================================

CREATE TABLE IF NOT EXISTS hospital_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES insurance_claims(id) ON DELETE RESTRICT,
  medical_record_id UUID,

  -- Payment information
  amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20) DEFAULT 'bank_transfer',

  -- Bank information
  bank_name VARCHAR(50),
  bank_account_number VARCHAR(100),
  account_holder_name VARCHAR(100),

  -- Transaction tracking
  transaction_id VARCHAR(200),
  settlement_id VARCHAR(200),
  payment_key VARCHAR(200),

  -- Timestamps
  initiated_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_payments_hospital ON hospital_payments(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_hospital_payments_claim ON hospital_payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_hospital_payments_settlement ON hospital_payments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_hospital_payments_created ON hospital_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_hospital_payments_status ON hospital_payments(status);

-- ============================================================
-- Data Seeds
-- ============================================================

-- Insert sample hospital user (for testing)
INSERT INTO hospital_users (hospital_id, email, password_hash, name, role, title, is_active, is_email_verified)
SELECT
  id,
  'admin@' || LOWER(REPLACE(name, ' ', '')) || '.com',
  '$2b$10$example.hash.here', -- Replace with actual bcrypt hash
  '관리자',
  'admin',
  '원장',
  TRUE,
  TRUE
FROM hospitals
WHERE name = '24시 강남 동물병원'
ON CONFLICT DO NOTHING;

-- Add bank info to hospitals (for testing)
-- NOTE: This should be collected during hospital onboarding
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(100);

COMMENT ON TABLE auto_claim_suggestions IS 'AI-generated insurance claim suggestions';
COMMENT ON TABLE hospital_users IS 'Hospital staff authentication and role management';
COMMENT ON TABLE hospital_payments IS 'Payment settlements from insurance to hospitals';

COMMENT ON COLUMN health_notes.auto_claim_generated IS 'Flag indicating auto-claim was generated for this record';
COMMENT ON COLUMN health_notes.actual_cost IS 'Actual hospital charge (vs estimated)';
COMMENT ON COLUMN health_notes.cost_breakdown IS 'Structured cost breakdown (7 categories)';
COMMENT ON COLUMN health_notes.documents IS 'Medical documents (receipts, diagnoses, etc.)';

-- ============================================================
-- Verification Queries
-- ============================================================

-- Count new columns in health_notes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'health_notes'
  AND column_name IN (
    'booking_id', 'hospital_id', 'actual_cost', 'cost_breakdown',
    'service_items', 'payment', 'documents', 'auto_claim_generated'
  )
ORDER BY column_name;

-- Verify new tables created
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('auto_claim_suggestions', 'hospital_users', 'hospital_payments')
ORDER BY table_name;

-- Count indexes created
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('health_notes', 'auto_claim_suggestions', 'hospital_users', 'hospital_payments')
ORDER BY tablename, indexname;

-- ============================================================
-- Rollback Script (if needed)
-- ============================================================

/*
-- WARNING: This will delete all data in new tables!

DROP TABLE IF EXISTS hospital_payments CASCADE;
DROP TABLE IF EXISTS hospital_users CASCADE;
DROP TABLE IF EXISTS auto_claim_suggestions CASCADE;

ALTER TABLE health_notes DROP COLUMN IF EXISTS booking_id;
ALTER TABLE health_notes DROP COLUMN IF EXISTS hospital_id;
ALTER TABLE health_notes DROP COLUMN IF EXISTS estimated_cost;
ALTER TABLE health_notes DROP COLUMN IF EXISTS actual_cost;
-- ... (drop all 35 new columns)

ALTER TABLE hospitals DROP COLUMN IF EXISTS bank_name;
ALTER TABLE hospitals DROP COLUMN IF EXISTS bank_account_number;
ALTER TABLE hospitals DROP COLUMN IF EXISTS account_holder_name;
*/

-- ============================================================
-- End of Migration
-- ============================================================

SELECT 'Migration completed successfully!' AS status;
