import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { serviceTemplates } from './service-templates';

export const serviceContracts = pgTable('service_contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  refNumber: text('ref_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  installationDate: timestamp('installation_date'),
  templateId: uuid('template_id').references(() => serviceTemplates.id),
  installationDetails: jsonb('installation_details').$type<{
    make?: string;
    model?: string;
    serialNumber?: string;
    location?: string;
    warrantyExpiry?: string;
    photos?: string[];
    customFields?: Record<string, string>;
  }>().default({}),
  intervalMonths: integer('interval_months').notNull().default(12),
  nextDueDate: timestamp('next_due_date').notNull(),
  reminderLeadDays: integer('reminder_lead_days').notNull().default(30),
  standardPricePence: integer('standard_price_pence'),
  status: text('status', {
    enum: ['active', 'paused', 'expired', 'cancelled']
  }).notNull().default('active'),
  lastServiceDate: timestamp('last_service_date'),
  lastJobId: uuid('last_job_id'),
  totalServicesCompleted: integer('total_services_completed').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
