'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiTrendingUp, FiUsers, FiCheck, FiX, FiDownload, FiPrinter,
  FiRefreshCw, FiSearch, FiFilter, FiEdit2, FiSave, FiSend,
  FiAward, FiAlertCircle, FiCheckCircle, FiFileText, FiShield,
  FiChevronRight, FiArrowRight, FiTarget, FiCalendar, FiGrid, FiZap,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type TransitionStatus = 'pending' | 'confirmed' | 'transferred';

const PATHWAYS = [
  { id: 'STEM', label: 'STEM', desc: 'Science, Technology, Engineering & Mathematics', color: '#2563EB', bg: '#DBEAFE', icon: 'LAB' },
  { id: 'SOCIAL', label: 'Social Sciences', desc: 'Social Sciences, Languages & Humanities', color: '#059669', bg: '#D1FAE5', icon: 'EDU' },
  { id: 'ARTS', label: 'Arts & Sports', desc: 'Creative Arts, Music, Drama & Physical Education', color: '#EC4899', bg: '#FCE7F3', icon: 'ART' },
  { id: 'TVET', label: 'TVET', desc: 'Technical & Vocational Education & Training', color: '#D97706', bg: '#FEF3C7', icon: 'TEC' },
];

const COMP_COLORS: Record<CompLevel, string> = {
  EE: '#059669', ME: '#2563EB', AE: '#D97706', BE: '#DC2626',
};
const COMP_BG: Record<CompLevel, string> = {
  EE: '#D1FAE5', ME: '#DBEAFE', AE: '#FEF3C7', BE: '#FEE2E2',
};

interface Form { id: number; form_name: string; form_level: number; }
interface Student { id: number; first_name: string; last_name: string; admission_number: string; gender?: string; guardian_name?: string; guardian_phone?: string; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface TransitionReport {
  id?: number; student_id: number; from_grade: number; to_grade: number; academic_year: number;
  overall_competency?: CompLevel; recommended_pathway?: string; pathway_confirmed: boolean;
  parent_consent: boolean; parent_consent_date?: string; principal_signature?: string;
  target_school?: string; transition_date?: string; status: TransitionStatus;
  knec_submitted: boolean; knec_ref?: string; notes?: string;
}
interface StudentWithTransition extends Student {
  transition?: TransitionReport;
  avgScore?: number;
  overallComp?: CompLevel;
}

type ViewMode = 'list' | 'single' | 'bulk';

export default function JSSTransitionPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<StudentWithTransition[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithTransition | null>(null);
  const [editReport, setEditReport] = useState<Partial<TransitionReport>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkPathway, setBulkPathway] = useState('');

  useEffect(() => {
    const load = async () => {
      const [fR, tR] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
      ]);
      const allForms = fR.data || [];
      // Grade 9 / JSS3 only for transition
      const grade9 = allForms.filter((f: Form) =>
        f.form_level === 9 ||
        (f.form_name || '').toLowerCase().includes('grade 9') ||
        (f.form_name || '').toLowerCase().includes('jss 3') ||
        (f.form_name || '').toLowerCase().includes('jss3')
      );
      setForms(grade9.length > 0 ? grade9 : allForms.filter((f: Form) => f.form_level >= 7));
      setTerms(tR.data || []);
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) setSelYear(cur.year);
      setLoading(false);
    };
    load();
  }, []);

  const fetchStudents = useCallback(async () => {
    if (!selForm) return;
    setLoading(true);
    const { data: studs } = await sb.from('school_students')
      .select('id,first_name,last_name,admission_number,gender,guardian_name,guardian_phone')
      .eq('form_id', selForm).eq('status', 'Active').order('last_name');
    if (!studs || studs.length === 0) { setStudents([]); setLoading(false); return; }
    const ids = studs.map((s: Student) => s.id);
    const [transRes, marksRes] = await Promise.all([
      sb.from('jss_transition_reports').select('*').in('student_id', ids).eq('academic_year', selYear),
      sb.from('jss_marks').select('student_id,competency_level').in('student_id', ids).eq('year', selYear),
    ]);
    const transMap: Record<number, TransitionReport> = {};
    (transRes.data || []).forEach((t: TransitionReport) => { transMap[t.student_id] = t; });
    // Compute avg score per student from marks
    const scoreMap: Record<number, { total: number; count: number }> = {};
    (marksRes.data || []).forEach((m: any) => {
      if (!scoreMap[m.student_id]) scoreMap[m.student_id] = { total: 0, count: 0 };
      const s = m.competency_level === 'EE' ? 4 : m.competency_level === 'ME' ? 3 : m.competency_level === 'AE' ? 2 : 1;
      scoreMap[m.student_id].total += s;
      scoreMap[m.student_id].count += 1;
    });
    const withData: StudentWithTransition[] = studs.map((s: Student) => {
      const sc = scoreMap[s.id];
      const avg = sc && sc.count > 0 ? sc.total / sc.count : 0;
      const comp: CompLevel | undefined = avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : avg > 0 ? 'BE' : undefined;
      return { ...s, transition: transMap[s.id], avgScore: avg, overallComp: comp };
    });
    setStudents(withData);
    setLoading(false);
  }, [selForm, selYear]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const s = search.toLowerCase();
    return students.filter(st => `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) || st.admission_number.toLowerCase().includes(s));
  }, [students, search]);

  const openSingle = (s: StudentWithTransition) => {
    setSelectedStudent(s);
    setEditReport(s.transition || {
      student_id: s.id, from_grade: 9, to_grade: 10, academic_year: selYear,
      overall_competency: s.overallComp, recommended_pathway: '',
      pathway_confirmed: false, parent_consent: false,
      status: 'pending', knec_submitted: false,
    });
    setViewMode('single');
  };

  const saveReport = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const payload = { ...editReport, student_id: selectedStudent.id, from_grade: 9, to_grade: 10, academic_year: selYear };
      if (editReport.id) {
        const { error } = await sb.from('jss_transition_reports').update(payload).eq('id', editReport.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('jss_transition_reports').insert(payload);
        if (error) throw error;
      }
      toast.success('Transition report saved');
      fetchStudents();
      setViewMode('list');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const bulkAssignPathway = async () => {
    if (!bulkPathway || selectedIds.size === 0) { toast.error('Select students and pathway'); return; }
    setSaving(true);
    try {
      for (const sid of selectedIds) {
        const s = students.find(st => st.id === sid);
        if (!s) continue;
        const payload = {
          student_id: sid, from_grade: 9, to_grade: 10, academic_year: selYear,
          recommended_pathway: bulkPathway, overall_competency: s.overallComp,
          pathway_confirmed: false, parent_consent: false, status: 'pending', knec_submitted: false,
        };
        await sb.from('jss_transition_reports').upsert(payload as any, { onConflict: 'student_id,academic_year', ignoreDuplicates: false });
      }
      toast.success(`Pathway assigned to ${selectedIds.size} students`);
      fetchStudents(); setSelectedIds(new Set()); setBulkPathway('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const markKNECSubmitted = async () => {
    const confirmed = students.filter(s => s.transition?.status === 'confirmed');
    if (confirmed.length === 0) { toast.error('No confirmed students to submit'); return; }
    setSaving(true);
    try {
      for (const s of confirmed) {
        if (s.transition?.id) {
          await sb.from('jss_transition_reports').update({ knec_submitted: true, knec_ref: `KNEC-${selYear}-${s.admission_number}` }).eq('id', s.transition.id);
        }
      }
      toast.success(`${confirmed.length} reports submitted to KNEC`);
      fetchStudents();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const exportCSV = () => {
    const headers = ['Adm No', 'Name', 'Gender', 'Overall', 'Pathway', 'Status', 'Parent Consent', 'KNEC Submitted', 'Target School'];
    const rows = students.map(s => [
      s.admission_number, `${s.first_name} ${s.last_name}`, s.gender || '',
      s.overallComp || '--', s.transition?.recommended_pathway || '--',
      s.transition?.status || 'pending', s.transition?.parent_consent ? 'Yes' : 'No',
      s.transition?.knec_submitted ? 'Yes' : 'No', s.transition?.target_school || '--',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `JSS_Transition_${selYear}.csv`; a.click();
    toast.success('CSV exported!');
  };

  // Stats
  const stats = useMemo(() => ({
    total: students.length,
    confirmed: students.filter(s => s.transition?.status === 'confirmed').length,
    pending: students.filter(s => !s.transition || s.transition.status === 'pending').length,
    knec: students.filter(s => s.transition?.knec_submitted).length,
    withPathway: students.filter(s => s.transition?.recommended_pathway).length,
  }), [students]);

  const form = forms.find(f => String(f.id) === selForm);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black" style={{ background: 'linear-gradient(135deg,#059669,#2563EB)' }}>
                <FiTrendingUp size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">JSS Transition Report</h1>
                <p className="text-xs text-gray-400">Grade 9 to Grade 10 - Pathway Confirmation - {selYear}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {viewMode === 'single' && (
                <button onClick={() => setViewMode('list')} className="px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Back</button>
              )}
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiDownload size={14} /> CSV
              </button>
              <button onClick={markKNECSubmitted} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100">
                <FiShield size={14} /> Submit to KNEC
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#059669,#2563EB)' }}>
                <FiPrinter size={14} /> Print
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[160px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Grade 9 Class</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[120px] focus:ring-2 focus:ring-indigo-300 outline-none">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
        </div>
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {[['list','Student List'],['bulk','Bulk Assign'],] .map(([v,l]) => (
            <button key={v} onClick={() => setViewMode(v as ViewMode)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${viewMode===v?'border-green-500 text-green-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* STATS */}
        {students.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Students', value: stats.total, color: '#6366F1', sub: 'Grade 9' },
              { label: 'Confirmed', value: stats.confirmed, color: '#059669', sub: 'Pathway confirmed' },
              { label: 'Pending', value: stats.pending, color: '#D97706', sub: 'Awaiting confirmation' },
              { label: 'Pathway Assigned', value: stats.withPathway, color: '#2563EB', sub: 'Recommendation done' },
              { label: 'KNEC Submitted', value: stats.knec, color: '#7C3AED', sub: 'To KNEC' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className="text-3xl font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* PATHWAY CARDS LEGEND */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PATHWAYS.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="text-xs font-bold" style={{ color: p.color }}>{p.label}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{p.desc.substring(0, 40)}--'list' && (
          !selForm ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4"><FiFilter size={28} className="text-green-400" /></div>
              <h3 className="font-bold text-gray-700 mb-1">Select Grade 9 Class</h3>
              <p className="text-sm text-gray-400">Choose the Grade 9 class to process transition reports</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 text-sm">{form?.form_name} --'bg-white':'bg-gray-50/20'}`}>
                          <td className="px-4 py-2.5 min-w-[220px]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background:`hsl(${(s.id*47)%360},60%,50%)` }}>
                                {s.first_name[0]}{s.last_name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                                <p className="text-[10px] text-gray-400">{s.admission_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center px-3 py-2.5">
                            {comp ? (
                              <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ background: COMP_BG[comp], color: COMP_COLORS[comp] }}>{comp}</span>
                            ) : <span className="text-gray-300 text-xs">--'confirmed' ? (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg font-bold">âœ“ Confirmed</span>
                            ) : s.transition?.status === 'transferred' ? (
                              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg font-bold">Transferred</span>
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg font-bold">Pending</span>
                            )}
                          </td>
                          <td className="text-center px-3 py-2.5">
                            {s.transition?.parent_consent ? (
                              <span className="text-xs text-green-600"><FiCheckCircle size={14} className="inline" /> Yes</span>
                            ) : (
                              <span className="text-xs text-gray-400"><FiX size={14} className="inline" /> No</span>
                            )}
                          </td>
                          <td className="text-center px-3 py-2.5">
                            {s.transition?.knec_submitted ? (
                              <span className="text-xs text-purple-600 font-bold">âœ“</span>
                            ) : <span className="text-gray-300 text-xs">--'single' && selectedStudent && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background:`hsl(${(selectedStudent.id*47)%360},60%,50%)` }}>
                  {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                </div>
                <div>
                  <h3 className="font-black text-gray-800">{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                  <p className="text-xs text-gray-500">{selectedStudent.admission_number} Â· {selectedStudent.gender}</p>
                  {selectedStudent.overallComp && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg mt-1 inline-block" style={{ background: COMP_BG[selectedStudent.overallComp], color: COMP_COLORS[selectedStudent.overallComp] }}>
                      Overall: {selectedStudent.overallComp}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">Recommended Pathway *</label>
                <div className="grid grid-cols-2 gap-3">
                  {PATHWAYS.map(p => (
                    <button key={p.id} onClick={() => setEditReport(prev => ({ ...prev, recommended_pathway: p.id }))}
                      className={`p-3 rounded-xl border-2 text-left transition ${editReport.recommended_pathway===p.id?'scale-[1.02] shadow-md':''}`}
                      style={editReport.recommended_pathway===p.id?{background:p.bg,borderColor:p.color}:{borderColor:'#E5E7EB'}}>
                      <span className="text-xl">{p.icon}</span>
                      <p className="text-xs font-bold mt-1" style={editReport.recommended_pathway===p.id?{color:p.color}:{color:'#374151'}}>{p.label}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Target School</label>
                  <input value={editReport.target_school || ''} onChange={e => setEditReport(p => ({ ...p, target_school: e.target.value }))}
                    placeholder="School name..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Transition Date</label>
                  <input type="date" value={editReport.transition_date || ''} onChange={e => setEditReport(p => ({ ...p, transition_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
                </div>
              </div>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editReport.pathway_confirmed || false} onChange={e => setEditReport(p => ({ ...p, pathway_confirmed: e.target.checked }))} className="rounded" />
                  Pathway Confirmed
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editReport.parent_consent || false} onChange={e => setEditReport(p => ({ ...p, parent_consent: e.target.checked }))} className="rounded" />
                  Parent Consent Obtained
                </label>
              </div>
              {editReport.parent_consent && (
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Consent Date</label>
                  <input type="date" value={editReport.parent_consent_date || ''} onChange={e => setEditReport(p => ({ ...p, parent_consent_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Status</label>
                <select value={editReport.status || 'pending'} onChange={e => setEditReport(p => ({ ...p, status: e.target.value as TransitionStatus }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Notes</label>
                <textarea value={editReport.notes || ''} onChange={e => setEditReport(p => ({ ...p, notes: e.target.value }))} rows={3}
                  placeholder="Additional remarks..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-300 outline-none resize-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setViewMode('list')} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button onClick={saveReport} disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 flex items-center gap-2 disabled:opacity-70">
                  {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                  {saving ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BULK ASSIGN VIEW */}
        {viewMode === 'bulk' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl">
            <h3 className="font-black text-gray-800 text-base mb-5 flex items-center gap-2"><FiZap size={18} className="text-green-500" /> Bulk Pathway Assignment</h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Select Pathway</label>
                <div className="grid grid-cols-2 gap-3">
                  {PATHWAYS.map(p => (
                    <button key={p.id} onClick={() => setBulkPathway(p.id)}
                      className={`p-3 rounded-xl border-2 text-left transition ${bulkPathway===p.id?'scale-[1.02] shadow-md':''}`}
                      style={bulkPathway===p.id?{background:p.bg,borderColor:p.color}:{borderColor:'#E5E7EB'}}>
                      <span className="text-2xl">{p.icon}</span>
                      <p className="text-xs font-bold mt-1" style={bulkPathway===p.id?{color:p.color}:{color:'#374151'}}>{p.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Select Students ({selectedIds.size} selected)</label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  <div className="px-3 py-2 bg-gray-50 flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.size===students.length&&students.length>0}
                      onChange={e => setSelectedIds(e.target.checked?new Set(students.map(s=>s.id)):new Set())} className="rounded" />
                    <span className="text-xs font-bold text-gray-600">Select All</span>
                  </div>
                  {students.filter(s => !s.transition?.recommended_pathway).map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedIds.has(s.id)}
                        onChange={e => { const ns=new Set(selectedIds); e.target.checked?ns.add(s.id):ns.delete(s.id); setSelectedIds(ns); }} className="rounded" />
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background:`hsl(${(s.id*47)%360},60%,50%)` }}>{s.first_name[0]}{s.last_name[0]}</div>
                      <span className="text-xs text-gray-700">{s.first_name} {s.last_name}</span>
                      {s.overallComp && <span className="ml-auto text-[10px] font-bold" style={{ color:COMP_COLORS[s.overallComp] }}>{s.overallComp}</span>}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Showing students without a pathway assigned</p>
              </div>
              <button onClick={bulkAssignPathway} disabled={saving} className="w-full py-3 font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-70" style={{ background:'linear-gradient(135deg,#059669,#2563EB)' }}>
                {saving?<FiRefreshCw size={16} className="animate-spin"/>:<FiArrowRight size={16}/>}
                {saving?'Assigning...':(`Assign ${bulkPathway} to ${selectedIds.size} Students`)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


