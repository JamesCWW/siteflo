'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateContractStatus } from '@/actions/contracts';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Status = 'active' | 'paused' | 'expired' | 'cancelled';

const TRANSITIONS: Record<Status, { value: Status; label: string }[]> = {
  active: [
    { value: 'paused', label: 'Pause contract' },
    { value: 'cancelled', label: 'Cancel contract' },
  ],
  paused: [
    { value: 'active', label: 'Reactivate contract' },
    { value: 'cancelled', label: 'Cancel contract' },
  ],
  expired: [
    { value: 'active', label: 'Reactivate contract' },
  ],
  cancelled: [
    { value: 'active', label: 'Reactivate contract' },
  ],
};

export function ContractStatusActions({
  contractId,
  currentStatus,
}: {
  contractId: string;
  currentStatus: Status;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const options = TRANSITIONS[currentStatus] ?? [];

  if (options.length === 0) return null;

  const handleAction = async (status: Status) => {
    setLoading(true);
    const result = await updateContractStatus(contractId, status);
    setLoading(false);
    if (result.success) router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-12 shrink-0" disabled={loading}>
          Actions
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => handleAction(opt.value)}
            className="cursor-pointer"
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
