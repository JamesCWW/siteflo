import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const partsLibrary = pgTable('parts_library', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  type: text('type', { enum: ['part', 'labour'] }).notNull(),
  unitPrice: integer('unit_price').notNull(),
  unit: text('unit').default('each'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
