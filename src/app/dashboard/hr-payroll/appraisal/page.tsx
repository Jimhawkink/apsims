'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiRefreshCw, FiDownload, FiStar, FiAward, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';

const APPRAISAL_PERIODS = ['Term 1 2024', 'Term 2 2024', 'Term 3 2024', 'Term 1 2025', 'Term 2 2025', 'Term 3 2025', 'Term 1 2026', 'Term 2 2026', 'Term 3 2026'];
const RATINGS = [1, 2, 3, 4, 5];
const RATING_LABEL: Record<number, string> = { 1: 'Unsatisfactory', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const RATING_COLOR: Record<number, string> = { 1: '#dc2626', 2: '#ea580c', 3: '#d97706', 4: '#2563eb', 5: '#16a34a' };

const CRITERIA = [
  { key: 'punctuality', label: '⏰ Punctuality & Attendance' },
  { key: 'teaching_quality', label: '📖 Teaching Quality' },
  { key: 'syllabus_coverage', label: '📋 Syllabus Coverage' },
  { key: 'student_results', label: '📊 Student Results' },
  { key: 'discipline', label: '🛡️ Class Discipline' },
  { key: 'co_curricular', label: '🏆 Co-curricular Participation' },
  { key: 'professional_dev', label: '📈 Professional Development' },
  { key: 'teamwork', label: '🤝 Teamwork & Collaboration' },
];

const avg = (scores: Record<string, number>) => {
  const vals = Object.values(scores).filter(v => v > 0);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
};

export default function StaffAppraisalPage() {
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [activeTab, setActiveTab] = useState<'appraisals' | 'analytics' | 'p1p2'>('appraisals');

  const emptyScores: Record<string, number> = Object.fromEntries(CRITERIA.map(c => [c.key, 0]));
  const emptyForm = { staff_id: '', period: APPRAISAL_PERIODS[APPRAISAL_PERIODS.length - 1], scores: emptyScores, overall_rating: 0, appraiser: '', strengths: '', areas_of_improvement: '', recommendations: '', status: 'Draft', appraisal_type: 'TSC P1' };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [aR, sR] = await Promise.all([
      supabase.from('school_staff_appraisals').select('*, school_teachers(first_name,last_name,tsc_number,role,department)').order('created_at', { ascending: false }),
      supabase.from('school_teachers').select('id,first_name,last_name,tsc_number,role,department').order('first_name'),
    ]);
    setAppraisals(aR.data || []); setStaff(sR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const computeOverall = (scores: Record<string, number>) => {
    const v = Object.values(scores).filter(x => x > 0);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };

  const save = async () => {
    if (!form.staff_id || !form.period) { toast.error('Select staff and period'); return; }
    setSaving(true);
    const overall = computeOverall(form.scores);
    const payload = { ...form, staff_id: Number(form.staff_id), overall_rating: overall, scores: form.scores };
    const { error } = editId
      ? await supabase.from('school_staff_appraisals').update(payload).eq('id', editId)
      : await supabase.from('school_staff_appraisals').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Appraisal updated' : '✅ Appraisal saved');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this appraisal?')) return;
    await supabase.from('school_staff_appraisals').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const printP1P2 = (appraisal: any) => {
    const st = appraisal.school_teachers;
    const overall = appraisal.overall_rating || 0;
    const html = `
    <html><head><title>TSC Appraisal — ${st?.first_name} ${st?.last_name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#111}
    h1{text-align:center;font-size:16px;border-bottom:2px solid #111;padding-bottom:10px}
    table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ddd;padding:6px 10px;font-size:12px}
    th{background:#f5f5f5;font-weight:bold}.score{text-align:center;font-weight:bold;font-size:14px}
    .section{margin:16px 0;padding:10px;border:1px solid #e5e7eb;border-radius:4px}
    .overall{text-align:center;font-size:24px;font-weight:900;color:${RATING_COLOR[overall]}}
    @media print{body{margin:10px}}</style></head>
    <body>
    <h1>TEACHERS SERVICE COMMISSION — STAFF APPRAISAL FORM (${appraisal.appraisal_type || 'P1'})</h1>
    <table><tr><td><b>Name:</b> ${st?.first_name} ${st?.last_name}</td><td><b>TSC No:</b> ${st?.tsc_number || '—'}</td></tr>
    <tr><td><b>Role:</b> ${st?.role || '—'}</td><td><b>Period:</b> ${appraisal.period}</td></tr>
    <tr><td><b>Appraiser:</b> ${appraisal.appraiser || '—'}</td><td><b>Date:</b> ${new Date().toLocaleDateString('en-KE')}</td></tr></table>
    <table><thead><tr><th>Criterion</th><th>Rating (1-5)</th><th>Description</th></tr></thead><tbody>
    ${CRITERIA.map(c => `<tr><td>${c.label}</td><td class="score">${appraisal.scores?.[c.key] || '—'}</td><td>${RATING_LABEL[appraisal.scores?.[c.key]] || '—'}</td></tr>`).join('')}
    </tbody></table>
    <div class="section"><div class="overall">${overall}/5 — ${RATING_LABEL[overall] || '—'}</div></div>
    <div class="section"><b>Strengths:</b><p>${appraisal.strengths || '—'}</p></div>
    <div class="section"><b>Areas for Improvement:</b><p>${appraisal.areas_of_improvement || '—'}</p></div>
    <div class="section"><b>Recommendations:</b><p>${appraisal.recommendations || '—'}</p></div>
    <table style="margin-top:30px"><tr><td style="width:50%;padding-top:40px;border-top:1px solid #111">Appraiser Signature</td><td style="padding-top:40px;border-top:1px solid #111">Staff Signature</td></tr></table>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
  };

  const filtered = appraisals.filter(a =>
    (filterPeriod === 'All' || a.period === filterPeriod) &&
    (search === '' || `${a.school_teachers?.first_name} ${a.school_teachers?.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  const excellent = appraisals.filter(a => a.overall_rating >= 4).length;
  const needsSupport = appraisals.filter(a => a.overall_rating <= 2 && a.overall_rating > 0).length;
  const avgScore = appraisals.length ? (appraisals.reduce((s, a) => s + (a.overall_rating || 0), 0) / appraisals.filter(a => a.overall_rating > 0).length || 0).toFixed(1) : '—';

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#4c1d95,#5b21b6,#7c3aed)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">📋</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Staff Appraisal & Performance</h1>
              <p className="text-purple-200 text-sm">TSC P1/P2 Forms · {appraisals.length} appraisals · School avg: {avgScore}/5</p>
            </div>
          </div>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-purple-800 font-black text-sm hover:bg-purple-50 transition shadow"><FiPlus size={14} /> New Appraisal</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pb-6">
          {[
            { icon: '⭐', label: 'Excellent (4-5)', val: excellent },
            { icon: '⚠️', label: 'Need Support (1-2)', val: needsSupport },
            { icon: '📊', label: 'School Avg Score', val: `${avgScore}/5` },
            { icon: '📋', label: 'Total Appraisals', val: appraisals.length },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.val}</div>
              <div className="text-[9px] text-purple-200 font-bold uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([['appraisals','📋 Appraisals'],['analytics','📈 Analytics'],['p1p2','🖨️ TSC Forms']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)} className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab===v?'bg-purple-700 text-white border-purple-700':'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2">
          <FiSearch className="text-gray-400" size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…" className="flex-1 text-sm outline-none" />
        </div>
        <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white">
          <option value="All">All Periods</option>
          {APPRAISAL_PERIODS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
      ) : activeTab === 'appraisals' || activeTab === 'p1p2' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">Appraisal Records ({filtered.length})</h3></div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center"><div className="text-5xl mb-3">📋</div><p className="font-black text-gray-600">No appraisals yet. Click "New Appraisal" to start.</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(a => {
                const st = a.school_teachers;
                const r = a.overall_rating || 0;
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-purple-50/20 transition group">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 flex-shrink-0 text-sm">{st?.first_name?.[0]}{st?.last_name?.[0]}</div>
                    <div className="flex-1">
                      <p className="font-black text-gray-800 text-sm">{st?.first_name} {st?.last_name}</p>
                      <p className="text-xs text-gray-400">{st?.tsc_number || st?.role} · {a.period} · {a.appraisal_type}</p>
                    </div>
                    <div className="text-center">
                      {CRITERIA.map(c => a.scores?.[c.key] > 0 ? null : null)}
                      <div className="text-2xl font-black" style={{ color: r > 0 ? RATING_COLOR[r] : '#9ca3af' }}>{r > 0 ? r : '—'}/5</div>
                      <div className="text-[9px] font-bold" style={{ color: r > 0 ? RATING_COLOR[r] : '#9ca3af' }}>{r > 0 ? RATING_LABEL[r] : 'Not Rated'}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => printP1P2(a)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200">🖨️ Print TSC</button>
                      <button onClick={() => { setForm({ staff_id: String(a.staff_id), period: a.period, scores: a.scores || emptyScores, overall_rating: a.overall_rating || 0, appraiser: a.appraiser || '', strengths: a.strengths || '', areas_of_improvement: a.areas_of_improvement || '', recommendations: a.recommendations || '', status: a.status || 'Draft', appraisal_type: a.appraisal_type || 'TSC P1' }); setEditId(a.id); setShowModal(true); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100"><FiEdit2 size={12} /></button>
                      <button onClick={() => del(a.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><FiTrash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📊 Score Distribution</h3>
            {RATINGS.map(r => {
              const count = appraisals.filter(a => a.overall_rating === r).length;
              const pct = appraisals.length ? Math.round(count / appraisals.length * 100) : 0;
              return (
                <div key={r} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: RATING_COLOR[r] }}>{r} — {RATING_LABEL[r]}</span>
                    <span className="text-xs text-gray-500">{count} staff ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: RATING_COLOR[r] }} /></div>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">🏆 Top Performers</h3>
            {[...appraisals].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0)).slice(0, 8).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-base w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                <div className="flex-1"><p className="text-sm font-bold text-gray-800">{a.school_teachers?.first_name} {a.school_teachers?.last_name}</p><p className="text-[10px] text-gray-400">{a.period}</p></div>
                <span className="font-black text-sm" style={{ color: RATING_COLOR[a.overall_rating] || '#9ca3af' }}>{a.overall_rating}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_staff_appraisals (
  id                    serial PRIMARY KEY,
  staff_id              int REFERENCES school_teachers(id) ON DELETE CASCADE,
  period                text NOT NULL,
  appraisal_type        text DEFAULT 'TSC P1',
  scores                jsonb DEFAULT '{}',
  overall_rating        int DEFAULT 0,
  appraiser             text,
  strengths             text,
  areas_of_improvement  text,
  recommendations       text,
  status                text DEFAULT 'Draft',
  created_at            timestamptz DEFAULT now()
);
ALTER TABLE school_staff_appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_appraisals" ON school_staff_appraisals FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
              <h2 className="font-black text-gray-800">📋 {editId ? 'Edit' : 'New'} Appraisal</h2>
              <button onClick={() => setShowModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Staff *</label>
                  <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">Select…</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Period *</label>
                  <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    {APPRAISAL_PERIODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Form Type</label>
                  <select value={form.appraisal_type} onChange={e => setForm(f => ({ ...f, appraisal_type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                    {['TSC P1', 'TSC P2', 'School Internal', 'Peer Review'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Appraiser Name</label>
                  <input value={form.appraiser} onChange={e => setForm(f => ({ ...f, appraiser: e.target.value }))} placeholder="Principal / HOD" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-2">Performance Scores (1=Unsatisfactory → 5=Excellent)</label>
                <div className="space-y-2">
                  {CRITERIA.map(c => (
                    <div key={c.key} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xs text-gray-700 flex-1">{c.label}</span>
                      <div className="flex gap-1">
                        {RATINGS.map(r => (
                          <button key={r} onClick={() => setForm(f => ({ ...f, scores: { ...f.scores, [c.key]: r } }))}
                            className="w-7 h-7 rounded-lg text-xs font-black border-2 transition"
                            style={{ borderColor: form.scores[c.key] === r ? RATING_COLOR[r] : '#e5e7eb', background: form.scores[c.key] === r ? RATING_COLOR[r] : '#fff', color: form.scores[c.key] === r ? '#fff' : '#6b7280' }}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <span className="text-2xl font-black text-purple-700">{computeOverall(form.scores)}/5</span>
                  <span className="text-sm text-purple-600 ml-2">{RATING_LABEL[computeOverall(form.scores)] || ''}</span>
                </div>
              </div>
              {[['strengths','💪 Strengths'],['areas_of_improvement','📈 Areas for Improvement'],['recommendations','💡 Recommendations']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">{l}</label>
                  <textarea value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)' }}>{saving ? '…' : editId ? '✅ Update' : '📋 Save Appraisal'}</button>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
