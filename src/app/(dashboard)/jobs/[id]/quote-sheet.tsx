'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { createQuote, sendQuote } from '@/actions/quotes';
import { getParts } from '@/actions/parts';
import { formatPence } from '@/lib/utils/money';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Wrench, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type Part = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  unit: string;
  type: 'part' | 'labour';
};

type LineItem = {
  localId: string;
  description: string;
  quantity: number;
  unitPricePence: number;
  totalPence: number;
  partId?: string;
};

interface QuoteSheetProps {
  jobId: string;
  defaultVatRate: number;
  customerEmail: string | null;
}

function newItem(): LineItem {
  return { localId: crypto.randomUUID(), description: '', quantity: 1, unitPricePence: 0, totalPence: 0 };
}

export function QuoteSheet({ jobId, defaultVatRate, customerEmail }: QuoteSheetProps) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [search, setSearch] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([newItem()]);
  const [vatRate] = useState(defaultVatRate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && parts.length === 0) {
      getParts().then((r) => {
        if (r.success) {
          setParts(r.data.map((p) => ({ ...p, unit: p.unit ?? 'each' })));
        }
      });
    }
  }, [open, parts.length]);

  const filteredParts = parts.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function addFromPart(part: Part) {
    const item: LineItem = {
      localId: crypto.randomUUID(),
      description: part.name,
      quantity: 1,
      unitPricePence: part.unitPrice,
      totalPence: part.unitPrice,
      partId: part.id,
    };
    setLineItems((prev) => [...prev, item]);
  }

  function updateItem(localId: string, changes: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.localId !== localId) return item;
        const updated = { ...item, ...changes };
        updated.totalPence = updated.quantity * updated.unitPricePence;
        return updated;
      })
    );
  }

  function removeItem(localId: string) {
    setLineItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  const subtotal = lineItems.reduce((s, i) => s + i.totalPence, 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100));
  const total = subtotal + vatAmount;

  async function handleCreateAndSend() {
    const validItems = lineItems.filter((i) => i.description.trim() && i.totalPence > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one line item with a description and price');
      return;
    }
    if (!customerEmail) {
      toast.error('Customer has no email address — cannot send quote');
      return;
    }

    setSaving(true);
    const createResult = await createQuote({
      jobId,
      lineItems: validItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPricePence: i.unitPricePence,
        totalPence: i.totalPence,
        ...(i.partId ? { partId: i.partId } : {}),
      })),
      vatRatePercent: vatRate,
    });

    if (!createResult.success || !createResult.data) {
      setSaving(false);
      toast.error(createResult.error ?? 'Failed to create quote');
      return;
    }

    const sendResult = await sendQuote(createResult.data.id);
    setSaving(false);

    if (sendResult.success) {
      toast.success('Quote sent to customer');
      setOpen(false);
      setLineItems([newItem()]);
      setSearch('');
    } else {
      toast.error(sendResult.error ?? 'Quote created but failed to send');
    }
  }

  async function handleCreateDraft() {
    const validItems = lineItems.filter((i) => i.description.trim() && i.totalPence > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    const result = await createQuote({
      jobId,
      lineItems: validItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPricePence: i.unitPricePence,
        totalPence: i.totalPence,
        ...(i.partId ? { partId: i.partId } : {}),
      })),
      vatRatePercent: vatRate,
    });
    setSaving(false);

    if (result.success) {
      toast.success('Draft quote saved');
      setOpen(false);
      setLineItems([newItem()]);
    } else {
      toast.error(result.error ?? 'Failed to create quote');
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-12 gap-2">
          <Wrench className="h-4 w-4" />
          Additional work
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Additional work quote</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Parts search */}
          {parts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Add from parts library</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-12"
                />
              </div>
              {search && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {filteredParts.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">No parts found</p>
                  ) : (
                    filteredParts.slice(0, 8).map((part) => (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => { addFromPart(part); setSearch(''); }}
                        className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-muted/50 transition-colors min-h-[48px]"
                      >
                        <div>
                          <p className="text-sm font-medium">{part.name}</p>
                          {part.description && (
                            <p className="text-xs text-muted-foreground truncate">{part.description}</p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground ml-3 shrink-0">
                          {formatPence(part.unitPrice)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Line items */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Line items</p>
            {lineItems.map((item) => (
              <div key={item.localId} className="border rounded-lg p-3 space-y-2">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(item.localId, { description: e.target.value })}
                  className="h-12"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Qty</p>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.localId, { quantity: parseInt(e.target.value) || 1 })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Unit price (£)</p>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={(item.unitPricePence / 100).toFixed(2)}
                      onChange={(e) => updateItem(item.localId, { unitPricePence: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Total</p>
                    <div className="h-10 flex items-center text-sm font-medium">
                      {formatPence(item.totalPence)}
                    </div>
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLineItems((prev) => [...prev, newItem()])}
              className="gap-2 h-10 text-muted-foreground"
            >
              <PlusCircle className="h-4 w-4" />
              Add line
            </Button>
          </div>

          {/* Totals */}
          <div className="border rounded-lg p-4 space-y-1.5 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPence(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT ({vatRate}%)</span>
              <span>{formatPence(vatAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>Total</span>
              <span>{formatPence(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t pt-4 space-y-2">
          {!customerEmail && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Customer has no email address — save as draft only.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCreateDraft}
              disabled={saving}
              className="flex-1 h-12"
            >
              Save as draft
            </Button>
            <Button
              onClick={handleCreateAndSend}
              disabled={saving || !customerEmail}
              className={cn('flex-1 h-12', !customerEmail && 'opacity-50 cursor-not-allowed')}
            >
              {saving ? 'Sending…' : 'Create & send'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
