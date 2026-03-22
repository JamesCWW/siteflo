'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { tenants, customers, serviceContracts, serviceTemplates } from '@/db/schema';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { seedPlumbingGas } from '@/lib/seed/plumbing-gas';
import { seedGateAutomation } from '@/lib/seed/gate-automation';
import { generateRefNumber } from '@/lib/utils/ref-numbers';

export async function getOnboardingData() {
  const user = await getCurrentUser();

  const [tenant] = await db
    .select({ branding: tenants.branding, settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  return {
    companyName: tenant?.branding?.companyName ?? '',
    tenantId: user.tenantId,
    onboardingComplete: tenant?.settings?.onboardingComplete,
  };
}

const TradeSchema = z.enum(['plumbing-gas', 'gate-automation']);

export async function seedTrade(trade: unknown) {
  try {
    const user = await getCurrentUser();
    const parsedTrade = TradeSchema.parse(trade);

    // Check if templates already seeded to prevent duplicates on re-visit
    const existing = await db
      .select({ id: serviceTemplates.id })
      .from(serviceTemplates)
      .where(eq(serviceTemplates.tenantId, user.tenantId))
      .limit(1);

    if (existing.length === 0) {
      if (parsedTrade === 'plumbing-gas') {
        await seedPlumbingGas(user.tenantId);
      } else {
        await seedGateAutomation(user.tenantId);
      }
    }

    // Save trade selection to settings
    const [tenant] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    await db
      .update(tenants)
      .set({ settings: { ...tenant.settings, trade: parsedTrade } })
      .where(eq(tenants.id, user.tenantId));

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid trade selection' };
    }
    console.error('seedTrade error:', error);
    return { success: false, error: 'Failed to set up trade templates' };
  }
}

const BusinessDetailsSchema = z.object({
  companyName: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export async function saveBusinessDetails(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = BusinessDetailsSchema.parse(input);

    const [tenant] = await db
      .select({ branding: tenants.branding })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    await db
      .update(tenants)
      .set({
        name: parsed.companyName,
        branding: {
          ...tenant.branding,
          companyName: parsed.companyName,
          companyPhone: parsed.phone ?? tenant.branding.companyPhone,
          companyAddress: parsed.address ?? tenant.branding.companyAddress,
          ...(parsed.logoUrl ? { logoUrl: parsed.logoUrl } : {}),
        },
      })
      .where(eq(tenants.id, user.tenantId));

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    return { success: false, error: 'Failed to save business details' };
  }
}

const FirstCustomerSchema = z.object({
  customerName: z.string().min(2),
  customerAddress: z.string().min(5),
  customerPhone: z.string().optional(),
  installationDescription: z.string().optional(),
  nextServiceDate: z.string().min(1),
});

export async function createFirstCustomerAndContract(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = FirstCustomerSchema.parse(input);

    // Create the customer
    const [customer] = await db
      .insert(customers)
      .values({
        tenantId: user.tenantId,
        name: parsed.customerName,
        address: {
          line1: parsed.customerAddress,
          city: '',
          postcode: '',
          country: 'GB',
        },
        phone: parsed.customerPhone,
      })
      .returning();

    // Create the service contract
    const refNumber = await generateRefNumber('CON');
    await db.insert(serviceContracts).values({
      tenantId: user.tenantId,
      customerId: customer.id,
      refNumber,
      title: parsed.installationDescription || 'Service Contract',
      nextServiceDate: new Date(parsed.nextServiceDate),
      serviceIntervalMonths: 12,
      billingIntervalMonths: 12,
      invoiceTiming: 'upfront',
      billingCycleStart: new Date(),
      reminderLeadDays: 30,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createFirstCustomerAndContract error:', error);
    return { success: false, error: 'Failed to create customer' };
  }
}

export async function completeOnboarding() {
  const user = await getCurrentUser();

  const [tenant] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  await db
    .update(tenants)
    .set({ settings: { ...tenant.settings, onboardingComplete: true } })
    .where(eq(tenants.id, user.tenantId));

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
