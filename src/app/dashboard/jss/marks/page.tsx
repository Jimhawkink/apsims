'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiSave, FiDownload, FiRefreshCw, FiSearch, FiFilter, FiAlertCircle,
  FiAward, FiLayers, FiPrinter, FiZap, FiEdit2, FiUsers, FiX, FiSend,
  FiBarChart2,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type Tab = 'marks' | 'analytics' | 'bulk' | 'export';

interface LearningArea { id: number; name: string; code: string; color: string; icon: string; sort_order: number; }
interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface Student { id: number; first_name: string; last_name: string; admission_number: string; gender?: string; }
interface JSSMark { id?: number; student_id: number; learning_area_id: number; strand_id?: null; term_id: number; form_id: number; year: number; competency_level: CompLevel; teacher_notes?: string; entered_by?: string; }
interface Analytics { ee: number; me: number; ae: number; be: number; total: number; }

const COMP: Record<CompLevel, { label: string; color: string; bg: string; border: string; score: number }> = {
  EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', score: 4 },
  ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', score: 3 },
  AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', score: 2 },
  BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', score: 1 },
};
const LEVELS: CompLevel[] = ['EE', 'ME', 'AE', 'BE'];

export default function JSSMarksPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [selLA, setSelLA] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('marks');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [localMarks, setLocalMarks] = useState<Record<string, CompLevel>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkLevel, setBulkLevel] = useState<CompLevel | ''>('');
  const [bulkLA, setBulkLA] = useState('');
  const [noteModal, setNoteModal] = useState<{ studentId: number; name: string } | null>(null);
  const [noteText, setNoteText] = useState('');

  // â”€â”€ Load master data â”€â”€
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [formsRes, streamsRes, termsRes, laRes] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_streams').select('*').order('stream_name'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('jss_learning_areas').select('*').eq('is_active', true).order('sort_order'),
      ]);
      const allForms = formsRes.data || [];
      const jssForms = allForms.filter((f: Form) =>
        f.form_level >= 7 && f.form_level <= 9 ||
        (f.form_name || '').toLowerCase().includes('grade 7') ||
        (f.form_name || '').toLowerCase().includes('grade 8') ||
        (f.form_name || '').toLowerCase().includes('grade 9') ||
        (f.form_name || '').toLowerCase().includes('jss')
      );
      setForms(jssForms.length > 0 ? jssForms : allForms);
      setStreams(streamsRes.data || []);
      setTerms(termsRes.data || []);
      setLearningAreas(laRes.data || []);
      const cur = (termsRes.data || []).find((t: Term) => t.is_current);
      if (cur) { setSelTerm(String(cur.id)); setSelYear(cur.year); }
      setLoading(false);
    };
    load();
  }, []);

  // â”€â”€ Load students + marks â”€â”€
  const fetchData = useCallback(async () => {
    if (!selForm || !selTerm) return;
    setLoading(true);
    let q = sb.from('school_students')
      .select('id,first_name,last_name,admission_number,gender')
      .eq('form_id', selForm).eq('status', 'Active').order('last_name');
    if (selStream) q = q.eq('stream_id', selStream);
    const { data: studs } = await q;
    setStudents(studs || []);
    if (studs && studs.length > 0) {
      const ids = studs.map((s: Student) => s.id);
      const { data: dbMarks } = await sb.from('jss_marks')
        .select('*').in('student_id', ids).eq('term_id', selTerm).eq('year', selYear);
      const lm: Record<string, CompLevel> = {};
      const ln: Record<string, string> = {};
      (dbMarks || []).forEach((m: JSSMark) => {
        lm[`${m.student_id}_${m.learning_area_id}`] = m.competency_level;
        if (m.teacher_notes) ln[`${m.student_id}_${m.learning_area_id}`] = m.teacher_notes;
      });
      setLocalMarks(lm);
      setLocalNotes(ln);
      setDirty(false);
    }
    setLoading(false);
  }, [selForm, selTerm, selYear, selStream]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const s = search.toLowerCase();
    return students.filter(st =>
      `${st.first_name} ${st.last_name}`.toLowerCase().includes(s) ||
      st.admission_number.toLowerCase().includes(s)
    );
  }, [students, search]);

  const filteredLAs = useMemo(() =>
    selLA === 'all' ? learningAreas : learningAreas.filter(la => String(la.id) === selLA),
    [learningAreas, selLA]);

  const getMark = (sid: number, laId: number): CompLevel | undefined => localMarks[`${sid}_${laId}`];

  const setMark = (sid: number, laId: number, lvl: CompLevel) => {
    setLocalMarks(p => ({ ...p, [`${sid}_${laId}`]: lvl }));
    setDirty(true);
  };

  const analyticsPerLA = useMemo((): Record<number, Analytics> => {
    const res: Record<number, Analytics> = {};
    learningAreas.forEach(la => {
      const levs = students.map(s => localMarks[`${s.id}_${la.id}`]).filter(Boolean) as CompLevel[];
      res[la.id] = { ee: levs.filter(l => l === 'EE').length, me: levs.filter(l => l === 'ME').length, ae: levs.filter(l => l === 'AE').length, be: levs.filter(l => l === 'BE').length, total: levs.length };
    });
    return res;
  }, [learningAreas, students, localMarks]);

  const overall = useMemo((): Analytics => {
    const all = Object.values(localMarks) as CompLevel[];
    return { ee: all.filter(l => l === 'EE').length, me: all.filter(l => l === 'ME').length, ae: all.filter(l => l === 'AE').length, be: all.filter(l => l === 'BE').length, total: all.length };
  }, [localMarks]);

  const coverage = useMemo(() => {
    const possible = students.length * learningAreas.length;
    return possible > 0 ? Math.round((Object.keys(localMarks).length / possible) * 100) : 0;
  }, [students, learningAreas, localMarks]);

  const handleSave = async () => {
    if (!selForm || !selTerm) { toast.error('Select Grade and Term first'); return; }
    if (Object.keys(localMarks).length === 0) { toast.error('No marks to save'); return; }
    setSaving(true);
    try {
      const upserts = Object.entries(localMarks).map(([key, lvl]) => {
        const [sid, laId] = key.split('_').map(Number);
        return { student_id: sid, learning_area_id: laId, strand_id: null, term_id: Number(selTerm), form_id: Number(selForm), year: selYear, competency_level: lvl, teacher_notes: localNotes[key] || null, entered_by: 'teacher' };
      });
      const { error } = await sb.from('jss_marks').upsert(upserts as any[], { onConflict: 'student_id,learning_area_id,strand_id,term_id,year', ignoreDuplicates: false });
      if (error) throw error;
      setDirty(false);
      toast.success(`âœ… Saved ${upserts.length} marks!`);
    } catch (e: any) { toast.error(`Save failed: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleBulkApply = () => {
    if (!bulkLevel || !bulkLA) { toast.error('Select level and area'); return; }
    const targets = selectedStudents.size > 0 ? [...selectedStudents] : students.map(s => s.id);
    const nm = { ...localMarks };
    targets.forEach(sid => { nm[`${sid}_${bulkLA}`] = bulkLevel as CompLevel; });
    setLocalMarks(nm); setDirty(true);
    toast.success(`Applied ${bulkLevel} to ${targets.length} students`);
    setShowBulkPanel(false); setBulkLevel(''); setBulkLA(''); setSelectedStudents(new Set());
  };

  const exportCSV = () => {
    const headers = ['Adm No', 'Name', 'Gender', ...learningAreas.map(la => la.code), 'Coverage%'];
    const rows = students.map(s => {
      const row = [s.admission_number, `${s.first_name} ${s.last_name}`, s.gender || ''];
      let filled = 0;
      learningAreas.forEach(la => { const l = localMarks[`${s.id}_${la.id}`] || ''; if (l) filled++; row.push(l); });
      row.push(String(Math.round((filled / Math.max(learningAreas.length, 1)) * 100)));
      return row;
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const t = terms.find(t => String(t.id) === selTerm); const f = forms.find(f => String(f.id) === selForm);
    a.download = `JSS_Marks_${f?.form_name || 'Form'}_${t?.term_name || 'Term'}_${selYear}.csv`; a.click();
    toast.success('CSV exported!');
  };

  if (loading && !selForm) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* NOTE MODAL */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div><h3 className="font-bold text-gray-800">Teacher Notes</h3><p className="text-xs text-gray-500">{noteModal.name}</p></div>
              <button onClick={() => setNoteModal(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
            </div>
            <div className="p-5">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Observation notes..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none" />
            </div>
            <div className="flex gap-3 p-5 pt-0 justify-end">
              <button onClick={() => setNoteModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={() => { if (noteModal) { setLocalNotes(p => ({ ...p, [`${noteModal.studentId}_all`]: noteText })); setDirty(true); } setNoteModal(null); toast.success('Note saved'); }}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl flex items-center gap-2">
                <FiSave size={14} /> Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>JSS</div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">JSS Marks Entry â€” Grade 7Â·8Â·9</h1>
                <p className="text-xs text-gray-400">KICD CBC Competency Assessment Â· EE Â· ME Â· AE Â· BE</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {dirty && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1"><FiAlertCircle size={12} /> Unsaved</span>}
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiDownload size={14} /> CSV</button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiPrinter size={14} /> Print</button>
              <button onClick={handleSave} disabled={saving || !dirty}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition disabled:opacity-50"
                style={{ background: dirty ? 'linear-gradient(135deg,#6C63FF,#00D9A6)' : '#9CA3AF' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Grade</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selStream} onChange={e => setSelStream(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[130px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => { setSelTerm(e.target.value); const t = terms.find(t => String(t.id) === e.target.value); if (t) setSelYear(t.year); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="">Select Term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' âœ“' : ''}</option>)}
            </select>
            <select value={selLA} onChange={e => setSelLA(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[180px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="all">All Learning Areas</option>
              {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <button onClick={() => setShowBulkPanel(!showBulkPanel)} className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100">
              <FiZap size={14} /> Bulk
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-6 flex gap-1 border-t border-gray-100">
          {([['marks','ðŸ“ Marks Grid'],['analytics','ðŸ“Š Analytics'],['bulk','âš¡ Bulk'],['export','ðŸ“¥ Export']] as [Tab,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab===t?'border-indigo-500 text-indigo-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* BULK PANEL */}
      {showBulkPanel && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-semibold text-indigo-700 block mb-1">Learning Area</label>
            <select value={bulkLA} onChange={e => setBulkLA(e.target.value)} className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[200px]">
              <option value="">Select area</option>
              {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-indigo-700 block mb-1">Level</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setBulkLevel(l)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition ${bulkLevel===l?'scale-105 shadow':'border-gray-200 bg-white'}`}
                  style={bulkLevel===l?{background:COMP[l].bg,color:COMP[l].color,borderColor:COMP[l].border}:{}}>{l}</button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-600">Apply to: {selectedStudents.size>0?`${selectedStudents.size} selected`:`All ${students.length}`}</div>
          <button onClick={handleBulkApply} className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl flex items-center gap-2"><FiZap size={14}/> Apply</button>
          <button onClick={() => setShowBulkPanel(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
        </div>
      )}

      <div className="p-6">
        {/* COVERAGE STRIP */}
        {selForm && selTerm && students.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-6 items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg border-4" style={{ borderColor: coverage===100?'#059669':coverage>=60?'#D97706':'#DC2626', color: coverage===100?'#059669':coverage>=60?'#D97706':'#DC2626' }}>{coverage}%</div>
              <div><p className="text-sm font-bold text-gray-800">Coverage</p><p className="text-xs text-gray-500">{Object.keys(localMarks).length}/{students.length*learningAreas.length} entries</p></div>
            </div>
            <div className="h-10 w-px bg-gray-200"/>
            {LEVELS.map(l => (
              <div key={l} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: COMP[l].color }}/>
                <div><p className="text-xs font-bold" style={{ color: COMP[l].color }}>{l}: {overall[l.toLowerCase() as keyof Analytics]}</p><p className="text-[10px] text-gray-400">{overall.total>0?Math.round((overall[l.toLowerCase() as keyof Analytics]/overall.total)*100):0}%</p></div>
              </div>
            ))}
            <div className="ml-auto text-xs text-gray-400">{students.length} students Â· {learningAreas.length} areas</div>
          </div>
        )}

        {/* MARKS TAB */}
        {tab === 'marks' && (
          <>
            {!selForm || !selTerm ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4"><FiFilter size={28} className="text-indigo-400"/></div>
                <h3 className="font-bold text-gray-700 mb-1">Select Grade & Term</h3>
                <p className="text-sm text-gray-400">Choose a Grade (7, 8, or 9) and academic term to load students</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"/></div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4"><FiUsers size={28} className="text-amber-400"/></div>
                <h3 className="font-bold text-gray-700 mb-1">No Students Found</h3>
                <p className="text-sm text-gray-400">No active students in selected grade/stream. Add JSS forms (Grade 7, 8, 9) in JSS Setup first.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-3 px-4 sticky left-0 bg-gray-50 z-10 min-w-[230px]">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedStudents.size===students.length&&students.length>0}
                              onChange={e => setSelectedStudents(e.target.checked?new Set(students.map(s=>s.id)):new Set())} className="rounded"/>
                            <span className="text-xs font-bold text-gray-600 uppercase">Student</span>
                          </div>
                        </th>
                        {filteredLAs.map(la => (
                          <th key={la.id} className="text-center py-3 px-2 min-w-[90px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-lg">{la.icon}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: la.color }}>{la.code}</span>
                            </div>
                          </th>
                        ))}
                        <th className="text-center py-3 px-3 min-w-[70px] text-xs font-bold text-gray-600 uppercase">Cov</th>
                        <th className="text-center py-3 px-3 min-w-[50px] text-xs font-bold text-gray-600 uppercase">Note</th>
                      </tr>
                      <tr className="border-b border-gray-100 bg-white">
                        <td className="sticky left-0 bg-white z-10 px-4 py-1"><span className="text-[10px] text-gray-400">{filteredStudents.length} student(s)</span></td>
                        {filteredLAs.map(la => (
                          <td key={la.id} className="text-center px-1 py-1">
                            <span className="text-[9px] text-gray-400 leading-tight block px-1">{la.name.length>14?la.name.substring(0,14)+'â€¦':la.name}</span>
                          </td>
                        ))}
                        <td/><td/>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, idx) => {
                        const filled = learningAreas.filter(la => localMarks[`${s.id}_${la.id}`]).length;
                        const cov = Math.round((filled/Math.max(learningAreas.length,1))*100);
                        const hasBE = learningAreas.some(la => localMarks[`${s.id}_${la.id}`]==='BE');
                        const hasNote = Object.keys(localNotes).some(k => k.startsWith(`${s.id}_`));
                        return (
                          <tr key={s.id} className={`border-b border-gray-100 transition hover:bg-indigo-50/40 ${hasBE?'bg-red-50/30':idx%2===0?'bg-white':'bg-gray-50/30'}`}>
                            <td className="sticky left-0 z-10 px-4 py-2.5 bg-inherit min-w-[230px]">
                              <div className="flex items-center gap-2.5">
                                <input type="checkbox" checked={selectedStudents.has(s.id)}
                                  onChange={e => { const ns=new Set(selectedStudents); e.target.checked?ns.add(s.id):ns.delete(s.id); setSelectedStudents(ns); }} className="rounded"/>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                  style={{ background: `hsl(${(s.id*47)%360},60%,50%)` }}>{s.first_name[0]}{s.last_name[0]}</div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-800 leading-tight">{s.first_name} {s.last_name}</p>
                                  <p className="text-[10px] text-gray-400">{s.admission_number}</p>
                                </div>
                                {hasBE && <FiAlertCircle size={11} className="text-red-400 flex-shrink-0" title="BE in at least one area"/>}
                              </div>
                            </td>
                            {filteredLAs.map(la => {
                              const cur = getMark(s.id, la.id);
                              return (
                                <td key={la.id} className="text-center px-1 py-2">
                                  <select value={cur||''} onChange={e => e.target.value && setMark(s.id, la.id, e.target.value as CompLevel)}
                                    className="text-[11px] font-bold rounded-lg px-1 py-1.5 border-2 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-indigo-300 w-14 text-center appearance-none"
                                    style={cur?{background:COMP[cur].bg,color:COMP[cur].color,borderColor:COMP[cur].border}:{background:'#F9FAFB',color:'#9CA3AF',borderColor:'#E5E7EB'}}>
                                    <option value="">â€”</option>
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                                </td>
                              );
                            })}
                            <td className="text-center px-2 py-2">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-xs font-bold ${cov===100?'text-green-600':cov>=60?'text-amber-600':'text-red-500'}`}>{cov}%</span>
                                <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width:`${cov}%`, background:cov===100?'#059669':cov>=60?'#D97706':'#DC2626' }}/>
                                </div>
                              </div>
                            </td>
                            <td className="text-center px-2 py-2">
                              <button onClick={() => { setNoteModal({ studentId:s.id, name:`${s.first_name} ${s.last_name}` }); setNoteText(localNotes[`${s.id}_all`]||''); }}
                                className={`p-1.5 rounded-lg hover:bg-gray-100 transition ${hasNote?'text-indigo-500':'text-gray-300'}`}>
                                <FiEdit2 size={12}/>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                      {LEVELS.map(l => (
                        <tr key={l} className="border-b border-gray-100">
                          <td className="sticky left-0 bg-gray-50 z-10 px-4 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center" style={{ background:COMP[l].bg,color:COMP[l].color }}>{l}</span>
                              <span className="text-[10px] text-gray-500">{COMP[l].label}</span>
                            </div>
                          </td>
                          {filteredLAs.map(la => {
                            const an = analyticsPerLA[la.id];
                            const cnt = an?.[l.toLowerCase() as keyof Analytics]||0;
                            const tot = an?.total||0;
                            return (
                              <td key={la.id} className="text-center px-1 py-1.5">
                                <span className="text-xs font-bold" style={cnt>0?{color:COMP[l].color}:{color:'#D1D5DB'}}>{cnt>0?`${cnt} (${tot>0?Math.round((cnt/tot)*100):0}%)`:'â€”'}</span>
                              </td>
                            );
                          })}
                          <td className="text-center px-2"><span className="text-xs font-bold" style={{ color:COMP[l].color }}>{overall[l.toLowerCase() as keyof Analytics]}</span></td>
                          <td/>
                        </tr>
                      ))}
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {LEVELS.map(l => (
                <div key={l} className="bg-white rounded-2xl border-2 p-5 shadow-sm" style={{ borderColor:COMP[l].border }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-black" style={{ color:COMP[l].color }}>{overall[l.toLowerCase() as keyof Analytics]}</span>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background:COMP[l].bg,color:COMP[l].color }}>{l}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">{COMP[l].label}</p>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${overall.total>0?Math.round((overall[l.toLowerCase() as keyof Analytics]/overall.total)*100):0}%`, background:COMP[l].color }}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <FiBarChart2 className="text-indigo-500" size={18}/>
                <h3 className="font-bold text-gray-800">Per Learning Area Breakdown</h3>
              </div>
              <div className="p-5 space-y-5">
                {learningAreas.map(la => {
                  const an = analyticsPerLA[la.id];
                  if (!an || an.total === 0) return null;
                  return (
                    <div key={la.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><span className="text-lg">{la.icon}</span><span className="text-sm font-semibold text-gray-700">{la.name}</span></div>
                        <span className="text-xs text-gray-400">{an.total}/{students.length} marked</span>
                      </div>
                      <div className="flex h-5 rounded-xl overflow-hidden bg-gray-100 gap-0.5">
                        {LEVELS.map(l => { const c=an[l.toLowerCase() as keyof Analytics]; const p=an.total>0?(c/an.total)*100:0; return p>0?<div key={l} style={{ width:`${p}%`,background:COMP[l].color }} title={`${l}: ${c} (${Math.round(p)}%)`}/>:null; })}
                      </div>
                      <div className="flex gap-4 mt-1.5">
                        {LEVELS.map(l => <span key={l} className="text-[10px] font-semibold" style={{ color:COMP[l].color }}>{l}: {an[l.toLowerCase() as keyof Analytics]}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* At-risk */}
            {students.some(s => learningAreas.some(la => localMarks[`${s.id}_${la.id}`]==='BE')) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3"><FiAlertCircle size={18}/>At-Risk Students (BE in any area)</h3>
                <div className="space-y-2">
                  {students.filter(s => learningAreas.some(la => localMarks[`${s.id}_${la.id}`]==='BE')).map(s => {
                    const beAreas = learningAreas.filter(la => localMarks[`${s.id}_${la.id}`]==='BE');
                    return (
                      <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-red-100">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-500">{s.first_name[0]}{s.last_name[0]}</div>
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p><p className="text-xs text-red-600">BE in: {beAreas.map(la=>la.name).join(', ')}</p></div>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold">{beAreas.length} area(s)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BULK TAB */}
        {tab === 'bulk' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-xl">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2"><FiZap size={18} className="text-indigo-500"/>Bulk Competency Assignment</h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Learning Area</label>
                <select value={bulkLA} onChange={e => setBulkLA(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                  <option value="">-- Select Learning Area --</option>
                  {learningAreas.map(la => <option key={la.id} value={la.id}>{la.icon} {la.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Competency Level</label>
                <div className="grid grid-cols-2 gap-3">
                  {LEVELS.map(l => (
                    <button key={l} onClick={() => setBulkLevel(l)}
                      className={`p-4 rounded-xl border-2 text-left transition ${bulkLevel===l?'scale-[1.02] shadow-md':''}`}
                      style={bulkLevel===l?{background:COMP[l].bg,borderColor:COMP[l].border}:{borderColor:'#E5E7EB'}}>
                      <div className="font-black text-xl" style={{ color:COMP[l].color }}>{l}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{COMP[l].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Target Students</label>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedStudents(new Set())} className={`flex-1 py-2.5 rounded-xl text-sm border-2 transition ${selectedStudents.size===0?'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold':'border-gray-200 text-gray-600'}`}>All ({students.length})</button>
                  <div className={`flex-1 py-2.5 rounded-xl text-sm border-2 text-center ${selectedStudents.size>0?'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold':'border-gray-200 text-gray-400'}`}>Selected ({selectedStudents.size})</div>
                </div>
              </div>
              <button onClick={handleBulkApply} className="w-full py-3 font-bold text-white rounded-xl flex items-center justify-center gap-2" style={{ background:'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
                <FiZap size={16}/> Apply Now
              </button>
            </div>
          </div>
        )}

        {/* EXPORT TAB */}
        {tab === 'export' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon:FiDownload, label:'Export CSV', desc:'Full marks grid â€” all learning areas', color:'#059669', action:exportCSV },
              { icon:FiPrinter, label:'Print Sheet', desc:'Printer-friendly marks sheet', color:'#2563EB', action:()=>window.print() },
              { icon:FiSend, label:'KNEC Format Export', desc:'Official KNEC CBA format (v2.3)', color:'#7C3AED', action:()=>toast('KNEC export coming in next update',{icon:'â„¹ï¸'}) },
            ].map(({ icon:Icon, label, desc, color, action }) => (
              <button key={label} onClick={action} className="bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-lg transition group shadow-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition" style={{ background:`${color}18` }}>
                  <Icon size={22} style={{ color }}/>
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{label}</h3>
                <p className="text-xs text-gray-500">{desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING SAVE */}
      {dirty && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 font-bold text-white rounded-2xl shadow-2xl text-sm transition disabled:opacity-70" style={{ background:'linear-gradient(135deg,#6C63FF,#00D9A6)' }}>
            {saving?<FiRefreshCw size={16} className="animate-spin"/>:<FiSave size={16}/>}
            {saving?'Saving...':(`Save ${Object.keys(localMarks).length} Marks`)}
          </button>
        </div>
      )}
    </div>
  );
}

