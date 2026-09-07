import type { AppConfig } from './types';
import { kycReviewApp } from '../apps/kyc-review.app';
import { refundsApp } from '../apps/refunds.app';
import { featureFlagsApp } from '../apps/feature-flags.app';

// App registry - manually maintained for now
// To add a new app: import it here and add to the array
// TODO: Make this automatic via glob imports when build system supports it
export const appRegistry: AppConfig[] = [
  kycReviewApp,
  refundsApp,
  featureFlagsApp,
];

// Helper to get app by slug
export function getAppBySlug(slug: string): AppConfig | undefined {
  return appRegistry.find(app => app.slug === slug);
}