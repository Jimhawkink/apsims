export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const WRITE_ROLES = ['Admin', 'Teacher'];

// ─── DELETE /api/lms/resources/[id] ──────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!WRITE_ROLES.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Teacher or Admin role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });

  const supabase = getServiceClient();

  // Soft-delete by setting is_active = false
  const { error } = await supabase
    .from('school_lms_resources')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: 'Resource deleted successfully' });
}
