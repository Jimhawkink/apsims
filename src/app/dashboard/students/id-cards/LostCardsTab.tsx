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
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiAlertTriangle className="text-amber-500" /> Report Lost Card</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="lbl">Card</label><select value={report.card_id} onChange={e => setReport({ ...report, card_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select Card...</option>{activeCards.map((c: any) => <option key={c.id} value={c.id}>{c.card_number} — {c.person_name}</option>)}</select></div>
                    <div><label className="lbl">Reported By</label><input type="text" value={report.reported_by} onChange={e => setReport({ ...report, reported_by: e.target.value })} placeholder="Name..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
                    <div><label className="lbl">Description</label><input type="text" value={report.loss_description} onChange={e => setReport({ ...report, loss_description: e.target.value })} placeholder="How it was lost..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
                    <div><label className="lbl">Replacement Fee (KES)</label><input type="number" value={report.replacement_fee} onChange={e => setReport({ ...report, replacement_fee: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-amber-400 outline-none" /></div>
                </div>
                <button onClick={reportLost} className="mt-3 px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                    <FiAlertTriangle size={13} /> Report Lost
                </button>
            </div>

            {/* Lost Cards List */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">Lost Card Records ({data.lostCards.length})</h3>
                    <div className="flex gap-2">
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{data.lostCards.filter((l: any) => l.status === 'Reported').length} Pending</span>
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{data.lostCards.filter((l: any) => l.replacement_issued).length} Replaced</span>
                    </div>
                </div>
                {data.lostCards.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No lost card records</div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Card No</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Person</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Reported</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Fee</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr></thead><tbody>
                            {data.lostCards.map((l: any) => {
                                const card = data.issuedCards.find((c: any) => c.id === l.card_id);
                                return (
                                    <tr key={l.id} className="border-b border-gray-100">
                                        <td className="px-3 py-2 text-xs font-bold text-amber-700">{card?.card_number || '-'}</td>
                                        <td className="px-3 py-2 text-xs font-semibold">{card?.person_name || '-'}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{l.reported_date ? new Date(l.reported_date).toLocaleDateString() : '-'}</td>
                                        <td className="px-3 py-2 text-xs">
                                            <span className={`font-bold ${l.fee_paid ? 'text-green-600' : 'text-red-600'}`}>KES {l.replacement_fee || 0}</span>
                                            {!l.fee_paid && <button onClick={() => markFeePaid(l.id)} className="ml-2 text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded hover:bg-green-100"><FiDollarSign size={9} className="inline" /> Pay</button>}
                                        </td>
                                        <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.status === 'Reported' ? 'bg-amber-100 text-amber-700' : l.status === 'Replacement Issued' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{l.status}</span></td>
                                        <td className="px-3 py-2">
                                            {!l.replacement_issued && l.fee_paid && (
                                                <button onClick={() => issueReplacement(l.id, l.card_id)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 flex items-center gap-1"><FiRefreshCw size={10} /> Issue Replacement</button>
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
