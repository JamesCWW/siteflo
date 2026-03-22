'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { serviceContracts, customers, serviceTemplates } from '@/db/schema';
import { eq, and, lte, gte, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { addMonths, startOfMonth, endOfMonth, addMonths as addM } from 'date-fns';

const ContractSchema = z.object({
  customerId: z.string().uuid('Invalid customer'),
  title: z.string().min(1, 'Title is required'),
  intervalMonths: z.coerce.number().int().min(1).max(120).default(12),
  nextDueDate: z.string().min(1, 'Next due date is required'),
  reminderLeadDays: z.coerce.number().int().min(1).max(365).default(30),
  templateId: z.string().uuid().optional().or(z.literal('')),
  standardPriceGbp: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  installationDate: z.string().optional(),
  installationDetails: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    location: z.string().optional(),
    warrantyExpiry: z.string().optional(),
  }).optional(),
});

export async function getContracts(filter?: 'due-this-month' | 'due-next-month' | 'overdue' | 'all') {
  try {
    const user = await getCurrentUser();
    const now = new Date();

    let whereClause;
    if (filter === 'due-this-month') {
      whereClause = and(
        eq(serviceContracts.tenantId, user.tenantId),
        gte(serviceContracts.nextDueDate, startOfMonth(now)),
        lte(serviceContracts.nextDueDate, endOfMonth(now))
      );
    } else if (filter === 'due-next-month') {
      const nextMonth = addMonths(now, 1);
      whereClause = and(
        eq(serviceContracts.tenantId, user.tenantId),
        gte(serviceContracts.nextDueDate, startOfMonth(nextMonth)),
        lte(serviceContracts.nextDueDate, endOfMonth(nextMonth))
      );
    } else if (filter === 'overdue') {
      whereClause = and(
        eq(serviceContracts.tenantId, user.tenantId),
        lt(serviceContracts.nextDueDate, now)
      );
    } else {
      whereClause = eq(serviceContracts.tenantId, user.tenantId);
    }

    const data = await db
      .select({
        contract: serviceContracts,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        },
      })
      .from(serviceContracts)
      .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
      .where(whereClause)
      .orderBy(serviceContracts.nextDueDate);

    return { success: true, data };
  } catch (error) {
    console.error('getContracts failed:', error);
    return { success: false, error: 'Failed to load contracts', data: [] };
  }
}

export async function getContract(id: string) {
  try {
    const user = await getCurrentUser();

    const [row] = await db
      .select({
        contract: serviceContracts,
        customer: customers,
      })
      .from(serviceContracts)
      .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
      .where(and(eq(serviceContracts.id, id), eq(serviceContracts.tenantId, user.tenantId)))
      .limit(1);

    if (!row) return { success: false, error: 'Contract not found', data: null };
    return { success: true, data: row };
  } catch (error) {
    console.error('getContract failed:', error);
    return { success: false, error: 'Failed to load contract', data: null };
  }
}

export async function getContractsForCustomer(customerId: string) {
  try {
    const user = await getCurrentUser();

    const data = await db
      .select()
      .from(serviceContracts)
      .where(
        and(
          eq(serviceContracts.tenantId, user.tenantId),
          eq(serviceContracts.customerId, customerId)
        )
      )
      .orderBy(serviceContracts.nextDueDate);

    return { success: true, data };
  } catch (error) {
    console.error('getContractsForCustomer failed:', error);
    return { success: false, error: 'Failed to load contracts', data: [] };
  }
}

export async function createContract(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = ContractSchema.parse(input);

    // Verify customer belongs to this tenant
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, parsed.customerId), eq(customers.tenantId, user.tenantId)))
      .limit(1);

    if (!customer) return { success: false, error: 'Customer not found' };

    const refNumber = await generateRefNumber('CON');

    const [contract] = await db.insert(serviceContracts).values({
      tenantId: user.tenantId,
      customerId: parsed.customerId,
      refNumber,
      title: parsed.title,
      description: parsed.description || null,
      intervalMonths: parsed.intervalMonths,
      nextDueDate: new Date(parsed.nextDueDate),
      reminderLeadDays: parsed.reminderLeadDays,
      templateId: parsed.templateId || null,
      standardPricePence: parsed.standardPriceGbp
        ? Math.round(parsed.standardPriceGbp * 100)
        : null,
      installationDate: parsed.installationDate
        ? new Date(parsed.installationDate)
        : null,
      installationDetails: parsed.installationDetails ?? {},
      status: 'active',
    }).returning();

    revalidatePath('/contracts');
    revalidatePath(`/customers/${parsed.customerId}`);
    return { success: true, data: contract };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createContract failed:', error);
    return { success: false, error: 'Failed to create contract' };
  }
}

export async function updateContractStatus(
  id: string,
  status: 'active' | 'paused' | 'expired' | 'cancelled'
) {
  try {
    const user = await getCurrentUser();

    const [contract] = await db
      .update(serviceContracts)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(serviceContracts.id, id), eq(serviceContracts.tenantId, user.tenantId)))
      .returning();

    if (!contract) return { success: false, error: 'Contract not found' };

    revalidatePath('/contracts');
    revalidatePath(`/contracts/${id}`);
    return { success: true, data: contract };
  } catch (error) {
    console.error('updateContractStatus failed:', error);
    return { success: false, error: 'Failed to update contract' };
  }
}

export async function getTemplatesForSelect() {
  try {
    const user = await getCurrentUser();

    const data = await db
      .select({ id: serviceTemplates.id, name: serviceTemplates.name })
      .from(serviceTemplates)
      .where(
        and(
          eq(serviceTemplates.tenantId, user.tenantId),
          eq(serviceTemplates.isActive, true)
        )
      )
      .orderBy(serviceTemplates.name);

    return { success: true, data };
  } catch (error) {
    console.error('getTemplatesForSelect failed:', error);
    return { success: false, data: [] };
  }
}
