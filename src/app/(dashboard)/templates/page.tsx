import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTemplates, toggleTemplateActive } from '@/actions/templates';
import { Plus, FileText, Pencil } from 'lucide-react';
import { format } from 'date-fns';

export default async function TemplatesPage() {
  const result = await getTemplates();
  const templates = result.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dynamic forms for service records and certificates
          </p>
        </div>
        <Button asChild className="h-12">
          <Link href="/templates/new">
            <Plus className="h-4 w-4 mr-2" />
            New template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-semibold text-lg mb-2">No templates yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create a service template to define the form your technicians fill in on-site.
            </p>
            <Button asChild className="h-12">
              <Link href="/templates/new">
                <Plus className="h-4 w-4 mr-2" />
                Create first template
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className={template.isActive ? '' : 'opacity-60'}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                    {template.category && (
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    )}
                    {!template.isActive && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.fieldSchema.length} fields
                    {' · '}
                    Updated {format(new Date(template.updatedAt), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ToggleActiveButton
                    templateId={template.id}
                    isActive={template.isActive}
                  />
                  <Button asChild variant="outline" size="sm" className="h-9">
                    <Link href={`/templates/${template.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

async function ToggleActiveButton({ templateId, isActive }: { templateId: string; isActive: boolean }) {
  return (
    <form action={async () => {
      'use server';
      await toggleTemplateActive(templateId, !isActive);
    }}>
      <Button type="submit" variant="ghost" size="sm" className="h-9 text-xs">
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </form>
  );
}
