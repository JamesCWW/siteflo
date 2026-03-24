'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Upload, CheckCircle2, AlertCircle, XCircle, Download, Loader2, ArrowRight,
} from 'lucide-react';
import { bulkImportParts, type PartImportRow } from '@/actions/parts-import';
import { toast } from 'sonner';

const TEMPLATE_CSV =
  'name,type,unit_price_gbp,unit,category\n' +
  'Annual Gate Service,labour,150,each,Service\n' +
  'Safety Edge (per metre),part,45,metre,Safety\n';

type ParsedRow = {
  name: string;
  type: 'part' | 'labour';
  unitPriceGbp: number;
  unit: string;
  category: string;
  errors: string[];
};

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  const first = lines[0].toLowerCase();
  const isHeader = first.includes('name') || first.includes('type');
  const data = isHeader ? lines.slice(1) : lines;

  return data.filter(l => l.trim()).map(line => {
    const parts = line.split(',').map(p => p.trim());
    const name = parts[0] ?? '';
    const rawType = (parts[1] ?? '').toLowerCase();
    const type: 'part' | 'labour' = rawType === 'labour' ? 'labour' : 'part';
    const unitPriceGbp = parseFloat(parts[2] ?? '0') || 0;
    const unit = parts[3] || 'each';
    const category = parts[4] || '';

    const errors: string[] = [];
    if (!name) errors.push('Name is required');
    if (rawType && rawType !== 'part' && rawType !== 'labour') errors.push('Type must be "part" or "labour"');

    return { name, type, unitPriceGbp, unit, category, errors };
  });
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'siteflo-parts-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PartsImportContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    file.text().then(text => {
      const parsed = parseCSV(text);
      if (!parsed.length) {
        toast.error('No data rows found in the CSV.');
        return;
      }
      setRows(parsed);
      setStep('preview');
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name?.endsWith('.csv') || file?.type === 'text/csv') {
      processFile(file);
    } else {
      toast.error('Please upload a CSV file.');
    }
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleImport = useCallback(async () => {
    const valid = rows.filter(r => r.errors.length === 0);
    if (!valid.length) {
      toast.error('No valid rows to import.');
      return;
    }
    setStep('importing');
    const payload: PartImportRow[] = valid.map(r => ({
      name: r.name,
      type: r.type,
      unitPricePence: Math.round(r.unitPriceGbp * 100),
      unit: r.unit,
      category: r.category,
    }));
    const result = await bulkImportParts(payload);
    if (result.success && 'imported' in result) {
      setImportedCount(result.imported ?? 0);
      setStep('done');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Import failed');
      setStep('preview');
    }
  }, [rows, router]);

  const validCount = rows.filter(r => r.errors.length === 0).length;
  const errorCount = rows.filter(r => r.errors.length > 0).length;

  if (step === 'importing') {
    return (
      <div className="py-16 text-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <p className="font-medium">Importing…</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="py-14 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <div>
          <h2 className="text-xl font-semibold">Import complete</h2>
          <p className="text-muted-foreground mt-1">
            {importedCount} item{importedCount !== 1 ? 's' : ''} added to the parts library.
          </p>
        </div>
        <Button onClick={onClose} className="h-11">
          Done
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Drop your CSV here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Expected columns:</p>
          <p className="font-mono text-xs bg-muted rounded px-3 py-2">
            name, type, unit_price_gbp, unit, category
          </p>
          <p><code className="bg-muted px-1 rounded">type</code> must be <code className="bg-muted px-1 rounded">part</code> or <code className="bg-muted px-1 rounded">labour</code>.</p>
        </div>

        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Download template CSV
        </Button>
      </div>
    );
  }

  // Preview
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm flex items-center gap-1.5 text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {validCount} ready to import
        </span>
        {errorCount > 0 && (
          <span className="text-sm flex items-center gap-1.5 text-destructive font-medium">
            <XCircle className="h-4 w-4" />
            {errorCount} with errors
          </span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setRows([]); setStep('upload'); }}>
            Start over
          </Button>
          <Button
            size="sm"
            className="h-9"
            onClick={handleImport}
            disabled={validCount === 0}
          >
            Import {validCount} item{validCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-8 pl-3 py-2.5" />
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Name</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Type</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Price</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Unit</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Category</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b',
                    row.errors.length > 0 ? 'bg-destructive/5' : 'hover:bg-muted/30',
                  )}
                >
                  <td className="pl-3 py-2.5 w-8">
                    {row.errors.length > 0 ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{row.name || <span className="text-destructive italic">Missing</span>}</p>
                    {row.errors.map((e, j) => (
                      <p key={j} className="text-xs text-destructive">{e}</p>
                    ))}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground capitalize">{row.type}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">£{row.unitPriceGbp.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.unit}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.category || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function PartsImportModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="h-12" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Bulk import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import parts</DialogTitle>
          </DialogHeader>
          <PartsImportContent onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
