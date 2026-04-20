'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiCheck, FiAlertCircle, FiUsers } from 'react-icons/fi';

export default function PromotionPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [promoting, setPromoting] = useState(false);
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [targetForm, setTargetForm] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    const classStudents = students
        .filter(s => selForm && String(s.form_id) === selForm)
        .filter(s => !selStream || String(s.stream_id) === selStream);

    useEffect(() => {
        if (selectAll) { setSelected(new Set(classStudents.map(s => s.id))); }
        else { setSelected(new Set()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectAll]);

    const toggleStudent = (id: number) => {
        const n = new Set(selected);
        if (n.has(id)) n.delete(id); else n.add(id);
        setSelected(n);
    };

    const handlePromote = async () => {
        if (!targetForm) { toast.error('Select target form'); return; }
        if (selected.size === 0) { toast.error('Select students to promote'); return; }
        if (targetForm === selForm) { toast.error('Target form must be different from current form'); return; }
        if (!confirm(`Promote ${selected.size} students to ${getFormName(Number(targetForm))}?`)) return;
        setPromoting(true);
        let count = 0;
        for (const id of Array.from(selected)) {
            const { error } = await supabase.from('school_students').update({ form_id: Number(targetForm) }).eq('id', id);
            if (!error) count++;
        }
        toast.success(`${count} students promoted to ${getFormName(Number(targetForm))} ✅`);
        setSelected(new Set());
        setSelectAll(false);
        setPromoting(false);
        fetchAll();
    };

    const handleGraduate = async () => {
        if (selected.size === 0) { toast.error('Select students'); return; }
        if (!confirm(`Mark ${selected.size} students as Graduated?`)) return;
        setPromoting(true);
        let count = 0;
        for (const id of Array.from(selected)) {
            const { error } = await supabase.from('school_students').update({ status: 'Graduated' }).eq('id', id);
            if (!error) count++;
        }
        toast.success(`${count} students graduated 🎓`);
        setSelected(new Set());
        setPromoting(false);
        fetchAll();
    };

    if (loading) return (<div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>);

    return (
        <div className="space-y-5 animate-fade-in">
            <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiTrendingUp className="text-purple-500" /> Student Promotion</h1>
            <p className="text-sm text-gray-500 mt-1">Promote students to the next form or mark as graduated</p></div>

            {/* Selection */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="lbl">Current Form *</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelected(new Set()); setSelectAll(false); }} className="select-modern w-full text-sm"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => { setSelStream(e.target.value); setSelected(new Set()); }} className="select-modern w-full text-sm"><option value="">All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Promote To *</label><select value={targetForm} onChange={e => setTargetForm(e.target.value)} className="select-modern w-full text-sm"><option value="">Target Form</option>{forms.filter(f => String(f.id) !== selForm).map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div className="flex items-end gap-2">
                        <button onClick={handlePromote} disabled={promoting || selected.size === 0 || !targetForm}
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <FiTrendingUp size={14} /> Promote ({selected.size})
                        </button>
                        <button onClick={handleGraduate} disabled={promoting || selected.size === 0}
                            className="px-4 py-2.5 text-sm font-bold text-amber-700 bg-amber-100 rounded-xl disabled:opacity-40" title="Mark as graduated">
                            🎓
                        </button>
                    </div>
                </div>
            </div>

            {!selForm ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">📋</span><p className="font-semibold text-lg">Select a form to view students for promotion</p>
                </div>
            ) : classStudents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">👤</span><p className="font-semibold">No active students in this class</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)} className="w-4 h-4 rounded" />
                            <span className="text-sm font-semibold text-gray-600">Select All ({classStudents.length})</span>
                        </label>
                        <span className="text-sm text-gray-500">{selected.size} selected</span>
                    </div>
                    <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 w-10"></th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                        <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Gender</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Stream</th>
                        <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Current</th>
                        <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">→ Target</th>
                    </tr></thead><tbody>
                        {classStudents.map((s, i) => (
                            <tr key={s.id} className={`border-b border-gray-100 hover:bg-purple-50/30 transition-colors ${selected.has(s.id) ? 'bg-purple-50' : ''}`}>
                                <td className="px-4 py-2.5"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)} className="w-4 h-4 rounded" /></td>
                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                <td className="px-4 py-2.5 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                <td className="px-4 py-2.5 text-center text-sm">{s.gender === 'Male' ? '👦' : '👧'}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{getStreamName(s.stream_id)}</td>
                                <td className="px-4 py-2.5 text-center text-sm font-medium text-gray-700">{getFormName(s.form_id)}</td>
                                <td className="px-4 py-2.5 text-center text-sm font-bold text-purple-600">{targetForm ? getFormName(Number(targetForm)) : '-'}</td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
            )}
        </div>
    );
}
