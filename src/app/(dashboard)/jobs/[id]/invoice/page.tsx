import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getJob } from '@/actions/jobs';
import { getInvoicePreFill } from '@/actions/invoices';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { ArrowLeft } from 'lucide-react';

export default async function CreateInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [jobResult, preFillResult] = await Promise.all([
    getJob(id),
    getInvoicePreFill(id),
  ]);

  if (!jobResult.success || !jobResult.data) notFound();

  const { job } = jobResult.data;
  const preFill = preFillResult.data;

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/jobs/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {job.refNumber}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Create invoice</h1>
        <p className="text-muted-foreground text-sm mt-1">for job {job.refNumber}</p>
      </div>

      <InvoiceForm
        jobId={id}
        suggestedLineItems={preFill?.suggestedLineItems}
        defaultVatRate={preFill?.defaultVatRate}
        paymentTermsDays={preFill?.paymentTermsDays}
      />
    </div>
  );
}
