-- Triggers to enforce audit_log append-only
-- These triggers prevent UPDATE and DELETE operations on audit_log

CREATE TRIGGER IF NOT EXISTS audit_log_append_only_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_append_only_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- Create tables for new apps if they don't exist
CREATE TABLE IF NOT EXISTS kyc_reviews (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  country TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  documents_submitted INTEGER NOT NULL,
  status TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  assigned_to TEXT
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT,
  status TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  requested_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  environment TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  rollout_pct INTEGER NOT NULL DEFAULT 0,
  owner TEXT,
  updated_at INTEGER NOT NULL
);

-- Drop transactions table if it exists (cleanup from example app)
DROP TABLE IF EXISTS transactions;