import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
import { getAllUsers } from '@/lib/auth';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const app = getAppBySlug(slug);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    assertCan(user, 'view', app);

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json(
        { error: 'recordId is required' },
        { status: 400 }
      );
    }

    // Fetch audit log entries for this record
    const auditEntries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.app, slug),
          eq(auditLog.recordId, recordId)
        )
      )
      .orderBy(desc(auditLog.createdAt));

    // Mask PII columns in before/after, mirroring the approvals endpoint
    const maskPII = (data: unknown) => {
      if (!data) return data;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const masked = { ...parsed };
      app.columns.forEach(column => {
        if (column.pii && (column.key as string) in masked) {
          masked[column.key as string] = '••••••••';
        }
      });
      return masked;
    };

    // Enrich with actor names. entry.actor is a session user id (from
    // getCurrentUser/MOCK_USERS), not a row in the seeded `users` table -
    // those are two unrelated identity lists that happen to share an id
    // range, so resolve the display name from the same place logins do.
    const allUsers = getAllUsers();
    const enrichedEntries = auditEntries.map((entry) => {
      const actorUser = allUsers.find(u => u.id === entry.actor);

      return {
        ...entry,
        actor: actorUser?.name || entry.actor,
        before: maskPII(entry.before),
        after: maskPII(entry.after),
      };
    });

    return NextResponse.json({ data: enrichedEntries });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
