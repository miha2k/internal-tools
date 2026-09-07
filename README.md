# Internal Tools Platform

A schema-driven internal tools platform built with Next.js 15, TypeScript, Tailwind, shadcn/ui, Drizzle ORM, and SQLite. The platform is designed to make adding new internal tools nearly free - each app is configuration, not code.

## Architecture

This is a proof of concept for a fintech evaluating whether to replace Microsoft Power Apps with an in-house internal-tools platform. The key principle is that the fourth, fifth, and tenth app are nearly free to add.

### Core Principles

- **Configuration over Code**: Individual apps are configuration files (`src/apps/<slug>.app.ts`), not React components
- **Type Safety**: Apps are typed with generic AppConfig<TTable> for compile-time safety
- **Security First**: RBAC enforced server-side, audit logging is structurally impossible to bypass
- **Maker-Checker**: Built-in approval workflow with self-approval rejection

## Tech Stack

- **Framework**: Next.js 15 App Router
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
- 50 sample transactions for demo purposes

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

### Worked Example: Transactions App

Here's the complete configuration for the Transactions app:

```typescript
import { AppConfig } from '../lib/types';
import { transactions } from '../lib/db/schema';

export const transactionsApp: AppConfig<typeof transactions> = {
  slug: 'transactions',
  title: 'Transactions',
  tableName: 'transactions',
  schema: transactions,
  titleField: 'id',
  
  columns: [
    {
      key: 'id',
      label: 'ID',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'customerId',
      label: 'Customer ID',
      type: 'text',
      pii: true,              // Masked by default
      filterable: true,
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'currency',        // Auto-formatted as currency
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
        { value: 'completed', label: 'Completed', tone: 'positive' },
        { value: 'failed', label: 'Failed', tone: 'critical' },
        { value: 'refunded', label: 'Refunded', tone: 'neutral' },
      ],
    },
    // ... more columns
  ],
  
  rowActions: [
    {
      key: 'refund',
      label: 'Refund',
      variant: 'destructive',
      requiresApproval: (row) => row.amount > 5000, // Approval for >$50
      inputFields: [
        {
          key: 'reason',
          label: 'Reason',
          type: 'text',
          required: true,
        },
      ],
    },
    // ... more actions
  ],
  
  detailFields: [
    {
      label: 'Transaction Details',
      fields: ['id', 'customerId', 'amount', 'currency', 'status'],
    },
    {
      label: 'Additional Information',
      fields: ['description', 'createdAt', 'updatedAt'],
    },
  ],
  
  roles: {
    view: ['viewer', 'operator', 'approver', 'admin'],
    act: ['operator', 'approver', 'admin'],
    approve: ['approver', 'admin'],
  },
  
  viewState: {
    defaultSort: {
      column: 'createdAt',
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
│   └── transactions.app.ts # Example app config
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

## Future Enhancements

- Real authentication system
- Email notifications for approvals
- Advanced filtering and search
- Export functionality
- More shadcn/ui components
- Performance optimizations