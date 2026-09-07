import { db } from '../db/client';
import { approvals } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../auth';
import { assertCan } from '../auth/rbac';
import type { AppConfig } from '../types';
import { mutate } from './mutate';

export interface ApprovalRequest {
  requesterId: string;
  app: string;
  recordId: string | number;
  action: string;
  before: Record<string, any>;
  after: Record<string, any>;
}

/**
 * Create a pending approval request instead of mutating directly.
 * This is used when an action requires approval.
 */
export async function createApproval(
  request: ApprovalRequest,
  user: User,
  ip: string
): Promise<number> {
  return mutate(
    { user, ip },
    {
      app: request.app,
      action: 'create_approval',
      recordId: `approval-${Date.now()}`,
      run: async (tx) => {
        const [result] = await tx.insert(approvals).values({
          requesterId: request.requesterId,
          app: request.app,
          recordId: String(request.recordId),
          action: request.action,
          before: JSON.stringify(request.before),
          after: JSON.stringify(request.after),
          status: 'pending',
          createdAt: Date.now(),
        }).returning({ id: approvals.id });

        return {
          before: null,
          after: { approvalId: result.id },
          result: result.id,
        };
      },
    }
  );
}

/**
 * Get all pending approvals for a specific approver.
 */
export async function getPendingApprovals(approverId: string) {
  return db.select().from(approvals).where(eq(approvals.status, 'pending'));
}

/**
 * Approve a pending approval request.
 * Self-approval is rejected server-side.
 */
export async function approveApproval(
  approvalId: number,
  approver: User,
  app: AppConfig,
  ip: string
): Promise<void> {
  assertCan(approver, 'approve', app);

  await mutate(
    { user: approver, ip },
    {
      app: app.slug,
      action: 'approve',
      recordId: approvalId,
      run: async (tx) => {
        const [approval] = await tx
          .select()
          .from(approvals)
          .where(eq(approvals.id, approvalId));

        if (!approval) {
          throw new Error('Approval not found');
        }

        if (approval.status !== 'pending') {
          throw new Error('Approval is not pending');
        }

        // Self-approval check
        if (approval.requesterId === approver.id) {
          throw new Error('Self-approval is not allowed');
        }

        await tx
          .update(approvals)
          .set({
            status: 'approved',
            approverId: approver.id,
            decidedAt: Date.now(),
          })
          .where(eq(approvals.id, approvalId));

        return {
          before: { status: approval.status },
          after: { status: 'approved', approverId: approver.id },
          result: undefined,
        };
      },
    }
  );
}

/**
 * Reject a pending approval request.
 */
export async function rejectApproval(
  approvalId: number,
  approver: User,
  app: AppConfig,
  ip: string
): Promise<void> {
  assertCan(approver, 'approve', app);

  await mutate(
    { user: approver, ip },
    {
      app: app.slug,
      action: 'reject',
      recordId: approvalId,
      run: async (tx) => {
        const [approval] = await tx
          .select()
          .from(approvals)
          .where(eq(approvals.id, approvalId));

        if (!approval) {
          throw new Error('Approval not found');
        }

        if (approval.status !== 'pending') {
          throw new Error('Approval is not pending');
        }

        await tx
          .update(approvals)
          .set({
            status: 'rejected',
            approverId: approver.id,
            decidedAt: Date.now(),
          })
          .where(eq(approvals.id, approvalId));

        return {
          before: { status: approval.status },
          after: { status: 'rejected', approverId: approver.id },
          result: undefined,
        };
      },
    }
  );
}