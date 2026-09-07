import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db/client';
import { approvals } from '../db/schema';
import { createApproval, approveApproval } from './approvals';
import type { User } from '../auth';
import type { AppConfig } from '../types';
import { transactions } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('approvals - self-approval logic', () => {
  const mockApp: AppConfig = {
    slug: 'test',
    title: 'Test App',
    tableName: 'test',
    schema: transactions,
    titleField: 'id',
    columns: [],
    rowActions: [],
    detailFields: [],
    roles: {
      view: ['viewer', 'operator', 'approver', 'admin'],
      act: ['operator', 'approver', 'admin'],
      approve: ['approver', 'admin'],
      reveal_pii: ['operator', 'approver', 'admin'],
    },
    viewState: {
      defaultSort: { column: 'id', direction: 'asc' },
    },
  };

  let approvalId: number;
  const requesterId = 'user-1';
  const approverId = 'user-2';
  const testIp = '127.0.0.1';

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(approvals).where(eq(approvals.app, 'test'));
    
    // Create a test approval
    const requester: User = { id: requesterId, role: 'operator' };
    approvalId = await createApproval({
      requesterId,
      app: 'test',
      recordId: 'record-1',
      action: 'refund',
      before: { status: 'completed' },
      after: { status: 'refunded' },
    }, requester, testIp);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(approvals).where(eq(approvals.app, 'test'));
  });

  it('self-approval is rejected server-side', async () => {
    const requester: User = { id: requesterId, role: 'approver' };
    
    await expect(
      approveApproval(approvalId, requester, mockApp, testIp)
    ).rejects.toThrow('Self-approval is not allowed');
  });

  it('allows different user to approve', async () => {
    const approver: User = { id: approverId, role: 'approver' };
    
    await expect(
      approveApproval(approvalId, approver, mockApp, testIp)
    ).resolves.not.toThrow();
    
    const [updated] = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, approvalId));
    
    expect(updated.status).toBe('approved');
    expect(updated.approverId).toBe(approverId);
  });
});
