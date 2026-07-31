'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiMessageSquare, FiPlus, FiSearch, FiRefreshCw, FiX, FiSave, FiEdit2,
    FiTrash2, FiArrowRight, FiAlertCircle, FiSend, FiCopy, FiEye,
    FiUsers, FiSmartphone, FiBarChart2, FiFileText, FiActivity,
    FiCheckCircle, FiClock, FiDownload, FiBook,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Channel = 'SMS' | 'WhatsApp' | 'Both';
type Category = 'CBC Results' | 'Attendance' | 'SBA' | 'Report Card' | 'Motivational' | 'Meeting' | 'Fees' | 'General';

interface Template {
    id: string; name: string; category: Category; channel: Channel;
    body_en: string; body_sw: string; variables: string[];
    is_active: boolean; send_count?: number; created_at: string;
}

interface SendLog {
    id: string; template_id: string; template_name: string;
    recipient_type: string; recipient_count: number; channel: Channel;
    sent_by: string; sent_at: string; status: 'sent'|'failed'|'partial';
    message_preview: string;
}

const SQL = `CREATE TABLE IF NOT EXISTS school_cbc_sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, category text, channel text DEFAULT 'SMS',
  body_en text NOT NULL, body_sw text,
  variables text[], is_active boolean DEFAULT true,
  send_count int DEFAULT 0, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_cbc_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES school_cbc_sms_templates(id),
  template_name text, recipient_type text, recipient_count int DEFAULT 0,
  channel text, sent_by text, sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent', message_preview text
);
ALTER TABLE school_cbc_sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_send_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_cbc_sms_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_send_logs FOR ALL USING (true) WITH CHECK (true);`;

const DEMO_TEMPLATES: Template[] = [
    { id:'t1', name:'CBC Term Results — EE Achievement', category:'CBC Results', channel:'Both', body_en:'Dear Parent/Guardian, {student_name} from {form_name} has achieved EE (Exceeding Expectation) in {subject} for {term} {year}. Overall CBC competency: {overall_level}. Congratulations! — {school_name}', body_sw:'Ndugu Mzazi/Mlezi, {student_name} kutoka {form_name} amepata EE (Kuzidi Matarajio) katika {subject} kwa {term} {year}. Hongera! — {school_name}', variables:['{student_name}','{form_name}','{subject}','{term}','{year}','{overall_level}','{school_name}'], is_active:true, send_count:47, created_at:new Date().toISOString() },
    { id:'t2', name:'CBC Report Card Ready — Collection Notice', category:'Report Card', channel:'WhatsApp', body_en:'Dear {parent_name}, CBC Report Card for {student_name} ({form_name}) is ready for collection at {school_name}. Collection dates: {collection_dates}. Please bring your National ID. — {school_name} Administration', body_sw:'Ndugu {parent_name}, Ripoti ya CBC ya {student_name} ({form_name}) iko tayari kuchukuliwa. Tarehe za kuchukua: {collection_dates}. Tafadhali leta Kitambulisho. — {school_name}', variables:['{parent_name}','{student_name}','{form_name}','{collection_dates}','{school_name}'], is_active:true, send_count:128, created_at:new Date().toISOString() },
    { id:'t3', name:'SBA Task — Parent Alert', category:'SBA', channel:'SMS', body_en:'Dear Parent, {student_name} has a pending SBA task "{task_title}" in {subject} due {due_date}. Please ensure your child completes this at home. Contact teacher: {teacher_name}. — {school_name}', body_sw:'Ndugu Mzazi, {student_name} ana kazi ya SBA inayosubiri "{task_title}" katika {subject} ya kuwasilishwa {due_date}. Tafadhali msaidie mtoto wako. — {school_name}', variables:['{student_name}','{subject}','{task_title}','{due_date}','{teacher_name}','{school_name}'], is_active:true, send_count:23, created_at:new Date().toISOString() },
    { id:'t4', name:'Attendance Alert — Repeated Absence', category:'Attendance', channel:'Both', body_en:'URGENT: Dear {parent_name}, {student_name} from {form_name} has been absent for {absent_days} school days this {term}. Please contact the school immediately: {school_phone}. — {school_name}', body_sw:'HARAKA: Ndugu {parent_name}, {student_name} kutoka {form_name} amekosekana shuleni kwa siku {absent_days} mwezi huu. Tafadhali wasiliana na shule: {school_phone}. — {school_name}', variables:['{parent_name}','{student_name}','{form_name}','{absent_days}','{term}','{school_phone}','{school_name}'], is_active:true, send_count:15, created_at:new Date().toISOString() },
    { id:'t5', name:'CBC Motivational — Achievement Message', category:'Motivational', channel:'WhatsApp', body_en:'🌟 Dear {parent_name}, We celebrate {student_name}! They have shown remarkable growth in {subject} this {term}, demonstrating key CBC competencies. Keep encouraging them at home. — {school_name} CBC Team', body_sw:'🌟 Ndugu {parent_name}, Tunamsherehekea {student_name}! Ameonyesha maendeleo makubwa katika {subject} mwezi huu. Endelea kumtia moyo nyumbani. — {school_name}', variables:['{parent_name}','{student_name}','{subject}','{term}','{school_name}'], is_active:true, send_count:64, created_at:new Date().toISOString() },
    { id:'t6', name:'Parent Meeting — PTM Notice', category:'Meeting', channel:'Both', body_en:'Dear Parent/Guardian of {student_name}, You are invited to a Parent-Teacher Meeting at {school_name} on {meeting_date} at {meeting_time}. Venue: {venue}. RSVP: {school_phone}.', body_sw:'Ndugu Mzazi wa {student_name}, Unaalikwa kwenye Mkutano wa Wazazi-Walimu katika {school_name} tarehe {meeting_date} saa {meeting_time}. Mahali: {venue}.', variables:['{student_name}','{school_name}','{meeting_date}','{meeting_time}','{venue}','{school_phone}'], is_active:true, send_count:201, created_at:new Date().toISOString() },
    { id:'t7', name:'CBC At-Risk — Intervention Notice', category:'CBC Results', channel:'SMS', body_en:'Dear {parent_name}, {student_name} is showing BE (Below Expectation) in {subject} and requires additional support. We have scheduled remedial classes on {remedial_days}. Your involvement is critical. Contact: {teacher_name}.', body_sw:'Ndugu {parent_name}, {student_name} anaonyesha BE (Chini ya Matarajio) katika {subject}. Tumeandaa masomo ya ziada {remedial_days}. Wasiliana na: {teacher_name}.', variables:['{parent_name}','{student_name}','{subject}','{remedial_days}','{teacher_name}'], is_active:false, send_count:8, created_at:new Date().toISOString() },
];
const DEMO_LOGS: SendLog[] = [
    {id:'l1',template_id:'t2',template_name:'CBC Report Card Ready — Collection Notice',recipient_type:'All Parents Grade 7',recipient_count:128,channel:'WhatsApp',sent_by:'Admin',sent_at:new Date(Date.now()-3600000).toISOString(),status:'sent',message_preview:'Dear Parent, CBC Report Card for...'},
    {id:'l2',template_id:'t1',template_name:'CBC Term Results — EE Achievement',recipient_type:'EE Students Parents',recipient_count:47,channel:'SMS',sent_by:'HOD CBC',sent_at:new Date(Date.now()-7200000).toISOString(),status:'sent',message_preview:'Dear Parent/Guardian, John Doe from...'},
    {id:'l3',template_id:'t6',template_name:'Parent Meeting — PTM Notice',recipient_type:'All Parents',recipient_count:201,channel:'Both',sent_by:'Admin',sent_at:new Date(Date.now()-86400000).toISOString(),status:'sent',message_preview:'Dear Parent/Guardian of...'},
];

const CATEGORIES: Category[] = ['CBC Results','Attendance','SBA','Report Card','Motivational','Meeting','Fees','General'];
const CHANNEL_COLORS: Record<Channel,{bg:string;text:string}> = { SMS:{bg:'#D1FAE5',text:'#065F46'}, WhatsApp:{bg:'#DCFCE7',text:'#166534'}, Both:{bg:'#DBEAFE',text:'#1E40AF'} };
const CAT_COLORS: Record<Category,string> = { 'CBC Results':'#2563EB','Attendance':'#DC2626','SBA':'#7C3AED','Report Card':'#059669','Motivational':'#D97706','Meeting':'#0891B2','Fees':'#DB2777','General':'#64748B' };
const VAR_OPTIONS = ['{student_name}','{parent_name}','{form_name}','{subject}','{term}','{year}','{school_name}','{school_phone}','{teacher_name}','{overall_level}','{due_date}','{absent_days}','{collection_dates}','{meeting_date}','{meeting_time}','{venue}','{task_title}','{remedial_days}'];

function previewMessage(body:string, vars:Record<string,string>):string {
    let out=body;
    Object.entries(vars).forEach(([k,v])=>{ out=out.replace(new RegExp(k.replace(/[{}]/g,'\\$&'),'g'),v||k); });
    return out;
}
const DEMO_VARS:Record<string,string>={'{student_name}':'Amina Otieno','{parent_name}':'Mr. Otieno','{form_name}':'Grade 8A','{subject}':'Mathematics','{term}':'Term 2','{year}':'2025','{school_name}':'Alpha Academy','{school_phone}':'+254700000000','{teacher_name}':'Ms. Akinyi','{overall_level}':'EE','{due_date}':'15 Aug 2025','{absent_days}':'5','{collection_dates}':'Mon-Fri 9am-3pm','{meeting_date}':'20 Aug 2025','{meeting_time}':'9:00 AM','{venue}':'School Hall','{task_title}':'Water Cycle Project','{remedial_days}':'Mon & Wed'};

export default function CBCTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [logs, setLogs]           = useState<SendLog[]>([]);
    const [loading, setLoading]     = useState(true);
    const [dbReady, setDbReady]     = useState(false);
    const [tab, setTab]             = useState<'templates'|'compose'|'logs'>('templates');
    const [search, setSearch]       = useState('');
    const [fCat, setFCat]           = useState('');
    const [fChan, setFChan]         = useState('');
    const [showModal, setShowModal]  = useState(false);
    const [editTpl, setEditTpl]      = useState<Template|null>(null);
    const [saving, setSaving]        = useState(false);
    const [previewLang, setPreviewLang] = useState<'en'|'sw'>('en');
    const [selectedTpl, setSelectedTpl] = useState<Template|null>(null);
    const [composeChannel, setComposeChannel] = useState<Channel>('SMS');
    const [composeRecipients, setComposeRecipients] = useState('');
    const [sending, setSending]      = useState(false);

    const emptyTpl = { name:'', category:'General' as Category, channel:'SMS' as Channel, body_en:'', body_sw:'', variables:[] as string[], is_active:true };
    const [tForm, setTForm] = useState(emptyTpl);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { error } = await sb.from('school_cbc_sms_templates').select('id').limit(1);
            const ready = !error || error.code !== '42P01';
            setDbReady(ready);
            if (ready) {
                const [tR, lR] = await Promise.all([
                    sb.from('school_cbc_sms_templates').select('*').order('created_at', { ascending: false }),
                    sb.from('school_cbc_send_logs').select('*').order('sent_at', { ascending: false }).limit(100),
                ]);
                setTemplates(tR.data || []);
                setLogs(lR.data || []);
            } else { setTemplates(DEMO_TEMPLATES); setLogs(DEMO_LOGS); }
        } catch { setTemplates(DEMO_TEMPLATES); setLogs(DEMO_LOGS); }
        setLoading(false);
    }

    const filtered = useMemo(() => templates.filter(t =>
        (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body_en.toLowerCase().includes(search.toLowerCase()))
        && (!fCat || t.category === fCat)
        && (!fChan || t.channel === fChan)
    ), [templates, search, fCat, fChan]);

    const stats = useMemo(() => ({
        total: templates.length, active: templates.filter(t => t.is_active).length,
        totalSent: templates.reduce((a, t) => a + (t.send_count || 0), 0),
        sms: templates.filter(t => t.channel === 'SMS' || t.channel === 'Both').length,
        wa: templates.filter(t => t.channel === 'WhatsApp' || t.channel === 'Both').length,
        logs: logs.length,
    }), [templates, logs]);

    async function saveTpl() {
        if (!tForm.name || !tForm.body_en) { toast.error('Template name and English body are required'); return; }
        setSaving(true);
        try {
            const vars = Array.from(new Set((tForm.body_en + tForm.body_sw).match(/\{[a-z_]+\}/g) || []));
            const payload = { name:tForm.name, category:tForm.category, channel:tForm.channel, body_en:tForm.body_en, body_sw:tForm.body_sw||null, variables:vars, is_active:tForm.is_active };
            if (dbReady) {
                if (editTpl) { const {error}=await sb.from('school_cbc_sms_templates').update(payload).eq('id',editTpl.id); if(error)throw error; setTemplates(p=>p.map(t=>t.id===editTpl.id?{...t,...payload}:t)); }
                else { const {data,error}=await sb.from('school_cbc_sms_templates').insert({...payload,send_count:0}).select().single(); if(error)throw error; setTemplates(p=>[data,...p]); }
            } else {
                if (editTpl) setTemplates(p=>p.map(t=>t.id===editTpl.id?{...t,...payload}:t));
                else setTemplates(p=>[{...payload,id:`demo-${Date.now()}`,send_count:0,created_at:new Date().toISOString()},...p]);
            }
            toast.success(editTpl?'Template updated!':'✅ Template created!');
            setShowModal(false); setEditTpl(null); setTForm(emptyTpl);
        } catch (e:any) { toast.error(e.message); }
        setSaving(false);
    }

    async function del(id:string) {
        if (!confirm('Delete this template?')) return;
        if (dbReady) await sb.from('school_cbc_sms_templates').delete().eq('id', id);
        setTemplates(p => p.filter(t => t.id !== id));
        toast.success('Deleted');
    }

    async function sendMessages() {
        if (!selectedTpl || !composeRecipients) { toast.error('Select a template and recipients'); return; }
        setSending(true);
        try {
            const log = { template_id: selectedTpl.id, template_name: selectedTpl.name, recipient_type: composeRecipients, recipient_count: 1, channel: composeChannel, sent_by: 'Admin', status: 'sent' as const, message_preview: (previewLang === 'en' ? selectedTpl.body_en : selectedTpl.body_sw).slice(0, 100) };
            if (dbReady) {
                await sb.from('school_cbc_sms_templates').update({ send_count: (selectedTpl.send_count||0) + 1 }).eq('id', selectedTpl.id);
                const { data } = await sb.from('school_cbc_send_logs').insert(log).select().single();
                if (data) setLogs(p => [data, ...p]);
            } else { setLogs(p => [{ ...log, id: `demo-${Date.now()}`, sent_at: new Date().toISOString() }, ...p]); }
            setTemplates(p => p.map(t => t.id === selectedTpl.id ? { ...t, send_count: (t.send_count||0)+1 } : t));
            toast.success('✅ Messages dispatched!');
        } catch (e:any) { toast.error(e.message); }
        setSending(false);
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiMessageSquare size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading CBC Templates…</p>
                <p className="text-sm text-gray-500 mt-1">Bilingual SMS & WhatsApp Communication Centre</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* HEADER */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/communication" className="hover:text-white">Communication</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">📲 CBC SMS & WhatsApp Templates</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#059669,#25D366)'}}>
                                <FiMessageSquare size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">CBC SMS & WhatsApp Templates</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-400 text-green-900">BILINGUAL</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">EN + SW</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">Manage & Send CBC-specific SMS and WhatsApp messages to parents · English & Kiswahili</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/communication',l:'SMS Hub',ic:FiSend},{href:'/dashboard/communication/whatsapp-reports',l:'WhatsApp Reports',ic:FiMessageSquare}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={()=>{setTForm(emptyTpl);setEditTpl(null);setShowModal(true);}} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{background:'linear-gradient(135deg,#25D366,#059669)'}}>
                                <FiPlus size={15}/>New Template
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        {[['Languages','English & Kiswahili'],['Channels','SMS · WhatsApp · Both'],['Variables','Dynamic personalisation'],['Categories','8 CBC message types']].map(([k,v])=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}>
                                <span className="text-amber-400 font-bold">{k}:</span><span className="text-blue-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 border-t border-white/10">
                    {[{l:'Templates',v:stats.total,ic:FiFileText,c:'#F59E0B'},{l:'Active',v:stats.active,ic:FiCheckCircle,c:'#34D399'},{l:'Total Sent',v:stats.totalSent,ic:FiSend,c:'#60A5FA'},{l:'SMS Ready',v:stats.sms,ic:FiSmartphone,c:'#A78BFA'},{l:'WA Ready',v:stats.wa,ic:FiMessageSquare,c:'#4ADE80'},{l:'Send Logs',v:stats.logs,ic:FiClock,c:'#F472B6'}].map((s,i)=>(
                        <div key={i} className="px-4 py-3 flex items-center gap-3 border-r border-white/10 last:border-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.c+'22'}}><s.ic size={14} style={{color:s.c}}/></div>
                            <div><div className="text-xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-blue-300">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — <code className="text-xs bg-amber-100 px-1 rounded">school_cbc_sms_templates</code> table not yet created</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['templates','📋 Templates',FiFileText],['compose','📤 Compose & Send',FiSend],['logs','📊 Send Logs',FiBarChart2]] as const).map(([k,l,Ic])=>(
                    <button key={k} onClick={()=>setTab(k as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===k?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={13}/>{l}
                    </button>
                ))}
            </div>

            {/* ── TEMPLATES TAB ── */}
            {tab === 'templates' && (<>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                    <div className="flex flex-col lg:flex-row gap-3">
                        <div className="relative flex-1"><FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" placeholder="Search templates…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
                        <div className="flex flex-wrap gap-2">
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fCat} onChange={e=>setFCat(e.target.value)}><option value="">All Categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={fChan} onChange={e=>setFChan(e.target.value)}><option value="">All Channels</option>{(['SMS','WhatsApp','Both'] as Channel[]).map(c=><option key={c}>{c}</option>)}</select>
                            <button onClick={()=>{setSearch('');setFCat('');setFChan('');}} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1"><FiRefreshCw size={11}/>Clear</button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} template{filtered.length!==1?'s':''}{!dbReady?' · Demo Mode':''}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map(t => {
                        const catColor = CAT_COLORS[t.category] || '#64748B';
                        const chanC = CHANNEL_COLORS[t.channel];
                        return (
                            <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                                <div className="h-1" style={{background:catColor}}/>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{background:catColor}}>{t.category}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:chanC.bg,color:chanC.text}}>{t.channel}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.is_active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{t.is_active?'Active':'Inactive'}</span>
                                            </div>
                                            <h3 className="font-black text-gray-900 text-sm">{t.name}</h3>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={()=>{setSelectedTpl(t);setComposeChannel(t.channel==='Both'?'SMS':t.channel);setTab('compose');}} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Compose & Send"><FiSend size={13}/></button>
                                            <button onClick={()=>{setEditTpl(t);setTForm({name:t.name,category:t.category,channel:t.channel,body_en:t.body_en,body_sw:t.body_sw||'',variables:t.variables||[],is_active:t.is_active});setShowModal(true);}} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={13}/></button>
                                            <button onClick={()=>del(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={13}/></button>
                                        </div>
                                    </div>

                                    {/* Language toggle preview */}
                                    <div className="rounded-xl overflow-hidden border border-gray-100">
                                        <div className="flex">
                                            <button onClick={()=>setPreviewLang('en')} className={`flex-1 text-[10px] py-1.5 font-semibold transition-colors ${previewLang==='en'?'bg-blue-600 text-white':'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>🇬🇧 English</button>
                                            <button onClick={()=>setPreviewLang('sw')} className={`flex-1 text-[10px] py-1.5 font-semibold transition-colors ${previewLang==='sw'?'bg-red-600 text-white':'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>🇰🇪 Kiswahili</button>
                                        </div>
                                        <div className="bg-gray-50 p-3">
                                            <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-3">{previewLang==='en'?previewMessage(t.body_en,DEMO_VARS):previewMessage(t.body_sw||t.body_en,DEMO_VARS)}</p>
                                        </div>
                                    </div>

                                    {/* Variables + stats */}
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex flex-wrap gap-1">{(t.variables||[]).slice(0,4).map(v=><span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">{v}</span>)}{(t.variables||[]).length>4&&<span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{(t.variables||[]).length-4} more</span>}</div>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><FiSend size={9}/>{t.send_count||0} sent</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <button onClick={()=>{setTForm(emptyTpl);setEditTpl(null);setShowModal(true);}} className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-10 flex flex-col items-center justify-center gap-2 hover:border-green-400 hover:bg-green-50 transition-all group">
                        <FiPlus size={28} className="text-gray-300 group-hover:text-green-500"/>
                        <span className="text-sm font-semibold text-gray-400 group-hover:text-green-600">Create New Template</span>
                    </button>
                </div>
            </>)}

            {/* ── COMPOSE & SEND ── */}
            {tab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiSend className="text-green-600"/>Compose & Send</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Select Template *</label>
                                <select value={selectedTpl?.id||''} onChange={e=>setSelectedTpl(templates.find(t=>t.id===e.target.value)||null)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white">
                                    <option value="">— Select a template —</option>
                                    {templates.filter(t=>t.is_active).map(t=><option key={t.id} value={t.id}>[{t.channel}] {t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Send Channel</label>
                                <div className="flex gap-2">
                                    {(['SMS','WhatsApp'] as const).map(c=><button key={c} onClick={()=>setComposeChannel(c)} className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${composeChannel===c?'border-green-500 bg-green-50 text-green-700':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{c==='WhatsApp'?'💬':'📱'} {c}</button>)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Recipients *</label>
                                <select value={composeRecipients} onChange={e=>setComposeRecipients(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white">
                                    <option value="">— Select Recipients —</option>
                                    <option>All Parents</option><option>All Parents Grade 7</option><option>All Parents Grade 8</option><option>All Parents Grade 9</option>
                                    <option>Parents of EE Students</option><option>Parents of BE Students (At-Risk)</option>
                                    <option>Parents with Pending Fees</option><option>Parents of Absent Students</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Preview Language</label>
                                <div className="flex gap-2">
                                    <button onClick={()=>setPreviewLang('en')} className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${previewLang==='en'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200 text-gray-500'}`}>🇬🇧 English</button>
                                    <button onClick={()=>setPreviewLang('sw')} className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${previewLang==='sw'?'border-red-500 bg-red-50 text-red-700':'border-gray-200 text-gray-500'}`}>🇰🇪 Kiswahili</button>
                                </div>
                            </div>
                            <button onClick={sendMessages} disabled={sending||!selectedTpl||!composeRecipients} className={`w-full flex items-center justify-center gap-2 text-white py-3 rounded-xl text-sm font-bold shadow-lg transition-all ${!selectedTpl||!composeRecipients?'opacity-50 cursor-not-allowed':''}`} style={{background:'linear-gradient(135deg,#25D366,#059669)'}}>
                                {sending?<FiRefreshCw size={14} className="animate-spin"/>:<FiSend size={14}/>}Send {composeChannel} Messages
                            </button>
                        </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiEye className="text-indigo-600"/>Live Message Preview</h2>
                        {selectedTpl ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{background:CAT_COLORS[selectedTpl.category]}}>{selectedTpl.category}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:CHANNEL_COLORS[selectedTpl.channel].bg,color:CHANNEL_COLORS[selectedTpl.channel].text}}>{selectedTpl.channel}</span>
                                </div>
                                {/* WhatsApp bubble */}
                                {(composeChannel==='WhatsApp') ? (
                                    <div className="rounded-2xl overflow-hidden border border-gray-200" style={{background:'#ECE5DD'}}>
                                        <div className="px-3 py-2 flex items-center gap-2" style={{background:'#075E54'}}>
                                            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><FiMessageSquare size={12} color="white"/></div>
                                            <div><p className="text-white text-xs font-bold">Alpha Academy</p><p className="text-green-200 text-[10px]">School • Official</p></div>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-[85%]">
                                                <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{previewMessage(previewLang==='en'?selectedTpl.body_en:selectedTpl.body_sw||selectedTpl.body_en,DEMO_VARS)}</p>
                                                <p className="text-[9px] text-gray-400 text-right mt-1">{new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})} ✓✓</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                                        <div className="px-3 py-2 bg-gray-800 flex items-center justify-between">
                                            <span className="text-white text-[10px] font-bold">Alpha Academy</span>
                                            <span className="text-gray-400 text-[10px]">SMS</span>
                                        </div>
                                        <div className="p-4">
                                            <div className="bg-blue-500 rounded-xl rounded-bl-none p-3 max-w-[85%]">
                                                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{previewMessage(previewLang==='en'?selectedTpl.body_en:selectedTpl.body_sw||selectedTpl.body_en,DEMO_VARS)}</p>
                                            </div>
                                            <p className="text-[9px] text-gray-400 mt-1 ml-1">{new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-gray-700 mb-2">Variables used in this template:</p>
                                    <div className="flex flex-wrap gap-1">{(selectedTpl.variables||[]).map(v=><span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">{v}</span>)}</div>
                                    <p className="text-[10px] text-gray-400 mt-2">Variables will be filled from student/parent database when sending.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-400">
                                <FiMessageSquare size={40} className="mx-auto mb-3 opacity-30"/>
                                <p className="font-semibold text-sm">Select a template to preview</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── SEND LOGS ── */}
            {tab === 'logs' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}} className="text-white">
                                {['Date & Time','Template','Recipients','Channel','Sent By','Status','Preview'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {logs.length===0?<tr><td colSpan={7} className="text-center py-16 text-gray-400"><FiBarChart2 size={36} className="mx-auto mb-2 opacity-30"/><p>No send logs yet. Send a message to see history here.</p></td></tr>
                                :logs.map((l,i)=>{
                                    const chanC=CHANNEL_COLORS[l.channel];
                                    return <tr key={l.id} className={`border-b border-gray-100 hover:bg-green-50/20 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{new Date(l.sent_at).toLocaleString('en-KE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-900 max-w-[200px]"><span className="line-clamp-2">{l.template_name}</span></td>
                                        <td className="px-4 py-3"><p className="text-xs text-gray-700">{l.recipient_type}</p><p className="text-[10px] text-gray-400">{l.recipient_count} recipients</p></td>
                                        <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:chanC.bg,color:chanC.text}}>{l.channel}</span></td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{l.sent_by}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${l.status==='sent'?'bg-emerald-100 text-emerald-700':l.status==='failed'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{l.status}</span></td>
                                        <td className="px-4 py-3 text-[10px] text-gray-500 max-w-[200px]"><span className="line-clamp-2">{l.message_preview}…</span></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── CREATE/EDIT MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[93vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-black text-gray-900 flex items-center gap-2"><FiMessageSquare className="text-green-600"/>{editTpl?'Edit':'Create'} CBC Message Template</h2>
                            <button onClick={()=>{setShowModal(false);setEditTpl(null);setTForm(emptyTpl);}} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">Template Name *</label><input value={tForm.name} onChange={e=>setTForm(p=>({...p,name:e.target.value}))} placeholder="e.g. CBC Term Results — EE Achievement" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                                    <select value={tForm.category} onChange={e=>setTForm(p=>({...p,category:e.target.value as Category}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Channel</label>
                                    <select value={tForm.channel} onChange={e=>setTForm(p=>({...p,channel:e.target.value as Channel}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white">{(['SMS','WhatsApp','Both'] as Channel[]).map(c=><option key={c}>{c}</option>)}</select>
                                </div>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">🇬🇧 English Message Body *</label>
                                <textarea value={tForm.body_en} onChange={e=>setTForm(p=>({...p,body_en:e.target.value}))} rows={4} placeholder="Dear {parent_name}, {student_name} from {form_name}..." className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-700 mb-1">🇰🇪 Kiswahili Message Body</label>
                                <textarea value={tForm.body_sw} onChange={e=>setTForm(p=>({...p,body_sw:e.target.value}))} rows={4} placeholder="Ndugu {parent_name}, {student_name} kutoka {form_name}..." className="w-full border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">Available Variables (click to insert)</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {VAR_OPTIONS.map(v=>(
                                        <button key={v} type="button" onClick={()=>{navigator.clipboard.writeText(v);toast.success(`${v} copied!`);}} className="text-[10px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-mono hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1">
                                            <FiCopy size={8}/>{v}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Variables are auto-detected from your message body. Click any variable to copy it.</p>
                            </div>
                            <div className="flex items-center gap-2"><input type="checkbox" id="active-tpl" checked={tForm.is_active} onChange={e=>setTForm(p=>({...p,is_active:e.target.checked}))} className="rounded"/><label htmlFor="active-tpl" className="text-sm text-gray-700">Active (available for sending)</label></div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={()=>{setShowModal(false);setEditTpl(null);setTForm(emptyTpl);}} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 font-semibold">Cancel</button>
                            <button onClick={saveTpl} disabled={saving} className="flex-1 flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#25D366,#059669)'}}>
                                {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editTpl?'Update':'Create'} Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
