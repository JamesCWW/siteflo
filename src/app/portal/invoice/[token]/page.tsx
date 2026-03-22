import { notFound } from 'next/navigation';
import { getInvoiceByToken } from '@/actions/invoices';
import { formatPence } from '@/lib/utils/money';
import { format } from 'date-fns';
import { Download, CheckCircle, Clock } from 'lucide-react';

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvoiceByToken(token);

  if (!result.success || !result.data) notFound();

  const { invoice, customer, tenant, lineItems } = result.data;
  const branding = tenant.branding;
  const primaryColor = branding.primaryColor || '#18181b';

  const isPaid = invoice.status === 'paid';
  const hasBankDetails =
    branding.bankName || branding.bankAccountNumber || branding.bankSortCode;

  return (
    <div className="min-h-screen bg-zinc-50" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div
        style={{ backgroundColor: primaryColor }}
        className="px-4 py-5"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.companyName} className="h-8 object-contain" />
          ) : (
            <span className="text-white font-bold text-lg">{branding.companyName}</span>
          )}
          {invoice.pdfUrl && (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white text-sm opacity-90 hover:opacity-100 transition-opacity"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Status banner */}
        {isPaid ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Payment received</p>
              {invoice.paidAt && (
                <p className="text-sm text-green-700">
                  Paid on {format(new Date(invoice.paidAt), 'dd MMM yyyy')}
                  {invoice.paymentMethod && ` · ${invoice.paymentMethod.replace('_', ' ')}`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Payment due</p>
              <p className="text-sm text-amber-700">
                Due by {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* Invoice card */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          {/* Invoice header */}
          <div className="px-6 py-5 border-b border-zinc-100">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Invoice from</p>
                <p className="font-semibold text-lg">{branding.companyName}</p>
                <p className="text-sm text-zinc-500">{branding.companyAddress}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{invoice.refNumber}</p>
                <p className="font-bold text-2xl" style={{ color: primaryColor }}>
                  {formatPence(invoice.totalPence)}
                </p>
              </div>
            </div>
          </div>

          {/* Billed to + dates */}
          <div className="px-6 py-4 grid grid-cols-2 gap-4 bg-zinc-50 border-b border-zinc-100">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Billed to</p>
              <p className="font-medium text-sm">{customer.name}</p>
              {customer.address && (
                <p className="text-xs text-zinc-500">
                  {[customer.address.line1, customer.address.city, customer.address.postcode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Dates</p>
              <p className="text-xs text-zinc-600">
                Issued {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
              </p>
              <p className="text-xs text-zinc-600">
                Due {format(new Date(invoice.dueDate), 'dd MMM yyyy')}
              </p>
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-4">
            <div className="hidden sm:grid grid-cols-[1fr_50px_90px_90px] gap-3 text-xs text-zinc-400 font-medium pb-2 border-b border-zinc-100">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {lineItems.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_50px_90px_90px] gap-1 sm:gap-3 py-3"
                >
                  <span className="text-sm">{item.description}</span>
                  <span className="text-sm text-right text-zinc-400">×{item.quantity}</span>
                  <span className="text-sm text-right text-zinc-400">{formatPence(item.unitPricePence)}</span>
                  <span className="text-sm text-right font-medium">{formatPence(item.totalPence)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span>{formatPence(invoice.subtotalPence)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">VAT</span>
                <span>{formatPence(invoice.vatPence)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-zinc-200">
                <span>Total due</span>
                <span style={{ color: primaryColor }}>{formatPence(invoice.totalPence)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank details */}
        {hasBankDetails && !isPaid && (
          <div
            className="rounded-xl p-5 border"
            style={{ borderColor: primaryColor + '40', backgroundColor: primaryColor + '08' }}
          >
            <p className="font-semibold text-sm mb-3" style={{ color: primaryColor }}>
              How to pay
            </p>
            <p className="text-sm text-zinc-600 mb-3">
              Please make a bank transfer using the details below, quoting{' '}
              <strong>{invoice.refNumber}</strong> as your reference.
            </p>
            <div className="space-y-1.5">
              {branding.bankAccountName && (
                <div className="flex gap-3 text-sm">
                  <span className="text-zinc-500 w-32 shrink-0">Account name</span>
                  <span className="font-medium">{branding.bankAccountName}</span>
                </div>
              )}
              {branding.bankName && (
                <div className="flex gap-3 text-sm">
                  <span className="text-zinc-500 w-32 shrink-0">Bank</span>
                  <span className="font-medium">{branding.bankName}</span>
                </div>
              )}
              {branding.bankSortCode && (
                <div className="flex gap-3 text-sm">
                  <span className="text-zinc-500 w-32 shrink-0">Sort code</span>
                  <span className="font-medium">{branding.bankSortCode}</span>
                </div>
              )}
              {branding.bankAccountNumber && (
                <div className="flex gap-3 text-sm">
                  <span className="text-zinc-500 w-32 shrink-0">Account number</span>
                  <span className="font-medium">{branding.bankAccountNumber}</span>
                </div>
              )}
              <div className="flex gap-3 text-sm pt-1">
                <span className="text-zinc-500 w-32 shrink-0">Reference</span>
                <span className="font-bold">{invoice.refNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="text-center text-sm text-zinc-500">
          Questions? Contact {branding.companyName} at{' '}
          <a href={`mailto:${branding.companyEmail}`} className="underline hover:text-zinc-800">
            {branding.companyEmail}
          </a>
          {branding.companyPhone && (
            <>
              {' '}or{' '}
              <a href={`tel:${branding.companyPhone}`} className="underline hover:text-zinc-800">
                {branding.companyPhone}
              </a>
            </>
          )}
        </div>

        <div className="text-center text-xs text-zinc-400">
          Powered by Siteflo
        </div>
      </div>
    </div>
  );
}
