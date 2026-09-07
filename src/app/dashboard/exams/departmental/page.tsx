'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { computeWeightedMark, getSubjectGrade, getSubjectGroup, vsNational } from '@/lib/knec-grading';
import { FiUsers, FiBook, FiTrendingUp, FiTrendingDown, FiAward, FiBarChart2, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';

const DEPARTMENTS = [
    { id: 1, name: 'Languages', color: '#2563eb', bg: '#dbeafe', icon: '🗣️', keywords: ['english','kiswahili','french','german','arabic','sign language'] },
    { id: 2, name: 'Sciences', color: '#059669', bg: '#d1fae5', icon: '🔬', keywords: ['biology','chemistry','physics','integrated science','agriculture'] },
    { id: 3, name: 'Mathematics', color: '#7c3aed', bg: '#ede9fe', icon: '📐', keywords: ['mathemat'] },
    { id: 4, name: 'Humanities', color: '#d97706', bg: '#fef3c7', icon: '📚', keywords: ['history','geography','cre','christian','ire','islamic','hre','hindu','social stud'] },
    { id: 5, name: 'Technical & Business', color: '#dc2626', bg: '#fee2e2', icon: '💼', keywords: ['business','computer','economics','accounting','commerce','home science'] },
    { id: 6, name: 'Creative Arts', color: '#ec4899', bg: '#fce7f3', icon: '🎨', keywords: ['art','music','physical','drawing','woodwork'] },
];

function getDept(name: string) {
    const n = name.toLowerCase();
    return DEPARTMENTS.find(d => d.keywords.some(k => n.includes(k))) || DEPARTMENTS[4];
}

const GC = (g: string) => ({ A: '#059669', 'A-': '#10b981', 'B+': '#0ea5e9', B: '#3b82f6', 'B-': '#6366f1', 'C+': '#8b5cf6', C: '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', D: '#ef4444', 'D-': '#dc2626', E: '#991b1b' } as Record<string, string>)[g] || '#94a3b8';

export default function DepartmentalPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selDept, setSelDept] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [subRes, tcRes, stRes, mRes, gRes, tRes, fRes] = await Promise.all([
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_teachers').select('*').order('first_name'),
            supabase.from('school_subject_teachers').select('*'),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
        ]);
        setSubjects(subRes.data || []); setTeachers(tcRes.data || []);
        setSubjectTeachers(stRes.data || []); setMarks(mRes.data || []);
        setGrading(gRes.data || []); setTerms(tRes.data || []);
        setForms(fRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const deptStats = useMemo(() => {
        return DEPARTMENTS.map(dept => {
            const deptSubjects = subjects.filter(s => getDept(s.subject_name).id === dept.id);
            if (!deptSubjects.length) return { ...dept, subjects: [], teachers: [], avg: 0, passRate: 0, aRate: 0, eRate: 0, count: 0, hasBelowNational: false };

            const subjectStats = deptSubjects.map(sub => {
                const sm = marks.filter(m => m.subject_id === sub.id && (!selTerm || String(m.term_id) === selTerm));
                if (!sm.length) return null;
                const byStudent = new Map<number, any[]>();
                sm.forEach((m: any) => { if (!byStudent.has(m.student_id)) byStudent.set(m.student_id, []); byStudent.get(m.student_id)!.push(m); });
                const scores: number[] = [];
                byStudent.forEach(sMarks => {
                    const w = computeWeightedMark(sMarks.map((m: any) => ({ examType: m.exam_type, score: m.score, outOf: m.out_of || 100 })));
                    scores.push(w);
                });
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const pass = scores.filter(s => s >= 50).length;
                const aRate = scores.filter(s => s >= 75).length;
                const eRate = scores.filter(s => s < 25).length;
                const grade = getSubjectGrade(avg, grading);
                const nat = vsNational(sub.subject_name, avg);
                // Find teachers for this subject
                const stEntries = subjectTeachers.filter(st => st.subject_id === sub.id);
                const subTeachers = stEntries.map(st => teachers.find(t => t.id === st.teacher_id)).filter(Boolean);
                return { sub, avg, passRate: (pass / scores.length) * 100, aRate: (aRate / scores.length) * 100, eRate: (eRate / scores.length) * 100, count: scores.length, grade, nat, subTeachers };
            }).filter(Boolean) as any[];

            if (!subjectStats.length) return { ...dept, subjects: [], teachers: [], avg: 0, passRate: 0, aRate: 0, eRate: 0, count: 0, hasBelowNational: false };

            const allScores = subjectStats.flatMap(s => Array(s.count).fill(s.avg));
            const avg = allScores.reduce((a, b) => a + b, 0) / (allScores.length || 1);
            const passRate = subjectStats.reduce((a, s) => a + s.passRate, 0) / subjectStats.length;
            const aRate = subjectStats.reduce((a, s) => a + s.aRate, 0) / subjectStats.length;
            const eRate = subjectStats.reduce((a, s) => a + s.eRate, 0) / subjectStats.length;

            // Unique teachers in dept
            const deptTeacherIds = new Set<number>();
            subjectStats.forEach(s => s.subTeachers.forEach((t: any) => deptTeacherIds.add(t.id)));
            const deptTeachers = Array.from(deptTeacherIds).map(id => teachers.find(t => t.id === id)).filter(Boolean);

            return { ...dept, subjects: subjectStats, teachers: deptTeachers, avg, passRate, aRate, eRate, count: subjectStats.reduce((a, s) => a + s.count, 0), hasBelowNational: subjectStats.some(s => !s.nat.above) };
        }).filter(d => d.subjects.length > 0);
    }, [subjects, marks, grading, selTerm, subjectTeachers, teachers]);

    const activeDept = selDept !== null ? deptStats.find(d => d.id === selDept) : null;

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" /></div>;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 16, padding: '20px 28px', marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📊 Departmental Analysis — HOD Dashboard</h1>
                    <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>Sciences · Languages · Humanities · Technical · Arts · Mathematics</p>
                </div>
                <select value={selTerm} onChange={e => setSelTerm(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                    {terms.map((t: any) => <option key={t.id} value={t.id} style={{ color: '#1e293b' }}>{t.term_name}</option>)}
                </select>
            </div>

            {/* Department Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16, marginBottom: 24 }}>
                {deptStats.map(dept => (
                    <div key={dept.id} onClick={() => setSelDept(selDept === dept.id ? null : dept.id)}
                        style={{ background: '#fff', borderRadius: 14, padding: 20, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `2px solid ${selDept === dept.id ? dept.color : '#e2e8f0'}`, transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 28 }}>{dept.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{dept.name}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{dept.subjects.length} subjects · {dept.teachers.length} teachers</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 24, fontWeight: 900, color: dept.color }}>{dept.avg.toFixed(1)}%</div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>Dept Avg</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            {[
                                { label: 'Pass Rate', value: `${dept.passRate.toFixed(1)}%`, color: dept.passRate >= 50 ? '#059669' : '#dc2626' },
                                { label: 'A Rate', value: `${dept.aRate.toFixed(1)}%`, color: '#2563eb' },
                                { label: 'E Rate', value: `${dept.eRate.toFixed(1)}%`, color: dept.eRate > 5 ? '#dc2626' : '#94a3b8' },
                            ].map((s, i) => (
                                <div key={i} style={{ background: dept.bg, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                        {dept.hasBelowNational && (
                            <div style={{ marginTop: 10, fontSize: 11, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '4px 8px', fontWeight: 700 }}>
                                ⚠️ Some subjects below national average
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Department Detail */}
            {activeDept && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `2px solid ${activeDept.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <span style={{ fontSize: 32 }}>{activeDept.icon}</span>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#1e293b' }}>{activeDept.name} Department — Detailed Analysis</h2>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>HOD View · All teachers and subjects · vs National averages</div>
                        </div>
                    </div>

                    {/* Teachers in dept */}
                    {activeDept.teachers.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 10 }}>TEACHERS IN DEPARTMENT</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {activeDept.teachers.map((t: any) => (
                                    <div key={t.id} style={{ background: activeDept.bg, border: `1px solid ${activeDept.color}40`, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: activeDept.color }}>
                                        {t.first_name} {t.last_name}
                                        {t.tsc_number && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>TSC: {t.tsc_number}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subject breakdown */}
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 1, marginBottom: 12 }}>SUBJECT-BY-SUBJECT BREAKDOWN</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                {['Subject', 'Teacher(s)', 'Students', 'Wtd Avg', 'Grade', 'Pass%', 'A%', 'E%', 'vs National', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeDept.subjects.sort((a: any, b: any) => b.avg - a.avg).map((s: any, i: number) => (
                                <tr key={s.sub.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1e293b' }}>{s.sub.subject_name}</td>
                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#64748b' }}>
                                        {s.subTeachers.map((t: any) => `${t.first_name} ${t.last_name}`).join(', ') || '—'}
                                    </td>
                                    <td style={{ padding: '9px 12px', color: '#64748b' }}>{s.count}</td>
                                    <td style={{ padding: '9px 12px', fontWeight: 700 }}>{s.avg.toFixed(1)}%</td>
                                    <td style={{ padding: '9px 12px' }}>
                                        <span style={{ background: GC(s.grade.grade), color: '#fff', fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 5 }}>{s.grade.grade}</span>
                                    </td>
                                    <td style={{ padding: '9px 12px', fontWeight: 700, color: s.passRate >= 50 ? '#059669' : '#dc2626' }}>{s.passRate.toFixed(1)}%</td>
                                    <td style={{ padding: '9px 12px', color: '#2563eb', fontWeight: 700 }}>{s.aRate.toFixed(1)}%</td>
                                    <td style={{ padding: '9px 12px', color: s.eRate > 5 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>{s.eRate.toFixed(1)}%</td>
                                    <td style={{ padding: '9px 12px' }}>
                                        <span style={{ color: s.nat.above ? '#059669' : '#dc2626', fontWeight: 700, fontSize: 12 }}>
                                            {s.nat.above ? '+' : ''}{s.nat.gap}% {s.nat.above ? '▲' : '▼'}
                                        </span>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>Nat: {s.nat.national}%</div>
                                    </td>
                                    <td style={{ padding: '9px 12px' }}>
                                        {s.avg >= 60 ? <span style={{ color: '#059669', fontSize: 11, fontWeight: 700 }}>✅ On Track</span>
                                            : s.avg >= 45 ? <span style={{ color: '#d97706', fontSize: 11, fontWeight: 700 }}>⚠️ Watch</span>
                                            : <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 700 }}>🔴 Needs Help</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
