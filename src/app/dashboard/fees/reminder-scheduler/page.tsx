'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { FiClock, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiDownload, FiSend, FiX, FiSave, FiCheck, FiBell, FiAlertTriangle } from 'react-icons/fi';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CHANNELS = ['WhatsApp', 'SMS', 'Both', 'Email'];
const FREQUENCIES = ['Once', 'Daily', 'Weekly', 'Every 2 Weeks', 'Monthly', 'Start of Term'];
const MSG_TEMPLATES = {
    gentle: 'Dear Parent, fees for [STUDENT] (Adm: [ADM]) of KES [BALANCE] are due. Please pay via MPESA Paybill [PAYBILL] or contact the school bursar. Thank you.',
    firm: 'URGENT: Dear Parent, [STUDENT] (Adm: [ADM]) has unpaid fees of KES [BALANCE]. Please settle immediately to avoid disruption of studies. APSIMS School.',
    final: 'FINAL NOTICE: [STUDENT] (Adm: [ADM]) owes KES [BALANCE] in school fees. Failure to pay by [DATE] will result in suspension. — The Principal, APSIMS.',
    waiver: 'Dear Parent, your fee waiver/bursary application for [STUDENT] has been received. Amount: KES [BALANCE]. Contact us for updates. APSIMS School.',
};

type Reminder = {
    id?: number; title: string; message: string; channel: string;
    frequency: string; min_balance: number; target_group: string;
    send_date?: string; status: string; sent_count?: number;
    last_sent?: string; notes?: string; created_at?: string;
};
const emptyReminder = (): Reminder => ({ title: '', message: MSG_TEMPLATES.gentle, channel: 'WhatsApp', frequency: 'Weekly', min_balance: 500, target_group: 'All Defaulters', status: 'Active' });

const STATUS_COLORS: Record<string, string> = { Active: 'bg-emerald-100 text-emerald-700', Paused: 'bg-yellow-100 text-yellow-700', Completed: 'bg-gray-100 text-gray-500', Draft: 'bg-blue-100 text-blue-700' };
const CHANNEL_EMOJI: Record<string, string> = { WhatsApp: '💬', SMS: '📱', Both: '📲', Email: '📧' };

function StatCard({ label, value, color, icon, sub }: any) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}>{icon}</div>
            <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>{sub && <p className="text-xs text-gray-400">{sub}</p>}</div>
        </div>
    );
}

export default function ReminderSchedulerPage() {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Reminder | null>(null);
    const [form, setForm] = useState<Reminder>(emptyReminder());
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof MSG_TEMPLATES>('gentle');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('school_reminder_schedules').select('*').order('created_at', { ascending: false });
        if (error) toast.error('Failed to load reminders');
        setReminders(data || []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const stats = useMemo(() => {
        const active = reminders.filter(r => r.status === 'Active').length;
        const totalSent = reminders.reduce((s, r) => s + Number(r.sent_count || 0), 0);
        const paused = reminders.filter(r => r.status === 'Paused').length;
        return { active, totalSent, paused, total: reminders.length };
    }, [reminders]);

    const openAdd = () => { setEditing(null); setForm(emptyReminder()); setShowModal(true); };
    const openEdit = (r: Reminder) => { setEditing(r); setForm({ ...r }); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyReminder()); };

    const applyTemplate = (key: keyof typeof MSG_TEMPLATES) => {
        setSelectedTemplate(key);
        setForm(f => ({ ...f, message: MSG_TEMPLATES[key] }));
    };

    const handleSave = async () => {
        if (!form.title) { toast.error('Enter reminder title'); return; }
        if (!form.message) { toast.error('Enter message'); return; }
        setSaving(true);
        const payload = { title: form.title, message: form.message, channel: form.channel, frequency: form.frequency, min_balance: Number(form.min_balance || 0), target_group: form.target_group, send_date: form.send_date || null, status: form.status, notes: form.notes };
        let error;
        if (editing?.id) ({ error } = await supabase.from('school_reminder_schedules').update(payload).eq('id', editing.id));
        else ({ error } = await supabase.from('school_reminder_schedules').insert(payload));
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Updated!' : 'Reminder scheduled!');
        closeModal(); fetchAll(); setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const { error } = await supabase.from('school_reminder_schedules').delete().eq('id', deleteId);
        if (error) toast.error(error.message);
        else { toast.success('Deleted'); setDeleteId(null); fetchAll(); }
    };

    const toggleStatus = async (r: Reminder) => {
        const newStatus = r.status === 'Active' ? 'Paused' : 'Active';
        const { error } = await supabase.from('school_reminder_schedules').update({ status: newStatus }).eq('id', r.id!);
        if (error) toast.error(error.message);
        else { toast.success(`Reminder ${newStatus}`); fetchAll(); }
    };

    const sendNow = (r: Reminder) => {
        toast.success(`📤 "${r.title}" queued for immediate send via ${r.channel}`);
        // In production this would trigger a webhook/edge function
    };

    const exportCSV = () => {
        const rows = [['Title', 'Channel', 'Frequency', 'Min Balance', 'Target', 'Status', 'Times Sent', 'Last Sent']];
        reminders.forEach(r => rows.push([r.title, r.channel, r.frequency, String(r.min_balance), r.target_group, r.status, String(r.sent_count || 0), r.last_sent ? fmtDate(r.last_sent) : 'Never']));
        const csv = rows.map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `reminder_schedules.csv`; a.click();
        toast.success('Exported!');
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><div className="text-center"><div className="w-12 h-12 border-4 border-gray-100 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Loading reminder schedules...</p></div></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}><FiClock size={18} /></span>
                        Fee Reminder Scheduler
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">Automate WhatsApp &bull; SMS &bull; Schedule reminders &bull; Target by balance &bull; Templates</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14} /> Export</button>
                    <button onClick={fetchAll} className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14} /></button>
                    <button onClick={openAdd} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                        <FiPlus size={16} /> New Reminder
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Active Schedules" value={String(stats.active)} icon={<FiBell size={18} />} color="linear-gradient(135deg,#7c3aed,#5b21b6)" />
                <StatCard label="Paused" value={String(stats.paused)} icon={<FiClock size={18} />} color="linear-gradient(135deg,#d97706,#b45309)" />
                <StatCard label="Total Sent" value={String(stats.totalSent)} icon={<FiSend size={18} />} color="linear-gradient(135deg,#059669,#047857)" sub="all-time" />
                <StatCard label="Total Schedules" value={String(stats.total)} icon={<FiClock size={18} />} color="linear-gradient(135deg,#0369a1,#0284c7)" />
            </div>

            {/* Info box */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
                <FiAlertTriangle className="text-violet-500 mt-0.5 shrink-0" size={16} />
                <div className="text-xs text-violet-800">
                    <p className="font-extrabold mb-1">How It Works</p>
                    <p>Schedule automatic fee reminders that go out to parents of students with outstanding balances above your minimum threshold. Use WhatsApp, SMS, or both. Templates are pre-filled — just customize and activate. The <b>Send Now</b> button triggers immediate dispatch (requires backend webhook setup).</p>
                </div>
            </div>

            {/* Reminder Cards */}
            {reminders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 py-14 text-center text-gray-400">
                    <FiBell size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No reminder schedules yet</p>
                    <button onClick={openAdd} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>Create First Reminder</button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {reminders.map(r => (
                        <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-5 ${r.status === 'Active' ? 'border-violet-200' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                        <span className="text-lg">{CHANNEL_EMOJI[r.channel] || '📲'}</span>
                                        <span className="font-extrabold text-gray-800">{r.title}</span>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">{r.frequency}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{r.channel}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-1 font-mono leading-relaxed">{r.message.substring(0, 200)}{r.message.length > 200 ? '...' : ''}</p>
                                    <div className="flex gap-4 mt-2 flex-wrap text-xs text-gray-500">
                                        <span>👥 Target: <b className="text-gray-700">{r.target_group}</b></span>
                                        <span>💰 Min Balance: <b className="text-gray-700">KES {Number(r.min_balance).toLocaleString()}</b></span>
                                        {r.sent_count && <span>📤 Sent: <b className="text-gray-700">{r.sent_count} times</b></span>}
                                        {r.last_sent && <span>📅 Last: <b className="text-gray-700">{fmtDate(r.last_sent)}</b></span>}
                                        {r.send_date && <span>📅 Next: <b className="text-violet-700">{fmtDate(r.send_date)}</b></span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap shrink-0">
                                    <button onClick={() => sendNow(r)} className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-violet-700"><FiSend size={12} /> Send Now</button>
                                    <button onClick={() => toggleStatus(r)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${r.status === 'Active' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                        {r.status === 'Active' ? 'Pause' : 'Activate'}
                                    </button>
                                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100"><FiEdit2 size={14} /></button>
                                    <button onClick={() => setDeleteId(r.id!)} className="p-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900">{editing ? 'Edit Reminder' : 'New Reminder Schedule'}</h2>
                            <button onClick={closeModal} className="p-2 rounded-xl hover:bg-gray-100"><FiX size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Template picker */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Templates</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(Object.keys(MSG_TEMPLATES) as Array<keyof typeof MSG_TEMPLATES>).map(key => (
                                        <button key={key} onClick={() => applyTemplate(key)} className={`py-2 rounded-xl text-xs font-bold border transition-all ${selectedTemplate === key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {key === 'gentle' && '😊 Gentle'}
                                            {key === 'firm' && '⚠️ Firm'}
                                            {key === 'final' && '🔴 Final'}
                                            {key === 'waiver' && '🎓 Waiver'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Reminder Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly Fee Reminder - Term 1" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-violet-400" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Channel</label>
                                    <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{CHANNELS.map(c => <option key={c}>{c}</option>)}</select>
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Frequency</label>
                                    <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none">{FREQUENCIES.map(fr => <option key={fr}>{fr}</option>)}</select>
                                </div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Min. Balance (KES)</label><input type="number" value={form.min_balance} onChange={e => setForm(f => ({ ...f, min_balance: Number(e.target.value) }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Target Group</label><input value={form.target_group} onChange={e => setForm(f => ({ ...f, target_group: e.target.value }))} placeholder="All Defaulters / Form 4 / etc." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start / Send Date</label><input type="date" value={form.send_date || ''} onChange={e => setForm(f => ({ ...f, send_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none" /></div>
                                <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none"><option>Active</option><option>Paused</option><option>Draft</option></select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Message Template *</label>
                                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none font-mono leading-relaxed" placeholder="Use [STUDENT], [ADM], [BALANCE], [DATE] as placeholders" />
                                    <p className="text-[10px] text-gray-400 mt-1">Placeholders: [STUDENT] = student name, [ADM] = admission no, [BALANCE] = outstanding amount, [DATE] = today&apos;s date</p>
                                </div>
                            </div>
                            <div><label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none resize-none" /></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}><FiSave size={16} />{saving ? 'Saving...' : editing ? 'Update' : 'Schedule'}</button>
                        </div>
                    </div>
                </div>
            )}
            {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"><div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><FiTrash2 className="text-red-500" size={20} /></div><h3 className="text-center font-extrabold text-gray-900 mb-2">Delete Schedule?</h3><p className="text-center text-sm text-gray-400 mb-4">This reminder schedule will be permanently deleted.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-100 text-gray-600">Cancel</button><button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white">Delete</button></div></div></div>}
        </div>
    );
}
