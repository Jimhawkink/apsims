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

// ─── POST /api/lms/grades ─────────────────────────────────────────────────────
// Body: submission_id, marks_awarded, teacher_comments?
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

  const { submission_id, marks_awarded, teacher_comments } = body;

  if (!submission_id) return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
  if (marks_awarded === undefined || marks_awarded === null) {
    return NextResponse.json({ error: 'marks_awarded is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Check if grade already exists (UNIQUE constraint on submission_id)
  const { data: existing } = await supabase
    .from('school_lms_grades')
    .select('id')
    .eq('submission_id', submission_id)
    .maybeSingle();

  if (existing) {
    // Update existing grade
    const { data, error } = await supabase
      .from('school_lms_grades')
      .update({
        marks_awarded: Number(marks_awarded),
        teacher_comments: teacher_comments?.trim() || null,
        graded_by: session.id,
        graded_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Insert new grade
  const { data, error } = await supabase
    .from('school_lms_grades')
    .insert([{
      submission_id,
      marks_awarded: Number(marks_awarded),
      teacher_comments: teacher_comments?.trim() || null,
      graded_by: session.id,
      graded_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}

