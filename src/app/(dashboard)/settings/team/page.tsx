import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTeamMembers } from '@/actions/team';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { TeamClient } from './team-client';

export default async function TeamPage() {
  const [user, teamResult] = await Promise.all([
    getCurrentUser(),
    getTeamMembers(),
  ]);

  const members = teamResult.data ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground mt-1">Manage who has access to your Siteflo account.</p>
      </div>

      <TeamClient
        members={members.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          email: m.email,
          role: m.role,
          isActive: m.isActive,
        }))}
        currentUserId={user.id}
      />
    </div>
  );
}
