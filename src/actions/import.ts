'use server';

import { db } from '@/db/client';
import { customers, serviceContracts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { addMonths } from 'date-fns';

export interface ImportRow {
  customerName: string;
  address: {
    line1: string;
    city: string;
    postcode: string;
    country: string;
  };
  phone: string;
  email: string;
  contractTitle: string;
  serviceIntervalMonths: number;
  billingIntervalMonths: number;
  standardPricePence: number | null;
  lastServiceDate: string | null;
  nextServiceDate: string;
  lastPaymentDate: string | null;
  nextInvoiceDate: string | null;
  notes: string;
  duplicateAction: 'skip' | 'create_anyway' | 'add_to_existing';
  existingCustomerId: string | null;
}

export async function checkDuplicates(names: string[]) {
  try {
    const user = await getCurrentUser();

    // Fetch all customers for this tenant in one query, then match in JS
    const existing = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.tenantId, user.tenantId));

    const results = names.map((name) => {
      const match = existing.find(
        (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      return match ?? null;
    });

    return { success: true, results };
  } catch (error) {
    console.error('checkDuplicates failed:', error);
    return { success: false, results: names.map(() => null) };
  }
}

export async function bulkImport(rows: ImportRow[]) {
  const user = await getCurrentUser();
  let customersCreated = 0;
  let contractsCreated = 0;
  const rowErrors: string[] = [];

  for (const row of rows) {
    if (row.duplicateAction === 'skip') continue;

    try {
      let customerId: string;

      if (row.duplicateAction === 'add_to_existing' && row.existingCustomerId) {
        // Verify the customer belongs to this tenant
        const [existing] = await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(eq(customers.id, row.existingCustomerId), eq(customers.tenantId, user.tenantId)))
          .limit(1);
        if (!existing) throw new Error('Existing customer not found');
        customerId = existing.id;
      } else {
        const [customer] = await db
          .insert(customers)
          .values({
            tenantId: user.tenantId,
            name: row.customerName,
            address: {
              line1: row.address.line1,
              city: row.address.city,
              postcode: row.address.postcode,
              country: row.address.country,
            },
            phone: row.phone || null,
            email: row.email || null,
          })
          .returning({ id: customers.id });
        customerId = customer.id;
        customersCreated++;
      }

      // Derive billing cycle from next service date
      const nextServiceDate = new Date(row.nextServiceDate);
      const billingCycleStart = addMonths(nextServiceDate, -row.billingIntervalMonths);

      // Estimate services completed in current cycle
      let servicesCompletedInCycle = 0;
      if (row.lastServiceDate) {
        const lastService = new Date(row.lastServiceDate);
        if (lastService >= billingCycleStart) servicesCompletedInCycle = 1;
      }

      // Derive cycle invoice status from last payment date
      let cycleInvoiceStatus: 'not_invoiced' | 'invoice_sent' | 'invoice_paid' = 'not_invoiced';
      let cycleInvoicePaidDate: Date | null = null;
      if (row.lastPaymentDate) {
        const lastPayment = new Date(row.lastPaymentDate);
        if (lastPayment >= billingCycleStart) {
          cycleInvoiceStatus = 'invoice_paid';
          cycleInvoicePaidDate = lastPayment;
        }
      }

      const refNumber = await generateRefNumber('CON');

      await db.insert(serviceContracts).values({
        tenantId: user.tenantId,
        customerId,
        refNumber,
        title: row.contractTitle || 'Annual Service',
        description: row.notes || null,
        serviceIntervalMonths: row.serviceIntervalMonths,
        billingIntervalMonths: row.billingIntervalMonths,
        invoiceTiming: 'upfront',
        standardPricePence: row.standardPricePence,
        nextServiceDate,
        nextInvoiceDate: row.nextInvoiceDate ? new Date(row.nextInvoiceDate) : null,
        billingCycleStart,
        contractStartDate: billingCycleStart,
        lastServiceDate: row.lastServiceDate ? new Date(row.lastServiceDate) : null,
        servicesCompletedInCycle,
        totalServicesCompleted: servicesCompletedInCycle,
        cycleInvoiceStatus,
        cycleInvoicePaidDate,
        status: 'active',
        reminderLeadDays: 30,
        installationDetails: {},
      });
      contractsCreated++;
    } catch (err) {
      rowErrors.push(
        `"${row.customerName}": ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  revalidatePath('/customers');
  revalidatePath('/contracts');

  return { success: true, customersCreated, contractsCreated, errors: rowErrors };
}
