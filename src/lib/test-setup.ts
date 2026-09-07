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
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
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
  await testClient.execute('DROP TABLE IF EXISTS transactions');
  await testClient.execute('DROP TABLE IF EXISTS approvals');
  await testClient.execute('DROP TABLE IF EXISTS audit_log');
  await testClient.execute('DROP TABLE IF EXISTS users');
}
