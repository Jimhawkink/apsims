'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSettings } from 'react-icons/fi';

export default function RulesTab({ data }: { data: any }) {
    const { forms, rules, fetchAll } = data;
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<any>({ rule_name: '', from_form_id: '', to_form_id: '', min_average_score: 30, max_subject_failures: 3, failure_threshold: 30, attendance_min_percent: 0, auto_promote: true, require_approval: false, priority: 10, description: '' });

    const openAdd = () => { setEditId(null); setForm({ rule_name: '', from_form_id: '', to_form_id: '', min_average_score: 30, max_subject_failures: 3, failure_threshold: 30, attendance_min_percent: 0, auto_promote: true, require_approval: false, priority: 10, description: '' }); setShowModal(true); };
    const openEdit = (r: any) => { setEditId(r.id); setForm({ rule_name: r.rule_name, from_form_id: r.from_form_id, to_form_id: r.to_form_id, min_average_score: r.min_average_score, max_subject_failures: r.max_subject_failures, failure_threshold: r.failure_threshold, attendance_min_percent: r.attendance_min_percent, auto_promote: r.auto_promote, require_approval: r.require_approval, priority: r.priority, description: r.description || '' }); setShowModal(true); };

    const save = async () => {
        if (!form.rule_name || !form.from_form_id || !form.to_form_id) { toast.error('Fill required fields'); return; }
        const payload = { ...form, from_form_id: Number(form.from_form_id), to_form_id: Number(form.to_form_id), min_average_score: Number(form.min_average_score), max_subject_failures: Number(form.max_subject_failures), failure_threshold: Number(form.failure_threshold), attendance_min_percent: Number(form.attendance_min_percent), priority: Number(form.priority) };
        const { error } = editId ? await supabase.from('school_promotion_rules').update(payload).eq('id', editId) : await supabase.from('school_promotion_rules').insert([payload]);
        if (error) { toast.error(error.message); return; }
        toast.success(editId ? 'Rule updated ✅' : 'Rule created ✅');
        setShowModal(false); setEditId(null); fetchAll();
    };

    const deleteRule = async (id: number) => {
        if (!confirm('Delete this rule?')) return;
        const { error } = await supabase.from('school_promotion_rules').delete().eq('id', id);
        if (error) { toast.error('Cannot delete'); return; }
        toast.success('Deleted'); fetchAll();
    };

    const getFormName = (id: number) => forms.find((f: any) => f.id === id)?.form_name || '-';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-700">Promotion Rules Engine</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Configure automated eligibility criteria for each form transition</p>
                </div>
                <button onClick={openAdd} className="px-3 py-2 text-[11px] font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <FiPlus size={12} /> Add Rule
                </button>
            </div>

            {rules.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 text-gray-400">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center"><FiSettings size={24} className="text-gray-300" /></div>
                    <p className="font-semibold text-sm text-gray-500">No promotion rules defined</p>
                    <p className="text-[11px] mt-1 text-gray-400">Create rules to control promotion eligibility</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {rules.map((r: any) => (
                        <div key={r.id} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${r.is_active ? 'border-gray-200' : 'border-gray-200 opacity-50'}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-[12px] font-bold text-gray-800">{r.rule_name}</h4>
                                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">{getFormName(r.from_form_id)} <span className="text-purple-500">→</span> {getFormName(r.to_form_id)}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.auto_promote ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.auto_promote ? 'Auto' : 'Manual'}</span>
                                    {r.require_approval && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Approval</span>}
                                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FiEdit2 size={12} /></button>
                                    <button onClick={() => deleteRule(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FiTrash2 size={12} /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                {[{ val: r.min_average_score, label: 'Min Avg Score', max: 100, color: '#8b5cf6' }, { val: r.max_subject_failures, label: 'Max Failures', max: 10, color: '#ef4444' }, { val: r.failure_threshold, label: 'Fail Threshold', max: 100, color: '#f59e0b' }, { val: `${r.attendance_min_percent}%`, label: 'Min Attendance', max: 100, color: '#22c55e', rawVal: r.attendance_min_percent }].map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 text-center relative overflow-hidden">
                                        <div className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all" style={{ width: `${((item.rawVal ?? Number(item.val)) / item.max) * 100}%`, backgroundColor: item.color, opacity: 0.5 }} />
                                        <p className="text-sm font-extrabold text-gray-800">{item.val}</p>
                                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                            {r.description && <p className="text-[11px] text-gray-400 mt-2 italic">{r.description}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-sm font-bold text-gray-800">{editId ? 'Edit Rule' : 'New Promotion Rule'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Rule Name *</label><input value={form.rule_name} onChange={e => setForm({ ...form, rule_name: e.target.value })} className="input-modern w-full text-sm" placeholder="e.g. Form 1 to Form 2" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">From Form *</label><select value={form.from_form_id} onChange={e => setForm({ ...form, from_form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select</option>{forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">To Form *</label><select value={form.to_form_id} onChange={e => setForm({ ...form, to_form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select</option>{forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Min Average Score</label><input type="number" value={form.min_average_score} onChange={e => setForm({ ...form, min_average_score: e.target.value })} className="input-modern w-full text-sm" /></div>
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Max Subject Failures</label><input type="number" value={form.max_subject_failures} onChange={e => setForm({ ...form, max_subject_failures: e.target.value })} className="input-modern w-full text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Failure Threshold</label><input type="number" value={form.failure_threshold} onChange={e => setForm({ ...form, failure_threshold: e.target.value })} className="input-modern w-full text-sm" /></div>
                                <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Min Attendance %</label><input type="number" value={form.attendance_min_percent} onChange={e => setForm({ ...form, attendance_min_percent: e.target.value })} className="input-modern w-full text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.auto_promote} onChange={e => setForm({ ...form, auto_promote: e.target.checked })} className="w-3.5 h-3.5 rounded" /><span className="text-xs font-medium text-gray-600">Auto-promote eligible</span></label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.require_approval} onChange={e => setForm({ ...form, require_approval: e.target.checked })} className="w-3.5 h-3.5 rounded" /><span className="text-xs font-medium text-gray-600">Require approval</span></label>
                            </div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Priority</label><input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-modern w-full text-sm" /></div>
                            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-modern w-full text-sm" rows={2} /></div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl">Cancel</button>
                            <button onClick={save} className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>Save Rule</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
