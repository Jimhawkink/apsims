'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiClock, FiAlertTriangle, FiCheckCircle, FiXCircle, FiSend, FiEye } from 'react-icons/fi';

interface ExamConfig {
  title: string;
  subject_id: string;
  form_id: string;
  duration_mins: number;
  question_count: number;
  difficulty: string;
  instructions: string;
}

type Phase = 'setup' | 'instructions' | 'exam' | 'results';

export default function OnlineExamPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examQs, setExamQs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [cfg, setCfg] = useState<ExamConfig>({
    title: 'KCSE Practice Exam',
    subject_id: '',
    form_id: '',
    duration_mins: 45,
    question_count: 20,
    difficulty: 'all',
    instructions: 'Read each question carefully before answering.\nAnswer all questions.\nFor MCQ, select the best answer.\nFor written questions, be clear and concise.',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    Promise.all([
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_question_bank').select('*').eq('is_approved', true),
    ]).then(([s, f, q]) => {
      setSubjects(s.data || []); setForms(f.data || []); setQuestions(q.data || []);
      setLoading(false);
    });
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exam') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleSubmit(); return 0; }
        if (prev === 300) toast('⚠️ 5 minutes remaining!', { icon: '⏰' });
        if (prev === 60) toast.error('🔴 1 minute left! Submit now!');
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startExam = useCallback(() => {
    if (!cfg.subject_id) return toast.error('Select a subject');
    let pool = questions.filter(q =>
      String(q.subject_id) === cfg.subject_id &&
      (cfg.difficulty === 'all' || q.difficulty === cfg.difficulty) &&
      (!cfg.form_id || String(q.form_id) === cfg.form_id)
    );
    if (pool.length < 3) return toast.error('Not enough approved questions for this selection. Add more questions to the question bank first.');
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(cfg.question_count, pool.length));
    setExamQs(selected);
    setAnswers({});
    setCurrentIdx(0);
    setFlagged(new Set());
    setTimeLeft(cfg.duration_mins * 60);
    setPhase('exam');
    setStarted(true);
  }, [cfg, questions]);

  const handleSubmit = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const qs = examQs;
    const ans = answers;
    const res = qs.map(q => {
      const ua = (ans[q.id] || '').toUpperCase().trim();
      const ca = (q.correct_answer || '').toUpperCase().trim();
      return { q, correct: ua === ca && ua !== '', userAns: ans[q.id] || '' };
    });
    const correctCount = res.filter(r => r.correct).length;
    const pct = Math.round((correctCount / qs.length) * 100);
    setResults(res);
    setScore(pct);
    setPhase('results');

    // Save to DB
    try {
      let studentId: number | null = null;
      if (currentUser?.id) {
        const { data: usr } = await supabase.from('school_users').select('student_id').eq('auth_user_id', currentUser.id).maybeSingle();
        studentId = usr?.student_id || null;
      }
      await supabase.from('school_student_practice').insert([{
        student_id: studentId,
        subject_id: Number(cfg.subject_id),
        total_questions: qs.length,
        correct_answers: correctCount,
        score_percent: pct,
        difficulty: cfg.difficulty === 'all' ? 'mixed' : cfg.difficulty,
        timed_mode: true,
        time_taken_secs: cfg.duration_mins * 60 - timeLeft,
        answers: JSON.stringify(ans),
        exam_title: cfg.title,
        completed_at: new Date().toISOString(),
      }]);
    } catch { /* silent */ }
  }, [examQs, answers, currentUser, cfg, timeLeft]);

  const toggleFlag = (qId: number) => {
    setFlagged(prev => { const n = new Set(prev); n.has(qId) ? n.delete(qId) : n.add(qId); return n; });
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = examQs.length > 0 ? (answeredCount / examQs.length) * 100 : 0;
  const urgentTime = timeLeft < 300;
  const currentQ = examQs[currentIdx];

  // ── SETUP PHASE ───────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: 16, padding: '20px 28px', marginBottom: 24, color: '#fff' }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🖥️ Online Timed Exam</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>Proctored · Auto-submit · Instant scoring · KCSE format</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 18 }}>⚙️ Exam Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Exam Title</label>
              <input value={cfg.title} onChange={e => setCfg(p => ({ ...p, title: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Subject *</label>
              <select value={cfg.subject_id} onChange={e => setCfg(p => ({ ...p, subject_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Form Level</label>
              <select value={cfg.form_id} onChange={e => setCfg(p => ({ ...p, form_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                <option value="">All Forms</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name || `Form ${f.form_level}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Duration</label>
              <select value={cfg.duration_mins} onChange={e => setCfg(p => ({ ...p, duration_mins: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                {[15, 20, 30, 45, 60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Questions</label>
              <input type="number" min={5} max={80} value={cfg.question_count} onChange={e => setCfg(p => ({ ...p, question_count: Number(e.target.value) }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Difficulty</label>
              <select value={cfg.difficulty} onChange={e => setCfg(p => ({ ...p, difficulty: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                <option value="all">Mixed (All levels)</option>
                <option value="easy">🟢 Easy</option>
                <option value="medium">🟡 Medium</option>
                <option value="hard">🔴 Hard (KCSE level)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Exam Instructions</label>
              <textarea value={cfg.instructions} onChange={e => setCfg(p => ({ ...p, instructions: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Available questions preview */}
          {cfg.subject_id && (
            <div style={{ marginTop: 16, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
              ✅ <b>{questions.filter(q => String(q.subject_id) === cfg.subject_id && q.is_approved).length}</b> approved questions available for this subject
            </div>
          )}

          <button onClick={() => setPhase('instructions')} disabled={!cfg.subject_id}
            style={{ marginTop: 20, background: cfg.subject_id ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : '#e2e8f0', color: cfg.subject_id ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 13, fontWeight: 800, cursor: cfg.subject_id ? 'pointer' : 'default' }}>
            Continue to Instructions →
          </button>
        </div>
      </div>
    </div>
  );

  // ── INSTRUCTIONS PHASE ────────────────────────────────────────────
  if (phase === 'instructions') return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 28 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48 }}>📝</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', margin: '8px 0 4px' }}>{cfg.title}</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>{subjects.find(s => String(s.id) === cfg.subject_id)?.subject_name} · {cfg.duration_mins} minutes · {cfg.question_count} questions</p>
          </div>

          <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#92400e', marginBottom: 8 }}>📋 Instructions</div>
            <pre style={{ fontSize: 12, color: '#78350f', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', lineHeight: 1.7 }}>{cfg.instructions}</pre>
          </div>

          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#dc2626', marginBottom: 6 }}>⚠️ Important Rules</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#991b1b', lineHeight: 1.8 }}>
              <li>The timer starts immediately when you click Start</li>
              <li>The exam auto-submits when time runs out</li>
              <li>You can flag questions and return to them later</li>
              <li>Do not refresh the page — your answers will be lost</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { icon: '⏱️', label: 'Duration', value: `${cfg.duration_mins} mins` },
              { icon: '❓', label: 'Questions', value: String(cfg.question_count) },
              { icon: '🎯', label: 'Difficulty', value: cfg.difficulty === 'all' ? 'Mixed' : cfg.difficulty },
            ].map((s, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px', textAlign: 'center', border: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setPhase('setup')} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
            <button onClick={startExam} style={{ flex: 1, background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
              🚀 START EXAM NOW
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── EXAM PHASE ────────────────────────────────────────────────────
  if (phase === 'exam' && currentQ) {
    let options: any[] = [];
    try { options = typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : (currentQ.options || []); } catch { options = []; }
    const isFlagged = flagged.has(currentQ.id);

    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Sticky exam bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#fff', flex: 1 }}>{cfg.title}</div>

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: '#10b981', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{answeredCount}/{examQs.length}</span>
          </div>

          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: urgentTime ? '#dc2626' : 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px' }}>
            <FiClock size={14} style={{ color: urgentTime ? '#fff' : '#94a3b8' }} />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(timeLeft)}</span>
          </div>

          <button onClick={() => { if (window.confirm('Submit exam now? This cannot be undone.')) handleSubmit(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
            <FiSend size={13} /> Submit
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 0, maxWidth: 1100, margin: '0 auto', padding: 20 }}>
          {/* Question area */}
          <div style={{ paddingRight: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: 24, marginBottom: 14 }}>
              {/* Question meta */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: 13, color: '#1e293b' }}>Q{currentIdx + 1}</span>
                {currentQ.difficulty && <span style={{ fontSize: 10, background: currentQ.difficulty === 'hard' ? '#fef2f2' : currentQ.difficulty === 'medium' ? '#fffbeb' : '#f0fdf4', color: currentQ.difficulty === 'hard' ? '#dc2626' : currentQ.difficulty === 'medium' ? '#d97706' : '#059669', borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>{currentQ.difficulty.toUpperCase()}</span>}
                {currentQ.marks && <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', borderRadius: 5, padding: '2px 7px', fontWeight: 700 }}>{currentQ.marks} marks</span>}
                <button onClick={() => toggleFlag(currentQ.id)} style={{ marginLeft: 'auto', background: isFlagged ? '#fef3c7' : '#f8fafc', border: `1.5px solid ${isFlagged ? '#f59e0b' : '#e2e8f0'}`, borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: isFlagged ? '#92400e' : '#94a3b8' }}>
                  🚩 {isFlagged ? 'Flagged' : 'Flag'}
                </button>
              </div>

              <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', lineHeight: 1.6, marginBottom: 18 }}>{currentQ.question_text}</p>

              {/* MCQ options */}
              {Array.isArray(options) && options.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {options.map((o: any, oi: number) => {
                    const key = o.key || o.label || String.fromCharCode(65 + oi);
                    const val = o.value || o.text || String(o);
                    const selected = answers[currentQ.id] === key;
                    return (
                      <button key={key} onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: key }))}
                        style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 10, border: `2px solid ${selected ? '#7c3aed' : '#e2e8f0'}`, background: selected ? '#f5f3ff' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: selected ? 700 : 500, color: '#1e293b', transition: 'all 0.15s', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 900, color: selected ? '#7c3aed' : '#94a3b8', minWidth: 20 }}>{key}.</span>
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Written answer */}
              {(options.length === 0 || currentQ.question_type === 'short_answer' || currentQ.question_type === 'structured' || currentQ.question_type === 'essay') && (
                <textarea rows={5} placeholder="Write your answer here..."
                  value={answers[currentQ.id] || ''} onChange={e => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                  style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
              )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
                style={{ background: currentIdx === 0 ? '#f1f5f9' : '#fff', color: currentIdx === 0 ? '#94a3b8' : '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: currentIdx === 0 ? 'default' : 'pointer' }}>
                ← Previous
              </button>
              <button onClick={() => setCurrentIdx(i => Math.min(examQs.length - 1, i + 1))} disabled={currentIdx === examQs.length - 1}
                style={{ background: currentIdx === examQs.length - 1 ? '#f1f5f9' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: currentIdx === examQs.length - 1 ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 700, cursor: currentIdx === examQs.length - 1 ? 'default' : 'pointer' }}>
                Next →
              </button>
            </div>
          </div>

          {/* Question panel */}
          <div>
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 14, position: 'sticky', top: 70 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#475569', marginBottom: 10 }}>QUESTION PANEL</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                {examQs.map((q, i) => {
                  const ans = !!answers[q.id];
                  const flag = flagged.has(q.id);
                  const curr = i === currentIdx;
                  return (
                    <button key={i} onClick={() => setCurrentIdx(i)}
                      style={{ aspectRatio: '1', borderRadius: 6, border: `2px solid ${curr ? '#7c3aed' : flag ? '#f59e0b' : ans ? '#10b981' : '#e2e8f0'}`, background: curr ? '#f5f3ff' : flag ? '#fef3c7' : ans ? '#f0fdf4' : '#fff', color: curr ? '#7c3aed' : '#475569', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {flag ? '🚩' : i + 1}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: '#64748b' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 12, height: 12, background: '#f0fdf4', border: '2px solid #10b981', borderRadius: 3 }} /> Answered</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 12, height: 12, background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 3 }} /> Flagged</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 12, height: 12, background: '#fff', border: '2px solid #e2e8f0', borderRadius: 3 }} /> Not answered</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS PHASE ─────────────────────────────────────────────────
  if (phase === 'results') {
    const correct = results.filter(r => r.correct).length;
    const wrong = results.length - correct;
    const unanswered = results.filter(r => !r.userAns).length;
    const grade = score >= 75 ? 'A' : score >= 65 ? 'B+' : score >= 55 ? 'B' : score >= 45 ? 'C+' : score >= 35 ? 'C' : 'D';
    const subName = subjects.find(s => String(s.id) === cfg.subject_id)?.subject_name || '';

    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Score banner */}
          <div style={{ background: score >= 70 ? 'linear-gradient(135deg,#059669,#10b981)' : score >= 50 ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#dc2626,#ef4444)', borderRadius: 16, padding: '28px', color: '#fff', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>{cfg.title} — {subName}</div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}>{score}%</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>Grade {grade}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 16 }}>
              <div><div style={{ fontSize: 24, fontWeight: 900 }}>{correct}</div><div style={{ fontSize: 11, opacity: 0.85 }}>✅ Correct</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 900 }}>{wrong}</div><div style={{ fontSize: 11, opacity: 0.85 }}>❌ Wrong</div></div>
              {unanswered > 0 && <div><div style={{ fontSize: 24, fontWeight: 900 }}>{unanswered}</div><div style={{ fontSize: 11, opacity: 0.85 }}>⬜ Skipped</div></div>}
            </div>
          </div>

          {/* Answers review */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 20, marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>📋 Detailed Results</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {results.map((r, i) => (
                <div key={i} style={{ background: r.correct ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1.5px solid ${r.correct ? '#86efac' : '#fca5a5'}`, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {r.correct ? <FiCheckCircle size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} /> : <FiXCircle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>{i + 1}. {r.q.question_text}</p>
                      {!r.correct && (
                        <div style={{ fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <span style={{ color: '#dc2626' }}>Your answer: <b>{r.userAns || '(skipped)'}</b></span>
                          <span style={{ color: '#059669' }}>Correct: <b>{r.q.correct_answer}</b></span>
                        </div>
                      )}
                      {r.q.explanation && <div style={{ marginTop: 6, background: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#475569', borderLeft: '3px solid #7c3aed' }}>💡 {r.q.explanation}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setPhase('setup'); setResults([]); }}
              style={{ flex: 1, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              🔄 New Exam
            </button>
            <button onClick={() => window.print()}
              style={{ flex: 1, background: '#fff', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              🖨️ Print Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTop: '4px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;
  return null;
}
