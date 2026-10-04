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
    const [dbLocked, setDbLocked]         = useState(false); // from school_marks_lock table
    const [currentUser, setCurrentUser]   = useState<any>(null);
    const [showImport, setShowImport]     = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [marksLoading, setMarksLoading] = useState(false);
    const autoSaveRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Exam types from DB (school_exam_types filtered by selected term)
    const [dbExamTypes, setDbExamTypes] = useState<any[]>([]);
    const fallbackExamTypes = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial'];


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

    useEffect(() => {
        fetchAll();
        try {
            const u = JSON.parse(localStorage.getItem('school_user') || '{}');
            setCurrentUser(u);
        } catch {}
    }, [fetchAll]);

    // ── Role-based subject filter (strict: teacher only sees own subject/form/stream) ─
    const isSuperUser = currentUser?.role === 'admin' || currentUser?.role === 'principal' || currentUser?.role === 'deputy';

    const availableSubjects = useMemo(() => {
        if (!currentUser?.id || isSuperUser) return subjects;
        // Teacher: only subjects assigned to them for the selected form+stream
        const myLinks = subjectTeachers.filter(st => {
            const userMatch = st.teacher_id === currentUser.id || st.teacher_id === currentUser.teacher_id;
            const formMatch = !selForm || !st.form_id || String(st.form_id) === selForm;
            const streamMatch = !selStream || !st.stream_id || String(st.stream_id) === selStream;
            return userMatch && formMatch && streamMatch;
        });
        const mySubjectIds = myLinks.map(l => l.subject_id);
        return subjects.filter(s => mySubjectIds.includes(s.id));
    }, [subjects, subjectTeachers, currentUser, isSuperUser, selForm, selStream]);

    // ── Check DB lock for selected term/form/exam ────────────────────────────
    useEffect(() => {
        if (!selTerm || !selForm || !selExamType) { setDbLocked(false); return; }
        supabase.from('school_marks_lock')
            .select('is_locked')
            .eq('term_id', Number(selTerm))
            .eq('form_id', Number(selForm))
            .eq('exam_type', selExamType)
            .maybeSingle()
            .then(({ data }) => {
                // If a lock record exists with is_locked=true AND user is not superUser → locked
                if (data && data.is_locked && !isSuperUser) {
                    setDbLocked(true);
                    setLocked(true);
                } else {
                    setDbLocked(false);
                    if (!isSuperUser) setLocked(false);
                }
            });
    }, [selTerm, selForm, selExamType, isSuperUser]);

    // ── Load exam types from DB when term changes (matches report card logic) ─
    useEffect(() => {
        if (!selTerm) { setDbExamTypes([]); return; }
        supabase
            .from('school_exam_types')
            .select('*')
            .eq('term_id', Number(selTerm))
            .eq('is_active', true)
            .order('id')
            .then(({ data }) => {
                const types = data || [];
                setDbExamTypes(types);
                // If current selExamType not in new list, default to first
                if (types.length > 0 && !types.find((t: any) => t.exam_name === selExamType)) {
                    setSelExamType(types[0].exam_name);
                }
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selTerm]);

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
        const teacherName  = currentUser?.full_name || currentUser?.username || '';
        const teacherUserId = currentUser?.id || null;
        const payload = {
            student_id: studentId, subject_id: Number(selSubject),
            term_id: Number(selTerm), exam_type: selExamType,
            score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks,
            entered_by_user_id: teacherUserId,
            entered_by_name: teacherName,
            entered_at: new Date().toISOString(),
        };
        const { data: ex } = await supabase.from('school_exam_marks').select('id').eq('student_id', studentId).eq('subject_id', Number(selSubject)).eq('term_id', Number(selTerm)).eq('exam_type', selExamType).maybeSingle();
        const { error } = ex
            ? await supabase.from('school_exam_marks').update({ score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks, last_modified_by: teacherName, last_modified_at: new Date().toISOString() }).eq('id', ex.id)
            : await supabase.from('school_exam_marks').insert([payload]);
        if (!error) {
            setSavedMarks(prev => ({ ...prev, [key]: score }));
            setUnsavedCells(prev => { const n = new Set(prev); n.delete(key); return n; });
            // ── Auto-alert parent when student fails ──────────────────
            if (Number(score) < 50) {
                try {
                    const subName = subjects.find((s: any) => String(s.id) === String(selSubject))?.subject_name || 'a subject';
                    const { data: portal } = await supabase.from('school_portal_users').select('id').eq('student_id', studentId).eq('user_type', 'parent').maybeSingle();
                    if (portal?.id) {
                        await supabase.from('school_portal_notifications').insert([{
                            portal_user_id: portal.id,
                            title: `⚠️ Low Mark Alert — ${subName}`,
                            message: `Your child scored ${score}% in ${subName} (${selExamType}). This is below the pass mark of 50%. Please contact the class teacher for support.`,
                            type: 'academic_alert',
                            is_read: false,
                            created_at: new Date().toISOString(),
                        }]);
                    }
                } catch { /* silent — don't block marks save */ }
            }
        }
    };

    // ── Save all unsaved marks ────────────────────────────────────────────────
    const handleSaveAll = async () => {
        if (unsavedCells.size === 0) { toast('✅ All marks already saved'); return; }
        setSaving(true);
        let saved = 0; let failed = 0;
        const teacherName   = currentUser?.full_name || currentUser?.username || '';
        const teacherUserId = currentUser?.id || null;

        for (const key of Array.from(unsavedCells)) {
            const [sid] = key.split('_');
            const score = marks[key];
            if (score === '' || score === undefined) continue;
            const g = getGrade(Number(score));
            const payload = {
                student_id: Number(sid), subject_id: Number(selSubject),
                term_id: Number(selTerm), exam_type: selExamType,
                score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks,
                entered_by_user_id: teacherUserId, entered_by_name: teacherName,
                entered_at: new Date().toISOString(),
            };
            const { data: ex } = await supabase.from('school_exam_marks').select('id').eq('student_id', Number(sid)).eq('subject_id', Number(selSubject)).eq('term_id', Number(selTerm)).eq('exam_type', selExamType).maybeSingle();
            const { error } = ex
                ? await supabase.from('school_exam_marks').update({ score: Number(score), grade: g.grade, points: g.points, remarks: g.remarks, last_modified_by: teacherName, last_modified_at: new Date().toISOString() }).eq('id', ex.id)
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

    const sel = 'w-full px-3 py-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 text-gray-800 transition-all backdrop-blur-sm';

    return (
        <div className="space-y-4 pb-24" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
            <style>{`
                input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
                input[type=number]{-moz-appearance:textfield;appearance:textfield}
                @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.4);opacity:0}}
                @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
                @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
                .animate-fadeIn{animation:fadeIn 0.35s ease both}
                .mark-input:focus{transform:scale(1.08);z-index:10}
                .mark-input{transition:all 0.15s cubic-bezier(.4,0,.2,1)}
                .row-hover:hover{background:linear-gradient(90deg,#f0f4ff,#fdf4ff)!important;transform:translateX(2px)}
                .row-hover{transition:all 0.12s ease}
                .grade-pill{transition:all 0.2s ease}
                .glass{background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
                .hero-dot{background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,0.12) 1px,transparent 0);background-size:20px 20px}
                ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:6px}
            `}</style>

            {/* ══════════════════════════════════════════
                HERO COMMAND CENTRE
            ══════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl shadow-2xl animate-fadeIn"
                style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1e1b6b 35%,#24243e 70%,#0f0c29 100%)' }}>

                {/* Mesh dot grid */}
                <div className="absolute inset-0 hero-dot opacity-100" />

                {/* Glow orbs */}
                <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle,#818cf8,transparent 70%)' }} />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle,#c084fc,transparent 70%)' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 opacity-5 rounded-full"
                    style={{ background: 'radial-gradient(ellipse,#fff,transparent 70%)' }} />

                <div className="relative px-6 py-6">
                    {/* Top row: Title + Actions */}
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                        <div className="flex items-center gap-4">
                            {/* Icon badge */}
                            <div className="relative flex-shrink-0">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa)' }}>
                                    <span className="text-2xl">✏️</span>
                                </div>
                                <div className="absolute -inset-1 rounded-3xl opacity-30 animate-pulse"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', filter: 'blur(6px)' }} />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="font-black text-2xl tracking-tight"
                                        style={{ background: 'linear-gradient(135deg,#fff 0%,#c7d2fe 50%,#e9d5ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                        Mark Entry System
                                    </h1>
                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase"
                                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.5)' }}>
                                        ULTRA PRO
                                    </span>
                                    {locked && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black"
                                            style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff' }}>
                                            <FiLock size={9} /> LOCKED
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium" style={{ color: 'rgba(199,210,254,0.8)' }}>
                                    {isReady && subjectInfo
                                        ? <><span className="font-black text-white">{subjectInfo.subject_name}</span> · {formInfo?.form_name}{streamInfo ? ` (${streamInfo.stream_name})` : ''} · {termInfo?.term_name} · <span className="text-purple-300 font-bold">{selExamType}</span></>
                                        : 'Kenya\'s Most Advanced Marks Entry System — Select filters below to begin'}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {isReady && (
                                <>
                                    <button onClick={() => setShowImport(true)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all hover:scale-105"
                                        style={{ background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                                        <FiUpload size={12} /> Import CSV
                                    </button>
                                    <button onClick={exportMarks}
                                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all hover:scale-105"
                                        style={{ background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                                        <FiDownload size={12} /> Export
                                    </button>
                                    {currentUser?.full_name && (
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-xl"
                                            style={{ background: 'rgba(99,102,241,0.3)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.4)' }}>
                                            ✍️ {currentUser.full_name}
                                        </span>
                                    )}
                                    {isSuperUser ? (
                                        <button onClick={() => setLocked(l => !l)}
                                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all hover:scale-105"
                                            style={locked
                                                ? { background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', boxShadow: '0 4px 16px rgba(220,38,38,0.4)' }
                                                : { background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', border: '1px solid rgba(255,255,255,0.15)' }}>
                                            {locked ? <><FiLock size={12} /> Locked</> : <><FiUnlock size={12} /> Lock</>}
                                        </button>
                                    ) : dbLocked ? (
                                        <span className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl"
                                            style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff' }}>
                                            <FiLock size={12} /> Locked
                                        </span>
                                    ) : null}
                                </>
                            )}
                            <button onClick={fetchAll}
                                className="p-2 rounded-xl transition-all hover:scale-110"
                                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(199,210,254,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    {isReady && (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[
                                { label: 'Students', value: classStudents.length, icon: '👨‍🎓', color: '#818cf8' },
                                { label: 'Entered', value: `${enteredCount}/${classStudents.length}`, icon: '✏️', color: '#34d399' },
                                { label: 'Completion', value: `${completionPct}%`, icon: completionPct === 100 ? '🎉' : '📋', color: completionPct === 100 ? '#10b981' : '#f59e0b' },
                                { label: 'Class Mean', value: analytics ? analytics.mean : '—', icon: '📊', color: '#60a5fa' },
                                { label: 'Mean Grade', value: analytics ? analytics.meanGrade.grade : '—', icon: '🏅', color: '#c084fc' },
                                { label: 'Unsaved', value: unsavedCells.size, icon: unsavedCells.size > 0 ? '⚡' : '✅', color: unsavedCells.size > 0 ? '#fbbf24' : '#10b981' },
                            ].map(k => (
                                <div key={k.label} className="rounded-2xl px-3 py-2.5 group hover:scale-105 transition-all duration-200"
                                    style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-sm">{k.icon}</span>
                                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(165,180,252,0.7)' }}>{k.label}</p>
                                    </div>
                                    <p className="text-lg font-black" style={{ color: k.color }}>{k.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Completion bar */}
                    {isReady && (
                        <div className="mt-3">
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${completionPct}%`, background: completionPct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7)' }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>✏️</div>
                        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-300 animate-ping opacity-30" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-black text-gray-700">Loading Mark Entry System</p>
                        <p className="text-xs text-gray-400 mt-0.5">Kenya's #1 Academic Management Platform</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* DB Lock Banner */}
                    {dbLocked && !isSuperUser && (
                        <div className="rounded-2xl p-4 flex items-center gap-3 animate-fadeIn"
                            style={{ background: 'linear-gradient(135deg,#fef2f2,#fff1f1)', border: '2px solid #fecaca' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                                <FiLock className="text-white" size={16} />
                            </div>
                            <div>
                                <p className="font-black text-red-800 text-sm">🔒 Marks Locked by Administration</p>
                                <p className="text-xs text-red-600 mt-0.5">Marks entry for this form/term has been locked. Contact the Principal to unlock.</p>
                            </div>
                        </div>
                    )}

                    {/* Teacher Identity Banner */}
                    {!isSuperUser && currentUser?.full_name && !dbLocked && (
                        <div className="rounded-2xl p-3.5 flex items-center gap-3 animate-fadeIn"
                            style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '1px solid #c7d2fe' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>✍️</div>
                            <div>
                                <p className="font-black text-indigo-800 text-sm">Entering marks as: {currentUser.full_name}</p>
                                <p className="text-xs text-indigo-500 mt-0.5">Your name is stamped on every mark. Only your assigned subjects are shown.</p>
                            </div>
                        </div>
                    )}

                    {/* ════ SELECTION PANEL ════ */}
                    <div className="glass rounded-3xl shadow-xl border border-white/80 overflow-hidden animate-fadeIn"
                        style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.06)' }}>
                        {/* Panel header */}
                        <div className="px-5 py-3 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg,#f8faff,#f3f0ff)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                    <FiBookOpen className="text-white" size={12} />
                                </div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Class & Exam Selection</p>
                            </div>
                            {isReady && (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
                                    ✓ Ready
                                </span>
                            )}
                        </div>

                        <div className="p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { label: 'Form / Class', icon: '🏫', content: (
                                        <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className={sel}>
                                            <option value="">Select Form</option>
                                            {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                        </select>
                                    )},
                                    { label: 'Stream', icon: '🌊', content: (
                                        <select value={selStream} onChange={e => setSelStream(e.target.value)} className={sel}>
                                            <option value="">All Streams</option>
                                            {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                                        </select>
                                    )},
                                    { label: 'Subject', icon: '📚', content: (
                                        <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className={sel}>
                                            <option value="">Select Subject</option>
                                            {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                                        </select>
                                    )},
                                    { label: 'Term', icon: '📅', content: (
                                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className={sel}>
                                            <option value="">Select Term</option>
                                            {terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                                        </select>
                                    )},
                                    { label: 'Exam Type', icon: '📝', content: (
                                        <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className={sel}>
                                            {(dbExamTypes.length > 0 ? dbExamTypes.map((et: any) => et.exam_name) : fallbackExamTypes).map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    )},
                                    { label: 'Max Score', icon: '🎯', content: (
                                        <input type="number" min={10} max={1000} value={maxScore}
                                            onChange={e => setMaxScore(Math.max(10, Number(e.target.value)))}
                                            className={sel} placeholder="100" />
                                    )},
                                ].map(({ label, icon, content }) => (
                                    <div key={label}>
                                        <label className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                                            <span>{icon}</span> {label}
                                        </label>
                                        {content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ════ EMPTY / NO STUDENTS ════ */}
                    {!isReady ? (
                        <div className="glass rounded-3xl border border-white/80 text-center py-20 animate-fadeIn"
                            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.08)' }}>
                            <div className="text-7xl mb-5" style={{ animation: 'float 3s ease-in-out infinite' }}>📊</div>
                            <p className="font-black text-xl text-gray-700 mb-2">Select Form, Subject & Term</p>
                            <p className="text-sm text-gray-400 max-w-sm mx-auto">Choose your filters above to load the marks sheet. Kenya's most powerful mark entry interface awaits.</p>
                            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                                {['⌨️ Keyboard Nav', '💾 Auto-Save', '📥 CSV Import', '📊 Live Analytics'].map(f => (
                                    <span key={f} className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                                        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>{f}</span>
                                ))}
                            </div>
                        </div>
                    ) : classStudents.length === 0 ? (
                        <div className="glass rounded-3xl border border-white/80 text-center py-20 animate-fadeIn">
                            <div className="text-7xl mb-4">👤</div>
                            <p className="font-black text-xl text-gray-700">No students in this class</p>
                            <p className="text-sm text-gray-400 mt-1">Enroll students first from the Students module</p>
                        </div>
                    ) : (
                        <>
                            {/* ════ ACTION BAR ════ */}
                            <div className="flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
                                <div className="flex items-center gap-2">
                                    {/* Search */}
                                    <div className="relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                            placeholder="Search student or adm no…"
                                            className="pl-8 pr-4 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 w-56 transition-all shadow-sm" />
                                    </div>
                                    {searchQ && <button onClick={() => setSearchQ('')}
                                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                                        <FiX size={12} /> Clear
                                    </button>}

                                    {/* Shortcuts toggle */}
                                    <button onClick={() => setShowShortcuts(s => !s)}
                                        className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border border-gray-200 bg-white text-gray-500 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm">
                                        <FiInfo size={11} /> Shortcuts
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {unsavedCells.size > 0 && (
                                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                                            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
                                            <FiAlertTriangle size={11} /> {unsavedCells.size} unsaved
                                        </span>
                                    )}
                                    <button
                                        disabled={locked || saving}
                                        onClick={handleSaveAll}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg"
                                        style={unsavedCells.size > 0
                                            ? { background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 6px 20px rgba(16,185,129,0.4)' }
                                            : { background: '#f1f5f9', color: '#94a3b8' }}>
                                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
                                        {saving ? 'Saving…' : unsavedCells.size > 0 ? `Save All (${unsavedCells.size})` : 'All Saved ✅'}
                                    </button>
                                </div>
                            </div>

                            {/* Keyboard Shortcuts */}
                            {showShortcuts && (
                                <div className="rounded-2xl p-4 animate-fadeIn"
                                    style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '1px solid #c7d2fe' }}>
                                    <p className="text-xs font-black text-indigo-700 mb-3 uppercase tracking-wider">⌨️ Keyboard Shortcuts</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[['Enter / ↓', 'Move to next student'], ['↑', 'Move to previous student'], ['Tab', 'Jump to next row'], ['0–9', 'Type score directly']].map(([k, d]) => (
                                            <div key={k} className="flex items-center gap-2 text-xs text-indigo-800">
                                                <kbd className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-mono font-black text-[10px] shadow-sm">{k}</kbd>
                                                <span>{d}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ════ MARKS TABLE ════ */}
                            <div className="rounded-3xl overflow-hidden shadow-xl animate-fadeIn"
                                style={{ border: '1px solid rgba(99,102,241,0.15)', boxShadow: '0 12px 40px rgba(99,102,241,0.12)' }}>

                                {marksLoading ? (
                                    <div className="flex items-center justify-center py-20 gap-3 bg-white rounded-3xl">
                                        <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                        <p className="text-sm font-bold text-gray-400">Loading marks sheet…</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse" style={{ fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: 'linear-gradient(135deg,#0f0c29 0%,#1e1b6b 60%,#312e81 100%)' }}>
                                                    {[
                                                        { h: '#', w: 40 }, { h: 'Adm No', w: 90 }, { h: 'Student Name', w: 180 },
                                                        { h: '♂♀', w: 50 }, { h: `Score /${maxScore}`, w: 110 },
                                                        { h: 'Pct %', w: 60 }, { h: 'Grade', w: 70 },
                                                        { h: 'Pts', w: 50 }, { h: 'Remarks', w: 120 },
                                                        { h: 'Rank', w: 60 }, { h: '●', w: 50 },
                                                    ].map(({ h, w }) => (
                                                        <th key={h} className="text-left px-3 py-4 font-black uppercase tracking-widest whitespace-nowrap"
                                                            style={{ fontSize: 9, color: 'rgba(199,210,254,0.85)', minWidth: w, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody style={{ background: '#fff' }}>
                                                {classStudents.map((s, i) => {
                                                    const key = `${s.id}_${selSubject}`;
                                                    const score = marks[key] ?? '';
                                                    const isUnsaved = unsavedCells.has(key);
                                                    const g = score !== '' ? getGrade(Number(score)) : null;
                                                    const pct = score !== '' ? ((Number(score) / maxScore) * 100).toFixed(1) : '';
                                                    const pctNum = score !== '' ? (Number(score) / maxScore) * 100 : -1;
                                                    const rank = score !== '' ? ranks[s.id] : null;

                                                    // Row color: unsaved=amber tint, failing=red tint, top=green tint, alt=light
                                                    const rowBg = isUnsaved
                                                        ? 'rgba(251,191,36,0.05)'
                                                        : pctNum >= 0 && pctNum < 40 ? 'rgba(239,68,68,0.03)'
                                                        : rank === 1 ? 'rgba(16,185,129,0.04)'
                                                        : i % 2 === 0 ? '#ffffff' : '#fafbff';

                                                    // Input border color based on score
                                                    const inputStyle = locked
                                                        ? { borderColor: '#e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }
                                                        : isUnsaved
                                                        ? { borderColor: '#f59e0b', background: 'rgba(251,191,36,0.08)', color: '#92400e', boxShadow: '0 0 0 3px rgba(251,191,36,0.15)' }
                                                        : score !== ''
                                                        ? pctNum >= 60
                                                            ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.06)', color: '#065f46' }
                                                            : pctNum >= 40
                                                            ? { borderColor: '#f59e0b', background: 'rgba(245,158,11,0.06)', color: '#78350f' }
                                                            : { borderColor: '#ef4444', background: 'rgba(239,68,68,0.06)', color: '#7f1d1d' }
                                                        : { borderColor: '#e2e8f0', background: '#fff', color: '#1e293b' };

                                                    return (
                                                        <tr key={s.id} className="row-hover"
                                                            style={{ background: rowBg, borderBottom: '1px solid #f1f5f9' }}>
                                                            {/* # */}
                                                            <td className="px-3 py-3 text-center font-black text-xs"
                                                                style={{ color: '#6366f1', minWidth: 40 }}>{i + 1}</td>
                                                            {/* Adm No */}
                                                            <td className="px-3 py-3 font-mono font-black text-xs" style={{ color: '#3b82f6' }}>
                                                                {s.admission_no || s.admission_number}
                                                            </td>
                                                            {/* Name */}
                                                            <td className="px-3 py-3" style={{ minWidth: 180 }}>
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar name={`${s.first_name} ${s.last_name}`} size={28} />
                                                                    <span className="font-bold text-gray-900 text-xs">{s.first_name} {s.last_name}</span>
                                                                </div>
                                                            </td>
                                                            {/* Gender */}
                                                            <td className="px-3 py-3 text-center">
                                                                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${s.gender === 'Female' ? 'text-pink-600' : 'text-blue-600'}`}
                                                                    style={{ background: s.gender === 'Female' ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)' }}>
                                                                    {s.gender === 'Female' ? '♀' : '♂'}
                                                                </span>
                                                            </td>
                                                            {/* Score input */}
                                                            <td className="px-2 py-2 text-center" style={{ minWidth: 110 }}>
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
                                                                    style={{ width: 80, border: '2px solid', borderRadius: 12, padding: '6px 10px', textAlign: 'center', fontWeight: 900, fontSize: 14, outline: 'none', transition: 'all 0.15s', ...inputStyle }}
                                                                    className="mark-input focus:scale-105"
                                                                />
                                                            </td>
                                                            {/* Pct */}
                                                            <td className="px-3 py-3 text-center font-bold text-xs"
                                                                style={{ color: pctNum >= 60 ? '#059669' : pctNum >= 40 ? '#d97706' : pctNum >= 0 ? '#dc2626' : '#cbd5e1' }}>
                                                                {pct ? `${pct}%` : '—'}
                                                            </td>
                                                            {/* Grade */}
                                                            <td className="px-3 py-3 text-center">
                                                                {g ? <GradePill grade={g.grade} /> : <span style={{ color: '#e2e8f0' }}>—</span>}
                                                            </td>
                                                            {/* Points */}
                                                            <td className="px-3 py-3 text-center font-black text-sm" style={{ color: '#7c3aed' }}>
                                                                {g?.points ?? <span style={{ color: '#e2e8f0' }}>—</span>}
                                                            </td>
                                                            {/* Remarks */}
                                                            <td className="px-3 py-3 text-xs font-medium" style={{ color: '#64748b', maxWidth: 120 }}>
                                                                <span className="truncate block">{g?.remarks || '—'}</span>
                                                            </td>
                                                            {/* Rank */}
                                                            <td className="px-3 py-3 text-center">
                                                                {rank ? (
                                                                    <span className="text-xs font-black px-2 py-1 rounded-full"
                                                                        style={rank <= 3
                                                                            ? { background: 'rgba(245,158,11,0.12)', color: '#b45309' }
                                                                            : { color: '#94a3b8' }}>
                                                                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                                                    </span>
                                                                ) : <span style={{ color: '#e2e8f0' }}>—</span>}
                                                            </td>
                                                            {/* Status */}
                                                            <td className="px-3 py-3 text-center">
                                                                {isUnsaved
                                                                    ? <span title="Unsaved" className="text-amber-400 animate-pulse text-lg">⚡</span>
                                                                    : score !== ''
                                                                    ? <FiCheckCircle className="mx-auto" style={{ color: '#10b981' }} size={16} />
                                                                    : <span style={{ color: '#e2e8f0', fontSize: 18 }}>○</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* ── Premium Analytics Footer ── */}
                                <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg,#f8faff 0%,#f5f0ff 100%)', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                                    <div className="flex items-start justify-between flex-wrap gap-5">
                                        {/* Stats row */}
                                        <div className="flex items-center gap-5 flex-wrap">
                                            {analytics ? (
                                                <>
                                                    {[
                                                        { label: 'Class Mean', value: `${analytics.mean}/${maxScore}`, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                                                        { label: 'Mean Grade', value: analytics.meanGrade.grade, color: GRADE_COLORS[analytics.meanGrade.grade] || '#6366f1', bg: 'rgba(99,102,241,0.06)' },
                                                        { label: 'Highest', value: String(analytics.max), color: '#059669', bg: 'rgba(5,150,105,0.08)' },
                                                        { label: 'Lowest', value: String(analytics.min), color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
                                                        { label: 'Median', value: String(analytics.median), color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
                                                        { label: 'Pass Rate', value: `${analytics.passRate}%`, color: analytics.passRate >= 50 ? '#059669' : '#dc2626', bg: analytics.passRate >= 50 ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)' },
                                                    ].map(a => (
                                                        <div key={a.label} className="text-center px-3 py-2 rounded-xl"
                                                            style={{ background: a.bg }}>
                                                            <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">{a.label}</p>
                                                            <p className="text-base font-black" style={{ color: a.color }}>{a.value}</p>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">Enter marks to see live analytics</p>
                                            )}
                                        </div>

                                        {/* Grade distribution + legend */}
                                        <div className="flex items-end gap-4">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Grade Distribution</p>
                                                <GradeDistBar marks={marks} grading={grading} max={maxScore} />
                                            </div>
                                            <div className="flex flex-col gap-1 text-[10px] text-gray-400 pb-1">
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#10b981' }} />Saved</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f59e0b' }} />Unsaved</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block bg-gray-200" />Empty</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Completion progress bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1.5">
                                            <span className="font-bold">{enteredCount} of {classStudents.length} marks entered</span>
                                            <span className="font-black text-sm" style={{ color: completionPct === 100 ? '#059669' : '#6366f1' }}>{completionPct}% complete</span>
                                        </div>
                                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                            <div className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${completionPct}%`, background: completionPct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: completionPct > 0 ? '0 2px 8px rgba(99,102,241,0.4)' : 'none' }} />
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

            {/* ── Floating Save Pill (visible when unsaved marks exist) ── */}
            {unsavedCells.size > 0 && isReady && !saving && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
                    <button onClick={handleSaveAll}
                        className="flex items-center gap-2.5 px-6 py-3 font-black text-sm rounded-full shadow-2xl hover:scale-105 transition-all"
                        style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', boxShadow: '0 8px 32px rgba(16,185,129,0.5)' }}>
                        <FiSave size={15} />
                        Save {unsavedCells.size} Unsaved Mark{unsavedCells.size > 1 ? 's' : ''}
                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">{unsavedCells.size}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
