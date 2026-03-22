'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateBusinessInfo } from '@/actions/settings';
import { toast } from 'sonner';

type Branding = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  vatNumber?: string;
};

interface BusinessInfoFormProps {
  branding: Branding;
}

export function BusinessInfoForm({ branding }: BusinessInfoFormProps) {
  const [form, setForm] = useState({
    companyName: branding.companyName,
    companyAddress: branding.companyAddress,
    companyPhone: branding.companyPhone,
    companyEmail: branding.companyEmail,
    vatNumber: branding.vatNumber ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateBusinessInfo(form);
    setSaving(false);
    if (result.success) {
      toast.success('Business info saved');
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          value={form.companyName}
          onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyAddress">Address</Label>
        <Textarea
          id="companyAddress"
          value={form.companyAddress}
          onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))}
          rows={3}
          placeholder="123 Main Street&#10;London&#10;SW1A 1AA"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyPhone">Phone</Label>
          <Input
            id="companyPhone"
            type="tel"
            value={form.companyPhone}
            onChange={(e) => setForm((f) => ({ ...f, companyPhone: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyEmail">Email</Label>
          <Input
            id="companyEmail"
            type="email"
            value={form.companyEmail}
            onChange={(e) => setForm((f) => ({ ...f, companyEmail: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vatNumber">VAT number <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Input
          id="vatNumber"
          value={form.vatNumber}
          onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))}
          placeholder="GB 123 4567 89"
        />
      </div>

      <Button type="submit" disabled={saving} className="h-12 w-full sm:w-auto">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
