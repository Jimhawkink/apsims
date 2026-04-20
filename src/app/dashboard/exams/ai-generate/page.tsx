'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiZap, FiSave, FiX, FiCheck, FiRefreshCw, FiAlertCircle, FiCheckCircle, FiClock, FiCpu } from 'react-icons/fi';

const QT = [{v:'multiple_choice',l:'Multiple Choice',i:'🔘'},{v:'true_false',l:'True/False',i:'✅'},{v:'short_answer',l:'Short Answer',i:'✏️'},{v:'essay',l:'Essay',i:'📝'}];
const DIFF = [{v:'easy',l:'Easy',c:'#22c55e'},{v:'medium',l:'Medium',c:'#3b82f6'},{v:'hard',l:'Hard',c:'#ef4444'}];
const BLOOMS = [{v:'remember',l:'Remember'},{v:'understand',l:'Understand'},{v:'apply',l:'Apply'},{v:'analyze',l:'Analyze'},{v:'evaluate',l:'Evaluate'},{v:'create',l:'Create'}];
const RUBRIC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  EE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  ME: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  AE: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  BE: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
};

export default function AIGeneratePage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    subject_id: 0, topic: '', form: '', question_type: 'multiple_choice',
    difficulty: 'medium', count: 5, blooms_level: '', language: 'English',
  });

  const [generated, setGenerated] = useState<any[]>([]);
  const [selectedToSave, setSelectedToSave] = useState<Set<number>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, t, l] = await Promise.all([
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_topics').select('*').order('topic_name'),
      supabase.from('school_ai_generation_logs').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setSubjects(s.data || []);
    setTopics(t.data || []);
    setLogs(l.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerate = async () => {
    if (!form.subject_id) { toast.error('Select a subject'); return; }
    const sub = subjects.find(s => s.id === form.subject_id);
    if (!sub) return;

    setGenerating(true);
    setGenerated([]);
    setSelectedToSave(new Set());

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: sub.subject_name,
          topic: form.topic,
          form: form.form || undefined,
          question_type: form.question_type,
          difficulty: form.difficulty,
          count: form.count,
          blooms_level: form.blooms_level || undefined,
          language: form.language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Generation failed');
        setGenerating(false);
        return;
      }

      setGenerated(data.questions || []);
      setSelectedToSave(new Set((data.questions || []).map((_: any, i: number) => i)));
      toast.success(`🤖 ${data.questions?.length || 0} questions generated in ${(data.meta?.duration_ms / 1000).toFixed(1)}s`);
    } catch (err: any) {
      toast.error(err.message || 'Network error');
    }
    setGenerating(false);
  };

  const handleSaveSelected = async () => {
    if (selectedToSave.size === 0) { toast.error('Select questions to save'); return; }
    setSaving(true);
    const sub = subjects.find(s => s.id === form.subject_id);
    let saved = 0;

    for (const idx of Array.from(selectedToSave)) {
      const q = generated[idx];
      if (!q) continue;
      const payload: any = {
        subject_id: form.subject_id,
        question_text: q.question_text,
        question_type: form.question_type,
        difficulty: q.difficulty || form.difficulty,
        marks: q.marks || 1,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
        blooms_level: q.blooms_level || form.blooms_level || null,
        source: 'ai_generated',
        ai_model: 'openai-gpt4o-mini',
        ai_prompt_used: `Subject: ${sub?.subject_name}, Topic: ${form.topic}, Type: ${form.question_type}`,
        is_approved: true,
        created_by: 'admin',
      };
      if (form.question_type === 'multiple_choice' && q.options) {
        payload.options = q.options;
      }
      const { error } = await supabase.from('school_question_bank').insert([payload]);
      if (!error) saved++;
    }

    toast.success(`✅ ${saved} questions saved to Question Bank!`);
    setSaving(false);
    fetchAll();
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedToSave);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelectedToSave(next);
  };

  const subjectTopics = topics.filter(t => t.subject_id === form.subject_id);

  if (loading) return (<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>🤖</div><p className="text-sm font-bold text-gray-500">Loading AI Generator…</p></div>);

  return (<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.03em' }}>🤖 AI Question Generator</h1><p className="text-sm text-gray-500 mt-1">Generate curriculum-aligned questions using AI</p></div>
      <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15} /></button>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Config Panel */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
            <FiCpu className="text-white" size={18} />
            <h3 className="text-sm font-bold text-white">Generation Settings</h3>
          </div>
          <div className="p-5 space-y-4">
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📖 Subject *</label><select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400"><option value={0}>Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">📂 Topic</label><input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400" placeholder="e.g. Quadratic Equations" /><div className="flex flex-wrap gap-1 mt-2">{subjectTopics.slice(0, 6).map(t => <button key={t.id} onClick={() => setForm({ ...form, topic: t.topic_name })} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition">{t.topic_name}</button>)}</div></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🏫 Form</label><input value={form.form} onChange={e => setForm({ ...form, form: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400" placeholder="e.g. Form 2" /></div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🔘 Question Type</label><select value={form.question_type} onChange={e => setForm({ ...form, question_type: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400">{QT.map(t => <option key={t.v} value={t.v}>{t.i} {t.l}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">⚡ Difficulty</label><select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400">{DIFF.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🔢 Count</label><input type="number" value={form.count} onChange={e => setForm({ ...form, count: Math.min(20, Math.max(1, Number(e.target.value))) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400" min={1} max={20} /></div>
            </div>
            <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">🧠 Bloom's Level</label><select value={form.blooms_level} onChange={e => setForm({ ...form, blooms_level: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400"><option value="">— Auto —</option>{BLOOMS.map(b => <option key={b.v} value={b.v}>{b.l}</option>)}</select></div>
            <button onClick={handleGenerate} disabled={generating} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
              {generating ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Generating…</> : <><FiZap size={16} /> Generate Questions</>}
            </button>
            <p className="text-[10px] text-gray-400 text-center">Powered by OpenAI GPT-4o · Max 20 questions per request</p>
          </div>
        </div>

        {/* Recent Logs */}
        {logs.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">📜 Recent Generations</p>
          <div className="space-y-2">{logs.slice(0, 5).map(l => (
            <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <span className={`w-2 h-2 rounded-full ${l.status === 'completed' ? 'bg-green-500' : l.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <div className="flex-1 min-w-0"><p className="text-[11px] font-bold text-gray-700 truncate">{l.subject_name || l.prompt_text?.substring(0, 40)}</p><p className="text-[9px] text-gray-400">{l.questions_generated} questions · {(l.duration_ms / 1000).toFixed(1)}s</p></div>
              <span className="text-[9px] font-bold text-gray-400">{new Date(l.created_at).toLocaleDateString()}</span>
            </div>
          ))}</div>
        </div>}
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-2 space-y-4">
        {generating && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>🤖</div>
          <p className="text-sm font-bold text-gray-700">AI is generating questions…</p>
          <p className="text-xs text-gray-400 mt-1">This may take 10-30 seconds</p>
          <div className="mt-4 w-48 h-2 bg-gray-100 rounded-full mx-auto overflow-hidden"><div className="h-full bg-cyan-500 rounded-full animate-pulse" style={{ width: '60%' }} /></div>
        </div>}

        {generated.length > 0 && !generating && <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">🎯 Generated Questions</p>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700">{selectedToSave.size} selected</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedToSave(new Set(generated.map((_, i) => i)))} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 transition">Select All</button>
              <button onClick={() => setSelectedToSave(new Set())} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 transition">Deselect All</button>
              <button onClick={handleSaveSelected} disabled={saving || selectedToSave.size === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                {saving ? <div className="spinner" style={{ width: 12, height: 12 }} /> : <FiSave size={12} />}
                Save {selectedToSave.size} to Bank
              </button>
            </div>
          </div>

          <div className="space-y-3">{generated.map((q, idx) => {
            const sel = selectedToSave.has(idx);
            return (<div key={idx} onClick={() => toggleSelect(idx)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${sel ? 'border-cyan-400 bg-cyan-50/30 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${sel ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{sel ? '✓' : idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{q.question_text}</p>
                  {q.options && <div className="grid grid-cols-2 gap-1.5 mt-2">{q.options.map((o: any, oi: number) => (
                    <div key={oi} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${o.key === q.correct_answer ? 'bg-green-50 text-green-700 font-bold border border-green-200' : 'bg-gray-50 text-gray-600'}`}>
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: o.key === q.correct_answer ? '#10b981' : '#e2e8f0', color: o.key === q.correct_answer ? '#fff' : '#64748b' }}>{o.key}</span>
                      {o.value || o.text}
                    </div>
                  ))}</div>}
                  {q.correct_answer && !q.options && <div className="mt-1.5 flex items-center gap-1.5"><FiCheckCircle size={11} className="text-green-500" /><span className="text-xs font-bold text-green-700">Answer: {q.correct_answer}</span></div>}
                  {q.explanation && <p className="text-[11px] text-gray-400 mt-1.5 italic">💡 {q.explanation}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-green-50 text-green-700' : q.difficulty === 'hard' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{q.difficulty || form.difficulty}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">{q.marks || 1} marks</span>
                    {q.blooms_level && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">🧠 {q.blooms_level}</span>}
                  </div>
                </div>
              </div>
            </div>);
          })}</div>
        </>}

        {generated.length === 0 && !generating && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>🤖</div>
          <h3 className="text-lg font-bold text-gray-800">AI Question Generator</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Configure your question settings on the left panel and click <strong>Generate Questions</strong> to create curriculum-aligned questions automatically.</p>
          <div className="flex items-center justify-center gap-4 mt-6">
            {[{ e: '🔘', l: 'MCQ' }, { e: '✏️', l: 'Short Answer' }, { e: '📝', l: 'Essay' }, { e: '✅', l: 'True/False' }].map(t => (
              <div key={t.l} className="text-center"><span className="text-2xl block">{t.e}</span><span className="text-[10px] text-gray-400 font-bold">{t.l}</span></div>
            ))}
          </div>
          <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200 max-w-sm mx-auto">
            <p className="text-[11px] text-amber-800 font-semibold">⚠️ Requires <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> in <code className="bg-amber-100 px-1 rounded">.env.local</code></p>
          </div>
        </div>}
      </div>
    </div>
  </div>);
}
