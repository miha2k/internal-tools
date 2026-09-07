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

// KYC Review app schema
export const kycReviews = sqliteTable('kyc_reviews', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull(),
  customerName: text('customer_name').notNull(),
  country: text('country').notNull(),
  riskScore: integer('risk_score').notNull(),
  documentsSubmitted: integer('documents_submitted').notNull(),
  status: text('status').notNull(), // pending, approved, rejected, escalated
  submittedAt: integer('submitted_at').notNull(),
  assignedTo: text('assigned_to'),
});

// Refunds app schema
export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  customerEmail: text('customer_email').notNull(),
  amount: integer('amount').notNull(), // stored in cents
  currency: text('currency').notNull().default('USD'),
  reason: text('reason'),
  status: text('status').notNull(), // pending, approved, denied, partial
  requestedAt: integer('requested_at').notNull(),
  requestedBy: text('requested_by').notNull(),
});

// Feature Flags app schema
export const featureFlags = sqliteTable('feature_flags', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  description: text('description'),
  environment: text('environment').notNull(), // development, staging, production
  enabled: integer('enabled').notNull().default(0), // 0 or 1 for boolean
  rolloutPct: integer('rollout_pct').notNull().default(0),
  owner: text('owner'),
  updatedAt: integer('updated_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
export type KycReview = typeof kycReviews.$inferSelect;
export type NewKycReview = typeof kycReviews.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;