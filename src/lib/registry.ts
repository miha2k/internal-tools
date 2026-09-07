import { transactionsApp } from '../apps/transactions.app';
import type { AppConfig } from './types';

// App registry - this is where all apps are registered
// Adding a new app is as simple as importing and adding to this array
export const appRegistry: AppConfig[] = [
  transactionsApp,
];

// Helper to get app by slug
export function getAppBySlug(slug: string): AppConfig | undefined {
  return appRegistry.find(app => app.slug === slug);
}