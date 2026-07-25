'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiUsers, FiUser, FiBook, FiAward, FiMail, FiPhone, FiSearch, FiPlus,
    FiCheck, FiX, FiEdit2, FiTrash2, FiDownload, FiEye, FiSend,
    FiShield, FiRefreshCw, FiArrowRight, FiCalendar, FiFileText,
    FiStar, FiTrendingUp, FiBarChart2, FiGrid, FiList, FiLayers,
    FiFolder, FiMessageSquare, FiBell, FiCheckCircle, FiAlertCircle,
    FiClock, FiZap, FiGlobe, FiLock, FiUnlock, FiChevronRight,
    FiActivity, FiPieChart, FiTarget, FiInfo, FiCopy,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── Types ────────────────────────────────────────────────────────────────────
type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type Tab = 'overview' | 'parents' | 'competency' | 'portfolio' | 'messages' | 'notifications' | 'settings';

interface ParentAccount {
    id: string; student_id: number; student_name?: string; form_name?: string;
    parent_name: string; email: string; phone?: string; relationship?: string;
    portal_access: boolean; last_login?: string; created_at: string;
    access_code?: string; notification_enabled?: boolean;
}
interface Student {
    id: number; first_name: string; last_name: string; admission_no?: string;
    form_id?: number; form_name?: string; gender?: string;
    guardian_name?: string; guardian_phone?: string; guardian_email?: string;
    guardian_relationship?: string;
}
interface CBCMark { subject_name: string; competency_level: CompLevel; term?: string; }
interface PortfolioItem { id: string; student_id: number; title: string; learning_area?: string; competency_level?: CompLevel; status: string; created_at: string; }
interface Message { id: string; parent_id?: string; student_id?: number; student_name?: string; sender: string; content: string; is_read: boolean; created_at: string; type: 'announcement'|'personal'|'achievement'|'alert'; }
interface Notification { id: string; student_id?: number; student_name?: string; type: string; title: string; body: string; is_sent: boolean; created_at: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const COMP: Record<CompLevel, { label: string; color: string; bg: string; score: number; desc: string }> = {
    EE: { label: 'Exceeding Expectation',   color: '#059669', bg: '#D1FAE5', score: 4, desc: 'Your child is performing outstandingly — beyond expected grade level.' },
    ME: { label: 'Meeting Expectation',     color: '#2563EB', bg: '#DBEAFE', score: 3, desc: 'Your child is performing at the expected grade level. Keep it up!' },
    AE: { label: 'Approaching Expectation', color: '#D97706', bg: '#FEF3C7', score: 2, desc: 'Your child is making progress and approaching the expected level.' },
    BE: { label: 'Below Expectation',       color: '#DC2626', bg: '#FEE2E2', score: 1, desc: 'Your child needs additional support to reach the expected level.' },
};

const DEMO_PARENTS: ParentAccount[] = [
    { id:'p1', student_id:1, student_name:'Amina Otieno', form_name:'Grade 7A', parent_name:'Mr. James Otieno', email:'james.otieno@gmail.com', phone:'+254712345678', relationship:'Father', portal_access:true, last_login:'2025-04-20T09:30:00Z', created_at:'2025-01-15T08:00:00Z', access_code:'AMO-7291', notification_enabled:true },
    { id:'p2', student_id:2, student_name:'Brian Mwangi', form_name:'Grade 8B', parent_name:'Mrs. Grace Mwangi', email:'grace.mwangi@yahoo.com', phone:'+254722456789', relationship:'Mother', portal_access:true, last_login:'2025-04-18T14:00:00Z', created_at:'2025-01-15T08:00:00Z', access_code:'BRM-8415', notification_enabled:true },
    { id:'p3', student_id:3, student_name:'Chloe Wanjiku', form_name:'Grade 6A', parent_name:'Mr. Peter Wanjiku', email:'peter.wanjiku@gmail.com', phone:'+254733567890', relationship:'Father', portal_access:false, last_login:undefined, created_at:'2025-02-01T09:00:00Z', access_code:'CHW-6832', notification_enabled:false },
    { id:'p4', student_id:4, student_name:'David Kipkoech', form_name:'Grade 9A', parent_name:'Mrs. Rose Kipkoech', email:'rose.k@gmail.com', phone:'+254744678901', relationship:'Mother', portal_access:true, last_login:'2025-04-22T11:00:00Z', created_at:'2025-01-20T10:00:00Z', access_code:'DVK-9174', notification_enabled:true },
];

const DEMO_MARKS: CBCMark[] = [
    {subject_name:'English', competency_level:'EE', term:'Term 1'},
    {subject_name:'Mathematics', competency_level:'ME', term:'Term 1'},
    {subject_name:'Integrated Science', competency_level:'AE', term:'Term 1'},
    {subject_name:'Kiswahili', competency_level:'ME', term:'Term 1'},
    {subject_name:'Social Studies', competency_level:'EE', term:'Term 1'},
    {subject_name:'Creative Arts', competency_level:'ME', term:'Term 1'},
    {subject_name:'Agriculture', competency_level:'BE', term:'Term 1'},
    {subject_name:'Pre-Technical Studies', competency_level:'AE', term:'Term 1'},
];

const DEMO_MESSAGES: Message[] = [
    { id:'m1', student_name:'Amina Otieno', sender:'Ms. Kamau (Class Teacher)', content:'Amina has shown remarkable improvement in Environmental Activities this term. Her Water Cycle project was outstanding and has been selected for the school science fair. Please encourage her to continue practising her oral presentations.', is_read:false, created_at:'2025-04-22T09:00:00Z', type:'achievement' },
    { id:'m2', student_name:'All Parents', sender:'School Administration', content:'Dear Parents, CBC Term 2 SBA tasks will begin on 5th May 2025. Please ensure all materials listed in the student handbook are available. SBA contributes 40% to the final grade. For questions contact the class teacher.', is_read:true, created_at:'2025-04-20T08:00:00Z', type:'announcement' },
    { id:'m3', student_name:'Brian Mwangi', sender:'Mr. Odhiambo (Mathematics)', content:'Brian needs additional support with Fractions and Decimals. I have assigned extra practice worksheets. Please supervise his homework daily for the next 2 weeks. Feel free to book a parent-teacher meeting.', is_read:false, created_at:'2025-04-18T14:30:00Z', type:'alert' },
];

const DEMO_NOTIFS: Notification[] = [
    { id:'n1', student_name:'Amina Otieno', type:'new_score', title:'New SBA Score Added', body:'Amina received EE in English - Creative Writing Portfolio Task.', is_sent:true, created_at:'2025-04-22T09:00:00Z' },
    { id:'n2', student_name:'Brian Mwangi', type:'portfolio', title:'Portfolio Item Approved', body:"Brian's Fraction Pizza activity has been approved and shared by Mr. Odhiambo.", is_sent:true, created_at:'2025-04-21T11:00:00Z' },
    { id:'n3', student_name:'All', type:'announcement', title:'Term 2 SBA Dates Released', body:'School Based Assessment for Term 2 begins 5th May 2025.', is_sent:false, created_at:'2025-04-23T08:00:00Z' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const compBadge = (l?: CompLevel) => {
    if (!l) return <span className="text-[10px] text-gray-400">—</span>;
    const c = COMP[l];
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.color }}><FiAward size={9}/>{l}</span>;
};
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) : 'Never';
const fmtTime = (d?: string) => d ? new Date(d).toLocaleString('en-KE', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
const genCode = (name: string, form: string) => `${name.slice(0,3).toUpperCase()}-${form.replace(/\D/g,'').slice(0,1)||'X'}${Math.floor(Math.random()*9000+1000)}`;

const SQL_PORTAL = `-- CBC Parent Portal tables
CREATE TABLE IF NOT EXISTS school_parent_portal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id bigint REFERENCES school_students(id) ON DELETE CASCADE,
  parent_name text NOT NULL,
  email text NOT NULL,
  phone text,
  relationship text DEFAULT 'Parent',
  portal_access boolean DEFAULT false,
  access_code text UNIQUE,
  notification_enabled boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_parent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES school_parent_portal(id) ON DELETE CASCADE,
  student_id bigint,
  sender text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'personal',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id bigint,
  type text,
  title text NOT NULL,
  body text,
  is_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_parent_portal ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_parent_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_parent_portal FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_parent_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_parent_notifications FOR ALL USING (true) WITH CHECK (true);`;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function CBCParentPortalPage() {
    const [tab, setTab]               = useState<Tab>('overview');
    const [parents, setParents]       = useState<ParentAccount[]>([]);
    const [students, setStudents]     = useState<Student[]>([]);
    const [forms, setForms]           = useState<any[]>([]);
    const [marks, setMarks]           = useState<CBCMark[]>([]);
    const [portfolio, setPortfolio]   = useState<PortfolioItem[]>([]);
    const [messages, setMessages]     = useState<Message[]>([]);
    const [notifications, setNotifs]  = useState<Notification[]>([]);
    const [loading, setLoading]       = useState(true);
    const [dbReady, setDbReady]       = useState(false);
    const [search, setSearch]         = useState('');
    const [fForm, setFForm]           = useState('');
    const [fAccess, setFAccess]       = useState('');
    const [selectedStudent, setSelStu] = useState<Student|null>(null);
    const [showAddParent, setShowAdd] = useState(false);
    const [showMsgModal, setShowMsg]  = useState(false);
    const [showNotifModal, setShowNotif] = useState(false);
    const [savingParent, setSavingParent] = useState(false);
    const [sending, setSending]       = useState(false);
    const [viewParent, setViewParent] = useState<ParentAccount|null>(null);

    const emptyParent = { student_id:'', parent_name:'', email:'', phone:'', relationship:'Parent' };
    const [pForm, setPForm] = useState(emptyParent);
    const emptyMsg = { title:'', content:'', type:'announcement' as Message['type'], student_id:'' };
    const [msgForm, setMsgForm] = useState(emptyMsg);
    const emptyNotif = { title:'', body:'', type:'announcement', student_id:'' };
    const [notifForm, setNotifForm] = useState(emptyNotif);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [fmsR, stuR] = await Promise.all([
                sb.from('school_forms').select('id,name,form_name,form_level').order('form_level'),
                sb.from('school_students').select('id,first_name,last_name,admission_no,form_id,gender,guardian_name,guardian_phone,guardian_email,guardian_relationship').order('first_name').limit(1000),
            ]);
            const fmsData = fmsR.data || [];
            setForms(fmsData);
            const fmMap: Record<number,string> = {};
            fmsData.forEach((f:any) => { fmMap[f.id] = f.form_name || f.name || `Grade ${f.form_level}`; });
            const stuData = (stuR.data || []).map((s:any) => ({ ...s, form_name: fmMap[s.form_id] || '—' }));
            setStudents(stuData);

            // Check portal table
            const { error: tErr } = await sb.from('school_parent_portal').select('id').limit(1);
            const ready = !tErr || tErr.code !== '42P01';
            setDbReady(ready);

            if (ready) {
                const { data: pData } = await sb.from('school_parent_portal').select('*').order('created_at', { ascending: false });
                if (pData) {
                    setParents(pData.map((p:any) => {
                        const stu = stuData.find((s:any) => s.id === p.student_id);
                        return { ...p, student_name: stu ? `${stu.first_name} ${stu.last_name}` : '—', form_name: stu ? fmMap[stu.form_id] || '—' : '—' };
                    }));
                }
                // Load messages & notifications
                const [msgR, notR] = await Promise.all([
                    sb.from('school_parent_messages').select('*').order('created_at', { ascending: false }).limit(50),
                    sb.from('school_parent_notifications').select('*').order('created_at', { ascending: false }).limit(50),
                ]);
                if (msgR.data) {
                    setMessages(msgR.data.map((m:any) => ({ ...m, student_name: stuData.find((s:any)=>s.id===m.student_id) ? `${stuData.find((s:any)=>s.id===m.student_id)!.first_name} ${stuData.find((s:any)=>s.id===m.student_id)!.last_name}` : 'All Parents' })));
                }
                if (notR.data) {
                    setNotifs(notR.data.map((n:any) => ({ ...n, student_name: stuData.find((s:any)=>s.id===n.student_id) ? `${stuData.find((s:any)=>s.id===n.student_id)!.first_name} ${stuData.find((s:any)=>s.id===n.student_id)!.last_name}` : 'All' })));
                }
            } else {
                // Demo mode — hydrate from guardian fields on students
                const demoParents: ParentAccount[] = stuData
                    .filter((s:any) => s.guardian_name || s.guardian_email)
                    .slice(0, 20)
                    .map((s:any, i:number) => ({
                        id: `demo-${s.id}`, student_id: s.id,
                        student_name: `${s.first_name} ${s.last_name}`, form_name: fmMap[s.form_id] || '—',
                        parent_name: s.guardian_name || 'Guardian', email: s.guardian_email || `guardian${s.id}@school.ac.ke`,
                        phone: s.guardian_phone, relationship: s.guardian_relationship || 'Parent',
                        portal_access: i < 8, last_login: i < 5 ? new Date(Date.now() - i*86400000*2).toISOString() : undefined,
                        created_at: new Date(Date.now() - i*86400000*7).toISOString(),
                        access_code: genCode(s.first_name, fmMap[s.form_id] || '7'),
                        notification_enabled: i % 3 !== 0,
                    }));
                setParents(demoParents.length > 0 ? demoParents : DEMO_PARENTS);
                setMessages(DEMO_MESSAGES);
                setNotifs(DEMO_NOTIFS);
            }

            // CBC marks (latest term)
            const { data: mData } = await sb.from('school_cbc_marks').select('subject_name,competency_level,term_id').limit(200);
            if (mData && mData.length > 0) setMarks(mData.map((m:any) => ({ ...m, term: `Term ${m.term_id}` })));
            else setMarks(DEMO_MARKS);

            // Portfolio
            const { data: pfolio } = await sb.from('school_cbc_portfolios').select('id,student_id,title,learning_area,competency_level,status,created_at').limit(100);
            if (pfolio) setPortfolio(pfolio);

        } catch(e) { console.error(e); setParents(DEMO_PARENTS); setMessages(DEMO_MESSAGES); setNotifs(DEMO_NOTIFS); }
        setLoading(false);
    }

    const filtered = useMemo(() => parents.filter(p =>
        (!search || `${p.parent_name} ${p.student_name||''} ${p.email} ${p.phone||''}`.toLowerCase().includes(search.toLowerCase()))
        && (!fForm || students.find(s=>s.id===p.student_id&&String(s.form_id)===fForm))
        && (!fAccess || (fAccess==='active'?p.portal_access:!p.portal_access))
    ), [parents, search, fForm, fAccess, students]);

    const stats = useMemo(() => ({
        total: parents.length,
        active: parents.filter(p=>p.portal_access).length,
        inactive: parents.filter(p=>!p.portal_access).length,
        notifEnabled: parents.filter(p=>p.notification_enabled).length,
        loggedInToday: parents.filter(p=>p.last_login&&new Date(p.last_login)>new Date(Date.now()-86400000)).length,
        unreadMsgs: messages.filter(m=>!m.is_read).length,
        pendingNotifs: notifications.filter(n=>!n.is_sent).length,
        coverage: students.length > 0 ? Math.round(parents.length/students.length*100) : 0,
    }), [parents, messages, notifications, students]);

    async function saveParent() {
        if (!pForm.student_id || !pForm.parent_name || !pForm.email) { toast.error('Fill required fields: Student, Parent Name, Email'); return; }
        setSavingParent(true);
        const stu = students.find(s=>s.id===Number(pForm.student_id));
        const code = genCode(pForm.parent_name, stu?.form_name||'7');
        try {
            if (dbReady) {
                const { error } = await sb.from('school_parent_portal').insert({ student_id:Number(pForm.student_id), parent_name:pForm.parent_name, email:pForm.email, phone:pForm.phone, relationship:pForm.relationship, portal_access:false, access_code:code, notification_enabled:true });
                if (error) throw error;
                toast.success(`✅ Parent account created! Access code: ${code}`); setShowAdd(false); setPForm(emptyParent); load();
            } else {
                const newP: ParentAccount = { id:`n-${Date.now()}`, student_id:Number(pForm.student_id), student_name:stu?`${stu.first_name} ${stu.last_name}`:'—', form_name:stu?.form_name||'—', parent_name:pForm.parent_name, email:pForm.email, phone:pForm.phone, relationship:pForm.relationship, portal_access:false, access_code:code, notification_enabled:true, created_at:new Date().toISOString() };
                setParents(p=>[newP,...p]); toast.success(`✅ Parent added (demo)! Code: ${code}`); setShowAdd(false); setPForm(emptyParent);
            }
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSavingParent(false);
    }

    async function toggleAccess(id:string, current:boolean) {
        if (dbReady) await sb.from('school_parent_portal').update({ portal_access: !current }).eq('id', id);
        setParents(p=>p.map(x=>x.id===id?{...x,portal_access:!current}:x));
        toast.success(`Portal access ${!current?'enabled':'disabled'}!`);
    }

    async function deleteParent(id:string) {
        if (!confirm('Remove this parent account?')) return;
        if (dbReady) await sb.from('school_parent_portal').delete().eq('id', id);
        setParents(p=>p.filter(x=>x.id!==id));
        if (viewParent?.id===id) setViewParent(null);
        toast.success('Account removed');
    }

    async function sendMessage() {
        if (!msgForm.content||!msgForm.title) { toast.error('Fill title and message'); return; }
        setSending(true);
        try {
            const payload = { sender:'School Administration', content:`${msgForm.title}\n\n${msgForm.content}`, type:msgForm.type, is_read:false, student_id:msgForm.student_id?Number(msgForm.student_id):null };
            if (dbReady) {
                const { error } = await sb.from('school_parent_messages').insert(payload);
                if (error) throw error;
                load();
            } else {
                const stu = students.find(s=>s.id===Number(msgForm.student_id));
                setMessages(m=>[{ id:`m-${Date.now()}`, ...payload, student_name:stu?`${stu.first_name} ${stu.last_name}`:'All Parents', created_at:new Date().toISOString() } as Message,...m]);
            }
            toast.success('✅ Message sent to parent portal!'); setShowMsg(false); setMsgForm(emptyMsg);
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSending(false);
    }

    async function sendNotification() {
        if (!notifForm.title) { toast.error('Fill notification title'); return; }
        setSending(true);
        try {
            const payload = { title:notifForm.title, body:notifForm.body, type:notifForm.type, is_sent:false, student_id:notifForm.student_id?Number(notifForm.student_id):null };
            if (dbReady) {
                await sb.from('school_parent_notifications').insert(payload); load();
            } else {
                const stu = students.find(s=>s.id===Number(notifForm.student_id));
                setNotifs(n=>[{ id:`n-${Date.now()}`, ...payload, student_name:stu?`${stu.first_name} ${stu.last_name}`:'All', created_at:new Date().toISOString() } as Notification,...n]);
            }
            toast.success('✅ Notification queued!'); setShowNotif(false); setNotifForm(emptyNotif);
        } catch(e:any) { toast.error(e.message||'Failed'); }
        setSending(false);
    }

    // Student competency summary
    const compSummary = useMemo(() => {
        const dist = { EE:0, ME:0, AE:0, BE:0 };
        marks.forEach(m => { if(m.competency_level&&dist[m.competency_level]!==undefined) dist[m.competency_level]++; });
        return dist;
    }, [marks]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiUsers size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading CBC Parent Portal...</p>
                <p className="text-sm text-gray-500 mt-1">Parent engagement · Competency visibility · Kenya CBC</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1A2F4A 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/cbc/portfolio" className="hover:text-white">CBC Hub</Link><FiArrowRight size={10}/>
                        <span className="text-pink-400 font-semibold">👨‍👩‍👧 CBC Parent Portal</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>
                                <FiUsers size={30} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h1 className="text-2xl font-black text-white">CBC Parent Portal</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-400 text-pink-900">PARENT ENGAGEMENT</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CBC KENYA</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm">Competency visibility · SBA Progress · Portfolio Access · Parent–Teacher Communication</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {['Real-time CBC Competency','SBA Task Results','Portfolio Evidence','Parent Messaging','Push Notifications','Pathway Guidance'].map(tag=>(
                                        <span key={tag} className="px-2 py-0.5 rounded text-[10px] text-blue-200 border border-white/10" style={{background:'rgba(255,255,255,0.07)'}}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward},{href:'/dashboard/cbc/portfolio',l:'Portfolio',ic:FiFolder},{href:'/dashboard/exams/cbc-report-cards',l:'Report Cards',ic:FiFileText}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={()=>setShowMsg(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-pink-400/50 text-pink-300 hover:bg-pink-500/20 transition-all"><FiSend size={12}/>Send Message</button>
                            <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>
                                <FiPlus size={15}/>Add Parent
                            </button>
                        </div>
                    </div>
                </div>
                {/* KPI bar */}
                <div className="grid grid-cols-4 lg:grid-cols-8 border-t border-white/10">
                    {[{l:'Total Parents',v:stats.total,ic:FiUsers,c:'#F472B6'},{l:'Portal Active',v:stats.active,ic:FiUnlock,c:'#34D399'},{l:'No Access',v:stats.inactive,ic:FiLock,c:'#FCD34D'},{l:'Notif. On',v:stats.notifEnabled,ic:FiBell,c:'#60A5FA'},{l:'Logged In Today',v:stats.loggedInToday,ic:FiActivity,c:'#A78BFA'},{l:'Coverage',v:`${stats.coverage}%`,ic:FiTrendingUp,c:'#FB923C'},{l:'Unread Msgs',v:stats.unreadMsgs,ic:FiMail,c:'#F87171'},{l:'Pending Notifs',v:stats.pendingNotifs,ic:FiBell,c:'#FDE68A'}].map((s,i)=>(
                        <div key={i} className="px-3 py-3 flex items-center gap-2 border-r border-white/10 last:border-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:s.c+'22'}}><s.ic size={12} style={{color:s.c}}/></div>
                            <div><div className="text-lg font-black leading-none" style={{color:s.c}}>{s.v}</div><div className="text-[9px] text-blue-300 leading-tight mt-0.5">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DB setup banner */}
            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — Run SQL to activate full Parent Portal</p>
                        <p className="text-sm text-amber-700 mt-1">Showing parent data from guardian fields on student records. Run the SQL below to enable dedicated parent accounts, messaging and notifications.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL_PORTAL}</pre>
                        </details>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(SQL_PORTAL);toast.success('SQL copied!');}} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiCopy size={12}/>Copy SQL</button>
                </div>
            )}

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                {([
                    ['overview','🏠 Overview',FiBarChart2],
                    ['parents','👨‍👩‍👧 Parent Accounts',FiUsers],
                    ['competency','📊 Competency View',FiAward],
                    ['portfolio','🗂️ Portfolio Access',FiFolder],
                    ['messages','💬 Messages',FiMessageSquare],
                    ['notifications','🔔 Notifications',FiBell],
                    ['settings','⚙️ Settings',FiShield],
                ] as const).map(([key,lbl,Ic])=>(
                    <button key={key} onClick={()=>setTab(key as Tab)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab===key?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===key?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={12}/>{lbl}
                        {key==='messages'&&stats.unreadMsgs>0&&<span className="px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">{stats.unreadMsgs}</span>}
                        {key==='notifications'&&stats.pendingNotifs>0&&<span className="px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">{stats.pendingNotifs}</span>}
                    </button>
                ))}
            </div>

            {/* ══════════════════ OVERVIEW ══════════════════════════════ */}
            {tab==='overview'&&(
                <div className="space-y-5">
                    {/* Engagement metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[{l:'Portal Coverage',v:`${stats.coverage}%`,sub:`${stats.active} of ${students.length} students`,c:'#EC4899',ic:FiTrendingUp},
                          {l:'Active This Week',v:stats.loggedInToday,sub:'parents logged in today',c:'#059669',ic:FiActivity},
                          {l:'Messages Sent',v:messages.length,sub:`${stats.unreadMsgs} unread by parents`,c:'#2563EB',ic:FiMail},
                          {l:'Notifications',v:notifications.length,sub:`${stats.pendingNotifs} pending send`,c:'#D97706',ic:FiBell},
                        ].map((s,i)=>(
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:s.c+'18'}}><s.ic size={18} style={{color:s.c}}/></div>
                                    <span className="text-2xl font-black" style={{color:s.c}}>{s.v}</span>
                                </div>
                                <p className="font-bold text-gray-800 text-sm">{s.l}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* CBC Competency snapshot */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><FiAward size={16} className="text-amber-500"/>School-wide Competency Snapshot</h3>
                            <div className="space-y-3">
                                {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k,v])=>{
                                    const cnt = compSummary[k]; const total = Object.values(compSummary).reduce((a,b)=>a+b,0);
                                    const pct = total>0?Math.round(cnt/total*100):0;
                                    return (
                                        <div key={k} className="flex items-center gap-3">
                                            <div className="w-12 text-right"><span className="font-black text-xs" style={{color:v.color}}>{k}</span></div>
                                            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full flex items-center px-2 transition-all duration-700" style={{width:`${Math.max(pct,4)}%`,background:v.color}}>
                                                    {pct>8&&<span className="text-[9px] font-bold text-white">{pct}%</span>}
                                                </div>
                                            </div>
                                            <div className="w-8 text-left"><span className="text-xs font-bold text-gray-500">{cnt}</span></div>
                                        </div>
                                    );
                                })}
                                <div className="rounded-xl p-3 bg-blue-50 text-xs text-blue-700 mt-2">
                                    <p className="font-bold">What parents see:</p>
                                    <p className="mt-0.5">Parents can view their child's competency level per subject, SBA task scores, portfolio evidence and teacher comments — all in plain English with KICD-approved explanations.</p>
                                </div>
                            </div>
                        </div>

                        {/* Parent communication feed */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-gray-800 flex items-center gap-2"><FiMail size={16} className="text-blue-500"/>Recent Communications</h3>
                                <button onClick={()=>setShowMsg(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#0F2044'}}><FiPlus size={11}/>New</button>
                            </div>
                            <div className="space-y-2">
                                {messages.slice(0,5).map(msg=>{
                                    const typeStyle = { announcement:{ic:FiGlobe,c:'#2563EB',bg:'#EFF6FF'}, personal:{ic:FiUser,c:'#059669',bg:'#F0FDF4'}, achievement:{ic:FiStar,c:'#D97706',bg:'#FEF3C7'}, alert:{ic:FiAlertCircle,c:'#DC2626',bg:'#FEF2F2'} }[msg.type]||{ic:FiMail,c:'#6366F1',bg:'#EEF2FF'};
                                    const TypeIc = typeStyle.ic;
                                    return (
                                        <div key={msg.id} className={`flex items-start gap-3 p-3 rounded-xl border ${!msg.is_read?'border-blue-200 bg-blue-50/50':'border-gray-100 bg-white'}`}>
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:typeStyle.bg}}><TypeIc size={12} style={{color:typeStyle.c}}/></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <p className="text-xs font-bold text-gray-800 truncate">{msg.sender}</p>
                                                    {!msg.is_read&&<span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"/>}
                                                </div>
                                                <p className="text-[11px] text-gray-600 line-clamp-2">{msg.content.substring(0,120)}{msg.content.length>120?'…':''}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{msg.student_name} · {fmtTime(msg.created_at)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={()=>setTab('messages')} className="w-full py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">View all messages →</button>
                            </div>
                        </div>
                    </div>

                    {/* Parent portal preview */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-gray-800">📱 What Parents See in the Portal</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Preview of the parent-facing view — share the portal link with parents</p>
                            </div>
                            <Link href="/parent/dashboard" target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>
                                <FiEye size={12}/>Preview Portal
                            </Link>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[{icon:'📊',l:'CBC Competency',d:'See EE/ME/AE/BE per subject in plain language'},
                                  {icon:'📋',l:'SBA Results',d:'All School Based Assessment task scores'},
                                  {icon:'🗂️',l:'Portfolio Evidence',d:'View & download child\'s work samples'},
                                  {icon:'📝',l:'Report Cards',d:'Download CBC report cards per term'},
                                  {icon:'💬',l:'Teacher Messages',d:'Direct communication from class teacher'},
                                  {icon:'🔔',l:'Notifications',d:'Instant alerts for new scores & updates'},
                                  {icon:'🛤️',l:'Pathway Guide',d:'Grade 9 pathway selection guidance'},
                                  {icon:'📅',l:'School Calendar',d:'SBA dates, meetings, events'},
                                ].map((item,i)=>(
                                    <div key={i} className="rounded-xl p-3 bg-gray-50 border border-gray-100 hover:border-pink-200 hover:bg-pink-50/30 transition-all">
                                        <div className="text-xl mb-1">{item.icon}</div>
                                        <p className="font-bold text-gray-800 text-xs">{item.l}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">{item.d}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ PARENT ACCOUNTS ══════════════════════ */}
            {tab==='parents'&&(
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1">
                                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                <input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="Search parent name, email, phone, student…" value={search} onChange={e=>setSearch(e.target.value)}/>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200" value={fForm} onChange={e=>setFForm(e.target.value)}>
                                    <option value="">All Forms</option>
                                    {forms.map(f=><option key={f.id} value={f.id}>{f.form_name||f.name}</option>)}
                                </select>
                                <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-pink-200" value={fAccess} onChange={e=>setFAccess(e.target.value)}>
                                    <option value="">All Access</option>
                                    <option value="active">Portal Active</option>
                                    <option value="inactive">No Access</option>
                                </select>
                                <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}><FiPlus size={12}/>Add Parent</button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{filtered.length} parent accounts · {stats.active} with portal access · {stats.coverage}% student coverage</p>
                    </div>

                    {/* Parent table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-12 gap-1 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <div className="col-span-3">Parent / Guardian</div>
                            <div className="col-span-2">Student</div>
                            <div className="col-span-2">Contact</div>
                            <div className="col-span-1 text-center">Access</div>
                            <div className="col-span-1 text-center">Notifs</div>
                            <div className="col-span-2">Last Login</div>
                            <div className="col-span-1 text-center">Actions</div>
                        </div>
                        {filtered.length===0&&<div className="py-16 text-center text-gray-400 text-sm">No parent accounts found<br/><button onClick={()=>setShowAdd(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#EC4899'}}>Add First Parent</button></div>}
                        {filtered.map((par,i)=>(
                            <div key={par.id} className={`grid grid-cols-12 gap-1 px-4 py-3 border-b border-gray-50 items-center hover:bg-pink-50/20 cursor-pointer transition-colors ${i%2===0?'bg-white':'bg-gray-50/20'}`} onClick={()=>setViewParent(par)}>
                                <div className="col-span-3 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>{par.parent_name.charAt(0)}</div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 leading-tight">{par.parent_name}</p>
                                        <p className="text-[10px] text-pink-600">{par.relationship}</p>
                                    </div>
                                </div>
                                <div className="col-span-2"><p className="text-xs font-semibold text-gray-700">{par.student_name}</p><p className="text-[10px] text-blue-600">{par.form_name}</p></div>
                                <div className="col-span-2"><p className="text-xs text-gray-600 truncate">{par.email}</p>{par.phone&&<p className="text-[10px] text-gray-400">{par.phone}</p>}</div>
                                <div className="col-span-1 text-center" onClick={e=>{e.stopPropagation();toggleAccess(par.id,par.portal_access);}}>
                                    <button className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${par.portal_access?'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700':'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}>
                                        {par.portal_access?'✓ Active':'Off'}
                                    </button>
                                </div>
                                <div className="col-span-1 text-center"><span className={`text-[10px] font-bold ${par.notification_enabled?'text-blue-600':'text-gray-400'}`}>{par.notification_enabled?'🔔 On':'🔕 Off'}</span></div>
                                <div className="col-span-2"><p className="text-[10px] text-gray-500">{par.last_login?fmtTime(par.last_login):<span className="text-amber-500">Never logged in</span>}</p></div>
                                <div className="col-span-1 flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                                    <button onClick={()=>setViewParent(par)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><FiEye size={12}/></button>
                                    <button onClick={()=>deleteParent(par.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><FiTrash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════════ COMPETENCY VIEW ══════════════════════ */}
            {tab==='competency'&&(
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-black text-gray-800 text-lg">CBC Competency Visibility — Parent View</h2>
                            <p className="text-xs text-gray-500 mt-0.5">How parents see their child's CBC competency levels</p>
                        </div>
                        <div className="flex gap-2">
                            <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white" value={selectedStudent?.id||''} onChange={e=>{const s=students.find(x=>x.id===Number(e.target.value));setSelStu(s||null);}}>
                                <option value="">All Students</option>
                                {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.form_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Parent portal mockup */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center text-white text-sm font-black">P</div>
                            <div><p className="text-sm font-bold text-white">Parent Portal — My Child's Progress</p><p className="text-xs text-blue-300">Kenya CBC Competency Report · {new Date().toLocaleDateString('en-KE',{month:'long',year:'numeric'})}</p></div>
                            <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 text-green-300 text-[10px] font-bold"><FiShield size={10}/>Secure Portal</div>
                        </div>
                        <div className="p-5">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Your Child's Competency — All Learning Areas</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {marks.slice(0,8).map((m,i)=>{
                                    const c = COMP[m.competency_level];
                                    return (
                                        <div key={i} className="rounded-xl p-4 border-2 flex items-center gap-4" style={{borderColor:c.color+'33',background:c.bg+'55'}}>
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg" style={{background:c.color,color:'#fff'}}>{m.competency_level}</div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 text-sm">{m.subject_name}</p>
                                                <p className="text-xs font-semibold mt-0.5" style={{color:c.color}}>{c.label}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{c.desc}</p>
                                            </div>
                                            {m.term&&<span className="text-[10px] text-gray-400 flex-shrink-0">{m.term}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Legend */}
                            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <p className="text-xs font-bold text-gray-600 mb-2">📚 What these levels mean for your child:</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {(Object.entries(COMP) as [CompLevel, typeof COMP.EE][]).map(([k,v])=>(
                                        <div key={k} className="rounded-lg p-2.5" style={{background:v.bg}}>
                                            <div className="flex items-center gap-1.5 mb-1"><span className="font-black text-sm" style={{color:v.color}}>{k}</span><span className="text-[10px] text-gray-500 font-medium">{v.label.split(' ')[0]}</span></div>
                                            <p className="text-[10px] text-gray-500 leading-tight">{v.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subject-by-subject table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">Detailed Subject Competency Table</h3></div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-2 text-left">Learning Area / Subject</th>
                                    <th className="px-4 py-2 text-center">Level</th>
                                    <th className="px-4 py-2 text-left">Meaning for Parent</th>
                                    <th className="px-4 py-2 text-center">Term</th>
                                    <th className="px-4 py-2 text-center">SBA</th>
                                </tr></thead>
                                <tbody>
                                    {marks.map((m,i)=>{
                                        const c = COMP[m.competency_level];
                                        return (
                                            <tr key={i} className={`border-b border-gray-50 hover:bg-pink-50/20 ${i%2===0?'bg-white':'bg-gray-50/20'}`}>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{m.subject_name}</td>
                                                <td className="px-4 py-3 text-center">{compBadge(m.competency_level)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">{c.desc}</td>
                                                <td className="px-4 py-3 text-center text-xs text-gray-500">{m.term||'—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mx-auto" style={{background:c.bg,color:c.color}}>{c.score}</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ PORTFOLIO ACCESS ══════════════════════ */}
            {tab==='portfolio'&&(
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Portfolio Access — What Parents Can View</h2><p className="text-xs text-gray-500">Parents can view approved & shared portfolio items for their child</p></div>
                        <Link href="/dashboard/cbc/portfolio" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}><FiFolder size={14}/>Manage Portfolio</Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[{l:'Total Items',v:portfolio.length,c:'#F59E0B'},{l:'Approved (Visible)',v:portfolio.filter(p=>p.status==='approved'||p.status==='shared').length,c:'#059669'},{l:'Shared with Parents',v:portfolio.filter(p=>p.status==='shared').length,c:'#EC4899'}].map((s,i)=>(
                            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                                <p className="text-3xl font-black mb-1" style={{color:s.c}}>{s.v}</p>
                                <p className="text-xs text-gray-500">{s.l}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <h3 className="font-bold text-gray-800 mb-3">Portfolio Items Visible to Parents</h3>
                        {portfolio.filter(p=>p.status==='approved'||p.status==='shared').length===0 ? (
                            <div className="py-10 text-center text-gray-400">
                                <FiFolder size={32} className="mx-auto mb-2 text-gray-200"/>
                                <p className="text-sm">No shared portfolio items yet</p>
                                <Link href="/dashboard/cbc/portfolio" className="mt-2 inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#0F2044'}}>Go to Portfolio Manager</Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {portfolio.filter(p=>p.status==='approved'||p.status==='shared').slice(0,12).map(item=>(
                                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#FEF3C7'}}><FiFolder size={16} style={{color:'#D97706'}}/></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500">{item.learning_area}</span>
                                                {compBadge(item.competency_level)}
                                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${item.status==='shared'?'bg-purple-100 text-purple-700':'bg-green-100 text-green-700'}`}>{item.status}</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDate(item.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════ MESSAGES ════════════════════════════ */}
            {tab==='messages'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Parent–Teacher Communication</h2><p className="text-xs text-gray-500">{stats.unreadMsgs} unread · {messages.length} total messages</p></div>
                        <button onClick={()=>setShowMsg(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}><FiSend size={14}/>New Message</button>
                    </div>
                    <div className="space-y-3">
                        {messages.length===0&&<div className="py-16 text-center bg-white rounded-2xl text-gray-400 text-sm">No messages yet<br/><button onClick={()=>setShowMsg(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#0F2044'}}>Send First Message</button></div>}
                        {messages.map(msg=>{
                            const typeStyle={announcement:{ic:FiGlobe,c:'#2563EB',bg:'#EFF6FF',l:'Announcement'},personal:{ic:FiUser,c:'#059669',bg:'#F0FDF4',l:'Personal'},achievement:{ic:FiStar,c:'#D97706',bg:'#FEF3C7',l:'Achievement'},alert:{ic:FiAlertCircle,c:'#DC2626',bg:'#FEF2F2',l:'Alert'}}[msg.type]||{ic:FiMail,c:'#6366F1',bg:'#EEF2FF',l:'Message'};
                            const TypeIc = typeStyle.ic;
                            return (
                                <div key={msg.id} className={`bg-white rounded-2xl border-2 shadow-sm p-4 ${!msg.is_read?'border-blue-200':'border-gray-100'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:typeStyle.bg}}><TypeIc size={18} style={{color:typeStyle.c}}/></div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:typeStyle.bg,color:typeStyle.c}}>{typeStyle.l}</span>
                                                {!msg.is_read&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">Unread</span>}
                                                <span className="text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 mb-1">{msg.sender}</p>
                                            <p className="text-sm text-gray-600 leading-relaxed">{msg.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><FiUser size={9}/>{msg.student_name||'All Parents'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══════════════════ NOTIFICATIONS ════════════════════════ */}
            {tab==='notifications'&&(
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div><h2 className="font-black text-gray-800 text-lg">Parent Notifications</h2><p className="text-xs text-gray-500">{stats.pendingNotifs} pending · Push alerts for CBC events</p></div>
                        <button onClick={()=>setShowNotif(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}><FiBell size={14}/>Create Notification</button>
                    </div>
                    {/* Notification types guide */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[{l:'New SBA Score',ic:'📊',c:'#2563EB',d:'Auto-sent when teacher enters CBC marks'},{l:'Portfolio Shared',ic:'🗂️',c:'#F59E0B',d:'When teacher shares portfolio item'},{l:'Report Card Ready',ic:'📄',c:'#059669',d:'When term CBC report card is published'},{l:'Announcement',ic:'📣',c:'#7C3AED',d:'School-wide parent announcements'}].map((n,i)=>(
                            <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                                <div className="text-xl mb-1">{n.ic}</div>
                                <p className="font-bold text-gray-800 text-xs">{n.l}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{n.d}</p>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {notifications.map(n=>(
                            <div key={n.id} className={`bg-white rounded-2xl border-2 shadow-sm p-4 ${!n.is_sent?'border-amber-200':'border-gray-100'}`}>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:n.is_sent?'#F0FDF4':'#FEF3C7'}}><FiBell size={16} style={{color:n.is_sent?'#059669':'#D97706'}}/></div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{n.title}</p>
                                            {n.body&&<p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><FiUser size={9}/>{n.student_name||'All'} · {fmtTime(n.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${n.is_sent?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{n.is_sent?'✓ Sent':'⏳ Pending'}</span>
                                        {!n.is_sent&&<button onClick={async()=>{if(dbReady)await sb.from('school_parent_notifications').update({is_sent:true,sent_at:new Date().toISOString()}).eq('id',n.id);setNotifs(p=>p.map(x=>x.id===n.id?{...x,is_sent:true}:x));toast.success('Notification sent!');}} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white" style={{background:'#D97706'}}>Send Now</button>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {notifications.length===0&&<div className="py-16 text-center bg-white rounded-2xl text-gray-400 text-sm">No notifications yet<br/><button onClick={()=>setShowNotif(true)} className="mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{background:'#D97706'}}>Create Notification</button></div>}
                    </div>
                </div>
            )}

            {/* ══════════════════ SETTINGS ════════════════════════════ */}
            {tab==='settings'&&(
                <div className="space-y-5">
                    <h2 className="font-black text-gray-800 text-lg">Parent Portal Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiShield size={16} className="text-blue-600"/>Database Setup SQL</h3>
                            <pre className="bg-gray-900 text-green-400 text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-52">{SQL_PORTAL}</pre>
                            <button onClick={()=>{navigator.clipboard.writeText(SQL_PORTAL);toast.success('SQL copied!');}} className="mt-2 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"><FiCopy size={12}/>Copy SQL</button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiGlobe size={16} className="text-pink-500"/>Portal Access Settings</h3>
                            <div className="space-y-3">
                                {[{l:'Bulk Enable All Parent Access',d:'Give all registered parents portal access at once',action:async()=>{if(dbReady)await sb.from('school_parent_portal').update({portal_access:true}).neq('id','null');setParents(p=>p.map(x=>({...x,portal_access:true})));toast.success('All access enabled!');}},
                                  {l:'Bulk Enable Notifications',d:'Turn on SMS/email notifications for all parents',action:async()=>{if(dbReady)await sb.from('school_parent_portal').update({notification_enabled:true}).neq('id','null');setParents(p=>p.map(x=>({...x,notification_enabled:true})));toast.success('All notifications enabled!');}},
                                  {l:'Export Parent List (CSV)',d:'Download all parent accounts with access codes',action:()=>{const csv=['Parent Name,Email,Phone,Student,Form,Access Code,Portal Active'].join('\n')+'\n'+parents.map(p=>`"${p.parent_name}","${p.email}","${p.phone||''}","${p.student_name||''}","${p.form_name||''}","${p.access_code||''}",${p.portal_access}`).join('\n');const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='parent_accounts.csv';a.click();toast.success('CSV downloaded!');}},
                                ].map((item,i)=>(
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div><p className="text-sm font-semibold text-gray-800">{item.l}</p><p className="text-xs text-gray-500">{item.d}</p></div>
                                        <button onClick={item.action} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white ml-3 flex-shrink-0" style={{background:'#0F2044'}}>Run</button>
                                    </div>
                                ))}
                                <div className="mt-4">
                                    <p className="text-xs font-bold text-gray-600 mb-2">Integration Links</p>
                                    <div className="space-y-1">
                                        {[{href:'/dashboard/exams/cbc-report-cards',l:'CBC Report Cards'},{href:'/dashboard/exams/sba-manager',l:'SBA Manager'},{href:'/dashboard/cbc/portfolio',l:'Student Portfolio'},{href:'/dashboard/students',l:'Student Management'}].map(l=>(
                                            <Link key={l.href} href={l.href} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700 hover:text-blue-700 group">
                                                {l.l}<FiChevronRight size={12} className="text-gray-300 group-hover:text-blue-400"/>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ ADD PARENT MODAL ════════════════════ */}
            {showAddParent&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(236,72,153,0.2)'}}><FiPlus size={18} color="#EC4899"/></div>
                                <div><h2 className="text-lg font-black text-white">Add Parent Account</h2><p className="text-blue-200 text-xs">Create CBC portal access for parent/guardian</p></div>
                            </div>
                            <button onClick={()=>{setShowAdd(false);setPForm(emptyParent);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Student <span className="text-red-500">*</span></label>
                                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200" value={pForm.student_id} onChange={e=>setPForm({...pForm,student_id:e.target.value})}>
                                    <option value="">Select student…</option>
                                    {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.form_name}{s.admission_no?` (${s.admission_no})`:''}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Parent/Guardian Name <span className="text-red-500">*</span></label>
                                    <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="Full name" value={pForm.parent_name} onChange={e=>setPForm({...pForm,parent_name:e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Relationship</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200" value={pForm.relationship} onChange={e=>setPForm({...pForm,relationship:e.target.value})}>
                                        {['Mother','Father','Guardian','Grand Parent','Step Parent','Sibling','Uncle/Aunt','Sponsor'].map(r=><option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                                <input type="email" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="parent@gmail.com" value={pForm.email} onChange={e=>setPForm({...pForm,email:e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone Number (for SMS alerts)</label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200" placeholder="+254 7XX XXX XXX" value={pForm.phone} onChange={e=>setPForm({...pForm,phone:e.target.value})}/>
                            </div>
                            <div className="rounded-xl p-3 bg-pink-50 border border-pink-200 text-xs text-pink-700">
                                <p className="font-bold mb-1">🔐 Auto-Generated Access</p>
                                <p>A unique access code will be generated automatically. The parent will use their <strong>email + access code</strong> to log into the CBC Parent Portal and view their child's competency levels, SBA results and portfolio.</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={saveParent} disabled={savingParent} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>
                                    {savingParent?<><FiRefreshCw size={14} className="animate-spin"/>Creating…</>:<><FiCheck size={14}/>Create Parent Account</>}
                                </button>
                                <button onClick={()=>{setShowAdd(false);setPForm(emptyParent);}} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ SEND MESSAGE MODAL ══════════════════ */}
            {showMsgModal&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(96,165,250,0.2)'}}><FiSend size={18} color="#60A5FA"/></div>
                            <div><h2 className="text-lg font-black text-white">Send Message to Parents</h2><p className="text-blue-200 text-xs">Direct communication through the CBC Parent Portal</p></div></div>
                            <button onClick={()=>{setShowMsg(false);setMsgForm(emptyMsg);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Message Type</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={msgForm.type} onChange={e=>setMsgForm({...msgForm,type:e.target.value as Message['type']})}>
                                        <option value="announcement">📣 School Announcement</option>
                                        <option value="personal">👤 Personal Message</option>
                                        <option value="achievement">⭐ Achievement Alert</option>
                                        <option value="alert">⚠️ Concern Alert</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Send To (Student)</label>
                                    <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={msgForm.student_id} onChange={e=>setMsgForm({...msgForm,student_id:e.target.value})}>
                                        <option value="">All Parents</option>
                                        {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Title / Subject <span className="text-red-500">*</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. Term 2 SBA Results Available" value={msgForm.title} onChange={e=>setMsgForm({...msgForm,title:e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Message Content <span className="text-red-500">*</span></label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={4} placeholder="Write your message to parents here…" value={msgForm.content} onChange={e=>setMsgForm({...msgForm,content:e.target.value})}/>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={sendMessage} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                                    {sending?<><FiRefreshCw size={14} className="animate-spin"/>Sending…</>:<><FiSend size={14}/>Send Message</>}
                                </button>
                                <button onClick={()=>{setShowMsg(false);setMsgForm(emptyMsg);}} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ NOTIFICATION MODAL ══════════════════ */}
            {showNotifModal&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(245,158,11,0.2)'}}><FiBell size={18} color="#F59E0B"/></div>
                            <div><h2 className="text-lg font-black text-white">Create Notification</h2><p className="text-blue-200 text-xs">Push alert to parent portal</p></div></div>
                            <button onClick={()=>{setShowNotif(false);setNotifForm(emptyNotif);}} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Type</label>
                                <div className="flex flex-wrap gap-1">
                                    {[{v:'new_score',l:'📊 New Score'},{v:'portfolio',l:'🗂️ Portfolio'},{v:'announcement',l:'📣 Announcement'},{v:'report_card',l:'📄 Report Card'},{v:'alert',l:'⚠️ Alert'}].map(t=>(
                                        <button key={t.v} onClick={()=>setNotifForm({...notifForm,type:t.v})} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${notifForm.type===t.v?'bg-blue-600 text-white border-blue-600':'bg-gray-50 text-gray-600 border-transparent hover:border-blue-200'}`}>{t.l}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">For Student</label>
                                <select className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={notifForm.student_id} onChange={e=>setNotifForm({...notifForm,student_id:e.target.value})}>
                                    <option value="">All Students/Parents</option>
                                    {students.map(s=><option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Notification Title <span className="text-red-500">*</span></label>
                                <input className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="e.g. New SBA Score Added for your child" value={notifForm.title} onChange={e=>setNotifForm({...notifForm,title:e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">Body / Details</label>
                                <textarea className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" rows={3} placeholder="Additional notification details…" value={notifForm.body} onChange={e=>setNotifForm({...notifForm,body:e.target.value})}/>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={sendNotification} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>
                                    {sending?<><FiRefreshCw size={14} className="animate-spin"/>Sending…</>:<><FiBell size={14}/>Create Notification</>}
                                </button>
                                <button onClick={()=>{setShowNotif(false);setNotifForm(emptyNotif);}} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════ PARENT DETAIL MODAL ══════════════════ */}
            {viewParent&&(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)'}}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b" style={{background:'linear-gradient(135deg,#EC4899,#BE185D)'}}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white" style={{background:'rgba(255,255,255,0.2)'}}>{viewParent.parent_name.charAt(0)}</div>
                                <div><h2 className="text-lg font-black text-white">{viewParent.parent_name}</h2><p className="text-pink-100 text-xs">{viewParent.relationship} of {viewParent.student_name}</p></div>
                            </div>
                            <button onClick={()=>setViewParent(null)} className="p-2 rounded-lg hover:bg-white/10"><FiX size={18} color="white"/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[{l:'Student',v:viewParent.student_name||'—',ic:FiUser},{l:'Form/Grade',v:viewParent.form_name||'—',ic:FiBook},{l:'Email',v:viewParent.email,ic:FiMail},{l:'Phone',v:viewParent.phone||'—',ic:FiPhone},{l:'Last Login',v:fmtTime(viewParent.last_login),ic:FiClock},{l:'Access Code',v:viewParent.access_code||'—',ic:FiLock}].map((d,i)=>(
                                    <div key={i} className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5 flex items-center gap-1"><d.ic size={9}/>{d.l}</p><p className="text-sm font-semibold text-gray-800 break-all">{d.v}</p></div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm ${viewParent.portal_access?'bg-green-50 text-green-700':'bg-gray-100 text-gray-600'}`}>
                                    {viewParent.portal_access?<><FiUnlock size={14}/>Portal Access Active</>:<><FiLock size={14}/>No Portal Access</>}
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${viewParent.notification_enabled?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-500'}`}>
                                    <FiBell size={14}/>{viewParent.notification_enabled?'Notifs On':'Notifs Off'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={()=>toggleAccess(viewParent.id,viewParent.portal_access)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${viewParent.portal_access?'border-red-300 text-red-600 hover:bg-red-50':'border-green-400 text-green-700 hover:bg-green-50'}`}>
                                    {viewParent.portal_access?<><FiLock size={14}/>Disable Access</>:<><FiUnlock size={14}/>Enable Access</>}
                                </button>
                                <button onClick={()=>{setShowMsg(true);setMsgForm({...emptyMsg,student_id:String(viewParent.student_id)});setViewParent(null);}} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#0F2044'}}><FiSend size={14}/>Message</button>
                                <button onClick={()=>deleteParent(viewParent.id)} className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"><FiTrash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
