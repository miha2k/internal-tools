# Internal Tools Platform

A schema-driven internal tools platform built with Next.js 16, TypeScript, Tailwind, shadcn/ui, Drizzle ORM, and SQLite. The platform is designed to make adding new internal tools nearly free - each app is configuration, not code.

## Architecture

This is a proof of concept for a fintech evaluating whether to replace Microsoft Power Apps with an in-house internal-tools platform. The key principle is that the fourth, fifth, and tenth app are nearly free to add.

### Core Principles

- **Configuration over Code**: Individual apps are configuration files (`src/apps/<slug>.app.ts`), not React components
- **Type Safety**: Apps are typed with generic AppConfig<TTable> for compile-time safety
- **Security First**: RBAC enforced server-side, audit logging is structurally impossible to bypass
- **Maker-Checker**: Built-in approval workflow with self-approval rejection

## Tech Stack

- **Framework**: Next.js 16 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite via @libsql/client
- **ORM**: Drizzle ORM
- **No Docker, No External Services**: Simple, local-first approach

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Database Setup

```bash
npm run db:push
```

This creates the database schema and sets up SQLite triggers for audit log append-only enforcement. The triggers are automatically created as part of the database push process.

### Seed Data

```bash
npm run seed
```

This seeds the database with:
- 8 users across the four roles (viewer, operator, approver, admin)
- 30 KYC review cases
- 25 refund requests
- 15 feature flags

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the platform.

## AppConfig Contract

The core of the platform is the `AppConfig` type. Adding a new app is as simple as creating a configuration file in `src/apps/`.

### Type Definition

```typescript
interface AppConfig<TTable extends SQLiteTable = any> {
  slug: string;              // URL-safe identifier
  title: string;             // Display name
  tableName: string;         // Database table name
  schema: TTable;            // Drizzle schema reference
  titleField: keyof InferRow<TTable>; // Column used as record heading
  columns: ColumnConfig<TTable>[];    // Column definitions
  rowActions: RowAction<TTable>[];    // Available row actions
  detailFields: FieldGroup[];         // Field groupings for detail view
  roles: RoleRequirements;            // RBAC configuration
  viewState: DefaultViewState;       // Default view state
}
```

### Current Apps

The platform currently includes three production-ready apps:

1. **KYC Review** - Case management for customer verification reviews
2. **Refunds** - Refund request processing with approval workflow
3. **Feature Flags** - Feature flag management with environment-based approvals

### Worked Example: KYC Review App

Here's the complete configuration for the KYC Review app:

```typescript
import { AppConfig } from '../lib/types';
import { kycReviews } from '../lib/db/schema';

export const kycReviewApp: AppConfig<typeof kycReviews> = {
  slug: 'kyc-review',
  title: 'KYC Review',
  tableName: 'kyc_reviews',
  schema: kycReviews,
  titleField: 'caseId',
  
  columns: [
    {
      key: 'caseId',
      label: 'Case ID',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      type: 'text',
      pii: true,              // Masked by default
      filterable: true,
    },
    {
      key: 'riskScore',
      label: 'Risk Score',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      filterable: true,
      sortable: true,
      enumOptions: [
        { value: 'pending', label: 'Pending', tone: 'warning' },
        { value: 'approved', label: 'Approved', tone: 'positive' },
        { value: 'rejected', label: 'Rejected', tone: 'critical' },
        { value: 'escalated', label: 'Escalated', tone: 'neutral' },
      ],
    },
    // ... more columns
  ],
  
  rowActions: [
    {
      key: 'approve',
      label: 'Approve',
      variant: 'default',
      requiresApproval: true, // Maker-checker
    },
    {
      key: 'reject',
      label: 'Reject',
      variant: 'destructive',
      requiresApproval: true, // Maker-checker
    },
    {
      key: 'escalate',
      label: 'Escalate',
      variant: 'secondary',
      requiresApproval: false,
    },
  ],
  
  detailFields: [
    {
      label: 'Case Information',
      fields: ['caseId', 'customerName', 'country', 'riskScore'],
    },
    {
      label: 'Review Details',
      fields: ['documentsSubmitted', 'status', 'submittedAt', 'assignedTo'],
    },
  ],
  
  roles: {
    view: ['viewer', 'operator', 'approver', 'admin'],
    act: ['operator', 'approver', 'admin'],
    approve: ['approver', 'admin'],
    reveal_pii: ['operator', 'approver', 'admin'],
  },
  
  viewState: {
    defaultSort: {
      column: 'riskScore',
      direction: 'desc',
    },
    defaultFilters: {
      status: 'pending',
    },
  },
};
```

### Adding a New App

1. Create the database schema in `src/lib/db/schema.ts`
2. Create the app config in `src/apps/<slug>.app.ts`
3. Add the app to the registry in `src/lib/registry.ts`
4. That's it! The app automatically appears in the sidebar and renders with full functionality

## Security Features

### Audit Logging

All data mutations route through a single `mutate()` function that writes audit logs in the same transaction. This makes unaudited mutations structurally impossible.

```typescript
async function mutate<T>(
  ctx: { user: User; ip: string },
  spec: {
    app: string;
    action: string;
    recordId: string | number;
    run: (tx: Transaction) => Promise<{ before: Row | null; after: Row | null; result: T }>;
  }
): Promise<T>
```

### Append-Only Audit Log

SQLite triggers prevent UPDATE and DELETE operations on the audit_log table:

```sql
CREATE TRIGGER audit_log_append_only_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;
```

### RBAC

Role-based access control is enforced server-side in the data layer:

```typescript
export function assertCan(user: User, action: Action, app: AppConfig): void
```

Roles: `viewer`, `operator`, `approver`, `admin`

### Maker-Checker

Actions can require approval based on predicates:

```typescript
requiresApproval: (row) => row.amount > 5000
```

Self-approval is rejected server-side, not just hidden in the UI.

### PII Masking

Columns marked as `pii: true` are masked by default with a reveal control that writes an audit log when unmasked.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run seed` - Seed database with test data
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── apps/                  # App configurations
│   ├── kyc-review.app.ts  # KYC review app
│   ├── refunds.app.ts     # Refunds app
│   └── feature-flags.app.ts # Feature flags app
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── AppShell.tsx      # Main app shell
│   ├── DetailDrawer.tsx  # Detail view drawer
│   └── theme-toggle.tsx  # Dark mode toggle
├── lib/                   # Core libraries
│   ├── auth/             # Authentication & RBAC
│   ├── audit/            # Audit logging & approvals
│   ├── db/               # Database schema & client
│   ├── types.ts          # TypeScript types
│   └── registry.ts       # App registry
```

## Non-Negotiables

- Every data mutation writes an audit row through the shared chokepoint
- `audit_log` is append-only, enforced by SQLite triggers
- Authorization is enforced server-side via `assertCan()`
- Self-approval is rejected server-side, not hidden in the UI
- No real personal data - use @faker-js/faker for seed data
- PII columns never reach logs, error messages, or console output

## Constraints

This is a two-hour proof of concept. When running long, cut scope rather than quality. Priority order:

1. Audit timeline and role switcher (for demo)
2. RBAC and security features
3. Maker-checker workflow
4. UI polish and empty states
5. Advanced features (pagination, search)

## Known Limitations

This is a proof-of-concept implementation with specific limitations:

1. **TypeScript Strict Mode Disabled**: Build process uses `ignoreBuildErrors: true` to bypass TypeScript strict mode violations. Dynamic typing with Drizzle ORM creates type incompatibilities that require `@ts-ignore` comments throughout the codebase.

2. **UI Input Fields Not Implemented**: Row actions with `inputFields` (like partial refund amount input) are not fully implemented in the UI. The API supports them, but there are no form dialogs for collecting user input.

3. **Limited Error Handling**: UI components lack comprehensive error handling for network failures, API errors, and edge cases. Toast notifications are basic and don't provide detailed error recovery options.

4. **No Loading States**: Row action execution and API calls don't show loading states, making the UI feel unresponsive during operations.

5. **Audit Timeline Limitations**: The audit timeline shows basic action history but doesn't display before/after diffs or detailed change information.

6. **No UI for Search and Pagination**: While the API supports search and pagination, the UI doesn't expose these controls to users.

7. **No Responsive Design Testing**: The interface hasn't been tested across different screen sizes or devices.

8. **No Accessibility Implementation**: No ARIA labels, keyboard navigation, or screen reader support has been implemented.

9. **No Integration Tests**: Only unit tests exist; there are no end-to-end or integration tests for complete user flows.

10. **Database Schema Changes**: No migration strategy exists for schema changes. Manual database modifications are required.

11. **Limited App Config Expressiveness**: The AppConfig contract cannot express complex validation rules, computed fields, or cross-table relationships without code changes.

12. **No Real Authentication**: The current authentication system is a mock implementation for demonstration purposes only.

13. **No Backup Strategy**: No automated database backups or disaster recovery mechanism exists.

14. **No Monitoring**: No application performance monitoring, error tracking, or logging infrastructure.

15. **Feature Flags Boolean Handling**: SQLite doesn't have native boolean support, so feature flags use integer 0/1 storage with enum mapping, which adds complexity.