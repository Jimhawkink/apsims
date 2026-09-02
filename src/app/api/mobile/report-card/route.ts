export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/*
  GET /api/mobile/report-card?student_id=123&term_id=5&exam_type=End-Term&phone=07XXXXXXXX

  Returns full report card data for a student — ONLY if:
  1. The guardian phone matches a registered mobile user for that student
  2. The results have been officially released (school_report_releases)
*/
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const student_id = searchParams.get('student_id');
        const term_id    = searchParams.get('term_id');
        const exam_type  = searchParams.get('exam_type') || 'End-Term';
        const phone      = searchParams.get('phone')?.replace(/\s/g,'').replace(/^\+?254/,'0');

        if (!student_id || !phone) return NextResponse.json({ error: 'Missing student_id or phone' }, { status: 400 });

        const sb = getSb();

        // ─── Verify mobile user is linked to this student ───
        const { data: mobileUser } = await sb.from('school_mobile_users')
            .select('id,student_id').eq('guardian_phone', phone).eq('is_active', true).single();

        if (!mobileUser || String(mobileUser.student_id) !== String(student_id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // ─── Check if results have been released ───
        const { data: student } = await sb.from('school_students').select('form_id').eq('id', Number(student_id)).single();

        const { data: release } = await sb.from('school_report_releases')
            .select('*')
            .eq('exam_type', exam_type)
            .or(`term_id.eq.${term_id},form_id.is.null`)
            .eq('is_released', true)
            .limit(1).maybeSingle();

        // Also check form-specific release
        const { data: formRelease } = await sb.from('school_report_releases')
            .select('*')
            .eq('term_id', Number(term_id))
            .eq('form_id', student?.form_id)
            .eq('exam_type', exam_type)
            .eq('is_released', true)
            .maybeSingle();

        if (!release && !formRelease) {
            return NextResponse.json({ error: 'Results not yet released. Please wait for the school to publish results.', code: 'NOT_RELEASED' }, { status: 403 });
        }

        // ─── Fetch full report card data ───
        const [studentRes, marksRes, termRes, attendRes, disciplineRes, schoolRes, gradingRes] = await Promise.all([
            sb.from('school_students').select('*').eq('id', Number(student_id)).single(),
            sb.from('school_exam_marks').select('*,school_subjects(subject_name,subject_code,category)').eq('student_id', Number(student_id)).eq('term_id', Number(term_id)).eq('exam_type', exam_type),
            sb.from('school_terms').select('*').eq('id', Number(term_id)).single(),
            sb.from('school_attendance').select('status,attendance_date').eq('student_id', Number(student_id)),
            sb.from('school_discipline_records').select('category,severity,incident_date,action_taken').eq('student_id', Number(student_id)),
            sb.from('school_details').select('school_name,address,phone,email,logo_url,school_motto').limit(1).maybeSingle(),
            sb.from('school_grading_system').select('*').order('min_score', { ascending:false }),
        ]);

        const marks   = marksRes.data || [];
        const grading = gradingRes.data || [];
        const att     = attendRes.data || [];
        const student2 = studentRes.data;

        // Compute averages
        const scores = marks.map((m: any) => Number(m.score)).filter(s => s > 0);
        const overall = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        const getGrade = (score: number) => sorted.find(g => score >= g.min_score) || { grade:'E', points:1, remarks:'Fail' };

        const overallEntry = getGrade(overall);
        const best7 = [...marks].sort((a: any, b: any) => Number(b.score) - Number(a.score)).slice(0, 7);
        const meanPts = best7.length ? Math.round(best7.reduce((a, m: any) => a + (Number(m.points) || getGrade(Number(m.score)).points), 0) / best7.length) : 0;
        const meanGrade = [...grading].sort((a, b) => b.min_score - a.min_score).find(g => meanPts >= g.points)?.grade || 'E';

        const attendRate = att.length ? Math.round((att.filter((a: any) => a.status === 'Present').length / att.length) * 100) : 0;

        // Get form/stream
        const [fRes, sRes] = await Promise.all([
            student2?.form_id ? sb.from('school_forms').select('form_name').eq('id', student2.form_id).single() : Promise.resolve({ data: null }),
            student2?.stream_id ? sb.from('school_streams').select('stream_name').eq('id', student2.stream_id).single() : Promise.resolve({ data: null }),
        ]);

        return NextResponse.json({
            success:    true,
            school:     schoolRes.data,
            term:       termRes.data,
            exam_type,
            student: {
                ...student2,
                form_name:   (fRes.data as any)?.form_name || '',
                stream_name: (sRes.data as any)?.stream_name || '',
            },
            marks: marks.map((m: any) => ({
                subject:    (m.school_subjects as any)?.subject_name || '—',
                code:       (m.school_subjects as any)?.subject_code || '',
                category:   (m.school_subjects as any)?.category || '',
                score:      Number(m.score),
                grade:      m.grade || getGrade(Number(m.score)).grade,
                points:     m.points || getGrade(Number(m.score)).points,
                remarks:    m.remarks || '',
                entered_by: m.entered_by_name || '',
            })),
            summary: {
                overall_avg:    Math.round(overall * 10) / 10,
                overall_grade:  overallEntry.grade,
                mean_grade:     meanGrade,
                total_points:   marks.reduce((a: number, m: any) => a + (Number(m.points) || 0), 0),
                attendance_rate: attendRate,
                subjects_passed: scores.filter(s => s >= 50).length,
                total_subjects:  marks.length,
            },
            attendance: {
                rate: attendRate,
                total: att.length,
                present: att.filter((a: any) => a.status === 'Present').length,
            },
            discipline_count: (disciplineRes.data || []).length,
            release_message: (formRelease || release)?.release_message || '',
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
