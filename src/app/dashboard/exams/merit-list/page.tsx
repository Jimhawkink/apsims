'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiDownload, FiAward, FiTrendingUp, FiTrendingDown, FiMinus,
    FiUsers, FiTarget, FiZap, FiEye, FiPrinter,
    FiChevronDown, FiChevronUp, FiSearch, FiGrid, FiList, FiStar,
    FiAlertTriangle, FiCheckCircle, FiActivity,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }
interface SubjectResult { subId: number; subjectName: string; score: number; grade: string; points: number; isInBest7: boolean; }
interface MeritRow {
    student: any;
    subjectResults: SubjectResult[];
    best7: SubjectResult[];
    allSubjectsPoints: number;
    totalPoints: number;
    totalScore: number;
    avgScore: number;
    meanGrade: GradeEntry;
    subjectCount: number;
    rank?: number;
    highestSubject?: SubjectResult;
    lowestSubject?: SubjectResult;
}

// ─── Grade colour palette (12 KCSE grades) ──────────────────────────────────
const GRADE_COLORS: Record<string, { bg: string; text: string; light: string }> = {
    'A':  { bg: '#059669', text: '#fff', light: '#d1fae5' },
    'A-': { bg: '#10b981', text: '#fff', light: '#d1fae5' },
    'B+': { bg: '#0ea5e9', text: '#fff', light: '#e0f2fe' },
    'B':  { bg: '#3b82f6', text: '#fff', light: '#dbeafe' },
    'B-': { bg: '#6366f1', text: '#fff', light: '#e0e7ff' },
    'C+': { bg: '#8b5cf6', text: '#fff', light: '#ede9fe' },
    'C':  { bg: '#a78bfa', text: '#fff', light: '#ede9fe' },
    'C-': { bg: '#f59e0b', text: '#fff', light: '#fef3c7' },
    'D+': { bg: '#f97316', text: '#fff', light: '#ffedd5' },
    'D':  { bg: '#ef4444', text: '#fff', light: '#fee2e2' },
    'D-': { bg: '#dc2626', text: '#fff', light: '#fee2e2' },
    'E':  { bg: '#991b1b', text: '#fff', light: '#fee2e2' },
};
const gradeColor = (g: string) => GRADE_COLORS[g] || { bg: '#64748b', text: '#fff', light: '#f1f5f9' };

const EXAM_TYPES = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

// ─── Utility: ordinal suffix ──────────────────────────────────────────────────
const ordinal = (n: number) => {
    if (n === 1) return '1st'; if (n === 2) return '2nd'; if (n === 3) return '3rd';
    return `${n}th`;
};

// ─── Mini sparkline component ─────────────────────────────────────────────────

// ─── Grade badge ──────────────────────────────────────────────────────────────
function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
    const c = gradeColor(grade);
    const s = size === 'sm' ? { w: 28, h: 22, fs: 10 } : size === 'lg' ? { w: 48, h: 36, fs: 16 } : { w: 36, h: 28, fs: 12 };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: s.w, height: s.h, borderRadius: 6, background: c.bg,
            color: c.text, fontWeight: 700, fontSize: s.fs, letterSpacing: '0.02em',
            fontFamily: "'DM Mono', 'Courier New', monospace",
        }}>{grade}</span>
    );
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
    const config = rank === 1 ? { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: '0 2px 8px rgba(245,158,11,.4)' }
        : rank === 2 ? { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', shadow: '0 2px 8px rgba(100,116,139,.3)' }
        : rank === 3 ? { bg: 'linear-gradient(135deg,#cd7f32,#a0522d)', shadow: '0 2px 8px rgba(160,82,45,.3)' }
        : { bg: '#f1f5f9', shadow: 'none' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%', background: config.bg,
            boxShadow: config.shadow, color: rank <= 3 ? '#fff' : '#475569',
            fontWeight: 800, fontSize: 13,
        }}>{rank}</span>
    );
}

// ─── Trend icon ───────────────────────────────────────────────────────────────
function TrendIcon({ value }: { value: number }) {
    if (value > 0) return <FiTrendingUp size={13} color="#10b981" />;
    if (value < 0) return <FiTrendingDown size={13} color="#ef4444" />;
    return <FiMinus size={13} color="#94a3b8" />;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }) {
    return (
        <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
            padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
            borderTop: accent ? `3px solid ${accent}` : undefined,
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, background: accent ? `${accent}18` : '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: accent || '#64748b',
            }}>{icon}</div>
            <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
                {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{sub}</p>}
            </div>
        </div>
    );
}

// ─── SUBJECT BREAKDOWN TOOLTIP / MINI TABLE ───────────────────────────────────
function SubjectBreakdown({ row, subjects }: { row: MeritRow; subjects: any[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)}
                style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, background: '#eef2ff', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <FiEye size={10} /> {open ? 'Hide' : `${row.subjectCount} subj`}
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#fff',
                    border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.12)',
                    minWidth: 220, padding: 10, marginTop: 4,
                }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.06em' }}>Subject Breakdown</p>
                    {row.subjectResults.sort((a, b) => b.score - a.score).map(sr => (
                        <div key={sr.subId} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                            borderBottom: '1px solid #f1f5f9', opacity: sr.isInBest7 ? 1 : 0.5,
                        }}>
                            {sr.isInBest7 && <FiStar size={9} color="#f59e0b" />}
                            {!sr.isInBest7 && <span style={{ width: 9 }} />}
                            <span style={{ flex: 1, fontSize: 11, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sr.subjectName}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', minWidth: 28, textAlign: 'right' }}>{sr.score}</span>
                            <GradeBadge grade={sr.grade} size="sm" />
                        </div>
                    ))}
                    <p style={{ fontSize: 9, color: '#94a3b8', margin: '6px 0 0' }}><FiStar size={8} style={{ verticalAlign: 'middle' }} /> = counted in Best 7</p>
                </div>
            )}
        </div>
    );
}

// ─── INSIGHTS PANEL ───────────────────────────────────────────────────────────
function InsightsPanel({ meritData, grading, subjects }: { meritData: MeritRow[]; grading: GradeEntry[]; subjects: any[] }) {
    const n = meritData.length;
    if (n === 0) return null;

    const avgClassScore = meritData.reduce((s, r) => s + r.avgScore, 0) / n;
    const passing = meritData.filter(r => r.meanGrade.points >= 4).length; // C and above
    const failRate = ((n - passing) / n * 100).toFixed(0);
    const passRate = (passing / n * 100).toFixed(0);

    // Subject performance (average per subject)
    const subjectAverages: Record<number, { name: string; total: number; count: number }> = {};
    meritData.forEach(row => {
        row.subjectResults.forEach(sr => {
            if (!subjectAverages[sr.subId]) subjectAverages[sr.subId] = { name: sr.subjectName, total: 0, count: 0 };
            subjectAverages[sr.subId].total += sr.score;
            subjectAverages[sr.subId].count += 1;
        });
    });
    const subjectAvgs = Object.entries(subjectAverages)
        .map(([id, v]) => ({ id, name: v.name, avg: v.total / v.count }))
        .sort((a, b) => b.avg - a.avg);

    const bestSubject = subjectAvgs[0];
    const worstSubject = subjectAvgs[subjectAvgs.length - 1];
    const top10pct = Math.max(1, Math.ceil(n * 0.1));
    const topStudentsAvg = meritData.slice(0, top10pct).reduce((s, r) => s + r.avgScore, 0) / top10pct;
    const bottom10pct = Math.max(1, Math.ceil(n * 0.1));
    const bottomStudentsAvg = meritData.slice(-bottom10pct).reduce((s, r) => s + r.avgScore, 0) / bottom10pct;

    const insights: { icon: React.ReactNode; color: string; title: string; desc: string }[] = [
        {
            icon: <FiTarget size={14} />, color: avgClassScore >= 50 ? '#10b981' : '#f59e0b',
            title: 'Class Average',
            desc: `${avgClassScore.toFixed(1)}% mean score — ${avgClassScore >= 60 ? 'Good performance' : avgClassScore >= 50 ? 'Fair performance' : 'Needs attention'}`
        },
        {
            icon: <FiCheckCircle size={14} />, color: '#10b981',
            title: 'Pass Rate (C+)',
            desc: `${passRate}% of students (${passing}/${n}) achieved C and above`
        },
        {
            icon: <FiAlertTriangle size={14} />, color: '#ef4444',
            title: 'At-Risk Students',
            desc: `${failRate}% (${n - passing} students) scored below C — require remediation`
        },
        {
            icon: <FiActivity size={14} />, color: '#6366f1',
            title: 'Performance Gap',
            desc: `Top 10% avg: ${topStudentsAvg.toFixed(1)}% vs Bottom 10% avg: ${bottomStudentsAvg.toFixed(1)}% — gap of ${(topStudentsAvg - bottomStudentsAvg).toFixed(1)}%`
        },
        ...(bestSubject ? [{
            icon: <FiZap size={14} />, color: '#f59e0b',
            title: 'Strongest Subject',
            desc: `${bestSubject.name} — class average ${bestSubject.avg.toFixed(1)}%`
        }] : []),
        ...(worstSubject && worstSubject.id !== bestSubject?.id ? [{
            icon: <FiAlertTriangle size={14} />, color: '#f97316',
            title: 'Weakest Subject',
            desc: `${worstSubject.name} — class average ${worstSubject.avg.toFixed(1)}% — consider targeted support`
        }] : []),
    ];

    return (
        <div style={{ background: 'linear-gradient(135deg,#667eea08,#764ba208)', border: '1px solid #e0e7ff', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <HiSparkles size={16} color="#6366f1" />
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>AI-Powered Class Insights</h3>
                <span style={{ fontSize: 10, background: '#6366f1', color: '#fff', borderRadius: 4, padding: '2px 6px', fontWeight: 600, letterSpacing: '0.04em' }}>ALPHA</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                {insights.map((ins, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: `1px solid ${ins.color}22`, borderLeft: `3px solid ${ins.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, color: ins.color }}>
                            {ins.icon}
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{ins.title}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{ins.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── SUBJECT PERFORMANCE CHART (simple HTML bar chart) ───────────────────────
function SubjectChart({ meritData }: { meritData: MeritRow[] }) {
    if (meritData.length === 0) return null;
    const subjectAverages: Record<number, { name: string; total: number; count: number }> = {};
    meritData.forEach(row => {
        row.subjectResults.forEach(sr => {
            if (!subjectAverages[sr.subId]) subjectAverages[sr.subId] = { name: sr.subjectName, total: 0, count: 0 };
            subjectAverages[sr.subId].total += sr.score;
            subjectAverages[sr.subId].count += 1;
        });
    });
    const data = Object.values(subjectAverages)
        .map(v => ({ name: v.name.length > 12 ? v.name.slice(0, 12) + '…' : v.name, avg: v.total / v.count }))
        .sort((a, b) => b.avg - a.avg);
    if (data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.avg), 100);

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Subject Averages</h3>
            {data.map((d, i) => {
                const pct = (d.avg / maxVal) * 100;
                const col = d.avg >= 50 ? '#10b981' : d.avg >= 40 ? '#f59e0b' : '#ef4444';
                return (
                    <div key={i} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{d.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{d.avg.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── GRADE DISTRIBUTION BAR ────────────────────────────────────────────────────
function GradeDistribution({ meritData, grading, filterGrade, setFilterGrade }: {
    meritData: MeritRow[]; grading: GradeEntry[]; filterGrade: string; setFilterGrade: (g: string) => void;
}) {
    const dist: Record<string, number> = {};
    grading.forEach(g => { dist[g.grade] = 0; });
    meritData.forEach(r => { dist[r.meanGrade.grade] = (dist[r.meanGrade.grade] || 0) + 1; });
    const active = Object.entries(dist).filter(([, v]) => v > 0);
    const maxCount = Math.max(...active.map(([, v]) => v), 1);

    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Grade Distribution</h3>
                {filterGrade && (
                    <button onClick={() => setFilterGrade('')}
                        style={{ fontSize: 10, color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
                        Clear filter
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                {active.map(([grade, count]) => {
                    const c = gradeColor(grade);
                    const pct = meritData.length > 0 ? ((count / meritData.length) * 100).toFixed(0) : 0;
                    const barH = Math.max(8, (count / maxCount) * 60);
                    const isActive = filterGrade === grade;
                    return (
                        <button key={grade} onClick={() => setFilterGrade(isActive ? '' : grade)}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                                borderRadius: 8, outline: isActive ? `2px solid ${c.bg}` : 'none',
                                transition: 'all 0.2s',
                            }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: c.bg }}>{pct}%</span>
                            <div style={{ width: 28, height: barH, background: c.bg, borderRadius: '4px 4px 2px 2px', transition: 'height 0.4s' }} />
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 26, height: 20, borderRadius: 5, background: c.bg,
                                color: c.text, fontWeight: 700, fontSize: 9,
                            }}>{grade}</span>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── TOP 3 PODIUM ──────────────────────────────────────────────────────────────
function Podium({ filtered }: { filtered: MeritRow[] }) {
    if (filtered.length < 1) return null;
    const podiumOrder = filtered.length >= 3 ? [filtered[1], filtered[0], filtered[2]] : [null, filtered[0], filtered.length >= 2 ? filtered[1] : null];
    const positions = [2, 1, 3] as const;
    const styles = {
        1: { bg: 'linear-gradient(160deg,#fef3c7,#fde68a)', border: '#fbbf24', barH: 80, shadow: '0 4px 20px rgba(251,191,36,.3)', medal: '🥇', accent: '#f59e0b' },
        2: { bg: 'linear-gradient(160deg,#f8fafc,#f1f5f9)', border: '#cbd5e1', barH: 60, shadow: '0 4px 16px rgba(203,213,225,.4)', medal: '🥈', accent: '#64748b' },
        3: { bg: 'linear-gradient(160deg,#fff7ed,#fed7aa)', border: '#fdba74', barH: 50, shadow: '0 4px 16px rgba(253,186,116,.3)', medal: '🥉', accent: '#f97316' },
    };

    return (
        <div style={{ background: 'linear-gradient(180deg,#fafbff,#f8fafc)', border: '1px solid #e2e8f0', borderRadius: 20, padding: '24px 16px 0', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 16, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Performers</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignItems: 'flex-end' }}>
                {podiumOrder.map((row, idx) => {
                    const pos = positions[idx];
                    const s = styles[pos];
                    if (!row) return <div key={idx} style={{ height: 100 + s.barH }} />;
                    const adm = row.student.admission_no || row.student.admission_number;
                    const name = `${row.student.first_name} ${row.student.last_name}`;
                    return (
                        <div key={row.student.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 22 }}>{s.medal}</span>
                            <div style={{
                                width: '100%', background: s.bg, border: `2px solid ${s.border}`,
                                borderRadius: '14px 14px 0 0', padding: '14px 10px 18px',
                                boxShadow: s.shadow, textAlign: 'center', minHeight: 130 + s.barH,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#fff',
                                    background: s.accent, marginBottom: 4,
                                }}>{pos}</div>
                                <p style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', margin: 0, lineHeight: 1.2 }}>{name}</p>
                                <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>{adm}</p>
                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, fontWeight: 600 }}>POINTS</p>
                                        <p style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{row.totalPoints}</p>
                                    </div>
                                    <div style={{ width: 1, background: '#e2e8f0' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, fontWeight: 600 }}>AVG</p>
                                        <p style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{row.avgScore.toFixed(1)}%</p>
                                    </div>
                                    <div style={{ width: 1, background: '#e2e8f0' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, fontWeight: 600 }}>GRADE</p>
                                        <GradeBadge grade={row.meanGrade.grade} size="sm" />
                                    </div>
                                </div>
                                {row.highestSubject && (
                                    <p style={{ fontSize: 9, color: s.accent, fontWeight: 700, margin: '6px 0 0', background: `${s.accent}18`, borderRadius: 4, padding: '2px 6px' }}>
                                        Best: {row.highestSubject.subjectName.slice(0, 10)} {row.highestSubject.score}%
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────────────────
export default function MeritListPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMarks, setLoadingMarks] = useState(false);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [filterGrade, setFilterGrade] = useState('');
    const [showBest7, setShowBest7] = useState(true);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'rank' | 'name' | 'points' | 'avg'>('rank');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [showInsights, setShowInsights] = useState(true);

    // ── Fetch base data ──
    const fetchBase = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, gr] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setGrading(gr.data || []);
        const cur = ((t.data || []) as any[]).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchBase(); }, [fetchBase]);

    const getGrade = useCallback((score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score)
            || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    }, [grading]);

    const classStudents = useMemo(() => students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream),
        [students, selForm, selStream]);

    // ── Fetch marks ──
    useEffect(() => {
        if (!selForm || !selTerm || !selExamType) { setMarks([]); return; }
        const studentIds = classStudents.map(s => s.id);
        if (studentIds.length === 0) { setMarks([]); return; }
        const load = async () => {
            setLoadingMarks(true);
            const { data } = await supabase.from('school_exam_marks').select('*')
                .eq('term_id', Number(selTerm)).eq('exam_type', selExamType)
                .in('student_id', studentIds);
            setMarks(data || []);
            setLoadingMarks(false);
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selTerm, selExamType, students]);

    // ── Build merit data ──
    const meritData: MeritRow[] = useMemo(() => {
        const rows = classStudents.map(student => {
            const studentMarks = marks.filter(m => m.student_id === student.id);
            const subjectResults: SubjectResult[] = [];
            subjects.forEach(sub => {
                const mark = studentMarks.find(m => m.subject_id === sub.id);
                if (mark) {
                    const g = getGrade(Number(mark.score));
                    subjectResults.push({ subId: sub.id, subjectName: sub.subject_name, score: Number(mark.score), grade: g.grade, points: g.points, isInBest7: false });
                }
            });
            const sortedByPoints = [...subjectResults].sort((a, b) => b.points - a.points || b.score - a.score);
            const best7 = showBest7 ? sortedByPoints.slice(0, 7) : sortedByPoints;
            best7.forEach(sr => { sr.isInBest7 = true; });
            const totalPoints = best7.reduce((a, b) => a + b.points, 0);
            const totalScore = best7.reduce((a, b) => a + b.score, 0);
            const avgScore = best7.length > 0 ? totalScore / best7.length : 0;
            const meanGrade = getGrade(avgScore);
            const allSubjectsPoints = subjectResults.reduce((a, b) => a + b.points, 0);
            const highestSubject = subjectResults.length > 0 ? [...subjectResults].sort((a, b) => b.score - a.score)[0] : undefined;
            const lowestSubject = subjectResults.length > 0 ? [...subjectResults].sort((a, b) => a.score - b.score)[0] : undefined;
            return { student, subjectResults, best7, allSubjectsPoints, totalPoints, totalScore, avgScore, meanGrade, subjectCount: subjectResults.length, highestSubject, lowestSubject };
        }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalScore - a.totalScore);

        // Assign ranks (tied students get same rank)
        rows.forEach((row, i) => {
            if (i === 0 || row.totalPoints !== rows[i - 1].totalPoints || row.totalScore !== rows[i - 1].totalScore) {
                (row as any).rank = i + 1;
            } else {
                (row as any).rank = (rows[i - 1] as any).rank;
            }
        });
        return rows;
    }, [classStudents, marks, subjects, showBest7, getGrade]);

    // ── Filter + search + sort ──
    const filtered = useMemo(() => {
        let data = filterGrade ? meritData.filter(r => r.meanGrade.grade === filterGrade) : meritData;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(r =>
                `${r.student.first_name} ${r.student.last_name}`.toLowerCase().includes(q) ||
                (r.student.admission_no || r.student.admission_number || '').toLowerCase().includes(q)
            );
        }
        if (sortField !== 'rank') {
            data = [...data].sort((a, b) => {
                let va: any, vb: any;
                if (sortField === 'name') { va = `${a.student.first_name} ${a.student.last_name}`; vb = `${b.student.first_name} ${b.student.last_name}`; }
                else if (sortField === 'points') { va = a.totalPoints; vb = b.totalPoints; }
                else if (sortField === 'avg') { va = a.avgScore; vb = b.avgScore; }
                if (va < vb) return sortDir === 'asc' ? -1 : 1;
                if (va > vb) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [meritData, filterGrade, searchQuery, sortField, sortDir]);

    // ── Stats ──
    const stats = useMemo(() => {
        const n = meritData.length;
        if (n === 0) return null;
        const avg = meritData.reduce((s, r) => s + r.avgScore, 0) / n;
        const passing = meritData.filter(r => r.meanGrade.points >= 4).length;
        const aGrade = meritData.filter(r => ['A', 'A-'].includes(r.meanGrade.grade)).length;
        return { n, avg, passing, aGrade };
    }, [meritData]);

    // ── Helpers ──
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
    const isReady = selForm && selTerm && selExamType;

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };
    const SortIcon = ({ field }: { field: typeof sortField }) =>
        sortField === field ? (sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />) : null;

    // ── Export ──
    const exportCSV = () => {
        const headers = ['Rank', 'Adm No', 'Name', 'Stream', 'Subjects', showBest7 ? 'Best 7 Points' : 'Total Points', 'Avg Score (%)', 'Mean Grade', 'Remarks',
            ...subjects.map(s => s.subject_name)
        ];
        const rows = filtered.map(row => [
            (row as any).rank,
            row.student.admission_no || row.student.admission_number,
            `${row.student.first_name} ${row.student.last_name}`,
            getStreamName(row.student.stream_id),
            row.subjectCount, row.totalPoints,
            row.avgScore.toFixed(1), row.meanGrade.grade, row.meanGrade.remarks,
            ...subjects.map(s => row.subjectResults.find(sr => sr.subId === s.id)?.score ?? '')
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `AlphaSchool_MeritList_${selExamType.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Merit list exported ✅');
    };

    const exportPrint = () => window.print();

    // ── Loading state ──
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 48, height: 48, border: '3px solid #fde68a', borderTop: '3px solid #f59e0b',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
                }} />
                <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Loading Merit List…</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif", maxWidth: '100%' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;700&display=swap');
                .alpha-select { appearance: none; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 32px 8px 12px; font-size: 13px; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E") no-repeat right 10px center; cursor: pointer; width: 100%; color: #334155; font-weight: 500; transition: border-color .2s, box-shadow .2s; }
                .alpha-select:focus { outline: none; border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,.15); }
                .alpha-th { padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; cursor: pointer; white-space: nowrap; user-select: none; }
                .alpha-th:hover { color: #475569; }
                .alpha-td { padding: 10px 12px; font-size: 13px; color: #334155; vertical-align: middle; }
                .alpha-tr { border-bottom: 1px solid #f1f5f9; transition: background .15s; }
                .alpha-tr:hover { background: #fafbff; }
                .btn-icon { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid #e2e8f0; background: #fff; color: #475569; transition: all .2s; }
                .btn-icon:hover { background: #f8fafc; border-color: #cbd5e1; }
                .btn-primary { background: linear-gradient(135deg,#f59e0b,#d97706); color: #fff; border-color: transparent; }
                .btn-primary:hover { background: linear-gradient(135deg,#fbbf24,#f59e0b); }
                .expand-row { background: #f8fafc; }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                }
            `}</style>

            {/* ── Header ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,.3)' }}>
                            <FiAward size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Merit List</h1>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>KCSE-style ranking · Best 7 subjects · Real-time insights</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="no-print">
                        {isReady && filtered.length > 0 && <>
                            <button className="btn-icon" onClick={exportPrint}><FiPrinter size={13} /> Print</button>
                            <button className="btn-icon btn-primary" onClick={exportCSV}><FiDownload size={13} /> Export CSV</button>
                        </>}
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }} className="no-print">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Form *</label>
                        <select className="alpha-select" value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }}>
                            <option value="">Select Form</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Stream</label>
                        <select className="alpha-select" value={selStream} onChange={e => setSelStream(e.target.value)}>
                            <option value="">All Streams</option>
                            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Term *</label>
                        <select className="alpha-select" value={selTerm} onChange={e => setSelTerm(e.target.value)}>
                            <option value="">Select Term</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Exam Type *</label>
                        <select className="alpha-select" value={selExamType} onChange={e => setSelExamType(e.target.value)}>
                            {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Filter Grade</label>
                        <select className="alpha-select" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                            <option value="">All Grades</option>
                            {grading.map(g => <option key={g.grade} value={g.grade}>{g.grade} – {g.remarks}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Method</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 0' }}>
                            <input type="checkbox" checked={showBest7} onChange={e => setShowBest7(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Best 7 Only</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* ── Empty states ── */}
            {!isReady && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                    <p style={{ fontWeight: 700, fontSize: 16, color: '#334155', margin: 0 }}>Select Form, Term & Exam Type</p>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>The merit list will appear here once all required fields are selected</p>
                </div>
            )}

            {isReady && loadingMarks && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, border: '3px solid #fde68a', borderTop: '3px solid #f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Calculating merit list…</p>
                </div>
            )}

            {isReady && !loadingMarks && meritData.length === 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                    <p style={{ fontWeight: 700, fontSize: 16, color: '#334155', margin: 0 }}>No marks entered yet</p>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>Enter exam marks for this class first</p>
                </div>
            )}

            {isReady && !loadingMarks && meritData.length > 0 && (
                <>
                    {/* ── Stats row ── */}
                    {stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                            <StatCard icon={<FiUsers size={16} />} label="Students Ranked" value={stats.n} sub={`${filtered.length} shown`} accent="#6366f1" />
                            <StatCard icon={<FiTarget size={16} />} label="Class Average" value={`${stats.avg.toFixed(1)}%`} sub={getGrade(stats.avg).remarks} accent="#f59e0b" />
                            <StatCard icon={<FiCheckCircle size={16} />} label="Pass Rate (C+)" value={`${((stats.passing / stats.n) * 100).toFixed(0)}%`} sub={`${stats.passing} of ${stats.n} students`} accent="#10b981" />
                            <StatCard icon={<FiStar size={16} />} label="A / A- Students" value={stats.aGrade} sub={`${((stats.aGrade / stats.n) * 100).toFixed(0)}% of class`} accent="#f59e0b" />
                        </div>
                    )}

                    {/* ── Insights + Charts row ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }} className="no-print">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn-icon" style={{ fontSize: 11 }} onClick={() => setShowInsights(v => !v)}>
                                    <HiSparkles size={13} color="#6366f1" />
                                    {showInsights ? 'Hide' : 'Show'} Insights
                                </button>
                            </div>
                            {showInsights && <InsightsPanel meritData={meritData} grading={grading} subjects={subjects} />}
                        </div>
                        <SubjectChart meritData={meritData} />
                    </div>

                    {/* ── Grade distribution (visual) ── */}
                    <GradeDistribution meritData={meritData} grading={grading} filterGrade={filterGrade} setFilterGrade={setFilterGrade} />

                    {/* ── Podium ── */}
                    {filtered.length >= 1 && <Podium filtered={filtered.slice(0, 3)} />}

                    {/* ── Table toolbar ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} className="no-print">
                        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
                            <FiSearch size={13} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student name or adm no…"
                                style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => setViewMode('table')} style={{ background: viewMode === 'table' ? '#f8fafc' : '#fff', fontWeight: viewMode === 'table' ? 700 : 500 }}>
                                <FiList size={13} />
                            </button>
                            <button className="btn-icon" onClick={() => setViewMode('cards')} style={{ background: viewMode === 'cards' ? '#f8fafc' : '#fff', fontWeight: viewMode === 'cards' ? 700 : 500 }}>
                                <FiGrid size={13} />
                            </button>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                            {filtered.length} / {meritData.length} students · {showBest7 ? 'Best 7' : 'All Subjects'} · {selExamType}
                        </div>
                    </div>

                    {/* ── CARD VIEW ── */}
                    {viewMode === 'cards' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                            {filtered.map(row => {
                                const rank = (row as any).rank;
                                const c = gradeColor(row.meanGrade.grade);
                                return (
                                    <div key={row.student.id} style={{
                                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16,
                                        borderTop: `3px solid ${rank <= 3 ? (rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : '#cd7f32') : '#e2e8f0'}`,
                                        transition: 'box-shadow .2s',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <RankBadge rank={rank} />
                                            <GradeBadge grade={row.meanGrade.grade} size="md" />
                                        </div>
                                        <p style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', margin: 0 }}>{row.student.first_name} {row.student.last_name}</p>
                                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 10px' }}>{row.student.admission_no || row.student.admission_number}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>Points</p>
                                                <p style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{row.totalPoints}</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>Avg</p>
                                                <p style={{ fontSize: 18, fontWeight: 900, color: '#6366f1', margin: 0 }}>{row.avgScore.toFixed(1)}%</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>Subj</p>
                                                <p style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>{row.subjectCount}</p>
                                            </div>
                                        </div>
                                        {row.highestSubject && (
                                            <p style={{ fontSize: 10, color: '#10b981', fontWeight: 600, margin: '8px 0 0', background: '#d1fae5', borderRadius: 5, padding: '3px 7px', display: 'inline-block' }}>
                                                Best: {row.highestSubject.subjectName.slice(0, 14)} {row.highestSubject.score}%
                                            </p>
                                        )}
                                        <div style={{ marginTop: 8 }}>
                                            <SubjectBreakdown row={row} subjects={subjects} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── TABLE VIEW ── */}
                    {viewMode === 'table' && filtered.length === 0 && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
                            <p style={{ color: '#94a3b8', fontSize: 13 }}>No students match your filters.</p>
                        </div>
                    )}
                    {viewMode === 'table' && filtered.length > 0 && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                                    <thead>
                                        <tr style={{ background: 'linear-gradient(90deg,#fffbeb,#fef3c7,#fff7ed)' }}>
                                            <th className="alpha-th" style={{ width: 52 }}>Rank</th>
                                            <th className="alpha-th" style={{ width: 100 }} onClick={() => toggleSort('name')}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>Adm No</span>
                                            </th>
                                            <th className="alpha-th" style={{ minWidth: 180 }} onClick={() => toggleSort('name')}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>Student Name <SortIcon field="name" /></span>
                                            </th>
                                            <th className="alpha-th" style={{ width: 80 }}>Stream</th>
                                            <th className="alpha-th" style={{ width: 55 }}>Subj</th>
                                            <th className="alpha-th" style={{ width: 80 }} onClick={() => toggleSort('points')}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>{showBest7 ? 'B7 Pts' : 'Points'} <SortIcon field="points" /></span>
                                            </th>
                                            <th className="alpha-th" style={{ width: 90 }} onClick={() => toggleSort('avg')}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>Avg Score <SortIcon field="avg" /></span>
                                            </th>
                                            <th className="alpha-th" style={{ width: 65 }}>Grade</th>
                                            <th className="alpha-th" style={{ width: 80 }}>Best Subject</th>
                                            <th className="alpha-th" style={{ width: 80 }}>Weakest</th>
                                            <th className="alpha-th" style={{ width: 80 }}>Remarks</th>
                                            <th className="alpha-th no-print" style={{ width: 70 }}>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((row, i) => {
                                            const rank = (row as any).rank;
                                            const isTop3 = rank <= 3;
                                            return (
                                                <tr key={row.student.id} className="alpha-tr"
                                                    style={{ background: isTop3 ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafbff' }}>
                                                        <td className="alpha-td" style={{ textAlign: 'center' }}>
                                                            <RankBadge rank={rank} />
                                                        </td>
                                                        <td className="alpha-td" style={{ fontWeight: 700, color: '#3b82f6', fontSize: 12 }}>
                                                            {row.student.admission_no || row.student.admission_number}
                                                        </td>
                                                        <td className="alpha-td">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{
                                                                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                                                    background: `hsl(${(row.student.id * 37) % 360},70%,88%)`,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 11, fontWeight: 800, color: `hsl(${(row.student.id * 37) % 360},50%,35%)`,
                                                                }}>
                                                                    {row.student.first_name?.[0]}{row.student.last_name?.[0]}
                                                                </div>
                                                                <span style={{ fontWeight: 600 }}>{row.student.first_name} {row.student.last_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="alpha-td" style={{ fontSize: 11, color: '#64748b' }}>{getStreamName(row.student.stream_id)}</td>
                                                        <td className="alpha-td" style={{ textAlign: 'center', fontWeight: 700 }}>{row.subjectCount}</td>
                                                        <td className="alpha-td" style={{ textAlign: 'center', fontWeight: 900, fontSize: 16, color: '#0f172a' }}>{row.totalPoints}</td>
                                                        <td className="alpha-td" style={{ textAlign: 'center' }}>
                                                            <span style={{ fontWeight: 800, color: '#6366f1', fontSize: 13 }}>{row.avgScore.toFixed(1)}%</span>
                                                            <div style={{ height: 3, background: '#e0e7ff', borderRadius: 2, marginTop: 3 }}>
                                                                <div style={{ height: '100%', width: `${Math.min(row.avgScore, 100)}%`, background: '#6366f1', borderRadius: 2 }} />
                                                            </div>
                                                        </td>
                                                        <td className="alpha-td" style={{ textAlign: 'center' }}>
                                                            <GradeBadge grade={row.meanGrade.grade} size="md" />
                                                        </td>
                                                        <td className="alpha-td" style={{ fontSize: 11 }}>
                                                            {row.highestSubject ? (
                                                                <span style={{ color: '#10b981', fontWeight: 600 }}>
                                                                    {row.highestSubject.subjectName.slice(0, 10)} ({row.highestSubject.score})
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="alpha-td" style={{ fontSize: 11 }}>
                                                            {row.lowestSubject ? (
                                                                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                                    {row.lowestSubject.subjectName.slice(0, 10)} ({row.lowestSubject.score})
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="alpha-td" style={{ fontSize: 11, color: '#64748b' }}>{row.meanGrade.remarks}</td>
                                                        <td className="alpha-td no-print">
                                                            <SubjectBreakdown row={row} subjects={subjects} />
                                                        </td>
                                                    </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                    Showing <strong>{filtered.length}</strong> of <strong>{meritData.length}</strong> students
                                </span>
                                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                    {showBest7 ? 'Best 7 Subjects' : 'All Subjects'} · {selExamType} · AlphaSchool v2.0
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
