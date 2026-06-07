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

// ─── PATCH /api/lms/submissions/[id] ─────────────────────────────────────────
// Update submission_text and/or file_url (only before due date)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Fetch submission to verify ownership and get assignment
  const { data: submission, error: fetchError } = await supabase
    .from('school_lms_submissions')
    .select('id, student_id, assignment_id')
    .eq('id', id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Verify ownership (only the submitting student can edit)
  if (submission.student_id !== session.student_id && session.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden: You can only edit your own submission' }, { status: 403 });
  }

  // Check assignment due_date — cannot edit after due date
  const { data: assignment, error: assignmentError } = await supabase
    .from('school_lms_assignments')
    .select('due_date')
    .eq('id', submission.assignment_id)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const now = new Date();
  const dueDate = new Date(assignment.due_date);

  if (now > dueDate) {
    return NextResponse.json(
      { error: 'The due date has passed. Submissions can no longer be edited.' },
      { status: 403 }
    );
  }

  const updates: Record<string, any> = {};
  if (body.submission_text !== undefined) updates.submission_text = body.submission_text?.trim() || null;
  if (body.file_url !== undefined) updates.file_url = body.file_url?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('school_lms_submissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
