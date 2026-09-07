import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { transactions } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/server';
import { assertCan } from '@/lib/auth/rbac';
import { transactionsApp } from '@/apps/transactions.app';
import { desc, asc, eq, and, or, like } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    assertCan(user, 'view', transactionsApp);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortColumn = searchParams.get('sort') || transactionsApp.viewState.defaultSort.column;
    const sortDirection = searchParams.get('order') || transactionsApp.viewState.defaultSort.direction;
    const search = searchParams.get('search') || '';

    // Build base query
    let query = db.select().from(transactions);

    // Apply search
    if (search) {
      query = query.where(
        or(
          like(transactions.id, `%${search}%`),
          like(transactions.customerId, `%${search}%`),
          like(transactions.description, `%${search}%`)
        )
      );
    }

    // Apply filters
    const filterConditions = [];
    transactionsApp.columns.forEach(column => {
      if (column.filterable && searchParams.has(column.key as string)) {
        const value = searchParams.get(column.key as string);
        if (value) {
          filterConditions.push(eq(transactions[column.key as keyof typeof transactions] as any, value));
        }
      }
    });

    if (filterConditions.length > 0) {
      // @ts-ignore - Drizzle typing is complex for dynamic conditions
      query = query.where(and(...filterConditions));
    }

    // Apply sorting
    const sortOrder = sortDirection === 'desc' ? desc : asc;
    query = query.orderBy(sortOrder(transactions[sortColumn as keyof typeof transactions] as any));

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const data = await query;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}