import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getContract } from '@/actions/contracts';
import { getJobsForContract } from '@/actions/jobs';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import { ContractStatusActions } from '@/components/contracts/contract-status-actions';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { formatPence } from '@/lib/utils/money';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  User, MapPin, Calendar, Clock, RefreshCw, Wrench,
  AlertCircle, Tag, Plus, History, Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/actions/jobs';

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, jobsResult] = await Promise.all([
    getContract(id),
    getJobsForContract(id),
  ]);

  if (!result.success || !result.data) notFound();

  const { contract, customer } = result.data;
  const serviceHistory = jobsResult.data ?? [];
  const isDue = isPast(new Date(contract.nextServiceDate));
  const hasInstallDetails = contract.installationDetails &&
    Object.values(contract.installationDetails).some(Boolean);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{contract.title}</h1>
            <ContractStatusBadge status={contract.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {contract.refNumber} · Created {format(new Date(contract.createdAt), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href={`/contracts/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Link>
          </Button>
          <ContractStatusActions contractId={id} currentStatus={contract.status} />
        </div>
      </div>

      {/* Next due alert */}
      {isDue && contract.status === 'active' && (
        <div className="flex items-center gap-3 bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            Service overdue — was due {format(new Date(contract.nextServiceDate), 'dd MMM yyyy')}
          </p>
        </div>
      )}

      {/* Contract summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <Link href={`/customers/${customer.id}`} className="text-sm font-medium hover:underline">
                {customer.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {customer.address.line1}, {customer.address.city}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className={cn('h-4 w-4 mt-0.5 shrink-0', isDue ? 'text-destructive' : 'text-muted-foreground')} />
            <div>
              <p className="text-xs text-muted-foreground">Next due date</p>
              <p className={cn('text-sm font-medium', isDue && 'text-destructive')}>
                {format(new Date(contract.nextServiceDate), 'dd MMM yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(contract.nextServiceDate), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Service interval</p>
              <p className="text-sm font-medium">Every {contract.serviceIntervalMonths} month{contract.serviceIntervalMonths !== 1 ? 's' : ''}</p>
              {contract.billingIntervalMonths !== contract.serviceIntervalMonths && (
                <p className="text-xs text-muted-foreground">
                  Billed every {contract.billingIntervalMonths} months ({contract.invoiceTiming.replace(/_/g, ' ')})
                </p>
              )}
              <p className="text-xs text-muted-foreground">{contract.reminderLeadDays} day reminder</p>
            </div>
          </div>

          {contract.standardPricePence != null && (
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Standard price</p>
                <p className="text-sm font-medium">{formatPence(contract.standardPricePence)}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Services completed</p>
              <p className="text-sm font-medium">{contract.totalServicesCompleted}</p>
              {contract.lastServiceDate && (
                <p className="text-xs text-muted-foreground">
                  Last: {format(new Date(contract.lastServiceDate), 'dd MMM yyyy')}
                </p>
              )}
            </div>
          </div>

          {contract.description && (
            <div className="sm:col-span-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{contract.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cycle history */}
      {(contract.contractStartDate || contract.totalServicesCompleted > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract history</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {contract.contractStartDate && (
                <span>Started {format(new Date(contract.contractStartDate), 'MMM yyyy')}</span>
              )}
              <span>{contract.totalServicesCompleted} service{contract.totalServicesCompleted !== 1 ? 's' : ''} completed</span>
              {(() => {
                const visitsPerCycle = Math.max(1, Math.round(contract.billingIntervalMonths / contract.serviceIntervalMonths));
                if (visitsPerCycle > 1) {
                  return (
                    <span>
                      Current cycle: {contract.servicesCompletedInCycle} of {visitsPerCycle} visits
                    </span>
                  );
                }
                return null;
              })()}
              {contract.cycleInvoiceStatus && contract.cycleInvoiceStatus !== 'not_invoiced' && (
                <span className="capitalize font-medium text-foreground">
                  {contract.cycleInvoiceStatus === 'invoice_sent' ? 'Invoice sent' : 'Paid'}
                  {contract.cycleInvoicePaidDate && ` ${format(new Date(contract.cycleInvoicePaidDate), 'dd MMM yyyy')}`}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installation details */}
      {hasInstallDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Installation details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {contract.installationDetails?.make && (
              <div>
                <p className="text-xs text-muted-foreground">Make</p>
                <p className="font-medium">{contract.installationDetails.make}</p>
              </div>
            )}
            {contract.installationDetails?.model && (
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="font-medium">{contract.installationDetails.model}</p>
              </div>
            )}
            {contract.installationDetails?.serialNumber && (
              <div>
                <p className="text-xs text-muted-foreground">Serial number</p>
                <p className="font-medium font-mono">{contract.installationDetails.serialNumber}</p>
              </div>
            )}
            {contract.installationDate && (
              <div>
                <p className="text-xs text-muted-foreground">Installation date</p>
                <p className="font-medium">{format(new Date(contract.installationDate), 'dd MMM yyyy')}</p>
              </div>
            )}
            {contract.installationDetails?.location && (
              <div className="sm:col-span-2 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{contract.installationDetails.location}</p>
                </div>
              </div>
            )}
            {contract.installationDetails?.warrantyExpiry && (
              <div>
                <p className="text-xs text-muted-foreground">Warranty expiry</p>
                <p className="font-medium">{format(new Date(contract.installationDetails.warrantyExpiry), 'dd MMM yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Service history</h2>
          {contract.status === 'active' && (
            <Button asChild className="h-12">
              <Link href={`/jobs/new?contractId=${id}&scheduledStart=${format(new Date(contract.nextServiceDate), "yyyy-MM-dd'T'09:00")}`}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule service
              </Link>
            </Button>
          )}
        </div>

        {serviceHistory.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No service history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Completed jobs will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {serviceHistory.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{job.refNumber}</span>
                        <JobStatusBadge status={job.status as JobStatus} />
                      </div>
                      {job.scheduledStart && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(job.scheduledStart), 'dd MMM yyyy')}
                          {job.actualEnd && ` · Completed ${format(new Date(job.actualEnd), 'dd MMM yyyy')}`}
                        </p>
                      )}
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
