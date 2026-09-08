import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testDb, setupTestDb, cleanupTestDb } from '@/lib/test-setup';
import { kycReviews, auditLog } from '@/lib/db/schema';

// Route it to the in-memory test db and a fixed session user instead of the
// real production db/cookie-based session, so we can call the actual GET
// handler (not a reimplementation) from a plain vitest environment.
vi.mock('@/lib/db/client', async () => {
  const { testDb } = await import('@/lib/test-setup');
  return { db: testDb };
});

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: async () => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'operator',
  }),
}));

describe('GET /api/apps/[slug]/audit', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  it('masks PII columns in the before/after audit blobs', async () => {
    const recordId = 'test-kyc-1';

    await testDb.insert(kycReviews).values({
      id: recordId,
      caseId: 'CASE-123',
      customerName: 'Real Customer Name',
      country: 'US',
      riskScore: 50,
      documentsSubmitted: 3,
      status: 'pending',
      submittedAt: Date.now(),
      assignedTo: 'agent-1',
    });

    // Written the same way mutate() writes it: JSON.stringify() into a
    // mode:'json' column, so this matches what production actually stores.
    await testDb.insert(auditLog).values({
      actor: 'user-1',
      action: 'update',
      app: 'kyc-review',
      recordId,
      before: JSON.stringify({ customerName: 'Real Customer Name', status: 'pending' }),
      after: JSON.stringify({ customerName: 'Real Customer Name', status: 'approved' }),
      createdAt: Date.now(),
      ip: '127.0.0.1',
    });

    const { GET } = await import('./route');
    const request = new Request(`http://localhost/api/apps/kyc-review/audit?recordId=${recordId}`);
    const response = await GET(request, { params: Promise.resolve({ slug: 'kyc-review' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);

    const entry = body.data[0];

    // The raw PII value must not appear anywhere in the response.
    expect(JSON.stringify(body)).not.toContain('Real Customer Name');

    expect(entry.before.customerName).toBe('••••••••');
    expect(entry.after.customerName).toBe('••••••••');

    // Non-PII fields must survive masking untouched.
    expect(entry.before.status).toBe('pending');
    expect(entry.after.status).toBe('approved');
  });
});
