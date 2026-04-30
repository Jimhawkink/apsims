'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiActivity } from 'react-icons/fi';

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

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-end gap-3 flex-wrap">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Form</label>
                        <select value={eligForm} onChange={e => setEligForm(e.target.value)} className="select-modern text-sm">
                            <option value="">Select Form</option>{forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                        </select>
                    </div>
                    <button onClick={runEligibilityCheck} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <FiActivity size={14} /> Run Eligibility Check
                    </button>
                </div>
            </div>

            {eligForm && filtered.length > 0 && (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-700">{eligibleCount}</p>
                            <p className="text-xs font-semibold text-green-600">Eligible</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-amber-700">{conditionalCount}</p>
                            <p className="text-xs font-semibold text-amber-600">Conditional</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-red-700">{ineligibleCount}</p>
                            <p className="text-xs font-semibold text-red-600">Ineligible</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Avg Score</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Failures</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Reason</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">Clearance</th>
                                </tr></thead>
                                <tbody>
                                    {filtered.map((s: any, i: number) => {
                                        const nextFormLevel = forms.find((f: any) => f.id === s.form_id)?.form_level;
                                        const nextForm = forms.find((f: any) => f.form_level === (nextFormLevel || 0) + 1);
                                        const elig = nextForm ? checkEligibility(s, s.form_id, nextForm.id) : null;
                                        const avg = studentAverages[s.id]?.average;
                                        const fails = studentAverages[s.id]?.fails ?? 0;
                                        return (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                                <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                                <td className="px-4 py-2.5 text-center text-sm font-bold">{avg ? avg.toFixed(1) : '—'}</td>
                                                <td className="px-4 py-2.5 text-center text-sm"><span className={fails > 3 ? 'text-red-600 font-bold' : fails > 0 ? 'text-amber-600' : 'text-green-600'}>{fails}</span></td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.promotion_eligible === 'Eligible' ? 'bg-green-100 text-green-700' : s.promotion_eligible === 'Conditional' ? 'bg-amber-100 text-amber-700' : s.promotion_eligible === 'Ineligible' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{s.promotion_eligible || 'Pending'}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">{elig?.reason || '—'}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.clearance_status === 'Complete' ? 'bg-green-100 text-green-700' : s.clearance_status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{s.clearance_status || 'Pending'}</span>
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
