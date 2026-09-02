'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUser, FiAlertCircle, FiPlus, FiX, FiEye, FiEdit2,
    FiRefreshCw, FiMessageSquare, FiShield, FiLock,
} from 'react-icons/fi';

/* ─── TYPES ─── */
type Tab = 'dashboard' | 'referrals' | 'sessions' | 'followups' | 'reports';
type Role = 'Principal' | 'HOD' | 'Disciplinary Master' | 'Guidance Teacher' | 'Deputy Principal';

const ALLOWED_ROLES: Role[] = ['Principal', 'Deputy Principal', 'HOD', 'Disciplinary Master', 'Guidance Teacher'];

const CONCERN_TYPES = [
    'Academic Difficulty','Behavioral Issue','Emotional Distress','Family Problems',
    'Peer Conflict','Substance Abuse','Sexual Health','Career Guidance',
    'Financial Hardship','Grief & Loss','Anxiety/Depression','Bullying',
    'Self-Harm Risk','Truancy/Absenteeism','Other',
];
const SESSION_TYPES  = ['Individual','Group','Family','Crisis Intervention','Career Counseling','Follow-Up'];
const OUTCOMES       = ['Improving','Stable','Needs Follow-Up','Referred to External','Case Closed','No Change'];
const STATUSES       = ['Pending','In Progress','Resolved','Escalated','Closed'];
const SEVERITIES     = ['Minor','Moderate','Major','Critical'];

/* ─── HELPERS ─── */
const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const sevCls = (s: string) => ({
    Critical:'bg-red-600 text-white', Major:'bg-red-100 text-red-700',
    Moderate:'bg-amber-100 text-amber-700', Minor:'bg-blue-100 text-blue-700',
}[s] || 'bg-gray-100 text-gray-600');
const stsCls = (s: string) => ({
    Pending:'bg-amber-100 text-amber-700 border border-amber-200',
    'In Progress':'bg-blue-100 text-blue-700 border border-blue-200',
    Resolved:'bg-green-100 text-green-700 border border-green-200',
    Escalated:'bg-red-100 text-red-700 border border-red-200',
    Closed:'bg-gray-100 text-gray-500 border border-gray-200',
}[s] || 'bg-gray-100 text-gray-500');

const emptyRef = {
    concern_type:'Academic Difficulty', severity:'Moderate', description:'',
    referred_by:'', counselor_assigned:'', status:'Pending', notes:'',
    is_urgent:false, parent_notified:false,
};
const emptySess = {
    session_date:new Date().toISOString().split('T')[0], session_type:'Individual',
    duration_mins:45, session_notes:'', outcome:'Stable', next_session_date:'',
    counselor:'', action_plan:'',
};
const emptyFU = {
    referral_id:'', follow_up_date:new Date().toISOString().split('T')[0],
    notes:'', outcome:'Stable', next_follow_up:'', conducted_by:'',
};

/* ══════════════════════════════════════════════════════ */
export default function GuidancePage() {
    /* ─── AUTH GATE ─── */
    const [role, setRole]       = useState<string>('');
    const [roleInput, setRoleInput] = useState('');
    const [pinInput, setPinInput]   = useState('');
    const [authed, setAuthed]       = useState(false);
    const ROLE_PINS: Record<string,string> = {
        'Principal':'1001','Deputy Principal':'1002','HOD':'1003',
        'Disciplinary Master':'1004','Guidance Teacher':'1005',
    };
    const attemptLogin = () => {
        if(!ALLOWED_ROLES.includes(roleInput as Role)){toast.error('Role not permitted');return;}
        if(ROLE_PINS[roleInput] !== pinInput){toast.error('Incorrect PIN');return;}
        setRole(roleInput); setAuthed(true);
        toast.success(`✅ Logged in as ${roleInput}`);
    };
    const canEdit    = ['Principal','Deputy Principal','HOD','Disciplinary Master','Guidance Teacher'].includes(role);
    const canResolve = ['Principal','Deputy Principal','Guidance Teacher'].includes(role);
    const canDelete  = ['Principal'].includes(role);
    const canViewSensitive = ['Principal','Deputy Principal','Guidance Teacher'].includes(role);

    /* ─── STATE ─── */
    const [tab, setTab]           = useState<Tab>('dashboard');
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);

    const [referrals, setReferrals]   = useState<any[]>([]);
    const [sessions, setSessions]     = useState<any[]>([]);
    const [followUps, setFollowUps]   = useState<any[]>([]);
    const [students, setStudents]     = useState<any[]>([]);
    const [forms, setForms]           = useState<any[]>([]);
    const [streams, setStreams]       = useState<any[]>([]);

    /* Modals */
    const [showRefModal, setShowRefModal]   = useState(false);
    const [editRef, setEditRef]             = useState<any>(null);
    const [refSearch, setRefSearch]         = useState('');
    const [refStudentSel, setRefStudentSel] = useState<any>(null);
    const [refStudentDrop, setRefStudentDrop] = useState(false);
    const [refForm, setRefForm]   = useState(emptyRef);
    const [showSessModal, setShowSessModal] = useState(false);
    const [sessRefId, setSessRefId]         = useState<number|null>(null);
    const [sessForm, setSessForm]   = useState(emptySess);
    const [showFUModal, setShowFUModal]   = useState(false);
    const [fuForm, setFuForm]     = useState(emptyFU);
    const [viewRef, setViewRef]   = useState<any>(null);

    /* Filters */
    const [filterStatus, setFilterStatus]   = useState('All');
    const [filterConcern, setFilterConcern] = useState('All');
    const [filterSource, setFilterSource]   = useState('All');
    const [searchQ, setSearchQ]             = useState('');

    /* ─── FETCH ─── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [refRes, sessRes, fuRes, studRes, formRes, streamRes] = await Promise.all([
            supabase.from('school_guidance_referrals')
                .select('*, school_students(first_name,last_name,admission_number,form_id,stream_id,photo_url)')
                .order('created_at',{ascending:false}),
            supabase.from('school_guidance_sessions').select('*').order('session_date',{ascending:false}),
            supabase.from('school_guidance_follow_ups').select('*').order('follow_up_date',{ascending:false}),
            supabase.from('school_students').select('id,first_name,last_name,admission_number,form_id,stream_id').eq('status','Active').order('first_name'),
            supabase.from('school_forms').select('*'),
            supabase.from('school_streams').select('*'),
        ]);
        setReferrals(refRes.data||[]);
        setSessions(sessRes.data||[]);
        setFollowUps(fuRes.data||[]);
        setStudents(studRes.data||[]);
        setForms(formRes.data||[]);
        setStreams(streamRes.data||[]);
        setLoading(false);
    },[]);

    useEffect(()=>{ if(authed) fetchAll(); },[fetchAll,authed]);

    /* ─── HELPERS ─── */
    const getForm   = (id:any) => forms.find(f=>f.id===id)?.form_name||'';
    const getStream = (id:any) => streams.find(s=>s.id===id)?.stream_name||'';
    const refSessions  = (id:number) => sessions.filter(s=>s.referral_id===id);
    const refFollowUps = (id:number) => followUps.filter(f=>String(f.referral_id)===String(id));
    const filtStudents = students.filter(s=>
        !refSearch || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(refSearch.toLowerCase())
    );
    const filtReferrals = referrals.filter(r=>{
        const st=r.school_students;
        const q = !searchQ || `${st?.first_name} ${st?.last_name} ${st?.admission_number}`.toLowerCase().includes(searchQ.toLowerCase());
        const status = filterStatus==='All' || r.status===filterStatus;
        const concern = filterConcern==='All' || r.concern_type===filterConcern;
        const source = filterSource==='All' || r.source===filterSource;
        return q&&status&&concern&&source;
    });

    /* ─── STATS ─── */
    const total      = referrals.length;
    const pending    = referrals.filter(r=>r.status==='Pending').length;
    const inProgress = referrals.filter(r=>r.status==='In Progress').length;
    const resolved   = referrals.filter(r=>r.status==='Resolved').length;
    const urgent     = referrals.filter(r=>r.is_urgent&&!['Closed','Resolved'].includes(r.status)).length;
    const fromDisc   = referrals.filter(r=>r.source==='Discipline').length;

    /* ─── ACTIONS ─── */
    const saveReferral = async () => {
        if(!refStudentSel){toast.error('Select a student');return;}
        if(!refForm.description.trim()){toast.error('Describe the concern');return;}
        setSaving(true);
        const payload = {
            student_id:refStudentSel.id, concern_type:refForm.concern_type,
            severity:refForm.severity, description:refForm.description,
            referred_by:refForm.referred_by||role, counselor_assigned:refForm.counselor_assigned,
            status:refForm.status, notes:refForm.notes||null,
            is_urgent:refForm.is_urgent, parent_notified:refForm.parent_notified,
            source:'Manual', referral_date:new Date().toISOString().split('T')[0],
        };
        const {error} = editRef
            ? await supabase.from('school_guidance_referrals').update(payload).eq('id',editRef.id)
            : await supabase.from('school_guidance_referrals').insert([payload]);
        if(error){toast.error(error.message);setSaving(false);return;}
        toast.success(editRef?'✅ Referral updated':'✅ Referral created');
        setShowRefModal(false); setEditRef(null); setRefStudentSel(null);
        setRefSearch(''); setRefForm(emptyRef); setSaving(false); fetchAll();
    };

    const saveSession = async () => {
        if(!sessForm.session_notes.trim()){toast.error('Add session notes');return;}
        setSaving(true);
        const {error} = await supabase.from('school_guidance_sessions').insert([{
            referral_id:sessRefId, session_date:sessForm.session_date,
            session_type:sessForm.session_type, duration_mins:Number(sessForm.duration_mins),
            session_notes:sessForm.session_notes, outcome:sessForm.outcome,
            next_session_date:sessForm.next_session_date||null,
            counselor:sessForm.counselor||role, action_plan:sessForm.action_plan||null,
        }]);
        if(error){toast.error(error.message);setSaving(false);return;}
        if(sessRefId){
            await supabase.from('school_guidance_referrals').update({status:'In Progress'}).eq('id',sessRefId).eq('status','Pending');
        }
        toast.success('✅ Session recorded');
        setShowSessModal(false); setSessForm(emptySess); setSaving(false); fetchAll();
    };

    const saveFollowUp = async () => {
        if(!fuForm.notes.trim()){toast.error('Add notes');return;}
        setSaving(true);
        const {error} = await supabase.from('school_guidance_follow_ups').insert([{...fuForm,conducted_by:fuForm.conducted_by||role}]);
        if(error){toast.error(error.message);setSaving(false);return;}
        toast.success('✅ Follow-up saved');
        setShowFUModal(false); setFuForm(emptyFU); setSaving(false); fetchAll();
    };

    const updateStatus = async (id:number, status:string) => {
        await supabase.from('school_guidance_referrals').update({status}).eq('id',id);
        toast.success(`Status → ${status}`); fetchAll();
    };

    const deleteRef = async (id:number) => {
        if(!canDelete){toast.error('Only Principal can delete');return;}
        if(!confirm('Delete this referral permanently?')) return;
        await supabase.from('school_guidance_sessions').delete().eq('referral_id',id);
        await supabase.from('school_guidance_follow_ups').delete().eq('referral_id',id);
        await supabase.from('school_guidance_referrals').delete().eq('id',id);
        toast.success('Deleted'); fetchAll();
    };

    /* ─── STYLES ─── */
    const inp  = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';
    const lbl  = 'text-xs font-bold text-gray-600 uppercase tracking-wide mb-1 block';
    const tabCls = (t:Tab) => `px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${tab===t?'bg-teal-600 text-white shadow':'bg-white text-gray-600 hover:bg-teal-50 border border-gray-200'}`;

    /* ══════════════════════ AUTH GATE UI ══════════════════════ */
    if(!authed) return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-100">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                        <FiLock size={28} className="text-teal-600"/>
                    </div>
                    <h2 className="text-xl font-black text-gray-800">🫶 Guidance & Counselling</h2>
                    <p className="text-xs text-gray-500 mt-1">Restricted — Authorised Staff Only</p>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className={lbl}>Your Role</label>
                        <select value={roleInput} onChange={e=>setRoleInput(e.target.value)} className={inp}>
                            <option value="">— Select Role —</option>
                            {ALLOWED_ROLES.map(r=><option key={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={lbl}>Access PIN</label>
                        <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)}
                            onKeyDown={e=>e.key==='Enter'&&attemptLogin()}
                            className={inp} placeholder="Enter PIN"/>
                        <p className="text-[10px] text-gray-400 mt-1">Default PINs — Principal:1001 · DP:1002 · HOD:1003 · Disc.Master:1004 · Guidance:1005</p>
                    </div>
                    <button onClick={attemptLogin} className="w-full py-3 text-sm font-black text-white rounded-xl transition" style={{background:'linear-gradient(135deg,#0d9488,#0891b2)'}}>
                        🔐 Access Guidance Module
                    </button>
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-bold">⚠️ Confidential</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">All records in this module are strictly confidential and governed by Kenya's Data Protection Act 2019.</p>
                </div>
            </div>
        </div>
    );

    if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent"/></div>;

    /* ══════════════════════ MAIN UI ══════════════════════ */
    return (
        <div className="space-y-6 pb-16">
            {/* HEADER */}
            <div className="rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={{background:'linear-gradient(135deg,#0d9488,#0891b2)'}}>
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-2">🫶 Guidance & Counselling</h1>
                    <p className="text-xs text-white/70 mt-1">Confidential · {role} · Kenya MoE Aligned</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {urgent>0&&<span className="px-3 py-1 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">🚨 {urgent} URGENT</span>}
                    {fromDisc>0&&<span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-white">⚠️ {fromDisc} From Discipline</span>}
                    {canEdit&&<button onClick={()=>{setShowRefModal(true);setEditRef(null);setRefStudentSel(null);setRefSearch('');setRefForm(emptyRef);}} className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-teal-700 hover:bg-teal-50 flex items-center gap-1.5 shadow"><FiPlus size={12}/>New Referral</button>}
                    <button onClick={fetchAll} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><FiRefreshCw size={14}/></button>
                    <button onClick={()=>setAuthed(false)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-red-500 transition"><FiLock size={12}/></button>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                    {label:'Total Cases',val:total,color:'#0d9488',icon:'📁'},
                    {label:'Pending',val:pending,color:'#f59e0b',icon:'⏳'},
                    {label:'In Progress',val:inProgress,color:'#3b82f6',icon:'🔄'},
                    {label:'Resolved',val:resolved,color:'#22c55e',icon:'✅'},
                    {label:'Sessions',val:sessions.length,color:'#8b5cf6',icon:'💬'},
                    {label:'From Discipline',val:fromDisc,color:'#ef4444',icon:'🚨'},
                ].map(s=>(
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
                        <span className="text-xl">{s.icon}</span>
                        <p className="text-2xl font-black" style={{color:s.color}}>{s.val}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* TABS */}
            <div className="flex gap-2 flex-wrap">
                {(['dashboard','referrals','sessions','followups','reports'] as Tab[]).map(t=>(
                    <button key={t} onClick={()=>setTab(t)} className={tabCls(t)}>
                        {{dashboard:'🏠 Dashboard',referrals:'📋 Referrals',sessions:'💬 Sessions',followups:'🔄 Follow-Ups',reports:'📊 Reports'}[t]}
                        {t==='referrals'&&pending>0&&<span className="ml-1.5 bg-amber-400 text-white text-[9px] font-black px-1.5 rounded-full">{pending}</span>}
                    </button>
                ))}
            </div>

            {/* ── DASHBOARD ── */}
            {tab==='dashboard'&&(
                <div className="space-y-4">
                    {/* Urgent */}
                    {referrals.filter(r=>r.is_urgent&&!['Closed','Resolved'].includes(r.status)).length>0&&(
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <p className="text-sm font-black text-red-700 mb-3 flex items-center gap-2"><FiAlertCircle/>🚨 Urgent Cases — Immediate Attention</p>
                            {referrals.filter(r=>r.is_urgent&&!['Closed','Resolved'].includes(r.status)).map(r=>{
                                const st=r.school_students;
                                return(
                                    <div key={r.id} className="bg-white rounded-xl border border-red-200 p-3 flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{st?.first_name} {st?.last_name} <span className="text-xs text-gray-400">({st?.admission_number})</span></p>
                                            <p className="text-xs text-red-600">{r.concern_type} — {r.description?.slice(0,80)}…</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={()=>setViewRef(r)} className="px-3 py-1 text-xs font-bold text-teal-700 bg-teal-50 rounded-lg">View</button>
                                            {canEdit&&<button onClick={()=>{setSessRefId(r.id);setShowSessModal(true);}} className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-lg">Session Now</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Discipline referrals */}
                    {referrals.filter(r=>r.source==='Discipline'&&r.status==='Pending').length>0&&(
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <p className="text-sm font-black text-amber-700 mb-3">⚠️ New Discipline Referrals — Awaiting Counsellor Assignment</p>
                            {referrals.filter(r=>r.source==='Discipline'&&r.status==='Pending').map(r=>{
                                const st=r.school_students;
                                return(
                                    <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-center gap-3 mb-2">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-800">{st?.first_name} {st?.last_name} <span className="text-xs text-gray-400">| {getForm(st?.form_id)} {getStream(st?.stream_id)}</span></p>
                                            <p className="text-xs text-gray-500">{r.concern_type} · {fmt(r.referral_date)} · By: {r.referred_by||'Discipline Dept.'}</p>
                                            {canViewSensitive&&<p className="text-xs text-gray-600 mt-0.5 italic">"{r.description?.slice(0,100)}…"</p>}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevCls(r.severity)}`}>{r.severity}</span>
                                        <div className="flex gap-1.5 shrink-0">
                                            {canEdit&&<button onClick={()=>{setSessRefId(r.id);setShowSessModal(true);}} className="px-3 py-1.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-lg">+ Session</button>}
                                            {canEdit&&<button onClick={()=>updateStatus(r.id,'In Progress')} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg">Accept</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Recent */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <p className="font-black text-gray-800">Recent Referrals</p>
                            <button onClick={()=>setTab('referrals')} className="text-xs text-teal-600 font-bold">View All →</button>
                        </div>
                        {referrals.slice(0,8).map(r=>{
                            const st=r.school_students;
                            return(
                                <div key={r.id} className="p-4 flex items-center gap-4 border-b border-gray-50 hover:bg-gray-50 transition last:border-0">
                                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-sm font-black text-teal-700 shrink-0">{st?.first_name?.[0]}{st?.last_name?.[0]}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{st?.first_name} {st?.last_name} <span className="text-[10px] text-gray-400 font-normal">({st?.admission_number})</span></p>
                                        <p className="text-xs text-gray-400">{r.concern_type} · {fmt(r.referral_date)}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevCls(r.severity)}`}>{r.severity}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stsCls(r.status)}`}>{r.status}</span>
                                    {r.source==='Discipline'&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">🚨 Discipline</span>}
                                    <button onClick={()=>setViewRef(r)} className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600"><FiEye size={13}/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── REFERRALS ── */}
            {tab==='referrals'&&(
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search student…" className={`${inp} max-w-xs`}/>
                        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className={`${inp} max-w-[140px]`}>
                            <option value="All">All Statuses</option>
                            {STATUSES.map(s=><option key={s}>{s}</option>)}
                        </select>
                        <select value={filterConcern} onChange={e=>setFilterConcern(e.target.value)} className={`${inp} max-w-[180px]`}>
                            <option value="All">All Concerns</option>
                            {CONCERN_TYPES.map(c=><option key={c}>{c}</option>)}
                        </select>
                        <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} className={`${inp} max-w-[140px]`}>
                            <option value="All">All Sources</option>
                            <option>Discipline</option>
                            <option>Manual</option>
                        </select>
                        <span className="text-xs text-gray-400 ml-auto">{filtReferrals.length} record(s)</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['Student','Form','Concern','Severity','Source','Referred By','Date','Counsellor','Sessions','Status','Actions'].map(h=>(
                                        <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtReferrals.length===0&&<tr><td colSpan={11} className="text-center py-12 text-gray-400 text-sm">No referrals found</td></tr>}
                                {filtReferrals.map(r=>{
                                    const st=r.school_students;
                                    const sc=refSessions(r.id).length;
                                    return(
                                        <tr key={r.id} className="hover:bg-gray-50 transition">
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-black text-teal-700 shrink-0">{st?.first_name?.[0]}{st?.last_name?.[0]}</div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-xs">{st?.first_name} {st?.last_name}</p>
                                                        <p className="text-[10px] text-gray-400">{st?.admission_number}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{getForm(st?.form_id)} {getStream(st?.stream_id)}</td>
                                            <td className="px-3 py-3 text-xs text-gray-700 max-w-[120px] truncate">{r.concern_type}</td>
                                            <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevCls(r.severity)}`}>{r.severity}</span></td>
                                            <td className="px-3 py-3">{r.source==='Discipline'?<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">🚨 Discipline</span>:<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Manual</span>}</td>
                                            <td className="px-3 py-3 text-xs text-gray-500">{r.referred_by||'—'}</td>
                                            <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(r.referral_date)}</td>
                                            <td className="px-3 py-3 text-xs text-gray-600">{r.counselor_assigned||<span className="text-gray-300 italic text-[10px]">Unassigned</span>}</td>
                                            <td className="px-3 py-3 text-xs text-center">{sc>0?<span className="font-bold text-purple-600">{sc}</span>:<span className="text-gray-300">0</span>}</td>
                                            <td className="px-3 py-3">
                                                {canEdit
                                                    ?<select value={r.status} onChange={e=>updateStatus(r.id,e.target.value)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer ${stsCls(r.status)}`}>
                                                        {STATUSES.map(s=><option key={s}>{s}</option>)}
                                                    </select>
                                                    :<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stsCls(r.status)}`}>{r.status}</span>
                                                }
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={()=>setViewRef(r)} className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600" title="View"><FiEye size={12}/></button>
                                                    {canEdit&&<button onClick={()=>{setEditRef(r);setRefStudentSel(r.school_students);setRefForm({concern_type:r.concern_type,severity:r.severity,description:r.description,referred_by:r.referred_by||'',counselor_assigned:r.counselor_assigned||'',status:r.status,notes:r.notes||'',is_urgent:r.is_urgent,parent_notified:r.parent_notified});setShowRefModal(true);}} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit"><FiEdit2 size={12}/></button>}
                                                    {canEdit&&<button onClick={()=>{setSessRefId(r.id);setShowSessModal(true);}} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Add Session"><FiMessageSquare size={12}/></button>}
                                                    {canDelete&&<button onClick={()=>deleteRef(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiX size={12}/></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── SESSIONS ── */}
            {tab==='sessions'&&(
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <p className="font-black text-gray-800">All Counselling Sessions ({sessions.length})</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                {['Date','Student','Type','Duration','Counsellor','Outcome','Next Session','Action Plan'].map(h=>(
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sessions.length===0&&<tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No sessions recorded</td></tr>}
                            {sessions.map(s=>{
                                const ref=referrals.find(r=>r.id===s.referral_id);
                                const st=ref?.school_students;
                                return(
                                    <tr key={s.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmt(s.session_date)}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-800">{st?`${st.first_name} ${st.last_name}`:'—'}</td>
                                        <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{s.session_type}</span></td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{s.duration_mins} min</td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{s.counselor||'—'}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.outcome==='Improving'?'bg-green-100 text-green-700':s.outcome==='Needs Follow-Up'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600'}`}>{s.outcome}</span></td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{s.next_session_date?fmt(s.next_session_date):'—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{s.action_plan||'—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── FOLLOW-UPS ── */}
            {tab==='followups'&&(
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <p className="font-black text-gray-800">Follow-Up Records ({followUps.length})</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                {['Date','Student','Notes','Outcome','Next Follow-Up','By'].map(h=>(
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {followUps.length===0&&<tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No follow-ups yet</td></tr>}
                            {followUps.map(f=>{
                                const ref=referrals.find(r=>String(r.id)===String(f.referral_id));
                                const st=ref?.school_students;
                                return(
                                    <tr key={f.id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmt(f.follow_up_date)}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-800">{st?`${st.first_name} ${st.last_name}`:'—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{f.notes}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.outcome==='Improving'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{f.outcome}</span></td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{f.next_follow_up?fmt(f.next_follow_up):'—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{f.conducted_by||'—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── REPORTS ── */}
            {tab==='reports'&&(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="font-black text-gray-800 mb-4">📊 Cases by Concern</p>
                        {CONCERN_TYPES.map(ct=>{
                            const count=referrals.filter(r=>r.concern_type===ct).length;
                            if(!count) return null;
                            const pct=total?Math.round((count/total)*100):0;
                            return(
                                <div key={ct} className="mb-2">
                                    <div className="flex justify-between text-xs mb-0.5"><span className="font-medium text-gray-700">{ct}</span><span className="font-bold text-gray-500">{count} ({pct}%)</span></div>
                                    <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-teal-500 rounded-full" style={{width:`${pct}%`}}/></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6">
                        <div>
                            <p className="font-black text-gray-800 mb-4">📈 Cases by Status</p>
                            {STATUSES.map(st=>{
                                const count=referrals.filter(r=>r.status===st).length;
                                const pct=total?Math.round((count/total)*100):0;
                                const colors:Record<string,string>={Pending:'#f59e0b','In Progress':'#3b82f6',Resolved:'#22c55e',Escalated:'#ef4444',Closed:'#6b7280'};
                                return(
                                    <div key={st} className="mb-2">
                                        <div className="flex justify-between text-xs mb-0.5"><span className="font-medium text-gray-700">{st}</span><span className="font-bold text-gray-500">{count} ({pct}%)</span></div>
                                        <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${pct}%`,background:colors[st]}}/></div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                            <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-purple-700">{sessions.length}</p><p className="text-[10px] text-purple-500 font-bold uppercase">Total Sessions</p></div>
                            <div className="bg-teal-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-teal-700">{sessions.reduce((a,s)=>a+(Number(s.duration_mins)||0),0)}</p><p className="text-[10px] text-teal-500 font-bold uppercase">Total Minutes</p></div>
                            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-amber-700">{fromDisc}</p><p className="text-[10px] text-amber-500 font-bold uppercase">Discipline Refs</p></div>
                            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-red-700">{urgent}</p><p className="text-[10px] text-red-500 font-bold uppercase">Urgent Open</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ VIEW REFERRAL MODAL ══ */}
            {viewRef&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setViewRef(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between" style={{background:'linear-gradient(135deg,#0d9488,#0891b2)',borderRadius:'16px 16px 0 0'}}>
                            <div><h3 className="text-base font-black text-white">🫶 Referral Details</h3><p className="text-xs text-white/70">Opened {fmt(viewRef.referral_date)}{viewRef.source==='Discipline'?' · 🚨 From Discipline':''}</p></div>
                            <button onClick={()=>setViewRef(null)} className="text-white/70 hover:text-white"><FiX size={18}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-lg font-black text-teal-700">{viewRef.school_students?.first_name?.[0]}{viewRef.school_students?.last_name?.[0]}</div>
                                <div>
                                    <p className="font-black text-gray-800">{viewRef.school_students?.first_name} {viewRef.school_students?.last_name}</p>
                                    <p className="text-xs text-gray-500">{viewRef.school_students?.admission_number} · {getForm(viewRef.school_students?.form_id)} {getStream(viewRef.school_students?.stream_id)}</p>
                                </div>
                                <div className="ml-auto flex gap-2 flex-wrap">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${sevCls(viewRef.severity)}`}>{viewRef.severity}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stsCls(viewRef.status)}`}>{viewRef.status}</span>
                                    {viewRef.is_urgent&&<span className="text-xs font-bold px-2 py-1 rounded-full bg-red-600 text-white">🚨 URGENT</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[['Concern',viewRef.concern_type],['Source',viewRef.source==='Discipline'?'🚨 Discipline Dept.':'Manual'],['Referred By',viewRef.referred_by||'—'],['Counsellor',viewRef.counselor_assigned||'Unassigned'],['Parent Notified',viewRef.parent_notified?'Yes ✅':'No']].map(([k,v])=>(
                                    <div key={k} className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-400 uppercase">{k}</p><p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p></div>
                                ))}
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p><p className="text-sm text-gray-700">{viewRef.description}</p></div>
                            {viewRef.notes&&<div className="bg-blue-50 rounded-xl p-3"><p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Notes</p><p className="text-sm text-blue-700">{viewRef.notes}</p></div>}
                            {/* Sessions */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-black text-gray-800">💬 Sessions ({refSessions(viewRef.id).length})</p>
                                    {canEdit&&<button onClick={()=>{setSessRefId(viewRef.id);setShowSessModal(true);setViewRef(null);}} className="text-xs font-bold text-teal-600">+ Add Session</button>}
                                </div>
                                {refSessions(viewRef.id).length===0
                                    ?<p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3 text-center">No sessions yet</p>
                                    :refSessions(viewRef.id).map(s=>(
                                        <div key={s.id} className="bg-gray-50 rounded-xl p-3 mb-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-700">{fmt(s.session_date)} · {s.session_type} · {s.duration_mins}min · {s.counselor}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.outcome==='Improving'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{s.outcome}</span>
                                            </div>
                                            {canViewSensitive&&<p className="text-xs text-gray-600">{s.session_notes}</p>}
                                            {!canViewSensitive&&<p className="text-xs text-gray-400 italic">Session notes — restricted view</p>}
                                            {s.action_plan&&<p className="text-xs text-blue-600 mt-1">📋 {s.action_plan}</p>}
                                        </div>
                                    ))
                                }
                            </div>
                            {/* Actions */}
                            <div className="flex gap-2 pt-2 flex-wrap">
                                {canEdit&&<button onClick={()=>{setSessRefId(viewRef.id);setShowSessModal(true);setViewRef(null);}} className="flex-1 py-2 text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 rounded-xl">+ Session</button>}
                                {canEdit&&<button onClick={()=>{setFuForm(f=>({...f,referral_id:String(viewRef.id)}));setShowFUModal(true);setViewRef(null);}} className="flex-1 py-2 text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl">+ Follow-Up</button>}
                                {canResolve&&viewRef.status!=='Resolved'&&<button onClick={()=>{updateStatus(viewRef.id,'Resolved');setViewRef(null);}} className="flex-1 py-2 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-xl">✅ Resolve</button>}
                                {canEdit&&viewRef.status!=='Escalated'&&<button onClick={()=>{updateStatus(viewRef.id,'Escalated');setViewRef(null);}} className="flex-1 py-2 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl">🚨 Escalate</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ NEW REFERRAL MODAL ══ */}
            {showRefModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowRefModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{background:'linear-gradient(135deg,#0d9488,#0891b2)',borderRadius:'16px 16px 0 0'}}>
                            <h3 className="text-base font-black text-white">{editRef?'✏️ Edit Referral':'➕ New Referral'}</h3>
                            <button onClick={()=>setShowRefModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className={lbl}>Student *</label>
                                <div className="relative">
                                    <input value={refStudentSel?`${refStudentSel.first_name} ${refStudentSel.last_name} (${refStudentSel.admission_number})`:refSearch}
                                        onChange={e=>{setRefSearch(e.target.value);setRefStudentSel(null);setRefStudentDrop(true);}}
                                        onFocus={()=>setRefStudentDrop(true)} onBlur={()=>setTimeout(()=>setRefStudentDrop(false),200)}
                                        className={inp} placeholder="Search by name or admission no…"/>
                                    {refStudentDrop&&!refStudentSel&&(
                                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                            {filtStudents.slice(0,12).map(s=>(
                                                <button key={s.id} type="button" onMouseDown={()=>{setRefStudentSel(s);setRefStudentDrop(false);}} className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 border-b last:border-0 border-gray-100">
                                                    <span className="font-bold text-gray-800">{s.first_name} {s.last_name}</span>
                                                    <span className="text-gray-400 ml-2">{s.admission_number} · {getForm(s.form_id)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Concern Type *</label><select value={refForm.concern_type} onChange={e=>setRefForm(f=>({...f,concern_type:e.target.value}))} className={inp}>{CONCERN_TYPES.map(c=><option key={c}>{c}</option>)}</select></div>
                                <div><label className={lbl}>Severity</label><select value={refForm.severity} onChange={e=>setRefForm(f=>({...f,severity:e.target.value}))} className={inp}>{SEVERITIES.map(s=><option key={s}>{s}</option>)}</select></div>
                            </div>
                            <div><label className={lbl}>Description *</label><textarea value={refForm.description} onChange={e=>setRefForm(f=>({...f,description:e.target.value}))} className={inp} rows={3} placeholder="Describe the concern in detail…"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Referred By</label><input value={refForm.referred_by} onChange={e=>setRefForm(f=>({...f,referred_by:e.target.value}))} className={inp} placeholder={role}/></div>
                                <div><label className={lbl}>Counsellor Assigned</label><input value={refForm.counselor_assigned} onChange={e=>setRefForm(f=>({...f,counselor_assigned:e.target.value}))} className={inp} placeholder="Guidance teacher name"/></div>
                            </div>
                            <div><label className={lbl}>Notes</label><textarea value={refForm.notes} onChange={e=>setRefForm(f=>({...f,notes:e.target.value}))} className={inp} rows={2}/></div>
                            <div className="flex items-center gap-6 flex-wrap">
                                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={refForm.is_urgent} onChange={e=>setRefForm(f=>({...f,is_urgent:e.target.checked}))} className="w-4 h-4 accent-red-500"/><span className="font-bold text-red-600">🚨 Urgent</span></label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={refForm.parent_notified} onChange={e=>setRefForm(f=>({...f,parent_notified:e.target.checked}))} className="w-4 h-4 accent-teal-500"/><span>Parent Notified</span></label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={()=>setShowRefModal(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                                <button onClick={saveReferral} disabled={saving} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50" style={{background:'linear-gradient(135deg,#0d9488,#0891b2)'}}>{saving?'Saving…':editRef?'Update':'Create Referral'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ SESSION MODAL ══ */}
            {showSessModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowSessModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{background:'linear-gradient(135deg,#7c3aed,#5b21b6)',borderRadius:'16px 16px 0 0'}}>
                            <h3 className="text-base font-black text-white">💬 Record Counselling Session</h3>
                            <button onClick={()=>setShowSessModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Session Date</label><input type="date" value={sessForm.session_date} onChange={e=>setSessForm(f=>({...f,session_date:e.target.value}))} className={inp}/></div>
                                <div><label className={lbl}>Session Type</label><select value={sessForm.session_type} onChange={e=>setSessForm(f=>({...f,session_type:e.target.value}))} className={inp}>{SESSION_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                                <div><label className={lbl}>Duration (min)</label><input type="number" value={sessForm.duration_mins} onChange={e=>setSessForm(f=>({...f,duration_mins:Number(e.target.value)}))} className={inp} min={5} step={5}/></div>
                                <div><label className={lbl}>Counsellor</label><input value={sessForm.counselor} onChange={e=>setSessForm(f=>({...f,counselor:e.target.value}))} className={inp} placeholder={role}/></div>
                            </div>
                            <div><label className={lbl}>Session Notes * <span className="text-red-500">(Confidential)</span></label><textarea value={sessForm.session_notes} onChange={e=>setSessForm(f=>({...f,session_notes:e.target.value}))} className={inp} rows={4} placeholder="What was discussed…"/></div>
                            <div><label className={lbl}>Action Plan</label><textarea value={sessForm.action_plan} onChange={e=>setSessForm(f=>({...f,action_plan:e.target.value}))} className={inp} rows={2} placeholder="Steps agreed upon…"/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Outcome</label><select value={sessForm.outcome} onChange={e=>setSessForm(f=>({...f,outcome:e.target.value}))} className={inp}>{OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></div>
                                <div><label className={lbl}>Next Session</label><input type="date" value={sessForm.next_session_date} onChange={e=>setSessForm(f=>({...f,next_session_date:e.target.value}))} className={inp}/></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={()=>setShowSessModal(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl">Cancel</button>
                                <button onClick={saveSession} disabled={saving} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50" style={{background:'linear-gradient(135deg,#7c3aed,#5b21b6)'}}>{saving?'Saving…':'Save Session'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ FOLLOW-UP MODAL ══ */}
            {showFUModal&&(
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowFUModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
                        <div className="p-5 flex items-center justify-between" style={{background:'linear-gradient(135deg,#059669,#0891b2)',borderRadius:'16px 16px 0 0'}}>
                            <h3 className="text-base font-black text-white">🔄 Record Follow-Up</h3>
                            <button onClick={()=>setShowFUModal(false)} className="text-white/70 hover:text-white"><FiX/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Follow-Up Date</label><input type="date" value={fuForm.follow_up_date} onChange={e=>setFuForm(f=>({...f,follow_up_date:e.target.value}))} className={inp}/></div>
                                <div><label className={lbl}>Conducted By</label><input value={fuForm.conducted_by} onChange={e=>setFuForm(f=>({...f,conducted_by:e.target.value}))} className={inp} placeholder={role}/></div>
                            </div>
                            <div><label className={lbl}>Notes *</label><textarea value={fuForm.notes} onChange={e=>setFuForm(f=>({...f,notes:e.target.value}))} className={inp} rows={3}/></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={lbl}>Outcome</label><select value={fuForm.outcome} onChange={e=>setFuForm(f=>({...f,outcome:e.target.value}))} className={inp}>{OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></div>
                                <div><label className={lbl}>Next Follow-Up</label><input type="date" value={fuForm.next_follow_up} onChange={e=>setFuForm(f=>({...f,next_follow_up:e.target.value}))} className={inp}/></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={()=>setShowFUModal(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 rounded-xl">Cancel</button>
                                <button onClick={saveFollowUp} disabled={saving} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50" style={{background:'linear-gradient(135deg,#059669,#0891b2)'}}>{saving?'Saving…':'Save Follow-Up'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
