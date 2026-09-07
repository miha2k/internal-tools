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
  
  await client.execute(triggerSql);
  console.log('Triggers setup successfully');
}

setupTriggers().catch(console.error);