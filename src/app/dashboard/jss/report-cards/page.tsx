'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPrinter, FiDownload, FiRefreshCw, FiSearch, FiFilter, FiUsers,
  FiChevronLeft, FiChevronRight, FiAward, FiBarChart2, FiCheckCircle,
  FiFileText, FiAlertCircle, FiEye, FiGrid,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';

const COMP: Record<CompLevel, { label: string; color: string; bg: string; border: string; score: number; desc: string }> = {
  EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', score: 4, desc: 'The learner has demonstrated performance that goes beyond the expected level.' },
  ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', score: 3, desc: 'The learner has demonstrated performance at the expected level.' },
  AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', score: 2, desc: 'The learner is progressing towards the expected level of performance.' },
  BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', score: 1, desc: 'The learner has not yet demonstrated the expected level of performance.' },
};
const LEVELS: CompLevel[] = ['EE', 'ME', 'AE', 'BE'];
const levelOf = (avg: number): CompLevel => avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';

interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface LearningArea { id: number; name: string; code: string; color: string; icon: string; }
interface Student { id: number; first_name: string; last_name: string; other_name?: string; admission_number: string; gender?: string; date_of_birth?: string; photo_url?: string; }
interface Mark { learning_area_id: number; competency_level: CompLevel; teacher_notes?: string; }

export default function JSSReportCardsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allMarks, setAllMarks] = useState<Record<number, Mark[]>>({});

  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [principalRemarks, setPrincipalRemarks] = useState<Record<number, string>>({});
  const [classTeacherRemarks, setClassTeacherRemarks] = useState<Record<number, string>>({});
  const [schoolName, setSchoolName] = useState('APSIMS School');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [termDates, setTermDates] = useState({ start: '', end: '', next_open: '' });

  useEffect(() => {
    const load = async () => {
      const [fR, sR, tR, laR, sdR] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_streams').select('*').order('stream_name'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('jss_learning_areas').select('*').eq('is_active', true).order('sort_order'),
        sb.from('school_settings').select('key,value').in('key', ['school_name', 'school_logo', 'school_motto']),
      ]);
      const allForms = fR.data || [];
      const jssForms = allForms.filter((f: Form) =>
        (f.form_level >= 7 && f.form_level <= 9) ||
        ['grade 7','grade 8','grade 9','jss'].some(k => (f.form_name || '').toLowerCase().includes(k))
      );
      setForms(jssForms.length > 0 ? jssForms : allForms);
      setStreams(sR.data || []);
      setTerms(tR.data || []);
      setLearningAreas(laR.data || []);
      const settings: Record<string, string> = {};
      (sdR.data || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });
      if (settings.school_name) setSchoolName(settings.school_name);
      if (settings.school_logo) setSchoolLogo(settings.school_logo);
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) {
        setSelTerm(String(cur.id));
        setSelYear(cur.year);
        if (cur.start_date) setTermDates(prev => ({ ...prev, start: cur.start_date, end: cur.end_date || '' }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const fetchData = useCallback(async () => {
    if (!selForm || !selTerm) return;
    setLoading(true);
    let q = sb.from('school_students')
      .select('id,first_name,last_name,other_name,admission_number,gender,date_of_birth,photo_url')
      .eq('form_id', selForm).eq('status', 'Active').order('last_name');
    if (selStream) q = q.eq('stream_id', selStream);
    const { data: studs } = await q;
    setStudents(studs || []);
    if (studs && studs.length > 0) {
      const { data: dbMarks } = await sb.from('jss_marks')
        .select('student_id,learning_area_id,competency_level,teacher_notes')
        .in('student_id', studs.map((s: Student) => s.id))
        .eq('term_id', selTerm).eq('year', selYear);
      const grouped: Record<number, Mark[]> = {};
      (dbMarks || []).forEach((m: any) => {
        if (!grouped[m.student_id]) grouped[m.student_id] = [];
        grouped[m.student_id].push({ learning_area_id: m.learning_area_id, competency_level: m.competency_level, teacher_notes: m.teacher_notes });
      });
      setAllMarks(grouped);
    }
    setCurrentIndex(0);
    setLoading(false);
  }, [selForm, selTerm, selYear, selStream]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const s = search.toLowerCase();
    return students.filter(st => `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) || st.admission_number.toLowerCase().includes(s));
  }, [students, search]);

  const getStudentData = (s: Student) => {
    const marks = allMarks[s.id] || [];
    const markMap: Record<number, Mark> = {};
    marks.forEach(m => { markMap[m.learning_area_id] = m; });
    const scores = marks.map(m => COMP[m.competency_level].score);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const overall = avg > 0 ? levelOf(avg) : null;
    const ee = scores.filter(s => s === 4).length;
    const me = scores.filter(s => s === 3).length;
    const ae = scores.filter(s => s === 2).length;
    const be = scores.filter(s => s === 1).length;
    const coverage = Math.round((marks.length / Math.max(learningAreas.length, 1)) * 100);
    return { markMap, avg, overall, ee, me, ae, be, coverage };
  };

  const form = forms.find(f => String(f.id) === selForm);
  const term = terms.find(t => String(t.id) === selTerm);
  const stream = streams.find(s => String(s.id) === selStream);
  const currentStudent = filtered[currentIndex];

  const ReportCard = ({ student, forPrint = false }: { student: Student; forPrint?: boolean }) => {
    const { markMap, avg, overall, ee, me, ae, be, coverage } = getStudentData(student);
    const pr = principalRemarks[student.id] || '';
    const cr = classTeacherRemarks[student.id] || '';
    const hasMarks = Object.keys(markMap).length > 0;

    return (
      <div className={`bg-white ${forPrint ? 'mb-0' : 'rounded-2xl shadow-xl'} border border-gray-200 overflow-hidden`}
        style={{ maxWidth: forPrint ? '100%' : '820px', margin: forPrint ? '0' : '0 auto' }}>

        {/* HEADER */}
        <div className="relative" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1D9E75 100%)' }}>
          <div className="px-8 pt-7 pb-6">
            <div className="flex items-start gap-5">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover bg-white" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-xl">{schoolName[0]}</div>
              )}
              <div className="flex-1 text-white">
                <h1 className="text-xl font-black tracking-wide">{schoolName}</h1>
                <p className="text-white/80 text-sm mt-0.5">Kenya Certificate of Secondary Education — Junior Secondary</p>
                <div className="flex gap-4 mt-2 text-xs text-white/70">
                  <span>CBC Competency Report</span>
                  <span>·</span>
                  <span>{form?.form_name}</span>
                  <span>·</span>
                  <span>{term?.term_name} {selYear}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                      {student.first_name[0]}{student.last_name[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STUDENT INFO */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2">
            {[
              ['Student Name', `${student.first_name} ${student.other_name || ''} ${student.last_name}`.trim()],
              ['Admission No', student.admission_number],
              ['Gender', student.gender || '—'],
              ['Class', `${form?.form_name}${stream ? ' ' + stream.stream_name : ''}`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* LEARNING AREAS TABLE */}
        <div className="px-8 py-5">
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FiBarChart2 size={14} className="text-indigo-500" /> Competency Assessment — Learning Areas
          </h3>
          {!hasMarks ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <FiAlertCircle className="text-amber-500 flex-shrink-0" size={18} />
              <p className="text-sm text-amber-700">No marks recorded for this student in {term?.term_name} {selYear}. Please enter marks in JSS Marks Entry first.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Learning Area</th>
                  <th className="text-center py-2 w-24 text-xs font-bold text-gray-500 uppercase">Level</th>
                  <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Competency</th>
                  <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {learningAreas.map(la => {
                  const m = markMap[la.id];
                  return (
                    <tr key={la.id} className="hover:bg-gray-50 transition">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{la.icon}</span>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{la.name}</p>
                            <p className="text-[10px] text-gray-400">{la.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        {m ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black border"
                            style={{ background: COMP[m.competency_level].bg, color: COMP[m.competency_level].color, borderColor: COMP[m.competency_level].border }}>
                            <FiAward size={10} /> {m.competency_level}
                          </span>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        {m ? <p className="text-xs text-gray-600">{COMP[m.competency_level].label}</p> : <span className="text-gray-300 text-xs">Not marked</span>}
                      </td>
                      <td className="py-2.5">
                        <p className="text-xs text-gray-500 italic">{m?.teacher_notes || ''}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* SUMMARY */}
        {hasMarks && overall && (
          <div className="px-8 py-4 mx-8 mb-5 rounded-2xl border-2" style={{ background: COMP[overall].bg, borderColor: COMP[overall].border }}>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Overall Competency</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black" style={{ color: COMP[overall].color }}>{overall}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: COMP[overall].color }}>{COMP[overall].label}</p>
                    <p className="text-xs text-gray-500">{COMP[overall].desc}</p>
                  </div>
                </div>
              </div>
              <div className="h-12 w-px bg-current opacity-20" />
              <div className="grid grid-cols-4 gap-4">
                {LEVELS.map(l => {
                  const cnt = l === 'EE' ? ee : l === 'ME' ? me : l === 'AE' ? ae : be;
                  return (
                    <div key={l} className="text-center">
                      <p className="text-xl font-black" style={{ color: COMP[l].color }}>{cnt}</p>
                      <p className="text-[10px] font-bold" style={{ color: COMP[l].color }}>{l}</p>
                    </div>
                  );
                })}
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">Avg Score</p>
                <p className="text-2xl font-black text-gray-700">{avg.toFixed(2)}<span className="text-sm text-gray-400">/4</span></p>
                <p className="text-[10px] text-gray-400">{coverage}% coverage</p>
              </div>
            </div>
          </div>
        )}

        {/* COMPETENCY KEY */}
        <div className="px-8 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Competency Key</p>
          <div className="flex gap-4 flex-wrap">
            {LEVELS.map(l => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="w-6 h-5 rounded flex items-center justify-center text-[9px] font-black border"
                  style={{ background: COMP[l].bg, color: COMP[l].color, borderColor: COMP[l].border }}>{l}</span>
                <span className="text-[10px] text-gray-500">{COMP[l].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* REMARKS */}
        <div className="px-8 py-5 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Class Teacher's Remarks</label>
              {forPrint ? (
                <div className="border border-gray-300 rounded-xl p-3 min-h-[70px] text-sm text-gray-700">
                  {cr || <span className="text-gray-300 italic">No remarks entered</span>}
                </div>
              ) : (
                <textarea value={cr} onChange={e => setClassTeacherRemarks(prev => ({ ...prev, [student.id]: e.target.value }))} rows={3}
                  placeholder="Enter class teacher remarks..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Principal's Remarks</label>
              {forPrint ? (
                <div className="border border-gray-300 rounded-xl p-3 min-h-[70px] text-sm text-gray-700">
                  {pr || <span className="text-gray-300 italic">No remarks entered</span>}
                </div>
              ) : (
                <textarea value={pr} onChange={e => setPrincipalRemarks(prev => ({ ...prev, [student.id]: e.target.value }))} rows={3}
                  placeholder="Enter principal remarks..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
              )}
            </div>
          </div>
        </div>

        {/* SIGNATURES */}
        <div className="px-8 py-5 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-6">
            {['Class Teacher', 'Principal / Head Teacher', 'Parent / Guardian'].map(role => (
              <div key={role} className="text-center">
                <div className="border-b-2 border-gray-300 h-10 mb-2" />
                <p className="text-xs text-gray-500">{role}</p>
                <p className="text-[10px] text-gray-300">Sign & Date</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-3 border-t border-gray-100 bg-gradient-to-r from-gray-800 to-gray-900 flex justify-between items-center">
          <p className="text-[10px] text-gray-400">{schoolName} · KICD CBC Competency Report · {term?.term_name} {selYear}</p>
          <p className="text-[10px] text-gray-400">Powered by APSIMS — Kenya's #1 School Management System</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm no-print">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#1D9E75)' }}>
                <FiFileText size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">JSS Report Cards</h1>
                <p className="text-xs text-gray-400">KICD-Format CBC Competency Reports — Grade 7 · 8 · 9</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setViewMode(viewMode === 'single' ? 'all' : 'single')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100">
                <FiGrid size={14} /> {viewMode === 'single' ? 'All Cards' : 'Single Card'}
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#1e3a5f,#1D9E75)' }}>
                <FiPrinter size={14} /> Print {viewMode === 'all' ? 'All' : 'Report Card'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Grade</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selStream} onChange={e => setSelStream(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[130px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => { setSelTerm(e.target.value); const t = terms.find(t => String(t.id) === e.target.value); if (t) setSelYear(t.year); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' ✓' : ''}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setCurrentIndex(0); }} placeholder="Search student..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!selForm || !selTerm ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4"><FiFilter size={28} className="text-indigo-400" /></div>
            <h3 className="font-bold text-gray-700 mb-1">Select Grade & Term</h3>
            <p className="text-sm text-gray-400">Choose a Grade (7, 8, or 9) and term to view report cards</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4"><FiUsers size={28} className="text-amber-400" /></div>
            <h3 className="font-bold text-gray-700 mb-1">No Students Found</h3>
            <p className="text-sm text-gray-400">No active students match the selected filters</p>
          </div>
        ) : viewMode === 'all' ? (
          <div className="space-y-8">
            {filtered.map(student => <div key={student.id} className="page-break-after"><ReportCard student={student} forPrint={false} /></div>)}
          </div>
        ) : (
          <>
            {/* Navigator */}
            <div className="flex items-center justify-between mb-5 no-print">
              <div className="flex items-center gap-3">
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
                  className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition">
                  <FiChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-800">{filtered[currentIndex]?.first_name} {filtered[currentIndex]?.last_name}</p>
                  <p className="text-xs text-gray-400">Card {currentIndex + 1} of {filtered.length}</p>
                </div>
                <button onClick={() => setCurrentIndex(Math.min(filtered.length - 1, currentIndex + 1))} disabled={currentIndex === filtered.length - 1}
                  className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition">
                  <FiChevronRight size={18} />
                </button>
              </div>
              {/* Thumbnail list */}
              <div className="flex gap-1.5 overflow-x-auto max-w-2xl">
                {filtered.slice(0, 15).map((s, i) => (
                  <button key={s.id} onClick={() => setCurrentIndex(i)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition border-2 ${i === currentIndex ? 'border-indigo-500 text-white' : 'border-gray-200 text-gray-600 bg-white'}`}
                    style={i === currentIndex ? { background: `hsl(${(s.id * 47) % 360},60%,50%)` } : {}}>
                    {s.first_name[0]}{s.last_name[0]}
                  </button>
                ))}
                {filtered.length > 15 && <span className="text-xs text-gray-400 flex items-center px-2">+{filtered.length - 15}</span>}
              </div>
            </div>
            {currentStudent && <ReportCard student={currentStudent} />}
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .page-break-after { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}
