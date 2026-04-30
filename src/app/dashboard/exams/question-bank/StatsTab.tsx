'use client';
import { FiBarChart2, FiAlertTriangle } from 'react-icons/fi';

export default function StatsTab({ d }: any) {
  const bySubject = d.subjects.map((s: any) => ({
    name: s.subject_name,
    total: d.questions.filter((q: any) => q.subject_id === s.id).length,
    mcq: d.questions.filter((q: any) => q.subject_id === s.id && q.question_type === 'multiple_choice').length,
    essay: d.questions.filter((q: any) => q.subject_id === s.id && q.question_type === 'essay').length,
    ai: d.questions.filter((q: any) => q.subject_id === s.id && q.source === 'ai_generated').length,
    approved: d.questions.filter((q: any) => q.subject_id === s.id && q.is_approved).length,
  })).filter((s: any) => s.total > 0).sort((a: any, b: any) => b.total - a.total);

  const byDifficulty = { easy: d.questions.filter((q: any) => q.difficulty === 'easy').length, medium: d.questions.filter((q: any) => q.difficulty === 'medium').length, hard: d.questions.filter((q: any) => q.difficulty === 'hard').length };
  const byBlooms = ['remember','understand','apply','analyze','evaluate','create'].map(b => ({ level: b, count: d.questions.filter((q: any) => q.blooms_level === b).length }));
  const withMarking = d.questions.filter((q: any) => q.marking_scheme).length;
  const withExplanation = d.questions.filter((q: any) => q.explanation).length;
  const withDistractor = d.questions.filter((q: any) => q.distractor_analysis).length;

  // Coverage gaps: subjects with fewer than 10 questions per topic
  const gaps: any[] = [];
  d.subjects.forEach((s: any) => {
    const subTopics = d.topics.filter((t: any) => t.subject_id === s.id);
    subTopics.forEach((t: any) => {
      const count = d.questions.filter((q: any) => q.topic_id === t.id).length;
      if (count < 5) gaps.push({ subject: s.subject_name, topic: t.topic_name, count, gap: 5 - count });
    });
  });

  const maxQ = Math.max(...bySubject.map((s: any) => s.total), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBarChart2 className="text-cyan-500" /> Question Bank Statistics</h3>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Questions', value: d.questions.length, color: '#6366f1', bg: '#eff6ff' },
          { label: 'With Marking Scheme', value: withMarking, color: '#059669', bg: '#ecfdf5' },
          { label: 'With Explanation', value: withExplanation, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'With Distractor Analysis', value: withDistractor, color: '#b45309', bg: '#fffbeb' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 text-center" style={{ backgroundColor: s.bg }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* By Subject */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h4 className="text-xs font-bold text-gray-600 mb-3">Questions by Subject</h4>
        <div className="space-y-2">{bySubject.map((s: any) => (
          <div key={s.name} className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-700 w-24 truncate">{s.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
              <div className="h-6 rounded-full flex items-center px-2" style={{ width: `${(s.total / maxQ) * 100}%`, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <span className="text-[10px] font-bold text-white">{s.total}</span>
              </div>
            </div>
            <div className="flex gap-1 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{s.mcq} MCQ</span>
              <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700">{s.essay} Essay</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{s.ai} AI</span>
            </div>
          </div>
        ))}</div>
      </div>

      {/* By Difficulty & Bloom's */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-gray-600 mb-3">By Difficulty</h4>
          <div className="space-y-2">{Object.entries(byDifficulty).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs font-bold w-16 capitalize" style={{ color: k === 'easy' ? '#22c55e' : k === 'hard' ? '#ef4444' : '#3b82f6' }}>{k}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4"><div className="h-4 rounded-full" style={{ width: `${d.questions.length > 0 ? ((v as number) / d.questions.length) * 100 : 0}%`, background: k === 'easy' ? '#22c55e' : k === 'hard' ? '#ef4444' : '#3b82f6' }} /></div>
              <span className="text-xs font-bold text-gray-600">{v as number}</span>
            </div>
          ))}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h4 className="text-xs font-bold text-gray-600 mb-3">By Bloom's Level</h4>
          <div className="space-y-2">{byBlooms.map(b => (
            <div key={b.level} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600 w-20 capitalize">{b.level}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4"><div className="h-4 rounded-full bg-indigo-500" style={{ width: `${d.questions.length > 0 ? (b.count / d.questions.length) * 100 : 0}%` }} /></div>
              <span className="text-xs font-bold text-gray-600">{b.count}</span>
            </div>
          ))}</div>
        </div>
      </div>

      {/* Coverage Gaps */}
      {gaps.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <h4 className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-2"><FiAlertTriangle /> Coverage Gap Report</h4>
          <div className="space-y-1">{gaps.slice(0, 15).map((g: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-white">
              <span className="text-gray-700"><span className="font-bold">{g.subject}</span> → {g.topic}</span>
              <span className="text-amber-600 font-bold">{g.count}/5 · need {g.gap} more</span>
            </div>
          ))}</div>
          {gaps.length > 15 && <p className="text-[10px] text-amber-500 mt-2">+{gaps.length - 15} more gaps</p>}
        </div>
      )}
    </div>
  );
}
