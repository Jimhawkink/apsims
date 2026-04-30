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
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{expiredCards.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Already Expired</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{expiringCards.filter((c: any) => { const d = getDaysLeft(c.expiry_date); return d > 0 && d <= 30; }).length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Expiring 30d</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{expiringCards.length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Expiring {days}d</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{data.issuedCards.filter((c: any) => c.status === 'Active' && c.expiry_date && getDaysLeft(c.expiry_date) > days).length}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Valid</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FiClock className="text-rose-500" />
                    <label className="text-xs font-bold text-gray-600">Show cards expiring within:</label>
                    <select value={days} onChange={e => setDays(Number(e.target.value))} className="select-modern text-sm">
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>180 days</option>
                        <option value={365}>1 year</option>
                    </select>
                </div>
                {expiredCards.length > 0 && (
                    <button onClick={renewAll} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                        <FiRefreshCw size={13} /> Renew All Expired ({expiredCards.length})
                    </button>
                )}
            </div>

            {/* Expiring Cards List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {expiringCards.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2"><FiCheck size={32} className="text-green-400" /><p>No cards expiring within {days} days</p></div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Card No</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Person</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Days Left</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                        </tr></thead><tbody>
                            {expiringCards.map((c: any) => {
                                const daysLeft = getDaysLeft(c.expiry_date);
                                const isExpired = daysLeft <= 0;
                                return (
                                    <tr key={c.id} className={`border-b border-gray-100 ${isExpired ? 'bg-red-50/50' : daysLeft <= 30 ? 'bg-amber-50/50' : ''}`}>
                                        <td className="px-3 py-2 text-xs font-bold text-indigo-600">{c.card_number}</td>
                                        <td className="px-3 py-2 text-xs font-semibold">{c.person_name}</td>
                                        <td className="px-3 py-2 text-xs">{c.person_type}</td>
                                        <td className="px-3 py-2 text-xs">{new Date(c.expiry_date).toLocaleDateString()}</td>
                                        <td className="px-3 py-2">
                                            <span className={`text-xs font-bold ${isExpired ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-yellow-600'}`}>
                                                {isExpired ? 'EXPIRED' : `${daysLeft}d`}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => renewCard(c)} className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded hover:bg-green-100 flex items-center gap-1"><FiRefreshCw size={9} /> Renew</button>
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
