'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';
import { getSchemeRemarks, createSchemeRemark, type SchemeOfWork, type SchemeWeek, type SchemeLesson, type SchemeRemark } from '@/lib/schemes';

export default function RemarksTab({ scheme, weeks, lessons, onRefresh }: {
    scheme: SchemeOfWork; weeks: SchemeWeek[]; lessons: SchemeLesson[]; onRefresh: () => void;
}) {
    const [remarks, setRemarks] = useState<SchemeRemark[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newRemark, setNewRemark] = useState({ remark_type: 'weekly', remark_text: '', challenges: '', improvements: '', week_id: null as number|null, lesson_id: null as number|null });

    const load = async () => {
        try { const data = await getSchemeRemarks(scheme.id!); setRemarks(data); } catch { toast.error('Failed'); }
    };
    useEffect(() => { load(); }, [scheme.id]);

    const handleAdd = async () => {
        if (!newRemark.remark_text.trim()) { toast.error('Remark text required'); return; }
        try {
            const user = JSON.parse(localStorage.getItem('school_user')||'{}');
            await createSchemeRemark({ scheme_id: scheme.id!, ...newRemark, recorded_by: user.full_name || user.username });
            toast.success('💬 Remark added');
            setNewRemark({ remark_type: 'weekly', remark_text: '', challenges: '', improvements: '', week_id: null, lesson_id: null });
            setShowAdd(false); load();
        } catch { toast.error('Failed'); }
    };

    const typeColors: Record<string, {bg:string,text:string}> = {
        weekly: { bg: '#eff6ff', text: '#1d4ed8' },
        lesson: { bg: '#faf5ff', text: '#7c3aed' },
        hod: { bg: '#fff7ed', text: '#c2410c' },
        reflection: { bg: '#ecfdf5', text: '#059669' },
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">💬 Remarks & Reflections ({remarks.length})</h3>
                <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-2 rounded-xl text-xs font-bold border-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1"><FiPlus size={12}/> Add Remark</button>
            </div>

            {/* Add Remark Form */}
            {showAdd && (
                <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select value={newRemark.remark_type} onChange={e => setNewRemark(r => ({...r, remark_type: e.target.value}))} className="px-3 py-2 rounded-xl border border-gray-200 text-xs">
                            <option value="weekly">📅 Weekly Remark</option>
                            <option value="lesson">📝 Lesson Remark</option>
                            <option value="hod">🔍 HOD Comment</option>
                            <option value="reflection">🪞 Teacher Reflection</option>
                        </select>
                        <select value={newRemark.week_id||''} onChange={e => setNewRemark(r => ({...r, week_id: e.target.value ? Number(e.target.value) : null}))} className="px-3 py-2 rounded-xl border border-gray-200 text-xs">
                            <option value="">All Weeks</option>
                            {weeks.map(w => <option key={w.id} value={w.id}>Week {w.week_number}</option>)}
                        </select>
                        <select value={newRemark.lesson_id||''} onChange={e => setNewRemark(r => ({...r, lesson_id: e.target.value ? Number(e.target.value) : null}))} className="px-3 py-2 rounded-xl border border-gray-200 text-xs">
                            <option value="">All Lessons</option>
                            {lessons.map(l => <option key={l.id} value={l.id}>L{l.lesson_number}: {l.lesson_title}</option>)}
                        </select>
                    </div>
                    <textarea value={newRemark.remark_text} onChange={e => setNewRemark(r => ({...r, remark_text: e.target.value}))} placeholder="Enter remark…" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm" rows={3} />
                    <div className="grid grid-cols-2 gap-3">
                        <textarea value={newRemark.challenges||''} onChange={e => setNewRemark(r => ({...r, challenges: e.target.value}))} placeholder="Challenges encountered…" className="px-3 py-2 rounded-xl border border-gray-200 text-xs" rows={2} />
                        <textarea value={newRemark.improvements||''} onChange={e => setNewRemark(r => ({...r, improvements: e.target.value}))} placeholder="Suggested improvements…" className="px-3 py-2 rounded-xl border border-gray-200 text-xs" rows={2} />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">Save Remark</button>
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500">Cancel</button>
                    </div>
                </div>
            )}

            {/* Remarks List */}
            {remarks.length === 0 ? (
                <div className="text-center py-12"><div className="text-4xl mb-2">💬</div><p className="text-sm text-gray-500">No remarks yet</p><p className="text-xs text-gray-400 mt-1">Add weekly reflections, HOD comments, or lesson notes</p></div>
            ) : (
                <div className="space-y-3">
                    {remarks.map(r => {
                        const tc = typeColors[r.remark_type||'weekly'] || typeColors.weekly;
                        const week = weeks.find(w => w.id === r.week_id);
                        const lesson = lessons.find(l => l.id === r.lesson_id);
                        return (
                            <div key={r.id} className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: tc.bg, color: tc.text }}>{r.remark_type === 'hod' ? '🔍 HOD' : r.remark_type === 'reflection' ? '🪞 Reflection' : r.remark_type === 'lesson' ? '📝 Lesson' : '📅 Weekly'}</span>
                                    {week && <span className="text-[10px] font-bold text-blue-600">Week {week.week_number}</span>}
                                    {lesson && <span className="text-[10px] font-bold text-purple-600">L{lesson.lesson_number}</span>}
                                    <span className="text-[10px] text-gray-400 ml-auto">{new Date(r.created_at||'').toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-800">{r.remark_text}</p>
                                {r.challenges && <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Challenges: {r.challenges}</p>}
                                {r.improvements && <p className="text-xs text-green-600 mt-1 font-semibold">💡 Improvements: {r.improvements}</p>}
                                {r.recorded_by && <p className="text-[10px] text-gray-400 mt-2">By: {r.recorded_by}</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
