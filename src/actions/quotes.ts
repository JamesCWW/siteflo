'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { quotes, quoteLineItems, jobs, customers, tenants } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { addDays, format } from 'date-fns';
import { randomBytes } from 'crypto';
import { sendEmail, buildFromAddress } from '@/lib/email/send';
import { createElement } from 'react';
import { QuoteSentEmail } from '@/lib/email/templates/quote-sent';
import { formatPence } from '@/lib/utils/money';

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'declined' | 'expired';

const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPricePence: z.number().int().min(0),
  totalPence: z.number().int().min(0),
  partId: z.string().uuid().optional(),
});

const CreateQuoteSchema = z.object({
  jobId: z.string().uuid(),
  lineItems: z.array(LineItemSchema).min(1),
  vatRatePercent: z.number().min(0).max(100).default(20),
  expiryDays: z.number().int().min(1).default(30),
});

export async function getQuoteByToken(token: string) {
  try {
    const [row] = await db
      .select({
        quote: quotes,
        customer: customers,
        job: jobs,
        tenant: tenants,
      })
      .from(quotes)
      .innerJoin(jobs, eq(quotes.jobId, jobs.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
      .where(eq(quotes.accessToken, token))
      .limit(1);

    if (!row) return { success: false, error: 'Quote not found', data: null };

    const lineItems = await db
      .select()
      .from(quoteLineItems)
      .where(eq(quoteLineItems.quoteId, row.quote.id))
      .orderBy(quoteLineItems.sortOrder);

    return { success: true, data: { ...row, lineItems } };
  } catch (error) {
    console.error('getQuoteByToken failed:', error);
    return { success: false, error: 'Failed to load quote', data: null };
  }
}

export async function respondToQuote(token: string, response: 'approved' | 'declined', customerNote?: string) {
  try {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.accessToken, token))
      .limit(1);

    if (!quote) return { success: false, error: 'Quote not found' };
    if (quote.status !== 'sent') return { success: false, error: 'This quote is no longer open for responses' };

    await db
      .update(quotes)
      .set({
        status: response,
        respondedAt: new Date(),
        customerNote: customerNote || null,
      })
      .where(eq(quotes.id, quote.id));

    return { success: true };
  } catch (error) {
    console.error('respondToQuote failed:', error);
    return { success: false, error: 'Failed to submit response' };
  }
}

export async function createQuote(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = CreateQuoteSchema.parse(input);

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, parsed.jobId), eq(jobs.tenantId, user.tenantId)))
      .limit(1);

    if (!job) return { success: false, error: 'Job not found' };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    const vatRate = tenant?.settings?.defaultVatRate ?? parsed.vatRatePercent;
    const expiryDays = tenant?.settings?.quoteExpiryDays ?? parsed.expiryDays;

    const subtotal = parsed.lineItems.reduce((sum, li) => sum + li.totalPence, 0);
    const vatPence = Math.round(subtotal * (vatRate / 100));
    const totalPence = subtotal + vatPence;

    const refNumber = await generateRefNumber('QUO');
    const accessToken = randomBytes(32).toString('hex');
    const expiresAt = addDays(new Date(), expiryDays);

    const [quote] = await db.insert(quotes).values({
      tenantId: user.tenantId,
      jobId: parsed.jobId,
      refNumber,
      status: 'draft',
      subtotalPence: subtotal,
      vatPence,
      totalPence,
      expiresAt,
      accessToken,
    }).returning();

    await db.insert(quoteLineItems).values(
      parsed.lineItems.map((li, i) => ({
        quoteId: quote.id,
        description: li.description,
        quantity: li.quantity,
        unitPricePence: li.unitPricePence,
        totalPence: li.totalPence,
        partId: li.partId ?? null,
        sortOrder: i,
      }))
    );

    revalidatePath(`/jobs/${parsed.jobId}`);
    return { success: true, data: quote };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createQuote failed:', error);
    return { success: false, error: 'Failed to create quote' };
  }
}

export async function getQuotesForJob(jobId: string) {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.tenantId, user.tenantId), eq(quotes.jobId, jobId)))
      .orderBy(desc(quotes.createdAt));
    return { success: true, data };
  } catch (error) {
    console.error('getQuotesForJob failed:', error);
    return { success: false, data: [] };
  }
}

export async function sendQuote(quoteId: string) {
  try {
    const user = await getCurrentUser();

    const [row] = await db
      .select({
        quote: quotes,
        job: jobs,
        customer: customers,
        tenant: tenants,
      })
      .from(quotes)
      .innerJoin(jobs, eq(quotes.jobId, jobs.id))
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .innerJoin(tenants, eq(quotes.tenantId, tenants.id))
      .where(and(eq(quotes.id, quoteId), eq(quotes.tenantId, user.tenantId)))
      .limit(1);

    if (!row) return { success: false, error: 'Quote not found' };
    if (row.quote.status !== 'draft') return { success: false, error: 'Quote has already been sent' };
    if (!row.customer.email) return { success: false, error: 'Customer has no email address' };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const portalUrl = `${appUrl}/portal/quote/${row.quote.accessToken}`;
    const fromAddress = buildFromAddress(row.tenant.branding.companyName);

    const emailResult = await sendEmail({
      to: row.customer.email,
      from: fromAddress,
      replyTo: row.tenant.branding.companyEmail,
      subject: `Quote ${row.quote.refNumber} from ${row.tenant.branding.companyName}`,
      react: createElement(QuoteSentEmail, {
        customerName: row.customer.name,
        companyName: row.tenant.branding.companyName,
        quoteRefNumber: row.quote.refNumber,
        totalFormatted: formatPence(row.quote.totalPence),
        validUntil: row.quote.expiresAt
          ? format(new Date(row.quote.expiresAt), 'dd MMM yyyy')
          : undefined,
        portalUrl,
        replyEmail: row.tenant.branding.companyEmail,
        primaryColor: row.tenant.branding.primaryColor,
      }),
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error ?? 'Failed to send email' };
    }

    await db
      .update(quotes)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(quotes.id, quoteId));

    revalidatePath(`/jobs/${row.quote.jobId}`);
    return { success: true };
  } catch (error) {
    console.error('sendQuote failed:', error);
    return { success: false, error: 'Failed to send quote' };
  }
}
