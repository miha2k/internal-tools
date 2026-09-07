import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '../test-setup';
import { auditLog } from './schema';
import { eq } from 'drizzle-orm';

describe('audit_log append-only triggers', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it('direct UPDATE on audit_log fails with trigger error', async () => {
    // Insert an audit log entry
    const [entry] = await testDb.insert(auditLog).values({
      actor: 'user-1',
      action: 'create',
      app: 'test',
      recordId: 'record-1',
      before: null,
      after: JSON.stringify({ status: 'pending' }),
      createdAt: Date.now(),
      ip: '127.0.0.1',
    }).returning();

    // Attempt to update - should fail with trigger error
    await expect(
      testDb.update(auditLog)
        .set({ action: 'update' })
        .where(eq(auditLog.id, entry.id))
    ).rejects.toThrow();
  });

  it('direct DELETE on audit_log fails with trigger error', async () => {
    // Insert an audit log entry
    const [entry] = await testDb.insert(auditLog).values({
      actor: 'user-1',
      action: 'create',
      app: 'test',
      recordId: 'record-1',
      before: null,
      after: JSON.stringify({ status: 'pending' }),
      createdAt: Date.now(),
      ip: '127.0.0.1',
    }).returning();

    // Attempt to delete - should fail with trigger error
    await expect(
      testDb.delete(auditLog).where(eq(auditLog.id, entry.id))
    ).rejects.toThrow();
  });

  it('INSERT on audit_log succeeds', async () => {
    // Insert should succeed
    await expect(
      testDb.insert(auditLog).values({
        actor: 'user-1',
        action: 'create',
        app: 'test',
        recordId: 'record-1',
        before: null,
        after: JSON.stringify({ status: 'pending' }),
        createdAt: Date.now(),
        ip: '127.0.0.1',
      })
    ).resolves.not.toThrow();
  });
});
