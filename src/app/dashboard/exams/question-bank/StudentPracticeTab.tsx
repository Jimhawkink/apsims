'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiEdit2, FiBarChart2, FiClock, FiStar, FiAward, FiZap, FiTarget, FiTrendingUp, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const DIFFICULTY_COLORS: Record<string, string> = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };
const BADGES = [
  { id: 'first', label: '🌟 First Step', desc: 'Completed first practice', req: (s: any[]) => s.length >= 1 },
  { id: 'perfect', label: '💯 Perfect Score', desc: 'Got 100% in a session', req: (s: any[]) => s.some(x => Number(x.score_percent) === 100) },
  { id: 'streak3', label: '🔥 On Fire', desc: '3 sessions in a row ≥ 70%', req: (s: any[]) => s.slice(0, 3).length === 3 && s.slice(0, 3).every(x => Number(x.score_percent) >= 70) },
  { id: 'master', label: '🏆 Subject Master', desc: '10 sessions completed', req: (s: any[]) => s.length >= 10 },
  { id: 'speedster', label: '⚡ Speedster', desc: 'Finished a timed session', req: (s: any[]) => s.some(x => x.timed_mode) },
];

export default function StudentPracticeTab({ d }: any) {
  // ── Setup state ─────────────────────────────────────────────────────
  const [view, setView] = useState<'setup' | 'practice' | 'results'>('setup');
  const [practiceSubject, setPracticeSubject] = useState('');
  const [practiceForm, setPracticeForm] = useState('');
  const [practiceTopic, setPracticeTopic] = useState('');
  const [practiceCount, setPracticeCount] = useState(10);
  const [difficulty, setDifficulty] = useState('all');
  const [timedMode, setTimedMode] = useState(false);
  const [secsPerQ, setSecsPerQ] = useState(60);

  // ── Practice session state ────────────────────────────────────────
  const [practiceQs, setPracticeQs] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionStart, setSessionStart] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Results state ─────────────────────────────────────────────────
  const [results, setResults] = useState<{ q: any; correct: boolean; userAns: string }[]>([]);
  const [score, setScore] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'practice' || !timedMode) return;
    setTimeLeft(secsPerQ);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleNextAuto(); return secsPerQ; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, view, timedMode]);

  const handleNextAuto = useCallback(() => {
    setCurrentIdx(prev => {
      if (prev >= practiceQs.length - 1) { submitPractice(); return prev; }
      return prev + 1;
    });
  }, [practiceQs.length]); // eslint-disable-line

  // ── Begin practice ────────────────────────────────────────────────
  const beginPractice = () => {
    if (!practiceSubject) return toast.error('Select a subject');
    let pool = d.questions.filter((q: any) =>
      String(q.subject_id) === practiceSubject &&
      q.is_approved &&
      (difficulty === 'all' || q.difficulty === difficulty) &&
      (!practiceForm || String(q.form_id) === practiceForm) &&
      (!practiceTopic || String(q.topic_id) === practiceTopic)
    );
    if (pool.length === 0) return toast.error('No approved questions match your filters. Try removing some filters.');
    const selected = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(practiceCount, pool.length));
    setPracticeQs(selected);
    setAnswers({});
    setCurrentIdx(0);
    setSessionStart(Date.now());
    setView('practice');
  };

  // ── Submit practice ───────────────────────────────────────────────
  const submitPractice = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const qs = practiceQs;
    const ans = answers;
    const res = qs.map(q => {
      const userAns = (ans[q.id] || '').toUpperCase().trim();
      const correct = userAns === (q.correct_answer || '').toUpperCase().trim();
      return { q, correct, userAns };
    });
    const correctCount = res.filter(r => r.correct).length;
    const pct = qs.length > 0 ? Math.round((correctCount / qs.length) * 100) : 0;
    setResults(res);
    setScore(pct);
    setView('results');

    // ── Persist session ────
    const timeTaken = Math.round((Date.now() - sessionStart) / 1000);
    try {
      // Get student linked to logged-in user
      let studentId: number | null = null;
      if (currentUser?.id) {
        const { data: usr } = await supabase.from('school_users').select('student_id').eq('auth_user_id', currentUser.id).maybeSingle();
        studentId = usr?.student_id || null;
      }
      await supabase.from('school_student_practice').insert([{
        student_id: studentId,
        subject_id: Number(practiceSubject),
        total_questions: qs.length,
        correct_answers: correctCount,
        score_percent: pct,
        difficulty: difficulty === 'all' ? 'mixed' : difficulty,
        timed_mode: timedMode,
        time_taken_secs: timeTaken,
        answers: JSON.stringify(ans),
        completed_at: new Date().toISOString(),
      }]);
    } catch { /* silent */ }
    if (pct === 100) toast.success('🏆 Perfect score! Outstanding!');
    else if (pct >= 70) toast.success(`🎉 Great job! ${pct}%`);
    else toast(`📚 Keep practicing! ${pct}%`);
  }, [practiceQs, answers, practiceSubject, difficulty, timedMode, sessionStart, currentUser]);

  const currentQ = practiceQs[currentIdx];
  const sessions = d.practiceSessions.filter((s: any) => !subjectFilter || String(s.subject_id) === subjectFilter);
  const totalSessions = d.practiceSessions.length;
  const avgScore = totalSessions > 0 ? Math.round(d.practiceSessions.reduce((a: number, s: any) => a + Number(s.score_percent), 0) / totalSessions) : 0;
  const earnedBadges = BADGES.filter(b => b.req(d.practiceSessions));

  // ── Filtered topics for selected subject ─────────────────────────
  const filteredTopics = d.topics.filter((t: any) => !practiceSubject || String(t.subject_id) === practiceSubject);
  // ── Weak subjects ─────────────────────────────────────────────────
  const weakSubjects = d.subjects.map((s: any) => {
    const ss = d.practiceSessions.filter((p: any) => p.subject_id === s.id);
    if (ss.length === 0) return null;
    const avg = ss.reduce((a: number, x: any) => a + Number(x.score_percent), 0) / ss.length;
    return { ...s, avg: Math.round(avg), count: ss.length };
  }).filter(Boolean).sort((a: any, b: any) => a.avg - b.avg).slice(0, 3);

  // ── SETUP VIEW ────────────────────────────────────────────────────
  if (view === 'setup') return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: '🎯', label: 'Sessions', value: totalSessions },
          { icon: '📊', label: 'Avg Score', value: `${avgScore}%` },
          { icon: '🏅', label: 'Badges', value: earnedBadges.length },
          { icon: '📚', label: 'Questions', value: d.questions.filter((q: any) => q.is_approved).length },
        ].map((s, i) => (
          <div key={i} style={{ background: 'linear-gradient(135deg,#f8fafc,#fff)', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weak topics alert */}
      {weakSubjects.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#dc2626', marginBottom: 6 }}>🎯 AI Recommends — Practice These Weak Subjects:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {weakSubjects.map((s: any) => (
              <button key={s.id} onClick={() => setPracticeSubject(String(s.id))}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {s.subject_name} ({s.avg}% avg)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Setup form */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>⚙️ Configure Practice Session</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Subject *</label>
            <select value={practiceSubject} onChange={e => { setPracticeSubject(e.target.value); setPracticeTopic(''); }}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              <option value="">Select subject...</option>
              {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Form Level</label>
            <select value={practiceForm} onChange={e => setPracticeForm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              <option value="">All Forms</option>
              {d.forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name || `Form ${f.form_level}`}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Topic</label>
            <select value={practiceTopic} onChange={e => setPracticeTopic(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              <option value="">All Topics</option>
              {filteredTopics.map((t: any) => <option key={t.id} value={t.id}>{t.topic_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              <option value="all">All Levels</option>
              <option value="easy">🟢 Easy</option>
              <option value="medium">🟡 Medium</option>
              <option value="hard">🔴 Hard</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>No. of Questions</label>
            <input type="number" min={3} max={50} value={practiceCount} onChange={e => setPracticeCount(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>⏱️ Timed Mode</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
              <button onClick={() => setTimedMode(!timedMode)}
                style={{ background: timedMode ? '#7c3aed' : '#e2e8f0', color: timedMode ? '#fff' : '#475569', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {timedMode ? '✅ ON' : '⬜ OFF'}
              </button>
              {timedMode && (
                <select value={secsPerQ} onChange={e => setSecsPerQ(Number(e.target.value))}
                  style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                  <option value={30}>30s/q</option>
                  <option value={60}>1 min/q</option>
                  <option value={90}>90s/q</option>
                  <option value={120}>2 min/q</option>
                </select>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={beginPractice}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiZap size={16} /> Start Practice Session
          </button>
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#1e293b', marginBottom: 10 }}>🏅 Your Badges</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {earnedBadges.map(b => (
              <div key={b.id} title={b.desc} style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700 }}>{b.label}</div>
            ))}
          </div>
        </div>
      )}

      {/* Practice history */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}><FiBarChart2 size={14} /> Practice History</div>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} style={{ padding: '4px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
            <option value="">All Subjects</option>
            {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessions.slice(0, 15).map((s: any) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', flex: 1 }}>{d.getSubjectName(s.subject_id)}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{s.correct_answers}/{s.total_questions} correct</span>
              {s.timed_mode && <span style={{ fontSize: 9, background: '#7c3aed', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>⏱️ TIMED</span>}
              <span style={{ fontSize: 12, fontWeight: 900, color: Number(s.score_percent) >= 70 ? '#059669' : Number(s.score_percent) >= 50 ? '#d97706' : '#dc2626' }}>{s.score_percent}%</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(s.completed_at || s.created_at).toLocaleDateString('en-KE')}</span>
            </div>
          ))}
          {sessions.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '20px 0' }}>No practice sessions yet — start your first session!</p>}
        </div>
      </div>
    </div>
  );

  // ── PRACTICE VIEW ─────────────────────────────────────────────────
  if (view === 'practice' && currentQ) {
    let options: any[] = [];
    try { options = typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : (currentQ.options || []); } catch { options = []; }
    const progress = ((currentIdx + 1) / practiceQs.length) * 100;
    const isAnswered = !!answers[currentQ.id];

    return (
      <div style={{ minHeight: 400 }}>
        {/* Progress + timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>{currentIdx + 1} / {practiceQs.length}</span>
          {timedMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: timeLeft <= 10 ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${timeLeft <= 10 ? '#fca5a5' : '#86efac'}`, borderRadius: 8, padding: '4px 12px' }}>
              <FiClock size={12} style={{ color: timeLeft <= 10 ? '#dc2626' : '#059669' }} />
              <span style={{ fontSize: 12, fontWeight: 900, color: timeLeft <= 10 ? '#dc2626' : '#059669' }}>{timeLeft}s</span>
            </div>
          )}
        </div>

        {/* Question card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, background: DIFFICULTY_COLORS[currentQ.difficulty] || '#6366f1', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{currentQ.difficulty?.toUpperCase() || 'MIXED'}</span>
            <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{currentQ.question_type?.replace('_', ' ').toUpperCase()}</span>
            {currentQ.marks && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{currentQ.marks} marks</span>}
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', lineHeight: 1.5, marginBottom: 14 }}>{currentQ.question_text}</p>

          {/* MCQ options */}
          {Array.isArray(options) && options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((o: any) => {
                const key = o.key || o.label || String(o);
                const val = o.value || o.text || String(o);
                const selected = answers[currentQ.id] === key;
                return (
                  <button key={key} onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: key }))}
                    style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, border: `2px solid ${selected ? '#7c3aed' : '#e2e8f0'}`, background: selected ? '#f5f3ff' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: selected ? 700 : 500, color: '#1e293b', transition: 'all 0.15s' }}>
                    <span style={{ fontWeight: 900, color: '#7c3aed', marginRight: 8 }}>{key}.</span> {val}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short answer */}
          {(currentQ.question_type === 'short_answer' || currentQ.question_type === 'structured') && (
            <textarea rows={3} placeholder="Type your answer here..."
              value={answers[currentQ.id] || ''} onChange={e => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button onClick={() => setView('setup')}
            style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            ← Exit
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {currentIdx > 0 && (
              <button onClick={() => setCurrentIdx(i => i - 1)}
                style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                ← Prev
              </button>
            )}
            {currentIdx < practiceQs.length - 1 ? (
              <button onClick={() => setCurrentIdx(i => i + 1)} disabled={!isAnswered && timedMode === false}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={submitPractice}
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                ✅ Submit All
              </button>
            )}
          </div>
        </div>

        {/* Question mini-map */}
        <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
          {practiceQs.map((q, i) => (
            <button key={i} onClick={() => setCurrentIdx(i)}
              style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${i === currentIdx ? '#7c3aed' : '#e2e8f0'}`, background: answers[q.id] ? '#7c3aed' : i === currentIdx ? '#f5f3ff' : '#fff', color: answers[q.id] ? '#fff' : '#475569', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULTS VIEW ──────────────────────────────────────────────────
  if (view === 'results') {
    const correct = results.filter(r => r.correct).length;
    const wrong = results.length - correct;
    const grade = score >= 75 ? 'A' : score >= 65 ? 'B+' : score >= 55 ? 'B' : score >= 45 ? 'C+' : score >= 35 ? 'C' : 'D';
    const msg = score === 100 ? '🏆 PERFECT! Outstanding performance!' : score >= 80 ? '🎉 Excellent! Keep it up!' : score >= 60 ? '👍 Good work! Practice more.' : score >= 40 ? '📚 Fair. Review the wrong answers.' : '⚠️ Needs improvement. Study this topic more.';

    return (
      <div style={{ space: 16 }}>
        {/* Score card */}
        <div style={{ background: score >= 70 ? 'linear-gradient(135deg,#059669,#10b981)' : score >= 50 ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#dc2626,#ef4444)', borderRadius: 16, padding: 24, color: '#fff', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 52, fontWeight: 900 }}>{score}%</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{grade}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>{msg}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16 }}>
            <div><div style={{ fontSize: 22, fontWeight: 900 }}>{correct}</div><div style={{ fontSize: 10 }}>Correct ✅</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 900 }}>{wrong}</div><div style={{ fontSize: 10 }}>Wrong ❌</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 900 }}>{results.length}</div><div style={{ fontSize: 10 }}>Total</div></div>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 12 }}>📋 Question Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map((r, i) => (
              <div key={i} style={{ background: r.correct ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1.5px solid ${r.correct ? '#86efac' : '#fca5a5'}`, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {r.correct ? <FiCheckCircle size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} /> : <FiXCircle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: 0 }}>{i + 1}. {r.q.question_text}</p>
                    {!r.correct && (
                      <div style={{ marginTop: 6, fontSize: 11 }}>
                        <span style={{ color: '#dc2626' }}>Your answer: <b>{r.userAns || '(not answered)'}</b></span>
                        <span style={{ color: '#059669', marginLeft: 12 }}>Correct: <b>{r.q.correct_answer}</b></span>
                      </div>
                    )}
                    {r.q.explanation && (
                      <div style={{ marginTop: 6, background: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#475569', borderLeft: '3px solid #7c3aed' }}>
                        💡 <b>Explanation:</b> {r.q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setView('setup'); setPracticeQs([]); setResults([]); }}
            style={{ flex: 1, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            🔄 New Session
          </button>
          <button onClick={() => { beginPractice(); }}
            style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            🔁 Retry Same
          </button>
        </div>
      </div>
    );
  }

  return null;
}
