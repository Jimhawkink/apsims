'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiSave, FiX, FiPrinter, FiDownload, FiRefreshCw, FiTarget, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Target {
  id?: number;
  academic_year: string;
  term: string;
  form_id: number;
  form_name?: string;
  subject_id: number;
  subject_name?: string;
  target_points: number;
  attained_points: number;
  deviation: number;
  new_target: number;
  notes?: string;
}
interface ExamSeries {
  id?: number;
  academic_year: string;
  term: string;
  series_name: string;
  form_id: number;
  form_name?: string;
  subject_id: number;
  subject_name?: string;
  mean_score: number;
  mean_grade: string;
  pass_count: number;
  total_students: number;
  exam_date?: string;
}
interface Form { id: number; form_name: string; }
interface Subject { id: number; subject_name: string; }

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const SERIES = ['Cycle Test 1', 'Cycle Test 2', 'Arise & Shine', 'End of Term', 'KCSE Mock', 'Pre-Mock'];
const CY = new Date().getFullYear().toString();

const GRADE_FROM_PTS = (pts: number) => {
  if (pts >= 11) return 'A'; if (pts >= 10) return 'A-'; if (pts >= 9) return 'B+';
  if (pts >= 8) return 'B'; if (pts >= 7) return 'B-'; if (pts >= 6) return 'C+';
  if (pts >= 5) return 'C'; if (pts >= 4) return 'C-'; if (pts >= 3) return 'D+';
  if (pts >= 2) return 'D'; if (pts >= 1) return 'D-'; return 'E';
};

const DEV_COLOR = (d: number) => d >= 0 ? 'text-green-600' : 'text-red-600';
const DEV_ICON = (d: number) => d >= 0 ? '↑' : '↓';

const TABS = ['🎯 Class Targets', '📋 Exam Series Tracker', '📊 Performance Map'] as const;

export default function TargetsTrackerPage() {
  const [tab, setTab] = useState<typeof TABS[number]>(TABS[0]);
  const [forms, setForms] = useState<Form[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [series, setSeries] = useState<ExamSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(CY);
  const [term, setTerm] = useState('Term 1');
  const [selForm, setSelForm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTarget, setNewTarget] = useState<Partial<Target>>({ academic_year: CY, term: 'Term 1' });
  const [newSeries, setNewSeries] = useState<Partial<ExamSeries>>({ academic_year: CY, term: 'Term 1', series_name: SERIES[0] });

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, sRes, tRes, eRes] = await Promise.all([
      supabase.from('school_forms').select('id, form_name').order('form_level'),
      supabase.from('school_subjects').select('id, subject_name').order('subject_name'),
      supabase.from('school_class_targets').select(`*, school_forms(form_name), school_subjects(subject_name)`).eq('academic_year', year).eq('term', term),
      supabase.from('school_exam_series').select(`*, school_forms(form_name), school_subjects(subject_name)`).eq('academic_year', year).eq('term', term),
    ]);
    setForms(fRes.data || []);
    setSubjects(sRes.data || []);
    setTargets((tRes.data || []).map((t: any) => ({ ...t, form_name: t.school_forms?.form_name, subject_name: t.school_subjects?.subject_name })));
    setSeries((eRes.data || []).map((e: any) => ({ ...e, form_name: e.school_forms?.form_name, subject_name: e.school_subjects?.subject_name })));
    setLoading(false);
  }, [year, term]);

  useEffect(() => { load(); }, [load]);

  const saveTarget = async () => {
    if (!newTarget.form_id || !newTarget.subject_id || !newTarget.target_points) { toast.error('Fill required fields'); return; }
    setSaving(true);
    const dev = (Number(newTarget.attained_points) || 0) - Number(newTarget.target_points);
    const { error } = await supabase.from('school_class_targets').upsert({
      academic_year: year, term, form_id: newTarget.form_id, subject_id: newTarget.subject_id,
      target_points: Number(newTarget.target_points), attained_points: Number(newTarget.attained_points) || 0,
      new_target: Number(newTarget.new_target) || 0, notes: newTarget.notes || null,
    }, { onConflict: 'academic_year,term,form_id,subject_id' });
    if (!error) { toast.success('Target saved!'); setShowModal(false); setNewTarget({ academic_year: year, term }); await load(); }
    else toast.error(error.message);
    setSaving(false);
  };

  const saveSeries = async () => {
    if (!newSeries.form_id || !newSeries.subject_id || !newSeries.series_name) { toast.error('Fill required fields'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_exam_series').insert({
      academic_year: year, term, series_name: newSeries.series_name,
      form_id: newSeries.form_id, subject_id: newSeries.subject_id,
      mean_score: Number(newSeries.mean_score) || 0,
      mean_grade: newSeries.mean_grade || GRADE_FROM_PTS(Number(newSeries.mean_score) || 0),
      pass_count: Number(newSeries.pass_count) || 0, total_students: Number(newSeries.total_students) || 0,
      exam_date: newSeries.exam_date || null, notes: (newSeries as any).notes || null,
    });
    if (!error) { toast.success('Exam series saved!'); setShowSeriesModal(false); setNewSeries({ academic_year: year, term, series_name: SERIES[0] }); await load(); }
    else toast.error(error.message);
    setSaving(false);
  };

  const exportTargetsCSV = () => {
    const rows = targets.map(t => [t.form_name, t.subject_name, t.target_points, t.attained_points, t.deviation > 0 ? `+${t.deviation}` : t.deviation, GRADE_FROM_PTS(t.target_points), t.new_target]);
    const csv = '\uFEFF' + ['Form,Subject,Target Points,Attained,Deviation,Target Grade,New Target', ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `Targets_${year}_${term}.csv`; a.click();
  };

  const filteredTargets = targets.filter(t => !selForm || String(t.form_id) === selForm);
  const filteredSeries = series.filter(s => !selForm || String(s.form_id) === selForm);
  const seriesNames = [...new Set(series.map(s => s.series_name))];

  return (
    <div className="p-4 lg:p-6 space-y-5 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Class Targets & Academic Progress</h1>
          <p className="text-sm text-gray-500 mt-0.5">Target vs Attained vs Deviation · Cycle Tests · Arise & Shine · End of Term</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={year} onChange={e => setYear(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 outline-none font-bold">
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={term} onChange={e => setTerm(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 outline-none font-bold">
            {TERMS.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={selForm} onChange={e => setSelForm(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 outline-none">
            <option value="">All Forms</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
          </select>
          <button onClick={exportTargetsCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"><FiDownload size={13} />Export</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl"><FiPrinter size={13} />Print</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-200 rounded-2xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB: CLASS TARGETS ─────────────────────────────────────────────── */}
      {tab === TABS[0] && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-black text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <FiPlus size={13} />Add Target
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-black text-gray-800 text-sm">📊 {term} {year} — Target vs Attained vs Deviation</h3>
              <span className="text-xs text-gray-400">{filteredTargets.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {['Form', 'Subject', 'Target Pts', 'Target Grade', 'Attained Pts', 'Attained Grade', 'Deviation', 'New Target'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-black text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTargets.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-700 text-xs">{t.form_name}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 text-sm">{t.subject_name}</td>
                      <td className="px-4 py-3 font-black text-indigo-700">{t.target_points?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-700">{GRADE_FROM_PTS(t.target_points)}</span>
                      </td>
                      <td className="px-4 py-3 font-black text-gray-800">{t.attained_points?.toFixed(2) || '—'}</td>
                      <td className="px-4 py-3">
                        {t.attained_points ? <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-green-100 text-green-700">{GRADE_FROM_PTS(t.attained_points)}</span> : '—'}
                      </td>
                      <td className={`px-4 py-3 font-black ${DEV_COLOR(t.deviation)}`}>
                        {t.attained_points ? <>{DEV_ICON(t.deviation)}{Math.abs(t.deviation).toFixed(2)}</> : '—'}
                      </td>
                      <td className="px-4 py-3 font-black text-purple-700">{t.new_target ? t.new_target.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTargets.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <FiTarget size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="font-semibold">No targets set for {term} {year}</p>
                  <p className="text-xs mt-1">Click "Add Target" to set targets per form and subject</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB: EXAM SERIES ──────────────────────────────────────────────── */}
      {tab === TABS[1] && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowSeriesModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-black text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              <FiPlus size={13} />Add Exam Results
            </button>
          </div>
          {/* Group by series name */}
          {seriesNames.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 shadow-sm">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-semibold">No exam series data for {term} {year}</p>
              <p className="text-xs mt-1">Add results for Cycle Tests, Arise & Shine, End of Term</p>
            </div>
          ) : seriesNames.map(sn => (
            <div key={sn} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b" style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b)' }}>
                <h3 className="font-black text-white text-sm">📝 {sn} — {term} {year}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    {['Form', 'Subject', 'Mean Score', 'Mean Grade', 'Pass Count', 'Total', 'Pass Rate', 'Exam Date'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-xs font-black text-gray-500 text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSeries.filter(s => s.series_name === sn).map(s => {
                      const pr = s.total_students > 0 ? Math.round(s.pass_count / s.total_students * 100) : 0;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-600 text-xs">{s.form_name}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-800">{s.subject_name}</td>
                          <td className="px-4 py-2.5 font-black text-indigo-700">{s.mean_score?.toFixed(2)}</td>
                          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-lg text-xs font-black bg-indigo-100 text-indigo-700">{s.mean_grade}</span></td>
                          <td className="px-4 py-2.5 text-green-700 font-bold">{s.pass_count}</td>
                          <td className="px-4 py-2.5 text-gray-500">{s.total_students}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${pr}%`, background: pr >= 50 ? '#059669' : '#ef4444' }} /></div>
                              <span className="text-xs font-bold" style={{ color: pr >= 50 ? '#059669' : '#ef4444' }}>{pr}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{s.exam_date || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── TAB: PERFORMANCE MAP ─────────────────────────────────────────── */}
      {tab === TABS[2] && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {forms.map(f => {
            const fTargets = targets.filter(t => t.form_id === f.id);
            if (fTargets.length === 0) return null;
            const avg = fTargets.reduce((s, t) => s + (t.attained_points || 0), 0) / fTargets.length;
            const tgt = fTargets.reduce((s, t) => s + t.target_points, 0) / fTargets.length;
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-gray-800">{f.form_name}</h3>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">Target: {tgt.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-1 rounded-lg font-bold ${avg >= tgt ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>Attained: {avg.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {fTargets.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 truncate">{t.subject_name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min((t.attained_points / 12) * 100, 100)}%`, background: t.attained_points >= t.target_points ? '#059669' : '#ef4444' }} />
                        <div className="absolute top-0 h-3 w-0.5 bg-indigo-500" style={{ left: `${(t.target_points / 12) * 100}%` }} title={`Target: ${t.target_points}`} />
                      </div>
                      <span className={`text-xs font-black w-8 text-right ${DEV_COLOR(t.deviation)}`}>{t.deviation > 0 ? '+' : ''}{t.deviation?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {targets.length === 0 && <div className="lg:col-span-2 text-center py-16 text-gray-400 bg-white rounded-2xl border shadow-sm"><FiTarget size={32} className="mx-auto mb-2 text-gray-300" /><p>No targets data yet</p></div>}
        </div>
      )}

      {/* ── Add Target Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-black text-gray-900">Add Class Target</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><FiX size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Form *</label>
                  <select value={newTarget.form_id || ''} onChange={e => setNewTarget(p => ({ ...p, form_id: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none">
                    <option value="">Select form…</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Subject *</label>
                  <select value={newTarget.subject_id || ''} onChange={e => setNewTarget(p => ({ ...p, subject_id: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none">
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
              </div>
              {[
                { label: 'Target Mean Points *', key: 'target_points', ph: '7.5' },
                { label: 'Attained Mean Points', key: 'attained_points', ph: '6.8' },
                { label: 'New Target Points', key: 'new_target', ph: '8.0' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{f.label}</label>
                  <input type="number" step="0.01" value={(newTarget as any)[f.key] || ''}
                    onChange={e => setNewTarget(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none" placeholder={f.ph} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Notes</label>
                <textarea value={newTarget.notes || ''} onChange={e => setNewTarget(p => ({ ...p, notes: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none resize-none h-14" />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={saveTarget} disabled={saving}
                className="flex-1 py-3 font-black text-white rounded-2xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {saving ? 'Saving…' : 'Save Target'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Exam Series Modal ─────────────────────────────────────────── */}
      {showSeriesModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-black text-gray-900">Add Exam Series Results</h2>
              <button onClick={() => setShowSeriesModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><FiX size={14} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Exam Series *</label>
                <select value={newSeries.series_name} onChange={e => setNewSeries(p => ({ ...p, series_name: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none">
                  {SERIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Form *</label>
                  <select value={newSeries.form_id || ''} onChange={e => setNewSeries(p => ({ ...p, form_id: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none">
                    <option value="">Select form…</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Subject *</label>
                  <select value={newSeries.subject_id || ''} onChange={e => setNewSeries(p => ({ ...p, subject_id: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none">
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
              </div>
              {[
                { label: 'Mean Score (out of 100)', key: 'mean_score', ph: '62.5' },
                { label: 'Pass Count', key: 'pass_count', ph: '32' },
                { label: 'Total Students', key: 'total_students', ph: '45' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{f.label}</label>
                  <input type="number" value={(newSeries as any)[f.key] || ''}
                    onChange={e => setNewSeries(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none" placeholder={f.ph} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Exam Date</label>
                <input type="date" value={newSeries.exam_date || ''}
                  onChange={e => setNewSeries(p => ({ ...p, exam_date: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 outline-none" />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={saveSeries} disabled={saving}
                className="flex-1 py-3 font-black text-white rounded-2xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
                {saving ? 'Saving…' : 'Save Results'}
              </button>
              <button onClick={() => setShowSeriesModal(false)} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
