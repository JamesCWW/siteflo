/**
 * Run a SQL migration file against the database.
 * Usage: npx tsx scripts/migrate.ts drizzle/0001_contract_billing_intervals.sql
 */
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^[\"']|[\"']$/g, '');
  }
} catch { /* .env.local may not exist */ }

const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx scripts/migrate.ts <sql-file>');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });
const migration = readFileSync(resolve(process.cwd(), file), 'utf-8');

async function main() {
  console.log(`Applying ${file}...`);
  await sql.unsafe(migration);
  console.log('Done.');
  await sql.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
