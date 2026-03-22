'use server';

import { db } from '@/db/client';
import { automationRules, automationLogs, customers, jobs, invoices, serviceContracts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';

export async function getAutomationRules() {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.tenantId, user.tenantId))
      .orderBy(automationRules.trigger);
    return { success: true, data };
  } catch (error) {
    console.error('getAutomationRules failed:', error);
    return { success: false, error: 'Failed to load rules', data: [] };
  }
}

export async function toggleAutomationRule(id: string, isActive: boolean) {
  try {
    const user = await getCurrentUser();
    const [rule] = await db
      .update(automationRules)
      .set({ isActive })
      .where(and(eq(automationRules.id, id), eq(automationRules.tenantId, user.tenantId)))
      .returning();
    if (!rule) return { success: false, error: 'Rule not found' };
    revalidatePath('/automation');
    return { success: true, data: rule };
  } catch (error) {
    console.error('toggleAutomationRule failed:', error);
    return { success: false, error: 'Failed to update rule' };
  }
}

export async function getAutomationLogs(limit = 50) {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select({
        log: automationLogs,
        rule: {
          id: automationRules.id,
          name: automationRules.name,
          trigger: automationRules.trigger,
        },
      })
      .from(automationLogs)
      .innerJoin(automationRules, eq(automationLogs.ruleId, automationRules.id))
      .where(eq(automationLogs.tenantId, user.tenantId))
      .orderBy(desc(automationLogs.executedAt))
      .limit(limit);
    return { success: true, data };
  } catch (error) {
    console.error('getAutomationLogs failed:', error);
    return { success: false, error: 'Failed to load logs', data: [] };
  }
}
