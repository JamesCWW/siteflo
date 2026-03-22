import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/logout-button';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6">
      <div className="md:hidden">
        <h1 className="font-bold">Siteflo</h1>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <span className="text-sm text-muted-foreground hidden sm:block">
          {user?.email}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
