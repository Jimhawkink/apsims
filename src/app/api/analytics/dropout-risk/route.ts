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

// GET /api/analytics/dropout-risk
// Computes Dropout_Risk_Score for each active student:
//   40 pts if attendance_rate < 75%
//   40 pts if mean_score < 40
//   20 pts if fee_arrears > 5000
// Returns students with score > 50, sorted descending
// Restrict to Admin/Principal
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['Admin', 'Principal'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const supabase = getServiceClient();

  // Get current term
  const { data: currentTerm } = await supabase
    .from('school_terms')
    .select('id, academic_year')
    .eq('is_current', true)
    .maybeSingle();

  const termId = currentTerm?.id;
  const currentYear = currentTerm?.academic_year?.split('/')[0] || new Date().getFullYear().toString();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // ── Fetch all active students ──────────────────────────────────────────────
  const { data: students, error: studentsError } = await supabase
    .from('school_students')
    .select(`
      id, first_name, last_name, form_id,
      school_forms ( form_name )
    `)
    .eq('status', 'Active');

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

  const studentList = students || [];
  const studentIds = studentList.map((s: any) => s.id);

  if (studentIds.length === 0) return NextResponse.json({ data: [] });

  // ── Fetch attendance for current year ─────────────────────────────────────
  const { data: attendanceRecords } = await supabase
    .from('school_daily_attendance')
    .select('student_id, status')
    .in('student_id', studentIds)
    .gte('attendance_date', yearStart)
    .lte('attendance_date', yearEnd);

  const attendanceMap: Record<number, { present: number; total: number }> = {};
  (attendanceRecords || []).forEach((r: any) => {
    if (!attendanceMap[r.student_id]) attendanceMap[r.student_id] = { present: 0, total: 0 };
    attendanceMap[r.student_id].total += 1;
    if (r.status === 'Present' || r.status === 'Late') {
      attendanceMap[r.student_id].present += 1;
    }
  });

  // ── Fetch exam marks for current term ─────────────────────────────────────
  const { data: examMarks } = termId
    ? await supabase
        .from('school_exam_marks')
        .select('student_id, marks_obtained')
        .in('student_id', studentIds)
        .eq('term_id', termId)
    : { data: [] };

  const marksMap: Record<number, { sum: number; count: number }> = {};
  (examMarks || []).forEach((m: any) => {
    if (!marksMap[m.student_id]) marksMap[m.student_id] = { sum: 0, count: 0 };
    marksMap[m.student_id].sum += Number(m.marks_obtained);
    marksMap[m.student_id].count += 1;
  });

  // ── Fetch fee structures and payments for current term ────────────────────
  const { data: feeStructures } = termId
    ? await supabase
        .from('school_fee_structures')
        .select('form_id, amount')
        .eq('term_id', termId)
    : { data: [] };

  const feeByForm: Record<number, number> = {};
  (feeStructures || []).forEach((f: any) => {
    feeByForm[f.form_id] = Number(f.amount);
  });

  const { data: feePayments } = termId
    ? await supabase
        .from('school_fee_payments')
        .select('student_id, amount')
        .in('student_id', studentIds)
        .eq('term_id', termId)
    : { data: [] };

  const paidByStudent: Record<number, number> = {};
  (feePayments || []).forEach((p: any) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount);
  });

  // ── Compute risk scores ────────────────────────────────────────────────────
  const results = studentList.map((s: any) => {
    const att = attendanceMap[s.id];
    const attendance_rate = att && att.total > 0
      ? Math.round((att.present / att.total) * 1000) / 10
      : 100; // no records = assume present

    const marks = marksMap[s.id];
    const mean_score = marks && marks.count > 0
      ? Math.round((marks.sum / marks.count) * 10) / 10
      : 0;

    const expectedFee = feeByForm[s.form_id] || 0;
    const paid = paidByStudent[s.id] || 0;
    const fee_balance = Math.max(0, expectedFee - paid);

    // Compute risk score
    let risk_score = 0;
    if (attendance_rate < 75) risk_score += 40;
    if (mean_score < 40) risk_score += 40;
    if (fee_balance > 5000) risk_score += 20;

    return {
      student_name: `${s.first_name} ${s.last_name}`,
      form_name: s.school_forms?.form_name || '-',
      attendance_rate,
      mean_score,
      fee_balance,
      risk_score,
    };
  });

  // Filter students with score > 50, sort descending
  const at_risk = results
    .filter((r: any) => r.risk_score > 50)
    .sort((a: any, b: any) => b.risk_score - a.risk_score);

  return NextResponse.json({ data: at_risk });
}
