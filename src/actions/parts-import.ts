'use server';

import { db } from '@/db/client';
import { partsLibrary } from '@/db/schema';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { revalidatePath } from 'next/cache';

export type PartImportRow = {
  name: string;
  type: 'part' | 'labour';
  unitPricePence: number;
  unit: string;
  category: string;
};

export async function bulkImportParts(rows: PartImportRow[]) {
  try {
    const user = await getCurrentUser();

    if (!rows.length) return { success: false, error: 'No rows to import' };

    const values = rows.map(r => ({
      tenantId: user.tenantId,
      name: r.name,
      type: r.type,
      unitPrice: r.unitPricePence,
      unit: r.unit || 'each',
      category: r.category || null,
      description: null,
    }));

    await db.insert(partsLibrary).values(values);

    revalidatePath('/parts');
    return { success: true, imported: rows.length };
  } catch (error) {
    console.error('bulkImportParts failed:', error);
    return { success: false, error: 'Failed to import parts' };
  }
}
