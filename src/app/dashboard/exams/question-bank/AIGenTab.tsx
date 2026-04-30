'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiCpu, FiZap, FiSave, FiX, FiTrash2,
  FiEdit2, FiCheck, FiLoader, FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const CURRICULUM_SYSTEMS = [
  {
    id: '8-4-4', label: '8-4-4 System', icon: '🏫', desc: 'Form 1–4 (Secondary → KCSE)',
    levels: [
      { id: 'form1', label: 'Form 1', level: 1, exam: 'End of Term / CAT', style: '8-4-4' },
      { id: 'form2', label: 'Form 2', level: 2, exam: 'End of Term / CAT', style: '8-4-4' },
      { id: 'form3', label: 'Form 3', level: 3, exam: 'End of Term / Mock', style: '8-4-4' },
      { id: 'form4', label: 'Form 4 (KCSE)', level: 4, exam: 'KCSE Final Exam', style: 'KCSE' },
    ],
    questionStyles: {
      form1: 'School-level introductory questions. Mix of MCQ and short answer. Focus on recall and basic understanding. Marks: 1–5. Section A (MCQ 30%), Section B (Structured 40%), Section C (Essays 30%).',
      form2: 'Mid-secondary level. More analytical. Include calculations for sciences and math. Apply concepts to familiar contexts. MCQ 25%, Short answer 45%, Structured essays 30%.',
      form3: 'Advanced secondary. Mock-exam style. KCSE format introduction. Expect application and analysis. Paper 1 and Paper 2 style for sciences.',
      form4: 'KCSE style — strict KNEC format. Paper 1 (theory/MCQ) and Paper 2 (structured/calculations/essays). Use real-world Kenyan contexts. Marking scheme must match KNEC standards exactly.',
    }
  },
  {
    id: 'CBC-JSS', label: 'CBC Junior Secondary', icon: '📗', desc: 'Grade 7–9 (JSS → KJSEA)',
    levels: [
      { id: 'grade7', label: 'Grade 7', level: 7, exam: 'School-based CAT', style: 'CBC' },
      { id: 'grade8', label: 'Grade 8', level: 8, exam: 'School-based CAT', style: 'CBC' },
      { id: 'grade9', label: 'Grade 9 (KJSEA)', level: 9, exam: 'KJSEA National Assessment', style: 'KJSEA' },
    ],
    questionStyles: {
      grade7: 'CBC competency-based. Avoid pure rote recall. Questions must test real-world application. Include scenario-based, project-reflection, and skill-demonstration questions.',
      grade8: 'CBC intermediate level. More complex scenarios. Link subjects to real Kenyan contexts (markets, farms, environment). Include practical-reflection questions.',
      grade9: 'KJSEA format (2025 first cohort). Competency-focused summative. Mix of selected-response and constructed-response. 40% school-based, 60% national. Include Kenyan context, CBC competencies.',
    }
  },
  {
    id: 'CBC-Senior', label: 'CBC Senior School', icon: '🎓', desc: 'Grade 10–12 (Senior → KSCE, started Jan 2026)',
    levels: [
      { id: 'grade10', label: 'Grade 10', level: 10, exam: 'School CAT + Pathway', style: 'CBC-Senior' },
      { id: 'grade11', label: 'Grade 11', level: 11, exam: 'School CAT', style: 'CBC-Senior' },
      { id: 'grade12', label: 'Grade 12', level: 12, exam: 'KSCE Final Assessment', style: 'CBC-Senior' },
    ],
    questionStyles: {
      grade10: 'Senior school CBC. First cohort (2026). Pathway-specific (STEM/Social Science/Arts & Sports). Competency-based, real-world, inquiry-driven. No historical KNEC papers yet.',
      grade11: 'Senior school CBC advanced. Multi-disciplinary links. Portfolio-based assessment. Higher-order thinking (analyze, evaluate, create). Kenyan real-world contexts mandatory.',
      grade12: 'KSCE final assessment. First cohort ~2028. Similar to KCSE but competency-weighted. 40% continuous + 60% national exam. Analytical, evaluative, creative.',
    }
  }
];

const QUESTION_TYPES = [
  { v: 'multiple_choice', l: 'MCQ', e: '🔘', desc: 'Knowledge/comprehension recall', marks: '1–2' },
  { v: 'true_false', l: 'True/False', e: '✅', desc: 'Quick concept checks', marks: '1' },
  { v: 'short_answer', l: 'Short Answer', e: '✏️', desc: 'Brief explanations, definitions', marks: '2–5' },
  { v: 'structured', l: 'Structured', e: '📋', desc: 'Multi-part with sub-marks', marks: '5–15' },
  { v: 'essay', l: 'Essay', e: '📝', desc: 'Extended response, arguments', marks: '10–30' },
  { v: 'calculation', l: 'Calculation', e: '🔢', desc: 'Math/Science working shown', marks: '3–20' },
  { v: 'fill_blank', l: 'Fill in Blank', e: '___', desc: 'Vocabulary and concept completion', marks: '1–2' },
  { v: 'data_analysis', l: 'Data/Graph Analysis', e: '📊', desc: 'CBC competency-based data interpretation', marks: '5–15' },
  { v: 'scenario', l: 'Scenario/Case Study', e: '🗺️', desc: 'Real-world application — CBC style', marks: '10–20' },
];

const DIFFICULTIES = [
  { v: 'easy', l: 'Easy', color: '#16a34a', bg: '#f0fdf4', desc: "Knowledge & recall (Bloom's L1–2)" },
  { v: 'medium', l: 'Medium', color: '#2563eb', bg: '#eff6ff', desc: "Application & analysis (Bloom's L3–4)" },
  { v: 'hard', l: 'Hard', color: '#dc2626', bg: '#fef2f2', desc: "Evaluate & create (Bloom's L5–6)" },
];

const BLOOMS = [
  { v: 'remember', l: 'Remember', e: '🧠', desc: 'Recall facts, list, name, state' },
  { v: 'understand', l: 'Understand', e: '📖', desc: 'Explain, describe, summarize' },
  { v: 'apply', l: 'Apply', e: '🔧', desc: 'Use in new context, solve, calculate' },
  { v: 'analyze', l: 'Analyze', e: '🔍', desc: 'Break down, compare, distinguish' },
  { v: 'evaluate', l: 'Evaluate', e: '⚖️', desc: 'Justify, argue, assess, critique' },
  { v: 'create', l: 'Create', e: '💡', desc: 'Design, plan, construct, propose' },
];

function buildPrompt(cfg: any, curriculumInfo: any, levelInfo: any): { system: string; user: string } {
  const system = `You are an expert Kenyan curriculum exam question writer with deep knowledge of:
1. The 8-4-4 secondary school system (Form 1–4, KCSE format, KNEC standards)
2. The CBC/CBE Competency-Based Curriculum (Grade 7–9 JSS, Grade 10–12 Senior School)
3. KICD curriculum designs and KNEC marking standards
4. The difference in question style: 8-4-4 uses content-heavy recall and structured essays; CBC uses competency-based, scenario-driven, inquiry questions.
5. Kenya's real-world contexts: geography, economy, agriculture, Kenyan society, Nairobi, devolution, M-Pesa, etc.

Return ONLY a valid JSON array. No markdown. No preamble. No explanation outside the JSON.

Each object MUST have ALL these fields:
{
  "question_text": "Full question text (use (a), (b), (c) for sub-parts if structured)",
  "question_type": "${cfg.question_type}",
  "difficulty": "${cfg.difficulty}",
  "marks": <number>,
  "correct_answer": "Full correct answer text (not just A/B/C — write out the answer)",
  "explanation": "Why this is correct, covering key concepts tested",
  "marking_scheme": "Detailed mark allocation: e.g. 'Award 1 mark for X; 1 mark for Y; 2 marks for Z'",
  "blooms_level": "${cfg.blooms_level || 'apply'}",
  "options": <array of {key, value} OR null if not MCQ>,
  "calculation_steps": <step-by-step working string OR null>,
  "distractor_analysis": <object explaining wrong answer traps for MCQ OR null>,
  "kcse_frequency": <estimated times this topic appears in KCSE 0-10 for 8-4-4, 0 for CBC>,
  "ai_explanation": "Pedagogical note for teacher: what competency/skill this tests"
}`;

  const styleGuide = curriculumInfo.id === '8-4-4'
    ? levelInfo.id === 'form4'
      ? `KCSE KNEC FORMAT: Questions must strictly follow KNEC KCSE paper style. Use Kenya-specific scenarios. Include working marks for calculations. Essays need introduction-body-conclusion. MCQs must have 4 plausible distractors based on common student errors.`
      : `8-4-4 Form ${levelInfo.level} style: ${(curriculumInfo.questionStyles as any)[levelInfo.id]}`
    : curriculumInfo.id === 'CBC-JSS'
      ? `CBC JSS COMPETENCY FORMAT: ${(curriculumInfo.questionStyles as any)[levelInfo.id]}. Questions MUST avoid pure rote recall. Include real Kenyan scenario. At least 1 question should reference a local context.`
      : `CBC SENIOR SCHOOL FORMAT (2026 pioneer cohort): ${(curriculumInfo.questionStyles as any)[levelInfo.id]}. This is NEW territory — KNEC has no past papers yet. Design competency-forward, pathway-appropriate questions.`;

  const mcqNote = cfg.question_type === 'multiple_choice'
    ? `\nFor MCQ: provide exactly 4 options (A, B, C, D). Distractors must be plausible — based on real student misconceptions. correct_answer = the full text of the correct option, NOT just "A".`
    : cfg.question_type === 'calculation'
      ? `\nFor calculations: include full working steps in calculation_steps. Show units clearly. Award partial marks for method even if final answer wrong.`
      : cfg.question_type === 'essay'
        ? `\nFor essays: marking_scheme must include: introduction marks, content marks (list 5–8 specific points), conclusion marks, quality of expression marks.`
        : cfg.question_type === 'scenario'
          ? `\nFor scenarios: Write a realistic Kenyan context (2–3 sentences), then 2–3 sub-questions (a)(b)(c). Sub-questions must test different Bloom's levels.`
          : '';

  const user = `Generate ${cfg.count} high-quality exam questions for the following specification:

CURRICULUM SYSTEM: ${curriculumInfo.label} — ${levelInfo.label}
SUBJECT: ${cfg.subject_name}
TOPIC: ${cfg.topic}
QUESTION TYPE: ${cfg.question_type}
DIFFICULTY: ${cfg.difficulty}
BLOOM'S TAXONOMY LEVEL: ${cfg.blooms_level || 'apply'}
MARKS PER QUESTION: ${cfg.marks_per_question || 'auto — pick appropriate for question type and level'}
STYLE GUIDE: ${styleGuide}
${mcqNote}

IMPORTANT:
- Questions must be original and curriculum-appropriate for ${levelInfo.label} students
- Use Kenyan context where relevant (KES currency, Kenyan place names, local scenarios)
- Each question must be clearly different — no repetition
- Marking scheme must be specific enough for a teacher to use directly
- For ${curriculumInfo.id.startsWith('CBC') ? 'CBC' : '8-4-4'}: ${curriculumInfo.id.startsWith('CBC') ? 'emphasize competency demonstration over content recall' : 'align with KNEC examination standards'}
${cfg.extra_instructions ? `\nEXTRA INSTRUCTIONS: ${cfg.extra_instructions}` : ''}

Return JSON array only. ${cfg.count} questions total.`;

  return { system, user };
}

export default function AIGenTab({ d }: any) {
  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState('');
  const [generated, setGenerated] = useState<any[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());

  const [cfg, setCfg] = useState({
    curriculum_system: '8-4-4', level_id: 'form1', subject_id: '', subject_name: '',
    topic: '', question_type: 'multiple_choice', difficulty: 'medium',
    blooms_level: 'apply', count: 5, marks_per_question: '', extra_instructions: '',
  });

  const curriculumInfo = CURRICULUM_SYSTEMS.find(c => c.id === cfg.curriculum_system)!;
  const levelInfo = curriculumInfo?.levels.find(l => l.id === cfg.level_id) || curriculumInfo?.levels[0];
  const qTypeInfo = QUESTION_TYPES.find(q => q.v === cfg.question_type);

  const getFormId = () => {
    const levelMap: Record<string, number> = { form1:1,form2:2,form3:3,form4:4,grade7:7,grade8:8,grade9:9,grade10:10,grade11:11,grade12:12 };
    const targetLevel = levelMap[cfg.level_id];
    return d.forms?.find((f: any) => f.form_level === targetLevel || f.form_name?.includes(targetLevel?.toString()))?.id || null;
  };

  const generate = async () => {
    if (!cfg.subject_id || !cfg.topic.trim()) return toast.error('Select a subject and enter a topic');
    if (cfg.count < 1 || cfg.count > 20) return toast.error('Count must be 1–20');
    setGenerating(true);
    setProgress('Building specification...');
    setGenerated([]);
    try {
      const { system, user } = buildPrompt({ ...cfg, subject_name: d.getSubjectName(Number(cfg.subject_id)) }, curriculumInfo, levelInfo);
      setProgress(`Calling Claude AI — generating ${cfg.count} ${levelInfo?.label} ${qTypeInfo?.l} questions on "${cfg.topic}"...`);
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'API error');
      const rawText = data.content?.[0]?.text || '';
      setProgress('Parsing AI response...');
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      let parsed: any[] = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('AI did not return an array');
      const enriched = parsed.map((q, i) => ({
        ...q,
        subject_id: Number(cfg.subject_id),
        form_id: getFormId(),
        topic_id: d.topics?.find((t: any) => t.topic_name?.toLowerCase().includes(cfg.topic.toLowerCase().split(' ')[0]) && t.subject_id === Number(cfg.subject_id))?.id || null,
        question_type: cfg.question_type,
        difficulty: cfg.difficulty,
        blooms_level: cfg.blooms_level || q.blooms_level || 'apply',
        marks: q.marks || (cfg.question_type === 'essay' ? 20 : cfg.question_type === 'calculation' ? 10 : 2),
        source: 'ai_generated',
        ai_model: 'claude-sonnet-4-20250514',
        is_approved: false,
        approval_status: 'pending',
        created_by: 'AI Generator',
        curriculum_system: cfg.curriculum_system,
        _idx: i,
      }));
      setGenerated(enriched);
      setSelectedIdxs(new Set(enriched.map((_, i) => i)));
      setStep('preview');
      toast.success(`${enriched.length} questions generated — review before saving`);
    } catch (err: any) {
      console.error(err);
      toast.error('Generation failed: ' + (err.message || 'Unknown error'));
    } finally { setGenerating(false); setProgress(''); }
  };

  const toggleSelect = (i: number) => { const s = new Set(selectedIdxs); s.has(i) ? s.delete(i) : s.add(i); setSelectedIdxs(s); };
  const deleteQ = (i: number) => { setGenerated(prev => prev.filter((_, idx) => idx !== i)); const s = new Set(selectedIdxs); s.delete(i); setSelectedIdxs(s); };
  const updateQ = (i: number, field: string, val: any) => { setGenerated(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q)); };

  const saveSelected = async () => {
    const toSave = generated.filter((_, i) => selectedIdxs.has(i));
    if (toSave.length === 0) return toast.error('No questions selected');
    setSaving(true);
    const payload = toSave.map(q => { const { _idx, curriculum_system, ...rest } = q; return rest; });
    const { error } = await supabase.from('school_question_bank').insert(payload);
    if (error) toast.error('Save failed: ' + error.message);
    else { toast.success(`${toSave.length} questions saved! Pending approval.`); setStep('done'); d.fetchAll(); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Step Indicator */}
      <div className="flex items-center gap-3">
        {['config','preview','done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === s ? 'bg-indigo-600 border-indigo-600 text-white' : ['config','preview','done'].indexOf(step) > i ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>
              {['config','preview','done'].indexOf(step) > i ? <FiCheck size={12}/> : i + 1}
            </div>
            <span className={`text-xs font-semibold ${step === s ? 'text-indigo-700' : 'text-gray-400'}`}>{s === 'config' ? 'Configure' : s === 'preview' ? 'Review' : 'Done'}</span>
            {i < 2 && <div className="w-8 h-px bg-gray-200 mx-1"/>}
          </div>
        ))}
      </div>

      {/* STEP 1: CONFIG */}
      {step === 'config' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><FiCpu className="text-white" size={20}/></div>
              <div>
                <h3 className="text-sm font-bold text-white">🇰🇪 Kenya Curriculum AI Question Generator</h3>
                <p className="text-xs text-indigo-200">8-4-4 (Form 1–4/KCSE) · CBC JSS (Grade 7–9/KJSEA) · CBC Senior (Grade 10–12)</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-5">
            {/* Curriculum System */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">1. Curriculum System</label>
              <div className="grid grid-cols-3 gap-2">
                {CURRICULUM_SYSTEMS.map(cs => (
                  <button key={cs.id} onClick={() => setCfg(p => ({ ...p, curriculum_system: cs.id, level_id: cs.levels[0].id }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${cfg.curriculum_system === cs.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                    <div className="text-lg mb-1">{cs.icon}</div>
                    <div className="text-xs font-bold text-gray-800">{cs.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{cs.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">2. Level / Class</label>
              <div className="flex flex-wrap gap-2">
                {curriculumInfo.levels.map(lv => (
                  <button key={lv.id} onClick={() => setCfg(p => ({ ...p, level_id: lv.id }))}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${cfg.level_id === lv.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                    {lv.label}
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-normal ${lv.style === 'KCSE' || lv.style === 'KJSEA' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{lv.exam}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                <strong>📋 {levelInfo?.label} Style:</strong> {(curriculumInfo.questionStyles as any)[cfg.level_id] || ''}
              </div>
            </div>

            {/* Subject & Topic */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">3. Subject *</label>
                <select value={cfg.subject_id} onChange={e => setCfg(p => ({ ...p, subject_id: e.target.value, subject_name: d.getSubjectName(Number(e.target.value)) }))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400">
                  <option value="">Select subject...</option>
                  {(d.subjects || []).map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">4. Topic *</label>
                {d.topics?.filter((t: any) => t.subject_id === Number(cfg.subject_id)).length > 0 && (
                  <select onChange={e => setCfg(p => ({ ...p, topic: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 mb-1">
                    <option value="">Pick or type below...</option>
                    {d.topics.filter((t: any) => t.subject_id === Number(cfg.subject_id)).map((t: any) => <option key={t.id} value={t.topic_name}>{t.topic_name}</option>)}
                  </select>
                )}
                <input value={cfg.topic} onChange={e => setCfg(p => ({ ...p, topic: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                  placeholder="e.g. Quadratic Equations, Photosynthesis..."/>
              </div>
            </div>

            {/* Question Settings */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">5. Question Settings</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="lbl text-[10px]">Question Type</label>
                  <select value={cfg.question_type} onChange={e => setCfg(p => ({ ...p, question_type: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-400">
                    {QUESTION_TYPES.map(qt => <option key={qt.v} value={qt.v}>{qt.e} {qt.l}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-0.5">{qTypeInfo?.desc} · Marks: {qTypeInfo?.marks}</p>
                </div>
                <div>
                  <label className="lbl text-[10px]">Difficulty</label>
                  <select value={cfg.difficulty} onChange={e => setCfg(p => ({ ...p, difficulty: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-400">
                    {DIFFICULTIES.map(dd => <option key={dd.v} value={dd.v}>{dd.l}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-0.5">{DIFFICULTIES.find(dd => dd.v === cfg.difficulty)?.desc}</p>
                </div>
                <div>
                  <label className="lbl text-[10px]">Bloom's Level</label>
                  <select value={cfg.blooms_level} onChange={e => setCfg(p => ({ ...p, blooms_level: e.target.value }))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-400">
                    {BLOOMS.map(b => <option key={b.v} value={b.v}>{b.e} {b.l}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-0.5">{BLOOMS.find(b => b.v === cfg.blooms_level)?.desc}</p>
                </div>
                <div>
                  <label className="lbl text-[10px]">No. of Questions</label>
                  <input type="number" min={1} max={20} value={cfg.count} onChange={e => setCfg(p => ({ ...p, count: Math.min(20, Math.max(1, Number(e.target.value))) }))} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"/>
                  <p className="text-[9px] text-gray-400 mt-0.5">Max 20 per generation</p>
                </div>
              </div>
            </div>

            {/* Extra Instructions */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">6. Extra Instructions (Optional)</label>
              <textarea rows={2} value={cfg.extra_instructions} onChange={e => setCfg(p => ({ ...p, extra_instructions: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
                placeholder='e.g. "Focus on Rift Valley context", "Include 2 calculation questions", "Match KCSE 2023 paper style"...'/>
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <span className="font-semibold text-indigo-700">{cfg.count}</span> {qTypeInfo?.l} questions · {levelInfo?.label} · {DIFFICULTIES.find(dd => dd.v === cfg.difficulty)?.l} · {BLOOMS.find(b => b.v === cfg.blooms_level)?.l}
              </div>
              <button onClick={generate} disabled={generating || !cfg.subject_id || !cfg.topic.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
                {generating ? <><FiLoader size={15} className="animate-spin"/> {progress || 'Generating...'}</> : <><FiZap size={15}/> Generate with Claude AI</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('config')} className="px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">← Back</button>
              <span className="text-sm font-bold text-gray-700">{generated.length} questions — review & edit before saving</span>
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">{selectedIdxs.size} selected</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedIdxs(new Set(generated.map((_, i) => i)))} className="px-3 py-1.5 text-xs font-bold text-green-700 border border-green-200 bg-green-50 rounded-xl">Select All</button>
              <button onClick={() => setSelectedIdxs(new Set())} className="px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl">Deselect All</button>
              <button onClick={saveSelected} disabled={saving || selectedIdxs.size === 0}
                className="px-5 py-1.5 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                {saving ? <FiLoader size={12} className="animate-spin"/> : <FiSave size={12}/>} Save {selectedIdxs.size} Questions
              </button>
            </div>
          </div>

          {generated.map((q, i) => (
            <div key={i} className={`bg-white rounded-2xl border-2 transition-all ${selectedIdxs.has(i) ? 'border-indigo-300' : 'border-gray-200 opacity-70'}`}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <input type="checkbox" checked={selectedIdxs.has(i)} onChange={() => toggleSelect(i)} className="w-4 h-4 rounded text-indigo-600"/>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Q{i + 1}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{QUESTION_TYPES.find(t => t.v === q.question_type)?.e} {QUESTION_TYPES.find(t => t.v === q.question_type)?.l}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: DIFFICULTIES.find(dd => dd.v === q.difficulty)?.bg, color: DIFFICULTIES.find(dd => dd.v === q.difficulty)?.color }}>{q.difficulty}</span>
                <span className="text-[10px] text-gray-500">{q.marks} marks</span>
                <span className="text-[10px] font-bold text-blue-600">{BLOOMS.find(b => b.v === q.blooms_level)?.e} {q.blooms_level}</span>
                <div className="ml-auto flex gap-1">
                  <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:text-indigo-600">{expandedIdx === i ? <FiChevronUp size={13}/> : <FiChevronDown size={13}/>}</button>
                  <button onClick={() => setEditingIdx(editingIdx === i ? null : i)} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:scale-110"><FiEdit2 size={13}/></button>
                  <button onClick={() => deleteQ(i)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:scale-110"><FiTrash2 size={13}/></button>
                </div>
              </div>
              <div className="px-4 py-3">
                {editingIdx === i ? (
                  <textarea rows={4} value={q.question_text} onChange={e => updateQ(i, 'question_text', e.target.value)} className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl text-sm outline-none font-semibold text-gray-800"/>
                ) : (
                  <p className="text-sm font-semibold text-gray-800 whitespace-pre-line">{q.question_text}</p>
                )}
              </div>
              {q.options && Array.isArray(q.options) && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
                  {q.options.map((opt: any, oi: number) => (
                    <div key={oi} className={`flex items-start gap-2 p-2 rounded-xl border text-xs ${q.correct_answer === opt.value ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      <span className="font-extrabold text-indigo-600 min-w-[16px]">{opt.key}.</span>
                      {editingIdx === i ? (
                        <input value={opt.value} onChange={e => { const newOpts = [...q.options]; newOpts[oi] = { ...opt, value: e.target.value }; updateQ(i, 'options', newOpts); }} className="flex-1 bg-transparent outline-none text-xs"/>
                      ) : <span>{opt.value}</span>}
                      {q.correct_answer === opt.value && <FiCheck className="ml-auto text-green-600" size={12}/>}
                    </div>
                  ))}
                </div>
              )}
              {expandedIdx === i && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-[10px] font-bold text-green-700 uppercase mb-1">✅ Correct Answer</p>
                    {editingIdx === i ? (
                      <input value={q.correct_answer} onChange={e => updateQ(i, 'correct_answer', e.target.value)} className="w-full bg-transparent border-b border-green-300 text-sm text-green-900 outline-none"/>
                    ) : <p className="text-sm text-green-900 font-semibold">{q.correct_answer}</p>}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">📋 Marking Scheme</p>
                    {editingIdx === i ? (
                      <textarea rows={3} value={q.marking_scheme} onChange={e => updateQ(i, 'marking_scheme', e.target.value)} className="w-full bg-transparent border-b border-blue-300 text-xs text-blue-900 outline-none"/>
                    ) : <p className="text-xs text-blue-900 whitespace-pre-line">{q.marking_scheme}</p>}
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">💡 Explanation</p>
                    <p className="text-xs text-amber-900">{q.explanation}</p>
                  </div>
                  {q.calculation_steps && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">🔢 Working Steps</p>
                      <p className="text-xs text-gray-800 font-mono whitespace-pre-line">{q.calculation_steps}</p>
                    </div>
                  )}
                  {q.ai_explanation && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                      <p className="text-[10px] font-bold text-purple-700 uppercase mb-1">👩‍🏫 Teacher Note</p>
                      <p className="text-xs text-purple-800">{q.ai_explanation}</p>
                    </div>
                  )}
                  {editingIdx === i && (
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-gray-600">Marks:</label>
                      <input type="number" min={1} max={50} value={q.marks} onChange={e => updateQ(i, 'marks', Number(e.target.value))} className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm outline-none"/>
                      <button onClick={() => setEditingIdx(null)} className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg">Done</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {generated.length > 0 && (
            <div className="sticky bottom-4 bg-white rounded-2xl border border-indigo-200 shadow-xl px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-gray-600"><span className="font-bold text-indigo-700">{selectedIdxs.size}</span> of {generated.length} selected · All saved as <span className="font-bold text-amber-600">Pending</span></p>
              <div className="flex gap-2">
                <button onClick={() => { setStep('config'); setGenerated([]); }} className="px-4 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl">↺ Start Over</button>
                <button onClick={saveSelected} disabled={saving || selectedIdxs.size === 0}
                  className="px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                  {saving ? <FiLoader size={12} className="animate-spin"/> : <FiSave size={12}/>} Save {selectedIdxs.size} Questions
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: DONE */}
      {step === 'done' && (
        <div className="bg-white rounded-2xl border border-green-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"><FiCheck className="text-green-600" size={32}/></div>
          <h3 className="text-lg font-bold text-gray-800">Questions Saved Successfully!</h3>
          <p className="text-sm text-gray-500">Questions are in <strong>Pending</strong> status. Head to the <strong>Approvals tab</strong> to review and approve them.</p>
          <button onClick={() => { setStep('config'); setGenerated([]); setCfg(p => ({ ...p, topic: '', extra_instructions: '' })); }}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)' }}>
            + Generate More Questions
          </button>
        </div>
      )}

      {/* Info Panel */}
      {step === 'config' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs font-bold text-blue-700 mb-1">🏫 8-4-4 Questions</p>
            <p className="text-[11px] text-blue-600">Form 1–3: School CAT style, mixed MCQ + structured. Form 4 (KCSE): Strict KNEC format, Paper 1 & 2, Kenyan scenarios, KNEC marking schemes.</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-bold text-green-700 mb-1">📗 CBC JSS (Grade 7–9)</p>
            <p className="text-[11px] text-green-600">Competency-based. No rote recall. Scenario-driven. Grade 9 = KJSEA national assessment (first cohort 2025). 12 core subjects.</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs font-bold text-purple-700 mb-1">🎓 CBC Senior (Grade 10–12)</p>
            <p className="text-[11px] text-purple-600">Started Jan 2026. STEM / Social Science / Arts pathways. First cohort. No historical KNEC papers yet. Inquiry & analytical focus.</p>
          </div>
        </div>
      )}
    </div>
  );
}
