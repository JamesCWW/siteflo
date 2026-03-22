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
import { createContract, updateContract } from '@/actions/contracts';
import { ChevronDown, ChevronUp, Info, Archive } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { formatPence } from '@/lib/utils/money';

const schema = z.object({
  title: z.string().min(1, 'Service type is required'),
  serviceIntervalMonths: z.number().int().min(1).max(120),
  billingIntervalMonths: z.number().int().min(1).max(120),
  invoiceTiming: z.enum(['upfront', 'after_each_visit', 'after_cycle_complete']),
  nextServiceDate: z.string().min(1, 'Next service date is required'),
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
  // Import / mid-cycle fields
  contractStartDate: z.string().optional(),
  lastServiceDate: z.string().optional(),
  servicesCompletedInCycle: z.number().int().min(0).optional(),
  totalServicesCompleted: z.number().int().min(0).optional(),
  billingCycleStart: z.string().optional(),
  cycleInvoiceStatus: z.enum(['not_invoiced', 'invoice_sent', 'invoice_paid']).optional(),
  cycleInvoicePaidDate: z.string().optional(),
  nextInvoiceDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Template = { id: string; name: string };

type ContractFormProps = {
  customerId: string;
  customerName: string;
  templates: Template[];
  mode?: 'create' | 'edit';
  contractId?: string;
  initialValues?: Partial<FormData>;
};

function intervalLabel(months: number): string {
  if (months === 1) return 'monthly';
  if (months === 3) return 'quarterly';
  if (months === 6) return 'every 6 months';
  if (months === 12) return 'annually';
  return `every ${months} month${months !== 1 ? 's' : ''}`;
}

function timingLabel(timing: string): string {
  if (timing === 'upfront') return 'invoiced upfront';
  if (timing === 'after_each_visit') return 'invoiced after each visit';
  return 'invoiced after all visits';
}

export function ContractForm({
  customerId,
  customerName,
  templates,
  mode = 'create',
  contractId,
  initialValues,
}: ContractFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const hasInitialInstallDetails = initialValues?.installationDetails
    && Object.values(initialValues.installationDetails).some(Boolean);
  const [showInstallDetails, setShowInstallDetails] = useState(hasInitialInstallDetails ?? false);

  const hasImportData = !!(
    initialValues?.contractStartDate ||
    initialValues?.lastServiceDate ||
    initialValues?.servicesCompletedInCycle ||
    initialValues?.totalServicesCompleted ||
    initialValues?.billingCycleStart ||
    initialValues?.cycleInvoiceStatus ||
    initialValues?.nextInvoiceDate
  );
  const [showImport, setShowImport] = useState(hasImportData);

  const defaultNextService = format(addMonths(new Date(), 12), 'yyyy-MM-dd');

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceIntervalMonths: 12,
      billingIntervalMonths: 12,
      invoiceTiming: 'upfront',
      nextServiceDate: defaultNextService,
      reminderLeadDays: 30,
      cycleInvoiceStatus: 'not_invoiced',
      ...initialValues,
    },
  });

  const serviceInterval = watch('serviceIntervalMonths');
  const billingInterval = watch('billingIntervalMonths');
  const invoiceTiming = watch('invoiceTiming');
  const standardPriceGbp = watch('standardPriceGbp');
  const cycleInvoiceStatus = watch('cycleInvoiceStatus');

  const splitBilling = billingInterval !== serviceInterval;
  const visitsPerCycle = splitBilling
    ? Math.max(1, Math.round(billingInterval / serviceInterval))
    : 1;

  const pricePence = standardPriceGbp ? Math.round(standardPriceGbp * 100) : null;
  const summaryParts: string[] = [];
  if (pricePence) summaryParts.push(`${formatPence(pricePence)} ${timingLabel(invoiceTiming)} ${intervalLabel(billingInterval)}`);
  if (splitBilling) {
    summaryParts.push(`${visitsPerCycle} service visit${visitsPerCycle !== 1 ? 's' : ''} per ${billingInterval === 12 ? 'year' : `${billingInterval} months`} (${intervalLabel(serviceInterval)})`);
  } else {
    summaryParts.push(`1 service visit ${intervalLabel(serviceInterval)}`);
  }
  const summary = summaryParts.join(' — ');

  const handleServiceIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const months = parseInt(e.target.value, 10);
    if (!isNaN(months) && months > 0) {
      setValue('nextServiceDate', format(addMonths(new Date(), months), 'yyyy-MM-dd'));
    }
  };

  // Auto-suggest nextServiceDate from lastServiceDate + serviceInterval
  const handleLastServiceDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && serviceInterval > 0) {
      setValue('nextServiceDate', format(addMonths(new Date(val), serviceInterval), 'yyyy-MM-dd'));
    }
  };

  // Auto-suggest nextInvoiceDate from billingCycleStart + billingInterval
  const handleBillingCycleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && billingInterval > 0) {
      setValue('nextInvoiceDate', format(addMonths(new Date(val), billingInterval), 'yyyy-MM-dd'));
    }
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    const payload = {
      ...data,
      invoiceTiming: data.billingIntervalMonths === data.serviceIntervalMonths
        ? 'upfront' as const
        : data.invoiceTiming,
      templateId: data.templateId || undefined,
    };

    if (mode === 'edit' && contractId) {
      const result = await updateContract(contractId, payload);
      if (result.success) {
        router.push(`/contracts/${contractId}`);
        router.refresh();
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    } else {
      const result = await createContract({ ...payload, customerId });
      if (result.success && result.data) {
        router.push(`/contracts/${result.data.id}`);
        router.refresh();
      } else {
        setError(result.error ?? 'Something went wrong');
      }
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
            <Label htmlFor="title">Service type <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              className="h-12"
              placeholder="e.g. Annual Gate Service, Boiler Service, Fire Alarm Inspection"
              list="service-type-suggestions"
              {...register('title')}
            />
            {templates.length > 0 && (
              <datalist id="service-type-suggestions">
                {templates.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            )}
            <p className="text-xs text-muted-foreground">
              The recurring service name — not a description of the installation. Use the Installation Details section below for specifics about what was installed.
            </p>
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceIntervalMonths">Service interval <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="serviceIntervalMonths"
                  type="number"
                  min={1}
                  max={120}
                  className="h-12 pr-16"
                  {...register('serviceIntervalMonths', { valueAsNumber: true })}
                  onChange={handleServiceIntervalChange}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">months</span>
              </div>
              <p className="text-xs text-muted-foreground">How often do you visit?</p>
              {errors.serviceIntervalMonths && <p className="text-xs text-destructive">{errors.serviceIntervalMonths.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingIntervalMonths">Billing interval <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <div className="relative">
                <Input
                  id="billingIntervalMonths"
                  type="number"
                  min={1}
                  max={120}
                  className="h-12 pr-16"
                  {...register('billingIntervalMonths', { valueAsNumber: true })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">months</span>
              </div>
              <p className="text-xs text-muted-foreground">How often do you invoice?</p>
              {errors.billingIntervalMonths && <p className="text-xs text-destructive">{errors.billingIntervalMonths.message}</p>}
            </div>
          </div>

          {splitBilling && (
            <div className="space-y-2 rounded-lg border border-dashed p-4">
              <Label className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                When should the invoice go out?
              </Label>
              <Select
                defaultValue={initialValues?.invoiceTiming ?? 'upfront'}
                onValueChange={(v) => setValue('invoiceTiming', v as FormData['invoiceTiming'])}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upfront">At the start of the billing period (upfront)</SelectItem>
                  <SelectItem value="after_each_visit">After each service visit</SelectItem>
                  <SelectItem value="after_cycle_complete">After all visits in the period are complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(pricePence || splitBilling) && (
            <div className="rounded-md bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
              {summary}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nextServiceDate">Next service date <span className="text-destructive">*</span></Label>
              <Input
                id="nextServiceDate"
                type="date"
                className="h-12"
                {...register('nextServiceDate')}
              />
              {errors.nextServiceDate && <p className="text-xs text-destructive">{errors.nextServiceDate.message}</p>}
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="templateId">Service template <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select
                  defaultValue={initialValues?.templateId || undefined}
                  onValueChange={(v) => setValue('templateId', v)}
                >
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
          </div>

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

      {/* Installation details */}
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

      {/* Import / mid-cycle section */}
      <div>
        <button
          type="button"
          onClick={() => setShowImport(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Archive className="h-4 w-4" />
          {showImport ? 'Hide' : 'Import existing contract'} (migrating from another system?)
        </button>

        {showImport && (
          <Card className="mt-3 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mid-cycle import</CardTitle>
              <p className="text-xs text-muted-foreground">
                Use this when the contract is already in progress — set the current state so scheduling and invoicing picks up correctly.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Contract history */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contract history</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contractStartDate">Contract start date</Label>
                    <Input id="contractStartDate" type="date" className="h-12" {...register('contractStartDate')} />
                    <p className="text-xs text-muted-foreground">When did this contract originally begin?</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastServiceDate">Last service date</Label>
                    <Input
                      id="lastServiceDate"
                      type="date"
                      className="h-12"
                      {...register('lastServiceDate')}
                      onChange={(e) => {
                        register('lastServiceDate').onChange(e);
                        handleLastServiceDateChange(e);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Auto-updates next service date</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servicesCompletedInCycle">Visits this billing cycle</Label>
                    <Input
                      id="servicesCompletedInCycle"
                      type="number"
                      min={0}
                      className="h-12"
                      placeholder="e.g. 1"
                      {...register('servicesCompletedInCycle', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Of {visitsPerCycle} total {visitsPerCycle === 1 ? 'visit' : 'visits'} this cycle
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalServicesCompleted">Total services (all time)</Label>
                    <Input
                      id="totalServicesCompleted"
                      type="number"
                      min={0}
                      className="h-12"
                      placeholder="e.g. 5"
                      {...register('totalServicesCompleted', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">Including all previous years</p>
                  </div>
                </div>
              </div>

              {/* Billing status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Current billing cycle</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingCycleStart">Cycle start date</Label>
                      <Input
                        id="billingCycleStart"
                        type="date"
                        className="h-12"
                        {...register('billingCycleStart')}
                        onChange={(e) => {
                          register('billingCycleStart').onChange(e);
                          handleBillingCycleStartChange(e);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Auto-updates next invoice date</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cycleInvoiceStatus">Invoice status this cycle</Label>
                      <Select
                        defaultValue={initialValues?.cycleInvoiceStatus ?? 'not_invoiced'}
                        onValueChange={(v) => setValue('cycleInvoiceStatus', v as FormData['cycleInvoiceStatus'])}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_invoiced">Not yet invoiced</SelectItem>
                          <SelectItem value="invoice_sent">Invoice sent</SelectItem>
                          <SelectItem value="invoice_paid">Invoice paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {cycleInvoiceStatus === 'invoice_paid' && (
                    <div className="space-y-2">
                      <Label htmlFor="cycleInvoicePaidDate">Payment date</Label>
                      <Input id="cycleInvoicePaidDate" type="date" className="h-12" {...register('cycleInvoicePaidDate')} />
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduling overrides */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Scheduling</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nextServiceDate-import">Next service date</Label>
                    <Input
                      id="nextServiceDate-import"
                      type="date"
                      className="h-12"
                      {...register('nextServiceDate')}
                    />
                    <p className="text-xs text-muted-foreground">Overrides auto-calculated date above</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextInvoiceDate">Next invoice date</Label>
                    <Input id="nextInvoiceDate" type="date" className="h-12" {...register('nextInvoiceDate')} />
                    <p className="text-xs text-muted-foreground">When to auto-draft the next invoice</p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="h-12 px-8" disabled={isSubmitting}>
          {isSubmitting
            ? (mode === 'edit' ? 'Saving...' : 'Creating...')
            : (mode === 'edit' ? 'Save changes' : 'Create contract')
          }
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
