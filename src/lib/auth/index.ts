import type { UserRole } from './rbac';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// In-memory user store for the stubbed auth system
// In production, this would be a real authentication system
export const MOCK_USERS: User[] = [
  { id: '1', name: 'Alice Viewer', email: 'alice@example.com', role: 'viewer' },
  { id: '2', name: 'Bob Operator', email: 'bob@example.com', role: 'operator' },
  { id: '3', name: 'Charlie Approver', email: 'charlie@example.com', role: 'approver' },
  { id: '4', name: 'Diana Admin', email: 'diana@example.com', role: 'admin' },
  { id: '5', name: 'Eve Viewer', email: 'eve@example.com', role: 'viewer' },
  { id: '6', name: 'Frank Operator', email: 'frank@example.com', role: 'operator' },
  { id: '7', name: 'Grace Approver', email: 'grace@example.com', role: 'approver' },
  { id: '8', name: 'Henry Admin', email: 'henry@example.com', role: 'admin' },
];

/**
 * Get all available users for the role switcher.
 * This is client-safe.
 */
export function getAllUsers(): User[] {
  return MOCK_USERS;
}