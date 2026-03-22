import { NextRequest, NextResponse } from 'next/server';
import { runContractRenewalChecks } from '@/lib/automation/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    const result = await runContractRenewalChecks();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('contract-renewal cron failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
