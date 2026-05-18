'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem, RubricLevel, RUBRIC_LEVELS, RUBRIC_NUMERIC } from '@/lib/cbc-utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CBCStudent {
  id: number; first_name: string; last_name: string;
  admission_no?: string; admission_number?: string;
  form_id: number; stream_id?: number; gender?: string; status: string;
}
export interface CBCForm { id: number; form_name: string; form_level: number; education_system?: string; }
export interface CBCStream { id: number; stream_name: string; }
export interface CBCTerm { id: number; term_name: string; is_current: boolean; }
export interface CBCSubject { id: number; subject_name: string; subject_code?: string; is_active: boolean; category?: string; }
export interface CBCAssessment {
  id: number; student_id: number; subject_id: number; term_id: number;
  assessment_type: string; task_name: string; rubric_level: string;
  raw_score?: number; teacher_id?: number; assessed_at: string;
}
export interface CBCSummary {
  student_id: number; subject_id: number; term_id: number;
  formative_level?: string; summative_level?: string; overall_level?: string;
  formative_count?: number; last_computed_at?: string;
}
export interface CBCPathway { id: number; pathway_name: string; color_hex?: string; }
export interface CBCRubricConfig { id: number; level_code: string; level_label: string; color_hex: string; bg_hex: string; sort_order: number; }
export interface CBCInterventionFlag {
  id: number; student_id: number; subject_id: number; term_id: number;
  flagged_by?: number; rubric_level_at_flag: string; raw_score_at_flag?: number;
  status: string; intervention_type?: string; assigned_teacher_id?: number;
  outcome?: string; resolved_at?: string; updated_at: string;
}
export interface CBCStaff { id: number; first_name: string; last_name: string; }

// ─── Rubric color helpers ─────────────────────────────────────────────────────
export const RUBRIC_COLORS: Record<string, { bg: string; text: string; light: string; border: string }> = {
  EE: { bg: '#15803d', text: '#fff', light: '#dcfce7', border: '#86efac' },
  ME: { bg: '#1d4ed8', text: '#fff', light: '#dbeafe', border: '#93c5fd' },
  AE: { bg: '#b45309', text: '#fff', light: '#fef3c7', border: '#fcd34d' },
  BE: { bg: '#b91c1c', text: '#fff', light: '#fee2e2', border: '#fca5a5' },
};

export const getRubricColor = (level: string | null | undefined) =>
  RUBRIC_COLORS[level || ''] || { bg: '#94a3b8', text: '#fff', light: '#f1f5f9', border: '#cbd5e1' };

export const rubricNumeric = (level: string): number =>
  RUBRIC_NUMERIC[level as RubricLevel] ?? 0;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCBCReportData() {
  const [forms, setForms] = useState<CBCForm[]>([]);
  const [allForms, setAllForms] = useState<CBCForm[]>([]);
  const [streams, setStreams] = useState<CBCStream[]>([]);
  const [subjects, setSubjects] = useState<CBCSubject[]>([]);
  const [terms, setTerms] = useState<CBCTerm[]>([]);
  const [students, setStudents] = useState<CBCStudent[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [pathways, setPathways] = useState<CBCPathway[]>([]);
  const [rubricConfig, setRubricConfig] = useState<CBCRubricConfig[]>([]);
  const [staff, setStaff] = useState<CBCStaff[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected filters
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');

  // Data that changes with filters
  const [summaries, setSummaries] = useState<CBCSummary[]>([]);
  const [assessments, setAssessments] = useState<CBCAssessment[]>([]);
  const [interventions, setInterventions] = useState<CBCInterventionFlag[]>([]);
  const [prevTermSummaries, setPrevTermSummaries] = useState<CBCSummary[]>([]);
  const [allTermSummaries, setAllTermSummaries] = useState<CBCSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ── Initial data fetch ──
  const fetchBase = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, termsRes, ssRes, pathwaysRes, rubricRes, staffRes, sdRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('cbc_student_subjects').select('*'),
      supabase.from('cbc_pathways').select('*').order('pathway_name'),
      supabase.from('cbc_rubric_config').select('*').order('sort_order'),
      supabase.from('school_staff').select('id,first_name,last_name').limit(500),
      supabase.from('school_details').select('*').limit(1).maybeSingle(),
    ]);

    const af = formsRes.data || [];
    const cbcForms = af.filter((f: any) => getEducationSystem(f.id, af) === 'CBC_Senior_School');

    setAllForms(af);
    setForms(cbcForms);
    setStreams(streamsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTerms(termsRes.data || []);
    setStudentSubjects(ssRes.data || []);
    setPathways(pathwaysRes.data || []);
    setRubricConfig(rubricRes.data || []);
    setStaff(staffRes.data || []);
    setSchoolDetails(sdRes.data);

    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));

    // Fetch all CBC students
    const cbcFormIds = cbcForms.map((f: any) => f.id);
    if (cbcFormIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('school_students').select('*')
        .in('form_id', cbcFormIds).eq('status', 'Active').order('first_name');
      setStudents(studentsData || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchBase(); }, [fetchBase]);

  // ── Fetch term-dependent data ──
  useEffect(() => {
    if (!selTerm) return;
    setLoadingData(true);
    const load = async () => {
      const termId = Number(selTerm);
      const [sumRes, asmtRes, intRes] = await Promise.all([
        supabase.from('cbc_competency_summaries').select('*').eq('term_id', termId),
        supabase.from('cbc_assessments').select('*').eq('term_id', termId),
        supabase.from('cbc_intervention_flags').select('*').eq('term_id', termId),
      ]);
      setSummaries(sumRes.data || []);
      setAssessments(asmtRes.data || []);
      setInterventions(intRes.data || []);

      // Fetch previous term summaries for trend
      const currentTermIdx = terms.findIndex(t => String(t.id) === selTerm);
      if (currentTermIdx >= 0 && currentTermIdx < terms.length - 1) {
        const prevTerm = terms[currentTermIdx + 1];
        const { data: prevData } = await supabase.from('cbc_competency_summaries').select('*').eq('term_id', prevTerm.id);
        setPrevTermSummaries(prevData || []);
      } else {
        setPrevTermSummaries([]);
      }

      // Fetch all term summaries for longitudinal
      const { data: allData } = await supabase.from('cbc_competency_summaries').select('*');
      setAllTermSummaries(allData || []);

      setLoadingData(false);
    };
    load();
  }, [selTerm, terms]);

  // ── Filtered students ──
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selForm && String(s.form_id) !== selForm) return false;
      if (selStream && String(s.stream_id) !== selStream) return false;
      return true;
    });
  }, [students, selForm, selStream]);

  const filteredStudentIds = useMemo(() => new Set(filteredStudents.map(s => s.id)), [filteredStudents]);

  // ── Filtered summaries ──
  const filteredSummaries = useMemo(() =>
    summaries.filter(s => filteredStudentIds.has(s.student_id)),
    [summaries, filteredStudentIds]);

  // ── Helper functions ──
  const getStudentName = useCallback((id: number) => {
    const s = students.find(st => st.id === id);
    return s ? `${s.first_name} ${s.last_name}` : '—';
  }, [students]);

  const getStudentObj = useCallback((id: number) => students.find(st => st.id === id), [students]);

  const getSubjectName = useCallback((id: number) => {
    const s = subjects.find(sub => sub.id === id);
    return s?.subject_name || '—';
  }, [subjects]);

  const getStreamName = useCallback((id: number | undefined) => {
    if (!id) return '—';
    const s = streams.find(st => st.id === id);
    return s?.stream_name || '—';
  }, [streams]);

  const getFormName = useCallback((id: number) => {
    const f = allForms.find(fo => fo.id === id);
    return f?.form_name || '—';
  }, [allForms]);

  const getStaffName = useCallback((id: number | undefined) => {
    if (!id) return '—';
    const s = staff.find(st => st.id === id);
    return s ? `${s.first_name} ${s.last_name}` : '—';
  }, [staff]);

  const getStudentPathway = useCallback((studentId: number) => {
    const ss = studentSubjects.find((s: any) => s.student_id === studentId && s.pathway_id);
    if (!ss) return null;
    return pathways.find(p => p.id === ss.pathway_id) || null;
  }, [studentSubjects, pathways]);

  const getStudentSubjectIds = useCallback((studentId: number): number[] => {
    const enrolled = studentSubjects.filter((ss: any) => ss.student_id === studentId);
    return enrolled.map((ss: any) => ss.subject_id);
  }, [studentSubjects]);

  const getTermName = useCallback((id: number | string) => {
    const t = terms.find(tm => String(tm.id) === String(id));
    return t?.term_name || '—';
  }, [terms]);

  const currentTerm = useMemo(() => terms.find(t => String(t.id) === selTerm), [terms, selTerm]);

  return {
    // Reference data
    forms, allForms, streams, subjects, terms, students, studentSubjects,
    pathways, rubricConfig, staff, schoolDetails,
    // Term data
    summaries, assessments, interventions, prevTermSummaries, allTermSummaries,
    // Filtered
    filteredStudents, filteredStudentIds, filteredSummaries,
    // Filters
    selForm, selStream, selTerm, setSelForm, setSelStream, setSelTerm,
    // Status
    loading, loadingData, currentTerm,
    // Helpers
    getStudentName, getStudentObj, getSubjectName, getStreamName,
    getFormName, getStaffName, getStudentPathway, getStudentSubjectIds, getTermName,
    // Refresh
    refresh: fetchBase,
  };
}
