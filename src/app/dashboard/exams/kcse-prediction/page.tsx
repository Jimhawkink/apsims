'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiTrendingUp, FiAlertTriangle, FiCheckCircle, FiStar, FiUsers,
    FiBarChart2, FiDownload, FiRefreshCw, FiFilter, FiAward,
    FiTarget, FiArrowUp, FiArrowDown, FiMinus, FiBookOpen
} from 'react-icons/fi';

const GRADE_THRESHOLDS = [
    { grade: 'A', min: 80, color: '#16a34a', bg: '#f0fdf4', points: 12 },
    { grade: 'A-', min: 75, color: '#15803d', bg: '#dcfce7', points: 11 },
    { grade: 'B+', min: 70, color: '#0891b2', bg: '#ecfeff', points: 10 },
    { grade: 'B', min: 65, color: '#2563eb', bg: '#eff6ff', points: 9 },
    { grade: 'B-', min: 60, color: '#4f46e5', bg: '#eef2ff', points: 8 },
    { grade: 'C+', min: 55, color: '#7c3aed', bg: '#f5f3ff', points: 7 },
    { grade: 'C', min: 50, color: '#d97706', bg: '#fffbeb', points: 6 },
    { grade: 'C-', min: 45, color: '#ea580c', bg: '#fff7ed', points: 5 },
    { grade: 'D+', min: 40, color: '#dc2626', bg: '#fef2f2', points: 4 },
    { grade: 'D', min: 35, color: '#b91c1c', bg: '#fee2e2', points: 3 },
    { grade: 'D-', min: 30, color: '#991b1b', bg: '#fecaca', points: 2 },
    { grade: 'E', min: 0, color: '#7f1d1d', bg: '#fca5a5', points: 1 },
];

const getGrade = (score: number) => GRADE_THRESHOLDS.find(g => score >= g.min) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
const getMeanGrade = (points: number) => {
    const mean = Math.round(points);
    return GRADE_THRESHOLDS.find(g => g.points === mean) || GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
};

export default function KCSEPredictionPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [forms, setForms] = useState<any[]>([]);
    const [selectedForm, setSelectedForm] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');
    const [filterRisk, setFilterRisk] = useState('all');
    const [sortBy, setSortBy] = useState<'meanPoints' | 'name' | 'risk'>('meanPoints');
    const [stats, setStats] = useState({ total: 0, atRisk: 0, excelling: 0, avgPoints: 0 });

    const computePredictions = useCallback(async () => {
        setLoading(true);
        try {
            const [studentsRes, formsRes, marksRes] = await Promise.all([
                supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id,school_forms(form_name,form_level),school_streams(stream_name)').order('first_name').limit(5000),
                supabase.from('school_forms').select('*').order('form_level'),
                supabase.from('school_marks').select('student_id,subject_id,score,exam_id,school_subjects(subject_name,subject_code)').limit(50000),
            ]);

            setForms(formsRes.data || []);
            const allStudents = studentsRes.data || [];
            const allMarks = marksRes.data || [];

            // Group marks by student
            const marksByStudent: Record<number, any[]> = {};
            allMarks.forEach((m: any) => {
                if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = [];
                marksByStudent[m.student_id].push(m);
            });

            const preds = allStudents.map((student: any) => {
                const studentMarks = marksByStudent[student.id] || [];

                // Group by subject, take latest average
                const bySubject: Record<string, number[]> = {};
                studentMarks.forEach((m: any) => {
                    const subName = m.school_subjects?.subject_name || `Sub${m.subject_id}`;
                    if (!bySubject[subName]) bySubject[subName] = [];
                    if (m.score != null) bySubject[subName].push(Number(m.score));
                });

                const subjectAverages = Object.entries(bySubject).map(([name, scores]) => ({
                    name,
                    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
                    count: scores.length,
                })).sort((a, b) => b.avg - a.avg);

                // KCSE: Best 7 subjects (mandatory + best electives)
                const best7 = subjectAverages.slice(0, 7);
                const meanPoints = best7.length > 0
                    ? best7.reduce((s, sub) => s + getGrade(sub.avg).points, 0) / best7.length
                    : 0;

                const predictedGrade = getMeanGrade(meanPoints);
                const examCount = [...new Set(studentMarks.map((m: any) => m.exam_id))].length;
                const riskScore = meanPoints < 5 ? 'high' : meanPoints < 7 ? 'medium' : 'low';
                const trend = subjectAverages.length > 0
                    ? (best7[0]?.avg || 0) - (subjectAverages[subjectAverages.length - 1]?.avg || 0)
                    : 0;

                return {
                    ...student,
                    subjectAverages,
                    best7,
                    meanPoints: Number(meanPoints.toFixed(2)),
                    predictedGrade,
                    examCount,
                    riskScore,
                    trend,
                    hasMarks: studentMarks.length > 0,
                };
            });

            // Sort by meanPoints descending
            const sorted = preds.filter(p => p.hasMarks).sort((a, b) => b.meanPoints - a.meanPoints);
            sorted.forEach((s, i) => { s.rank = i + 1; });
            const all = [...sorted, ...preds.filter(p => !p.hasMarks)];

            setPredictions(all);
            setStats({
                total: all.filter(p => p.hasMarks).length,
                atRisk: all.filter(p => p.riskScore === 'high').length,
                excelling: all.filter(p => p.meanPoints >= 9).length,
                avgPoints: all.filter(p => p.hasMarks).length > 0
                    ? all.filter(p => p.hasMarks).reduce((s, p) => s + p.meanPoints, 0) / all.filter(p => p.hasMarks).length
                    : 0,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { computePredictions(); }, [computePredictions]);

    const filtered = predictions.filter(p => {
        if (!p.hasMarks) return false;
        if (selectedForm !== 'all' && String(p.form_id) !== selectedForm) return false;
        if (filterGrade !== 'all' && p.predictedGrade?.grade !== filterGrade) return false;
        if (filterRisk !== 'all' && p.riskScore !== filterRisk) return false;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'meanPoints') return b.meanPoints - a.meanPoints;
        if (sortBy === 'name') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        if (sortBy === 'risk') return (a.riskScore === 'high' ? 0 : a.riskScore === 'medium' ? 1 : 2) - (b.riskScore === 'high' ? 0 : b.riskScore === 'medium' ? 1 : 2);
        return 0;
    });

    const exportCSV = () => {
        const rows = ['Rank,Name,Admission,Form,Stream,Subjects,Mean Points,Predicted Grade,Risk Level'];
        filtered.forEach(p => {
            rows.push([p.rank || '', `${p.first_name} ${p.last_name}`, p.admission_no || p.admission_number, p.school_forms?.form_name, p.school_streams?.stream_name, p.subjectAverages.length, p.meanPoints, p.predictedGrade?.grade, p.riskScore].join(','));
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = 'kcse_predictions.csv'; a.click();
    };

    const RISK_CONFIG = {
        high: { label: '🔴 At Risk', color: '#dc2626', bg: '#fef2f2', desc: 'Mean < C' },
        medium: { label: '🟡 Average', color: '#d97706', bg: '#fffbeb', desc: 'Mean C to B-' },
        low: { label: '🟢 Excelling', color: '#16a34a', bg: '#f0fdf4', desc: 'Mean B to A' },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
            {/* Header */}
            <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6366f1 100%)' }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-3">
                            <FiTarget size={28} /> KCSE/KCPE Performance Prediction
                        </h1>
                        <p className="text-indigo-200 text-sm mt-1">AI-powered grade prediction based on continuous assessment data</p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { label: 'Students Analyzed', val: stats.total, icon: FiUsers, color: '#a5b4fc' },
                            { label: 'At Risk', val: stats.atRisk, icon: FiAlertTriangle, color: '#fca5a5' },
                            { label: 'Excelling (B+)', val: stats.excelling, icon: FiStar, color: '#fde68a' },
                            { label: 'School Mean', val: getMeanGrade(Math.round(stats.avgPoints))?.grade || '—', icon: FiAward, color: '#6ee7b7' },
                        ].map(s => {
                            const Icon = s.icon;
                            return (
                                <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[100px]">
                                    <Icon size={18} className="mx-auto mb-1" style={{ color: s.color }} />
                                    <p className="text-2xl font-black">{s.val}</p>
                                    <p className="text-indigo-200 text-[10px]">{s.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Risk Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {Object.entries(RISK_CONFIG).map(([key, cfg]) => {
                    const count = predictions.filter(p => p.riskScore === key && p.hasMarks).length;
                    return (
                        <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all"
                            style={{ borderLeft: `4px solid ${cfg.color}` }}
                            onClick={() => setFilterRisk(filterRisk === key ? 'all' : key)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-black" style={{ color: cfg.color }}>{count}</p>
                                    <p className="text-sm font-bold text-gray-700">{cfg.label}</p>
                                    <p className="text-xs text-gray-400">{cfg.desc}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
                                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                    {Math.round((count / Math.max(stats.total, 1)) * 100)}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FiBarChart2 className="text-indigo-600" /> Predicted Results — {filtered.length} Students
                    </h2>
                    <div className="flex gap-3 flex-wrap items-center">
                        <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
                            <option value="all">All Forms</option>
                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
                            <option value="all">All Grades</option>
                            {GRADE_THRESHOLDS.map(g => <option key={g.grade} value={g.grade}>Grade {g.grade}</option>)}
                        </select>
                        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
                            <option value="all">All Risk Levels</option>
                            <option value="high">🔴 At Risk</option>
                            <option value="medium">🟡 Average</option>
                            <option value="low">🟢 Excelling</option>
                        </select>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
                            <option value="meanPoints">Sort: Mean Points</option>
                            <option value="name">Sort: Name</option>
                            <option value="risk">Sort: Risk Level</option>
                        </select>
                        <button onClick={computePredictions}
                            className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                            <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={exportCSV}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                            <FiDownload size={14} /> Export
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-gray-500 font-semibold">Computing predictions from assessment data…</p>
                            <p className="text-gray-400 text-sm mt-1">Analyzing marks, calculating means, projecting grades</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['#', 'Student', 'Form / Stream', 'Subjects', 'Mean Points', 'Predicted Grade', 'Risk', 'Top Subject', 'Weak Subject', 'Trend'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((p, i) => {
                                    const grade = p.predictedGrade;
                                    const risk = RISK_CONFIG[p.riskScore as keyof typeof RISK_CONFIG];
                                    const topSub = p.subjectAverages[0];
                                    const weakSub = p.subjectAverages[p.subjectAverages.length - 1];
                                    return (
                                        <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-gray-400 text-xs">
                                                {p.rank || i + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                        style={{ background: `linear-gradient(135deg, ${grade?.color || '#6366f1'}, #818cf8)` }}>
                                                        {p.first_name?.[0]}{p.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800">{p.first_name} {p.last_name}</p>
                                                        <p className="text-xs text-gray-400">{p.admission_no || p.admission_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-700 text-xs">{p.school_forms?.form_name}</p>
                                                <p className="text-xs text-gray-400">{p.school_streams?.stream_name}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2 py-1 rounded-full">{p.subjectAverages.length}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-20">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${(p.meanPoints / 12) * 100}%`, backgroundColor: grade?.color }} />
                                                    </div>
                                                    <span className="font-bold text-sm" style={{ color: grade?.color }}>{p.meanPoints.toFixed(1)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-black"
                                                    style={{ backgroundColor: grade?.bg, color: grade?.color }}>
                                                    {grade?.grade}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                                                    style={{ backgroundColor: risk?.bg, color: risk?.color }}>
                                                    {p.riskScore === 'high' ? '🔴' : p.riskScore === 'medium' ? '🟡' : '🟢'} {risk?.label.split(' ')[1]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {topSub && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-green-700 truncate max-w-[100px]">{topSub.name}</p>
                                                        <p className="text-xs text-green-500">{topSub.avg.toFixed(1)}%</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {weakSub && weakSub !== topSub && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-red-600 truncate max-w-[100px]">{weakSub.name}</p>
                                                        <p className="text-xs text-red-400">{weakSub.avg.toFixed(1)}%</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {p.trend > 5 ? <FiArrowUp size={16} className="text-green-500" /> :
                                                    p.trend < -5 ? <FiArrowDown size={16} className="text-red-500" /> :
                                                        <FiMinus size={16} className="text-gray-400" />}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && !loading && (
                                    <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                                        <FiBookOpen size={32} className="mx-auto mb-2 opacity-40" />
                                        <p className="font-semibold">No prediction data available</p>
                                        <p className="text-xs mt-1">Enter marks in Exam Marks to generate predictions</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                        <span>Showing {filtered.length} of {stats.total} students with assessment data</span>
                        <span>Mean Grade: <strong style={{ color: getMeanGrade(Math.round(stats.avgPoints))?.color }}>{getMeanGrade(Math.round(stats.avgPoints))?.grade}</strong> ({stats.avgPoints.toFixed(2)} pts)</span>
                    </div>
                )}
            </div>

            {/* Methodology Note */}
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-sm font-bold text-indigo-800 flex items-center gap-2"><FiTarget size={14} /> Prediction Methodology</p>
                <p className="text-xs text-indigo-600 mt-1">Grades predicted using Kenya National Examinations Council (KNEC) grading scale. Mean grade calculated from student&apos;s best 7 subject averages across all recorded continuous assessment tests (CATs) and exams. Students with fewer than 3 subjects recorded may have inaccurate predictions.</p>
            </div>
        </div>
    );
}
