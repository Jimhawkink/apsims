'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiLogOut, FiUser, FiBell, FiBookOpen, FiDollarSign, FiCalendar, FiHeart, FiPhone, FiShield } from 'react-icons/fi';
import { G, KPI, TabButton, PageNav, statusIcon, severityColor, notifTypeIcon } from './components';

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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [feePage, setFeePage] = useState(1);
  const [attPage, setAttPage] = useState(1);
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
      // Get student details first for form_id (needed for fee structures)
      const { data: studentData } = await supabase.from('school_students').select('*, school_forms(id,form_name)').eq('id', sid).single();
      const formId = studentData?.form_id;

      const [n, fp, fs, at, ex, hr, al, ec, dc] = await Promise.all([
        supabase.from('school_portal_notifications').select('*').eq('portal_user_id', session.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('school_fee_payments').select('*').eq('student_id', sid).order('payment_date', { ascending: false }),
        formId ? supabase.from('school_fee_structures').select('*').eq('form_id', formId) : { data: [] },
        supabase.from('school_daily_attendance').select('*').eq('student_id', sid).order('attendance_date', { ascending: false }).limit(90),
        supabase.from('school_exam_marks').select('*, school_subjects(subject_name)').eq('student_id', sid).order('id', { ascending: false }).limit(50),
        supabase.from('school_health_records').select('*').eq('student_id', sid).single(),
        supabase.from('school_health_allergies').select('*').eq('student_id', sid),
        supabase.from('school_emergency_contacts').select('*').eq('student_id', sid),
        supabase.from('school_discipline_records').select('*').eq('student_id', sid).order('created_at', { ascending: false }).limit(50),
      ]);
      setNotifications(n.data||[]); setFeePayments(fp.data||[]); setFeeStructures(fs.data||[]);
      setAttendance(at.data||[]); setResults(ex.data||[]); setHealthRec(hr.data);
      setAllergies(al.data||[]); setContacts(ec.data||[]); setDiscipline(dc.data||[]);
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

        {/* TABS */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
          {['overview|🏠 Overview','fees|💰 Fees','results|📊 Results','attendance|📅 Attendance','discipline|📋 Discipline','health|🏥 Health','notifications|🔔 Alerts'].map(t=>{const[k,l]=t.split('|');return <TabButton key={k} active={tab===k} onClick={()=>setTab(k)} label={l}/>;})}
        </div>

        {/* TAB CONTENT PLACEHOLDER */}
        {tab==='overview' && <div className="grid lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">💰 Recent Payments</h3></div><div className="divide-y divide-gray-50">{feePayments.slice(0,5).map(p=><div key={p.id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-xs font-bold text-gray-900">KES {Number(p.amount).toLocaleString()}</p><p className="text-[10px] text-gray-400">{p.payment_date||'-'}</p></div><span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-100 text-green-800">{p.payment_method||'manual'}</span></div>)}{feePayments.length===0&&<div className="text-center py-8 text-gray-400 text-sm">No payments</div>}</div></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">📊 Latest Results</h3></div><div className="divide-y divide-gray-50">{results.slice(0,5).map(r=><div key={r.id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-xs font-bold text-gray-900">{r.school_subjects?.subject_name||'-'}</p><p className="text-[10px] text-gray-400">{r.exam_type||'-'}</p></div><span className={`text-xs font-extrabold ${Number(r.score)>=50?'text-green-600':'text-red-600'}`}>{r.score||'-'}%</span></div>)}{results.length===0&&<div className="text-center py-8 text-gray-400 text-sm">No results</div>}</div></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">🔔 Alerts</h3></div><div className="divide-y divide-gray-50">{notifications.slice(0,5).map(n=><div key={n.id} onClick={()=>markRead(n.id)} className={`px-5 py-3 cursor-pointer hover:bg-gray-50 ${!n.is_read?'bg-blue-50/30':''}`}><p className={`text-xs font-bold ${!n.is_read?'text-gray-900':'text-gray-500'}`}>{notifTypeIcon(n.type)} {n.title}</p><p className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</p></div>)}{notifications.length===0&&<div className="text-center py-8 text-gray-400 text-sm">No alerts</div>}</div></div>
        </div>}
        {tab==='fees' && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center" style={{borderLeftWidth:4,borderLeftColor:'#059669'}}><p className="text-[10px] font-bold text-gray-400 uppercase">Total Paid</p><p className="text-2xl font-extrabold text-green-600 mt-1">KES {totalPaid.toLocaleString()}</p></div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center" style={{borderLeftWidth:4,borderLeftColor:'#ef4444'}}><p className="text-[10px] font-bold text-gray-400 uppercase">Balance</p><p className="text-2xl font-extrabold text-red-600 mt-1">KES {balance.toLocaleString()}</p></div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center" style={{borderLeftWidth:4,borderLeftColor:'#2563eb'}}><p className="text-[10px] font-bold text-gray-400 uppercase">Total Due</p><p className="text-2xl font-extrabold text-blue-600 mt-1">KES {totalDue.toLocaleString()}</p></div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-600 mb-3">Payment Progress</p><div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${totalDue>0?Math.min(100,(totalPaid/totalDue)*100):0}%`,background:G.green}}/></div><p className="text-[10px] text-gray-400 mt-2">{totalDue>0?Math.round((totalPaid/totalDue)*100):0}% paid</p></div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Payment History</h3></div>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['Date','Amount','Method','Receipt','Ref'].map((h,i)=><th key={i} className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-500 bg-gray-50/50 border-b border-gray-100">{h}</th>)}</tr></thead>
          <tbody>{pFees.map(p=><tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-5 py-3 text-gray-700">{p.payment_date||'-'}</td><td className="px-5 py-3 font-bold text-green-700">KES {Number(p.amount).toLocaleString()}</td><td className="px-5 py-3"><span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-bold">{p.payment_method||'manual'}</span></td><td className="px-5 py-3 text-gray-600">{p.mpesa_code||'-'}</td><td className="px-5 py-3 text-gray-600">{p.reference_number||'-'}</td></tr>)}</tbody></table></div>
          {feePayments.length===0&&<div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">💰</p><p>No payments yet</p></div>}
          <PageNav page={feePage} total={tFeePages} setPage={setFeePage}/></div>
        </div>}
        {tab==='results' && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">📊 Exam Results</h3></div>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['Subject','Exam Type','Marks','Grade'].map((h,i)=><th key={i} className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-500 bg-gray-50/50 border-b border-gray-100">{h}</th>)}</tr></thead>
          <tbody>{results.map(r=>{const mk=Number(r.score||0);const gr=mk>=80?'A':mk>=70?'B':mk>=60?'C':mk>=50?'D':'E';return <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-5 py-3 font-bold text-gray-900">{r.school_subjects?.subject_name||'-'}</td><td className="px-5 py-3 text-gray-600">{r.exam_type||'-'}</td><td className="px-5 py-3"><span className={`font-extrabold ${mk>=50?'text-green-600':'text-red-600'}`}>{r.score||'-'}%</span></td><td className="px-5 py-3"><span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${mk>=70?'bg-green-100 text-green-800':mk>=50?'bg-amber-100 text-amber-800':'bg-red-100 text-red-800'}`}>{gr}</span></td></tr>})}</tbody></table></div>
          {results.length===0&&<div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📊</p><p>No results yet</p></div>}
        </div>}
        {tab==='attendance' && <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center" style={{borderLeftWidth:4,borderLeftColor:'#059669'}}><p className="text-[10px] font-bold text-gray-400 uppercase">Present Days</p><p className="text-2xl font-extrabold text-green-600 mt-1">{presentDays}</p></div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center" style={{borderLeftWidth:4,borderLeftColor:'#ef4444'}}><p className="text-[10px] font-bold text-gray-400 uppercase">Absent Days</p><p className="text-2xl font-extrabold text-red-600 mt-1">{absentDays}</p></div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center" style={{borderLeftWidth:4,borderLeftColor:'#2563eb'}}><p className="text-[10px] font-bold text-gray-400 uppercase">Rate</p><p className="text-2xl font-extrabold text-blue-600 mt-1">{attendRate}%</p></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">📅 Attendance Records</h3></div>
          <div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['Date','Status','Remarks'].map((h,i)=><th key={i} className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-500 bg-gray-50/50 border-b border-gray-100">{h}</th>)}</tr></thead>
          <tbody>{pAtt.map(a=><tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-5 py-3 text-gray-700">{a.attendance_date||'-'}</td><td className="px-5 py-3 flex items-center gap-2">{statusIcon(a.status)}<span className={`text-xs font-bold ${a.status==='Present'?'text-green-700':a.status==='Absent'?'text-red-700':'text-amber-700'}`}>{a.status||'-'}</span></td><td className="px-5 py-3 text-gray-500">{a.notes||'-'}</td></tr>)}</tbody></table></div>
          {attendance.length===0&&<div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📅</p><p>No attendance records</p></div>}
          <PageNav page={attPage} total={tAttPages} setPage={setAttPage}/></div>
        </div>}
        {tab==='health' && <div className="space-y-5">
          {healthRec && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{background:G.red}}><h3 className="text-sm font-bold text-white flex items-center gap-2"><FiHeart size={14}/> Health Record</h3></div>
            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Blood Group</p><p className="text-sm font-bold text-gray-900 mt-1">{healthRec.blood_group||'-'}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Genotype</p><p className="text-sm font-bold text-gray-900 mt-1">{healthRec.genotype||'-'}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Height</p><p className="text-sm font-bold text-gray-900 mt-1">{healthRec.height_cm?`${healthRec.height_cm} cm`:'-'}</p></div>
              <div><p className="text-[10px] font-bold text-gray-400 uppercase">Weight</p><p className="text-sm font-bold text-gray-900 mt-1">{healthRec.weight_kg?`${healthRec.weight_kg} kg`:'-'}</p></div>
              <div className="sm:col-span-2"><p className="text-[10px] font-bold text-gray-400 uppercase">Chronic Conditions</p><p className="text-sm text-gray-700 mt-1">{healthRec.chronic_conditions||'None recorded'}</p></div>
              <div className="sm:col-span-2"><p className="text-[10px] font-bold text-gray-400 uppercase">Current Medications</p><p className="text-sm text-gray-700 mt-1">{healthRec.current_medications||'None'}</p></div>
              <div className="sm:col-span-2"><p className="text-[10px] font-bold text-gray-400 uppercase">Disability / Special Needs</p><p className="text-sm text-gray-700 mt-1">{healthRec.disability_notes||'None'}</p></div>
            </div>
          </div>}
          {!healthRec && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400"><p className="text-3xl mb-2">🏥</p><p>No health record on file</p></div>}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{background:G.amber}}><h3 className="text-sm font-bold text-white">⚠️ Known Allergies</h3></div>
            <div className="divide-y divide-gray-50">{allergies.map(a=><div key={a.id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-xs font-bold text-gray-900">{a.allergen}</p><p className="text-[10px] text-gray-500">{a.reaction||'No reaction details'}</p></div><span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${severityColor(a.severity)}`}>{(a.severity||'mild').replace('_',' ')}</span></div>)}{allergies.length===0&&<div className="text-center py-8 text-gray-400 text-sm">No allergies recorded</div>}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{background:G.blue}}><h3 className="text-sm font-bold text-white flex items-center gap-2"><FiPhone size={14}/> Emergency Contacts</h3></div>
            <div className="divide-y divide-gray-50">{contacts.map(c=><div key={c.id} className="px-5 py-3 flex items-center justify-between"><div><p className="text-xs font-bold text-gray-900">{c.contact_name} <span className="text-gray-400 font-normal">({c.relationship||'-'})</span></p><p className="text-[10px] text-gray-500 flex items-center gap-1"><FiPhone size={10}/>{c.phone}{c.alt_phone&&` / ${c.alt_phone}`}</p></div>{c.is_primary&&<span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-bold">Primary</span>}</div>)}{contacts.length===0&&<div className="text-center py-8 text-gray-400 text-sm">No emergency contacts</div>}</div>
          </div>
        </div>}
        {tab==='discipline' && <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{background:G.red}}><h3 className="text-sm font-bold text-white">📋 Discipline Records</h3></div>
            <div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['Date','Offence','Type','Action Taken','Status'].map((h,i)=><th key={i} className="text-left px-5 py-3 text-[10px] font-bold uppercase text-gray-500 bg-gray-50/50 border-b border-gray-100">{h}</th>)}</tr></thead>
            <tbody>{discipline.map(d=><tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50"><td className="px-5 py-3 text-gray-700">{d.incident_date||d.created_at?.split('T')[0]||'-'}</td><td className="px-5 py-3 font-bold text-gray-900">{d.description||'-'}</td><td className="px-5 py-3"><span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${d.severity==='Major'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800'}`}>{d.category||d.severity||'Minor'}</span></td><td className="px-5 py-3 text-gray-600">{d.action_taken||'-'}</td><td className="px-5 py-3"><span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${d.status==='Resolved'?'bg-green-100 text-green-800':d.status==='Open'?'bg-amber-100 text-amber-800':'bg-red-100 text-red-800'}`}>{d.status||'Open'}</span></td></tr>)}</tbody></table></div>
            {discipline.length===0&&<div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📋</p><p>No discipline records — Great behavior!</p></div>}
          </div>
        </div>}

        {tab==='notifications' && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{background:G.purple}}><h3 className="text-sm font-bold text-white">🔔 All Notifications</h3><button onClick={markAllRead} className="text-[10px] font-bold text-white/80 hover:text-white underline">Mark All Read</button></div>
          <div className="divide-y divide-gray-50">{notifications.map(n=><div key={n.id} onClick={()=>markRead(n.id)} className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition ${!n.is_read?'bg-blue-50/30':''}`}><div className="flex items-start gap-3"><span className="text-xl mt-0.5">{notifTypeIcon(n.type)}</span><div className="flex-1 min-w-0"><p className={`text-xs font-bold ${!n.is_read?'text-gray-900':'text-gray-500'}`}>{n.title}</p>{n.message&&<p className="text-[11px] text-gray-500 mt-1">{n.message}</p>}<p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p></div>{!n.is_read&&<span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 shrink-0"/>}</div></div>)}{notifications.length===0&&<div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📭</p><p>No notifications yet</p></div>}</div>
        </div>}
      </div>
    </div>
  );
}
