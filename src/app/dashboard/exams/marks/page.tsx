'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSave, FiDownload, FiCheckCircle, FiLoader, FiUpload, FiRefreshCw, FiSearch } from 'react-icons/fi';

const GRADIENTS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)',
    'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#d97706,#f59e0b)',
    'linear-gradient(135deg,#dc2626,#ef4444)', 'linear-gradient(135deg,#7c3aed,#a855f7)',
    'linear-gradient(135deg,#0284c7,#38bdf8)', 'linear-gradient(135deg,#15803d,#22c55e)',
];

function StudentAvatar({ name, size = 32 }: { name: string; size?: number }) {
    const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
    const idx = (name || '').charCodeAt(0) % GRADIENTS.length;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: GRADIENTS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.35, letterSpacing: 0.5, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
            {initials}
        </div>
    );
}

const C = {
    num:     { bg: '#f5f3ff', text: '#6d28d9', head: '#ddd6fe' },
    adm:     { bg: '#eff6ff', text: '#1d4ed8', head: '#bfdbfe' },
    name:    { bg: '#eef2ff', text: '#4338ca', head: '#c7d2fe' },
    score:   { bg: '#fffbeb', text: '#b45309', head: '#fde68a' },
    grade:   { bg: '#f0fdf4', text: '#15803d', head: '#bbf7d0' },
    pts:     { bg: '#faf5ff', text: '#7c3aed', head: '#e9d5ff' },
    remarks: { bg: '#f0fdfa', text: '#0f766e', head: '#99f6e4' },
    status:  { bg: '#ecfdf5', text: '#059669', head: '#a7f3d0' },
};

interface GradeEntry { id?: number; grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export default function MarkEntryPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
    const [grading, setGrading] = useState<GradeEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [selSubject, setSelSubject] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [selExamType, setSelExamType] = useState('CAT 1');

    const [marks, setMarks] = useState<Record<string, string>>({});
    const [savedMarks, setSavedMarks] = useState<Record<string, string>>({});
    const [unsavedCells, setUnsavedCells] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [autoSaveTimer, setAutoSaveTimer] = useState<any>(null);

    const examTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [f, st, sub, s, t, stl, gr] = await Promise.all([
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_subjects').select('*').order('subject_name'),
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_subject_teachers').select('*'),
            supabase.from('school_grading_system').select('*').order('points', { ascending: false }),
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

    const getAvailableSubjects = () => {
        try {
            const user = JSON.parse(localStorage.getItem('school_user') || '{}');
            if (user.role === 'admin' || user.role === 'principal') return subjects;
            const myLinks = subjectTeachers.filter(st => st.teacher_id === user.id);
            const mySubjectIds = myLinks.map(l => l.subject_id);
            return subjects.filter(s => mySubjectIds.includes(s.id));
        } catch { return subjects; }
    };

    const getGrade = (score: number): GradeEntry => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', min_score: 0, max_score: 29, points: 1, remarks: 'Very Poor' };
    };

    const gradeColors: Record<string, string> = {
        'A': '#059669', 'A-': '#10b981', 'B+': '#34d399', 'B': '#3b82f6', 'B-': '#60a5fa',
        'C+': '#8b5cf6', 'C': '#a78bfa', 'C-': '#f59e0b', 'D+': '#f97316', 'D': '#ef4444',
        'D-': '#dc2626', 'E': '#991b1b',
    };

    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream)
        .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''));

    useEffect(() => {
        if (!selForm || !selSubject || !selTerm || !selExamType) return;
        const loadMarks = async () => {
            const studentIds = classStudents.map(s => s.id);
            if (studentIds.length === 0) return;
            const { data } = await supabase.from('school_exam_marks')
                .select('*')
                .eq('subject_id', Number(selSubject))
                .eq('term_id', Number(selTerm))
                .eq('exam_type', selExamType)
                .in('student_id', studentIds);
            const loaded: Record<string, string> = {};
            (data || []).forEach((m: any) => {
                loaded[`${m.student_id}_${m.subject_id}`] = String(m.score ?? '');
            });
            setMarks(loaded);
            setSavedMarks({ ...loaded });
            setUnsavedCells(new Set());
        };
        loadMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selForm, selStream, selSubject, selTerm, selExamType, students]);

    const handleMarkChange = (studentId: number, value: string) => {
        const key = `${studentId}_${selSubject}`;
        const numVal = value === '' ? '' : String(Math.min(100, Math.max(0, Number(value))));
        setMarks(prev => ({ ...prev, [key]: numVal }));
        const newUnsaved = new Set(unsavedCells);
        if (numVal !== (savedMarks[key] || '')) { newUnsaved.add(key); } else { newUnsaved.delete(key); }
        setUnsavedCells(newUnsaved);
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        const timer = setTimeout(() => { autoSaveCell(studentId, numVal); }, 2000);
        setAutoSaveTimer(timer);
    };

    const autoSaveCell = async (studentId: number, score: string) => {
        if (!selSubject || !selTerm) return;
        const key = `${studentId}_${selSubject}`;
        if (score === '' || score === (savedMarks[key] || '')) return;
        const g = getGrade(Number(score));
        const payload = { student_id: studentId, subject_id: Number(selSubject), term_id: Number(selTerm), exam_type: selExamType, score: Number(score), grade: g.grade, remarks: g.remarks };
        const { data: existing } = await supabase.from('school_exam_marks').select('id')
            .eq('student_id', studentId).eq('subject_id', Number(selSubject))
            .eq('term_id', Number(selTerm)).eq('exam_type', selExamType).maybeSingle();
        let error;
        if (existing) { ({ error } = await supabase.from('school_exam_marks').update({ score: Number(score), grade: g.grade, remarks: g.remarks }).eq('id', existing.id)); }
        else { ({ error } = await supabase.from('school_exam_marks').insert([payload])); }
        if (!error) {
            setSavedMarks(prev => ({ ...prev, [key]: score }));
            setUnsavedCells(prev => { const n = new Set(prev); n.delete(key); return n; });
        }
    };

    const handleSaveAll = async () => {
        if (unsavedCells.size === 0) { toast('All marks are already saved ✅'); return; }
        setSaving(true);
        let saved = 0;
        for (const key of Array.from(unsavedCells)) {
            const [sid, subId] = key.split('_');
            const score = marks[key];
            if (score === '' || score === undefined) continue;
            const g = getGrade(Number(score));
            const payload = { student_id: Number(sid), subject_id: Number(subId), term_id: Number(selTerm), exam_type: selExamType, score: Number(score), grade: g.grade, remarks: g.remarks };
            const { data: existing } = await supabase.from('school_exam_marks').select('id')
                .eq('student_id', Number(sid)).eq('subject_id', Number(subId))
                .eq('term_id', Number(selTerm)).eq('exam_type', selExamType).maybeSingle();
            let error;
            if (existing) { ({ error } = await supabase.from('school_exam_marks').update({ score: Number(score), grade: g.grade, remarks: g.remarks }).eq('id', existing.id)); }
            else { ({ error } = await supabase.from('school_exam_marks').insert([payload])); }
            if (!error) saved++;
        }
        setSavedMarks({ ...marks });
        setUnsavedCells(new Set());
        setSaving(false);
        toast.success(`${saved} marks saved successfully ✅`);
    };

    const exportMarks = () => {
        if (classStudents.length === 0) return;
        const subName = subjects.find(s => s.id === Number(selSubject))?.subject_name || 'Subject';
        const headers = ['#', 'Adm No', 'Student Name', 'Score', 'Grade', 'Points', 'Remarks'];
        const rows = classStudents.map((s, i) => {
            const key = `${s.id}_${selSubject}`;
            const score = marks[key] || '';
            const g = score ? getGrade(Number(score)) : null;
            return [i + 1, s.admission_no || s.admission_number, `${s.first_name} ${s.last_name}`, score, g?.grade || '', g?.points || '', g?.remarks || ''];
        });
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `marks_${subName}_${selExamType}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        toast.success('Marks exported ✅');
    };

    const availableSubjects = getAvailableSubjects();
    const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || '-';
    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';
    const enteredCount = Object.values(marks).filter(v => v !== '' && v !== undefined).length;
    const avg = enteredCount > 0 ? Object.values(marks).filter(v => v !== '').reduce((s, v) => s + Number(v), 0) / enteredCount : 0;
    const isReady = selForm && selSubject && selTerm;

    return (
        <div className="animate-fadeIn space-y-5">
            <style jsx>{`
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; appearance: textfield; }
            `}</style>
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">✏️ Mark Entry — Broadsheet</h1>
                    <p className="text-sm text-gray-500 mt-1">Enter marks per subject with auto-grading from grading system</p>
                </div>
                <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition"><FiRefreshCw size={15} /></button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>✏️</div>
                        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-200 animate-ping opacity-30" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">Loading Mark Entry…</p>
                </div>
            ) : (
                <>
                    {/* ── Selection Bar ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">Form *</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">Stream</label><select value={selStream} onChange={e => setSelStream(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">Subject *</label><select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700"><option value="">Select Subject</option>{availableSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">Term *</label><select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700"><option value="">Select Term</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">Exam Type</label><select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 text-gray-700">{examTypes.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                        </div>
                    </div>

                    {!isReady ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20 text-gray-400">
                            <span className="text-5xl block mb-4">📊</span>
                            <p className="font-bold text-lg mb-1">Select Form, Subject & Term to begin</p>
                            <p className="text-sm">Choose from the filters above to load the marks broadsheet</p>
                        </div>
                    ) : classStudents.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20 text-gray-400">
                            <span className="text-5xl block mb-4">👤</span><p className="font-bold">No students found in this class</p>
                        </div>
                    ) : (
                        <>
                            {/* ── KPI Stats ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {[
                                    { label: 'Students', value: classStudents.length, emoji: '👨‍🎓', color: '#3b82f6', sub: 'In this class' },
                                    { label: 'Entered', value: `${enteredCount} / ${classStudents.length}`, emoji: '✏️', color: '#10b981', sub: 'Marks filled' },
                                    { label: 'Average', value: `${avg.toFixed(1)}%`, emoji: '📊', color: '#7c3aed', sub: 'Class mean' },
                                    { label: 'Unsaved', value: unsavedCells.size, emoji: unsavedCells.size > 0 ? '⚠️' : '✅', color: unsavedCells.size > 0 ? '#f59e0b' : '#10b981', sub: unsavedCells.size > 0 ? 'Pending changes' : 'All saved', pulse: unsavedCells.size > 0 },
                                    { label: 'Captured', value: `${classStudents.length > 0 ? Math.round((enteredCount / classStudents.length) * 100) : 0}%`, emoji: enteredCount === classStudents.length && classStudents.length > 0 ? '🎉' : '📋', color: enteredCount === classStudents.length && classStudents.length > 0 ? '#10b981' : '#6366f1', sub: 'Completion rate' },
                                ].map((card, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: card.color }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{card.label}</p>
                                            <span className="text-lg">{card.emoji}</span>
                                        </div>
                                        <p className="text-xl font-extrabold text-gray-900">{card.value}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
                                        {card.pulse && <div className="absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse" style={{ background: card.color }} />}
                                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: card.color }} />
                                    </div>
                                ))}
                            </div>

                            {/* ── Action Bar ── */}
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    <span className="font-bold text-gray-700">{getSubjectName(Number(selSubject))}</span>
                                    {' — '}{getFormName(Number(selForm))} {selStream ? getStreamName(Number(selStream)) : ''} • {selExamType}
                                    {unsavedCells.size > 0 && <span className="ml-2 text-amber-600 font-bold animate-pulse">• {unsavedCells.size} unsaved changes</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={exportMarks} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition"><FiDownload size={14} /> Export</button>
                                    <button onClick={handleSaveAll} disabled={saving || unsavedCells.size === 0}
                                        className={`flex items-center gap-1.5 text-sm px-5 py-2.5 rounded-xl font-bold transition-all ${unsavedCells.size > 0 ? 'text-white shadow-lg hover:shadow-xl' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                        style={unsavedCells.size > 0 ? { background: 'linear-gradient(135deg,#10b981,#059669)' } : {}}>
                                        {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                                        {saving ? 'Saving…' : unsavedCells.size > 0 ? `Save All (${unsavedCells.size})` : 'All Saved ✅'}
                                    </button>
                                </div>
                            </div>

                            {/* ── Broadsheet Table ── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                        <thead>
                                            <tr>
                                                {[
                                                    { label: '#', col: C.num },
                                                    { label: '📋 Adm No', col: C.adm },
                                                    { label: '👤 Student', col: C.name },
                                                    { label: '📝 Score (/100)', col: C.score },
                                                    { label: '🏅 Grade', col: C.grade },
                                                    { label: '⭐ Pts', col: C.pts },
                                                    { label: '💬 Remarks', col: C.remarks },
                                                    { label: '📊 Status', col: C.status },
                                                ].map((h, i) => (
                                                    <th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                                                        style={{ background: h.col.head, color: h.col.text, borderBottom: `2px solid ${h.col.text}30` }}>{h.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classStudents.map((s, i) => {
                                                const key = `${s.id}_${selSubject}`;
                                                const score = marks[key] || '';
                                                const isUnsaved = unsavedCells.has(key);
                                                const gradeInfo = score !== '' ? getGrade(Number(score)) : null;
                                                return (
                                                    <tr key={s.id} className={`transition-colors ${isUnsaved ? 'bg-amber-50/50' : ''}`}
                                                        style={{ borderBottom: '1px solid #f1f5f9' }}
                                                        onMouseEnter={e => { if (!isUnsaved) (e.currentTarget as HTMLTableRowElement).style.background = '#fafbff'; }}
                                                        onMouseLeave={e => { if (!isUnsaved) (e.currentTarget as HTMLTableRowElement).style.background = ''; }}>
                                                        <td className="px-3 py-2 text-center font-bold" style={{ background: C.num.bg + '60', color: C.num.text }}>{i + 1}</td>
                                                        <td className="px-3 py-2 font-mono text-xs font-bold" style={{ background: C.adm.bg + '60', color: C.adm.text }}>{s.admission_no || s.admission_number}</td>
                                                        <td className="px-3 py-2" style={{ background: C.name.bg + '60' }}>
                                                            <div className="flex items-center gap-2.5">
                                                                <StudentAvatar name={`${s.first_name} ${s.last_name}`} size={30} />
                                                                <span className="font-bold text-gray-900">{s.first_name} {s.last_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-1.5 text-center" style={{ background: C.score.bg + '60' }}>
                                                            <input type="number" min="0" max="100" value={score}
                                                                onChange={e => handleMarkChange(s.id, e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown') {
                                                                        const nextRow = classStudents[i + 1];
                                                                        if (nextRow) { const ni = document.getElementById(`mark-${nextRow.id}`); if (ni) { e.preventDefault(); ni.focus(); } }
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        const prevRow = classStudents[i - 1];
                                                                        if (prevRow) { const pi = document.getElementById(`mark-${prevRow.id}`); if (pi) { e.preventDefault(); pi.focus(); } }
                                                                    }
                                                                }}
                                                                id={`mark-${s.id}`} placeholder="—"
                                                                className={`w-20 text-center text-sm font-bold rounded-lg border-2 py-2 outline-none transition-all
                                                                    ${isUnsaved ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200' :
                                                                        score !== '' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}
                                                                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200`}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center" style={{ background: C.grade.bg + '60' }}>
                                                            {gradeInfo ? (<span className="inline-flex items-center justify-center w-10 h-8 rounded-lg font-black text-sm text-white shadow-sm"
                                                                style={{ background: gradeColors[gradeInfo.grade] || '#94a3b8' }}>{gradeInfo.grade}</span>
                                                            ) : (<span className="text-gray-300">—</span>)}
                                                        </td>
                                                        <td className="px-3 py-2 text-center font-bold" style={{ background: C.pts.bg + '60', color: C.pts.text }}>{gradeInfo ? gradeInfo.points : '—'}</td>
                                                        <td className="px-3 py-2 text-xs" style={{ background: C.remarks.bg + '60', color: C.remarks.text }}>{gradeInfo?.remarks || '—'}</td>
                                                        <td className="px-3 py-2 text-center" style={{ background: C.status.bg + '60' }}>
                                                            {isUnsaved ? <span className="text-amber-500" title="Unsaved">⚡</span> :
                                                                score !== '' ? <FiCheckCircle className="text-green-500 mx-auto" size={16} /> :
                                                                <span className="text-gray-300">○</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm" style={{ background: 'linear-gradient(135deg,#fafbff,#f5f3ff)' }}>
                                    <div className="text-gray-500">
                                        <span className="font-bold text-gray-700">{enteredCount}</span> of {classStudents.length} marks entered
                                        {enteredCount > 0 && <> • Mean: <span className="font-bold text-purple-600">{avg.toFixed(1)}</span> • Grade: <span className="font-black" style={{ color: gradeColors[getGrade(avg).grade] }}>{getGrade(avg).grade}</span></>}
                                    </div>
                                    <div className="flex gap-3 text-xs">
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Saved</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Unsaved</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Empty</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
