'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiShield, FiAlertTriangle, FiRefreshCw, FiLock, FiUnlock, FiClock, FiBarChart2, FiCheckCircle, FiUsers, FiAlertCircle, FiSearch } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

interface Anomaly {
    type: 'score_jump' | 'score_drop' | 'outlier_high' | 'outlier_low' | 'class_avg_drop' | 'perfect_score_cluster';
    severity: 'High' | 'Medium' | 'Low';
    student?: string; subject?: string; term?: string;
    value?: number; previous?: number; classAvg?: number;
    description: string;
}

type IntTab = 'anomalies' | 'audit' | 'lock' | 'stats';

const SEV_COLOR = (s: string) => s === 'High' ? '#dc2626' : s === 'Medium' ? '#d97706' : '#059669';
const SEV_BG   = (s: string) => s === 'High' ? '#fef2f2' : s === 'Medium' ? '#fffbeb' : '#f0fdf4';
const TYPE_ICON: Record<string, string> = { score_jump: '📈', score_drop: '📉', outlier_high: '⬆️', outlier_low: '⬇️', class_avg_drop: '📊', perfect_score_cluster: '🚨' };

export default function ExamIntegrityPage() {
    const [subjects, setSubjects]         = useState<any[]>([]);
    const [students, setStudents]         = useState<any[]>([]);
    const [marks, setMarks]               = useState<any[]>([]);
    const [terms, setTerms]               = useState<any[]>([]);
    const [forms, setForms]               = useState<any[]>([]);
    const [examTypes, setExamTypes]       = useState<any[]>([]);
    const [teachers, setTeachers]         = useState<any[]>([]);
    const [recentMarks, setRecentMarks]   = useState<any[]>([]);
    const [selForm, setSelForm]           = useState('');
    const [selTerm, setSelTerm]           = useState('');
    const [loading, setLoading]           = useState(true);
    const [filterSev, setFilterSev]       = useState('All');
    const [tab, setTab]                   = useState<IntTab>('anomalies');
    const [auditSearch, setAuditSearch]   = useState('');
    const [lockConfirm, setLockConfirm]   = useState<any>(null);
    const [locking, setLocking]           = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, tRes, fRes, etRes, tchRes, rmRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_terms').select('*').order('id', { ascending: true }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_exam_types').select('*').order('id'),
            supabase.from('school_teachers').select('id,first_name,last_name,tsc_number').eq('status', 'Active'),
            supabase.from('school_exam_marks').select('*, school_subjects(subject_name), school_students(first_name,last_name,admission_no)').order('updated_at', { ascending: false }).limit(200),
        ]);
        const allMarks = await supabase.from('school_exam_marks').select('*');
        setStudents(sRes.data || []); setSubjects(subRes.data || []);
        setTerms(tRes.data || []); setForms(fRes.data || []);
        setExamTypes(etRes.data || []); setTeachers(tchRes.data || []);
        setRecentMarks(rmRes.data || []);
        setMarks(allMarks.data || []);
        // Auto-select current term
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // ─── Anomaly Detection (unchanged from original) ───────────────────────────
    const anomalies = useMemo((): Anomaly[] => {
        const results: Anomaly[] = [];
        const filtStudents = students.filter(s => !selForm || String(s.form_id) === selForm);

        subjects.forEach(sub => {
            const studentTermScores: Record<number, Record<number, number>> = {};
            filtStudents.forEach(st => { studentTermScores[st.id] = {}; });
            marks.filter(m => m.subject_id === sub.id && filtStudents.some(s => s.id === m.student_id))
                .forEach(m => {
                    if (!studentTermScores[m.student_id]) studentTermScores[m.student_id] = {};
                    studentTermScores[m.student_id][m.term_id] = Number(m.score);
                });
            filtStudents.forEach(st => {
                const termScores = studentTermScores[st.id] || {};
                const termIds = terms.map(t => t.id).filter(id => termScores[id] !== undefined);
                for (let i = 1; i < termIds.length; i++) {
                    const prev = termScores[termIds[i - 1]];
                    const curr = termScores[termIds[i]];
                    const diff = curr - prev;
                    const termName = terms.find(t => t.id === termIds[i])?.term_name || '';
                    if (diff >= 30) results.push({ type: 'score_jump', severity: diff >= 40 ? 'High' : 'Medium', student: `${st.first_name} ${st.last_name}`, subject: sub.subject_name, term: termName, value: curr, previous: prev, description: `Score jumped +${diff.toFixed(0)} marks (${prev.toFixed(0)}% → ${curr.toFixed(0)}%) in ${sub.subject_name}` });
                    else if (diff <= -30) results.push({ type: 'score_drop', severity: diff <= -40 ? 'High' : 'Medium', student: `${st.first_name} ${st.last_name}`, subject: sub.subject_name, term: termName, value: curr, previous: prev, description: `Score dropped ${diff.toFixed(0)} marks (${prev.toFixed(0)}% → ${curr.toFixed(0)}%) in ${sub.subject_name}` });
                }
            });
            terms.forEach(term => {
                const termMarks = marks.filter(m => m.subject_id === sub.id && m.term_id === term.id && filtStudents.some(s => s.id === m.student_id));
                if (termMarks.length < 5) return;
                const scores = termMarks.map(m => Number(m.score));
                const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
                const stdDev = Math.sqrt(variance);
                termMarks.forEach(m => {
                    const score = Number(m.score);
                    const zScore = stdDev > 0 ? Math.abs((score - mean) / stdDev) : 0;
                    if (zScore >= 2.5) {
                        const st = filtStudents.find(s => s.id === m.student_id);
                        if (!st) return;
                        const isHigh = score > mean;
                        results.push({ type: isHigh ? 'outlier_high' : 'outlier_low', severity: zScore >= 3 ? 'High' : 'Medium', student: `${st.first_name} ${st.last_name}`, subject: sub.subject_name, term: term.term_name, value: score, classAvg: Math.round(mean * 10) / 10, description: `${isHigh ? '📈 Unusually high' : '📉 Unusually low'} score: ${score.toFixed(0)}% vs class avg ${mean.toFixed(1)}% (z=${zScore.toFixed(1)})` });
                    }
                });
                const perfectCount = scores.filter(s => s >= 95).length;
                if (perfectCount / scores.length > 0.20 && scores.length >= 10)
                    results.push({ type: 'perfect_score_cluster', severity: perfectCount / scores.length > 0.35 ? 'High' : 'Medium', subject: sub.subject_name, term: term.term_name, value: Math.round((perfectCount / scores.length) * 100), description: `🚨 ${perfectCount} students (${Math.round((perfectCount / scores.length) * 100)}%) scored 95%+ in ${sub.subject_name} — possible irregularity` });
                const prevTerm = terms[terms.findIndex(t => t.id === term.id) - 1];
                if (prevTerm) {
                    const prevMarks = marks.filter(m => m.subject_id === sub.id && m.term_id === prevTerm.id && filtStudents.some(s => s.id === m.student_id));
                    if (prevMarks.length >= 5) {
                        const prevMean = prevMarks.reduce((a, m) => a + Number(m.score), 0) / prevMarks.length;
                        const drop = prevMean - mean;
                        if (drop >= 15) results.push({ type: 'class_avg_drop', severity: drop >= 20 ? 'High' : 'Medium', subject: sub.subject_name, term: term.term_name, value: Math.round(mean * 10) / 10, previous: Math.round(prevMean * 10) / 10, description: `Class average dropped ${drop.toFixed(1)} marks in ${sub.subject_name} (${prevMean.toFixed(1)}% → ${mean.toFixed(1)}%) — check teaching or exam difficulty` });
                    }
                }
            });
        });
        return results.sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.severity] ?? 3) - ({ High: 0, Medium: 1, Low: 2 }[b.severity] ?? 3));
    }, [subjects, students, marks, terms, selForm]);

    const filtered = useMemo(() => filterSev === 'All' ? anomalies : anomalies.filter(a => a.severity === filterSev), [anomalies, filterSev]);
    const highCount = anomalies.filter(a => a.severity === 'High').length;
    const medCount  = anomalies.filter(a => a.severity === 'Medium').length;

    // ─── Audit Trail ──────────────────────────────────────────────────────────
    const auditFiltered = useMemo(() => {
        const q = auditSearch.toLowerCase();
        return recentMarks.filter(m => {
            const subName = m.school_subjects?.subject_name || '';
            const stName  = m.school_students ? `${m.school_students.first_name} ${m.school_students.last_name}` : '';
            return !q || subName.toLowerCase().includes(q) || stName.toLowerCase().includes(q) || String(m.exam_name || '').toLowerCase().includes(q);
        });
    }, [recentMarks, auditSearch]);

    // ─── Mark Locking ─────────────────────────────────────────────────────────
    const termExamTypes = useMemo(() => {
        if (!selTerm) return examTypes;
        return examTypes.filter(et => String(et.term_id) === selTerm);
    }, [examTypes, selTerm]);

    const handleToggleLock = async (et: any) => {
        const willLock = et.is_active; // locking = setting is_active=false
        if (willLock) { setLockConfirm(et); return; }
        // Unlocking — no confirm needed
        await doToggle(et, false);
    };

    const doToggle = async (et: any, locking: boolean) => {
        setLocking(et.id);
        const { error } = await supabase.from('school_exam_types').update({ is_active: locking ? false : true }).eq('id', et.id);
        if (error) { toast.error('Failed to update lock status'); }
        else {
            toast.success(locking ? `🔒 ${et.exam_name} locked — marks entry disabled` : `🔓 ${et.exam_name} unlocked — marks entry enabled`);
            setExamTypes(prev => prev.map(e => e.id === et.id ? { ...e, is_active: locking ? false : true } : e));
        }
        setLocking(null);
        setLockConfirm(null);
    };

    // ─── Stats ────────────────────────────────────────────────────────────────
    const completionStats = useMemo(() => {
        const termMarks = selTerm ? marks.filter(m => String(m.term_id) === selTerm) : marks;
        const total = students.length * subjects.length;
        const entered = new Set(termMarks.map(m => `${m.student_id}-${m.subject_id}`)).size;
        const bySubject = subjects.map(sub => {
            const sm = termMarks.filter(m => m.subject_id === sub.id);
            const pct = students.length > 0 ? Math.round((new Set(sm.map(m => m.student_id)).size / students.length) * 100) : 0;
            return { subject: sub.subject_name, entered: new Set(sm.map(m => m.student_id)).size, total: students.length, pct };
        }).filter(s => s.entered > 0).sort((a, b) => b.pct - a.pct);
        const byExamType = examTypes.filter(et => !selTerm || String(et.term_id) === selTerm).map(et => {
            const em = termMarks.filter(m => m.exam_name === et.exam_name || m.exam_type === et.exam_name);
            return { name: et.exam_name, count: em.length, locked: !et.is_active };
        });
        return { total, entered, completionPct: total > 0 ? Math.round((entered / total) * 100) : 0, bySubject, byExamType };
    }, [marks, students, subjects, examTypes, selTerm]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full" />
        </div>
    );

    const TABS: { key: IntTab; label: string; icon: any; badge?: number }[] = [
        { key: 'anomalies', label: 'Anomaly Detection', icon: FiAlertTriangle, badge: highCount || undefined },
        { key: 'audit',     label: 'Audit Trail',       icon: FiClock },
        { key: 'lock',      label: 'Mark Locking',      icon: FiLock },
        { key: 'stats',     label: 'Entry Stats',       icon: FiBarChart2 },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
            <Toaster position="top-right" />

            {/* ── Header ── */}
            <div style={{ background: 'linear-gradient(135deg,#991b1b,#dc2626)', borderRadius: 16, padding: '20px 28px', marginBottom: 20, color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🛡️ Exam Integrity Centre</h1>
                        <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>Anomaly detection · Audit trail · Mark locking · Entry statistics</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            <option value="" style={{ color: '#1e293b' }}>All Terms</option>
                            {terms.map((t: any) => <option key={t.id} value={t.id} style={{ color: '#1e293b' }}>{t.term_name}</option>)}
                        </select>
                        <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            <option value="" style={{ color: '#1e293b' }}>All Forms</option>
                            {forms.map((f: any) => <option key={f.id} value={f.id} style={{ color: '#1e293b' }}>{f.form_name}</option>)}
                        </select>
                        <button onClick={load} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                            <FiRefreshCw size={14} /> Scan
                        </button>
                    </div>
                </div>
                {/* Summary Pills */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Flags', value: anomalies.length, color: '#fff' },
                        { label: '🔴 High', value: highCount, color: '#fca5a5' },
                        { label: '🟡 Medium', value: medCount, color: '#fde68a' },
                        { label: 'Locked Exams', value: examTypes.filter(e => !e.is_active).length, color: '#c4b5fd' },
                        { label: 'Entry Completion', value: `${completionStats.completionPct}%`, color: '#6ee7b7' },
                    ].map((s, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', textAlign: 'center', minWidth: 90 }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, opacity: 0.9 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab Nav ── */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)} style={{
                            padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                            background: active ? '#dc2626' : '#fff',
                            color: active ? '#fff' : '#475569',
                            boxShadow: active ? '0 4px 12px rgba(220,38,38,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                            display: 'flex', alignItems: 'center', gap: 6, position: 'relative',
                        }}>
                            <Icon size={14} />{t.label}
                            {t.badge ? <span style={{ background: active ? 'rgba(255,255,255,0.3)' : '#dc2626', color: '#fff', fontSize: 10, fontWeight: 900, padding: '1px 6px', borderRadius: 99, marginLeft: 2 }}>{t.badge}</span> : null}
                        </button>
                    );
                })}
            </div>

            {/* ══════════════════ TAB 1: ANOMALIES ══════════════════ */}
            {tab === 'anomalies' && (
                <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        {['All', 'High', 'Medium', 'Low'].map(sev => (
                            <button key={sev} onClick={() => setFilterSev(sev)} style={{
                                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                background: filterSev === sev ? SEV_COLOR(sev) : '#fff',
                                color: filterSev === sev ? '#fff' : '#475569',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            }}>
                                {sev === 'All' ? `All (${anomalies.length})` : `${sev} (${anomalies.filter(a => a.severity === sev).length})`}
                            </button>
                        ))}
                    </div>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, color: '#94a3b8' }}>
                            <FiShield size={48} style={{ margin: '0 auto 12px', color: '#059669' }} />
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>✅ No anomalies detected!</div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>All scores are within normal statistical range</div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 10 }}>
                            {filtered.map((a, i) => (
                                <div key={i} style={{ background: SEV_BG(a.severity), borderRadius: 12, padding: '14px 20px', border: `1.5px solid ${SEV_COLOR(a.severity)}40`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 24, flexShrink: 0 }}>{TYPE_ICON[a.type] || '⚠️'}</div>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 3 }}>{a.description}</div>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: '#64748b' }}>
                                            {a.student && <span>👤 {a.student}</span>}
                                            {a.subject && <span>📚 {a.subject}</span>}
                                            {a.term && <span>📅 {a.term}</span>}
                                            {a.classAvg !== undefined && <span>Class avg: {a.classAvg}%</span>}
                                            {a.value !== undefined && a.previous !== undefined && <span>{a.previous}% → {a.value}%</span>}
                                        </div>
                                    </div>
                                    <span style={{ background: SEV_COLOR(a.severity), color: '#fff', fontWeight: 900, fontSize: 11, padding: '3px 10px', borderRadius: 6, flexShrink: 0 }}>
                                        {a.severity} Risk
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Detection methodology */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 12 }}>🔍 Detection Methodology</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                            {[
                                { icon: '📈', title: 'Score Jump', desc: 'Student score increases ≥30 marks between consecutive terms' },
                                { icon: '📉', title: 'Score Drop', desc: 'Student score decreases ≥30 marks between consecutive terms' },
                                { icon: '⬆️', title: 'Outlier High', desc: 'Score is ≥2.5 standard deviations above class mean' },
                                { icon: '⬇️', title: 'Outlier Low', desc: 'Score is ≥2.5 standard deviations below class mean' },
                                { icon: '📊', title: 'Class Avg Drop', desc: 'Class average drops ≥15 marks from previous term' },
                                { icon: '🚨', title: 'Perfect Cluster', desc: 'More than 20% of class scores 95%+ — possible leakage' },
                            ].map((m, i) => (
                                <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8 }}>
                                    <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: '#1e293b' }}>{m.title}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{m.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB 2: AUDIT TRAIL ══════════════════ */}
            {tab === 'audit' && (
                <div>
                    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b' }}>🕐 Mark Entry Audit Trail</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Last 200 mark entries / modifications — newest first</div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                                    placeholder="Search subject, student, exam..."
                                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', width: 240 }} />
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['#', 'Student', 'Subject', 'Exam Type', 'Score', 'Combined', 'Term', 'Entered / Updated'].map(h => (
                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditFiltered.slice(0, 100).map((m: any, i: number) => {
                                        const stName = m.school_students ? `${m.school_students.first_name} ${m.school_students.last_name}` : `Student #${m.student_id}`;
                                        const subName = m.school_subjects?.subject_name || `Subject #${m.subject_id}`;
                                        const updated = m.updated_at ? new Date(m.updated_at) : null;
                                        const created = m.created_at ? new Date(m.created_at) : null;
                                        const wasEdited = updated && created && Math.abs(updated.getTime() - created.getTime()) > 60000;
                                        const displayTime = updated || created;
                                        return (
                                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{stName}</td>
                                                <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#ede9fe', color: '#7c3aed' }}>{subName}</span></td>
                                                <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', fontWeight: 600 }}>{m.exam_name || m.exam_type || '—'}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 800, color: Number(m.score) >= 50 ? '#059669' : Number(m.score) >= 30 ? '#d97706' : '#dc2626' }}>{m.score ?? '—'}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1d4ed8' }}>{m.combined_score ?? '—'}</td>
                                                <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b' }}>{m.term_id || '—'}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ fontSize: 11, color: '#475569' }}>
                                                        {displayTime ? displayTime.toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </div>
                                                    {wasEdited && <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>✏️ Edited after creation</div>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {auditFiltered.length === 0 && (
                                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                    <FiClock size={32} style={{ margin: '0 auto 10px' }} />
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>No audit records found</div>
                                </div>
                            )}
                        </div>
                        {auditFiltered.length > 100 && (
                            <div style={{ padding: '10px 20px', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                                Showing 100 of {auditFiltered.length} records. Use search to narrow down.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB 3: MARK LOCKING ══════════════════ */}
            {tab === 'lock' && (
                <div>
                    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
                            <div style={{ fontWeight: 900, fontSize: 15, color: '#991b1b' }}>🔒 Mark Entry Lock / Unlock</div>
                            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                                Locking an exam type disables it from the mark entry dropdown. Use this after results are finalised to prevent further changes.
                            </div>
                        </div>
                        {termExamTypes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                <FiLock size={32} style={{ margin: '0 auto 10px' }} />
                                <div>No exam types found for selected term</div>
                            </div>
                        ) : (
                            <div style={{ padding: 20, display: 'grid', gap: 10 }}>
                                {termExamTypes.map((et: any) => {
                                    const isLocked = !et.is_active;
                                    const entryCount = marks.filter(m => (m.exam_name === et.exam_name || m.exam_type === et.exam_name) && (!selTerm || String(m.term_id) === selTerm)).length;
                                    return (
                                        <div key={et.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: `2px solid ${isLocked ? '#fecaca' : '#d1fae5'}`, background: isLocked ? '#fff7f7' : '#f0fdf4', flexWrap: 'wrap', gap: 10 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 18 }}>{isLocked ? '🔒' : '🔓'}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{et.exam_name}</div>
                                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                                            Weight: <strong>{et.weight}%</strong> · Max: <strong>{et.max_score || 100}</strong> · {entryCount} mark entries
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, background: isLocked ? '#fecaca' : '#bbf7d0', color: isLocked ? '#991b1b' : '#166534' }}>
                                                    {isLocked ? '🔴 LOCKED' : '🟢 OPEN'}
                                                </span>
                                                <button
                                                    onClick={() => handleToggleLock(et)}
                                                    disabled={locking === et.id}
                                                    style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: locking === et.id ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: isLocked ? 'linear-gradient(135deg,#059669,#0d9488)' : 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', opacity: locking === et.id ? 0.6 : 1 }}>
                                                    {locking === et.id
                                                        ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                                        : isLocked ? <FiUnlock size={13} /> : <FiLock size={13} />}
                                                    {isLocked ? 'Unlock' : 'Lock'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════ TAB 4: ENTRY STATS ══════════════════ */}
            {tab === 'stats' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Overall */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                        {[
                            { label: 'Total Students', value: students.length, icon: '👥', color: '#2563eb', bg: '#eff6ff' },
                            { label: 'Total Subjects', value: subjects.length, icon: '📚', color: '#7c3aed', bg: '#f5f3ff' },
                            { label: 'Marks Entered', value: completionStats.entered.toLocaleString(), icon: '✅', color: '#059669', bg: '#f0fdf4' },
                            { label: 'Completion', value: `${completionStats.completionPct}%`, icon: '📊', color: completionStats.completionPct >= 80 ? '#059669' : completionStats.completionPct >= 50 ? '#d97706' : '#dc2626', bg: '#f8fafc' },
                        ].map((s, i) => (
                            <div key={i} style={{ background: s.bg, borderRadius: 14, padding: '16px 20px', border: `1px solid ${s.color}20` }}>
                                <div style={{ fontSize: 24 }}>{s.icon}</div>
                                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, marginTop: 6 }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Per Subject completion */}
                    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: 14, color: '#1e293b' }}>📚 Mark Entry — By Subject</div>
                        <div style={{ padding: '8px 0' }}>
                            {completionStats.bySubject.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No marks data yet</div>
                            ) : completionStats.bySubject.map((s, i) => (
                                <div key={i} style={{ padding: '10px 20px', borderBottom: i < completionStats.bySubject.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.subject}</span>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: s.pct >= 80 ? '#059669' : s.pct >= 50 ? '#d97706' : '#dc2626' }}>{s.entered}/{s.total} ({s.pct}%)</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', borderRadius: 99, width: `${s.pct}%`, background: s.pct >= 80 ? 'linear-gradient(90deg,#059669,#0d9488)' : s.pct >= 50 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)', transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Per Exam Type */}
                    <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: 14, color: '#1e293b' }}>🏷️ Entries By Exam Type</div>
                        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                            {completionStats.byExamType.map((et, i) => (
                                <div key={i} style={{ borderRadius: 10, padding: '12px 16px', border: `1.5px solid ${et.locked ? '#fecaca' : '#e0e7ff'}`, background: et.locked ? '#fff7f7' : '#f8faff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{et.name}</span>
                                        {et.locked && <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', background: '#fecaca', padding: '1px 6px', borderRadius: 99 }}>LOCKED</span>}
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb' }}>{et.count.toLocaleString()}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>mark entries</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Lock Confirm Modal */}
            {lockConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🔒</div>
                        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', textAlign: 'center', margin: 0 }}>Lock {lockConfirm.exam_name}?</h3>
                        <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', margin: '10px 0 20px' }}>
                            This will <strong>disable mark entry</strong> for <strong>{lockConfirm.exam_name}</strong> across all subjects and forms. Teachers will no longer see it in the exam type dropdown.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button onClick={() => setLockConfirm(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#475569' }}>Cancel</button>
                            <button onClick={() => doToggle(lockConfirm, true)} disabled={locking !== null} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#dc2626,#991b1b)', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {locking !== null ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <FiLock size={13} />}
                                Yes, Lock It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
}
