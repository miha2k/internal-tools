import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
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

    // Enrich with user names
    const { users } = await import('@/lib/db/schema');
    const enrichedEntries = await Promise.all(
      auditEntries.map(async (entry) => {
        const [actorUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, entry.actor))
          .limit(1);
        
        return {
          ...entry,
          actor: actorUser?.name || entry.actor,
        };
      })
    );

    return NextResponse.json({ data: enrichedEntries });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
