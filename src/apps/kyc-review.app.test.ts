import { describe, it, expect } from 'vitest';
import { kycReviewApp } from './kyc-review.app';

describe('kyc-review app requiresApproval predicate', () => {
  it('approve action requires approval (maker-checker)', () => {
    const approveAction = kycReviewApp.rowActions.find(a => a.key === 'approve');
    expect(approveAction).toBeDefined();
    expect(approveAction?.requiresApproval).toBe(true);
  });

  it('reject action requires approval (maker-checker)', () => {
    const rejectAction = kycReviewApp.rowActions.find(a => a.key === 'reject');
    expect(rejectAction).toBeDefined();
    expect(rejectAction?.requiresApproval).toBe(true);
  });

  it('escalate action does not require approval', () => {
    const escalateAction = kycReviewApp.rowActions.find(a => a.key === 'escalate');
    expect(escalateAction).toBeDefined();
    expect(escalateAction?.requiresApproval).toBe(false);
  });
});
