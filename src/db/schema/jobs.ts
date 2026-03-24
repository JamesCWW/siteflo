import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { users } from './users';
import { serviceTemplates } from './service-templates';
import { serviceContracts } from './service-contracts';

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  refNumber: text('ref_number').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  templateId: uuid('template_id').references(() => serviceTemplates.id),
  contractId: uuid('contract_id').references(() => serviceContracts.id),
  type: text('type', {
    enum: ['contract_service', 'one_off', 'callback', 'inspection']
  }).notNull().default('one_off'),
  status: text('status', {
    enum: ['scheduled', 'completed', 'invoiced', 'paid', 'cancelled']
  }).notNull().default('scheduled'),
  scheduledStart: timestamp('scheduled_start'),
  scheduledEnd: timestamp('scheduled_end'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  siteAddress: jsonb('site_address').$type<{
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    lat?: number;
    lng?: number;
  }>(),
  fieldValues: jsonb('field_values').$type<Record<string, unknown>>().default({}),
  description: text('description'),
  internalNotes: text('internal_notes'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const jobPhotos = pgTable('job_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  storageUrl: text('storage_url').notNull(),
  caption: text('caption'),
  takenAt: timestamp('taken_at').defaultNow().notNull(),
});
