'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiRefreshCw, FiCheck, FiDollarSign } from 'react-icons/fi';

export default function LostCardsTab({ data }: any) {
    const [report, setReport] = useState({ card_id: '', reported_by: '', loss_description: '', replacement_fee: 500 });
    const [feePaid, setFeePaid] = useState<Record<number, boolean>>({});

    const activeCards = data.issuedCards.filter((c: any) => c.status === 'Active' || c.status === 'Lost');

    const reportLost = async () => {
        if (!report.card_id) return toast.error('Select a card');
        const card = data.issuedCards.find((c: any) => c.id === Number(report.card_id));
        if (!card) return;
        await supabase.from('school_id_cards').update({ status: 'Lost', lost_date: new Date().toISOString().split('T')[0] }).eq('id', card.id);
        await supabase.from('school_id_card_losses').insert([{
            card_id: card.id, reported_by: report.reported_by,
            loss_description: report.loss_description,
            replacement_fee: Number(report.replacement_fee) || 500, status: 'Reported',
        }]);
        toast.success('Lost card reported');
        setReport({ card_id: '', reported_by: '', loss_description: '', replacement_fee: 500 });
        data.fetchAll();
    };

    const markFeePaid = async (lossId: number) => {
        await supabase.from('school_id_card_losses').update({ fee_paid: true, fee_payment_ref: `CASH-${Date.now()}` }).eq('id', lossId);
        toast.success('Fee marked as paid');
        data.fetchAll();
    };

    const issueReplacement = async (lossId: number, cardId: number) => {
        const oldCard = data.issuedCards.find((c: any) => c.id === cardId);
        if (!oldCard) return;
        const newNum = data.generateCardNumber('REP');
        const { data: newCard } = await supabase.from('school_id_cards').insert([{
            card_number: newNum, card_type: oldCard.card_type, person_id: oldCard.person_id,
            person_name: oldCard.person_name, person_type: oldCard.person_type,
            template_id: oldCard.template_id, form_id: oldCard.form_id, stream_id: oldCard.stream_id,
            issue_date: new Date().toISOString().split('T')[0], expiry_date: oldCard.expiry_date,
            status: 'Active', replacement_count: (oldCard.replacement_count || 0) + 1,
            replacement_fee: oldCard.replacement_fee || 500,
            qr_code: oldCard.qr_code, barcode: newNum, photo_url: oldCard.photo_url,
        }]).select().single();
        if (newCard) {
            await supabase.from('school_id_card_losses').update({ replacement_issued: true, replacement_card_id: newCard.id, status: 'Replacement Issued' }).eq('id', lossId);
            if (oldCard.person_type === 'Student') {
                await supabase.from('school_students').update({ card_number: newNum, card_status: 'Issued' }).eq('id', oldCard.person_id);
            } else {
                await supabase.from('school_teachers').update({ card_number: newNum, card_status: 'Issued' }).eq('id', oldCard.person_id);
            }
        }
        toast.success('Replacement card issued');
        data.fetchAll();
    };

    return (
        <div className="space-y-4">
            {/* Report Lost Card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="p-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiAlertTriangle className="text-amber-500" /> Report Lost Card</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Card</label><select value={report.card_id} onChange={e => setReport({ ...report, card_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select Card...</option>{activeCards.map((c: any) => <option key={c.id} value={c.id}>{c.card_number} — {c.person_name}</option>)}</select></div>
                        <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Reported By</label><input type="text" value={report.reported_by} onChange={e => setReport({ ...report, reported_by: e.target.value })} placeholder="Name..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all" /></div>
                        <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Description</label><input type="text" value={report.loss_description} onChange={e => setReport({ ...report, loss_description: e.target.value })} placeholder="How it was lost..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all" /></div>
                        <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Fee (KES)</label><input type="number" value={report.replacement_fee} onChange={e => setReport({ ...report, replacement_fee: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all" /></div>
                    </div>
                    <button onClick={reportLost} className="mt-3 px-4 py-2.5 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 14px rgba(217,119,6,0.3)' }}>
                        <FiAlertTriangle size={13} /> Report Lost
                    </button>
                </div>
            </div>

            {/* Lost Cards List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">Lost Card Records</h3>
                    <div className="flex gap-2">
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{data.lostCards.filter((l: any) => l.status === 'Reported').length} Pending</span>
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">{data.lostCards.filter((l: any) => l.replacement_issued).length} Replaced</span>
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{data.lostCards.length} Total</span>
                    </div>
                </div>
                {data.lostCards.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center"><FiAlertTriangle size={24} className="text-gray-300" /></div>
                        <p className="text-sm font-semibold text-gray-500">No lost card records</p>
                        <p className="text-xs text-gray-400 mt-1">Lost cards will appear here when reported</p>
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full"><thead><tr className="bg-gray-50/80 border-b border-gray-200 sticky top-0">
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Card No</th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Person</th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reported</th>
                            <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fee</th>
                            <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead><tbody>
                            {data.lostCards.map((l: any) => {
                                const card = data.issuedCards.find((c: any) => c.id === l.card_id);
                                return (
                                    <tr key={l.id} className="border-b border-gray-100 hover:bg-amber-50/30 transition-all duration-150">
                                        <td className="px-3 py-2.5 text-xs font-bold text-amber-700">{card?.card_number || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{card?.person_name || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{l.reported_date ? new Date(l.reported_date).toLocaleDateString() : new Date(l.created_at).toLocaleDateString()}</td>
                                        <td className="px-3 py-2.5 text-xs">
                                            <span className={`font-bold ${l.fee_paid ? 'text-green-600' : 'text-red-600'}`}>KES {l.replacement_fee || 0}</span>
                                            {!l.fee_paid && <button onClick={() => markFeePaid(l.id)} className="ml-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg hover:bg-green-100 transition-colors inline-flex items-center gap-0.5"><FiDollarSign size={10} />Pay</button>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${l.status === 'Reported' ? 'bg-amber-100 text-amber-700' : l.status === 'Replacement Issued' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{l.status}</span></td>
                                        <td className="px-3 py-2.5 text-center">
                                            {!l.replacement_issued && l.fee_paid && (
                                                <button onClick={() => issueReplacement(l.id, l.card_id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 mx-auto"><FiRefreshCw size={11} /> Replace</button>
                                            )}
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
