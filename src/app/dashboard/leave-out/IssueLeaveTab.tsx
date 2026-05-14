'use client';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSearch, FiSend, FiCheckCircle, FiClock, FiUser, FiPhone, FiPlus, FiCalendar, FiMessageSquare, FiAlertCircle, FiPrinter } from 'react-icons/fi';

interface Props {
    students: any[]; teachers: any[]; forms: any[]; streams: any[];
    leaveOuts: any[]; fetchAll: () => void; handleSendSMS: (leave: any) => void;
}

const REASONS = ['Medication','Discipline','Personal','Emergency','Appointment','Illness','Family','Other'];
const RC: Record<string,string> = { Medication:'#3b82f6', Discipline:'#ef4444', Personal:'#8b5cf6', Emergency:'#f97316', Appointment:'#06b6d4', Illness:'#22c55e', Family:'#f59e0b', Other:'#6b7280' };

export default function IssueLeaveTab({ students, teachers, forms, streams, leaveOuts, fetchAll, handleSendSMS }: Props) {
    const [search, setSearch] = useState('');
    const [sel, setSel] = useState<any>(null);
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [leaveDays, setLeaveDays] = useState(0);
    const [expectedReturn, setExpectedReturn] = useState('');
    const [authBy, setAuthBy] = useState('');
    const [autoSMS, setAutoSMS] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [lastIssued, setLastIssued] = useState<any>(null);

    const filtered = useMemo(() => {
        if (!search || search.length < 2) return [];
        const q = search.toLowerCase();
        return students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.admission_number||'').toLowerCase().includes(q)).slice(0, 8);
    }, [search, students]);

    const fn = (id: number) => forms.find((f:any) => f.id === id)?.form_name || '';
    const sn = (id: number) => streams.find((s:any) => s.id === id)?.stream_name || '';

    const history = useMemo(() => sel ? leaveOuts.filter(l => l.student_id === sel.id).slice(0, 5) : [], [sel, leaveOuts]);
    const totalDays = useMemo(() => sel ? leaveOuts.filter(l => l.student_id === sel.id).reduce((s:number, l:any) => s + (l.leave_days||0), 0) : 0, [sel, leaveOuts]);

    const handleIssue = async () => {
        if (!sel) { toast.error('Select a student'); return; }
        if (!reason) { toast.error('Select a reason'); return; }
        if (!authBy) { toast.error('Select authorizing teacher'); return; }
        setIssuing(true);
        const now = new Date().toISOString();
        const { data, error } = await (supabase.from('school_leave_outs') as any)
            .insert({ student_id: sel.id, reason, reason_details: details||null, leave_days: leaveDays||0, expected_return: expectedReturn||null, time_left: now, teacher_name: authBy, status: 'Out', sms_sent: false, sms_phone: sel.guardian_phone||'' })
            .select('*, school_students(id, first_name, last_name, admission_number, form_id, stream_id, guardian_phone, guardian_name)').single();
        if (error) { toast.error(`Failed: ${error.message}`); setIssuing(false); return; }
        toast.success(`✅ Leave issued for ${sel.first_name} ${sel.last_name}`, { duration: 4000 });
        setLastIssued(data);
        if (autoSMS && sel.guardian_phone) await handleSendSMS(data);
        setSel(null); setSearch(''); setReason(''); setDetails(''); setLeaveDays(0); setExpectedReturn(''); setAuthBy('');
        setIssuing(false); fetchAll();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50" style={{ borderLeftWidth: 4, borderLeftColor: '#f97316' }}>
                        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><FiPlus size={16} className="text-orange-500" /> Issue Leave Pass</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">Search student → Select reason → Authorize → Issue</p>
                    </div>
                    <div className="p-6 space-y-5">
                        {/* Student Search */}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2"><FiSearch size={13}/> Search Student</label>
                            <div className="relative">
                                <input value={search} onChange={e => { setSearch(e.target.value); setSel(null); }} placeholder="Type name or admission number..."
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition" />
                                <FiSearch className="absolute left-3.5 top-3.5 text-gray-400" size={15} />
                            </div>
                            {filtered.length > 0 && !sel && (
                                <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-auto">
                                    {filtered.map(s => (
                                        <button key={s.id} onClick={() => { setSel(s); setSearch(`${s.first_name} ${s.last_name}`); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition text-left border-b border-gray-50 last:border-0">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                                                {s.first_name[0]}{s.last_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                                                <p className="text-[10px] text-gray-400">{s.admission_number} · {fn(s.form_id)} {sn(s.stream_id)}</p>
                                            </div>
                                            {s.guardian_phone && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">📱 {s.guardian_phone}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Student Card */}
                        {sel && (
                            <div className="rounded-xl p-4 border-2 border-orange-200" style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md" style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                                            {sel.first_name[0]}{sel.last_name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{sel.first_name} {sel.last_name}</p>
                                            <p className="text-xs text-gray-500">{sel.admission_number} · {fn(sel.form_id)} {sn(sel.stream_id)}</p>
                                            {sel.guardian_phone && <p className="text-[10px] text-green-700 mt-0.5 font-semibold flex items-center gap-1"><FiPhone size={9}/> Guardian: {sel.guardian_name||'Parent'} — {sel.guardian_phone}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-orange-600">LEAVE HISTORY</p>
                                        <p className="text-lg font-black text-orange-700">{totalDays}</p>
                                        <p className="text-[9px] text-orange-500">days this term</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reason Selection */}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2"><FiAlertCircle size={13}/> Reason for Leave</label>
                            <div className="grid grid-cols-4 gap-2">
                                {REASONS.map(r => (
                                    <button key={r} onClick={() => setReason(r)} className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2"
                                        style={reason===r ? { background:`${RC[r]}15`, borderColor:RC[r], color:RC[r], boxShadow:`0 4px 14px -3px ${RC[r]}40` } : { background:'#f9fafb', borderColor:'#e5e7eb', color:'#6b7280' }}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Details */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Details (optional)</label>
                            <textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Additional details..." rows={2}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition resize-none" />
                        </div>

                        {/* Leave Days + Expected Return */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5"><FiCalendar size={13}/> Leave Days</label>
                                <input type="number" min={0} max={30} value={leaveDays} onChange={e => setLeaveDays(parseInt(e.target.value)||0)} placeholder="0 = same day"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition" />
                                <p className="text-[10px] text-gray-400 mt-1">0 = leaves and returns today</p>
                            </div>
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5"><FiClock size={13}/> Expected Return</label>
                                <input type="datetime-local" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition" />
                            </div>
                        </div>

                        {/* Authorized By */}
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5"><FiUser size={13}/> Authorized By</label>
                            <select value={authBy} onChange={e => setAuthBy(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition">
                                <option value="">Select teacher...</option>
                                {teachers.map(t => <option key={t.id} value={`${t.first_name} ${t.last_name}`}>{t.first_name} {t.last_name}</option>)}
                            </select>
                        </div>

                        {/* Auto SMS Toggle */}
                        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: autoSMS ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : '#f9fafb', border: autoSMS ? '1px solid #bbf7d0' : '1px solid #e5e7eb' }}>
                            <div className="flex items-center gap-2.5">
                                <FiMessageSquare size={16} className={autoSMS ? 'text-green-600' : 'text-gray-400'} />
                                <div>
                                    <p className="text-sm font-bold" style={{ color: autoSMS ? '#15803d' : '#6b7280' }}>Auto-Send SMS to Parent</p>
                                    <p className="text-[10px]" style={{ color: autoSMS ? '#16a34a' : '#9ca3af' }}>{sel?.guardian_phone ? `Will send to ${sel.guardian_phone}` : 'No guardian phone on file'}</p>
                                </div>
                            </div>
                            <button onClick={() => setAutoSMS(!autoSMS)} className="relative w-12 h-6 rounded-full transition-all" style={{ background: autoSMS ? '#22c55e' : '#d1d5db' }}>
                                <div className="absolute w-5 h-5 bg-white rounded-full shadow-md top-0.5 transition-all" style={{ left: autoSMS ? '26px' : '2px' }} />
                            </button>
                        </div>

                        {/* Issue Button */}
                        <button onClick={handleIssue} disabled={issuing||!sel||!reason||!authBy}
                            className="w-full py-3.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
                            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 8px 25px -5px rgba(249,115,22,0.4)' }}>
                            {issuing ? <><FiClock size={15} className="animate-spin"/> Issuing...</> : <><FiCheckCircle size={15}/> Issue Leave Pass</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="space-y-4">
                {lastIssued && (
                    <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: '#22c55e' }}>
                        <div className="px-5 py-3 border-b border-green-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-green-800 flex items-center gap-1.5"><FiCheckCircle size={14}/> Last Issued</h3>
                            <button onClick={() => window.print()} className="text-[10px] font-bold text-green-600 hover:text-green-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-green-50 transition"><FiPrinter size={11}/> Print</button>
                        </div>
                        <div className="p-4 space-y-2">
                            <p className="text-sm font-bold text-gray-900">{lastIssued.school_students?.first_name} {lastIssued.school_students?.last_name}</p>
                            <p className="text-xs text-gray-500">{lastIssued.school_students?.admission_number}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background:`${RC[lastIssued.reason]}15`, color:RC[lastIssued.reason] }}>{lastIssued.reason}</span>
                                {lastIssued.leave_days > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">{lastIssued.leave_days} days</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Left: {new Date(lastIssued.time_left).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})} · Auth: {lastIssued.teacher_name}</p>
                            {lastIssued.sms_sent && <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1"><FiMessageSquare size={10}/> SMS sent ✅</p>}
                        </div>
                    </div>
                )}

                {sel && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-50">
                            <h3 className="text-sm font-bold text-gray-800">Leave History</h3>
                            <p className="text-[10px] text-gray-400">{sel.first_name}&apos;s recent leave-outs</p>
                        </div>
                        {history.length === 0 ? <div className="p-6 text-center text-gray-400 text-xs">No previous records</div> : (
                            <div className="divide-y divide-gray-50">
                                {history.map((l:any) => (
                                    <div key={l.id} className="px-5 py-3 hover:bg-gray-50 transition">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-gray-700">{l.reason}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.status==='Out' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{l.status}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(l.time_left).toLocaleDateString('en-GB')} · {l.leave_days>0 ? `${l.leave_days} days` : 'Same day'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Today&apos;s Reasons</h3>
                    <div className="space-y-2.5">
                        {REASONS.map(r => {
                            const td = new Date().toISOString().split('T')[0];
                            const c = leaveOuts.filter(l => l.reason===r && new Date(l.created_at).toISOString().split('T')[0]===td).length;
                            if(!c) return null;
                            return (<div key={r} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:RC[r]}}/><span className="text-xs font-medium text-gray-600">{r}</span></div><span className="text-xs font-bold text-gray-900">{c}</span></div>);
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
