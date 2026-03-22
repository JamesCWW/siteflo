import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Header } from '@/components/layout/header';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { db } from '@/db/client';
import { users, tenants } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch brand colour for CSS variable injection
  let primaryColor = '#2563eb';
  try {
    const [userRow] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.authId, user.id))
      .limit(1);

    if (userRow) {
      const [tenant] = await db
        .select({ branding: tenants.branding })
        .from(tenants)
        .where(eq(tenants.id, userRow.tenantId))
        .limit(1);
      if (tenant?.branding?.primaryColor) {
        primaryColor = tenant.branding.primaryColor;
      }
    }
  } catch {
    // Non-fatal: fall back to default colour
  }

  return (
    <div className="min-h-screen bg-background">
      <style>{`:root { --brand-color: ${primaryColor}; }`}</style>
      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main content */}
      <div className="md:pl-64">
        <Header />
        <main className="px-4 py-6 pb-20 md:pb-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav className="md:hidden" />
      <Toaster richColors position="top-right" />
    </div>
  );
}
