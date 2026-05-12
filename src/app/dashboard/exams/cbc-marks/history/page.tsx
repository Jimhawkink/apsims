'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import CBCNavBar from '@/components/cbc/CBCNavBar';
import {
  FiClock, FiUsers, FiFilter, FiSearch, FiCalendar,
  FiTrendingUp, FiTrendingDown, FiMinus, FiBook,
  FiChevronDown, FiChevronUp, FiDownload, FiEdit3,
  FiCheckCircle, FiClipboard, FiEye,
} from 'react-icons/fi';

const RC = {
  EE: { bar: '#1D9E75', text: '#0F6E56', bg: '#E1F5EE' },
  ME: { bar: '#378ADD', text: '#185FA5', bg: '#E6F1FB' },
  AE: { bar: '#EF9F27', text: '#854F0B', bg: '#FAEEDA' },
  BE: { bar: '#E24B4A', text: '#A32D2D', bg: '#FCEBEB' },
};

function LevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded bg-gray-100">—</span>;
  const c = RC[level as keyof typeof RC] || { bg: '#f3f4f6', text: '#666' };
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: c.bg, color: c.text }}>{level}</span>;
}

export default function CBCHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [markScores, setMarkScores] = useState<any[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selStudent, setSelStudent] = useState('');
  const [selType, setSelType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<'date' | 'student' | 'subject' | 'level'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, termsRes, studentsRes, assessRes, scoresRes, notesRes, teachersRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
      supabase.from('cbc_assessments').select('*').order('assessed_at', { ascending: false }),
      supabase.from('cbc_mark_scores').select('*'),
      supabase.from('cbc_teacher_notes').select('*'),
      supabase.from('school_teachers').select('id,first_name,last_name'),
    ]);
    const allForms = formsRes.data || [];
    setForms(allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School'));
    setStreams(streamsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTerms(termsRes.data || []);
    setStudents(studentsRes.data || []);
    setAssessments(assessRes.data || []);
    setMarkScores(scoresRes.data || []);
    setTeacherNotes(notesRes.data || []);
    setTeachers(teachersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build enriched history entries
  const historyEntries = useMemo(() => {
    return assessments.map(a => {
      const student = students.find(s => s.id === a.student_id);
      const subject = subjects.find(s => s.id === a.subject_id);
      const term = terms.find(t => t.id === a.term_id);
      const teacher = teachers.find(t => t.id === a.teacher_id);
      const score = markScores.find(ms => ms.student_id === a.student_id && ms.subject_id === a.subject_id && ms.term_id === a.term_id && ms.assessment_type === a.assessment_type);
      const note = teacherNotes.find(tn => tn.student_id === a.student_id && tn.subject_id === a.subject_id && tn.term_id === a.term_id);

      return {
        id: a.id,
        studentId: a.student_id,
        studentName: student ? `${student.first_name} ${student.last_name}` : '—',
        admNo: student?.admission_no || student?.admission_number || '',
        formId: student?.form_id,
        subjectName: subject?.subject_name || '—',
        subjectId: a.subject_id,
        termName: term?.term_name || '—',
        termId: a.term_id,
        assessmentType: a.assessment_type,
        taskName: a.task_name,
        rubricLevel: a.rubric_level,
        rawScore: score?.raw_score || a.raw_score || null,
        teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : '—',
        teacherNote: note?.note_text || '',
        assessedAt: a.assessed_at,
        createdAt: a.created_at,
      };
    });
  }, [assessments, students, subjects, terms, teachers, markScores, teacherNotes]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    let list = historyEntries;
    if (selForm) list = list.filter(e => String(e.formId) === selForm);
    if (selSubject) list = list.filter(e => String(e.subjectId) === selSubject);
    if (selStudent) list = list.filter(e => String(e.studentId) === selStudent);
    if (selType) list = list.filter(e => e.assessmentType === selType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.studentName.toLowerCase().includes(q) || e.admNo.toLowerCase().includes(q) || e.subjectName.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime();
      else if (sortField === 'student') cmp = a.studentName.localeCompare(b.studentName);
      else if (sortField === 'subject') cmp = a.subjectName.localeCompare(b.subjectName);
      else if (sortField === 'level') {
        const order = { EE: 1, ME: 2, AE: 3, BE: 4 };
        cmp = (order[a.rubricLevel as keyof typeof order] || 5) - (order[b.rubricLevel as keyof typeof order] || 5);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [historyEntries, selForm, selSubject, selStudent, selType, searchQuery, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => {
    const unique = {
      students: new Set(filteredEntries.map(e => e.studentId)).size,
      subjects: new Set(filteredEntries.map(e => e.subjectId)).size,
      terms: new Set(filteredEntries.map(e => e.termId)).size,
    };
    const formative = filteredEntries.filter(e => e.assessmentType === 'Formative').length;
    const summative = filteredEntries.filter(e => e.assessmentType === 'Summative').length;
    return { ...unique, formative, summative, total: filteredEntries.length };
  }, [filteredEntries]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <FiChevronUp size={10} /> : <FiChevronDown size={10} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
          <p className="text-gray-400 text-sm">Loading Assessment History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <CBCNavBar activeTab="history" breadcrumbEnd="Assessment History" />

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiClock size={22} className="text-purple-500" />
              Assessment History
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Complete audit trail of all CBC assessments with scores, notes, and teacher attribution</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">
            <FiDownload size={13} /> Export History
          </button>
        </div>

        {/* Stat Chips */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Total Records', value: stats.total, icon: FiClipboard, color: '#6C63FF' },
            { label: 'Students', value: stats.students, icon: FiUsers, color: '#00D9A6' },
            { label: 'Subjects', value: stats.subjects, icon: FiBook, color: '#378ADD' },
            { label: 'Formative', value: stats.formative, icon: FiEdit3, color: '#EF9F27' },
            { label: 'Summative', value: stats.summative, icon: FiCheckCircle, color: '#1D9E75' },
          ].map((chip) => {
            const Icon = chip.icon;
            return (
              <div key={chip.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200">
                <Icon size={14} style={{ color: chip.color }} />
                <span className="text-xs text-gray-500">{chip.label}</span>
                <span className="text-sm font-bold text-gray-800">{chip.value}</span>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-end">
          <select value={selForm} onChange={e => setSelForm(e.target.value)} className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
            <option value="">All Forms</option>
            {forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select>
          <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
            <option value="">All Subjects</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
          <select value={selType} onChange={e => setSelType(e.target.value)} className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
            <option value="">All Types</option>
            <option value="Formative">Formative</option>
            <option value="Summative">Summative</option>
          </select>
          <div className="flex items-center gap-1.5 py-1.5 px-2.5 bg-gray-50 border border-gray-200 rounded-md">
            <FiSearch size={12} className="text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="bg-transparent border-none outline-none text-xs text-gray-800 w-28" />
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase w-8">#</th>
                  <th onClick={() => toggleSort('date')} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-600">
                    <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                  </th>
                  <th onClick={() => toggleSort('student')} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-600">
                    <span className="flex items-center gap-1">Student <SortIcon field="student" /></span>
                  </th>
                  <th onClick={() => toggleSort('subject')} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-600">
                    <span className="flex items-center gap-1">Subject <SortIcon field="subject" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase">Score</th>
                  <th onClick={() => toggleSort('level')} className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-600">
                    <span className="flex items-center justify-center gap-1">Level <SortIcon field="level" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Term</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Teacher</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.slice(0, 200).map((entry, idx) => (
                  <>
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50/60 cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                      <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <FiCalendar size={11} className="text-gray-400" />
                          {entry.assessedAt ? new Date(entry.assessedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800">{entry.studentName}</div>
                        <div className="text-[10px] text-gray-400">{entry.admNo}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{entry.subjectName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${entry.assessmentType === 'Summative' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                          {entry.assessmentType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-800">
                        {entry.rawScore !== null ? `${entry.rawScore}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <LevelBadge level={entry.rubricLevel} />
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-[11px]">{entry.termName}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-[11px]">{entry.teacherName}</td>
                      <td className="px-4 py-2.5 text-center">
                        {expandedRows.has(entry.id) ? <FiChevronUp size={12} className="text-gray-400" /> : <FiChevronDown size={12} className="text-gray-400" />}
                      </td>
                    </tr>
                    {expandedRows.has(entry.id) && (
                      <tr key={`${entry.id}-detail`} className="bg-gray-50/50">
                        <td colSpan={10} className="px-8 py-3">
                          <div className="grid grid-cols-4 gap-4 text-[11px]">
                            <div><span className="text-gray-400 font-medium">Task:</span> <span className="text-gray-700 font-semibold">{entry.taskName || '—'}</span></div>
                            <div><span className="text-gray-400 font-medium">Raw Score:</span> <span className="text-gray-700 font-semibold">{entry.rawScore !== null ? `${entry.rawScore}/100` : '—'}</span></div>
                            <div><span className="text-gray-400 font-medium">Assessed:</span> <span className="text-gray-700 font-semibold">{entry.assessedAt ? new Date(entry.assessedAt).toLocaleString() : '—'}</span></div>
                            <div><span className="text-gray-400 font-medium">Created:</span> <span className="text-gray-700 font-semibold">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</span></div>
                          </div>
                          {entry.teacherNote && (
                            <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-800">
                              <span className="font-semibold">Teacher Note:</span> {entry.teacherNote}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEntries.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">No assessment history found. Start entering marks.</div>
          )}
          {filteredEntries.length > 200 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
              Showing 200 of {filteredEntries.length} records. Use filters to narrow results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
