import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  activeProducts: jsonb('active_products').$type<string[]>().default(['contracts']).notNull(),
  branding: jsonb('branding').$type<{
    logoUrl?: string;
    primaryColor: string;
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    bankName?: string;
    bankSortCode?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    vatNumber?: string;
  }>().notNull(),
  settings: jsonb('settings').$type<{
    defaultCurrency: string;
    defaultVatRate: number;
    quoteExpiryDays: number;
    invoicePaymentTermsDays: number;
    workingHoursStart: string;
    workingHoursEnd: string;
    workingDays: number[];
    bookingSlotMinutes: number;
    onboardingComplete?: boolean;
    trade?: string;
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
