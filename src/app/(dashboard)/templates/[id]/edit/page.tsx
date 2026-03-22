import { notFound } from 'next/navigation';
import { getTemplate } from '@/actions/templates';
import { TemplateBuilder } from '@/components/templates/template-builder';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getTemplate(id);

  if (!result.success || !result.data) notFound();

  const template = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit template</h1>
        <p className="text-muted-foreground text-sm mt-1">{template.name}</p>
      </div>
      <TemplateBuilder
        templateId={id}
        initialName={template.name}
        initialDescription={template.description ?? ''}
        initialCategory={template.category ?? ''}
        initialFields={template.fieldSchema}
        initialPdfConfig={template.pdfConfig}
      />
    </div>
  );
}
