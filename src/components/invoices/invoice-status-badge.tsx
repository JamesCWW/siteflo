import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/actions/invoices';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:   { label: 'Draft',   variant: 'secondary' },
  sent:    { label: 'Sent',    variant: 'default' },
  viewed:  { label: 'Viewed',  variant: 'default' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  paid:    { label: 'Paid',    variant: 'outline' },
  void:    { label: 'Void',    variant: 'outline' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' as const };
  const extraClass = status === 'paid' ? 'border-green-600 text-green-700' : '';
  return <Badge variant={config.variant} className={extraClass}>{config.label}</Badge>;
}
