'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createInvoice, updateInvoice } from '@/actions/invoices';
import { getParts } from '@/actions/parts';
import { formatPence, poundsToPence, penceToPounds } from '@/lib/utils/money';
import { Plus, Trash2, BookOpen, Search, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

type LineItem = {
  description: string;
  quantity: number;
  unitPricePence: number;
  totalPence: number;
};

type Part = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: 'part' | 'labour';
  unitPrice: number;
  unit: string | null;
};

interface InvoiceFormProps {
  // Create mode
  jobId?: string;
  suggestedLineItems?: LineItem[];
  defaultVatRate?: number;
  paymentTermsDays?: number;
  // Edit mode
  invoiceId?: string;
  initialLineItems?: LineItem[];
  initialVatRate?: number;
  initialDueDate?: string; // ISO date string
}

export function InvoiceForm({
  jobId,
  suggestedLineItems = [],
  defaultVatRate = 20,
  paymentTermsDays = 14,
  invoiceId,
  initialLineItems,
  initialVatRate,
  initialDueDate,
}: InvoiceFormProps) {
  const router = useRouter();
  const isEditing = !!invoiceId;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vatRate, setVatRate] = useState(
    initialVatRate ?? defaultVatRate
  );

  const defaultDueDate = initialDueDate
    ? initialDueDate.slice(0, 10)
    : format(addDays(new Date(), paymentTermsDays), 'yyyy-MM-dd');
  const [dueDate, setDueDate] = useState(defaultDueDate);

  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (initialLineItems && initialLineItems.length > 0) return initialLineItems;
    if (suggestedLineItems.length > 0) return suggestedLineItems;
    return [{ description: '', quantity: 1, unitPricePence: 0, totalPence: 0 }];
  });

  // Parts picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsSearch, setPartsSearch] = useState('');
  const partsLoaded = useRef(false);

  const openPartsPicker = async () => {
    setPickerOpen(true);
    if (!partsLoaded.current) {
      setPartsLoading(true);
      const result = await getParts();
      setParts((result.data ?? []) as Part[]);
      partsLoaded.current = true;
      setPartsLoading(false);
    }
  };

  const addPartAsLineItem = (part: Part) => {
    setLineItems(prev => [
      ...prev,
      {
        description: part.name,
        quantity: 1,
        unitPricePence: part.unitPrice,
        totalPence: part.unitPrice,
      },
    ]);
    setPickerOpen(false);
    setPartsSearch('');
  };

  const filteredParts = parts.filter(p =>
    partsSearch === '' ||
    p.name.toLowerCase().includes(partsSearch.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(partsSearch.toLowerCase())
  );

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'description') {
        item.description = value as string;
      } else if (field === 'quantity') {
        item.quantity = Math.max(1, Number(value) || 1);
        item.totalPence = item.quantity * item.unitPricePence;
      } else if (field === 'unitPricePence') {
        item.unitPricePence = poundsToPence(Number(value) || 0);
        item.totalPence = item.quantity * item.unitPricePence;
      }

      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setLineItems(prev => [
      ...prev,
      { description: '', quantity: 1, unitPricePence: 0, totalPence: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.totalPence, 0);
  const vatPence = Math.round(subtotal * (vatRate / 100));
  const total = subtotal + vatPence;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lineItems.some(li => !li.description.trim())) {
      setError('All line items must have a description');
      return;
    }

    setIsPending(true);

    if (isEditing) {
      const result = await updateInvoice(invoiceId, {
        lineItems,
        vatRatePercent: vatRate,
        dueDate,
      });
      setIsPending(false);
      if (result.success) {
        router.push(`/invoices/${invoiceId}`);
      } else {
        setError(result.error ?? 'Failed to update invoice');
      }
    } else {
      const result = await createInvoice({
        jobId: jobId!,
        lineItems,
        vatRatePercent: vatRate,
        paymentTermsDays,
      });
      setIsPending(false);
      if (result.success && result.data) {
        router.push(`/invoices/${result.data.id}`);
      } else {
        setError(result.error ?? 'Failed to create invoice');
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Line items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">Line items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={openPartsPicker}
              >
                <BookOpen className="h-4 w-4" />
                Add from parts library
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Column headers */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_80px_100px_80px_36px] gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_80px_36px] gap-2 items-start">
                <div>
                  <Label className="sr-only">Description</Label>
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="sr-only">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                    className="h-11 text-right"
                  />
                </div>
                <div>
                  <Label className="sr-only">Unit price (£)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={penceToPounds(item.unitPricePence) || ''}
                    onChange={e => updateItem(index, 'unitPricePence', e.target.value)}
                    className="h-11 text-right"
                  />
                </div>
                <div className="flex items-center justify-end h-11">
                  <span className="text-sm font-medium">{formatPence(item.totalPence)}</span>
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addItem} className="h-11 w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add line item
            </Button>
          </CardContent>
        </Card>

        {/* Totals + settings */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="vat-rate" className="shrink-0 w-20">VAT rate (%)</Label>
                <Input
                  id="vat-rate"
                  type="number"
                  min={0}
                  max={100}
                  value={vatRate}
                  onChange={e => setVatRate(Number(e.target.value) || 0)}
                  className="h-11 max-w-[100px]"
                />
              </div>
              <div className="flex items-center gap-4">
                <Label htmlFor="due-date" className="shrink-0 w-20">Due date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPence(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                <span>{formatPence(vatPence)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatPence(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending} className="h-12 flex-1">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? 'Saving…' : 'Creating…'}
              </>
            ) : isEditing ? 'Save changes' : 'Create invoice'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Parts picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add from parts library</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search parts…"
              value={partsSearch}
              onChange={e => setPartsSearch(e.target.value)}
              className="h-11 pl-9"
              autoFocus
            />
          </div>

          <div className="mt-1 max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
            {partsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredParts.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {partsSearch ? 'No parts match your search' : 'No parts in library'}
              </p>
            ) : (
              filteredParts.map(part => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => addPartAsLineItem(part)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{part.name}</p>
                    {part.category && (
                      <p className="text-xs text-muted-foreground">{part.category}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{formatPence(part.unitPrice)}</p>
                    <p className="text-xs text-muted-foreground">per {part.unit ?? 'each'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
