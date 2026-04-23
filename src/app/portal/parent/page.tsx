'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiLogOut, FiUser, FiBell, FiBookOpen, FiDollarSign, FiCalendar, FiHeart, FiPhone, FiShield } from 'react-icons/fi';
import { G, GC, KPI, TabButton, PageNav, SectionHeader, DataRow, Pill, EmptyState, statusIcon, severityColor, notifTypeIcon } from './components';

export default function ParentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [healthRec, setHealthRec] = useState<any>(null);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [discipline, setDiscipline] = useState<any[]>([]);
  const [clinicVisits, setClinicVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [feePage, setFeePage] = useState(1);
  const [attPage, setAttPage] = useState(1);
  const [clinicPage, setClinicPage] = useState(1);
  const [showNotif, setShowNotif] = useState(false);
  const PS = 8;

  useEffect(() => {
    const s = localStorage.getItem('portal_session');
    if (!s) { router.push('/portal/login'); return; }
    const p = JSON.parse(s);
    if (p.user_type !== 'parent') { router.push('/portal/student'); return; }
    setSession(p);
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!session?.student_id) return;
    setLoading(true);
    const sid = session.student_id;
    try {
      const { data: studentData } = await supabase.from('school_students').select('*, school_forms(id,form_name)').eq('id', sid).single();
      const formId = studentData?.form_id;

      // Individual queries — debug toast on each to find failures
      try { const { data, error } = await supabase.from('school_portal_notifications').select('*').eq('portal_user_id', session.id).order('created_at', { ascending: false }).limit(50); if(error) toast.error(`🔔 Notifications: ${error.message}`,{duration:8000}); setNotifications(data||[]); } catch(e:any) { toast.error(`🔔 Notifications crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_fee_payments').select('*').eq('student_id', sid).order('payment_date', { ascending: false }); if(error) toast.error(`💰 Fees: ${error.message}`,{duration:8000}); setFeePayments(data||[]); } catch(e:any) { toast.error(`💰 Fees crash: ${e.message}`,{duration:8000}); }
      try { if (formId) { const { data, error } = await supabase.from('school_fee_structures').select('*').eq('form_id', formId); if(error) toast.error(`📋 Structures: ${error.message}`,{duration:8000}); setFeeStructures(data||[]); } } catch(e:any) { toast.error(`📋 Structures crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_daily_attendance').select('*').eq('student_id', sid).order('attendance_date', { ascending: false }).limit(90); if(error) toast.error(`📅 Attendance: ${error.message}`,{duration:8000}); setAttendance(data||[]); } catch(e:any) { toast.error(`📅 Attendance crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_exam_marks').select('*, school_subjects(subject_name)').eq('student_id', sid).order('id', { ascending: false }).limit(50); if(error) toast.error(`📊 Results: ${error.message}`,{duration:8000}); setResults(data||[]); } catch(e:any) { toast.error(`📊 Results crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_health_records').select('*').eq('student_id', sid).single(); if(error) toast.error(`❤️ Health: ${error.message}`,{duration:8000}); setHealthRec(data); } catch(e:any) { toast.error(`❤️ Health crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_health_allergies').select('*').eq('student_id', sid); if(error) toast.error(`🤧 Allergies: ${error.message}`,{duration:8000}); setAllergies(data||[]); } catch(e:any) { toast.error(`🤧 Allergies crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_emergency_contacts').select('*').eq('student_id', sid); if(error) toast.error(`📞 Contacts: ${error.message}`,{duration:8000}); setContacts(data||[]); } catch(e:any) { toast.error(`📞 Contacts crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_discipline_records').select('*').eq('student_id', sid).order('created_at', { ascending: false }).limit(50); if(error) toast.error(`📋 Discipline: ${error.message}`,{duration:8000}); setDiscipline(data||[]); } catch(e:any) { toast.error(`📋 Discipline crash: ${e.message}`,{duration:8000}); }
      try { const { data, error } = await supabase.from('school_clinic_visits').select('*').eq('student_id', sid).order('created_at', { ascending: false }).limit(50); if(error) toast.error(`🩺 Clinic: ${error.message}`,{duration:8000}); setClinicVisits(data||[]); } catch(e:any) { toast.error(`🩺 Clinic crash: ${e.message}`,{duration:8000}); }
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, [session]);

  useEffect(() => { if (session) fetchData(); }, [session, fetchData]);

  const markRead = async (id: number) => {
    await supabase.from('school_portal_notifications').update({ is_read: true }).eq('id', id);
    setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  };
  const markAllRead = async () => {
    await supabase.from('school_portal_notifications').update({ is_read: true }).eq('portal_user_id', session.id).eq('is_read', false);
    setNotifications(p => p.map(n => ({ ...n, is_read: true }))); toast.success('All marked as read');
  };
  const logout = () => { localStorage.removeItem('portal_session'); router.push('/portal/login'); };

  if (!session) return null;
  const st = session.student;
  const unread = notifications.filter(n => !n.is_read).length;
  const totalPaid = feePayments.reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
  const totalDue = feeStructures.reduce((a: number, f: any) => a + Number(f.amount || 0), 0);
  const balance = Math.max(0, totalDue - totalPaid);
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const absentDays = attendance.filter(a => a.status === 'Absent').length;
  const attendRate = attendance.length > 0 ? Math.round((presentDays / attendance.length) * 100) : 0;
  const pFees = feePayments.slice((feePage-1)*PS, feePage*PS);
  const tFeePages = Math.ceil(feePayments.length / PS);
  const pAtt = attendance.slice((attPage-1)*PS, attPage*PS);
  const tAttPages = Math.ceil(attendance.length / PS);
  const pClinic = clinicVisits.slice((clinicPage-1)*PS, clinicPage*PS);
  const tClinicPages = Math.ceil(clinicVisits.length / PS);

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* TOP BAR */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-lg" style={{ background: G.purple }}>🏫</div>
            <div><p className="font-extrabold text-gray-900 text-sm">AlphaSchool Portal</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Parent Dashboard</p></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-xl hover:bg-gray-100 transition"><FiBell size={18} className="text-gray-500" />{unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">{unread}</span>}</button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100"><FiUser size={14} className="text-purple-600" /><span className="text-xs font-bold text-purple-800">{session.full_name}</span></div>
            <button onClick={logout} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><FiLogOut size={16} /></button>
          </div>
        </div>
      </div>

      {/* NOTIF PANEL */}
      {showNotif && <div className="fixed top-14 right-4 w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100" style={{ background: G.purple }}><h3 className="text-sm font-bold text-white">🔔 Notifications</h3><div className="flex gap-2"><button onClick={markAllRead} className="text-[10px] font-bold text-white/80 hover:text-white underline">Mark All Read</button><button onClick={() => setShowNotif(false)} className="text-white/80 hover:text-white font-bold text-sm">✕</button></div></div>
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-gray-50">
          {notifications.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📭</p><p className="text-sm">No notifications</p></div>}
          {notifications.map(n => <div key={n.id} onClick={() => markRead(n.id)} className={`px-5 py-3 cursor-pointer hover:bg-gray-50 transition ${!n.is_read ? 'bg-blue-50/50' : ''}`}><div className="flex items-start gap-3"><span className="text-lg mt-0.5">{notifTypeIcon(n.type)}</span><div className="flex-1 min-w-0"><p className={`text-xs font-bold ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>{n.message && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}<p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p></div>{!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}</div></div>)}
        </div>
      </div>}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* STUDENT CARD */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ background: G.purple }}>{(st?.first_name?.[0]||'')+(st?.last_name?.[0]||'')}</div>
          <div className="flex-1 min-w-[200px]"><h2 className="text-lg font-extrabold text-gray-900">{st?.last_name}, {st?.first_name}</h2><p className="text-xs text-gray-500">Adm: {st?.admission_number||'-'} · Form: {st?.school_forms?.form_name||st?.form_id||'-'}</p></div>
          <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Attendance Rate</p><p className={`text-2xl font-extrabold ${attendRate>=80?'text-green-600':attendRate>=50?'text-amber-600':'text-red-600'}`}>{attendRate}%</p></div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KPI label="Fee Balance" value={`KES ${balance.toLocaleString()}`} emoji="💰" color="#ef4444"/>
          <KPI label="Fees Paid" value={`KES ${totalPaid.toLocaleString()}`} emoji="✅" color="#059669"/>
          <KPI label="Total Due" value={`KES ${totalDue.toLocaleString()}`} emoji="📋" color="#2563eb"/>
          <KPI label="Present" value={presentDays} emoji="📅" color="#0d9488"/>
          <KPI label="Absent" value={absentDays} emoji="⚠️" color="#f59e0b"/>
          <KPI label="Unread" value={unread} emoji="🔔" color="#7c3aed"/>
          <KPI label="Discipline" value={discipline.length} emoji="📋" color="#dc2626"/>
        </div>

        {/* TABS — Ultra Modern Glassmorphism Strip */}
        <div className="flex gap-1.5 p-1.5 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-sm w-fit overflow-x-auto">
          {['overview|🏠 Overview','fees|💰 Fees','results|📊 Results','attendance|📅 Attendance','discipline|📋 Discipline','health|🏥 Health','notifications|🔔 Alerts'].map(t=>{const[k,l]=t.split('|');return <TabButton key={k} active={tab===k} onClick={()=>setTab(k)} label={l}/>;})}
        </div>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {tab==='overview' && <div className="grid lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Recent Payments" emoji="💰" gradient={G.green}/>
            <div>{feePayments.slice(0,5).map(p=><DataRow key={p.id}><div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-sm shrink-0">💵</div><div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">KES {Number(p.amount).toLocaleString()}</p><p className="text-[10px] text-gray-400">{p.payment_date||'-'}</p></div><Pill text={p.payment_method||'manual'} color="green"/></DataRow>)}{feePayments.length===0&&<EmptyState emoji="💰" text="No payments yet"/>}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Latest Results" emoji="📊" gradient={G.blue}/>
            <div>{results.slice(0,5).map(r=>{const mk=Number(r.score||0);return <DataRow key={r.id}><div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${mk>=50?'bg-emerald-50':'bg-red-50'}`}>{mk>=50?'✅':'❌'}</div><div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{r.school_subjects?.subject_name||'-'}</p><p className="text-[10px] text-gray-400">{r.exam_type||'-'}</p></div><span className={`text-xs font-extrabold ${mk>=50?'text-emerald-600':'text-red-600'}`}>{r.score||'-'}%</span></DataRow>})}{results.length===0&&<EmptyState emoji="📊" text="No results yet"/>}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Alerts" emoji="🔔" gradient={G.purple}/>
            <div>{notifications.slice(0,5).map(n=><DataRow key={n.id} className={`cursor-pointer ${!n.is_read?'bg-purple-50/30':''}`}><span className="text-lg shrink-0">{notifTypeIcon(n.type)}</span><div className="flex-1 min-w-0"><p className={`text-xs font-bold ${!n.is_read?'text-gray-900':'text-gray-500'}`}>{n.title}</p><p className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</p></div>{!n.is_read&&<span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"/>}</DataRow>)}{notifications.length===0&&<EmptyState emoji="📭" text="No alerts"/>}</div>
          </div>
        </div>}

        {/* ═══════════ FEES TAB ═══════════ */}
        {tab==='fees' && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full bg-emerald-500"/>
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/10"/>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Paid 💰</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">KES {totalPaid.toLocaleString()}</p>
            </div>
            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full bg-red-500"/>
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-red-500/10"/>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Balance ⚠️</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">KES {balance.toLocaleString()}</p>
            </div>
            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full bg-blue-500"/>
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/10"/>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Due 📋</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">KES {totalDue.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm">
            <p className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">📈 Payment Progress</p>
            <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full rounded-full transition-all duration-700" style={{width:`${totalDue>0?Math.min(100,(totalPaid/totalDue)*100):0}%`,background:G.green}}/>
            </div>
            <p className="text-[11px] text-gray-500 mt-2 font-bold">{totalDue>0?Math.round((totalPaid/totalDue)*100):0}% paid</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Payment History" emoji="💳" gradient={G.green}/>
            <div>{pFees.map(p=><DataRow key={p.id}>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-base shrink-0">💵</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">KES {Number(p.amount).toLocaleString()}</p><p className="text-[10px] text-gray-400">{p.payment_date||'-'}</p></div>
              <Pill text={p.payment_method||'manual'} color="blue"/>
              <p className="text-[10px] text-gray-500 hidden sm:block">{p.mpesa_code||p.reference_number||'-'}</p>
            </DataRow>)}{feePayments.length===0&&<EmptyState emoji="💰" text="No payments yet"/>}</div>
            <PageNav page={feePage} total={tFeePages} setPage={setFeePage}/>
          </div>
        </div>}

        {/* ═══════════ RESULTS TAB ═══════════ */}
        {tab==='results' && <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <SectionHeader title="Exam Results" emoji="📊" gradient={G.blue}/>
          <div>{results.map(r=>{const mk=Number(r.score||0);const gr=mk>=80?'A':mk>=70?'B':mk>=60?'C':mk>=50?'D':'E';const gc=mk>=70?'green':mk>=50?'amber':'red';return <DataRow key={r.id}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${mk>=50?'bg-emerald-50':'bg-red-50'}`}>{mk>=70?'🌟':mk>=50?'✅':'⚠️'}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{r.school_subjects?.subject_name||'-'}</p><p className="text-[10px] text-gray-400">{r.exam_type||'-'}</p></div>
            <span className={`text-sm font-extrabold ${mk>=50?'text-emerald-600':'text-red-600'}`}>{r.score||'-'}%</span>
            <Pill text={gr} color={gc}/>
          </DataRow>})}{results.length===0&&<EmptyState emoji="📊" text="No results yet"/>}</div>
        </div>}

        {/* ═══════════ ATTENDANCE TAB ═══════════ */}
        {tab==='attendance' && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full bg-emerald-500"/>
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/10"/>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Present Days ✅</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{presentDays}</p>
            </div>
            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full bg-red-500"/>
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-red-500/10"/>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Absent Days ❌</p>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{absentDays}</p>
            </div>
            <div className="relative bg-white rounded-2xl p-5 border border-gray-100/80 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full rounded-r-full bg-blue-500"/>
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/10"/>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rate 📈</p>
              <p className={`text-2xl font-extrabold mt-1 ${attendRate>=80?'text-emerald-600':attendRate>=50?'text-amber-600':'text-red-600'}`}>{attendRate}%</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Attendance Records" emoji="📅" gradient={G.teal}/>
            <div>{pAtt.map(a=><DataRow key={a.id}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${a.status==='Present'?'bg-emerald-50':a.status==='Absent'?'bg-red-50':'bg-amber-50'}`}>{a.status==='Present'?'✅':a.status==='Absent'?'❌':'⏰'}</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{a.attendance_date||'-'}</p><p className="text-[10px] text-gray-400">{a.notes||'No remarks'}</p></div>
              <Pill text={a.status||'Unknown'} color={a.status==='Present'?'green':a.status==='Absent'?'red':'amber'}/>
            </DataRow>)}{attendance.length===0&&<EmptyState emoji="📅" text="No attendance records"/>}</div>
            <PageNav page={attPage} total={tAttPages} setPage={setAttPage}/>
          </div>
        </div>}

        {/* ═══════════ HEALTH TAB ═══════════ */}
        {tab==='health' && <div className="space-y-5">
          {healthRec && <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Health Record" emoji="❤️" gradient={G.red}/>
            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[{l:'🩸 Blood Group',v:healthRec.blood_group},{l:'🧬 Genotype',v:healthRec.genotype},{l:'📏 Height',v:healthRec.height_cm?`${healthRec.height_cm} cm`:null},{l:'⚖️ Weight',v:healthRec.weight_kg?`${healthRec.weight_kg} kg`:null}].map((x,i)=><div key={i} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{x.l}</p><p className="text-sm font-bold text-gray-900 mt-1">{x.v||'—'}</p></div>)}
              {[{l:'🏥 Chronic Conditions',v:healthRec.chronic_conditions},{l:'💊 Current Medications',v:healthRec.current_medications},{l:'♿ Special Needs',v:healthRec.disability_notes}].map((x,i)=><div key={i} className="sm:col-span-2 bg-gray-50/50 rounded-xl p-3 border border-gray-100/50"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{x.l}</p><p className="text-sm text-gray-700 mt-1">{x.v||'None recorded'}</p></div>)}
            </div>
          </div>}
          {!healthRec && <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden"><EmptyState emoji="🏥" text="No health record on file"/></div>}

          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Known Allergies" emoji="⚠️" gradient={G.amber}/>
            <div>{allergies.map(a=><DataRow key={a.id}>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-base shrink-0">🤧</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{a.allergen}</p><p className="text-[10px] text-gray-400">{a.reaction||'No reaction details'}</p></div>
              <Pill text={(a.severity||'mild').replace('_',' ')} color={a.severity==='severe'||a.severity==='life_threatening'?'red':a.severity==='moderate'?'amber':'green'}/>
            </DataRow>)}{allergies.length===0&&<EmptyState emoji="✅" text="No allergies recorded"/>}</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Clinic Visits" emoji="🩺" gradient={G.red}/>
            <div>{pClinic.map(v=><DataRow key={v.id}>
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-base shrink-0">🩺</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{v.complaint||v.diagnosis||'Visit'}</p><p className="text-[10px] text-gray-400">{v.visit_date||v.created_at?.split('T')[0]||'-'} · {v.attended_by||'-'}</p></div>
              <div className="text-right hidden sm:block"><p className="text-[10px] text-gray-500">{v.treatment||'-'}</p></div>
              <Pill text={v.discharged?'Discharged':'Active'} color={v.discharged?'green':'amber'}/>
            </DataRow>)}{clinicVisits.length===0&&<EmptyState emoji="🩺" text="No clinic visits recorded"/>}</div>
            <PageNav page={clinicPage} total={tClinicPages} setPage={setClinicPage}/>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <SectionHeader title="Emergency Contacts" emoji="📞" gradient={G.blue}/>
            <div>{contacts.map(c=><DataRow key={c.id}>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-base shrink-0">👤</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{c.contact_name} <span className="text-gray-400 font-normal">({c.relationship||'-'})</span></p><p className="text-[10px] text-gray-500 flex items-center gap-1"><FiPhone size={10}/>{c.phone}{c.alt_phone&&` / ${c.alt_phone}`}</p></div>
              {c.is_primary&&<Pill text="Primary" color="blue"/>}
            </DataRow>)}{contacts.length===0&&<EmptyState emoji="📞" text="No emergency contacts"/>}</div>
          </div>
        </div>}

        {/* ═══════════ DISCIPLINE TAB ═══════════ */}
        {tab==='discipline' && <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <SectionHeader title="Discipline Records" emoji="📋" gradient={G.red}/>
          <div>{discipline.map(d=><DataRow key={d.id}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${d.severity==='Major'?'bg-red-50':'bg-amber-50'}`}>{d.severity==='Major'?'🚨':'⚠️'}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-900">{d.description||'-'}</p><p className="text-[10px] text-gray-400">{d.incident_date||d.created_at?.split('T')[0]||'-'} · Action: {d.action_taken||'-'}</p></div>
            <Pill text={d.category||d.severity||'Minor'} color={d.severity==='Major'?'red':'amber'}/>
            <Pill text={d.status||'Open'} color={d.status==='Resolved'?'green':d.status==='Open'?'amber':'red'}/>
          </DataRow>)}{discipline.length===0&&<EmptyState emoji="🌟" text="No discipline records — Great behavior!"/>}</div>
        </div>}

        {/* ═══════════ NOTIFICATIONS TAB ═══════════ */}
        {tab==='notifications' && <div className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-600 flex items-center gap-1.5">🔔 All Notifications</h3>
            <button onClick={markAllRead} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline transition">Mark All Read</button>
          </div>
          <div>{notifications.map(n=><DataRow key={n.id} className={`cursor-pointer ${!n.is_read?'bg-purple-50/30':''}`}>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-base shrink-0">{notifTypeIcon(n.type)}</div>
            <div className="flex-1 min-w-0"><p className={`text-xs font-bold ${!n.is_read?'text-gray-900':'text-gray-500'}`}>{n.title}</p>{n.message&&<p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{n.message}</p>}<p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p></div>
            {!n.is_read&&<span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"/>}
          </DataRow>)}{notifications.length===0&&<EmptyState emoji="📭" text="No notifications yet"/>}</div>
        </div>}
      </div>
    </div>
  );
}
