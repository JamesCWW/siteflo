'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createCustomer, updateCustomer } from '@/actions/customers';
import { ChevronDown, ChevronUp } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    postcode: z.string().min(1, 'Postcode is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(), // comma-separated, parsed on submit
});

type FormData = z.infer<typeof schema>;

type CustomerFormProps = {
  customerId?: string;
  defaultValues?: Partial<Omit<FormData, 'tags'> & { tags?: string[] }>;
};

export function CustomerForm({ customerId, defaultValues }: CustomerFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      tags: Array.isArray(defaultValues?.tags)
        ? defaultValues.tags.join(', ')
        : (defaultValues?.tags ?? ''),
    },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const tags = data.tags
      ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const payload = { ...data, tags };
    const result = customerId
      ? await updateCustomer(customerId, payload)
      : await createCustomer(payload);

    if (result.success && result.data) {
      router.push(`/customers/${result.data.id}`);
      router.refresh();
    } else {
      setError(result.error ?? 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Required fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name / Company name <span className="text-destructive">*</span></Label>
            <Input id="name" className="h-12" placeholder="e.g. John Smith" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.line1">Address line 1 <span className="text-destructive">*</span></Label>
            <Input id="address.line1" className="h-12" placeholder="e.g. 12 High Street" {...register('address.line1')} />
            {errors.address?.line1 && <p className="text-xs text-destructive">{errors.address.line1.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.line2">Address line 2</Label>
            <Input id="address.line2" className="h-12" placeholder="e.g. Flat 2" {...register('address.line2')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address.city">City <span className="text-destructive">*</span></Label>
              <Input id="address.city" className="h-12" placeholder="e.g. Manchester" {...register('address.city')} />
              {errors.address?.city && <p className="text-xs text-destructive">{errors.address.city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.postcode">Postcode <span className="text-destructive">*</span></Label>
              <Input id="address.postcode" className="h-12" placeholder="e.g. M1 1AB" {...register('address.postcode')} />
              {errors.address?.postcode && <p className="text-xs text-destructive">{errors.address.postcode.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.country">Country <span className="text-destructive">*</span></Label>
            <Input id="address.country" className="h-12" placeholder="e.g. United Kingdom" defaultValue={defaultValues?.address?.country ?? 'United Kingdom'} {...register('address.country')} />
            {errors.address?.country && <p className="text-xs text-destructive">{errors.address.country.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-muted-foreground text-xs">(recommended)</span></Label>
            <Input id="email" type="email" className="h-12" placeholder="e.g. john@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone <span className="text-muted-foreground text-xs">(recommended)</span></Label>
            <Input id="phone" type="tel" className="h-12" placeholder="e.g. 07700 900123" {...register('phone')} />
          </div>
        </CardContent>
      </Card>

      {/* Optional fields */}
      <div>
        <button
          type="button"
          onClick={() => setShowOptional(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showOptional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showOptional ? 'Hide' : 'Show'} additional details
        </button>

        {showOptional && (
          <Card className="mt-3">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={3} placeholder="Any notes about this customer..." {...register('notes')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                <Input id="tags" className="h-12" placeholder="e.g. residential, priority, gas-safe" {...register('tags')} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="h-12 px-8" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : customerId ? 'Save changes' : 'Add customer'}
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
