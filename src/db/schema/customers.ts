import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  address: jsonb('address').$type<{
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  }>().notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
