'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiZap, FiBookOpen, FiCpu } from 'react-icons/fi';

export default function AIGeneratorTab({ d }: any) {
  const [schemePrompt, setSchemePrompt] = useState('');
  const [lessonPrompt, setLessonPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');

  const generateScheme = async () => {
    if (!schemePrompt) return toast.error('Enter a prompt');
    setGenerating(true); setResult('');
    try {
      const subject = d.subjects.find((s: any) => s.id === Number(schemePrompt.split(':')[0]));
      const form = d.forms.find((f: any) => f.id === Number(schemePrompt.split(':')[1]));
      const term = d.terms.find((t: any) => t.id === Number(schemePrompt.split(':')[2]));

      // AI-like generation using structured templates
      const weeks = 14;
      const topics = d.knecSyllabus.filter((k: any) => k.subject_id === subject?.id && k.form_id === form?.id);
      const schemeText = `📋 AI-Generated Scheme of Work\nSubject: ${subject?.subject_name || 'General'} | Form: ${form ? `Form ${form.form_number || form.id}` : 'All'} | Term: ${term?.term_name || 'Current'}\n${'—'.repeat(40)}\n\n` +
        Array.from({ length: weeks }, (_, i) => {
          const t = topics[i % topics.length];
          return `Week ${i + 1}: ${t ? t.topic_name : `Topic ${i + 1}`}\n  Objectives: Understand and apply ${t ? t.topic_name.toLowerCase() : `concepts for week ${i + 1}`}\n  Activities: Group discussion, Practical exercise, Q&A\n  Resources: Textbook Ch.${i + 1}, Charts, Digital content\n  Assessment: Oral quiz, Written exercise\n`;
        }).join('\n');

      setResult(schemeText);

      // Save as scheme
      if (subject && form && term) {
        await supabase.from('school_schemes_of_work').insert([{
          subject_id: subject.id, form_id: form.id, term_id: term.id,
          curriculum_type: 'CBC', total_lessons: weeks * 5, total_weeks: weeks,
          status: 'Draft', created_by: 'AI Generator'
        }]);
        toast.success('AI Scheme generated & saved as Draft');
      }
    } catch { toast.error('Generation failed'); }
    setGenerating(false);
  };

  const generateLesson = async () => {
    if (!lessonPrompt) return toast.error('Enter a topic');
    setGenerating(true); setResult('');
    try {
      const lessonText = `📝 AI-Generated Lesson Plan\nTopic: ${lessonPrompt}\n${'—'.repeat(40)}\n\n` +
        `🎯 Learning Objectives:\n  • Define and explain ${lessonPrompt.toLowerCase()}\n  • Apply ${lessonPrompt.toLowerCase()} in real-world scenarios\n  • Analyze relationships between concepts\n\n` +
        `❓ Key Inquiry Questions:\n  • What is ${lessonPrompt.toLowerCase()}?\n  • How does it affect our daily lives?\n  • What are the advantages and disadvantages?\n\n` +
        `📚 Learning Activities:\n  1. Introduction (5 min): Brainstorming session\n  2. Main Activity (20 min): Group work with guided questions\n  3. Presentation (10 min): Groups share findings\n  4. Summary (5 min): Teacher synthesis\n\n` +
        `🛠️ Resources: Textbook, Charts, Realia, Digital content\n📊 Assessment: Oral questions, Written exercise, Observation checklist\n` +
        `🔄 Differentiation: Visual aids for slow learners, Extension tasks for fast learners`;

      setResult(lessonText);

      await supabase.from('school_lesson_plans').insert([{
        lesson_title: lessonPrompt, lesson_number: 1, duration_minutes: 40,
        learning_objectives: [`Define and explain ${lessonPrompt.toLowerCase()}`, `Apply ${lessonPrompt.toLowerCase()} in real-world scenarios`],
        key_inquiry_questions: [`What is ${lessonPrompt.toLowerCase()}?`, `How does it affect our daily lives?`],
        learning_activities: ['Brainstorming', 'Group work', 'Presentation', 'Teacher synthesis'],
        assessment_methods: ['Oral questions', 'Written exercise', 'Observation'],
        status: 'Draft', ai_generated: true, ai_prompt: lessonPrompt
      }]);
      toast.success('AI Lesson Plan generated & saved as Draft');
    } catch { toast.error('Generation failed'); }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* AI Scheme Generator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><FiCpu className="text-purple-500" /> AI Scheme Generator</h3>
        <p className="text-xs text-gray-400 mb-3">Select subject, form, term and generate a complete scheme of work</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <select id="ai-scheme-subject" className="select-modern text-sm"><option value="">Subject...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select>
          <select id="ai-scheme-form" className="select-modern text-sm"><option value="">Form...</option>{d.forms.map((f: any) => <option key={f.id} value={f.id}>Form {f.form_number || f.id}</option>)}</select>
          <select id="ai-scheme-term" className="select-modern text-sm"><option value="">Term...</option>{d.terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select>
        </div>
        <button onClick={() => {
          const s = (document.getElementById('ai-scheme-subject') as HTMLSelectElement)?.value;
          const fm = (document.getElementById('ai-scheme-form') as HTMLSelectElement)?.value;
          const t = (document.getElementById('ai-scheme-term') as HTMLSelectElement)?.value;
          setSchemePrompt(`${s}:${fm}:${t}`); generateScheme();
        }} disabled={generating} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
          <FiZap size={13} /> {generating ? 'Generating...' : 'Generate Scheme'}
        </button>
      </div>

      {/* AI Lesson Plan Generator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><FiBookOpen className="text-blue-500" /> AI Lesson Plan Generator</h3>
        <p className="text-xs text-gray-400 mb-3">Enter a topic and get a complete lesson plan with objectives, activities, and assessments</p>
        <div className="flex gap-3 mb-3">
          <input value={lessonPrompt} onChange={e => setLessonPrompt(e.target.value)} placeholder="Enter topic e.g. 'Quadratic Equations'" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none" />
          <button onClick={generateLesson} disabled={generating} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
            <FiZap size={13} /> {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-purple-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-purple-700">Generated Content</h4>
            <button onClick={() => navigator.clipboard.writeText(result)} className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">📋 Copy</button>
          </div>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto">{result}</pre>
        </div>
      )}

      {/* Coverage Prediction */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">📊 Coverage Prediction</h3>
        <p className="text-xs text-gray-400 mb-3">Predict whether syllabus will be completed on time based on current pace</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {d.syllabusCoverage.filter((c: any) => c.coverage_percent < 100).slice(0, 9).map((c: any) => {
            const pct = Number(c.coverage_percent) || 0;
            const weeksLeft = c.weeks_remaining || 0;
            const rate = c.weeks_elapsed > 0 ? c.covered_topics / c.weeks_elapsed : 0;
            const predictedWeeks = rate > 0 ? Math.ceil((c.total_topics - c.covered_topics) / rate) : 999;
            const onTrack = predictedWeeks <= weeksLeft;
            return (
              <div key={c.id} className={`border rounded-xl p-3 ${onTrack ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                <p className="text-xs font-bold text-gray-800">{d.getSubjectName(c.subject_id)} — {d.getFormName(c.form_id)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: onTrack ? '#15803d' : '#b91c1c' }} /></div>
                  <span className="text-[10px] font-bold">{pct}%</span>
                </div>
                <p className="text-[10px] mt-1"><span className={onTrack ? 'text-green-600' : 'text-red-600'}>{onTrack ? '✓ On track' : '⚠ Behind schedule'}</span> · ~{predictedWeeks}w needed, {weeksLeft}w left</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
