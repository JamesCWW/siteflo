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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createContract } from '@/actions/contracts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { addMonths, format } from 'date-fns';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  intervalMonths: z.number().int().min(1).max(120),
  nextDueDate: z.string().min(1, 'Next due date is required'),
  reminderLeadDays: z.number().int().min(1).max(365),
  templateId: z.string().optional(),
  standardPriceGbp: z.number().min(0).optional(),
  description: z.string().optional(),
  installationDate: z.string().optional(),
  installationDetails: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    location: z.string().optional(),
    warrantyExpiry: z.string().optional(),
  }).optional(),
});

type FormData = z.infer<typeof schema>;

type Template = { id: string; name: string };

type ContractFormProps = {
  customerId: string;
  customerName: string;
  templates: Template[];
};

export function ContractForm({ customerId, customerName, templates }: ContractFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showInstallDetails, setShowInstallDetails] = useState(false);

  const defaultNextDue = format(addMonths(new Date(), 12), 'yyyy-MM-dd');

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      intervalMonths: 12,
      nextDueDate: defaultNextDue,
      reminderLeadDays: 30,
    },
  });

  const intervalMonths = watch('intervalMonths');

  // Recalculate nextDueDate when interval changes
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const months = parseInt(e.target.value, 10);
    if (!isNaN(months) && months > 0) {
      setValue('nextDueDate', format(addMonths(new Date(), months), 'yyyy-MM-dd'));
    }
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    const result = await createContract({
      ...data,
      customerId,
      templateId: data.templateId || undefined,
    });

    if (result.success && result.data) {
      router.push(`/contracts/${result.data.id}`);
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <p className="text-sm font-medium h-12 flex items-center px-3 rounded-md border bg-muted/50">
              {customerName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">What needs servicing? <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              className="h-12"
              placeholder="e.g. Annual Boiler Service, Gate Maintenance"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intervalMonths">Service interval <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="intervalMonths"
                  type="number"
                  min={1}
                  max={120}
                  className="h-12 pr-16"
                  {...register('intervalMonths', { valueAsNumber: true })}
                  onChange={handleIntervalChange}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">months</span>
              </div>
              {errors.intervalMonths && <p className="text-xs text-destructive">{errors.intervalMonths.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Next due date <span className="text-destructive">*</span></Label>
              <Input
                id="nextDueDate"
                type="date"
                className="h-12"
                {...register('nextDueDate')}
              />
              {errors.nextDueDate && <p className="text-xs text-destructive">{errors.nextDueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="standardPriceGbp">Standard price <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <Input
                  id="standardPriceGbp"
                  type="number"
                  step="0.01"
                  min={0}
                  className="h-12 pl-7"
                  placeholder="0.00"
                  {...register('standardPriceGbp', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderLeadDays">Reminder lead time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <div className="relative">
                <Input
                  id="reminderLeadDays"
                  type="number"
                  min={1}
                  max={365}
                  className="h-12 pr-12"
                  {...register('reminderLeadDays', { valueAsNumber: true })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="templateId">Service template <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select onValueChange={(v) => setValue('templateId', v)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Any notes about this service contract..."
              {...register('description')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Installation details collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowInstallDetails(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showInstallDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showInstallDetails ? 'Hide' : 'Add'} installation details
        </button>

        {showInstallDetails && (
          <Card className="mt-3">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground font-normal">
                Optional — make, model, serial number, location, warranty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installationDetails.make">Make</Label>
                  <Input id="installationDetails.make" className="h-12" placeholder="e.g. Worcester Bosch" {...register('installationDetails.make')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installationDetails.model">Model</Label>
                  <Input id="installationDetails.model" className="h-12" placeholder="e.g. Greenstar 4000" {...register('installationDetails.model')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installationDetails.serialNumber">Serial number</Label>
                  <Input id="installationDetails.serialNumber" className="h-12" {...register('installationDetails.serialNumber')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installationDate">Installation date</Label>
                  <Input id="installationDate" type="date" className="h-12" {...register('installationDate')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installationDetails.location">Location in property</Label>
                <Input id="installationDetails.location" className="h-12" placeholder="e.g. Kitchen, ground floor" {...register('installationDetails.location')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="installationDetails.warrantyExpiry">Warranty expiry date</Label>
                <Input id="installationDetails.warrantyExpiry" type="date" className="h-12" {...register('installationDetails.warrantyExpiry')} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="h-12 px-8" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create contract'}
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
