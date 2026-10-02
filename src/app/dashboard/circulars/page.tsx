'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiX, FiCheck, FiRefreshCw, FiSearch, FiEye, FiUsers, FiEdit2, FiTrash2, FiSend } from 'react-icons/fi';

const AUDIENCES = ['All Students & Parents', 'All Teachers', 'All Staff', 'Form 1 Only', 'Form 2 Only', 'Form 3 Only', 'Form 4 Only', 'Grade 7', 'Grade 8', 'Grade 9', 'Boarding Students', 'Day Students', 'Management Only'];
const CATEGORIES = ['General Notice', 'Academic', 'Finance / Fees', 'Examination', 'Health & Safety', 'Sports & Games', 'Discipline', 'Holiday Notice', 'Event', 'Emergency', 'BoG / Management'];

export default function CircularsPage() {
  const [circulars, setCirculars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [editId, setEditId] = useState<number | null>(null);

  const emptyForm = {
    title: '', content: '', category: 'General Notice',
    audience: 'All Students & Parents', priority: 'Normal',
    issue_date: new Date().toISOString().split('T')[0],
    issued_by: 'School Administration', status: 'Draft',
    requires_acknowledgement: false,
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_circulars')
      .select('*').order('issue_date', { ascending: false });
    setCirculars(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.title || !form.content) { toast.error('Title and content required'); return; }
    setSaving(true);
    const { error } = editId
      ? await supabase.from('school_circulars').update(form).eq('id', editId)
      : await supabase.from('school_circulars').insert([{ ...form, views: 0, acknowledgements: 0 }]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Circular updated' : '📣 Circular published!');
    setShowModal(false); setForm(emptyForm); setEditId(null); setSaving(false); fetchAll();
  };

  const publish = async (id: number) => {
    await supabase.from('school_circulars').update({ status: 'Published' }).eq('id', id);
    toast.success('📣 Circular published and sent to all parents!');
    fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this circular?')) return;
    await supabase.from('school_circulars').delete().eq('id', id);
    toast.success('Deleted'); if (selected?.id === id) setSelected(null); fetchAll();
  };

  const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
    Normal: { color: '#6b7280', bg: '#f9fafb' },
    Important: { color: '#d97706', bg: '#fffbeb' },
    Urgent: { color: '#dc2626', bg: '#fef2f2' },
  };

  const CAT_EMOJIS: Record<string, string> = {
    'General Notice': '📢', 'Academic': '📚', 'Finance / Fees': '💰',
    'Examination': '📝', 'Health & Safety': '🏥', 'Sports & Games': '⚽',
    'Discipline': '🚨', 'Holiday Notice': '🎉', 'Event': '📅',
    'Emergency': '🆘', 'BoG / Management': '🏛️',
  };

  const filtered = circulars.filter(c =>
    (filterCat === 'All' || c.category === filterCat) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.content?.toLowerCase().includes(search.toLowerCase()))
  );

  const published = circulars.filter(c => c.status === 'Published').length;
  const drafts = circulars.filter(c => c.status === 'Draft').length;

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8,#3b82f6)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">📰</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Digital Circulars & Notice Board</h1>
              <p className="text-blue-200 text-sm">{published} published · {drafts} drafts · Instant delivery to all parents</p>
            </div>
          </div>
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-800 font-bold text-sm hover:bg-blue-50 transition shadow">
            <FiPlus size={14} /> New Circular
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pb-5">
          {[
            { label: 'Total Circulars', value: circulars.length, icon: '📰' },
            { label: 'Published', value: published, icon: '📣' },
            { label: 'Draft', value: drafts, icon: '✏️' },
            { label: 'Categories', value: new Set(circulars.map(c => c.category)).size, icon: '🗂️' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xl">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-[9px] text-blue-200">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <FiSearch className="text-gray-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search circulars…"
            className="flex-1 text-sm outline-none bg-transparent text-gray-700" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['All', 'General Notice', 'Academic', 'Finance / Fees', 'Examination', 'Holiday Notice'].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${filterCat === c ? 'bg-blue-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50'}`}>
              {c === 'All' ? 'All' : `${CAT_EMOJIS[c] || '📋'} ${c}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main content — list + detail side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-black text-gray-800">All Circulars</h3>
            <p className="text-xs text-gray-500">{filtered.length} shown</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-black text-gray-600">No circulars yet</p>
              <button onClick={() => setShowModal(true)} className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>Issue First Circular</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {filtered.map(c => {
                const pCfg = PRIORITY_CFG[c.priority] || PRIORITY_CFG.Normal;
                const isSelected = selected?.id === c.id;
                return (
                  <div key={c.id} onClick={() => setSelected(c)}
                    className={`px-5 py-4 cursor-pointer transition group ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50/80'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">{CAT_EMOJIS[c.category] || '📋'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-black truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{c.title}</p>
                          <div className="flex gap-1 flex-shrink-0">
                            {c.priority !== 'Normal' && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={pCfg}>{c.priority}</span>
                            )}
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${c.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{c.category}</span>
                          <span className="text-[9px] text-gray-400">👥 {c.audience}</span>
                          <span className="text-[9px] text-gray-400">📅 {new Date(c.issue_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons on hover */}
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition">
                      {c.status === 'Draft' && (
                        <button onClick={e => { e.stopPropagation(); publish(c.id); }}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">📣 Publish</button>
                      )}
                      <button onClick={e => { e.stopPropagation(); setForm({ title: c.title, content: c.content, category: c.category, audience: c.audience, priority: c.priority, issue_date: c.issue_date, issued_by: c.issued_by, status: c.status, requires_acknowledgement: c.requires_acknowledgement }); setEditId(c.id); setShowModal(true); }}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">✏️ Edit</button>
                      <button onClick={e => { e.stopPropagation(); del(c.id); }}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200">🗑️ Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail view */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
              <div className="text-5xl mb-4">👈</div>
              <p className="font-black text-gray-600">Select a circular to preview</p>
              <p className="text-sm text-gray-400 mt-1">Click any circular on the left to read its full content</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="px-6 py-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{CAT_EMOJIS[selected.category] || '📋'}</span>
                    <div>
                      <p className="font-black text-gray-800">{selected.title}</p>
                      <p className="text-[10px] text-gray-500">{selected.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {selected.status === 'Draft' && (
                      <button onClick={() => publish(selected.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition">
                        <FiSend size={11} /> Publish
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${selected.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{selected.status}</span>
                  {selected.priority !== 'Normal' && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={PRIORITY_CFG[selected.priority]}>{selected.priority}</span>
                  )}
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">👥 {selected.audience}</span>
                  <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">📅 {new Date(selected.issue_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="text-[9px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">✍️ {selected.issued_by}</span>
                </div>
              </div>
              {/* Circular content */}
              <div className="flex-1 px-6 py-5 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">{selected.content}</p>
                </div>
              </div>
              {selected.requires_acknowledgement && (
                <div className="px-6 py-4 border-t border-gray-100 bg-amber-50">
                  <p className="text-xs font-bold text-amber-700">📩 This circular requires parent acknowledgement</p>
                </div>
              )}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <button onClick={printStatement} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
                  🖨️ Print
                </button>
                <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition">
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SQL */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_circulars (
  id serial PRIMARY KEY, title text NOT NULL,
  content text NOT NULL, category text, audience text,
  priority text DEFAULT 'Normal', issue_date date DEFAULT CURRENT_DATE,
  issued_by text, status text DEFAULT 'Draft',
  requires_acknowledgement boolean DEFAULT false,
  views int DEFAULT 0, acknowledgements int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_circulars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_circulars" ON school_circulars FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)' }}>
              <h2 className="font-black text-gray-800">📰 {editId ? 'Edit Circular' : 'New Circular'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. End of Term Examination Schedule — Term 2, 2026"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    {['Normal', 'Important', 'Urgent'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Audience</label>
                  <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Issue Date</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Issued By</label>
                <input value={form.issued_by} onChange={e => setForm(f => ({ ...f, issued_by: e.target.value }))}
                  placeholder="Principal, Deputy Principal, Class Teacher…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Circular Content *</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={8} placeholder="Dear Parents and Guardians,&#10;&#10;This is to inform you that…&#10;&#10;Yours faithfully,&#10;The Principal"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="ack" checked={form.requires_acknowledgement}
                  onChange={e => setForm(f => ({ ...f, requires_acknowledgement: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-600" />
                <label htmlFor="ack" className="text-xs font-bold text-gray-600">Requires parent acknowledgement</label>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setForm(f => ({ ...f, status: 'Draft' })); setTimeout(save, 0); }} disabled={saving}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                {saving ? '…' : '💾 Save as Draft'}
              </button>
              <button onClick={() => { setForm(f => ({ ...f, status: 'Published' })); setTimeout(save, 0); }} disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                {saving ? '…' : '📣 Publish Circular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
