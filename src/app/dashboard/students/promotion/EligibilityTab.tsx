'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiActivity, FiZap, FiDownload, FiSearch } from 'react-icons/fi';

export default function EligibilityTab({ data }: { data: any }) {
    const { students, forms, studentAverages, checkEligibility, getFormName, fetchAll } = data;
    const [eligForm, setEligForm] = useState('');

    const runEligibilityCheck = async () => {
        if (!eligForm) { toast.error('Select form'); return; }
        const formStudents = students.filter((s: any) => s.status === 'Active' && String(s.form_id) === eligForm);
        let updates = 0;
        for (const student of formStudents) {
            const nextFormLevel = forms.find((f: any) => f.id === student.form_id)?.form_level;
            const nextForm = forms.find((f: any) => f.form_level === (nextFormLevel || 0) + 1);
            if (!nextForm) { await supabase.from('school_students').update({ promotion_eligible: 'Pending' }).eq('id', student.id); continue; }
            const { status } = checkEligibility(student, student.form_id, nextForm.id);
            await supabase.from('school_students').update({ promotion_eligible: status }).eq('id', student.id);
            updates++;
        }
        toast.success(`Eligibility checked for ${updates} students ✅`);
        fetchAll();
    };

    const filtered = students.filter((s: any) => s.status === 'Active' && eligForm && String(s.form_id) === eligForm);
    const eligibleCount = filtered.filter((s: any) => s.promotion_eligible === 'Eligible').length;
    const conditionalCount = filtered.filter((s: any) => s.promotion_eligible === 'Conditional').length;
    const ineligibleCount = filtered.filter((s: any) => s.promotion_eligible === 'Ineligible').length;

    const [searchQ, setSearchQ] = useState('');
    const displayFiltered = filtered.filter((s: any) => !searchQ || `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQ.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-end gap-3 flex-wrap">
                    <div>
                        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Select Form</label>
                        <select value={eligForm} onChange={e => setEligForm(e.target.value)} className="select-modern text-sm">
                            <option value="">Select Form</option>{forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <button onClick={runEligibilityCheck} className="px-4 py-2.5 text-[11px] font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <FiZap size={12} /> Run Eligibility Check
                    </button>
                </div>
                {eligForm && filtered.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-4 bg-gray-50/50">
                        <span className="text-[11px] font-bold text-gray-600">{filtered.length} Students</span>
                        <div className="w-px h-4 bg-gray-200" />
                        <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-green-500" /><strong className="text-green-700">{eligibleCount}</strong> Eligible</span>
                        <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-amber-500" /><strong className="text-amber-700">{conditionalCount}</strong> Conditional</span>
                        <span className="flex items-center gap-1 text-[11px]"><span className="w-2 h-2 rounded-full bg-red-500" /><strong className="text-red-700">{ineligibleCount}</strong> Ineligible</span>
                        {filtered.length > 0 && <div className="ml-auto w-24 bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${(eligibleCount / filtered.length) * 100}%` }} /></div>}
                    </div>
                )}
            </div>

            {eligForm && filtered.length > 0 && (
                <>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                            <div className="relative flex-1 max-w-xs"><FiSearch size={11} className="absolute left-2.5 top-2 text-gray-400" /><input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Filter by name..." className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-green-200 outline-none" /></div>
                            <span className="text-[11px] text-gray-400">{displayFiltered.length} shown</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50/80 border-b border-gray-200">
                                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adm No</th>
                                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg</th>
                                    <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fails</th>
                                    <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason</th>
                                    <th className="px-2.5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clear.</th>
                                </tr></thead>
                                <tbody>
                                    {displayFiltered.map((s: any, i: number) => {
                                        const nextFormLevel = forms.find((f: any) => f.id === s.form_id)?.form_level;
                                        const nextForm = forms.find((f: any) => f.form_level === (nextFormLevel || 0) + 1);
                                        const elig = nextForm ? checkEligibility(s, s.form_id, nextForm.id) : null;
                                        const avg = studentAverages[s.id]?.average;
                                        const fails = studentAverages[s.id]?.fails ?? 0;
                                        return (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-green-50/30 transition-all duration-150">
                                                <td className="px-2.5 py-2 text-[11px] text-gray-400">{i + 1}</td>
                                                <td className="px-2.5 py-2 text-[11px] font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                                <td className="px-2.5 py-2 text-[11px] font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                                <td className="px-2.5 py-2 text-center text-[11px] font-bold">{avg ? avg.toFixed(1) : '—'}</td>
                                                <td className="px-2.5 py-2 text-center text-[11px]"><span className={fails > 3 ? 'text-red-600 font-bold' : fails > 0 ? 'text-amber-600' : 'text-green-600'}>{fails}</span></td>
                                                <td className="px-2.5 py-2 text-center">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.promotion_eligible === 'Eligible' ? 'bg-green-100 text-green-700' : s.promotion_eligible === 'Conditional' ? 'bg-amber-100 text-amber-700' : s.promotion_eligible === 'Ineligible' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{s.promotion_eligible || 'Pending'}</span>
                                                </td>
                                                <td className="px-2.5 py-2 text-[10px] text-gray-500 max-w-[200px] truncate">{elig?.reason || '—'}</td>
                                                <td className="px-2.5 py-2 text-center">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.clearance_status === 'Complete' ? 'bg-green-100 text-green-700' : s.clearance_status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{s.clearance_status || 'Pending'}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
