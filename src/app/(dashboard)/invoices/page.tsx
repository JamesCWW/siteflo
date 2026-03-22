import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getInvoices } from '@/actions/invoices';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { formatPence } from '@/lib/utils/money';
import { format } from 'date-fns';
import type { InvoiceStatus } from '@/actions/invoices';
import { FileText } from 'lucide-react';

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const result = await getInvoices(status ? { status } : undefined);
  const invoiceRows = result.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Invoices</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value ? `/invoices?status=${tab.value}` : '/invoices'}
          >
            <Button
              variant={status === tab.value || (!status && !tab.value) ? 'default' : 'outline'}
              size="sm"
              className="h-9"
            >
              {tab.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Invoice list */}
      {invoiceRows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">
            Create an invoice from a completed job.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoiceRows.map(({ invoice, customer, job }) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{invoice.refNumber}</span>
                        <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                      </div>
                      <p className="text-sm text-muted-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">Job {job.refNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg">{formatPence(invoice.totalPence)}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
                      </p>
                      {invoice.paidAt && (
                        <p className="text-xs text-green-600">
                          Paid {format(new Date(invoice.paidAt), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
