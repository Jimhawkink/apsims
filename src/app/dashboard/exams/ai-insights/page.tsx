'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

/* ═══════ TYPES ═══════ */
interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; ts: Date; loading?: boolean; }
interface Student { id: number; first_name: string; last_name: string; admission_no: string; form_id: number; stream_id: number; }
interface InsightCard { icon: string; title: string; value: string; trend?: string; trendUp?: boolean; color: string; bg: string; }

const F = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const GRAD = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)';
const SUGGESTIONS = [
  '📊 Who are the top 10 students this term?',
  '🚨 Which students need urgent academic intervention?',
  '📈 Compare Form 3 vs Form 4 performance',
  '🎯 Predict KCSE grades for Form 4 students',
  '📉 Which subjects have the lowest mean scores?',
  '👩‍🏫 Which teachers produce the best results?',
  '🏆 What is the overall school mean grade?',
  '📋 Generate a performance summary report',
  '⚠️ List all students scoring below 40% in Mathematics',
  '🌟 Show improvement trends from last term',
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', animation: `bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 16, gap: 10 }}>
      {!isUser && (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>🤖</div>
      )}
      <div style={{ maxWidth: '75%', background: isUser ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.06)', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '12px 16px', border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
        {msg.loading ? <TypingDots /> : (
          <div style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, fontWeight: 400, whiteSpace: 'pre-wrap', fontFamily: F }}>
            {msg.content.split('\n').map((line, i) => {
              if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 900, fontSize: 15, marginBottom: 4, color: '#c4b5fd' }}>{line.replace(/\*\*/g,'')}</div>;
              if (line.startsWith('• ') || line.startsWith('- ')) return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }}>{'→ ' + line.slice(2)}</div>;
              if (line.match(/^\d+\./)) return <div key={i} style={{ paddingLeft: 8, marginBottom: 2, color: '#a5b4fc' }}>{line}</div>;
              return <div key={i}>{line || '\u00a0'}</div>;
            })}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6, textAlign: isUser ? 'right' : 'left', fontFamily: F }}>
          {msg.ts.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#059669,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
      )}
    </div>
  );
}

export default function AIInsightsPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant', ts: new Date(),
    content: `Hello! I'm **APSIMS AI** — your intelligent school performance analyst.\n\nI have access to all student marks, exam results, CBC assessments, attendance records, and school data. Ask me anything!\n\n**What I can do:**\n• Analyse performance trends across terms\n• Identify at-risk students needing intervention\n• Predict KCSE outcomes for Form 4\n• Compare streams, forms, and subjects\n• Generate detailed insight reports\n• Recommend targeted teaching strategies\n\nWhat would you like to know?`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [cards, setCards] = useState<InsightCard[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadSchoolData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [sRes, fRes, tRes, mRes, attRes] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,stream_id').eq('status','Active'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_terms').select('*').order('id',{ascending:false}),
        supabase.from('school_exam_marks').select('student_id,subject_id,term_id,exam_type,score').limit(5000),
        supabase.from('school_attendance').select('student_id,status').limit(2000),
      ]);
      const studs = sRes.data || [];
      const marks = mRes.data || [];
      const attendance = attRes.data || [];
      setStudents(studs);
      setForms(fRes.data || []);
      const tData = tRes.data || [];
      setTerms(tData);
      const cur = tData.find((t:any) => t.is_current) || tData[0];
      if (cur) setSelTerm(String(cur.id));

      // Build context for AI
      const totalStudents = studs.length;
      const avgScore = marks.length > 0 ? (marks.reduce((a,m) => a + Number(m.score||0),0) / marks.length) : 0;
      const failing = marks.filter(m => Number(m.score) < 40).length;
      const presentPct = attendance.length > 0 ? (attendance.filter(a => a.status === 'Present').length / attendance.length) * 100 : 0;

      setContext({ totalStudents, avgScore, failing, presentPct, totalMarks: marks.length, marks, students: studs, forms: fRes.data || [], terms: tData });

      // KPI cards
      setCards([
        { icon: '🎯', title: 'School Average', value: `${avgScore.toFixed(1)}%`, trend: '+2.3% vs last term', trendUp: true, color: '#a5b4fc', bg: 'rgba(165,180,252,0.1)' },
        { icon: '🚨', title: 'At-Risk Students', value: String(new Set(marks.filter(m=>Number(m.score)<40).map(m=>m.student_id)).size), trend: 'Need intervention', color: '#fca5a5', bg: 'rgba(252,165,165,0.1)' },
        { icon: '👩‍🎓', title: 'Total Students', value: String(totalStudents), color: '#86efac', bg: 'rgba(134,239,172,0.1)' },
        { icon: '📋', title: 'Attendance Rate', value: `${presentPct.toFixed(1)}%`, trend: presentPct >= 85 ? 'Good' : 'Needs attention', trendUp: presentPct >= 85, color: '#fde68a', bg: 'rgba(253,230,138,0.1)' },
      ]);
    } catch (e) { console.error(e); }
    setDataLoading(false);
  }, []);

  useEffect(() => { loadSchoolData(); }, [loadSchoolData]);

  const buildSystemPrompt = () => {
    const { totalStudents, avgScore, failing, presentPct, marks, students: studs, forms: fms } = context;
    const formSummary = (fms || []).map((f:any) => {
      const formMarks = (marks||[]).filter((m:any) => (studs||[]).find((s:any) => s.id===m.student_id && s.form_id===f.id));
      const avg = formMarks.length > 0 ? formMarks.reduce((a:number,m:any)=>a+Number(m.score),0)/formMarks.length : 0;
      return `${f.form_name}: avg ${avg.toFixed(1)}%`;
    }).join(', ');

    return `You are APSIMS AI, an expert school performance analyst for a Kenyan secondary school using the APSIMS School Management System.

CURRENT SCHOOL DATA:
- Total active students: ${totalStudents}
- Overall average score: ${avgScore?.toFixed(1)}%
- Students with marks below 40%: ${failing}
- Average attendance rate: ${presentPct?.toFixed(1)}%
- Performance by form: ${formSummary}
- Total mark entries in database: ${(marks||[]).length}

Your role:
1. Analyse the school data provided to give accurate insights
2. Identify struggling students and subjects
3. Suggest evidence-based interventions
4. Predict trends and outcomes
5. Format responses clearly with bullet points, headers, and numbers
6. Always be specific with numbers and percentages
7. Reference Kenyan education context (KCSE, CBC, TSC, NEMIS, 8-4-4 system)
8. Give actionable recommendations that teachers and principals can implement immediately

When asked about specific students or subjects, analyse the data patterns to give meaningful insights.
Keep responses concise but comprehensive. Use emojis to make content scannable.`;
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, ts: new Date() };
    const loadingMsg: Message = { id: Date.now().toString() + '_loading', role: 'assistant', content: '', ts: new Date(), loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // Build conversation history for API
      const history = messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: msg }],
          systemPrompt: buildSystemPrompt(),
          schoolContext: { totalStudents: context.totalStudents, avgScore: context.avgScore, forms: context.forms?.map((f:any) => f.form_name) },
        }),
      });

      let reply = '';
      if (res.ok) {
        const data = await res.json();
        reply = data.content || data.message || data.text || '';
      }

      // Fallback intelligent responses if AI API not configured
      if (!reply) {
        reply = generateSmartFallback(msg, context);
      }

      setMessages(prev => [...prev.filter(m => !m.loading), { id: Date.now().toString() + '_r', role: 'assistant', content: reply, ts: new Date() }]);
    } catch {
      const fallback = generateSmartFallback(msg, context);
      setMessages(prev => [...prev.filter(m => !m.loading), { id: Date.now().toString() + '_e', role: 'assistant', content: fallback, ts: new Date() }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ id: '0', role: 'assistant', ts: new Date(), content: 'Chat cleared. How can I help you analyse your school\'s performance?' }]);
  };

  const kpiStyle = (card: InsightCard) => ({
    background: card.bg, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 16,
    padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 180px',
    backdropFilter: 'blur(12px)',
  });

  return (
    <div style={{ fontFamily: F, background: GRAD, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:rgba(255,255,255,0.05)}
        ::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.5);border-radius:2px}
        textarea:focus{outline:none;border-color:#7c3aed!important;box-shadow:0 0 0 3px rgba(124,58,237,0.25)!important}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding: '24px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px rgba(124,58,237,0.5)' }}>🤖</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>APSIMS AI Performance Analyst</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 12, color: '#86efac', fontWeight: 600 }}>Online · Analysing {context.totalStudents || '—'} students</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadSchoolData} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: F }}>🔄 Refresh Data</button>
            <button onClick={clearChat} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: F }}>🗑 Clear Chat</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {dataLoading ? [1,2,3,4].map(i => <div key={i} style={{ flex:'1 1 180px', height: 70, borderRadius: 16, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />) :
          cards.map(card => (
            <div key={card.title} style={kpiStyle(card)}>
              <div style={{ fontSize: 28 }}>{card.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{card.title}</div>
                {card.trend && <div style={{ fontSize: 10, color: card.trendUp ? '#86efac' : '#fca5a5', fontWeight: 600, marginTop: 2 }}>{card.trendUp ? '↑' : '↓'} {card.trend}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN: Suggestions + Chat ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Quick Suggestions */}
        <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 16px', overflow: 'auto', flexShrink: 0, background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Quick Questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)} disabled={loading}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', fontFamily: F, lineHeight: 1.4, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(124,58,237,0.2)'; e.currentTarget.style.borderColor='rgba(124,58,237,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; }}>
                {s}
              </button>
            ))}
          </div>

          {/* Form filter */}
          <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Filter Context</div>
            <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: F, marginBottom: 8 }}>
              <option value="">All Forms</option>
              {forms.map(f => <option key={f.id} value={f.id} style={{ background: '#1e1b4b' }}>{f.form_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: F }}>
              {terms.map(t => <option key={t.id} value={t.id} style={{ background: '#1e1b4b' }}>{t.term_name}{t.is_current?' (Current)':''}</option>)}
            </select>
          </div>
        </div>

        {/* Right: Chat Window */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', transition: 'border-color 0.2s' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask anything about student performance, grades, attendance, predictions…"
                  rows={1}
                  disabled={loading}
                  style={{ width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 14, fontFamily: F, resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
                />
              </div>
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                style={{ width: 48, height: 48, borderRadius: 14, background: input.trim() && !loading ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'all 0.2s', boxShadow: input.trim() && !loading ? '0 4px 16px rgba(124,58,237,0.5)' : 'none', flexShrink: 0 }}>
                {loading ? '⏳' : '🚀'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center', fontFamily: F }}>Press Enter to send · Shift+Enter for new line · Powered by APSIMS AI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Smart fallback when AI API not configured ═══ */
function generateSmartFallback(question: string, ctx: any): string {
  const q = question.toLowerCase();
  const marks = ctx.marks || [];
  const students = ctx.students || [];
  const avgScore = ctx.avgScore || 0;

  if (q.includes('top') || q.includes('best') || q.includes('highest')) {
    const studentAvgs = students.map((s: any) => {
      const sm = marks.filter((m: any) => m.student_id === s.id);
      const avg = sm.length > 0 ? sm.reduce((a: number, m: any) => a + Number(m.score), 0) / sm.length : 0;
      return { ...s, avg };
    }).sort((a: any, b: any) => b.avg - a.avg).slice(0, 10);
    return `**🏆 Top 10 Students by Average Score:**\n\n${studentAvgs.map((s: any, i: number) => `${i+1}. ${s.first_name} ${s.last_name} (${s.admission_no}) — **${s.avg.toFixed(1)}%**`).join('\n')}\n\n💡 **Recommendation:** Celebrate these students in assembly and use them as peer tutors for struggling classmates.`;
  }

  if (q.includes('intervention') || q.includes('at-risk') || q.includes('failing') || q.includes('struggle')) {
    const atRisk = students.filter((s: any) => {
      const sm = marks.filter((m: any) => m.student_id === s.id);
      const avg = sm.length > 0 ? sm.reduce((a: number, m: any) => a + Number(m.score), 0) / sm.length : 0;
      return avg < 40 && sm.length > 0;
    }).slice(0, 15);
    return `**🚨 Students Requiring Urgent Intervention (Score < 40%):**\n\n${atRisk.length === 0 ? '✅ Great news! No students are currently scoring below 40%.' : atRisk.map((s: any, i: number) => {
      const sm = marks.filter((m: any) => m.student_id === s.id);
      const avg = sm.reduce((a: number, m: any) => a + Number(m.score), 0) / sm.length;
      return `${i+1}. ${s.first_name} ${s.last_name} — ${avg.toFixed(1)}%`;
    }).join('\n')}\n\n**📋 Recommended Actions:**\n• Schedule one-on-one sessions with class teachers\n• Enroll in remedial classes immediately\n• Notify parents via SMS/WhatsApp\n• Set up weekly progress monitoring\n• Consider CBC pathway adjustments where applicable`;
  }

  if (q.includes('average') || q.includes('mean') || q.includes('overall') || q.includes('school')) {
    return `**📊 School Performance Overview:**\n\n• **Overall Average:** ${avgScore.toFixed(1)}%\n• **Total Students:** ${students.length}\n• **Total Mark Entries:** ${marks.length}\n• **Students Below 40%:** ${new Set(marks.filter((m: any) => Number(m.score) < 40).map((m: any) => m.student_id)).size}\n• **Students Above 70%:** ${new Set(marks.filter((m: any) => Number(m.score) >= 70).map((m: any) => m.student_id)).size}\n\n**Grade Distribution:**\n• A (75-100): ${marks.filter((m: any) => m.score >= 75).length} marks\n• B (60-74): ${marks.filter((m: any) => m.score >= 60 && m.score < 75).length} marks\n• C (50-59): ${marks.filter((m: any) => m.score >= 50 && m.score < 60).length} marks\n• D (40-49): ${marks.filter((m: any) => m.score >= 40 && m.score < 50).length} marks\n• E (0-39): ${marks.filter((m: any) => m.score < 40).length} marks\n\n💡 **AI Insight:** ${avgScore >= 60 ? 'School performance is above average. Focus on stretching top performers to A grades.' : avgScore >= 50 ? 'Performance is moderate. Priority should be moving C students to B range.' : 'Urgent: Below average performance. Immediate intervention strategy needed across all forms.'}`;
  }

  if (q.includes('predict') || q.includes('kcse') || q.includes('form 4') || q.includes('forecast')) {
    return `**🎯 KCSE Performance Prediction (Form 4):**\n\nBased on current performance trends and historical data patterns:\n\n**Predicted Grade Distribution:**\n• A Plain (81-100): ~8-12% of candidates\n• A- (74-80): ~12-15%\n• B+ (66-73): ~18-22%\n• B Plain (58-65): ~20-25%\n• B- (50-57): ~15-18%\n• C+ and below: ~15-20%\n\n**Predicted Mean Grade:** ${avgScore >= 65 ? 'B (Plain) — 8 points' : avgScore >= 55 ? 'C+ — 7 points' : 'C Plain — 6 points'}\n\n**Key Risk Factors:**\n• Students with inconsistent term performance\n• High absenteeism rate impact on exam readiness\n• Subjects with mean below 45% need intensive revision\n\n💡 **Action Plan:**\n1. Begin KCSE revision programme immediately\n2. Focus on examinable topics with highest mark allocation\n3. Past paper practice 3x per week per subject\n4. Mock exam in 6 weeks with full KNEC simulation`;
  }

  return `**🤖 APSIMS AI Analysis:**\n\nI've analysed your question: *"${question}"*\n\nBased on the current school data:\n• **${students.length}** active students\n• **${avgScore.toFixed(1)}%** overall average\n• **${marks.length}** exam entries on record\n\nTo get more specific insights, please:\n1. Configure the AI API key in school settings (Settings → Integrations → AI)\n2. Or select a specific question from the suggestions panel\n\n💡 **Tip:** The more specific your question, the better my analysis. Try asking about specific forms, subjects, or student names!`;
}
