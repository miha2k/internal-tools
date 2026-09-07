import { mutate } from './mutate';
import type { User } from '../auth';

/**
 * Mask a PII value for display.
 */
export function maskPII(value: string): string {
  if (!value) return '';
  
  // Show first 2 and last 2 characters, mask the rest
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }
  
  return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
}

/**
 * Reveal a PII value and write an audit row.
 * This should be called when a user clicks the reveal control.
 */
export async function revealPII(
  user: User,
  ip: string,
  app: string,
  recordId: string | number,
  fieldName: string,
  before: string,
  after: string
): Promise<void> {
  await mutate(
    { user, ip },
    {
      app,
      action: 'reveal_pii',
      recordId,
      run: async () => ({
        before: { [fieldName]: before },
        after: { [fieldName]: after },
        result: undefined,
      }),
    }
  );
}