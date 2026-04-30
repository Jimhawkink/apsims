'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useQuestionBankData() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [pastPapers, setPastPapers] = useState<any[]>([]);
  const [paperVersions, setPaperVersions] = useState<any[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<any[]>([]);
  const [kcseFrequency, setKcseFrequency] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [q, s, t, f, pp, pv, ps, kf, ex] = await Promise.all([
        supabase.from('school_question_bank').select('*').order('id', { ascending: false }),
        supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
        supabase.from('school_topics').select('*').order('topic_name'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_past_papers').select('*').order('year', { ascending: false }),
        supabase.from('school_paper_versions').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('school_student_practice').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('school_kcse_frequency').select('*').order('year', { ascending: false }),
        supabase.from('school_exams').select('id, exam_name, term_id, form_id').order('created_at', { ascending: false }).limit(50),
      ]);
      setQuestions(q.data || []);
      setSubjects(s.data || []);
      setTopics(t.data || []);
      setForms(f.data || []);
      setPastPapers(pp.data || []);
      setPaperVersions(pv.data || []);
      setPracticeSessions(ps.data || []);
      setKcseFrequency(kf.data || []);
      setExams(ex.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || '-';
  const getFormName = (id: number) => { const f = forms.find(f => f.id === id); return f ? `Form ${f.form_level || f.id}` : '-'; };
  const getTopicName = (id: number) => topics.find(t => t.id === id)?.topic_name || '-';

  return {
    loading, fetchAll,
    questions, subjects, topics, forms, pastPapers, paperVersions,
    practiceSessions, kcseFrequency, exams,
    getSubjectName, getFormName, getTopicName,
  };
}
