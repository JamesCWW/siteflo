'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { saveJobFieldValues } from '@/actions/jobs';
import type { ServiceFieldDefinition } from '@/db/schema/service-templates';
import { Save, CheckCircle } from 'lucide-react';

interface DynamicFormSectionProps {
  jobId: string;
  fields: ServiceFieldDefinition[];
  initialValues: Record<string, unknown>;
  canEdit: boolean;
}

export function DynamicFormSection({
  jobId, fields, initialValues, canEdit,
}: DynamicFormSectionProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [isSaving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    startSave(async () => {
      setError(null);
      const result = await saveJobFieldValues(jobId, values);
      if (result.success) {
        setSavedAt(new Date());
      } else {
        setError(result.error ?? 'Failed to save');
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Service record</CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            {savedAt && !isSaving && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            <Button
              size="sm"
              className="h-9"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}
        <DynamicForm
          fields={fields}
          values={values}
          onChange={setValues}
          disabled={!canEdit}
        />
      </CardContent>
    </Card>
  );
}
