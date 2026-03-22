import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type ServiceFieldDefinition = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'checkbox-group' | 'date' | 'signature' | 'photo' | 'textarea' | 'section-header';
  required: boolean;
  options?: string[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  unit?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  group?: string;
  subheading?: string;
  sortOrder: number;
};

export const serviceTemplates = pgTable('service_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  isActive: boolean('is_active').default(true).notNull(),
  fieldSchema: jsonb('field_schema').$type<ServiceFieldDefinition[]>().notNull(),
  pdfConfig: jsonb('pdf_config').$type<{
    title: string;
    showLogo: boolean;
    showSignature: boolean;
    headerText?: string;
    footerText?: string;
    layout: 'single-column' | 'two-column';
  }>().notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
