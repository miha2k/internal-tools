import { AppConfig } from '../lib/types';
import { refunds } from '../lib/db/schema';

export const refundsApp: AppConfig<typeof refunds> = {
  slug: 'refunds',
  title: 'Refunds',
  tableName: 'refunds',
  schema: refunds,
  titleField: 'id',
  columns: [
    {
      key: 'id',
      label: 'Refund ID',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'orderId',
      label: 'Order ID',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'customerEmail',
      label: 'Customer Email',
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
      key: 'reason',
      label: 'Reason',
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
        { value: 'approved', label: 'Approved', tone: 'positive' },
        { value: 'denied', label: 'Denied', tone: 'critical' },
        { value: 'partial', label: 'Partial', tone: 'neutral' },
      ],
    },
    {
      key: 'requestedAt',
      label: 'Requested At',
      type: 'date',
      sortable: true,
    },
    {
      key: 'requestedBy',
      label: 'Requested By',
      type: 'text',
      filterable: true,
    },
  ],
  rowActions: [
    {
      key: 'approve',
      label: 'Approve',
      variant: 'outline',
      requiresApproval: (row) => row.amount > 500, // Require approval for refunds over $5.00
      apply: () => ({ status: 'approved' }),
    },
    {
      key: 'deny',
      label: 'Deny',
      variant: 'destructive',
      requiresApproval: (row) => row.amount > 500, // Require approval for refunds over $5.00
      apply: () => ({ status: 'denied' }),
    },
    {
      key: 'partial_refund',
      label: 'Partial Refund',
      variant: 'secondary',
      requiresApproval: (row) => row.amount > 500, // Require approval for refunds over $5.00
      inputFields: [
        {
          key: 'amount',
          label: 'Refund Amount (cents)',
          type: 'number',
          required: true,
        },
      ],
      apply: (row, inputFields) => ({
        status: 'partial',
        amount: inputFields?.amount ?? row.amount,
      }),
    },
  ],
  detailFields: [
    {
      label: 'Refund Details',
      fields: ['id', 'orderId', 'customerEmail', 'amount', 'currency'],
    },
    {
      label: 'Request Information',
      fields: ['reason', 'status', 'requestedAt', 'requestedBy'],
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
      column: 'requestedAt',
      direction: 'desc',
    },
  },
};
