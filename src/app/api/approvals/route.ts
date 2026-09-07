import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { approvals, users } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
import { eq, desc } from 'drizzle-orm';
import { approveApproval, rejectApproval } from '@/lib/audit/approvals';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    
    // Get all pending approvals
    const pendingApprovals = await db
      .select({
        id: approvals.id,
        requesterId: approvals.requesterId,
        app: approvals.app,
        recordId: approvals.recordId,
        action: approvals.action,
        before: approvals.before,
        after: approvals.after,
        status: approvals.status,
        createdAt: approvals.createdAt,
        requesterName: users.name,
      })
      .from(approvals)
      .leftJoin(users, eq(approvals.requesterId, users.id))
      .where(eq(approvals.status, 'pending'))
      .orderBy(desc(approvals.createdAt));

    const approvalsWithDetails = pendingApprovals.map(approval => ({
      ...approval,
      before: approval.before ? JSON.parse(approval.before as string) : null,
      after: approval.after ? JSON.parse(approval.after as string) : null,
    }));

    return NextResponse.json({ 
      approvals: approvalsWithDetails,
      count: approvalsWithDetails.length 
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { approvalId, action } = body;

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: 'approvalId and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be approve or reject' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    
    // Get the approval to determine which app it belongs to
    const [approval] = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, approvalId));

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const app = getAppBySlug(approval.app);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    if (action === 'approve') {
      await approveApproval(approvalId, user, app, ip);
    } else {
      await rejectApproval(approvalId, user, app, ip);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval' },
      { status: 500 }
    );
  }
}