import { cookies } from 'next/headers';
import { MOCK_USERS } from './index';
import type { User } from './index';

/**
 * Get the current user from the session cookie (server-side only).
 * Returns the first user if no session is set (default to Alice Viewer).
 */
export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  
  if (userId) {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) return user;
  }
  
  // Default to first user if no session and set the cookie
  const defaultUser = MOCK_USERS[0];
  cookieStore.set('user_id', defaultUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  
  return defaultUser;
}

/**
 * Set the current user in the session cookie (server-side only).
 * This is used by the role switcher to change the active user without logging out.
 */
export async function setCurrentUser(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}