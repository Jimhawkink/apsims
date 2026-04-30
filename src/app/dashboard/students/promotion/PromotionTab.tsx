'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiSend } from 'react-icons/fi';

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

    const classStudents = useMemo(() =>
        students.filter((s: any) => s.status === 'Active' && selForm && String(s.form_id) === selForm)
            .filter((s: any) => !selStream || String(s.stream_id) === selStream),
        [students, selForm, selStream]
    );

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
        if (!confirm(`Promote ${selected.size} students to ${targetFormName}?${autoAssignStream ? ' (Streams auto-assigned by merit)' : ''}`)) return;
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

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Current Form *</label>
                        <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelected(new Set()); setSelectAll(false); }} className="select-modern w-full text-sm">
                            <option value="">Select Form</option>{forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Stream</label>
                        <select value={selStream} onChange={e => { setSelStream(e.target.value); setSelected(new Set()); }} className="select-modern w-full text-sm">
                            <option value="">All Streams</option>{streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Target Form *</label>
                        <select value={targetForm} onChange={e => setTargetForm(e.target.value)} className="select-modern w-full text-sm">
                            <option value="">Target Form</option>{forms.filter((f: any) => String(f.id) !== selForm).map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Target Stream</label>
                        <select value={targetStream} onChange={e => setTargetStream(e.target.value)} className="select-modern w-full text-sm">
                            <option value="">Keep Current</option>{streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col justify-end gap-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={autoAssignStream} onChange={e => setAutoAssignStream(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                            <span className="text-xs font-medium text-gray-600">Auto-assign streams by merit</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={sendSmsOnPromote} onChange={e => setSendSmsOnPromote(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                            <span className="text-xs font-medium text-gray-600">SMS parents on promote</span>
                        </label>
                    </div>
                    <div className="flex items-end gap-1.5">
                        <button onClick={handlePromote} disabled={promoting || selected.size === 0 || !targetForm}
                            className="flex-1 px-3 py-2.5 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-md"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <FiTrendingUp size={13} /> Promote ({selected.size})
                        </button>
                        <button onClick={handleDemote} disabled={promoting || selected.size === 0 || !targetForm}
                            className="px-3 py-2.5 text-xs font-bold text-red-700 bg-red-100 rounded-xl disabled:opacity-40" title="Demote">
                            <FiTrendingUp size={13} className="rotate-180" />
                        </button>
                        <button onClick={handleGraduate} disabled={promoting || selected.size === 0}
                            className="px-3 py-2.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-xl disabled:opacity-40" title="Graduate">
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2.5 w-10"></th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Gender</th>
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Stream</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Avg</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Fails</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Eligibility</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Current</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">→ Target</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Clearance</th>
                            </tr></thead>
                            <tbody>
                                {classStudents.map((s: any, i: number) => {
                                    const avg = studentAverages[s.id]?.average;
                                    const fails = studentAverages[s.id]?.fails ?? 0;
                                    const elig = targetForm ? checkEligibility(s, Number(selForm), Number(targetForm)) : null;
                                    return (
                                        <tr key={s.id} className={`border-b border-gray-100 hover:bg-purple-50/30 transition-colors ${selected.has(s.id) ? 'bg-purple-50' : ''}`}>
                                            <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleStudent(s.id)} className="w-4 h-4 rounded" /></td>
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                            <td className="px-3 py-2.5 text-center text-sm">{s.gender === 'Male' ? '👦' : '👧'}</td>
                                            <td className="px-3 py-2.5 text-sm text-gray-600">{getStreamName(s.stream_id)}</td>
                                            <td className="px-3 py-2.5 text-center text-sm font-bold text-gray-700">{avg ? avg.toFixed(1) : '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-sm"><span className={fails > 3 ? 'text-red-600 font-bold' : fails > 0 ? 'text-amber-600' : 'text-green-600'}>{fails || 0}</span></td>
                                            <td className="px-3 py-2.5 text-center">
                                                {elig ? (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${elig.status === 'Eligible' ? 'bg-green-100 text-green-700' : elig.status === 'Conditional' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{elig.status}</span>
                                                ) : <span className="text-xs text-gray-400">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-sm font-medium text-gray-700">{getFormName(s.form_id)}</td>
                                            <td className="px-3 py-2.5 text-center text-sm font-bold text-purple-600">{targetForm ? getFormName(Number(targetForm)) : '-'}</td>
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.clearance_status === 'Complete' ? 'bg-green-100 text-green-700' : s.clearance_status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{s.clearance_status || 'Pending'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
