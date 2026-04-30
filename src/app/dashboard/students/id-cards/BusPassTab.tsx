'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiTruck, FiPlus, FiTrash2 } from 'react-icons/fi';
import { BusPassCardPreview } from './CardPreviews';

export default function BusPassTab({ data }: any) {
    const [form, setForm] = useState<any>({ student_id: '', route_name: '', driver_name: '', driver_phone: '', pickup_point: '', dropoff_point: '', expiry_date: '' });
    const [showForm, setShowForm] = useState(false);

    const addBusPass = async () => {
        if (!form.student_id) return toast.error('Select a student');
        const existing = data.busPasses.find((b: any) => b.student_id === Number(form.student_id));
        if (existing) return toast.error('Student already has a bus pass');
        const cardNum = data.generateCardNumber('BUS');
        await supabase.from('school_bus_pass_cards').insert([{ ...form, student_id: Number(form.student_id), card_number: cardNum, issue_date: new Date().toISOString().split('T')[0], status: 'Active' }]);
        toast.success('Bus pass issued');
        setForm({ student_id: '', route_name: '', driver_name: '', driver_phone: '', pickup_point: '', dropoff_point: '', expiry_date: '' });
        data.fetchAll();
    };

    const remove = async (id: number) => {
        if (!confirm('Cancel this bus pass?')) return;
        await supabase.from('school_bus_pass_cards').update({ status: 'Cancelled' }).eq('id', id);
        toast.success('Bus pass cancelled');
        data.fetchAll();
    };

    const activeStudents = data.students.filter((s: any) => s.status === 'Active');

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-cyan-600">{data.busPasses.filter((b: any) => b.status === 'Active').length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Active Passes</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-400">{data.busPasses.filter((b: any) => b.status === 'Cancelled').length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Cancelled</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-cyan-800">{data.busPasses.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                </div>
            </div>

            {/* Issue Bus Pass */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiTruck className="text-cyan-500" /> Issue Bus Pass</h3>
                    <button onClick={() => setShowForm(!showForm)} className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-lg flex items-center gap-1"><FiPlus size={12} /> {showForm ? 'Cancel' : 'New Pass'}</button>
                </div>
                {showForm && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div><label className="lbl">Student *</label><select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select Student...</option>{activeStudents.map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no || s.admission_number})</option>)}</select></div>
                            <div><label className="lbl">Route</label><input type="text" value={form.route_name} onChange={e => setForm({ ...form, route_name: e.target.value })} placeholder="e.g. Route A — Eastlands" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-cyan-400 outline-none" /></div>
                            <div><label className="lbl">Expiry Date</label><input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-cyan-400 outline-none" /></div>
                            <div><label className="lbl">Driver Name</label><input type="text" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} placeholder="Driver name..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-cyan-400 outline-none" /></div>
                            <div><label className="lbl">Driver Phone</label><input type="text" value={form.driver_phone} onChange={e => setForm({ ...form, driver_phone: e.target.value })} placeholder="0712..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-cyan-400 outline-none" /></div>
                            <div><label className="lbl">Pickup Point</label><input type="text" value={form.pickup_point} onChange={e => setForm({ ...form, pickup_point: e.target.value })} placeholder="Pickup location..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-cyan-400 outline-none" /></div>
                            <div><label className="lbl">Drop-off Point</label><input type="text" value={form.dropoff_point} onChange={e => setForm({ ...form, dropoff_point: e.target.value })} placeholder="Drop-off location..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-cyan-400 outline-none" /></div>
                        </div>
                        <button onClick={addBusPass} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #0e7490, #06b6d4)' }}>
                            <FiPlus size={13} /> Issue Bus Pass
                        </button>
                    </div>
                )}
            </div>

            {/* Bus Pass List + Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Route</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Driver</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Card</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr></thead><tbody>
                            {data.busPasses.map((b: any) => {
                                const student = data.students.find((s: any) => s.id === b.student_id);
                                return (
                                    <tr key={b.id} className="border-b border-gray-100">
                                        <td className="px-3 py-2 text-xs font-semibold">{student ? `${student.first_name} ${student.last_name}` : b.student_id}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{b.route_name || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{b.driver_name || '-'} {b.driver_phone ? `(${b.driver_phone})` : ''}</td>
                                        <td className="px-3 py-2 text-xs font-bold text-cyan-600">{b.card_number || '-'}</td>
                                        <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.status}</span></td>
                                        <td className="px-3 py-2">
                                            {b.status === 'Active' && <button onClick={() => remove(b.id)} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 flex items-center gap-1"><FiTrash2 size={9} /> Cancel</button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody></table>
                    </div>
                </div>
                {/* Sample Bus Pass Preview */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Sample Bus Pass</p>
                    <BusPassCardPreview busPass={{ route_name: 'Route A — Eastlands', driver_name: 'Peter Mwangi', driver_phone: '0722123456', pickup_point: 'Junction Mall', dropoff_point: 'School Gate', card_number: 'BUS-2025-345678', issue_date: '2025-01-15', expiry_date: '2025-12-12' }} student={{ first_name: 'John', last_name: 'Doe', form_id: 1 }} school={data.schoolDetails} getFormName={() => 'Form 1'} />
                </div>
            </div>
        </div>
    );
}
