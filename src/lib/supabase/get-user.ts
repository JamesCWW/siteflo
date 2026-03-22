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

  try {
    const result = await db.select().from(users).where(eq(users.authId, authUser.id)).limit(1);
    console.log('DB QUERY RESULT:', JSON.stringify(result));
    const user = result[0];

    if (!user) {
      console.log('NO USER ROW FOUND for authId:', authUser.id);
      redirect('/login');
    }

    return user;
  } catch (dbError) {
    console.error('DB QUERY FAILED:', dbError);
    redirect('/login');
  }
}
