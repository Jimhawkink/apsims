'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDownload, FiUser, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const STAGES = ['Application Received', 'Shortlisted', 'Interview Scheduled', 'Interviewed', 'Background Check', 'Offer Extended', 'Offer Accepted', 'Onboarding', 'Employed', 'Rejected', 'Withdrawn'];
const POSITIONS = ['Teacher', 'HOD', 'Deputy Principal', 'Principal', 'Librarian', 'Store Keeper', 'Secretary', 'Accountant', 'Lab Technician', 'Games Teacher', 'Counsellor', 'Driver', 'Cook', 'Security'];
const STAGE_COLOR: Record<string, string> = {
  'Application Received': '#6366f1', 'Shortlisted': '#0891b2', 'Interview Scheduled': '#d97706', 'Interviewed': '#7c3aed',
  'Background Check': '#db2777', 'Offer Extended': '#16a34a', 'Offer Accepted': '#059669',
  'Onboarding': '#2563eb', 'Employed': '#15803d', 'Rejected': '#dc2626', 'Withdrawn': '#6b7280',
};

const ONBOARDING_CHECKLIST = [
  'Contract signed', 'ID/KRA PIN/NSSF submitted', 'TSC Certificate verified', 'Photo taken for ID card',
  'Bank account details captured', 'NHIF registered', 'Email account created', 'Keys/Access issued',
  'Induction completed', 'Mentor assigned', 'First payroll added',
];

export default function RecruitmentPage() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<any | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'onboarding' | 'analytics'>('pipeline');

  const emptyForm = { full_name: '', position: 'Teacher', application_date: new Date().toISOString().split('T')[0], stage: 'Application Received', email: '', phone: '', qualification: '', experience_years: 0, tsc_number: '', interview_date: '', interview_score: 0, notes: '', referred_by: '', salary_offered: 0 };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_recruitment').select('*').order('application_date', { ascending: false });
    setApplicants(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.full_name || !form.position) { toast.error('Name and position required'); return; }
    setSaving(true);
    const { error } = editId
      ? await supabase.from('school_recruitment').update(form).eq('id', editId)
      : await supabase.from('school_recruitment').insert([form]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Updated' : '✅ Applicant added');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const updateStage = async (id: number, stage: string) => {
    await supabase.from('school_recruitment').update({ stage }).eq('id', id);
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, stage } : a));
    toast.success(`Stage updated: ${stage}`);
  };

  const saveChecklist = async (id: number, checklist: Record<string, boolean>) => {
    await supabase.from('school_recruitment').update({ onboarding_checklist: checklist }).eq('id', id);
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, onboarding_checklist: checklist } : a));
    toast.success('Checklist saved');
  };

  const del = async (id: number) => {
    if (!confirm('Delete this record?')) return;
    await supabase.from('school_recruitment').delete().eq('id', id);
    fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Name', 'Position', 'Stage', 'Phone', 'Email', 'TSC', 'Applied', 'Interview Score']];
    applicants.forEach(a => rows.push([a.full_name, a.position, a.stage, a.phone || '', a.email || '', a.tsc_number || '', a.application_date, String(a.interview_score || '')]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const el = document.createElement('a'); el.href = URL.createObjectURL(blob); el.download = 'recruitment.csv'; el.click();
  };

  const filtered = applicants.filter(a =>
    (filterStage === 'All' || a.stage === filterStage) &&
    (search === '' || `${a.full_name} ${a.position}`.toLowerCase().includes(search.toLowerCase()))
  );
  const onboarding = applicants.filter(a => ['Offer Accepted', 'Onboarding', 'Employed'].includes(a.stage));
  const pipeline = Object.fromEntries(STAGES.map(s => [s, applicants.filter(a => a.stage === s).length]));

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1,#0284c7)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">👔</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Recruitment & Onboarding</h1>
              <p className="text-sky-200 text-sm">{applicants.length} applicants · {onboarding.length} onboarding · {pipeline['Employed'] || 0} employed this cycle</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold"><FiDownload size={14} /> Export</button>
            <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-sky-800 font-black text-sm hover:bg-sky-50 shadow"><FiPlus size={14} /> Add Applicant</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 pb-6">
          {[['📨','Received',pipeline['Application Received']||0],['🎯','Shortlisted',pipeline['Shortlisted']||0],['🤝','Interviewed',(pipeline['Interviewed']||0)],['✅','Offer Given',(pipeline['Offer Extended']||0)+(pipeline['Offer Accepted']||0)],['🏢','Onboarding',onboarding.length]].map(([i,l,v]) => (
            <div key={l as string} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl">{i}</div><div className="text-xl font-black text-white">{v}</div>
              <div className="text-[9px] text-sky-200 font-bold uppercase">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([['pipeline','📋 Pipeline'],['onboarding','✅ Onboarding'],['analytics','📊 Analytics']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)} className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab===v?'bg-sky-700 text-white border-sky-700':'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2"><FiSearch className="text-gray-400" size={14} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants…" className="flex-1 text-sm outline-none" /></div>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white">
          <option value="All">All Stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" /></div>
      : activeTab === 'pipeline' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">Recruitment Pipeline ({filtered.length})</h3></div>
          {filtered.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">👔</div><p className="font-black text-gray-600">No applicants yet</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">{['Name','Position','Stage','Phone','Applied','Interview','Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-sky-50/20 transition group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center font-black text-sky-700 text-xs">{a.full_name?.charAt(0)}</div>
                          <div><p className="font-black text-gray-800 text-xs">{a.full_name}</p><p className="text-[9px] text-gray-400">{a.email || a.tsc_number || '—'}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700">{a.position}</td>
                      <td className="px-4 py-3">
                        <select value={a.stage} onChange={e => updateStage(a.id, e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none font-bold" style={{ background: `${STAGE_COLOR[a.stage]}15`, color: STAGE_COLOR[a.stage] }}>
                          {STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{a.phone || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.application_date}</td>
                      <td className="px-4 py-3 text-center"><span className="font-black text-sm text-sky-700">{a.interview_score > 0 ? `${a.interview_score}%` : '—'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          {['Offer Accepted','Onboarding'].includes(a.stage) && <button onClick={() => setShowOnboarding(a)} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-green-100 text-green-700">✅ Onboard</button>}
                          <button onClick={() => { setForm({ full_name: a.full_name, position: a.position, application_date: a.application_date, stage: a.stage, email: a.email||'', phone: a.phone||'', qualification: a.qualification||'', experience_years: a.experience_years||0, tsc_number: a.tsc_number||'', interview_date: a.interview_date||'', interview_score: a.interview_score||0, notes: a.notes||'', referred_by: a.referred_by||'', salary_offered: a.salary_offered||0 }); setEditId(a.id); setShowModal(true); }} className="p-1.5 rounded-lg bg-blue-50 text-blue-500"><FiEdit2 size={11} /></button>
                          <button onClick={() => del(a.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400"><FiTrash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'onboarding' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">✅ Staff Onboarding Tracker</h3>
            {onboarding.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No staff currently in onboarding</p>
            : onboarding.map(a => {
              const checklist: Record<string, boolean> = a.onboarding_checklist || {};
              const done = ONBOARDING_CHECKLIST.filter(i => checklist[i]).length;
              const pct = Math.round(done / ONBOARDING_CHECKLIST.length * 100);
              return (
                <div key={a.id} className="border border-gray-100 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center font-black text-sky-700">{a.full_name?.charAt(0)}</div>
                      <div><p className="font-black text-gray-800">{a.full_name}</p><p className="text-xs text-gray-400">{a.position} · {a.stage}</p></div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-sky-700">{pct}%</div>
                      <p className="text-[10px] text-gray-400">{done}/{ONBOARDING_CHECKLIST.length} done</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full mb-3"><div className="h-2 bg-sky-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ONBOARDING_CHECKLIST.map(item => (
                      <label key={item} className={`flex items-center gap-2 text-xs cursor-pointer rounded-lg p-2 border transition ${checklist[item] ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <input type="checkbox" checked={!!checklist[item]} onChange={e => { const nc = { ...checklist, [item]: e.target.checked }; saveChecklist(a.id, nc); }} className="w-3.5 h-3.5 accent-green-600" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📊 Pipeline by Stage</h3>
            {STAGES.map(s => { const c = pipeline[s] || 0; if (!c) return null; return (<div key={s} className="mb-2"><div className="flex justify-between mb-1"><span className="text-xs font-bold" style={{ color: STAGE_COLOR[s] }}>{s}</span><span className="text-xs text-gray-500">{c}</span></div><div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 rounded-full" style={{ width: `${Math.round(c/Math.max(applicants.length,1)*100)}%`, background: STAGE_COLOR[s] }} /></div></div>); })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">🎯 Positions in Demand</h3>
            {POSITIONS.map(p => { const c = applicants.filter(a => a.position === p).length; if (!c) return null; return (<div key={p} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-sm text-gray-700">{p}</span><span className="font-black text-sky-700 text-sm">{c}</span></div>); })}
          </div>
        </div>
      )}

      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_recruitment (
  id                    serial PRIMARY KEY,
  full_name             text NOT NULL,
  position              text NOT NULL,
  application_date      date DEFAULT CURRENT_DATE,
  stage                 text DEFAULT 'Application Received',
  email                 text,
  phone                 text,
  qualification         text,
  experience_years      int DEFAULT 0,
  tsc_number            text,
  interview_date        date,
  interview_score       numeric DEFAULT 0,
  salary_offered        numeric DEFAULT 0,
  referred_by           text,
  notes                 text,
  onboarding_checklist  jsonb DEFAULT '{}',
  created_at            timestamptz DEFAULT now()
);
ALTER TABLE school_recruitment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_recruitment" ON school_recruitment FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)' }}>
              <h2 className="font-black text-gray-800">👔 {editId ? 'Edit' : 'Add'} Applicant</h2>
              <button onClick={() => setShowModal(false)}><FiX size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
              {[['full_name','Full Name *','text'],['email','Email','email'],['phone','Phone','tel'],['tsc_number','TSC Number','text'],['qualification','Qualification','text']].map(([k,l,t]) => (
                <div key={k}><label className="text-xs font-black text-gray-600 block mb-1">{l}</label><input type={t} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Position</label><select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{POSITIONS.map(p => <option key={p}>{p}</option>)}</select></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Experience (yrs)</label><input type="number" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Stage</label><select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Interview Score (%)</label><input type="number" min="0" max="100" value={form.interview_score} onChange={e => setForm(f => ({ ...f, interview_score: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              </div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Interview Date</label><input type="date" value={form.interview_date} onChange={e => setForm(f => ({ ...f, interview_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Salary Offered (KES)</label><input type="number" value={form.salary_offered} onChange={e => setForm(f => ({ ...f, salary_offered: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" /></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#0c4a6e,#0284c7)' }}>{saving ? '…' : editId ? '✅ Update' : '👔 Add Applicant'}</button>
              <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
