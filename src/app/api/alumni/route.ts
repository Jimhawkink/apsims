import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/alumni ───
// Query params: year, occupation, search (name)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const occupation = searchParams.get('occupation');
  const search = searchParams.get('search');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_alumni')
    .select(`
      *,
      school_students (
        id,
        first_name,
        last_name,
        admission_number,
        admission_no
      )
    `)
    .order('graduation_year', { ascending: false });

  if (year) query = query.eq('graduation_year', Number(year));
  if (occupation) query = query.eq('current_occupation', occupation);
  if (search) {
    query = query.or(`full_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/alumni ───
// Create alumni record; restrict to Admin/Principal
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

  const { student_id, full_name, graduation_year, current_occupation, employer_university, city_county, email, phone } = body;

  if (!full_name?.trim() || !graduation_year) {
    return NextResponse.json({ error: 'full_name and graduation_year are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_alumni')
    .insert([{
      student_id: student_id ? Number(student_id) : null,
      full_name: full_name.trim(),
      graduation_year: Number(graduation_year),
      current_occupation: current_occupation || 'Unknown',
      employer_university: employer_university?.trim() || null,
      city_county: city_county?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
