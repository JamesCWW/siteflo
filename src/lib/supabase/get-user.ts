import { createClient } from '@/lib/supabase/server';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  console.log('AUTH CHECK:', { hasUser: !!authUser, id: authUser?.id, error: authError?.message });

  if (!authUser) {
    redirect('/login');
  }

  // DB query is outside the try/catch so redirect() can propagate correctly.
  // next/navigation redirect() throws internally — catching it silently breaks it.
  let user: typeof users.$inferSelect | undefined;
  let dbError: unknown;
  try {
    const result = await db.select().from(users).where(eq(users.authId, authUser.id)).limit(1);
    console.log('DB QUERY RESULT:', JSON.stringify(result));
    user = result[0];
  } catch (err) {
    console.error('DB QUERY FAILED:', err);
    dbError = err;
  }

  if (dbError) {
    redirect('/login');
  }

  if (!user) {
    console.log('NO USER ROW FOUND for authId:', authUser.id);
    redirect('/login');
  }

  return user!;
}
