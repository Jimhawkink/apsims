'use client';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSmartphone, FiSend, FiCheck } from 'react-icons/fi';

export default function DigitalTab({ data }: any) {
    const sendDigitalCard = async (card: any) => {
        const person = card.person_type === 'Student'
            ? data.students.find((s: any) => s.id === card.person_id)
            : data.staff.find((s: any) => s.id === card.person_id);
        if (!person) return toast.error('Person not found');
        const phone = person.guardian_phone || person.phone || '';
        if (!phone) return toast.error('No phone number on file');
        const msg = `Hello! Here is the digital ID card for ${card.person_name}.\nCard No: ${card.card_number}\nSchool: ${data.schoolDetails?.school_name || 'Alpha School'}\nValid until: ${card.expiry_date || 'N/A'}\n\nThis is an official digital ID from APSIMS.`;
        try {
            await fetch('/api/send-sms', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'id-card-digital' },
                body: JSON.stringify({ phone, message: msg }),
            });
            await supabase.from('school_id_cards').update({ digital_sent: true, digital_sent_at: new Date().toISOString(), digital_sent_phone: phone }).eq('id', card.id);
            toast.success(`Digital card sent to ${phone}`);
        } catch { toast.error('Failed to send'); }
        data.fetchAll();
    };

    const sendBulk = async () => {
        const unsent = data.issuedCards.filter((c: any) => c.status === 'Active' && !c.digital_sent);
        if (unsent.length === 0) return toast.error('No unsent cards');
        let count = 0;
        for (const card of unsent.slice(0, 50)) {
            const person = card.person_type === 'Student'
                ? data.students.find((s: any) => s.id === card.person_id)
                : data.staff.find((s: any) => s.id === card.person_id);
            if (!person) continue;
            const phone = person.guardian_phone || person.phone || '';
            if (!phone) continue;
            const msg = `Digital ID for ${card.person_name}. Card: ${card.card_number}. Valid: ${card.expiry_date || 'N/A'}. — ${data.schoolDetails?.school_name || 'Alpha School'}`;
            try {
                await fetch('/api/send-sms', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'id-card-digital' },
                    body: JSON.stringify({ phone, message: msg }),
                });
                await supabase.from('school_id_cards').update({ digital_sent: true, digital_sent_at: new Date().toISOString(), digital_sent_phone: phone }).eq('id', card.id);
                count++;
            } catch { /* skip */ }
        }
        toast.success(`Sent ${count} digital cards`);
        data.fetchAll();
    };

    const activeCards = data.issuedCards.filter((c: any) => c.status === 'Active');
    const sentCount = activeCards.filter((c: any) => c.digital_sent).length;
    const unsentCount = activeCards.length - sentCount;

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 grid grid-cols-3 gap-3">
                    {[{ label: 'Total Active', value: activeCards.length, color: '#4f46e5', bg: '#eef2ff' }, { label: 'Sent', value: sentCount, color: '#059669', bg: '#ecfdf5' }, { label: 'Unsent', value: unsentCount, color: '#d97706', bg: '#fffbeb' }].map((k, i) => (
                        <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: k.bg }}>
                            <p className="text-2xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{k.label}</p>
                        </div>
                    ))}
                </div>
                {/* Progress bar */}
                <div className="px-4 pb-3">
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500" style={{ width: `${activeCards.length > 0 ? (sentCount / activeCards.length * 100) : 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">{activeCards.length > 0 ? Math.round(sentCount / activeCards.length * 100) : 0}% delivered</p>
                </div>
            </div>

            {/* Bulk Send */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <FiSmartphone className="text-green-500" /> Bulk Send via WhatsApp/SMS
                        {unsentCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Send digital ID card info to {unsentCount} guardians</p>
                </div>
                <button onClick={sendBulk} disabled={unsentCount === 0} className="px-4 py-2.5 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-40 transition-all hover:shadow-lg hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: unsentCount > 0 ? '0 4px 14px rgba(5,150,105,0.3)' : 'none' }}>
                    <FiSend size={13} /> Send All ({unsentCount})
                </button>
            </div>

            {/* Card List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full"><thead><tr className="bg-gray-50/80 border-b border-gray-200 sticky top-0">
                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Card No</th>
                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Person</th>
                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr></thead><tbody>
                        {activeCards.map((c: any) => {
                            const person = c.person_type === 'Student'
                                ? data.students.find((s: any) => s.id === c.person_id)
                                : data.staff.find((s: any) => s.id === c.person_id);
                            const phone = person?.guardian_phone || person?.phone || '-';
                            return (
                                <tr key={c.id} className="border-b border-gray-100 hover:bg-green-50/30 transition-all duration-150">
                                    <td className="px-3 py-2.5 text-xs font-bold text-indigo-600">{c.card_number}</td>
                                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{c.person_name}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-600">{c.person_type}</td>
                                    <td className="px-3 py-2.5 text-xs text-gray-500">{phone}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        {c.digital_sent
                                            ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 inline-flex items-center gap-1"><FiCheck size={10} /> Sent</span>
                                            : <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                                        }
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {!c.digital_sent && <button onClick={() => sendDigitalCard(c)} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100 transition-colors inline-flex items-center gap-1"><FiSend size={10} /> Send</button>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody></table>
                </div>
            </div>
        </div>
    );
}
