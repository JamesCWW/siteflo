import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getInvoice } from '@/actions/invoices';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { ArrowLeft } from 'lucide-react';
import { penceToPounds } from '@/lib/utils/money';

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoice(id);

  if (!result.success || !result.data) notFound();

  const { invoice, lineItems } = result.data;

  if (invoice.status !== 'draft') {
    redirect(`/invoices/${id}`);
  }

  // Derive VAT rate from stored values (rounded to nearest integer)
  const vatRate = invoice.subtotalPence > 0
    ? Math.round((invoice.vatPence / invoice.subtotalPence) * 100)
    : 20;

  const initialLineItems = lineItems.map(li => ({
    description: li.description,
    quantity: li.quantity,
    unitPricePence: li.unitPricePence,
    totalPence: li.totalPence,
  }));

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/invoices/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {invoice.refNumber}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Edit invoice</h1>
        <p className="text-muted-foreground text-sm mt-1">{invoice.refNumber}</p>
      </div>

      <InvoiceForm
        invoiceId={id}
        initialLineItems={initialLineItems}
        initialVatRate={vatRate}
        initialDueDate={invoice.dueDate.toISOString()}
      />
    </div>
  );
}
