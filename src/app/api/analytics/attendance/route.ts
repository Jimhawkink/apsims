import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/analytics/attendance
// Returns monthly_trend and form_attendance for current academic year
// Restrict to Admin/Principal
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['Admin', 'Principal'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const supabase = getServiceClient();

  // Get current academic year from current term
  const { data: currentTerm } = await supabase
    .from('school_terms')
    .select('id, academic_year')
    .eq('is_current', true)
    .maybeSingle();

  const currentYear = currentTerm?.academic_year || new Date().getFullYear().toString();

  // Fetch all attendance records for the current academic year
  // school_daily_attendance has: attendance_date, student_id, status (Present/Absent/Late/Excused)
  const yearStart = `${currentYear.split('/')[0] || currentYear}-01-01`;
  const yearEnd = `${currentYear.split('/')[0] || currentYear}-12-31`;

  const { data: attendanceRecords, error } = await supabase
    .from('school_daily_attendance')
    .select(`
      attendance_date, status,
      school_students ( form_id, school_forms ( form_name ) )
    `)
    .gte('attendance_date', yearStart)
    .lte('attendance_date', yearEnd);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const records = attendanceRecords || [];

  // ── 1. Monthly Attendance Trend ────────────────────────────────────────────
  const monthlyMap: Record<string, { present: number; total: number }> = {};
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  records.forEach((r: any) => {
    const date = new Date(r.attendance_date);
    const monthKey = MONTHS[date.getMonth()];
    if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { present: 0, total: 0 };
    monthlyMap[monthKey].total += 1;
    if (r.status === 'Present' || r.status === 'Late') {
      monthlyMap[monthKey].present += 1;
    }
  });

  const monthly_trend = MONTHS
    .filter(m => monthlyMap[m])
    .map(month => ({
      month,
      attendance_rate: monthlyMap[month].total > 0
        ? Math.round((monthlyMap[month].present / monthlyMap[month].total) * 1000) / 10
        : 0,
    }));

  // ── 2. Form Attendance Table ───────────────────────────────────────────────
  const formMap: Record<string, { present: number; absent: number; total: number }> = {};

  records.forEach((r: any) => {
    const formName = r.school_students?.school_forms?.form_name || 'Unknown';
    if (!formMap[formName]) formMap[formName] = { present: 0, absent: 0, total: 0 };
    formMap[formName].total += 1;
    if (r.status === 'Present' || r.status === 'Late') {
      formMap[formName].present += 1;
    } else {
      formMap[formName].absent += 1;
    }
  });

  const form_attendance = Object.entries(formMap)
    .map(([form_name, stats]) => ({
      form_name,
      attendance_rate: stats.total > 0
        ? Math.round((stats.present / stats.total) * 1000) / 10
        : 0,
      present_count: stats.present,
      absent_count: stats.absent,
    }))
    .sort((a, b) => a.form_name.localeCompare(b.form_name));

  return NextResponse.json({ monthly_trend, form_attendance });
}
