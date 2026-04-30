'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCreditCard, FiPrinter, FiUsers } from 'react-icons/fi';
import { StaffCardFront } from './CardPreviews';

export default function StaffCardsTab({ data }: any) {
    const [search, setSearch] = useState('');
    const [selStaff, setSelStaff] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const filtered = useMemo(() => data.staff.filter((s: any) => {
        if (s.status && s.status !== 'Active') return false;
        if (search) { const q = search.toLowerCase(); if (!`${s.first_name} ${s.last_name} ${s.tsc_number || ''}`.toLowerCase().includes(q)) return false; }
        return true;
    }), [data.staff, search]);

    const selected = data.staff.filter((s: any) => selStaff.has(s.id));

    const issueCards = async () => {
        if (selected.length === 0) return toast.error('Select staff first');
        const tpl = data.templates.find((t: any) => t.card_type === 'Staff');
        let count = 0;
        for (const s of selected) {
            const cardNum = data.generateCardNumber('STF');
            const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 2);
            const { error } = await supabase.from('school_id_cards').insert([{
                card_number: cardNum, card_type: 'Staff', person_id: s.id,
                person_name: `${s.first_name} ${s.last_name}`, person_type: 'Staff',
                template_id: tpl?.id || null,
                issue_date: new Date().toISOString().split('T')[0],
                expiry_date: expiry.toISOString().split('T')[0],
                status: 'Active', qr_code: data.generateQRData(s, 'Staff'), barcode: cardNum,
            }]);
            if (!error) {
                await supabase.from('school_teachers').update({
                    card_number: cardNum, card_issued_date: new Date().toISOString().split('T')[0],
                    card_expiry_date: expiry.toISOString().split('T')[0], card_status: 'Issued',
                }).eq('id', s.id);
                count++;
            }
        }
        toast.success(`Issued ${count} staff ID cards`);
        data.fetchAll();
    };

    const toggle = (id: number) => { const n = new Set(selStaff); if (n.has(id)) n.delete(id); else n.add(id); setSelStaff(n); };

    return (
        <div className="space-y-4">
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="lbl">Search</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or TSC No..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-red-400 outline-none" /></div>
                    <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer py-2.5"><input type="checkbox" checked={selectAll} onChange={e => { setSelectAll(e.target.checked); setSelStaff(e.target.checked ? new Set(filtered.map((s: any) => s.id)) : new Set()); }} className="w-4 h-4 rounded" /><span className="text-xs font-semibold text-gray-600">All ({filtered.length})</span></label></div>
                    <div className="flex items-end gap-2">
                        <button onClick={issueCards} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #991b1b, #ef4444)' }}>
                            <FiCreditCard size={13} /> Issue Cards ({selStaff.size})
                        </button>
                        <button onClick={() => window.print()} disabled={selStaff.size === 0} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                            <FiPrinter size={13} /> Print
                        </button>
                    </div>
                </div>
            </div>

            <div className="no-print bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="max-h-[250px] overflow-y-auto">
                    <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <th className="px-3 py-2 w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">TSC No</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Card</th>
                    </tr></thead><tbody>
                        {filtered.map((s: any) => (
                            <tr key={s.id} className={`border-b border-gray-100 hover:bg-red-50/30 cursor-pointer ${selStaff.has(s.id) ? 'bg-red-50' : ''}`} onClick={() => toggle(s.id)}>
                                <td className="px-3 py-2"><input type="checkbox" checked={selStaff.has(s.id)} readOnly className="w-4 h-4 rounded pointer-events-none" /></td>
                                <td className="px-3 py-2 text-sm font-bold text-red-600">{s.tsc_number || s.staff_no || '-'}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                <td className="px-3 py-2 text-sm">{s.designation || s.qualification || 'Teacher'}</td>
                                <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.card_status === 'Issued' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.card_status || 'Not Issued'}</span></td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
            </div>

            {selected.length > 0 && (
                <div className="print-area grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selected.map((s: any) => <StaffCardFront key={s.id} staff={s} school={data.schoolDetails} template={data.templates.find((t: any) => t.card_type === 'Staff')} qrDataUrl={null} />)}
                </div>
            )}

            {selected.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FiUsers className="text-red-500" /> Sample Staff Card</h3>
                    <div className="flex justify-center">
                        <StaffCardFront staff={{ first_name: 'Mary', last_name: 'Wanjiku', tsc_number: 'TSC/12345', designation: 'Senior Teacher', department: 'Languages', phone: '0722123456', email: 'mary@school.ac.ke', card_number: 'STF-2025-654321' }} school={data.schoolDetails} template={data.templates.find((t: any) => t.card_type === 'Staff')} qrDataUrl={null} />
                    </div>
                </div>
            )}
        </div>
    );
}
