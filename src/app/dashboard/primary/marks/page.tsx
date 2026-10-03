'use client';
/**
 * PRIMARY MARKS ENTRY — CBC EE/ME/AE/BE Rubric
 * Grade 1–6 + PP1/PP2 (activity-based, no numeric scores)
 * Uses school_exam_marks table with score = 4/3/2/1 for EE/ME/AE/BE
 * Filtered automatically to primary forms via SchoolModeContext
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSchoolMode } from '@/contexts/SchoolModeContext';
import toast from 'react-hot-toast';

// CBC rubric levels
const RUBRIC = [
    { code: 'EE', label: 'Exceeds Expectation',    score: 4, color: '#059669', bg: '#d1fae5', emoji: '⭐' },
    { code: 'ME', label: 'Meets Expectation',       score: 3, color: '#2563eb', bg: '#dbeafe', emoji: '✅' },
    { code: 'AE', label: 'Approaches Expectation',  score: 2, color: '#d97706', bg: '#fef3c7', emoji: '⚡' },
    { code: 'BE', label: 'Below Expectation',       score: 1, color: '#dc2626', bg: '#fee2e2', emoji: '🔴' },
];

const EXAM_TYPES = ['End Term', 'Mid Term', 'Formative Assessment', 'Summative Assessment'];

function gradeFromScore(score: number): string {
    if (score >= 4) return 'EE';
    if (score >= 3) return 'ME';
    if (score >= 2) return 'AE';
    return 'BE';
}

export default function PrimaryMarksPage() {
    const { forms, formsLoading } = useSchoolMode();

    const [terms, setTerms]         = useState<any[]>([]);
    const [subjects, setSubjects]   = useState<any[]>([]);
    const [students, setStudents]   = useState<any[]>([]);
    const [existingMarks, setExistingMarks] = useState<Record<string, string>>({});
    const [saving, setSaving]       = useState(false);
    const [fetching, setFetching]   = useState(false);

    const [selForm,    setSelForm]    = useState('');
    const [selTerm,    setSelTerm]    = useState('');
    const [selSubject, setSelSubject] = useState('');
    const [selExamType, setSelExamType] = useState('End Term');

    // marks[studentId] = 'EE' | 'ME' | 'AE' | 'BE'
    const [marks, setMarks] = useState<Record<number, string>>({});

    // Load terms + subjects on mount
    useEffect(() => {
        const load = async () => {
            const [termRes, subjRes] = await Promise.all([
                supabase.from('school_terms').select('*').order('id', { ascending: false }),
                supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            ]);
            setTerms(termRes.data || []);
            // Set current term default
            const current = (termRes.data || []).find((t: any) => t.is_current);
            if (current) setSelTerm(String(current.id));

            setSubjects(subjRes.data || []);
        };
        load();
    }, []);

    // Load students when form changes
    useEffect(() => {
        if (!selForm) { setStudents([]); return; }
        const load = async () => {
            const { data } = await supabase
                .from('school_students')
                .select('id, first_name, last_name, admission_number, stream_id')
                .eq('form_id', Number(selForm))
                .eq('status', 'Active')
                .order('last_name');
            setStudents(data || []);
            setMarks({});
        };
        load();
    }, [selForm]);

    // Load existing marks when form/term/subject/examtype change
    const loadExistingMarks = useCallback(async () => {
        if (!selForm || !selTerm || !selSubject) return;
        setFetching(true);

        // Get student IDs for this form
        const { data: formStudents } = await supabase
            .from('school_students').select('id').eq('form_id', Number(selForm)).eq('status', 'Active');
        const studentIds = (formStudents || []).map((s: any) => s.id);
        if (studentIds.length === 0) { setFetching(false); return; }

        const { data } = await supabase
            .from('school_exam_marks')
            .select('student_id, score, grade')
            .in('student_id', studentIds)
            .eq('subject_id', Number(selSubject))
            .eq('term_id', Number(selTerm))
            .eq('exam_type', selExamType);

        const map: Record<number, string> = {};
        (data || []).forEach((m: any) => {
            map[m.student_id] = m.grade || gradeFromScore(m.score);
        });
        setMarks(map);
        setFetching(false);
    }, [selForm, selTerm, selSubject, selExamType]);

    useEffect(() => { loadExistingMarks(); }, [loadExistingMarks]);

    const setMark = (studentId: number, grade: string) => {
        setMarks(prev => ({ ...prev, [studentId]: grade }));
    };

    const handleSaveAll = async () => {
        if (!selForm || !selTerm || !selSubject) { toast.error('Select form, term and subject first'); return; }
        if (Object.keys(marks).length === 0) { toast.error('No marks entered'); return; }

        setSaving(true);
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');
        const enteredBy = user.full_name || user.username || 'Teacher';

        const upsertData = Object.entries(marks).map(([studentId, grade]) => {
            const rubricItem = RUBRIC.find(r => r.code === grade);
            return {
                student_id:  Number(studentId),
                subject_id:  Number(selSubject),
                term_id:     Number(selTerm),
                exam_type:   selExamType,
                score:       rubricItem?.score || 2,
                grade:       grade,
                entered_by_name: enteredBy,
                entered_at: new Date().toISOString(),
            };
        });

        // Upsert in batches of 50
        let hasError = false;
        for (let i = 0; i < upsertData.length; i += 50) {
            const batch = upsertData.slice(i, i + 50);
            const { error } = await supabase
                .from('school_exam_marks')
                .upsert(batch, { onConflict: 'student_id,subject_id,term_id,exam_type' });
            if (error) { hasError = true; console.error(error); }
        }

        setSaving(false);
        if (hasError) {
            toast.error('Some marks failed to save — check console');
        } else {
            toast.success(`✅ ${upsertData.length} marks saved!`);
        }
    };

    const completionCount = students.filter(s => marks[s.id]).length;
    const completionPct   = students.length > 0 ? Math.round((completionCount / students.length) * 100) : 0;

    // Stats per grade
    const gradeCounts = RUBRIC.reduce((acc, r) => {
        acc[r.code] = Object.values(marks).filter(g => g === r.code).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: 24 }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
                    ✏️ Primary Marks Entry
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                    CBC Rubric — EE / ME / AE / BE (no numeric scores)
                </p>
            </div>

            {/* Filters */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>CLASS / GRADE *</label>
                        <select value={selForm} onChange={e => setSelForm(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                            <option value="">Select class...</option>
                            {formsLoading ? <option disabled>Loading...</option> : forms.map(f => (
                                <option key={f.id} value={f.id}>{f.form_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>TERM *</label>
                        <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                            <option value="">Select term...</option>
                            {terms.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_current ? ' (Current)' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>LEARNING AREA *</label>
                        <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                            <option value="">Select subject...</option>
                            {subjects.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.subject_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>ASSESSMENT TYPE</label>
                        <select value={selExamType} onChange={e => setSelExamType(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: '#fff' }}>
                            {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Rubric Legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                {RUBRIC.map(r => (
                    <div key={r.code} style={{ background: r.bg, border: `1.5px solid ${r.color}40`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{r.emoji}</span>
                        <div>
                            <span style={{ fontWeight: 800, color: r.color, fontSize: 14 }}>{r.code}</span>
                            <span style={{ color: '#64748b', fontSize: 11, marginLeft: 6 }}>{r.label}</span>
                        </div>
                        {completionCount > 0 && (
                            <span style={{ background: r.color, color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                                {gradeCounts[r.code] || 0}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Progress + Save */}
            {students.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>COMPLETION</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{completionCount}/{students.length} ({completionPct}%)</span>
                        </div>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${completionPct}%`, background: completionPct === 100 ? '#059669' : '#2563eb', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                    <button onClick={handleSaveAll} disabled={saving || completionCount === 0}
                        style={{ background: saving ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? '⏳ Saving...' : `💾 Save ${completionCount} Marks`}
                    </button>
                </div>
            )}

            {/* Students Mark Grid */}
            {!selForm ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
                    <p style={{ fontWeight: 600, fontSize: 15 }}>Select a class to start entering marks</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>PP1, PP2, Grade 1–6 classes will appear in the dropdown above</p>
                </div>
            ) : fetching ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: '60px 24px', textAlign: 'center' }}>
                    <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ color: '#64748b', fontSize: 13 }}>Loading marks...</p>
                </div>
            ) : students.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                    <p style={{ fontWeight: 600 }}>No active pupils in this class</p>
                    <p style={{ fontSize: 13 }}>Add students first via Students → Admissions</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pupil Name</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Adm No</th>
                                {RUBRIC.map(r => (
                                    <th key={r.code} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 800, color: r.color }}>
                                        {r.emoji} {r.code}
                                    </th>
                                ))}
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s: any, i: number) => {
                                const currentGrade = marks[s.id];
                                const rubricItem = currentGrade ? RUBRIC.find(r => r.code === currentGrade) : null;
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</td>
                                        <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                                            {s.last_name}, {s.first_name}
                                        </td>
                                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{s.admission_number || s.admission_no || '-'}</td>
                                        {RUBRIC.map(r => (
                                            <td key={r.code} style={{ padding: '8px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setMark(s.id, currentGrade === r.code ? '' : r.code)}
                                                    style={{
                                                        width: 40, height: 40, borderRadius: 10,
                                                        border: currentGrade === r.code ? `2.5px solid ${r.color}` : '2px solid #e2e8f0',
                                                        background: currentGrade === r.code ? r.bg : '#fff',
                                                        color: currentGrade === r.code ? r.color : '#94a3b8',
                                                        fontWeight: 800, fontSize: 13, cursor: 'pointer',
                                                        transition: 'all 0.12s',
                                                    }}
                                                >
                                                    {r.code}
                                                </button>
                                            </td>
                                        ))}
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            {rubricItem ? (
                                                <span style={{ background: rubricItem.bg, color: rubricItem.color, borderRadius: 8, padding: '4px 10px', fontWeight: 800, fontSize: 12 }}>
                                                    {rubricItem.emoji} {rubricItem.code}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
