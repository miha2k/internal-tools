import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
import { revealPII } from '@/lib/audit/mutate';
import { db } from '@/lib/db/client';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { app: appSlug, recordId, field } = body;

    if (!appSlug || !recordId || !field) {
      return NextResponse.json(
        { error: 'app, recordId, and field are required' },
        { status: 400 }
      );
    }

    const app = getAppBySlug(appSlug);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Validate that the requested field is actually a PII column
    const column = app.columns.find(col => col.key === field);
    if (!column || !column.pii) {
      return NextResponse.json(
        { error: 'Field is not a PII column' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    assertCan(user, 'reveal_pii', app);

    // Fetch the actual record to get the real value
    // @ts-ignore - dynamic column access
    const [record] = await db.select().from(app.schema).where(eq(app.schema.id, recordId));
    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    const realValue = record[field];

    // Audit the PII revelation
    await revealPII(
      { user, ip: request.headers.get('x-forwarded-for') || 'unknown' },
      app.slug,
      recordId
    );

    return NextResponse.json({ value: realValue });
  } catch (error) {
    console.error('Error revealing PII:', error);
    return NextResponse.json(
      { error: 'Failed to reveal PII' },
      { status: 500 }
    );
  }
}