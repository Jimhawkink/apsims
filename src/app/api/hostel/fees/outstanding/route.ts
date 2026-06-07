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

// GET /api/hostel/fees/outstanding?term_id=
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let term_id = searchParams.get('term_id');

  const supabase = getServiceClient();

  // Default to current term
  if (!term_id) {
    const { data: currentTerm } = await supabase
      .from('school_terms')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();
    term_id = currentTerm?.id?.toString();
  }

  if (!term_id) return NextResponse.json({ data: [] });

  // Get all active bed allocations for this term (boarding students)
  const { data: beds, error: bedsError } = await supabase
    .from('school_hostel_beds')
    .select(`
      student_id,
      school_students (
        id, first_name, last_name, admission_number, admission_no, form_id,
        school_forms (form_name)
      )
    `)
    .eq('term_id', Number(term_id))
    .eq('is_active', true);

  if (bedsError) return NextResponse.json({ error: bedsError.message }, { status: 500 });

  // Get fee structures for this term
  const { data: feeStructures } = await supabase
    .from('school_hostel_fee_structures')
    .select('form_id, amount')
    .eq('term_id', Number(term_id));

  const feeByForm: Record<number, number> = {};
  (feeStructures || []).forEach((f: any) => { feeByForm[f.form_id] = Number(f.amount); });

  // Get all payments for this term
  const { data: payments } = await supabase
    .from('school_hostel_fee_payments')
    .select('student_id, amount')
    .eq('term_id', Number(term_id));

  const paidByStudent: Record<number, number> = {};
  (payments || []).forEach((p: any) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount);
  });

  // Build outstanding report
  const report = (beds || []).map((bed: any) => {
    const student = bed.school_students;
    const formId = student?.form_id;
    const expected = feeByForm[formId] || 0;
    const paid = paidByStudent[bed.student_id] || 0;
    const balance = expected - paid;
    return {
      student_id: bed.student_id,
      student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
      admission_no: student?.admission_number || student?.admission_no || '-',
      form_name: student?.school_forms?.form_name || '-',
      expected_fee: expected,
      amount_paid: paid,
      balance,
    };
  });

  return NextResponse.json({ data: report });
}
