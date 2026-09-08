import { AppConfig } from '../lib/types';
import { featureFlags } from '../lib/db/schema';

export const featureFlagsApp: AppConfig<typeof featureFlags> = {
  slug: 'feature-flags',
  title: 'Feature Flags',
  tableName: 'feature_flags',
  schema: featureFlags,
  titleField: 'key',
  columns: [
    {
      key: 'key',
      label: 'Key',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      filterable: true,
    },
    {
      key: 'environment',
      label: 'Environment',
      type: 'enum',
      filterable: true,
      sortable: true,
      enumOptions: [
        { value: 'development', label: 'Development', tone: 'neutral' },
        { value: 'staging', label: 'Staging', tone: 'warning' },
        { value: 'production', label: 'Production', tone: 'critical' },
      ],
    },
    {
      key: 'enabled',
      label: 'Enabled',
      type: 'enum', // Use enum instead of boolean since SQLite stores as 0/1
      filterable: true,
      sortable: true,
      enumOptions: [
        { value: '1', label: 'Enabled', tone: 'positive' },
        { value: '0', label: 'Disabled', tone: 'neutral' },
      ],
    },
    {
      key: 'rolloutPct',
      label: 'Rollout %',
      type: 'number',
      filterable: true,
      sortable: true,
    },
    {
      key: 'owner',
      label: 'Owner',
      type: 'text',
      filterable: true,
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      type: 'date',
      sortable: true,
    },
  ],
  rowActions: [
    {
      key: 'toggle',
      label: 'Toggle',
      variant: 'default',
      requiresApproval: (row) => row.environment === 'production',
      apply: (row) => ({ enabled: row.enabled ? 0 : 1 }),
    },
    {
      key: 'set_rollout',
      label: 'Set Rollout',
      variant: 'secondary',
      requiresApproval: (row) => row.environment === 'production',
      inputFields: [
        {
          key: 'rolloutPct',
          label: 'Rollout Percentage (0-100)',
          type: 'number',
          required: true,
        },
      ],
      apply: (row, inputFields) => ({
        rolloutPct: inputFields?.rolloutPct ?? row.rolloutPct,
      }),
    },
  ],
  detailFields: [
    {
      label: 'Flag Configuration',
      fields: ['key', 'description', 'environment', 'enabled'],
    },
    {
      label: 'Rollout Settings',
      fields: ['rolloutPct', 'owner', 'updatedAt'],
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
      column: 'key',
      direction: 'asc',
    },
  },
};
