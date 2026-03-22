'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { customers } from '@/db/schema';
import { eq, and, ilike, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';

const AddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  country: z.string().min(1, 'Country is required'),
});

const CustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: AddressSchema,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function getCustomers(search?: string) {
  try {
    const user = await getCurrentUser();

    const query = db
      .select()
      .from(customers)
      .where(
        search
          ? and(
              eq(customers.tenantId, user.tenantId),
              or(
                ilike(customers.name, `%${search}%`),
                ilike(customers.email, `%${search}%`)
              )
            )
          : eq(customers.tenantId, user.tenantId)
      )
      .orderBy(customers.name);

    return { success: true, data: await query };
  } catch (error) {
    console.error('getCustomers failed:', error);
    return { success: false, error: 'Failed to load customers', data: [] };
  }
}

export async function getCustomer(id: string) {
  try {
    const user = await getCurrentUser();

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, user.tenantId)))
      .limit(1);

    if (!customer) return { success: false, error: 'Customer not found', data: null };
    return { success: true, data: customer };
  } catch (error) {
    console.error('getCustomer failed:', error);
    return { success: false, error: 'Failed to load customer', data: null };
  }
}

export async function createCustomer(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = CustomerSchema.parse(input);

    console.log('attempting db insert with tenantId:', user.tenantId);
    const [customer] = await db.insert(customers).values({
      tenantId: user.tenantId,
      name: parsed.name,
      address: {
        ...parsed.address,
        line2: parsed.address.line2 ?? undefined,
      },
      email: parsed.email || null,
      phone: parsed.phone || null,
      notes: parsed.notes || null,
      tags: parsed.tags ?? [],
    }).returning();

    revalidatePath('/customers');
    return { success: true, data: customer };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createCustomer failed details:', error instanceof Error ? error.message : error);
    return { success: false, error: 'Failed to create customer' };
  }
}

export async function updateCustomer(id: string, input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = CustomerSchema.parse(input);

    const [customer] = await db
      .update(customers)
      .set({
        name: parsed.name,
        address: {
          ...parsed.address,
          line2: parsed.address.line2 ?? undefined,
        },
        email: parsed.email || null,
        phone: parsed.phone || null,
        notes: parsed.notes || null,
        tags: parsed.tags ?? [],
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.tenantId, user.tenantId)))
      .returning();

    if (!customer) return { success: false, error: 'Customer not found' };

    revalidatePath('/customers');
    revalidatePath(`/customers/${id}`);
    return { success: true, data: customer };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('updateCustomer failed:', error);
    return { success: false, error: 'Failed to update customer' };
  }
}
