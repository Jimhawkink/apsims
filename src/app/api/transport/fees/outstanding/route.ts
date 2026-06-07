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

// GET /api/transport/fees/outstanding?route_id=&form_id=
// For each assigned student in current term, compute expected fee from fee structures by route,
// sum payments, return balance.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const route_id = searchParams.get('route_id');
  const form_id = searchParams.get('form_id');
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

  // Get all active assignments for this term
  let assignQuery = supabase
    .from('school_transport_assignments')
    .select(`
      student_id,
      route_id,
      school_students (
        id, first_name, last_name, admission_number, admission_no, form_id,
        school_forms (form_name)
      ),
      school_transport_routes (id, route_name)
    `)
    .eq('term_id', Number(term_id))
    .eq('is_active', true);

  if (route_id) assignQuery = assignQuery.eq('route_id', Number(route_id));

  const { data: assignments, error: assignError } = await assignQuery;
  if (assignError) return NextResponse.json({ error: assignError.message }, { status: 500 });

  // Get fee structures for this term (keyed by route_id)
  let feeQuery = supabase
    .from('school_transport_fee_structures')
    .select('route_id, amount')
    .eq('term_id', Number(term_id));

  if (route_id) feeQuery = feeQuery.eq('route_id', Number(route_id));

  const { data: feeStructures } = await feeQuery;
  const feeByRoute: Record<number, number> = {};
  (feeStructures || []).forEach((f: any) => { feeByRoute[f.route_id] = Number(f.amount); });

  // Get all payments for this term
  let payQuery = supabase
    .from('school_transport_fee_payments')
    .select('student_id, route_id, amount')
    .eq('term_id', Number(term_id));

  if (route_id) payQuery = payQuery.eq('route_id', Number(route_id));

  const { data: payments } = await payQuery;
  // Key: `${student_id}_${route_id}`
  const paidByStudentRoute: Record<string, number> = {};
  (payments || []).forEach((p: any) => {
    const key = `${p.student_id}_${p.route_id}`;
    paidByStudentRoute[key] = (paidByStudentRoute[key] || 0) + Number(p.amount);
  });

  // Build outstanding report
  let report = (assignments || []).map((a: any) => {
    const student = a.school_students;
    const expected = feeByRoute[a.route_id] || 0;
    const key = `${a.student_id}_${a.route_id}`;
    const paid = paidByStudentRoute[key] || 0;
    const balance = expected - paid;
    return {
      student_id: a.student_id,
      student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
      admission_no: student?.admission_number || student?.admission_no || '-',
      form_name: student?.school_forms?.form_name || '-',
      form_id: student?.form_id,
      route_id: a.route_id,
      route_name: a.school_transport_routes?.route_name || '-',
      expected_fee: expected,
      amount_paid: paid,
      balance,
    };
  });

  // Filter by form_id if provided
  if (form_id) {
    report = report.filter(r => r.form_id === Number(form_id));
  }

  return NextResponse.json({ data: report });
}
