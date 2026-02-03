-- Quick Database Setup for Pet-to-You
-- Run with: docker exec -i pettoyou-postgres psql -U postgres -d pettoyou < quick-db-setup.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Essential tables only for testing
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id),
  name VARCHAR(100),
  species VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  bank_name VARCHAR(50),
  bank_account_number VARCHAR(100),
  account_holder_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID REFERENCES pets(id),
  hospital_id UUID,
  visit_date TIMESTAMP NOT NULL,
  diagnosis_encrypted JSONB,
  treatment_encrypted JSONB,
  hospital_name VARCHAR(200),
  veterinarian_name VARCHAR(100),
  actual_cost INTEGER,
  cost_breakdown JSONB,
  service_items JSONB,
  payment JSONB,
  documents JSONB,
  auto_claim_generated BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(50) DEFAULT 'patient',
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company VARCHAR(100),
  policy_name VARCHAR(100),
  deductible NUMERIC(10, 2),
  coverage_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_insurance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  pet_id UUID REFERENCES pets(id),
  policy_id UUID REFERENCES insurance_policies(id),
  status VARCHAR(20) DEFAULT 'active',
  coverage_snapshot JSONB,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number VARCHAR(50) UNIQUE,
  user_id UUID REFERENCES users(id),
  pet_id UUID REFERENCES pets(id),
  policy_id UUID REFERENCES insurance_policies(id),
  status VARCHAR(20) DEFAULT 'submitted',
  total_claim_amount NUMERIC(12, 2),
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_claim_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medical_record_id UUID REFERENCES health_notes(id),
  policy_id UUID REFERENCES insurance_policies(id),
  pet_id UUID REFERENCES pets(id),
  user_id UUID,
  diagnosis_encrypted JSONB NOT NULL,
  treatment_encrypted JSONB NOT NULL,
  estimated_cost INTEGER NOT NULL,
  estimated_claim_amount INTEGER NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  email VARCHAR(100) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id),
  claim_id UUID REFERENCES insurance_claims(id),
  amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  bank_account_number_encrypted JSONB,
  transaction_id VARCHAR(200),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_notes_pet ON health_notes(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_notes_auto_claim ON health_notes(auto_claim_generated);
CREATE INDEX IF NOT EXISTS idx_auto_claim_suggestions_user ON auto_claim_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_hospital_payments_hospital ON hospital_payments(hospital_id, status);

SELECT 'Database setup complete!' AS status;
