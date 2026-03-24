'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceWizardModal } from './service-wizard-modal';
import { sendServiceReport } from '@/actions/jobs';
import type { ServiceFieldDefinition } from '@/db/schema/service-templates';
import { ClipboardList, Pencil, Send, Loader2, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ServiceRecordSectionProps {
  jobId: string;
  templateName: string;
  fields: ServiceFieldDefinition[];
  initialValues: Record<string, unknown>;
  customerEmail: string | null;
  pdfUrl: string | null;
}

function hasRecordData(values: Record<string, unknown>): boolean {
  return Object.values(values).some(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
}

function getFilledCount(fields: ServiceFieldDefinition[], values: Record<string, unknown>): number {
  return fields.filter(f => f.type !== 'section-header' && values[f.id] !== undefined && values[f.id] !== '' && values[f.id] !== null).length;
}

function getTotalCount(fields: ServiceFieldDefinition[]): number {
  return fields.filter(f => f.type !== 'section-header').length;
}

export function ServiceRecordSection({
  jobId,
  templateName,
  fields,
  initialValues,
  customerEmail,
  pdfUrl,
}: ServiceRecordSectionProps) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [isSending, startSend] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<Date | null>(null);

  // Sync when server re-fetches after save
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const hasData = hasRecordData(values);
  const filled = getFilledCount(fields, values);
  const total = getTotalCount(fields);

  const handleWizardClose = (saved: boolean) => {
    setWizardOpen(false);
    if (saved) router.refresh();
  };

  const handleSendReport = () => {
    startSend(async () => {
      setSendError(null);
      const result = await sendServiceReport(jobId);
      if (result.success) {
        setSentAt(new Date());
        router.refresh();
      } else {
        setSendError(result.error ?? 'Failed to send');
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Service record</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setWizardOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {hasData ? 'Edit report' : 'Start report'}
          </Button>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="py-6 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">No service record yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &ldquo;Start report&rdquo; to fill in the service record.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{templateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {filled} of {total} field{total !== 1 ? 's' : ''} completed
                    </p>
                  </div>
                </div>
                {filled === total && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {pdfUrl && (
                  <Button asChild variant="outline" size="sm" className="h-9">
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download PDF
                    </a>
                  </Button>
                )}
                {customerEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={handleSendReport}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isSending ? 'Sending…' : 'Send to client'}
                  </Button>
                )}
              </div>

              {sendError && (
                <p className="text-xs text-destructive">{sendError}</p>
              )}
              {sentAt && !isSending && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Report sent to {customerEmail} at {format(sentAt, 'HH:mm')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceWizardModal
        jobId={jobId}
        templateName={templateName}
        fields={fields}
        initialValues={values}
        open={wizardOpen}
        onClose={handleWizardClose}
      />
    </>
  );
}
