'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPart, updatePart } from '@/actions/parts';
import { penceToPounds, poundsToPence } from '@/lib/utils/money';

type Part = {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type: 'part' | 'labour';
  unitPrice: number;
  unit?: string | null;
};

interface PartFormProps {
  part?: Part;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PartForm({ part, onSuccess, onCancel }: PartFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(part?.name ?? '');
  const [description, setDescription] = useState(part?.description ?? '');
  const [category, setCategory] = useState(part?.category ?? '');
  const [type, setType] = useState<'part' | 'labour'>(part?.type ?? 'part');
  const [unitPrice, setUnitPrice] = useState(part ? penceToPounds(part.unitPrice).toString() : '');
  const [unit, setUnit] = useState(part?.unit ?? 'each');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      type,
      unitPrice: poundsToPence(parseFloat(unitPrice) || 0),
      unit: unit.trim() || 'each',
    };

    const result = part?.id
      ? await updatePart(part.id, input)
      : await createPart(input);

    setIsPending(false);

    if (result.success) {
      router.refresh();
      onSuccess?.();
    } else {
      setError(result.error ?? 'Failed to save');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="part-name">Name *</Label>
        <Input
          id="part-name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Annual service labour"
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="part-type">Type *</Label>
          <Select value={type} onValueChange={(v: 'part' | 'labour') => setType(v)}>
            <SelectTrigger id="part-type" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="part">Part / material</SelectItem>
              <SelectItem value="labour">Labour</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="part-category">Category</Label>
          <Input
            id="part-category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. Fittings"
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="part-price">Unit price (£) *</Label>
          <Input
            id="part-price"
            required
            type="number"
            min={0}
            step={0.01}
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            placeholder="0.00"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="part-unit">Unit</Label>
          <Input
            id="part-unit"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="each"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="part-desc">Description</Label>
        <Input
          id="part-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional notes"
          className="h-11"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isPending} className="h-12 flex-1">
          {isPending ? 'Saving…' : part?.id ? 'Update' : 'Add to library'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" className="h-12" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
