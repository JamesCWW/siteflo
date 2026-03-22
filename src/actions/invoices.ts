'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import {
  invoices,
  invoiceLineItems,
  jobs,
  customers,
  serviceContracts,
  tenants,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { addDays, format } from 'date-fns';
import { randomBytes } from 'crypto';
import { generateInvoicePDF } from '@/lib/pdf/generate';
import { sendEmail, buildFromAddress } from '@/lib/email/send';
import { createElement } from 'react';
import { InvoiceSentEmail } from '@/lib/email/templates/invoice-sent';
import { formatPence } from '@/lib/utils/money';

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'overdue' | 'paid' | 'void';

const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPricePence: z.number().int().min(0),
  totalPence: z.number().int().min(0),
});

const CreateInvoiceSchema = z.object({
  jobId: z.string().uuid(),
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
  vatRatePercent: z.number().min(0).max(100).default(20),
  paymentTermsDays: z.number().int().min(0).default(14),
});

const UpdateInvoiceSchema = z.object({
  lineItems: z.array(LineItemSchema).min(1, 'At least one line item is required'),
  vatRatePercent: z.number().min(0).max(100).default(20),
  dueDate: z.string().min(1),
});

export async function getInvoices(filter?: { status?: string }) {
  try {
    const user = await getCurrentUser();

    const data = await db
      .select({
        invoice: invoices,
        customer: {
          id: customers.id,
          name: customers.name,
        },
        job: {
          id: jobs.id,
          refNumber: jobs.refNumber,
        },
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .innerJoin(jobs, eq(invoices.jobId, jobs.id))
      .where(and(
        eq(invoices.tenantId, user.tenantId),
        filter?.status ? eq(invoices.status, filter.status as InvoiceStatus) : undefined,
      ))
      .orderBy(desc(invoices.createdAt));

    return { success: true, data };
  } catch (error) {
    console.error('getInvoices failed:', error);
    return { success: false, error: 'Failed to load invoices', data: [] };
  }
}

export async function getInvoice(id: string) {
  try {
    const user = await getCurrentUser();

    const [row] = await db
      .select({
        invoice: invoices,
        customer: customers,
        job: jobs,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .innerJoin(jobs, eq(invoices.jobId, jobs.id))
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, user.tenantId)))
      .limit(1);

    if (!row) return { success: false, error: 'Invoice not found', data: null };

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(invoiceLineItems.sortOrder);

    return { success: true, data: { ...row, lineItems } };
  } catch (error) {
    console.error('getInvoice failed:', error);
    return { success: false, error: 'Failed to load invoice', data: null };
  }
}

export async function getInvoiceByToken(token: string) {
  try {
    const [row] = await db
      .select({
        invoice: invoices,
        customer: customers,
        job: jobs,
        tenant: tenants,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .innerJoin(jobs, eq(invoices.jobId, jobs.id))
      .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
      .where(eq(invoices.accessToken, token))
      .limit(1);

    if (!row) return { success: false, error: 'Invoice not found', data: null };

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, row.invoice.id))
      .orderBy(invoiceLineItems.sortOrder);

    // Mark as viewed if first open
    if (row.invoice.status === 'sent') {
      await db
        .update(invoices)
        .set({ status: 'viewed' })
        .where(eq(invoices.id, row.invoice.id));
    }

    return { success: true, data: { ...row, lineItems } };
  } catch (error) {
    console.error('getInvoiceByToken failed:', error);
    return { success: false, error: 'Failed to load invoice', data: null };
  }
}

export async function createInvoice(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = CreateInvoiceSchema.parse(input);

    // Verify job belongs to this tenant
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, parsed.jobId), eq(jobs.tenantId, user.tenantId)))
      .limit(1);

    if (!job) return { success: false, error: 'Job not found' };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    const vatRate = tenant?.settings?.defaultVatRate ?? parsed.vatRatePercent;
    const termsDays = tenant?.settings?.invoicePaymentTermsDays ?? parsed.paymentTermsDays;

    const subtotal = parsed.lineItems.reduce((sum, li) => sum + li.totalPence, 0);
    const vatPence = Math.round(subtotal * (vatRate / 100));
    const totalPence = subtotal + vatPence;

    const refNumber = await generateRefNumber('INV');
    const accessToken = randomBytes(32).toString('hex');
    const dueDate = addDays(new Date(), termsDays);

    const [invoice] = await db.insert(invoices).values({
      tenantId: user.tenantId,
      jobId: parsed.jobId,
      customerId: job.customerId,
      refNumber,
      status: 'draft',
      subtotalPence: subtotal,
      vatPence,
      totalPence,
      dueDate,
      accessToken,
    }).returning();

    await db.insert(invoiceLineItems).values(
      parsed.lineItems.map((li, i) => ({
        invoiceId: invoice.id,
        description: li.description,
        quantity: li.quantity,
        unitPricePence: li.unitPricePence,
        totalPence: li.totalPence,
        sortOrder: i,
      }))
    );

    revalidatePath('/invoices');
    revalidatePath(`/jobs/${parsed.jobId}`);
    return { success: true, data: invoice };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createInvoice failed:', error);
    return { success: false, error: 'Failed to create invoice' };
  }
}

export async function sendInvoice(id: string) {
  try {
    const user = await getCurrentUser();

    const [row] = await db
      .select({
        invoice: invoices,
        customer: customers,
        tenant: tenants,
      })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, user.tenantId)))
      .limit(1);

    if (!row) return { success: false, error: 'Invoice not found' };
    if (row.invoice.status !== 'draft') return { success: false, error: 'Only draft invoices can be sent' };

    const { invoice, customer, tenant } = row;

    if (!customer.email) return { success: false, error: 'Customer has no email address' };

    // Generate PDF first
    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id))
      .orderBy(invoiceLineItems.sortOrder);

    const addr = customer.address;
    const customerAddress = [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(', ');

    const pdfResult = await generateInvoicePDF({
      tenantId: user.tenantId,
      invoiceId: id,
      branding: tenant.branding,
      refNumber: invoice.refNumber,
      status: invoice.status,
      customerName: customer.name,
      customerAddress,
      lineItems: lineItems.map(li => ({
        description: li.description,
        quantity: li.quantity,
        unitPricePence: li.unitPricePence,
        totalPence: li.totalPence,
      })),
      subtotalPence: invoice.subtotalPence,
      vatPence: invoice.vatPence,
      totalPence: invoice.totalPence,
      dueDate: format(new Date(invoice.dueDate), 'dd MMM yyyy'),
      issuedDate: format(new Date(invoice.createdAt), 'dd MMM yyyy'),
    });

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoice/${invoice.accessToken}`;

    const emailEl = createElement(InvoiceSentEmail, {
      customerName: customer.name,
      companyName: tenant.branding.companyName,
      invoiceRefNumber: invoice.refNumber,
      totalFormatted: formatPence(invoice.totalPence),
      dueDate: format(new Date(invoice.dueDate), 'dd MMM yyyy'),
      portalUrl,
      bankName: tenant.branding.bankName,
      bankSortCode: tenant.branding.bankSortCode,
      bankAccountNumber: tenant.branding.bankAccountNumber,
      bankAccountName: tenant.branding.bankAccountName,
      replyEmail: tenant.branding.companyEmail,
      primaryColor: tenant.branding.primaryColor,
    });

    const emailResult = await sendEmail({
      to: customer.email,
      subject: `Invoice ${invoice.refNumber} from ${tenant.branding.companyName}`,
      from: buildFromAddress(tenant.branding.companyName),
      replyTo: tenant.branding.companyEmail,
      react: emailEl,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error ?? 'Failed to send email' };
    }

    const updateData: Partial<typeof invoice> & { status: InvoiceStatus; sentAt: Date; pdfUrl?: string } = {
      status: 'sent',
      sentAt: new Date(),
    };
    if (pdfResult.success) updateData.pdfUrl = pdfResult.pdfUrl;

    await db.update(invoices).set(updateData).where(eq(invoices.id, id));

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (error) {
    console.error('sendInvoice failed:', error);
    return { success: false, error: 'Failed to send invoice' };
  }
}

export async function markInvoicePaid(id: string, paymentMethod: string) {
  try {
    const user = await getCurrentUser();

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, user.tenantId)))
      .limit(1);

    if (!invoice) return { success: false, error: 'Invoice not found' };

    await db
      .update(invoices)
      .set({ status: 'paid', paidAt: new Date(), paymentMethod })
      .where(eq(invoices.id, id));

    // If linked job, update job status to paid
    await db
      .update(jobs)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(and(eq(jobs.id, invoice.jobId), eq(jobs.tenantId, user.tenantId)));

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    revalidatePath(`/jobs/${invoice.jobId}`);
    return { success: true };
  } catch (error) {
    console.error('markInvoicePaid failed:', error);
    return { success: false, error: 'Failed to mark invoice as paid' };
  }
}

export async function updateInvoice(id: string, input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = UpdateInvoiceSchema.parse(input);

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, user.tenantId)))
      .limit(1);

    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (invoice.status !== 'draft') return { success: false, error: 'Only draft invoices can be edited' };

    const subtotal = parsed.lineItems.reduce((sum, li) => sum + li.totalPence, 0);
    const vatPence = Math.round(subtotal * (parsed.vatRatePercent / 100));
    const totalPence = subtotal + vatPence;

    // Replace line items
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    await db.insert(invoiceLineItems).values(
      parsed.lineItems.map((li, i) => ({
        invoiceId: id,
        description: li.description,
        quantity: li.quantity,
        unitPricePence: li.unitPricePence,
        totalPence: li.totalPence,
        sortOrder: i,
      }))
    );

    await db
      .update(invoices)
      .set({
        subtotalPence: subtotal,
        vatPence,
        totalPence,
        dueDate: new Date(parsed.dueDate),
      })
      .where(eq(invoices.id, id));

    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('updateInvoice failed:', error);
    return { success: false, error: 'Failed to update invoice' };
  }
}

export async function voidInvoice(id: string) {
  try {
    const user = await getCurrentUser();
    await db
      .update(invoices)
      .set({ status: 'void' })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, user.tenantId)));

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (error) {
    console.error('voidInvoice failed:', error);
    return { success: false, error: 'Failed to void invoice' };
  }
}

// Pre-populate invoice from a contract service job
export async function getInvoicePreFill(jobId: string) {
  try {
    const user = await getCurrentUser();

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, user.tenantId)))
      .limit(1);

    if (!job) return { success: false, error: 'Job not found', data: null };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);

    let suggestedLineItems: { description: string; quantity: number; unitPricePence: number; totalPence: number }[] = [];

    if (job.contractId) {
      const [contract] = await db
        .select()
        .from(serviceContracts)
        .where(and(eq(serviceContracts.id, job.contractId), eq(serviceContracts.tenantId, user.tenantId)))
        .limit(1);

      if (contract?.standardPricePence) {
        suggestedLineItems = [{
          description: contract.title,
          quantity: 1,
          unitPricePence: contract.standardPricePence,
          totalPence: contract.standardPricePence,
        }];
      }
    }

    return {
      success: true,
      data: {
        suggestedLineItems,
        defaultVatRate: tenant?.settings?.defaultVatRate ?? 20,
        paymentTermsDays: tenant?.settings?.invoicePaymentTermsDays ?? 14,
      },
    };
  } catch (error) {
    console.error('getInvoicePreFill failed:', error);
    return { success: false, error: 'Failed to load pre-fill data', data: null };
  }
}
