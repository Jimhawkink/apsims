'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDownload, FiShield, FiAlertTriangle } from 'react-icons/fi';

const OFFENCE_TYPES = ['Absenteeism', 'Insubordination', 'Misconduct', 'Negligence of Duty', 'Lateness/Tardiness', 'Harassment', 'Fraud/Theft', 'Drug/Alcohol Abuse', 'Violence', 'Breach of Ethics', 'Unprofessional Conduct', 'Other'];
const ACTIONS = ['Verbal Warning', 'Written Warning', 'Final Written Warning', 'Suspension', 'Demotion', 'Termination', 'Referred to TSC', 'Case Closed', 'Pending Investigation'];
const ACTION_COLOR: Record<string, string> = { 'Verbal Warning': '#d97706', 'Written Warning': '#ea580c', 'Final Written Warning': '#dc2626', 'Suspension': '#7c3aed', 'Demotion': '#db2777', 'Termination': '#991b1b', 'Referred to TSC': '#0891b2', 'Case Closed': '#16a34a', 'Pending Investigation': '#6b7280' };

export default function DisciplinePage() {
  const [cases, setCases] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('All');
  const [activeTab, setActiveTab] = useState<'cases' | 'analytics'>('cases');

  const emptyForm = { staff_id: '', incident_date: new Date().toISOString().split('T')[0], offence_type: 'Absenteeism', description: '', witnesses: '', action_taken: 'Pending Investigation', action_date: '', hearing_date: '', outcome: '', appeal_filed: false, tsc_notified: false, remarks: '' };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cR, sR] = await Promise.all([
      supabase.from('school_discipline_cases').select('*, school_teachers(first_name,last_name,tsc_number,role,department)').order('incident_date', { ascending: false }),
      supabase.from('school_teachers').select('id,first_name,last_name,tsc_number,role').order('first_name'),
    ]);
    setCases(cR.data || []); setStaff(sR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.staff_id || !form.incident_date) { toast.error('Select staff and date'); return; }
    setSaving(true);
    const payload = { ...form, staff_id: Number(form.staff_id) };
    const { error } = editId
      ? await supabase.from('school_discipline_cases').update(payload).eq('id', editId)
      : await supabase.from('school_discipline_cases').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Case updated' : '✅ Case recorded');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this case? This is permanent.')) return;
    await supabase.from('school_discipline_cases').delete().eq('id', id);
    toast.success('Case deleted'); fetchAll();
  };

  const printCase = (c: any) => {
    const st = c.school_teachers;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Disciplinary Case</title><style>body{font-family:Arial;max-width:680px;margin:40px auto;padding:20px;color:#111}h1{text-align:center;font-size:15px;border-bottom:2px solid #000;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:10px 0}td{border:1px solid #ccc;padding:7px 10px;font-size:12px}.label{background:#f5f5f5;font-weight:bold;width:35%}.section{margin:14px 0;padding:10px;border:1px solid #e5e7eb}.sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}.sig-box{text-align:center;border-top:1px solid #000;padding-top:8px;font-size:11px}@media print{body{margin:5px}}</style></head><body>
    <h1>STAFF DISCIPLINARY CASE RECORD</h1>
    <table><tr><td class="label">School:</td><td>AlphaSchool</td><td class="label">Case Date:</td><td>${new Date().toLocaleDateString('en-KE')}</td></tr>
    <tr><td class="label">Staff Name:</td><td>${st?.first_name} ${st?.last_name}</td><td class="label">TSC No:</td><td>${st?.tsc_number || '—'}</td></tr>
    <tr><td class="label">Role:</td><td>${st?.role || '—'}</td><td class="label">Incident Date:</td><td>${c.incident_date}</td></tr>
    <tr><td class="label">Offence Type:</td><td colspan="3">${c.offence_type}</td></tr>
    <tr><td class="label">Hearing Date:</td><td>${c.hearing_date || '—'}</td><td class="label">TSC Notified:</td><td>${c.tsc_notified ? 'Yes' : 'No'}</td></tr></table>
    <div class="section"><b>Description of Offence:</b><p>${c.description || '—'}</p></div>
    <div class="section"><b>Action Taken:</b> ${c.action_taken}<p>${c.outcome || '—'}</p></div>
    <div class="section"><b>Witnesses:</b><p>${c.witnesses || '—'}</p></div>
    <div class="section"><b>Remarks:</b><p>${c.remarks || '—'}</p></div>
    <div class="sig"><div class="sig-box">HR Manager</div><div class="sig-box">Staff Member</div><div class="sig-box">Principal</div></div>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  const filtered = cases.filter(c =>
    (filterAction === 'All' || c.action_taken === filterAction) &&
    (search === '' || `${c.school_teachers?.first_name} ${c.school_teachers?.last_name} ${c.offence_type}`.toLowerCase().includes(search.toLowerCase()))
  );

  const pending = cases.filter(c => ['Pending Investigation', 'Verbal Warning'].includes(c.action_taken));
  const serious = cases.filter(c => ['Termination', 'Final Written Warning', 'Referred to TSC'].includes(c.action_taken));
  const offenceCounts = Object.fromEntries(OFFENCE_TYPES.map(o => [o, cases.filter(c => c.offence_type === o).length]));
  const topOffender = Object.entries(cases.reduce((acc: any, c) => { const n = `${c.school_teachers?.first_name} ${c.school_teachers?.last_name}`; acc[n] = (acc[n] || 0) + 1; return acc; }, {})).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b,#dc2626)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">⚖️</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Staff Disciplinary Cases</h1>
              <p className="text-red-200 text-sm">{cases.length} cases · {pending.length} pending · {serious.length} serious cases</p>
            </div>
          </div>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-red-800 font-black text-sm hover:bg-red-50 shadow"><FiPlus size={14} /> Log Case</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pb-6">
          {[['⏳','Pending',pending.length],['🔴','Serious Cases',serious.length],['📋','Total Cases',cases.length],['🔕','Closed',cases.filter(c=>c.action_taken==='Case Closed').length]].map(([i,l,v]) => (
            <div key={l as string} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl">{i}</div><div className="text-xl font-black text-white">{v}</div>
              <div className="text-[9px] text-red-200 font-bold uppercase">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([['cases','⚖️ Cases'],['analytics','📊 Analytics']] as const).map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)} className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab===v?'bg-red-700 text-white border-red-700':'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2"><FiSearch className="text-gray-400" size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff or offence…" className="flex-1 text-sm outline-none"/></div>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white">
          <option value="All">All Actions</option>{ACTIONS.map(a=><option key={a}>{a}</option>)}
        </select>
      </div>

      {loading ? <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"/></div>
      : activeTab === 'cases' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">Disciplinary Cases ({filtered.length})</h3></div>
          {filtered.length === 0 ? <div className="py-16 text-center"><div className="text-5xl mb-3">⚖️</div><p className="font-black text-gray-600">No cases recorded</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">{['Staff','Offence','Date','Action','TSC','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => {
                    const st = c.school_teachers;
                    const color = ACTION_COLOR[c.action_taken] || '#6b7280';
                    return (
                      <tr key={c.id} className="hover:bg-red-50/10 transition group">
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-black text-xs">{st?.first_name?.[0]}{st?.last_name?.[0]}</div><div><p className="font-black text-xs text-gray-800">{st?.first_name} {st?.last_name}</p><p className="text-[9px] text-gray-400">{st?.tsc_number||st?.role}</p></div></div></td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-700">{c.offence_type}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{c.incident_date}</td>
                        <td className="px-4 py-3"><span className="text-[10px] font-black px-2 py-1 rounded-full" style={{background:`${color}15`,color}}>{c.action_taken}</span></td>
                        <td className="px-4 py-3 text-center">{c.tsc_notified?<span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">✓ Yes</span>:<span className="text-[10px] text-gray-400">No</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={()=>printCase(c)} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-gray-100 text-gray-700">🖨️</button>
                            <button onClick={()=>{setForm({staff_id:String(c.staff_id),incident_date:c.incident_date,offence_type:c.offence_type,description:c.description||'',witnesses:c.witnesses||'',action_taken:c.action_taken,action_date:c.action_date||'',hearing_date:c.hearing_date||'',outcome:c.outcome||'',appeal_filed:c.appeal_filed||false,tsc_notified:c.tsc_notified||false,remarks:c.remarks||''});setEditId(c.id);setShowModal(true);}} className="p-1.5 rounded-lg bg-blue-50 text-blue-500"><FiEdit2 size={11}/></button>
                            <button onClick={()=>del(c.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400"><FiTrash2 size={11}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">📊 Offences by Type</h3>
            {Object.entries(offenceCounts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
              <div key={k} className="mb-2"><div className="flex justify-between mb-1"><span className="text-xs text-gray-700">{k}</span><span className="text-xs font-black text-red-700">{v}</span></div><div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-red-500 rounded-full" style={{width:`${Math.round(v/Math.max(cases.length,1)*100)}%`}}/></div></div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-gray-800 mb-4">⚠️ Actions Summary</h3>
            {ACTIONS.map(a=>{const c=cases.filter(x=>x.action_taken===a).length;if(!c)return null;const col=ACTION_COLOR[a]||'#6b7280';return(<div key={a} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-xs font-bold" style={{color:col}}>{a}</span><span className="font-black text-sm" style={{color:col}}>{c}</span></div>);})}
          </div>
        </div>
      )}

      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_discipline_cases (
  id             serial PRIMARY KEY,
  staff_id       int REFERENCES school_teachers(id) ON DELETE CASCADE,
  incident_date  date NOT NULL,
  offence_type   text NOT NULL,
  description    text,
  witnesses      text,
  action_taken   text DEFAULT 'Pending Investigation',
  action_date    date,
  hearing_date   date,
  outcome        text,
  appeal_filed   boolean DEFAULT false,
  tsc_notified   boolean DEFAULT false,
  remarks        text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE school_discipline_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_discipline" ON school_discipline_cases FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{background:'linear-gradient(135deg,#fee2e2,#fecaca)'}}>
              <h2 className="font-black text-gray-800">⚖️ {editId?'Edit':'Log'} Disciplinary Case</h2>
              <button onClick={()=>setShowModal(false)}><FiX size={18} className="text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
              <div><label className="text-xs font-black text-gray-600 block mb-1">Staff Member *</label><select value={form.staff_id} onChange={e=>setForm(f=>({...f,staff_id:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"><option value="">Select…</option>{staff.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} {s.tsc_number?`(${s.tsc_number})`:''}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-black text-gray-600 block mb-1">Incident Date *</label><input type="date" value={form.incident_date} onChange={e=>setForm(f=>({...f,incident_date:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"/></div>
                <div><label className="text-xs font-black text-gray-600 block mb-1">Hearing Date</label><input type="date" value={form.hearing_date} onChange={e=>setForm(f=>({...f,hearing_date:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"/></div>
              </div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Offence Type</label><select value={form.offence_type} onChange={e=>setForm(f=>({...f,offence_type:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{OFFENCE_TYPES.map(o=><option key={o}>{o}</option>)}</select></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Action Taken</label><select value={form.action_taken} onChange={e=>setForm(f=>({...f,action_taken:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">{ACTIONS.map(a=><option key={a}>{a}</option>)}</select></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Description</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Witnesses</label><input value={form.witnesses} onChange={e=>setForm(f=>({...f,witnesses:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none"/></div>
              <div><label className="text-xs font-black text-gray-600 block mb-1">Outcome</label><textarea value={form.outcome} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"/></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.tsc_notified} onChange={e=>setForm(f=>({...f,tsc_notified:e.target.checked}))} className="w-4 h-4 accent-red-600"/>TSC Notified</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.appeal_filed} onChange={e=>setForm(f=>({...f,appeal_filed:e.target.checked}))} className="w-4 h-4 accent-red-600"/>Appeal Filed</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#7f1d1d,#dc2626)'}}>{saving?'…':editId?'✅ Update':'⚖️ Record Case'}</button>
              <button onClick={()=>setShowModal(false)} className="px-6 py-3 rounded-xl border text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
