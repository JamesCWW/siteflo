'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { createClient } from '@/lib/supabase/server';

export async function getTenantSettings() {
  try {
    const user = await getCurrentUser();
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    if (!tenant) return { success: false, error: 'Tenant not found', data: null };
    return { success: true, data: tenant };
  } catch (error) {
    console.error('getTenantSettings failed:', error);
    return { success: false, error: 'Failed to load settings', data: null };
  }
}

const BusinessInfoSchema = z.object({
  companyName: z.string().min(1).max(200),
  companyAddress: z.string().max(500),
  companyPhone: z.string().max(50),
  companyEmail: z.string().email(),
  vatNumber: z.string().max(50).optional(),
});

export async function updateBusinessInfo(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = BusinessInfoSchema.parse(input);

    const [current] = await db.select({ branding: tenants.branding }).from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    if (!current) return { success: false, error: 'Tenant not found' };

    await db
      .update(tenants)
      .set({
        name: parsed.companyName,
        branding: {
          ...current.branding,
          companyName: parsed.companyName,
          companyAddress: parsed.companyAddress,
          companyPhone: parsed.companyPhone,
          companyEmail: parsed.companyEmail,
          vatNumber: parsed.vatNumber ?? current.branding.vatNumber,
        },
      })
      .where(eq(tenants.id, user.tenantId));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: 'Invalid input' };
    console.error('updateBusinessInfo failed:', error);
    return { success: false, error: 'Failed to save settings' };
  }
}

const BrandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex colour'),
  logoUrl: z.string().url().optional(),
});

export async function updateBranding(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = BrandingSchema.parse(input);

    const [current] = await db.select({ branding: tenants.branding }).from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    if (!current) return { success: false, error: 'Tenant not found' };

    await db
      .update(tenants)
      .set({
        branding: {
          ...current.branding,
          primaryColor: parsed.primaryColor,
          ...(parsed.logoUrl !== undefined ? { logoUrl: parsed.logoUrl } : {}),
        },
      })
      .where(eq(tenants.id, user.tenantId));

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0]?.message ?? 'Invalid input' };
    console.error('updateBranding failed:', error);
    return { success: false, error: 'Failed to save branding' };
  }
}

export async function uploadLogo(formData: FormData) {
  try {
    const user = await getCurrentUser();
    const file = formData.get('logo');

    if (!(file instanceof File)) return { success: false, error: 'No file provided' };
    if (file.size > 2 * 1024 * 1024) return { success: false, error: 'File must be under 2MB' };
    if (!file.type.startsWith('image/')) return { success: false, error: 'File must be an image' };

    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${user.tenantId}/logo-${Date.now()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return { success: false, error: 'Failed to upload logo' };
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
    const logoUrl = urlData.publicUrl;

    await updateBranding({ primaryColor: await getCurrentPrimaryColor(user.tenantId), logoUrl });
    return { success: true, logoUrl };
  } catch (error) {
    console.error('uploadLogo failed:', error);
    return { success: false, error: 'Failed to upload logo' };
  }
}

async function getCurrentPrimaryColor(tenantId: string): Promise<string> {
  const [row] = await db.select({ branding: tenants.branding }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.branding?.primaryColor ?? '#18181b';
}

const BankDetailsSchema = z.object({
  bankName: z.string().max(100).optional(),
  bankSortCode: z.string().max(20).optional(),
  bankAccountNumber: z.string().max(20).optional(),
  bankAccountName: z.string().max(100).optional(),
});

export async function updateBankDetails(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = BankDetailsSchema.parse(input);

    const [current] = await db.select({ branding: tenants.branding }).from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    if (!current) return { success: false, error: 'Tenant not found' };

    await db
      .update(tenants)
      .set({
        branding: {
          ...current.branding,
          bankName: parsed.bankName ?? current.branding.bankName,
          bankSortCode: parsed.bankSortCode ?? current.branding.bankSortCode,
          bankAccountNumber: parsed.bankAccountNumber ?? current.branding.bankAccountNumber,
          bankAccountName: parsed.bankAccountName ?? current.branding.bankAccountName,
        },
      })
      .where(eq(tenants.id, user.tenantId));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: 'Invalid input' };
    console.error('updateBankDetails failed:', error);
    return { success: false, error: 'Failed to save bank details' };
  }
}

const WorkingHoursSchema = z.object({
  defaultCurrency: z.string().max(10),
  defaultVatRate: z.number().min(0).max(100),
  quoteExpiryDays: z.number().int().min(1),
  invoicePaymentTermsDays: z.number().int().min(0),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1),
  bookingSlotMinutes: z.number().int().min(15),
});

export async function updateWorkingHours(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = WorkingHoursSchema.parse(input);

    await db
      .update(tenants)
      .set({ settings: parsed })
      .where(eq(tenants.id, user.tenantId));

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: 'Invalid input' };
    console.error('updateWorkingHours failed:', error);
    return { success: false, error: 'Failed to save settings' };
  }
}
