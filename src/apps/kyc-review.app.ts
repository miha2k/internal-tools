import { AppConfig } from '../lib/types';
import { kycReviews } from '../lib/db/schema';

export const kycReviewApp: AppConfig<typeof kycReviews> = {
  slug: 'kyc-review',
  title: 'KYC Review',
  tableName: 'kyc_reviews',
  schema: kycReviews,
  titleField: 'caseId',
  columns: [
    {
      key: 'caseId',
      label: 'Case ID',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'customerName',
      label: 'Customer Name',
      type: 'text',
      pii: true,
      filterable: true,
    },
    {
      key: 'country',
      label: 'Country',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'riskScore',
      label: 'Risk Score',
      type: 'text',
      filterable: true,
      sortable: true,
    },
    {
      key: 'documentsSubmitted',
      label: 'Documents Submitted',
      type: 'text',
      filterable: true,
      sortable: true,
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
        { value: 'rejected', label: 'Rejected', tone: 'critical' },
        { value: 'escalated', label: 'Escalated', tone: 'neutral' },
      ],
    },
    {
      key: 'submittedAt',
      label: 'Submitted At',
      type: 'date',
      sortable: true,
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      type: 'text',
      filterable: true,
    },
  ],
  rowActions: [
    {
      key: 'approve',
      label: 'Approve',
      variant: 'default',
      requiresApproval: true, // maker-checker
      apply: () => ({ status: 'approved' }),
    },
    {
      key: 'reject',
      label: 'Reject',
      variant: 'destructive',
      requiresApproval: true, // maker-checker
      apply: () => ({ status: 'rejected' }),
    },
    {
      key: 'escalate',
      label: 'Escalate',
      variant: 'secondary',
      requiresApproval: false,
      apply: () => ({ status: 'escalated' }),
    },
  ],
  detailFields: [
    {
      label: 'Case Information',
      fields: ['caseId', 'customerName', 'country', 'riskScore'],
    },
    {
      label: 'Review Details',
      fields: ['documentsSubmitted', 'status', 'submittedAt', 'assignedTo'],
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
      column: 'riskScore',
      direction: 'desc',
    },
    defaultFilters: {
      status: 'pending',
    },
  },
};
