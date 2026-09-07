'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { computeWeightedMark, getSubjectGrade } from '@/lib/knec-grading';
import { FiShield, FiAlertTriangle, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiUsers } from 'react-icons/fi';

interface Anomaly {
    type: 'score_jump' | 'score_drop' | 'outlier_high' | 'outlier_low' | 'class_avg_drop' | 'perfect_score_cluster';
    severity: 'High' | 'Medium' | 'Low';
    student?: string; subject?: string; term?: string;
    value?: number; previous?: number; classAvg?: number;
    description: string;
}

export default function ExamIntegrityPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selForm, setSelForm] = useState('');
    const [loading, setLoading] = useState(true);
    const [filterSev, setFilterSev] = useState<string>('All');

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, mRes, tRes, fRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_terms').select('*').order('id', { ascending: true }),
            supabase.from('school_forms').select('*').order('form_level'),
        ]);
        setStudents(sRes.data || []); setSubjects(subRes.data || []);
        setMarks(mRes.data || []); setTerms(tRes.data || []);
        setForms(fRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const anomalies = useMemo((): Anomaly[] => {
        const results: Anomaly[] = [];
        const filtStudents = students.filter(s => !selForm || String(s.form_id) === selForm);

        subjects.forEach(sub => {
            // Per-student per-term scores
            const studentTermScores: Record<number, Record<number, number>> = {};
            filtStudents.forEach(st => { studentTermScores[st.id] = {}; });

            marks.filter(m => m.subject_id === sub.id && filtStudents.some(s => s.id === m.student_id))
                .forEach(m => {
                    if (!studentTermScores[m.student_id]) studentTermScores[m.student_id] = {};
                    studentTermScores[m.student_id][m.term_id] = Number(m.score);
                });

            // ── 1. Score jump/drop detection (>30 marks between terms) ──
            filtStudents.forEach(st => {
                const termScores = studentTermScores[st.id] || {};
                const termIds = terms.map(t => t.id).filter(id => termScores[id] !== undefined);
                for (let i = 1; i < termIds.length; i++) {
                    const prev = termScores[termIds[i - 1]];
                    const curr = termScores[termIds[i]];
                    const diff = curr - prev;
                    const termName = terms.find(t => t.id === termIds[i])?.term_name || '';
                    if (diff >= 30) {
                        results.push({
                            type: 'score_jump', severity: diff >= 40 ? 'High' : 'Medium',
                            student: `${st.first_name} ${st.last_name}`, subject: sub.subject_name, term: termName,
                            value: curr, previous: prev,
                            description: `Score jumped +${diff.toFixed(0)} marks (${prev.toFixed(0)}% → ${curr.toFixed(0)}%) in ${sub.subject_name}`,
                        });
                    } else if (diff <= -30) {
                        results.push({
                            type: 'score_drop', severity: diff <= -40 ? 'High' : 'Medium',
                            student: `${st.first_name} ${st.last_name}`, subject: sub.subject_name, term: termName,
                            value: curr, previous: prev,
                            description: `Score dropped ${diff.toFixed(0)} marks (${prev.toFixed(0)}% → ${curr.toFixed(0)}%) in ${sub.subject_name}`,
                        });
                    }
                }
            });

            // ── 2. Statistical outlier detection (mean ± 2.5 std dev) ──
            terms.forEach(term => {
                const termMarks = marks.filter(m => m.subject_id === sub.id && m.term_id === term.id && filtStudents.some(s => s.id === m.student_id));
                if (termMarks.length < 5) return;
                const scores = termMarks.map(m => Number(m.score));
                const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
                const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
                const stdDev = Math.sqrt(variance);
                const threshold = 2.5;

                termMarks.forEach(m => {
                    const score = Number(m.score);
                    const zScore = stdDev > 0 ? Math.abs((score - mean) / stdDev) : 0;
                    if (zScore >= threshold) {
                        const st = filtStudents.find(s => s.id === m.student_id);
                        if (!st) return;
                        const isHigh = score > mean;
                        results.push({
                            type: isHigh ? 'outlier_high' : 'outlier_low',
                            severity: zScore >= 3 ? 'High' : 'Medium',
                            student: `${st.first_name} ${st.last_name}`, subject: sub.subject_name, term: term.term_name,
                            value: score, classAvg: Math.round(mean * 10) / 10,
                            description: `${isHigh ? '📈 Unusually high' : '📉 Unusually low'} score: ${score.toFixed(0)}% vs class avg ${mean.toFixed(1)}% (z=${zScore.toFixed(1)})`,
                        });
                    }
                });

                // ── 3. Perfect score cluster (>20% of class scores 95-100) ──
                const perfectCount = scores.filter(s => s >= 95).length;
                if (perfectCount / scores.length > 0.20 && scores.length >= 10) {
                    results.push({
                        type: 'perfect_score_cluster', severity: perfectCount / scores.length > 0.35 ? 'High' : 'Medium',
                        subject: sub.subject_name, term: term.term_name,
                        value: Math.round((perfectCount / scores.length) * 100),
                        description: `🚨 ${perfectCount} students (${Math.round((perfectCount / scores.length) * 100)}%) scored 95%+ in ${sub.subject_name} — possible irregularity`,
                    });
                }

                // ── 4. Class average drop >15 marks vs previous term ──
                const prevTerm = terms[terms.findIndex(t => t.id === term.id) - 1];
                if (prevTerm) {
                    const prevMarks = marks.filter(m => m.subject_id === sub.id && m.term_id === prevTerm.id && filtStudents.some(s => s.id === m.student_id));
                    if (prevMarks.length >= 5) {
                        const prevMean = prevMarks.reduce((a, m) => a + Number(m.score), 0) / prevMarks.length;
                        const drop = prevMean - mean;
                        if (drop >= 15) {
                            results.push({
                                type: 'class_avg_drop', severity: drop >= 20 ? 'High' : 'Medium',
                                subject: sub.subject_name, term: term.term_name,
                                value: Math.round(mean * 10) / 10, previous: Math.round(prevMean * 10) / 10,
                                description: `Class average dropped ${drop.toFixed(1)} marks in ${sub.subject_name} (${prevMean.toFixed(1)}% → ${mean.toFixed(1)}%) — check teaching or exam difficulty`,
                            });
                        }
                    }
                }
            });
        });

        return results.sort((a, b) => {
            const s = { High: 0, Medium: 1, Low: 2 };
            return s[a.severity] - s[b.severity];
        });
    }, [subjects, students, marks, terms, selForm]);

    const filtered = useMemo(() => filterSev === 'All' ? anomalies : anomalies.filter(a => a.severity === filterSev), [anomalies, filterSev]);
    const highCount = anomalies.filter(a => a.severity === 'High').length;
    const medCount = anomalies.filter(a => a.severity === 'Medium').length;

    const typeIcon = (t: string) => ({ score_jump: '📈', score_drop: '📉', outlier_high: '⬆️', outlier_low: '⬇️', class_avg_drop: '📊', perfect_score_cluster: '🚨' })[t] || '⚠️';
    const sevColor = (s: string) => s === 'High' ? '#dc2626' : s === 'Medium' ? '#d97706' : '#059669';
    const sevBg = (s: string) => s === 'High' ? '#fef2f2' : s === 'Medium' ? '#fffbeb' : '#f0fdf4';

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" /></div>;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#991b1b,#dc2626)', borderRadius: 16, padding: '20px 28px', marginBottom: 24, color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🛡️ Exam Integrity & Anomaly Detection</h1>
                        <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>Statistical outliers · Score jumps · Class average drops · Cluster detection</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            <option value="" style={{ color: '#1e293b' }}>All Forms</option>
                            {forms.map((f: any) => <option key={f.id} value={f.id} style={{ color: '#1e293b' }}>{f.form_name}</option>)}
                        </select>
                        <button onClick={load} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                            <FiRefreshCw size={14} /> Scan
                        </button>
                    </div>
                </div>
                {/* Summary */}
                <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Flags', value: anomalies.length, color: '#fff' },
                        { label: '🔴 High Severity', value: highCount, color: '#fca5a5' },
                        { label: '🟡 Medium Severity', value: medCount, color: '#fde68a' },
                        { label: 'Types Detected', value: new Set(anomalies.map(a => a.type)).size, color: '#fff' },
                    ].map((s, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 18px', minWidth: 100, textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, opacity: 0.9 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['All', 'High', 'Medium', 'Low'].map(sev => (
                    <button key={sev} onClick={() => setFilterSev(sev)}
                        style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                            background: filterSev === sev ? sevColor(sev) : '#fff',
                            color: filterSev === sev ? '#fff' : '#475569',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        {sev === 'All' ? `All (${anomalies.length})` : `${sev} (${anomalies.filter(a => a.severity === sev).length})`}
                    </button>
                ))}
            </div>

            {/* Anomaly List */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, color: '#94a3b8' }}>
                    <FiShield size={48} style={{ margin: '0 auto 12px', color: '#059669' }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>✅ No anomalies detected!</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>All scores are within normal statistical range</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                    {filtered.map((a, i) => (
                        <div key={i} style={{ background: sevBg(a.severity), borderRadius: 12, padding: '14px 20px', border: `1.5px solid ${sevColor(a.severity)}40`, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 24, flexShrink: 0 }}>{typeIcon(a.type)}</div>
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
                            <div style={{ flexShrink: 0 }}>
                                <span style={{ background: sevColor(a.severity), color: '#fff', fontWeight: 900, fontSize: 11, padding: '3px 10px', borderRadius: 6 }}>
                                    {a.severity} Risk
                                </span>
                            </div>
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
    );
}
