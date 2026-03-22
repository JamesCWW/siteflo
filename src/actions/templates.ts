'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { serviceTemplates } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import type { ServiceFieldDefinition } from '@/db/schema/service-templates';

const FieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'boolean', 'select', 'checkbox-group', 'date', 'signature', 'photo', 'textarea', 'section-header']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  placeholder: z.string().optional(),
  unit: z.string().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  group: z.string().optional(),
  subheading: z.string().optional(),
  sortOrder: z.number().int(),
});

const TemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  fieldSchema: z.array(FieldSchema),
  pdfConfig: z.object({
    title: z.string().min(1, 'PDF title is required'),
    showLogo: z.boolean(),
    showSignature: z.boolean(),
    headerText: z.string().optional(),
    footerText: z.string().optional(),
    layout: z.enum(['single-column', 'two-column']),
  }),
});

export async function getTemplates() {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select()
      .from(serviceTemplates)
      .where(eq(serviceTemplates.tenantId, user.tenantId))
      .orderBy(asc(serviceTemplates.sortOrder), asc(serviceTemplates.name));
    return { success: true, data };
  } catch (error) {
    console.error('getTemplates failed:', error);
    return { success: false, error: 'Failed to load templates', data: [] };
  }
}

export async function getTemplate(id: string) {
  try {
    const user = await getCurrentUser();
    const [template] = await db
      .select()
      .from(serviceTemplates)
      .where(and(eq(serviceTemplates.id, id), eq(serviceTemplates.tenantId, user.tenantId)))
      .limit(1);
    if (!template) return { success: false, error: 'Template not found', data: null };
    return { success: true, data: template };
  } catch (error) {
    console.error('getTemplate failed:', error);
    return { success: false, error: 'Failed to load template', data: null };
  }
}

export async function createTemplate(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = TemplateSchema.parse(input);

    const [template] = await db.insert(serviceTemplates).values({
      tenantId: user.tenantId,
      name: parsed.name,
      description: parsed.description || null,
      category: parsed.category || null,
      isActive: true,
      fieldSchema: parsed.fieldSchema as ServiceFieldDefinition[],
      pdfConfig: parsed.pdfConfig,
      sortOrder: 0,
    }).returning();

    revalidatePath('/templates');
    return { success: true, data: template };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createTemplate failed:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

export async function updateTemplate(id: string, input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = TemplateSchema.parse(input);

    const [template] = await db
      .update(serviceTemplates)
      .set({
        name: parsed.name,
        description: parsed.description || null,
        category: parsed.category || null,
        fieldSchema: parsed.fieldSchema as ServiceFieldDefinition[],
        pdfConfig: parsed.pdfConfig,
        updatedAt: new Date(),
      })
      .where(and(eq(serviceTemplates.id, id), eq(serviceTemplates.tenantId, user.tenantId)))
      .returning();

    if (!template) return { success: false, error: 'Template not found' };

    revalidatePath('/templates');
    revalidatePath(`/templates/${id}/edit`);
    return { success: true, data: template };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('updateTemplate failed:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

export async function toggleTemplateActive(id: string, isActive: boolean) {
  try {
    const user = await getCurrentUser();
    const [template] = await db
      .update(serviceTemplates)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(serviceTemplates.id, id), eq(serviceTemplates.tenantId, user.tenantId)))
      .returning();
    if (!template) return { success: false, error: 'Template not found' };
    revalidatePath('/templates');
    return { success: true, data: template };
  } catch (error) {
    console.error('toggleTemplateActive failed:', error);
    return { success: false, error: 'Failed to update template' };
  }
}
