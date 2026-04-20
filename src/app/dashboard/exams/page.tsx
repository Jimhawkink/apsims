'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FiFileText, FiGrid, FiTrendingUp, FiPieChart, FiEdit3, FiPrinter, FiBarChart2, FiAward, FiUsers, FiBookOpen, FiCheckCircle, FiClock, FiChevronRight } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export default function ExamDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalStudents: 0, totalMarks: 0, totalSubjects: 0, totalExamTypes: 0 });
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [gRes, mRes, sRes, subRes, fRes, tRes] = await Promise.all([
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_students').select('*').eq('status', 'Active'),
            supabase.from('school_subjects').select('*').eq('is_active', true),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
        ]);
        setGrading(gRes.data || []);
        setMarks(mRes.data || []);
        setStudents(sRes.data || []);
        setSubjects(subRes.data || []);
        setForms(fRes.data || []);
        setTerms(tRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setStats({
            totalStudents: (sRes.data || []).length,
            totalMarks: (mRes.data || []).length,
            totalSubjects: (subRes.data || []).length,
            totalExamTypes: 6,
        });
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const termMarks = marks.filter(m => !selTerm || String(m.term_id) === selTerm);
    const avgScore = termMarks.length > 0 ? termMarks.reduce((a, m) => a + Number(m.score || 0), 0) / termMarks.length : 0;
    const avgGrade = getGrade(avgScore);

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    grading.forEach(g => { gradeDistribution[g.grade] = 0; });
    termMarks.forEach(m => {
        const g = getGrade(Number(m.score || 0));
        gradeDistribution[g.grade] = (gradeDistribution[g.grade] || 0) + 1;
    });

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
        'D-': '#dc2626', 'E': '#991b1b',
    };

    const gradeChartData = {
        labels: Object.keys(gradeDistribution),
        datasets: [{
            data: Object.values(gradeDistribution),
            backgroundColor: Object.keys(gradeDistribution).map(g => gradeColors[g] || '#94a3b8'),
            borderWidth: 0,
            borderRadius: 6,
        }],
    };

    // Subject performance
    const subjectAvgs: { name: string; avg: number; count: number }[] = subjects.map(sub => {
        const subMarks = termMarks.filter(m => m.subject_id === sub.id);
        const avg = subMarks.length > 0 ? subMarks.reduce((a, m) => a + Number(m.score || 0), 0) / subMarks.length : 0;
        return { name: sub.subject_name, avg, count: subMarks.length };
    }).filter(s => s.count > 0).sort((a, b) => b.avg - a.avg);

    const subjectChartData = {
        labels: subjectAvgs.slice(0, 12).map(s => s.name.length > 10 ? s.name.substring(0, 10) + '…' : s.name),
        datasets: [{
            label: 'Average Score',
            data: subjectAvgs.slice(0, 12).map(s => Math.round(s.avg * 10) / 10),
            backgroundColor: subjectAvgs.slice(0, 12).map(s => {
                if (s.avg >= 70) return '#22c55e';
                if (s.avg >= 50) return '#3b82f6';
                if (s.avg >= 35) return '#f59e0b';
                return '#ef4444';
            }),
            borderWidth: 0,
            borderRadius: 8,
        }],
    };

    // Form performance
    const formAvgs = forms.map(f => {
        const formStudentIds = students.filter(s => s.form_id === f.id).map(s => s.id);
        const fMarks = termMarks.filter(m => formStudentIds.includes(m.student_id));
        const avg = fMarks.length > 0 ? fMarks.reduce((a, m) => a + Number(m.score || 0), 0) / fMarks.length : 0;
        return { name: f.form_name, avg, count: fMarks.length };
    });

    const quickActions = [
        { href: '/dashboard/exams/marks', icon: FiEdit3, label: 'Enter Marks', desc: 'Broadsheet-style entry', color: '#3b82f6', bg: '#eff6ff' },
        { href: '/dashboard/exams/broadsheet', icon: FiGrid, label: 'View Broadsheet', desc: 'All subjects per class', color: '#8b5cf6', bg: '#f5f3ff' },
        { href: '/dashboard/exams/merit-list', icon: FiAward, label: 'Merit List', desc: 'Ranked student list', color: '#f59e0b', bg: '#fffbeb' },
        { href: '/dashboard/exams/report-cards', icon: FiPrinter, label: 'Report Cards', desc: 'Generate & print', color: '#10b981', bg: '#ecfdf5' },
        { href: '/dashboard/exams/analysis', icon: FiBarChart2, label: 'Analysis', desc: 'Performance trends', color: '#ef4444', bg: '#fef2f2' },
        { href: '/dashboard/exams/manage', icon: FiBookOpen, label: 'Exam Manager', desc: 'Create & manage exams', color: '#6366f1', bg: '#eef2ff' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                <p className="text-gray-400 text-sm">Loading Exam Dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📝 Examination Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Complete exam lifecycle — Mark entry, broadsheets, report cards & analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                        className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none min-w-[160px]">
                        <option value="">All Terms</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { icon: FiUsers, label: 'Total Students', value: stats.totalStudents, color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                    { icon: FiCheckCircle, label: 'Marks Entered', value: termMarks.length, color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)' },
                    { icon: FiBarChart2, label: 'Mean Score', value: avgScore > 0 ? `${avgScore.toFixed(1)}%` : '--', color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
                    { icon: FiAward, label: 'Mean Grade', value: termMarks.length > 0 ? avgGrade.grade : '--', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="rounded-2xl p-5 text-white shadow-lg" style={{ background: card.bg }}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold opacity-80 uppercase">{card.label}</p>
                                <Icon size={20} className="opacity-60" />
                            </div>
                            <p className="text-3xl font-extrabold">{card.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {quickActions.map((action, i) => {
                        const Icon = action.icon;
                        return (
                            <Link key={i} href={action.href}
                                className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                                    style={{ background: action.bg }}>
                                    <Icon size={20} style={{ color: action.color }} />
                                </div>
                                <p className="text-sm font-bold text-gray-800">{action.label}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{action.desc}</p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Grade Distribution */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiPieChart className="text-blue-500" /> Grade Distribution</h3>
                        <span className="text-xs text-gray-400">{termMarks.length} marks</span>
                    </div>
                    <div className="p-5">
                        {termMarks.length > 0 ? (
                            <div className="h-[280px] flex items-center justify-center">
                                <Doughnut data={gradeChartData} options={{
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11, weight: 'bold' as const } } } },
                                    cutout: '60%',
                                }} />
                            </div>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No marks data for this term</div>
                        )}
                    </div>
                </div>

                {/* Subject Performance */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiBarChart2 className="text-purple-500" /> Subject Performance</h3>
                        <span className="text-xs text-gray-400">{subjectAvgs.length} subjects</span>
                    </div>
                    <div className="p-5">
                        {subjectAvgs.length > 0 ? (
                            <div className="h-[280px]">
                                <Bar data={subjectChartData} options={{
                                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                                    scales: { x: { max: 100, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } },
                                    plugins: { legend: { display: false } },
                                }} />
                            </div>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No subject data</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Form/Class Performance */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiTrendingUp className="text-green-500" /> Class Performance Overview</h3>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {formAvgs.map((f, i) => {
                            const g = getGrade(f.avg);
                            const pct = f.avg;
                            return (
                                <div key={i} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-bold text-gray-800">{f.name}</p>
                                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white font-bold text-xs"
                                            style={{ background: gradeColors[g.grade] || '#94a3b8' }}>
                                            {g.grade}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-extrabold text-gray-800">{f.count > 0 ? f.avg.toFixed(1) : '--'}%</p>
                                    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: gradeColors[g.grade] || '#94a3b8' }} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1.5">{f.count} mark entries</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Top Performers Quick View */}
            {termMarks.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiAward className="text-amber-500" /> Recent High Scores</h3>
                        <Link href="/dashboard/exams/merit-list" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                            View Merit List <FiChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Score</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...termMarks].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 10).map((m, i) => {
                                    const student = students.find(s => s.id === m.student_id);
                                    const subject = subjects.find(s => s.id === m.subject_id);
                                    const g = getGrade(Number(m.score));
                                    return (
                                        <tr key={m.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{student ? `${student.first_name} ${student.last_name}` : '-'}</td>
                                            <td className="px-4 py-2.5 text-sm text-gray-600">{subject?.subject_name || '-'}</td>
                                            <td className="px-4 py-2.5 text-center text-sm font-bold text-gray-800">{m.score}%</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="inline-flex items-center justify-center w-9 h-7 rounded-md text-white font-bold text-xs"
                                                    style={{ background: gradeColors[g.grade] || '#94a3b8' }}>{g.grade}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
