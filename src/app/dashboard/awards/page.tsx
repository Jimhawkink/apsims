'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiX, FiCheck, FiRefreshCw, FiAward, FiDownload, FiSearch, FiTrash2, FiEdit2, FiPrinter } from 'react-icons/fi';

const AWARD_TYPES = [
  { name: 'Academic Excellence', emoji: '🏆', color: '#d97706', bg: '#fef3c7', desc: 'Top performer in academics' },
  { name: 'Subject Best', emoji: '📚', color: '#6366f1', bg: '#eef2ff', desc: 'Best in a specific subject' },
  { name: 'Sports Champion', emoji: '⚽', color: '#16a34a', bg: '#f0fdf4', desc: 'Sports achievement' },
  { name: 'Best Conduct', emoji: '🌟', color: '#0891b2', bg: '#e0f2fe', desc: 'Exemplary behavior' },
  { name: '100% Attendance', emoji: '✅', color: '#059669', bg: '#ecfdf5', desc: 'Perfect attendance' },
  { name: 'Leadership Award', emoji: '👑', color: '#7c3aed', bg: '#f5f3ff', desc: 'Outstanding leadership' },
  { name: 'Arts & Culture', emoji: '🎨', color: '#ec4899', bg: '#fdf2f8', desc: 'Cultural achievement' },
  { name: 'Community Service', emoji: '🤝', color: '#b45309', bg: '#fef3c7', desc: 'Service to community' },
  { name: 'Principal Award', emoji: '🎖️', color: '#dc2626', bg: '#fef2f2', desc: 'Special recognition' },
  { name: 'Class Prefect', emoji: '📋', color: '#2563eb', bg: '#eff6ff', desc: 'Leadership role' },
];

export default function AwardsPage() {
  const [awards, setAwards] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [printAward, setPrintAward] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [editId, setEditId] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  const emptyForm = {
    student_id: 0, award_type: 'Academic Excellence', award_name: '',
    description: '', term_id: 0, form_id: 0, award_date: new Date().toISOString().split('T')[0],
    awarded_by: '', subject: '', position: '',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ar, sr, fr, tr] = await Promise.all([
      supabase.from('school_student_awards').select('*, school_students(first_name,last_name,admission_no), school_forms(form_name), school_terms(term_name)').order('award_date', { ascending: false }),
      supabase.from('school_students').select('id,first_name,last_name,form_id,admission_no').eq('status','Active').order('first_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }).limit(6),
    ]);
    setAwards(ar.data || []);
    setStudents(sr.data || []);
    setForms(fr.data || []);
    setTerms(tr.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.student_id) { toast.error('Select a student'); return; }
    if (!form.award_name.trim()) { toast.error('Enter award name'); return; }
    setSaving(true);
    const student = students.find(s => s.id === Number(form.student_id));
    const payload = { ...form, student_id: Number(form.student_id), term_id: Number(form.term_id)||null, form_id: student?.form_id||null, year: currentYear };
    const { error } = editId
      ? await supabase.from('school_student_awards').update(payload).eq('id', editId)
      : await supabase.from('school_student_awards').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Award updated' : '🏆 Award issued!');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this award?')) return;
    await supabase.from('school_student_awards').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const filtered = awards.filter(a =>
    (filterType === 'All' || a.award_type === filterType) &&
    (search === '' || `${a.school_students?.first_name} ${a.school_students?.last_name} ${a.award_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  const statsByType = AWARD_TYPES.map(t => ({ ...t, count: awards.filter(a => a.award_type === t.name).length }));

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* PRINT CERTIFICATE */}
      {printAward && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <h3 className="font-black text-gray-800">Certificate Preview</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition">
                  <FiPrinter size={14} /> Print Certificate
                </button>
                <button onClick={() => setPrintAward(null)} className="p-2 text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
              </div>
            </div>
            {/* Certificate design */}
            <div id="certificate" className="p-8 text-center" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', minHeight: 400 }}>
              <div className="border-4 border-yellow-400 rounded-2xl p-8" style={{ background: 'white' }}>
                <div className="text-5xl mb-3">{AWARD_TYPES.find(a => a.name === printAward.award_type)?.emoji || '🏆'}</div>
                <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">APSIMS School Management System</p>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Certificate of Achievement</h1>
                <div className="w-24 h-1 bg-yellow-400 mx-auto mb-4 rounded" />
                <p className="text-sm text-gray-500 mb-2">This is to certify that</p>
                <h2 className="text-3xl font-extrabold text-indigo-700 mb-2">
                  {printAward.school_students?.first_name} {printAward.school_students?.last_name}
                </h2>
                <p className="text-sm text-gray-500 mb-4">has been awarded the</p>
                <h3 className="text-xl font-black text-yellow-700 mb-2">{printAward.award_name || printAward.award_type}</h3>
                {printAward.description && <p className="text-sm text-gray-600 italic mb-4">"{printAward.description}"</p>}
                <p className="text-xs text-gray-500 mb-6">
                  {printAward.school_terms?.term_name} · {printAward.school_forms?.form_name} · {new Date(printAward.award_date).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}
                </p>
                <div className="flex justify-around mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="w-24 h-0.5 bg-gray-400 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500">{printAward.awarded_by || 'Principal'}</p>
                    <p className="text-[10px] text-gray-400">Principal / Class Teacher</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mx-auto mb-1 text-gray-300 text-xs">SEAL</div>
                    <p className="text-[10px] text-gray-400">School Seal</p>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-0.5 bg-gray-400 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-500">Date: {new Date(printAward.award_date).toLocaleDateString('en-KE')}</p>
                    <p className="text-[10px] text-gray-400">Date Issued</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#78350f,#92400e,#d97706)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">🏆</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Awards & Certificates</h1>
              <p className="text-yellow-200 text-sm">{awards.length} awards issued · {new Set(awards.map(a=>a.student_id)).size} students recognised · {currentYear}</p>
            </div>
          </div>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-yellow-800 font-bold text-sm hover:bg-yellow-50 transition shadow">
            <FiPlus size={14} /> Issue Award
          </button>
        </div>
      </div>

      {/* Award type stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statsByType.slice(0,10).map(t => (
          <button key={t.name} onClick={() => setFilterType(filterType === t.name ? 'All' : t.name)}
            className={`bg-white rounded-xl border shadow-sm p-3 text-center hover:shadow-md transition ${filterType === t.name ? 'ring-2 ring-yellow-400 border-yellow-300' : 'border-gray-100'}`}>
            <div className="text-2xl mb-1">{t.emoji}</div>
            <div className="text-lg font-black" style={{ color: t.color }}>{t.count}</div>
            <div className="text-[9px] text-gray-500 leading-tight">{t.name}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
        <FiSearch className="text-gray-400" size={15} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name or award…"
          className="flex-1 text-sm outline-none text-gray-700 bg-transparent" />
        {filterType !== 'All' && (
          <button onClick={() => setFilterType('All')} className="text-xs text-gray-400 hover:text-red-500 font-bold">Clear filter ×</button>
        )}
      </div>

      {/* Awards list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-yellow-200 border-t-yellow-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl mb-3">🏅</div>
            <p className="font-black text-gray-600 mb-1">No awards yet</p>
            <p className="text-sm text-gray-400 mb-4">Issue the first award to recognise a student's achievement!</p>
            <button onClick={() => setShowModal(true)} className="px-6 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
              Issue First Award
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(a => {
              const typeCfg = AWARD_TYPES.find(t => t.name === a.award_type) || AWARD_TYPES[0];
              return (
                <div key={a.id} className="px-5 py-4 flex items-center gap-4 hover:bg-amber-50/30 transition group">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: typeCfg.bg }}>{typeCfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-gray-800 text-sm">{a.award_name || a.award_type}</p>
                        <p className="text-sm font-semibold text-indigo-600 mt-0.5">
                          {a.school_students?.first_name} {a.school_students?.last_name}
                          {a.school_students?.admission_no && <span className="text-gray-400 text-xs ml-1">({a.school_students.admission_no})</span>}
                        </p>
                        {a.description && <p className="text-xs text-gray-500 italic mt-0.5">"{a.description}"</p>}
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: typeCfg.bg, color: typeCfg.color }}>{a.award_type}</span>
                          {a.school_forms?.form_name && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{a.school_forms.form_name}</span>}
                          {a.school_terms?.term_name && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{a.school_terms.term_name}</span>}
                          {a.position && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Position: {a.position}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-gray-500">{new Date(a.award_date).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'2-digit' })}</p>
                        {a.awarded_by && <p className="text-[10px] text-gray-400 mt-0.5">By {a.awarded_by}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button onClick={() => setPrintAward(a)} title="Print certificate"
                      className="p-2 rounded-xl bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition"><FiPrinter size={13} /></button>
                    <button onClick={() => { setForm({ student_id: a.student_id, award_type: a.award_type, award_name: a.award_name||'', description: a.description||'', term_id: a.term_id||0, form_id: a.form_id||0, award_date: a.award_date, awarded_by: a.awarded_by||'', subject: a.subject||'', position: a.position||'' }); setEditId(a.id); setShowModal(true); }}
                      className="p-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition"><FiEdit2 size={13} /></button>
                    <button onClick={() => del(a.id)} className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition"><FiTrash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SQL Setup */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_student_awards (
  id serial PRIMARY KEY,
  student_id int REFERENCES school_students(id) ON DELETE CASCADE,
  form_id int REFERENCES school_forms(id),
  term_id int REFERENCES school_terms(id),
  award_type text NOT NULL,
  award_name text,
  description text,
  subject text,
  position text,
  awarded_by text,
  award_date date DEFAULT CURRENT_DATE,
  year int DEFAULT EXTRACT(YEAR FROM now()),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_student_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_awards" ON school_student_awards FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_awards_student ON school_student_awards(student_id);`}</code>
      </details>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
              <h2 className="font-black text-gray-800">🏆 {editId ? 'Edit Award' : 'Issue New Award'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Student *</label>
                <select value={form.student_id} onChange={e => setForm(f=>({...f,student_id:Number(e.target.value)}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-300">
                  <option value={0}>Select student…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Award Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {AWARD_TYPES.map(t => (
                    <button key={t.name} onClick={() => setForm(f=>({...f,award_type:t.name}))}
                      className={`p-2 rounded-xl border text-center text-xs transition ${form.award_type===t.name?'border-yellow-400 shadow-md':'border-gray-200 hover:border-yellow-200'}`}
                      style={form.award_type===t.name?{background:t.bg}:{}}>
                      <div className="text-xl mb-0.5">{t.emoji}</div>
                      <div className="text-[9px] font-bold leading-tight" style={{color:form.award_type===t.name?t.color:'#6b7280'}}>{t.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label:'Award Name *', key:'award_name', placeholder:'e.g. Best Student in Mathematics, Top of Form 2…' },
                { label:'Position / Rank (optional)', key:'position', placeholder:'1st, 2nd, Best in Kenya…' },
                { label:'Subject (optional)', key:'subject', placeholder:'Mathematics, Science…' },
                { label:'Awarded By', key:'awarded_by', placeholder:'Principal, Class Teacher, HOD…' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(prev=>({...prev,[f.key]:e.target.value}))}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              ))}
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Brief description of achievement…" rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-300 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Term</label>
                  <select value={form.term_id} onChange={e => setForm(f=>({...f,term_id:Number(e.target.value)}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-300">
                    <option value={0}>All terms</option>
                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Award Date</label>
                  <input type="date" value={form.award_date} onChange={e => setForm(f=>({...f,award_date:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiAward size={14} />}
                {editId ? 'Update Award' : 'Issue Award & Generate Certificate'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
