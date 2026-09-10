# Internal Tools Platform

A schema-driven internal tools platform built with Next.js 16, TypeScript, Tailwind, shadcn/ui, Drizzle ORM, and SQLite. Each app is a configuration file, not code, so adding a new internal tool is cheap.

## Scope

This prototype was built for a fintech evaluating whether to replace Microsoft Power Apps with an in-house internal-tools platform. It was deliberately time-boxed, and the scope was chosen to prove the core thesis - that the fourth, fifth, and tenth app are nearly free to add - rather than to be production-complete.

In scope, and implemented:

- Declarative `AppConfig` contract with three apps built on it (KYC Review, Refunds, Feature Flags)
- Server-side RBAC, transactional audit logging, and an append-only `audit_log`
- Maker-checker approvals with server-side self-approval rejection
- PII masking with audited reveal
- Audit timeline and role switcher for demoing the above
- Unit tests for the security-critical paths, run in CI

Out of scope by design - see [Known Limitations](#known-limitations) for the full list:

- Real authentication, migrations, monitoring, and other production plumbing
- UI polish beyond what the demo needs (pagination controls, input dialogs, before/after diffs)

## Architecture

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

- Node.js 20.9+ (required by Next.js 16; CI uses Node 20)
- npm (a `package-lock.json` is committed; CI installs with `npm ci --legacy-peer-deps`)

### Installation

```bash
npm install --legacy-peer-deps
```

### Database Setup

```bash
npm run db:push
```

This pushes the Drizzle schema to a local SQLite file (`local.db`, gitignored) and then runs `src/lib/db/setup-triggers.ts`, which installs the SQLite triggers that make `audit_log` append-only.

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

Open [http://localhost:3000](http://localhost:3000). The home page is the Approvals queue; the three apps are in the sidebar. Use the user switcher in the sidebar to change the active role - no login is required.

### Tests

```bash
npm run test:run
```

Unit tests (Vitest) cover RBAC, the `mutate()` chokepoint, approvals and self-approval rejection, the `requiresApproval` predicates, the append-only triggers, PII masking in the audit endpoint, and each app config. The same command runs on every pull request via GitHub Actions (`.github/workflows/test.yml`).

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

The platform includes three apps:

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
      apply: () => ({ status: 'approved' }),
    },
    {
      key: 'reject',
      label: 'Reject',
      variant: 'destructive',
      requiresApproval: true, // Maker-checker
      apply: () => ({ status: 'rejected' }),
    },
    {
      key: 'escalate',
      label: 'Escalate',
      variant: 'secondary',
      requiresApproval: false,
      apply: () => ({ status: 'escalated' }),
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
4. Run `npm run db:push` to create the table

The app then appears in the sidebar and gets the table view, detail drawer, row actions, approvals, PII masking, and audit timeline with no additional UI code.

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

Actions can require approval unconditionally or based on a predicate over the row:

```typescript
requiresApproval: true
requiresApproval: (row) => row.amount > 500              // refunds over $5.00 (amounts are in cents)
requiresApproval: (row) => row.environment === 'production' // feature flags
```

When approval is required, the action creates a pending `approvals` row instead of mutating the record. An approver applies or rejects it from the Approvals page. Self-approval is rejected server-side, not just hidden in the UI.

### PII Masking

Columns marked as `pii: true` are masked (`••••••••`) in list responses, approval diffs, and audit entries. The detail drawer has a per-field reveal control that calls `/api/reveal-pii`, which checks the `reveal_pii` role and writes a `reveal_pii` audit row before returning the value.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Serve the production build
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest in watch mode
- `npm run test:run` - Run the test suite once (used in CI)
- `npm run db:push` - Push schema to `local.db` and install the audit triggers
- `npm run db:studio` - Open Drizzle Studio to browse the database
- `npm run seed` - Seed database with fake data

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

## Known Limitations

These are the gaps in the prototype as it stands. Each was verified against the current code.

1. **TypeScript strictness relaxed**: `tsconfig.json` has `strict: false` and `next.config.ts` sets `typescript.ignoreBuildErrors: true`. Driving Drizzle queries from a runtime `AppConfig` (dynamic table and column access) is hard to type, so the data layer uses `@ts-ignore` in a handful of places.

2. **No authentication**: The active user is a `user_id` cookie selected via the role switcher, resolved against a hard-coded `MOCK_USERS` list. Anyone can switch to `admin`. The seeded `users` table is unrelated to this list.

3. **No input dialogs for `inputFields`**: The `partial_refund` action declares an `amount` input and the API accepts it, but the UI never prompts for it, so the action falls back to the row's existing amount.

4. **No confirmation for destructive actions**: The drawer checks `action.destructive`, which is not a field on `RowAction` (the type uses `variant: 'destructive'`). Destructive actions that don't require approval execute immediately.

5. **Audit timeline shows no diffs**: The `/audit` endpoint returns masked `before`/`after` JSON, but the timeline renders only action, actor, and timestamp.

6. **No pagination controls**: The API accepts `page` and `limit`, but the UI always requests the first 50 rows. Search and per-column filters are exposed; search is a `LIKE` over `text` columns only.

7. **Approvals apply a stale snapshot**: Approving writes the `after` object captured at request time, so it overwrites any changes made to the record in between. Nothing prevents multiple pending approvals for the same record.

8. **Bulk PII reveal via query parameter**: `GET /api/apps/<slug>?reveal_pii=true` returns unmasked rows (gated by the `reveal_pii` role) and writes one audit row per returned record. The UI does not use it; the per-field reveal in the drawer is the intended path.

9. **Coarse error handling**: API routes return generic 500s (approvals surface the error message; other routes do not), and the UI reports failures as a fixed "Action failed" toast. Successful direct actions refresh the page with `window.location.reload()`.

10. **Manual app registry**: New apps must be imported and listed in `src/lib/registry.ts`; there is no auto-discovery.

11. **No migrations**: Schema changes go through `drizzle-kit push`; there are no versioned migration files. `triggers.sql` also contains `CREATE TABLE IF NOT EXISTS` statements that duplicate the Drizzle schema.

12. **Limited config expressiveness**: `AppConfig` cannot express validation rules, computed fields, or cross-table relationships without code changes. Column `type` is not derived from the schema (e.g. `riskScore` is declared as `text`).

13. **Booleans stored as integers**: SQLite has no boolean type, so `feature_flags.enabled` is `0`/`1` and the UI maps it back when rendering.

14. **Unit tests only**: 20 Vitest tests cover the security-critical paths; there are no end-to-end or browser tests, and the UI is untested.

15. **Not audited for accessibility or responsiveness**: Interactive primitives come from shadcn/ui (Base UI) and carry their defaults, but no accessibility or multi-viewport review has been done.

16. **No production plumbing**: No monitoring, error tracking, or backup strategy.