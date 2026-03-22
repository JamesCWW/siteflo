import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { jobs } from './jobs';
import { customers } from './customers';

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  jobId: uuid('job_id').notNull().references(() => jobs.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  refNumber: text('ref_number').notNull(),
  status: text('status', {
    enum: ['draft', 'sent', 'viewed', 'overdue', 'paid', 'void']
  }).notNull().default('draft'),
  subtotalPence: integer('subtotal_pence').notNull(),
  vatPence: integer('vat_pence').notNull(),
  totalPence: integer('total_pence').notNull(),
  dueDate: timestamp('due_date').notNull(),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  paymentMethod: text('payment_method'),
  pdfUrl: text('pdf_url'),
  accessToken: text('access_token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPricePence: integer('unit_price_pence').notNull(),
  totalPence: integer('total_pence').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});
