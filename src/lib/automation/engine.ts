import { db } from '@/db/client';
import {
  automationRules,
  automationLogs,
  serviceContracts,
  customers,
  tenants,
  jobs,
  invoices,
  invoiceLineItems,
  quotes,
  users,
} from '@/db/schema';
import { eq, and, lt, gte, lte, isNotNull, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  differenceInDays,
  addHours,
  subDays,
  subHours,
  format,
  addDays,
  addMonths,
} from 'date-fns';
import { sendEmail, buildFromAddress } from '@/lib/email/send';
import { createElement } from 'react';
import { ServiceDueReminderEmail } from '@/lib/email/templates/service-due-reminder';
import { AppointmentReminderEmail } from '@/lib/email/templates/appointment-reminder';
import { PaymentChaserEmail } from '@/lib/email/templates/payment-chaser';
import { formatPence } from '@/lib/utils/money';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { randomBytes } from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function findActiveRule(
  tenantId: string,
  trigger: string
) {
  const [rule] = await db
    .select()
    .from(automationRules)
    .where(
      and(
        eq(automationRules.tenantId, tenantId),
        eq(automationRules.trigger, trigger as typeof automationRules.trigger._.data),
        eq(automationRules.isActive, true)
      )
    )
    .limit(1);
  return rule ?? null;
}

async function hasLogEntry(
  ruleId: string,
  opts: { contractId?: string; jobId?: string; invoiceId?: string; quoteId?: string },
  tier: string
): Promise<boolean> {
  const conditions = [
    eq(automationLogs.ruleId, ruleId),
    eq(automationLogs.status, 'sent'),
    sql`${automationLogs.details}->>'tier' = ${tier}`,
  ];
  if (opts.contractId) conditions.push(eq(automationLogs.contractId, opts.contractId));
  if (opts.jobId) conditions.push(eq(automationLogs.jobId, opts.jobId));
  if (opts.invoiceId) conditions.push(eq(automationLogs.invoiceId, opts.invoiceId));
  if (opts.quoteId) conditions.push(eq(automationLogs.quoteId, opts.quoteId));

  const [existing] = await db
    .select({ id: automationLogs.id })
    .from(automationLogs)
    .where(and(...conditions))
    .limit(1);
  return !!existing;
}

async function logEntry(
  tenantId: string,
  ruleId: string,
  opts: {
    contractId?: string;
    jobId?: string;
    invoiceId?: string;
    quoteId?: string;
  },
  action: string,
  status: 'sent' | 'failed' | 'skipped',
  details?: Record<string, unknown>
) {
  await db.insert(automationLogs).values({
    tenantId,
    ruleId,
    contractId: opts.contractId ?? null,
    jobId: opts.jobId ?? null,
    invoiceId: opts.invoiceId ?? null,
    quoteId: opts.quoteId ?? null,
    action,
    status,
    details: details ?? null,
  });
}

// ─── Contract Renewal (daily cron) ──────────────────────────────────────────

export async function runContractRenewalChecks(): Promise<{ processed: number; sent: number }> {
  const now = new Date();
  let processed = 0;
  let sent = 0;

  // Fetch all active contracts with customer + tenant info
  const rows = await db
    .select({
      contract: serviceContracts,
      customer: customers,
      tenant: tenants,
    })
    .from(serviceContracts)
    .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
    .innerJoin(tenants, eq(serviceContracts.tenantId, tenants.id))
    .where(eq(serviceContracts.status, 'active'));

  for (const { contract, customer, tenant } of rows) {
    processed++;
    const daysUntilDue = differenceInDays(new Date(contract.nextServiceDate), now);

    const bookingUrl = `${APP_URL}/portal/book/${tenant.slug}?contractId=${contract.id}`;
    const fromAddress = buildFromAddress(tenant.branding.companyName);

    // ── Check if already booked (upcoming job linked to this contract) ──
    const [upcomingJob] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.contractId, contract.id),
          eq(jobs.status, 'scheduled'),
        )
      )
      .limit(1);
    const alreadyBooked = !!upcomingJob;

    // ── Reminder tiers ──
    // Tier definitions: [minDays, maxDays, tierKey, isFollowUp]
    const tiers: Array<[number, number, string, boolean]> = [
      [28, 33, '30d', false],
      [11, 16, '14d', true],
      [4, 9, '7d', true],
    ];

    const rule = await findActiveRule(tenant.id, 'contract_service_due');

    for (const [min, max, tierKey, isFollowUp] of tiers) {
      if (daysUntilDue >= min && daysUntilDue <= max) {
        if (!rule) break;
        if (alreadyBooked) break;
        if (!customer.email) break;

        const alreadySent = await hasLogEntry(rule.id, { contractId: contract.id }, tierKey);
        if (alreadySent) break;

        const emailResult = await sendEmail({
          to: customer.email,
          from: fromAddress,
          replyTo: tenant.branding.companyEmail,
          subject: isFollowUp
            ? `Follow-up: Your ${contract.title} is due soon`
            : `Your ${contract.title} is due soon`,
          react: createElement(ServiceDueReminderEmail, {
            customerName: customer.name,
            companyName: tenant.branding.companyName,
            serviceTitle: contract.title,
            nextServiceDate: format(new Date(contract.nextServiceDate), 'dd MMM yyyy'),
            bookingUrl,
            replyEmail: tenant.branding.companyEmail,
            companyPhone: tenant.branding.companyPhone,
            isFollowUp,
            primaryColor: tenant.branding.primaryColor,
          }),
        });

        await logEntry(tenant.id, rule.id, { contractId: contract.id }, 'send_email',
          emailResult.success ? 'sent' : 'failed',
          { tier: tierKey, emailId: emailResult.id, error: emailResult.error }
        );

        if (emailResult.success) sent++;
        break; // only one tier per contract per run
      }
    }

    // ── Overdue: past due date, no active booking → notify owner ──
    if (daysUntilDue < 0 && !alreadyBooked) {
      const overdueRule = await findActiveRule(tenant.id, 'contract_service_due');
      if (!overdueRule) continue;

      const alreadyNotified = await hasLogEntry(overdueRule.id, { contractId: contract.id }, 'overdue');
      if (alreadyNotified) continue;

      // Notify owner: find owner/admin of this tenant
      const [ownerUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenant.id),
            eq(users.isActive, true),
          )
        )
        .limit(1);

      if (ownerUser?.email) {
        const emailResult = await sendEmail({
          to: ownerUser.email,
          from: fromAddress,
          subject: `Overdue service: ${customer.name} — ${contract.title}`,
          html: `
            <p>Hi ${ownerUser.fullName},</p>
            <p>The service for <strong>${customer.name}</strong> (${contract.title}) was due on
            <strong>${format(new Date(contract.nextServiceDate), 'dd MMM yyyy')}</strong>
            and has not yet been booked.</p>
            <p>You may want to reach out to the customer directly.</p>
            <p>— Siteflo Automation</p>
          `,
        });

        await logEntry(tenant.id, overdueRule.id, { contractId: contract.id }, 'notify_owner',
          emailResult.success ? 'sent' : 'failed',
          { tier: 'overdue' }
        );

        if (emailResult.success) sent++;
      }
    }
  }

  return { processed, sent };
}

// ─── General Automation (15-minute cron) ────────────────────────────────────

export async function runGeneralAutomation(): Promise<{ processed: number; sent: number }> {
  const now = new Date();
  let processed = 0;
  let sent = 0;

  // ── 1. Appointment reminders ──────────────────────────────────────────────
  const windowStart = addHours(now, 23);
  const windowEnd = addHours(now, 25);

  const upcomingJobs = await db
    .select({
      job: jobs,
      customer: customers,
      tenant: tenants,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .innerJoin(tenants, eq(jobs.tenantId, tenants.id))
    .where(
      and(
        eq(jobs.status, 'scheduled'),
        gte(jobs.scheduledStart, windowStart),
        lte(jobs.scheduledStart, windowEnd),
      )
    );

  for (const { job, customer, tenant } of upcomingJobs) {
    processed++;
    if (!customer.email || !job.scheduledStart) continue;

    const rule = await findActiveRule(tenant.id, 'appointment_reminder');
    if (!rule) continue;

    const alreadySent = await hasLogEntry(rule.id, { jobId: job.id }, '24h');
    if (alreadySent) continue;

    const addr = job.siteAddress ?? customer.address;
    const siteAddress = addr
      ? [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(', ')
      : '';

    const fromAddress = buildFromAddress(tenant.branding.companyName);
    const emailResult = await sendEmail({
      to: customer.email,
      from: fromAddress,
      replyTo: tenant.branding.companyEmail,
      subject: `Appointment reminder — ${format(new Date(job.scheduledStart), 'dd MMM')}`,
      react: createElement(AppointmentReminderEmail, {
        customerName: customer.name,
        companyName: tenant.branding.companyName,
        serviceTitle: job.description ?? 'Service visit',
        scheduledDate: format(new Date(job.scheduledStart), 'EEEE, dd MMMM yyyy'),
        scheduledTime: format(new Date(job.scheduledStart), 'HH:mm'),
        siteAddress,
        jobRefNumber: job.refNumber,
        replyEmail: tenant.branding.companyEmail,
        companyPhone: tenant.branding.companyPhone,
        primaryColor: tenant.branding.primaryColor,
      }),
    });

    await logEntry(tenant.id, rule.id, { jobId: job.id }, 'send_email',
      emailResult.success ? 'sent' : 'failed',
      { tier: '24h', emailId: emailResult.id }
    );

    if (emailResult.success) sent++;
  }

  // ── 2. Invoice chasers ────────────────────────────────────────────────────
  const overdueInvoices = await db
    .select({
      invoice: invoices,
      customer: customers,
      tenant: tenants,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
    .where(
      and(
        lt(invoices.dueDate, now),
        // Only chase sent/viewed (not already paid/voided)
        eq(invoices.status, 'sent'),
      )
    );

  // Also include 'viewed' invoices
  const viewedOverdueInvoices = await db
    .select({
      invoice: invoices,
      customer: customers,
      tenant: tenants,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
    .where(
      and(
        lt(invoices.dueDate, now),
        eq(invoices.status, 'viewed'),
      )
    );

  const allOverdue = [...overdueInvoices, ...viewedOverdueInvoices];

  for (const { invoice, customer, tenant } of allOverdue) {
    processed++;
    if (!customer.email) continue;

    const rule = await findActiveRule(tenant.id, 'invoice_overdue');
    if (!rule) continue;

    const daysOverdue = differenceInDays(now, new Date(invoice.dueDate));
    const fromAddress = buildFromAddress(tenant.branding.companyName);
    const portalUrl = `${APP_URL}/portal/invoice/${invoice.accessToken}`;

    const chaserTiers: Array<[number, string, 'friendly' | 'firm', boolean]> = [
      [7, '7d', 'friendly', false],
      [14, '14d', 'firm', false],
      [21, '21d', 'firm', true], // owner notify on 21d
    ];

    for (const [days, tierKey, tone, notifyOwner] of chaserTiers) {
      if (daysOverdue >= days) {
        const alreadySent = await hasLogEntry(rule.id, { invoiceId: invoice.id }, tierKey);
        if (alreadySent) continue;

        if (notifyOwner) {
          // Notify owner instead
          const [ownerUser] = await db
            .select()
            .from(users)
            .where(and(eq(users.tenantId, tenant.id), eq(users.isActive, true)))
            .limit(1);

          if (ownerUser?.email) {
            const emailResult = await sendEmail({
              to: ownerUser.email,
              from: fromAddress,
              subject: `Invoice ${invoice.refNumber} is ${daysOverdue} days overdue`,
              html: `
                <p>Hi ${ownerUser.fullName},</p>
                <p>Invoice <strong>${invoice.refNumber}</strong> for <strong>${customer.name}</strong>
                (${formatPence(invoice.totalPence)}) is now <strong>${daysOverdue} days overdue</strong>.</p>
                <p>You may want to contact them directly.</p>
                <p>— Siteflo Automation</p>
              `,
            });

            await logEntry(tenant.id, rule.id, { invoiceId: invoice.id }, 'notify_owner',
              emailResult.success ? 'sent' : 'failed',
              { tier: tierKey, daysOverdue }
            );
            if (emailResult.success) sent++;
          }
        } else {
          const emailResult = await sendEmail({
            to: customer.email,
            from: fromAddress,
            replyTo: tenant.branding.companyEmail,
            subject: tone === 'friendly'
              ? `Payment reminder — ${invoice.refNumber}`
              : `Overdue invoice — ${invoice.refNumber}`,
            react: createElement(PaymentChaserEmail, {
              customerName: customer.name,
              companyName: tenant.branding.companyName,
              invoiceRefNumber: invoice.refNumber,
              totalFormatted: formatPence(invoice.totalPence),
              dueDate: format(new Date(invoice.dueDate), 'dd MMM yyyy'),
              daysOverdue,
              portalUrl,
              bankAccountName: tenant.branding.bankAccountName,
              bankSortCode: tenant.branding.bankSortCode,
              bankAccountNumber: tenant.branding.bankAccountNumber,
              replyEmail: tenant.branding.companyEmail,
              tone,
              primaryColor: tenant.branding.primaryColor,
            }),
          });

          await logEntry(tenant.id, rule.id, { invoiceId: invoice.id }, 'send_email',
            emailResult.success ? 'sent' : 'failed',
            { tier: tierKey, daysOverdue, emailId: emailResult.id }
          );
          if (emailResult.success) sent++;
        }
      }
    }

    // Mark invoice as overdue in DB if not already
    if (invoice.status !== 'overdue') {
      await db
        .update(invoices)
        .set({ status: 'overdue' })
        .where(eq(invoices.id, invoice.id));
    }
  }

  return { processed, sent };
}

// ─── Booking Confirmed Trigger ───────────────────────────────────────────────

export async function triggerBookingConfirmed(opts: {
  tenantId: string;
  jobId: string;
  contractId: string | null;
  customerId: string;
}): Promise<void> {
  const rule = await findActiveRule(opts.tenantId, 'contract_booking_confirmed');
  if (!rule) return;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, opts.tenantId))
    .limit(1);
  if (!tenant) return;

  // ── Create draft invoice if contract has a standard price ──
  if (opts.contractId) {
    const [contract] = await db
      .select()
      .from(serviceContracts)
      .where(eq(serviceContracts.id, opts.contractId))
      .limit(1);

    if (contract?.standardPricePence && contract.invoiceTiming === 'upfront') {
      const vatRate = tenant.settings.defaultVatRate ?? 20;
      const subtotal = contract.standardPricePence;
      const vatPence = Math.round(subtotal * (vatRate / 100));
      const totalPence = subtotal + vatPence;
      const termsDays = tenant.settings.invoicePaymentTermsDays ?? 14;
      const refNumber = await generateRefNumber('INV');
      const accessToken = randomBytes(32).toString('hex');

      const [newInvoice] = await db
        .insert(invoices)
        .values({
          tenantId: opts.tenantId,
          jobId: opts.jobId,
          customerId: opts.customerId,
          refNumber,
          status: 'draft',
          subtotalPence: subtotal,
          vatPence,
          totalPence,
          dueDate: addDays(new Date(), termsDays),
          accessToken,
        })
        .returning();

      await db.insert(invoiceLineItems).values({
        invoiceId: newInvoice.id,
        description: contract.title,
        quantity: 1,
        unitPricePence: contract.standardPricePence,
        totalPence: contract.standardPricePence,
        sortOrder: 0,
      });

      await logEntry(opts.tenantId, rule.id, { jobId: opts.jobId, contractId: opts.contractId, invoiceId: newInvoice.id },
        'create_draft_invoice', 'sent', { invoiceRef: refNumber }
      );
    }
  }

  // ── Notify owner ──
  const [ownerUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, opts.tenantId), eq(users.isActive, true)))
    .limit(1);

  if (ownerUser?.email) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, opts.customerId))
      .limit(1);

    const fromAddress = buildFromAddress(tenant.branding.companyName);
    await sendEmail({
      to: ownerUser.email,
      from: fromAddress,
      subject: 'New booking confirmed',
      html: `
        <p>Hi ${ownerUser.fullName},</p>
        <p><strong>${customer?.name ?? 'A customer'}</strong> has just booked via the customer portal.</p>
        <p><a href="${APP_URL}/jobs/${opts.jobId}">View job</a> |
           <a href="${APP_URL}/invoices">Review draft invoice</a></p>
        <p>— Siteflo Automation</p>
      `,
    });

    await logEntry(opts.tenantId, rule.id, { jobId: opts.jobId },
      'notify_owner', 'sent', {}
    );
  }
}

// ─── Service Completed Trigger ───────────────────────────────────────────────

export async function triggerServiceCompleted(opts: {
  tenantId: string;
  jobId: string;
  contractId: string;
  completedAt: Date;
}): Promise<void> {
  const [contract] = await db
    .select()
    .from(serviceContracts)
    .where(eq(serviceContracts.id, opts.contractId))
    .limit(1);
  if (!contract) return;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, opts.tenantId))
    .limit(1);
  if (!tenant) return;

  // Advance next service date
  const nextServiceDate = addMonths(opts.completedAt, contract.serviceIntervalMonths);

  // Determine billing cycle state
  const visitsPerCycle = Math.max(1, Math.round(contract.billingIntervalMonths / contract.serviceIntervalMonths));
  const visitsCompletedInCycle = (contract.servicesCompletedInCycle ?? 0) + 1;
  const cycleComplete = visitsCompletedInCycle >= visitsPerCycle;

  await db.update(serviceContracts).set({
    lastServiceDate: opts.completedAt,
    lastJobId: opts.jobId,
    totalServicesCompleted: (contract.totalServicesCompleted ?? 0) + 1,
    servicesCompletedInCycle: cycleComplete ? 0 : visitsCompletedInCycle,
    nextServiceDate,
    ...(cycleComplete ? {
      billingCycleStart: opts.completedAt,
      cycleInvoiceStatus: 'not_invoiced',
      nextInvoiceDate: contract.invoiceTiming === 'upfront'
        ? addMonths(opts.completedAt, contract.billingIntervalMonths)
        : null,
    } : {}),
    updatedAt: opts.completedAt,
  }).where(eq(serviceContracts.id, opts.contractId));

  // ── Invoice drafting based on timing ──
  if (!contract.standardPricePence) return;

  const shouldDraftInvoice =
    contract.invoiceTiming === 'after_each_visit' ||
    (contract.invoiceTiming === 'after_cycle_complete' && cycleComplete);

  if (!shouldDraftInvoice) return;

  const rule = await findActiveRule(opts.tenantId, 'contract_booking_confirmed');
  if (!rule) return;

  const vatRate = tenant.settings.defaultVatRate ?? 20;
  const visitsLabel = contract.invoiceTiming === 'after_each_visit' && visitsPerCycle > 1
    ? ` (visit ${visitsCompletedInCycle} of ${visitsPerCycle})`
    : '';
  const unitPrice = contract.invoiceTiming === 'after_each_visit'
    ? Math.round(contract.standardPricePence / visitsPerCycle)
    : contract.standardPricePence;

  const subtotal = unitPrice;
  const vatPence = Math.round(subtotal * (vatRate / 100));
  const totalPence = subtotal + vatPence;
  const termsDays = tenant.settings.invoicePaymentTermsDays ?? 14;
  const refNumber = await generateRefNumber('INV');
  const accessToken = randomBytes(32).toString('hex');

  const [newInvoice] = await db
    .insert(invoices)
    .values({
      tenantId: opts.tenantId,
      jobId: opts.jobId,
      customerId: contract.customerId,
      refNumber,
      status: 'draft',
      subtotalPence: subtotal,
      vatPence,
      totalPence,
      dueDate: addDays(opts.completedAt, termsDays),
      accessToken,
    })
    .returning();

  await db.insert(invoiceLineItems).values({
    invoiceId: newInvoice.id,
    description: `${contract.title}${visitsLabel}`,
    quantity: 1,
    unitPricePence: unitPrice,
    totalPence: unitPrice,
    sortOrder: 0,
  });

  await logEntry(opts.tenantId, rule.id,
    { jobId: opts.jobId, contractId: opts.contractId, invoiceId: newInvoice.id },
    'create_draft_invoice', 'sent',
    { invoiceRef: refNumber, timing: contract.invoiceTiming }
  );
}
