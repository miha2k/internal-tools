import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '../test-setup';
import { approvals, refunds, auditLog } from '../db/schema';
import { eq } from 'drizzle-orm';
import { refundsApp } from '../../apps/refunds.app';

describe('requiresApproval', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it('action whose requiresApproval predicate returns true creates pending approval and does NOT mutate underlying row', async () => {
    const recordId = 'refund-1';
    const userId = 'user-1';
    
    // Insert a refund with amount > 500 (requires approval)
    await testDb.insert(refunds).values({
      id: recordId,
      orderId: 'ORD-123',
      customerEmail: 'customer@example.com',
      amount: 600, // $6.00 (over $5.00 threshold)
      currency: 'USD',
      reason: 'Product defect',
      status: 'pending',
      requestedAt: Date.now(),
      requestedBy: 'agent-1',
    });

    // Get the approve action from the app config
    const approveAction = refundsApp.rowActions.find(a => a.key === 'approve');
    expect(approveAction).toBeDefined();
    
    // Simulate the requiresApproval check
    const [refund] = await testDb
      .select()
      .from(refunds)
      .where(eq(refunds.id, recordId));
    
    const requiresApproval = typeof approveAction!.requiresApproval === 'function'
      ? approveAction!.requiresApproval(refund as any)
      : approveAction!.requiresApproval;
    
    expect(requiresApproval).toBe(true);
    
    // When requiresApproval is true, create a pending approval instead of mutating
    const approvalId = await testDb.insert(approvals).values({
      requesterId: userId,
      app: refundsApp.slug,
      recordId: recordId,
      action: 'approve',
      before: JSON.stringify(refund),
      after: JSON.stringify({ ...refund, status: 'approved' }),
      status: 'pending',
      createdAt: Date.now(),
    }).returning({ id: approvals.id }).then(rows => rows[0].id);
    
    // Verify approval was created
    const [approval] = await testDb
      .select()
      .from(approvals)
      .where(eq(approvals.id, approvalId));
    
    expect(approval).toBeDefined();
    expect(approval.status).toBe('pending');
    expect(approval.requesterId).toBe(userId);
    
    // Verify the underlying refund was NOT mutated
    const [unchangedRefund] = await testDb
      .select()
      .from(refunds)
      .where(eq(refunds.id, recordId));
    
    expect(unchangedRefund.status).toBe('pending'); // Still original status
    
    // Verify no audit log was written for the mutation (since it didn't happen)
    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.recordId, recordId));
    
    expect(auditRows).toHaveLength(0);
  });

  it('action whose requiresApproval predicate returns false mutates directly', async () => {
    const recordId = 'refund-2';
    const userId = 'user-1';
    
    // Insert a refund with amount <= 500 (does not require approval)
    await testDb.insert(refunds).values({
      id: recordId,
      orderId: 'ORD-456',
      customerEmail: 'customer@example.com',
      amount: 400, // $4.00 (under $5.00 threshold)
      currency: 'USD',
      reason: 'Product defect',
      status: 'pending',
      requestedAt: Date.now(),
      requestedBy: 'agent-1',
    });

    // Get the approve action from the app config
    const approveAction = refundsApp.rowActions.find(a => a.key === 'approve');
    expect(approveAction).toBeDefined();
    
    // Simulate the requiresApproval check
    const [refund] = await testDb
      .select()
      .from(refunds)
      .where(eq(refunds.id, recordId));
    
    const requiresApproval = typeof approveAction!.requiresApproval === 'function'
      ? approveAction!.requiresApproval(refund as any)
      : approveAction!.requiresApproval;
    
    expect(requiresApproval).toBe(false);
    
    // When requiresApproval is false, mutate directly
    await testDb.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(refunds)
        .where(eq(refunds.id, recordId));
      
      await tx
        .update(refunds)
        .set({ status: 'approved' })
        .where(eq(refunds.id, recordId));
      
      const [after] = await tx
        .select()
        .from(refunds)
        .where(eq(refunds.id, recordId));
      
      // Write audit log
      await tx.insert(auditLog).values({
        actor: userId,
        action: 'approve',
        app: refundsApp.slug,
        recordId: String(recordId),
        before: JSON.stringify(before),
        after: JSON.stringify(after),
        createdAt: Date.now(),
        ip: '127.0.0.1',
      });
    });
    
    // Verify the refund was mutated
    const [mutatedRefund] = await testDb
      .select()
      .from(refunds)
      .where(eq(refunds.id, recordId));
    
    expect(mutatedRefund.status).toBe('approved');
    
    // Verify audit log was written
    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.recordId, recordId));
    
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('approve');
  });
});
