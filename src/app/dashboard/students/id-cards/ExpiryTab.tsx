'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiClock, FiRefreshCw, FiAlertCircle, FiCheck } from 'react-icons/fi';

export default function ExpiryTab({ data }: any) {
    const [days, setDays] = useState(90);

    const expiringCards = useMemo(() => {
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + days);
        return data.issuedCards.filter((c: any) => c.expiry_date && new Date(c.expiry_date) <= cutoff && c.status === 'Active')
            .sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    }, [data.issuedCards, days]);

    const expiredCards = useMemo(() => {
        const now = new Date();
        return data.issuedCards.filter((c: any) => c.expiry_date && new Date(c.expiry_date) < now && c.status === 'Active');
    }, [data.issuedCards]);

    const renewCard = async (card: any) => {
        const newExpiry = new Date(); newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        await supabase.from('school_id_cards').update({ expiry_date: newExpiry.toISOString().split('T')[0], status: 'Active' }).eq('id', card.id);
        if (card.person_type === 'Student') {
            await supabase.from('school_students').update({ card_expiry_date: newExpiry.toISOString().split('T')[0], card_status: 'Issued' }).eq('id', card.person_id);
        } else {
            await supabase.from('school_teachers').update({ card_expiry_date: newExpiry.toISOString().split('T')[0], card_status: 'Issued' }).eq('id', card.person_id);
        }
        toast.success('Card renewed for 1 year');
        data.fetchAll();
    };

    const renewAll = async () => {
        if (!confirm(`Renew ${expiredCards.length} expired cards for 1 year?`)) return;
        let count = 0;
        for (const card of expiredCards) {
            const newExpiry = new Date(); newExpiry.setFullYear(newExpiry.getFullYear() + 1);
            await supabase.from('school_id_cards').update({ expiry_date: newExpiry.toISOString().split('T')[0], status: 'Active' }).eq('id', card.id);
            if (card.person_type === 'Student') {
                await supabase.from('school_students').update({ card_expiry_date: newExpiry.toISOString().split('T')[0], card_status: 'Issued' }).eq('id', card.person_id);
            } else {
                await supabase.from('school_teachers').update({ card_expiry_date: newExpiry.toISOString().split('T')[0], card_status: 'Issued' }).eq('id', card.person_id);
            }
            count++;
        }
        toast.success(`Renewed ${count} cards`);
        data.fetchAll();
    };

    const getDaysLeft = (expiryDate: string) => {
        const diff = new Date(expiryDate).getTime() - Date.now();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-4 gap-3">
                {[{ label: 'Expired', value: expiredCards.length, color: '#dc2626', bg: '#fef2f2' }, { label: 'Expiring 30d', value: expiringCards.filter((c: any) => { const d = getDaysLeft(c.expiry_date); return d > 0 && d <= 30; }).length, color: '#d97706', bg: '#fffbeb' }, { label: `Expiring ${days}d`, value: expiringCards.length, color: '#ca8a04', bg: '#fefce8' }, { label: 'Valid', value: data.issuedCards.filter((c: any) => c.status === 'Active' && c.expiry_date && getDaysLeft(c.expiry_date) > days).length, color: '#059669', bg: '#ecfdf5' }].map((k, i) => (
                    <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: k.bg }}>
                        <p className="text-2xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">{k.label}</p>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiClock className="text-rose-500" />
                    <label className="text-xs font-bold text-gray-600">Show cards expiring within:</label>
                    <select value={days} onChange={e => setDays(Number(e.target.value))} className="select-modern text-sm">
                        <option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option><option value={365}>1 year</option>
                    </select>
                </div>
                {expiredCards.length > 0 && (
                    <button onClick={renewAll} className="px-4 py-2.5 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                        <FiRefreshCw size={13} /> Renew All Expired ({expiredCards.length})
                    </button>
                )}
            </div>

            {/* Expiring Cards List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {expiringCards.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-50 flex items-center justify-center"><FiCheck size={24} className="text-green-400" /></div>
                        <p className="text-sm font-semibold text-gray-500">No cards expiring within {days} days</p>
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full"><thead><tr className="bg-gray-50/80 border-b border-gray-200 sticky top-0">
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Card No</th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Person</th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry</th>
                            <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Days Left</th>
                            <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr></thead><tbody>
                            {expiringCards.map((c: any) => {
                                const daysLeft = getDaysLeft(c.expiry_date);
                                const isExpired = daysLeft <= 0;
                                return (
                                    <tr key={c.id} className={`border-b border-gray-100 hover:bg-rose-50/30 transition-all duration-150 ${isExpired ? 'bg-red-50/50' : daysLeft <= 30 ? 'bg-amber-50/30' : ''}`}>
                                        <td className="px-3 py-2.5 text-xs font-bold text-indigo-600">{c.card_number}</td>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{c.person_name}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{c.person_type}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{new Date(c.expiry_date).toLocaleDateString()}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isExpired ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {isExpired ? 'EXPIRED' : `${daysLeft}d`}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <button onClick={() => renewCard(c)} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1 mx-auto"><FiRefreshCw size={10} /> Renew</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody></table>
                    </div>
                )}
            </div>
        </div>
    );
}
