import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { getAppBySlug } from '@/lib/registry';
import { desc, asc, eq, and, or, like } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const app = getAppBySlug(params.slug);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    assertCan(user, 'view', app);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortColumn = searchParams.get('sort') || app.viewState.defaultSort.column;
    const sortDirection = searchParams.get('order') || app.viewState.defaultSort.direction;
    const search = searchParams.get('search') || '';
    const revealPII = searchParams.get('reveal_pii') === 'true';

    // Build base query
    let query = db.select().from(app.schema);

    // Apply search
    if (search) {
      const searchConditions = app.columns
        .filter(col => col.type === 'text')
        .map(col => {
          // @ts-ignore - dynamic column access
          return like(app.schema[col.key as keyof typeof app.schema], `%${search}%`);
        });
      
      if (searchConditions.length > 0) {
        query = query.where(or(...searchConditions));
      }
    }

    // Apply filters
    const filterConditions = [];
    app.columns.forEach(column => {
      if (column.filterable && searchParams.has(column.key as string)) {
        const value = searchParams.get(column.key as string);
        if (value) {
          // @ts-ignore - Drizzle typing is complex for dynamic conditions
          filterConditions.push(eq(app.schema[column.key as keyof typeof app.schema] as any, value));
        }
      }
    });

    if (filterConditions.length > 0) {
      // @ts-ignore - Drizzle typing is complex for dynamic conditions
      query = query.where(and(...filterConditions));
    }

    // Apply sorting
    const sortOrder = sortDirection === 'desc' ? desc : asc;
    // @ts-ignore - dynamic column access
    query = query.orderBy(sortOrder(app.schema[sortColumn as keyof typeof app.schema] as any));

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const data = await query;

    // Mask PII if not explicitly requested
    const maskedData = await Promise.all(data.map(async (row) => {
      if (revealPII) {
        assertCan(user, 'reveal_pii', app);
        // Audit the PII revelation
        const { revealPII: auditPIIReveal } = await import('@/lib/audit/mutate');
        await auditPIIReveal(
          { user, ip: request.headers.get('x-forwarded-for') || 'unknown' },
          app.slug,
          row[app.titleField]
        );
        return row;
      }
      
      const maskedRow = { ...row };
      app.columns.forEach(column => {
        if (column.pii) {
          // @ts-ignore - dynamic key access
          maskedRow[column.key] = '••••••••';
        }
      });
      return maskedRow;
    }));

    return NextResponse.json({ data: maskedData });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const app = getAppBySlug(params.slug);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const user = await getCurrentUser();
    const body = await request.json();
    const { action, recordId, inputFields } = body;

    if (!action || !recordId) {
      return NextResponse.json(
        { error: 'action and recordId are required' },
        { status: 400 }
      );
    }

    // Find the action config
    const actionConfig = app.rowActions.find(a => a.key === action);
    if (!actionConfig) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    assertCan(user, 'act', app);

    // Get current record
    // @ts-ignore - dynamic column access
    const [record] = await db.select().from(app.schema).where(eq(app.schema.id, recordId));
    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Check if approval is required
    let requiresApproval = false;
    if (typeof actionConfig.requiresApproval === 'function') {
      requiresApproval = actionConfig.requiresApproval(record);
    } else {
      requiresApproval = actionConfig.requiresApproval || false;
    }

    if (requiresApproval) {
      // Create approval request
      const { createApproval } = await import('@/lib/audit/approvals');
      const approvalId = await createApproval({
        requesterId: user.id,
        app: app.slug,
        recordId,
        action,
        before: record,
        after: { ...record, ...inputFields },
      }, user, request.headers.get('x-forwarded-for') || 'unknown');
      return NextResponse.json({ approvalId, requiresApproval: true });
    }

    // Execute action directly (this would need to be implemented per action)
    // For now, return a placeholder response
    return NextResponse.json({ 
      message: 'Action executed',
      action,
      recordId 
    });
  } catch (error) {
    console.error('Error executing action:', error);
    return NextResponse.json(
      { error: 'Failed to execute action' },
      { status: 500 }
    );
  }
}