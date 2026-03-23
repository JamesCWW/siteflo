'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateJobStatus, completeJob } from '@/actions/jobs';
import type { JobStatus } from '@/actions/jobs';
import { Play, CheckCircle, XCircle } from 'lucide-react';

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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'scheduled' && (
          <>
            <Button
              className="h-12"
              onClick={() => doAction(() => updateJobStatus(jobId, 'in_progress'))}
              disabled={isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Start job
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

        {currentStatus === 'in_progress' && (
          <Button
            className="h-12 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => doAction(() => completeJob(jobId))}
            disabled={isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete job
          </Button>
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
