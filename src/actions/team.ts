'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/get-user';
import { createClient } from '@/lib/supabase/server';

export async function getTeamMembers() {
  try {
    const user = await getCurrentUser();
    const data = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, user.tenantId))
      .orderBy(asc(users.createdAt));

    return { success: true, data };
  } catch (error) {
    console.error('getTeamMembers failed:', error);
    return { success: false, error: 'Failed to load team', data: [] };
  }
}

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'technician']),
});

export async function inviteTeamMember(input: unknown) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Only owners and admins can invite team members' };
    }

    const parsed = InviteSchema.parse(input);

    // Check if already a member
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, currentUser.tenantId), eq(users.email, parsed.email)))
      .limit(1);

    if (existing) return { success: false, error: 'This email is already a team member' };

    // Send magic link via Supabase OTP — creates auth user on first sign-in
    // The invited user will complete registration through the normal login flow.
    // Their users row will need to be created post-sign-in (handled by onboarding).
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      console.error('OTP invite error:', error);
      return { success: false, error: 'Failed to send invite email' };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: 'Invalid input' };
    console.error('inviteTeamMember failed:', error);
    return { success: false, error: 'Failed to send invite' };
  }
}

export async function updateMemberRole(memberId: string, role: 'admin' | 'technician') {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Only owners and admins can change roles' };
    }
    if (memberId === currentUser.id) {
      return { success: false, error: 'You cannot change your own role' };
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(and(eq(users.id, memberId), eq(users.tenantId, currentUser.tenantId)))
      .returning({ id: users.id });

    if (!updated) return { success: false, error: 'Member not found' };

    revalidatePath('/settings/team');
    return { success: true };
  } catch (error) {
    console.error('updateMemberRole failed:', error);
    return { success: false, error: 'Failed to update role' };
  }
}

export async function deactivateMember(memberId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Only owners and admins can deactivate members' };
    }
    if (memberId === currentUser.id) {
      return { success: false, error: 'You cannot deactivate yourself' };
    }

    const [updated] = await db
      .update(users)
      .set({ isActive: false })
      .where(and(eq(users.id, memberId), eq(users.tenantId, currentUser.tenantId)))
      .returning({ id: users.id });

    if (!updated) return { success: false, error: 'Member not found' };

    revalidatePath('/settings/team');
    return { success: true };
  } catch (error) {
    console.error('deactivateMember failed:', error);
    return { success: false, error: 'Failed to deactivate member' };
  }
}

export async function reactivateMember(memberId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.role !== 'owner' && currentUser.role !== 'admin') {
      return { success: false, error: 'Only owners and admins can reactivate members' };
    }

    const [updated] = await db
      .update(users)
      .set({ isActive: true })
      .where(and(eq(users.id, memberId), eq(users.tenantId, currentUser.tenantId)))
      .returning({ id: users.id });

    if (!updated) return { success: false, error: 'Member not found' };

    revalidatePath('/settings/team');
    return { success: true };
  } catch (error) {
    console.error('reactivateMember failed:', error);
    return { success: false, error: 'Failed to reactivate member' };
  }
}
