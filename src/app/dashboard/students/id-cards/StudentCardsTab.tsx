'use client';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCreditCard, FiPrinter, FiRefreshCw } from 'react-icons/fi';
import { StudentCardFront, StudentCardBack } from './CardPreviews';

export default function StudentCardsTab({ data }: any) {
    const [selForm, setSelForm] = useState('');
    const [selStream, setSelStream] = useState('');
    const [search, setSearch] = useState('');
    const [selStudents, setSelStudents] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [showBack, setShowBack] = useState(false);
    const [selTemplate, setSelTemplate] = useState<any>(null);

    const filtered = useMemo(() => data.students.filter((s: any) => {
        if (s.status && s.status !== 'Active') return false;
        if (selForm && String(s.form_id) !== selForm) return false;
        if (selStream && String(s.stream_id) !== selStream) return false;
        if (search) { const q = search.toLowerCase(); if (!`${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(q)) return false; }
        return true;
    }), [data.students, selForm, selStream, search]);

    useEffect(() => {
        if (!selTemplate && data.templates.length) {
            setSelTemplate(data.templates.find((t: any) => t.is_default && t.card_type === 'Student') || data.templates[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.templates]);

    useEffect(() => {
        setSelStudents(selectAll ? new Set(filtered.map((s: any) => s.id)) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectAll, filtered.length]);

    const selectedStudents = data.students.filter((s: any) => selStudents.has(s.id));

    const issueCards = async () => {
        if (selectedStudents.length === 0) return toast.error('Select students first');
        let count = 0;
        for (const s of selectedStudents) {
            const cardNum = data.generateCardNumber('STD');
            const expiry = new Date(); expiry.setFullYear(expiry.getFullYear() + 1);
            const { error } = await supabase.from('school_id_cards').insert([{
                card_number: cardNum, card_type: 'Student', person_id: s.id,
                person_name: `${s.first_name} ${s.last_name}`, person_type: 'Student',
                template_id: selTemplate?.id || null, form_id: s.form_id, stream_id: s.stream_id,
                issue_date: new Date().toISOString().split('T')[0],
                expiry_date: expiry.toISOString().split('T')[0],
                status: 'Active', qr_code: data.generateQRData(s, 'Student'),
                barcode: cardNum, photo_url: s.photo_url || null,
            }]);
            if (!error) {
                await supabase.from('school_students').update({
                    card_number: cardNum, card_issued_date: new Date().toISOString().split('T')[0],
                    card_expiry_date: expiry.toISOString().split('T')[0], card_status: 'Issued',
                }).eq('id', s.id);
                count++;
            }
        }
        toast.success(`Issued ${count} student ID cards`);
        data.fetchAll();
    };

    const toggle = (id: number) => {
        const n = new Set(selStudents);
        if (n.has(id)) n.delete(id); else n.add(id);
        setSelStudents(n);
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div><label className="lbl">Form</label><select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }} className="select-modern w-full text-sm"><option value="">All Forms</option>{data.forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="lbl">Stream</label><select value={selStream} onChange={e => setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All Streams</option>{data.streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="lbl">Search</label><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or Adm No..." className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 outline-none" /></div>
                    <div><label className="lbl">Template</label><select value={selTemplate?.id || ''} onChange={e => setSelTemplate(data.templates.find((t: any) => t.id === Number(e.target.value)) || null)} className="select-modern w-full text-sm"><option value="">Default</option>{data.templates.filter((t: any) => t.card_type === 'Student').map((t: any) => <option key={t.id} value={t.id}>{t.template_name}</option>)}</select></div>
                    <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 cursor-pointer py-2.5"><input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-xs font-semibold text-gray-600">All ({filtered.length})</span></label>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={issueCards} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        <FiCreditCard size={13} /> Issue Cards ({selStudents.size})
                    </button>
                    <button onClick={() => window.print()} disabled={selStudents.size === 0} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                        <FiPrinter size={13} /> Print ({selStudents.size})
                    </button>
                    <button onClick={() => setShowBack(!showBack)} className="px-4 py-2 text-xs font-bold rounded-xl border-2 border-indigo-200 text-indigo-600 flex items-center gap-1.5 hover:bg-indigo-50">
                        <FiRefreshCw size={13} /> {showBack ? 'Show Front' : 'Show Back'}
                    </button>
                </div>
            </div>

            {/* Student selection list */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="max-h-[250px] overflow-y-auto">
                    <table className="w-full"><thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <th className="px-3 py-2 w-10"></th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Adm No</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Form</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Card Status</th>
                    </tr></thead><tbody>
                        {filtered.map((s: any) => (
                            <tr key={s.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 cursor-pointer ${selStudents.has(s.id) ? 'bg-indigo-50' : ''}`} onClick={() => toggle(s.id)}>
                                <td className="px-3 py-2"><input type="checkbox" checked={selStudents.has(s.id)} readOnly className="w-4 h-4 rounded pointer-events-none" /></td>
                                <td className="px-3 py-2 text-sm font-bold text-blue-600">{s.admission_no || s.admission_number}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</td>
                                <td className="px-3 py-2 text-sm">{data.getFormName(s.form_id)}</td>
                                <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.card_status === 'Issued' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.card_status || 'Not Issued'}</span></td>
                            </tr>
                        ))}
                    </tbody></table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">{selStudents.size} of {filtered.length} selected</div>
            </div>

            {/* Card Preview */}
            {selectedStudents.length > 0 && (
                <div className="print-area">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedStudents.map((s: any) => (
                            <div key={s.id} className="flex flex-col items-center gap-1">
                                {showBack
                                    ? <StudentCardBack student={s} school={data.schoolDetails} template={selTemplate} />
                                    : <StudentCardFront student={s} school={data.schoolDetails} template={selTemplate} getFormName={data.getFormName} getStreamName={data.getStreamName} qrDataUrl={null} />
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sample Preview when nothing selected */}
            {selectedStudents.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FiCreditCard className="text-indigo-500" /> Sample Card Preview</h3>
                    <div className="flex flex-wrap gap-6 justify-center">
                        <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Front</p>
                            <StudentCardFront student={{ first_name: 'John', last_name: 'Doe', admission_no: 'APS/2025/001', form_id: 1, stream_id: 1, gender: 'Male', date_of_birth: '2010-05-15', guardian_name: 'Jane Doe', guardian_phone: '0712345678', card_number: 'APS-2025-123456', blood_group: 'O+' }} school={data.schoolDetails} template={selTemplate} getFormName={() => 'Form 1'} getStreamName={() => 'East'} qrDataUrl={null} />
                        </div>
                        <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Back</p>
                            <StudentCardBack student={{ first_name: 'John', last_name: 'Doe', card_number: 'APS-2025-123456', card_issued_date: '2025-01-15', guardian_name: 'Jane Doe', guardian_phone: '0712345678', blood_group: 'O+', medical_info: 'None' }} school={data.schoolDetails} template={selTemplate} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
