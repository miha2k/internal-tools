import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './db/schema';

// Create a separate in-memory database for testing
const testClient = createClient({
  url: 'file::memory:',
});

export const testDb = drizzle(testClient, { schema });

// Set up test database schema
export async function setupTestDb() {
  // Create tables using execute method
  await testClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  await testClient.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      app TEXT NOT NULL,
      record_id TEXT NOT NULL,
      before TEXT,
      after TEXT,
      created_at INTEGER NOT NULL,
      ip TEXT
    )
  `);

  await testClient.execute(`
    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id TEXT NOT NULL,
      app TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before TEXT NOT NULL,
      after TEXT NOT NULL,
      status TEXT NOT NULL,
      approver_id TEXT,
      created_at INTEGER NOT NULL,
      decided_at INTEGER
    )
  `);

  await testClient.execute(`
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
    )
  `);

  await testClient.execute(`
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
    )
  `);

  await testClient.execute(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      description TEXT,
      environment TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      rollout_pct INTEGER NOT NULL DEFAULT 0,
      owner TEXT,
      updated_at INTEGER NOT NULL
    )
  `);

  // Set up triggers
  await testClient.execute(`
    CREATE TRIGGER IF NOT EXISTS audit_log_append_only_update
    BEFORE UPDATE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is append-only');
    END;
  `);

  await testClient.execute(`
    CREATE TRIGGER IF NOT EXISTS audit_log_append_only_delete
    BEFORE DELETE ON audit_log
    BEGIN
      SELECT RAISE(ABORT, 'audit_log is append-only');
    END;
  `);
}

export async function cleanupTestDb() {
  await testClient.execute('DROP TABLE IF EXISTS feature_flags');
  await testClient.execute('DROP TABLE IF EXISTS refunds');
  await testClient.execute('DROP TABLE IF EXISTS kyc_reviews');
  await testClient.execute('DROP TABLE IF EXISTS approvals');
  await testClient.execute('DROP TABLE IF EXISTS audit_log');
  await testClient.execute('DROP TABLE IF EXISTS users');
}
