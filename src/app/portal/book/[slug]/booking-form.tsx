'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getAvailableSlots, submitBooking } from '@/actions/booking';
import {
  format,
  parseISO,
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressCity: z.string().min(1, 'City is required'),
  addressPostcode: z.string().min(1, 'Postcode is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface BookingFormProps {
  tenantSlug: string;
  tenantId: string;
  contractId?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  prefillAddressLine1?: string;
  prefillAddressCity?: string;
  prefillAddressPostcode?: string;
  serviceTitle?: string;
  workingDays: number[];
  workingHoursStart: string;
  workingHoursEnd: string;
  bookingSlotMinutes: number;
  primaryColor?: string;
}

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ step, primaryColor }: { step: 1 | 2 | 3; primaryColor: string }) {
  const steps = [
    { n: 1, label: 'Date' },
    { n: 2, label: 'Time' },
    { n: 3, label: 'Details' },
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                s.n < step
                  ? 'text-white'
                  : s.n === step
                  ? 'text-white ring-4 ring-opacity-20'
                  : 'bg-gray-100 text-gray-400'
              )}
              style={
                s.n <= step
                  ? { backgroundColor: primaryColor, boxShadow: s.n === step ? `0 0 0 4px ${primaryColor}30` : undefined }
                  : undefined
              }
            >
              {s.n < step ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s.n
              )}
            </div>
            <span
              className={cn(
                'text-xs mt-1 font-medium',
                s.n === step ? 'text-gray-900' : s.n < step ? 'text-gray-500' : 'text-gray-400'
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn('h-px w-16 sm:w-24 mx-3 mb-5 transition-colors', s.n < step ? 'bg-gray-400' : 'bg-gray-200')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Mini calendar ──────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDate,
  onSelect,
  workingDays,
  primaryColor,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  workingDays: number[];
  primaryColor: string;
}) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(() => {
    // Start at next working day's month
    let d = addDays(today, 1);
    while (!workingDays.includes(d.getDay())) d = addDays(d, 1);
    return startOfMonth(d);
  });

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
    day = addDays(day, 7);
  }

  function isSelectable(d: Date) {
    return workingDays.includes(d.getDay()) && !isBefore(d, addDays(today, 1));
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          disabled={isBefore(addMonths(viewMonth, -1), startOfMonth(today))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-gray-400 py-1 uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((d) => {
              const selectable = isSelectable(d);
              const inMonth = isSameMonth(d, viewMonth);
              const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
              const isTodayDate = isToday(d);

              return (
                <div key={d.toISOString()} className="flex items-center justify-center py-0.5">
                  <button
                    disabled={!selectable}
                    onClick={() => selectable && onSelect(d)}
                    className={cn(
                      'w-9 h-9 rounded-full text-sm font-normal transition-all leading-none',
                      !inMonth && 'opacity-30',
                      !selectable && 'cursor-not-allowed text-gray-300',
                      selectable && !isSelected && 'hover:bg-gray-100 text-gray-700',
                      isTodayDate && !isSelected && 'font-semibold ring-1 ring-current',
                      isSelected && 'text-white font-semibold shadow-md'
                    )}
                    style={isSelected ? { backgroundColor: primaryColor } : undefined}
                  >
                    {format(d, 'd')}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function BookingForm({
  tenantSlug,
  tenantId,
  contractId,
  prefillName,
  prefillEmail,
  prefillPhone,
  prefillAddressLine1,
  prefillAddressCity,
  prefillAddressPostcode,
  serviceTitle,
  workingDays,
  workingHoursStart,
  workingHoursEnd,
  bookingSlotMinutes,
  primaryColor = '#2563eb',
}: BookingFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState('');
  const [serverError, setServerError] = useState('');
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: prefillName ?? '',
      email: prefillEmail ?? '',
      phone: prefillPhone ?? '',
      addressLine1: prefillAddressLine1 ?? '',
      addressCity: prefillAddressCity ?? '',
      addressPostcode: prefillAddressPostcode ?? '',
      description: '',
    },
  });

  async function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setLoadingSlots(true);
    const result = await getAvailableSlots(tenantId, format(date, 'yyyy-MM-dd'));
    setSlots(result.slots ?? []);
    setLoadingSlots(false);
    setStep(2);
  }

  function handleSlotSelect(slot: string) {
    setSelectedSlot(slot);
    setStep(3);
  }

  function handleSubmit(values: FormValues) {
    if (!selectedSlot) { setServerError('Please select a time slot'); return; }
    setServerError('');
    startTransition(async () => {
      const result = await submitBooking({
        tenantSlug,
        contractId,
        name: values.name,
        email: values.email,
        phone: values.phone,
        addressLine1: values.addressLine1,
        addressCity: values.addressCity,
        addressPostcode: values.addressPostcode,
        description: values.description,
        scheduledStart: selectedSlot,
      });
      if (result.success && result.data) {
        setConfirmedRef(result.data.refNumber);
        setSubmitted(true);
      } else {
        setServerError(result.error ?? 'Something went wrong. Please try again.');
      }
    });
  }

  // ── Success screen ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="text-center py-10 px-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking confirmed!</h2>
        <p className="text-gray-500 mb-1">
          A confirmation has been sent to{' '}
          <span className="font-medium text-gray-700">{form.getValues('email')}</span>.
        </p>
        {selectedSlot && (
          <div className="mt-4 inline-block bg-gray-50 rounded-xl px-6 py-4 text-left">
            <p className="text-sm font-semibold text-gray-800">
              {format(parseISO(selectedSlot), 'EEEE, d MMMM yyyy')}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(parseISO(selectedSlot), 'HH:mm')}
            </p>
            <p className="text-xs text-gray-400 mt-2">Ref: {confirmedRef}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────

  return (
    <div>
      <StepIndicator step={step} primaryColor={primaryColor} />

      {/* ── Step 1: Date ── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
            Choose a date
          </h2>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelect={handleDateSelect}
            workingDays={workingDays}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {/* ── Step 2: Time ── */}
      {step === 2 && (
        <div>
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 -mt-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Choose a time
          </h2>
          {selectedDate && (
            <p className="text-sm text-gray-500 mb-5">
              {format(selectedDate, 'EEEE, d MMMM yyyy')}
            </p>
          )}

          {loadingSlots ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading available slots…</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm mb-4">
                No available slots on this day.
              </p>
              <button
                onClick={() => setStep(1)}
                className="text-sm font-medium underline"
                style={{ color: primaryColor }}
              >
                Choose a different date
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => handleSlotSelect(slot)}
                    className={cn(
                      'h-11 rounded-xl text-sm font-medium border-2 transition-all',
                      isSelected
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 bg-white'
                    )}
                    style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                  >
                    {format(parseISO(slot), 'HH:mm')}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Details ── */}
      {step === 3 && (
        <div>
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 -mt-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {/* Summary chip */}
          {selectedDate && selectedSlot && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-5 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {format(parseISO(selectedSlot), 'EEE, d MMM')} at {format(parseISO(selectedSlot), 'HH:mm')}
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900 mb-5">Your details</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Full name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Jane Smith"
                          className="h-12 rounded-xl border-gray-200 focus:border-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="jane@example.com"
                            className="h-12 rounded-xl border-gray-200 focus:border-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Phone</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            placeholder="07700 900 000"
                            className="h-12 rounded-xl border-gray-200 focus:border-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Address *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123 High Street"
                          className="h-12 rounded-xl border-gray-200 focus:border-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="addressCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">City *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="London"
                            className="h-12 rounded-xl border-gray-200 focus:border-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="addressPostcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Postcode *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="SW1A 1AA"
                            className="h-12 rounded-xl border-gray-200 focus:border-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!contractId && (
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">What do you need?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Brief description of the work needed…"
                            rows={3}
                            className="rounded-xl border-gray-200 focus:border-gray-400 resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {serverError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{serverError}</p>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 text-base rounded-xl font-semibold mt-2 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Confirming booking…
                  </>
                ) : (
                  'Confirm booking'
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
