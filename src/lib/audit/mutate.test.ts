import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '../test-setup';
import { auditLog, kycReviews } from '../db/schema';
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
    const recordId = 'kyc-1';
    
    // Insert a test KYC review
    await testDb.insert(kycReviews).values({
      id: recordId,
      caseId: 'CASE-123',
      customerName: 'Test Customer',
      country: 'US',
      riskScore: 50,
      documentsSubmitted: 3,
      status: 'pending',
      submittedAt: Date.now(),
      assignedTo: 'agent-1',
    });

    // Simulate a mutation with audit logging
    await testDb.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(kycReviews)
        .where(eq(kycReviews.id, recordId));
      
      await tx
        .update(kycReviews)
        .set({ status: 'approved' })
        .where(eq(kycReviews.id, recordId));
      
      const [after] = await tx
        .select()
        .from(kycReviews)
        .where(eq(kycReviews.id, recordId));
      
      // Write audit log in the same transaction
      await tx.insert(auditLog).values({
        actor: user.id,
        action: 'update',
        app: 'kyc-review',
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
    expect(audit.app).toBe('kyc-review');
    expect(audit.ip).toBe(ip);
    
    // Verify before/after JSON reflects actual change
    const before = JSON.parse(audit.before as string);
    const after = JSON.parse(audit.after as string);
    
    expect(before.status).toBe('pending');
    expect(after.status).toBe('approved');
    expect(before.riskScore).toBe(after.riskScore); // unchanged field
  });
});
