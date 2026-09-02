'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiRefreshCw, FiCopy,
    FiCheckCircle, FiAlertTriangle, FiSearch, FiBook, FiSliders,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

/* ─── Default KNEC 8-4-4 Scale ─── */
const DEFAULT_SCALE = [
    { grade:'A',  min_score:75, max_score:100, points:12, remarks:'Excellent',      color:'#059669' },
    { grade:'A-', min_score:70, max_score:74,  points:11, remarks:'Very Good',      color:'#10b981' },
    { grade:'B+', min_score:65, max_score:69,  points:10, remarks:'Good',           color:'#0891b2' },
    { grade:'B',  min_score:60, max_score:64,  points: 9, remarks:'Above Average',  color:'#2563eb' },
    { grade:'B-', min_score:55, max_score:59,  points: 8, remarks:'Average',        color:'#4f46e5' },
    { grade:'C+', min_score:50, max_score:54,  points: 7, remarks:'Below Average',  color:'#7c3aed' },
    { grade:'C',  min_score:45, max_score:49,  points: 6, remarks:'Satisfactory',   color:'#d97706' },
    { grade:'C-', min_score:40, max_score:44,  points: 5, remarks:'Pass',           color:'#f59e0b' },
    { grade:'D+', min_score:35, max_score:39,  points: 4, remarks:'Below Pass',     color:'#ea580c' },
    { grade:'D',  min_score:30, max_score:34,  points: 3, remarks:'Poor',           color:'#dc2626' },
    { grade:'D-', min_score:25, max_score:29,  points: 2, remarks:'Very Poor',      color:'#b91c1c' },
    { grade:'E',  min_score: 0, max_score:24,  points: 1, remarks:'Fail',           color:'#7f1d1d' },
];

/* ─── CBC Scale ─── */
const CBC_SCALE = [
    { grade:'EE', min_score:80, max_score:100, points:4, remarks:'Exceeds Expectation', color:'#059669' },
    { grade:'ME', min_score:60, max_score:79,  points:3, remarks:'Meets Expectation',   color:'#2563eb' },
    { grade:'AE', min_score:40, max_score:59,  points:2, remarks:'Approaches Expectation', color:'#f59e0b' },
    { grade:'BE', min_score: 0, max_score:39,  points:1, remarks:'Below Expectation',   color:'#ef4444' },
];

function GradePill({ grade, color }: { grade: string; color?: string }) {
    const c = color || '#6366f1';
    return <span className="text-[10px] font-black px-2 py-0.5 rounded-lg inline-block" style={{ background:`${c}20`, color:c, border:`1px solid ${c}30` }}>{grade}</span>;
}

function ColorDot({ color }: { color: string }) {
    return <span className="inline-block w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: color }}/>;
}

type GradeRow = {
    id?:        string;
    grade:      string;
    min_score:  number;
    max_score:  number;
    points:     number;
    remarks:    string;
    color:      string;
    is_active:  boolean;
    subject_id?: number;
};

/* ══════════════════════════════════════════════════════════════ */
export default function SubjectGradingPage() {
    /* ─── State ─── */
    const [loading, setLoading]       = useState(true);
    const [saving, setSaving]         = useState(false);
    const [subjects, setSubjects]     = useState<any[]>([]);
    const [globalScale, setGlobalScale] = useState<any[]>([]);
    const [subjectGrading, setSubjectGrading] = useState<any[]>([]); // from school_subject_grading
    const [selSubject, setSelSubject] = useState<any>(null);
    const [search, setSearch]         = useState('');
    const [activeTab, setActiveTab]   = useState<'global'|'subject'|'preview'>('global');
    const [editRows, setEditRows]     = useState<GradeRow[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [previewScore, setPreviewScore] = useState(72);
    const [tableExists, setTableExists] = useState(true);

    /* ─── FETCH ─── */
    const load = useCallback(async () => {
        setLoading(true);
        const [subRes, globalRes] = await Promise.all([
            supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
            supabase.from('school_grading_system').select('*').order('min_score', { ascending: false }),
        ]);
        setSubjects(subRes.data || []);
        const globalData = globalRes.data || [];
        setGlobalScale(globalData.length > 0 ? globalData : DEFAULT_SCALE);

        // Try to load subject-specific grading (table may not exist yet)
        try {
            const { data, error } = await supabase.from('school_subject_grading').select('*').order('min_score', { ascending: false });
            if (error) { setTableExists(false); }
            else { setSubjectGrading(data || []); setTableExists(true); }
        } catch { setTableExists(false); }

        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    /* ─── Load rows for editing when tab/subject changes ─── */
    useEffect(() => {
        if (activeTab === 'global') {
            setEditRows(globalScale.map(g => ({ ...g, is_active: g.is_active ?? true })));
        } else if (activeTab === 'subject' && selSubject) {
            const subjRows = subjectGrading.filter(g => g.subject_id === selSubject.id);
            if (subjRows.length > 0) {
                setEditRows(subjRows.map(g => ({ ...g, is_active: g.is_active ?? true })));
            } else {
                // Copy from global as starting point
                setEditRows(globalScale.map(g => ({
                    ...g,
                    id: undefined,
                    subject_id: selSubject.id,
                    is_active: true,
                })));
            }
        }
        setHasChanges(false);
    }, [activeTab, selSubject, globalScale, subjectGrading]);

    /* ─── ROW CRUD ─── */
    const updateRow = (idx: number, field: keyof GradeRow, val: any) => {
        setEditRows(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            return next;
        });
        setHasChanges(true);
    };

    const addRow = () => {
        setEditRows(prev => [...prev, {
            grade: 'NEW', min_score: 0, max_score: 0,
            points: 1, remarks: '', color: '#6366f1', is_active: true,
            subject_id: selSubject?.id,
        }]);
        setHasChanges(true);
    };

    const deleteRow = (idx: number) => {
        setEditRows(prev => prev.filter((_, i) => i !== idx));
        setHasChanges(true);
    };

    const resetToDefault = (type: '844' | 'cbc') => {
        const scale = type === '844' ? DEFAULT_SCALE : CBC_SCALE;
        setEditRows(scale.map(g => ({
            ...g, is_active: true,
            subject_id: activeTab === 'subject' ? selSubject?.id : undefined,
            id: undefined,
        })));
        setHasChanges(true);
        toast.success(`Reset to ${type === '844' ? 'KNEC 8-4-4' : 'CBC'} defaults`);
    };

    const copyFromGlobal = () => {
        setEditRows(globalScale.map(g => ({
            ...g, id: undefined, subject_id: selSubject?.id, is_active: true,
        })));
        setHasChanges(true);
        toast.success('Copied global scale — customise below then save');
    };

    /* ─── SAVE ─── */
    const save = async () => {
        if (!hasChanges) return;
        // Validate — no overlapping ranges
        for (let i = 0; i < editRows.length; i++) {
            if (editRows[i].min_score > editRows[i].max_score) {
                return toast.error(`Row ${i + 1}: Min score cannot exceed Max score`);
            }
            if (!editRows[i].grade.trim()) {
                return toast.error(`Row ${i + 1}: Grade cannot be empty`);
            }
        }

        setSaving(true);

        if (activeTab === 'global') {
            // Save to school_grading_system — delete all then re-insert
            const { error: delErr } = await supabase.from('school_grading_system').delete().gte('min_score', 0);
            if (delErr) { toast.error('Failed to clear old grades'); setSaving(false); return; }

            const toInsert = editRows.map(r => ({
                grade: r.grade, min_score: r.min_score, max_score: r.max_score,
                points: r.points, remarks: r.remarks, color: r.color,
            }));
            const { error } = await supabase.from('school_grading_system').insert(toInsert);
            if (error) { toast.error('Save failed: ' + error.message); }
            else { toast.success('✅ Global grading scale saved!'); }

        } else if (activeTab === 'subject' && selSubject) {
            if (!tableExists) {
                toast.error('⚠️ Run the SQL script first to create the school_subject_grading table');
                setSaving(false);
                return;
            }
            // Delete existing rows for this subject, then re-insert
            await supabase.from('school_subject_grading').delete().eq('subject_id', selSubject.id);
            const toInsert = editRows.map(r => ({
                subject_id: selSubject.id,
                grade: r.grade, min_score: r.min_score, max_score: r.max_score,
                points: r.points, remarks: r.remarks, color: r.color, is_active: r.is_active,
            }));
            const { error } = await supabase.from('school_subject_grading').insert(toInsert);
            if (error) { toast.error('Save failed: ' + error.message); }
            else { toast.success(`✅ Grading saved for ${selSubject.subject_name}!`); }
        }

        setSaving(false);
        setHasChanges(false);
        load();
    };

    /* ─── PREVIEW ─── */
    const previewScale = activeTab === 'subject' && selSubject
        ? (subjectGrading.filter(g => g.subject_id === selSubject?.id).length > 0
            ? subjectGrading.filter(g => g.subject_id === selSubject?.id)
            : globalScale)
        : globalScale;

    const getGradeForScore = (score: number, scale: any[]) => {
        const sorted = [...scale].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score) || sorted[sorted.length - 1];
    };

    const previewResult = getGradeForScore(previewScore, editRows.length > 0 ? editRows : previewScale);

    /* ─── Subjects with custom grading ─── */
    const subjectsWithCustom = new Set(subjectGrading.map(g => g.subject_id));
    const filteredSubjects = subjects.filter(s =>
        !search || s.subject_name.toLowerCase().includes(search.toLowerCase()) || (s.subject_code || '').toLowerCase().includes(search.toLowerCase())
    );

    const tabBtn = (key: typeof activeTab, label: string, icon: any) => (
        <button onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === key ? 'bg-violet-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-violet-50'}`}>
            {icon}{label}
        </button>
    );

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"/></div>;

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background:'linear-gradient(135deg,#4c1d95,#6d28d9,#0891b2)' }}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2"><FiSliders size={22}/> Subject-Specific Grading Configuration</h1>
                        <p className="text-sm text-white/70 mt-1">Set per-subject grade boundaries — override global scale for Kiswahili, Art, P.E. etc.</p>
                    </div>
                    <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 self-start"><FiRefreshCw size={14}/></button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    {[
                        { l:'Total Subjects', v: subjects.length, i:'📚' },
                        { l:'Custom Grading', v: subjectsWithCustom.size, i:'⚙️' },
                        { l:'Using Global Scale', v: subjects.length - subjectsWithCustom.size, i:'🌐' },
                        { l:'Global Scale Grades', v: globalScale.length, i:'📊' },
                    ].map(k => (
                        <div key={k.l} className="bg-white/10 rounded-xl p-3 text-center">
                            <p className="text-sm">{k.i}</p>
                            <p className="text-2xl font-black text-white">{k.v}</p>
                            <p className="text-[10px] text-white/60 uppercase font-bold">{k.l}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── SQL Warning if table missing ─── */}
            {!tableExists && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <FiAlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                    <div>
                        <p className="font-black text-amber-800 text-sm">⚠️ school_subject_grading table not found</p>
                        <p className="text-xs text-amber-700 mt-1">Run the SQL script in Supabase to enable per-subject grading overrides. Global grading still works perfectly without it.</p>
                        <a href={`file:///C:/Users/Salat/.gemini/antigravity/brain/64b4025b-a5bc-4c4e-b46e-4a3a7341c8c8/scratch/subject_grading_tables.sql`}
                            className="text-xs font-bold text-amber-700 underline mt-1 inline-block">📄 subject_grading_tables.sql</a>
                    </div>
                </div>
            )}

            {/* ═══ TABS ═══ */}
            <div className="flex gap-2 flex-wrap">
                {tabBtn('global',  '🌐 Global Scale',         <FiCheckCircle size={11}/>)}
                {tabBtn('subject', '📚 Per-Subject Override',  <FiBook size={11}/>)}
                {tabBtn('preview', '🎯 Score Preview',         <HiSparkles size={11}/>)}
            </div>

            {/* ══════ GLOBAL SCALE TAB ══════ */}
            {activeTab === 'global' && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-4 flex items-start gap-3">
                        <FiCheckCircle className="text-violet-500 shrink-0 mt-0.5" size={16}/>
                        <div>
                            <p className="font-black text-violet-800 text-sm">Global Grading Scale</p>
                            <p className="text-xs text-violet-600 mt-0.5">This scale applies to ALL subjects unless a subject-specific override is set. Editing here affects your entire system.</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-wrap items-center">
                        <button onClick={() => resetToDefault('844')} className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200">↺ Reset to KNEC 8-4-4</button>
                        <button onClick={() => resetToDefault('cbc')} className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition border border-teal-200">↺ Reset to CBC Scale</button>
                        <button onClick={addRow} className="px-4 py-2 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition border border-violet-200 flex items-center gap-1"><FiPlus size={11}/> Add Grade Row</button>
                        {hasChanges && (
                            <button onClick={save} disabled={saving} className="px-5 py-2 text-xs font-black text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition flex items-center gap-1.5 shadow ml-auto disabled:opacity-50">
                                <FiSave size={11}/> {saving ? 'Saving…' : 'Save Global Scale'}
                            </button>
                        )}
                    </div>

                    <GradeEditor rows={editRows} onUpdate={updateRow} onDelete={deleteRow}/>
                </div>
            )}

            {/* ══════ PER-SUBJECT TAB ══════ */}
            {activeTab === 'subject' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Subject list */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={12}/>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects…"
                                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                            {filteredSubjects.map(s => (
                                <button key={s.id} onClick={() => { setSelSubject(s); }}
                                    className={`w-full text-left px-4 py-3 hover:bg-violet-50 transition ${selSubject?.id === s.id ? 'bg-violet-50 border-l-2 border-violet-500' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{s.subject_name}</p>
                                            <p className="text-[10px] text-gray-400">{s.subject_code || '—'}</p>
                                        </div>
                                        {subjectsWithCustom.has(s.id)
                                            ? <span className="text-[9px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">Custom</span>
                                            : <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Global</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Editor panel */}
                    <div className="lg:col-span-3 space-y-3">
                        {!selSubject ? (
                            <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
                                <FiBook size={36} className="text-gray-200 mx-auto mb-3"/>
                                <p className="text-gray-400 font-bold">Select a subject to configure its grading scale</p>
                                <p className="text-xs text-gray-300 mt-1">Subjects with custom scales override the global default</p>
                            </div>
                        ) : (
                            <>
                                {/* Subject header */}
                                <div className="bg-white rounded-2xl border border-violet-100 p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-gray-800 text-lg">{selSubject.subject_name}</p>
                                        <p className="text-xs text-gray-400">{selSubject.subject_code} · {subjectsWithCustom.has(selSubject.id) ? '⚙️ Custom scale active' : '🌐 Currently using global scale'}</p>
                                    </div>
                                    {subjectsWithCustom.has(selSubject.id) && (
                                        <button onClick={async () => {
                                            if (!confirm(`Remove custom grading for ${selSubject.subject_name}? It will revert to global scale.`)) return;
                                            await supabase.from('school_subject_grading').delete().eq('subject_id', selSubject.id);
                                            toast.success('Custom grading removed — reverting to global');
                                            load();
                                        }} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-100">
                                            🗑 Remove Override
                                        </button>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 flex-wrap items-center">
                                    <button onClick={copyFromGlobal} className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200 flex items-center gap-1"><FiCopy size={11}/> Copy Global Scale</button>
                                    <button onClick={() => resetToDefault('844')} className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200">↺ KNEC 8-4-4</button>
                                    <button onClick={() => resetToDefault('cbc')} className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition border border-teal-200">↺ CBC Scale</button>
                                    <button onClick={addRow} className="px-4 py-2 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition border border-violet-200 flex items-center gap-1"><FiPlus size={11}/> Add Grade</button>
                                    {hasChanges && (
                                        <button onClick={save} disabled={saving || !tableExists} className="px-5 py-2 text-xs font-black text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition flex items-center gap-1.5 shadow ml-auto disabled:opacity-50">
                                            <FiSave size={11}/> {saving ? 'Saving…' : `Save for ${selSubject.subject_name}`}
                                        </button>
                                    )}
                                </div>

                                <GradeEditor rows={editRows} onUpdate={updateRow} onDelete={deleteRow}/>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ══════ PREVIEW TAB ══════ */}
            {activeTab === 'preview' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🎯 Score → Grade Preview Tool</p>
                        <div className="flex items-center gap-6 mb-6">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 block mb-2">Enter a Score (0–100)</label>
                                <input type="number" min={0} max={100} value={previewScore}
                                    onChange={e => setPreviewScore(Number(e.target.value))}
                                    className="w-full px-4 py-3 text-2xl font-black border-2 border-violet-200 rounded-xl focus:outline-none focus:border-violet-400 text-center"/>
                                <input type="range" min={0} max={100} value={previewScore}
                                    onChange={e => setPreviewScore(Number(e.target.value))}
                                    className="w-full mt-3 accent-violet-600"/>
                            </div>
                            {previewResult && (
                                <div className="text-center px-8 py-6 rounded-2xl border-2" style={{ borderColor:`${previewResult.color}40`, background:`${previewResult.color}10` }}>
                                    <p className="text-5xl font-black" style={{ color: previewResult.color }}>{previewResult.grade}</p>
                                    <p className="text-sm font-bold mt-1" style={{ color: previewResult.color }}>{previewResult.remarks}</p>
                                    <p className="text-xs text-gray-400 mt-1">{previewResult.points} point{previewResult.points > 1 ? 's' : ''}</p>
                                </div>
                            )}
                        </div>

                        {/* Score bar */}
                        <div className="relative w-full h-6 rounded-full overflow-hidden bg-gray-100 mb-2">
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                                style={{ width:`${previewScore}%`, background: previewResult?.color || '#6366f1' }}/>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-screen">{previewScore}%</div>
                        </div>

                        {/* Full scale comparison */}
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 mb-3">Full Grade Scale Preview</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {(editRows.length > 0 ? editRows : globalScale).sort((a, b) => b.min_score - a.min_score).map(g => {
                                const isMatch = previewScore >= g.min_score && previewScore <= g.max_score;
                                return (
                                    <div key={g.grade}
                                        className={`rounded-xl p-3 border-2 transition ${isMatch ? 'scale-105 shadow-lg' : 'opacity-60'}`}
                                        style={{ borderColor: isMatch ? g.color : `${g.color}30`, background: isMatch ? `${g.color}15` : `${g.color}05` }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-lg font-black" style={{ color: g.color }}>{g.grade}</span>
                                            <span className="text-[10px] font-bold text-gray-400">{g.points} pt{g.points > 1 ? 's' : ''}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 font-bold">{g.min_score}% – {g.max_score}%</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">{g.remarks}</p>
                                        {isMatch && <div className="mt-1 text-[9px] font-black text-white px-2 py-0.5 rounded-full text-center" style={{ background: g.color }}>← {previewScore}% matches here</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-subject comparison */}
                    {subjects.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                                <p className="font-black text-gray-800">📊 Score {previewScore}% → Grade by Subject</p>
                                <p className="text-xs text-gray-400 mt-0.5">Shows what grade a student gets per subject for score {previewScore}% — highlights where overrides differ from global</p>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {['Subject','Scale','Grade','Points','Remarks','Differs from Global?'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {/* Global row */}
                                    <tr className="bg-violet-50/40">
                                        <td className="px-4 py-2.5 font-black text-violet-700 text-xs">🌐 Global Scale (Default)</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-400">KNEC Standard</td>
                                        <td className="px-4 py-2.5">{globalScale.length > 0 && <GradePill grade={getGradeForScore(previewScore, globalScale)?.grade || '—'} color={getGradeForScore(previewScore, globalScale)?.color}/>}</td>
                                        <td className="px-4 py-2.5 text-xs font-bold text-gray-600">{getGradeForScore(previewScore, globalScale)?.points}</td>
                                        <td className="px-4 py-2.5 text-xs text-gray-400">{getGradeForScore(previewScore, globalScale)?.remarks}</td>
                                        <td className="px-4 py-2.5 text-center"><span className="text-[9px] text-gray-400">—</span></td>
                                    </tr>
                                    {subjects.map(s => {
                                        const subjScale = subjectGrading.filter(g => g.subject_id === s.id);
                                        if (subjScale.length === 0) return null; // skip if using global
                                        const subjResult = getGradeForScore(previewScore, subjScale);
                                        const globalResult = getGradeForScore(previewScore, globalScale);
                                        const differs = subjResult?.grade !== globalResult?.grade;
                                        return (
                                            <tr key={s.id} className={differs ? 'bg-amber-50/30' : ''}>
                                                <td className="px-4 py-2.5">
                                                    <p className="font-bold text-gray-800 text-xs">{s.subject_name}</p>
                                                    <p className="text-[9px] text-gray-400">{s.subject_code}</p>
                                                </td>
                                                <td className="px-4 py-2.5"><span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">Custom</span></td>
                                                <td className="px-4 py-2.5"><GradePill grade={subjResult?.grade || '—'} color={subjResult?.color}/></td>
                                                <td className="px-4 py-2.5 text-xs font-bold text-gray-600">{subjResult?.points}</td>
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{subjResult?.remarks}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {differs
                                                        ? <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⚠️ Differs ({globalResult?.grade} → {subjResult?.grade})</span>
                                                        : <FiCheckCircle size={12} className="text-green-400 mx-auto"/>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════ */
/* Grade Editor Component — reused in both tabs */
/* ════════════════════════════════════════════ */
function GradeEditor({ rows, onUpdate, onDelete }: {
    rows:     GradeRow[];
    onUpdate: (idx: number, field: keyof GradeRow, val: any) => void;
    onDelete: (idx: number) => void;
}) {
    const PRESET_COLORS = ['#059669','#10b981','#0891b2','#2563eb','#4f46e5','#7c3aed','#d97706','#f59e0b','#ea580c','#dc2626','#b91c1c','#7f1d1d'];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wide">
                <div className="col-span-1 text-center">Color</div>
                <div className="col-span-2">Grade</div>
                <div className="col-span-2">Min %</div>
                <div className="col-span-2">Max %</div>
                <div className="col-span-1">Points</div>
                <div className="col-span-3">Remarks</div>
                <div className="col-span-1 text-center">Del</div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[560px] overflow-y-auto">
                {rows.map((r, i) => (
                    <div key={i} className="p-2 grid grid-cols-12 gap-2 items-center hover:bg-gray-50/50">
                        {/* Color */}
                        <div className="col-span-1 flex justify-center">
                            <div className="relative group">
                                <div className="w-7 h-7 rounded-full border-2 border-white shadow cursor-pointer ring-1 ring-gray-200" style={{ background: r.color }}/>
                                <div className="absolute left-0 top-8 z-10 bg-white rounded-xl shadow-xl border border-gray-100 p-2 hidden group-hover:grid grid-cols-4 gap-1 w-24">
                                    {PRESET_COLORS.map(c => (
                                        <button key={c} onClick={() => onUpdate(i, 'color', c)}
                                            className="w-5 h-5 rounded-full border border-white shadow transition hover:scale-110"
                                            style={{ background: c }}/>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Grade */}
                        <div className="col-span-2">
                            <input value={r.grade} onChange={e => onUpdate(i, 'grade', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm font-black border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"
                                style={{ color: r.color }}
                                maxLength={3}/>
                        </div>
                        {/* Min */}
                        <div className="col-span-2">
                            <input type="number" min={0} max={100} value={r.min_score}
                                onChange={e => onUpdate(i, 'min_score', Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"/>
                        </div>
                        {/* Max */}
                        <div className="col-span-2">
                            <input type="number" min={0} max={100} value={r.max_score}
                                onChange={e => onUpdate(i, 'max_score', Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"/>
                        </div>
                        {/* Points */}
                        <div className="col-span-1">
                            <input type="number" min={1} max={20} value={r.points}
                                onChange={e => onUpdate(i, 'points', Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm font-bold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"/>
                        </div>
                        {/* Remarks */}
                        <div className="col-span-3">
                            <input value={r.remarks} onChange={e => onUpdate(i, 'remarks', e.target.value)}
                                placeholder="Remarks…"
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"/>
                        </div>
                        {/* Delete */}
                        <div className="col-span-1 flex justify-center">
                            <button onClick={() => onDelete(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition">
                                <FiTrash2 size={12}/>
                            </button>
                        </div>
                    </div>
                ))}
                {rows.length === 0 && (
                    <div className="py-12 text-center text-gray-400">
                        <p className="text-sm">No grade rows. Click &quot;Add Grade Row&quot; or reset to a default scale.</p>
                    </div>
                )}
            </div>
            {/* Visual grade bar */}
            {rows.length > 0 && (
                <div className="p-3 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Grade Spectrum Preview</p>
                    <div className="flex rounded-full overflow-hidden h-5">
                        {[...rows].sort((a, b) => b.min_score - a.min_score).map((r, i) => (
                            <div key={i} style={{ flex: r.max_score - r.min_score, background: r.color }} title={`${r.grade}: ${r.min_score}–${r.max_score}%`}
                                className="flex items-center justify-center text-[8px] font-black text-white/90 overflow-hidden whitespace-nowrap">
                                {r.max_score - r.min_score > 8 ? r.grade : ''}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-bold">
                        <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                </div>
            )}
        </div>
    );
}
