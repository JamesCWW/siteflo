import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getJob } from '@/actions/jobs';
import { getTenantSettings } from '@/actions/settings';
import { getQuotesForJob } from '@/actions/quotes';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { JobStatusActions } from '@/components/jobs/job-status-actions';
import { DynamicFormSection } from './dynamic-form-section';
import { PhotoSection } from './photo-section';
import { GenerateReportButton } from './generate-report-button';
import { QuoteSheet } from './quote-sheet';
import type { JobStatus } from '@/actions/jobs';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  User, MapPin, Calendar, Wrench, ArrowLeft, FileText, Hash, Receipt, Download,
} from 'lucide-react';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, settingsResult, quotesResult] = await Promise.all([
    getJob(id),
    getTenantSettings(),
    getQuotesForJob(id),
  ]);

  if (!result.success || !result.data) notFound();

  const { job, customer, template, photos } = result.data;
  const defaultVatRate = settingsResult.data?.settings?.defaultVatRate ?? 20;
  const jobQuotes = quotesResult.data ?? [];
  const canEdit = job.status === 'scheduled' || job.status === 'in_progress';
  const canQuote = job.status !== 'cancelled';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{job.refNumber}</h1>
            <JobStatusBadge status={job.status as JobStatus} />
            {job.type === 'contract_service' && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                Contract service
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created {format(new Date(job.createdAt), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <JobStatusActions jobId={id} currentStatus={job.status as JobStatus} />
          {job.status === 'completed' && (
            <Button asChild variant="outline" className="h-12">
              <Link href={`/jobs/${id}/invoice`}>
                <Receipt className="h-4 w-4 mr-2" />
                Create invoice
              </Link>
            </Button>
          )}
          {canQuote && (
            <QuoteSheet
              jobId={id}
              defaultVatRate={defaultVatRate}
              customerEmail={customer.email ?? null}
            />
          )}
          {job.pdfUrl ? (
            <Button asChild variant="outline" className="h-12">
              <a href={job.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Download report
              </a>
            </Button>
          ) : job.status === 'completed' ? (
            <GenerateReportButton jobId={id} />
          ) : null}
        </div>
      </div>

      {/* Job info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <Link href={`/customers/${customer.id}`} className="text-sm font-medium hover:underline">
                {customer.name}
              </Link>
            </div>
          </div>

          {job.siteAddress && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Site address</p>
                <p className="text-sm font-medium">{job.siteAddress.line1}</p>
                {job.siteAddress.line2 && (
                  <p className="text-sm text-muted-foreground">{job.siteAddress.line2}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {job.siteAddress.city}, {job.siteAddress.postcode}
                </p>
              </div>
            </div>
          )}

          {job.scheduledStart && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-sm font-medium">
                  {format(new Date(job.scheduledStart), 'EEE dd MMM yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(job.scheduledStart), 'HH:mm')}
                  {job.scheduledEnd && ` – ${format(new Date(job.scheduledEnd), 'HH:mm')}`}
                </p>
              </div>
            </div>
          )}

          {job.actualStart && (
            <div className="flex items-start gap-3">
              <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Actual start</p>
                <p className="text-sm font-medium">
                  {format(new Date(job.actualStart), 'dd MMM yyyy, HH:mm')}
                </p>
                {job.actualEnd && (
                  <p className="text-xs text-muted-foreground">
                    Ended {format(new Date(job.actualEnd), 'HH:mm')}
                  </p>
                )}
              </div>
            </div>
          )}

          {template && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{template.name}</p>
              </div>
            </div>
          )}

          {job.contractId && (
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Contract</p>
                <Button asChild variant="link" className="p-0 h-auto text-sm">
                  <Link href={`/contracts/${job.contractId}`}>View contract</Link>
                </Button>
              </div>
            </div>
          )}

          {job.description && (
            <div className="sm:col-span-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{job.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic form */}
      {template?.id && template.fieldSchema && template.fieldSchema.length > 0 && (
        <DynamicFormSection
          jobId={id}
          fields={template.fieldSchema}
          initialValues={(job.fieldValues as Record<string, unknown>) ?? {}}
          canEdit={canEdit}
        />
      )}

      {/* Photos */}
      <PhotoSection
        jobId={id}
        photos={photos}
        canAdd={canEdit}
      />

      {/* Quotes */}
      {jobQuotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotes / additional work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobQuotes.map((quote) => (
              <div key={quote.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{quote.refNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(quote.createdAt), 'dd MMM yyyy')}
                    {' · '}
                    £{(quote.totalPence / 100).toFixed(2)}
                  </p>
                </div>
                <Badge variant={
                  quote.status === 'approved' ? 'default' :
                  quote.status === 'sent' ? 'secondary' :
                  quote.status === 'declined' ? 'destructive' :
                  'outline'
                }>
                  {quote.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
