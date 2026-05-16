'use client';
import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiPlus, FiTrash2, FiEdit2, FiSearch, FiSave, FiX,
  FiRefreshCw, FiZap, FiCpu, FiChevronDown, FiChevronUp,
  FiDownload, FiLoader, FiBook,
} from 'react-icons/fi';

// ─── Kenya Education System (2025 Reality) ───────────────────────────────────
// 8-4-4 REMNANTS (last KCSE ~2027): Form 2, Form 3, Form 4
//   NOTE: Form 1 intake was abolished in 2025 — no new Form 1s
// CBC JUNIOR SECONDARY: Grade 7, Grade 8, Grade 9 (KJSEA at Grade 9)
// CBC SENIOR SECONDARY: Grade 10, Grade 11, Grade 12 (KSCE at Grade 12)
const KENYA_LEVELS = [
  { v: 'form2', l: 'Form 2', group: '📘 8-4-4 (KCSE)', curriculum: 'kcse' },
  { v: 'form3', l: 'Form 3', group: '📘 8-4-4 (KCSE)', curriculum: 'kcse' },
  { v: 'form4', l: 'Form 4 (KCSE)', group: '📘 8-4-4 (KCSE)', curriculum: 'kcse' },
  { v: 'grade7', l: 'Grade 7', group: '🟢 CBC Junior Secondary', curriculum: 'cbc' },
  { v: 'grade8', l: 'Grade 8', group: '🟢 CBC Junior Secondary', curriculum: 'cbc' },
  { v: 'grade9', l: 'Grade 9 (KJSEA)', group: '🟢 CBC Junior Secondary', curriculum: 'cbc' },
  { v: 'grade10', l: 'Grade 10', group: '🔵 CBC Senior Secondary', curriculum: 'cbc' },
  { v: 'grade11', l: 'Grade 11', group: '🔵 CBC Senior Secondary', curriculum: 'cbc' },
  { v: 'grade12', l: 'Grade 12 (KSCE)', group: '🔵 CBC Senior Secondary', curriculum: 'cbc' },
];

const KCSE_SUBJECTS = [
  'Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics',
  'History & Government', 'Geography', 'Christian Religious Education',
  'Islamic Religious Education', 'Agriculture', 'Business Studies',
  'Computer Studies', 'Home Science', 'Art & Design', 'Music',
  'French', 'German', 'Arabic',
];

const CBC_JUNIOR_SUBJECTS = [
  'Mathematics', 'English', 'Kiswahili',
  'Integrated Science', 'Pre-Technical Studies',
  'Social Studies', 'Creative Arts & Sports',
  'Health Education', 'Life Skills Education',
  'Christian Religious Education', 'Islamic Religious Education',
  'Agriculture', 'Computer Science',
];

const CBC_SENIOR_SUBJECTS = [
  'Mathematics (Advanced)', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Agriculture Technology', 'Engineering',
  'History', 'Geography', 'Business Studies', 'Economics',
  'Christian Religious Education', 'Islamic Religious Education',
  'Sociology', 'Psychology',
  'Music', 'Fine Art', 'Drama', 'Physical Education',
  'English', 'Kiswahili', 'French', 'German', 'Arabic',
];

const QT = [
  { v: 'multiple_choice', l: 'MCQ', e: '🔘', color: '#6366f1' },
  { v: 'true_false', l: 'True/False', e: '✅', color: '#10b981' },
  { v: 'short_answer', l: 'Short Answer', e: '✏️', color: '#f59e0b' },
  { v: 'essay', l: 'Essay', e: '📝', color: '#8b5cf6' },
  { v: 'fill_blank', l: 'Fill Blank', e: '📋', color: '#06b6d4' },
  { v: 'calculation', l: 'Calculation', e: '🔢', color: '#ef4444' },
  { v: 'structured', l: 'Structured', e: '📊', color: '#ec4899' },
  { v: 'cbc_project', l: 'CBC Task', e: '🎯', color: '#14b8a6' },
];

const DIFF = [
  { v: 'easy', l: 'Easy', c: '#16a34a', b: '#f0fdf4', border: '#86efac' },
  { v: 'medium', l: 'Medium', c: '#2563eb', b: '#eff6ff', border: '#93c5fd' },
  { v: 'hard', l: 'Hard', c: '#dc2626', b: '#fef2f2', border: '#fca5a5' },
];

const BLOOMS = [
  { v: 'remember', l: 'Remember', e: '🧠' },
  { v: 'understand', l: 'Understand', e: '📖' },
  { v: 'apply', l: 'Apply', e: '🔧' },
  { v: 'analyze', l: 'Analyze', e: '🔍' },
  { v: 'evaluate', l: 'Evaluate', e: '⚖️' },
  { v: 'create', l: 'Create', e: '💡' },
];

// ─── AI Prompt Builder ────────────────────────────────────────────────────────
function buildAIPrompt(cfg: {
  subject: string; topic: string; level: string; levelObj: any;
  qType: string; difficulty: string; blooms: string;
  count: number; marks: number; contextHint: string;
}): string {
  const isCBC = cfg.levelObj?.curriculum === 'cbc';
  const isGrade9 = cfg.level === 'grade9';
  const isGrade12 = cfg.level === 'grade12';
  const isForm4 = cfg.level === 'form4';

  const qtInstructions: Record<string, string> = {
    multiple_choice: `Generate MCQ with EXACTLY 4 options labeled A, B, C, D.
- Each option must be a full, plausible, complete statement or value.
- Only ONE correct answer. Distractors must reflect common student errors.
- Fill: options array [{key:"A",text:"..."}, ...], correct_answer = letter (e.g. "B").`,

    true_false: `Generate a clear declarative statement.
- Must be unambiguously TRUE or FALSE.
- Explain WHY it is true/false.
- Fill: correct_answer = "True" or "False".`,

    short_answer: `Generate a focused question expecting 2–4 sentence answer.
- model_answer: full 2–4 sentence answer.
- marking_scheme: 3–5 bullet points each worth marks.`,

    essay: `Generate a broad essay question with clear instruction word (Discuss/Analyze/Evaluate/Explain).
- model_answer: complete 5–8 paragraph essay response (400–600 words).
- marking_scheme: section-by-section breakdown with marks per section totaling ${cfg.marks} marks.`,

    fill_blank: `Sentence with EXACTLY ONE blank (___) testing a key term.
- correct_answer: the missing word or phrase.
- explanation: full sentence with answer + why that word fits.`,

    calculation: `Numerical problem requiring step-by-step working.
- Use Kenyan context: shillings, local place names, Kenyan data.
- calculation_steps: numbered steps showing formula, substitution, and final answer with units.
- marking_scheme: marks for each step (e.g. "Step 1 — 1 mark").`,

    structured: `Multi-part question (a), (b), (c) with increasing complexity.
- structured_parts: array of [{part:"a", question:"...", answer:"...", marks: N}, ...]
- Total parts must add up to ${cfg.marks} marks.
- Part (a): recall, Part (b): application, Part (c): analysis/evaluation.`,

    cbc_project: `Competency-Based Assessment task for CBC Kenya.
- Must assess 2–3 of the 7 CBC competencies.
- rubric: table with 4 performance levels: EE (Exceeding), ME (Meeting), AE (Approaching), BE (Below) Expectations.
- cbc_competencies: list of competencies assessed.
- model_answer: sample learner output / expected project.`,
  };

  const curriculumContext = isCBC ? `
CURRICULUM: Kenya CBC (Competency-Based Curriculum) — ${cfg.levelObj?.l}
- Learner-centered, competency-based, real-world application focus.
- Use CBC language: "learner" (not student), "strand", "sub-strand", "learning outcome".
- 7 CBC core competencies: Communication & Collaboration, Critical Thinking & Problem Solving,
  Creativity & Imagination, Citizenship, Digital Literacy, Learning to Learn, Self-Efficacy.
- Assessment levels: EE (Exceeding Expectations), ME (Meeting), AE (Approaching), BE (Below).
${isGrade9 ? '- CRITICAL: Grade 9 = KJSEA exam year. Use exam-quality, KNEC-standard questions.' : ''}
${isGrade12 ? '- CRITICAL: Grade 12 = KSCE final national exam. Highest rigor required.' : ''}
` : `
CURRICULUM: Kenya KCSE (Kenya Certificate of Secondary Education) — ${cfg.levelObj?.l}
- KNEC standard. Follow KCSE past-paper style exactly.
- Use Kenya context: shillings, local geography, Kenyan events, local names.
- Instruction words: State, Explain, Describe, Calculate, Outline, Discuss, Analyze.
${isForm4 ? '- CRITICAL: Form 4 = KCSE exam year. Use official KCSE paper style and difficulty.' : ''}
- Mark allocation shown in brackets: e.g. (2 marks).
`;

  return `You are a master Kenya curriculum question setter and examiner with 20+ years experience in both KCSE and CBC. You write exam-ready, premium quality questions used in Kenya's top schools.

GENERATE: ${cfg.count} complete, exam-ready question(s)

PARAMETERS:
- Subject: ${cfg.subject}
- Topic/Strand: ${cfg.topic || 'General ' + cfg.subject}
- Level: ${cfg.levelObj?.l || cfg.level}
- Question Type: ${cfg.qType.replace(/_/g, ' ').toUpperCase()}
- Difficulty: ${cfg.difficulty.toUpperCase()}
- Bloom's Taxonomy: ${cfg.blooms || 'apply'}
- Marks per question: ${cfg.marks}
${cfg.contextHint ? `- Specific Focus: ${cfg.contextHint}` : ''}

${curriculumContext}

QUESTION TYPE REQUIREMENTS:
${qtInstructions[cfg.qType] || qtInstructions.short_answer}

MANDATORY QUALITY RULES:
1. Questions must be immediately usable in an actual Kenya exam — no placeholders.
2. Answers must be COMPLETE and DETAILED. Not just keywords — full sentences.
3. Marking schemes must specify EXACTLY how marks are allocated.
4. Every question must genuinely test the specified Bloom's level.
5. Use correct subject-specific terminology for ${cfg.subject}.
6. Kenyan context must be authentic — real places, realistic shilling amounts, Kenyan scenarios.
7. No trivial, ambiguous, or culturally inappropriate questions.
8. Difficulty must be accurate: easy = basic recall, medium = application, hard = analysis/synthesis.

RETURN FORMAT: Valid JSON only. No markdown fences, no preamble, no explanation outside JSON.

{
  "questions": [
    {
      "question_text": "Full question here (${cfg.marks} marks)",
      "question_type": "${cfg.qType}",
      "difficulty": "${cfg.difficulty}",
      "marks": ${cfg.marks},
      "blooms_level": "${cfg.blooms || 'apply'}",
      "correct_answer": "Full correct answer",
      "explanation": "Detailed explanation of why this is correct",
      "model_answer": "Complete model answer as a student would write",
      "marking_scheme": "Detailed marking guide with marks per point",
      "options": [],
      "calculation_steps": "",
      "structured_parts": [],
      "cbc_competencies": [],
      "rubric": "",
      "topic_hint": "${cfg.topic || cfg.subject}"
    }
  ]
}`;
}

// ─── Claude API Call ──────────────────────────────────────────────────────────
async function callClaudeAPI(prompt: string): Promise<any[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b: any) => b.text || '').join('');
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(clean);
  return Array.isArray(parsed.questions) ? parsed.questions : [];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QuestionsTab({ d }: any) {
  // Filters
  const [search, setSearch] = useState('');
  const [fSub, setFSub] = useState('');
  const [fType, setFType] = useState('');
  const [fDiff, setFDiff] = useState('');
  const [page, setPage] = useState(1);
  const PS = 12;

  // Manual modal
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ subject_id: 0, topic_id: 0, question_text: '', question_type: 'multiple_choice', difficulty: 'medium', marks: 1, correct_answer: '', explanation: '', blooms_level: '', marking_scheme: '', calculation_steps: '', is_approved: true });
  const [mcqOpts, setMcqOpts] = useState([{ k: 'A', v: '' }, { k: 'B', v: '' }, { k: 'C', v: '' }, { k: 'D', v: '' }]);

  // AI panel
  const [showAI, setShowAI] = useState(false);
  const [aiCfg, setAiCfg] = useState({
    subject: 'Mathematics', topic: '', level: 'form3',
    qType: 'multiple_choice', difficulty: 'medium', blooms: 'apply',
    count: 5, marks: 2, contextHint: '',
    batchMode: false, batchTypes: [] as string[],
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<any[]>([]);
  const [aiProgress, setAiProgress] = useState(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const levelObj = KENYA_LEVELS.find(l => l.v === aiCfg.level);

  const subjectsForLevel = useMemo(() => {
    if (!levelObj) return KCSE_SUBJECTS;
    if (levelObj.curriculum === 'kcse') return KCSE_SUBJECTS;
    if (['grade7', 'grade8', 'grade9'].includes(levelObj.v)) return CBC_JUNIOR_SUBJECTS;
    return CBC_SENIOR_SUBJECTS;
  }, [levelObj]);

  // When level changes, reset subject to first valid one
  const handleLevelChange = (newLevel: string) => {
    const lo = KENYA_LEVELS.find(l => l.v === newLevel);
    let subjs = KCSE_SUBJECTS;
    if (lo?.curriculum === 'cbc') {
      subjs = ['grade7', 'grade8', 'grade9'].includes(newLevel) ? CBC_JUNIOR_SUBJECTS : CBC_SENIOR_SUBJECTS;
    }
    setAiCfg(c => ({ ...c, level: newLevel, subject: subjs[0] }));
  };

  // Filtered table data
  const filtered = useMemo(() => {
    let items = [...d.questions];
    if (fSub) items = items.filter((q: any) => String(q.subject_id) === fSub);
    if (fType) items = items.filter((q: any) => q.question_type === fType);
    if (fDiff) items = items.filter((q: any) => q.difficulty === fDiff);
    if (search) { const s = search.toLowerCase(); items = items.filter((q: any) => q.question_text?.toLowerCase().includes(s)); }
    return items;
  }, [d.questions, fSub, fType, fDiff, search]);

  const tp = Math.max(1, Math.ceil(filtered.length / PS));
  const pag = filtered.slice((page - 1) * PS, page * PS);

  // ── AI Generation ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!aiCfg.subject) return toast.error('Select a subject');
    setAiLoading(true);
    setAiPreview([]);
    setSelected(new Set());
    setAiProgress(10);
    try {
      let all: any[] = [];
      if (aiCfg.batchMode && aiCfg.batchTypes.length > 0) {
        const perType = Math.max(1, Math.floor(aiCfg.count / aiCfg.batchTypes.length));
        for (let i = 0; i < aiCfg.batchTypes.length; i++) {
          setAiProgress(10 + Math.round((i / aiCfg.batchTypes.length) * 80));
          const qs = await callClaudeAPI(buildAIPrompt({ ...aiCfg, qType: aiCfg.batchTypes[i], count: perType, levelObj }));
          all = [...all, ...qs.map(q => ({ ...q, question_type: q.question_type || aiCfg.batchTypes[i] }))];
        }
      } else {
        const qs = await callClaudeAPI(buildAIPrompt({ ...aiCfg, levelObj }));
        all = qs;
      }
      setAiProgress(100);
      setAiPreview(all);
      toast.success(`✨ ${all.length} question${all.length !== 1 ? 's' : ''} generated!`);
    } catch (e: any) {
      toast.error('AI Error: ' + e.message);
    }
    setAiLoading(false);
  }, [aiCfg, levelObj]);

  const handleSaveToBank = async () => {
    const toSave = aiPreview.filter((_, i) => selected.size === 0 || selected.has(i));
    if (!toSave.length) return toast.error('Nothing to save');
    let saved = 0;
    for (const q of toSave) {
      const subj = d.subjects.find((s: any) =>
        s.subject_name?.toLowerCase().includes(aiCfg.subject.split(' ')[0].toLowerCase())
      ) || d.subjects[0];
      const payload: any = {
        subject_id: subj?.id || 1,
        topic_id: null, form_id: null,
        question_text: q.question_text,
        question_type: q.question_type || aiCfg.qType,
        difficulty: q.difficulty || aiCfg.difficulty,
        marks: q.marks || aiCfg.marks,
        correct_answer: q.correct_answer || null,
        explanation: q.explanation || null,
        blooms_level: q.blooms_level || aiCfg.blooms || null,
        marking_scheme: q.marking_scheme || null,
        calculation_steps: q.calculation_steps || null,
        is_approved: false, approval_status: 'pending',
        source: 'ai_generated', created_by: 'ai',
        metadata: JSON.stringify({
          level: aiCfg.level, curriculum: levelObj?.curriculum,
          topic: q.topic_hint || aiCfg.topic,
          model_answer: q.model_answer || '',
          options: q.options || [],
          structured_parts: q.structured_parts || [],
          cbc_competencies: q.cbc_competencies || [],
          rubric: q.rubric || '',
        }),
      };
      if (q.question_type === 'multiple_choice' && q.options?.length) payload.options = q.options;
      const { error } = await supabase.from('school_question_bank').insert([payload]);
      if (!error) saved++;
    }
    toast.success(`💾 Saved ${saved}/${toSave.length} to Question Bank!`);
    setAiPreview([]); setSelected(new Set()); setShowAI(false); d.fetchAll();
  };

  // ── Manual CRUD ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setForm({ subject_id: d.subjects[0]?.id || 0, topic_id: 0, question_text: '', question_type: 'multiple_choice', difficulty: 'medium', marks: 1, correct_answer: '', explanation: '', blooms_level: '', marking_scheme: '', calculation_steps: '', is_approved: true });
    setMcqOpts([{ k: 'A', v: '' }, { k: 'B', v: '' }, { k: 'C', v: '' }, { k: 'D', v: '' }]);
    setShowModal(true);
  };
  const openEdit = (q: any) => {
    setEditItem(q);
    setForm({ ...q });
    if (q.question_type === 'multiple_choice' && q.options) {
      try {
        const o = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        setMcqOpts(Array.isArray(o) ? o.map((x: any) => ({ k: x.key || x.k || '', v: x.text || x.value || x.v || '' })) : [{ k: 'A', v: '' }, { k: 'B', v: '' }, { k: 'C', v: '' }, { k: 'D', v: '' }]);
      } catch { setMcqOpts([{ k: 'A', v: '' }, { k: 'B', v: '' }, { k: 'C', v: '' }, { k: 'D', v: '' }]); }
    }
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.question_text.trim() || !form.subject_id) return toast.error('Question text & subject required');
    const p: any = { subject_id: form.subject_id, topic_id: form.topic_id || null, question_text: form.question_text.trim(), question_type: form.question_type, difficulty: form.difficulty, marks: form.marks, correct_answer: form.correct_answer || null, explanation: form.explanation || null, blooms_level: form.blooms_level || null, marking_scheme: form.marking_scheme || null, calculation_steps: form.calculation_steps || null, is_approved: form.is_approved, approval_status: form.is_approved ? 'approved' : 'pending', source: editItem?.source || 'manual' };
    if (form.question_type === 'multiple_choice') p.options = mcqOpts.filter(o => o.v.trim());
    let err;
    if (editItem?.id) ({ error: err } = await supabase.from('school_question_bank').update(p).eq('id', editItem.id));
    else { p.created_by = 'admin'; ({ error: err } = await supabase.from('school_question_bank').insert([p])); }
    if (err) toast.error(err.message);
    else { toast.success(editItem ? '✅ Updated' : '✅ Added'); setShowModal(false); d.fetchAll(); }
  };
  const del = async (id: number) => {
    if (!confirm('Delete this question?')) return;
    await supabase.from('school_question_bank').delete().eq('id', id);
    toast.success('Deleted'); d.fetchAll();
  };

  // ── Grouped level options for select ────────────────────────────────────
  const levelGroups = KENYA_LEVELS.reduce((acc, l) => {
    if (!acc[l.group]) acc[l.group] = [];
    acc[l.group].push(l);
    return acc;
  }, {} as Record<string, typeof KENYA_LEVELS>);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Top Bar ── */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search questions…" className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs w-52 focus:border-indigo-300 outline-none" />
          </div>
          <select value={fSub} onChange={e => { setFSub(e.target.value); setPage(1); }} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none">
            <option value="">All Subjects</option>
            {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
          <select value={fType} onChange={e => { setFType(e.target.value); setPage(1); }} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none">
            <option value="">All Types</option>
            {QT.map(t => <option key={t.v} value={t.v}>{t.e} {t.l}</option>)}
          </select>
          <select value={fDiff} onChange={e => { setFDiff(e.target.value); setPage(1); }} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none">
            <option value="">All Difficulty</option>
            {DIFF.map(df => <option key={df.v} value={df.v}>{df.l}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={d.fetchAll} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 transition"><FiRefreshCw size={14} /></button>
          <button onClick={() => { setShowAI(!showAI); setAiPreview([]); }}
            className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <FiZap size={13} /> 🇰🇪 AI Generator
          </button>
          <button onClick={openAdd} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
            <FiPlus size={13} /> Add Manual
          </button>
        </div>
      </div>

      {/* ── AI Panel ── */}
      {showAI && (
        <div className="rounded-2xl border border-purple-700/30 shadow-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0a2e,#1e1040,#0d1a3a)' }}>
          {/* Header */}
          <div className="px-5 py-3 flex items-center gap-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>🇰🇪</div>
            <div>
              <h3 className="text-sm font-bold text-white">Kenya AI Question Generator</h3>
              <p className="text-[10px] text-purple-300">KCSE Form 2/3/4 · CBC Grade 7–12 · Powered by Claude AI · Beats Zeraki & EduTech Kenya</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Row 1: Level + Subject + Topic + Count */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">📚 Class Level</label>
                <select value={aiCfg.level} onChange={e => handleLevelChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {Object.entries(levelGroups).map(([group, levels]) => (
                    <optgroup key={group} label={group}>
                      {levels.map(l => <option key={l.v} value={l.v} style={{ background: '#1e1b4b' }}>{l.l}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">📖 Subject</label>
                <select value={aiCfg.subject} onChange={e => setAiCfg(c => ({ ...c, subject: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {subjectsForLevel.map(s => <option key={s} value={s} style={{ background: '#1e1b4b' }}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">🎯 Topic / Strand</label>
                <input value={aiCfg.topic} onChange={e => setAiCfg(c => ({ ...c, topic: e.target.value }))}
                  placeholder={levelObj?.curriculum === 'cbc' ? 'e.g. Numbers & Algebra' : 'e.g. Photosynthesis'}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-purple-500 outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">🔢 Quantity</label>
                <select value={aiCfg.count} onChange={e => setAiCfg(c => ({ ...c, count: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {[1, 3, 5, 8, 10, 15, 20].map(n => <option key={n} value={n} style={{ background: '#1e1b4b' }}>{n} question{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Type + Difficulty + Bloom's + Marks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">📋 Question Type</label>
                <select value={aiCfg.qType} onChange={e => setAiCfg(c => ({ ...c, qType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {QT.filter(t => levelObj?.curriculum === 'kcse' ? t.v !== 'cbc_project' : true)
                    .map(t => <option key={t.v} value={t.v} style={{ background: '#1e1b4b' }}>{t.e} {t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">⚡ Difficulty</label>
                <select value={aiCfg.difficulty} onChange={e => setAiCfg(c => ({ ...c, difficulty: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {DIFF.map(df => <option key={df.v} value={df.v} style={{ background: '#1e1b4b' }}>{df.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">🧠 Bloom's Level</label>
                <select value={aiCfg.blooms} onChange={e => setAiCfg(c => ({ ...c, blooms: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {BLOOMS.map(b => <option key={b.v} value={b.v} style={{ background: '#1e1b4b' }}>{b.e} {b.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">🏆 Marks Each</label>
                <select value={aiCfg.marks} onChange={e => setAiCfg(c => ({ ...c, marks: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white outline-none border border-white/20 focus:border-purple-400"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => <option key={n} value={n} style={{ background: '#1e1b4b' }}>{n} mark{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            {/* Context hint */}
            <div>
              <label className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5 block">💡 Specific Focus (optional)</label>
              <input value={aiCfg.contextHint} onChange={e => setAiCfg(c => ({ ...c, contextHint: e.target.value }))}
                placeholder="e.g. 'Focus on ecosystem food chains with Kenyan examples' or 'KCSE 2023-style profit & loss calculations'"
                className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-purple-500 outline-none border border-white/20 focus:border-purple-400"
                style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Batch Mode */}
            <div className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="batchMode" checked={aiCfg.batchMode} onChange={e => setAiCfg(c => ({ ...c, batchMode: e.target.checked, batchTypes: [] }))} className="w-4 h-4 rounded accent-purple-500" />
                <label htmlFor="batchMode" className="text-xs text-purple-200 font-bold cursor-pointer">🚀 MEGA BATCH MODE — Generate multiple question types simultaneously</label>
              </div>
              {aiCfg.batchMode && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {QT.filter(t => levelObj?.curriculum === 'kcse' ? t.v !== 'cbc_project' : true).map(t => (
                    <button key={t.v} onClick={() => {
                      const bt = aiCfg.batchTypes.includes(t.v) ? aiCfg.batchTypes.filter(x => x !== t.v) : [...aiCfg.batchTypes, t.v];
                      setAiCfg(c => ({ ...c, batchTypes: bt }));
                    }} className="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                      style={aiCfg.batchTypes.includes(t.v) ? { background: t.color, color: '#fff', borderColor: t.color } : { color: '#c4b5fd', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}>
                      {t.e} {t.l}
                    </button>
                  ))}
                  {aiCfg.batchTypes.length > 0 && <span className="text-[10px] text-purple-400 self-center ml-1">Will generate ~{Math.max(1, Math.floor(aiCfg.count / aiCfg.batchTypes.length))} of each type</span>}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button onClick={handleGenerate} disabled={aiLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444,#ec4899,#8b5cf6)' }}>
              {aiLoading
                ? <><FiLoader size={16} className="animate-spin" /> Generating for {levelObj?.l}… {aiProgress}%</>
                : <><FiZap size={16} /> Generate {aiCfg.batchMode && aiCfg.batchTypes.length ? `${aiCfg.batchTypes.length} Types ×` : aiCfg.count} Premium {levelObj?.l} Questions</>}
            </button>

            {aiLoading && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${aiProgress}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444,#ec4899)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI Preview ── */}
      {aiPreview.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-xl overflow-hidden">
          {/* Preview header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
            <div>
              <h3 className="text-sm font-bold text-white">✨ {aiPreview.length} AI-Generated Questions — Ready to Review</h3>
              <p className="text-[10px] text-indigo-300">Click any question to expand full answer & marking scheme · Save selected to Question Bank</p>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setSelected(new Set(aiPreview.map((_, i) => i)))} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30">All</button>
              <button onClick={() => setSelected(new Set())} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20">None</button>
              <button onClick={handleSaveToBank}
                className="text-xs font-bold px-4 py-2 rounded-xl text-white flex items-center gap-1.5 shadow"
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                <FiDownload size={12} /> Save {selected.size > 0 ? selected.size : aiPreview.length} to Bank
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {aiPreview.map((q, i) => {
              const qt = QT.find(t => t.v === q.question_type) || QT[0];
              const df = DIFF.find(d => d.v === q.difficulty) || DIFF[1];
              const bl = BLOOMS.find(b => b.v === q.blooms_level);
              const isExpanded = !!expanded[i];
              const isSelected = selected.has(i);

              return (
                <div key={i} className={`p-4 transition-all ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}`}>
                  <div className="flex gap-3">
                    {/* Select checkbox */}
                    <button onClick={() => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); }}
                      className={`w-5 h-5 mt-1 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                      {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: qt.color }}>{qt.e} {qt.l}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: df.b, color: df.c, borderColor: df.border }}>{q.difficulty}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{q.marks} mk{q.marks !== 1 ? 's' : ''}</span>
                        {bl && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{bl.e} {bl.l}</span>}
                        {q.cbc_competencies?.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">🎯 CBC</span>}
                        <button onClick={() => setExpanded(e => ({ ...e, [i]: !isExpanded }))}
                          className="ml-auto text-gray-400 hover:text-indigo-600 flex items-center gap-1 text-[10px] font-bold">
                          {isExpanded ? <><FiChevronUp size={12} /> Hide</> : <><FiChevronDown size={12} /> Full Answer</>}
                        </button>
                      </div>

                      {/* Question text */}
                      <p className="text-sm font-semibold text-gray-800 leading-relaxed">{q.question_text}</p>

                      {/* MCQ Options */}
                      {q.question_type === 'multiple_choice' && q.options?.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {q.options.map((o: any, oi: number) => {
                            const key = o.key || o.k || String.fromCharCode(65 + oi);
                            const val = o.text || o.value || o.v || '';
                            const correct = q.correct_answer === key;
                            return (
                              <div key={oi} className={`px-2.5 py-1.5 rounded-lg text-[11px] flex gap-2 items-start ${correct ? 'bg-green-50 border border-green-200 font-bold text-green-800' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                <span className={`font-bold flex-shrink-0 ${correct ? 'text-green-600' : 'text-indigo-500'}`}>{key}.</span>
                                <span className="leading-relaxed">{val}</span>
                                {correct && <span className="text-green-500 ml-auto text-xs">✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
                          {q.correct_answer && q.question_type !== 'multiple_choice' && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">✅ Correct Answer</p>
                              <p className="text-xs text-green-800 leading-relaxed">{q.correct_answer}</p>
                            </div>
                          )}
                          {(q.model_answer) && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">📖 Model Answer</p>
                              <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-wrap">{q.model_answer}</p>
                            </div>
                          )}
                          {q.explanation && q.explanation !== q.model_answer && (
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">💡 Explanation</p>
                              <p className="text-xs text-indigo-800 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                            </div>
                          )}
                          {q.marking_scheme && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">📋 Marking Scheme</p>
                              <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{q.marking_scheme}</p>
                            </div>
                          )}
                          {q.calculation_steps && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">🔢 Step-by-Step Solution</p>
                              <p className="text-xs text-purple-800 leading-relaxed whitespace-pre-wrap font-mono">{q.calculation_steps}</p>
                            </div>
                          )}
                          {q.structured_parts?.length > 0 && (
                            <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl">
                              <p className="text-[10px] font-bold text-pink-700 uppercase tracking-wider mb-2">📊 Structured Parts</p>
                              <div className="space-y-2">
                                {q.structured_parts.map((part: any, pi: number) => (
                                  <div key={pi} className="text-xs">
                                    <span className="font-bold text-pink-700">({part.part || String.fromCharCode(97 + pi)})</span>
                                    {part.question && <span className="text-pink-900 ml-1">{part.question}</span>}
                                    {part.answer && <p className="text-pink-800 mt-1 ml-4 leading-relaxed">{part.answer}</p>}
                                    {part.marks && <span className="text-[10px] text-pink-600 font-bold ml-4">[{part.marks} mark{part.marks > 1 ? 's' : ''}]</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {q.rubric && (
                            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                              <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">🎯 CBC Assessment Rubric</p>
                              <p className="text-xs text-teal-800 whitespace-pre-wrap leading-relaxed">{q.rubric}</p>
                            </div>
                          )}
                          {q.cbc_competencies?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[10px] text-gray-500 font-bold">Competencies:</span>
                              {q.cbc_competencies.map((c: string, ci: number) => (
                                <span key={ci} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
            <p className="text-xs text-gray-500">{selected.size > 0 ? `${selected.size} of ${aiPreview.length} selected` : `All ${aiPreview.length} will be saved`}</p>
            <div className="flex gap-2">
              <button onClick={() => { setAiPreview([]); setSelected(new Set()); }} className="px-4 py-2 text-xs font-bold text-gray-500 rounded-xl border border-gray-200 hover:bg-gray-100">Discard All</button>
              <button onClick={handleSaveToBank} className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                <FiSave size={12} /> Save {selected.size > 0 ? selected.size : aiPreview.length} Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Questions Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                {[
                  { l: '#', bg: '#f5f3ff', c: '#6d28d9' },
                  { l: 'Question', bg: '#eef2ff', c: '#4338ca' },
                  { l: 'Subject', bg: '#f0fdfa', c: '#0f766e' },
                  { l: 'Type', bg: '#faf5ff', c: '#7c3aed' },
                  { l: 'Diff', bg: '#fffbeb', c: '#b45309' },
                  { l: 'Marks', bg: '#f0fdf4', c: '#15803d' },
                  { l: "Bloom's", bg: '#eff6ff', c: '#1d4ed8' },
                  { l: 'Source', bg: '#fdf2f8', c: '#9d174d' },
                  { l: 'Status', bg: '#ecfdf5', c: '#059669' },
                  { l: '⚙️', bg: '#f5f3ff', c: '#6d28d9' },
                ].map((h, i) => (
                  <th key={i} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ background: h.bg, color: h.c, borderBottom: `2px solid ${h.c}30` }}>{h.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pag.map((q: any, idx: number) => {
                const di = DIFF.find(df => df.v === q.difficulty) || DIFF[1];
                const ti = QT.find(t => t.v === q.question_type);
                const bl = BLOOMS.find(b => b.v === q.blooms_level);
                return (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-3 py-2 text-center font-bold text-purple-700">{(page - 1) * PS + idx + 1}</td>
                    <td className="px-3 py-2 max-w-[280px]">
                      <p className="font-semibold text-gray-800 truncate">{q.question_text}</p>
                      {q.source === 'ai_generated' && (() => {
                        try {
                          const m = q.metadata ? (typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata) : null;
                          return m?.topic ? <span className="text-[10px] text-gray-400">📌 {m.topic}</span> : null;
                        } catch { return null; }
                      })()}
                    </td>
                    <td className="px-3 py-2 font-semibold text-teal-700 whitespace-nowrap">{d.getSubjectName(q.subject_id)}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                        style={{ background: ti?.color || '#6366f1' }}>{ti?.e} {ti?.l}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{ background: di.b, color: di.c, borderColor: di.border }}>{q.difficulty}</span>
                    </td>
                    <td className="px-3 py-2 text-center font-extrabold text-green-700">{q.marks}</td>
                    <td className="px-3 py-2">{bl ? <span className="text-[10px] font-bold text-blue-700 whitespace-nowrap">{bl.e} {bl.l}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${q.source === 'ai_generated' ? 'bg-cyan-50 text-cyan-700' : 'bg-gray-50 text-gray-500'}`}>
                        {q.source === 'ai_generated' ? '🤖 AI' : '✍️ Manual'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${q.is_approved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {q.is_approved ? '✅' : '⏳'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:scale-110 transition"><FiEdit2 size={11} /></button>
                        <button onClick={() => del(q.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:scale-110 transition"><FiTrash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-14">
            <FiBook size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">No questions yet</p>
            <p className="text-gray-300 text-xs mt-1">Click "AI Generator" to create premium Kenya exam questions instantly!</p>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {filtered.length > PS && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-gray-400">{Math.min((page - 1) * PS + 1, filtered.length)}–{Math.min(page * PS, filtered.length)} of {filtered.length}</p>
          <div className="flex gap-1">
            {Array.from({ length: tp }, (_, i) => i + 1)
              .filter(p => p === 1 || p === tp || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {i > 0 && arr[i - 1] < p - 1 && <span className="text-gray-300 text-xs px-1">…</span>}
                  <button onClick={() => setPage(p)} className={`min-w-[28px] h-7 rounded-lg text-xs font-bold ${page === p ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* ── Manual Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: editItem ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#059669,#0d9488)' }}>
              <div>
                <h2 className="text-sm font-bold text-white">{editItem ? '✏️ Edit' : '🆕 Add'} Question</h2>
                <p className="text-[10px] text-white/70">KCSE Form 2/3/4 · CBC Grade 7–12</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg bg-white/20 text-white"><FiX size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Subject *</label>
                  <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
                    {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Topic</label>
                  <select value={form.topic_id} onChange={e => setForm({ ...form, topic_id: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
                    <option value={0}>— None —</option>
                    {d.topics.filter((t: any) => t.subject_id === form.subject_id).map((t: any) => <option key={t.id} value={t.id}>{t.topic_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Type</label>
                  <select value={form.question_type} onChange={e => setForm({ ...form, question_type: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
                    {QT.map(t => <option key={t.v} value={t.v}>{t.e} {t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
                    {DIFF.map(df => <option key={df.v} value={df.v}>{df.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Marks</label>
                  <input type="number" min={1} value={form.marks} onChange={e => setForm({ ...form, marks: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Bloom's Level</label>
                  <select value={form.blooms_level} onChange={e => setForm({ ...form, blooms_level: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
                    <option value="">— None —</option>
                    {BLOOMS.map(b => <option key={b.v} value={b.v}>{b.e} {b.l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Question Text *</label>
                <textarea rows={3} value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
              </div>
              {form.question_type === 'multiple_choice' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">MCQ Options</label>
                  {mcqOpts.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#6366f1' }}>{o.k}</span>
                      <input value={o.v} onChange={e => { const n = [...mcqOpts]; n[i] = { ...n[i], v: e.target.value }; setMcqOpts(n); }} className="flex-1 px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" placeholder={`Option ${o.k}`} />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Correct Answer</label>
                <input value={form.correct_answer} onChange={e => setForm({ ...form, correct_answer: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" placeholder="e.g. A, True, or full answer" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Explanation</label>
                <textarea rows={2} value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Marking Scheme</label>
                <textarea rows={3} value={form.marking_scheme} onChange={e => setForm({ ...form, marking_scheme: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none" placeholder={"• Point 1 — 1 mark\n• Point 2 — 1 mark\n• Conclusion — 1 mark"} />
              </div>
              {form.question_type === 'calculation' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Calculation Steps</label>
                  <textarea rows={3} value={form.calculation_steps} onChange={e => setForm({ ...form, calculation_steps: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 resize-none font-mono" placeholder={"Step 1: Formula\nStep 2: Substitute values\nStep 3: Final answer"} />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_approved} onChange={e => setForm({ ...form, is_approved: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700 font-medium">Mark as Approved</span>
              </label>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 rounded-xl border border-gray-200">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5"
                style={{ background: editItem ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#059669,#0d9488)' }}>
                <FiSave size={13} /> {editItem ? 'Update' : 'Save'} Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
