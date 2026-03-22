'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { partsLibrary } from '@/db/schema';
import { eq, and, asc, ilike, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';

const PartSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['part', 'labour']),
  unitPrice: z.number().int().min(0), // pence
  unit: z.string().default('each'),
});

export async function getParts(search?: string) {
  try {
    const user = await getCurrentUser();

    const data = await db
      .select()
      .from(partsLibrary)
      .where(and(
        eq(partsLibrary.tenantId, user.tenantId),
        eq(partsLibrary.isActive, true),
        search
          ? or(
              ilike(partsLibrary.name, `%${search}%`),
              ilike(partsLibrary.description, `%${search}%`),
            )
          : undefined,
      ))
      .orderBy(asc(partsLibrary.name));

    return { success: true, data };
  } catch (error) {
    console.error('getParts failed:', error);
    return { success: false, error: 'Failed to load parts', data: [] };
  }
}

export async function createPart(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = PartSchema.parse(input);

    const [part] = await db.insert(partsLibrary).values({
      tenantId: user.tenantId,
      ...parsed,
    }).returning();

    revalidatePath('/parts');
    return { success: true, data: part };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createPart failed:', error);
    return { success: false, error: 'Failed to create part' };
  }
}

export async function updatePart(id: string, input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = PartSchema.parse(input);

    const [part] = await db
      .update(partsLibrary)
      .set(parsed)
      .where(and(eq(partsLibrary.id, id), eq(partsLibrary.tenantId, user.tenantId)))
      .returning();

    if (!part) return { success: false, error: 'Part not found' };

    revalidatePath('/parts');
    return { success: true, data: part };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('updatePart failed:', error);
    return { success: false, error: 'Failed to update part' };
  }
}

export async function deactivatePart(id: string) {
  try {
    const user = await getCurrentUser();
    await db
      .update(partsLibrary)
      .set({ isActive: false })
      .where(and(eq(partsLibrary.id, id), eq(partsLibrary.tenantId, user.tenantId)));

    revalidatePath('/parts');
    return { success: true };
  } catch (error) {
    console.error('deactivatePart failed:', error);
    return { success: false, error: 'Failed to deactivate part' };
  }
}
