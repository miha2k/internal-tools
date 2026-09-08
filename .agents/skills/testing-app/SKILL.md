---
name: internal-tools-browser-testing
description: Run local fresh-SQLite browser regression flows for schema-driven internal tools, including PII reveal and maker-checker approvals.
---

# Local setup
- Run from the internal-tools repo root. If npm is absent from PATH, activate the installed nvm Node version; this environment has `$HOME/.nvm/versions/node/v24.19.0/bin`.
- Dependencies may already exist. Do not repeat installs or shell tests already verified by the lead.
- Explicitly set `TURSO_DATABASE_URL=file:local.db` and unset `TURSO_AUTH_TOKEN` for local-only tests.
- For a fresh database, stop any running app and preserve the existing local.db outside the repo before rebuilding. `npm run seed` alone is not a reset.
- Run `npm run db:push && npm run seed`, then `npm run dev`. Push installs append-only audit triggers. Expected seed totals: 8 users, 30 KYC reviews, 25 refunds, 15 flags; seed values and pending counts are random.

# Browser flows
- Open `http://localhost:3000`. Authentication is mocked: default Alice Viewer; sidebar user menu switches to Bob Operator (ID 2) or Charlie Approver (ID 3). These names come from MOCK_USERS, not randomly seeded users.
- Sidebar links lead to `/app/refunds`, `/app/kyc-review`, `/app/feature-flags`; `/` is Approvals.
- KYC defaults to Pending sorted by descending risk score. Select a pending case and note its case ID before starting.
- Row View opens details; customer-name eye control calls `/api/reveal-pii`. Confirm unmasking visually and compare to seed without printing PII. Close/reopen to remask and refresh audit timeline.
- Bob can request KYC Approve → Confirm. The KYC record must remain pending. Close the drawer if the success toast is obscured.
- Switch to Charlie, open Approvals, check requester and masked before/after snapshots, then approve. Confirm zero pending and the case under Approved status filter.
- Read SQLite only for persistence evidence: `reveal_pii` actor 2, `create_approval` actor 2, and `approve` actor 3. Approval audit rows may reference approval IDs instead of the underlying record UUID, so record timeline alone is insufficient evidence.
- Capture browser console and dev-server status output; do not use authenticated curl requests.

## Devin Secrets Needed
None for local mocked-auth SQLite testing.
