import { ImportClient } from '@/components/import/import-client';

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Import customers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bulk-import customers and service contracts from a CSV file.
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
