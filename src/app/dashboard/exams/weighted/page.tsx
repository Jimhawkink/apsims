'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSettings, FiSave, FiPlus, FiTrash2, FiRefreshCw, FiCheckCircle, FiAlertTriangle, FiBarChart2, FiTrendingUp, FiX } from 'react-icons/fi';

interface ExamType {
    id: number;
    exam_name: string;
    exam_code: string;
    weight: number;
    max_score: number;
    term_id: number | null;
    year: number;
    is_active: boolean;
    is_combined?: boolean;
}

interface Term { id: number; term_name: string; term_number: number; year: number; is_current: boolean; academic_year?: string; }

export default function WeightedExamConfigPage() {
    const [examTypes, setExamTypes] = useState<ExamType[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [weightsValid, setWeightsValid] = useState(true);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [etRes, tRes] = await Promise.all([
            supabase.from('school_exam_types').select('*').order('id'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
        ]);
        setExamTypes(etRes.data || []);
        setTerms(tRes.data || []);
        const cur = (tRes.data || []).find((t: any) => t.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredExams = examTypes.filter(e => !selTerm || String(e.term_id) === selTerm);
    const totalWeight = filteredExams.reduce((s, e) => s + Number(e.weight || 0), 0);
    const totalMaxScore = filteredExams.reduce((s, e) => s + Number(e.max_score || 100), 0);

    useEffect(() => {
        setWeightsValid(totalWeight === 100);
    }, [totalWeight]);

    const updateWeight = async (id: number, weight: number, maxScore: number) => {
        const { error } = await supabase.from('school_exam_types').update({ weight, max_score: maxScore }).eq('id', id);
        if (error) { toast.error('Failed to update weight'); return; }
        setExamTypes(prev => prev.map(e => e.id === id ? { ...e, weight, max_score: maxScore } : e));
    };

    const handleSave = async () => {
        if (totalWeight !== 100) {
            toast.error(`Total weight must be 100%. Currently ${totalWeight}%`);
            return;
        }
        setSaving(true);
        for (const exam of filteredExams) {
            await supabase.from('school_exam_types').update({ weight: exam.weight, max_score: exam.max_score }).eq('id', exam.id);
        }
        toast.success('Exam weights saved successfully!');
        setSaving(false);
    };

    const recalculateCombined = async () => {
        if (!selTerm) { toast.error('Select a term first'); return; }
        setSaving(true);
        try {
            const termId = Number(selTerm);
            const termExamTypes = examTypes.filter(e => e.term_id === termId && e.is_active);
            if (termExamTypes.length === 0) { toast.error('No exam types for this term'); setSaving(false); return; }

            const [mRes, sRes, subRes] = await Promise.all([
                supabase.from('school_exam_marks').select('*').eq('term_id', termId),
                supabase.from('school_students').select('*').eq('status', 'Active'),
                supabase.from('school_subjects').select('*').eq('is_active', true),
            ]);
            const marks = mRes.data || [];
            const students = sRes.data || [];
            const subjects = subRes.data || [];
            const grading = (await supabase.from('school_grading_system').select('*').order('points', { ascending: false })).data || [];

            const getGrade = (score: number) => {
                const sorted = [...grading].sort((a: any, b: any) => b.min_score - a.min_score);
                return sorted.find((g: any) => score >= g.min_score && score <= g.max_score) || { grade: 'E', points: 1 };
            };

            let updated = 0;
            for (const student of students) {
                for (const subject of subjects) {
                    const studentSubjectMarks = marks.filter((m: any) => m.student_id === student.id && m.subject_id === subject.id);
                    if (studentSubjectMarks.length === 0) continue;

                    let combinedScore = 0;
                    let totalWeightApplied = 0;

                    for (const mark of studentSubjectMarks) {
                        const examType = termExamTypes.find((et: any) => et.id === mark.exam_type_id);
                        if (!examType || !examType.weight) continue;
                        const rawScore = Number(mark.score || 0);
                        const maxScore = Number(examType.max_score || 100);
                        const normalizedScore = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;
                        const weightPct = Number(examType.weight) / 100;
                        combinedScore += normalizedScore * weightPct;
                        totalWeightApplied += Number(examType.weight);
                    }

                    if (totalWeightApplied > 0) {
                        combinedScore = (combinedScore / (totalWeightApplied / 100));
                    } else {
                        combinedScore = studentSubjectMarks.reduce((s: number, m: any) => s + Number(m.score || 0), 0) / studentSubjectMarks.length;
                    }

                    const grade = getGrade(combinedScore);

                    for (const mark of studentSubjectMarks) {
                        const { error } = await supabase.from('school_exam_marks').update({
                            combined_score: Math.round(combinedScore * 100) / 100,
                            combined_grade: grade.grade,
                        }).eq('id', mark.id);
                        if (!error) updated++;
                    }
                }
            }

            toast.success(`Recalculated combined scores for ${updated} mark entries!`);
        } catch (err) {
            toast.error('Recalculation failed');
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>⚖️</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Weighted Exam Config…</p>
        </div>
    );

    return (
        <div className="animate-fadeIn space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">⚖️ Weighted Exam Configuration</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure exam weights for combined term reporting (e.g. CAT1=10%, CAT2=10%, Mid=30%, End=50%)</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15} /></button>
                    <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700 min-w-[180px]">
                        <option value="">All Terms</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Weight Summary KPI Card ── */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: totalWeight === 100 ? '#10b981' : '#f59e0b' }}>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: totalWeight === 100 ? '#10b981' : '#f59e0b' }} />
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Total Exam Weight</p>
                        <p className="text-4xl font-extrabold text-gray-900 mt-1">{totalWeight}%</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {totalWeight === 100 ? '✅ Weights add up correctly' : `⚠️ Must equal 100% — ${100 - totalWeight}% ${totalWeight > 100 ? 'over' : 'remaining'}`}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {totalWeight === 100 ? <FiCheckCircle size={32} className="text-green-500" /> : <FiAlertTriangle size={32} className="text-amber-500" />}
                        <div className="w-48 bg-gray-100 rounded-full h-3 mt-2">
                            <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(totalWeight, 100)}%`, background: totalWeight === 100 ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Exam Weights Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FiSettings className="text-indigo-500" /> Exam Weight Configuration</p>
                    <span className="text-xs text-gray-400">{filteredExams.length} exam types</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Exam Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Max Score</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Weight (%)</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Contribution</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExams.map((exam) => {
                                const contribution = totalMaxScore > 0 ? ((exam.max_score / totalMaxScore) * 100).toFixed(1) : '0';
                                return (
                                    <tr key={exam.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{exam.exam_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{exam.exam_code}</td>
                                        <td className="px-4 py-3 text-center">
                                            <input type="number" value={exam.max_score} min={1} max={1000}
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    setExamTypes(prev => prev.map(et => et.id === exam.id ? { ...et, max_score: val } : et));
                                                }}
                                                onBlur={() => updateWeight(exam.id, exam.weight, exam.max_score)}
                                                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm font-bold focus:border-blue-400 outline-none" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input type="number" value={exam.weight} min={0} max={100}
                                                onChange={e => {
                                                    const val = Number(e.target.value);
                                                    setExamTypes(prev => prev.map(et => et.id === exam.id ? { ...et, weight: val } : et));
                                                }}
                                                onBlur={() => updateWeight(exam.id, exam.weight, exam.max_score)}
                                                className={`w-20 px-2 py-1.5 border rounded-lg text-center text-sm font-bold focus:outline-none ${Number(exam.weight) > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200'}`} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-16 bg-gray-100 rounded-full h-2">
                                                    <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(Number(exam.weight), 100)}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500 font-medium">{exam.weight}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${exam.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {exam.is_active ? <FiCheckCircle size={14} /> : <FiX size={14} />}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredExams.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No exam types found for this term</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Weight Distribution Visualization */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><FiBarChart2 className="text-purple-500" /> Weight Distribution</h3>
                </div>
                <div className="p-5">
                    <div className="flex h-10 rounded-xl overflow-hidden">
                        {filteredExams.filter(e => e.weight > 0).map((exam, i) => {
                            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
                            return (
                                <div key={exam.id} style={{ width: `${exam.weight}%`, background: colors[i % colors.length] }}
                                    className="flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-90"
                                    title={`${exam.exam_name}: ${exam.weight}%`}>
                                    {exam.weight >= 10 ? `${exam.exam_code}` : ''}
                                </div>
                            );
                        })}
                        {totalWeight < 100 && (
                            <div style={{ width: `${100 - totalWeight}%` }} className="bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                                {100 - totalWeight}%
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4">
                        {filteredExams.filter(e => e.weight > 0).map((exam, i) => {
                            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
                            return (
                                <div key={exam.id} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ background: colors[i % colors.length] }} />
                                    <span className="text-xs text-gray-600 font-medium">{exam.exam_name} ({exam.weight}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
                <button onClick={recalculateCombined} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <FiTrendingUp size={16} /> {saving ? 'Recalculating…' : 'Recalculate Combined Scores'}
                </button>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📐 How Weighted Combined Scores Work</p>
                </div>
                <div className="p-5">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-indigo-200">
                                <th className="px-3 py-2 text-left text-indigo-600 font-bold">Subject</th>
                                <th className="px-3 py-2 text-center text-indigo-600 font-bold">CAT1 (10%)</th>
                                <th className="px-3 py-2 text-center text-indigo-600 font-bold">CAT2 (10%)</th>
                                <th className="px-3 py-2 text-center text-indigo-600 font-bold">Mid (30%)</th>
                                <th className="px-3 py-2 text-center text-indigo-600 font-bold">End (50%)</th>
                                <th className="px-3 py-2 text-center text-indigo-600 font-bold">Combined</th>
                                <th className="px-3 py-2 text-center text-indigo-600 font-bold">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            <tr className="border-b border-indigo-100">
                                <td className="px-3 py-2 font-semibold">Maths</td>
                                <td className="px-3 py-2 text-center">14/20</td>
                                <td className="px-3 py-2 text-center">16/20</td>
                                <td className="px-3 py-2 text-center">38/50</td>
                                <td className="px-3 py-2 text-center">72/100</td>
                                <td className="px-3 py-2 text-center font-bold text-indigo-700">78.4</td>
                                <td className="px-3 py-2 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold text-xs">B+</span></td>
                            </tr>
                            <tr className="border-b border-indigo-100">
                                <td className="px-3 py-2 font-semibold">English</td>
                                <td className="px-3 py-2 text-center">18/20</td>
                                <td className="px-3 py-2 text-center">17/20</td>
                                <td className="px-3 py-2 text-center">42/50</td>
                                <td className="px-3 py-2 text-center">85/100</td>
                                <td className="px-3 py-2 text-center font-bold text-indigo-700">88.5</td>
                                <td className="px-3 py-2 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold text-xs">A</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-indigo-500 mt-3 italic">Formula: Combined = Σ(normalized_score × weight%) for each exam type. Scores normalized to 100 before weighting.</p>
            </div>
        </div>
    );
}
