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

// ─── GET /api/lms/assignments/[id]/submissions ────────────────────────────────
// List all submissions for an assignment, joined with student names and grades
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!WRITE_ROLES.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Teacher or Admin role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 });

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_lms_submissions')
    .select(`
      *,
      school_students(id, first_name, last_name, admission_number, admission_no),
      school_lms_grades(id, marks_awarded, teacher_comments, graded_at, graded_by)
    `)
    .eq('assignment_id', id)
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}
