import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type JobStatus = 'scheduled' | 'completed' | 'invoiced' | 'paid' | 'cancelled';

const STATUS_CONFIG: Record<JobStatus, { label: string; className: string }> = {
  scheduled:   { label: 'Scheduled',   className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700 border-green-200' },
  invoiced:    { label: 'Invoiced',    className: 'bg-purple-100 text-purple-700 border-purple-200' },
  paid:        { label: 'Paid',        className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
};

export function JobStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as JobStatus] ?? STATUS_CONFIG.scheduled;
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className)}
    >
      {config.label}
    </Badge>
  );
}
