'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSettings, FiCalendar, FiLock, FiUnlock, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

interface ExamType {
    id?: number;
    exam_name: string;
    exam_code: string;
    weight: number;
    term_id: number | null;
    year: number;
    description: string;
    is_active: boolean;
    status?: string;
    start_date?: string;
    end_date?: string;
    marks_locked?: boolean;
}

export default function ExamManagerPage() {
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState<ExamType>({
        exam_name: '', exam_code: '', weight: 0, term_id: null,
        year: new Date().getFullYear(), description: '', is_active: true,
    });

    const [tab, setTab] = useState<'all' | 'active' | 'schedule'>('all');

    // Quick exam templates
    const templates = [
        { name: 'CAT 1', code: 'CAT1', weight: 10, desc: 'Continuous Assessment Test 1' },
        { name: 'CAT 2', code: 'CAT2', weight: 10, desc: 'Continuous Assessment Test 2' },
        { name: 'Mid-Term', code: 'MID', weight: 20, desc: 'Mid-Term Examination' },
        { name: 'End-Term', code: 'END', weight: 60, desc: 'End of Term Examination' },
        { name: 'Mock', code: 'MOCK', weight: 100, desc: 'Mock Examination' },
        { name: 'KCSE Trial', code: 'TRIAL', weight: 100, desc: 'KCSE Trial Examination' },
    ];

    const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
        'Scheduled': { bg: '#eff6ff', text: '#2563eb', icon: FiCalendar },
        'In Progress': { bg: '#fef3c7', text: '#d97706', icon: FiClock },
        'Marks Entry': { bg: '#faf5ff', text: '#7c3aed', icon: FiEdit2 },
        'Published': { bg: '#ecfdf5', text: '#059669', icon: FiCheckCircle },
        'Locked': { bg: '#fef2f2', text: '#dc2626', icon: FiLock },
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [et, t, m] = await Promise.all([
            supabase.from('school_exam_types').select('*').order('id', { ascending: false }),
            supabase.from('school_terms').select('*').order('id', { ascending: false }),
            supabase.from('school_exam_marks').select('id, exam_type'),
        ]);
        setExamTypes(et.data || []);
        setTerms(t.data || []);
        setMarks(m.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleSave = async () => {
        if (!form.exam_name.trim()) { toast.error('Exam name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                exam_name: form.exam_name.trim(),
                exam_code: form.exam_code.trim() || null,
                weight: form.weight || 0,
                term_id: form.term_id || null,
                year: form.year || new Date().getFullYear(),
                description: form.description || null,
                is_active: form.is_active,
            };

            let error;
            if (editing?.id) {
                ({ error } = await supabase.from('school_exam_types').update(payload).eq('id', editing.id));
            } else {
                ({ error } = await supabase.from('school_exam_types').insert([payload]));
            }
            if (error) throw error;
            toast.success(editing ? 'Exam type updated ✅' : 'Exam type created ✅');
            setShowModal(false);
            setEditing(null);
            fetchAll();
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this exam type? This cannot be undone.')) return;
        const { error } = await supabase.from('school_exam_types').delete().eq('id', id);
        if (error) { toast.error('Delete failed — exam may have marks linked'); return; }
        toast.success('Exam type deleted');
        fetchAll();
    };

    const handleToggleActive = async (exam: any) => {
        const { error } = await supabase.from('school_exam_types').update({ is_active: !exam.is_active }).eq('id', exam.id);
        if (error) { toast.error('Failed to update'); return; }
        toast.success(exam.is_active ? 'Exam deactivated' : 'Exam activated');
        fetchAll();
    };

    const openCreate = (template?: typeof templates[0]) => {
        setEditing(null);
        const currentTerm = terms.find(t => t.is_current);
        setForm({
            exam_name: template?.name || '',
            exam_code: template?.code || '',
            weight: template?.weight || 0,
            term_id: currentTerm?.id || null,
            year: new Date().getFullYear(),
            description: template?.desc || '',
            is_active: true,
        });
        setShowModal(true);
    };

    const openEdit = (exam: any) => {
        setEditing(exam);
        setForm({
            exam_name: exam.exam_name,
            exam_code: exam.exam_code || '',
            weight: exam.weight || 0,
            term_id: exam.term_id,
            year: exam.year || new Date().getFullYear(),
            description: exam.description || '',
            is_active: exam.is_active,
        });
        setShowModal(true);
    };

    const getTermName = (id: number) => {
        const t = terms.find(t => t.id === id);
        return t ? `${t.term_name} ${t.academic_year || t.year || ''}` : '-';
    };

    const getMarkCount = (examName: string) => marks.filter(m => m.exam_type === examName).length;

    const filtered = tab === 'active' ? examTypes.filter(e => e.is_active) : examTypes;
    const totalWeight = examTypes.filter(e => e.is_active).reduce((a, e) => a + (e.weight || 0), 0);

    const inputCls = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white focus:border-blue-400 outline-none transition-all";
    const labelCls = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
                <p className="text-gray-400 text-sm">Loading Exam Manager...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiSettings className="text-indigo-500" /> Exam Manager</h1>
                    <p className="text-sm text-gray-500 mt-1">Create, configure & manage examination types and schedules</p>
                </div>
                <button onClick={() => openCreate()} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <FiPlus size={16} /> New Exam Type
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Exam Types</p>
                    <p className="text-2xl font-extrabold text-gray-800 mt-1">{examTypes.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Active</p>
                    <p className="text-2xl font-extrabold text-green-600 mt-1">{examTypes.filter(e => e.is_active).length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Weight</p>
                    <p className={`text-2xl font-extrabold mt-1 ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>{totalWeight}%</p>
                    {totalWeight !== 100 && <p className="text-[10px] text-amber-500 mt-0.5">Should equal 100%</p>}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Total Marks Entered</p>
                    <p className="text-2xl font-extrabold text-blue-600 mt-1">{marks.length}</p>
                </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Quick Create from Template</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {templates.map(t => (
                        <button key={t.code} onClick={() => openCreate(t)}
                            className="border border-gray-200 rounded-xl p-3 text-left hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                            <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-700">{t.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] font-bold text-indigo-500">{t.code}</span>
                                <span className="text-[10px] text-gray-400">{t.weight}%</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                    { key: 'all', label: `All (${examTypes.length})` },
                    { key: 'active', label: `Active (${examTypes.filter(e => e.is_active).length})` },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white shadow-md text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Exam Types Table */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">📋</span>
                    <p className="font-semibold text-lg">No exam types found</p>
                    <p className="text-sm mt-1">Create one using the templates above or the "New Exam Type" button</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Exam Name</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Code</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Weight</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Term</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Year</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Marks</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((exam, i) => {
                                    const markCount = getMarkCount(exam.exam_name);
                                    return (
                                        <tr key={exam.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!exam.is_active ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-bold text-gray-800">{exam.exam_name}</p>
                                                {exam.description && <p className="text-[10px] text-gray-400 mt-0.5">{exam.description}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold font-mono">{exam.exam_code || '-'}</span></td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-sm font-bold text-gray-800">{exam.weight || 0}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{exam.term_id ? getTermName(exam.term_id) : '-'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">{exam.year}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-sm font-bold ${markCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>{markCount}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                                    {exam.is_active ? <><FiCheckCircle size={10} /> Active</> : <><FiAlertCircle size={10} /> Inactive</>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => openEdit(exam)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Edit">
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleToggleActive(exam)} className={`p-1.5 rounded-md transition-all ${exam.is_active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                                        title={exam.is_active ? 'Deactivate' : 'Activate'}>
                                                        {exam.is_active ? <FiLock size={14} /> : <FiUnlock size={14} />}
                                                    </button>
                                                    <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Delete">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                        <span>{filtered.length} exam types</span>
                        <span className={`font-semibold ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                            Total Weight: {totalWeight}% {totalWeight === 100 ? '✅' : '⚠️'}
                        </span>
                    </div>
                </div>
            )}

            {/* Weight Distribution Visual */}
            {examTypes.filter(e => e.is_active && e.weight > 0).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Weight Distribution</p>
                    <div className="flex rounded-xl overflow-hidden h-8">
                        {examTypes.filter(e => e.is_active && e.weight > 0).map((e, i) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                            return (
                                <div key={e.id} className="flex items-center justify-center text-white text-xs font-bold transition-all hover:opacity-80"
                                    style={{ width: `${(e.weight / Math.max(totalWeight, 1)) * 100}%`, background: colors[i % colors.length], minWidth: e.weight > 5 ? 'auto' : '20px' }}
                                    title={`${e.exam_name}: ${e.weight}%`}>
                                    {e.weight >= 10 && `${e.exam_code || e.exam_name.substring(0, 4)} ${e.weight}%`}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                        {examTypes.filter(e => e.is_active && e.weight > 0).map((e, i) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                            return (
                                <div key={e.id} className="flex items-center gap-1.5 text-xs">
                                    <span className="w-3 h-3 rounded-sm" style={{ background: colors[i % colors.length] }} />
                                    <span className="font-semibold text-gray-700">{e.exam_name}</span>
                                    <span className="text-gray-400">({e.weight}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Exam Type' : 'Create Exam Type'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Exam Name *</label>
                                    <input type="text" value={form.exam_name} onChange={e => setForm({ ...form, exam_name: e.target.value })} className={inputCls} placeholder="e.g. CAT 1" />
                                </div>
                                <div>
                                    <label className={labelCls}>Code</label>
                                    <input type="text" value={form.exam_code} onChange={e => setForm({ ...form, exam_code: e.target.value })} className={inputCls} placeholder="e.g. CAT1" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Weight (%)</label>
                                    <input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: Number(e.target.value) })} className={inputCls} min="0" max="100" />
                                </div>
                                <div>
                                    <label className={labelCls}>Year</label>
                                    <input type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} className={inputCls} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Term</label>
                                <select value={form.term_id || ''} onChange={e => setForm({ ...form, term_id: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                                    <option value="">Select Term</option>
                                    {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.academic_year || t.year || ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} placeholder="Optional description" />
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                                <button onClick={handleSave} disabled={saving}
                                    className="px-8 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    <FiSave size={14} /> {editing ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
