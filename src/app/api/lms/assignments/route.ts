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

// ─── GET /api/lms/assignments ─────────────────────────────────────────────────
// Query params: form_id, subject_id
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!WRITE_ROLES.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Teacher or Admin role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const form_id = searchParams.get('form_id');
  const subject_id = searchParams.get('subject_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_lms_assignments')
    .select(`
      *,
      school_subjects(id, subject_name),
      school_forms(id, form_name),
      school_streams(id, stream_name),
      school_lms_submissions(id)
    `)
    .eq('is_active', true)
    .order('due_date', { ascending: false });

  if (form_id) query = query.eq('form_id', Number(form_id));
  if (subject_id) query = query.eq('subject_id', Number(subject_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute submission count and grading status per assignment
  const enriched = (data || []).map((a: any) => {
    const submissions: any[] = a.school_lms_submissions || [];
    return {
      ...a,
      submission_count: submissions.length,
      school_lms_submissions: undefined,
    };
  });

  return NextResponse.json({ data: enriched });
}

// ─── POST /api/lms/assignments ────────────────────────────────────────────────
// Body: subject_id, form_id, stream_id?, title, description?, due_date, max_marks, attachment_url?
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!WRITE_ROLES.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Teacher or Admin role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { subject_id, form_id, stream_id, title, description, due_date, max_marks, attachment_url } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!due_date) return NextResponse.json({ error: 'due_date is required' }, { status: 400 });
  if (max_marks === undefined || max_marks === null) {
    return NextResponse.json({ error: 'max_marks is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_lms_assignments')
    .insert([{
      tenant_id: session.tenant_id,
      subject_id: subject_id || null,
      form_id: form_id || null,
      stream_id: stream_id || null,
      title: title.trim(),
      description: description?.trim() || null,
      due_date,
      max_marks: Number(max_marks),
      attachment_url: attachment_url?.trim() || null,
      created_by: session.id,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}

