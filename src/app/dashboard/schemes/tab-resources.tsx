'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { getLessonResources, createSchemeResource, deleteSchemeResource, type SchemeOfWork, type SchemeLesson, type SchemeResource } from '@/lib/schemes';
import { RESOURCE_TYPES } from './helpers';

export default function ResourcesTab({ scheme, lessons, onRefresh }: {
    scheme: SchemeOfWork; lessons: SchemeLesson[]; onRefresh: () => void;
}) {
    const [selectedLesson, setSelectedLesson] = useState<number|null>(null);
    const [resources, setResources] = useState<SchemeResource[]>([]);
    const [adding, setAdding] = useState(false);
    const [newRes, setNewRes] = useState({ resource_type: 'Textbook', resource_title: '', resource_details: '', is_digital: false, url: '' });

    const loadResources = async (lessonId: number) => {
        setSelectedLesson(lessonId);
        try { const data = await getLessonResources(lessonId); setResources(data); } catch { toast.error('Failed'); }
    };

    const handleAdd = async () => {
        if (!selectedLesson || !newRes.resource_title.trim()) { toast.error('Title required'); return; }
        setAdding(true);
        try {
            await createSchemeResource({ lesson_id: selectedLesson, ...newRes });
            toast.success('📎 Resource added');
            setNewRes({ resource_type: 'Textbook', resource_title: '', resource_details: '', is_digital: false, url: '' });
            loadResources(selectedLesson);
        } catch { toast.error('Failed'); }
        setAdding(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete resource?')) return;
        try { await deleteSchemeResource(id); toast.success('Deleted'); if (selectedLesson) loadResources(selectedLesson); } catch { toast.error('Failed'); }
    };

    // Group lessons by week
    const lessonsByTitle = lessons.map(l => ({ id: l.id!, title: `L${l.lesson_number}: ${l.lesson_title}` }));

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900">📎 Lesson Resources</h3>

            {/* Lesson Selector */}
            <div className="flex items-center gap-3 flex-wrap">
                <select value={selectedLesson||''} onChange={e => { if (e.target.value) loadResources(Number(e.target.value)); }} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm">
                    <option value="">Select a lesson…</option>
                    {lessonsByTitle.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
            </div>

            {selectedLesson && (
                <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                    {/* Add Resource Form */}
                    <div className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
                        <h4 className="text-xs font-black text-blue-800 mb-3">➕ Add Resource</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <select value={newRes.resource_type} onChange={e => setNewRes(r => ({...r, resource_type: e.target.value}))} className="px-3 py-2 rounded-xl border border-gray-200 text-xs">
                                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <input value={newRes.resource_title} onChange={e => setNewRes(r => ({...r, resource_title: e.target.value}))} placeholder="Resource title" className="px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                            <input value={newRes.resource_details||''} onChange={e => setNewRes(r => ({...r, resource_details: e.target.value}))} placeholder="Details (optional)" className="px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={newRes.is_digital} onChange={e => setNewRes(r => ({...r, is_digital: e.target.checked}))} className="rounded" /> Digital</label>
                                <button onClick={handleAdd} disabled={adding} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-1"><FiPlus size={12}/> Add</button>
                            </div>
                        </div>
                        {newRes.is_digital && (
                            <input value={newRes.url||''} onChange={e => setNewRes(r => ({...r, url: e.target.value}))} placeholder="URL (https://…)" className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs" />
                        )}
                    </div>

                    {/* Resource List */}
                    <div className="divide-y divide-gray-50">
                        {resources.length === 0 ? (
                            <div className="p-8 text-center text-gray-400"><p className="text-sm">No resources yet</p></div>
                        ) : resources.map(r => (
                            <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-700">{r.resource_type}</span>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{r.resource_title}</p>
                                        {r.resource_details && <p className="text-[10px] text-gray-500">{r.resource_details}</p>}
                                    </div>
                                    {r.is_digital && r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><FiExternalLink size={12}/></a>}
                                </div>
                                <button onClick={() => handleDelete(r.id!)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500"><FiTrash2 size={13}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!selectedLesson && (
                <div className="text-center py-12"><div className="text-4xl mb-2">📎</div><p className="text-sm text-gray-500">Select a lesson to manage resources</p></div>
            )}
        </div>
    );
}
