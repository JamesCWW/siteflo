'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createJob } from '@/actions/jobs';

const DURATION_PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hr', minutes: 120 },
  { label: '3 hr', minutes: 180 },
  { label: '4 hr', minutes: 240 },
];

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const schema = z.object({
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  description: z.string().optional(),
  internalNotes: z.string().optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().uuid().optional(),
  templateId: z.string().optional(),
});

type DurationMode = number | 'custom';

type FormData = z.infer<typeof schema>;

type Customer = { id: string; name: string };
type Template = { id: string; name: string };
type Technician = { id: string; fullName: string; role: string };

interface JobFormProps {
  // Contract-linked mode
  contractId?: string;
  contractTitle?: string;
  prefilledCustomerId?: string;
  prefilledCustomerName?: string;
  prefilledTemplateId?: string;
  prefilledTemplateName?: string;
  // Standalone mode
  customers?: Customer[];
  templates?: Template[];
  // Shared
  technicians: Technician[];
}

export function JobForm({
  contractId,
  contractTitle,
  prefilledCustomerId,
  prefilledCustomerName,
  prefilledTemplateId,
  prefilledTemplateName,
  customers = [],
  templates = [],
  technicians,
}: JobFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(prefilledCustomerId ?? '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(prefilledTemplateId ?? '');
  const [durationMode, setDurationMode] = useState<DurationMode>(60); // default 1 hr
  const [customHours, setCustomHours] = useState('1');
  const [customMinutes, setCustomMinutes] = useState('0');

  const isContractLinked = Boolean(contractId);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const scheduledStart = watch('scheduledStart');

  // Auto-compute scheduledEnd whenever start or duration changes
  useEffect(() => {
    if (!scheduledStart) return;
    const start = new Date(scheduledStart);
    if (isNaN(start.getTime())) return;

    const minutes =
      durationMode === 'custom'
        ? (parseInt(customHours, 10) || 0) * 60 + (parseInt(customMinutes, 10) || 0)
        : durationMode;

    if (minutes > 0) {
      const end = new Date(start.getTime() + minutes * 60 * 1000);
      setValue('scheduledEnd', formatDateTimeLocal(end));
    }
  }, [scheduledStart, durationMode, customHours, customMinutes, setValue]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    const customerId = isContractLinked ? prefilledCustomerId : selectedCustomerId;
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    const result = await createJob({
      customerId,
      contractId: contractId || undefined,
      templateId: (isContractLinked ? prefilledTemplateId : selectedTemplateId) || undefined,
      assignedToId: data.assignedToId || undefined,
      type: isContractLinked ? 'contract_service' : 'one_off',
      scheduledStart: data.scheduledStart || undefined,
      scheduledEnd: data.scheduledEnd || undefined,
      description: data.description || undefined,
      internalNotes: data.internalNotes || undefined,
    });

    if (result.success && result.data) {
      router.push(`/jobs/${result.data.id}`);
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
          <CardTitle className="text-base">
            {isContractLinked ? 'Schedule contract service' : 'New job'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer <span className="text-destructive">*</span></Label>
            {isContractLinked ? (
              <p className="text-sm font-medium h-12 flex items-center px-3 rounded-md border bg-muted/50">
                {prefilledCustomerName}
              </p>
            ) : (
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Contract link */}
          {isContractLinked && contractTitle && (
            <div className="space-y-2">
              <Label>Contract</Label>
              <p className="text-sm font-medium h-12 flex items-center px-3 rounded-md border bg-muted/50">
                {contractTitle}
              </p>
            </div>
          )}

          {/* Template */}
          {!isContractLinked && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Service template <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={selectedTemplateId || 'none'} onValueChange={(v) => setSelectedTemplateId(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isContractLinked && prefilledTemplateName && (
            <div className="space-y-2">
              <Label>Form template</Label>
              <p className="text-sm font-medium h-12 flex items-center px-3 rounded-md border bg-muted/50">
                {prefilledTemplateName}
              </p>
            </div>
          )}

          {/* Schedule */}
          <div className="space-y-2">
            <Label htmlFor="scheduledStart">
              Scheduled date / time <span className="text-destructive">*</span>
            </Label>
            <Input
              id="scheduledStart"
              type="datetime-local"
              className="h-12"
              {...register('scheduledStart')}
            />
            {errors.scheduledStart && (
              <p className="text-xs text-destructive">{errors.scheduledStart.message}</p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => setDurationMode(preset.minutes)}
                  className={`
                    px-4 h-10 rounded-full text-sm font-medium border transition-colors
                    ${durationMode === preset.minutes
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:border-primary/50'}
                  `}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDurationMode('custom')}
                className={`
                  px-4 h-10 rounded-full text-sm font-medium border transition-colors
                  ${durationMode === 'custom'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:border-primary/50'}
                `}
              >
                Custom
              </button>
            </div>
            {durationMode === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  min={0}
                  max={24}
                  className="h-10 w-20"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">hr</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  className="h-10 w-20"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            )}
          </div>

          {/* Hidden scheduledEnd — computed automatically */}
          <input type="hidden" {...register('scheduledEnd')} />

          {/* Assigned technician */}
          {technicians.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select onValueChange={(v) => setValue('assignedToId', v)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName} <span className="text-muted-foreground">({t.role})</span>
                    </SelectItem>
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
              placeholder="Any notes about this job..."
              {...register('description')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" className="h-12 px-8" disabled={isSubmitting}>
          {isSubmitting ? 'Scheduling...' : 'Schedule job'}
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
