/**
 * Dev script: resets onboarding state for a tenant so you can re-test the wizard.
 *
 * Run with:  npx tsx scripts/reset-onboarding.ts
 *
 * By default only resets the onboardingComplete flag.
 * Pass --clear-templates to also delete all seeded data so the full seed
 * flow reruns fresh.
 *
 * Deletion order respects FK constraints:
 *   automation_logs → invoices → invoice_line_items (cascade)
 *                  → quotes    → quote_line_items   (cascade)
 *                  → job_photos (cascade from jobs)
 *                  → jobs
 *                  → service_contracts
 *                  → service_templates
 *                  → parts_library
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  tenants,
  serviceTemplates,
  partsLibrary,
  jobs,
  jobPhotos,
  serviceContracts,
  invoices,
  invoiceLineItems,
  quotes,
  quoteLineItems,
  automationLogs,
} from './src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually
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

const clearTemplates = process.argv.includes('--clear-templates');

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function clearTenantData(tenantId: string) {
  // 1. automation_logs — references jobs, service_contracts, invoices, quotes
  const deletedLogs = await db
    .delete(automationLogs)
    .where(eq(automationLogs.tenantId, tenantId))
    .returning({ id: automationLogs.id });
  console.log(`  ✓ Deleted ${deletedLogs.length} automation log(s)`);

  // 2. invoice_line_items (cascade) + invoices — invoices reference jobs
  const tenantInvoiceIds = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));

  if (tenantInvoiceIds.length > 0) {
    const ids = tenantInvoiceIds.map((r) => r.id);
    const deletedLineItems = await db
      .delete(invoiceLineItems)
      .where(inArray(invoiceLineItems.invoiceId, ids))
      .returning({ id: invoiceLineItems.id });
    console.log(`  ✓ Deleted ${deletedLineItems.length} invoice line item(s)`);
  }
  const deletedInvoices = await db
    .delete(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .returning({ id: invoices.id });
  console.log(`  ✓ Deleted ${deletedInvoices.length} invoice(s)`);

  // 3. quote_line_items (cascade) + quotes — quotes reference jobs
  const tenantQuoteIds = await db
    .select({ id: quotes.id })
    .from(quotes)
    .where(eq(quotes.tenantId, tenantId));

  if (tenantQuoteIds.length > 0) {
    const ids = tenantQuoteIds.map((r) => r.id);
    const deletedLineItems = await db
      .delete(quoteLineItems)
      .where(inArray(quoteLineItems.quoteId, ids))
      .returning({ id: quoteLineItems.id });
    console.log(`  ✓ Deleted ${deletedLineItems.length} quote line item(s)`);
  }
  const deletedQuotes = await db
    .delete(quotes)
    .where(eq(quotes.tenantId, tenantId))
    .returning({ id: quotes.id });
  console.log(`  ✓ Deleted ${deletedQuotes.length} quote(s)`);

  // 4. job_photos — cascade from jobs, but delete explicitly for clarity
  const deletedPhotos = await db
    .delete(jobPhotos)
    .where(eq(jobPhotos.tenantId, tenantId))
    .returning({ id: jobPhotos.id });
  console.log(`  ✓ Deleted ${deletedPhotos.length} job photo(s)`);

  // 5. jobs — references service_templates and service_contracts
  const deletedJobs = await db
    .delete(jobs)
    .where(eq(jobs.tenantId, tenantId))
    .returning({ id: jobs.id });
  console.log(`  ✓ Deleted ${deletedJobs.length} job(s)`);

  // 6. service_contracts — references service_templates
  const deletedContracts = await db
    .delete(serviceContracts)
    .where(eq(serviceContracts.tenantId, tenantId))
    .returning({ id: serviceContracts.id });
  console.log(`  ✓ Deleted ${deletedContracts.length} service contract(s)`);

  // 7. service_templates
  const deletedTemplates = await db
    .delete(serviceTemplates)
    .where(eq(serviceTemplates.tenantId, tenantId))
    .returning({ id: serviceTemplates.id });
  console.log(`  ✓ Deleted ${deletedTemplates.length} service template(s)`);

  // 8. parts_library (quoteLineItems.partId referenced this, but quotes are gone)
  const deletedParts = await db
    .delete(partsLibrary)
    .where(eq(partsLibrary.tenantId, tenantId))
    .returning({ id: partsLibrary.id });
  console.log(`  ✓ Deleted ${deletedParts.length} parts library item(s)`);
}

async function main() {
  const allTenants = await db
    .select({ id: tenants.id, name: tenants.name, settings: tenants.settings })
    .from(tenants);

  console.log(`Found ${allTenants.length} tenant(s)\n`);

  for (const tenant of allTenants) {
    console.log(`Resetting tenant: "${tenant.name}" (${tenant.id})`);

    await db
      .update(tenants)
      .set({ settings: { ...(tenant.settings as object), onboardingComplete: false } })
      .where(eq(tenants.id, tenant.id));
    console.log('  ✓ onboardingComplete set to false');

    if (clearTemplates) {
      await clearTenantData(tenant.id);
    }
  }

  console.log('\nDone. Navigate to /dashboard (or log in fresh) to be redirected to /onboarding.');
  await client.end();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
