'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { computeWeightedMark, getSubjectGrade, getKNECMeanGrade, vsNational } from '@/lib/knec-grading';
import { FiTrendingUp, FiTrendingDown, FiAward, FiBarChart2, FiRefreshCw } from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const GC = (g: string) => ({ A: '#059669', 'A-': '#10b981', 'B+': '#0ea5e9', B: '#3b82f6', 'B-': '#6366f1', 'C+': '#8b5cf6', C: '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', D: '#ef4444', 'D-': '#dc2626', E: '#991b1b' } as Record<string, string>)[g] || '#94a3b8';
const GRADE_ORDER = ['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'];

export default function FiveYearTrendPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selForm, setSelForm] = useState('');
    const [selSubject, setSelSubject] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, mRes, gRes, tRes, fRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_terms').select('*').order('id', { ascending: true }),
            supabase.from('school_forms').select('*').order('form_level'),
        ]);
        setStudents(sRes.data || []); setSubjects(subRes.data || []);
        setMarks(mRes.data || []); setGrading(gRes.data || []);
        setTerms(tRes.data || []); setForms(fRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Build trend per term
    const termTrend = useMemo(() => {
        return terms.map(term => {
            const termStudents = students.filter(s => !selForm || String(s.form_id) === selForm);
            const termMarks = marks.filter(m =>
                String(m.term_id) === String(term.id) &&
                termStudents.some(s => s.id === m.student_id) &&
                (!selSubject || String(m.subject_id) === selSubject)
            );
            if (!termMarks.length) return null;

            // Compute weighted scores per student per subject
            const byStudent = new Map<number, any[]>();
            termMarks.forEach(m => {
                if (!byStudent.has(m.student_id)) byStudent.set(m.student_id, []);
                byStudent.get(m.student_id)!.push(m);
            });

            const weightedScores: number[] = [];
            byStudent.forEach(sMarks => {
                const bySubject = new Map<number, any[]>();
                sMarks.forEach(m => { if (!bySubject.has(m.subject_id)) bySubject.set(m.subject_id, []); bySubject.get(m.subject_id)!.push(m); });
                bySubject.forEach(subMarks => {
                    const w = computeWeightedMark(subMarks.map(m => ({ examType: m.exam_type, score: m.score, outOf: m.out_of || 100 })));
                    weightedScores.push(w);
                });
            });

            const avg = weightedScores.reduce((a, b) => a + b, 0) / (weightedScores.length || 1);
            const pass = weightedScores.filter(s => s >= 50).length;
            const aCount = weightedScores.filter(s => s >= 75).length;
            const eCount = weightedScores.filter(s => s < 25).length;

            const gradeDist: Record<string, number> = {};
            GRADE_ORDER.forEach(g => { gradeDist[g] = 0; });
            weightedScores.forEach(s => {
                const g = getSubjectGrade(s, grading);
                gradeDist[g.grade] = (gradeDist[g.grade] || 0) + 1;
            });

            return {
                term: term.term_name, termId: term.id, year: term.year || term.term_name.match(/\d{4}/)?.[0],
                avg: Math.round(avg * 10) / 10,
                passRate: Math.round((pass / weightedScores.length) * 100 * 10) / 10,
                aRate: Math.round((aCount / weightedScores.length) * 100 * 10) / 10,
                eRate: Math.round((eCount / weightedScores.length) * 100 * 10) / 10,
                count: weightedScores.length, gradeDist,
            };
        }).filter(Boolean) as any[];
    }, [terms, marks, students, grading, selForm, selSubject]);

    // Subject trends
    const subjectTrends = useMemo(() => {
        return subjects.map(sub => {
            const trend = terms.map(term => {
                const sm = marks.filter(m => m.subject_id === sub.id && String(m.term_id) === String(term.id));
                if (!sm.length) return null;
                const byStudent = new Map<number, any[]>();
                sm.forEach(m => { if (!byStudent.has(m.student_id)) byStudent.set(m.student_id, []); byStudent.get(m.student_id)!.push(m); });
                const scores: number[] = [];
                byStudent.forEach(sMarks => scores.push(computeWeightedMark(sMarks.map(m => ({ examType: m.exam_type, score: m.score, outOf: m.out_of || 100 })))));
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                return { term: term.term_name, avg: Math.round(avg * 10) / 10 };
            }).filter(Boolean) as any[];
            if (trend.length < 2) return null;
            const first = trend[0].avg, last = trend[trend.length - 1].avg;
            const change = Math.round((last - first) * 10) / 10;
            const nat = vsNational(sub.subject_name, last);
            return { sub, trend, change, latestAvg: last, nat, improving: change > 0 };
        }).filter(Boolean).sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change)) as any[];
    }, [subjects, marks, terms]);

    // Best and worst performing term
    const bestTerm = termTrend.length ? termTrend.reduce((a, b) => b.avg > a.avg ? b : a) : null;
    const worstTerm = termTrend.length ? termTrend.reduce((a, b) => b.avg < a.avg ? b : a) : null;
    const latestTerm = termTrend.length ? termTrend[termTrend.length - 1] : null;
    const prevTerm = termTrend.length > 1 ? termTrend[termTrend.length - 2] : null;
    const trend = latestTerm && prevTerm ? latestTerm.avg - prevTerm.avg : 0;

    const lineData = {
        labels: termTrend.map(t => t.term),
        datasets: [
            { label: 'School Average (%)', data: termTrend.map(t => t.avg), borderColor: '#3b82f6', backgroundColor: '#3b82f620', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#3b82f6' },
            { label: 'Pass Rate (%)', data: termTrend.map(t => t.passRate), borderColor: '#059669', backgroundColor: '#05966920', fill: false, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#059669' },
            { label: 'A Rate (%)', data: termTrend.map(t => t.aRate), borderColor: '#f59e0b', backgroundColor: 'transparent', fill: false, tension: 0.4, pointRadius: 4, borderDash: [5, 5] },
        ],
    };

    const chartOptions = { responsive: true, plugins: { legend: { position: 'top' as const } }, scales: { y: { min: 0, max: 100 } } };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

    return (
        <div style={{ minHeight: '100vh', background: '#f0f9ff', padding: 24 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e40af,#7c3aed)', borderRadius: 16, padding: '20px 28px', marginBottom: 24, color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📈 5-Year School Trend Analysis</h1>
                        <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>Year-over-year performance · Subject improvement/decline · CAT-weighted marks</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <select value={selForm} onChange={e => setSelForm(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            <option value="" style={{ color: '#1e293b' }}>All Forms</option>
                            {forms.map((f: any) => <option key={f.id} value={f.id} style={{ color: '#1e293b' }}>{f.form_name}</option>)}
                        </select>
                        <select value={selSubject} onChange={e => setSelSubject(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                            <option value="" style={{ color: '#1e293b' }}>All Subjects</option>
                            {subjects.map((s: any) => <option key={s.id} value={s.id} style={{ color: '#1e293b' }}>{s.subject_name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Summary Stats */}
                {latestTerm && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Latest Average', value: `${latestTerm.avg}%`, sub: latestTerm.term },
                            { label: 'Term Change', value: `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`, sub: trend >= 0 ? '▲ Improving' : '▼ Declining' },
                            { label: 'Best Term Ever', value: bestTerm ? `${bestTerm.avg}%` : '—', sub: bestTerm?.term || '' },
                            { label: 'Pass Rate', value: `${latestTerm.passRate}%`, sub: 'Latest term' },
                            { label: 'Terms Tracked', value: termTrend.length, sub: 'Historical data' },
                        ].map((s, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 18px', minWidth: 120 }}>
                                <div style={{ fontSize: 20, fontWeight: 900 }}>{s.value}</div>
                                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{s.label}</div>
                                <div style={{ fontSize: 10, opacity: 0.75 }}>{s.sub}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {termTrend.length > 1 ? (<>
                {/* Main Trend Chart */}
                <div style={{ background: '#fff', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>📊 Performance Trend Over Time</div>
                    <Line data={lineData} options={chartOptions} />
                </div>

                {/* Term-by-term table */}
                <div style={{ background: '#fff', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>📋 Term-by-Term Results</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                {['Term', 'Average', 'Pass Rate', 'A Rate', 'E Rate', 'Entries', 'Trend', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {termTrend.map((t: any, i: number) => {
                                const prev = i > 0 ? termTrend[i - 1] : null;
                                const change = prev ? t.avg - prev.avg : 0;
                                const isBest = bestTerm?.termId === t.termId;
                                return (
                                    <tr key={t.termId} style={{ borderBottom: '1px solid #f1f5f9', background: isBest ? '#fefce8' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1e293b' }}>
                                            {t.term} {isBest && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, marginLeft: 4, fontWeight: 700 }}>🏆 Best</span>}
                                        </td>
                                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1e293b' }}>{t.avg}%</td>
                                        <td style={{ padding: '9px 12px', fontWeight: 700, color: t.passRate >= 50 ? '#059669' : '#dc2626' }}>{t.passRate}%</td>
                                        <td style={{ padding: '9px 12px', color: '#2563eb', fontWeight: 700 }}>{t.aRate}%</td>
                                        <td style={{ padding: '9px 12px', color: t.eRate > 5 ? '#dc2626' : '#94a3b8' }}>{t.eRate}%</td>
                                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{t.count}</td>
                                        <td style={{ padding: '9px 12px' }}>
                                            {prev ? <span style={{ color: change >= 0 ? '#059669' : '#dc2626', fontWeight: 700, fontSize: 12 }}>
                                                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                                            </span> : <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>}
                                        </td>
                                        <td style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: t.avg >= 60 ? '#059669' : t.avg >= 45 ? '#d97706' : '#dc2626' }}>
                                            {t.avg >= 60 ? '✅ Strong' : t.avg >= 45 ? '⚠️ Average' : '🔴 Weak'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Subject improvement/decline */}
                {subjectTrends.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>📚 Subject Improvement / Decline Ranking</div>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {subjectTrends.slice(0, 12).map((s: any) => (
                                <div key={s.sub.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 10, background: s.improving ? '#f0fdf4' : '#fef2f2', border: `1px solid ${s.improving ? '#86efac' : '#fca5a5'}` }}>
                                    <div style={{ fontSize: 18 }}>{s.improving ? '📈' : '📉'}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.sub.subject_name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                            {s.trend.map((t: any) => `${t.term}: ${t.avg}%`).join(' → ')}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: s.improving ? '#059669' : '#dc2626' }}>
                                            {s.improving ? '+' : ''}{s.change}%
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>Overall change</div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                                        <div style={{ fontSize: 16, fontWeight: 700 }}>{s.latestAvg}%</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>Current</div>
                                        <div style={{ fontSize: 10, color: s.nat.above ? '#059669' : '#dc2626', fontWeight: 700 }}>{s.nat.above ? '▲' : '▼'} National</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>) : (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, color: '#94a3b8' }}>
                    <FiBarChart2 size={48} style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Not enough data yet</div>
                    <div style={{ fontSize: 13, marginTop: 6 }}>Enter marks for at least 2 terms to see trend analysis</div>
                </div>
            )}
        </div>
    );
}
