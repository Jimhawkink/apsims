'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBarChart2, FiPlus } from 'react-icons/fi';

export default function KCSEAnalysisTab({ d }: any) {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState<any>({ subject_id: '', topic_name: '', year: new Date().getFullYear(), appearance_count: 1, marks_allocated: 0, question_types: [] });

  const save = async () => {
    if (!f.subject_id || !f.topic_name || !f.year) return toast.error('Subject, topic & year required');
    await supabase.from('school_kcse_frequency').insert([f]);
    toast.success('KCSE frequency added'); setShowAdd(false); d.fetchAll();
  };

  const freq = d.kcseFrequency.filter((k: any) => !subjectFilter || String(k.subject_id) === subjectFilter);
  const grouped = freq.reduce((acc: any, k: any) => {
    const key = k.topic_name;
    if (!acc[key]) acc[key] = { topic: k.topic_name, subject: d.getSubjectName(k.subject_id), totalAppearances: 0, years: [], totalMarks: 0 };
    acc[key].totalAppearances += k.appearance_count;
    acc[key].years.push(k.year);
    acc[key].totalMarks += Number(k.marks_allocated || 0);
    return acc;
  }, {});

  const hotTopics = Object.values(grouped).sort((a: any, b: any) => b.totalAppearances - a.totalAppearances);

  // Auto-tag questions with KCSE frequency
  const tagQuestions = async () => {
    const qsWithoutFreq = d.questions.filter((q: any) => !q.kcse_frequency && q.topic_id);
    let tagged = 0;
    for (const q of qsWithoutFreq) {
      const topicName = d.getTopicName(q.topic_id);
      const freqEntry = d.kcseFrequency.find((k: any) => k.topic_name === topicName);
      if (freqEntry) {
        await supabase.from('school_question_bank').update({ kcse_frequency: freqEntry.appearance_count, last_kcse_year: freqEntry.year }).eq('id', q.id);
        tagged++;
      }
    }
    toast.success(`${tagged} questions tagged with KCSE frequency`); d.fetchAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBarChart2 className="text-red-500" /> KCSE Frequency Analysis</h3>
        <div className="flex gap-2">
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold"><option value="">All Subjects</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
          <button onClick={tagQuestions} className="px-3 py-2 text-xs font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#991b1b,#ef4444)' }}>Auto-Tag Questions</button>
          <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}><FiPlus size={12} /> Add Entry</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="lbl">Subject *</label><select value={f.subject_id} onChange={e => setF({ ...f, subject_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Topic *</label><input value={f.topic_name} onChange={e => setF({ ...f, topic_name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
            <div><label className="lbl">Year *</label><input type="number" value={f.year} onChange={e => setF({ ...f, year: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
            <div><label className="lbl">Appearances</label><input type="number" value={f.appearance_count} onChange={e => setF({ ...f, appearance_count: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
            <div><label className="lbl">Marks Allocated</label><input type="number" value={f.marks_allocated} onChange={e => setF({ ...f, marks_allocated: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
          </div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>Save</button>
        </div>
      )}

      {/* Hot Topics Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hotTopics.slice(0, 10).map((t: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-800">{t.topic}</span>
              <span className="text-[10px] font-bold text-red-600">{t.totalAppearances}x</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
              <div className="h-3 rounded-full" style={{ width: `${Math.min(100, t.totalAppearances * 10)}%`, background: `linear-gradient(135deg, #991b1b, #ef4444)` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{t.subject}</span>
              <span>{t.totalMarks} marks · Years: {t.years.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
      {hotTopics.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No KCSE frequency data yet. Add entries or import past paper data.</p>}
    </div>
  );
}
