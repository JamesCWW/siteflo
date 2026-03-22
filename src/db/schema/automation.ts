import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { jobs } from './jobs';
import { serviceContracts } from './service-contracts';
import { invoices } from './invoices';
import { quotes } from './quotes';

export const automationRules = pgTable('automation_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  trigger: text('trigger', {
    enum: [
      'contract_service_due',
      'contract_booking_confirmed',
      'contract_service_completed',
      'job_scheduled',
      'job_completed',
      'appointment_reminder',
      'invoice_sent',
      'invoice_overdue',
      'quote_sent',
      'quote_no_response',
    ]
  }).notNull(),
  conditions: jsonb('conditions').$type<{
    delayHours?: number;
    daysOverdue?: number;
    reminderHoursBefore?: number;
    maxExecutions?: number;
  }>().notNull(),
  action: text('action', {
    enum: ['send_email', 'send_sms', 'notify_owner', 'update_status', 'create_draft_invoice']
  }).notNull(),
  actionConfig: jsonb('action_config').$type<{
    emailTemplateId?: string;
    subject?: string;
    tone?: 'friendly' | 'professional' | 'firm';
    notifyVia?: 'email' | 'push' | 'both';
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  ruleId: uuid('rule_id').notNull().references(() => automationRules.id),
  jobId: uuid('job_id').references(() => jobs.id),
  contractId: uuid('contract_id').references(() => serviceContracts.id),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  quoteId: uuid('quote_id').references(() => quotes.id),
  action: text('action').notNull(),
  status: text('status', { enum: ['sent', 'failed', 'skipped'] }).notNull(),
  details: jsonb('details'),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});
