import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setupTriggers() {
  const triggerSql = readFileSync(
    join(__dirname, 'triggers.sql'),
    'utf-8'
  );
  
  // Use executeMultiple to run both trigger statements
  const statements = triggerSql.split(';').filter(stmt => stmt.trim());
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log('Triggers setup successfully');
}

setupTriggers().catch((error) => {
  console.error('Failed to setup triggers:', error);
  process.exit(1);
});