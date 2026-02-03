-- PostgreSQL Initialization Script for Pet to You
-- This script runs when the PostgreSQL container first starts

-- Create database if not exists
SELECT 'CREATE DATABASE pettoyou'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pettoyou')\gexec

-- Connect to pettoyou database
\c pettoyou;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN index support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions

-- Create schemas for multi-tenancy (future)
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set default timezone to Korea Standard Time
SET timezone = 'Asia/Seoul';

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE '✅ Pet to You database initialized successfully';
    RAISE NOTICE '📅 Timezone: %', current_setting('TIMEZONE');
    RAISE NOTICE '🔧 Extensions: uuid-ossp, pg_trgm, btree_gin, pgcrypto';
END
$$;
