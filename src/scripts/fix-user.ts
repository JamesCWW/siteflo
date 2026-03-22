/**
 * One-time script to insert the missing tenant + user rows for an existing
 * Supabase Auth user whose DB records were never created.
 *
 * Usage: npx tsx src/scripts/fix-user.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local before anything else
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch {
  // .env.local not found — assume env vars are already set
}

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const AUTH_USER_ID = '6011cbfc-9878-4a4e-acde-2eed7d617498';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    throw new Error('Missing required env vars — check .env.local');
  }

  // Use service role client to look up the auth user's email
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Looking up auth user...');
  const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(AUTH_USER_ID);

  if (authError || !authUser) {
    throw new Error(`Auth user not found: ${authError?.message}`);
  }

  console.log('Auth user found:', { id: authUser.id, email: authUser.email });

  // Connect directly via Drizzle — DATABASE_URL uses postgres superuser, bypasses RLS
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle(client);

  // Check for existing user row
  const existingUsers = await db.select().from(users).where(eq(users.authId, AUTH_USER_ID));
  if (existingUsers.length > 0) {
    console.log('User row already exists:', existingUsers[0]);
    await client.end();
    return;
  }

  // Find or create a tenant
  const existingTenants = await db.select().from(tenants).limit(1);
  let tenant = existingTenants[0];

  if (!tenant) {
    console.log('No tenant found — creating one...');
    const email = authUser.email ?? 'admin@example.com';
    const companyName = 'My Company';
    const slug = `my-company-${Date.now()}`;

    const inserted = await db.insert(tenants).values({
      name: companyName,
      slug,
      branding: {
        primaryColor: '#0ea5e9',
        companyName,
        companyAddress: '',
        companyPhone: '',
        companyEmail: email,
      },
      settings: {
        defaultCurrency: 'GBP',
        defaultVatRate: 20,
        quoteExpiryDays: 30,
        invoicePaymentTermsDays: 14,
        workingHoursStart: '08:00',
        workingHoursEnd: '17:00',
        workingDays: [1, 2, 3, 4, 5],
        bookingSlotMinutes: 60,
      },
    }).returning();

    tenant = inserted[0];
    console.log('Created tenant:', tenant.id);
  } else {
    console.log('Using existing tenant:', tenant.id);
  }

  // Insert the user row
  const inserted = await db.insert(users).values({
    tenantId: tenant.id,
    authId: AUTH_USER_ID,
    email: authUser.email ?? '',
    fullName: 'Admin',
    role: 'owner',
  }).returning();

  console.log('Created user row:', inserted[0]);
  await client.end();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
