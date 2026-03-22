import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status = 'active' | 'paused' | 'expired' | 'cancelled';

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

export function ContractStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return (
    <Badge variant="outline" className={cn('border-0 text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
