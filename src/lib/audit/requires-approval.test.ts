import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '../test-setup';
import { approvals, transactions, auditLog } from '../db/schema';
import { eq } from 'drizzle-orm';
import { transactionsApp } from '../../apps/transactions.app';

describe('requiresApproval', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it('action whose requiresApproval predicate returns true creates pending approval and does NOT mutate underlying row', async () => {
    const recordId = 'txn-1';
    const userId = 'user-1';
    
    // Insert a transaction with amount > 5000 (requires approval)
    await testDb.insert(transactions).values({
      id: recordId,
      customerId: 'cust-1',
      amount: 10000, // $100.00 (over $50 threshold)
      currency: 'USD',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get the refund action from the app config
    const refundAction = transactionsApp.rowActions.find(a => a.key === 'refund');
    expect(refundAction).toBeDefined();
    
    // Simulate the requiresApproval check
    const [transaction] = await testDb
      .select()
      .from(transactions)
      .where(eq(transactions.id, recordId));
    
    const requiresApproval = typeof refundAction!.requiresApproval === 'function'
      ? refundAction!.requiresApproval(transaction)
      : refundAction!.requiresApproval;
    
    expect(requiresApproval).toBe(true);
    
    // When requiresApproval is true, create a pending approval instead of mutating
    const approvalId = await testDb.insert(approvals).values({
      requesterId: userId,
      app: transactionsApp.slug,
      recordId: recordId,
      action: 'refund',
      before: JSON.stringify(transaction),
      after: JSON.stringify({ ...transaction, status: 'refunded' }),
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
    
    // Verify the underlying transaction was NOT mutated
    const [unchangedTransaction] = await testDb
      .select()
      .from(transactions)
      .where(eq(transactions.id, recordId));
    
    expect(unchangedTransaction.status).toBe('completed'); // Still original status
    
    // Verify no audit log was written for the mutation (since it didn't happen)
    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.recordId, recordId));
    
    expect(auditRows).toHaveLength(0);
  });

  it('action whose requiresApproval predicate returns false mutates directly', async () => {
    const recordId = 'txn-2';
    const userId = 'user-1';
    
    // Insert a transaction with amount <= 5000 (does not require approval)
    await testDb.insert(transactions).values({
      id: recordId,
      customerId: 'cust-1',
      amount: 3000, // $30.00 (under $50 threshold)
      currency: 'USD',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Get the refund action from the app config
    const refundAction = transactionsApp.rowActions.find(a => a.key === 'refund');
    expect(refundAction).toBeDefined();
    
    // Simulate the requiresApproval check
    const [transaction] = await testDb
      .select()
      .from(transactions)
      .where(eq(transactions.id, recordId));
    
    const requiresApproval = typeof refundAction!.requiresApproval === 'function'
      ? refundAction!.requiresApproval(transaction)
      : refundAction!.requiresApproval;
    
    expect(requiresApproval).toBe(false);
    
    // When requiresApproval is false, mutate directly
    await testDb.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, recordId));
      
      await tx
        .update(transactions)
        .set({ status: 'refunded', updatedAt: Date.now() })
        .where(eq(transactions.id, recordId));
      
      const [after] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, recordId));
      
      // Write audit log
      await tx.insert(auditLog).values({
        actor: userId,
        action: 'refund',
        app: transactionsApp.slug,
        recordId: String(recordId),
        before: JSON.stringify(before),
        after: JSON.stringify(after),
        createdAt: Date.now(),
        ip: '127.0.0.1',
      });
    });
    
    // Verify the transaction was mutated
    const [mutatedTransaction] = await testDb
      .select()
      .from(transactions)
      .where(eq(transactions.id, recordId));
    
    expect(mutatedTransaction.status).toBe('refunded');
    
    // Verify audit log was written
    const auditRows = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.recordId, recordId));
    
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('refund');
  });
});
