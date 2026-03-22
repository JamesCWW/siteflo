import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export async function generateRefNumber(prefix: 'JOB' | 'INV' | 'QUO' | 'CON'): Promise<string> {
  // Simple counter-based approach — in production you'd use a sequence per tenant
  const tableMap = {
    JOB: 'jobs',
    INV: 'invoices',
    QUO: 'quotes',
    CON: 'service_contracts',
  };

  const table = tableMap[prefix];
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)}`);
  const rows = result as unknown as Array<{ count: string }>;
  const count = Number(rows[0].count) + 1;
  return `${prefix}-${String(count).padStart(4, '0')}`;
}
