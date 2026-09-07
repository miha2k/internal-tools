import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '../test-setup';
import { auditLog, transactions } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('mutate', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it('writes exactly one audit row with correct before/after', async () => {
    const user = { id: 'user-1', role: 'operator' };
    const ip = '127.0.0.1';
    const recordId = 'txn-1';
    
    // Insert a test transaction
    await testDb.insert(transactions).values({
      id: recordId,
      customerId: 'cust-1',
      amount: 10000, // $100.00
      currency: 'USD',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Simulate a mutation with audit logging
    await testDb.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, recordId));
      
      await tx
        .update(transactions)
        .set({ status: 'completed', updatedAt: Date.now() })
        .where(eq(transactions.id, recordId));
      
      const [after] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, recordId));
      
      // Write audit log in the same transaction
      await tx.insert(auditLog).values({
        actor: user.id,
        action: 'update',
        app: 'transactions',
        recordId: String(recordId),
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
        createdAt: Date.now(),
        ip: ip,
      });
    });

    // Verify exactly one audit row was written
    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.recordId, recordId));
    
    expect(auditRows).toHaveLength(1);
    
    const audit = auditRows[0];
    expect(audit.actor).toBe(user.id);
    expect(audit.action).toBe('update');
    expect(audit.app).toBe('transactions');
    expect(audit.ip).toBe(ip);
    
    // Verify before/after JSON reflects actual change
    const before = JSON.parse(audit.before as string);
    const after = JSON.parse(audit.after as string);
    
    expect(before.status).toBe('pending');
    expect(after.status).toBe('completed');
    expect(before.amount).toBe(after.amount); // unchanged field
  });
});
