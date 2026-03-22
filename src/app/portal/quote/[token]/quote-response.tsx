'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { respondToQuote } from '@/actions/quotes';
import { CheckCircle, XCircle } from 'lucide-react';

interface QuoteResponseProps {
  token: string;
}

export function QuoteResponse({ token }: QuoteResponseProps) {
  const [pending, setPending] = useState<'approved' | 'declined' | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<'approved' | 'declined' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineNote, setShowDeclineNote] = useState(false);

  const handleApprove = async () => {
    setPending('approved');
    setError(null);
    const result = await respondToQuote(token, 'approved', note || undefined);
    setPending(null);
    if (result.success) {
      setDone('approved');
    } else {
      setError(result.error ?? 'Something went wrong');
    }
  };

  const handleDecline = async () => {
    setPending('declined');
    setError(null);
    const result = await respondToQuote(token, 'declined', note || undefined);
    setPending(null);
    if (result.success) {
      setDone('declined');
    } else {
      setError(result.error ?? 'Something went wrong');
    }
  };

  if (done === 'approved') {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-5">
        <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Quote approved</p>
          <p className="text-sm text-green-700 mt-0.5">
            We&apos;ve received your approval. We&apos;ll be in touch to confirm next steps.
          </p>
        </div>
      </div>
    );
  }

  if (done === 'declined') {
    return (
      <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-5">
        <XCircle className="h-5 w-5 text-zinc-500 shrink-0" />
        <div>
          <p className="font-semibold text-zinc-800">Quote declined</p>
          <p className="text-sm text-zinc-600 mt-0.5">
            Thank you for letting us know. If you have questions, please get in touch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
      <p className="font-semibold text-sm">Your response</p>

      {showDeclineNote ? (
        <div className="space-y-3">
          <label className="block text-sm text-zinc-600">
            Let us know why (optional):
          </label>
          <textarea
            className="w-full border border-zinc-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
            rows={3}
            placeholder="e.g. Price too high, will review later..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setShowDeclineNote(false)}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12"
              onClick={handleDecline}
              disabled={pending === 'declined'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {pending === 'declined' ? 'Submitting…' : 'Decline quote'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={!!pending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {pending === 'approved' ? 'Approving…' : 'Approve quote'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setShowDeclineNote(true)}
            disabled={!!pending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
