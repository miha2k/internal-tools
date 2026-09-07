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
      pii: true,
      filterable: true,
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'currency',
      filterable: true,
      sortable: true,
    },
    {
      key: 'currency',
      label: 'Currency',
      type: 'text',
      filterable: true,
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
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      filterable: true,
    },
    {
      key: 'createdAt',
      label: 'Created',
      type: 'date',
      sortable: true,
    },
  ],
  rowActions: [
    {
      key: 'refund',
      label: 'Refund',
      variant: 'destructive',
      requiresApproval: (row) => row.amount > 5000, // Require approval for refunds over $50
      inputFields: [
        {
          key: 'reason',
          label: 'Reason',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      key: 'complete',
      label: 'Mark Complete',
      variant: 'primary',
      requiresApproval: false,
    },
    {
      key: 'fail',
      label: 'Mark Failed',
      variant: 'secondary',
      requiresApproval: false,
    },
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
    reveal_pii: ['operator', 'approver', 'admin'],
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