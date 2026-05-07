import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── POST /api/lms/submissions ────────────────────────────────────────────────
// Body: assignment_id, student_id, submission_text?, file_url?
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { assignment_id, student_id, submission_text, file_url } = body;

  if (!assignment_id) return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 });
  if (!student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 });

  const supabase = getServiceClient();

  // Check for existing submission (UNIQUE constraint)
  const { data: existing } = await supabase
    .from('school_lms_submissions')
    .select('id')
    .eq('assignment_id', assignment_id)
    .eq('student_id', student_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You have already submitted this assignment. Use the edit feature to update your submission.' },
      { status: 409 }
    );
  }

  // Fetch assignment to check due_date
  const { data: assignment, error: assignmentError } = await supabase
    .from('school_lms_assignments')
    .select('id, due_date')
    .eq('id', assignment_id)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  const is_late = now > dueDate;

  const { data, error } = await supabase
    .from('school_lms_submissions')
    .insert([{
      assignment_id,
      student_id,
      submission_text: submission_text?.trim() || null,
      file_url: file_url?.trim() || null,
      submitted_at: now.toISOString(),
      is_late,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
