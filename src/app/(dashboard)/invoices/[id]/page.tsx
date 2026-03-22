import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInvoice } from '@/actions/invoices';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { InvoiceActions } from '@/components/invoices/invoice-actions';
import { formatPence } from '@/lib/utils/money';
import { format } from 'date-fns';
import type { InvoiceStatus } from '@/actions/invoices';
import { ArrowLeft, Download, ExternalLink, Pencil } from 'lucide-react';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoice(id);

  if (!result.success || !result.data) notFound();

  const { invoice, customer, job, lineItems } = result.data;
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoice/${invoice.accessToken}`;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All invoices
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{invoice.refNumber}</h1>
            <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {invoice.status === 'draft' && (
            <Button asChild variant="outline" className="h-12">
              <Link href={`/invoices/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          {invoice.pdfUrl && (
            <Button asChild variant="outline" className="h-12">
              <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="h-12">
            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Portal link
            </a>
          </Button>
        </div>
      </div>

      {/* Actions */}
      <InvoiceActions
        invoiceId={invoice.id}
        status={invoice.status as InvoiceStatus}
        customerEmail={customer.email}
      />

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <Link href={`/customers/${customer.id}`} className="text-sm font-medium hover:underline">
              {customer.name}
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Job</p>
            <Link href={`/jobs/${job.id}`} className="text-sm font-medium hover:underline">
              {job.refNumber}
            </Link>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due date</p>
            <p className="text-sm font-medium">{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</p>
          </div>
          {invoice.sentAt && (
            <div>
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-sm font-medium">{format(new Date(invoice.sentAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
          )}
          {invoice.paidAt && (
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-sm font-medium text-green-600">
                {format(new Date(invoice.paidAt), 'dd MMM yyyy')}
                {invoice.paymentMethod && ` · ${invoice.paymentMethod.replace('_', ' ')}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_60px_100px_100px] gap-3 text-xs text-muted-foreground font-medium pb-2 border-b">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Total</span>
          </div>

          {lineItems.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_60px_100px_100px] gap-1 sm:gap-3 py-3 border-b last:border-b-0"
            >
              <span className="text-sm">{item.description}</span>
              <span className="text-sm text-right text-muted-foreground">×{item.quantity}</span>
              <span className="text-sm text-right text-muted-foreground">{formatPence(item.unitPricePence)}</span>
              <span className="text-sm text-right font-medium">{formatPence(item.totalPence)}</span>
            </div>
          ))}

          {/* Totals */}
          <div className="pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPence(invoice.subtotalPence)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT</span>
              <span>{formatPence(invoice.vatPence)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span>{formatPence(invoice.totalPence)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
