import { getParts } from '@/actions/parts';
import { PartsClient } from './parts-client';

export default async function PartsPage() {
  const result = await getParts();
  const parts = (result.data ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    type: 'part' | 'labour';
    unitPrice: number;
    unit: string | null;
    isActive: boolean;
  }>;

  return <PartsClient parts={parts} />;
}
