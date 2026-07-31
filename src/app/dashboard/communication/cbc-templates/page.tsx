'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiMessageSquare, FiPlus, FiSearch, FiSave, FiTrash2, FiEdit2, FiX,
    FiChevronRight, FiDownload, FiRefreshCw, FiSend, FiUsers, FiBook,
    FiCopy, FiCheckCircle, FiAlertCircle, FiPhone, FiMail, FiZap,
    FiStar, FiFilter, FiBarChart2, FiClock, FiActivity, FiSettings,
    FiEye, FiGrid, FiList, FiTrendingUp, FiFileText, FiAward, FiLayers,
    FiToggleLeft, FiToggleRight, FiArrowRight, FiGlobe,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type ChannelType = 'sms' | 'whatsapp' | 'both';
type TriggerType = 'manual' | 'term_end' | 'competency_drop' | 'portfolio_update' | 'sba_complete' | 'at_risk';

interface CBCTemplate {
    id: string;
    name: string;
    description: string;
    channel: ChannelType;
    trigger: TriggerType;
    competency_level?: CompLevel | 'all';
    subject_line?: string;
    message_en: string;
    message_sw?: string;
    variables: string[];
    active: boolean;
    times_used: number;
    last_used?: string;
    created_at: string;
}

interface SendLog {
    id: string;
    template_id: string;
    template_name: string;
    student_name: string;
    parent_phone: string;
    channel: ChannelType;
    message_sent: string;
    status: 'sent' | 'delivered' | 'failed' | 'pending';
    sent_at: string;
}

const COMP: Record<CompLevel, { label: string; color: string; bg: string; emoji: string }> = {
    EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#ECFDF5', emoji: '🌟' },
    ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#EFF6FF', emoji: '✅' },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FFFBEB', emoji: '⚡' },
    BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEF2F2', emoji: '🔴' },
};

const TRIGGER_INFO: Record<TriggerType, { label: string; icon: string; color: string; desc: string }> = {
    manual:          { label: 'Manual Send',          icon: '🖱️', color: '#6366f1', desc: 'Teacher triggers manually anytime' },
    term_end:        { label: 'End of Term',          icon: '📅', color: '#2563EB', desc: 'Auto-sent when term results are finalized' },
    competency_drop: { label: 'Competency Drop',      icon: '📉', color: '#DC2626', desc: 'Auto-sent when student drops a competency level' },
    portfolio_update:{ label: 'Portfolio Update',     icon: '🗂️', color: '#059669', desc: 'Auto-sent when new portfolio item added' },
    sba_complete:    { label: 'SBA Completed',        icon: '📋', color: '#D97706', desc: 'Auto-sent when SBA task is scored' },
    at_risk:         { label: 'At-Risk Alert',        icon: '🚨', color: '#DC2626', desc: 'Auto-sent when student flagged as at-risk' },
};

const VARIABLES = [
    { var: '{{parent_name}}',    desc: 'Parent/guardian full name' },
    { var: '{{student_name}}',   desc: 'Student full name' },
    { var: '{{student_first}}',  desc: 'Student first name only' },
    { var: '{{grade}}',          desc: 'Grade/class e.g. Grade 7A' },
    { var: '{{learning_area}}',  desc: 'Learning area/subject name' },
    { var: '{{strand}}',         desc: 'Specific strand name' },
    { var: '{{competency}}',     desc: 'Competency level (EE/ME/AE/BE)' },
    { var: '{{comp_label}}',     desc: 'Full competency label' },
    { var: '{{term}}',           desc: 'Current term e.g. Term 2' },
    { var: '{{year}}',           desc: 'Academic year e.g. 2025' },
    { var: '{{teacher_name}}',   desc: 'Class teacher name' },
    { var: '{{school_name}}',    desc: 'School name' },
    { var: '{{date}}',           desc: 'Today\'s date' },
    { var: '{{portfolio_title}}',desc: 'Portfolio item title' },
    { var: '{{sba_task}}',       desc: 'SBA task name' },
    { var: '{{score}}',          desc: 'Score or rating received' },
];

const DEMO_TEMPLATES: CBCTemplate[] = [
    {
        id: 't1', name: 'CBC End-of-Term Competency Summary', description: 'Sent to all parents at end of term with their child\'s competency performance summary across all learning areas',
        channel: 'both', trigger: 'term_end', competency_level: 'all',
        subject_line: '{{school_name}} — {{student_first}}\'s {{term}} {{year}} CBC Performance Summary',
        message_en: `Dear {{parent_name}},\n\nGreetings from {{school_name}}.\n\nWe are pleased to share {{student_name}}'s CBC performance summary for {{term}} {{year}}.\n\n📊 COMPETENCY PERFORMANCE:\n{{learning_area}}: {{competency}} ({{comp_label}})\n\n🌟 EE = Exceeding Expectation\n✅ ME = Meeting Expectation\n⚡ AE = Approaching Expectation\n🔴 BE = Below Expectation\n\nFor detailed results, please log in to the Parent Portal or visit the school. Your child's report card is ready for collection.\n\nThank you for your continued support in your child's education.\n\nWarm regards,\n{{teacher_name}}\n{{school_name}}`,
        message_sw: `Mzazi/Mlezi {{parent_name}},\n\nSalamu kutoka {{school_name}}.\n\nTunafurahi kushiriki muhtasari wa utendaji wa CBC wa {{student_name}} kwa {{term}} {{year}}.\n\nMatokeo ya kina yanapatikana kwenye Lango la Mzazi. Kadi ya matokeo iko tayari kukusanywa.\n\nAsante,\n{{teacher_name}}\n{{school_name}}`,
        variables: ['parent_name','student_name','student_first','school_name','term','year','learning_area','competency','comp_label','teacher_name'],
        active: true, times_used: 48, last_used: new Date(Date.now()-86400000).toISOString().slice(0,10), created_at: new Date().toISOString()
    },
    {
        id: 't2', name: 'Competency Drop Alert — Urgent', description: 'Sent immediately when a student drops from ME to AE or from AE to BE in any learning area — triggers parent awareness for early intervention',
        channel: 'sms', trigger: 'competency_drop', competency_level: 'BE',
        message_en: `URGENT — {{school_name}}\n\nDear {{parent_name}},\n\nThis is an important notice regarding {{student_name}} ({{grade}}).\n\nOur CBC assessment records show that {{student_name}} has dropped to BELOW EXPECTATION (BE) in {{learning_area}} — {{strand}} this term.\n\nThis means your child needs additional support to reach the expected level.\n\n🎯 ACTION REQUIRED:\n• Please schedule a meeting with {{teacher_name}} urgently\n• Review homework and learning support at home\n• Encourage your child — early support makes a big difference!\n\nPlease call the school on the number above to arrange a parent-teacher meeting.\n\n{{school_name}} | {{date}}`,
        message_sw: `HARAKA — {{school_name}}\n\nMzazi {{parent_name}},\n\nTaarifa muhimu kuhusu {{student_name}} ({{grade}}).\n\nMtoto wako ameshuka hadi CHINI YA MATARAJIO katika {{learning_area}}. Tafadhali wasiliana na shule haraka iwezekanavyo.\n\n{{school_name}} | {{date}}`,
        variables: ['parent_name','student_name','grade','school_name','learning_area','strand','teacher_name','date'],
        active: true, times_used: 12, last_used: new Date(Date.now()-3600000).toISOString().slice(0,10), created_at: new Date().toISOString()
    },
    {
        id: 't3', name: 'Portfolio Item Added — Parent Notification', description: 'Sent to parent whenever a teacher adds a new portfolio evidence item for their child',
        channel: 'whatsapp', trigger: 'portfolio_update', competency_level: 'all',
        message_en: `Hi {{parent_name}}! 👋\n\nExciting news from {{school_name}}!\n\n📁 A new portfolio item has been added for {{student_name}} ({{grade}}):\n\n🏷️ Title: {{portfolio_title}}\n📚 Learning Area: {{learning_area}}\n⭐ Competency: {{competency}} — {{comp_label}}\n\nYou can view your child's full digital portfolio and all evidence of learning by logging into the {{school_name}} Parent Portal.\n\nKeep encouraging {{student_first}} — great work deserves recognition! 🎉\n\n{{school_name}} CBC Team`,
        variables: ['parent_name','student_name','student_first','grade','school_name','portfolio_title','learning_area','competency','comp_label'],
        active: true, times_used: 89, last_used: new Date().toISOString().slice(0,10), created_at: new Date().toISOString()
    },
    {
        id: 't4', name: 'EE Achievement Celebration 🌟', description: 'Celebratory message sent when a student achieves Exceeding Expectation (EE) in any strand — boosts parent-child motivation',
        channel: 'whatsapp', trigger: 'manual', competency_level: 'EE',
        message_en: `🎉 CONGRATULATIONS! 🎉\n\nDear {{parent_name}},\n\nWe are THRILLED to share incredible news!\n\n{{student_name}} has achieved EXCEEDING EXPECTATION (EE) 🌟🏆 in:\n\n📚 {{learning_area}} — {{strand}}\n\nEE means {{student_name}} is performing ABOVE the expected grade level — this is a remarkable achievement!\n\nPlease join us in celebrating {{student_first}}'s hard work and dedication. We are very proud!\n\nKeep it up, {{student_first}}! The sky is the limit! 🚀\n\nWith pride,\n{{teacher_name}}\n{{school_name}}`,
        message_sw: `🎉 HONGERA! 🎉\n\nMzazi {{parent_name}},\n\nTuna furaha kubwa kushiriki habari njema!\n\n{{student_name}} amepata ZAIDI YA MATARAJIO (EE) 🌟 katika {{learning_area}}!\n\nHii ni mafanikio ya kipekee. Hongera sana!\n\n{{teacher_name}} | {{school_name}}`,
        variables: ['parent_name','student_name','student_first','school_name','learning_area','strand','competency','teacher_name'],
        active: true, times_used: 34, last_used: new Date(Date.now()-7200000).toISOString().slice(0,10), created_at: new Date().toISOString()
    },
    {
        id: 't5', name: 'SBA Task Completion Notice', description: 'Notifies parents when their child\'s School Based Assessment task has been scored and competency level assigned',
        channel: 'sms', trigger: 'sba_complete', competency_level: 'all',
        message_en: `{{school_name}} — SBA Update\n\nDear {{parent_name}},\n\n{{student_name}}'s SBA task has been completed and assessed:\n\n📋 Task: {{sba_task}}\n📚 Subject: {{learning_area}}\n⭐ Result: {{competency}} ({{comp_label}})\n\nSBA (School Based Assessment) contributes to your child's final CBC grade. Please ask {{student_first}} to show you their work!\n\nFor full results, visit the Parent Portal.\n\n{{school_name}} | {{term}} {{year}}`,
        variables: ['parent_name','student_name','student_first','school_name','learning_area','sba_task','competency','comp_label','term','year'],
        active: true, times_used: 27, last_used: new Date(Date.now()-172800000).toISOString().slice(0,10), created_at: new Date().toISOString()
    },
    {
        id: 't6', name: 'At-Risk Student Intervention Notice', description: 'Sent when a student is flagged as at-risk across multiple learning areas — urgent call to action for parents and school support team',
        channel: 'both', trigger: 'at_risk', competency_level: 'BE',
        message_en: `IMPORTANT — {{school_name}}\n\nDear {{parent_name}},\n\nWe are reaching out regarding {{student_name}} ({{grade}}) as part of our CBC early intervention programme.\n\nOur assessment records indicate that {{student_name}} may need additional learning support in several areas this term.\n\n🚨 WE NEED YOUR PARTNERSHIP:\n\n1. Please call the school to schedule an urgent meeting\n2. Our CBC support team has prepared an intervention plan\n3. Regular home practice is essential — we will guide you\n\nRemember: CBC is about progress, not just grades. Every child can succeed with the right support!\n\nPlease respond to this message or call us at your earliest convenience.\n\n{{teacher_name}} | {{school_name}}\n{{date}}`,
        variables: ['parent_name','student_name','grade','school_name','teacher_name','date'],
        active: true, times_used: 8, last_used: new Date(Date.now()-604800000).toISOString().slice(0,10), created_at: new Date().toISOString()
    },
    {
        id: 't7', name: 'Mid-Term Progress Check-In', description: 'Friendly mid-term update sent to all parents with a brief competency progress note — keeps parents informed between formal report cards',
        channel: 'whatsapp', trigger: 'manual', competency_level: 'all',
        message_en: `Hi {{parent_name}}! 😊\n\nMid-term greetings from {{school_name}}!\n\nWe hope {{student_first}} is enjoying {{term}} {{year}}. Here is a quick progress note:\n\n📚 {{learning_area}}: {{competency}} — {{comp_label}}\n\n📌 WHAT THIS MEANS:\n🌟 EE = Outstanding! Above grade level\n✅ ME = On track! Meeting expectations  \n⚡ AE = Making progress — needs some support\n🔴 BE = Needs significant support — please contact school\n\nCBC focuses on continuous improvement. Every step forward counts!\n\nThank you for being a wonderful partner in {{student_first}}'s education journey. 🤝\n\n{{teacher_name}} | {{school_name}}`,
        message_sw: `Habari {{parent_name}}! 😊\n\nSalamu za katikati ya muhula kutoka {{school_name}}!\n\nTunatumai {{student_first}} anafurahia masomo. Hapa kuna ripoti fupi ya maendeleo.\n\n{{teacher_name}} | {{school_name}}`,
        variables: ['parent_name','student_name','student_first','school_name','learning_area','competency','comp_label','teacher_name','term','year'],
        active: false, times_used: 0, created_at: new Date().toISOString()
    },
];

const DEMO_LOGS: SendLog[] = [
    { id:'l1', template_id:'t1', template_name:'CBC End-of-Term Summary', student_name:'Amina Otieno', parent_phone:'+254712345678', channel:'sms', message_sent:'Dear Mrs. Otieno, Amina scored EE in Literacy...', status:'delivered', sent_at: new Date(Date.now()-3600000).toISOString() },
    { id:'l2', template_id:'t3', template_name:'Portfolio Item Added', student_name:'Brian Mwangi', parent_phone:'+254723456789', channel:'whatsapp', message_sent:'Hi Mr. Mwangi! Exciting news...', status:'delivered', sent_at: new Date(Date.now()-7200000).toISOString() },
    { id:'l3', template_id:'t2', template_name:'Competency Drop Alert', student_name:'Chloe Wanjiku', parent_phone:'+254734567890', channel:'sms', message_sent:'URGENT — Sunshine Academy...', status:'sent', sent_at: new Date(Date.now()-10800000).toISOString() },
    { id:'l4', template_id:'t4', template_name:'EE Achievement Celebration', student_name:'David Kipkoech', parent_phone:'+254745678901', channel:'whatsapp', message_sent:'CONGRATULATIONS! Dear Mr. Kipkoech...', status:'failed', sent_at: new Date(Date.now()-14400000).toISOString() },
];

export default function CBCTemplatesPage() {
    const [templates, setTemplates] = useState<CBCTemplate[]>(DEMO_TEMPLATES);
    const [logs, setLogs] = useState<SendLog[]>(DEMO_LOGS);
    const [search, setSearch] = useState('');
    const [fChannel, setFChannel] = useState<ChannelType | ''>('');
    const [fTrigger, setFTrigger] = useState<TriggerType | ''>('');
    const [fActive, setFActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [tab, setTab] = useState<'templates' | 'compose' | 'logs' | 'variables'>('templates');
    const [showModal, setShowModal] = useState(false);
    const [editTemplate, setEditTemplate] = useState<CBCTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<CBCTemplate | null>(null);
    const [sendModal, setSendModal] = useState<CBCTemplate | null>(null);
    const [selectedLang, setSelectedLang] = useState<'en' | 'sw'>('en');
    const [saving, setSaving] = useState(false);

    const emptyForm: Omit<CBCTemplate,'id'|'times_used'|'created_at'> = {
        name: '', description: '', channel: 'sms', trigger: 'manual',
        competency_level: 'all', subject_line: '', message_en: '', message_sw: '',
        variables: [], active: true, last_used: undefined,
    };
    const [form, setForm] = useState(emptyForm);

    const filtered = useMemo(() => templates.filter(t =>
        (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
        && (!fChannel || t.channel === fChannel || t.channel === 'both')
        && (!fTrigger || t.trigger === fTrigger)
        && (fActive === 'all' || (fActive === 'active' ? t.active : !t.active))
    ), [templates, search, fChannel, fTrigger, fActive]);

    const stats = useMemo(() => ({
        total: templates.length,
        active: templates.filter(t => t.active).length,
        totalSent: templates.reduce((a,b) => a + b.times_used, 0),
        smsTemplates: templates.filter(t => t.channel === 'sms' || t.channel === 'both').length,
        waTemplates: templates.filter(t => t.channel === 'whatsapp' || t.channel === 'both').length,
        todayLogs: logs.filter(l => l.sent_at.slice(0,10) === new Date().toISOString().slice(0,10)).length,
        deliveryRate: logs.length ? Math.round(logs.filter(l => l.status === 'delivered').length / logs.length * 100) : 0,
    }), [templates, logs]);

    function saveTemplate() {
        if (!form.name || !form.message_en) { toast.error('Template name and English message are required'); return; }
        if (editTemplate) {
            setTemplates(p => p.map(t => t.id === editTemplate.id ? {...t, ...form} : t));
            toast.success('Template updated!');
        } else {
            const newT: CBCTemplate = { ...form, id: `tpl-${Date.now()}`, times_used: 0, created_at: new Date().toISOString() };
            setTemplates(p => [newT, ...p]);
            toast.success('Template created!');
        }
        setShowModal(false);
        setEditTemplate(null);
        setForm(emptyForm);
    }

    function toggleActive(id: string) {
        setTemplates(p => p.map(t => t.id === id ? {...t, active: !t.active} : t));
        toast.success('Template status updated');
    }

    function deleteTemplate(id: string) {
        if (!confirm('Delete this template? This cannot be undone.')) return;
        setTemplates(p => p.filter(t => t.id !== id));
        toast.success('Template deleted');
    }

    function duplicateTemplate(t: CBCTemplate) {
        const newT: CBCTemplate = {...t, id:`tpl-${Date.now()}`, name:`${t.name} (Copy)`, times_used:0, created_at: new Date().toISOString()};
        setTemplates(p => [newT, ...p]);
        toast.success('Template duplicated!');
    }

    function openEdit(t: CBCTemplate) {
        setEditTemplate(t);
        setForm({ name:t.name, description:t.description, channel:t.channel, trigger:t.trigger, competency_level:t.competency_level, subject_line:t.subject_line||'', message_en:t.message_en, message_sw:t.message_sw||'', variables:t.variables, active:t.active, last_used:t.last_used });
        setShowModal(true);
    }

    function simulateSend(t: CBCTemplate) {
        const newLog: SendLog = {
            id: `log-${Date.now()}`, template_id: t.id, template_name: t.name,
            student_name: 'Jane Demo', parent_phone: '+254700000000',
            channel: t.channel === 'both' ? 'sms' : t.channel,
            message_sent: t.message_en.slice(0,80)+'...', status:'sent',
            sent_at: new Date().toISOString(),
        };
        setLogs(p => [newLog, ...p]);
        setTemplates(p => p.map(tp => tp.id === t.id ? {...tp, times_used: tp.times_used+1, last_used: new Date().toISOString().slice(0,10)} : tp));
        toast.success(`📨 Message sent via ${t.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}!`);
        setSendModal(null);
    }

    function previewMessage(msg: string) {
        return msg
            .replace(/\{\{parent_name\}\}/g, 'Mrs. Otieno')
            .replace(/\{\{student_name\}\}/g, 'Amina Otieno')
            .replace(/\{\{student_first\}\}/g, 'Amina')
            .replace(/\{\{grade\}\}/g, 'Grade 7A')
            .replace(/\{\{learning_area\}\}/g, 'Mathematics Activities')
            .replace(/\{\{strand\}\}/g, 'Numbers')
            .replace(/\{\{competency\}\}/g, 'EE')
            .replace(/\{\{comp_label\}\}/g, 'Exceeding Expectation')
            .replace(/\{\{term\}\}/g, 'Term 2')
            .replace(/\{\{year\}\}/g, '2025')
            .replace(/\{\{teacher_name\}\}/g, 'Mr. Kamau')
            .replace(/\{\{school_name\}\}/g, 'Sunshine Academy')
            .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-KE'))
            .replace(/\{\{portfolio_title\}\}/g, 'Water Cycle 3D Model')
            .replace(/\{\{sba_task\}\}/g, 'Fraction Manipulation Project')
            .replace(/\{\{score\}\}/g, '4/4');
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    }

    return (
        <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(135deg,#fdf4ff 0%,#eff6ff 50%,#f0fdf4 100%)' }}>
            <Toaster position="top-right" />

            {/* ═══ HERO HEADER ═══ */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#1d4ed8 50%,#065f46 100%)' }} className="px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-4">
                        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                        <FiChevronRight size={12} />
                        <Link href="/dashboard/communication" className="hover:text-white transition-colors">Communication</Link>
                        <FiChevronRight size={12} />
                        <span className="text-white font-medium">📲 CBC Competency SMS & WhatsApp Templates</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <span className="text-4xl">📲</span> CBC Competency SMS & WhatsApp Centre
                            </h1>
                            <p className="text-blue-200 text-sm max-w-2xl">
                                CBC-specific parent communication templates — competency alerts, EE celebrations, portfolio updates,
                                at-risk notices, SBA results & term-end summaries. Bilingual English & Kiswahili.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setForm(emptyForm); setEditTemplate(null); setShowModal(true); }}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all">
                                <FiPlus size={15} /> New Template
                            </button>
                        </div>
                    </div>

                    {/* KPI Stats */}
                    <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
                        {[
                            { label: 'Templates',     value: stats.total,        icon: '📋', color: 'text-blue-200' },
                            { label: 'Active',        value: stats.active,       icon: '✅', color: 'text-emerald-300' },
                            { label: 'Total Sent',    value: stats.totalSent,    icon: '📨', color: 'text-yellow-300' },
                            { label: 'SMS Templates', value: stats.smsTemplates, icon: '💬', color: 'text-blue-300' },
                            { label: 'WA Templates',  value: stats.waTemplates,  icon: '🟢', color: 'text-emerald-300' },
                            { label: 'Sent Today',    value: stats.todayLogs,    icon: '📅', color: 'text-purple-300' },
                            { label: 'Delivery Rate', value: `${stats.deliveryRate}%`, icon: '📈', color: 'text-orange-300' },
                        ].map(k => (
                            <div key={k.label} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                                <div className="text-lg mb-0.5">{k.icon}</div>
                                <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                                <div className="text-blue-300 text-[10px] font-medium">{k.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 space-y-5">

                {/* ═══ TABS ═══ */}
                <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit flex-wrap">
                    {[
                        { key:'templates', label:'📋 Templates Library' },
                        { key:'compose',   label:'✏️ Quick Compose' },
                        { key:'logs',      label:'📜 Send Logs' },
                        { key:'variables', label:'🔧 Variable Reference' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ═══ TEMPLATES TAB ═══ */}
                {tab === 'templates' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="relative col-span-2 lg:col-span-1">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="Search templates..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <select value={fChannel} onChange={e => setFChannel(e.target.value as any)}
                                    className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">All Channels</option>
                                    <option value="sms">📱 SMS Only</option>
                                    <option value="whatsapp">🟢 WhatsApp Only</option>
                                    <option value="both">📲 Both</option>
                                </select>
                                <select value={fTrigger} onChange={e => setFTrigger(e.target.value as any)}
                                    className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">All Triggers</option>
                                    {(Object.keys(TRIGGER_INFO) as TriggerType[]).map(k => (
                                        <option key={k} value={k}>{TRIGGER_INFO[k].icon} {TRIGGER_INFO[k].label}</option>
                                    ))}
                                </select>
                                <select value={fActive} onChange={e => setFActive(e.target.value as any)}
                                    className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="all">All Status</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                </select>
                                <button onClick={() => { setSearch(''); setFChannel(''); setFTrigger(''); setFActive('all'); }}
                                    className="flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm px-3 py-2 hover:bg-gray-50 text-gray-500 transition-colors">
                                    <FiRefreshCw size={13} /> Clear Filters
                                </button>
                            </div>
                        </div>

                        {/* Template Cards */}
                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-200">
                                <div className="text-6xl mb-3">📲</div>
                                <p className="text-gray-500 font-semibold text-lg">No templates found</p>
                                <p className="text-gray-400 text-sm mt-1">Create your first CBC communication template</p>
                                <button onClick={() => { setForm(emptyForm); setShowModal(true); }}
                                    className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
                                    <FiPlus size={14} /> Create Template
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filtered.map(t => {
                                    const trigger = TRIGGER_INFO[t.trigger];
                                    return (
                                        <div key={t.id}
                                            className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md ${t.active ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-70'}`}>
                                            <div className="p-5">
                                                <div className="flex items-start gap-4">
                                                    {/* Channel Badge */}
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl border border-gray-100 bg-gray-50">
                                                        {t.channel === 'whatsapp' ? '🟢' : t.channel === 'sms' ? '💬' : '📲'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 text-base">{t.name}</h3>
                                                                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                                                            </div>
                                                            {/* Active Toggle */}
                                                            <button onClick={() => toggleActive(t.id)}
                                                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all border ${t.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
                                                                {t.active ? <><FiCheckCircle size={11}/> Active</> : <><FiAlertCircle size={11}/> Inactive</>}
                                                            </button>
                                                        </div>
                                                        {/* Meta badges */}
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: trigger.color }}>
                                                                {trigger.icon} {trigger.label}
                                                            </span>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                                                                {t.channel === 'sms' ? '📱 SMS' : t.channel === 'whatsapp' ? '🟢 WhatsApp' : '📲 SMS + WA'}
                                                            </span>
                                                            {t.competency_level && t.competency_level !== 'all' && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: COMP[t.competency_level as CompLevel]?.bg, color: COMP[t.competency_level as CompLevel]?.color }}>
                                                                    {COMP[t.competency_level as CompLevel]?.emoji} {t.competency_level}
                                                                </span>
                                                            )}
                                                            {t.message_sw && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">🇰🇪 Bilingual</span>
                                                            )}
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">📨 Sent {t.times_used}x</span>
                                                            {t.last_used && <span className="text-[10px] text-gray-400">Last: {t.last_used}</span>}
                                                        </div>

                                                        {/* Message Preview */}
                                                        <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => setSelectedLang('en')}
                                                                        className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${selectedLang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>🇬🇧 English</button>
                                                                    {t.message_sw && (
                                                                        <button onClick={() => setSelectedLang('sw')}
                                                                            className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${selectedLang === 'sw' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>🇰🇪 Kiswahili</button>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-gray-400">{(selectedLang === 'en' ? t.message_en : t.message_sw || t.message_en).length} chars</span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-600 whitespace-pre-line line-clamp-4 font-mono">
                                                                {(selectedLang === 'en' ? t.message_en : t.message_sw || t.message_en).slice(0, 200)}
                                                                {(selectedLang === 'en' ? t.message_en : t.message_sw || t.message_en).length > 200 ? '...' : ''}
                                                            </p>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                            <button onClick={() => setSendModal(t)}
                                                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow">
                                                                <FiSend size={11}/> Send Now
                                                            </button>
                                                            <button onClick={() => setPreviewTemplate(t)}
                                                                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                                                <FiEye size={11}/> Preview
                                                            </button>
                                                            <button onClick={() => openEdit(t)}
                                                                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-amber-200">
                                                                <FiEdit2 size={11}/> Edit
                                                            </button>
                                                            <button onClick={() => duplicateTemplate(t)}
                                                                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-purple-200">
                                                                <FiCopy size={11}/> Duplicate
                                                            </button>
                                                            <button onClick={() => copyToClipboard(t.message_en)}
                                                                className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-200">
                                                                <FiCopy size={11}/> Copy Text
                                                            </button>
                                                            <button onClick={() => deleteTemplate(t.id)}
                                                                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-200 ml-auto">
                                                                <FiTrash2 size={11}/> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ QUICK COMPOSE TAB ═══ */}
                {tab === 'compose' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiEdit2 className="text-blue-600"/> Quick Compose Message
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Template (Optional)</label>
                                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        onChange={e => { const t = templates.find(tp => tp.id === e.target.value); if (t) setForm({...form, message_en: t.message_en, message_sw: t.message_sw||'', name: t.name}); }}>
                                        <option value="">— Start from scratch —</option>
                                        {templates.filter(t=>t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Channel</label>
                                    <div className="flex gap-2">
                                        {(['sms','whatsapp','both'] as ChannelType[]).map(c => (
                                            <button key={c} onClick={() => setForm(p=>({...p,channel:c}))}
                                                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${form.channel===c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
                                                {c==='sms'?'📱 SMS':c==='whatsapp'?'🟢 WhatsApp':'📲 Both'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Send To</label>
                                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option>All Parents (Bulk)</option>
                                        <option>Grade 7A Parents</option>
                                        <option>Grade 8 Parents</option>
                                        <option>Grade 9 Parents</option>
                                        <option>Specific Student Parent</option>
                                        <option>At-Risk Students Parents</option>
                                        <option>EE Achievers Parents</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">🇬🇧 English Message *</label>
                                    <textarea value={form.message_en} onChange={e => setForm(p=>({...p,message_en:e.target.value}))} rows={8}
                                        placeholder="Type your CBC message here... Use variables like {{student_name}}, {{competency}}, {{school_name}}"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono" />
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-gray-400">{form.message_en.length} characters • {Math.ceil(form.message_en.length/160)} SMS credit(s)</span>
                                        <button onClick={() => copyToClipboard(form.message_en)} className="text-[10px] text-blue-600 hover:underline">Copy</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">🇰🇪 Kiswahili Message (Optional)</label>
                                    <textarea value={form.message_sw} onChange={e => setForm(p=>({...p,message_sw:e.target.value}))} rows={5}
                                        placeholder="Tafsiri ya Kiswahili..."
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono" />
                                </div>
                                <button onClick={() => toast.success('Message sent to selected parents! (demo)')}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-lg">
                                    <FiSend size={15}/> Send Message
                                </button>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FiEye className="text-blue-600"/> Live Preview (with sample data)
                                </h2>
                                <div className="bg-[#ECE5DD] rounded-xl p-4 min-h-[200px]">
                                    <div className="flex justify-end mb-2">
                                        <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] shadow-sm">
                                            <p className="text-[12px] text-gray-800 whitespace-pre-line leading-relaxed">
                                                {form.message_en ? previewMessage(form.message_en) : 'Type a message to see preview...'}
                                            </p>
                                            <p className="text-[9px] text-gray-400 text-right mt-1">✓✓ Delivered</p>
                                        </div>
                                    </div>
                                    <p className="text-center text-[10px] text-gray-400 mt-4">WhatsApp-style preview • {form.message_en.length} chars</p>
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                                <h3 className="font-semibold text-blue-800 text-sm mb-2">💡 Tips for Effective CBC Messages</h3>
                                <ul className="space-y-1.5 text-xs text-blue-700">
                                    <li>✅ Always start with the parent's name using <code className="bg-white px-1 rounded">{'{{parent_name}}'}</code></li>
                                    <li>✅ Explain what EE, ME, AE, BE mean — parents may not know</li>
                                    <li>✅ Include a specific action step — what should the parent DO?</li>
                                    <li>✅ Keep SMS under 160 characters for 1 credit; WhatsApp can be longer</li>
                                    <li>✅ For at-risk messages, be empathetic — frame as partnership, not blame</li>
                                    <li>✅ Celebrate EE with excitement — motivates child and parent!</li>
                                    <li>🇰🇪 Always provide Kiswahili for rural/less educated parents</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ SEND LOGS TAB ═══ */}
                {tab === 'logs' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                    <FiActivity className="text-blue-600"/> Message Send Logs ({logs.length} messages)
                                </h2>
                                <div className="flex gap-3">
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">{logs.filter(l=>l.status==='delivered').length} Delivered</span>
                                    <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">{logs.filter(l=>l.status==='failed').length} Failed</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Time</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Template</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Student</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Parent Phone</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Channel</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Preview</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(l => (
                                            <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.sent_at).toLocaleString('en-KE',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800 text-xs">{l.template_name}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700">{l.student_name}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{l.parent_phone}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] font-medium">{l.channel==='whatsapp'?'🟢 WA':'💬 SMS'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{l.message_sent}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                        l.status==='delivered'?'bg-emerald-100 text-emerald-700':
                                                        l.status==='sent'?'bg-blue-100 text-blue-700':
                                                        l.status==='failed'?'bg-red-100 text-red-700':
                                                        'bg-amber-100 text-amber-700'}`}>
                                                        {l.status.charAt(0).toUpperCase()+l.status.slice(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ VARIABLES REFERENCE TAB ═══ */}
                {tab === 'variables' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiSettings className="text-blue-600"/> Template Variables Reference
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">Use these variables in your message templates. They will be automatically replaced with real data when sending.</p>
                            <div className="space-y-2">
                                {VARIABLES.map(v => (
                                    <div key={v.var} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 group">
                                        <code className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded font-mono flex-shrink-0">{v.var}</code>
                                        <span className="text-xs text-gray-600 flex-1">{v.desc}</span>
                                        <button onClick={() => copyToClipboard(v.var)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 p-1 rounded">
                                            <FiCopy size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FiBook className="text-emerald-600"/> Competency Level Reference
                                </h2>
                                {(Object.keys(COMP) as CompLevel[]).map(k => {
                                    const c = COMP[k];
                                    return (
                                        <div key={k} className="flex items-center gap-3 p-3 rounded-xl mb-2 border" style={{ background: c.bg, borderColor: c.color+'30' }}>
                                            <span className="text-2xl">{c.emoji}</span>
                                            <div>
                                                <p className="font-bold text-sm" style={{ color: c.color }}>{k} — {c.label}</p>
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                    {k==='EE'?'Student performs significantly above grade level expectations' :
                                                     k==='ME'?'Student performs at the expected grade level' :
                                                     k==='AE'?'Student is making progress but has not reached grade level yet' :
                                                     'Student requires intensive support and early intervention'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                                <h3 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
                                    <FiAlertCircle size={14}/> SMS Character Limits
                                </h3>
                                <ul className="space-y-1 text-xs text-amber-700">
                                    <li>📱 <strong>Standard SMS:</strong> 160 characters = 1 credit</li>
                                    <li>📱 <strong>Long SMS:</strong> 153 chars per part when concatenated</li>
                                    <li>🟢 <strong>WhatsApp:</strong> Up to 4,096 characters (no extra cost)</li>
                                    <li>🌍 <strong>Unicode SMS</strong> (Kiswahili special chars): 70 chars/credit</li>
                                    <li>⚡ <strong>Tip:</strong> Use WhatsApp for long celebration/summary messages</li>
                                    <li>⚡ <strong>Tip:</strong> Keep emergency/at-risk SMS under 160 chars for speed</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ CREATE/EDIT TEMPLATE MODAL ═══ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-xl">📲</span> {editTemplate ? 'Edit' : 'Create'} CBC Template
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditTemplate(null); setForm(emptyForm); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Template Name *</label>
                                <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))}
                                    placeholder="e.g. CBC End-of-Term Competency Summary"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                                <input value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                                    placeholder="When is this template used? Who receives it?"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Channel</label>
                                    <select value={form.channel} onChange={e => setForm(p=>({...p,channel:e.target.value as ChannelType}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="sms">📱 SMS</option>
                                        <option value="whatsapp">🟢 WhatsApp</option>
                                        <option value="both">📲 Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Trigger</label>
                                    <select value={form.trigger} onChange={e => setForm(p=>({...p,trigger:e.target.value as TriggerType}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                        {(Object.keys(TRIGGER_INFO) as TriggerType[]).map(k => (
                                            <option key={k} value={k}>{TRIGGER_INFO[k].icon} {TRIGGER_INFO[k].label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Competency Level (leave blank for all)</label>
                                <select value={form.competency_level} onChange={e => setForm(p=>({...p,competency_level:e.target.value as any}))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="all">All Levels</option>
                                    {(Object.keys(COMP) as CompLevel[]).map(k => <option key={k} value={k}>{COMP[k].emoji} {k} — {COMP[k].label}</option>)}
                                </select>
                            </div>
                            {(form.channel === 'whatsapp' || form.channel === 'both') && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Subject Line (optional)</label>
                                    <input value={form.subject_line} onChange={e => setForm(p=>({...p,subject_line:e.target.value}))}
                                        placeholder="e.g. {{school_name}} — {{student_first}}'s CBC Results"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">🇬🇧 English Message *</label>
                                <div className="mb-1 flex flex-wrap gap-1">
                                    {VARIABLES.slice(0,8).map(v => (
                                        <button key={v.var} onClick={() => setForm(p=>({...p,message_en:p.message_en+v.var}))}
                                            className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono transition-colors border border-blue-200">
                                            {v.var}
                                        </button>
                                    ))}
                                </div>
                                <textarea value={form.message_en} onChange={e => setForm(p=>({...p,message_en:e.target.value}))}
                                    rows={8} placeholder="Type your English message here..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono" />
                                <p className="text-[10px] text-gray-400 mt-1">{form.message_en.length} characters • {Math.ceil(form.message_en.length/160)} SMS credit(s)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">🇰🇪 Kiswahili Message (Optional — recommended for bilingual parents)</label>
                                <textarea value={form.message_sw} onChange={e => setForm(p=>({...p,message_sw:e.target.value}))}
                                    rows={5} placeholder="Tafsiri ya Kiswahili (optional)..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active-check" checked={form.active} onChange={e => setForm(p=>({...p,active:e.target.checked}))} className="rounded" />
                                <label htmlFor="active-check" className="text-sm text-gray-700">Template is active and available for sending</label>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => { setShowModal(false); setEditTemplate(null); setForm(emptyForm); }}
                                className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={saveTemplate}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg">
                                <FiSave size={14}/> {editTemplate ? 'Update Template' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PREVIEW MODAL ═══ */}
            {previewTemplate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setPreviewTemplate(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                            <h2 className="font-bold text-gray-900">Message Preview — {previewTemplate.name}</h2>
                            <button onClick={() => setPreviewTemplate(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedLang('en')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedLang==='en'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🇬🇧 English</button>
                                {previewTemplate.message_sw && <button onClick={() => setSelectedLang('sw')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedLang==='sw'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🇰🇪 Kiswahili</button>}
                            </div>
                            <div className="bg-[#ECE5DD] rounded-xl p-4">
                                <div className="flex justify-end">
                                    <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-none px-4 py-3 max-w-[90%] shadow-sm">
                                        <p className="text-[12px] text-gray-800 whitespace-pre-line leading-relaxed">
                                            {previewMessage(selectedLang==='en' ? previewTemplate.message_en : previewTemplate.message_sw||previewTemplate.message_en)}
                                        </p>
                                        <p className="text-[9px] text-gray-400 text-right mt-2">✓✓ Delivered • {(selectedLang==='en'?previewTemplate.message_en:previewTemplate.message_sw||previewTemplate.message_en).length} chars</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center">Preview using sample data: Amina Otieno, Grade 7A, EE in Maths</p>
                            <button onClick={() => copyToClipboard(previewMessage(selectedLang==='en'?previewTemplate.message_en:previewTemplate.message_sw||previewTemplate.message_en))}
                                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
                                <FiCopy size={14}/> Copy Message Text
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SEND MODAL ═══ */}
            {sendModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setSendModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2"><FiSend className="text-blue-600"/> Send: {sendModal.name}</h2>
                            <button onClick={() => setSendModal(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                <p className="text-xs text-blue-700 font-medium flex items-center gap-2"><FiAlertCircle size={12}/> You are about to send this message to parents. Please confirm the target group.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Send To</label>
                                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option>All Active Students Parents</option>
                                    <option>Grade 7 Parents Only</option>
                                    <option>Grade 8 Parents Only</option>
                                    <option>Grade 9 Parents Only</option>
                                    <option>Students with BE in any area</option>
                                    <option>Students with EE in any area</option>
                                    <option>At-Risk Students Parents</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Channel Override</label>
                                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option>Use template default ({sendModal.channel})</option>
                                    <option>SMS only</option>
                                    <option>WhatsApp only</option>
                                    <option>Both SMS & WhatsApp</option>
                                </select>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                                <p className="text-xs text-amber-700">⚠️ This is a demo simulation. In production, connect to your SMS/WhatsApp API (Africa's Talking, Twilio, etc.)</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => setSendModal(null)} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => simulateSend(sendModal)}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg">
                                <FiSend size={14}/> Confirm & Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
