'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { processStudentAllMarks, computeKNECMeanGrade, scoreToLevel, CBC_LEVEL_CONFIG } from '@/lib/knec-grading';
import { FiSearch, FiPrinter, FiAward, FiBook, FiUser } from 'react-icons/fi';
import { HiAcademicCap } from 'react-icons/hi2';

const GC = (g: string) => ({ A: '#059669', 'A-': '#10b981', 'B+': '#0ea5e9', B: '#3b82f6', 'B-': '#6366f1', 'C+': '#8b5cf6', C: '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', D: '#ef4444', 'D-': '#dc2626', E: '#991b1b' } as Record<string, string>)[g] || '#94a3b8';

// CBC Level badge
function LevelBadge({ level }: { level: string }) {
    const cfg = CBC_LEVEL_CONFIG[level as keyof typeof CBC_LEVEL_CONFIG] || CBC_LEVEL_CONFIG.BE;
    return <span style={{ background: cfg.bg, color: cfg.color, fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 5, border: `1px solid ${cfg.color}40` }}>{level}</span>;
}

export default function StudentPassportPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [marks844, setMarks844] = useState<any[]>([]);
    const [cbcMarks, setCbcMarks] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [cbcAreas, setCbcAreas] = useState<any[]>([]);
    const [selStudent, setSelStudent] = useState('');
    const [search, setSearch] = useState('');
    const [curriculumFilter, setCurriculumFilter] = useState<'both' | '844' | 'cbc'>('both');
    const [loading, setLoading] = useState(true);
    const [school, setSchool] = useState<any>({});

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, mRes, gRes, tRes, fRes, schRes, cbcRes, cbcAreasRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_settings').select('*').limit(1).maybeSingle(),
            supabase.from('school_cbc_marks').select('*').limit(5000),
            supabase.from('school_cbc_learning_areas').select('*').order('area_name'),
        ]);
        setStudents(sRes.data || []); setSubjects(subRes.data || []);
        setMarks844(mRes.data || []); setGrading(gRes.data || []);
        setTerms(tRes.data || []); setForms(fRes.data || []);
        setSchool(schRes.data || {});
        setCbcMarks(cbcRes.data || []);
        setCbcAreas(cbcAreasRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const student = useMemo(() => students.find(s => String(s.id) === selStudent), [students, selStudent]);
    const filtered = useMemo(() => students.filter(s =>
        !search || (s.first_name + ' ' + s.last_name).toLowerCase().includes(search.toLowerCase()) ||
        (s.admission_number || s.admission_no || '').includes(search)
    ), [students, search]);

    // ── Build 8-4-4 history per term ─────────────────────────
    const history844 = useMemo(() => {
        if (!student) return [];
        const sm = marks844.filter(m => m.student_id === student.id);
        return [...terms].reverse().map(term => {
            const tm = sm.filter(m => String(m.term_id) === String(term.id));
            if (!tm.length) return null;
            const processed = processStudentAllMarks(tm, subjects, grading);
            if (!processed.length) return null;
            const mean = computeKNECMeanGrade(processed);
            const avg = processed.reduce((a, r) => a + r.score, 0) / processed.length;
            return { term, processed, mean, avg, type: '8-4-4' };
        }).filter(Boolean) as any[];
    }, [student, marks844, subjects, grading, terms]);

    // ── Build CBC history per term ────────────────────────────
    const historyCBC = useMemo(() => {
        if (!student) return [];
        const sm = cbcMarks.filter(m => m.student_id === student.id);
        return [...terms].reverse().map(term => {
            const tm = sm.filter(m => String(m.term_id) === String(term.id));
            if (!tm.length) return null;
            // Group by learning area
            const byArea = new Map<number, any[]>();
            tm.forEach((m: any) => {
                const areaId = m.learning_area_id || m.area_id;
                if (!byArea.has(areaId)) byArea.set(areaId, []);
                byArea.get(areaId)!.push(m);
            });
            const areaResults: any[] = [];
            byArea.forEach((aMarks, areaId) => {
                const area = cbcAreas.find(a => a.id === areaId);
                if (!area) return;
                // Average score or use level directly
                const levels = aMarks.map((m: any) => m.level || scoreToLevel(Number(m.score || 0)));
                const levelCounts = { EE: 0, ME: 0, AE: 0, BE: 0 };
                levels.forEach((l: string) => { if (l in levelCounts) (levelCounts as any)[l]++; });
                const dominant = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0][0];
                const avgScore = aMarks.reduce((a: number, m: any) => a + Number(m.score || 0), 0) / aMarks.length;
                areaResults.push({ area, dominant, avgScore, levelCounts, count: aMarks.length });
            });
            if (!areaResults.length) return null;
            const meetingAbove = areaResults.filter(r => r.dominant === 'EE' || r.dominant === 'ME').length;
            const overallPct = Math.round((meetingAbove / areaResults.length) * 100);
            return { term, areaResults, overallPct, type: 'CBC' };
        }).filter(Boolean) as any[];
    }, [student, cbcMarks, cbcAreas, terms]);

    const bestTerm844 = useMemo(() => history844.length ? history844.reduce((a: any, b: any) => b.mean.totalPoints > a.mean.totalPoints ? b : a) : null, [history844]);
    const latestMean = useMemo(() => history844.length ? history844[history844.length - 1].mean : null, [history844]);

    const showHistory = useMemo(() => {
        const items: any[] = [];
        if (curriculumFilter !== 'cbc') items.push(...history844);
        if (curriculumFilter !== '844') items.push(...historyCBC);
        return items.sort((a, b) => {
            const ta = terms.find(t => String(t.id) === String(a.term.id));
            const tb = terms.find(t => String(t.id) === String(b.term.id));
            return (ta?.id || 0) - (tb?.id || 0);
        });
    }, [history844, historyCBC, curriculumFilter, terms]);

    const form = forms.find(f => f.id === student?.form_id);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
            <div style={{ display: 'flex', gap: 20 }}>
                {/* Student Selector */}
                <div style={{ width: 260, flexShrink: 0 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 12 }}>📚 Select Student</div>
                        <div style={{ display: 'flex', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '6px 10px', marginBottom: 12, border: '1px solid #e2e8f0' }}>
                            <FiSearch size={14} color="#94a3b8" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or Adm No…"
                                style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, background: 'transparent' }} />
                        </div>
                        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                            {filtered.map(s => {
                                const isSel = String(s.id) === selStudent;
                                const f = forms.find(f => f.id === s.form_id);
                                return <div key={s.id} onClick={() => setSelStudent(String(s.id))}
                                    style={{ padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3, background: isSel ? '#eff6ff' : 'transparent', border: isSel ? '1.5px solid #3b82f6' : '1.5px solid transparent' }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: isSel ? '#2563eb' : '#1e293b' }}>{s.first_name} {s.last_name}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.admission_number || s.admission_no} · {f?.form_name || ''}</div>
                                </div>;
                            })}
                        </div>
                    </div>
                </div>

                {/* Passport */}
                <div style={{ flex: 1 }}>
                    {student ? (
                        <div id="passport">
                            {/* Header */}
                            <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 16, padding: '28px 36px', color: '#fff', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, border: '3px solid rgba(255,255,255,0.4)' }}>
                                            {student.first_name?.[0]}{student.last_name?.[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 22, fontWeight: 900 }}>{student.first_name} {student.last_name}</div>
                                            <div style={{ opacity: 0.85, fontSize: 13, marginTop: 3 }}>Adm: {student.admission_number || student.admission_no || '—'} · {form?.form_name || ''}</div>
                                            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>{school.school_name || ''} · DOB: {student.date_of_birth || '—'}</div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                {[{v:'both',l:'8-4-4 + CBC'},{v:'844',l:'8-4-4 Only'},{v:'cbc',l:'CBC Only'}].map(opt=>(
                                                    <button key={opt.v} onClick={()=>setCurriculumFilter(opt.v as any)}
                                                        style={{ padding:'3px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                                                            background: curriculumFilter===opt.v?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.2)',
                                                            color: curriculumFilter===opt.v?'#1e3a5f':'#fff' }}>
                                                        {opt.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                        {latestMean && <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px' }}>
                                            <div style={{ fontSize: 30, fontWeight: 900 }}>{latestMean.meanGrade}</div>
                                            <div style={{ fontSize: 11, opacity: 0.8 }}>Latest 8-4-4 Mean</div>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>{latestMean.totalPoints} pts</div>
                                        </div>}
                                        {historyCBC.length > 0 && <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px' }}>
                                            <div style={{ fontSize: 30, fontWeight: 900 }}>{historyCBC[historyCBC.length - 1]?.overallPct}%</div>
                                            <div style={{ fontSize: 11, opacity: 0.8 }}>Latest CBC</div>
                                            <div style={{ fontSize: 11, opacity: 0.7 }}>Meeting+</div>
                                        </div>}
                                        <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
                                            <FiPrinter size={15} /> Print Passport
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Term History */}
                            {showHistory.length === 0 && (
                                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#fff', borderRadius: 12 }}>
                                    No marks found for this student. Enter marks in the Marks Entry section first.
                                </div>
                            )}

                            {showHistory.map((h: any, hi: number) => (
                                <div key={`${h.type}-${h.term.id}`} style={{ background: '#fff', borderRadius: 12, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    {/* Term header */}
                                    <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid #e2e8f0', background: h.type === 'CBC' ? '#f0fdf4' : '#f8fafc' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{h.term.term_name}</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: h.type === 'CBC' ? '#dcfce7' : '#dbeafe', color: h.type === 'CBC' ? '#166534' : '#1d4ed8' }}>{h.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            {h.type === '8-4-4' && (<>
                                                <span style={{ fontSize: 12, color: '#64748b' }}>Avg: <strong>{h.avg.toFixed(1)}%</strong></span>
                                                <span style={{ fontSize: 12, color: '#64748b' }}>Points: <strong style={{ color: '#7c3aed' }}>{h.mean.totalPoints}</strong></span>
                                                <span style={{ background: GC(h.mean.meanGrade), color: '#fff', fontWeight: 900, fontSize: 13, padding: '3px 12px', borderRadius: 6 }}>{h.mean.meanGrade}</span>
                                                {bestTerm844?.term.id === h.term.id && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>🏆 Best Term</span>}
                                            </>)}
                                            {h.type === 'CBC' && (
                                                <span style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>{h.overallPct}% Meeting Expectations or Above</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 8-4-4 Subject Table */}
                                    {h.type === '8-4-4' && (
                                        <>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        {['Subject', 'CAT Avg (30%)', 'End Term (70%)', 'Weighted Score', 'Grade', 'Points', 'In Best 7'].map(h => (
                                                            <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4 }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {h.processed.map((r: any) => {
                                                        const inBest7 = h.mean.best7.some((b: any) => b.subjectId === r.subjectId);
                                                        return (
                                                            <tr key={r.subjectId} style={{ borderBottom: '1px solid #f1f5f9', background: inBest7 ? '#f0fdf4' : '#fff' }}>
                                                                <td style={{ padding: '7px 12px', fontWeight: 700, color: '#1e293b' }}>{r.subjectName}</td>
                                                                <td style={{ padding: '7px 12px', color: '#64748b' }}>{r.catAvg != null ? `${r.catAvg.toFixed(1)}%` : '—'}</td>
                                                                <td style={{ padding: '7px 12px', color: '#64748b' }}>{r.endTermScore != null ? `${r.endTermScore}%` : '—'}</td>
                                                                <td style={{ padding: '7px 12px', fontWeight: 700 }}>{r.score.toFixed(1)}%</td>
                                                                <td style={{ padding: '7px 12px' }}><span style={{ background: GC(r.grade), color: '#fff', fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 5 }}>{r.grade}</span></td>
                                                                <td style={{ padding: '7px 12px', fontWeight: 700, color: '#7c3aed' }}>{r.points}</td>
                                                                <td style={{ padding: '7px 12px' }}>{inBest7 ? <span style={{ color: '#059669', fontWeight: 700, fontSize: 11 }}>✅ Yes</span> : <span style={{ color: '#94a3b8', fontSize: 11 }}>No</span>}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {/* Best 7 Summary */}
                                            <div style={{ padding: '8px 20px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>Best 7:</span>
                                                {h.mean.best7.map((b: any) => (
                                                    <span key={b.subjectId} style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>
                                                        {b.subjectName} ({b.grade} · {b.points}pts)
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* CBC Learning Area Table */}
                                    {h.type === 'CBC' && (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: '#f0fdf4' }}>
                                                    {['Learning Area', 'Level', 'Score', 'EE', 'ME', 'AE', 'BE', 'Status'].map(hd => (
                                                        <th key={hd} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, color: '#166534', fontWeight: 700, letterSpacing: 0.4 }}>{hd}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {h.areaResults.map((r: any) => (
                                                    <tr key={r.area.id} style={{ borderBottom: '1px solid #f0fdf4' }}>
                                                        <td style={{ padding: '7px 12px', fontWeight: 700, color: '#1e293b' }}>{r.area.area_name}</td>
                                                        <td style={{ padding: '7px 12px' }}><LevelBadge level={r.dominant} /></td>
                                                        <td style={{ padding: '7px 12px', color: '#64748b' }}>{r.avgScore.toFixed(1)}%</td>
                                                        {(['EE', 'ME', 'AE', 'BE'] as const).map(lv => (
                                                            <td key={lv} style={{ padding: '7px 12px', color: r.levelCounts[lv] > 0 ? CBC_LEVEL_CONFIG[lv].color : '#e2e8f0', fontWeight: r.levelCounts[lv] > 0 ? 700 : 400 }}>{r.levelCounts[lv] || 0}</td>
                                                        ))}
                                                        <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, color: (r.dominant === 'EE' || r.dominant === 'ME') ? '#059669' : '#dc2626' }}>
                                                            {r.dominant === 'EE' ? '⭐ Exceeds' : r.dominant === 'ME' ? '✅ Meeting' : r.dominant === 'AE' ? '🔶 Approaching' : '🔴 Below'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}

                            {/* Journey Summary */}
                            {(history844.length > 1 || historyCBC.length > 1) && (
                                <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 12, padding: 24, color: '#fff', marginTop: 8 }}>
                                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>📊 Academic Journey Summary</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                        {history844.length > 0 && (
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.8, marginBottom: 10 }}>8-4-4 PROGRESSION</div>
                                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                    {history844.map((h: any) => (
                                                        <div key={h.term.id} style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 10, opacity: 0.7 }}>{h.term.term_name}</div>
                                                            <div style={{ fontSize: 20, fontWeight: 900, color: GC(h.mean.meanGrade) }}>{h.mean.meanGrade}</div>
                                                            <div style={{ fontSize: 10, opacity: 0.7 }}>{h.avg.toFixed(0)}%</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {historyCBC.length > 0 && (
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.8, marginBottom: 10 }}>CBC PROGRESSION</div>
                                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                    {historyCBC.map((h: any) => (
                                                        <div key={h.term.id} style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 10, opacity: 0.7 }}>{h.term.term_name}</div>
                                                            <div style={{ fontSize: 20, fontWeight: 900, color: h.overallPct >= 70 ? '#4ade80' : h.overallPct >= 50 ? '#fbbf24' : '#f87171' }}>{h.overallPct}%</div>
                                                            <div style={{ fontSize: 10, opacity: 0.7 }}>Meeting+</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                            <HiAcademicCap size={52} style={{ margin: '0 auto 12px' }} />
                            <div style={{ fontSize: 16, fontWeight: 700 }}>Select a student to view their Academic Passport</div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>Supports both 8-4-4 (KNEC grades) and CBC (EE/ME/AE/BE levels) · Printable PDF</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
