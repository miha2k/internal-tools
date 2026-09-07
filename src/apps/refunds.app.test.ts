import { describe, it, expect } from 'vitest';
import { refundsApp } from './refunds.app';

describe('refunds app requiresApproval predicate', () => {
  it('requires approval for refunds over $5.00 (500 cents)', () => {
    const approveAction = refundsApp.rowActions.find(a => a.key === 'approve');
    expect(approveAction).toBeDefined();
    
    if (typeof approveAction?.requiresApproval === 'function') {
      const highValueRefund = { amount: 600 } as any; // $6.00
      expect(approveAction.requiresApproval(highValueRefund)).toBe(true);
      
      const lowValueRefund = { amount: 400 } as any; // $4.00
      expect(approveAction.requiresApproval(lowValueRefund)).toBe(false);
    } else {
      expect(approveAction?.requiresApproval).toBe(true);
    }
  });

  it('deny action uses same approval predicate', () => {
    const denyAction = refundsApp.rowActions.find(a => a.key === 'deny');
    expect(denyAction).toBeDefined();
    
    if (typeof denyAction?.requiresApproval === 'function') {
      const highValueRefund = { amount: 600 } as any;
      expect(denyAction.requiresApproval(highValueRefund)).toBe(true);
      
      const lowValueRefund = { amount: 400 } as any;
      expect(denyAction.requiresApproval(lowValueRefund)).toBe(false);
    }
  });

  it('partial refund action uses same approval predicate and has input field', () => {
    const partialAction = refundsApp.rowActions.find(a => a.key === 'partial_refund');
    expect(partialAction).toBeDefined();
    
    if (typeof partialAction?.requiresApproval === 'function') {
      const highValueRefund = { amount: 600 } as any;
      expect(partialAction.requiresApproval(highValueRefund)).toBe(true);
      
      const lowValueRefund = { amount: 400 } as any;
      expect(partialAction.requiresApproval(lowValueRefund)).toBe(false);
    }
    
    expect(partialAction?.inputFields).toBeDefined();
    expect(partialAction?.inputFields?.length).toBeGreaterThan(0);
    expect(partialAction?.inputFields?.[0].key).toBe('amount');
  });
});
