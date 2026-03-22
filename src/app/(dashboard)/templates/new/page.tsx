import { TemplateBuilder } from '@/components/templates/template-builder';

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New template</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define the form fields for a service record or certificate
        </p>
      </div>
      <TemplateBuilder />
    </div>
  );
}
