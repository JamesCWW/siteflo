'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImportClient } from '@/components/import/import-client';
import { Upload } from 'lucide-react';

export function CustomerBulkImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" className="h-12" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Bulk import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import customers</DialogTitle>
          </DialogHeader>
          <ImportClient />
        </DialogContent>
      </Dialog>
    </>
  );
}
