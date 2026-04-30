import { NextRequest, NextResponse } from 'next/server';
import { clearSession, getSession, auditLog } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (session) {
    await auditLog({
      action: 'logout',
      actor_id: session.id,
      actor_name: session.username,
      actor_role: session.role,
      ip_address: ip,
    });
  }

  await clearSession();
  return NextResponse.json({ success: true });
}
