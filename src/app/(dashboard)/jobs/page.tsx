import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getJobs } from '@/actions/jobs';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Plus, Briefcase, MapPin, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import type { JobStatus } from '@/actions/jobs';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All jobs' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const filter = {
    status: params.status || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
  };

  const result = await getJobs(filter);
  const rows = result.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Service visits, callouts and one-off work
          </p>
        </div>
        <Button asChild className="h-12">
          <Link href="/jobs/new">
            <Plus className="h-4 w-4 mr-2" />
            New job
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(({ value, label }) => {
          const isActive = (params.status ?? '') === value;
          const href = value ? `/jobs?status=${value}` : '/jobs';
          return (
            <Link
              key={value}
              href={href}
              className={`
                px-4 h-9 rounded-full text-sm font-medium transition-colors inline-flex items-center
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'}
              `}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-semibold text-lg mb-2">No jobs found</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {params.status
                ? `No ${params.status.replace('_', ' ')} jobs.`
                : 'Schedule a job from a contract or create a standalone job.'}
            </p>
            <Button asChild className="h-12">
              <Link href="/jobs/new">
                <Plus className="h-4 w-4 mr-2" />
                New job
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ job, customer }) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block">
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{job.refNumber}</span>
                        <JobStatusBadge status={job.status as JobStatus} />
                        {job.type === 'contract_service' && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Contract service
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{customer.name}</span>
                      </div>
                      {job.siteAddress && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {job.siteAddress.line1}, {job.siteAddress.city}
                          </span>
                        </div>
                      )}
                      {job.scheduledStart && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{format(new Date(job.scheduledStart), 'EEE dd MMM yyyy, HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
