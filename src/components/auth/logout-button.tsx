'use client';

import { Button } from '@/components/ui/button';
import { logout } from '@/actions/auth';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" size="sm" type="submit" className="h-9 gap-2">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
