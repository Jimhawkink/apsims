import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── POST /api/admissions/applications/[id]/convert ───
// Restricted to Admin/Principal
// Converts an approved application into a school_students record
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });

  const supabase = getServiceClient();

  // Fetch application
  const { data: application, error: fetchError } = await supabase
    .from('school_admission_applications')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  if (application.status !== 'Approved') {
    return NextResponse.json(
      { error: 'Only Approved applications can be converted to student records' },
      { status: 400 }
    );
  }

  if (application.converted_student_id) {
    return NextResponse.json(
      { error: 'This application has already been converted to a student record' },
      { status: 409 }
    );
  }

  // Generate admission number
  const { count: studentCount } = await supabase
    .from('school_students')
    .select('id', { count: 'exact', head: true });

  const admissionNumber = `ADM${new Date().getFullYear()}${String((studentCount ?? 0) + 1).padStart(4, '0')}`;

  // Insert new student record pre-populated from application
  const { data: newStudent, error: insertError } = await supabase
    .from('school_students')
    .insert([{
      first_name: application.student_first_name,
      middle_name: application.student_middle_name || null,
      last_name: application.student_last_name,
      date_of_birth: application.date_of_birth,
      gender: application.gender,
      admission_number: admissionNumber,
      admission_no: admissionNumber,
      form_id: application.form_applied_for,
      guardian_name: application.guardian_full_name,
      guardian_phone: application.guardian_phone,
      guardian_email: application.guardian_email || null,
      guardian_national_id: application.guardian_national_id || null,
      previous_school: application.previous_school || null,
      kcpe_index_number: application.kcpe_index_number,
      kcpe_marks: application.kcpe_total_marks || null,
      status: 'Active',
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Update application with converted_student_id
  await supabase
    .from('school_admission_applications')
    .update({ converted_student_id: newStudent.id })
    .eq('id', id);

  return NextResponse.json({ data: newStudent }, { status: 201 });
}
