'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit3, FiCheck, FiX, FiPlus, FiTrash2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { updateSchemeLesson, deleteSchemeLesson, createSchemeLesson, type SchemeOfWork, type SchemeWeek, type SchemeLesson } from '@/lib/schemes';
import { CORE_COMPETENCIES, CBC_VALUES, ASSESSMENT_METHODS } from './helpers';

export default function LessonsTab({ scheme, weeks, lessons, onRefresh }: {
    scheme: SchemeOfWork; weeks: SchemeWeek[]; lessons: SchemeLesson[]; onRefresh: () => void;
}) {
    const [editId, setEditId] = useState<number|null>(null);
    const [editData, setEditData] = useState<Partial<SchemeLesson>>({});
    const [addWeek, setAddWeek] = useState<number|null>(null);
    const [adding, setAdding] = useState(false);
    const isCBC = scheme.curriculum_type === 'CBC';

    const startEdit = (l: SchemeLesson) => { setEditId(l.id!); setEditData({ ...l }); };
    const cancelEdit = () => { setEditId(null); setEditData({}); };
    const saveEdit = async () => {
        if (!editId) return;
        try {
            await updateSchemeLesson(editId, editData);
            toast.success('✅ Lesson updated');
            cancelEdit(); onRefresh();
        } catch { toast.error('Failed'); }
    };

    const markComplete = async (l: SchemeLesson) => {
        try {
            await updateSchemeLesson(l.id!, { is_completed: !l.is_completed, completed_at: l.is_completed ? null : new Date().toISOString() });
            toast.success(l.is_completed ? 'Marked incomplete' : '✅ Lesson completed');
            onRefresh();
        } catch { toast.error('Failed'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this lesson?')) return;
        try { await deleteSchemeLesson(id); toast.success('Deleted'); onRefresh(); } catch { toast.error('Failed'); }
    };

    const quickAdd = async (weekId: number) => {
        setAdding(true);
        try {
            const wkLessons = lessons.filter(l => l.week_id === weekId);
            const nextNum = lessons.length + 1;
            await createSchemeLesson({
                week_id: weekId, scheme_id: scheme.id!, lesson_number: nextNum,
                lesson_title: 'New Lesson', learning_outcomes: [], key_inquiry_questions: [],
                learning_activities: [], learning_resources: [], assessment_methods: [],
                core_competencies: [], values: [], links_to_other_subjects: [],
                community_service_learning: null, non_formal_activity: null,
                lesson_duration_minutes: 40, is_double_lesson: false, is_completed: false,
                completion_notes: null, completed_at: null,
            });
            toast.success('➕ Lesson added');
            setAddWeek(null); onRefresh();
        } catch { toast.error('Failed'); }
        setAdding(false);
    };

    const toggleTag = (field: 'core_competencies'|'values'|'assessment_methods', value: string) => {
        const arr = (editData[field] || []) as string[];
        const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
        setEditData(d => ({ ...d, [field]: next }));
    };

    const updateArrItem = (field: string, index: number, value: string) => {
        const arr = [...(editData as any)[field] || []];
        arr[index] = value;
        setEditData(d => ({ ...d, [field]: arr }));
    };
    const addArrItem = (field: string) => {
        const arr = [...(editData as any)[field] || []];
        arr.push('');
        setEditData(d => ({ ...d, [field]: arr }));
    };
    const removeArrItem = (field: string, index: number) => {
        const arr = [...(editData as any)[field] || []];
        arr.splice(index, 1);
        setEditData(d => ({ ...d, [field]: arr }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">📝 All Lessons ({lessons.length})</h3>
                <select value={addWeek||''} onChange={e => { const v = Number(e.target.value); if (v) quickAdd(v); }} className="px-3 py-2 rounded-xl border border-gray-200 text-xs" disabled={adding}>
                    <option value="">+ Quick Add Lesson to Week…</option>
                    {weeks.filter(w => !w.is_midterm && !w.is_holiday).map(w => <option key={w.id} value={w.id}>Week {w.week_number}</option>)}
                </select>
            </div>

            {weeks.filter(w => !w.is_midterm && !w.is_holiday).map(w => {
                const wkLessons = lessons.filter(l => l.week_id === w.id);
                if (wkLessons.length === 0) return null;
                return (
                    <div key={w.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-black text-blue-800">📅 Week {w.week_number} — {w.week_title}</span>
                            <span className="text-[10px] font-bold text-gray-500">{wkLessons.length} lessons</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {wkLessons.map(l => {
                                const isEditing = editId === l.id;
                                return (
                                    <div key={l.id} className={`p-4 transition ${isEditing ? 'bg-blue-50/30' : ''} ${l.is_completed ? 'bg-green-50/30' : ''}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                {isEditing ? (
                                                    <input value={editData.lesson_title||''} onChange={e => setEditData(d => ({...d, lesson_title: e.target.value}))} className="w-full px-3 py-2 rounded-xl border border-blue-200 text-sm font-bold" />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-gray-400">L{l.lesson_number}</span>
                                                        <h4 className="text-sm font-bold text-gray-900">{l.lesson_title}</h4>
                                                        {l.is_completed && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">✓ Done</span>}
                                                    </div>
                                                )}
                                                {!isEditing && (
                                                    <div className="mt-2 space-y-1.5">
                                                        {(l.learning_outcomes||[]).length > 0 && <p className="text-[11px] text-gray-600"><span className="font-bold text-purple-600">Outcomes:</span> {(l.learning_outcomes||[]).join('; ')}</p>}
                                                        {(l.key_inquiry_questions||[]).length > 0 && <p className="text-[11px] text-gray-600"><span className="font-bold text-blue-600">Inquiries:</span> {(l.key_inquiry_questions||[]).join('; ')}</p>}
                                                        {(l.learning_activities||[]).length > 0 && <p className="text-[11px] text-gray-600"><span className="font-bold text-teal-600">Activities:</span> {(l.learning_activities||[]).join('; ')}</p>}
                                                        {(l.learning_resources||[]).length > 0 && <p className="text-[11px] text-gray-600"><span className="font-bold text-amber-600">Resources:</span> {(l.learning_resources||[]).join('; ')}</p>}
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(l.core_competencies||[]).map((c,i) => <span key={i} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700">{c}</span>)}
                                                            {(l.values||[]).map((v,i) => <span key={i} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">{v}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {isEditing && (
                                                    <div className="mt-3 space-y-3">
                                                        {/* Learning Outcomes */}
                                                        <div><label className="text-[10px] font-bold text-purple-600 uppercase">Learning Outcomes</label>
                                                            {(editData.learning_outcomes||[]).map((o,i) => (
                                                                <div key={i} className="flex items-center gap-1 mt-1">
                                                                    <input value={o} onChange={e => updateArrItem('learning_outcomes', i, e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                                                                    <button onClick={() => removeArrItem('learning_outcomes', i)} className="text-red-400 hover:text-red-600"><FiX size={12}/></button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => addArrItem('learning_outcomes')} className="text-[10px] text-blue-600 font-bold mt-1 hover:underline">+ Add</button></div>
                                                        {/* Key Inquiry Questions */}
                                                        <div><label className="text-[10px] font-bold text-blue-600 uppercase">Key Inquiry Questions</label>
                                                            {(editData.key_inquiry_questions||[]).map((q,i) => (
                                                                <div key={i} className="flex items-center gap-1 mt-1">
                                                                    <input value={q} onChange={e => updateArrItem('key_inquiry_questions', i, e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                                                                    <button onClick={() => removeArrItem('key_inquiry_questions', i)} className="text-red-400 hover:text-red-600"><FiX size={12}/></button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => addArrItem('key_inquiry_questions')} className="text-[10px] text-blue-600 font-bold mt-1 hover:underline">+ Add</button></div>
                                                        {/* Learning Activities */}
                                                        <div><label className="text-[10px] font-bold text-teal-600 uppercase">Learning Activities</label>
                                                            {(editData.learning_activities||[]).map((a,i) => (
                                                                <div key={i} className="flex items-center gap-1 mt-1">
                                                                    <input value={a} onChange={e => updateArrItem('learning_activities', i, e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                                                                    <button onClick={() => removeArrItem('learning_activities', i)} className="text-red-400 hover:text-red-600"><FiX size={12}/></button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => addArrItem('learning_activities')} className="text-[10px] text-blue-600 font-bold mt-1 hover:underline">+ Add</button></div>
                                                        {/* Learning Resources */}
                                                        <div><label className="text-[10px] font-bold text-amber-600 uppercase">Learning Resources</label>
                                                            {(editData.learning_resources||[]).map((r,i) => (
                                                                <div key={i} className="flex items-center gap-1 mt-1">
                                                                    <input value={r} onChange={e => updateArrItem('learning_resources', i, e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                                                                    <button onClick={() => removeArrItem('learning_resources', i)} className="text-red-400 hover:text-red-600"><FiX size={12}/></button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => addArrItem('learning_resources')} className="text-[10px] text-blue-600 font-bold mt-1 hover:underline">+ Add</button></div>
                                                        {/* Core Competencies Toggle */}
                                                        {isCBC && <div><label className="text-[10px] font-bold text-purple-600 uppercase">Core Competencies</label>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {CORE_COMPETENCIES.map(c => (
                                                                    <button key={c} onClick={() => toggleTag('core_competencies', c)} className={`px-2 py-1 rounded-full text-[9px] font-bold border transition ${(editData.core_competencies||[]).includes(c) ? 'bg-purple-200 text-purple-800 border-purple-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{c}</button>
                                                                ))}
                                                            </div></div>}
                                                        {/* Values Toggle */}
                                                        {isCBC && <div><label className="text-[10px] font-bold text-green-600 uppercase">Values</label>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {CBC_VALUES.map(v => (
                                                                    <button key={v} onClick={() => toggleTag('values', v)} className={`px-2 py-1 rounded-full text-[9px] font-bold border transition ${(editData.values||[]).includes(v) ? 'bg-green-200 text-green-800 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{v}</button>
                                                                ))}
                                                            </div></div>}
                                                        {/* Assessment Methods */}
                                                        <div><label className="text-[10px] font-bold text-amber-600 uppercase">Assessment Methods</label>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {ASSESSMENT_METHODS.map(a => (
                                                                    <button key={a} onClick={() => toggleTag('assessment_methods', a)} className={`px-2 py-1 rounded-full text-[9px] font-bold border transition ${(editData.assessment_methods||[]).includes(a) ? 'bg-amber-200 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{a}</button>
                                                                ))}
                                                            </div></div>
                                                        {/* CSL & Non-Formal */}
                                                        {isCBC && <div className="grid grid-cols-2 gap-3">
                                                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Community Service Learning</label>
                                                                <textarea value={editData.community_service_learning||''} onChange={e => setEditData(d => ({...d, community_service_learning: e.target.value}))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" rows={2} /></div>
                                                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Non-Formal Activity</label>
                                                                <textarea value={editData.non_formal_activity||''} onChange={e => setEditData(d => ({...d, non_formal_activity: e.target.value}))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" rows={2} /></div>
                                                        </div>}
                                                        {/* Duration */}
                                                        <div className="flex items-center gap-3">
                                                            <div><label className="text-[10px] font-bold text-gray-500 uppercase">Duration (min)</label>
                                                                <input type="number" value={editData.lesson_duration_minutes||40} onChange={e => setEditData(d => ({...d, lesson_duration_minutes: Number(e.target.value)}))} className="w-20 mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs" /></div>
                                                            <label className="flex items-center gap-2 text-xs mt-4"><input type="checkbox" checked={editData.is_double_lesson||false} onChange={e => setEditData(d => ({...d, is_double_lesson: e.target.checked}))} className="rounded" /> Double Lesson</label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={saveEdit} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200" title="Save"><FiCheck size={14}/></button>
                                                        <button onClick={cancelEdit} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200" title="Cancel"><FiX size={14}/></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => markComplete(l)} className={`p-2 rounded-lg ${l.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:text-green-600'}`} title={l.is_completed ? 'Mark Incomplete' : 'Mark Complete'}><FiCheck size={14}/></button>
                                                        <button onClick={() => startEdit(l)} className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:text-blue-600" title="Edit"><FiEdit3 size={14}/></button>
                                                        <button onClick={() => handleDelete(l.id!)} className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:text-red-600" title="Delete"><FiTrash2 size={14}/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
