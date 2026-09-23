'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiRefreshCw, FiSearch,
  FiUsers, FiGrid, FiX, FiDownload, FiAlertCircle,
  FiAward, FiUser, FiCheckCircle,
} from 'react-icons/fi';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  staff_no?: string;
  tsc_number?: string;
}
interface Subject { id: number; subject_name: string; subject_code?: string; category?: string; }
interface LearningArea { id: number; name: string; code: string; icon: string; color: string; }
interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }

// â”€â”€ This is the canonical table used by mobile, marks, reports, timetable â”€â”€â”€â”€
interface SubjectTeacher {
  id?: number;
  teacher_id: number;
  subject_id?: number | null;
  learning_area_id?: number | null;
  form_id?: number | null;
  stream_id?: number | null;
  term_id?: number | null;
  year?: number | null;
  is_class_teacher?: boolean;
  is_active?: boolean;
  assigned_by?: string;
  teacher_initials?: string;
}
interface SubjectTeacherRow extends SubjectTeacher {
  teacher?: Teacher;
  subject?: Subject;
  learning_area?: LearningArea;
  form?: Form;
  stream?: Stream;
}

// â”€â”€â”€ KICD JSS Learning Areas (CBC Grade 7-9) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KICD_LEARNING_AREAS: LearningArea[] = [
  { id: 1,  code: 'ENG', name: 'English',                icon: 'ðŸ“–', color: '#2563EB' },
  { id: 2,  code: 'KSW', name: 'Kiswahili',              icon: 'ðŸ—£ï¸', color: '#059669' },
  { id: 3,  code: 'MAT', name: 'Mathematics',            icon: 'ðŸ”¢', color: '#DC2626' },
  { id: 4,  code: 'ISC', name: 'Integrated Science',     icon: 'âš—ï¸', color: '#7C3AED' },
  { id: 5,  code: 'SST', name: 'Social Studies',         icon: 'ðŸŒ', color: '#D97706' },
  { id: 6,  code: 'AGR', name: 'Agriculture',            icon: 'ðŸŒ±', color: '#16A34A' },
  { id: 7,  code: 'PTS', name: 'Pre-Technical Studies',  icon: 'ðŸ”§', color: '#0891B2' },
  { id: 8,  code: 'BUS', name: 'Business Studies',       icon: 'ðŸ’¼', color: '#9333EA' },
  { id: 9,  code: 'CAS', name: 'Creative Arts & Sports', icon: 'ðŸŽ¨', color: '#EC4899' },
  { id: 10, code: 'LSE', name: 'Life Skills Education',  icon: 'ðŸ’¡', color: '#06B6D4' },
  { id: 11, code: 'CRE', name: 'Religious Education',    icon: 'âœï¸', color: '#6366F1' },
];

type Tab = 'grid' | 'list' | 'teacher-view';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function teacherInitials(t: Teacher): string {
  return [t.first_name, t.middle_name, t.last_name]
    .filter(Boolean)
    .map(p => p![0].toUpperCase())
    .join('');
}

function isJSSForm(f?: Form): boolean {
  if (!f) return false;
  return (
    (f.form_level >= 7 && f.form_level <= 9) ||
    /grade\s*(7|8|9)/i.test(f.form_name || '')
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function TeacherSubjectsPage() {
  const [teachers, setTeachers]         = useState<Teacher[]>([]);
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>(KICD_LEARNING_AREAS);
  const [forms, setForms]               = useState<Form[]>([]);
  const [streams, setStreams]           = useState<Stream[]>([]);
  const [terms, setTerms]               = useState<Term[]>([]);
  const [assignments, setAssignments]   = useState<SubjectTeacherRow[]>([]);

  const [selForm, setSelForm]       = useState('');
  const [selStream, setSelStream]   = useState('');
  const [selTerm, setSelTerm]       = useState('');
  const [selYear, setSelYear]       = useState(new Date().getFullYear());
  const [selTeacher, setSelTeacher] = useState('');
  const [search, setSearch]         = useState('');
  const [tab, setTab]               = useState<Tab>('grid');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const [showModal, setShowModal]     = useState(false);
  const [editAssign, setEditAssign]   = useState<Partial<SubjectTeacher>>({});
  const [jssMode, setJssMode]         = useState(false);   // auto-detected from selected form

  // â”€â”€ Load reference data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [tR, suppR, sR, laR, fR, stR, trR] = await Promise.all([
        supabase.from('school_teachers')
          .select('id,first_name,last_name,middle_name,staff_no,tsc_number')
          .eq('status', 'Active')
          .order('last_name'),
        supabase.from('school_support_teachers')
          .select('id,first_name,last_name,staff_no')
          .eq('status', 'Active')
          .order('last_name'),
        supabase.from('school_subjects')
          .select('*')
          .eq('is_active', true)
          .order('subject_name'),
        supabase.from('jss_learning_areas')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase.from('school_forms')
          .select('*')
          .order('form_level'),
        supabase.from('school_streams')
          .select('*')
          .order('stream_name'),
        supabase.from('school_terms')
          .select('*')
          .order('year', { ascending: false }),
      ]);

      // Merge TSC + Support teachers into one list
      const tscList = (tR.data || []).map((t: any) => ({ ...t, _type: 'TSC' }));
      const suppList = (suppR.data || []).map((t: any) => ({ ...t, tsc_number: t.staff_no || 'Support', _type: 'Support' }));
      setTeachers([...tscList, ...suppList]);
      setSubjects(sR.data || []);
      // Prefer DB learning areas; fall back to hardcoded KICD list
      setLearningAreas(
        laR.data && laR.data.length > 0 ? laR.data : KICD_LEARNING_AREAS
      );
      setForms(fR.data || []);
      setStreams(stR.data || []);
      setTerms(trR.data || []);

      // Do NOT auto-select term - Settings records have term_id=NULL and would be hidden
      const cur = (trR.data || []).find((t: Term) => t.is_current);
      if (cur) setSelYear(cur.year);

      setLoading(false);
    };
    load();
  }, []);

  // â”€â”€ Auto-detect JSS mode when form changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const f = forms.find(f => String(f.id) === selForm);
    setJssMode(isJSSForm(f));
  }, [selForm, forms]);

  // â”€â”€ Fetch assignments from canonical table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAssignments = useCallback(async () => {
    // Reads from school_subject_teachers â€” the canonical table used by
    // Settings page, mobile app, marks entry, reports, timetable etc.
    // NO year filter by default: Settings-created records have year=NULL
    // and must still be visible here.
    let q = supabase
      .from('school_subject_teachers')
      .select('*')
      .order('form_id');

    if (selForm)    q = q.eq('form_id', selForm);
    if (selStream)  q = q.eq('stream_id', selStream);
    // Term filter: include null-term records (saved via Settings) always
    if (selTerm) {
      q = q.or(	erm_id.eq. + selTerm + ,term_id.is.null);
    }
    if (selTeacher) q = q.eq('teacher_id', selTeacher);
    // Only filter by year when a specific year is chosen AND
    // we also include NULL-year records (added via Settings page)
    // by using .or() so legacy records are never hidden.
    if (selYear && !selTerm) {
      q = q.or(`year.eq.${selYear},year.is.null`);
    }

    const { data, error } = await q;
    if (error) {
      console.error('fetch assignments error:', error.message);
      return;
    }

    const enriched: SubjectTeacherRow[] = (data || []).map((a: SubjectTeacher) => ({
      ...a,
      teacher:       teachers.find(t => t.id === a.teacher_id),
      subject:       subjects.find(s => s.id === a.subject_id),
      learning_area: learningAreas.find(la => la.id === a.learning_area_id),
      form:          forms.find(f => f.id === a.form_id),
      stream:        streams.find(s => s.id === a.stream_id),
    }));
    setAssignments(enriched);
  }, [selForm, selStream, selTerm, selYear, selTeacher, teachers, subjects, learningAreas, forms, streams]);

  useEffect(() => {
    if (teachers.length > 0) fetchAssignments();
  }, [fetchAssignments, teachers.length]);

  // â”€â”€ Save assignment â†’ school_subject_teachers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saveAssignment = async () => {
    if (!editAssign.teacher_id) {
      toast.error('Please select a teacher'); return;
    }
    if (!editAssign.form_id) {
      toast.error('Please select a class / form'); return;
    }
    if (!editAssign.subject_id && !editAssign.learning_area_id) {
      toast.error('Please select a subject or learning area'); return;
    }

    setSaving(true);
    try {
      const teacher = teachers.find(t => t.id === editAssign.teacher_id);
      const payload: SubjectTeacher = {
        teacher_id:       editAssign.teacher_id,
        subject_id:       editAssign.subject_id || null,
        learning_area_id: editAssign.learning_area_id || null,
        form_id:          editAssign.form_id || null,
        stream_id:        editAssign.stream_id || null,
        term_id:          editAssign.term_id ? Number(editAssign.term_id) : null,
        year:             selYear,
        is_class_teacher: editAssign.is_class_teacher || false,
        is_active:        true,
        assigned_by:      'admin',
        teacher_initials: teacher ? teacherInitials(teacher) : undefined,
      };

      if (editAssign.id) {
        // â”€â”€ Update existing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const { error } = await supabase
          .from('school_subject_teachers')
          .update(payload)
          .eq('id', editAssign.id);
        if (error) throw error;
        toast.success('âœ… Assignment updated');
      } else {
        // â”€â”€ Check for duplicate before insert â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let dupQ = supabase
          .from('school_subject_teachers')
          .select('id')
          .eq('teacher_id', payload.teacher_id!)
          .eq('form_id', payload.form_id!);

        if (payload.subject_id) dupQ = dupQ.eq('subject_id', payload.subject_id);
        if (payload.learning_area_id) dupQ = dupQ.eq('learning_area_id', payload.learning_area_id);
        if (payload.stream_id) dupQ = dupQ.eq('stream_id', payload.stream_id);
        // No duplicate check on term_id â€” a teacher can teach same subject across terms

        const { data: dup } = await dupQ.limit(1);
        if (dup && dup.length > 0) {
          toast.error('This assignment already exists!');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('school_subject_teachers')
          .insert([payload]);
        if (error) throw error;
        toast.success('âœ… Assignment saved to database');
      }

      setShowModal(false);
      setEditAssign({});
      fetchAssignments();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deleteAssignment = async (id: number) => {
    if (!confirm('Remove this teacher-subject assignment?')) return;
    const { error } = await supabase
      .from('school_subject_teachers')
      .delete()
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Assignment removed');
    fetchAssignments();
  };

  // â”€â”€ Open modal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openNew = (prefill?: Partial<SubjectTeacher>) => {
    setEditAssign({
      form_id:         Number(selForm) || undefined,
      term_id:         Number(selTerm) || undefined,
      year:            selYear,
      is_class_teacher: false,
      is_active:       true,
      ...prefill,
    });
    setShowModal(true);
  };

  // â”€â”€ Modal JSS auto-detect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const modalForm = forms.find(f => String(f.id) === String(editAssign.form_id));
  const modalIsJSS = isJSSForm(modalForm);

  // â”€â”€ Export CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const exportCSV = () => {
    const headers = ['Teacher','Staff No','Type','Subject / Learning Area','Class','Stream','Term','Year','Class Teacher'];
    const rows = assignments.map(a => [
      `${a.teacher?.first_name || ''} ${a.teacher?.last_name || ''}`.trim(),
      a.teacher?.staff_no || a.teacher?.tsc_number || '',
      a.learning_area ? 'CBC/JSS' : '8-4-4',
      a.subject?.subject_name || a.learning_area?.name || '',
      a.form?.form_name || '',
      a.stream?.stream_name || 'All',
      terms.find(t => t.id === a.term_id)?.term_name || 'All',
      a.year || '',
      a.is_class_teacher ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Teacher_Assignments_${selYear}.csv`;
    a.click();
    toast.success('Exported!');
  };

  // â”€â”€ Filtered list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const s = search.toLowerCase();
    return assignments.filter(a =>
      `${a.teacher?.first_name} ${a.teacher?.last_name}`.toLowerCase().includes(s) ||
      (a.subject?.subject_name || a.learning_area?.name || '').toLowerCase().includes(s) ||
      (a.form?.form_name || '').toLowerCase().includes(s)
    );
  }, [assignments, search]);

  // â”€â”€ Grid helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const gridForms   = useMemo(() => selForm ? forms.filter(f => String(f.id) === selForm) : forms, [forms, selForm]);
  const gridItems   = jssMode ? learningAreas : subjects;

  const getAssigned = (formId: number, itemId: number): Teacher | undefined => {
    const a = assignments.find(a =>
      a.form_id === formId &&
      (jssMode ? a.learning_area_id === itemId : a.subject_id === itemId)
    );
    return a?.teacher;
  };

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stats = useMemo(() => ({
    total:         assignments.length,
    teachers:      new Set(assignments.map(a => a.teacher_id)).size,
    classTeachers: assignments.filter(a => a.is_class_teacher).length,
    cbcCount:      assignments.filter(a => !!a.learning_area_id).length,
    kcseCount:     assignments.filter(a => !!a.subject_id).length,
  }), [assignments]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // RENDER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* â”€â”€ ASSIGNMENT MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-black text-gray-800 text-lg">
                  {editAssign.id ? 'âœï¸ Edit Assignment' : 'âž• New Assignment'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Saves to school_subject_teachers (used by mobile & all pages)</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditAssign({}); }}
                className="p-2 hover:bg-gray-100 rounded-lg">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Teacher */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">ðŸ‘¤ Teacher *</label>
                <select
                  value={editAssign.teacher_id || ''}
                  onChange={e => setEditAssign(p => ({ ...p, teacher_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}{t.staff_no ? ` (${t.staff_no})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class + Stream */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ðŸ« Class / Form *</label>
                  <select
                    value={editAssign.form_id || ''}
                    onChange={e => setEditAssign(p => ({ ...p, form_id: Number(e.target.value), subject_id: undefined, learning_area_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                    <option value="">Select</option>
                    {forms.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.form_name} {isJSSForm(f) ? 'ðŸ“— JSS' : 'ðŸ“˜ KCSE'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ðŸ”€ Stream</label>
                  <select
                    value={editAssign.stream_id || ''}
                    onChange={e => setEditAssign(p => ({ ...p, stream_id: Number(e.target.value) || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                    <option value="">All Streams</option>
                    {streams.map(s => (
                      <option key={s.id} value={s.id}>{s.stream_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Curriculum type indicator */}
              {modalForm && (
                <div className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
                  modalIsJSS
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  {modalIsJSS
                    ? 'ðŸ“— JSS / CBC Mode â€” select a Learning Area below'
                    : 'ðŸ“˜ 8-4-4 / KCSE Mode â€” select a Subject below'}
                </div>
              )}

              {/* Subject (8-4-4) */}
              {(!modalIsJSS) && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ðŸ“š Subject (8-4-4 / Senior)</label>
                  <select
                    value={editAssign.subject_id || ''}
                    onChange={e => setEditAssign(p => ({ ...p, subject_id: Number(e.target.value) || undefined, learning_area_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Learning Area (JSS/CBC) */}
              {(modalIsJSS) && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ðŸŒ¿ JSS Learning Area (CBC)</label>
                  <select
                    value={editAssign.learning_area_id || ''}
                    onChange={e => setEditAssign(p => ({ ...p, learning_area_id: Number(e.target.value) || undefined, subject_id: undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                    <option value="">Select Learning Area</option>
                    {learningAreas.map(la => (
                      <option key={la.id} value={la.id}>{la.icon} {la.name} ({la.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* If form not yet selected â€” show both */}
              {!modalForm && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">ðŸ“š Subject (8-4-4 / KCSE)</label>
                    <select
                      value={editAssign.subject_id || ''}
                      onChange={e => setEditAssign(p => ({ ...p, subject_id: Number(e.target.value) || undefined, learning_area_id: undefined }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.subject_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center text-xs text-gray-400 font-medium">â€” OR â€”</div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">ðŸŒ¿ JSS Learning Area (CBC)</label>
                    <select
                      value={editAssign.learning_area_id || ''}
                      onChange={e => setEditAssign(p => ({ ...p, learning_area_id: Number(e.target.value) || undefined, subject_id: undefined }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                      <option value="">Select Learning Area</option>
                      {learningAreas.map(la => (
                        <option key={la.id} value={la.id}>{la.icon} {la.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Term + Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ðŸ“… Term</label>
                  <select
                    value={editAssign.term_id || ''}
                    onChange={e => setEditAssign(p => ({ ...p, term_id: Number(e.target.value) || undefined }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                    <option value="">All Terms</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' âœ“' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editAssign.is_class_teacher || false}
                      onChange={e => setEditAssign(p => ({ ...p, is_class_teacher: e.target.checked }))}
                      className="rounded w-4 h-4 accent-indigo-600"
                    />
                    <span className="font-semibold text-gray-700">Class Teacher</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pt-0 justify-end border-t">
              <button
                onClick={() => { setShowModal(false); setEditAssign({}); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={saveAssignment}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-70">
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : editAssign.id ? 'Update' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#0891B2)' }}>
                <FiUser size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Teacher Subject Assignment</h1>
                <p className="text-xs text-gray-400">
                  Supports 8-4-4 (Subjects) & CBC/JSS (Learning Areas) Â· Saves to database âœ“
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={fetchAssignments}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiRefreshCw size={14} />
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiDownload size={14} /> Export
              </button>
              <button
                onClick={() => openNew()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#0891B2)' }}>
                <FiPlus size={14} /> New Assignment
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={selForm}
              onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Classes</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.form_name} {isJSSForm(f) ? 'ðŸ“—' : 'ðŸ“˜'}
                </option>
              ))}
            </select>
            <select
              value={selStream}
              onChange={e => setSelStream(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[130px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
            <select
              value={selTerm}
              onChange={e => {
                setSelTerm(e.target.value);
                const t = terms.find(t => String(t.id) === e.target.value);
                if (t) setSelYear(t.year);
              }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>
                  {t.term_name} {t.year}{t.is_current ? ' âœ“' : ''}
                </option>
              ))}
            </select>
            <select
              value={selTeacher}
              onChange={e => setSelTeacher(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[180px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Teachers</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teacher, subject or class..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {([
            ['grid', 'ðŸ—“ï¸ Assignment Grid'],
            ['list', 'ðŸ“‹ Full List'],
            ['teacher-view', 'ðŸ‘©â€ðŸ« By Teacher'],
          ] as [Tab, string][]).map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ CONTENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <FiRefreshCw size={24} className="animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Assignments',  value: stats.total,         color: '#4F46E5', icon: FiGrid },
                { label: 'Teachers Assigned',  value: stats.teachers,      color: '#059669', icon: FiUsers },
                { label: 'Class Teachers',      value: stats.classTeachers, color: '#D97706', icon: FiAward },
                { label: '8-4-4 / KCSE',       value: stats.kcseCount,     color: '#2563EB', icon: FiCheckCircle },
                { label: 'CBC / JSS',           value: stats.cbcCount,      color: '#16A34A', icon: FiCheckCircle },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}18` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-black" style={{ color }}>{value}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* â”€â”€ GRID TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {tab === 'grid' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="font-bold text-gray-800 text-sm">
                    Assignment Matrix â€” {jssMode ? 'ðŸ“— JSS Learning Areas (CBC)' : 'ðŸ“˜ Subjects (8-4-4)'}
                  </h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    jssMode ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {jssMode ? 'CBC / JSS mode' : '8-4-4 / KCSE mode'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 sticky left-0 bg-gray-50 z-10 min-w-[170px] font-bold text-gray-600 uppercase">
                          {jssMode ? 'Learning Area' : 'Subject'}
                        </th>
                        {gridForms.map(f => (
                          <th key={f.id} className="text-center py-3 px-3 min-w-[120px] font-bold text-gray-600 uppercase">
                            {f.form_name}
                            <span className={`block text-[9px] font-normal mt-0.5 ${isJSSForm(f) ? 'text-green-500' : 'text-blue-500'}`}>
                              {isJSSForm(f) ? 'JSS/CBC' : '8-4-4'}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(jssMode ? learningAreas : subjects).map((item, idx) => (
                        <tr key={item.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5 min-w-[170px]">
                            <div className="flex items-center gap-2">
                              {jssMode && <span className="text-base">{(item as LearningArea).icon}</span>}
                              <div>
                                <p className="font-semibold text-gray-700">
                                  {jssMode ? (item as LearningArea).name : (item as Subject).subject_name}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {jssMode ? (item as LearningArea).code : (item as Subject).subject_code}
                                </p>
                              </div>
                            </div>
                          </td>
                          {gridForms.map(f => {
                            const teacher = getAssigned(f.id, item.id);
                            const formIsJSS = isJSSForm(f);
                            // Only show assignment in correct curriculum column
                            const relevant = jssMode === formIsJSS || !selForm;
                            return (
                              <td key={f.id} className="text-center px-2 py-2">
                                {teacher ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                      style={{ background: `hsl(${(teacher.id * 47) % 360},60%,50%)` }}>
                                      {teacher.first_name[0]}{teacher.last_name[0]}
                                    </div>
                                    <span className="text-[9px] text-gray-600 leading-tight">
                                      {teacher.first_name}<br />{teacher.last_name}
                                    </span>
                                  </div>
                                ) : relevant ? (
                                  <button
                                    onClick={() => openNew({
                                      form_id: f.id,
                                      [formIsJSS ? 'learning_area_id' : 'subject_id']: item.id,
                                    })}
                                    className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition mx-auto text-gray-300 hover:text-indigo-500">
                                    <FiPlus size={12} />
                                  </button>
                                ) : (
                                  <span className="text-gray-200 text-[9px]">â€”</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* â”€â”€ LIST TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {tab === 'list' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['Teacher','Staff No','Type','Subject / Learning Area','Class','Stream','Term','Class Teacher','Actions'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-gray-400">
                            No assignments found. Click <strong>+ New Assignment</strong> to add one.
                          </td>
                        </tr>
                      ) : filtered.map((a, idx) => (
                        <tr key={a.id || idx} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                style={{ background: `hsl(${((a.teacher?.id || 0) * 47) % 360},60%,50%)` }}>
                                {a.teacher?.first_name?.[0]}{a.teacher?.last_name?.[0]}
                              </div>
                              <span className="text-xs font-semibold text-gray-800">
                                {a.teacher?.first_name} {a.teacher?.last_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{a.teacher?.staff_no || a.teacher?.tsc_number || 'â€”'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              a.learning_area
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {a.learning_area ? 'CBC/JSS' : '8-4-4'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {a.learning_area ? (
                              <span className="flex items-center gap-1 text-xs font-medium">
                                <span>{a.learning_area.icon}</span>{a.learning_area.name}
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-gray-700">{a.subject?.subject_name}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{a.form?.form_name}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{a.stream?.stream_name || 'All'}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">
                            {terms.find(t => t.id === a.term_id)?.term_name || 'All'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {a.is_class_teacher
                              ? <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-lg font-bold">âœ“ Yes</span>
                              : <span className="text-gray-300 text-xs">â€”</span>
                            }
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditAssign(a); setShowModal(true); }}
                                className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500"
                                title="Edit">
                                <FiEdit2 size={12} />
                              </button>
                              <button
                                onClick={() => a.id && deleteAssignment(a.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"
                                title="Delete">
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* â”€â”€ TEACHER VIEW TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {tab === 'teacher-view' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teachers
                  .filter(t => assignments.some(a => a.teacher_id === t.id))
                  .map(teacher => {
                    const tas = assignments.filter(a => a.teacher_id === teacher.id);
                    const isClassTeacher = tas.some(a => a.is_class_teacher);
                    const hasCBC  = tas.some(a => a.learning_area_id);
                    const hasKCSE = tas.some(a => a.subject_id);
                    return (
                      <div key={teacher.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ background: `hsl(${(teacher.id * 47) % 360},60%,50%)` }}>
                            {teacher.first_name[0]}{teacher.last_name[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 text-sm">{teacher.first_name} {teacher.last_name}</p>
                            <p className="text-[10px] text-gray-400">{teacher.staff_no || teacher.tsc_number || 'No staff no'}</p>
                          </div>
                          <div className="flex gap-1">
                            {isClassTeacher && (
                              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
                                Class Teacher
                              </span>
                            )}
                            {hasCBC && (
                              <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-lg font-bold">CBC</span>
                            )}
                            {hasKCSE && (
                              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-lg font-bold">KCSE</span>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{tas.length} Assignment(s)</p>
                          <div className="space-y-1.5">
                            {tas.map((a, i) => (
                              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                <span className="text-xs text-gray-500 w-16 flex-shrink-0">{a.form?.form_name}</span>
                                <span className="w-px h-3 bg-gray-300 flex-shrink-0" />
                                <span className="text-xs font-medium text-gray-700 flex-1">
                                  {a.learning_area
                                    ? `${a.learning_area.icon} ${a.learning_area.name}`
                                    : a.subject?.subject_name}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 rounded ${
                                  a.learning_area ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'
                                }`}>
                                  {a.learning_area ? 'CBC' : '844'}
                                </span>
                                {a.stream && <span className="text-[9px] text-gray-400">{a.stream.stream_name}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {teachers.filter(t => assignments.some(a => a.teacher_id === t.id)).length === 0 && (
                  <div className="col-span-3 flex flex-col items-center justify-center h-48 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                      <FiUsers size={28} className="text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-gray-700">No assignments yet</h3>
                    <p className="text-sm text-gray-400 mt-1">Create assignments using the + New Assignment button</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
