import { db } from '../db/client';
import { auditLog } from '../db/schema';
import type { Transaction } from '../db/client';

interface User {
  id: string;
  role: string;
}

interface MutationContext {
  user: User;
  ip: string;
}

interface MutationSpec<T> {
  app: string;
  action: string;
  recordId: string | number;
  run: (tx: Transaction) => Promise<{ before: any; after: any; result: T }>;
}

/**
 * The ONLY exported way to change data. All mutations must route through this function.
 * The audit row is written inside the same transaction as the mutation, so an unaudited
 * mutation cannot commit.
 */
export async function mutate<T>(
  ctx: MutationContext,
  spec: MutationSpec<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    const { before, after, result } = await spec.run(tx);

    // Write audit log in the same transaction
    await tx.insert(auditLog).values({
      actor: ctx.user.id,
      action: spec.action,
      app: spec.app,
      recordId: String(spec.recordId),
      before: before ? JSON.stringify(before) : null,
      after: after ? JSON.stringify(after) : null,
      createdAt: Date.now(),
      ip: ctx.ip,
    });

    return result;
  });
}