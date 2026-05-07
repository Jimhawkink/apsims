import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/admissions/applications ───
// Restricted to Admin/Principal
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const form_id = searchParams.get('form_id');
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_admission_applications')
    .select(`
      *,
      school_forms (id, form_name)
    `)
    .order('submitted_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (form_id) query = query.eq('form_applied_for', Number(form_id));
  if (date_from) query = query.gte('submitted_at', `${date_from}T00:00:00.000Z`);
  if (date_to) query = query.lte('submitted_at', `${date_to}T23:59:59.999Z`);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

