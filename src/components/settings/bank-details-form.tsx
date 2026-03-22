'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBankDetails } from '@/actions/settings';
import { toast } from 'sonner';

type Branding = {
  bankName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
};

interface BankDetailsFormProps {
  branding: Branding;
}

export function BankDetailsForm({ branding }: BankDetailsFormProps) {
  const [form, setForm] = useState({
    bankName: branding.bankName ?? '',
    bankSortCode: branding.bankSortCode ?? '',
    bankAccountNumber: branding.bankAccountNumber ?? '',
    bankAccountName: branding.bankAccountName ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateBankDetails(form);
    setSaving(false);
    if (result.success) {
      toast.success('Bank details saved');
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Bank details are shown on invoices and payment reminder emails.
      </p>

      <div className="space-y-2">
        <Label htmlFor="bankAccountName">Account name</Label>
        <Input
          id="bankAccountName"
          value={form.bankAccountName}
          onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
          placeholder="Dave's Plumbing Ltd"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankName">Bank name</Label>
        <Input
          id="bankName"
          value={form.bankName}
          onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          placeholder="Barclays"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bankSortCode">Sort code</Label>
          <Input
            id="bankSortCode"
            value={form.bankSortCode}
            onChange={(e) => setForm((f) => ({ ...f, bankSortCode: e.target.value }))}
            placeholder="12-34-56"
            maxLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccountNumber">Account number</Label>
          <Input
            id="bankAccountNumber"
            value={form.bankAccountNumber}
            onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))}
            placeholder="12345678"
            maxLength={10}
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="h-12 w-full sm:w-auto">
        {saving ? 'Saving…' : 'Save bank details'}
      </Button>
    </form>
  );
}
