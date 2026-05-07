import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/academic-events ───
// Query params: month (0-11), year, form_id
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const form_id = searchParams.get('form_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_academic_events')
    .select('*')
    .order('start_date', { ascending: true });

  if (month !== null && year) {
    const m = Number(month);
    const y = Number(year);
    const startOfMonth = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const endOfMonth = new Date(y, m + 1, 0).toISOString().split('T')[0];
    query = query.gte('start_date', startOfMonth).lte('start_date', endOfMonth);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by form_id client-side (target_audience is JSONB array or 'All')
  let events = data || [];
  if (form_id) {
    events = events.filter((e: any) => {
      if (!e.target_audience || e.target_audience === 'All' || e.target_audience === 'all') return true;
      if (Array.isArray(e.target_audience)) return e.target_audience.includes(Number(form_id));
      return true;
    });
  }

  return NextResponse.json({ data: events });
}

// ─── POST /api/academic-events ───
// Restrict to Admin/Principal
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!['Admin', 'Principal'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { title, event_type, start_date, end_date, description, target_audience, color_code } = body;

  if (!title?.trim() || !event_type || !start_date) {
    return NextResponse.json({ error: 'title, event_type, and start_date are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_academic_events')
    .insert([{
      title: title.trim(),
      event_type,
      start_date,
      end_date: end_date || start_date,
      description: description?.trim() || null,
      target_audience: target_audience || 'All',
      color_code: color_code || null,
      created_by: session.id,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
