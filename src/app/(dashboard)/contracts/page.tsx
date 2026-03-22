import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { getContracts } from '@/actions/contracts';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import { formatPence } from '@/lib/utils/money';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'due-this-month' | 'due-next-month' | 'overdue';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due-this-month', label: 'Due this month' },
  { value: 'due-next-month', label: 'Due next month' },
  { value: 'overdue', label: 'Overdue' },
];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = (FILTERS.find(f => f.value === rawFilter)?.value ?? 'all') as Filter;

  const { data: rows } = await getContracts(filter === 'all' ? undefined : filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service contracts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {rows.length} contract{rows.length !== 1 ? 's' : ''}
          {filter !== 'all' && ` · ${FILTERS.find(f => f.value === filter)?.label}`}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'all' ? '/contracts' : `/contracts?filter=${f.value}`}
            className={cn(
              'px-4 h-10 rounded-full text-sm font-medium whitespace-nowrap transition-colors border',
              filter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">No contracts found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {filter === 'all'
              ? 'Contracts are created from customer pages'
              : `No contracts match the "${FILTERS.find(f => f.value === filter)?.label}" filter`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ contract, customer }) => {
            const isDue = isPast(new Date(contract.nextDueDate));
            return (
              <Link key={contract.id} href={`/contracts/${contract.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{contract.title}</p>
                          <ContractStatusBadge status={contract.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {customer.name} · {contract.refNumber}
                          {contract.standardPricePence != null && ` · ${formatPence(contract.standardPricePence)}`}
                        </p>
                        <div className={cn(
                          'flex items-center gap-1.5 mt-2 text-sm',
                          isDue ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          {isDue
                            ? <AlertCircle className="h-3.5 w-3.5" />
                            : <Calendar className="h-3.5 w-3.5" />
                          }
                          <span>
                            {isDue ? 'Overdue — was due ' : 'Due '}
                            {format(new Date(contract.nextDueDate), 'dd MMM yyyy')}
                            {' '}({formatDistanceToNow(new Date(contract.nextDueDate), { addSuffix: true })})
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
