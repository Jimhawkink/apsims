'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiDownload, FiPrinter, FiRefreshCw, FiSearch, FiFilter,
  FiAward, FiUsers, FiBarChart2, FiTrendingUp, FiAlertCircle,
  FiCheckCircle, FiGrid, FiFileText, FiStar, FiChevronDown,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';

const COMP: Record<CompLevel, { label: string; color: string; bg: string; border: string; score: number }> = {
  EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', score: 4 },
  ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD', score: 3 },
  AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', score: 2 },
  BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', score: 1 },
};
const LEVELS: CompLevel[] = ['EE', 'ME', 'AE', 'BE'];

interface Form { id: number; form_name: string; form_level: number; }
interface Stream { id: number; stream_name: string; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }
interface LearningArea { id: number; name: string; code: string; color: string; icon: string; }
interface Student { id: number; first_name: string; last_name: string; admission_number: string; gender?: string; }
interface Mark { student_id: number; learning_area_id: number; competency_level: CompLevel; }
interface StudentRow extends Student {
  marks: Record<number, CompLevel>;
  avgScore: number;
  overall: CompLevel;
  ee: number; me: number; ae: number; be: number;
  rank: number;
}

const scoreOf = (l?: CompLevel) => l ? COMP[l].score : 0;
const levelOf = (avg: number): CompLevel => avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';

export default function JSSBroadsheetPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'rank' | 'overall'>('rank');
  const [filterLevel, setFilterLevel] = useState<CompLevel | 'all'>('all');
  const [schoolName, setSchoolName] = useState('APSIMS School');

  useEffect(() => {
    const load = async () => {
      const [fR, sR, tR, laR, sdR] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_streams').select('*').order('stream_name'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('jss_learning_areas').select('*').eq('is_active', true).order('sort_order'),
        sb.from('school_settings').select('value').eq('key', 'school_name').maybeSingle(),
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
      if (sdR.data?.value) setSchoolName(sdR.data.value);
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) { setSelTerm(String(cur.id)); setSelYear(cur.year); }
      setLoading(false);
    };
    load();
  }, []);

  const fetchData = useCallback(async () => {
    if (!selForm || !selTerm) return;
    setLoading(true);
    let q = sb.from('school_students').select('id,first_name,last_name,admission_number,gender')
      .eq('form_id', selForm).eq('status', 'Active').order('last_name');
    if (selStream) q = q.eq('stream_id', selStream);
    const { data: studs } = await q;
    setStudents(studs || []);
    if (studs && studs.length > 0) {
      const { data: dbMarks } = await sb.from('jss_marks')
        .select('student_id,learning_area_id,competency_level')
        .in('student_id', studs.map((s: Student) => s.id))
        .eq('term_id', selTerm).eq('year', selYear);
      setMarks(dbMarks || []);
    }
    setLoading(false);
  }, [selForm, selTerm, selYear, selStream]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows: StudentRow[] = useMemo(() => {
    const built = students.map(s => {
      const sMarks: Record<number, CompLevel> = {};
      marks.filter(m => m.student_id === s.id).forEach(m => { sMarks[m.learning_area_id] = m.competency_level; });
      const scores = Object.values(sMarks).map(l => COMP[l].score);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        ...s, marks: sMarks, avgScore: avg, overall: levelOf(avg),
        ee: scores.filter(s => s === 4).length,
        me: scores.filter(s => s === 3).length,
        ae: scores.filter(s => s === 2).length,
        be: scores.filter(s => s === 1).length,
        rank: 0,
      };
    });
    built.sort((a, b) => b.avgScore - a.avgScore);
    let rank = 1;
    built.forEach((r, i) => {
      if (i > 0 && r.avgScore === built[i - 1].avgScore) r.rank = built[i - 1].rank;
      else { r.rank = rank; }
      rank++;
    });
    if (sortBy === 'name') built.sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`));
    return built;
  }, [students, marks, sortBy]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const s = search.toLowerCase();
      r = r.filter(row => `${row.first_name} ${row.last_name}`.toLowerCase().includes(s) || row.admission_number.toLowerCase().includes(s));
    }
    if (filterLevel !== 'all') r = r.filter(row => row.overall === filterLevel);
    return r;
  }, [rows, search, filterLevel]);

  const classAnalytics = useMemo(() => {
    const all = rows.map(r => r.overall);
    return {
      ee: all.filter(l => l === 'EE').length,
      me: all.filter(l => l === 'ME').length,
      ae: all.filter(l => l === 'AE').length,
      be: all.filter(l => l === 'BE').length,
      total: all.length,
      avgScore: rows.length > 0 ? rows.reduce((s, r) => s + r.avgScore, 0) / rows.length : 0,
    };
  }, [rows]);

  const exportCSV = () => {
    const headers = ['Rank', 'Adm No', 'Name', 'Gender', ...learningAreas.map(la => la.code), 'Avg Score', 'Overall', 'EE', 'ME', 'AE', 'BE'];
    const csvRows = rows.map(r => [
      r.rank, r.admission_number, `${r.first_name} ${r.last_name}`, r.gender || '',
      ...learningAreas.map(la => r.marks[la.id] || '—'),
      r.avgScore.toFixed(2), r.overall, r.ee, r.me, r.ae, r.be,
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const term = terms.find(t => String(t.id) === selTerm);
    const form = forms.find(f => String(f.id) === selForm);
    a.download = `JSS_Broadsheet_${form?.form_name}_${term?.term_name}_${selYear}.csv`;
    a.click(); toast.success('CSV exported!');
  };

  const form = forms.find(f => String(f.id) === selForm);
  const term = terms.find(t => String(t.id) === selTerm);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                style={{ background: 'linear-gradient(135deg,#1D9E75,#2563EB)' }}>
                <FiGrid size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">JSS Broadsheet</h1>
                <p className="text-xs text-gray-400">Grade 7 · 8 · 9 — CBC Competency Class Results Sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiRefreshCw size={14} /> Refresh
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <FiDownload size={14} /> CSV
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#1D9E75,#2563EB)' }}>
                <FiPrinter size={14} /> Print Broadsheet
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
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[130px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="rank">Sort: By Rank</option>
              <option value="name">Sort: By Name</option>
              <option value="overall">Sort: By Level</option>
            </select>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value as any)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[140px] focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="all">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l}>{l} — {COMP[l].label}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* School Header for print */}
        <div className="print-only hidden text-center mb-4">
          <h2 className="text-xl font-black text-gray-900">{schoolName}</h2>
          <h3 className="text-lg font-bold text-gray-700">JSS COMPETENCY BROADSHEET</h3>
          <p className="text-sm text-gray-600">{form?.form_name} · {term?.term_name} {selYear}</p>
          <p className="text-xs text-gray-400 mt-1">KICD CBC Competency Assessment — EE / ME / AE / BE</p>
        </div>

        {/* SUMMARY CARDS */}
        {rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-medium mb-1">Total Students</p>
              <p className="text-3xl font-black text-gray-800">{rows.length}</p>
              <p className="text-xs text-gray-400 mt-1">Avg Score: {classAnalytics.avgScore.toFixed(2)}</p>
            </div>
            {LEVELS.map(l => (
              <div key={l} className="bg-white rounded-2xl border-2 p-4 shadow-sm" style={{ borderColor: COMP[l].border }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: COMP[l].color }}>{l}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: COMP[l].bg, color: COMP[l].color }}>
                    {classAnalytics.total > 0 ? Math.round((classAnalytics[l.toLowerCase() as 'ee' | 'me' | 'ae' | 'be'] / classAnalytics.total) * 100) : 0}%
                  </span>
                </div>
                <p className="text-3xl font-black" style={{ color: COMP[l].color }}>
                  {classAnalytics[l.toLowerCase() as 'ee' | 'me' | 'ae' | 'be']}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 leading-tight">{COMP[l].label}</p>
                <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${classAnalytics.total > 0 ? Math.round((classAnalytics[l.toLowerCase() as 'ee' | 'me' | 'ae' | 'be'] / classAnalytics.total) * 100) : 0}%`, background: COMP[l].color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MAIN BROADSHEET TABLE */}
        {!selForm || !selTerm ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4"><FiFilter size={28} className="text-indigo-400" /></div>
            <h3 className="font-bold text-gray-700 mb-1">Select Grade & Term</h3>
            <p className="text-sm text-gray-400">Choose a JSS grade and term to generate the broadsheet</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-200">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4"><FiUsers size={28} className="text-amber-400" /></div>
            <h3 className="font-bold text-gray-700 mb-1">No Data Found</h3>
            <p className="text-sm text-gray-400">Enter marks in JSS Marks Entry first</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table title bar */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">
                  {form?.form_name} · {term?.term_name} {selYear} Broadsheet
                </h3>
                <p className="text-xs text-gray-400">{filtered.length} of {rows.length} students shown</p>
              </div>
              <div className="flex gap-1">
                {LEVELS.map(l => (
                  <button key={l} onClick={() => setFilterLevel(filterLevel === l ? 'all' : l)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border transition"
                    style={filterLevel === l ? { background: COMP[l].bg, color: COMP[l].color, borderColor: COMP[l].border } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-center py-3 px-3 w-12 sticky left-0 bg-gray-50 z-10 text-xs font-bold text-gray-600 uppercase">#</th>
                    <th className="text-left py-3 px-4 sticky left-12 bg-gray-50 z-10 min-w-[220px] text-xs font-bold text-gray-600 uppercase">Student</th>
                    {learningAreas.map(la => (
                      <th key={la.id} className="text-center py-3 px-2 min-w-[80px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-base">{la.icon}</span>
                          <span className="text-[10px] font-bold" style={{ color: la.color }}>{la.code}</span>
                        </div>
                      </th>
                    ))}
                    <th className="text-center py-3 px-3 min-w-[80px] text-xs font-bold text-gray-600 uppercase">Score</th>
                    <th className="text-center py-3 px-3 min-w-[80px] text-xs font-bold text-gray-600 uppercase">Overall</th>
                    <th className="text-center py-3 px-2 min-w-[40px] text-xs font-bold text-gray-600 uppercase">EE</th>
                    <th className="text-center py-3 px-2 min-w-[40px] text-xs font-bold text-gray-600 uppercase">ME</th>
                    <th className="text-center py-3 px-2 min-w-[40px] text-xs font-bold text-gray-600 uppercase">AE</th>
                    <th className="text-center py-3 px-2 min-w-[40px] text-xs font-bold text-gray-600 uppercase">BE</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="text-center py-2.5 px-3 sticky left-0 bg-inherit z-10">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mx-auto ${row.rank <= 3 ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
                          style={row.rank <= 3 ? { background: row.rank === 1 ? '#F59E0B' : row.rank === 2 ? '#9CA3AF' : '#CD7C2A' } : {}}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 sticky left-12 bg-inherit z-10 min-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ background: `hsl(${(row.id * 47) % 360},60%,50%)` }}>{row.first_name[0]}{row.last_name[0]}</div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{row.last_name}, {row.first_name}</p>
                            <p className="text-[10px] text-gray-400">{row.admission_number}</p>
                          </div>
                        </div>
                      </td>
                      {learningAreas.map(la => {
                        const lvl = row.marks[la.id];
                        return (
                          <td key={la.id} className="text-center py-2.5 px-1">
                            {lvl ? (
                              <span className="inline-flex items-center justify-center w-12 h-7 rounded-lg text-[11px] font-bold border"
                                style={{ background: COMP[lvl].bg, color: COMP[lvl].color, borderColor: COMP[lvl].border }}>{lvl}</span>
                            ) : (
                              <span className="text-gray-200 text-sm">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center py-2.5 px-3">
                        <span className="text-sm font-bold text-gray-700">{row.avgScore > 0 ? row.avgScore.toFixed(2) : '—'}</span>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {row.avgScore > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border"
                            style={{ background: COMP[row.overall].bg, color: COMP[row.overall].color, borderColor: COMP[row.overall].border }}>
                            <FiAward size={10} />{row.overall}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="text-center py-2.5 px-2"><span className="text-xs font-bold" style={{ color: row.ee > 0 ? '#059669' : '#D1D5DB' }}>{row.ee || '—'}</span></td>
                      <td className="text-center py-2.5 px-2"><span className="text-xs font-bold" style={{ color: row.me > 0 ? '#2563EB' : '#D1D5DB' }}>{row.me || '—'}</span></td>
                      <td className="text-center py-2.5 px-2"><span className="text-xs font-bold" style={{ color: row.ae > 0 ? '#D97706' : '#D1D5DB' }}>{row.ae || '—'}</span></td>
                      <td className="text-center py-2.5 px-2"><span className="text-xs font-bold" style={{ color: row.be > 0 ? '#DC2626' : '#D1D5DB' }}>{row.be || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer stats */}
                <tfoot className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <td colSpan={2} className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-xs font-bold text-gray-600 uppercase">Class Summary</td>
                    {learningAreas.map(la => {
                      const laMarks = rows.map(r => r.marks[la.id]).filter(Boolean) as CompLevel[];
                      const dominant = LEVELS.find(l => laMarks.filter(m => m === l).length === Math.max(...LEVELS.map(l => laMarks.filter(m => m === l).length)));
                      return (
                        <td key={la.id} className="text-center py-3 px-1">
                          {dominant && laMarks.length > 0 ? (
                            <div>
                              <div className="text-[10px] font-bold" style={{ color: COMP[dominant].color }}>{dominant}</div>
                              <div className="text-[9px] text-gray-400">{laMarks.length} marked</div>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-3"><span className="text-sm font-black text-gray-800">{classAnalytics.avgScore.toFixed(2)}</span></td>
                    <td className="text-center py-3 px-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: COMP[levelOf(classAnalytics.avgScore)].bg, color: COMP[levelOf(classAnalytics.avgScore)].color }}>
                        {levelOf(classAnalytics.avgScore)}
                      </span>
                    </td>
                    <td className="text-center py-3 px-2"><span className="text-xs font-black text-green-600">{classAnalytics.ee}</span></td>
                    <td className="text-center py-3 px-2"><span className="text-xs font-black text-blue-600">{classAnalytics.me}</span></td>
                    <td className="text-center py-3 px-2"><span className="text-xs font-black text-amber-600">{classAnalytics.ae}</span></td>
                    <td className="text-center py-3 px-2"><span className="text-xs font-black text-red-600">{classAnalytics.be}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* VISUAL DISTRIBUTION */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 size={18} className="text-indigo-500" /> Competency Distribution</h3>
            <div className="flex h-8 rounded-xl overflow-hidden gap-0.5 mb-3">
              {LEVELS.map(l => {
                const cnt = classAnalytics[l.toLowerCase() as 'ee' | 'me' | 'ae' | 'be'];
                const pct = classAnalytics.total > 0 ? (cnt / classAnalytics.total) * 100 : 0;
                return pct > 0 ? (
                  <div key={l} style={{ width: `${pct}%`, background: COMP[l].color }}
                    className="flex items-center justify-center text-white text-xs font-bold"
                    title={`${l}: ${cnt} (${Math.round(pct)}%)`}>
                    {pct > 8 ? `${l} ${Math.round(pct)}%` : ''}
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex gap-6 flex-wrap">
              {LEVELS.map(l => {
                const cnt = classAnalytics[l.toLowerCase() as 'ee' | 'me' | 'ae' | 'be'];
                const pct = classAnalytics.total > 0 ? Math.round((cnt / classAnalytics.total) * 100) : 0;
                return (
                  <div key={l} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: COMP[l].color }} />
                    <span className="text-xs text-gray-600">{COMP[l].label}: <strong style={{ color: COMP[l].color }}>{cnt} ({pct}%)</strong></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          table { font-size: 10px !important; }
          .sticky { position: static !important; }
        }
      `}</style>
    </div>
  );
}
