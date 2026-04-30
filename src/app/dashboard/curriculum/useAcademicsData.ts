'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useAcademicsData() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [syllabusCoverage, setSyllabusCoverage] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [contentBank, setContentBank] = useState<any[]>([]);
  const [knecSyllabus, setKnecSyllabus] = useState<any[]>([]);
  const [hodApprovals, setHodApprovals] = useState<any[]>([]);
  const [moeInspections, setMoeInspections] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [cbcStrands, setCbcStrands] = useState<any[]>([]);
  const [cbcSubStrands, setCbcSubStrands] = useState<any[]>([]);
  const [digitalTextbooks, setDigitalTextbooks] = useState<any[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, frm, strm, trm, tch, dep, sch, lp, sc, rm, rb, cb, kn, hod, moe, top, cbcS, cbcSS, dtb, sd] = await Promise.all([
        supabase.from('school_subjects').select('*').order('subject_name'),
        supabase.from('school_forms').select('*').order('id'),
        supabase.from('school_streams').select('*').order('stream_name'),
        supabase.from('school_terms').select('*').order('year', { ascending: false }),
        supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
        supabase.from('school_departments').select('*').order('department_name'),
        supabase.from('school_schemes_of_work').select('*, school_subjects(subject_name), school_forms(id), school_terms(term_name)').order('created_at', { ascending: false }).limit(100),
        supabase.from('school_lesson_plans').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('school_syllabus_coverage').select('*').order('created_at', { ascending: false }),
        supabase.from('school_room_bookings').select('*').order('room_name'),
        supabase.from('school_room_booking_schedule').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('school_content_bank').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('school_knec_syllabus').select('*').order('sort_order'),
        supabase.from('school_hod_approvals').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('school_moe_inspections').select('*').order('inspection_date', { ascending: false }),
        supabase.from('school_topics').select('*').order('topic_name'),
        supabase.from('school_cbc_strands').select('*').order('strand_name'),
        supabase.from('school_cbc_sub_strands').select('*').order('sub_strand_name'),
        supabase.from('school_digital_textbooks').select('*').order('created_at', { ascending: false }),
        supabase.from('school_details').select('*').limit(1),
      ]);
      setSubjects(sub.data || []);
      setForms(frm.data || []);
      setStreams(strm.data || []);
      setTerms(trm.data || []);
      setTeachers(tch.data || []);
      setDepartments(dep.data || []);
      setSchemes(sch.data || []);
      setLessonPlans(lp.data || []);
      setSyllabusCoverage(sc.data || []);
      setRooms(rm.data || []);
      setRoomBookings(rb.data || []);
      setContentBank(cb.data || []);
      setKnecSyllabus(kn.data || []);
      setHodApprovals(hod.data || []);
      setMoeInspections(moe.data || []);
      setTopics(top.data || []);
      setCbcStrands(cbcS.data || []);
      setCbcSubStrands(cbcSS.data || []);
      setDigitalTextbooks(dtb.data || []);
      setSchoolDetails(sd.data?.[0] || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || '-';
  const getFormName = (id: number) => { const f = forms.find(f => f.id === id); return f ? `Form ${f.form_number || f.id}` : '-'; };
  const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
  const getTermName = (id: number) => terms.find(t => t.id === id)?.term_name || '-';
  const getTeacherName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '-'; };
  const getDeptName = (id: number) => departments.find(d => d.id === id)?.department_name || '-';

  return {
    loading, fetchAll,
    subjects, forms, streams, terms, teachers, departments, schemes,
    lessonPlans, syllabusCoverage, rooms, roomBookings, contentBank,
    knecSyllabus, hodApprovals, moeInspections, topics, cbcStrands, cbcSubStrands,
    digitalTextbooks, schoolDetails,
    getSubjectName, getFormName, getStreamName, getTermName, getTeacherName, getDeptName,
  };
}
