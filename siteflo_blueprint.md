# Siteflo Contracts — Service Contract Tracker

## Blueprint & Claude Code Build Guide

> **What is this document?** This is the single source of truth for building Siteflo Contracts. Feed this to Claude Code at the start of every session. It contains the architecture, database schema, folder structure, feature specs, and coding standards.
>
> **Brand note:** "Siteflo" is the parent brand. This product is "Siteflo Contracts." Future products (e.g. "Siteflo RAMS" — risk assessments & method statements) will share the same Supabase project, tenant system, and auth. Keep all table names, folder names, and code references product-neutral where possible (e.g. `tenants` not `contracts_tenants`) so the shared infrastructure works across products.

---

## 1. Product Summary

Siteflo Contracts is a **service contract and recurring maintenance tracker** for small-to-medium trade businesses (plumbers, gate engineers, HVAC, electricians). It replaces rigid FSM tools with a "liquid" system where service records, forms, and workflows adapt to any trade.

The core loop is: **Install → Track → Remind → Book → Service → Report → Repeat.**

Unlike job-management tools focused on one-off work, Siteflo is built around the **ongoing relationship** between a tradesperson and their customers. A plumber installs a boiler, adds the customer to Siteflo, and the app handles the rest — reminding the customer when their annual service is due, letting them book in, generating invoices, producing branded certificates, and rolling the contract forward year after year.

### Core Promise

**"Install it. Track it. Never lose a customer."**

### Primary User Flow (The Recurring Service Cycle)

1. **Tradesperson completes an installation** (boiler, gate, HVAC unit — happens outside the app)
2. **Adds customer to Siteflo** — name, address, contact, what was installed, optional photos/serial numbers
3. **Creates a service contract** — "Annual boiler service, next due in 10 months"
4. **10-11 months later** → automation sends customer a reminder email with booking link
5. **Customer books** via the public portal (picks a date/time)
6. **Owner reviews and sends invoice** with one tap (auto-drafted on booking confirmation)
7. **Customer pays** (bank transfer, marked as paid manually)
8. **Technician carries out service** → fills in dynamic form on-site → branded PDF generated
9. **Auto-send report/certificate** to customer via email
10. **If extra parts/work needed** → quick invoice sent from the app
11. **Contract auto-renews** → next due date rolls forward → repeat from step 4

### One-Off Jobs

The app also supports standalone jobs (not tied to a contract) for ad-hoc callouts, repairs, and one-time work. But the **service contract cycle** is the primary value proposition.

### User Personas

| Persona | Example | Access |
|---------|---------|--------|
| **Owner/Admin** | Runs "Dave's Plumbing" — 1 person doing everything | Full access: jobs, invoices, templates, settings, reports |
| **Admin (office)** | Office manager at a gate company with 3 engineers | Full access minus billing/subscription settings |
| **Technician** | Field engineer — needs mobile-first, fast, offline-capable | Own jobs, fill forms, create quotes, view schedule |
| **Customer** | Homeowner or facility manager (no login required) | Public portal: view PDFs, approve quotes, book appointments |

### Design Principles

- **Mobile-first utility**: High contrast, large touch targets (min 48px), works with dirty hands
- **Offline-first**: Core job/form workflow works without signal, syncs when back online
- **Zero-entry where possible**: Pre-populated fields, smart defaults, tap over type
- **Trade-agnostic**: No hardcoded field for "gas pressure" — everything is template-driven

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | Server actions simplify API layer; Claude Code handles it well |
| **Language** | TypeScript (strict mode) | Type safety across stack; AI generates better TS than JS |
| **Database** | Supabase (Postgres 15+) | Auth, RLS, realtime, storage — all managed. Native JSONB support |
| **ORM** | Drizzle ORM | Lighter than Prisma, better TS inference, cleaner AI-generated code |
| **UI** | shadcn/ui + Tailwind CSS v4 | Copy-paste components, full control, no heavy dependency |
| **Forms** | React Hook Form + Zod | Performant forms with schema validation |
| **PDF** | @react-pdf/renderer | React components → PDF. Template-driven, brandable |
| **Email** | Resend | Simple API, React email templates, generous free tier |
| **Offline** | Dexie.js (IndexedDB) | Lightweight client-side DB for offline job/form data |
| **State** | Zustand | Minimal, works with SSR, simple for offline sync state |
| **Calendar** | Google Calendar API (v2) | Two-way sync for scheduling |
| **Hosting** | Vercel | Serverless, edge-ready, zero-config with Next.js |
| **File Storage** | Supabase Storage | PDFs, photos, signatures stored per-tenant |

### Key Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "drizzle-orm": "^0.38.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.5.x",
    "zod": "^3.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "@react-pdf/renderer": "^4.x",
    "resend": "^4.x",
    "dexie": "^4.x",
    "dexie-react-hooks": "^1.x",
    "zustand": "^5.x",
    "date-fns": "^4.x",
    "signature_pad": "^5.x"
  }
}
```

---

## 3. Database Schema

### Multi-Tenancy Model

Every table has a `tenant_id` column. Supabase Row-Level Security (RLS) policies enforce tenant isolation at the database level. No application code should ever filter by `tenant_id` manually — RLS handles it.

### Schema Diagram (Relational)

```
tenants
  ├── users (owner/admin/technician)
  ├── customers
  │     └── service_contracts (recurring service agreements)
  │           └── jobs (individual service visits)
  │                 ├── job_field_values (JSONB — filled form data)
  │                 ├── job_photos
  │                 ├── job_signatures
  │                 └── invoices
  │                       └── invoice_line_items
  ├── service_templates (dynamic form schemas)
  ├── parts_library (reusable parts/labour items)
  ├── automation_rules
  └── automation_logs
```

**Key relationship:** Customer → Service Contract → Jobs (many). A contract represents the ongoing agreement ("annual boiler service"). Each time the service is carried out, a new job is created under that contract.

### Core Tables (Drizzle Schema)

```typescript
// src/db/schema/tenants.ts
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // used in URLs
  
  // Which Siteflo products this tenant has access to
  // Future-proofs for Siteflo RAMS and other products
  activeProducts: jsonb('active_products').$type<string[]>().default(['contracts']).notNull(),
  // Possible values: 'contracts', 'rams' (future)
  
  // Branding for PDFs and customer portal (shared across all Siteflo products)
  branding: jsonb('branding').$type<{
    logoUrl?: string;
    primaryColor: string;    // hex
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
    defaultCurrency: string;        // 'GBP'
    defaultVatRate: number;         // 20
    quoteExpiryDays: number;        // 30
    invoicePaymentTermsDays: number; // 14
    workingHoursStart: string;      // '08:00'
    workingHoursEnd: string;        // '17:00'
    workingDays: number[];          // [1,2,3,4,5] (Mon-Fri)
    bookingSlotMinutes: number;     // 60
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```typescript
// src/db/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  authId: uuid('auth_id').notNull().unique(), // Supabase Auth user ID
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'technician'] }).notNull(),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```typescript
// src/db/schema/customers.ts
// PRINCIPLE: Minimal required fields, generous optional detail
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // === REQUIRED (the app needs these to function) ===
  name: text('name').notNull(),
  address: jsonb('address').$type<{
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  }>().notNull(),
  
  // === RECOMMENDED (needed for emails/comms, but not blocking) ===
  email: text('email'),
  phone: text('phone'),
  
  // === OPTIONAL (rich detail for those who want it) ===
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),  // e.g. ["residential", "priority"]
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// src/db/schema/service-contracts.ts
// THE RECURRING RELATIONSHIP — this is the heart of Siteflo
//
// A service contract represents: "This customer has [thing installed],
// and it needs servicing every [interval]."
// Each time the service is carried out, a new job is created under this contract.

export const serviceContracts = pgTable('service_contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  refNumber: text('ref_number').notNull(),  // "CON-0001"
  
  // What was installed / what's being maintained
  title: text('title').notNull(),            // "Boiler Service", "Gate Annual Maintenance"
  description: text('description'),           // Free text notes about the installation
  installationDate: timestamp('installation_date'),  // When the original install happened
  templateId: uuid('template_id').references(() => serviceTemplates.id), // Form to use for services
  
  // === OPTIONAL RICH DETAIL ===
  installationDetails: jsonb('installation_details').$type<{
    make?: string;           // "Worcester Bosch"
    model?: string;          // "Greenstar 4000"
    serialNumber?: string;
    location?: string;       // "Kitchen, ground floor"
    warrantyExpiry?: string; // ISO date
    photos?: string[];       // Supabase Storage paths
    customFields?: Record<string, string>; // Flexible key-value for anything else
  }>().default({}),
  
  // === RECURRENCE ===
  intervalMonths: integer('interval_months').notNull().default(12), // 12 = annual
  nextDueDate: timestamp('next_due_date').notNull(),
  reminderLeadDays: integer('reminder_lead_days').notNull().default(30), // Send reminder this many days before due
  
  // === PRICING (optional — for auto-drafting invoices) ===
  standardPricePence: integer('standard_price_pence'), // e.g. 8500 = £85.00 for annual service
  
  // === STATUS ===
  status: text('status', {
    enum: ['active', 'paused', 'expired', 'cancelled']
  }).notNull().default('active'),
  
  // Tracking
  lastServiceDate: timestamp('last_service_date'),
  lastJobId: uuid('last_job_id'),   // most recent completed job
  totalServicesCompleted: integer('total_services_completed').default(0).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

```typescript
// src/db/schema/service-templates.ts
// THIS IS THE "LIQUID" CORE — dynamic form schemas

export const serviceTemplates = pgTable('service_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),           // "Gas Safety Certificate"
  description: text('description'),
  category: text('category'),              // "Inspection", "Install", "Repair"
  isActive: boolean('is_active').default(true).notNull(),
  // The dynamic schema definition
  fieldSchema: jsonb('field_schema').$type<ServiceFieldDefinition[]>().notNull(),
  // PDF layout preferences
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

// Type definition for dynamic fields
type ServiceFieldDefinition = {
  id: string;            // unique within template, e.g. "gas_pressure_inlet"
  label: string;         // "Inlet Gas Pressure (mbar)"
  type: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'signature' | 'photo' | 'textarea' | 'section-header';
  required: boolean;
  options?: string[];    // for 'select' type
  defaultValue?: string | number | boolean;
  placeholder?: string;
  unit?: string;         // "mbar", "N", "°C"
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;    // regex for text fields
  };
  group?: string;        // visual grouping, e.g. "Appliance 1"
  sortOrder: number;
};
```

```typescript
// src/db/schema/jobs.ts
// A job is a single service visit. It can be standalone (one-off) or linked to a contract.
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  refNumber: text('ref_number').notNull(),  // "JOB-0042"
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  templateId: uuid('template_id').references(() => serviceTemplates.id),
  
  // Link to service contract (null = one-off job)
  contractId: uuid('contract_id').references(() => serviceContracts.id),
  
  // Job type helps the UI and automation engine
  type: text('type', {
    enum: ['contract_service', 'one_off', 'callback', 'inspection']
  }).notNull().default('one_off'),
  
  status: text('status', {
    enum: ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled']
  }).notNull().default('scheduled'),
  
  // Scheduling
  scheduledStart: timestamp('scheduled_start'),
  scheduledEnd: timestamp('scheduled_end'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  
  // Location — defaults from customer address, can be overridden
  siteAddress: jsonb('site_address').$type<{
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    lat?: number;
    lng?: number;
  }>(),
  
  // THE DYNAMIC DATA — filled form values keyed by field ID
  fieldValues: jsonb('field_values').$type<Record<string, any>>().default({}),
  
  // General
  description: text('description'),
  internalNotes: text('internal_notes'),
  pdfUrl: text('pdf_url'),            // Supabase Storage path
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Photos attached to a job (installation photos, on-site evidence, etc.)
export const jobPhotos = pgTable('job_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  storageUrl: text('storage_url').notNull(),  // Supabase Storage path
  caption: text('caption'),
  takenAt: timestamp('taken_at').defaultNow().notNull(),
});
```

```typescript
// src/db/schema/parts-library.ts
export const partsLibrary = pgTable('parts_library', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),          // "15mm Copper Elbow"
  description: text('description'),
  category: text('category'),             // "Fittings", "Labour", "Materials"
  type: text('type', { enum: ['part', 'labour'] }).notNull(),
  unitPrice: integer('unit_price').notNull(), // in pence (2500 = £25.00)
  unit: text('unit').default('each'),     // "each", "hour", "metre"
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

```typescript
// src/db/schema/quotes.ts
// Lightweight — a quote is a child of a job, not a separate pipeline
export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  jobId: uuid('job_id').notNull().references(() => jobs.id),
  refNumber: text('ref_number').notNull(),  // "QUO-0015"
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
  
  // Public access token for customer portal
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
  partId: uuid('part_id').references(() => partsLibrary.id), // optional link
  sortOrder: integer('sort_order').default(0).notNull(),
});
```

```typescript
// src/db/schema/invoices.ts
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  jobId: uuid('job_id').notNull().references(() => jobs.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  refNumber: text('ref_number').notNull(),  // "INV-0023"
  status: text('status', {
    enum: ['draft', 'sent', 'viewed', 'overdue', 'paid', 'void']
  }).notNull().default('draft'),
  
  subtotalPence: integer('subtotal_pence').notNull(),
  vatPence: integer('vat_pence').notNull(),
  totalPence: integer('total_pence').notNull(),
  
  dueDate: timestamp('due_date').notNull(),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  paymentMethod: text('payment_method'),  // "bank_transfer", "cash", "card"
  
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
```

```typescript
// src/db/schema/automation.ts
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  
  trigger: text('trigger', {
    enum: [
      // === CONTRACT LIFECYCLE (the primary cycle) ===
      'contract_service_due',   // service due date approaching (based on reminderLeadDays)
      'contract_booking_confirmed', // customer booked via portal
      'contract_service_completed', // technician completed a contract service
      
      // === JOB LIFECYCLE ===
      'job_scheduled',         // when a job is created/scheduled
      'job_completed',         // when technician marks complete
      'appointment_reminder',  // X hours before scheduled job
      
      // === INVOICE LIFECYCLE ===
      'invoice_sent',          // when invoice is emailed
      'invoice_overdue',       // invoice past due date
      
      // === QUOTE LIFECYCLE ===
      'quote_sent',            // when quote is emailed
      'quote_no_response',     // quote not responded to after X days
    ]
  }).notNull(),
  
  // Conditions (when to fire)
  conditions: jsonb('conditions').$type<{
    delayHours?: number;           // wait this long after trigger
    daysOverdue?: number;          // for invoice_overdue
    reminderHoursBefore?: number;  // for appointment_reminder
    maxExecutions?: number;        // stop after N sends (e.g. 3 chase emails max)
  }>().notNull(),
  
  // Action to take
  action: text('action', {
    enum: ['send_email', 'send_sms', 'notify_owner', 'update_status', 'create_draft_invoice']
  }).notNull(),
  
  // Template for the action
  actionConfig: jsonb('action_config').$type<{
    emailTemplateId?: string;
    subject?: string;
    tone?: 'friendly' | 'professional' | 'firm';
    notifyVia?: 'email' | 'push' | 'both';
  }>().notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  ruleId: uuid('rule_id').notNull().references(() => automationRules.id),
  jobId: uuid('job_id').references(() => jobs.id),
  contractId: uuid('contract_id').references(() => serviceContracts.id),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  quoteId: uuid('quote_id').references(() => quotes.id),
  action: text('action').notNull(),
  status: text('status', { enum: ['sent', 'failed', 'skipped'] }).notNull(),
  details: jsonb('details'),  // error message, email ID, etc.
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});
```

### Row-Level Security (RLS) Pattern

Apply this pattern to every table:

```sql
-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see rows belonging to their tenant
CREATE POLICY "tenant_isolation" ON jobs
  FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM users
      WHERE auth_id = auth.uid()
    )
  );

-- For public portal access (quotes/invoices via access_token)
CREATE POLICY "public_portal_access" ON quotes
  FOR SELECT
  USING (access_token = current_setting('app.access_token', true));
```

### Money Convention

**All monetary values are stored in pence (integer).** Never use float/decimal for money. Display formatting happens in the UI layer:

```typescript
// src/lib/utils/money.ts
export function formatPence(pence: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(pence / 100);
}
```

---

## 4. Folder Structure

```
siteflo/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth layout group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # Authenticated layout group
│   │   │   ├── layout.tsx            # Sidebar nav, auth check
│   │   │   ├── dashboard/page.tsx    # Overview/home
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx          # Job list
│   │   │   │   ├── new/page.tsx      # Create job
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Job detail / form fill
│   │   │   │       ├── quote/page.tsx  # Add quote to job
│   │   │   │       └── invoice/page.tsx
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Customer detail + their contracts
│   │   │   │       └── contracts/
│   │   │   │           └── new/page.tsx  # Add new contract for customer
│   │   │   ├── contracts/            # Service contracts overview
│   │   │   │   ├── page.tsx          # All contracts (filterable: due soon, overdue, all)
│   │   │   │   └── [id]/page.tsx     # Contract detail + service history
│   │   │   ├── calendar/page.tsx
│   │   │   ├── invoices/page.tsx
│   │   │   ├── templates/            # Service template builder
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── parts/page.tsx        # Parts/labour library
│   │   │   ├── automation/page.tsx   # Automation rules
│   │   │   └── settings/
│   │   │       ├── page.tsx          # Business info / branding
│   │   │       └── team/page.tsx     # User management
│   │   ├── portal/                   # Public customer portal (no auth)
│   │   │   ├── quote/[token]/page.tsx
│   │   │   ├── invoice/[token]/page.tsx
│   │   │   └── book/[slug]/page.tsx  # Public booking page
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   └── email/route.ts    # Resend webhooks
│   │   │   ├── cron/
│   │   │   │   ├── automation/route.ts     # Vercel Cron — general automation
│   │   │   │   └── contract-renewal/route.ts  # Vercel Cron — check due contracts
│   │   │   └── pdf/
│   │   │       └── generate/route.ts
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components (auto-generated)
│   │   ├── forms/
│   │   │   ├── dynamic-field.tsx     # Renders any ServiceFieldDefinition
│   │   │   ├── dynamic-form.tsx      # Renders a full template's fields
│   │   │   ├── quote-builder.tsx     # Quick quote form
│   │   │   └── signature-pad.tsx
│   │   ├── contracts/
│   │   │   ├── contract-card.tsx     # Shows contract summary + next due
│   │   │   ├── contract-timeline.tsx # Service history for a contract
│   │   │   └── contract-status-badge.tsx
│   │   ├── jobs/
│   │   │   ├── job-card.tsx
│   │   │   ├── job-status-badge.tsx
│   │   │   └── job-list.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── header.tsx
│   │   └── shared/
│   │       ├── data-table.tsx
│   │       ├── empty-state.tsx
│   │       └── loading.tsx
│   │
│   ├── db/
│   │   ├── schema/                   # Drizzle schema files (as above)
│   │   │   ├── tenants.ts
│   │   │   ├── users.ts
│   │   │   ├── customers.ts
│   │   │   ├── service-contracts.ts  # THE CORE — recurring service agreements
│   │   │   ├── jobs.ts
│   │   │   ├── service-templates.ts
│   │   │   ├── parts-library.ts
│   │   │   ├── quotes.ts
│   │   │   ├── invoices.ts
│   │   │   ├── automation.ts
│   │   │   └── index.ts              # Re-exports all schemas
│   │   ├── migrations/               # Drizzle Kit migrations
│   │   └── client.ts                 # Drizzle client init
│   │
│   ├── actions/                      # Next.js Server Actions
│   │   ├── jobs.ts
│   │   ├── customers.ts
│   │   ├── contracts.ts              # Service contract CRUD + renewal logic
│   │   ├── quotes.ts
│   │   ├── invoices.ts
│   │   ├── templates.ts
│   │   ├── parts.ts
│   │   ├── automation.ts
│   │   └── auth.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   └── middleware.ts          # Auth middleware
│   │   ├── pdf/
│   │   │   ├── templates/
│   │   │   │   ├── service-report.tsx # Generic service report PDF
│   │   │   │   ├── quote.tsx
│   │   │   │   └── invoice.tsx
│   │   │   └── generate.ts           # PDF generation logic
│   │   ├── email/
│   │   │   ├── templates/
│   │   │   │   ├── quote-sent.tsx
│   │   │   │   ├── invoice-sent.tsx
│   │   │   │   ├── appointment-reminder.tsx
│   │   │   │   └── payment-chaser.tsx
│   │   │   └── send.ts
│   │   ├── automation/
│   │   │   ├── engine.ts             # Core automation runner
│   │   │   └── evaluator.ts          # Rule condition evaluation
│   │   ├── offline/
│   │   │   ├── db.ts                 # Dexie schema
│   │   │   └── sync.ts              # Sync logic
│   │   └── utils/
│   │       ├── money.ts
│   │       ├── ref-numbers.ts        # Generate JOB-0001, INV-0002, etc.
│   │       └── dates.ts
│   │
│   ├── hooks/
│   │   ├── use-offline-job.ts
│   │   └── use-tenant.ts
│   │
│   └── types/
│       └── index.ts                  # Shared TypeScript types
│
├── supabase/
│   ├── migrations/                   # SQL migrations for RLS, functions
│   └── seed.sql                      # Dev seed data
│
├── public/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Feature Specifications

### 5A. Dynamic Service Records + PDF Generation

**Template Builder (Admin)**

The admin creates a "Service Template" — effectively designing a custom form. The UI is a drag-and-drop-style list builder where each row is a field definition. Supported field types: text, number, boolean (checkbox/toggle), select (dropdown), date, signature, photo, textarea, section-header (visual divider).

The template is stored as a `fieldSchema` JSONB array on `service_templates`.

**On-Site Form Fill (Technician)**

When a technician opens a job card linked to a template, the app reads the `fieldSchema` and renders a dynamic form using the `<DynamicForm>` component. Each field type maps to a specific shadcn/ui input.

```typescript
// Component mapping
const FIELD_RENDERERS: Record<ServiceFieldDefinition['type'], React.FC> = {
  text:            TextInput,
  number:          NumberInput,      // with unit suffix display
  boolean:         ToggleSwitch,     // large, thumb-friendly
  select:          SelectDropdown,
  date:            DatePicker,
  signature:       SignaturePad,     // canvas-based
  photo:           PhotoCapture,     // camera API
  textarea:        TextArea,
  'section-header': SectionDivider,
};
```

Filled values are saved as `job.fieldValues`:

```json
{
  "gas_pressure_inlet": 21.5,
  "gas_pressure_outlet": 20.0,
  "appliance_make": "Worcester Bosch",
  "safety_pass": true,
  "engineer_signature": "storage://signatures/job-42-sig.png"
}
```

**PDF Generation**

Triggered when job status moves to `completed`. The PDF renderer reads the template's `fieldSchema` for labels/layout and the job's `fieldValues` for data, and produces a branded document using tenant branding (logo, colours, company info).

```
Trigger: job.status → 'completed'
1. Load job + template + tenant branding
2. Render React-PDF document with <ServiceReportPDF> component
3. Upload to Supabase Storage: /{tenant_id}/jobs/{job_id}/report.pdf
4. Save URL to job.pdfUrl
5. Optionally email to customer (if automation rule is active)
```

### 5B. Service Contracts (The Core Feature)

**This is the primary value proposition of Siteflo.** A service contract tracks the recurring relationship between a tradesperson and a customer's installation.

**Creating a Contract (after an installation):**

1. Owner/technician navigates to a customer (or creates one first — minimal: name + address)
2. Taps "Add Service Contract"
3. Fills in:
   - **Title** (required): "Annual Boiler Service", "Gate Maintenance"
   - **Service interval** (required): defaults to 12 months, configurable
   - **Next due date** (required): auto-calculated from interval, or manually set
   - **Service template** (optional): links to the form they'll fill in each visit
   - **Standard price** (optional): auto-populates invoices, e.g. £85.00
   - **Reminder lead time** (optional): defaults to 30 days before due
   - **Installation details** (optional expandable section):
     - Make, model, serial number
     - Installation date
     - Location in property
     - Warranty expiry
     - Photos (camera capture or upload)
     - Custom notes
4. Contract created with status `active`

**The UI principle:** The form is one screen. Required fields at the top (title, interval, due date). Everything else is in a collapsible "More details" section. A plumber in a rush can create a contract in 30 seconds. A detailed engineer can spend 2 minutes adding everything.

**Contract Detail Page:**

Shows the contract summary, installation details (if any), and a **service history timeline** — every job ever completed against this contract, with links to each report/PDF. This becomes the definitive record of maintenance for that installation.

**The Renewal Cycle (automated):**

```
Contract created (nextDueDate set)
         ↓
[reminderLeadDays before nextDueDate]
Automation sends customer reminder email with booking link
         ↓
Customer books via portal → job created (type: 'contract_service', linked to contract)
         ↓
Owner gets notification → reviews auto-drafted invoice → sends with one tap
         ↓
Customer pays (bank transfer, marked manually)
         ↓
Technician carries out service → fills dynamic form → job completed
         ↓
PDF report auto-generated and emailed to customer
         ↓
Contract auto-updated:
  - lastServiceDate = now
  - lastJobId = this job
  - totalServicesCompleted += 1
  - nextDueDate += intervalMonths
         ↓
Cycle repeats
```

**What if the customer doesn't book?** The automation engine sends follow-up reminders (configurable: e.g. 30 days, then 14 days, then 7 days before due). If the due date passes with no booking, the contract stays `active` but the owner is notified that the service is overdue. The owner can then manually reach out or the system can send a "your service is now overdue" email.

### 5C. On-Site Quoting (For Extra Work)

This is for when a technician is on-site doing a service and discovers extra work needed — it's NOT the primary invoicing flow.

**Flow:**

1. From a job detail page, tap "Additional Work Needed"
2. Quote builder opens — pre-populated with parts/labour from tenant's `parts_library`
3. Technician selects items, adjusts quantities, optionally adds custom line items
4. Tap "Send" → email sent to customer with link to portal page
5. Customer views quote on portal, taps "Approve" or "Decline"
6. If approved: owner/admin is notified, work can proceed

**Key design decisions:**
- Quote is always attached to a job (never standalone for MVP)
- Parts library is searchable with recent/favourite items at the top
- Custom line items allowed (free text + price) for one-off items
- VAT calculated automatically based on tenant settings
- Quote PDF generated on send

### 5D. Invoice Generation

**Two invoice paths:**

1. **Contract service invoice** — auto-drafted when a customer confirms a booking. Pre-populated with the contract's `standardPricePence`. Owner reviews and sends with one tap.
2. **Additional work invoice** — created manually from a job when extra parts/labour were needed beyond the standard service.

**Flow:**

1. Invoice appears in owner's dashboard as "Draft — Review & Send"
2. Owner can adjust line items if needed
3. One tap to send → email with portal link + PDF attachment
4. Bank details shown on invoice (from tenant branding settings)
5. When payment received, admin taps "Mark as Paid" → selects payment method

**Status transitions:**

```
draft → sent → viewed (customer opened portal) → paid
                  ↘ overdue (past due date, auto-set by cron)
```

### 5E. Customer Portal

Public pages (no login required) accessed via unique `accessToken` in the URL.

**Routes:**
- `/portal/quote/[token]` — view quote, approve/decline with optional note
- `/portal/invoice/[token]` — view invoice, see bank details, see PDF
- `/portal/book/[slug]` — public booking page for tenant

**Booking page:** Shows available slots based on:
- Tenant working hours/days
- Existing scheduled jobs (blocks those time slots)
- Booking slot duration from tenant settings

**For contract renewals:** The reminder email includes a direct booking link. Customer picks a date/time, confirms, and the job is created linked to their contract. The booking confirmation triggers the auto-draft invoice for the owner to review.

**For new customers:** Customer fills: name, email, phone, address, preferred date/time, description of work needed. Submission creates a new customer (or matches existing by email) and a job with status `scheduled`.

### 5F. Automation Engine

**Architecture:** Two Vercel Cron jobs:

1. `/api/cron/contract-renewal` — runs daily at 8am. Scans all active contracts, checks if any are within `reminderLeadDays` of their `nextDueDate`, and fires the appropriate reminders.
2. `/api/cron/automation` — runs every 15 minutes. Handles all other automation (invoice chasers, appointment reminders, quote follow-ups).

**Default rules (created on tenant registration):**

| Rule | Trigger | Timing | Action |
|------|---------|--------|--------|
| Service Due Reminder | `contract_service_due` | 30 days before due | Email customer with booking link |
| Service Due Follow-up | `contract_service_due` | 14 days before due | Follow-up email if not booked |
| Service Overdue Alert | `contract_service_due` | On due date, not booked | Notify owner |
| Booking → Draft Invoice | `contract_booking_confirmed` | Immediate | Create draft invoice, notify owner |
| Appointment Reminder | `appointment_reminder` | 24h before | Email customer |
| Job Complete → Report | `contract_service_completed` | Immediate | Email PDF + update contract |
| Invoice Chaser 1 | `invoice_overdue` | 7 days overdue | Friendly email to customer |
| Invoice Chaser 2 | `invoice_overdue` | 14 days overdue | Firm email to customer |
| Invoice Alert | `invoice_overdue` | 21 days overdue | Notify owner |

**Email tone variants:**

```typescript
const TONE_TEMPLATES = {
  friendly: "Hi {customerName}, just a quick reminder...",
  professional: "Dear {customerName}, this is a reminder regarding...",
  firm: "Dear {customerName}, our records show invoice {invoiceRef} is now {daysOverdue} days overdue...",
};
```

### 5G. Calendar & Scheduling

**Dashboard calendar view** using a lightweight calendar component (build custom with date-fns, not a heavy library). Shows:
- Scheduled jobs colour-coded by status
- **Contract due dates** shown as markers (so owner can see upcoming renewals)
- Technician filter (for multi-tech teams)
- Day/week/month views

**Google Calendar sync (Phase 6 — post-MVP):**
- Two-way: job created in Siteflo → event in Google Calendar and vice versa
- Prevents double-booking by checking both systems

### 5H. Dashboard Overview

The home screen should give the owner an at-a-glance view of their business:

- **Contracts due soon** — list of contracts approaching their next service date
- **Upcoming jobs** — next 7 days of scheduled work
- **Draft invoices** — waiting for owner to review and send
- **Overdue invoices** — payments not yet received
- **Recent activity** — timeline of recent events (jobs completed, invoices paid, etc.)

---

## 6. Vibe Coding Guide — Rules for Claude Code

### Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files/folders | kebab-case | `job-card.tsx`, `parts-library.ts` |
| React components | PascalCase | `JobCard`, `DynamicForm` |
| Functions | camelCase | `createJob`, `generatePdf` |
| Server Actions | camelCase, prefixed with verb | `createJob`, `updateJobStatus`, `sendQuote` |
| DB columns | snake_case | `tenant_id`, `created_at` |
| Types/Interfaces | PascalCase | `ServiceFieldDefinition`, `JobStatus` |
| Constants | UPPER_SNAKE | `MAX_FILE_SIZE`, `DEFAULT_VAT_RATE` |
| CSS classes | Tailwind utility only | No custom CSS files |
| URLs/routes | kebab-case | `/jobs/[id]/quote` |

### File Rules

- **One component per file.** No barrel exports except `db/schema/index.ts`.
- **Server Actions go in `src/actions/`** — one file per domain (jobs, quotes, invoices).
- **Every Server Action** must validate input with Zod before touching the database.
- **No `'use client'` unless necessary.** Default to server components. Only add client directive for interactivity (forms, modals, signature pad).
- **No inline SQL.** All queries go through Drizzle ORM.
- **No `any` types.** Use `unknown` + type narrowing if the type is genuinely unknown.

### Component Patterns

```typescript
// GOOD: Server component (default)
// src/app/(dashboard)/jobs/page.tsx
export default async function JobsPage() {
  const jobs = await getJobs(); // server action or direct query
  return <JobList jobs={jobs} />;
}

// GOOD: Client component (only when needed)
// src/components/forms/dynamic-form.tsx
'use client';
import { useForm } from 'react-hook-form';
// ...
```

### Server Action Pattern

```typescript
// src/actions/jobs.ts
'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { jobs } from '@/db/schema';
import { revalidatePath } from 'next/cache';

const CreateJobInput = z.object({
  customerId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  scheduledStart: z.string().datetime(),
  description: z.string().min(1).max(1000),
});

export async function createJob(input: z.infer<typeof CreateJobInput>) {
  const parsed = CreateJobInput.parse(input);
  
  const [job] = await db.insert(jobs).values({
    ...parsed,
    refNumber: await generateRefNumber('JOB'),
    status: 'scheduled',
  }).returning();
  
  revalidatePath('/jobs');
  return job;
}
```

### Styling Rules

- **Tailwind only.** No CSS modules, no styled-components, no inline styles.
- **Mobile-first breakpoints:** Write for mobile, add `md:` and `lg:` for desktop.
- **Touch targets:** All interactive elements minimum `h-12 w-12` (48px).
- **Colour palette:** Use CSS variables defined in `globals.css` via shadcn/ui theming. The primary colour comes from tenant branding for the customer portal.
- **Dark mode:** Support from day one using shadcn/ui's built-in dark mode toggle. Use `text-foreground`, `bg-background`, etc.

### Offline Pattern

```typescript
// src/lib/offline/db.ts
import Dexie from 'dexie';

export class SitefloOfflineDB extends Dexie {
  jobs!: Table<OfflineJob>;
  fieldValues!: Table<OfflineFieldValues>;
  
  constructor() {
    super('siteflo-offline');
    this.version(1).stores({
      jobs: 'id, status, syncStatus',
      fieldValues: 'jobId',
    });
  }
}

// Sync status: 'synced' | 'pending' | 'conflict'
// On reconnect: push pending changes, pull latest from server
```

### Testing Requirements

- **Zod schemas double as validation AND test contracts.** Every server action's input schema IS the test specification.
- **Critical paths to test:**
  1. Dynamic form renders correctly from any template schema
  2. PDF generates with correct field values
  3. Quote/Invoice totals calculate correctly (money in pence)
  4. RLS policies block cross-tenant access
  5. Automation rules fire at correct times
- **Use Vitest** for unit tests, Playwright for E2E.

### Error Handling

```typescript
// ALWAYS use this pattern for server actions
export async function someAction(input: unknown) {
  try {
    const parsed = SomeSchema.parse(input);
    // ... logic
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('Action failed:', error);
    return { success: false, error: 'Something went wrong' };
  }
}
```

### Git Commit Convention

```
feat(jobs): add dynamic form rendering from template schema
fix(pdf): correct VAT calculation for zero-rated items
chore(db): add migration for automation_logs table
```

---

## 7. Build Phases

> **How to use this:** Each phase is one focused Claude Code session. Start a new chat for each phase, paste the relevant section of this blueprint as context, and reference this document for schema/structure decisions.
>
> **Tip:** At the start of each session, paste: (1) the blueprint sections relevant to that phase, (2) `tree src/ -L 3` output, (3) what's been completed so far. See Section 8 for the full prompt template.

---

### Phase 1: Foundation (Session 1-2)

**Goal:** Project scaffold, database, auth, and the tenant/user system.

**Session 1 — Scaffold + DB:**
```
Prompt for Claude Code:
"Set up a new Next.js 15 project with TypeScript, Tailwind v4, and shadcn/ui.
Install Drizzle ORM and configure it for Supabase Postgres.
Create the database schema for ALL core tables: tenants, users, customers,
service_contracts, jobs, job_photos, service_templates, parts_library,
quotes, quote_line_items, invoices, invoice_line_items, automation_rules,
automation_logs. Use the exact schema from the blueprint (I'll paste it).
Generate and run the initial migration.
Set up the Supabase client (browser + server) with middleware for auth.
All money values are stored in pence (integer). See the blueprint for the
full schema."

[Paste: Section 2 (Tech Stack), Section 3 (Database Schema), Section 6 (Vibe Coding Guide)]
```

**Session 2 — Auth + Tenant Onboarding + Dashboard Shell:**
```
Prompt for Claude Code:
"Implement Supabase Auth with email/password login.
Create a registration flow that:
1. Creates a Supabase Auth user
2. Creates a tenant record with default settings and default branding
3. Creates a user record linked to both (role: 'owner')
4. Creates default automation rules for the tenant (see blueprint Section 5F)
Build the (auth) layout group with login/register pages.
Build the (dashboard) layout group with:
- Responsive sidebar nav (collapsible on mobile → bottom tab bar)
- Nav items: Dashboard, Customers, Contracts, Jobs, Calendar, Invoices, Settings
- Header with user name and sign-out
- Mobile-first: bottom navigation with 5 key items, sidebar for desktop
Add RLS policies for ALL tables using the tenant_isolation pattern from the blueprint.
All touch targets minimum 48px. Use shadcn/ui components."

[Paste: Section 4 (Folder Structure), Section 6 (Vibe Coding Guide)]
```

**Deliverables:** Working login, registration, empty dashboard with navigation, all DB tables created with RLS.

**✅ Refresh chat after this phase.**

---

### Phase 2: Customers + Service Contracts (Session 3-4)

**Goal:** The core data model — add customers and create service contracts. This is the heart of the app.

**Session 3 — Customers CRUD:**
```
Prompt for Claude Code:
"Build the customers module:
- Customer list page with search and basic filtering
- Create customer form: name (required), address (required — line1, city, postcode),
  email (recommended), phone (recommended), notes (optional), tags (optional)
- Customer detail page showing their info
- Edit customer
- All server actions in src/actions/customers.ts, validated with Zod
- Use the customer schema from the blueprint

Design principle: the create form should have required fields visible at the top,
with optional fields in a collapsible 'More details' section. A user should be able
to add a customer in under 30 seconds with just name + address.
Mobile-first, large touch targets, clean and simple."

[Paste: customers schema, Section 6 (Vibe Coding Guide)]
```

**Session 4 — Service Contracts:**
```
Prompt for Claude Code:
"Build the service contracts module. This is the CORE feature of the app.

A service contract represents: 'This customer has [thing installed] and it needs
servicing every [interval].'

Customer detail page → 'Add Service Contract' button → contract creation form:
- Title (required): e.g. 'Annual Boiler Service'
- Interval in months (required, default 12)
- Next due date (required, auto-calculated from today + interval, editable)
- Reminder lead days (optional, default 30)
- Service template (optional, dropdown of tenant's templates)
- Standard price in pounds (optional, stored as pence)
- Collapsible 'Installation Details' section (all optional):
  - Make, Model, Serial number
  - Installation date
  - Location in property (text)
  - Warranty expiry date
  - Photos (upload to Supabase Storage)
  - Custom notes

Contract detail page showing:
- Contract summary card (title, customer, interval, next due, status, price)
- Installation details (if any, with photos)
- Service history timeline (empty for now — will show completed jobs later)

Contracts list page (/contracts):
- Default view: sorted by next due date (soonest first)
- Filters: Due this month, Due next month, Overdue, All
- Each card shows: customer name, contract title, next due date, status badge

Server actions in src/actions/contracts.ts.
All validated with Zod. Mobile-first."

[Paste: service_contracts schema, Section 5B (Service Contracts feature spec)]
```

**Deliverables:** Can add customers and create service contracts with optional rich detail. Contracts list shows what's coming due.

**✅ Refresh chat after this phase.**

---

### Phase 3: Jobs + Dynamic Forms (Session 5-6)

**Goal:** Create jobs (both from contracts and standalone), fill in dynamic service forms.

**Session 5 — Service Templates + Dynamic Forms:**
```
Prompt for Claude Code:
"Build the service template builder and dynamic form system.

Template Builder (admin page at /templates):
- List of templates with create/edit/deactivate
- Template editor: add/remove/reorder fields
- Supported field types: text, number, boolean (toggle), select (dropdown),
  date, signature, photo, textarea, section-header (visual divider)
- Each field has: label (required), type (required), required flag, placeholder,
  default value, unit (for numbers), options (for select), group name
- Store as fieldSchema JSONB on service_templates
- Include PDF config: title, show logo, show signature, layout

DynamicForm component (src/components/forms/dynamic-form.tsx):
- Reads a template's fieldSchema array
- Renders the correct input component for each field type
- Groups fields by their 'group' property with section headers
- Large touch targets, mobile-optimised
- Returns values as Record<string, any> keyed by field ID

SignaturePad component using the signature_pad library:
- Full-width canvas, clear button
- Saves as PNG to Supabase Storage

PhotoCapture component:
- Camera capture (mobile) or file upload (desktop)
- Preview thumbnail, delete option
- Uploads to Supabase Storage"

[Paste: service_templates schema, ServiceFieldDefinition type, Section 5A]
```

**Session 6 — Jobs CRUD + Contract-Linked Jobs:**
```
Prompt for Claude Code:
"Build the jobs module with two creation paths:

1. Contract service job: From a contract detail page → 'Schedule Service' button
   - Pre-fills: customer, template, site address (from customer), type='contract_service'
   - Links to contract via contractId
   - User just picks a date/time and optionally assigns a technician

2. Standalone job: From jobs list → 'New Job' button
   - Select customer, optionally select template, set schedule, assign tech
   - type='one_off'

Job list page (/jobs):
- Filterable by status, assignee, date range
- Status badges: scheduled (blue), in_progress (amber), completed (green),
  invoiced (purple), paid (emerald), cancelled (grey)

Job detail page (/jobs/[id]):
- Job info card (customer, address, schedule, assigned tech, status)
- If template linked: render DynamicForm for filling in service record
- Status transition buttons: 'Start Job' → 'Complete Job'
- Save form values to job.fieldValues JSONB
- Photo upload section (job_photos table)

When a job is completed AND it's linked to a contract:
- Update contract: lastServiceDate, lastJobId, totalServicesCompleted += 1
- Calculate and set nextDueDate = lastServiceDate + intervalMonths
- This is done in the completeJob server action

Server actions in src/actions/jobs.ts.
Wire up the contract detail page to show service history (list of jobs for that contract)."

[Paste: jobs schema, job_photos schema, Section 5B renewal cycle]
```

**Deliverables:** Full job lifecycle with dynamic forms. Contract-linked jobs auto-update the contract on completion.

**✅ Refresh chat after this phase.**

---

### Phase 4: PDF + Email + Invoice (Session 7-8)

**Goal:** Generate branded PDFs, send emails, create and send invoices.

**Session 7 — PDF Generation + Email System:**
```
Prompt for Claude Code:
"Build the PDF generation and email systems.

PDF Generation using @react-pdf/renderer:
- ServiceReportPDF component: reads tenant branding (logo, colours, company info),
  template fieldSchema (for labels), and job fieldValues (for data)
- Professional layout: branded header with logo, report title, field labels + values
  in a clean grid, photos section, signature, footer with company details
- API route: /api/pdf/generate — renders PDF, uploads to Supabase Storage,
  saves URL to job.pdfUrl
- InvoicePDF component: branded invoice with line items, VAT breakdown, totals,
  bank details for payment

Email System using Resend:
- src/lib/email/send.ts utility with error handling and logging
- React email templates for:
  1. Service report delivered (PDF attachment + summary)
  2. Invoice sent (PDF attachment + portal link + bank details)
  3. Appointment reminder (date, time, address)
  4. Service due reminder (booking link)
  5. Invoice payment chaser (friendly/firm variants)
- All emails branded with tenant logo and colours

Wire up: when job status → 'completed', auto-generate PDF.
(Email sending will be triggered by automation engine or manual send button)"

[Paste: Section 5A (PDF details), tenant branding schema, pdfConfig type]
```

**Session 8 — Invoicing + Customer Portal:**
```
Prompt for Claude Code:
"Build the invoicing system and customer portal.

Invoice creation — two paths:
1. From a completed job → 'Create Invoice' button
   - If job is contract_service and contract has standardPricePence,
     pre-populate with that amount as a line item
   - Otherwise, blank invoice for owner to add line items
2. For additional work → 'Invoice for Additional Parts' from job page
   - Add line items from parts library or custom

Invoice flow:
- Created as 'draft' status
- Owner sees drafts on dashboard and in /invoices list
- Owner reviews, adjusts if needed, taps 'Send'
- Email sent to customer with PDF + portal link
- Invoice status → 'sent'

Parts Library (/parts):
- CRUD for parts and labour items
- Name, description, category, type (part/labour), unit price, unit
- Searchable when adding invoice/quote line items

Customer Portal (public, no auth):
- /portal/invoice/[token] — view invoice, see bank details, download PDF
  Track when customer first opens (status → 'viewed')
- /portal/quote/[token] — view quote, approve/decline with optional note
- Branded with tenant's logo and primary colour
- Mobile-friendly, clean, professional

Mark as Paid:
- Owner taps 'Mark as Paid' on invoice → selects payment method
  (bank_transfer, cash, card) → invoice status → 'paid'
- If linked to a contract job, job status also → 'paid'"

[Paste: invoices schema, quotes schema, parts_library schema, Section 5D + 5E]
```

**Deliverables:** Complete service cycle: job done → PDF → invoice drafted → owner sends → customer views on portal → mark as paid.

**✅ Refresh chat after this phase.**

---

### Phase 5: Automation Engine + Booking (Session 9-10)

**Goal:** The automation that makes Siteflo run on autopilot, plus customer booking.

**Session 9 — Automation Engine:**
```
Prompt for Claude Code:
"Build the automation engine — this is what makes Siteflo valuable.

Two cron jobs:

1. /api/cron/contract-renewal (runs daily at 8am via Vercel Cron):
   - Query all active service_contracts across all tenants
   - For each contract: check if nextDueDate minus reminderLeadDays <= today
   - If yes and no reminder sent yet: trigger 'contract_service_due' rules
   - Support multiple reminders (30 days, 14 days, 7 days before due)
   - If nextDueDate has passed with no booking: notify owner

2. /api/cron/automation (runs every 15 minutes via Vercel Cron):
   - Query all active automation_rules
   - For each rule: evaluate trigger conditions against current data
   - Execute actions: send_email, notify_owner, create_draft_invoice, update_status
   - Log everything to automation_logs
   - Respect maxExecutions to prevent infinite sends

'contract_booking_confirmed' trigger:
   - When a booking is confirmed for a contract service
   - Auto-create a draft invoice (using contract's standardPricePence)
   - Notify owner: 'New booking confirmed — draft invoice ready to review'

Automation admin page (/automation):
   - List all rules with toggle to enable/disable
   - Show recent automation_logs
   - For MVP: rules are pre-configured, not user-editable
     (users just toggle on/off)

Protect cron endpoints with CRON_SECRET env variable."

[Paste: automation schema, Section 5F (Automation Engine)]
```

**Session 10 — Calendar + Public Booking:**
```
Prompt for Claude Code:
"Build the calendar and public booking system.

Calendar (/calendar):
- Custom-built with date-fns (no heavy calendar library)
- Week view (default) and month view
- Shows: scheduled jobs as coloured blocks, contract due dates as markers
- Technician filter dropdown (for multi-tech teams)
- Click a time slot → create new job (pre-fills date/time)
- Click an existing job → navigate to job detail
- Mobile: day view default, swipe to change days

Public Booking Page (/portal/book/[slug]):
- Accessed via link in reminder emails
- If linked from a contract reminder email, URL includes a contractId param
  so we can pre-fill customer info and link the booking to the contract
- Shows available slots based on:
  - Tenant's workingHoursStart/End and workingDays
  - Existing scheduled jobs (those slots are blocked)
  - bookingSlotMinutes from tenant settings
- For contract renewals (contractId in URL):
  - Customer name and address pre-filled from contract
  - On submit: create job linked to contract, status 'scheduled'
  - Trigger 'contract_booking_confirmed' automation
- For new customers (no contractId):
  - Customer fills: name, email, phone, address, description of work
  - On submit: create/match customer, create standalone job
- Send confirmation email to customer
- Notify owner of new booking"

[Paste: Section 5E (Customer Portal booking), Section 5G (Calendar), tenant settings schema]
```

**Deliverables:** Automated contract reminders, customer self-booking, calendar view, draft invoices on booking confirmation.

**✅ Refresh chat after this phase.**

---

### Phase 6: Dashboard + Polish (Session 11-12)

**Goal:** The owner's command centre, team management, mobile polish.

**Session 11 — Dashboard + On-Site Quoting:**
```
Prompt for Claude Code:
"Build the dashboard home page and on-site quoting.

Dashboard (/dashboard):
- 'Contracts Due Soon' card — next 30 days, sorted by date, tap to view
- 'Upcoming Jobs' card — next 7 days with times and assigned tech
- 'Draft Invoices' card — count + list, each with 'Review & Send' button
- 'Overdue Invoices' card — count + total amount outstanding
- 'Recent Activity' feed — last 10 events (jobs completed, invoices paid,
  new bookings, etc.)
- All cards are tappable/expandable, mobile-first

On-Site Quoting (from job detail page):
- 'Additional Work Needed' button on job detail
- Opens quote builder: searchable parts library + custom line items
- Auto-calculate subtotal, VAT, total (pence)
- 'Send Quote' → email to customer with portal link
- Customer approves/declines on portal
- If approved: owner notified, can create invoice for the extra work"

[Paste: Section 5H (Dashboard), Section 5C (On-Site Quoting)]
```

**Session 12 — Settings + Team + Mobile Polish:**
```
Prompt for Claude Code:
"Build settings, team management, and do a mobile polish pass.

Settings (/settings):
- Business info: company name, address, phone, email
- Branding: logo upload (Supabase Storage), primary colour picker
- Bank details: bank name, sort code, account number, account name
- VAT number (optional)
- Default settings: currency, VAT rate, payment terms, working hours,
  booking slot duration
- Save all to tenant.branding and tenant.settings

Team Management (/settings/team):
- List team members with role badges
- Invite technician: enter email → sends invite email with magic link
  → on first login, user is created with role 'technician' linked to tenant
- Change role (admin ↔ technician), deactivate user
- Solo operators see this page but with just themselves listed

Mobile Polish Pass:
- Ensure ALL interactive elements are minimum 48px touch targets
- Forms usable with one thumb (most important inputs at top)
- Loading states on every button that triggers a server action
- Empty states with helpful prompts ('No contracts yet — add your first customer')
- Pull-to-refresh on list pages (if using client-side data fetching)
- Test on narrow viewport (375px — iPhone SE)"

[Paste: Section 6 (Vibe Coding Guide styling rules)]
```

**Deliverables:** Polished dashboard, team management, settings, mobile-ready UI.

**✅ Refresh chat after this phase.**

---

### Phase 7: Offline + Final QA (Session 13-14) — OPTIONAL FOR MVP

**Goal:** Offline support for poor-signal sites, final quality pass.

**Session 13 — Offline Mode:**
```
Prompt for Claude Code:
"Implement offline support using Dexie.js (IndexedDB):
- On login: cache user's active jobs and their field values locally
- When offline: technician can view cached jobs and fill in forms
- Form saves go to local Dexie DB with syncStatus='pending'
- When back online: push pending changes to Supabase
- Show sync indicator in the UI (green=synced, amber=pending, red=offline)
- Conflict resolution: last-write-wins for MVP
- Cache service templates locally so forms render offline
- Do NOT cache customer list or contracts (too much data, less useful offline)"

[Paste: offline pattern from Section 6]
```

**Session 14 — Final QA + Seed Data:**
```
Prompt for Claude Code:
"Create a comprehensive seed script (supabase/seed.sql) that populates:
- 1 tenant with branding and settings
- 3 users (1 owner, 1 admin, 1 technician)
- 10 customers with addresses
- 2 service templates (e.g. 'Annual Boiler Service' and 'Gate Force Test')
- 8 service contracts across customers (mix of due dates)
- 5 completed jobs with field values
- 3 upcoming scheduled jobs
- 2 invoices (1 paid, 1 sent)
- Parts library with 10 common items

Then do a final QA pass:
- Test the full cycle: add customer → create contract → (simulate time) →
  booking → invoice → service → PDF → contract renewal
- Check all navigation flows on mobile viewport
- Verify RLS: log in as technician, confirm can't see other tenants' data
- Check all empty states have helpful copy
- Verify all forms have proper validation errors"
```

**Deliverables:** Offline-capable app with seed data for demos and testing.

---

### Build Phase Summary

| Phase | Sessions | What You Can Demo After |
|-------|----------|------------------------|
| 1. Foundation | 1-2 | Login, registration, empty dashboard |
| 2. Customers + Contracts | 3-4 | Add customers, create service contracts, see what's due |
| 3. Jobs + Dynamic Forms | 5-6 | Schedule services, fill in custom forms, complete jobs |
| 4. PDF + Email + Invoice | 7-8 | Generate reports, send invoices, customer portal |
| 5. Automation + Booking | 9-10 | Auto-reminders, customer self-booking, calendar |
| 6. Dashboard + Polish | 11-12 | Owner dashboard, team management, polished mobile UI |
| 7. Offline + QA | 13-14 | Offline form filling, seed data, full cycle tested |

**You have a usable product after Phase 4.** Phases 5-6 make it powerful. Phase 7 is nice-to-have.

---

## 8. Context Refresh Strategy

**When to start a new Claude Code chat:**

- After each completed phase (every 1-2 sessions)
- When Claude starts producing inconsistent code or forgetting conventions
- When switching between very different concerns (e.g., PDF → automation)

**What to paste at the start of each new chat:**

1. This blueprint file (or the relevant section)
2. The current folder structure (`tree src/ -L 3`)
3. The specific phase/session instructions
4. Any decisions or deviations made in previous sessions

**Prompt template for new sessions:**

```
I'm building Siteflo — a field service platform. Here is the blueprint:
[paste relevant blueprint sections]

Current project state:
[paste tree output]

Completed so far:
[list what's done]

This session, I need to:
[paste the session prompt from the build phases]

Follow the vibe coding guide in the blueprint for all naming,
patterns, and conventions.
```

---

## Appendix: Quick Reference

### Status Enums

| Entity | Statuses |
|--------|----------|
| Contract | active / paused / expired / cancelled |
| Job | scheduled → in_progress → completed → invoiced → paid / cancelled |
| Quote | draft → sent → approved / declined / expired |
| Invoice | draft → sent → viewed → overdue → paid / void |

### Ref Number Format

- Contracts: `CON-0001` (zero-padded, per-tenant sequential)
- Jobs: `JOB-0001`
- Quotes: `QUO-0001`
- Invoices: `INV-0001`

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (direct connection for Drizzle)
DATABASE_URL=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=          # protects cron endpoints
```
