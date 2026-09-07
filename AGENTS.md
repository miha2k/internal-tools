<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules

## What this repo is

A schema-driven internal-tools platform. Individual apps are configuration
(`src/apps/<slug>.app.ts`), not code. The point of the architecture is that adding
an app is a config file — never a new React component.

## Non-negotiables

- Every data mutation writes an audit row through the shared chokepoint in the data
  layer. A mutation path that bypasses it is a bug, not a style preference.
- `audit_log` is append-only, enforced by SQLite triggers. Never write code that
  UPDATEs or DELETEs it.
- Authorization is enforced server-side in the data layer via `assertCan()`.
  Component-level gating is presentation, not security.
- Self-approval is rejected server-side, not hidden in the UI.

## Data

- No real personal data, ever. Seed and test data comes from `@faker-js/faker`.
- Columns flagged `pii` must never reach logs, error messages, or console output.

## Scope

This is a client-facing proof of concept built under a two-hour budget. Favour
clarity and small diffs over completeness. Don't add a dependency without
justifying it in the PR description. When running long, cut scope, not quality.
