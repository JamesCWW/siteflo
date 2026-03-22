import { notFound } from 'next/navigation';
import { getQuoteByToken } from '@/actions/quotes';
import { formatPence } from '@/lib/utils/money';
import { format } from 'date-fns';
import { QuoteResponse } from './quote-response';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { QuoteStatus } from '@/actions/quotes';

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getQuoteByToken(token);

  if (!result.success || !result.data) notFound();

  const { quote, customer, tenant, lineItems } = result.data;
  const branding = tenant.branding;
  const primaryColor = branding.primaryColor || '#18181b';

  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();
  const status = isExpired && quote.status === 'sent' ? 'expired' : quote.status as QuoteStatus;
  const isOpenForResponse = status === 'sent' && !isExpired;

  const StatusBanner = () => {
    if (status === 'approved') {
      return (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Quote approved</p>
            {quote.respondedAt && (
              <p className="text-sm text-green-700">
                Approved on {format(new Date(quote.respondedAt), 'dd MMM yyyy')}
              </p>
            )}
          </div>
        </div>
      );
    }
    if (status === 'declined') {
      return (
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
          <XCircle className="h-5 w-5 text-zinc-500 shrink-0" />
          <p className="font-semibold text-zinc-700">Quote declined</p>
        </div>
      );
    }
    if (status === 'expired') {
      return (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Quote expired</p>
            <p className="text-sm text-amber-700">Please contact us for an updated quote.</p>
          </div>
        </div>
      );
    }
    if (status === 'sent') {
      return (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Clock className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">Awaiting your response</p>
            {quote.expiresAt && (
              <p className="text-sm text-blue-700">
                Valid until {format(new Date(quote.expiresAt), 'dd MMM yyyy')}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div style={{ backgroundColor: primaryColor }} className="px-4 py-5">
        <div className="max-w-2xl mx-auto">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.companyName} className="h-8 object-contain" />
          ) : (
            <span className="text-white font-bold text-lg">{branding.companyName}</span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Quote {quote.refNumber}</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Prepared for {customer.name}
          </p>
        </div>

        <StatusBanner />

        {/* Quote card */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
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
                <span>{formatPence(quote.subtotalPence)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">VAT</span>
                <span>{formatPence(quote.vatPence)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-zinc-200">
                <span>Total</span>
                <span style={{ color: primaryColor }}>{formatPence(quote.totalPence)}</span>
              </div>
            </div>
          </div>

          {/* Customer note */}
          {quote.customerNote && (
            <div className="px-6 pb-4">
              <p className="text-xs text-zinc-500 mb-1">Your note</p>
              <p className="text-sm text-zinc-700 bg-zinc-50 rounded p-3">{quote.customerNote}</p>
            </div>
          )}
        </div>

        {/* Response buttons */}
        {isOpenForResponse && <QuoteResponse token={token} />}

        {/* Contact */}
        <div className="text-center text-sm text-zinc-500">
          Questions? Contact {branding.companyName} at{' '}
          <a href={`mailto:${branding.companyEmail}`} className="underline hover:text-zinc-800">
            {branding.companyEmail}
          </a>
        </div>

        <div className="text-center text-xs text-zinc-400">Powered by Siteflo</div>
      </div>
    </div>
  );
}
