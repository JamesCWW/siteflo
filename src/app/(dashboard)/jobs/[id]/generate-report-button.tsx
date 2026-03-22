'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';

interface GenerateReportButtonProps {
  jobId: string;
}

export function GenerateReportButton({ jobId }: GenerateReportButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'service-report', id: jobId }),
      });
      const data = await res.json() as { pdfUrl?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to generate report');
      } else {
        router.refresh();
      }
    } catch {
      setError('Failed to generate report');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        className="h-12"
        onClick={handleGenerate}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        {isPending ? 'Generating…' : 'Generate report'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
