'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { saveJobFieldValues } from '@/actions/jobs';
import type { ServiceFieldDefinition } from '@/db/schema/service-templates';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, X } from 'lucide-react';

interface Step {
  name: string;
  fields: ServiceFieldDefinition[];
}

function getSteps(fields: ServiceFieldDefinition[]): Step[] {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

  // Check if any fields have explicit group property
  const hasGroups = sorted.some(f => f.group && f.group.trim() !== '');

  if (hasGroups) {
    const groupMap = new Map<string, ServiceFieldDefinition[]>();
    const order: string[] = [];
    for (const field of sorted) {
      const group = field.group ?? 'Details';
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
        order.push(group);
      }
      groupMap.get(group)!.push(field);
    }
    return order.map(g => ({ name: g, fields: groupMap.get(g)! }));
  }

  // Fall back: split by section-header fields
  const sections: Step[] = [];
  let current: Step = { name: 'Details', fields: [] };

  for (const field of sorted) {
    if (field.type === 'section-header') {
      if (current.fields.filter(f => f.type !== 'section-header').length > 0) {
        sections.push(current);
      }
      current = { name: field.label, fields: [field] };
    } else {
      current.fields.push(field);
    }
  }
  if (current.fields.filter(f => f.type !== 'section-header').length > 0) {
    sections.push(current);
  }

  return sections.length > 0 ? sections : [{ name: 'Service Record', fields: sorted }];
}

interface ServiceWizardModalProps {
  jobId: string;
  templateName: string;
  fields: ServiceFieldDefinition[];
  initialValues: Record<string, unknown>;
  open: boolean;
  onClose: (saved: boolean) => void;
}

export function ServiceWizardModal({
  jobId,
  templateName,
  fields,
  initialValues,
  open,
  onClose,
}: ServiceWizardModalProps) {
  const steps = getSteps(fields);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step = steps[currentStep] ?? steps[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const saveStep = async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await saveJobFieldValues(jobId, values);
      if (result.success) {
        setSavedAt(new Date());
        return true;
      }
      setError(result.error ?? 'Failed to save');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveStep();
    if (saved) setCurrentStep(s => s + 1);
  };

  const handleSaveReport = async () => {
    const saved = await saveStep();
    if (saved) onClose(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-full h-[90dvh] flex flex-col p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate pr-4">
              {templateName}
            </p>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 mb-3">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{step.name}</h2>
            <span className="text-sm text-muted-foreground shrink-0">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div className="mb-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
          <DynamicForm
            fields={step.fields}
            values={values}
            onChange={setValues}
            jobId={jobId}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t shrink-0 space-y-2">
          {savedAt && !isSaving && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Saved
            </p>
          )}
          <div className="flex gap-3">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => setCurrentStep(s => s - 1)}
                disabled={isSaving}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                type="button"
                className="h-12 flex-1"
                onClick={handleSaveReport}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving…' : 'Save report'}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-12 flex-1"
                onClick={handleNext}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isSaving ? 'Saving…' : 'Next'}
                {!isSaving && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
