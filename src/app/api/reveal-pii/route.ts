import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
import { revealPII } from '@/lib/audit/mutate';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { app: appSlug, recordId } = body;

    if (!appSlug || !recordId) {
      return NextResponse.json(
        { error: 'app and recordId are required' },
        { status: 400 }
      );
    }

    const app = getAppBySlug(appSlug);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    assertCan(user, 'reveal_pii', app);

    // Audit the PII revelation
    await revealPII(
      { user, ip: request.headers.get('x-forwarded-for') || 'unknown' },
      app.slug,
      recordId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revealing PII:', error);
    return NextResponse.json(
      { error: 'Failed to reveal PII' },
      { status: 500 }
    );
  }
}