'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSave, FiDownload, FiCheckCircle, FiRefreshCw, FiUpload,
    FiLock, FiUnlock, FiTrendingUp, FiUsers, FiBookOpen,
    FiAlertTriangle, FiSearch, FiX, FiInfo,
} from 'react-icons/fi';

// ── Helpers ───────────────────────────────────────────────────────────────────
const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)',
    'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#d97706,#f59e0b)',
    'linear-gradient(135deg,#dc2626,#ef4444)', 'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#0284c7,#38bdf8)', 'linear-gradient(135deg,#0f766e,#14b8a6)',
];

const GRADE_COLORS: Record<string, string> = {
    'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
    'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
    'D-': '#dc2626', 'E': '#991b1b',
};

function Avatar({ name, size = 30 }: { name: string; size?: number }) {
    const ini = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: GRADIENTS[(name || '').charCodeAt(0) % GRADIENTS.length],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: size * 0.36,
            boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
        }}>
            {ini}
        </div>
    );
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
    const pct = (score / max) * 100;
    const color = pct >= 60 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
    return (
        <span style={{ color, fontWeight: 900, fontSize: 13 }}>{score.toFixed(0)}</span>
    );
}

function GradePill({ grade }: { grade: string }) {
    const bg = GRADE_COLORS[grade] || '#94a3b8';
    return (
        <span style={{
            background: bg, color: '#fff', fontWeight: 900, fontSize: 11,
            padding: '3px 10px', borderRadius: 8, display: 'inline-block', letterSpacing: 0.5,
            boxShadow: `0 2px 8px ${bg}60`,
        }}>{grade}</span>
    );
}

// ── Grade dist bar ────────────────────────────────────────────────────────────
function GradeDistBar({ marks, grading, max }: { marks: Record<string, string>; grading: any[]; max: number }) {
    const counts: Record<string, number> = {};
    const values = Object.values(marks).filter(v => v !== '');
    values.forEach(v => {
        const g = grading.sort((a, b) => b.min_score - a.min_score).find(gr => {
            const score = (Number(v) / max) * 100;
            return score >= gr.min_score && score <= gr.max_score;
        });
        if (g) counts[g.grade] = (counts[g.grade] || 0) + 1;
    });
    const total = values.length || 1;
    const grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
    return (
        <div className="flex items-end gap-1 h-10">
            {grades.map(g => {
                const cnt = counts[g] || 0;
                const pct = Math.round((cnt / total) * 100);
                return (
                    <div key={g} className="flex flex-col items-center gap-0.5 group" title={`${g}: ${cnt} students (${pct}%)`}>
                        <div style={{
                            width: 22, height: Math.max(4, (cnt / total) * 36),
                            background: GRADE_COLORS[g] || '#e5e7eb',
                            borderRadius: '4px 4px 0 0', transition: 'all 0.3s',
                        }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: GRADE_COLORS[g] || '#9ca3af' }}>{g}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ── CSV Import Modal ──────────────────────────────────────────────────────────
function CSVImportModal({ students, maxScore, onImport, onClose }: {
    students: any[]; maxScore: number;
    onImport: (data: Record<string, string>) => void; onClose: () => void;
}) {
    const [csvText, setCsvText] = useState('');
    const [preview, setPreview] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    const parseCSV = (text: string) => {
        const lines = text.trim().split('\n').filter(l => l.trim());
        const errs: string[] = [];
        const result: Record<string, string> = {};
        const prev: any[] = [];
        lines.forEach((line, i) => {
            const [adm, score] = line.split(',').map(s => s.trim());
            if (!adm) return;
            const student = students.find(s => (s.admission_no || s.admission_number) === adm);
            if (!student) { errs.push(`Line ${i + 1}: Admission "${adm}" not found`); return; }
            const sc = Number(score);
            if (isNaN(sc) || sc < 0 || sc > maxScore) { errs.push(`Line ${i + 1}: Score "${score}" invalid (0–${maxScore})`); return; }
            result[`${student.id}_import`] = String(sc);
            prev.push({ adm, name: `${student.first_name} ${student.last_name}`, score: sc, id: student.id });
        });
        setPreview(prev); setErrors(errs);
        return result;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
                    <div>
                        <h3 className="text-white font-extrabold text-sm">📥 Import Marks from CSV</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Format: admission_no,score (one per line)</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20"><FiX size={14} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase">Paste CSV Data</p>
                        <textarea value={csvText} onChange={e => { setCsvText(e.target.value); if (e.target.value) parseCSV(e.target.value); }}
                            className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-2xl text-xs font-mono focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none resize-none"
                            placeholder={'12345678,78\n87654321,92\n11223344,65'} />
                        <p className="text-[11px] text-gray-400 mt-1">Max score: {maxScore}</p>
                    </div>
                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-xs font-bold text-red-600 mb-1">⚠️ {errors.length} error(s)</p>
                            {errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                        </div>
                    )}
                    {preview.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-600 mb-1.5">Preview ({preview.length} students)</p>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {preview.slice(0, 10).map(p => (
                                    <div key={p.id} className="flex justify-between items-center px-3 py-1.5 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-medium text-gray-700">{p.name}</span>
                                        <span className="text-xs font-black text-indigo-600">{p.score}/{maxScore}</span>
                                    </div>
                                ))}
                                {preview.length > 10 && <p className="text-xs text-gray-400 text-center">+{preview.length - 10} more</p>}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl text-sm hover:bg-gray-50">Cancel</button>
                        <button disabled={preview.length === 0} onClick={() => { onImport(Object.fromEntries(preview.map(p => [`${p.id}_import`, String(p.score)]))); onClose(); }}
                            className="flex-1 py-2.5 text-white font-bold rounded-2xl text-sm disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            Import {preview.length} Marks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarkEntryPage() {
    // Data state
    const [forms, setForms]               = useState<any[]>([]);
    const [streams, setStreams]           = useState<any[]>([]);
    const [subjects, setSubjects]         = useState<any[]>([]);
    const [students, setStudents]         = useState<any[]>([]);
    const [terms, setTerms]               = useState<any[]>([]);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [grading, setGrading]           = useState<any[]>([]);
    const [loading, setLoading]           = useState(true);

    // Selection state
    const [selForm, setSelForm]           = useState('');
    const [selStream, setSelStream]       = useState('');
    const [selSubject, setSelSubject]     = useState('');
    const [selTerm, setSelTerm]           = useState('');
    const [selExamType, setSelExamType]   = useState('End-Term');
    const [maxScore, setMaxScore]         = useState(100);
    const [searchQ, setSearchQ]           = useState('');

    // Mark state
    const [marks, setMarks]               = useState<Record<string, string>>({});
    const [savedMarks, setSavedMarks]     = useState<Record<string, string>>({});
    const [unsavedCells, setUnsavedCells] = useState<Set<string>>(new Set());
    const [saving, setSaving]             = useState(false);
    const [locked, setLocked]             = useState(false);
    const [showImport, setShowImport]     = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [marksLoading, setMarksLoading] = useState(false);
    const autoSaveRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

    const examTypes = ['CAT 1', 'CAT 2', 'CAT 3', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial', 'Assignment', 'Practical'];

    // ── Load all reference data ───────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, stl, gr] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id,gender').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_subject_teachers').select('*'),
            supabase.from('school_grading_system').select('*').order('min_score', { ascending: false }),
        ]);
        setForms(f.data || []);
        setStreams(st.data || []);
        setSubjects(sub.data || []);
        setStudents(s.data || []);
        setTerms(t.data || []);
        setSubjectTeachers(stl.data || []);
        setGrading(gr.data || []);
        const cur = (t.data || []).find((x: any) => x.is_current);
        if (cur) setSelTerm(String(cur.id));
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Role-based subject filter ─────────────────────────────────────────────
    const availableSubjects = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('school_user') || '{}');
            if (!user.id || user.role === 'admin' || user.role === 'principal') return subjects;
            const myIds = subjectTeachers.filter(st => st.teacher_id === user.id).map(l => l.subject_id);
            return subjects.filter(s => myIds.includes(s.id));
        } catch { return subjects; }
    }, [subjects, subjectTeachers]);

    // ── Grade resolution ──────────────────────────────────────────────────────
    const getGrade = useCallback((rawScore: number): any => {
        const pct = maxScore === 100 ? rawScore : (rawScore / maxScore) * 100;
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => pct >= g.min_score && pct <= g.max_score) ||
            { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    }, [grading, maxScore]);

    // ── Filtered students ─────────────────────────────────────────────────────
    const classStudents = useMemo(() =>
        students
            .filter(s => selForm && String(s.form_id) === selForm)
            .filter(s => !selStream || String(s.stream_id) === selStream)
            .filter(s => !searchQ || `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number}`.toLowerCase().includes(searchQ.toLowerCase()))
            .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''))
    , [students, selForm, selStream, searchQ]);

    // ── Load existing marks ───────────────────────────────────────────────────
    useEffect(() => {
        if (!selForm || !selSubject || !selTerm || !selExamType) return;
        const load = async () => {
            setMarksLoading(true);
            const ids = students.filter(s => String(s.form_id) === selForm).map(s => s.id);
            if (!ids.length) { setMarksLoading(false); return; }
            const { data } = await supabase.from('school_exam_marks')
                .select('*').eq('subject_id', Number(selSubject))
                .eq('term_id', Number(selTerm)).eq('exam_type', selExamType).in('student_id', ids);
            const loaded: Record<string, string> = {};
            (data || []).forEach((m: any) => { loaded[`${m.student_id}_${selSubject}`] = String(m.score ?? ''); });
            setMarks(loaded); setSavedMarks({ ...loaded }); setUnsavedCells(new Set());
            setMarksLoading(false);
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selSubject, selTerm, selExamType]);

    // ── Mark change handler with debounce auto-save ───────────────────────────
    const handleMarkChange = useCallback((studentId: number, value: string) => {
        if (locked) return;
        const key = `${studentId}_${selSubject}`;
        let num = value;
        if (value !== '' && !isNaN(Number(value))) {
            num = String(Math.min(maxScore, Math.max(0, Number(value))));
        }
        setMarks(prev => ({ ...prev, [key]: num }));
        setUnsavedCells(prev => {
            const n = new Set(prev);
            if (num !== (savedMarks[key] || '')) n.add(key); else n.delete(key);
            return n;
        });
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => autoSaveCell(studentId, num), 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locked, selSubject, maxScore, savedMarks]);

    const autoSaveCell = async (studentId: number, score: string) => {
        if (!selSubject || !selTerm || score === '') return;
        const key = `${studentId}_${selSubject}`;
        if (score === (savedMarks[key] || '')) return;
        const g = getGrade(Number(score));
        const payload = { student_id: studentId, subject_id: Number(selSubject), term_id: Number(selTerm), exam_type: selExamType, score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks };
        const { data: ex } = await supabase.from('school_exam_marks').select('id').eq('student_id', studentId).eq('subject_id', Number(selSubject)).eq('term_id', Number(selTerm)).eq('exam_type', selExamType).maybeSingle();
        const { error } = ex
            ? await supabase.from('school_exam_marks').update({ score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks }).eq('id', ex.id)
            : await supabase.from('school_exam_marks').insert([payload]);
        if (!error) {
            setSavedMarks(prev => ({ ...prev, [key]: score }));
            setUnsavedCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        }
    };

    // ── Save all unsaved marks ────────────────────────────────────────────────
    const handleSaveAll = async () => {
        if (unsavedCells.size === 0) { toast('✅ All marks already saved'); return; }
        setSaving(true);
        let saved = 0; let failed = 0;
        for (const key of Array.from(unsavedCells)) {
            const [sid] = key.split('_');
            const score = marks[key];
            if (score === '' || score === undefined) continue;
            const g = getGrade(Number(score));
            const payload = { student_id: Number(sid), subject_id: Number(selSubject), term_id: Number(selTerm), exam_type: selExamType, score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks };
            const { data: ex } = await supabase.from('school_exam_marks').select('id').eq('student_id', Number(sid)).eq('subject_id', Number(selSubject)).eq('term_id', Number(selTerm)).eq('exam_type', selExamType).maybeSingle();
            const { error } = ex
                ? await supabase.from('school_exam_marks').update({ score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks }).eq('id', ex.id)
                : await supabase.from('school_exam_marks').insert([payload]);
            if (!error) saved++; else failed++;
        }
        setSavedMarks({ ...marks }); setUnsavedCells(new Set()); setSaving(false);
        if (failed > 0) toast.error(`${failed} marks failed to save`);
        else toast.success(`🎉 ${saved} marks saved successfully!`);
    };

    // ── Handle CSV import ─────────────────────────────────────────────────────
    const handleImport = (data: Record<string, string>) => {
        const newMarks = { ...marks };
        const newUnsaved = new Set(unsavedCells);
        Object.entries(data).forEach(([key, score]) => {
            const [sid] = key.split('_');
            const realKey = `${sid}_${selSubject}`;
            newMarks[realKey] = score;
            if (score !== (savedMarks[realKey] || '')) newUnsaved.add(realKey);
        });
        setMarks(newMarks); setUnsavedCells(newUnsaved);
        toast.success(`📥 ${Object.keys(data).length} marks imported. Click Save All to confirm.`);
    };

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportMarks = () => {
        const subName = subjects.find(s => s.id === Number(selSubject))?.subject_name || 'Subject';
        const formName = forms.find(f => f.id === Number(selForm))?.form_name || '';
        const rows = classStudents.map((s, i) => {
            const key = `${s.id}_${selSubject}`;
            const score = marks[key] || '';
            const g = score ? getGrade(Number(score)) : null;
            const pct = score ? ((Number(score) / maxScore) * 100).toFixed(1) : '';
            return [i + 1, s.admission_no || s.admission_number, `${s.first_name} ${s.last_name}`, score, maxScore, pct, g?.grade || '', g?.points || '', g?.remarks || ''];
        });
        const hdr = `APSIMS SCHOOL - MARKS REGISTER\n${subName} | ${formName} | ${selExamType}\nGenerated: ${new Date().toLocaleDateString('en-KE')}\n\n`;
        const csv = hdr + ['#,Adm No,Student Name,Score,Max Score,%,Grade,Points,Remarks', ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${subName.replace(/\s+/g, '_')}_${selExamType}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('📊 Marks exported to CSV');
    };

    // ── Analytics ─────────────────────────────────────────────────────────────
    const analytics = useMemo(() => {
        const values = classStudents.map(s => marks[`${s.id}_${selSubject}`]).filter(v => v !== '' && v !== undefined).map(Number);
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const pass = values.filter(v => (v / maxScore) * 100 >= 50).length;
        return {
            count: values.length, mean: mean.toFixed(1),
            min: sorted[0], max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            passRate: Math.round((pass / values.length) * 100),
            meanGrade: getGrade(mean),
        };
    }, [classStudents, marks, selSubject, maxScore, getGrade]);

    // ── Rank calculation ──────────────────────────────────────────────────────
    const ranks = useMemo(() => {
        const scored = classStudents.map(s => ({ id: s.id, score: Number(marks[`${s.id}_${selSubject}`] || 0) }));
        const sorted = [...scored].sort((a, b) => b.score - a.score);
        const rankMap: Record<number, number> = {};
        sorted.forEach((s, i) => { rankMap[s.id] = i + 1; });
        return rankMap;
    }, [classStudents, marks, selSubject]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const isReady        = !!(selForm && selSubject && selTerm);
    const subjectInfo    = subjects.find(s => s.id === Number(selSubject));
    const formInfo       = forms.find(f => f.id === Number(selForm));
    const termInfo       = terms.find(t => t.id === Number(selTerm));
    const streamInfo     = streams.find(s => s.id === Number(selStream));
    const enteredCount   = classStudents.filter(s => (marks[`${s.id}_${selSubject}`] || '') !== '').length;
    const completionPct  = classStudents.length > 0 ? Math.round((enteredCount / classStudents.length) * 100) : 0;

    const sel = 'w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 text-gray-700 transition-all';

    return (
        <div className="space-y-4 animate-fadeIn">
            <style>{`
                input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
                input[type=number]{-moz-appearance:textfield;appearance:textfield}
                @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
                .animate-fadeIn{animation:fadeIn 0.3s ease}
            `}</style>

            {/* ════ HERO BANNER ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4338ca 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '22px 22px' }} />
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#a5b4fc,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                <span className="text-2xl">✏️</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-white font-black text-xl tracking-tight">Mark Entry System</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: 'rgba(255,255,255,0.15)', color: '#c7d2fe' }}>
                                        ULTRA
                                    </span>
                                </div>
                                <p className="text-indigo-300 text-xs mt-0.5">
                                    {isReady && subjectInfo ? (
                                        <>{subjectInfo.subject_name} · {formInfo?.form_name} {streamInfo ? `(${streamInfo.stream_name})` : ''} · {termInfo?.term_name} · {selExamType}</>
                                    ) : 'Select class, subject, term and exam type to begin'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isReady && (
                                <>
                                    <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition">
                                        <FiUpload size={12} /> Import CSV
                                    </button>
                                    <button onClick={exportMarks} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition">
                                        <FiDownload size={12} /> Export
                                    </button>
                                    <button onClick={() => setLocked(l => !l)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition ${locked ? 'bg-red-500 text-white' : 'border border-white/20 text-white/80 hover:bg-white/10'}`}>
                                        {locked ? <><FiLock size={12} /> Locked</> : <><FiUnlock size={12} /> Lock</>}
                                    </button>
                                </>
                            )}
                            <button onClick={fetchAll} className="p-2 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition"><FiRefreshCw size={14} /></button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    {isReady && (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[
                                { label: 'Students', value: classStudents.length, icon: '👨‍🎓' },
                                { label: 'Entered', value: `${enteredCount}/${classStudents.length}`, icon: '✏️' },
                                { label: 'Completion', value: `${completionPct}%`, icon: completionPct === 100 ? '🎉' : '📋' },
                                { label: 'Class Mean', value: analytics ? `${analytics.mean}` : '—', icon: '📊' },
                                { label: 'Mean Grade', value: analytics ? analytics.meanGrade.grade : '—', icon: '🏅' },
                                { label: 'Unsaved', value: unsavedCells.size, icon: unsavedCells.size > 0 ? '⚠️' : '✅' },
                            ].map(k => (
                                <div key={k.label} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-xs">{k.icon}</span>
                                        <p className="text-indigo-300 text-[9px] font-bold uppercase tracking-wider">{k.label}</p>
                                    </div>
                                    <p className="text-white font-black text-sm">{k.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>✏️</div>
                        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">Loading Mark Entry System…</p>
                </div>
            ) : (
                <>
                    {/* ════ SELECTION PANEL ════ */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <FiBookOpen className="text-indigo-500" size={14} />
                            <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Class & Exam Selection</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Form *</label>
                                <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className={sel}>
                                    <option value="">Select Form</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Stream</label>
                                <select value={selStream} onChange={e => setSelStream(e.target.value)} className={sel}>
                                    <option value="">All Streams</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subject *</label>
                                <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className={sel}>
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Term *</label>
                                <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className={sel}>
                                    <option value="">Select Term</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Exam Type</label>
                                <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className={sel}>
                                    {examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Max Score</label>
                                <input type="number" min={10} max={1000} value={maxScore} onChange={e => setMaxScore(Math.max(10, Number(e.target.value)))} className={sel} placeholder="100" />
                            </div>
                        </div>
                    </div>

                    {!isReady ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-24">
                            <span className="text-6xl block mb-4">📊</span>
                            <p className="font-black text-lg text-gray-600 mb-2">Select Form, Subject & Term</p>
                            <p className="text-sm text-gray-400">Choose from the filters above to load the marks sheet</p>
                        </div>
                    ) : classStudents.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-24">
                            <span className="text-6xl block mb-4">👤</span>
                            <p className="font-black text-lg text-gray-600">No students in this class</p>
                        </div>
                    ) : (
                        <>
                            {/* ════ ACTION BAR ════ */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={13} />
                                        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                            placeholder="Search student or adm no…"
                                            className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 w-52 transition-all" />
                                    </div>
                                    {searchQ && <button onClick={() => setSearchQ('')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><FiX size={12} /> Clear</button>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setShowShortcuts(s => !s)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition">
                                        <FiInfo size={11} /> Shortcuts
                                    </button>
                                    {unsavedCells.size > 0 && (
                                        <span className="text-xs font-bold text-amber-600 animate-pulse flex items-center gap-1">
                                            <FiAlertTriangle size={11} /> {unsavedCells.size} unsaved
                                        </span>
                                    )}
                                    <button onClick={handleSaveAll} disabled={saving || unsavedCells.size === 0}
                                        className={`flex items-center gap-1.5 px-5 py-2 text-sm font-bold rounded-xl transition-all ${unsavedCells.size > 0 ? 'text-white shadow-lg hover:shadow-xl' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                        style={unsavedCells.size > 0 ? { background: 'linear-gradient(135deg,#10b981,#059669)' } : {}}>
                                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={13} />}
                                        {saving ? 'Saving…' : unsavedCells.size > 0 ? `Save All (${unsavedCells.size})` : 'All Saved ✅'}
                                    </button>
                                </div>
                            </div>

                            {/* Shortcuts hint */}
                            {showShortcuts && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-indigo-700 mb-2 uppercase">⌨️ Keyboard Shortcuts</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-indigo-800">
                                        {[['Enter / ↓', 'Next student'], ['↑', 'Previous student'], ['Tab', 'Next row'], ['0–9', 'Type score directly']].map(([k, d]) => (
                                            <div key={k} className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-white border border-indigo-200 rounded font-mono font-bold text-[10px]">{k}</kbd><span>{d}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════ MARKS TABLE ════ */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {marksLoading ? (
                                    <div className="flex items-center justify-center py-16 gap-3">
                                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                        <p className="text-sm font-bold text-gray-400">Loading marks…</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
                                                    {['#', 'Adm No', 'Student Name', 'Gender', `Score (/${maxScore})`, 'Pct %', 'Grade', 'Points', 'Remarks', 'Rank', 'Status'].map((h, i) => (
                                                        <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-indigo-200 whitespace-nowrap">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classStudents.map((s, i) => {
                                                    const key     = `${s.id}_${selSubject}`;
                                                    const score   = marks[key] ?? '';
                                                    const isUnsaved = unsavedCells.has(key);
                                                    const g       = score !== '' ? getGrade(Number(score)) : null;
                                                    const pct     = score !== '' ? ((Number(score) / maxScore) * 100).toFixed(1) : '';
                                                    const rank    = score !== '' ? ranks[s.id] : null;
                                                    const rowBg   = isUnsaved ? 'rgba(251,191,36,0.06)' : i % 2 === 0 ? '#fff' : '#fafbff';
                                                    return (
                                                        <tr key={s.id} style={{ background: rowBg, borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                                            onMouseEnter={e => { if (!isUnsaved) (e.currentTarget as HTMLElement).style.background = '#f0f4ff'; }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}>
                                                            <td className="px-3 py-2.5 text-center font-black text-indigo-600 text-xs" style={{ minWidth: 36 }}>{i + 1}</td>
                                                            <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                                            <td className="px-3 py-2.5" style={{ minWidth: 180 }}>
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar name={`${s.first_name} ${s.last_name}`} size={28} />
                                                                    <span className="font-bold text-gray-900">{s.first_name} {s.last_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    {s.gender === 'Female' ? '♀' : '♂'}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center" style={{ minWidth: 90 }}>
                                                                <input
                                                                    id={`mark-${s.id}`}
                                                                    type="number" min={0} max={maxScore}
                                                                    value={score} placeholder="—"
                                                                    disabled={locked}
                                                                    onChange={e => handleMarkChange(s.id, e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                                            e.preventDefault();
                                                                            const next = classStudents[i + 1];
                                                                            if (next) (document.getElementById(`mark-${next.id}`) as HTMLInputElement)?.focus();
                                                                        } else if (e.key === 'ArrowUp') {
                                                                            e.preventDefault();
                                                                            const prev = classStudents[i - 1];
                                                                            if (prev) (document.getElementById(`mark-${prev.id}`) as HTMLInputElement)?.focus();
                                                                        }
                                                                    }}
                                                                    className={`w-20 text-center text-sm font-black rounded-xl border-2 py-1.5 outline-none transition-all
                                                                        ${locked ? 'bg-gray-50 border-gray-200 cursor-not-allowed text-gray-500' :
                                                                            isUnsaved ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-100 text-amber-900' :
                                                                            score !== '' ? 'border-green-300 bg-green-50 text-green-800' :
                                                                            'border-gray-200 bg-white text-gray-700'}
                                                                        focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200`}
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-600">{pct ? `${pct}%` : '—'}</td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                {g ? <GradePill grade={g.grade} /> : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center font-black text-purple-700 text-sm">{g?.points ?? '—'}</td>
                                                            <td className="px-3 py-2.5 text-xs font-medium text-gray-500 max-w-[120px] truncate">{g?.remarks || '—'}</td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                {rank ? (
                                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${rank <= 3 ? 'bg-amber-100 text-amber-700' : 'text-gray-500'}`}>
                                                                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                                                    </span>
                                                                ) : <span className="text-gray-300">—</span>}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                {isUnsaved ? <span title="Unsaved" className="text-amber-500 animate-pulse">⚡</span> :
                                                                    score !== '' ? <FiCheckCircle className="text-green-500 mx-auto" size={15} /> :
                                                                    <span className="text-gray-300 text-lg">○</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* ── Footer Analytics ── */}
                                <div className="px-5 py-4 border-t border-gray-100" style={{ background: 'linear-gradient(135deg,#fafbff,#f5f3ff)' }}>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-5 flex-wrap">
                                            {analytics ? (
                                                <>
                                                    {[
                                                        { label: 'Mean', value: `${analytics.mean}/${maxScore}`, color: '#6366f1' },
                                                        { label: 'Grade', value: analytics.meanGrade.grade, color: GRADE_COLORS[analytics.meanGrade.grade] || '#6366f1' },
                                                        { label: 'Highest', value: String(analytics.max), color: '#059669' },
                                                        { label: 'Lowest', value: String(analytics.min), color: '#dc2626' },
                                                        { label: 'Median', value: String(analytics.median), color: '#0891b2' },
                                                        { label: 'Pass Rate', value: `${analytics.passRate}%`, color: analytics.passRate >= 50 ? '#059669' : '#dc2626' },
                                                    ].map(a => (
                                                        <div key={a.label}>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{a.label}</p>
                                                            <p className="text-sm font-black" style={{ color: a.color }}>{a.value}</p>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-xs text-gray-400">No marks entered yet</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <GradeDistBar marks={marks} grading={grading} max={maxScore} />
                                            <div className="flex gap-2 text-[10px]">
                                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Saved</span>
                                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Unsaved</span>
                                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />Empty</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Completion progress bar */}
                                    <div className="mt-3">
                                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                            <span>{enteredCount} of {classStudents.length} marks entered</span>
                                            <span className="font-bold" style={{ color: completionPct === 100 ? '#059669' : '#6366f1' }}>{completionPct}% complete</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${completionPct}%`, background: completionPct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── CSV Import Modal ── */}
            {showImport && <CSVImportModal students={classStudents} maxScore={maxScore} onImport={handleImport} onClose={() => setShowImport(false)} />}
        </div>
    );
}
