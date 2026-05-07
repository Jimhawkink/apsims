import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/analytics/academic?term_id=
// Restrict to Admin/Principal
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['Admin', 'Principal'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

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

  // ── 1. Mean Score Trend: last 6 terms ──────────────────────────────────────
  const { data: allTerms } = await supabase
    .from('school_terms')
    .select('id, term_name, academic_year, start_date')
    .order('start_date', { ascending: false })
    .limit(6);

  const termIds = (allTerms || []).map((t: any) => t.id);

  let mean_trend: { term_name: string; academic_year: string; mean_score: number }[] = [];
  if (termIds.length > 0) {
    const { data: trendMarks } = await supabase
      .from('school_exam_marks')
      .select('term_id, marks_obtained')
      .in('term_id', termIds);

    const termMap: Record<number, { sum: number; count: number }> = {};
    (trendMarks || []).forEach((m: any) => {
      if (!termMap[m.term_id]) termMap[m.term_id] = { sum: 0, count: 0 };
      termMap[m.term_id].sum += Number(m.marks_obtained);
      termMap[m.term_id].count += 1;
    });

    mean_trend = (allTerms || [])
      .map((t: any) => ({
        term_name: t.term_name,
        academic_year: t.academic_year,
        mean_score: termMap[t.id]
          ? Math.round((termMap[t.id].sum / termMap[t.id].count) * 10) / 10
          : 0,
      }))
      .reverse(); // chronological order
  }

  // ── 2. Subject Heatmap: avg mark per subject per form for selected term ─────
  let subject_heatmap: { subject_name: string; form_name: string; avg_mark: number }[] = [];
  if (term_id) {
    const { data: heatMarks } = await supabase
      .from('school_exam_marks')
      .select(`
        marks_obtained,
        school_subjects ( subject_name ),
        school_students ( form_id, school_forms ( form_name ) )
      `)
      .eq('term_id', Number(term_id));

    const heatMap: Record<string, { sum: number; count: number }> = {};
    (heatMarks || []).forEach((m: any) => {
      const subjectName = m.school_subjects?.subject_name;
      const formName = m.school_students?.school_forms?.form_name;
      if (!subjectName || !formName) return;
      const key = `${subjectName}||${formName}`;
      if (!heatMap[key]) heatMap[key] = { sum: 0, count: 0 };
      heatMap[key].sum += Number(m.marks_obtained);
      heatMap[key].count += 1;
    });

    subject_heatmap = Object.entries(heatMap).map(([key, val]) => {
      const [subject_name, form_name] = key.split('||');
      return {
        subject_name,
        form_name,
        avg_mark: Math.round((val.sum / val.count) * 10) / 10,
      };
    }).sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  }

  // ── 3. Grade Distribution for selected term ────────────────────────────────
  let grade_distribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  if (term_id) {
    const { data: gradeMarks } = await supabase
      .from('school_exam_marks')
      .select('marks_obtained')
      .eq('term_id', Number(term_id));

    (gradeMarks || []).forEach((m: any) => {
      const mark = Number(m.marks_obtained);
      if (mark >= 75) grade_distribution.A++;
      else if (mark >= 60) grade_distribution.B++;
      else if (mark >= 50) grade_distribution.C++;
      else if (mark >= 40) grade_distribution.D++;
      else grade_distribution.E++;
    });
  }

  // ── 4. Top 20 Students by total marks in selected term ─────────────────────
  let top_students: { student_name: string; form_name: string; stream_name: string; mean_score: number }[] = [];
  if (term_id) {
    const { data: topMarks } = await supabase
      .from('school_exam_marks')
      .select(`
        student_id, marks_obtained,
        school_students (
          first_name, last_name,
          school_forms ( form_name ),
          school_streams ( stream_name )
        )
      `)
      .eq('term_id', Number(term_id));

    const studentMap: Record<number, { name: string; form: string; stream: string; sum: number; count: number }> = {};
    (topMarks || []).forEach((m: any) => {
      const sid = m.student_id;
      if (!studentMap[sid]) {
        const s = m.school_students;
        studentMap[sid] = {
          name: s ? `${s.first_name} ${s.last_name}` : 'Unknown',
          form: s?.school_forms?.form_name || '-',
          stream: s?.school_streams?.stream_name || '-',
          sum: 0,
          count: 0,
        };
      }
      studentMap[sid].sum += Number(m.marks_obtained);
      studentMap[sid].count += 1;
    });

    top_students = Object.values(studentMap)
      .map(s => ({
        student_name: s.name,
        form_name: s.form,
        stream_name: s.stream,
        mean_score: s.count > 0 ? Math.round((s.sum / s.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.mean_score - a.mean_score)
      .slice(0, 20);
  }

  // ── 5. Subject Weakness: failure rate > 30% ────────────────────────────────
  let subject_weakness: { subject_name: string; failure_rate: number; student_count: number }[] = [];
  if (term_id) {
    const { data: weakMarks } = await supabase
      .from('school_exam_marks')
      .select('marks_obtained, school_subjects ( subject_name )')
      .eq('term_id', Number(term_id));

    const subjectStats: Record<string, { total: number; failures: number }> = {};
    (weakMarks || []).forEach((m: any) => {
      const subjectName = m.school_subjects?.subject_name;
      if (!subjectName) return;
      if (!subjectStats[subjectName]) subjectStats[subjectName] = { total: 0, failures: 0 };
      subjectStats[subjectName].total += 1;
      if (Number(m.marks_obtained) < 40) subjectStats[subjectName].failures += 1;
    });

    subject_weakness = Object.entries(subjectStats)
      .map(([subject_name, stats]) => ({
        subject_name,
        failure_rate: stats.total > 0 ? Math.round((stats.failures / stats.total) * 1000) / 10 : 0,
        student_count: stats.total,
      }))
      .filter(s => s.failure_rate > 30)
      .sort((a, b) => b.failure_rate - a.failure_rate);
  }

  return NextResponse.json({
    mean_trend,
    subject_heatmap,
    grade_distribution,
    top_students,
    subject_weakness,
  });
}
