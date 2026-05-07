import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/analytics/finance
// Returns collection_by_form, monthly_collection for current year
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

  const currentYear = currentTerm?.academic_year?.split('/')[0] || new Date().getFullYear().toString();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  // ── 1. Collection by Form ──────────────────────────────────────────────────
  // Get fee structures for current term
  const { data: feeStructures } = await supabase
    .from('school_fee_structures')
    .select('form_id, amount, school_forms ( form_name )')
    .eq('term_id', currentTerm?.id || 0);

  // Get all active students per form
  const { data: students } = await supabase
    .from('school_students')
    .select('id, form_id, school_forms ( form_name )')
    .eq('status', 'Active');

  // Get all payments for current term
  const { data: termPayments } = await supabase
    .from('school_fee_payments')
    .select('student_id, amount')
    .eq('term_id', currentTerm?.id || 0);

  // Build form-level fee structure map
  const feeByForm: Record<number, { amount: number; form_name: string }> = {};
  (feeStructures || []).forEach((f: any) => {
    feeByForm[f.form_id] = {
      amount: Number(f.amount),
      form_name: f.school_forms?.form_name || '-',
    };
  });

  // Count students per form
  const studentsByForm: Record<number, { count: number; form_name: string; ids: number[] }> = {};
  (students || []).forEach((s: any) => {
    if (!studentsByForm[s.form_id]) {
      studentsByForm[s.form_id] = {
        count: 0,
        form_name: s.school_forms?.form_name || '-',
        ids: [],
      };
    }
    studentsByForm[s.form_id].count += 1;
    studentsByForm[s.form_id].ids.push(s.id);
  });

  // Sum payments per student
  const paidByStudent: Record<number, number> = {};
  (termPayments || []).forEach((p: any) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount);
  });

  // Build collection by form
  const collection_by_form = Object.entries(studentsByForm).map(([formIdStr, formData]) => {
    const formId = Number(formIdStr);
    const feePerStudent = feeByForm[formId]?.amount || 0;
    const totalExpected = feePerStudent * formData.count;
    const totalCollected = formData.ids.reduce((sum, sid) => sum + (paidByStudent[sid] || 0), 0);
    const outstanding = Math.max(0, totalExpected - totalCollected);
    const collection_rate = totalExpected > 0
      ? Math.round((totalCollected / totalExpected) * 1000) / 10
      : 0;
    return {
      form_name: feeByForm[formId]?.form_name || formData.form_name,
      collection_rate,
      outstanding_amount: outstanding,
    };
  }).sort((a, b) => a.form_name.localeCompare(b.form_name));

  // ── 2. Monthly Fee Collection Trend ───────────────────────────────────────
  const { data: allPayments, error } = await supabase
    .from('school_fee_payments')
    .select('payment_date, amount')
    .gte('payment_date', yearStart)
    .lte('payment_date', yearEnd);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyMap: Record<string, number> = {};

  (allPayments || []).forEach((p: any) => {
    const date = new Date(p.payment_date);
    const monthKey = MONTHS[date.getMonth()];
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(p.amount);
  });

  const monthly_collection = MONTHS
    .filter(m => monthlyMap[m] !== undefined)
    .map(month => ({
      month,
      amount_collected: Math.round(monthlyMap[month] * 100) / 100,
    }));

  return NextResponse.json({ collection_by_form, monthly_collection });
}
