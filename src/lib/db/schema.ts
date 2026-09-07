import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(), // viewer, operator, approver, admin
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actor: text('actor').notNull(), // user ID
  action: text('action').notNull(), // create, update, delete, reveal_pii, approve, reject
  app: text('app').notNull(), // app slug
  recordId: text('record_id').notNull(),
  before: text('before', { mode: 'json' }), // JSON string of row state
  after: text('after', { mode: 'json' }), // JSON string of row state
  createdAt: integer('created_at').notNull(),
  ip: text('ip'),
});

export const approvals = sqliteTable('approvals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requesterId: text('requester_id').notNull(),
  app: text('app').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(),
  before: text('before', { mode: 'json' }).notNull(),
  after: text('after', { mode: 'json' }).notNull(),
  status: text('status').notNull(), // pending, approved, rejected
  approverId: text('approver_id'),
  createdAt: integer('created_at').notNull(),
  decidedAt: integer('decided_at'),
});

// Example: Transactions app schema
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  amount: integer('amount').notNull(), // stored in cents
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull(), // pending, completed, failed, refunded
  description: text('description'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;