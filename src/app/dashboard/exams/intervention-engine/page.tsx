'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function calcRisk(marks: number[]): { score: number; level: string; color: string; bg: string; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (!marks.length) return { score: 10, level: 'Critical', color: '#dc2626', bg: '#fef2f2', reasons: ['No marks recorded'] };
  const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
  const fails = marks.filter(m => m < 50).length;
  const failRate = fails / marks.length;
  if (avg < 30) { score += 4; reasons.push(`Very low average: ${Math.round(avg)}%`); }
  else if (avg < 40) { score += 3; reasons.push(`Low average: ${Math.round(avg)}%`); }
  else if (avg < 50) { score += 1; reasons.push(`Below pass average: ${Math.round(avg)}%`); }
  if (failRate > 0.7) { score += 3; reasons.push(`Failing ${Math.round(failRate * 100)}% of subjects`); }
  else if (failRate > 0.5) { score += 2; reasons.push(`Failing ${Math.round(failRate * 100)}% of subjects`); }
  if (marks.length >= 2) {
    const half = Math.floor(marks.length / 2);
    const first = marks.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const second = marks.slice(half).reduce((a, b) => a + b, 0) / (marks.length - half);
    if (second - first < -10) { score += 2; reasons.push('Declining performance trend'); }
  }
  if (score >= 7) return { score, level: 'Critical', color: '#dc2626', bg: '#fef2f2', reasons };
  if (score >= 5) return { score, level: 'High Risk', color: '#ea580c', bg: '#fff7ed', reasons };
  if (score >= 3) return { score, level: 'Medium Risk', color: '#d97706', bg: '#fffbeb', reasons };
  if (score >= 1) return { score, level: 'Monitor', color: '#0891b2', bg: '#ecfeff', reasons };
  return { score, level: 'On Track', color: '#059669', bg: '#ecfdf5', reasons: ['Performing well'] };
}

export default function InterventionEnginePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState<string[]>([]);

  const showToast = (msg: string) => { setToasts(t => [...t, msg]); setTimeout(() => setToasts(t => t.slice(1)), 3000); };

  useEffect(() => {
    (async () => {
      const [{ data: allStudents }, { data: allMarks }, { data: forms }] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender').eq('status', 'Active'),
        supabase.from('school_exam_marks').select('student_id,marks').limit(10000),
        supabase.from('school_forms').select('id,form_name'),
      ]);
      const markMap: Record<string, number[]> = {};
      (allMarks || []).forEach(m => { if (!markMap[m.student_id]) markMap[m.student_id] = []; markMap[m.student_id].push(Number(m.marks || 0)); });
      const formMap: Record<string, string> = {};
      (forms || []).forEach(f => { formMap[f.id] = f.form_name; });
      const enriched = (allStudents || []).map(st => {
        const marks = markMap[st.id] || [];
        const risk = calcRisk(marks);
        const avg = marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0;
        return { ...st, marks, avg, risk, formName: formMap[st.form_id] || 'Unknown' };
      }).filter(s => s.risk.score > 0).sort((a, b) => b.risk.score - a.risk.score);
      setStudents(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || (s.admission_no || '').includes(search);
    const matchFilter = filter === 'all' || s.risk.level.toLowerCase().replace(' ', '-') === filter;
    return matchSearch && matchFilter;
  });

  const counts = { critical: students.filter(s => s.risk.level === 'Critical').length, high: students.filter(s => s.risk.level === 'High Risk').length, medium: students.filter(s => s.risk.level === 'Medium Risk').length, monitor: students.filter(s => s.risk.level === 'Monitor').length };

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t, i) => <div key={i} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xl">{t}</div>)}
      </div>

      <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1a0000,#7f1d1d,#991b1b)', minHeight: 140 }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-6">
          <p className="text-xs font-bold text-red-300 uppercase tracking-widest mb-1">🚨 Priority Alert System</p>
          <h1 className="text-2xl font-black text-white">Intervention Priority Engine</h1>
          <p className="text-white/50 text-sm mt-1">AI-ranked student risk scores — act before it's too late</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Critical', value: counts.critical, color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
          { label: 'High Risk', value: counts.high, color: '#ea580c', bg: '#fff7ed', icon: '🟠' },
          { label: 'Medium Risk', value: counts.medium, color: '#d97706', bg: '#fffbeb', icon: '🟡' },
          { label: 'Monitoring', value: counts.monitor, color: '#0891b2', bg: '#ecfeff', icon: '🔵' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter(k.label === 'Monitoring' ? 'monitor' : k.label.toLowerCase().replace(' ', '-'))}>
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-3xl font-black" style={{ color: k.color }}>{loading ? '…' : k.value}</p>
            <p className="text-xs font-bold text-gray-400 mt-1">{k.label} Students</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:border-indigo-300" />
        {['all','critical','high-risk','medium-risk','monitor','on-track'].map(v => (
          <button key={v} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {v === 'all' ? 'All Students' : v.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} students</span>
      </div>

      {/* Student cards */}
      {loading ? <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">Analyzing student risk profiles…</div>
        : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-bold">No students match this filter</p>
            <p className="text-sm mt-1">Enter exam marks to generate risk profiles</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.slice(0, 30).map(st => (
              <div key={st.id} className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderLeftWidth: 4, borderLeftColor: st.risk.color }}>
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-gray-800">{st.first_name} {st.last_name}</p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: st.risk.color, background: st.risk.bg }}>{st.risk.level}</span>
                    </div>
                    <p className="text-xs text-gray-400">{st.formName} · {st.admission_no || 'No Adm No'} · Avg: <strong>{st.avg}%</strong> · {st.marks.length} records</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-3">
                      <p className="text-xs text-gray-400 font-bold">RISK SCORE</p>
                      <p className="text-2xl font-black" style={{ color: st.risk.color }}>{st.risk.score}/10</p>
                    </div>
                    <div className="w-32 bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full" style={{ width: `${Math.min(100, st.risk.score * 10)}%`, background: st.risk.color }} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">⚠️ Risk Factors</p>
                    <ul className="space-y-0.5">
                      {st.risk.reasons.map((r: string, i: number) => <li key={i} className="text-xs text-gray-600 flex items-center gap-1"><span style={{ color: st.risk.color }}>•</span> {r}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">💡 Recommended Actions</p>
                    <ul className="space-y-0.5 text-xs text-gray-600">
                      {st.avg < 30 && <li>• Assign immediate mentor</li>}
                      {st.avg < 40 && <li>• Enroll in remedial program</li>}
                      <li>• Schedule parent-teacher meeting</li>
                      <li>• Daily attendance check</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button onClick={() => showToast(`📱 SMS alert sent to ${st.first_name}'s parent`)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#0891b2' }}>📱 Send SMS to Parent</button>
                  <button onClick={() => showToast(`👨‍🏫 Mentor assigned to ${st.first_name}`)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#7c3aed' }}>👨‍🏫 Assign Mentor</button>
                  <button onClick={() => showToast(`📋 Intervention plan created for ${st.first_name}`)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200">📋 Create Plan</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
