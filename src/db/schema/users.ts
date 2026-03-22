import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  authId: uuid('auth_id').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'technician'] }).notNull(),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
