'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { completeJob, updateJobStatus } from '@/actions/jobs';
import type { JobStatus } from '@/actions/jobs';
import { CheckCircle, XCircle } from 'lucide-react';

interface JobStatusActionsProps {
  jobId: string;
  currentStatus: JobStatus;
}

export function JobStatusActions({ jobId, currentStatus }: JobStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doAction = (action: () => Promise<{ success: boolean; error?: string }>) => {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? 'Something went wrong');
      }
    });
  };

  // Treat legacy in_progress jobs as scheduled
  const isScheduled = currentStatus === 'scheduled' || (currentStatus as string) === 'in_progress';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isScheduled && (
          <>
            <Button
              className="h-12 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => doAction(() => completeJob(jobId))}
              disabled={isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Job complete
            </Button>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => doAction(() => updateJobStatus(jobId, 'cancelled'))}
              disabled={isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
