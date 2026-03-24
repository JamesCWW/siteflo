import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { users } from './users';

export const notificationBatches = pgTable('notification_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  recipientCount: integer('recipient_count').notNull().default(0),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  sentById: uuid('sent_by_id').references(() => users.id),
});

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  batchId: uuid('batch_id').references(() => notificationBatches.id),
  customerId: uuid('customer_id').references(() => customers.id),
  sentToEmail: text('sent_to_email').notNull(),
  subject: text('subject').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  resendId: text('resend_id'),
  status: text('status', { enum: ['sent', 'failed'] }).notNull().default('sent'),
  error: text('error'),
});
