import { describe, it, expect } from 'vitest';
import { assertCan } from './rbac';
import type { AppConfig } from '../types';
import { kycReviews } from '../db/schema';

describe('assertCan', () => {
  const mockApp: AppConfig = {
    slug: 'test',
    title: 'Test App',
    tableName: 'test',
    schema: kycReviews,
    titleField: 'caseId',
    columns: [],
    rowActions: [],
    detailFields: [],
    roles: {
      view: ['viewer', 'operator', 'approver', 'admin'],
      act: ['operator', 'approver', 'admin'],
      approve: ['approver', 'admin'],
      reveal_pii: ['operator', 'approver', 'admin'],
    },
    viewState: {
      defaultSort: { column: 'caseId', direction: 'asc' },
    },
  };

  it('throws when a viewer attempts an action requiring operator', () => {
    const viewer = { id: '1', role: 'viewer' as const };
    
    expect(() => assertCan(viewer, 'act', mockApp)).toThrow(
      /User 1 with role viewer is not authorized to act on app test/
    );
  });

  it('allows operator to perform act action', () => {
    const operator = { id: '2', role: 'operator' as const };
    
    expect(() => assertCan(operator, 'act', mockApp)).not.toThrow();
  });

  it('allows viewer to perform view action', () => {
    const viewer = { id: '1', role: 'viewer' as const };
    
    expect(() => assertCan(viewer, 'view', mockApp)).not.toThrow();
  });

  it('throws when operator attempts approve action', () => {
    const operator = { id: '2', role: 'operator' as const };
    
    expect(() => assertCan(operator, 'approve', mockApp)).toThrow(
      /User 2 with role operator is not authorized to approve on app test/
    );
  });
});
