'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import {
  jobs,
  customers,
  tenants,
  serviceContracts,
} from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { format, addMinutes, isWithinInterval, parseISO, setHours, setMinutes, addDays, startOfDay } from 'date-fns';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { sendEmail, buildFromAddress } from '@/lib/email/send';
import { createElement } from 'react';
import { BookingConfirmationEmail } from '@/lib/email/templates/booking-confirmation';
import { triggerBookingConfirmed } from '@/lib/automation/engine';

const BookingSchema = z.object({
  tenantSlug: z.string().min(1),
  contractId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressCity: z.string().min(1, 'City is required'),
  addressPostcode: z.string().min(1, 'Postcode is required'),
  scheduledStart: z.string().min(1, 'Please select a time slot'),
  description: z.string().optional(),
});

export async function getTenantBySlug(slug: string) {
  try {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (!tenant) return { success: false, error: 'Not found', data: null };
    return { success: true, data: tenant };
  } catch (error) {
    console.error('getTenantBySlug failed:', error);
    return { success: false, error: 'Failed to load booking page', data: null };
  }
}

export async function getContractForBooking(contractId: string, tenantId: string) {
  try {
    const [row] = await db
      .select({
        contract: serviceContracts,
        customer: customers,
      })
      .from(serviceContracts)
      .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
      .where(
        and(
          eq(serviceContracts.id, contractId),
          eq(serviceContracts.tenantId, tenantId),
          eq(serviceContracts.status, 'active'),
        )
      )
      .limit(1);
    if (!row) return { success: false, error: 'Contract not found', data: null };
    return { success: true, data: row };
  } catch (error) {
    console.error('getContractForBooking failed:', error);
    return { success: false, error: 'Failed to load contract', data: null };
  }
}

// Get available time slots for a given date
export async function getAvailableSlots(
  tenantId: string,
  date: string // ISO date string YYYY-MM-DD
): Promise<{ success: boolean; slots?: string[]; error?: string }> {
  try {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return { success: false, error: 'Tenant not found' };

    const { workingHoursStart, workingHoursEnd, workingDays, bookingSlotMinutes } = tenant.settings;
    const slotMinutes = bookingSlotMinutes ?? 60;

    const targetDate = parseISO(date);
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon ... 6=Sat

    // workingDays uses [1,2,3,4,5] = Mon-Fri (same as getDay() for Mon-Fri)
    if (!workingDays.includes(dayOfWeek)) {
      return { success: true, slots: [] };
    }

    // Generate all slots for the day
    const [startHour, startMin] = workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = workingHoursEnd.split(':').map(Number);

    const dayStart = setMinutes(setHours(startOfDay(targetDate), startHour), startMin);
    const dayEnd = setMinutes(setHours(startOfDay(targetDate), endHour), endMin);

    const allSlots: Date[] = [];
    let cursor = dayStart;
    while (cursor < dayEnd) {
      allSlots.push(cursor);
      cursor = addMinutes(cursor, slotMinutes);
    }

    // Fetch existing scheduled jobs for this day
    const dayStartBound = startOfDay(targetDate);
    const dayEndBound = addDays(dayStartBound, 1);

    const existingJobs = await db
      .select({
        scheduledStart: jobs.scheduledStart,
        scheduledEnd: jobs.scheduledEnd,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.tenantId, tenantId),
          gte(jobs.scheduledStart, dayStartBound),
          lte(jobs.scheduledStart, dayEndBound),
          // Only block scheduled/in_progress jobs
          eq(jobs.status, 'scheduled'),
        )
      );

    // Filter out occupied slots
    const available = allSlots.filter((slot) => {
      const slotEnd = addMinutes(slot, slotMinutes);
      return !existingJobs.some((j) => {
        if (!j.scheduledStart) return false;
        const jobStart = new Date(j.scheduledStart);
        const jobEnd = j.scheduledEnd ? new Date(j.scheduledEnd) : addMinutes(jobStart, slotMinutes);
        // Overlap check
        return slot < jobEnd && slotEnd > jobStart;
      });
    });

    return { success: true, slots: available.map((s) => s.toISOString()) };
  } catch (error) {
    console.error('getAvailableSlots failed:', error);
    return { success: false, error: 'Failed to load slots' };
  }
}

export async function submitBooking(input: unknown) {
  try {
    const parsed = BookingSchema.parse(input);

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, parsed.tenantSlug))
      .limit(1);

    if (!tenant) return { success: false, error: 'Booking page not found' };

    const slotMinutes = tenant.settings.bookingSlotMinutes ?? 60;
    const scheduledStart = new Date(parsed.scheduledStart);
    const scheduledEnd = addMinutes(scheduledStart, slotMinutes);

    let customerId: string;
    let contractId: string | null = null;
    let serviceTitle = 'Service visit';

    if (parsed.contractId) {
      // Contract booking: match customer from contract
      const [contractRow] = await db
        .select({
          contract: serviceContracts,
          customer: customers,
        })
        .from(serviceContracts)
        .innerJoin(customers, eq(serviceContracts.customerId, customers.id))
        .where(
          and(
            eq(serviceContracts.id, parsed.contractId),
            eq(serviceContracts.tenantId, tenant.id),
          )
        )
        .limit(1);

      if (!contractRow) return { success: false, error: 'Contract not found' };

      customerId = contractRow.customer.id;
      contractId = parsed.contractId;
      serviceTitle = contractRow.contract.title;
    } else {
      // New customer booking: find or create customer
      const [existingCustomer] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenant.id),
            eq(customers.email, parsed.email),
          )
        )
        .limit(1);

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            tenantId: tenant.id,
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone ?? null,
            address: {
              line1: parsed.addressLine1,
              city: parsed.addressCity,
              postcode: parsed.addressPostcode,
              country: 'GB',
            },
          })
          .returning();
        customerId = newCustomer.id;
      }
    }

    const refNumber = await generateRefNumber('JOB');
    const [job] = await db
      .insert(jobs)
      .values({
        tenantId: tenant.id,
        refNumber,
        customerId,
        contractId,
        type: contractId ? 'contract_service' : 'one_off',
        status: 'scheduled',
        scheduledStart,
        scheduledEnd,
        siteAddress: {
          line1: parsed.addressLine1,
          city: parsed.addressCity,
          postcode: parsed.addressPostcode,
        },
        description: parsed.description ?? serviceTitle,
        fieldValues: {},
      })
      .returning();

    // Send confirmation email
    const fromAddress = buildFromAddress(tenant.branding.companyName);
    await sendEmail({
      to: parsed.email,
      from: fromAddress,
      replyTo: tenant.branding.companyEmail,
      subject: `Booking confirmed — ${format(scheduledStart, 'dd MMM yyyy')}`,
      react: createElement(BookingConfirmationEmail, {
        customerName: parsed.name,
        companyName: tenant.branding.companyName,
        serviceTitle,
        scheduledDate: format(scheduledStart, 'EEEE, dd MMMM yyyy'),
        scheduledTime: format(scheduledStart, 'HH:mm'),
        siteAddress: [parsed.addressLine1, parsed.addressCity, parsed.addressPostcode]
          .filter(Boolean)
          .join(', '),
        jobRefNumber: refNumber,
        replyEmail: tenant.branding.companyEmail,
        companyPhone: tenant.branding.companyPhone,
        primaryColor: tenant.branding.primaryColor,
      }),
    });

    // Trigger automation: booking confirmed
    await triggerBookingConfirmed({
      tenantId: tenant.id,
      jobId: job.id,
      contractId,
      customerId,
    });

    return { success: true, data: { jobId: job.id, refNumber } };
  } catch (error) {
    if (error instanceof Error && error.constructor.name === 'ZodError') {
      return { success: false, error: 'Invalid input' };
    }
    console.error('submitBooking failed:', error);
    return { success: false, error: 'Failed to submit booking. Please try again.' };
  }
}
