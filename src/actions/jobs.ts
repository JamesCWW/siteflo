'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { jobs, jobPhotos, customers, serviceTemplates, users, tenants } from '@/db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { generateRefNumber } from '@/lib/utils/ref-numbers';
import { format, parseISO } from 'date-fns';
import { generateServiceReportPDF } from '@/lib/pdf/generate';
import { triggerServiceCompleted } from '@/lib/automation/engine';

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'paid' | 'cancelled';

const JobSchema = z.object({
  customerId: z.string().uuid('Invalid customer'),
  contractId: z.string().uuid().optional().or(z.literal('')),
  templateId: z.string().uuid().optional().or(z.literal('')),
  assignedToId: z.string().uuid().optional().or(z.literal('')),
  type: z.enum(['contract_service', 'one_off', 'callback', 'inspection']).default('one_off'),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  siteAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    postcode: z.string().min(1),
  }).optional(),
  description: z.string().optional(),
  internalNotes: z.string().optional(),
});

export async function getJobs(filter?: {
  status?: string;
  assignedToId?: string;
  from?: string;
  to?: string;
}) {
  try {
    const user = await getCurrentUser();

    const statusCond = filter?.status
      ? eq(jobs.status, filter.status as JobStatus)
      : undefined;
    const assigneeCond = filter?.assignedToId
      ? eq(jobs.assignedToId, filter.assignedToId)
      : undefined;
    const fromCond = filter?.from
      ? gte(jobs.scheduledStart, new Date(filter.from))
      : undefined;
    const toCond = filter?.to
      ? lte(jobs.scheduledStart, new Date(filter.to))
      : undefined;

    const data = await db
      .select({
        job: jobs,
        customer: {
          id: customers.id,
          name: customers.name,
          address: customers.address,
        },
      })
      .from(jobs)
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .where(and(eq(jobs.tenantId, user.tenantId), statusCond, assigneeCond, fromCond, toCond))
      .orderBy(desc(jobs.scheduledStart));

    return { success: true, data };
  } catch (error) {
    console.error('getJobs failed:', error);
    return { success: false, error: 'Failed to load jobs', data: [] };
  }
}

export async function getJob(id: string) {
  try {
    const user = await getCurrentUser();

    const [row] = await db
      .select({
        job: jobs,
        customer: customers,
        template: serviceTemplates,
      })
      .from(jobs)
      .innerJoin(customers, eq(jobs.customerId, customers.id))
      .leftJoin(serviceTemplates, eq(jobs.templateId, serviceTemplates.id))
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)))
      .limit(1);

    if (!row) return { success: false, error: 'Job not found', data: null };

    const photos = await db
      .select()
      .from(jobPhotos)
      .where(eq(jobPhotos.jobId, id))
      .orderBy(asc(jobPhotos.takenAt));

    return { success: true, data: { ...row, photos } };
  } catch (error) {
    console.error('getJob failed:', error);
    return { success: false, error: 'Failed to load job', data: null };
  }
}

export async function getJobsForContract(contractId: string) {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.tenantId, user.tenantId), eq(jobs.contractId, contractId)))
      .orderBy(desc(jobs.scheduledStart));
    return { success: true, data };
  } catch (error) {
    console.error('getJobsForContract failed:', error);
    return { success: false, error: 'Failed to load jobs', data: [] };
  }
}

export async function createJob(input: unknown) {
  try {
    const user = await getCurrentUser();
    const parsed = JobSchema.parse(input);

    const [customer] = await db
      .select({ id: customers.id, address: customers.address })
      .from(customers)
      .where(and(eq(customers.id, parsed.customerId), eq(customers.tenantId, user.tenantId)))
      .limit(1);

    if (!customer) return { success: false, error: 'Customer not found' };

    const refNumber = await generateRefNumber('JOB');

    const siteAddress = parsed.siteAddress ?? {
      line1: customer.address.line1,
      ...(customer.address.line2 ? { line2: customer.address.line2 } : {}),
      city: customer.address.city,
      postcode: customer.address.postcode,
    };

    const [job] = await db.insert(jobs).values({
      tenantId: user.tenantId,
      refNumber,
      customerId: parsed.customerId,
      contractId: parsed.contractId || null,
      templateId: parsed.templateId || null,
      assignedToId: parsed.assignedToId || null,
      type: parsed.type,
      status: 'scheduled',
      scheduledStart: parsed.scheduledStart ? new Date(parsed.scheduledStart) : null,
      scheduledEnd: parsed.scheduledEnd ? new Date(parsed.scheduledEnd) : null,
      siteAddress,
      description: parsed.description || null,
      internalNotes: parsed.internalNotes || null,
      fieldValues: {},
    }).returning();

    revalidatePath('/jobs');
    if (parsed.contractId) revalidatePath(`/contracts/${parsed.contractId}`);
    return { success: true, data: job };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input', details: error.flatten() };
    }
    console.error('createJob failed:', error);
    return { success: false, error: 'Failed to create job' };
  }
}

export async function saveJobFieldValues(id: string, fieldValues: Record<string, unknown>) {
  try {
    const user = await getCurrentUser();
    const [job] = await db
      .update(jobs)
      .set({ fieldValues, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)))
      .returning();
    if (!job) return { success: false, error: 'Job not found' };
    revalidatePath(`/jobs/${id}`);
    return { success: true, data: job };
  } catch (error) {
    console.error('saveJobFieldValues failed:', error);
    return { success: false, error: 'Failed to save form data' };
  }
}

export async function updateJobStatus(id: string, status: JobStatus) {
  try {
    const user = await getCurrentUser();
    const setValues: { status: JobStatus; updatedAt: Date; actualStart?: Date } = {
      status,
      updatedAt: new Date(),
    };
    if (status === 'in_progress') setValues.actualStart = new Date();

    const [job] = await db
      .update(jobs)
      .set(setValues)
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)))
      .returning();
    if (!job) return { success: false, error: 'Job not found' };

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${id}`);
    return { success: true, data: job };
  } catch (error) {
    console.error('updateJobStatus failed:', error);
    return { success: false, error: 'Failed to update job' };
  }
}

export async function completeJob(id: string) {
  try {
    const user = await getCurrentUser();

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)))
      .limit(1);
    if (!job) return { success: false, error: 'Job not found' };

    const completedAt = new Date();

    const [updatedJob] = await db
      .update(jobs)
      .set({ status: 'completed', actualEnd: completedAt, updatedAt: completedAt })
      .where(eq(jobs.id, id))
      .returning();

    // Auto-generate PDF
    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
    const [customerRow] = await db.select().from(customers).where(eq(customers.id, job.customerId)).limit(1);
    const templateRow = job.templateId
      ? (await db.select().from(serviceTemplates).where(eq(serviceTemplates.id, job.templateId)).limit(1))[0]
      : null;

    if (tenantRow && customerRow) {
      const addr = updatedJob.siteAddress ?? customerRow.address;
      const siteAddress = [addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean).join(', ');

      const fieldVals = (updatedJob.fieldValues as Record<string, unknown>) ?? {};
      const rawNextService = fieldVals['next_service_due'];
      let nextServiceDate: string | undefined;
      if (rawNextService && typeof rawNextService === 'string') {
        try { nextServiceDate = format(parseISO(rawNextService), 'dd MMM yyyy'); } catch { nextServiceDate = rawNextService; }
      }

      const pdfResult = await generateServiceReportPDF({
        tenantId: user.tenantId,
        jobId: id,
        branding: tenantRow.branding,
        reportTitle: templateRow?.pdfConfig?.title ?? 'Service Report',
        refNumber: updatedJob.refNumber,
        customerName: customerRow.name,
        siteAddress,
        nextServiceDate,
        completedDate: format(completedAt, 'dd MMM yyyy HH:mm'),
        fieldSchema: templateRow?.fieldSchema ?? [],
        fieldValues: fieldVals,
        footerText: templateRow?.pdfConfig?.footerText,
        showSignature: templateRow?.pdfConfig?.showSignature ?? true,
      });

      if (pdfResult.success) {
        await db.update(jobs).set({ pdfUrl: pdfResult.pdfUrl }).where(eq(jobs.id, id));
      }
    }

    if (job.contractId) {
      await triggerServiceCompleted({
        tenantId: user.tenantId,
        jobId: id,
        contractId: job.contractId,
        completedAt,
      });
      revalidatePath(`/contracts/${job.contractId}`);
    }

    revalidatePath('/jobs');
    revalidatePath(`/jobs/${id}`);
    return { success: true, data: updatedJob };
  } catch (error) {
    console.error('completeJob failed:', error);
    return { success: false, error: 'Failed to complete job' };
  }
}

export async function getTechnicians() {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(and(eq(users.tenantId, user.tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.fullName));
    return { success: true, data };
  } catch (error) {
    console.error('getTechnicians failed:', error);
    return { success: false, data: [] };
  }
}

export async function addJobPhoto(jobId: string, storageUrl: string, caption?: string) {
  try {
    const user = await getCurrentUser();

    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, user.tenantId)))
      .limit(1);
    if (!job) return { success: false, error: 'Job not found' };

    const [photo] = await db.insert(jobPhotos).values({
      jobId,
      tenantId: user.tenantId,
      storageUrl,
      caption: caption || null,
    }).returning();

    revalidatePath(`/jobs/${jobId}`);
    return { success: true, data: photo };
  } catch (error) {
    console.error('addJobPhoto failed:', error);
    return { success: false, error: 'Failed to add photo' };
  }
}

export async function deleteJobPhoto(photoId: string, jobId: string) {
  try {
    const user = await getCurrentUser();
    await db
      .delete(jobPhotos)
      .where(and(eq(jobPhotos.id, photoId), eq(jobPhotos.tenantId, user.tenantId)));
    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteJobPhoto failed:', error);
    return { success: false, error: 'Failed to delete photo' };
  }
}
