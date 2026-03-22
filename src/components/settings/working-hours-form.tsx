'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateWorkingHours } from '@/actions/settings';
import { toast } from 'sonner';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const SLOT_OPTIONS = [15, 30, 45, 60, 90, 120];

type Settings = {
  defaultCurrency: string;
  defaultVatRate: number;
  quoteExpiryDays: number;
  invoicePaymentTermsDays: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  bookingSlotMinutes: number;
};

interface WorkingHoursFormProps {
  settings: Settings;
}

export function WorkingHoursForm({ settings }: WorkingHoursFormProps) {
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day].sort((a, b) => a - b),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.workingDays.length === 0) {
      toast.error('Select at least one working day');
      return;
    }
    setSaving(true);
    const result = await updateWorkingHours(form);
    setSaving(false);
    if (result.success) {
      toast.success('Settings saved');
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Financials */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Financials</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={form.defaultCurrency}
              onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value.toUpperCase() }))}
              maxLength={5}
              placeholder="GBP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatRate">Default VAT rate (%)</Label>
            <Input
              id="vatRate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.defaultVatRate}
              onChange={(e) => setForm((f) => ({ ...f, defaultVatRate: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment terms (days)</Label>
            <Input
              id="paymentTerms"
              type="number"
              min={0}
              value={form.invoicePaymentTermsDays}
              onChange={(e) => setForm((f) => ({ ...f, invoicePaymentTermsDays: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quoteExpiry">Quote expiry (days)</Label>
            <Input
              id="quoteExpiry"
              type="number"
              min={1}
              value={form.quoteExpiryDays}
              onChange={(e) => setForm((f) => ({ ...f, quoteExpiryDays: parseInt(e.target.value) || 30 }))}
            />
          </div>
        </div>
      </fieldset>

      {/* Working hours */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Working hours</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hoursStart">Start time</Label>
            <Input
              id="hoursStart"
              type="time"
              value={form.workingHoursStart}
              onChange={(e) => setForm((f) => ({ ...f, workingHoursStart: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoursEnd">End time</Label>
            <Input
              id="hoursEnd"
              type="time"
              value={form.workingHoursEnd}
              onChange={(e) => setForm((f) => ({ ...f, workingHoursEnd: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Working days</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <Checkbox
                  checked={form.workingDays.includes(value)}
                  onCheckedChange={() => toggleDay(value)}
                />
                <span className="text-sm select-none">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Booking slot */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Booking portal</legend>
        <div className="space-y-2">
          <Label htmlFor="slotMinutes">Appointment slot duration</Label>
          <Select
            value={String(form.bookingSlotMinutes)}
            onValueChange={(v) => setForm((f) => ({ ...f, bookingSlotMinutes: parseInt(v) }))}
          >
            <SelectTrigger id="slotMinutes" className="w-40 h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_OPTIONS.map((mins) => (
                <SelectItem key={mins} value={String(mins)}>
                  {mins < 60 ? `${mins} min` : `${mins / 60} hr`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </fieldset>

      <Button type="submit" disabled={saving} className="h-12 w-full sm:w-auto">
        {saving ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
