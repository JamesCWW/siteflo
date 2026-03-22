'use server';

import { db } from '@/db/client';
import { automationRules, automationLogs, customers, jobs, invoices, serviceContracts } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
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

export async function seedDefaultAutomationRules() {
  try {
    const user = await getCurrentUser();

    // Check if rules already exist — don't double-seed
    const [{ total }] = await db
      .select({ total: count() })
      .from(automationRules)
      .where(eq(automationRules.tenantId, user.tenantId));

    if (total > 0) {
      return { success: false, error: `Rules already exist (${total} found). Delete them first if you want to re-seed.` };
    }

    const defaultRules = [
      {
        tenantId: user.tenantId,
        name: 'Service Due Reminder (30 days)',
        trigger: 'contract_service_due' as const,
        conditions: { reminderHoursBefore: 720 },
        action: 'send_email' as const,
        actionConfig: { tone: 'friendly' as const, subject: 'Your service is due soon' },
      },
      {
        tenantId: user.tenantId,
        name: 'Service Due Follow-up (14 days)',
        trigger: 'contract_service_due' as const,
        conditions: { reminderHoursBefore: 336 },
        action: 'send_email' as const,
        actionConfig: { tone: 'professional' as const, subject: 'Reminder: Your service is due' },
      },
      {
        tenantId: user.tenantId,
        name: 'Service Overdue Alert',
        trigger: 'contract_service_due' as const,
        conditions: { daysOverdue: 0 },
        action: 'notify_owner' as const,
        actionConfig: { notifyVia: 'email' as const },
      },
      {
        tenantId: user.tenantId,
        name: 'Booking Confirmed → Draft Invoice',
        trigger: 'contract_booking_confirmed' as const,
        conditions: {},
        action: 'create_draft_invoice' as const,
        actionConfig: {},
      },
      {
        tenantId: user.tenantId,
        name: 'Appointment Reminder (24h)',
        trigger: 'appointment_reminder' as const,
        conditions: { reminderHoursBefore: 24 },
        action: 'send_email' as const,
        actionConfig: { tone: 'friendly' as const, subject: 'Your appointment is tomorrow' },
      },
      {
        tenantId: user.tenantId,
        name: 'Job Complete → Send Report',
        trigger: 'contract_service_completed' as const,
        conditions: {},
        action: 'send_email' as const,
        actionConfig: { tone: 'professional' as const, subject: 'Your service report' },
      },
      {
        tenantId: user.tenantId,
        name: 'Invoice Chaser (7 days overdue)',
        trigger: 'invoice_overdue' as const,
        conditions: { daysOverdue: 7 },
        action: 'send_email' as const,
        actionConfig: { tone: 'friendly' as const, subject: 'Invoice payment reminder' },
      },
      {
        tenantId: user.tenantId,
        name: 'Invoice Chaser (14 days overdue)',
        trigger: 'invoice_overdue' as const,
        conditions: { daysOverdue: 14 },
        action: 'send_email' as const,
        actionConfig: { tone: 'firm' as const, subject: 'Invoice overdue — action required' },
      },
      {
        tenantId: user.tenantId,
        name: 'Invoice Alert to Owner (21 days overdue)',
        trigger: 'invoice_overdue' as const,
        conditions: { daysOverdue: 21 },
        action: 'notify_owner' as const,
        actionConfig: { notifyVia: 'email' as const },
      },
    ];

    await db.insert(automationRules).values(defaultRules);
    revalidatePath('/automation');
    return { success: true, count: defaultRules.length };
  } catch (error) {
    console.error('[seedDefaultAutomationRules] failed:', error instanceof Error ? error.message : error);
    return { success: false, error: 'Failed to create automation rules' };
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
