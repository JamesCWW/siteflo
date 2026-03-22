'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flame, DoorOpen, Zap, Wind, Wrench, CheckCircle2, ChevronRight, Loader2, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { seedTrade, saveBusinessDetails, createFirstCustomerAndContract, completeOnboarding } from '@/actions/onboarding';
import { createClient } from '@/lib/supabase/client';

type Trade = 'plumbing-gas' | 'gate-automation';

type TradeOption = {
  id: Trade | 'coming-soon';
  label: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
};

const TRADE_OPTIONS: TradeOption[] = [
  {
    id: 'plumbing-gas',
    label: 'Plumbing & Gas',
    description: 'Boiler services, CP12 gas safety records, tightness tests',
    icon: <Flame className="w-7 h-7" />,
    active: true,
  },
  {
    id: 'gate-automation',
    label: 'Gate & Door Automation',
    description: 'Force tests, PPM records, commissioning, safety notices',
    icon: <DoorOpen className="w-7 h-7" />,
    active: true,
  },
  {
    id: 'coming-soon',
    label: 'Electrical',
    description: 'EICR, EIC, Minor Works, PAT testing',
    icon: <Zap className="w-7 h-7" />,
    active: false,
  },
  {
    id: 'coming-soon',
    label: 'HVAC',
    description: 'F-Gas records, commissioning sheets, service reports',
    icon: <Wind className="w-7 h-7" />,
    active: false,
  },
  {
    id: 'coming-soon',
    label: 'General Maintenance',
    description: 'Generic service reports, inspection checklists',
    icon: <Wrench className="w-7 h-7" />,
    active: false,
  },
];

const businessSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const customerSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerAddress: z.string().min(5, 'Please enter a full address'),
  customerPhone: z.string().optional(),
  installationDescription: z.string().optional(),
  nextServiceDate: z.string().min(1, 'Please select a date'),
});

type BusinessForm = z.infer<typeof businessSchema>;
type CustomerForm = z.infer<typeof customerSchema>;

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            i + 1 === current ? 'w-8 bg-primary' : i + 1 < current ? 'w-2 bg-primary/60' : 'w-2 bg-muted'
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingWizard({
  companyName,
  tenantId,
  templates,
}: {
  companyName: string;
  tenantId: string;
  templates: { id: string; name: string }[];
}) {
  const [step, setStep] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: { companyName },
  });

  const customerForm = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  async function handleTradeSelect(trade: Trade) {
    setSelectedTrade(trade);
    setSeeding(true);
    const result = await seedTrade(trade);
    setSeeding(false);
    if (result.success) {
      setStep(2);
    }
  }

  async function handleBusinessSubmit(data: BusinessForm) {
    let logoUrl: string | undefined;

    if (logoFile) {
      setLogoUploading(true);
      try {
        const supabase = createClient();
        const ext = logoFile.name.split('.').pop();
        const path = `${tenantId}/logo-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('logos').upload(path, logoFile, { upsert: true });
        if (!error) {
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
          logoUrl = urlData.publicUrl;
        }
      } finally {
        setLogoUploading(false);
      }
    }

    const result = await saveBusinessDetails({ ...data, logoUrl });
    if (result.success) {
      setStep(3);
    }
  }

  async function handleCustomerSubmit(data: CustomerForm) {
    const result = await createFirstCustomerAndContract(data);
    if (result.success) {
      setCompleting(true);
      await completeOnboarding();
    }
  }

  async function handleSkip() {
    setCompleting(true);
    await completeOnboarding();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-4 flex items-center justify-between">
        <div className="text-lg font-semibold">Siteflo Contracts</div>
        <StepIndicator current={step} total={3} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Step 1: Trade Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">What&apos;s your trade?</h1>
                <p className="text-muted-foreground">We&apos;ll set up your service templates and parts library to match.</p>
              </div>

              <div className="space-y-3">
                {TRADE_OPTIONS.map((option, i) => (
                  <button
                    key={i}
                    disabled={!option.active || seeding}
                    onClick={() => option.active && option.id !== 'coming-soon' && handleTradeSelect(option.id as Trade)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                      option.active
                        ? 'hover:border-primary hover:bg-primary/5 cursor-pointer active:scale-[0.99]'
                        : 'opacity-50 cursor-not-allowed bg-muted/30',
                      selectedTrade === option.id && seeding && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className={cn(
                      'shrink-0 p-2.5 rounded-lg',
                      option.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {selectedTrade === option.id && seeding
                        ? <Loader2 className="w-7 h-7 animate-spin" />
                        : option.icon
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {option.label}
                        {!option.active && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-normal text-muted-foreground">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{option.description}</p>
                    </div>
                    {option.active && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                You can add more templates later from the Templates section.
              </p>
            </div>
          )}

          {/* Step 2: Business Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">Your business details</h1>
                <p className="text-muted-foreground">These appear on your certificates and invoices.</p>
              </div>

              <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input
                    id="companyName"
                    className="h-12"
                    {...businessForm.register('companyName')}
                  />
                  {businessForm.formState.errors.companyName && (
                    <p className="text-xs text-destructive">{businessForm.formState.errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 01234 567890"
                    className="h-12"
                    {...businessForm.register('phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Company address <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    id="address"
                    placeholder="e.g. 12 High Street, Birmingham, B1 1AA"
                    rows={3}
                    {...businessForm.register('address')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Company logo <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="h-12 cursor-pointer"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Appears on your PDFs.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setStep(3)}
                  >
                    Skip
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12"
                    disabled={businessForm.formState.isSubmitting || logoUploading}
                  >
                    {businessForm.formState.isSubmitting || logoUploading
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : null
                    }
                    Continue
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: First Customer */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">Add your first customer</h1>
                <p className="text-muted-foreground">
                  Set up a customer and service contract to see how Siteflo works — or skip and explore on your own.
                </p>
              </div>

              <form onSubmit={customerForm.handleSubmit(handleCustomerSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer name</Label>
                  <Input
                    id="customerName"
                    placeholder="e.g. John Smith"
                    className="h-12"
                    {...customerForm.register('customerName')}
                  />
                  {customerForm.formState.errors.customerName && (
                    <p className="text-xs text-destructive">{customerForm.formState.errors.customerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Property address</Label>
                  <Textarea
                    id="customerAddress"
                    placeholder="e.g. 15 Oak Avenue, Manchester, M1 2BC"
                    rows={2}
                    {...customerForm.register('customerAddress')}
                  />
                  {customerForm.formState.errors.customerAddress && (
                    <p className="text-xs text-destructive">{customerForm.formState.errors.customerAddress.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="e.g. 07700 900123"
                    className="h-12"
                    {...customerForm.register('customerPhone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installationDescription">Service type <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="installationDescription"
                    placeholder="e.g. Annual Gate Service, Boiler Service, Fire Alarm Inspection"
                    className="h-12"
                    list="wizard-service-type-suggestions"
                    {...customerForm.register('installationDescription')}
                  />
                  {templates.length > 0 && (
                    <datalist id="wizard-service-type-suggestions">
                      {templates.map((t) => (
                        <option key={t.id} value={t.name} />
                      ))}
                    </datalist>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The recurring service name — not a description of the installation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextServiceDate">Next service due</Label>
                  <Input
                    id="nextServiceDate"
                    type="date"
                    className="h-12"
                    {...customerForm.register('nextServiceDate')}
                  />
                  {customerForm.formState.errors.nextServiceDate && (
                    <p className="text-xs text-destructive">{customerForm.formState.errors.nextServiceDate.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    disabled={completing}
                    onClick={handleSkip}
                  >
                    {completing
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><SkipForward className="w-4 h-4 mr-2" />Skip</>
                    }
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12"
                    disabled={customerForm.formState.isSubmitting || completing}
                  >
                    {customerForm.formState.isSubmitting
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <CheckCircle2 className="w-4 h-4 mr-2" />
                    }
                    Finish setup
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Step {step} of 3 — You can update everything later in Settings
        </p>
      </div>
    </div>
  );
}
