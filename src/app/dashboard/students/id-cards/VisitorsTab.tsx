'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiEye, FiPlus, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { VisitorCardPreview } from './CardPreviews';

export default function VisitorsTab({ data }: any) {
    const [form, setForm] = useState({ visitor_name: '', visitor_phone: '', visitor_id_number: '', visitor_purpose: '', host_person: '', card_number: '' });
    const [showForm, setShowForm] = useState(false);

    const addVisitor = async () => {
        if (!form.visitor_name) return toast.error('Visitor name required');
        const cardNum = data.generateCardNumber('VIS');
        await supabase.from('school_visitor_cards').insert([{ ...form, card_number: cardNum, status: 'Checked In' }]);
        toast.success('Visitor checked in');
        setForm({ visitor_name: '', visitor_phone: '', visitor_id_number: '', visitor_purpose: '', host_person: '', card_number: '' });
        data.fetchAll();
    };

    const checkout = async (id: number) => {
        await supabase.from('school_visitor_cards').update({ check_out_time: new Date().toISOString(), status: 'Checked Out' }).eq('id', id);
        toast.success('Visitor checked out');
        data.fetchAll();
    };

    const remove = async (id: number) => {
        if (!confirm('Delete this visitor record?')) return;
        await supabase.from('school_visitor_cards').delete().eq('id', id);
        toast.success('Deleted');
        data.fetchAll();
    };

    const checkedIn = data.visitorCards.filter((v: any) => v.status === 'Checked In');
    const checkedOut = data.visitorCards.filter((v: any) => v.status === 'Checked Out');

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{checkedIn.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Checked In</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-400">{checkedOut.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Checked Out</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-orange-800">{data.visitorCards.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                </div>
            </div>

            {/* Add Visitor */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiEye className="text-orange-500" /> Register Visitor</h3>
                    <button onClick={() => setShowForm(!showForm)} className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg flex items-center gap-1"><FiPlus size={12} /> {showForm ? 'Cancel' : 'New Visitor'}</button>
                </div>
                {showForm && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div><label className="lbl">Name *</label><input type="text" value={form.visitor_name} onChange={e => setForm({ ...form, visitor_name: e.target.value })} placeholder="Full name..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" /></div>
                            <div><label className="lbl">Phone</label><input type="text" value={form.visitor_phone} onChange={e => setForm({ ...form, visitor_phone: e.target.value })} placeholder="0712..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" /></div>
                            <div><label className="lbl">ID Number</label><input type="text" value={form.visitor_id_number} onChange={e => setForm({ ...form, visitor_id_number: e.target.value })} placeholder="National ID..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" /></div>
                            <div><label className="lbl">Purpose</label><input type="text" value={form.visitor_purpose} onChange={e => setForm({ ...form, visitor_purpose: e.target.value })} placeholder="Reason for visit..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" /></div>
                            <div><label className="lbl">Host Person</label><input type="text" value={form.host_person} onChange={e => setForm({ ...form, host_person: e.target.value })} placeholder="Who they're visiting..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 outline-none" /></div>
                        </div>
                        <button onClick={addVisitor} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #c2410c, #f97316)' }}>
                            <FiPlus size={13} /> Check In Visitor
                        </button>
                    </div>
                )}
            </div>

            {/* Visitor List + Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Purpose</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Host</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Card</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr></thead><tbody>
                            {data.visitorCards.map((v: any) => (
                                <tr key={v.id} className="border-b border-gray-100">
                                    <td className="px-3 py-2 text-xs font-semibold">{v.visitor_name}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500">{v.visitor_purpose || '-'}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500">{v.host_person || '-'}</td>
                                    <td className="px-3 py-2 text-xs font-bold text-orange-600">{v.card_number || '-'}</td>
                                    <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v.status}</span></td>
                                    <td className="px-3 py-2 flex gap-1">
                                        {v.status === 'Checked In' && <button onClick={() => checkout(v.id)} className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100 flex items-center gap-1"><FiLogOut size={9} /> Out</button>}
                                        <button onClick={() => remove(v.id)} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded hover:bg-gray-100"><FiTrash2 size={9} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody></table>
                    </div>
                </div>
                {/* Sample Visitor Card Preview */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Sample Visitor Card</p>
                    <VisitorCardPreview visitor={{ visitor_name: 'Guest Visitor', visitor_purpose: 'Parent Meeting', host_person: 'Principal', visitor_id_number: '12345678', card_number: 'VIS-2025-789012' }} school={data.schoolDetails} />
                </div>
            </div>
        </div>
    );
}
