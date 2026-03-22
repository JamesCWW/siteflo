'use client';

import { useState, useEffect, useRef } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  getHours,
  getMinutes,
  differenceInMinutes,
  startOfDay,
  setHours,
  setMinutes,
  isToday,
  isPast,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────

type CalendarJob = {
  id: string;
  refNumber: string;
  description: string | null;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  customerName: string;
};

type ContractDue = {
  id: string;
  title: string;
  nextDueDate: string;
  customerName: string;
};

type Technician = {
  id: string;
  fullName: string;
};

interface CalendarViewProps {
  jobs: CalendarJob[];
  contractsDue: ContractDue[];
  technicians: Technician[];
}

type ViewMode = 'week' | 'month' | 'day';

// ── Constants ──────────────────────────────────────────────────────────────

const HOUR_START = 8;
const HOUR_END = 18;
const HOUR_HEIGHT = 64; // px per hour — matches Google Calendar density
const GUTTER_WIDTH = 52; // px — time label gutter

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  scheduled:   { bg: 'bg-blue-50',    border: 'border-blue-500',   text: 'text-blue-900' },
  in_progress: { bg: 'bg-amber-50',   border: 'border-amber-500',  text: 'text-amber-900' },
  completed:   { bg: 'bg-green-50',   border: 'border-green-600',  text: 'text-green-900' },
  invoiced:    { bg: 'bg-purple-50',  border: 'border-purple-500', text: 'text-purple-900' },
  paid:        { bg: 'bg-emerald-50', border: 'border-emerald-600',text: 'text-emerald-900' },
  cancelled:   { bg: 'bg-gray-50',    border: 'border-gray-400',   text: 'text-gray-500' },
};

const STATUS_DOT: Record<string, string> = {
  scheduled:   'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed:   'bg-green-600',
  invoiced:    'bg-purple-500',
  paid:        'bg-emerald-600',
  cancelled:   'bg-gray-400',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function jobTopOffset(job: CalendarJob): number {
  if (!job.scheduledStart) return 0;
  const start = new Date(job.scheduledStart);
  const h = getHours(start) - HOUR_START;
  const m = getMinutes(start);
  return h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
}

function jobHeightPx(job: CalendarJob): number {
  if (!job.scheduledStart) return HOUR_HEIGHT;
  if (!job.scheduledEnd) return HOUR_HEIGHT;
  const mins = differenceInMinutes(new Date(job.scheduledEnd), new Date(job.scheduledStart));
  return Math.max(22, (mins / 60) * HOUR_HEIGHT);
}

function currentTimeOffset(): number {
  const now = new Date();
  const h = getHours(now) - HOUR_START;
  const m = getMinutes(now);
  return h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
}

const hours: number[] = [];
for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

// ── Component ──────────────────────────────────────────────────────────────

export function CalendarView({ jobs, contractsDue, technicians }: CalendarViewProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [nowOffset, setNowOffset] = useState(currentTimeOffset());

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = Math.max(0, nowOffset - 120);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [viewMode]);

  // Tick the current-time line every minute
  useEffect(() => {
    const interval = setInterval(() => setNowOffset(currentTimeOffset()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = jobs; // tech filter placeholder — jobs would need assignedToId prop

  // ── Navigation ──────────────────────────────────────────────────────────

  function prev() {
    if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => addDays(d, -1));
  }

  function next() {
    if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  function headerLabel() {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'day') return format(currentDate, 'EEEE, d MMMM yyyy');
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    if (isSameMonth(start, end)) return format(start, 'MMMM yyyy');
    return `${format(start, 'MMM')} – ${format(end, 'MMM yyyy')}`;
  }

  function handleSlotClick(day: Date, y: number) {
    const hourFrac = y / HOUR_HEIGHT;
    const hour = Math.floor(hourFrac) + HOUR_START;
    const minute = Math.round((hourFrac % 1) * 4) * 15;
    const dt = setMinutes(setHours(startOfDay(day), hour), minute);
    router.push(`/jobs/new?scheduledStart=${encodeURIComponent(dt.toISOString())}`);
  }

  // ── Week view ─────────────────────────────────────────────────────────────

  function WeekView() {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const showNow = isToday(currentDate) || weekDays.some((d) => isToday(d));

    return (
      <div className="flex flex-col h-full">
        {/* Sticky column headers */}
        <div className="flex border-b border-gray-200 bg-white sticky top-0 z-20">
          {/* Gutter spacer */}
          <div style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }} className="border-r border-gray-200" />
          {weekDays.map((day) => {
            const dueCounts = contractsDue.filter((c) => isSameDay(new Date(c.nextDueDate), day));
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 text-center py-2 border-r border-gray-200 last:border-r-0 min-w-0',
                  isToday(day) && 'bg-blue-50/40'
                )}
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-xl font-normal mt-0.5 w-9 h-9 rounded-full flex items-center justify-center mx-auto leading-none',
                    isToday(day)
                      ? 'text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                  )}
                  style={isToday(day) ? { backgroundColor: 'var(--brand-color)' } : undefined}
                  onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                >
                  {format(day, 'd')}
                </div>
                {/* Contract due indicators */}
                {dueCounts.length > 0 && (
                  <div className="flex justify-center mt-1 gap-0.5">
                    {dueCounts.slice(0, 3).map((c) => (
                      <span
                        key={c.id}
                        title={`Due: ${c.title} — ${c.customerName}`}
                        className="text-orange-500 text-[10px] leading-none"
                      >
                        ◆
                      </span>
                    ))}
                    {dueCounts.length > 3 && (
                      <span className="text-orange-500 text-[9px]">+{dueCounts.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex" style={{ height: hours.length * HOUR_HEIGHT }}>
            {/* Time gutter */}
            <div
              style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
              className="relative border-r border-gray-200 bg-white"
            >
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute w-full"
                  style={{ top: i * HOUR_HEIGHT - 8 }}
                >
                  {i > 0 && (
                    <span className="text-[11px] text-gray-400 block text-right pr-2 leading-none select-none">
                      {format(setMinutes(setHours(new Date(), h), 0), 'h a')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex flex-1 relative">
              {/* Background grid lines (drawn once, shared across all columns) */}
              <div className="absolute inset-0 pointer-events-none">
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half-hour lines */}
                {hours.map((h, i) => (
                  <div
                    key={`${h}h`}
                    className="absolute w-full border-t border-gray-50"
                    style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}
              </div>

              {weekDays.map((day) => {
                const dayJobs = filteredJobs.filter(
                  (j) => j.scheduledStart && isSameDay(new Date(j.scheduledStart), day)
                );
                const isNowDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'flex-1 border-r border-gray-200 last:border-r-0 relative cursor-pointer min-w-0',
                      isNowDay && 'bg-blue-50/20'
                    )}
                    style={{ height: hours.length * HOUR_HEIGHT }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      handleSlotClick(day, e.clientY - rect.top);
                    }}
                  >
                    {/* Current time line */}
                    {isNowDay && (
                      <div
                        className="absolute left-0 right-0 z-10 pointer-events-none"
                        style={{ top: nowOffset }}
                      >
                        <div className="relative flex items-center">
                          <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                          <div className="w-full h-px bg-red-500" />
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    {dayJobs.map((job) => {
                      const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.scheduled;
                      const h = jobHeightPx(job);
                      const top = jobTopOffset(job);

                      return (
                        <button
                          key={job.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/jobs/${job.id}`);
                          }}
                          className={cn(
                            'absolute left-1 right-1 rounded overflow-hidden border-l-2 text-left px-1.5 py-0.5 hover:brightness-95 transition-all',
                            style.bg,
                            style.border,
                            style.text
                          )}
                          style={{ top, height: h, minHeight: 22 }}
                        >
                          <div className="font-medium text-[11px] leading-tight truncate">
                            {job.scheduledStart && (
                              <span className="opacity-70 mr-1">
                                {format(new Date(job.scheduledStart), 'H:mm')}
                              </span>
                            )}
                            {job.customerName}
                          </div>
                          {h > 30 && (
                            <div className="text-[10px] leading-tight truncate opacity-70">
                              {job.description ?? job.refNumber}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Month view ────────────────────────────────────────────────────────────

  function MonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weeks: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
      weeks.push(Array.from({ length: 7 }, (_, i) => { const d = addDays(day, i); return d; }));
      day = addDays(day, 7);
    }

    return (
      <div>
        {/* Day-of-week header */}
        <div
          className="border-b border-gray-200 bg-white"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div>
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="border-b border-gray-200"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', minHeight: 100 }}
            >
              {week.map((d) => {
                const inMonth = isSameMonth(d, currentDate);
                const dayJobs = filteredJobs.filter(
                  (j) => j.scheduledStart && isSameDay(new Date(j.scheduledStart), d)
                );
                const dueCounts = contractsDue.filter((c) =>
                  isSameDay(new Date(c.nextDueDate), d)
                );

                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      'p-1 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50/50 transition-colors',
                      !inMonth && 'bg-gray-50/30'
                    )}
                    onClick={() => { setCurrentDate(d); setViewMode('day'); }}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={cn(
                          'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none',
                          isToday(d)
                            ? 'text-white'
                            : inMonth
                            ? 'text-gray-700'
                            : 'text-gray-400'
                        )}
                        style={isToday(d) ? { backgroundColor: 'var(--brand-color)' } : undefined}
                      >
                        {format(d, 'd')}
                      </span>
                      {dueCounts.length > 0 && (
                        <span
                          title={dueCounts.map((c) => `Due: ${c.title}`).join(', ')}
                          className="text-orange-500 text-[10px] leading-none"
                        >
                          ◆{dueCounts.length > 1 ? dueCounts.length : ''}
                        </span>
                      )}
                    </div>

                    {/* Events */}
                    <div className="space-y-0.5">
                      {dayJobs.slice(0, 3).map((j) => {
                        const dot = STATUS_DOT[j.status] ?? 'bg-blue-500';
                        return (
                          <button
                            key={j.id}
                            onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${j.id}`); }}
                            className="w-full text-left flex items-center gap-1 rounded px-1 py-px hover:bg-gray-100 transition-colors"
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
                            <span className="text-[10px] text-gray-700 truncate leading-tight">
                              {j.scheduledStart && (
                                <span className="text-gray-400 mr-0.5">
                                  {format(new Date(j.scheduledStart), 'H:mm')}
                                </span>
                              )}
                              {j.customerName}
                            </span>
                          </button>
                        );
                      })}
                      {dayJobs.length > 3 && (
                        <p className="text-[10px] text-gray-400 px-1">
                          +{dayJobs.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Day view ──────────────────────────────────────────────────────────────

  function DayView() {
    const dayJobs = filteredJobs.filter(
      (j) => j.scheduledStart && isSameDay(new Date(j.scheduledStart), currentDate)
    );
    const dueCounts = contractsDue.filter((c) => isSameDay(new Date(c.nextDueDate), currentDate));

    return (
      <div className="flex flex-col h-full">
        {/* Day header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
          <div className="text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {format(currentDate, 'EEE')}
            </div>
            <div
              className={cn(
                'text-3xl font-light w-12 h-12 flex items-center justify-center rounded-full mx-auto',
                isToday(currentDate) ? 'text-white' : 'text-gray-700'
              )}
              style={isToday(currentDate) ? { backgroundColor: 'var(--brand-color)' } : undefined}
            >
              {format(currentDate, 'd')}
            </div>
          </div>
          {dueCounts.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {dueCounts.map((c) => (
                <div key={c.id} className="flex items-center gap-1 text-xs text-orange-600">
                  <span>◆</span>
                  <span>{c.title} — {c.customerName}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div
            className="flex relative"
            style={{ height: hours.length * HOUR_HEIGHT }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              const rect = e.currentTarget.getBoundingClientRect();
              handleSlotClick(currentDate, e.clientY - rect.top);
            }}
          >
            {/* Time gutter */}
            <div
              style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
              className="relative border-r border-gray-200 shrink-0"
            >
              {hours.map((h, i) => (
                <div key={h} className="absolute w-full" style={{ top: i * HOUR_HEIGHT - 8 }}>
                  {i > 0 && (
                    <span className="text-[11px] text-gray-400 block text-right pr-2 leading-none select-none">
                      {format(setMinutes(setHours(new Date(), h), 0), 'h a')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Event column */}
            <div className="flex-1 relative">
              {/* Hour lines */}
              {hours.map((_, i) => (
                <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: i * HOUR_HEIGHT }} />
              ))}
              {hours.map((_, i) => (
                <div key={`h${i}`} className="absolute w-full border-t border-gray-50"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              ))}

              {/* Current time */}
              {isToday(currentDate) && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: nowOffset }}
                >
                  <div className="relative flex items-center">
                    <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-full h-px bg-red-500" />
                  </div>
                </div>
              )}

              {/* Events */}
              {dayJobs.map((job) => {
                const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.scheduled;
                const h = jobHeightPx(job);
                const top = jobTopOffset(job);
                return (
                  <button
                    key={job.id}
                    onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.id}`); }}
                    className={cn(
                      'absolute left-2 right-2 rounded border-l-2 text-left px-2 py-1 hover:brightness-95 transition-all',
                      style.bg, style.border, style.text
                    )}
                    style={{ top, height: h, minHeight: 28 }}
                  >
                    <div className="font-medium text-sm leading-tight truncate">
                      {job.customerName}
                    </div>
                    {h > 40 && (
                      <div className="text-xs leading-tight truncate opacity-70 mt-0.5">
                        {job.scheduledStart && format(new Date(job.scheduledStart), 'H:mm')}
                        {job.scheduledEnd && ` – ${format(new Date(job.scheduledEnd), 'H:mm')}`}
                        {job.description && ` · ${job.description}`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[600px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white shrink-0 flex-wrap">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="h-8 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={next}
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-base font-normal text-gray-800 flex-1">
          {headerLabel()}
        </h2>

        <div className="flex items-center gap-2">
          {technicians.length > 1 && (
            <Select value={techFilter} onValueChange={setTechFilter}>
              <SelectTrigger className="h-8 w-40 text-xs border-gray-300">
                <SelectValue placeholder="All technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All technicians</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View switcher */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'px-3 h-8 text-xs font-medium capitalize transition-colors border-r border-gray-300 last:border-r-0',
                  viewMode === v
                    ? 'text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
                style={viewMode === v ? { backgroundColor: 'var(--brand-color)' } : undefined}
              >
                {v}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => router.push('/jobs/new')}
            className="h-8 text-white gap-1"
            style={{ backgroundColor: 'var(--brand-color)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New job</span>
          </Button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'week' && <WeekView />}
        {viewMode === 'month' && (
          <div className="h-full overflow-y-auto">
            <MonthView />
          </div>
        )}
        {viewMode === 'day' && <DayView />}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50 flex-wrap shrink-0">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', dot)} />
            <span className="text-[11px] text-gray-500 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="text-orange-500 text-[10px]">◆</span>
          <span className="text-[11px] text-gray-500">Contract due</span>
        </div>
      </div>
    </div>
  );
}
