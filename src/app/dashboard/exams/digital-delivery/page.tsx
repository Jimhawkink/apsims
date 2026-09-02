'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiMail, FiMessageSquare, FiSmartphone, FiSend, FiRefreshCw,
    FiCheckCircle, FiAlertTriangle, FiSearch, FiFilter, FiEye,
    FiUsers, FiBarChart2, FiClock, FiSettings, FiX, FiPrinter,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

/* ─── helpers ─── */
const fmt  = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const pct  = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

/* ─── GRADE SCALE ─── */
const GRADE_SCALE = [
    { min:75, grade:'A',  pts:12, color:'#059669' }, { min:70, grade:'A-', pts:11, color:'#10b981' },
    { min:65, grade:'B+', pts:10, color:'#0891b2' }, { min:60, grade:'B',  pts: 9, color:'2563eb' },
    { min:55, grade:'B-', pts: 8, color:'#4f46e5' }, { min:50, grade:'C+', pts: 7, color:'#7c3aed' },
    { min:45, grade:'C',  pts: 6, color:'#d97706' }, { min:40, grade:'C-', pts: 5, color:'#f59e0b' },
    { min:35, grade:'D+', pts: 4, color:'#ea580c' }, { min:30, grade:'D',  pts: 3, color:'#dc2626' },
    { min:25, grade:'D-', pts: 2, color:'#b91c1c' }, { min: 0, grade:'E',  pts: 1, color:'#7f1d1d' },
];
const grd = (s: number) => GRADE_SCALE.find(g => s >= g.min) || GRADE_SCALE[GRADE_SCALE.length - 1];

function StatusBadge({ status }: { status: string }) {
    const map: Record<string,[string,string]> = {
        sent:      ['#059669','#d1fae5'], pending:   ['#f59e0b','#fef3c7'],
        failed:    ['#dc2626','#fee2e2'], opened:    ['#4f46e5','#ede9fe'],
        delivered: ['#0ea5e9','#dbeafe'],
    };
    const [color, bg] = map[status?.toLowerCase()] || ['#64748b','#f1f5f9'];
    return <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background:bg, color }}>{status}</span>;
}

function GradePill({ grade }: { grade: string }) {
    const g = GRADE_SCALE.find(gs => gs.grade === grade);
    return <span className="text-[10px] font-black px-2 py-0.5 rounded-lg" style={{ background:`${g?.color||'#94a3b8'}20`, color:g?.color||'#94a3b8', border:`1px solid ${g?.color||'#94a3b8'}30` }}>{grade}</span>;
}

/* ══════════════════════════════════════════════════════════════ */
export default function DigitalDeliveryPage() {
    /* ─── State ─── */
    const [tab, setTab]             = useState<'send'|'logs'|'preview'|'settings'>('send');
    const [students, setStudents]   = useState<any[]>([]);
    const [forms, setForms]         = useState<any[]>([]);
    const [streams, setStreams]     = useState<any[]>([]);
    const [terms, setTerms]         = useState<any[]>([]);
    const [marks, setMarks]         = useState<any[]>([]);
    const [logs, setLogs]           = useState<any[]>([]);
    const [grading, setGrading]     = useState<any[]>([]);
    const [schoolDetails, setSchoolDetails] = useState<any>(null);
    const [smtpOk, setSmtpOk]       = useState<boolean|null>(null);
    const [loading, setLoading]     = useState(true);
    const [sending, setSending]     = useState(false);
    const [sendProgress, setSendProgress] = useState(0);

    /* Filters */
    const [selForm, setSelForm]       = useState('');
    const [selStream, setSelStream]   = useState('');
    const [selTerm, setSelTerm]       = useState('');
    const [selExamType, setSelExamType] = useState('End-Term');
    const [search, setSearch]           = useState('');
    const [selected, setSelected]       = useState<Set<number>>(new Set());
    const [channels, setChannels]       = useState({ email: true, whatsapp: false, sms: false });
    const [previewStudent, setPreviewStudent] = useState<any>(null);
    const [customMsg, setCustomMsg]     = useState('');
    const [emailSubject, setEmailSubject] = useState('');

    const EXAM_TYPES = ['End-Term','Mid-Term','CAT 1','CAT 2','Mock','Pre-Mock'];

    /* ─── FETCH ─── */
    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, fRes, stRes, tRes, lRes, grRes, schRes] = await Promise.all([
            supabase.from('school_students').select('id,first_name,middle_name,last_name,admission_no,admission_number,guardian_name,guardian_phone,guardian_email,form_id,stream_id,photo_url').eq('status','Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_terms').select('*').order('id',{ascending:false}),
            supabase.from('school_delivery_logs').select('*').order('sent_at',{ascending:false}).limit(300),
            supabase.from('school_grading_system').select('*').order('min_score',{ascending:false}),
            supabase.from('school_details').select('*').limit(1).maybeSingle(),
        ]);
        setStudents(sRes.data || []);
        setForms(fRes.data || []);
        setStreams(stRes.data || []);
        const tData = tRes.data || [];
        setTerms(tData);
        const cur = tData.find((t: any) => t.is_current) || tData[0];
        if (cur && !selTerm) setSelTerm(String(cur.id));
        setLogs(lRes.data || []);
        setGrading(grRes.data || []);
        setSchoolDetails(schRes.data);
        // Check SMTP
        if (schRes.data?.smtp_user && schRes.data?.smtp_pass) setSmtpOk(true);
        else if (typeof window !== 'undefined') {
            // check via env (truthy if API works)
            setSmtpOk(null); // unknown
        }
        setLoading(false);
    }, []);

    const fetchMarks = useCallback(async () => {
        if (!selTerm) return;
        const { data } = await supabase.from('school_exam_marks')
            .select('student_id,subject_id,score,grade,points,remarks,school_subjects(subject_name,subject_code)')
            .eq('term_id', Number(selTerm)).eq('exam_type', selExamType);
        setMarks(data || []);
    }, [selTerm, selExamType]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { fetchMarks(); }, [fetchMarks]);

    /* ─── HELPERS ─── */
    const getForm   = (id: any) => forms.find(f => f.id === id)?.form_name || '—';
    const getStream = (id: any) => streams.find(s => s.id === id)?.stream_name || '—';
    const getTerm   = (id: any) => terms.find(t => String(t.id) === String(id));
    const getGrade  = (score: number) => {
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score) || { grade:'E', points:1, remarks:'Very Poor' };
    };

    /* ─── STUDENT MARKS STATS ─── */
    const studentStats = useMemo(() => {
        return students.map(s => {
            const sMarks = marks.filter(m => m.student_id === s.id);
            const scores = sMarks.map(m => Number(m.score));
            const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const gradeEntry = getGrade(avg);
            const best7 = [...sMarks].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 7);
            const best7Pts = best7.reduce((a, m) => a + (Number(m.points) || getGrade(Number(m.score)).points), 0);
            const meanPts  = best7.length ? Math.round(best7Pts / best7.length) : 0;
            const meanGrade = GRADE_SCALE.find(g => g.pts <= meanPts)?.grade || (sMarks.length ? 'E' : '—');
            const passCount = scores.filter(sc => sc >= 50).length;
            const hasEmail = !!s.guardian_email;
            const hasPhone = !!s.guardian_phone;
            const alreadySent = logs.some(l => l.student_id === s.id && l.channel === 'email' && String(l.term_id) === selTerm);
            return { student: s, avg, gradeEntry, meanGrade, passCount, markCount: sMarks.length, hasEmail, hasPhone, alreadySent };
        });
    }, [students, marks, logs, grading, selTerm]);

    /* ─── FILTERS ─── */
    const filteredStats = useMemo(() => studentStats.filter(s => {
        const byForm   = !selForm   || String(s.student.form_id)   === selForm;
        const byStream = !selStream || String(s.student.stream_id) === selStream;
        const bySearch = !search    || `${s.student.first_name} ${s.student.last_name} ${s.student.admission_no || s.student.admission_number || ''}`.toLowerCase().includes(search.toLowerCase());
        return byForm && byStream && bySearch;
    }), [studentStats, selForm, selStream, search]);

    /* ─── DELIVERY STATS ─── */
    const stats = useMemo(() => ({
        totalSent:    logs.length,
        email:        logs.filter(l => l.channel === 'email').length,
        whatsapp:     logs.filter(l => l.channel === 'whatsapp').length,
        sms:          logs.filter(l => l.channel === 'sms').length,
        failed:       logs.filter(l => l.status === 'failed').length,
        opened:       logs.filter(l => l.status === 'opened').length,
        withEmail:    students.filter(s => s.guardian_email).length,
        withPhone:    students.filter(s => s.guardian_phone).length,
    }), [logs, students]);

    /* ─── TOGGLE SELECT ─── */
    const toggleSelect = (id: number) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const selectAll = () => setSelected(new Set(
        filteredStats.filter(s => channels.email ? s.hasEmail : s.hasPhone).map(s => s.student.id)
    ));
    const clearSelect = () => setSelected(new Set());

    /* ─── SEND REPORT CARDS ─── */
    const sendReportCards = async () => {
        if (!selected.size) return toast.error('Select at least one student');
        if (!channels.email && !channels.whatsapp && !channels.sms) return toast.error('Select at least one channel');
        if (!selTerm) return toast.error('Select a term');

        const toSend = filteredStats.filter(s => selected.has(s.student.id));
        setSending(true);
        setSendProgress(0);
        let successCount = 0, failCount = 0;

        for (let i = 0; i < toSend.length; i++) {
            const s = toSend[i];
            setSendProgress(Math.round(((i + 1) / toSend.length) * 100));

            if (channels.email && s.hasEmail) {
                try {
                    const res = await fetch('/api/email/send-report-card', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            student_id:     s.student.id,
                            term_id:        Number(selTerm),
                            exam_type:      selExamType,
                            to_email:       s.student.guardian_email,
                            to_name:        s.student.guardian_name,
                            custom_message: customMsg || undefined,
                            custom_subject: emailSubject || undefined,
                        }),
                    });
                    const data = await res.json();
                    if (res.ok) { successCount++; }
                    else { failCount++; console.error(`Email failed for ${s.student.first_name}:`, data.error); }
                } catch (err) { failCount++; }
            }

            if (channels.whatsapp && s.hasPhone) {
                const msg = buildWhatsAppMsg(s, getTerm(selTerm));
                await fetch('/api/whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: s.student.guardian_phone, message: msg, student_id: s.student.id }),
                }).catch(() => {});
                await supabase.from('school_delivery_logs').insert({ student_id: s.student.id, channel: 'whatsapp', recipient: s.student.guardian_phone, status: 'sent', report_type: 'report_card', term_id: Number(selTerm), sent_at: new Date().toISOString() });
                successCount++;
            }

            if (channels.sms && s.hasPhone) {
                const msg = buildSmsMsg(s, getTerm(selTerm));
                await fetch('/api/sms/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: s.student.guardian_phone, message: msg, student_id: s.student.id }),
                }).catch(() => {});
                await supabase.from('school_delivery_logs').insert({ student_id: s.student.id, channel: 'sms', recipient: s.student.guardian_phone, status: 'sent', report_type: 'report_card', term_id: Number(selTerm), sent_at: new Date().toISOString() });
                successCount++;
            }

            await new Promise(r => setTimeout(r, 200)); // Throttle
        }

        setSending(false);
        setSendProgress(0);
        setSelected(new Set());
        load();
        if (successCount > 0) toast.success(`✅ ${successCount} report card(s) sent successfully!`);
        if (failCount > 0)    toast.error(`❌ ${failCount} failed — check SMTP settings`);
    };

    /* ─── MESSAGE BUILDERS ─── */
    const buildWhatsAppMsg = (s: any, term: any) =>
        `📋 *APSIMS Report Card*\n\nDear ${s.student.guardian_name || 'Parent'},\n\nYour child *${s.student.first_name} ${s.student.last_name}* (${s.student.admission_no || s.student.admission_number}) has completed *${term?.term_name || 'Term'} ${selExamType}*.\n\n📊 *Performance Summary*\nAverage Score: *${s.avg.toFixed(1)}%* (${s.gradeEntry?.grade || '—'})\nSubjects Passed: *${s.passCount}/${s.markCount}*\nMean Grade: *${s.meanGrade}*\n\n${customMsg ? `\n${customMsg}\n` : ''}Contact school for full report: ${schoolDetails?.phone || ''}\n\n_APSIMS School Management System_`;

    const buildSmsMsg = (s: any, term: any) =>
        `APSIMS: Dear ${s.student.guardian_name || 'Parent'}, ${s.student.first_name}'s ${term?.term_name || 'Term'} report: Avg ${s.avg.toFixed(1)}% Grade ${s.gradeEntry?.grade || '—'}. Contact school for full card. ${schoolDetails?.phone || ''}`;

    /* ─── PREVIEW STUDENT MARKS ─── */
    const previewMarks = previewStudent ? marks.filter(m => m.student_id === previewStudent.student.id) : [];
    const previewAvg   = previewMarks.length ? previewMarks.reduce((a, m) => a + Number(m.score), 0) / previewMarks.length : 0;

    const tabBtn = (key: typeof tab, label: string, icon: any, badge?: number) => (
        <button onClick={() => setTab(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${tab === key ? 'bg-blue-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50'}`}>
            {icon}{label}
            {badge !== undefined && badge > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">{badge}</span>}
        </button>
    );

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"/></div>;

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background:'linear-gradient(135deg,#1e3a5f,#1d4ed8,#0891b2)' }}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">📬 Digital Report Card Delivery</h1>
                        <p className="text-sm text-white/70 mt-1">Send formatted HTML report cards to parents via Email · WhatsApp · SMS</p>
                    </div>
                    <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 self-start"><FiRefreshCw size={14}/></button>
                </div>

                {/* SMTP Status */}
                <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold w-fit ${smtpOk === true ? 'bg-green-500/20 text-green-200' : smtpOk === false ? 'bg-red-500/20 text-red-200' : 'bg-white/10 text-white/60'}`}>
                    {smtpOk === true ? <FiCheckCircle size={14}/> : smtpOk === false ? <FiAlertTriangle size={14}/> : <FiSettings size={14}/>}
                    {smtpOk === true ? '✅ Gmail SMTP Connected' : smtpOk === false ? '❌ SMTP Not Configured — Go to Settings → SMTP' : '⚙️ SMTP: Check Settings tab'}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                        { label:'Term', node: <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none"><option value="">— Term —</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year||''}</option>)}</select> },
                        { label:'Exam Type', node: <select value={selExamType} onChange={e => setSelExamType(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none">{EXAM_TYPES.map(e => <option key={e}>{e}</option>)}</select> },
                        { label:'Form', node: <select value={selForm} onChange={e => setSelForm(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none"><option value="">— All Forms —</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select> },
                        { label:'Stream', node: <select value={selStream} onChange={e => setSelStream(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none"><option value="">— All Streams —</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select> },
                    ].map(f => (
                        <div key={f.label}>
                            <p className="text-[10px] text-white/60 font-bold uppercase mb-1">{f.label}</p>
                            {f.node}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ KPI CARDS ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { l:'Total Sent',    v: stats.totalSent, c:'#6366f1', i:'📬' },
                    { l:'Email Sent',    v: stats.email,     c:'#0891b2', i:'✉️' },
                    { l:'WhatsApp Sent', v: stats.whatsapp,  c:'#059669', i:'💬' },
                    { l:'SMS Sent',      v: stats.sms,       c:'#d97706', i:'📱' },
                    { l:'Failed',        v: stats.failed,    c: stats.failed > 0 ? '#ef4444' : '#059669', i:'❌' },
                ].map(k => (
                    <div key={k.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <span className="text-xl">{k.i}</span>
                        <p className="text-2xl font-black mt-1" style={{ color: k.c }}>{k.v}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{k.l}</p>
                    </div>
                ))}
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-2 flex-wrap">
                {tabBtn('send',     'Send Report Cards', <FiSend size={11}/>, selected.size)}
                {tabBtn('logs',     'Delivery Logs',     <FiClock size={11}/>, stats.failed)}
                {tabBtn('preview',  'Preview Card',      <FiEye size={11}/>)}
                {tabBtn('settings', 'Settings',          <FiSettings size={11}/>)}
            </div>

            {/* ══════ SEND TAB ══════ */}
            {tab === 'send' && (
                <div className="space-y-4">
                    {/* Channel selector + Compose */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">📡 Select Delivery Channels</p>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {[
                                { key:'email',    label:'📧 Email',     desc:'Full HTML report card', count: stats.withEmail, color:'#0891b2' },
                                { key:'whatsapp', label:'💬 WhatsApp',   desc:'Text summary message', count: stats.withPhone, color:'#059669' },
                                { key:'sms',      label:'📱 SMS',        desc:'Short text message',   count: stats.withPhone, color:'#d97706' },
                            ].map(ch => (
                                <button key={ch.key}
                                    onClick={() => setChannels(p => ({ ...p, [ch.key as keyof typeof p]: !p[ch.key as keyof typeof p] }))}
                                    className={`px-5 py-3 rounded-xl border-2 text-left transition ${channels[ch.key as keyof typeof channels] ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <p className="font-black text-sm text-gray-800">{ch.label}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{ch.desc} · {ch.count} parents</p>
                                </button>
                            ))}
                        </div>

                        {channels.email && (
                            <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-xs font-black text-blue-700 flex items-center gap-1.5"><FiMail size={11}/>Email Customization</p>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Custom Email Subject (optional)</label>
                                    <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                                        placeholder="e.g. Term 1 2026 Report Card — Please Read"
                                        className="w-full mt-1 px-3 py-2 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Principal&apos;s Remarks / Custom Message (optional)</label>
                                    <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)}
                                        rows={3} placeholder="e.g. We congratulate all students on their hard work this term. Please note next term begins 6th January 2026..."
                                        className="w-full mt-1 px-3 py-2 text-sm border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-white"/>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress bar while sending */}
                    {sending && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-black text-blue-700">📤 Sending Report Cards… {sendProgress}%</p>
                                <span className="text-xs text-blue-500">{Math.round(selected.size * sendProgress / 100)}/{selected.size}</span>
                            </div>
                            <div className="w-full bg-blue-100 rounded-full h-3">
                                <div className="h-3 rounded-full bg-blue-500 transition-all duration-500" style={{ width:`${sendProgress}%` }}/>
                            </div>
                        </div>
                    )}

                    {/* Student Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                            <div className="relative flex-1 max-w-xs">
                                <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={13}/>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"/>
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <button onClick={selectAll}  className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition">Select All ({filteredStats.filter(s => channels.email ? s.hasEmail : s.hasPhone).length})</button>
                                <button onClick={clearSelect} className="px-3 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition">Clear</button>
                                <button onClick={sendReportCards} disabled={sending || !selected.size}
                                    className={`px-5 py-2 text-xs font-black text-white rounded-xl flex items-center gap-1.5 transition ${sending || !selected.size ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow'}`}>
                                    <FiSend size={11}/> {sending ? 'Sending…' : `Send to ${selected.size} Students`}
                                </button>
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['','Student','Adm No','Form','Avg Score','Grade','Email','Phone','Marks','Status','Preview'].map(h => (
                                        <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStats.map(s => (
                                    <tr key={s.student.id} className={`hover:bg-gray-50 transition ${selected.has(s.student.id) ? 'bg-blue-50/40' : ''}`}>
                                        <td className="px-3 py-2.5">
                                            <input type="checkbox" checked={selected.has(s.student.id)} onChange={() => toggleSelect(s.student.id)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700">{s.student.first_name?.[0]}{s.student.last_name?.[0]}</div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-xs">{s.student.first_name} {s.student.last_name}</p>
                                                    <p className="text-[9px] text-gray-400">{s.student.guardian_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{s.student.admission_no || s.student.admission_number}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{getForm(s.student.form_id)} {getStream(s.student.stream_id)}</td>
                                        <td className="px-3 py-2.5">
                                            {s.markCount > 0 ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${s.avg}%`, background: grd(s.avg).color }}/></div>
                                                    <span className="text-xs font-black" style={{ color: grd(s.avg).color }}>{s.avg.toFixed(1)}%</span>
                                                </div>
                                            ) : <span className="text-gray-300 text-xs">No marks</span>}
                                        </td>
                                        <td className="px-3 py-2.5">{s.markCount > 0 && <GradePill grade={s.meanGrade}/>}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            {s.hasEmail ? <FiCheckCircle size={13} className="text-green-500 mx-auto"/> : <FiX size={13} className="text-red-400 mx-auto"/>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            {s.hasPhone ? <FiCheckCircle size={13} className="text-green-500 mx-auto"/> : <FiX size={13} className="text-red-400 mx-auto"/>}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">{s.markCount}</td>
                                        <td className="px-3 py-2.5">
                                            {s.alreadySent
                                                ? <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ Sent</span>
                                                : <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pending</span>}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <button onClick={() => { setPreviewStudent(s); setTab('preview'); }}
                                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition"><FiEye size={12}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ DELIVERY LOGS ══════ */}
            {tab === 'logs' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { l:'Total Sent', v:stats.totalSent, c:'#6366f1', i:'📬' },
                            { l:'Email', v:stats.email, c:'#0891b2', i:'✉️' },
                            { l:'WhatsApp', v:stats.whatsapp, c:'#059669', i:'💬' },
                            { l:'Failed', v:stats.failed, c:stats.failed>0?'#ef4444':'#059669', i:'❌' },
                        ].map(k => (
                            <div key={k.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <span className="text-xl">{k.i}</span>
                                <p className="text-2xl font-black mt-1" style={{ color:k.c }}>{k.v}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">{k.l}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100"><p className="font-black text-gray-800">📋 Delivery History</p></div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['Student','Channel','Recipient','Status','Report Type','Term','Sent At'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {logs.slice(0, 100).map(l => {
                                    const stu = students.find(s => s.id === l.student_id);
                                    return (
                                        <tr key={l.id} className={`hover:bg-gray-50 ${l.status === 'failed' ? 'bg-red-50/20' : ''}`}>
                                            <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{stu ? `${stu.first_name} ${stu.last_name}` : `Student #${l.student_id}`}</td>
                                            <td className="px-4 py-2.5 text-xs">
                                                <span className="font-bold">{l.channel === 'email' ? '✉️' : l.channel === 'whatsapp' ? '💬' : '📱'} {l.channel}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-gray-500">{l.recipient}</td>
                                            <td className="px-4 py-2.5"><StatusBadge status={l.status || 'sent'}/></td>
                                            <td className="px-4 py-2.5 text-xs text-gray-400 capitalize">{l.report_type?.replace(/_/g, ' ') || '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-400">{getTerm(l.term_id)?.term_name || '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-gray-400">{l.sent_at ? fmt(l.sent_at) : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════ PREVIEW TAB ══════ */}
            {tab === 'preview' && (
                <div className="space-y-4">
                    {!previewStudent ? (
                        <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
                            <FiEye size={36} className="text-gray-200 mx-auto mb-3"/>
                            <p className="text-gray-400 font-bold">Select a student from the Send tab to preview their report card</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 flex items-center justify-between">
                                <p className="font-black text-gray-800">Previewing: {previewStudent.student.first_name} {previewStudent.student.last_name}</p>
                                <button onClick={() => setPreviewStudent(null)} className="text-xs text-gray-400 hover:text-red-500 font-bold">✕ Clear</button>
                            </div>

                            {/* Report card preview */}
                            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                {/* Header */}
                                <div className="p-6 text-white text-center" style={{ background:'linear-gradient(135deg,#064e3b,#059669,#0891b2)' }}>
                                    <p className="text-xl font-black">{schoolDetails?.school_name || 'APSIMS School'}</p>
                                    <p className="text-sm text-white/70">{schoolDetails?.address || ''}</p>
                                    <div className="mt-3 bg-white/15 rounded-xl px-6 py-2 inline-block">
                                        <p className="font-black text-white">📋 STUDENT REPORT CARD</p>
                                        <p className="text-xs text-white/70">{getTerm(selTerm)?.term_name} · {selExamType}</p>
                                    </div>
                                </div>

                                {/* Student Info */}
                                <div className="bg-gray-50 border-b border-gray-200 p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { l:'Student Name', v:`${previewStudent.student.first_name} ${previewStudent.student.last_name}` },
                                        { l:'Admission No', v: previewStudent.student.admission_no || previewStudent.student.admission_number },
                                        { l:'Form / Stream', v:`${getForm(previewStudent.student.form_id)} ${getStream(previewStudent.student.stream_id)}` },
                                        { l:'Guardian', v: previewStudent.student.guardian_name || '—' },
                                    ].map(k => (
                                        <div key={k.l}>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">{k.l}</p>
                                            <p className="font-bold text-gray-800 text-sm mt-0.5">{k.v}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary Cards */}
                                <div className="p-5 bg-white grid grid-cols-3 md:grid-cols-6 gap-3">
                                    {[
                                        { l:'Avg Score', v:`${previewAvg.toFixed(1)}%`, c: grd(previewAvg).color },
                                        { l:'Mean Grade', v: previewStudent.meanGrade, c: grd(previewAvg).color },
                                        { l:'Subjects', v:`${previewMarks.length}`, c:'#6366f1' },
                                        { l:'Passed', v:`${previewStudent.passCount}`, c:'#059669' },
                                        { l:'Guardian Email', v: previewStudent.hasEmail ? '✅ Yes' : '❌ No', c: previewStudent.hasEmail?'#059669':'#ef4444' },
                                        { l:'Guardian Phone', v: previewStudent.hasPhone ? '✅ Yes' : '❌ No', c: previewStudent.hasPhone?'#059669':'#ef4444' },
                                    ].map(k => (
                                        <div key={k.l} className="text-center p-3 rounded-xl border border-gray-100">
                                            <p className="text-lg font-black" style={{ color:k.c }}>{k.v}</p>
                                            <p className="text-[9px] text-gray-400 uppercase font-bold mt-0.5">{k.l}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Marks Table */}
                                <div className="p-5 bg-white">
                                    <p className="text-xs font-black text-gray-600 uppercase mb-3">Subject Marks — {selExamType}</p>
                                    <table className="w-full text-sm rounded-xl overflow-hidden border border-gray-100">
                                        <thead>
                                            <tr className="text-white text-xs" style={{ background:'linear-gradient(135deg,#064e3b,#059669)' }}>
                                                {['Subject','Code','Score','Grade','Points','Remarks'].map(h => <th key={h} className="px-4 py-2.5 text-left font-black uppercase tracking-wide">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {previewMarks.length === 0 ? (
                                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No marks found for this term/exam type</td></tr>
                                            ) : previewMarks.map((m, i) => {
                                                const score = Number(m.score);
                                                const ge = m.grade ? GRADE_SCALE.find(gs => gs.grade === m.grade) : grd(score);
                                                return (
                                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                        <td className="px-4 py-2.5 font-bold text-gray-800 text-xs">{(m.school_subjects as any)?.subject_name || '—'}</td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-400">{(m.school_subjects as any)?.subject_code || '—'}</td>
                                                        <td className="px-4 py-2.5 font-black text-sm" style={{ color: ge?.color }}>{score.toFixed(1)}%</td>
                                                        <td className="px-4 py-2.5"><GradePill grade={m.grade || ge?.grade || '—'}/></td>
                                                        <td className="px-4 py-2.5 text-xs font-bold text-gray-500">{m.points || ge?.pts}</td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-400">{m.remarks || ge?.grade}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {previewMarks.length > 0 && (
                                            <tfoot>
                                                <tr className="bg-gray-50 border-t-2 border-green-200">
                                                    <td colSpan={2} className="px-4 py-2.5 font-black text-green-700">OVERALL</td>
                                                    <td className="px-4 py-2.5 font-black" style={{ color: grd(previewAvg).color }}>{previewAvg.toFixed(1)}%</td>
                                                    <td className="px-4 py-2.5"><GradePill grade={previewStudent.meanGrade}/></td>
                                                    <td className="px-4 py-2.5 font-black text-indigo-600">{previewMarks.reduce((a, m) => a + (Number(m.points) || 0), 0)}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Send This Student */}
                                <div className="p-5 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                                    <button onClick={async () => {
                                        if (!previewStudent.hasEmail) return toast.error('No guardian email for this student');
                                        setSending(true);
                                        const res = await fetch('/api/email/send-report-card', {
                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ student_id: previewStudent.student.id, term_id: Number(selTerm), exam_type: selExamType, to_email: previewStudent.student.guardian_email, to_name: previewStudent.student.guardian_name, custom_message: customMsg, custom_subject: emailSubject }),
                                        });
                                        setSending(false);
                                        if (res.ok) { toast.success('✅ Report card emailed!'); load(); } else { const d = await res.json(); toast.error(d.error || 'Failed to send'); }
                                    }} disabled={sending || !previewStudent.hasEmail}
                                        className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50">
                                        <FiMail size={13}/> Send Email to {previewStudent.student.guardian_email || 'No email'}
                                    </button>
                                    <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition flex items-center gap-2">
                                        <FiPrinter size={13}/> Print
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════ SETTINGS TAB ══════ */}
            {tab === 'settings' && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
                        <p className="font-black text-gray-800 text-lg mb-1">⚙️ Gmail SMTP Configuration</p>
                        <p className="text-sm text-gray-500">Set in Vercel Environment Variables OR in Settings → SMTP Settings page</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label:'SMTP_HOST', val:'smtp.gmail.com', desc:'Gmail SMTP server' },
                                { label:'SMTP_PORT', val:'587', desc:'Gmail TLS port (587) or SSL (465)' },
                                { label:'SMTP_USER', val:'yourschool@gmail.com', desc:'Your school Gmail address' },
                                { label:'SMTP_PASS', val:'xxxx xxxx xxxx xxxx', desc:'16-char App Password (NOT Gmail password)' },
                                { label:'SMTP_FROM_NAME', val:'APSIMS School', desc:'Sender display name' },
                                { label:'SMTP_FROM_EMAIL', val:'yourschool@gmail.com', desc:'From email (usually same as SMTP_USER)' },
                            ].map(k => (
                                <div key={k.label} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                    <p className="text-xs font-black text-indigo-700 font-mono">{k.label}</p>
                                    <p className="text-sm font-bold text-gray-600 mt-1">{k.val}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{k.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="font-black text-amber-800 text-sm mb-2">⚠️ How to get Gmail App Password:</p>
                            <ol className="text-xs text-amber-700 space-y-1.5 list-decimal ml-4">
                                <li>Go to myaccount.google.com → Security</li>
                                <li>Enable 2-Step Verification</li>
                                <li>Search for <strong>&quot;App passwords&quot;</strong></li>
                                <li>Create app password → Select &quot;Mail&quot; → Select &quot;Other&quot; → type &quot;APSIMS&quot;</li>
                                <li>Copy the 16-character password → paste as <strong>SMTP_PASS</strong></li>
                            </ol>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="font-black text-green-800 text-sm">✅ Current SMTP Status</p>
                            <p className="text-xs text-green-700 mt-1">
                                {schoolDetails?.smtp_user ? `Configured: ${schoolDetails.smtp_user}` : 'Check Settings → SMTP Settings page or Vercel ENV vars'}
                            </p>
                        </div>
                    </div>

                    {/* AI Insight */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><HiSparkles size={12}/>Delivery Intelligence</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                            {[
                                { l:'Students with Email', v: stats.withEmail, tot: students.length, c:'#0891b2' },
                                { l:'Email Coverage', v:`${pct(stats.withEmail, students.length)}%`, c: pct(stats.withEmail, students.length) >= 80 ? '#059669' : '#f59e0b' },
                                { l:'Students with Phone', v: stats.withPhone, tot: students.length, c:'#059669' },
                                { l:'Phone Coverage', v:`${pct(stats.withPhone, students.length)}%`, c: pct(stats.withPhone, students.length) >= 80 ? '#059669' : '#f59e0b' },
                            ].map(k => (
                                <div key={k.l} className="bg-white rounded-xl p-3 border border-gray-100">
                                    <p className="text-xl font-black" style={{ color:k.c }}>{k.v}</p>
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">{k.l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
