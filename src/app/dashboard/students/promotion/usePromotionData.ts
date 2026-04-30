'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export function usePromotionData() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [clearanceForms, setClearanceForms] = useState<any[]>([]);
    const [approvals, setApprovals] = useState<any[]>([]);
    const [alumniList, setAlumniList] = useState<any[]>([]);
    const [examMarks, setExamMarks] = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);

    const user = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('school_user') || '{}'); } catch { return {}; } })() : {};

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, t, ay, r, h, cl, ap, al, em, sd] = await Promise.all([
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }).limit(10),
            supabase.from('school_academic_years').select('*').order('year_name'),
            supabase.from('school_promotion_rules').select('*').order('priority', { ascending: false }),
            supabase.from('school_promotion_history').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('school_clearance_forms').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('school_promotion_approvals').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('school_alumni').select('*').order('graduation_year', { ascending: false }),
            supabase.from('school_exam_marks').select('student_id, score, subject_id, term_id, exam_type').limit(5000),
            supabase.from('school_details').select('*').limit(1).single(),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setTerms(t.data || []);
        setAcademicYears(ay.data || []);
        setRules(r.data || []);
        setHistory(h.data || []);
        setClearanceForms(cl.data || []);
        setApprovals(ap.data || []);
        setAlumniList(al.data || []);
        setExamMarks(em.data || []);
        setSchoolDetails(sd.data || null);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = useCallback((id: number | null) => id ? forms.find(f => f.id === id)?.form_name || '-' : '-', [forms]);
    const getStreamName = useCallback((id: number | null) => id ? streams.find(s => s.id === id)?.stream_name || '-' : '-', [streams]);
    const getCurrentAcademicYear = useCallback(() => academicYears.find((a: any) => a.is_current) || null, [academicYears]);

    const studentAverages = useMemo(() => {
        const map: Record<number, { total: number; count: number; fails: number }> = {};
        examMarks.forEach((m: any) => {
            if (!map[m.student_id]) map[m.student_id] = { total: 0, count: 0, fails: 0 };
            map[m.student_id].total += Number(m.score) || 0;
            map[m.student_id].count += 1;
        });
        examMarks.forEach((m: any) => {
            if (!map[m.student_id]) return;
            if ((Number(m.score) || 0) < 30) map[m.student_id].fails += 1;
        });
        const result: Record<number, { average: number; fails: number }> = {};
        Object.entries(map).forEach(([sid, v]: any) => {
            result[Number(sid)] = { average: v.count > 0 ? v.total / v.count : 0, fails: v.fails };
        });
        return result;
    }, [examMarks]);

    const checkEligibility = useCallback((student: any, fromFormId: number, toFormId: number) => {
        const rule = rules.find((r: any) => r.from_form_id === fromFormId && r.to_form_id === toFormId && r.is_active);
        if (!rule) return { eligible: true, status: 'Eligible', reason: 'No rule defined — default allow', rule: null };
        const avg = studentAverages[student.id]?.average ?? 0;
        const fails = studentAverages[student.id]?.fails ?? 0;
        const reasons: string[] = [];
        let eligible = true;
        let status = 'Eligible';
        if (avg < Number(rule.min_average_score)) { eligible = false; reasons.push(`Average ${avg.toFixed(1)} < ${rule.min_average_score}`); }
        if (fails > Number(rule.max_subject_failures)) { eligible = false; reasons.push(`${fails} failures > max ${rule.max_subject_failures}`); }
        if (!eligible) status = 'Ineligible';
        else if (avg < Number(rule.min_average_score) + 5 || fails >= Number(rule.max_subject_failures)) status = 'Conditional';
        return { eligible, status, reason: reasons.join('; ') || 'Meets all criteria', rule };
    }, [rules, studentAverages]);

    return {
        loading, students, forms, streams, terms, academicYears, rules, history,
        clearanceForms, approvals, alumniList, schoolDetails, user, fetchAll,
        getFormName, getStreamName, getCurrentAcademicYear, studentAverages, checkEligibility,
    };
}
