import type { AppConfig } from '../types';

export type UserRole = 'viewer' | 'operator' | 'approver' | 'admin';

interface User {
  id: string;
  role: UserRole;
}

export type Action = 'view' | 'act' | 'approve' | 'reveal_pii';

/**
 * Asserts that the user has permission to perform the given action on the app.
 * Throws an error if the user is not authorized.
 * 
 * This is enforced server-side in the data layer, not in components.
 * Component-level gating is presentation, not security.
 */
export function assertCan(
  user: User,
  action: Action,
  app: AppConfig
): void {
  const allowedRoles = app.roles[action];
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      `User ${user.id} with role ${user.role} is not authorized to ${action} on app ${app.slug}`
    );
  }
}