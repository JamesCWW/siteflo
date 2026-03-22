'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { tenants, users, automationRules } from '@/db/schema';
import { redirect } from 'next/navigation';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  companyName: z.string().min(2),
});

export async function login(input: unknown) {
  console.log('[login] server action called');
  try {
    const parsed = LoginSchema.parse(input);
    console.log('[login] attempting sign in for:', parsed.email);
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      console.log('[login] sign in failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('[login] sign in succeeded');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    return { success: false, error: 'Something went wrong' };
  }
}

export async function register(input: unknown) {
  let parsed: z.infer<typeof RegisterSchema>;
  try {
    parsed = RegisterSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    return { success: false, error: 'Invalid input' };
  }

  // 1. Create Supabase Auth user
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
  });

  if (authError || !authData.user) {
    console.error('Auth signUp failed:', authError?.message);
    return { success: false, error: authError?.message ?? 'Failed to create account' };
  }

  // 2. Create slug from company name
  const slug = parsed.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // 3. Create tenant record
  // db uses DATABASE_URL (postgres superuser) — bypasses RLS
  let tenant: typeof tenants.$inferSelect;
  try {
    const result = await db.insert(tenants).values({
      name: parsed.companyName,
      slug: `${slug}-${Date.now()}`,
      branding: {
        primaryColor: '#0ea5e9',
        companyName: parsed.companyName,
        companyAddress: '',
        companyPhone: '',
        companyEmail: parsed.email,
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
    tenant = result[0];
    console.log('Created tenant:', tenant.id);
  } catch (error) {
    console.error('Tenant insert failed:', error);
    return { success: false, error: 'Failed to set up account (tenant)' };
  }

  // 4. Create user record
  try {
    await db.insert(users).values({
      tenantId: tenant.id,
      authId: authData.user.id,
      email: parsed.email,
      fullName: parsed.fullName,
      role: 'owner',
    });
    console.log('Created user row for authId:', authData.user.id);
  } catch (error) {
    console.error('User insert failed:', error);
    return { success: false, error: 'Failed to set up account (user)' };
  }

  // 5. Create default automation rules (non-fatal if this fails)
  try {
    await createDefaultAutomationRules(tenant.id);
  } catch (error) {
    console.error('Automation rules insert failed (non-fatal):', error);
  }

  return { success: true };
}

async function createDefaultAutomationRules(tenantId: string) {
  const defaultRules = [
    // ── Contract service reminders ────────────────────────────────────────
    {
      tenantId,
      name: 'Service Due Reminder (30 days)',
      trigger: 'contract_service_due' as const,
      conditions: { reminderHoursBefore: 720 }, // 30 days
      action: 'send_email' as const,
      actionConfig: { tone: 'friendly' as const, subject: 'Your service is due soon' },
    },
    {
      tenantId,
      name: 'Service Due Follow-up (14 days)',
      trigger: 'contract_service_due' as const,
      conditions: { reminderHoursBefore: 336 }, // 14 days
      action: 'send_email' as const,
      actionConfig: { tone: 'professional' as const, subject: 'Reminder: Your service is due' },
    },
    {
      tenantId,
      name: 'Service Overdue Alert',
      trigger: 'contract_service_due' as const,
      conditions: { daysOverdue: 0 },
      action: 'notify_owner' as const,
      actionConfig: { notifyVia: 'email' as const },
    },
    // ── Booking ───────────────────────────────────────────────────────────
    {
      tenantId,
      name: 'Booking Confirmed → Draft Invoice',
      trigger: 'contract_booking_confirmed' as const,
      conditions: {},
      action: 'create_draft_invoice' as const,
      actionConfig: {},
    },
    // ── Appointments ──────────────────────────────────────────────────────
    {
      tenantId,
      name: 'Appointment Reminder (24h)',
      trigger: 'appointment_reminder' as const,
      conditions: { reminderHoursBefore: 24 },
      action: 'send_email' as const,
      actionConfig: { tone: 'friendly' as const, subject: 'Your appointment is tomorrow' },
    },
    // ── Job completion ────────────────────────────────────────────────────
    {
      tenantId,
      name: 'Job Complete → Send Report',
      trigger: 'contract_service_completed' as const,
      conditions: {},
      action: 'send_email' as const,
      actionConfig: { tone: 'professional' as const, subject: 'Your service report' },
    },
    // ── Invoice chasers ───────────────────────────────────────────────────
    {
      tenantId,
      name: 'Invoice Chaser (7 days overdue)',
      trigger: 'invoice_overdue' as const,
      conditions: { daysOverdue: 7 },
      action: 'send_email' as const,
      actionConfig: { tone: 'friendly' as const, subject: 'Invoice payment reminder' },
    },
    {
      tenantId,
      name: 'Invoice Chaser (14 days overdue)',
      trigger: 'invoice_overdue' as const,
      conditions: { daysOverdue: 14 },
      action: 'send_email' as const,
      actionConfig: { tone: 'firm' as const, subject: 'Invoice overdue — action required' },
    },
    {
      tenantId,
      name: 'Invoice Alert to Owner (21 days overdue)',
      trigger: 'invoice_overdue' as const,
      conditions: { daysOverdue: 21 },
      action: 'notify_owner' as const,
      actionConfig: { notifyVia: 'email' as const },
    },
  ];

  await db.insert(automationRules).values(defaultRules);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
