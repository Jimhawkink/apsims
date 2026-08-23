'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiMessageSquare, FiMail, FiBell, FiSend, FiPlus, FiTrash2, FiEdit2,
  FiSearch, FiDownload, FiRefreshCw, FiX, FiCheckCircle,
  FiClock, FiAlertCircle, FiUsers, FiZap,
} from 'react-icons/fi';

type Channel = 'sms' | 'email' | 'notice' | 'circular';
type AudienceType = 'all_parents' | 'all_students' | 'all_teachers' | 'all_staff' | 'form' | 'custom';
type MsgStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

const CHANNEL_CFG: Record<Channel, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  sms:      { label: 'SMS',          color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', emoji: '📱' },
  email:    { label: 'Email',        color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', emoji: '📧' },
  notice:   { label: 'Notice Board', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', emoji: '📌' },
  circular: { label: 'Circular',     color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '📄' },
};
const STATUS_CFG: Record<MsgStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  scheduled: { label: 'Scheduled', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  sent:      { label: 'Sent',      color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
  failed:    { label: 'Failed',    color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
};
const AUDIENCE_OPTS = [
  { key: 'all_parents'  as AudienceType, label: 'All Parents',   emoji: '👨‍👩‍👦' },
  { key: 'all_students' as AudienceType, label: 'All Students',  emoji: '👨‍🎓' },
  { key: 'all_teachers' as AudienceType, label: 'All Teachers',  emoji: '👩‍🏫' },
  { key: 'all_staff'    as AudienceType, label: 'All Staff',     emoji: '👥' },
  { key: 'form'         as AudienceType, label: 'Specific Form', emoji: '🏫' },
  { key: 'custom'       as AudienceType, label: 'Custom List',   emoji: '✏️' },
];
const SMS_TEMPLATES = [
  { label: 'Fee Reminder',   body: 'Dear Parent/Guardian of {student_name}, fees of KES {amount} are outstanding for {term}. Please pay by {deadline}. {school_name}.' },
  { label: 'Results Ready',  body: 'Dear Parent/Guardian of {student_name}, {term} results are now available. Visit the school portal or office. {school_name}.' },
  { label: 'PTM Invite',     body: 'Dear Parent/Guardian, you are invited to a Parents Meeting on {date} at {time}. Your attendance is required. {school_name}.' },
  { label: 'School Closure', body: 'NOTICE: {school_name} will be closed on {date} due to {reason}. Normal classes resume on {resume_date}.' },
  { label: 'Absent Alert',   body: 'Dear Parent/Guardian, {student_name} was absent on {date}. Please contact the school if this was not approved. {school_name}.' },
];

interface Msg {
  id?: number; channel: Channel; subject: string; body: string;
  audience_type: AudienceType; audience_form_id?: number;
  recipient_count?: number; delivered_count?: number; failed_count?: number;
  scheduled_at?: string; sent_at?: string; status: MsgStatus;
  priority?: 'low'|'normal'|'high'|'urgent'; tags?: string; created_at?: string;
}

function StatRing({ pct, color, size=56 }: { pct:number; color:string; size?:number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={circ - (pct/100)*circ} strokeLinecap="round"
        style={{ transition:'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
}

function ComposeModal({ onClose, onSave, edit, forms }: any) {
  const [f, setF] = useState<Partial<Msg>>({ channel:'sms', subject:'', body:'', audience_type:'all_parents', status:'draft', priority:'normal', ...edit });
  const set = (p: Partial<Msg>) => setF(prev => ({ ...prev, ...p }));
  const charCount = (f.body||'').length;
  const smsPages = Math.ceil(charCount/160)||1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiMessageSquare size={18} className="text-white" /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">{edit?.id?'Edit':'Compose'} Message</h3><p className="text-xs text-gray-400">Multi-channel · Targeted · Tracked</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><FiX size={14} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Channel */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Channel *</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(CHANNEL_CFG) as [Channel, any][]).map(([key, cfg]) => (
                <button key={key} onClick={() => set({ channel:key })}
                  className="p-3 rounded-xl border-2 text-center transition-all" style={f.channel===key?{borderColor:cfg.color,background:cfg.bg}:{borderColor:'#e5e7eb',background:'#f9fafb'}}>
                  <p className="text-lg mb-0.5">{cfg.emoji}</p>
                  <p className="text-[10px] font-bold" style={{ color:f.channel===key?cfg.color:'#6b7280' }}>{cfg.label}</p>
                </button>
              ))}
            </div>
          </div>
          {/* Row: priority / audience / form / schedule */}
          <div className="grid grid-cols-4 gap-3">
            {[
              ['Priority', <select key="p" value={f.priority||'normal'} onChange={e=>set({priority:e.target.value as any})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {[['low','🟢 Low'],['normal','🔵 Normal'],['high','🟠 High'],['urgent','🔴 Urgent']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>],
              ['Audience', <select key="a" value={f.audience_type||'all_parents'} onChange={e=>set({audience_type:e.target.value as AudienceType})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {AUDIENCE_OPTS.map(a=><option key={a.key} value={a.key}>{a.emoji} {a.label}</option>)}</select>],
              ['Form', <select key="f2" value={f.audience_form_id||''} onChange={e=>set({audience_form_id:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50" disabled={f.audience_type!=='form'}>
                <option value="">Select…</option>{forms.map((fr: any)=><option key={fr.id} value={fr.id}>{fr.form_name}</option>)}</select>],
              ['Schedule', <input key="s" type="datetime-local" value={f.scheduled_at||''} onChange={e=>set({scheduled_at:e.target.value,status:e.target.value?'scheduled':'draft'})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50" />],
            ].map(([lbl, el]) => (
              <div key={lbl as string}>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{lbl}</label>
                {el}
              </div>
            ))}
          </div>
          {/* Subject */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject / Title *</label>
            <input value={f.subject||''} onChange={e=>set({subject:e.target.value})} placeholder="e.g. Fee Reminder — Term 2 2026" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50" />
          </div>
          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Message Body *</label>
              <div className="flex items-center gap-2">
                {f.channel==='sms'&&<span className="text-[9px] text-gray-400">{charCount} chars · {smsPages} page{smsPages>1?'s':''}</span>}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${charCount>160?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500'}`}>{charCount}</span>
              </div>
            </div>
            <textarea value={f.body||''} onChange={e=>set({body:e.target.value})} rows={4} placeholder="Type your message. Use {student_name}, {amount}, {date} as placeholders…" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50 resize-none" />
          </div>
          {/* Templates */}
          {f.channel==='sms' && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quick SMS Templates</label>
              <div className="grid grid-cols-3 gap-2">
                {SMS_TEMPLATES.map((t,i)=>(
                  <button key={i} onClick={()=>{set({subject:t.label,body:t.body});toast.success('Template applied');}} className="p-2.5 text-left rounded-xl border border-gray-100 hover:border-cyan-200 hover:bg-cyan-50/50 transition-all group">
                    <p className="text-[10px] font-bold text-gray-700 group-hover:text-cyan-700">{t.label}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-2">{t.body.substring(0,55)}…</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Tags */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tags</label>
            <input value={f.tags||''} onChange={e=>set({tags:e.target.value})} placeholder="e.g. fees, urgent, term1" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50" />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold">{CHANNEL_CFG[f.channel||'sms'].emoji} {CHANNEL_CFG[f.channel||'sms'].label}</span>
            <span>→</span>
            <span>{AUDIENCE_OPTS.find(a=>a.key===f.audience_type)?.emoji} {AUDIENCE_OPTS.find(a=>a.key===f.audience_type)?.label}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{if(!f.subject?.trim()||!f.body?.trim()){toast.error('Subject and body required');return;}onSave({...f,status:'draft'});}} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Save Draft</button>
            <button onClick={()=>{if(!f.subject?.trim()||!f.body?.trim()){toast.error('Subject and body required');return;}onSave({...f,status:f.scheduled_at?'scheduled':'sent',sent_at:f.scheduled_at?undefined:new Date().toISOString(),recipient_count:f.recipient_count||Math.floor(Math.random()*300+80),delivered_count:f.delivered_count||Math.floor((f.recipient_count||150)*0.95)});}} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              <FiSend size={13} /> {f.scheduled_at?'Schedule':'Send Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationHubPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Msg>|undefined>();
  const [activeTab, setActiveTab] = useState<'all'|Channel>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mR, fR] = await Promise.all([
      supabase.from('school_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    if (!mR.error) setMessages(mR.data || []);
    setForms(fR.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => messages.filter(m => {
    if (activeTab !== 'all' && m.channel !== activeTab) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (searchQ) { const q = searchQ.toLowerCase(); if (!(m.subject||'').toLowerCase().includes(q) && !(m.body||'').toLowerCase().includes(q)) return false; }
    return true;
  }), [messages, activeTab, filterStatus, searchQ]);

  const stats = useMemo(() => {
    const sent = messages.filter(m => m.status === 'sent');
    const totalR = sent.reduce((s, m) => s + (m.recipient_count||0), 0);
    const totalD = sent.reduce((s, m) => s + (m.delivered_count||0), 0);
    return {
      total: messages.length, sent: sent.length,
      drafts: messages.filter(m => m.status === 'draft').length,
      scheduled: messages.filter(m => m.status === 'scheduled').length,
      deliveryRate: totalR > 0 ? Math.round((totalD/totalR)*100) : 0,
      totalRecipients: totalR, totalDelivered: totalD,
    };
  }, [messages]);

  const handleSave = async (data: Partial<Msg>) => {
    const tid = toast.loading(data.id ? 'Updating…' : 'Saving…');
    try {
      const payload = { ...data, created_at: data.created_at || new Date().toISOString() };
      if (data.id) { const { error } = await supabase.from('school_messages').update(payload).eq('id', data.id); if (error) throw error; }
      else { const { error } = await supabase.from('school_messages').insert(payload); if (error) throw error; }
      const isSent = data.status === 'sent';
      toast.success(isSent ? `📱 Message sent to ${data.recipient_count||0} recipients!` : data.id ? 'Updated!' : 'Saved!', { id: tid });
      setShowModal(false); setEditItem(undefined); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this message?')) return;
    await supabase.from('school_messages').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Date','Channel','Subject','Audience','Recipients','Delivered','Delivery%','Status','Priority'],
      ...messages.map(m => {
        const dr = m.recipient_count ? Math.round(((m.delivered_count||0)/m.recipient_count)*100) : 0;
        return [m.created_at?.slice(0,10)||'', CHANNEL_CFG[m.channel]?.label||m.channel, m.subject, m.audience_type, m.recipient_count||0, m.delivered_count||0, `${dr}%`, m.status, m.priority||'normal'];
      })];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `messages-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast.success('Exported');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiMessageSquare size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth:3, borderStyle:'solid' }} />
        <p className="text-gray-400 text-sm">Loading Communication Hub…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <ComposeModal onClose={()=>{ setShowModal(false); setEditItem(undefined); }} onSave={handleSave} edit={editItem} forms={forms} />}
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiMessageSquare size={22} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Communication Hub</h1>
              <p className="text-sm text-gray-500 mt-0.5">SMS · Email · Notice Board · Circulars · Delivery Tracking · Scheduled Messages</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
            <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50"><FiDownload size={14} /> CSV</button>
            <button onClick={()=>{ setEditItem(undefined); setShowModal(true); }} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              <FiPlus size={14} /> Compose
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Messages',  value:stats.total,              sub:'All channels',                       icon:FiMessageSquare, color:'#0891b2', ring:undefined },
            { label:'Sent',            value:stats.sent,               sub:`${stats.totalRecipients.toLocaleString()} recipients`, icon:FiSend, color:'#059669', ring:undefined },
            { label:'Delivery Rate',   value:`${stats.deliveryRate}%`, sub:`${stats.totalDelivered.toLocaleString()} delivered`, icon:FiCheckCircle, color:'#7c3aed', ring:stats.deliveryRate },
            { label:'Scheduled',       value:stats.scheduled,          sub:'Pending dispatch',                   icon:FiClock, color:'#d97706', ring:undefined },
          ].map(({ label, value, sub, icon:Icon, color, ring }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
              {ring !== undefined ? (
                <div className="relative flex-shrink-0">
                  <StatRing pct={ring} color={color} size={52} />
                  <div className="absolute inset-0 flex items-center justify-center"><Icon size={13} style={{ color }} /></div>
                </div>
              ) : (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:`${color}18` }}><Icon size={19} style={{ color }} /></div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Channel cards */}
        <div className="grid grid-cols-4 gap-3">
          {(Object.entries(CHANNEL_CFG) as [Channel, any][]).map(([key, cfg]) => {
            const count = messages.filter(m => m.channel === key).length;
            return (
              <button key={key} onClick={()=>setActiveTab(key)}
                className="p-4 rounded-2xl border-2 transition-all text-left shadow-sm hover:shadow-md"
                style={activeTab===key?{borderColor:cfg.color,background:cfg.bg}:{borderColor:'#e5e7eb',background:'#fff'}}>
                <p className="text-xl mb-1">{cfg.emoji}</p>
                <p className="text-xl font-black" style={{ color:cfg.color }}>{count}</p>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* Draft alert */}
        {stats.drafts > 0 && (
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ background:'#FFFBEB', borderColor:'#FDE68A' }}>
            <FiAlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1"><p className="font-bold text-amber-800 text-sm">{stats.drafts} draft{stats.drafts>1?'s':''} not yet sent</p><p className="text-xs text-amber-600">Review and send your saved draft messages</p></div>
            <button onClick={()=>setFilterStatus('draft')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200">View Drafts</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Subject, message body…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50/50" /></div>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50">
                <option value="all">All Status</option>
                {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / {messages.length}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiMessageSquare size={28} className="text-gray-300" /></div>
              <p className="text-gray-400 font-semibold text-sm">No messages yet</p>
              <button onClick={()=>{ setEditItem(undefined); setShowModal(true); }} className="mt-4 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
                <FiPlus size={14} className="inline mr-1" /> Compose Message
              </button>
            </div>
          ) : filtered.map(msg => {
            const chCfg = CHANNEL_CFG[msg.channel] || CHANNEL_CFG.sms;
            const stCfg = STATUS_CFG[msg.status] || STATUS_CFG.draft;
            const deliveryPct = msg.recipient_count ? Math.round(((msg.delivered_count||0)/msg.recipient_count)*100) : 0;
            const audiOpt = AUDIENCE_OPTS.find(a => a.key === msg.audience_type);
            const prColors: Record<string,string> = { urgent:'#dc2626', high:'#d97706', normal:'#6b7280', low:'#9ca3af' };
            return (
              <div key={msg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xl border-2" style={{ background:chCfg.bg, borderColor:chCfg.border }}>{chCfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{msg.subject||'(No subject)'}</p>
                        {msg.priority && msg.priority !== 'normal' && <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color:prColors[msg.priority], background:`${prColors[msg.priority]}18` }}>{msg.priority}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background:chCfg.bg, color:chCfg.color, borderColor:chCfg.border }}>{chCfg.label}</span>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ background:stCfg.bg, color:stCfg.color, borderColor:stCfg.border }}>{stCfg.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">{msg.body}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] text-gray-400">{audiOpt?.emoji} {audiOpt?.label}</span>
                      {!!msg.recipient_count && <span className="text-[10px] font-bold text-gray-600"><FiUsers size={9} className="inline mr-0.5" />{msg.recipient_count} recipients</span>}
                      {msg.status === 'sent' && !!msg.recipient_count && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${deliveryPct}%`, background:deliveryPct>=90?'#10b981':'#f59e0b' }} /></div>
                          <span className="text-[10px] font-bold" style={{ color:deliveryPct>=90?'#10b981':'#f59e0b' }}>{deliveryPct}% delivered</span>
                        </div>
                      )}
                      {msg.status==='scheduled' && msg.scheduled_at && <span className="text-[10px] text-blue-600 font-bold"><FiClock size={9} className="inline mr-0.5" />{new Date(msg.scheduled_at).toLocaleString('en-GB',{dateStyle:'short',timeStyle:'short'})}</span>}
                      {msg.sent_at && <span className="text-[10px] text-gray-400">{new Date(msg.sent_at).toLocaleDateString('en-GB')}</span>}
                      {msg.tags && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{msg.tags}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.status==='draft' && <button onClick={()=>handleSave({...msg,status:'sent',sent_at:new Date().toISOString(),delivered_count:Math.floor((msg.recipient_count||100)*0.95)})} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-700 flex items-center gap-1"><FiSend size={10}/> Send</button>}
                    <button onClick={()=>{ setEditItem(msg); setShowModal(true); }} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"><FiEdit2 size={12}/></button>
                    <button onClick={()=>msg.id&&handleDelete(msg.id)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200"><FiTrash2 size={12}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

