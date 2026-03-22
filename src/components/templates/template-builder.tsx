'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { createTemplate, updateTemplate } from '@/actions/templates';
import type { ServiceFieldDefinition } from '@/db/schema/service-templates';
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, GripVertical, CheckCircle, X,
} from 'lucide-react';

const FIELD_TYPES: { value: ServiceFieldDefinition['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox-group', label: 'Checkbox group' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Long text' },
  { value: 'signature', label: 'Signature' },
  { value: 'photo', label: 'Photo' },
];

type PdfConfig = {
  title: string;
  showLogo: boolean;
  showSignature: boolean;
  headerText?: string;
  footerText?: string;
  layout: 'single-column' | 'two-column';
};

interface TemplateBuilderProps {
  templateId?: string;
  initialName?: string;
  initialDescription?: string;
  initialCategory?: string;
  initialFields?: ServiceFieldDefinition[];
  initialPdfConfig?: PdfConfig;
}

function makeField(sortOrder: number): ServiceFieldDefinition {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    type: 'text',
    required: false,
    sortOrder,
  };
}

export function TemplateBuilder({
  templateId,
  initialName = '',
  initialDescription = '',
  initialCategory = '',
  initialFields = [],
  initialPdfConfig = {
    title: '',
    showLogo: true,
    showSignature: false,
    layout: 'single-column',
  },
}: TemplateBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory);
  const [fields, setFields] = useState<ServiceFieldDefinition[]>(initialFields);
  const [pdfConfig, setPdfConfig] = useState<PdfConfig>(initialPdfConfig);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addField = useCallback(() => {
    const newField = makeField(fields.length);
    setFields((prev) => [...prev, newField]);
    setExpandedId(newField.id);
  }, [fields.length]);

  const addDivider = useCallback(() => {
    const newField: ServiceFieldDefinition = {
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: 'Section',
      type: 'section-header',
      required: false,
      sortOrder: fields.length,
    };
    setFields((prev) => [...prev, newField]);
    setExpandedId(newField.id);
  }, [fields.length]);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  }, [expandedId]);

  const updateField = useCallback((id: string, patch: Partial<ServiceFieldDefinition>) => {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const moveField = useCallback((id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((f, i) => ({ ...f, sortOrder: i }));
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required'); return; }
    if (!pdfConfig.title.trim()) { setError('PDF title is required'); return; }

    const labelled = fields.filter((f) => f.label.trim());
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      fieldSchema: labelled.map((f, i) => ({ ...f, sortOrder: i })),
      pdfConfig,
    };

    setIsSaving(true);
    setError(null);

    const result = templateId
      ? await updateTemplate(templateId, payload)
      : await createTemplate(payload);

    setIsSaving(false);
    if (result.success) {
      router.push('/templates');
      router.refresh();
    } else {
      setError(result.error ?? 'Something went wrong');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Template metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              className="h-12"
              placeholder="e.g. Gas Safety Certificate"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                className="h-12"
                placeholder="e.g. Inspection, Install"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdfTitle">PDF title <span className="text-destructive">*</span></Label>
              <Input
                id="pdfTitle"
                className="h-12"
                placeholder="e.g. Gas Safety Record"
                value={pdfConfig.title}
                onChange={(e) => setPdfConfig((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="What is this template for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pdfConfig.showLogo}
                onChange={(e) => setPdfConfig((p) => ({ ...p, showLogo: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">Show logo on PDF</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pdfConfig.showSignature}
                onChange={(e) => setPdfConfig((p) => ({ ...p, showSignature: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">Require signature on PDF</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm">PDF layout:</span>
              <Select
                value={pdfConfig.layout}
                onValueChange={(v) => setPdfConfig((p) => ({ ...p, layout: v as PdfConfig['layout'] }))}
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single-column">Single column</SelectItem>
                  <SelectItem value="two-column">Two column</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Form fields</h2>
          <Badge variant="outline">{fields.filter((f) => f.label.trim()).length} fields</Badge>
        </div>

        {fields.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No fields yet. Add your first field below.
            </CardContent>
          </Card>
        )}

        {fields.map((field, idx) => (
          <FieldRow
            key={field.id}
            field={field}
            isExpanded={expandedId === field.id}
            isFirst={idx === 0}
            isLast={idx === fields.length - 1}
            onToggle={() => setExpandedId(expandedId === field.id ? null : field.id)}
            onUpdate={(patch) => updateField(field.id, patch)}
            onRemove={() => removeField(field.id)}
            onMoveUp={() => moveField(field.id, -1)}
            onMoveDown={() => moveField(field.id, 1)}
          />
        ))}

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" className="h-12" onClick={addField}>
            <Plus className="h-4 w-4 mr-2" />
            Add field
          </Button>
          <Button type="button" variant="outline" className="h-12" onClick={addDivider}>
            <Plus className="h-4 w-4 mr-2" />
            Add divider
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Button className="h-12 px-8" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : templateId ? 'Save changes' : 'Create template'}
        </Button>
        <Button variant="outline" className="h-12" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface FieldRowProps {
  field: ServiceFieldDefinition;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<ServiceFieldDefinition>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldRow({
  field, isExpanded, isFirst, isLast,
  onToggle, onUpdate, onRemove, onMoveUp, onMoveDown,
}: FieldRowProps) {
  // Section dividers get their own simplified UI
  if (field.type === 'section-header') {
    return (
      <div className="rounded-lg border border-l-4 border-l-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <button type="button" className="flex-1 text-left" onClick={onToggle}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {field.label.trim() || <span className="text-muted-foreground italic font-normal">Untitled section</span>}
              </span>
              {field.subheading && (
                <span className="text-xs text-muted-foreground truncate max-w-48">{field.subheading}</span>
              )}
              <Badge variant="outline" className="text-xs ml-1 shrink-0">Divider</Badge>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveUp} disabled={isFirst}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveDown} disabled={isLast}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onToggle}>
              <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Heading text</Label>
              <Input
                className="h-10 font-medium"
                placeholder="e.g. Boiler Details"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sub-heading <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                className="h-10"
                placeholder="e.g. Fill in all appliance information below"
                value={field.subheading ?? ''}
                onChange={(e) => onUpdate({ subheading: e.target.value || undefined })}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  const typeLabel = FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type;

  return (
    <Card>
      <div className="flex items-center gap-2 px-4 py-3">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <button type="button" className="flex-1 text-left" onClick={onToggle}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {field.label.trim() || <span className="text-muted-foreground italic">Untitled field</span>}
            </span>
            <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
            {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveUp} disabled={isFirst}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveDown} disabled={isLast}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onToggle}>
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 border-t space-y-4">
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Label *</Label>
              <Input
                className="h-10"
                placeholder="e.g. Gas pressure inlet"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Field type *</Label>
              <Select
                value={field.type}
                onValueChange={(v) => onUpdate({ type: v as ServiceFieldDefinition['type'] })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Placeholder</Label>
              <Input
                className="h-10"
                placeholder="Hint text..."
                value={field.placeholder ?? ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Group name</Label>
              <Input
                className="h-10"
                placeholder="e.g. Appliance 1"
                value={field.group ?? ''}
                onChange={(e) => onUpdate({ group: e.target.value || undefined })}
              />
              <p className="text-[11px] text-muted-foreground leading-snug">
                Group fields under a shared heading on the form. Fields with the same group name appear together under that heading.
              </p>
            </div>
          </div>

          {field.type === 'number' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Unit</Label>
                <Input
                  className="h-10"
                  placeholder="e.g. mbar"
                  value={field.unit ?? ''}
                  onChange={(e) => onUpdate({ unit: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min value</Label>
                <Input
                  className="h-10"
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max value</Label>
                <Input
                  className="h-10"
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) => onUpdate({
                    validation: {
                      ...field.validation,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })}
                />
              </div>
            </div>
          )}

          {(field.type === 'select' || field.type === 'checkbox-group') && (
            <div className="space-y-1.5">
              <Label className="text-xs">Options</Label>
              <OptionsEditor
                options={field.options ?? []}
                onChange={(opts) => onUpdate({ options: opts })}
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">Required field</span>
          </label>
        </CardContent>
      )}
    </Card>
  );
}

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const [items, setItems] = useState<string[]>(() => {
    const base = [...options];
    while (base.length < 5) base.push('');
    return base;
  });

  const update = (idx: number, value: string) => {
    const next = [...items];
    next[idx] = value;
    setItems(next);
    onChange(next.filter((s) => s.trim()));
  };

  const remove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    const filled = next.length ? next : [''];
    setItems(filled);
    onChange(filled.filter((s) => s.trim()));
  };

  const add = () => setItems((prev) => [...prev, '']);

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            className="h-9 flex-1"
            placeholder={`Option ${idx + 1}`}
            value={item}
            onChange={(e) => update(idx, e.target.value)}
          />
          {item.trim() ? (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => remove(idx)}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
      >
        <Plus className="h-3.5 w-3.5" />
        Add option
      </button>
    </div>
  );
}
