'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignaturePadComponent } from './signature-pad';
import { PhotoCapture } from './photo-capture';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import type { ServiceFieldDefinition } from '@/db/schema/service-templates';

interface DynamicFormProps {
  fields: ServiceFieldDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  jobId?: string;
}

export function DynamicForm({ fields, values, onChange, disabled, jobId }: DynamicFormProps) {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

  const set = (id: string, value: unknown) => {
    onChange({ ...values, [id]: value });
  };

  return (
    <div className="space-y-5">
      {sorted.map((field) => {
        if (field.type === 'section-header') {
          return (
            <div key={field.id} className="pt-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {field.label}
              </p>
              {field.subheading && (
                <p className="text-xs text-muted-foreground mt-0.5">{field.subheading}</p>
              )}
              <Separator className="mt-1" />
            </div>
          );
        }

        const current = values[field.id];

        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
              {field.unit && (
                <span className="text-muted-foreground font-normal ml-1">({field.unit})</span>
              )}
            </Label>

            {field.type === 'text' && (
              <Input
                id={field.id}
                className="h-12"
                placeholder={field.placeholder}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.id, e.target.value)}
                disabled={disabled}
              />
            )}

            {field.type === 'number' && (
              <div className="relative">
                <Input
                  id={field.id}
                  type="number"
                  className="h-12"
                  placeholder={field.placeholder}
                  value={typeof current === 'number' ? current : ''}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  onChange={(e) => set(field.id, e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={disabled}
                />
                {field.unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    {field.unit}
                  </span>
                )}
              </div>
            )}

            {field.type === 'textarea' && (
              <Textarea
                id={field.id}
                placeholder={field.placeholder}
                value={typeof current === 'string' ? current : ''}
                rows={3}
                onChange={(e) => set(field.id, e.target.value)}
                disabled={disabled}
              />
            )}

            {field.type === 'date' && (
              <Input
                id={field.id}
                type="date"
                className="h-12"
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.id, e.target.value)}
                disabled={disabled}
              />
            )}

            {field.type === 'boolean' && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => set(field.id, true)}
                  disabled={disabled}
                  className={`
                    flex-1 h-12 rounded-lg border-2 text-sm font-semibold transition-colors
                    ${current === true
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-background border-input text-foreground hover:border-green-400'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => set(field.id, false)}
                  disabled={disabled}
                  className={`
                    flex-1 h-12 rounded-lg border-2 text-sm font-semibold transition-colors
                    ${current === false
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-background border-input text-foreground hover:border-red-400'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  No
                </button>
              </div>
            )}

            {field.type === 'select' && (
              <Select
                value={typeof current === 'string' ? current : ''}
                onValueChange={(v) => set(field.id, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={field.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'checkbox-group' && (
              <div className="space-y-1">
                {(field.options ?? []).map((opt) => {
                  const checked = Array.isArray(current) && (current as string[]).includes(opt);
                  const toggle = () => {
                    if (disabled) return;
                    const prev = Array.isArray(current) ? (current as string[]) : [];
                    set(field.id, checked ? prev.filter((v) => v !== opt) : [...prev, opt]);
                  };
                  return (
                    <label
                      key={opt}
                      className={`
                        w-full flex items-center gap-3 min-h-12 px-4 rounded-lg border text-left transition-colors
                        ${checked
                          ? 'border-primary bg-primary/5'
                          : 'border-input bg-background hover:border-primary/40'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={toggle}
                        disabled={disabled}
                        className="flex-shrink-0"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {field.type === 'signature' && (
              <SignaturePadComponent
                value={typeof current === 'string' ? current : undefined}
                onChange={(v) => set(field.id, v ?? '')}
              />
            )}

            {field.type === 'photo' && (
              <PhotoCapture
                value={
                  Array.isArray(current)
                    ? (current as string[])
                    : typeof current === 'string' && current
                      ? [current]
                      : []
                }
                onChange={(v) => set(field.id, v)}
                jobId={jobId}
                fieldId={field.id}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
