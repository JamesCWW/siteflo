'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Upload, CheckCircle2, AlertCircle, XCircle,
  ChevronDown, ChevronUp, Download, Loader2, ArrowRight,
} from 'lucide-react';
import { checkDuplicates, bulkImport, type ImportRow } from '@/actions/import';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

type DuplicateAction = 'skip' | 'create_anyway' | 'add_to_existing';

interface EditableRow {
  index: number;
  customerName: string;
  addressLine1: string;
  addressCity: string;
  addressPostcode: string;
  phone: string;
  email: string;
  contractTitle: string;
  servicesPerYear: string;
  serviceIntervalMonths: number;
  billingIntervalMonths: number;
  priceGbp: string;
  lastServiceDate: string;
  nextServiceDate: string;
  lastPaymentDate: string;
  nextInvoiceDate: string;
  notes: string;
  errors: string[];
  warnings: string[];
  duplicate: { id: string; name: string } | null;
  duplicateAction: DuplicateAction;
  expanded: boolean;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const TEMPLATE_CSV =
  'customer_name,address,phone,email,services_per_year,price_gbp,last_service_date,next_service_date,last_payment_date,next_invoice_date,notes\n' +
  'John Smith,14 Elm Street Newmarket Suffolk CB8 7AA,07700900123,john@email.com,2,400,2025-09-15,2026-03-15,2025-09-01,2026-09-01,Intercom: 4521\n';

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let field = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

function parseDate(raw: string): string | null | 'invalid' {
  const v = raw?.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return 'invalid';
}

const STREET_RE = /\b(street|road|avenue|lane|drive|close|way|place|terrace|gardens|grove|court|crescent|row|hill|view|walk|rise|mews)\b/i;
const POSTCODE_RE = /\b([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})\s*$/i;

function parseAddress(raw: string) {
  const country = 'United Kingdom';
  const pcMatch = raw.match(POSTCODE_RE);
  const postcode = pcMatch ? pcMatch[1].toUpperCase().replace(/\s+/, ' ') : '';
  const body = pcMatch ? raw.substring(0, pcMatch.index).replace(/,?\s*$/, '').trim() : raw.trim();

  if (!body) return { line1: raw.trim(), city: '', postcode, country };

  if (body.includes(',')) {
    const parts = body.split(',').map(p => p.trim()).filter(Boolean);
    const line1 = parts[0];
    const city = parts.length >= 3 ? parts[1] : (parts[parts.length - 1] ?? '');
    return { line1, city, postcode, country };
  }

  // No commas — use street suffix heuristic
  const sfMatch = body.match(STREET_RE);
  if (sfMatch) {
    const end = (sfMatch.index ?? 0) + sfMatch[0].length;
    const line1 = body.substring(0, end).trim();
    const city = body.substring(end).trim().split(/\s+/)[0] ?? '';
    return { line1, city, postcode, country };
  }

  return { line1: body, city: '', postcode, country };
}

function getIntervals(n: number) {
  if (!Number.isInteger(n) || n < 1 || 12 % n !== 0) return null;
  return { serviceIntervalMonths: 12 / n, billingIntervalMonths: 12 };
}

function validate(row: EditableRow): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.customerName.trim()) errors.push('Customer name is required');

  const sNum = Number(row.servicesPerYear);
  if (!row.servicesPerYear || isNaN(sNum) || !getIntervals(sNum)) {
    errors.push('Services per year must be 1, 2, 3, 4, 6, or 12');
  }

  if (!row.nextServiceDate) {
    errors.push('Next service date is required');
  } else if (parseDate(row.nextServiceDate) === 'invalid') {
    errors.push('Next service date is invalid');
  }

  if (row.lastServiceDate && parseDate(row.lastServiceDate) === 'invalid') {
    warnings.push('Last service date is invalid — will be ignored');
  }
  if (row.priceGbp && isNaN(Number(row.priceGbp))) {
    warnings.push('Price must be a number — will be ignored');
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    warnings.push('Email address looks invalid');
  }
  if (!row.addressPostcode) {
    warnings.push('Postcode not detected — address may need editing');
  }

  return { errors, warnings };
}

function buildRows(text: string): EditableRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  const first = parseCSVLine(lines[0]);
  const isHeader = first.some(f => /customer_name|address|phone|email/i.test(f));
  const data = isHeader ? lines.slice(1) : lines;

  return data.filter(l => l.trim()).map((line, i) => {
    const f = parseCSVLine(line);
    const g = (idx: number) => (f[idx] ?? '').trim();

    const addr = parseAddress(g(1));
    const spyRaw = g(4) || '1';
    const intervals = getIntervals(Number(spyRaw)) ?? { serviceIntervalMonths: 12, billingIntervalMonths: 12 };

    const safeParse = (raw: string) => {
      const p = parseDate(raw);
      return p === 'invalid' ? '' : (p ?? '');
    };

    const row: EditableRow = {
      index: i,
      customerName: g(0),
      addressLine1: addr.line1,
      addressCity: addr.city,
      addressPostcode: addr.postcode,
      phone: g(2),
      email: g(3),
      contractTitle: 'Annual Service',
      servicesPerYear: spyRaw,
      serviceIntervalMonths: intervals.serviceIntervalMonths,
      billingIntervalMonths: intervals.billingIntervalMonths,
      priceGbp: g(5),
      lastServiceDate: safeParse(g(6)),
      nextServiceDate: safeParse(g(7)),
      lastPaymentDate: safeParse(g(8)),
      nextInvoiceDate: safeParse(g(9)),
      notes: g(10),
      errors: [],
      warnings: [],
      duplicate: null,
      duplicateAction: 'create_anyway',
      expanded: false,
    };

    const { errors, warnings } = validate(row);
    row.errors = errors;
    row.warnings = warnings;
    return row;
  });
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'siteflo-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Row editor ───────────────────────────────────────────────────────────────

function RowEditor({
  row,
  onUpdate,
}: {
  row: EditableRow;
  onUpdate: (u: Partial<EditableRow>) => void;
}) {
  const field = (
    label: string,
    key: keyof EditableRow,
    type: 'text' | 'date' | 'email' | 'tel' = 'text',
    span?: 'full'
  ) => (
    <div className={span === 'full' ? 'col-span-2 md:col-span-4' : undefined}>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={row[key] as string}
        onChange={e => onUpdate({ [key]: e.target.value })}
        className="h-8 text-sm mt-0.5"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );

  return (
    <div className="space-y-4" onClick={e => e.stopPropagation()}>
      {/* Error / warning chips */}
      {(row.errors.length > 0 || row.warnings.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {row.errors.map((e, i) => (
            <span key={i} className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{e}</span>
          ))}
          {row.warnings.map((w, i) => (
            <span key={i} className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full">{w}</span>
          ))}
        </div>
      )}

      {/* Duplicate resolution */}
      {row.duplicate && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/10">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Existing customer: {row.duplicate.name}</p>
            <p className="text-xs text-muted-foreground">How should we handle this row?</p>
          </div>
          <select
            className="text-sm border rounded px-2 py-1 bg-background"
            value={row.duplicateAction}
            onChange={e => onUpdate({ duplicateAction: e.target.value as DuplicateAction })}
            onClick={e => e.stopPropagation()}
          >
            <option value="skip">Skip this row</option>
            <option value="add_to_existing">Add contract to existing customer</option>
            <option value="create_anyway">Create as new customer</option>
          </select>
        </div>
      )}

      {/* Customer fields */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="col-span-2">
            <Label className="text-xs">Name *</Label>
            <Input
              value={row.customerName}
              onChange={e => onUpdate({ customerName: e.target.value })}
              className="h-8 text-sm mt-0.5"
              onClick={e => e.stopPropagation()}
            />
          </div>
          {field('Phone', 'phone', 'tel')}
          {field('Email', 'email', 'email')}
          <div className="col-span-2">
            <Label className="text-xs">Address line 1</Label>
            <Input
              value={row.addressLine1}
              onChange={e => onUpdate({ addressLine1: e.target.value })}
              className="h-8 text-sm mt-0.5"
              onClick={e => e.stopPropagation()}
            />
          </div>
          {field('City', 'addressCity')}
          {field('Postcode', 'addressPostcode')}
        </div>
      </div>

      {/* Contract fields */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contract</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="col-span-2">{field('Title', 'contractTitle')}</div>
          <div>
            <Label className="text-xs">Services per year *</Label>
            <select
              className="w-full h-8 text-sm mt-0.5 border rounded px-2 bg-background"
              value={row.servicesPerYear}
              onChange={e => onUpdate({ servicesPerYear: e.target.value })}
              onClick={e => e.stopPropagation()}
            >
              <option value="1">1 — annual</option>
              <option value="2">2 — every 6 months</option>
              <option value="3">3 — every 4 months</option>
              <option value="4">4 — quarterly</option>
              <option value="6">6 — every 2 months</option>
              <option value="12">12 — monthly</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Annual price (£)</Label>
            <Input
              type="number"
              value={row.priceGbp}
              onChange={e => onUpdate({ priceGbp: e.target.value })}
              placeholder="0"
              className="h-8 text-sm mt-0.5"
              onClick={e => e.stopPropagation()}
            />
          </div>
          {field('Last service date', 'lastServiceDate', 'date')}
          {field('Next service date *', 'nextServiceDate', 'date')}
          {field('Last payment date', 'lastPaymentDate', 'date')}
          {field('Next invoice date', 'nextInvoiceDate', 'date')}
          {field('Notes', 'notes', 'text', 'full')}
        </div>
      </div>
    </div>
  );
}

// ─── Row item ─────────────────────────────────────────────────────────────────

function RowItem({
  row,
  onExpand,
  onUpdate,
}: {
  row: EditableRow;
  onExpand: () => void;
  onUpdate: (u: Partial<EditableRow>) => void;
}) {
  const status =
    row.errors.length > 0 ? 'error' :
    row.warnings.length > 0 || row.duplicate ? 'warning' :
    'valid';

  const priceLabel = row.priceGbp && !isNaN(Number(row.priceGbp))
    ? ` · £${Number(row.priceGbp).toFixed(0)}/yr`
    : '';
  const scheduleLabel = `${row.servicesPerYear}x/yr${priceLabel}`;

  return (
    <>
      <tr
        className={cn(
          'border-b cursor-pointer select-none',
          status === 'error' ? 'bg-destructive/5 hover:bg-destructive/8' :
          status === 'warning' ? 'bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-950/10' :
          'hover:bg-muted/40',
          row.expanded && 'bg-muted/20',
        )}
        onClick={onExpand}
      >
        <td className="pl-3 py-2.5 w-8">
          {status === 'error' ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : status === 'warning' ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </td>
        <td className="px-3 py-2.5">
          <p className="font-medium text-sm truncate max-w-[160px]">
            {row.customerName || <span className="text-destructive italic">Missing name</span>}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
            {[row.addressLine1, row.addressCity, row.addressPostcode].filter(Boolean).join(', ') || '—'}
          </p>
          {row.duplicate && (
            <p className="text-xs text-amber-600 font-medium">
              Duplicate · {row.duplicateAction === 'skip' ? 'will skip' :
                row.duplicateAction === 'add_to_existing' ? 'add contract to existing' : 'create new'}
            </p>
          )}
        </td>
        <td className="px-3 py-2.5 hidden sm:table-cell">
          <p className="text-sm text-muted-foreground truncate max-w-[130px]">{row.phone || '—'}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[130px]">{row.email || '—'}</p>
        </td>
        <td className="px-3 py-2.5 hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
          {scheduleLabel}
        </td>
        <td className="px-3 py-2.5 text-sm whitespace-nowrap">
          {row.nextServiceDate ? fmtDate(row.nextServiceDate) : (
            <span className="text-destructive text-xs italic">Missing</span>
          )}
        </td>
        <td className="pr-3 py-2.5 w-8">
          {row.expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>
      {row.expanded && (
        <tr className="border-b bg-muted/10">
          <td colSpan={6} className="px-4 py-4">
            <RowEditor row={row} onUpdate={onUpdate} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportClient() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [checkingDups, setCheckingDups] = useState(false);
  const [importResult, setImportResult] = useState<{
    customersCreated: number;
    contractsCreated: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = buildRows(text);
    if (!parsed.length) {
      toast.error('No data rows found in the CSV.');
      return;
    }
    setRows(parsed);
    setStep('preview');

    // Auto-check duplicates
    setCheckingDups(true);
    try {
      const result = await checkDuplicates(parsed.map(r => r.customerName));
      if (result.success) {
        setRows(prev =>
          prev.map((row, i) => {
            const dup = result.results[i];
            return dup
              ? { ...row, duplicate: { id: dup.id, name: dup.name }, duplicateAction: 'skip' }
              : row;
          })
        );
      }
    } finally {
      setCheckingDups(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'text/csv' || file?.name?.endsWith('.csv')) {
      processFile(file);
    } else {
      toast.error('Please upload a CSV file.');
    }
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  }, [processFile]);

  const updateRow = useCallback((index: number, updates: Partial<EditableRow>) => {
    setRows(prev =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, ...updates };
        if ('servicesPerYear' in updates) {
          const intervals = getIntervals(Number(updates.servicesPerYear));
          if (intervals) {
            updated.serviceIntervalMonths = intervals.serviceIntervalMonths;
            updated.billingIntervalMonths = intervals.billingIntervalMonths;
          }
        }
        const { errors, warnings } = validate(updated);
        updated.errors = errors;
        updated.warnings = warnings;
        return updated;
      })
    );
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setRows(prev =>
      prev.map((row, i) => ({
        ...row,
        expanded: i === index ? !row.expanded : false,
      }))
    );
  }, []);

  const handleImport = useCallback(async () => {
    const toImport: ImportRow[] = rows
      .filter(r => r.errors.length === 0 && r.duplicateAction !== 'skip')
      .map(r => ({
        customerName: r.customerName,
        address: {
          line1: r.addressLine1,
          city: r.addressCity,
          postcode: r.addressPostcode,
          country: 'United Kingdom',
        },
        phone: r.phone,
        email: r.email,
        contractTitle: r.contractTitle || 'Annual Service',
        serviceIntervalMonths: r.serviceIntervalMonths,
        billingIntervalMonths: r.billingIntervalMonths,
        standardPricePence:
          r.priceGbp && !isNaN(Number(r.priceGbp))
            ? Math.round(Number(r.priceGbp) * 100)
            : null,
        lastServiceDate: r.lastServiceDate || null,
        nextServiceDate: r.nextServiceDate,
        lastPaymentDate: r.lastPaymentDate || null,
        nextInvoiceDate: r.nextInvoiceDate || null,
        notes: r.notes,
        duplicateAction: r.duplicateAction,
        existingCustomerId: r.duplicate?.id ?? null,
      }));

    if (!toImport.length) {
      toast.error('No valid rows to import.');
      return;
    }

    setStep('importing');
    const result = await bulkImport(toImport);
    setImportResult({
      customersCreated: result.customersCreated,
      contractsCreated: result.contractsCreated,
      errors: result.errors,
    });
    setStep('done');
  }, [rows]);

  const readyCnt = rows.filter(r => r.errors.length === 0 && r.duplicateAction !== 'skip').length;
  const errorCnt = rows.filter(r => r.errors.length > 0).length;
  const dupCnt = rows.filter(r => r.duplicate !== null).length;

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    return (
      <Card>
        <CardContent className="py-14 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">Import complete</h2>
            <p className="text-muted-foreground mt-1">
              {importResult.customersCreated} customer{importResult.customersCreated !== 1 ? 's' : ''} and{' '}
              {importResult.contractsCreated} contract{importResult.contractsCreated !== 1 ? 's' : ''} created.
            </p>
          </div>
          {importResult.errors.length > 0 && (
            <div className="text-left max-w-sm mx-auto mt-2">
              <p className="text-sm font-medium text-destructive mb-1">
                {importResult.errors.length} row{importResult.errors.length !== 1 ? 's' : ''} failed:
              </p>
              <ul className="text-sm text-muted-foreground space-y-0.5">
                {importResult.errors.map((e, i) => (
                  <li key={i} className="truncate">· {e}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={() => router.push('/customers')} className="mt-2 h-11">
            View customers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Importing ───────────────────────────────────────────────────────────────
  if (step === 'importing') {
    return (
      <Card>
        <CardContent className="py-14 text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">Importing…</p>
        </CardContent>
      </Card>
    );
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-14 text-center transition-colors cursor-pointer',
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

        <div className="space-y-3 text-sm text-muted-foreground max-w-lg">
          <p className="font-medium text-foreground">Expected columns:</p>
          <p className="font-mono text-xs bg-muted rounded px-3 py-2 break-all">
            customer_name, address, phone, email, services_per_year, price_gbp, last_service_date, next_service_date, last_payment_date, next_invoice_date, notes
          </p>
          <p>Dates accepted as <code className="bg-muted px-1 rounded">YYYY-MM-DD</code> or <code className="bg-muted px-1 rounded">DD/MM/YYYY</code>. Only <code className="bg-muted px-1 rounded">customer_name</code> and <code className="bg-muted px-1 rounded">next_service_date</code> are required.</p>
        </div>

        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="h-4 w-4" />
          Download template CSV
        </Button>
      </div>
    );
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm flex items-center gap-1.5 text-green-600 font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {readyCnt} ready to import
        </span>
        {errorCnt > 0 && (
          <span className="text-sm flex items-center gap-1.5 text-destructive font-medium">
            <XCircle className="h-4 w-4" />
            {errorCnt} with errors — click to fix
          </span>
        )}
        {checkingDups ? (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking for duplicates…
          </span>
        ) : dupCnt > 0 ? (
          <span className="text-sm flex items-center gap-1.5 text-amber-600 font-medium">
            <AlertCircle className="h-4 w-4" />
            {dupCnt} duplicate{dupCnt !== 1 ? 's' : ''} found
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setRows([]); setStep('upload'); }}
          >
            Start over
          </Button>
          <Button
            onClick={handleImport}
            disabled={readyCnt === 0 || checkingDups}
            className="h-9"
          >
            Import {readyCnt} row{readyCnt !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-8 pl-3 py-2.5" />
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Customer</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 hidden sm:table-cell">Contact</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 hidden md:table-cell">Schedule</th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2.5">Next service</th>
                <th className="w-8 pr-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <RowItem
                  key={i}
                  row={row}
                  onExpand={() => toggleExpand(i)}
                  onUpdate={u => updateRow(i, u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
