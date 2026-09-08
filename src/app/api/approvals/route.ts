import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { approvals } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
import { getAllUsers } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { approveApproval, rejectApproval } from '@/lib/audit/approvals';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    // Get all pending approvals. requesterId is a session user id (from
    // getCurrentUser/MOCK_USERS), not a row in the seeded `users` table -
    // those are two unrelated identity lists that happen to share an id
    // range, so resolve the display name from the same place logins do.
    const allUsers = getAllUsers();
    const pendingApprovals = await db
      .select()
      .from(approvals)
      .where(eq(approvals.status, 'pending'))
      .orderBy(desc(approvals.createdAt));

    const approvalsWithDetails = await Promise.all(
      pendingApprovals.map(async (approval) => {
        const requesterName = allUsers.find(u => u.id === approval.requesterId)?.name;
        const app = getAppBySlug(approval.app);
        if (!app) {
          return {
            ...approval,
            requesterName,
            before: approval.before ? JSON.parse(approval.before as string) : null,
            after: approval.after ? JSON.parse(approval.after as string) : null,
          };
        }

        // Authorize user to view approvals for this app
        assertCan(user, 'view', app);

        const before = approval.before ? JSON.parse(approval.before as string) : null;
        const after = approval.after ? JSON.parse(approval.after as string) : null;

        // Mask PII columns in before/after
        const maskPII = (data: any) => {
          if (!data) return data;
          const masked = { ...data };
          app.columns.forEach(column => {
            if (column.pii && column.key in masked) {
              masked[column.key] = '••••••••';
            }
          });
          return masked;
        };

        return {
          ...approval,
          requesterName,
          before: maskPII(before),
          after: maskPII(after),
        };
      })
    );

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