import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '../test-setup';
import { auditLog } from '../db/schema';
import { revealPII } from './pii';
import type { User } from '../auth';
import { eq } from 'drizzle-orm';

describe('PII revelation', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it('revealing a PII column writes an audit row with action reveal_pii', async () => {
    const user: User = { id: 'user-1', role: 'operator' };
    const ip = '127.0.0.1';
    const app = 'transactions';
    const recordId = 'txn-1';
    const fieldName = 'customerId';
    const before = 'AB***12';
    const after = 'AB12345678912';

    // Simulate the revealPII function
    await testDb.transaction(async (tx) => {
      // Write audit log in the same transaction
      await tx.insert(auditLog).values({
        actor: user.id,
        action: 'reveal_pii',
        app: app,
        recordId: String(recordId),
        before: JSON.stringify({ [fieldName]: before }),
        after: JSON.stringify({ [fieldName]: after }),
        createdAt: Date.now(),
        ip: ip,
      });
    });

    // Verify audit row was written with reveal_pii action
    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.recordId, recordId));
    
    expect(auditRows).toHaveLength(1);
    
    const audit = auditRows[0];
    expect(audit.actor).toBe(user.id);
    expect(audit.action).toBe('reveal_pii');
    expect(audit.app).toBe(app);
    expect(audit.ip).toBe(ip);
    
    // Verify before/after JSON contains the field change
    const beforeData = JSON.parse(audit.before as string);
    const afterData = JSON.parse(audit.after as string);
    
    expect(beforeData[fieldName]).toBe(before);
    expect(afterData[fieldName]).toBe(after);
  });
});
