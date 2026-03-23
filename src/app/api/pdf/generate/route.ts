import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { jobs, customers, serviceTemplates, tenants, invoices, invoiceLineItems, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { generateServiceReportPDF, generateInvoicePDF } from '@/lib/pdf/generate';
import { format, parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.authId, authUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const body = await request.json() as { type: string; id: string };
    const { type, id } = body;

    if (type === 'service-report') {
      const [row] = await db
        .select({ job: jobs, customer: customers, template: serviceTemplates, tenant: tenants })
        .from(jobs)
        .innerJoin(customers, eq(jobs.customerId, customers.id))
        .leftJoin(serviceTemplates, eq(jobs.templateId, serviceTemplates.id))
        .innerJoin(tenants, eq(jobs.tenantId, tenants.id))
        .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)))
        .limit(1);

      if (!row) return Response.json({ error: 'Job not found' }, { status: 404 });

      const { job, customer, template, tenant } = row;

      const addr = job.siteAddress ?? customer.address;
      const siteAddress = [addr.line1, addr.line2, addr.city, addr.postcode]
        .filter(Boolean)
        .join(', ');

      const fieldVals = (job.fieldValues as Record<string, unknown>) ?? {};
      const rawNextService = fieldVals['next_service_due'];
      let nextServiceDate: string | undefined;
      if (rawNextService && typeof rawNextService === 'string') {
        try { nextServiceDate = format(parseISO(rawNextService), 'dd MMM yyyy'); } catch { nextServiceDate = rawNextService; }
      }

      const result = await generateServiceReportPDF({
        tenantId: user.tenantId,
        jobId: id,
        branding: tenant.branding,
        reportTitle: template?.pdfConfig?.title ?? 'Service Report',
        refNumber: job.refNumber,
        customerName: customer.name,
        siteAddress,
        nextServiceDate,
        completedDate: job.actualEnd
          ? format(new Date(job.actualEnd), 'dd MMM yyyy HH:mm')
          : undefined,
        fieldSchema: template?.fieldSchema ?? [],
        fieldValues: fieldVals,
        footerText: template?.pdfConfig?.footerText,
        showSignature: template?.pdfConfig?.showSignature ?? true,
      });

      if (!result.success) {
        return Response.json({ error: result.error }, { status: 500 });
      }

      // Update job.pdfUrl
      await db.update(jobs).set({ pdfUrl: result.pdfUrl }).where(eq(jobs.id, id));

      return Response.json({ pdfUrl: result.pdfUrl });
    }

    if (type === 'invoice') {
      const [inv] = await db
        .select({ invoice: invoices, customer: customers, tenant: tenants })
        .from(invoices)
        .innerJoin(customers, eq(invoices.customerId, customers.id))
        .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, user.tenantId)))
        .limit(1);

      if (!inv) return Response.json({ error: 'Invoice not found' }, { status: 404 });

      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, id));

      const { invoice, customer, tenant } = inv;
      const addr = customer.address;
      const customerAddress = [addr.line1, addr.line2, addr.city, addr.postcode]
        .filter(Boolean)
        .join(', ');

      const result = await generateInvoicePDF({
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

      if (!result.success) {
        return Response.json({ error: result.error }, { status: 500 });
      }

      await db.update(invoices).set({ pdfUrl: result.pdfUrl }).where(eq(invoices.id, id));

      return Response.json({ pdfUrl: result.pdfUrl });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('PDF generate route error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
