'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem, RubricLevel } from '@/lib/cbc-utils';

export interface SubjectAnalysis {
  subjectId: number;
  subjectName: string;
  ee: number;
  me: number;
  ae: number;
  be: number;
  na: number;
  total: number;
  meanScore: number | null;
  scoreCount: number;
}

export interface StudentSummaryRow {
  studentId: number;
  name: string;
  admNo: string;
  stream: string;
  subjectCount: number;
  eeCount: number;
  meCount: number;
  aeCount: number;
  beCount: number;
  overallLevel: string | null;
  avgScore: number | null;
}

export interface FormTrend {
  formName: string;
  formId: number;
  ee: number;
  me: number;
  ae: number;
  be: number;
  total: number;
  meanScore: number | null;
}

export interface TermTrend {
  termId: number;
  termName: string;
  ee: number;
  me: number;
  ae: number;
  be: number;
  total: number;
  meanScore: number | null;
}

export function useCBCSummaryData() {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [markScores, setMarkScores] = useState<any[]>([]);
  const [competencySummaries, setCompetencySummaries] = useState<any[]>([]);
  const [interventionFlags, setInterventionFlags] = useState<any[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selSubject, setSelSubject] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, termsRes, studentsRes, assessRes, scoresRes, compRes, flagsRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
      supabase.from('cbc_assessments').select('*'),
      supabase.from('cbc_mark_scores').select('*'),
      supabase.from('cbc_competency_summaries').select('*'),
      supabase.from('cbc_intervention_flags').select('*'),
    ]);

    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');

    setForms(cbcForms);
    setStreams(streamsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTerms(termsRes.data || []);
    setStudents(studentsRes.data || []);
    setAssessments(assessRes.data || []);
    setMarkScores(scoresRes.data || []);
    setCompetencySummaries(compRes.data || []);
    setInterventionFlags(flagsRes.data || []);

    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));
    if (cbcForms.length > 0) setSelForm(String(cbcForms[0].id));

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter assessments by selected term
  const termAssessments = useMemo(() => {
    if (!selTerm) return assessments;
    return assessments.filter(a => String(a.term_id) === selTerm);
  }, [assessments, selTerm]);

  const termMarkScores = useMemo(() => {
    if (!selTerm) return markScores;
    return markScores.filter(ms => String(ms.term_id) === selTerm);
  }, [markScores, selTerm]);

  // Filter students by form
  const formStudents = useMemo(() => {
    if (!selForm) return students;
    return students.filter(s => String(s.form_id) === selForm);
  }, [students, selForm]);

  // ── Overall rubric distribution ──
  const overallDistribution = useMemo(() => {
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0, total: 0 };
    termAssessments.forEach(a => {
      const formStudentIds = formStudents.map(s => s.id);
      if (formStudentIds.length > 0 && !formStudentIds.includes(a.student_id)) return;
      if (a.rubric_level && counts[a.rubric_level as keyof typeof counts] !== undefined) {
        (counts as any)[a.rubric_level]++;
        counts.total++;
      }
    });
    return counts;
  }, [termAssessments, formStudents]);

  // ── Mean score ──
  const overallMeanScore = useMemo(() => {
    const relevantScores = termMarkScores.filter(ms => {
      const formStudentIds = formStudents.map(s => s.id);
      return formStudentIds.length === 0 || formStudentIds.includes(ms.student_id);
    });
    if (relevantScores.length === 0) return null;
    const sum = relevantScores.reduce((acc: number, ms: any) => acc + Number(ms.raw_score || 0), 0);
    return Math.round(sum / relevantScores.length);
  }, [termMarkScores, formStudents]);

  // ── Subject-by-subject analysis ──
  const subjectAnalysis: SubjectAnalysis[] = useMemo(() => {
    return subjects.map(sub => {
      const subAssessments = termAssessments.filter(a => a.subject_id === sub.id);
      const subScores = termMarkScores.filter(ms => ms.subject_id === sub.id);
      const formStudentIds = formStudents.map(s => s.id);

      const filtered = formStudentIds.length > 0
        ? subAssessments.filter(a => formStudentIds.includes(a.student_id))
        : subAssessments;

      const filteredScores = formStudentIds.length > 0
        ? subScores.filter(ms => formStudentIds.includes(ms.student_id))
        : subScores;

      const counts = { ee: 0, me: 0, ae: 0, be: 0, na: 0 };
      filtered.forEach(a => {
        if (a.rubric_level === 'EE') counts.ee++;
        else if (a.rubric_level === 'ME') counts.me++;
        else if (a.rubric_level === 'AE') counts.ae++;
        else if (a.rubric_level === 'BE') counts.be++;
        else counts.na++;
      });

      const scoreValues = filteredScores.map((ms: any) => Number(ms.raw_score)).filter((n: number) => !isNaN(n));
      const meanScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length)
        : null;

      return {
        subjectId: sub.id,
        subjectName: sub.subject_name,
        ...counts,
        total: filtered.length,
        meanScore,
        scoreCount: scoreValues.length,
      };
    }).filter(s => s.total > 0).sort((a, b) => (b.meanScore || 0) - (a.meanScore || 0));
  }, [subjects, termAssessments, termMarkScores, formStudents]);

  // ── Student-level summary ──
  const studentSummaries: StudentSummaryRow[] = useMemo(() => {
    return formStudents.map(student => {
      const stuAssessments = termAssessments.filter(a => a.student_id === student.id);
      const stuScores = termMarkScores.filter(ms => ms.student_id === student.id);

      let eeCount = 0, meCount = 0, aeCount = 0, beCount = 0;
      stuAssessments.forEach(a => {
        if (a.rubric_level === 'EE') eeCount++;
        else if (a.rubric_level === 'ME') meCount++;
        else if (a.rubric_level === 'AE') aeCount++;
        else if (a.rubric_level === 'BE') beCount++;
      });

      const scoreValues = stuScores.map((ms: any) => Number(ms.raw_score)).filter((n: number) => !isNaN(n));
      const avgScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length)
        : null;

      // Determine overall level by mode
      const levelCounts = { EE: eeCount, ME: meCount, AE: aeCount, BE: beCount };
      let overallLevel: string | null = null;
      let maxCount = 0;
      for (const [lvl, cnt] of Object.entries(levelCounts)) {
        if (cnt > maxCount) { maxCount = cnt; overallLevel = lvl; }
      }

      const stream = streams.find(s => s.id === student.stream_id);

      return {
        studentId: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admNo: student.admission_no || student.admission_number || '',
        stream: stream?.stream_name || '',
        subjectCount: stuAssessments.length,
        eeCount, meCount, aeCount, beCount,
        overallLevel: maxCount > 0 ? overallLevel : null,
        avgScore,
      };
    }).filter(s => s.subjectCount > 0).sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
  }, [formStudents, termAssessments, termMarkScores, streams]);

  // ── Term-over-term trends ──
  const termTrends: TermTrend[] = useMemo(() => {
    return terms.slice(0, 6).reverse().map(term => {
      const tAssessments = assessments.filter(a => a.term_id === term.id);
      const tScores = markScores.filter(ms => ms.term_id === term.id);
      const formStudentIds = formStudents.map(s => s.id);

      const filtered = formStudentIds.length > 0
        ? tAssessments.filter(a => formStudentIds.includes(a.student_id))
        : tAssessments;

      const filteredScores = formStudentIds.length > 0
        ? tScores.filter(ms => formStudentIds.includes(ms.student_id))
        : tScores;

      let ee = 0, me = 0, ae = 0, be = 0;
      filtered.forEach(a => {
        if (a.rubric_level === 'EE') ee++;
        else if (a.rubric_level === 'ME') me++;
        else if (a.rubric_level === 'AE') ae++;
        else if (a.rubric_level === 'BE') be++;
      });

      const scoreValues = filteredScores.map((ms: any) => Number(ms.raw_score)).filter((n: number) => !isNaN(n));
      const meanScore = scoreValues.length > 0
        ? Math.round(scoreValues.reduce((a: number, b: number) => a + b, 0) / scoreValues.length)
        : null;

      return { termId: term.id, termName: term.term_name, ee, me, ae, be, total: filtered.length, meanScore };
    });
  }, [terms, assessments, markScores, formStudents]);

  // ── Intervention stats ──
  const interventionStats = useMemo(() => {
    const termFlags = selTerm
      ? interventionFlags.filter(f => String(f.term_id) === selTerm)
      : interventionFlags;
    return {
      open: termFlags.filter(f => f.status === 'open').length,
      inProgress: termFlags.filter(f => f.status === 'in_progress').length,
      resolved: termFlags.filter(f => f.status === 'resolved').length,
      total: termFlags.length,
    };
  }, [interventionFlags, selTerm]);

  // ── Top performers ──
  const topPerformers = useMemo(() => {
    return studentSummaries.filter(s => s.avgScore !== null).slice(0, 10);
  }, [studentSummaries]);

  // ── At-risk students (BE heavy) ──
  const atRiskStudents = useMemo(() => {
    return studentSummaries.filter(s => s.beCount > 0).sort((a, b) => b.beCount - a.beCount).slice(0, 10);
  }, [studentSummaries]);

  return {
    loading, forms, streams, subjects, terms, formStudents,
    selForm, setSelForm, selTerm, setSelTerm, selSubject, setSelSubject,
    overallDistribution, overallMeanScore,
    subjectAnalysis, studentSummaries, termTrends,
    interventionStats, topPerformers, atRiskStudents,
    totalAssessments: termAssessments.length,
  };
}
