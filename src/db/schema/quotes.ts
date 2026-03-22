import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { jobs } from './jobs';
import { partsLibrary } from './parts-library';

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  jobId: uuid('job_id').notNull().references(() => jobs.id),
  refNumber: text('ref_number').notNull(),
  status: text('status', {
    enum: ['draft', 'sent', 'approved', 'declined', 'expired']
  }).notNull().default('draft'),
  subtotalPence: integer('subtotal_pence').notNull().default(0),
  vatPence: integer('vat_pence').notNull().default(0),
  totalPence: integer('total_pence').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  sentAt: timestamp('sent_at'),
  respondedAt: timestamp('responded_at'),
  customerNote: text('customer_note'),
  accessToken: text('access_token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quoteLineItems = pgTable('quote_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPricePence: integer('unit_price_pence').notNull(),
  totalPence: integer('total_pence').notNull(),
  partId: uuid('part_id').references(() => partsLibrary.id),
  sortOrder: integer('sort_order').default(0).notNull(),
});
