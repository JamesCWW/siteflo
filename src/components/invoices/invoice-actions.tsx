'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { sendInvoice, markInvoicePaid, voidInvoice } from '@/actions/invoices';
import type { InvoiceStatus } from '@/actions/invoices';
import { Send, CheckCircle, XCircle } from 'lucide-react';

interface InvoiceActionsProps {
  invoiceId: string;
  status: InvoiceStatus;
  customerEmail?: string | null;
}

export function InvoiceActions({ invoiceId, status, customerEmail }: InvoiceActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');

  const doAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setIsPending(true);
    setError(null);
    const result = await action();
    setIsPending(false);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? 'Something went wrong');
    }
  };

  const handleMarkPaid = async () => {
    setShowPaidDialog(false);
    await doAction(() => markInvoicePaid(invoiceId, paymentMethod));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <Button
            className="h-12"
            onClick={() => doAction(() => sendInvoice(invoiceId))}
            disabled={isPending || !customerEmail}
            title={!customerEmail ? 'Customer has no email address' : undefined}
          >
            <Send className="h-4 w-4 mr-2" />
            Send invoice
          </Button>
        )}

        {(status === 'sent' || status === 'viewed' || status === 'overdue') && (
          <Button
            className="h-12 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowPaidDialog(true)}
            disabled={isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as paid
          </Button>
        )}

        {(status === 'draft' || status === 'sent') && (
          <Button
            variant="outline"
            className="h-12"
            onClick={() => doAction(() => voidInvoice(invoiceId))}
            disabled={isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Void
          </Button>
        )}
      </div>

      {!customerEmail && status === 'draft' && (
        <p className="text-xs text-muted-foreground">
          Add an email address to the customer before sending.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaidDialog(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700 text-white">
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
