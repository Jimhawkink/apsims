'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    FiFileText, FiGrid, FiTrendingUp, FiPieChart, FiEdit3, FiPrinter,
    FiBarChart2, FiAward, FiUsers, FiBookOpen, FiCheckCircle,
    FiChevronRight, FiAlertTriangle, FiTarget, FiZap, FiActivity,
    FiRefreshCw, FiEye, FiSend, FiLayers, FiCpu, FiSearch,
} from 'react-icons/fi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip,
    Legend, ArcElement, PointElement, LineElement, RadialLinearScale, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, RadialLinearScale, Filler,
);

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

const GRADE_COLORS: Record<string, string> = {
    'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6',
    'B-': '#60a5fa', 'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b',
    'D+': '#f97316', 'D': '#ef4444', 'D-': '#dc2626', 'E': '#991b1b',
};
const PASS_THRESHOLD = 50;

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
    const w = 64, h = 28;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    return (
        <svg width={w} height={h} style={{ opacity: 0.7 }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function Bar2({ value, color }: { value: number; color: string }) {
    return (
        <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden', width: '100%' }}>
            <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
        </div>
    );
}

function RiskBadge({ level }: { level: 'high' | 'medium' | 'watch' }) {
    const cfg = { high: { label: '🔴 High Risk', bg: '#fef2f2', color: '#dc2626' }, medium: { label: '🟡 Medium', bg: '#fffbeb', color: '#d97706' }, watch: { label: '🟠 Watch', bg: '#fff7ed', color: '#ea580c' } }[level];
    return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>;
}

export default function ExamDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'students' | 'subjects'>('overview');
    const [searchQ, setSearchQ] = useState('');
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        const [gRes, mRes, sRes, subRes, fRes, tRes, stRes] = await Promise.all([
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_students').select('*').eq('status', 'Active'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_streams').select('*').order('stream_name').limit(50),
        ]);
        setGrading(gRes.data || []);
        setMarks(mRes.data || []);
        setStudents(sRes.data || []);
        setSubjects(subRes.data || []);
        setForms(fRes.data || []);
        setTerms(tRes.data || []);
        setStreams(stRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur && !selTerm) setSelTerm(String(cur.id));
        setLastUpdated(new Date());
        if (!silent) setLoading(false); else setRefreshing(false);
    }, [selTerm]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getGrade = useCallback((score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    }, [grading]);

    const termMarks = useMemo(() => {
        let m = marks;
        if (selTerm) m = m.filter(x => String(x.term_id) === selTerm);
        if (selForm) { const ids = students.filter(s => String(s.form_id) === selForm).map(s => s.id); m = m.filter(x => ids.includes(x.student_id)); }
        if (selStream) { const ids = students.filter(s => String(s.stream_id) === selStream).map(s => s.id); m = m.filter(x => ids.includes(x.student_id)); }
        return m;
    }, [marks, selTerm, selForm, selStream, students]);

    const prevTermMarks = useMemo(() => {
        const idx = terms.findIndex(t => String(t.id) === selTerm);
        const prev = terms[idx + 1];
        return prev ? marks.filter(x => String(x.term_id) === String(prev.id)) : [];
    }, [marks, terms, selTerm]);

    const avgScore = useMemo(() => termMarks.length > 0 ? termMarks.reduce((a, m) => a + Number(m.score || 0), 0) / termMarks.length : 0, [termMarks]);
    const prevAvg = useMemo(() => prevTermMarks.length > 0 ? prevTermMarks.reduce((a, m) => a + Number(m.score || 0), 0) / prevTermMarks.length : 0, [prevTermMarks]);
    const avgGrade = getGrade(avgScore);
    const scoreDelta = avgScore - prevAvg;

    const passRate = useMemo(() => termMarks.length > 0 ? (termMarks.filter(m => Number(m.score || 0) >= PASS_THRESHOLD).length / termMarks.length) * 100 : 0, [termMarks]);

    const marksCompletion = useMemo(() => {
        const total = students.length * Math.max(subjects.length, 1);
        return total > 0 ? Math.min(100, (termMarks.length / total) * 100) : 0;
    }, [termMarks, students, subjects]);

    const studentTotals = useMemo(() => {
        const map: Record<number, { total: number; count: number; name: string; form: string }> = {};
        termMarks.forEach(m => {
            const s = students.find(x => x.id === m.student_id);
            if (!s) return;
            const form = forms.find(f => f.id === s.form_id);
            if (!map[m.student_id]) map[m.student_id] = { total: 0, count: 0, name: `${s.first_name} ${s.last_name}`, form: form?.form_name || '' };
            map[m.student_id].total += Number(m.score || 0);
            map[m.student_id].count++;
        });
        return Object.entries(map).map(([id, v]) => ({ id: Number(id), name: v.name, form: v.form, avg: v.count > 0 ? v.total / v.count : 0, count: v.count })).sort((a, b) => b.avg - a.avg);
    }, [termMarks, students, forms]);

    const atRiskStudents = studentTotals.filter(s => s.avg < 35).slice(0, 8);

    const gradeDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        grading.forEach(g => { dist[g.grade] = 0; });
        termMarks.forEach(m => { const g = getGrade(Number(m.score || 0)); dist[g.grade] = (dist[g.grade] || 0) + 1; });
        return dist;
    }, [termMarks, grading, getGrade]);

    const subjectAvgs = useMemo(() => subjects.map(sub => {
        const sm = termMarks.filter(m => m.subject_id === sub.id);
        const avg = sm.length > 0 ? sm.reduce((a, m) => a + Number(m.score || 0), 0) / sm.length : 0;
        const pass = sm.length > 0 ? (sm.filter(m => Number(m.score || 0) >= PASS_THRESHOLD).length / sm.length) * 100 : 0;
        return { name: sub.subject_name, avg, pass, count: sm.length, id: sub.id };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg), [termMarks, subjects]);

    const formAvgs = useMemo(() => forms.map(f => {
        const sIds = students.filter(s => s.form_id === f.id).map(s => s.id);
        const fm = termMarks.filter(m => sIds.includes(m.student_id));
        const avg = fm.length > 0 ? fm.reduce((a, m) => a + Number(m.score || 0), 0) / fm.length : 0;
        const pass = fm.length > 0 ? (fm.filter(m => Number(m.score || 0) >= PASS_THRESHOLD).length / fm.length) * 100 : 0;
        return { name: f.form_name, avg, pass, count: sIds.length, marks: fm.length };
    }), [forms, students, termMarks]);

    const termTrend = useMemo(() => [...terms].slice(0, 6).reverse().map(t => {
        const tm = marks.filter(m => String(m.term_id) === String(t.id));
        return { label: t.term_name?.replace('Term', 'T') || `T${t.id}`, avg: tm.length > 0 ? tm.reduce((a, m) => a + Number(m.score || 0), 0) / tm.length : 0 };
    }), [marks, terms]);

    const filteredStudents = useMemo(() => studentTotals.filter(s => !searchQ || s.name.toLowerCase().includes(searchQ.toLowerCase())), [studentTotals, searchQ]);

    const QUICK_ACTIONS = [
        { href: '/dashboard/exams/marks', icon: FiEdit3, label: 'Enter Marks', desc: 'Broadsheet entry', color: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', badge: '' },
        { href: '/dashboard/exams/broadsheet', icon: FiGrid, label: 'Broadsheet', desc: 'All subjects', color: '#8b5cf6', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', badge: '' },
        { href: '/dashboard/exams/merit-list', icon: FiAward, label: 'Merit List', desc: 'Ranked students', color: '#f59e0b', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', badge: '' },
        { href: '/dashboard/exams/report-cards', icon: FiPrinter, label: 'Report Cards', desc: 'Generate & print', color: '#10b981', bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', badge: '' },
        { href: '/dashboard/exams/manage', icon: FiBookOpen, label: 'Exam Manager', desc: 'Create & schedule', color: '#6366f1', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', badge: '' },
        { href: '/dashboard/exams/analysis', icon: FiBarChart2, label: 'Analytics', desc: 'Deep analysis', color: '#ef4444', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', badge: '' },
        { href: '/dashboard/exams/subject-grading', icon: FiLayers, label: 'Grading System', desc: 'Grade boundaries', color: '#0891b2', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)', badge: '' },
        { href: '/dashboard/exams/release-results', icon: FiSend, label: 'Release Results', desc: 'Publish to portals', color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', badge: '🚀' },
        { href: '/dashboard/exams/online-exam', icon: FiCpu, label: 'Online Exams', desc: 'Digital testing', color: '#0d9488', bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', badge: '✨' },
        { href: '/dashboard/exams/question-bank', icon: FiBookOpen, label: 'Question Bank', desc: 'AI-powered Q&A', color: '#b45309', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', badge: '🤖' },
        { href: '/dashboard/exams/marks-completion', icon: FiCheckCircle, label: 'Completion', desc: 'Missing marks', color: '#059669', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', badge: '' },
        { href: '/dashboard/exams/detailed-analysis', icon: FiEye, label: 'Deep Insights', desc: 'Full diagnostics', color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', badge: '🔥' },
    ];

    const ANALYSIS_LINKS = [
        { href: '/dashboard/exams/term-trend', label: '📈 Term Trend Analysis', desc: 'Track across terms' },
        { href: '/dashboard/exams/grade-heatmap', label: '🟥 Grade Heatmap', desc: 'Student × Subject matrix' },
        { href: '/dashboard/exams/subject-difficulty', label: '🧠 Subject Difficulty Index', desc: 'Hardest vs easiest' },
        { href: '/dashboard/exams/peer-comparison', label: '⚔️ Peer Comparison', desc: 'Class vs class' },
        { href: '/dashboard/exams/school-ranking', label: '🏆 School Ranking', desc: 'National simulation' },
        { href: '/dashboard/exams/five-year-trend', label: '📅 5-Year Trend', desc: 'Historical overview' },
        { href: '/dashboard/exams/kcse-prediction', label: '🎯 KCSE Prediction', desc: 'AI projected grades' },
        { href: '/dashboard/exams/university-predictor', label: '🎓 University Predictor', desc: 'Course clusters' },
        { href: '/dashboard/exams/national-readiness', label: '🌍 National Readiness', desc: 'KNEC readiness score' },
        { href: '/dashboard/exams/value-added', label: '💎 Value-Added Analysis', desc: 'School contribution' },
        { href: '/dashboard/exams/teacher-correlation', label: '👨‍🏫 Teacher Impact', desc: 'Teacher vs outcomes' },
        { href: '/dashboard/exams/targets-tracker', label: '🎯 Targets Tracker', desc: 'Goal vs actual' },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <FiFileText size={26} color="#fff" />
                </div>
                <div style={{ width: 40, height: 40, border: '4px solid #dbeafe', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#64748b', fontWeight: 600 }}>Loading Examination Intelligence…</p>
                <p style={{ color: '#94a3b8', fontSize: 12 }}>Fetching marks, analytics & insights</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Inter',system-ui,sans-serif" }}>

            {/* ── PREMIUM HEADER ── */}
            <div style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 55%,#4f46e5 100%)', borderRadius: 20, padding: '24px 28px', color: '#fff', boxShadow: '0 20px 60px rgba(29,78,216,0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', bottom: -20, right: 100, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 10px' }}><FiFileText size={22} /></div>
                            <div>
                                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Examination Intelligence Hub</h1>
                                <p style={{ fontSize: 13, opacity: 0.75, margin: 0 }}>Full lifecycle — Entry · Analytics · Reports · Predictions · Release</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {[{ icon: FiUsers, val: `${students.length} Students` }, { icon: FiBookOpen, val: `${subjects.length} Subjects` }, { icon: FiLayers, val: `${forms.length} Classes` }, { icon: FiActivity, val: `${termMarks.length.toLocaleString()} Marks` }].map((b, i) => {
                                const Icon = b.icon;
                                return <span key={i} style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 99, padding: '3px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}><Icon size={12} /> {b.val}</span>;
                            })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {[{ val: selTerm, set: setSelTerm, opts: terms, label: 'All Terms', key: 'term_name', year: true }, { val: selForm, set: setSelForm, opts: forms, label: 'All Classes', key: 'form_name', year: false }].map((s, i) => (
                            <select key={i} value={s.val} onChange={e => s.set(e.target.value)}
                                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', minWidth: 130 }}>
                                <option value="" style={{ color: '#111' }}>{s.label}</option>
                                {s.opts.map((o: any) => <option key={o.id} value={o.id} style={{ color: '#111' }}>{o[s.key]} {s.year ? (o.academic_year || '') : ''}</option>)}
                            </select>
                        ))}
                        {streams.length > 0 && (
                            <select value={selStream} onChange={e => setSelStream(e.target.value)}
                                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
                                <option value="" style={{ color: '#111' }}>All Streams</option>
                                {streams.map((s: any) => <option key={s.id} value={s.id} style={{ color: '#111' }}>{s.stream_name}</option>)}
                            </select>
                        )}
                        <button onClick={() => fetchAll(true)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                            <FiRefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                        </button>
                    </div>
                </div>
                <p style={{ position: 'absolute', bottom: 8, right: 18, fontSize: 10, opacity: 0.4, margin: 0 }}>Updated: {lastUpdated.toLocaleTimeString()}</p>
            </div>

            {/* ── TABS ── */}
            <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 14, padding: 4, width: 'fit-content' }}>
                {[{ key: 'overview', label: '🏠 Overview' }, { key: 'performance', label: '📊 Performance' }, { key: 'students', label: '👥 Students' }, { key: 'subjects', label: '📚 Subjects' }].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                        style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all .2s', background: activeTab === tab.key ? '#fff' : 'transparent', color: activeTab === tab.key ? '#1d4ed8' : '#64748b', boxShadow: activeTab === tab.key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none' }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════ OVERVIEW TAB ═══════════ */}
            {activeTab === 'overview' && <>
                {/* 6 KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
                    {[
                        { label: 'Total Students', value: students.length, icon: FiUsers, bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', sub: `${forms.length} classes`, spark: formAvgs.map(f => f.count) },
                        { label: 'Marks Recorded', value: termMarks.length.toLocaleString(), icon: FiCheckCircle, bg: 'linear-gradient(135deg,#10b981,#059669)', sub: `${marksCompletion.toFixed(0)}% complete`, spark: termTrend.map(t => t.avg) },
                        { label: 'Mean Score', value: avgScore > 0 ? `${avgScore.toFixed(1)}%` : '--', icon: FiBarChart2, bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', sub: scoreDelta !== 0 && prevAvg > 0 ? `${scoreDelta > 0 ? '▲' : '▼'} ${Math.abs(scoreDelta).toFixed(1)}%` : 'First term', spark: termTrend.map(t => t.avg) },
                        { label: 'Mean Grade', value: termMarks.length > 0 ? avgGrade.grade : '--', icon: FiAward, bg: 'linear-gradient(135deg,#f59e0b,#d97706)', sub: avgGrade.remarks, spark: [] },
                        { label: 'Pass Rate', value: `${passRate.toFixed(1)}%`, icon: FiTarget, bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', sub: 'Score ≥ 50%', spark: termTrend.map(t => t.avg) },
                        { label: 'At Risk', value: atRiskStudents.length, icon: FiAlertTriangle, bg: 'linear-gradient(135deg,#ef4444,#dc2626)', sub: 'Below 35% avg', spark: [] },
                    ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                            <div key={i} style={{ background: card.bg, borderRadius: 16, padding: '18px 16px', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: -12, right: -12, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{card.label}</p>
                                    <Icon size={16} style={{ opacity: 0.7 }} />
                                </div>
                                <p style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', letterSpacing: -1 }}>{card.value}</p>
                                <p style={{ fontSize: 10, opacity: 0.7, margin: 0 }}>{card.sub}</p>
                                {card.spark.length > 1 && <div style={{ marginTop: 6 }}><Sparkline data={card.spark} color="rgba(255,255,255,0.65)" /></div>}
                            </div>
                        );
                    })}
                </div>

                {/* Marks Completion Banner */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiCheckCircle size={18} color="#10b981" />
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Marks Entry Completion</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>— {termMarks.length} of ~{students.length * subjects.length} expected entries</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 24, fontWeight: 900, color: marksCompletion >= 80 ? '#059669' : marksCompletion >= 50 ? '#d97706' : '#dc2626' }}>{marksCompletion.toFixed(0)}%</span>
                            <Link href="/dashboard/exams/marks-completion" style={{ background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FiEye size={12} /> View Missing
                            </Link>
                        </div>
                    </div>
                    <Bar2 value={marksCompletion} color={marksCompletion >= 80 ? '#10b981' : marksCompletion >= 50 ? '#f59e0b' : '#ef4444'} />
                    <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                        {formAvgs.map((f, i) => {
                            const sIds = students.filter(s => s.form_id === forms[i]?.id).map(s => s.id);
                            const count = termMarks.filter(m => sIds.includes(m.student_id)).length;
                            const exp = sIds.length * Math.max(subjects.length, 1);
                            const pct = exp > 0 ? (count / exp) * 100 : 0;
                            return (
                                <div key={i} style={{ flex: 1, minWidth: 80 }}>
                                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 3px', fontWeight: 600 }}>{f.name}</p>
                                    <Bar2 value={pct} color={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'} />
                                    <p style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>{pct.toFixed(0)}%</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>⚡ Quick Actions</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
                        {QUICK_ACTIONS.map((action, i) => {
                            const Icon = action.icon;
                            return (
                                <Link key={i} href={action.href}
                                    style={{ textDecoration: 'none', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'all .2s', position: 'relative', cursor: 'pointer' }}
                                    className="hover:shadow-lg hover:-translate-y-0.5">
                                    {action.badge && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 11 }}>{action.badge}</span>}
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                        <Icon size={20} color={action.color} />
                                    </div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>{action.label}</p>
                                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{action.desc}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
                    {/* Grade Doughnut */}
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><FiPieChart color="#3b82f6" size={15} /> Grade Distribution</h3>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{termMarks.length} marks</span>
                        </div>
                        <div style={{ padding: 16, height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {termMarks.length > 0 ? <Doughnut data={{ labels: Object.keys(gradeDistribution), datasets: [{ data: Object.values(gradeDistribution), backgroundColor: Object.keys(gradeDistribution).map(g => GRADE_COLORS[g] || '#94a3b8'), borderWidth: 0, borderRadius: 4 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, padding: 6, font: { size: 10 } } } } }} />
                                : <p style={{ color: '#94a3b8', fontSize: 13 }}>No marks for selected term</p>}
                        </div>
                    </div>

                    {/* Term Trend Line */}
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><FiTrendingUp color="#10b981" size={15} /> Term Trend</h3>
                            <Link href="/dashboard/exams/term-trend" style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Full →</Link>
                        </div>
                        <div style={{ padding: 16, height: 250 }}>
                            <Line data={{ labels: termTrend.map(t => t.label), datasets: [{ label: 'Mean Score', data: termTrend.map(t => Math.round(t.avg * 10) / 10), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#3b82f6', fill: true, tension: 0.4 }] }}
                                options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, grid: { color: '#f8fafc' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
                        </div>
                    </div>

                    {/* Subject Radar */}
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><FiZap color="#6366f1" size={15} /> Subject Strength Radar</h3>
                        </div>
                        <div style={{ padding: 16, height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {subjectAvgs.length > 2 ?
                                <Radar data={{ labels: subjectAvgs.slice(0, 8).map(s => s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name), datasets: [{ label: '%', data: subjectAvgs.slice(0, 8).map(s => Math.round(s.avg)), backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366f1', borderWidth: 2, pointBackgroundColor: '#6366f1', pointRadius: 4 }] }}
                                    options={{ responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { font: { size: 9 } }, pointLabels: { font: { size: 9 } } } }, plugins: { legend: { display: false } } }} />
                                : <p style={{ color: '#94a3b8', fontSize: 13 }}>Need 3+ subjects with marks</p>}
                        </div>
                    </div>
                </div>

                {/* Class Performance */}
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><FiLayers color="#f59e0b" size={15} /> Class Performance Overview</h3>
                        <Link href="/dashboard/exams/analysis" style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Full Analysis →</Link>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
                        {formAvgs.map((f, i) => {
                            const g = getGrade(f.avg);
                            return (
                                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }} className="hover:shadow-md transition-all">
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GRADE_COLORS[g.grade] || '#94a3b8' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, marginTop: 4 }}>
                                        <p style={{ fontWeight: 800, color: '#1e293b', fontSize: 15, margin: 0 }}>{f.name}</p>
                                        <span style={{ background: GRADE_COLORS[g.grade] || '#94a3b8', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 800 }}>{g.grade}</span>
                                    </div>
                                    <p style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: -1 }}>{f.marks > 0 ? f.avg.toFixed(1) : '--'}<span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>%</span></p>
                                    <Bar2 value={f.avg} color={GRADE_COLORS[g.grade] || '#94a3b8'} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{f.count} students</span>
                                        <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Pass: {f.marks > 0 ? f.pass.toFixed(0) : '--'}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* At-Risk Alert */}
                {atRiskStudents.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #fecaca', boxShadow: '0 2px 12px rgba(220,38,38,0.08)' }}>
                        <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiAlertTriangle size={15} /> ⚠️ At-Risk Students ({atRiskStudents.length})
                                <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 99, padding: '1px 8px', fontSize: 10 }}>Below 35% avg</span>
                            </h3>
                            <Link href="/dashboard/exams/analysis" style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>Intervention Plan →</Link>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#fafafa' }}>
                                    {['#', 'Student', 'Class', 'Avg Score', 'Grade', 'Subjects', 'Risk Level'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>{atRiskStudents.map((s, i) => {
                                    const g = getGrade(s.avg);
                                    const risk: 'high' | 'medium' | 'watch' = s.avg < 20 ? 'high' : s.avg < 28 ? 'medium' : 'watch';
                                    return (
                                        <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-red-50">
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{i + 1}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.name}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{s.form}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: '#dc2626' }}>{s.avg.toFixed(1)}%</td>
                                            <td style={{ padding: '10px 14px' }}><span style={{ background: GRADE_COLORS[g.grade] || '#94a3b8', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{g.grade}</span></td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{s.count}</td>
                                            <td style={{ padding: '10px 14px' }}><RiskBadge level={risk} /></td>
                                        </tr>
                                    );
                                })}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Advanced Analysis Links */}
                <div>
                    <h2 style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🔬 Advanced Analytics & Intelligence</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                        {ANALYSIS_LINKS.map((link, i) => (
                            <Link key={i} href={link.href}
                                style={{ textDecoration: 'none', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all .2s' }}
                                className="hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5">
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 3px' }}>{link.label}</p>
                                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{link.desc}</p>
                                </div>
                                <FiChevronRight size={16} color="#cbd5e1" />
                            </Link>
                        ))}
                    </div>
                </div>
            </>}

            {/* ═══════════ PERFORMANCE TAB ═══════════ */}
            {activeTab === 'performance' && <>
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>📊 Subject Performance Rankings</h3>
                    </div>
                    <div style={{ padding: 20, height: 380 }}>
                        {subjectAvgs.length > 0 ?
                            <Bar data={{ labels: subjectAvgs.slice(0, 10).map(s => s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name), datasets: [{ label: 'Avg Score', data: subjectAvgs.slice(0, 10).map(s => Math.round(s.avg * 10) / 10), backgroundColor: subjectAvgs.slice(0, 10).map(s => s.avg >= 70 ? '#059669' : s.avg >= 50 ? '#3b82f6' : s.avg >= 35 ? '#f59e0b' : '#ef4444'), borderWidth: 0, borderRadius: 8 }] }}
                                options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { max: 100, grid: { color: '#f8fafc' } }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
                            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data for selected filters</div>}
                    </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>📋 Full Subject Table</h3></div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f8fafc' }}>
                                {['Rank', 'Subject', 'Avg Score', 'Grade', 'Pass Rate', 'Entries', 'Performance'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>{subjectAvgs.map((s, i) => {
                                const g = getGrade(s.avg);
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-gray-50">
                                        <td style={{ padding: '10px 14px', fontSize: 13, color: i < 3 ? '#f59e0b' : '#94a3b8', fontWeight: i < 3 ? 800 : 400 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.name}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 800, color: GRADE_COLORS[g.grade] || '#374151' }}>{s.avg.toFixed(1)}%</td>
                                        <td style={{ padding: '10px 14px' }}><span style={{ background: GRADE_COLORS[g.grade] || '#94a3b8', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{g.grade}</span></td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, color: s.pass >= 60 ? '#059669' : s.pass >= 40 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{s.pass.toFixed(0)}%</td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{s.count}</td>
                                        <td style={{ padding: '10px 14px', minWidth: 120 }}><Bar2 value={s.avg} color={GRADE_COLORS[g.grade] || '#94a3b8'} /></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>
            </>}

            {/* ═══════════ STUDENTS TAB ═══════════ */}
            {activeTab === 'students' && <>
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', borderBottom: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: 0 }}>🏆 Top Performers — Merit Ranking</h3>
                        <Link href="/dashboard/exams/merit-list" style={{ fontSize: 11, color: '#d97706', fontWeight: 600, textDecoration: 'none' }}>Full Merit List →</Link>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f8fafc' }}>
                                {['Rank', 'Student', 'Class', 'Mean Score', 'Grade', 'Subjects', 'Points'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>{studentTotals.slice(0, 10).map((s, i) => {
                                const g = getGrade(s.avg);
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc', background: i < 3 ? '#fffbf0' : 'transparent' }} className="hover:bg-amber-50">
                                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#94a3b8' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{s.name}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{s.form}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 900, color: GRADE_COLORS[g.grade] || '#374151' }}>{s.avg.toFixed(1)}%</td>
                                        <td style={{ padding: '10px 14px' }}><span style={{ background: GRADE_COLORS[g.grade] || '#94a3b8', color: '#fff', borderRadius: 7, padding: '3px 12px', fontSize: 13, fontWeight: 800 }}>{g.grade}</span></td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{s.count}</td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{g.points}</td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>👥 All Students — {filteredStudents.length} records</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '6px 12px', minWidth: 220 }}>
                            <FiSearch size={14} color="#94a3b8" />
                            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search student…"
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr style={{ background: '#f8fafc' }}>
                                    {['#', 'Student', 'Class', 'Avg Score', 'Grade', 'Subjects', 'Bar'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>{filteredStudents.map((s, i) => {
                                const g = getGrade(s.avg);
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }} className="hover:bg-gray-50">
                                        <td style={{ padding: '8px 14px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{i + 1}</td>
                                        <td style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{s.name}</td>
                                        <td style={{ padding: '8px 14px', fontSize: 12, color: '#64748b' }}>{s.form}</td>
                                        <td style={{ padding: '8px 14px', fontSize: 14, fontWeight: 800, color: GRADE_COLORS[g.grade] || '#374151' }}>{s.avg.toFixed(1)}%</td>
                                        <td style={{ padding: '8px 14px' }}><span style={{ background: GRADE_COLORS[g.grade] || '#94a3b8', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{g.grade}</span></td>
                                        <td style={{ padding: '8px 14px', fontSize: 12, color: '#64748b' }}>{s.count}</td>
                                        <td style={{ padding: '8px 14px', minWidth: 100 }}><Bar2 value={s.avg} color={GRADE_COLORS[g.grade] || '#94a3b8'} /></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>
            </>}

            {/* ═══════════ SUBJECTS TAB ═══════════ */}
            {activeTab === 'subjects' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
                    {subjectAvgs.length > 0 ? subjectAvgs.map((s, i) => {
                        const g = getGrade(s.avg);
                        return (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} className="hover:shadow-lg transition-all">
                                <div style={{ height: 5, background: GRADE_COLORS[g.grade] || '#94a3b8' }} />
                                <div style={{ padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div><p style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, margin: '0 0 2px' }}>{s.name}</p><p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{s.count} students sat</p></div>
                                        <span style={{ background: GRADE_COLORS[g.grade] || '#94a3b8', color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 14, fontWeight: 800 }}>{g.grade}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                        <span style={{ fontSize: 34, fontWeight: 900, color: GRADE_COLORS[g.grade] || '#374151', letterSpacing: -1 }}>{s.avg.toFixed(1)}<span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>%</span></span>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>Pass Rate</p>
                                            <p style={{ fontSize: 17, fontWeight: 800, color: s.pass >= 60 ? '#059669' : s.pass >= 40 ? '#d97706' : '#dc2626', margin: 0 }}>{s.pass.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                    <Bar2 value={s.avg} color={GRADE_COLORS[g.grade] || '#94a3b8'} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>#{i + 1} ranked</span>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{g.remarks}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                            <FiBookOpen size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p>No subject data for selected filters</p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
