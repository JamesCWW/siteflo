/**
 * One-time seed script: inserts the 9 default automation rules for every tenant
 * that currently has no rules.
 *
 * Run with:  npx tsx src/scripts/seed-automation-rules.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { automationRules, tenants } from '../db/schema';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually (no dotenv dependency needed)
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* .env.local may not exist */ }

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

function buildDefaultRules(tenantId: string) {
  return [
    {
      tenantId,
      name: 'Service Due Reminder (30 days)',
      trigger: 'contract_service_due' as const,
      isActive: true,
      conditions: { reminderHoursBefore: 720 },
      action: 'send_email' as const,
      actionConfig: { tone: 'friendly' as const, subject: 'Your service is due soon' },
    },
    {
      tenantId,
      name: 'Service Due Follow-up (14 days)',
      trigger: 'contract_service_due' as const,
      isActive: true,
      conditions: { reminderHoursBefore: 336 },
      action: 'send_email' as const,
      actionConfig: { tone: 'professional' as const, subject: 'Reminder: Your service is due' },
    },
    {
      tenantId,
      name: 'Service Overdue Alert',
      trigger: 'contract_service_due' as const,
      isActive: true,
      conditions: { daysOverdue: 0 },
      action: 'notify_owner' as const,
      actionConfig: { notifyVia: 'email' as const },
    },
    {
      tenantId,
      name: 'Booking Confirmed → Draft Invoice',
      trigger: 'contract_booking_confirmed' as const,
      isActive: true,
      conditions: {},
      action: 'create_draft_invoice' as const,
      actionConfig: {},
    },
    {
      tenantId,
      name: 'Appointment Reminder (24h)',
      trigger: 'appointment_reminder' as const,
      isActive: true,
      conditions: { reminderHoursBefore: 24 },
      action: 'send_email' as const,
      actionConfig: { tone: 'friendly' as const, subject: 'Your appointment is tomorrow' },
    },
    {
      tenantId,
      name: 'Job Complete → Send Report',
      trigger: 'contract_service_completed' as const,
      isActive: true,
      conditions: {},
      action: 'send_email' as const,
      actionConfig: { tone: 'professional' as const, subject: 'Your service report' },
    },
    {
      tenantId,
      name: 'Invoice Chaser (7 days overdue)',
      trigger: 'invoice_overdue' as const,
      isActive: true,
      conditions: { daysOverdue: 7 },
      action: 'send_email' as const,
      actionConfig: { tone: 'friendly' as const, subject: 'Invoice payment reminder' },
    },
    {
      tenantId,
      name: 'Invoice Chaser (14 days overdue)',
      trigger: 'invoice_overdue' as const,
      isActive: true,
      conditions: { daysOverdue: 14 },
      action: 'send_email' as const,
      actionConfig: { tone: 'firm' as const, subject: 'Invoice overdue — action required' },
    },
    {
      tenantId,
      name: 'Invoice Alert to Owner (21 days overdue)',
      trigger: 'invoice_overdue' as const,
      isActive: true,
      conditions: { daysOverdue: 21 },
      action: 'notify_owner' as const,
      actionConfig: { notifyVia: 'email' as const },
    },
  ];
}

async function main() {
  console.log('Checking tenants for missing automation rules…');

  const allTenants = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);
  console.log(`Found ${allTenants.length} tenant(s)`);

  let seeded = 0;

  for (const tenant of allTenants) {
    const existing = await db
      .select({ id: automationRules.id })
      .from(automationRules)
      .where(eq(automationRules.tenantId, tenant.id));

    if (existing.length > 0) {
      console.log(`  ✓ Tenant "${tenant.name}" already has ${existing.length} rule(s) — skipping`);
      continue;
    }

    const rules = buildDefaultRules(tenant.id);
    await db.insert(automationRules).values(rules);
    console.log(`  ✓ Seeded ${rules.length} default rules for tenant "${tenant.name}"`);
    seeded++;
  }

  if (seeded === 0) {
    console.log('All tenants already have automation rules.');
  } else {
    console.log(`Done. Seeded rules for ${seeded} tenant(s).`);
  }

  await client.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
