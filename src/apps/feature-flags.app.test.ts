import { describe, it, expect } from 'vitest';
import { featureFlagsApp } from './feature-flags.app';

describe('feature-flags app requiresApproval predicate', () => {
  it('requires approval for production environment', () => {
    const toggleAction = featureFlagsApp.rowActions.find(a => a.key === 'toggle');
    expect(toggleAction).toBeDefined();
    
    if (typeof toggleAction?.requiresApproval === 'function') {
      const productionFlag = { environment: 'production' } as any;
      expect(toggleAction.requiresApproval(productionFlag)).toBe(true);
      
      const stagingFlag = { environment: 'staging' } as any;
      expect(toggleAction.requiresApproval(stagingFlag)).toBe(false);
      
      const devFlag = { environment: 'development' } as any;
      expect(toggleAction.requiresApproval(devFlag)).toBe(false);
    } else {
      expect(toggleAction?.requiresApproval).toBe(true);
    }
  });

  it('set rollout action uses same approval predicate and has input field', () => {
    const rolloutAction = featureFlagsApp.rowActions.find(a => a.key === 'set_rollout');
    expect(rolloutAction).toBeDefined();
    
    if (typeof rolloutAction?.requiresApproval === 'function') {
      const productionFlag = { environment: 'production' } as any;
      expect(rolloutAction.requiresApproval(productionFlag)).toBe(true);
      
      const stagingFlag = { environment: 'staging' } as any;
      expect(rolloutAction.requiresApproval(stagingFlag)).toBe(false);
    }
    
    expect(rolloutAction?.inputFields).toBeDefined();
    expect(rolloutAction?.inputFields?.length).toBeGreaterThan(0);
    expect(rolloutAction?.inputFields?.[0].key).toBe('rolloutPct');
  });
});
