'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiSearch, FiRefreshCw, FiEye, FiCheck, FiX, FiClock,
  FiUserPlus, FiDownload, FiPrinter, FiAlertCircle,
  FiPhone, FiMail, FiChevronLeft, FiChevronRight, FiStar,
  FiMapPin, FiBook, FiHeart, FiFileText, FiUser, FiShield,
  FiCalendar, FiAward, FiExternalLink, FiInfo,
} from 'react-icons/fi';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Application {
  id: number; reference_number: string; status: string;
  student_first_name: string; student_middle_name?: string; student_last_name: string;
  date_of_birth?: string; gender?: string; nationality?: string;
  county?: string; sub_county?: string; village_estate?: string;
  form_applied_for?: number; previous_school?: string; previous_school_county?: string;
  kcpe_index_number?: string; kcpe_total_marks?: number; kcpe_year?: number;
  guardian_full_name?: string; guardian_relationship?: string; guardian_phone?: string;
  guardian_alt_phone?: string; guardian_email?: string; guardian_national_id?: string;
  guardian_occupation?: string; guardian_county?: string;
  emergency_name?: string; emergency_phone?: string; emergency_relationship?: string;
  blood_group?: string; has_disability?: boolean; disability_details?: string;
  allergies?: string; medical_conditions?: string;
  photo_url?: string; birth_cert_url?: string; kcpe_slip_url?: string;
  other_doc_url?: string; other_doc_name?: string;
  review_notes?: string; reviewed_at?: string;
  converted_student_id?: number; phone_verified?: boolean; email_verified?: boolean;
  terms_agreed?: boolean; submitter_ip?: string;
  created_at: string; updated_at?: string; submitted_at?: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const G = {
  teal:   'linear-gradient(135deg,#0f766e,#0d9488)',
  blue:   'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  green:  'linear-gradient(135deg,#15803d,#22c55e)',
  amber:  'linear-gradient(135deg,#d97706,#f59e0b)',
  red:    'linear-gradient(135deg,#b91c1c,#ef4444)',
  purple: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
  dark:   'linear-gradient(135deg,#1e293b,#334155)',
};

const STATUS: Record<string,{bg:string;text:string;border:string;icon:string;grad:string}> = {
  'Submitted':    { bg:'#eff6ff',  text:'#1d4ed8', border:'#bfdbfe', icon:'📥', grad:G.blue   },
  'Under Review': { bg:'#fefce8',  text:'#a16207', border:'#fde68a', icon:'🔍', grad:G.amber  },
  'Approved':     { bg:'#f0fdf4',  text:'#15803d', border:'#bbf7d0', icon:'✅', grad:G.green  },
  'Rejected':     { bg:'#fef2f2',  text:'#b91c1c', border:'#fecaca', icon:'❌', grad:G.red    },
  'Waitlisted':   { bg:'#faf5ff',  text:'#7c3aed', border:'#e9d5ff', icon:'⏳', grad:G.purple },
};

const formLabel = (v?: number|string) => {
  const n = Number(v);
  if (n===10) return 'Grade 10 (CBC)'; if (n===11) return 'Grade 11 (CBC)'; if (n===12) return 'Grade 12 (CBC)';
  if (n>=1&&n<=4) return `Form ${n}`; return v ? `Form ${v}` : '—';
};
const age = (dob?: string) => {
  if (!dob) return '—';
  const d=new Date(dob), n=new Date(); let a=n.getFullYear()-d.getFullYear();
  if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;
  return `${a} yrs`;
};
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtDT = (d?: string) => d ? new Date(d).toLocaleString('en-KE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export default function OnlineAdmissionsAdminPage() {
  const [apps, setApps]               = useState<Application[]>([]);
  const [filtered, setFiltered]       = useState<Application[]>([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatus]     = useState('All');
  const [search, setSearch]           = useState('');
  const [formFilter, setFormFilter]   = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [page, setPage]               = useState(1);
  const [selected, setSelected]       = useState<Application|null>(null);
  const [actionModal, setActionModal] = useState<{app:Application;action:string}|null>(null);
  const [convertModal, setConvertModal] = useState<Application|null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving]           = useState(false);
  const [convertForm, setConvertForm] = useState({stream_id:'',admission_number:'',reporting_date:''});
  const [streams, setStreams]         = useState<any[]>([]);
  const [forms,   setForms]           = useState<any[]>([]);
  const [streamCounts, setStreamCounts] = useState<Record<string,number>>({});
  const PAGE = 20;

  /* ── Load ─────────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: st }, { data: fm }, { data: stuStreams }] = await Promise.all([
      supabase.from('school_admission_applications').select('*').order('created_at',{ascending:false}),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_students').select('stream_id').eq('status','Active'),
    ]);
    // Build stream→count map
    const countMap: Record<string,number> = {};
    (stuStreams||[]).forEach((s:any)=>{ if(s.stream_id){ countMap[String(s.stream_id)]=(countMap[String(s.stream_id)]||0)+1; } });
    setStreamCounts(countMap);
    setApps(data||[]); setStreams(st||[]); setForms(fm||[]); setLoading(false);
  },[]);
  useEffect(()=>{ load(); },[load]);

  /* ── Filter ───────────────────────────────────────────────────────────────── */
  useEffect(()=>{
    let r = [...apps];
    if(statusFilter!=='All') r=r.filter(a=>a.status===statusFilter);
    if(formFilter) r=r.filter(a=>String(a.form_applied_for)===formFilter);
    if(dateFrom) r=r.filter(a=>new Date(a.created_at)>=new Date(dateFrom));
    if(dateTo) r=r.filter(a=>new Date(a.created_at)<=new Date(dateTo+'T23:59:59'));
    if(search.trim()){
      const q=search.toLowerCase();
      r=r.filter(a=>[a.student_first_name,a.student_last_name,a.reference_number,
        a.guardian_phone,a.guardian_email,a.kcpe_index_number,a.guardian_full_name]
        .some(f=>f?.toLowerCase().includes(q)));
    }
    setFiltered(r); setPage(1);
  },[apps,statusFilter,formFilter,dateFrom,dateTo,search]);

  const counts = {
    total:   apps.length,
    new:     apps.filter(a=>a.status==='Submitted').length,
    review:  apps.filter(a=>a.status==='Under Review').length,
    approved:apps.filter(a=>a.status==='Approved').length,
    rejected:apps.filter(a=>a.status==='Rejected').length,
    waitlist:apps.filter(a=>a.status==='Waitlisted').length,
    admitted:apps.filter(a=>!!a.converted_student_id).length,
  };

  const paged = filtered.slice((page-1)*PAGE, page*PAGE);
  const tp = Math.max(1,Math.ceil(filtered.length/PAGE));

  /* ── Send Email Notification ─────────────────────────────────────────────── */
  const sendNotification = async (app: Application, status: string, notes?: string) => {
    if(!app.guardian_email) return; // no email = silent
    try {
      await fetch('/api/admissions/notify', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          to_email:        app.guardian_email,
          to_name:         app.guardian_full_name||'Guardian',
          student_name:    [app.student_first_name,app.student_middle_name,app.student_last_name].filter(Boolean).join(' '),
          reference_number:app.reference_number,
          status,
          notes:           notes||undefined,
          school_name:     'APSIMS School',
        }),
      });
    } catch { /* notification failure is non-blocking */ }
  };

  /* ── Update Status ────────────────────────────────────────────────────────── */
  const updateStatus = async () => {
    if(!actionModal) return;
    if(actionModal.action==='Rejected'&&!reviewNotes.trim()){ toast.error('Reason for rejection is required'); return; }
    setSaving(true);
    const{error}=await supabase.from('school_admission_applications').update({
      status:actionModal.action, review_notes:reviewNotes.trim()||null,
      reviewed_at:new Date().toISOString(), updated_at:new Date().toISOString(),
    }).eq('id',actionModal.app.id);
    if(error){ toast.error(error.message); }
    else{
      toast.success(`✅ Application ${actionModal.action}`);
      // Send email notification to parent (non-blocking)
      sendNotification(actionModal.app, actionModal.action, reviewNotes.trim()||undefined);
      if(actionModal.app.guardian_email) toast.success(`📧 Notification sent to ${actionModal.app.guardian_email}`);
      setActionModal(null); setReviewNotes(''); load();
    }
    setSaving(false);
  };

  /* ── Auto-generate next Admission Number from DB ─────────────────────────── */
  const fetchNextAdmNo = async (): Promise<string> => {
    const year = new Date().getFullYear();
    try {
      // Get all admission numbers for current year to find the max sequence
      const { data } = await supabase
        .from('school_students')
        .select('admission_number')
        .ilike('admission_number', `ADM/${year}/%`)
        .order('admission_number', { ascending: false })
        .limit(1);
      if(data && data.length > 0) {
        const last = data[0].admission_number; // e.g. ADM/2026/1015
        const parts = last.split('/');
        const seq = parseInt(parts[parts.length-1]||'0',10);
        return `ADM/${year}/${String(seq+1).padStart(4,'0')}`;
      }
    } catch {}
    // Fallback: count all students
    const { count } = await supabase.from('school_students').select('id',{count:'exact',head:true});
    return `ADM/${year}/${String((count||0)+1).padStart(4,'0')}`;
  };

  /* ── Convert to Student ───────────────────────────────────────────────────── */
  const convertToStudent = async () => {
    if(!convertModal||!convertForm.admission_number.trim()){ toast.error('Admission number required'); return; }
    setSaving(true);
    try {
      // Look up the form_id from school_forms by matching form_level to form_applied_for
      const matchedForm = forms.find((f:any) => String(f.form_level) === String(convertModal.form_applied_for));
      const formId = matchedForm ? Number(matchedForm.id) : null;

      const { data: stu, error: e1 } = await supabase.from('school_students').insert([{
        admission_number: convertForm.admission_number.trim(),
        first_name:       convertModal.student_first_name,
        middle_name:      convertModal.student_middle_name||null,
        last_name:        convertModal.student_last_name,
        date_of_birth:    convertModal.date_of_birth||null,
        gender:           convertModal.gender||null,
        form_id:          formId,                                          // ← CRITICAL: sets the CLASS
        stream_id:        convertForm.stream_id ? Number(convertForm.stream_id) : null,
        admission_date:   convertForm.reporting_date || new Date().toISOString().split('T')[0],
        status:           'Active',
        guardian_name:    convertModal.guardian_full_name||null,
        guardian_phone:   convertModal.guardian_phone||null,
        guardian_email:   convertModal.guardian_email||null,
        county:           convertModal.county||null,
        blood_group:      convertModal.blood_group||null,
        kcpe_marks:       convertModal.kcpe_total_marks||null,
        previous_school:  convertModal.previous_school||null,
        nationality:      convertModal.nationality||null,
      }]).select().single();
      if(e1) throw e1;
      await supabase.from('school_admission_applications').update({
        converted_student_id: stu.id, status:'Approved', updated_at:new Date().toISOString()
      }).eq('id',convertModal.id);
      toast.success(`🎓 ${convertModal.student_first_name} admitted to student list! Form: ${matchedForm?.form_name||convertModal.form_applied_for}`);
      // Email parent that they are now admitted
      sendNotification({...convertModal, status:'Approved'}, 'Approved', 'Your child has been successfully admitted. Please report to school with all original documents.');
      if(convertModal.guardian_email) toast.success(`📧 Admission confirmation sent to ${convertModal.guardian_email}`);
      setConvertModal(null); load();
    } catch(e:any){ toast.error(e.message); }
    setSaving(false);
  };

  /* ── CSV Export ───────────────────────────────────────────────────────────── */
  const exportCSV = () => {
    const rows=[['Ref No','Student Name','Gender','DOB','Form','KCPE Marks','KCPE Index','County','Previous School','Guardian','Guardian Phone','Guardian Email','National ID','Blood Group','Status','Submitted']];
    filtered.forEach(a=>rows.push([
      a.reference_number||'',
      [a.student_first_name,a.student_middle_name,a.student_last_name].filter(Boolean).join(' '),
      a.gender||'',fmt(a.date_of_birth),formLabel(a.form_applied_for),
      String(a.kcpe_total_marks||''),a.kcpe_index_number||'',
      a.county||'',a.previous_school||'',
      a.guardian_full_name||'',a.guardian_phone||'',a.guardian_email||'',
      a.guardian_national_id||'',a.blood_group||'',a.status||'',fmt(a.created_at),
    ]));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const b=new Blob([csv],{type:'text/csv'});
    const u=URL.createObjectURL(b);
    const a=document.createElement('a'); a.href=u; a.download=`admissions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(u);
  };

  /* ── KPI Cards ────────────────────────────────────────────────────────────── */
  const KPIs = [
    {l:'Total',    v:counts.total,   e:'📋', c:'#1d4ed8'},
    {l:'New',      v:counts.new,     e:'📥', c:'#0891b2'},
    {l:'Review',   v:counts.review,  e:'🔍', c:'#d97706'},
    {l:'Approved', v:counts.approved,e:'✅', c:'#15803d'},
    {l:'Rejected', v:counts.rejected,e:'❌', c:'#b91c1c'},
    {l:'Waitlisted',v:counts.waitlist,e:'⏳',c:'#7c3aed'},
    {l:'Admitted', v:counts.admitted,e:'🎓', c:'#0f766e'},
  ];

  if(loading) return(
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{background:G.blue}}>📋</div>
      <p className="text-sm font-bold text-gray-500 animate-pulse">Loading applications…</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 shadow-sm" style={{background:'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 45%,#f0fdf4 100%)'}}>
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full opacity-[0.15]" style={{background:'radial-gradient(circle,#0891b2,transparent)'}}/>
        <div className="absolute -left-6 -bottom-6 w-36 h-36 rounded-full opacity-[0.08]" style={{background:'radial-gradient(circle,#0f766e,transparent)'}}/>
        <div className="relative p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg text-2xl" style={{background:'linear-gradient(135deg,#0891b2,#0f766e)'}}>
                📋
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900" style={{fontFamily:'Outfit,sans-serif',letterSpacing:'-0.03em'}}>Online Admissions</h1>
                <p className="text-sm text-gray-500 mt-0.5">Admin Panel · Review · Approve · Admit Students</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition shadow-sm" title="Refresh"><FiRefreshCw size={15}/></button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition shadow-sm"><FiDownload size={14}/> Export CSV</button>
              <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 transition shadow-sm"><FiPrinter size={14}/> Print</button>
            </div>
          </div>
          {/* KPI cards */}
          <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
            {KPIs.map(k=>(
              <div key={k.l} className="bg-white rounded-2xl p-3 text-center shadow-sm hover:shadow-md transition-all"
                style={{borderLeft:`3px solid ${k.c}`}}>
                <p className="text-xl font-black text-gray-900">{k.v}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{color:k.c}}>{k.e} {k.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {['All','Submitted','Under Review','Approved','Rejected','Waitlisted'].map(s=>{
            const ss=STATUS[s]; const cnt=s==='All'?counts.total:apps.filter(a=>a.status===s).length;
            return(
              <button key={s} onClick={()=>setStatus(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${statusFilter===s?'text-white border-transparent shadow-md':'border-transparent'}`}
                style={statusFilter===s?{background:ss?.grad||G.dark}:{background:'#f8fafc',color:'#64748b'}}>
                {ss?.icon||'📋'} {s} <span className="ml-1 opacity-70">{cnt}</span>
              </button>
            );
          })}
        </div>
        {/* Search + form filter + dates */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
              placeholder="Search name, ref no, phone, KCPE index…"
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-300"/>
          </div>
          <select value={formFilter} onChange={e=>setFormFilter(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300 font-medium">
            <option value="">All Forms</option>
            {[1,2,3,4,10,11,12].map(f=><option key={f} value={f}>{formLabel(f)}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300"
            placeholder="From"/>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-300"
            placeholder="To"/>
          {(search||formFilter||dateFrom||dateTo)&&(
            <button onClick={()=>{setSearch('');setFormFilter('');setDateFrom('');setDateTo('');}}
              className="px-3 py-2.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">
              Clear
            </button>
          )}
          <span className="self-center text-xs text-gray-400 font-medium ml-auto">{filtered.length} application{filtered.length!==1?'s':''}</span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{fontSize:12}}>
            <thead>
              <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                {['#','Ref No','Student Name','Gender','Age','Form','KCPE Marks','Guardian','Phone','Status','Submitted','Actions'].map(h=>(
                  <th key={h} className="text-left px-3 py-3 text-[10px] font-black uppercase tracking-wider" style={{color:'#475569'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length===0?(
                <tr><td colSpan={12} className="text-center py-16">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm font-bold text-gray-400">No applications found</p>
                  <p className="text-xs text-gray-300 mt-1">Adjust filters or wait for submissions</p>
                </td></tr>
              ):paged.map((a,idx)=>{
                const ss=STATUS[a.status]||STATUS['Submitted'];
                return(
                  <tr key={a.id} style={{borderBottom:'1px solid #f1f5f9'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'}
                    onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}>
                    <td className="px-3 py-3 text-center text-gray-400 font-bold">{(page-1)*PAGE+idx+1}</td>
                    <td className="px-3 py-3">
                      <button onClick={()=>setSelected(a)} className="font-black text-blue-600 hover:underline font-mono text-[11px]">{a.reference_number}</button>
                      {a.converted_student_id&&<span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 rounded px-1 font-bold">ADM</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-sm flex-shrink-0"
                          style={{background:a.gender==='Female'?G.purple:G.blue}}>
                          {(a.student_first_name||'?')[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900">{[a.student_first_name,a.student_last_name].join(' ')}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{a.gender||'—'}</td>
                    <td className="px-3 py-3 text-gray-500">{age(a.date_of_birth)}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700">{formLabel(a.form_applied_for)}</span></td>
                    <td className="px-3 py-3 font-bold text-gray-800">{a.kcpe_total_marks||'—'}</td>
                    <td className="px-3 py-3 text-gray-700 max-w-[110px] truncate">{a.guardian_full_name||'—'}</td>
                    <td className="px-3 py-3 text-gray-600">{a.guardian_phone||'—'}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black border" style={{background:ss.bg,color:ss.text,borderColor:ss.border}}>
                        {ss.icon} {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-[11px]">{fmt(a.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>setSelected(a)} title="View Full Details"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" ><FiEye size={12}/></button>
                        {!a.converted_student_id&&<>
                          <button onClick={()=>{setActionModal({app:a,action:'Under Review'});setReviewNotes('');}} title="Under Review"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"><FiClock size={12}/></button>
                          <button onClick={()=>{setActionModal({app:a,action:'Approved'});setReviewNotes('');}} title="Approve"
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"><FiCheck size={12}/></button>
                          <button onClick={()=>{setActionModal({app:a,action:'Rejected'});setReviewNotes('');}} title="Reject"
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"><FiX size={12}/></button>
                          {a.status==='Approved'&&(
                            <button onClick={async()=>{const no=await fetchNextAdmNo();setConvertModal(a);setConvertForm({stream_id:'',admission_number:no,reporting_date:''}); }} title="Admit Student"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"><FiStar size={12}/></button>
                          )}
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {filtered.length>PAGE&&(
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {page} of {tp} · {filtered.length} total</p>
            <div className="flex items-center gap-1.5">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14}/></button>
              <button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp}
                className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
           FULL DETAIL MODAL
      ══════════════════════════════════════════════════ */}
      {selected&&<DetailModal app={selected} onClose={()=>setSelected(null)}
        onAction={(app,action)=>{setActionModal({app,action});setReviewNotes('');setSelected(null);}}
        onConvert={async(app)=>{const no=await fetchNextAdmNo();setConvertModal(app);setConvertForm({stream_id:'',admission_number:no,reporting_date:''});setSelected(null);}}
      />}

      {/* ══════════════════════════════════════════════════
           ACTION MODAL (Approve / Reject / Waitlist)
      ══════════════════════════════════════════════════ */}
      {actionModal&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            {(()=>{ const ss=STATUS[actionModal.action]||STATUS['Submitted']; return(
            <>
              <div className="p-5 rounded-t-3xl border-b" style={{background:ss.bg}}>
                <p className="font-black text-lg" style={{color:ss.text}}>{ss.icon} {actionModal.action} Application</p>
                <p className="text-sm mt-0.5" style={{color:ss.text}}>{actionModal.app.student_first_name} {actionModal.app.student_last_name} · {actionModal.app.reference_number}</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                  {actionModal.action==='Approved'&&'✅ Approving allows this application to be converted to a student record.'}
                  {actionModal.action==='Rejected'&&'❌ Please provide a clear reason. The applicant will be notified.'}
                  {actionModal.action==='Waitlisted'&&'⏳ Applicant will be notified they are on the waitlist.'}
                  {actionModal.action==='Under Review'&&'🔍 Marks this application as actively being reviewed.'}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-1.5">
                    Review Notes {actionModal.action==='Rejected'?'(required)':'(optional)'}
                  </label>
                  <textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} rows={4}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"
                    placeholder={actionModal.action==='Rejected'?'Reason for rejection…':'Internal notes…'}/>
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={updateStatus} disabled={saving||(actionModal.action==='Rejected'&&!reviewNotes.trim())}
                  className="flex-1 py-3 font-black text-white rounded-2xl disabled:opacity-60"
                  style={{background:ss.grad}}>
                  {saving?'Saving…':`Confirm ${actionModal.action}`}
                </button>
                <button onClick={()=>setActionModal(null)} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
              </div>
            </>
            );})()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
           CONVERT TO STUDENT MODAL
      ══════════════════════════════════════════════════ */}
      {convertModal&&(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b" style={{background:G.green}}>
              <p className="text-white font-black text-lg">🎓 Admit Student — Final Step</p>
              <p className="text-green-100 text-sm mt-0.5">{convertModal.student_first_name} {convertModal.student_last_name} · {convertModal.reference_number}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800">
                ✅ This creates a <strong>school_students</strong> record and permanently admits this student. All application data will be copied across automatically.
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Pre-filled from Application</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Name',[convertModal.student_first_name,convertModal.student_middle_name,convertModal.student_last_name].filter(Boolean).join(' ')],
                    ['Gender',convertModal.gender||'—'],['DOB',fmt(convertModal.date_of_birth)],
                    ['Form',formLabel(convertModal.form_applied_for)],['KCPE Marks',convertModal.kcpe_total_marks?`${convertModal.kcpe_total_marks}/500`:'—'],
                    ['Guardian',convertModal.guardian_full_name||'—'],['Guardian Phone',convertModal.guardian_phone||'—'],
                    ['County',convertModal.county||'—'],['Blood Group',convertModal.blood_group||'—'],
                  ].map(([l,v])=>(
                    <div key={l as string}><span className="text-gray-400 font-semibold">{l}: </span><span className="font-bold text-gray-800">{v}</span></div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1">Admission Number *</label>
                <input value={convertForm.admission_number} onChange={e=>setConvertForm(p=>({...p,admission_number:e.target.value}))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 font-mono font-black" placeholder="e.g. ADM2026-001"/>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1">Stream / Class
                  <span className="ml-1 text-gray-400 font-normal normal-case">(numbers show current students)</span>
                </label>
                <select value={convertForm.stream_id} onChange={e=>setConvertForm(p=>({...p,stream_id:e.target.value}))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400">
                  <option value="">— Select Stream / Class —</option>
                  {(()=>{
                    // Match form by form_level using String() comparison — same as attendance page
                    const matchForm = forms.find((f:any)=>String(f.form_level)===String(convertModal?.form_applied_for));
                    // Filter streams by form_id using String() comparison
                    const byForm = matchForm
                      ? streams.filter((s:any)=>String(s.form_id)===String(matchForm.id))
                      : streams;
                    // Show matched streams, fall back to ALL streams if none matched
                    const toShow = byForm.length > 0 ? byForm : streams;
                    if(toShow.length===0) return <option disabled value="">No streams found in database</option>;
                    return toShow.map((s:any)=>{
                      const cnt = streamCounts[String(s.id)]||0;
                      return(
                        <option key={s.id} value={s.id}>
                          {s.stream_name} — {cnt} student{cnt!==1?'s':''}
                        </option>
                      );
                    });
                  })()}
                </select>
                {convertForm.stream_id&&(()=>{
                  const cnt=streamCounts[String(convertForm.stream_id)]||0;
                  const clr=cnt>=40?'text-red-600 bg-red-50 border-red-200':cnt>=30?'text-amber-600 bg-amber-50 border-amber-200':'text-green-700 bg-green-50 border-green-200';
                  return<p className={`text-[11px] font-bold mt-1.5 px-2.5 py-1 rounded-lg border ${clr}`}>
                    {cnt>=40?'⚠️ Class full (40+)':cnt>=30?`⚡ ${cnt} students — getting full`:`✅ ${cnt} student${cnt!==1?'s':''} — space available`}
                  </p>;
                })()}
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1">Reporting Date</label>
                <input type="date" value={convertForm.reporting_date} onChange={e=>setConvertForm(p=>({...p,reporting_date:e.target.value}))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400"/>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={convertToStudent} disabled={saving||!convertForm.admission_number.trim()}
                className="flex-1 py-3 font-black text-white rounded-2xl disabled:opacity-60"
                style={{background:G.green}}>
                {saving?'⏳ Admitting…':'🎓 Admit Student — Save to Database'}
              </button>
              <button onClick={()=>setConvertModal(null)} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   FULL DETAIL MODAL — PREMIUM TABBED VIEW
══════════════════════════════════════════════════════════════════════════════ */
function DetailModal({ app, onClose, onAction, onConvert }: {
  app: Application;
  onClose: () => void;
  onAction: (app: Application, action: string) => void;
  onConvert: (app: Application) => void;
}) {
  const [tab, setTab] = useState<'student'|'academic'|'guardian'|'medical'|'documents'>('student');
  const ss = STATUS[app.status] || STATUS['Submitted'];

  const Row = ({ icon, label, value, mono=false }: { icon?: React.ReactNode; label: string; value?: string|null|boolean; mono?: boolean }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {icon && <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-semibold text-gray-800 mt-0.5 break-words ${mono?'font-mono':''}`}>
          {value===true?'✅ Yes':value===false?'❌ No':value||'—'}
        </p>
      </div>
    </div>
  );

  const DocBtn = ({ url, label, icon }: { url?: string|null; label: string; icon: string }) => (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${url?'border-blue-200 bg-blue-50':'border-gray-100 bg-gray-50 opacity-60'}`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-xs font-black text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400">{url?'Uploaded ✅':'Not uploaded'}</p>
      </div>
      {url&&(
        <div className="flex gap-1.5">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition" title="View">
            <FiExternalLink size={13}/>
          </a>
          <a href={url} download
            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition" title="Download">
            <FiDownload size={13}/>
          </a>
        </div>
      )}
    </div>
  );

  const TABS = [
    {k:'student',   icon:'🎓', label:'Student'},
    {k:'academic',  icon:'📚', label:'Academic'},
    {k:'guardian',  icon:'👪', label:'Guardian'},
    {k:'medical',   icon:'🏥', label:'Medical'},
    {k:'documents', icon:'📄', label:'Documents'},
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-3 overflow-y-auto" style={{backdropFilter:'blur(4px)'}}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4" onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 relative overflow-hidden" style={{background:G.dark}}>
          <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0"
                style={{background:app.gender==='Female'?G.purple:G.blue}}>
                {(app.student_first_name||'?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-black text-lg leading-tight">
                  {[app.student_first_name,app.student_middle_name,app.student_last_name].filter(Boolean).join(' ')}
                </p>
                <p className="text-slate-400 text-xs font-mono mt-0.5">{app.reference_number}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-black border" style={{background:ss.bg,color:ss.text,borderColor:ss.border}}>
                    {ss.icon} {app.status}
                  </span>
                  {app.converted_student_id&&<span className="px-2 py-0.5 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">🎓 ADMITTED</span>}
                  {app.email_verified&&<span className="px-2 py-0.5 rounded-xl text-[11px] font-black bg-blue-900/30 text-blue-300 border border-blue-700/30">✉️ Email Verified</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex-shrink-0"><FiX size={18}/></button>
          </div>
          {/* Meta row */}
          <div className="relative flex items-center gap-4 mt-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><FiCalendar size={11}/> Submitted: {fmtDT(app.created_at)}</span>
            {app.reviewed_at&&<span className="flex items-center gap-1"><FiInfo size={11}/> Reviewed: {fmtDT(app.reviewed_at)}</span>}
            {app.submitter_ip&&<span className="flex items-center gap-1"><FiShield size={11}/> IP: {app.submitter_ip}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              className={`px-4 py-3 text-xs font-black whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5
                ${tab===t.k?'border-blue-600 text-blue-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">

          {/* ── STUDENT TAB ─────────────────────────────────────────────── */}
          {tab==='student'&&(
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">🧑 Personal Details</p>
                <Row label="First Name"   value={app.student_first_name}/>
                <Row label="Middle Name"  value={app.student_middle_name}/>
                <Row label="Last Name"    value={app.student_last_name}/>
                <Row label="Date of Birth" value={`${fmt(app.date_of_birth)} (${age(app.date_of_birth)})`}/>
                <Row label="Gender"       value={app.gender}/>
                <Row label="Nationality"  value={app.nationality||'Kenyan'}/>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">📍 Location</p>
                <Row icon={<FiMapPin size={13}/>} label="County"        value={app.county}/>
                <Row label="Sub-County"   value={app.sub_county}/>
                <Row label="Village/Estate" value={app.village_estate}/>
                {app.photo_url&&(
                  <div className="mt-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">📸 Student Photo</p>
                    <img src={app.photo_url} alt="Student" className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200 shadow"/>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ACADEMIC TAB ─────────────────────────────────────────────── */}
          {tab==='academic'&&(
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">📚 Admission</p>
                <Row icon={<FiBook size={13}/>} label="Form Applied For"  value={formLabel(app.form_applied_for)}/>
                <Row label="Previous School"   value={app.previous_school}/>
                <Row label="Previous School County" value={app.previous_school_county}/>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">🏆 KCPE Details</p>
                <Row icon={<FiAward size={13}/>} label="KCPE Index Number" value={app.kcpe_index_number} mono/>
                <Row label="KCPE Total Marks"  value={app.kcpe_total_marks?`${app.kcpe_total_marks} / 500`:undefined}/>
                <Row label="KCPE Year"         value={String(app.kcpe_year||'')||undefined}/>
                {app.kcpe_total_marks&&(
                  <div className="mt-3 p-3 rounded-xl" style={{
                    background:app.kcpe_total_marks>=350?'#f0fdf4':app.kcpe_total_marks>=250?'#fefce8':'#fef2f2',
                    border:`1px solid ${app.kcpe_total_marks>=350?'#bbf7d0':app.kcpe_total_marks>=250?'#fde68a':'#fecaca'}`
                  }}>
                    <p className="text-xs font-black" style={{color:app.kcpe_total_marks>=350?'#15803d':app.kcpe_total_marks>=250?'#a16207':'#b91c1c'}}>
                      {app.kcpe_total_marks>=350?'🌟 Excellent performance':app.kcpe_total_marks>=250?'👍 Good performance':'📚 May need academic support'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── GUARDIAN TAB ─────────────────────────────────────────────── */}
          {tab==='guardian'&&(
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">👪 Parent / Guardian</p>
                <Row icon={<FiUser size={13}/>}  label="Full Name"         value={app.guardian_full_name}/>
                <Row label="Relationship"        value={app.guardian_relationship||'Parent'}/>
                <Row icon={<FiPhone size={13}/>} label="Primary Phone"     value={app.guardian_phone}/>
                <Row label="Alternative Phone"   value={app.guardian_alt_phone}/>
                <Row icon={<FiMail size={13}/>}  label="Email"             value={app.guardian_email}/>
                <Row label="National ID"         value={app.guardian_national_id} mono/>
                <Row label="Occupation"          value={app.guardian_occupation}/>
                <Row icon={<FiMapPin size={13}/>} label="Guardian County"  value={app.guardian_county}/>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">🆘 Emergency Contact</p>
                <Row label="Contact Name"         value={app.emergency_name}/>
                <Row icon={<FiPhone size={13}/>} label="Emergency Phone"   value={app.emergency_phone}/>
                <Row label="Relationship"         value={app.emergency_relationship}/>
                {app.review_notes&&(
                  <div className="mt-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">📝 Review Notes</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-sm text-amber-800">{app.review_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MEDICAL TAB ─────────────────────────────────────────────── */}
          {tab==='medical'&&(
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">🏥 Medical Information</p>
                <Row icon={<FiHeart size={13}/>} label="Blood Group"       value={app.blood_group}/>
                <Row label="Has Disability"      value={app.has_disability}/>
                {app.has_disability&&<Row label="Disability Details" value={app.disability_details}/>}
                <Row label="Allergies"           value={app.allergies}/>
                <Row label="Medical Conditions"  value={app.medical_conditions}/>
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">✅ Application Integrity</p>
                <Row icon={<FiShield size={13}/>} label="Email Verified"   value={app.email_verified}/>
                <Row label="Phone Verified"       value={app.phone_verified}/>
                <Row label="Terms Agreed"         value={app.terms_agreed}/>
                <Row label="Submitter IP"         value={app.submitter_ip} mono/>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS TAB ─────────────────────────────────────────────── */}
          {tab==='documents'&&(
            <div className="space-y-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">📄 Uploaded Documents</p>
              <DocBtn url={app.photo_url}      label="Student Passport Photo"   icon="📸"/>
              <DocBtn url={app.birth_cert_url} label="Birth Certificate"        icon="📜"/>
              <DocBtn url={app.kcpe_slip_url}  label="KCPE Result Slip"         icon="🏆"/>
              <DocBtn url={app.other_doc_url}  label={app.other_doc_name||'Other Document'} icon="📎"/>
              {!app.photo_url&&!app.birth_cert_url&&!app.kcpe_slip_url&&!app.other_doc_url&&(
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">📂</p>
                  <p className="text-sm font-bold text-gray-400">No documents uploaded yet</p>
                  <p className="text-xs text-gray-300 mt-1">Documents can be submitted in person when the student reports</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 rounded-b-3xl flex gap-2 flex-wrap">
          {!app.converted_student_id&&(
            <>
              {['Under Review','Approved','Rejected','Waitlisted'].map(act=>{
                const s=STATUS[act];
                return(
                  <button key={act} onClick={()=>onAction(app,act)}
                    className="px-3 py-2 rounded-xl text-xs font-black border transition-all hover:opacity-80"
                    style={{background:s.bg,color:s.text,borderColor:s.border}}>
                    {s.icon} {act}
                  </button>
                );
              })}
              {app.status==='Approved'&&(
                <button onClick={()=>onConvert(app)}
                  className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-md hover:opacity-90 transition"
                  style={{background:G.green}}>
                  🎓 Admit Student
                </button>
              )}
            </>
          )}
          {app.converted_student_id&&(
            <span className="px-4 py-2 rounded-xl text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200">
              ✅ Student admitted to school system (ID: {app.converted_student_id})
            </span>
          )}
          <button onClick={onClose} className="ml-auto px-5 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-300 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
