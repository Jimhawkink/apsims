'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiSend, FiUsers, FiCheck, FiX, FiAlertTriangle, FiArrowRight, FiMessageSquare, FiDownload, FiFilter } from 'react-icons/fi';
import { getEducationSystem } from '@/lib/cbc-utils';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';

export default function PromotionTab({ data }: { data: any }) {
    const { students, forms, streams, rules, studentAverages, checkEligibility, getFormName, getStreamName, getCurrentAcademicYear, schoolDetails, user, fetchAll } = data;

    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [targetForm, setTargetForm] = useState('');
    const [targetStream, setTargetStream] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [promoting, setPromoting] = useState(false);
    const [autoAssignStream, setAutoAssignStream] = useState(false);
    const [sendSmsOnPromote, setSendSmsOnPromote] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState<'promote'|'demote'|'graduate'|null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'name'|'avg'|'fails'>('name');
    const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

    const classStudents = useMemo(() => {
        let list = students.filter((s: any) => s.status === 'Active' && selForm && String(s.form_id) === selForm)
            .filter((s: any) => !selStream || String(s.stream_id) === selStream);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter((s: any) => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.admission_no || s.admission_number || '').toLowerCase().includes(q));
        }
        list.sort((a: any, b: any) => {
            if (sortField === 'avg') { const diff = (studentAverages[a.id]?.average ?? 0) - (studentAverages[b.id]?.average ?? 0); return sortDir === 'asc' ? diff : -diff; }
            if (sortField === 'fails') { const diff = (studentAverages[a.id]?.fails ?? 0) - (studentAverages[b.id]?.fails ?? 0); return sortDir === 'asc' ? diff : -diff; }
            const diff = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`); return sortDir === 'asc' ? diff : -diff;
        });
        return list;
    }, [students, selForm, selStream, searchQuery, sortField, sortDir, studentAverages]);

    const classStats = useMemo(() => {
        if (!selForm) return null;
        const total = classStudents.length;
        const eligible = classStudents.filter((s: any) => s.promotion_eligible === 'Eligible').length;
        const ineligible = classStudents.filter((s: any) => s.promotion_eligible === 'Ineligible').length;
        const conditional = classStudents.filter((s: any) => s.promotion_eligible === 'Conditional').length;
        const avgScore = total > 0 ? classStudents.reduce((sum: number, s: any) => sum + (studentAverages[s.id]?.average || 0), 0) / total : 0;
        const cleared = classStudents.filter((s: any) => s.clearance_status === 'Complete').length;
        return { total, eligible, ineligible, conditional, avgScore, cleared };
    }, [classStudents, selForm, studentAverages]);

    useEffect(() => {
        if (selectAll) setSelected(new Set(classStudents.map((s: any) => s.id)));
        else setSelected(new Set());
    }, [selectAll, classStudents]);

    const toggleStudent = (id: number) => {
        const n = new Set(selected);
        if (n.has(id)) n.delete(id); else n.add(id);
        setSelected(n);
    };

    const autoAssignStreams = (studentIds: number[], toFormId: number) => {
        if (!autoAssignStream) return {};
        const formStreams = streams;
        if (formStreams.length === 0) return {};
        const sorted = studentIds.map((id: number) => students.find((s: any) => s.id === id)).filter(Boolean)
            .sort((a: any, b: any) => (studentAverages[b.id]?.average ?? 0) - (studentAverages[a.id]?.average ?? 0));
        const assignments: Record<number, number> = {};
        sorted.forEach((s: any, i: number) => { assignments[s.id] = formStreams[i % formStreams.length].id; });
        return assignments;
    };

    const sendPromotionSms = async (student: any, targetFormName: string) => {
        const phone = student.guardian_phone || student.emergency_contact_phone || '';
        if (!phone) return false;
        const schoolName = schoolDetails?.school_name || 'Our School';
        const message = `Dear Parent/Guardian, ${student.first_name} ${student.last_name} has been promoted to ${targetFormName} at ${schoolName}. Congratulations!`;
        try {
            await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'promotion' }, body: JSON.stringify({ phone, message }) });
            return true;
        } catch { return false; }
    };

    const handlePromote = async () => {
        if (!targetForm) { toast.error('Select target form'); return; }
        if (selected.size === 0) { toast.error('Select students to promote'); return; }
        if (targetForm === selForm) { toast.error('Target form must differ from current form'); return; }
        const currentAY = getCurrentAcademicYear();
        const streamAssignments = autoAssignStreams(Array.from(selected), Number(targetForm));
        const ineligible: string[] = [];
        for (const id of Array.from(selected)) {
            const student = students.find((s: any) => s.id === id);
            if (!student) continue;
            const { status } = checkEligibility(student, Number(selForm), Number(targetForm));
            if (status === 'Ineligible') ineligible.push(`${student.first_name} ${student.last_name}`);
        }
        if (ineligible.length > 0) {
            if (!confirm(`${ineligible.length} student(s) are INELIGIBLE:\n${ineligible.join(', ')}\n\nProceed anyway?`)) return;
        }
        const targetFormName = getFormName(Number(targetForm));
        const isCBCPromotion = getEducationSystem(Number(selForm), forms) === 'CBC_Senior_School';
        if (!confirm(`Promote ${selected.size} students to ${targetFormName}?${autoAssignStream ? ' (Streams auto-assigned by merit)' : ''}${isCBCPromotion ? '\n\nCBC: Subject combinations will be carried forward.' : ''}`)) return;
        setPromoting(true);
        let count = 0;
        const rule = rules.find((r: any) => r.from_form_id === Number(selForm) && r.to_form_id === Number(targetForm));
        for (const id of Array.from(selected)) {
            const student = students.find((s: any) => s.id === id);
            if (!student) continue;
            const { status: eligStatus } = checkEligibility(student, Number(selForm), Number(targetForm));
            const newStreamId = streamAssignments[id] || (targetStream ? Number(targetStream) : student.stream_id);
            const { error } = await supabase.from('school_students').update({ form_id: Number(targetForm), stream_id: newStreamId, promotion_eligible: eligStatus }).eq('id', id);
            if (!error) {
                count++;
                await supabase.from('school_promotion_history').insert([{ student_id: id, from_form_id: Number(selForm), to_form_id: Number(targetForm), from_stream_id: student.stream_id, to_stream_id: newStreamId, action_type: 'Promotion', academic_year_id: currentAY?.id || null, average_score: studentAverages[id]?.average || null, eligibility_status: eligStatus, rule_id: rule?.id || null, approval_status: rule?.require_approval ? 'Pending' : 'Auto', sms_sent: false, performed_by: user?.full_name || user?.username || 'System' }]);
                // CBC: update pathway_id on cbc_student_subjects to keep subject combination
                // (subject assignments stay — only form_id changes on the student record)
                if (sendSmsOnPromote) {
                    const smsOk = await sendPromotionSms(student, targetFormName);
                    if (smsOk) await supabase.from('school_promotion_history').update({ sms_sent: true, sms_phone: student.guardian_phone }).match({ student_id: id, action_type: 'Promotion' });
                }
            }
        }
        toast.success(`${count} students promoted to ${targetFormName} ✅`);
        setSelected(new Set()); setSelectAll(false); setPromoting(false); fetchAll();
    };

    const handleDemote = async () => {
        if (!targetForm) { toast.error('Select target form'); return; }
        if (selected.size === 0) { toast.error('Select students'); return; }
        if (!confirm(`Demote ${selected.size} students to ${getFormName(Number(targetForm))}?`)) return;
        setPromoting(true);
        let count = 0;
        const currentAY = getCurrentAcademicYear();
        for (const id of Array.from(selected)) {
            const student = students.find((s: any) => s.id === id);
            if (!student) continue;
            const { error } = await supabase.from('school_students').update({ form_id: Number(targetForm) }).eq('id', id);
            if (!error) {
                count++;
                await supabase.from('school_promotion_history').insert([{ student_id: id, from_form_id: student.form_id, to_form_id: Number(targetForm), from_stream_id: student.stream_id, to_stream_id: student.stream_id, action_type: 'Demotion', academic_year_id: currentAY?.id || null, average_score: studentAverages[id]?.average || null, eligibility_status: 'Ineligible', approval_status: 'Auto', performed_by: user?.full_name || 'System' }]);
            }
        }
        toast.success(`${count} students demoted`);
        setSelected(new Set()); setPromoting(false); fetchAll();
    };

    const handleGraduate = async () => {
        if (selected.size === 0) { toast.error('Select students'); return; }
        if (!confirm(`Graduate ${selected.size} students? They will be moved to Alumni.`)) return;
        setPromoting(true);
        let count = 0;
        const currentAY = getCurrentAcademicYear();
        const gradYear = new Date().getFullYear();
        for (const id of Array.from(selected)) {
            const student = students.find((s: any) => s.id === id);
            if (!student) continue;
            const { error } = await supabase.from('school_students').update({ status: 'Graduated', promotion_eligible: 'Eligible' }).eq('id', id);
            if (!error) {
                count++;
                await supabase.from('school_promotion_history').insert([{ student_id: id, from_form_id: student.form_id, to_form_id: student.form_id, from_stream_id: student.stream_id, to_stream_id: student.stream_id, action_type: 'Graduation', academic_year_id: currentAY?.id || null, average_score: studentAverages[id]?.average || null, eligibility_status: 'Eligible', approval_status: 'Auto', performed_by: user?.full_name || 'System' }]);
                await supabase.from('school_alumni').insert([{ student_id: id, graduation_year: gradYear, final_form_id: student.form_id, final_stream_id: student.stream_id, final_average_score: studentAverages[id]?.average || null }]);
                if (sendSmsOnPromote) await sendPromotionSms(student, 'Graduated');
            }
        }
        toast.success(`${count} students graduated 🎓`);
        setSelected(new Set()); setPromoting(false); fetchAll();
    };

    const handleSort = (field: 'name'|'avg'|'fails') => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const exportCSV = () => {
        if (classStudents.length === 0) return;
        const rows = classStudents.map((s: any, i: number) => ({
            '#': i + 1, 'Adm No': s.admission_no || s.admission_number, 'Name': `${s.first_name} ${s.last_name}`,
            'Gender': s.gender, 'Stream': getStreamName(s.stream_id), 'Avg': studentAverages[s.id]?.average?.toFixed(1) || '-',
            'Fails': studentAverages[s.id]?.fails || 0, 'Current': getFormName(s.form_id), 'Eligibility': s.promotion_eligible || 'Pending'
        }));
        const csv = [Object.keys(rows[0]).join(','), ...rows.map((r: Record<string, unknown>) => Object.values(r).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `promotion_list_${getFormName(Number(selForm))}.csv`; a.click(); URL.revokeObjectURL(url);
        toast.success('Exported to CSV ✅');
    };

    return (
        <div className="space-y-4">
            {/* ─── Control Panel ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Current Form *</label>
                            <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelected(new Set()); setSelectAll(false); }} className="select-modern w-full text-sm">
                                <option value="">Select Form</option>{forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}{f.education_system === 'CBC_Senior_School' ? ' [CBC]' : ' [8-4-4]'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Stream</label>
                            <select value={selStream} onChange={e => { setSelStream(e.target.value); setSelected(new Set()); }} className="select-modern w-full text-sm">
                                <option value="">All Streams</option>{streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Target Form *</label>
                            <select value={targetForm} onChange={e => setTargetForm(e.target.value)} className="select-modern w-full text-sm">
                                <option value="">Target Form</option>{forms.filter((f: any) => String(f.id) !== selForm).map((f: any) => <option key={f.id} value={f.id}>{f.form_name}{f.education_system === 'CBC_Senior_School' ? ' [CBC]' : ' [8-4-4]'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Target Stream</label>
                            <select value={targetStream} onChange={e => setTargetStream(e.target.value)} className="select-modern w-full text-sm">
                                <option value="">Keep Current</option>{streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col justify-end gap-1.5">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={autoAssignStream} onChange={e => setAutoAssignStream(e.target.checked)} className="w-3.5 h-3.5 rounded accent-purple-600" />
                                <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Auto-assign by merit</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={sendSmsOnPromote} onChange={e => setSendSmsOnPromote(e.target.checked)} className="w-3.5 h-3.5 rounded accent-purple-600" />
                                <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors">SMS parents on promote</span>
                            </label>
                        </div>
                        <div className="flex items-end gap-1.5">
                            <button onClick={() => selected.size > 0 && targetForm ? setShowConfirmModal('promote') : handlePromote()} disabled={promoting || selected.size === 0 || !targetForm}
                                className="flex-1 px-3 py-2.5 text-[11px] font-bold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: selected.size > 0 ? '0 4px 14px rgba(139,92,246,0.4)' : 'none' }}>
                                <FiTrendingUp size={12} /> Promote ({selected.size})
                            </button>
                            <button onClick={() => setShowConfirmModal('demote')} disabled={promoting || selected.size === 0 || !targetForm}
                                className="px-2.5 py-2.5 text-[11px] font-bold text-red-600 bg-red-50 rounded-xl disabled:opacity-40 hover:bg-red-100 transition-colors" title="Demote">
                                <FiTrendingUp size={12} className="rotate-180" />
                            </button>
                            <button onClick={() => setShowConfirmModal('graduate')} disabled={promoting || selected.size === 0}
                                className="px-2.5 py-2.5 text-[11px] font-bold text-amber-600 bg-amber-50 rounded-xl disabled:opacity-40 hover:bg-amber-100 transition-colors" title="Graduate">
                                🎓
                            </button>
                        </div>
                    </div>
                </div>
                {/* ─── Live Stats Bar ─── */}
                {classStats && (
                    <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-4 bg-gray-50/50">
                        <div className="flex items-center gap-1.5"><FiUsers size={11} className="text-gray-400" /><span className="text-[11px] font-bold text-gray-600">{classStats.total} Students</span></div>
                        <div className="w-px h-4 bg-gray-200" />
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[11px] text-gray-500">{classStats.eligible} Eligible</span></div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[11px] text-gray-500">{classStats.conditional} Conditional</span></div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[11px] text-gray-500">{classStats.ineligible} Ineligible</span></div>
                        <div className="w-px h-4 bg-gray-200" />
                        <span className="text-[11px] text-gray-500">Avg: <strong className="text-gray-700">{classStats.avgScore.toFixed(1)}</strong></span>
                        <span className="text-[11px] text-gray-500">Cleared: <strong className="text-green-600">{classStats.cleared}/{classStats.total}</strong></span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <button onClick={exportCSV} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Export CSV"><FiDownload size={12} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* CBC info banner */}
            {selForm && getEducationSystem(Number(selForm), forms) === 'CBC_Senior_School' && (
                <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <span className="text-lg">🛤️</span>
                    <div>
                        <p className="text-sm font-bold text-indigo-800">CBC Senior School Promotion</p>
                        <p className="text-xs text-indigo-600 mt-0.5">
                            Promoting CBC students carries their <strong>subject combinations forward</strong> automatically.
                            Grade 10 → Grade 11 → Grade 12. After Grade 12, use <strong>Graduate</strong> to move them to Alumni.
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {forms.filter((f: any) => f.education_system === 'CBC_Senior_School').map((f: any) => (
                                <span key={f.id} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    {f.form_name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!selForm ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-50 flex items-center justify-center"><FiTrendingUp size={24} className="text-purple-300" /></div>
                    <p className="font-semibold text-sm text-gray-500">Select a form to view students for promotion</p>
                    <p className="text-[11px] text-gray-400 mt-1">Choose a current form from the controls above</p>
                </div>
            ) : classStudents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center"><FiUsers size={24} className="text-gray-300" /></div>
                    <p className="font-semibold text-sm text-gray-500">No active students in this class</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)} className="w-3.5 h-3.5 rounded accent-purple-600" />
                            <span className="text-[11px] font-semibold text-gray-600">Select All ({classStudents.length})</span>
                        </label>
                        <div className="relative flex-1 max-w-xs">
                            <FiFilter size={11} className="absolute left-2.5 top-2 text-gray-400" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter students..." className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none" />
                        </div>
                        <span className="text-[11px] font-bold text-purple-600 shrink-0">{selected.size} selected</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="px-2.5 py-2 w-8"></th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-8">#</th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adm No</th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none" onClick={() => handleSort('name')}>Name {sortField==='name' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12">Gen</th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stream</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none" onClick={() => handleSort('avg')}>Avg {sortField==='avg' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none" onClick={() => handleSort('fails')}>Fails {sortField==='fails' ? (sortDir==='asc'?'↑':'↓') : ''}</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Eligibility</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">→ Target</th>
                                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clear.</th>
                            </tr></thead>
                            <tbody>
                                {classStudents.map((s: any, i: number) => {
                                    const avg = studentAverages[s.id]?.average;
                                    const fails = studentAverages[s.id]?.fails ?? 0;
                                    const elig = targetForm ? checkEligibility(s, Number(selForm), Number(targetForm)) : null;
                                    return (
                                        <tr key={s.id} className={`border-b border-gray-100 hover:bg-purple-50/40 transition-all duration-150 ${selected.has(s.id) ? 'bg-purple-50/60' : ''}`}>
                                            <td className="px-2.5 py-2"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)} className="w-3.5 h-3.5 rounded accent-purple-600" /></td>
                                            <td className="px-2 py-2 text-[11px] text-gray-400">{i + 1}</td>
                                            <td className="px-2 py-2 text-[11px] font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                            <td className="px-2 py-2 text-[11px] font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                            <td className="px-2 py-2 text-center text-[11px]">{s.gender === 'Male' ? '♂' : '♀'}</td>
                                            <td className="px-2 py-2 text-[11px] text-gray-600">{getStreamName(s.stream_id)}</td>
                                            <td className="px-2 py-2 text-center text-[11px] font-bold text-gray-700">{avg ? avg.toFixed(1) : '—'}</td>
                                            <td className="px-2 py-2 text-center text-[11px]"><span className={fails > 3 ? 'text-red-600 font-bold' : fails > 0 ? 'text-amber-600' : 'text-green-600'}>{fails || 0}</span></td>
                                            <td className="px-2 py-2 text-center">
                                                {elig ? (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${elig.status === 'Eligible' ? 'bg-green-100 text-green-700' : elig.status === 'Conditional' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{elig.status}</span>
                                                ) : <span className="text-[10px] text-gray-400">—</span>}
                                            </td>
                                            <td className="px-2 py-2 text-center text-[11px] font-medium text-gray-600">{getFormName(s.form_id)}</td>
                                            <td className="px-2 py-2 text-center text-[11px] font-bold text-purple-600">{targetForm ? getFormName(Number(targetForm)) : '-'}</td>
                                            <td className="px-2 py-2 text-center">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.clearance_status === 'Complete' ? 'bg-green-100 text-green-700' : s.clearance_status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{s.clearance_status || 'Pending'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── Confirmation Modal ─── */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 text-center border-b border-gray-100">
                            <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center ${showConfirmModal === 'promote' ? 'bg-purple-100' : showConfirmModal === 'demote' ? 'bg-red-100' : 'bg-amber-100'}`}>
                                {showConfirmModal === 'promote' ? <FiTrendingUp size={24} className="text-purple-600" /> : showConfirmModal === 'demote' ? <FiTrendingUp size={24} className="text-red-600 rotate-180" /> : <span className="text-2xl">🎓</span>}
                            </div>
                            <h3 className="text-sm font-bold text-gray-800">
                                {showConfirmModal === 'promote' ? 'Confirm Promotion' : showConfirmModal === 'demote' ? 'Confirm Demotion' : 'Confirm Graduation'}
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">This action will be logged in the audit trail</p>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-lg font-extrabold text-gray-800">{selected.size}</p>
                                    <p className="text-[10px] font-semibold text-gray-400">Students</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-lg font-extrabold text-gray-800">{getFormName(Number(selForm))}</p>
                                    <p className="text-[10px] font-semibold text-gray-400">From</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-lg font-extrabold text-purple-600">{showConfirmModal === 'graduate' ? 'Alumni' : getFormName(Number(targetForm))}</p>
                                    <p className="text-[10px] font-semibold text-gray-400">To</p>
                                </div>
                            </div>
                            {autoAssignStream && <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg"><FiArrowRight size={11} className="text-blue-500" /><span className="text-[11px] text-blue-700 font-medium">Streams will be auto-assigned by merit ranking</span></div>}
                            {sendSmsOnPromote && <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg"><FiMessageSquare size={11} className="text-green-500" /><span className="text-[11px] text-green-700 font-medium">SMS notifications will be sent to parents</span></div>}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setShowConfirmModal(null)} className="px-4 py-2 text-[11px] font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={() => { setShowConfirmModal(null); if (showConfirmModal === 'promote') handlePromote(); else if (showConfirmModal === 'demote') handleDemote(); else handleGraduate(); }}
                                className="px-5 py-2 text-[11px] font-bold text-white rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
                                style={{ background: showConfirmModal === 'promote' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : showConfirmModal === 'demote' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                                {showConfirmModal === 'promote' ? 'Promote Students' : showConfirmModal === 'demote' ? 'Demote Students' : 'Graduate Students'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
