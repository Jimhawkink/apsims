'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiEdit2, FiBarChart2 } from 'react-icons/fi';

export default function StudentPracticeTab({ d }: any) {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [startPractice, setStartPractice] = useState(false);
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceCount, setPracticeCount] = useState(10);
  const [practiceQs, setPracticeQs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const beginPractice = () => {
    if (!practiceSubject) return toast.error('Select a subject');
    const pool = d.questions.filter((q: any) => String(q.subject_id) === practiceSubject && q.is_approved && q.question_type === 'multiple_choice');
    if (pool.length === 0) return toast.error('No approved MCQ questions for this subject');
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(practiceCount, pool.length));
    setPracticeQs(selected); setAnswers({}); setSubmitted(false); setStartPractice(true);
  };

  const submitPractice = async () => {
    let correct = 0;
    practiceQs.forEach((q: any) => { if (answers[q.id]?.toUpperCase() === q.correct_answer?.toUpperCase()) correct++; });
    const score = practiceQs.length > 0 ? ((correct / practiceQs.length) * 100).toFixed(1) : 0;
    await supabase.from('school_student_practice').insert([{
      student_id: 0, subject_id: Number(practiceSubject), total_questions: practiceQs.length,
      correct_answers: correct, score_percent: score, difficulty: 'mixed', answers,
      completed_at: new Date().toISOString(),
    }]);
    toast.success(`Score: ${correct}/${practiceQs.length} (${score}%)`);
    setSubmitted(true);
  };

  const sessions = d.practiceSessions.filter((s: any) => !subjectFilter || String(s.subject_id) === subjectFilter);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiEdit2 className="text-amber-500" /> Student Practice Mode</h3>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold"><option value="">All Subjects</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
      </div>

      {!startPractice ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h4 className="text-sm font-bold text-amber-700">Start Practice Session</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="lbl">Subject *</label><select value={practiceSubject} onChange={e => setPracticeSubject(e.target.value)} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Questions</label><input type="number" min={5} max={50} value={practiceCount} onChange={e => setPracticeCount(Number(e.target.value))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" /></div>
          </div>
          <button onClick={beginPractice} className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#b45309,#f59e0b)' }}>Start Practice</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 space-y-3">
          <div className="flex justify-between items-center"><h4 className="text-sm font-bold text-amber-700">Practice: {d.getSubjectName(Number(practiceSubject))}</h4><button onClick={() => setStartPractice(false)} className="text-xs text-gray-400">Exit</button></div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {practiceQs.map((q: any, i: number) => (
              <div key={q.id} className={`p-3 rounded-xl border ${submitted ? (answers[q.id]?.toUpperCase() === q.correct_answer?.toUpperCase() ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'border-gray-200'}`}>
                <p className="text-xs font-bold text-gray-800 mb-2">{i + 1}. {q.question_text}</p>
                {q.question_type === 'multiple_choice' && (() => { try { const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; return Array.isArray(opts) ? opts.map((o: any) => (
                  <label key={o.key || o.label} className="flex items-center gap-2 mb-1 cursor-pointer">
                    <input type="radio" name={`q${q.id}`} checked={answers[q.id] === (o.key || o.label)} onChange={() => setAnswers({ ...answers, [q.id]: o.key || o.label })} disabled={submitted} />
                    <span className="text-xs">{o.key || o.label}. {o.value || o.text}</span>
                  </label>
                )) : null; } catch { return null; } })()}
                {submitted && <p className="text-[10px] text-gray-500 mt-1">Correct: {q.correct_answer} {q.explanation && `— ${q.explanation}`}</p>}
              </div>
            ))}
          </div>
          {!submitted ? <button onClick={submitPractice} className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>Submit Answers</button>
            : <button onClick={() => setStartPractice(false)} className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#b45309,#f59e0b)' }}>Try Again</button>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-2"><FiBarChart2 /> Practice History</h4>
        <div className="space-y-2">{sessions.slice(0, 20).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
            <span className="font-semibold text-gray-700">{d.getSubjectName(s.subject_id)}</span>
            <span className="text-gray-500">{s.correct_answers}/{s.total_questions}</span>
            <span className={`font-bold ${Number(s.score_percent) >= 50 ? 'text-green-600' : 'text-red-600'}`}>{s.score_percent}%</span>
            <span className="text-gray-400">{new Date(s.completed_at || s.created_at).toLocaleDateString()}</span>
          </div>
        ))}{sessions.length === 0 && <p className="text-center text-gray-400 text-xs py-4">No practice sessions yet</p>}</div>
      </div>
    </div>
  );
}
