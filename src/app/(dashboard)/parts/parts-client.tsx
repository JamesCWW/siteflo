'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PartForm } from '@/components/parts/part-form';
import { deactivatePart } from '@/actions/parts';
import { formatPence } from '@/lib/utils/money';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Package, Clock } from 'lucide-react';
import { PartsImportModal } from '@/components/parts/parts-import-modal';

type Part = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  type: 'part' | 'labour';
  unitPrice: number;
  unit: string | null;
  isActive: boolean;
};

interface PartsClientProps {
  parts: Part[];
}

export function PartsClient({ parts }: PartsClientProps) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeactivate = async (id: string) => {
    setDeleting(id);
    await deactivatePart(id);
    setDeleting(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Parts library</h1>
        <div className="flex gap-2">
          <PartsImportModal />
          <Button className="h-12" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add item
          </Button>
        </div>
      </div>

      {parts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No items yet</p>
          <p className="text-sm mt-1">
            Add parts and labour to quickly populate invoices and quotes.
          </p>
          <Button className="mt-4 h-12" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add first item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {parts.map(part => (
            <Card key={part.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0 text-muted-foreground">
                      {part.type === 'labour' ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{part.name}</span>
                        {part.category && (
                          <Badge variant="outline" className="text-xs">{part.category}</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs capitalize">{part.type}</Badge>
                      </div>
                      {part.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{part.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-2">
                      <p className="font-semibold text-sm">{formatPence(part.unitPrice)}</p>
                      <p className="text-xs text-muted-foreground">per {part.unit ?? 'each'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setEditing(part)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeactivate(part.id)}
                      disabled={deleting === part.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New part dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to parts library</DialogTitle>
          </DialogHeader>
          <PartForm onSuccess={() => setShowNew(false)} onCancel={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit part dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          {editing && (
            <PartForm
              part={editing}
              onSuccess={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
