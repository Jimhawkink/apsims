'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem, RubricLevel, RUBRIC_LEVELS, RUBRIC_NUMERIC, NUMERIC_RUBRIC } from '@/lib/cbc-utils';

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
  flag_reason?: string; intervention_type?: string; intervention_notes?: string;
  status: string; resolved_at?: string; resolved_by?: number;
  resolution_notes?: string; created_at: string; updated_at: string;
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

// ─── Summary computation helpers (inline — no external dependency) ────────────

/**
 * Given an array of rubric levels, return the mode (most frequent).
 * On tie, pick the higher level (EE > ME > AE > BE).
 */
function modeRubricLevel(levels: string[]): RubricLevel | null {
  if (levels.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const l of levels) {
    counts[l] = (counts[l] || 0) + 1;
  }
  let best: string | null = null;
  let bestCount = 0;
  // Iterate in priority order so ties go to the higher level
  for (const lvl of RUBRIC_LEVELS) {
    if ((counts[lvl] || 0) > bestCount) {
      best = lvl;
      bestCount = counts[lvl] || 0;
    }
  }
  return (best as RubricLevel) || null;
}

/**
 * Weighted summary: 60% summative + 40% formative → nearest rubric level.
 */
function weightedSummary(formative: RubricLevel, summative: RubricLevel): RubricLevel {
  const fNum = RUBRIC_NUMERIC[formative] ?? 0;
  const sNum = RUBRIC_NUMERIC[summative] ?? 0;
  const weighted = sNum * 0.6 + fNum * 0.4;
  const rounded = Math.round(weighted);
  const clamped = Math.max(1, Math.min(4, rounded));
  return NUMERIC_RUBRIC[clamped] || 'BE';
}

// ─── Compute summaries from raw assessments ───────────────────────────────────
function computeSummariesFromAssessments(assessments: CBCAssessment[]): CBCSummary[] {
  // Group by student_id + subject_id + term_id
  const groups = new Map<string, CBCAssessment[]>();
  for (const a of assessments) {
    const key = `${a.student_id}-${a.subject_id}-${a.term_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const summaries: CBCSummary[] = [];
  for (const [, group] of groups) {
    const { student_id, subject_id, term_id } = group[0];

    // Separate formative and summative assessments
    const formativeAssessments = group.filter(a => a.assessment_type === 'Formative' && a.rubric_level);
    const summativeAssessments = group.filter(a => a.assessment_type === 'Summative' && a.rubric_level);

    // Compute formative level (mode of all formative rubric levels)
    const formativeLevel = modeRubricLevel(formativeAssessments.map(a => a.rubric_level));

    // Summative level (mode if multiple, or just the one)
    const summativeLevel = modeRubricLevel(summativeAssessments.map(a => a.rubric_level));

    // Overall level: weighted 60/40 if both exist, otherwise use whichever is available
    let overallLevel: RubricLevel | null = null;
    if (formativeLevel && summativeLevel) {
      overallLevel = weightedSummary(formativeLevel, summativeLevel);
    } else if (summativeLevel) {
      overallLevel = summativeLevel;
    } else if (formativeLevel) {
      overallLevel = formativeLevel;
    }

    summaries.push({
      student_id,
      subject_id,
      term_id,
      formative_level: formativeLevel || undefined,
      summative_level: summativeLevel || undefined,
      overall_level: overallLevel || undefined,
      formative_count: formativeAssessments.length,
    });
  }

  return summaries;
}

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
  const [assessments, setAssessments] = useState<CBCAssessment[]>([]);
  const [interventions, setInterventions] = useState<CBCInterventionFlag[]>([]);
  const [prevTermAssessments, setPrevTermAssessments] = useState<CBCAssessment[]>([]);
  const [allTermAssessments, setAllTermAssessments] = useState<CBCAssessment[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // ── Compute summaries on-the-fly from assessments ──
  const summaries = useMemo(() => computeSummariesFromAssessments(assessments), [assessments]);
  const prevTermSummaries = useMemo(() => computeSummariesFromAssessments(prevTermAssessments), [prevTermAssessments]);
  const allTermSummaries = useMemo(() => computeSummariesFromAssessments(allTermAssessments), [allTermAssessments]);

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
      supabase.from('school_teachers').select('id,first_name,last_name').limit(500),
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

  // ── Fetch term-dependent data (assessments directly — NOT the empty summaries table) ──
  useEffect(() => {
    if (!selTerm) return;
    setLoadingData(true);
    const load = async () => {
      const termId = Number(selTerm);

      // Fetch assessments for current term (this is where the actual marks live)
      const [asmtRes, intRes] = await Promise.all([
        supabase.from('cbc_assessments').select('*').eq('term_id', termId),
        supabase.from('cbc_intervention_flags').select('*').eq('term_id', termId),
      ]);
      setAssessments(asmtRes.data || []);
      setInterventions(intRes.data || []);

      // Fetch previous term assessments for trend analysis
      const currentTermIdx = terms.findIndex(t => String(t.id) === selTerm);
      if (currentTermIdx >= 0 && currentTermIdx < terms.length - 1) {
        const prevTerm = terms[currentTermIdx + 1];
        const { data: prevData } = await supabase.from('cbc_assessments').select('*').eq('term_id', prevTerm.id);
        setPrevTermAssessments(prevData || []);
      } else {
        setPrevTermAssessments([]);
      }

      // Fetch all assessments for longitudinal analysis
      const { data: allData } = await supabase.from('cbc_assessments').select('*');
      setAllTermAssessments(allData || []);

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

  // ── Filtered summaries (computed from assessments) ──
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
    // Term data (computed on-the-fly from assessments)
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
