'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle } from 'react-icons/fi';
const G={blue:'linear-gradient(135deg,#2563eb,#3b82f6)',green:'linear-gradient(135deg,#059669,#0d9488)',amber:'linear-gradient(135deg,#f59e0b,#d97706)',purple:'linear-gradient(135deg,#7c3aed,#8b5cf6)',red:'linear-gradient(135deg,#ef4444,#dc2626)'};

export default function SuperAdminPage() {
  const [loading,setLoading]=useState(true),[tenants,setTenants]=useState<any[]>([]),[campuses,setCampuses]=useState<any[]>([]),
    [saving,setSaving]=useState(false),[search,setSearch]=useState(''),[page,setPage]=useState(1),
    [tab,setTab]=useState<'tenants'|'campuses'>('tenants'),[showModal,setShowModal]=useState(''),[editItem,setEditItem]=useState<any>(null);
  const [tForm,setTForm]=useState({tenant_code:'',tenant_name:'',school_type:'secondary',curriculum_type:'cbc',county:'',sub_county:'',phone:'',email:'',subscription_plan:'basic',max_students:500,address:''});
  const [cForm,setCForm]=useState({tenant_id:0,campus_name:'',campus_code:'',address:'',phone:'',is_main:false});

  const fetchAll=useCallback(async()=>{setLoading(true);const[t,c]=await Promise.all([supabase.from('school_tenants').select('*').order('created_at',{ascending:false}),supabase.from('school_campuses').select('*,school_tenants(tenant_name)').order('created_at',{ascending:false})]);setTenants(t.data||[]);setCampuses(c.data||[]);setLoading(false)},[]);
  useEffect(()=>{fetchAll()},[fetchAll]);

  const filtered=useMemo(()=>{if(!search)return tenants;const q=search.toLowerCase();return tenants.filter(t=>t.tenant_name?.toLowerCase().includes(q)||t.tenant_code?.toLowerCase().includes(q))},[tenants,search]);
  const tp=Math.max(1,Math.ceil(filtered.length/10)),paged=filtered.slice((page-1)*10,page*10);

  const openTModal=(t?:any)=>{setEditItem(t||null);setTForm({tenant_code:t?.tenant_code||'',tenant_name:t?.tenant_name||'',school_type:t?.school_type||'secondary',curriculum_type:t?.curriculum_type||'cbc',county:t?.county||'',sub_county:t?.sub_county||'',phone:t?.phone||'',email:t?.email||'',subscription_plan:t?.subscription_plan||'basic',max_students:t?.max_students||500,address:t?.address||''});setShowModal('tenant')};
  const saveTenant=async()=>{if(!tForm.tenant_code.trim()||!tForm.tenant_name.trim())return toast.error('Code & name required');setSaving(true);try{const p={tenant_code:tForm.tenant_code.trim(),tenant_name:tForm.tenant_name.trim(),school_type:tForm.school_type,curriculum_type:tForm.curriculum_type,county:tForm.county.trim()||null,sub_county:tForm.sub_county.trim()||null,phone:tForm.phone.trim()||null,email:tForm.email.trim()||null,subscription_plan:tForm.subscription_plan,max_students:tForm.max_students,address:tForm.address.trim()||null};let err;if(editItem?.id)({error:err}=await supabase.from('school_tenants').update(p).eq('id',editItem.id));else({error:err}=await supabase.from('school_tenants').insert([p]));if(err)throw err;toast.success('✅ Tenant saved!');setShowModal('');fetchAll()}catch(e:any){toast.error(e.message)}setSaving(false)};
  const toggleTenant=async(t:any)=>{const{error}=await supabase.from('school_tenants').update({is_active:!t.is_active}).eq('id',t.id);if(!error){toast.success(t.is_active?'Deactivated':'Activated');fetchAll()}};

  const saveCampus=async()=>{if(!cForm.tenant_id||!cForm.campus_name.trim())return toast.error('Tenant & campus name required');setSaving(true);const{error}=await supabase.from('school_campuses').insert([{tenant_id:cForm.tenant_id,campus_name:cForm.campus_name.trim(),campus_code:cForm.campus_code.trim()||null,address:cForm.address.trim()||null,phone:cForm.phone.trim()||null,is_main:cForm.is_main}]);if(error)toast.error(error.message);else{toast.success('✅ Campus added!');setShowModal('');fetchAll()}setSaving(false)};
  const delCampus=async(id:number)=>{if(!confirm('Delete campus?'))return;const{error}=await supabase.from('school_campuses').delete().eq('id',id);if(!error){toast.success('Deleted');fetchAll()}};

  if(loading)return(<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:G.blue}}>🏫</div><p className="text-sm font-bold text-gray-500">Loading Multi-School…</p></div>);

  return(<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-extrabold text-gray-900" style={{fontFamily:'Outfit,sans-serif',letterSpacing:'-0.03em'}}>🏫 Multi-School / Super Admin</h1><p className="text-sm text-gray-500 mt-1">{tenants.length} schools · {campuses.length} campuses</p></div><div className="flex items-center gap-2 flex-wrap"><button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 transition"><FiRefreshCw size={15}/></button><button onClick={()=>openTModal()} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{background:G.blue}}>🏫 Add School</button><button onClick={()=>{setCForm({tenant_id:0,campus_name:'',campus_code:'',address:'',phone:'',is_main:false});setShowModal('campus')}} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{background:'#f0fdf4',color:'#15803d',border:'none',cursor:'pointer'}}>🏢 Add Campus</button></div></div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[{l:'Total Schools',v:tenants.length,e:'🏫',c:'#2563eb'},{l:'Active Schools',v:tenants.filter(t=>t.is_active).length,e:'✅',c:'#059669'},{l:'Total Campuses',v:campuses.length,e:'🏢',c:'#f59e0b'},{l:'Total Students Cap',v:tenants.reduce((a,t)=>a+(t.max_students||0),0),e:'👨‍🎓',c:'#7c3aed'}].map((cd,i)=>(<div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{borderLeftWidth:4,borderLeftColor:cd.c}}><div className="flex items-center justify-between mb-2"><p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{cd.l}</p><span className="text-xl">{cd.e}</span></div><p className="text-xl font-extrabold text-gray-900">{cd.v}</p><div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{background:cd.c}}/></div>))}</div>

    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">{[{k:'tenants',l:'🏫 Schools'},{k:'campuses',l:'🏢 Campuses'}].map(t=>(<button key={t.k} onClick={()=>setTab(t.k as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab===t.k?'bg-white shadow text-blue-700':'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>))}</div>

    {tab==='tenants'&&<><div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-[220px]"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search schools…" className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-300"/>{search&&<button onClick={()=>{setSearch('');setPage(1)}} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14}/></button>}</div></div></div>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['#','Code','School Name','Type','Curriculum','County','Plan','Status','⚙️'].map((h,i)=><th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
    <tbody>{paged.map((t,idx)=>(<tr key={t.id} style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}><td className="px-3 py-3 text-center font-bold text-gray-400">{(page-1)*10+idx+1}</td><td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">{t.tenant_code}</span></td><td className="px-3 py-3 font-bold text-gray-900">{t.tenant_name}</td><td className="px-3 py-3 text-gray-600 capitalize">{t.school_type}</td><td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">{t.curriculum_type?.toUpperCase()}</span></td><td className="px-3 py-3 text-gray-600">{t.county||'-'}</td><td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.subscription_plan==='premium'?'bg-amber-50 text-amber-700':t.subscription_plan==='enterprise'?'bg-red-50 text-red-700':'bg-gray-50 text-gray-600'} capitalize`}>{t.subscription_plan}</span></td><td className="px-3 py-3"><button onClick={()=>toggleTenant(t)} className="flex items-center gap-1">{t.is_active?<><FiCheckCircle size={12} className="text-green-500"/><span className="text-[10px] font-bold text-green-600">Active</span></>:<><FiXCircle size={12} className="text-red-400"/><span className="text-[10px] font-bold text-red-400">Inactive</span></>}</button></td><td className="px-3 py-3"><button onClick={()=>openTModal(t)} className="p-2 rounded-xl transition hover:scale-110" style={{background:'#ddd6fe',color:'#6d28d9'}}><FiEdit2 size={12}/></button></td></tr>))}</tbody></table></div>
    {filtered.length>10&&<div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between"><p className="text-xs text-gray-400">Page {page} of {tp}</p><div className="flex items-center gap-1.5"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14}/></button><button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14}/></button></div></div>}</div></>}

    {tab==='campuses'&&<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['School','Campus','Code','Address','Phone','Main','⚙️'].map((h,i)=><th key={i} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
    <tbody>{campuses.map(c=>(<tr key={c.id} style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}><td className="px-4 py-3 font-bold text-gray-900">{c.school_tenants?.tenant_name||'-'}</td><td className="px-4 py-3 font-semibold text-gray-800">{c.campus_name}</td><td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">{c.campus_code||'-'}</span></td><td className="px-4 py-3 text-gray-600">{c.address||'-'}</td><td className="px-4 py-3 text-gray-600">{c.phone||'-'}</td><td className="px-4 py-3">{c.is_main?<FiCheckCircle size={14} className="text-green-500"/>:<span className="text-gray-300">-</span>}</td><td className="px-4 py-3"><button onClick={()=>delCampus(c.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500"><FiTrash2 size={11}/></button></td></tr>))}</tbody></table></div></div>}

    {/* Tenant Modal */}
    {showModal==='tenant'&&<div className="modal-overlay" onClick={()=>setShowModal('')}><div className="modal-content" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}><div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{background:G.blue}}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">🏫 {editItem?'Edit':'Add'} School</h2><button onClick={()=>setShowModal('')} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18}/></button></div><div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">School Code *</label><input value={tForm.tenant_code} onChange={e=>setTForm({...tForm,tenant_code:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" disabled={!!editItem}/></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">School Name *</label><input value={tForm.tenant_name} onChange={e=>setTForm({...tForm,tenant_name:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"/></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">School Type</label><select value={tForm.school_type} onChange={e=>setTForm({...tForm,school_type:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400">{['primary','secondary','mixed','college'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Curriculum</label><select value={tForm.curriculum_type} onChange={e=>setTForm({...tForm,curriculum_type:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400">{['8-4-4','cbc','igcse'].map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">County</label><input value={tForm.county} onChange={e=>setTForm({...tForm,county:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"/></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Sub County</label><input value={tForm.sub_county} onChange={e=>setTForm({...tForm,sub_county:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"/></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Subscription</label><select value={tForm.subscription_plan} onChange={e=>setTForm({...tForm,subscription_plan:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400">{['basic','standard','premium','enterprise'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}</select></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Max Students</label><input type="number" value={tForm.max_students} onChange={e=>setTForm({...tForm,max_students:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"/></div></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Address</label><textarea value={tForm.address} onChange={e=>setTForm({...tForm,address:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" rows={2}/></div></div><div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={()=>setShowModal('')} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14}/> Cancel</button><button onClick={saveTenant} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{background:G.blue}}>{saving?<div className="spinner" style={{width:14,height:14}}/>:<FiSave size={14}/>} Save</button></div></div></div>}

    {/* Campus Modal */}
    {showModal==='campus'&&<div className="modal-overlay" onClick={()=>setShowModal('')}><div className="modal-content" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}><div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{background:G.green}}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">🏢 Add Campus</h2><button onClick={()=>setShowModal('')} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18}/></button></div><div className="p-6 space-y-4"><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">School *</label><select value={cForm.tenant_id} onChange={e=>setCForm({...cForm,tenant_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400"><option value={0}>Select School</option>{tenants.map(t=><option key={t.id} value={t.id}>{t.tenant_name}</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Campus Name *</label><input value={cForm.campus_name} onChange={e=>setCForm({...cForm,campus_name:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400"/></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Campus Code</label><input value={cForm.campus_code} onChange={e=>setCForm({...cForm,campus_code:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400"/></div></div><div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase">Address</label><input value={cForm.address} onChange={e=>setCForm({...cForm,address:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400"/></div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={cForm.is_main} onChange={e=>setCForm({...cForm,is_main:e.target.checked})} className="w-4 h-4 rounded"/><span className="text-sm text-gray-700">Main Campus</span></label></div><div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={()=>setShowModal('')} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14}/> Cancel</button><button onClick={saveCampus} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{background:G.green}}>{saving?<div className="spinner" style={{width:14,height:14}}/>:<FiSave size={14}/>} Save</button></div></div></div>}
    <SmtpSettingsPanel />
  </div>);
}

// ── SMTP Settings Panel ────────────────────────────────────────────────────────
function SmtpSettingsPanel() {
  const [smtp, setSmtp] = useState({
    smtp_host: 'smtp.gmail.com', smtp_port: '587',
    smtp_user: '', smtp_pass: '', smtp_from_name: 'APSIMS Admissions',
    smtp_from_email: '', smtp_enabled: true, test_to: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetch('/api/admin/smtp-settings').then(r => r.json()).then(r => {
      if (r.data) setSmtp(p => ({
        ...p,
        smtp_host: r.data.smtp_host || 'smtp.gmail.com',
        smtp_port: String(r.data.smtp_port || 587),
        smtp_user: r.data.smtp_user || '',
        smtp_from_name: r.data.smtp_from_name || 'APSIMS Admissions',
        smtp_from_email: r.data.smtp_from_email || '',
        smtp_enabled: r.data.smtp_enabled !== false,
      }));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!smtp.smtp_user || !smtp.smtp_pass) return toast.error('Gmail address and App Password are required');
    setSaving(true);
    const res = await fetch('/api/admin/smtp-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...smtp, smtp_port: Number(smtp.smtp_port) }),
    });
    const r = await res.json();
    if (r.success) toast.success('✅ SMTP settings saved!');
    else toast.error(r.error || 'Failed to save');
    setSaving(false);
  };

  const testEmail = async () => {
    if (!smtp.test_to) return toast.error('Enter an email address to send the test to');
    if (!smtp.smtp_user || !smtp.smtp_pass) return toast.error('Fill in Gmail and App Password first');
    setTesting(true);
    const res = await fetch('/api/admin/smtp-settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...smtp, smtp_port: Number(smtp.smtp_port) }),
    });
    const r = await res.json();
    if (r.success) toast.success(`✅ Test email sent to ${smtp.test_to}! Check your inbox.`);
    else toast.error(r.error || 'Test failed');
    setTesting(false);
  };

  const F = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 bg-white';
  const L = 'block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">✉️</div>
        <div>
          <p className="text-white font-black text-base">Email / SMTP Settings</p>
          <p className="text-blue-200 text-xs">Configure Gmail to send OTP verification codes for online admissions</p>
        </div>
        <label className="ml-auto flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-blue-200 font-bold">Enabled</span>
          <div onClick={() => setSmtp(p => ({ ...p, smtp_enabled: !p.smtp_enabled }))}
            className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${smtp.smtp_enabled ? 'bg-green-400' : 'bg-gray-500'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${smtp.smtp_enabled ? 'left-5' : 'left-0.5'}`} />
          </div>
        </label>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Settings Form */}
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-black text-blue-800 mb-2">📋 How to get Gmail App Password (3 steps):</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal ml-4 leading-relaxed">
              <li>Go to <strong>myaccount.google.com</strong> → Security</li>
              <li>Turn on <strong>2-Step Verification</strong> (if not already on)</li>
              <li>Go to Security → <strong>App Passwords</strong> → Select app: <em>Mail</em> → Generate</li>
            </ol>
            <p className="text-[10px] text-blue-600 mt-2 font-semibold">Copy the 16-character password shown and paste it below ↓</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={L}>Gmail Address *</label>
              <input value={smtp.smtp_user} onChange={e => setSmtp(p => ({ ...p, smtp_user: e.target.value, smtp_from_email: e.target.value }))}
                className={F} type="email" placeholder="yourschool@gmail.com" />
            </div>
            <div className="col-span-2">
              <label className={L}>Gmail App Password * <span className="text-gray-400 font-normal normal-case">(16-character, no spaces)</span></label>
              <div className="relative">
                <input value={smtp.smtp_pass} onChange={e => setSmtp(p => ({ ...p, smtp_pass: e.target.value }))}
                  className={F + ' pr-10 font-mono'} type={showPass ? 'text' : 'password'} placeholder="xxxx xxxx xxxx xxxx" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 text-xs font-bold">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label className={L}>Sender Name</label>
              <input value={smtp.smtp_from_name} onChange={e => setSmtp(p => ({ ...p, smtp_from_name: e.target.value }))}
                className={F} placeholder="APSIMS Admissions" />
            </div>
            <div>
              <label className={L}>SMTP Host</label>
              <input value={smtp.smtp_host} onChange={e => setSmtp(p => ({ ...p, smtp_host: e.target.value }))}
                className={F} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className={L}>SMTP Port</label>
              <select value={smtp.smtp_port} onChange={e => setSmtp(p => ({ ...p, smtp_port: e.target.value }))} className={F}>
                <option value="587">587 (TLS — Recommended)</option>
                <option value="465">465 (SSL)</option>
                <option value="25">25</option>
              </select>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-3 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <>💾 Save SMTP Settings</>}
          </button>
        </div>

        {/* Right — Test Email */}
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-sm font-black text-emerald-800 mb-1">🧪 Test Your Email Settings</p>
            <p className="text-xs text-emerald-700 mb-4">Send a test email to verify Gmail SMTP is working before parents use the admissions form.</p>
            <label className={L + ' text-emerald-700'}>Send Test Email To</label>
            <input value={smtp.test_to} onChange={e => setSmtp(p => ({ ...p, test_to: e.target.value }))}
              className={F + ' mb-3'} type="email" placeholder="your@email.com" />
            <button onClick={testEmail} disabled={testing}
              className="w-full py-3 text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
              {testing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</> : <>✉️ Send Test Email</>}
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-gray-700 mb-2">📊 Current Configuration</p>
            {[
              ['Provider', 'Gmail SMTP'],
              ['Host', smtp.smtp_host || '—'],
              ['Port', smtp.smtp_port || '—'],
              ['Gmail Account', smtp.smtp_user || '⚠️ Not set'],
              ['App Password', smtp.smtp_pass ? '●●●●●●●●●●●●●●●●' : '⚠️ Not set'],
              ['Status', smtp.smtp_enabled ? '✅ Enabled' : '❌ Disabled'],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-semibold">{l}</span>
                <span className="font-bold text-gray-800">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 font-bold">⚠️ Important:</p>
            <p className="text-xs text-amber-700 mt-1">Use your school Gmail account. Regular Gmail password won&apos;t work — you must use a <strong>Gmail App Password</strong>. It&apos;s free and takes 1 minute to generate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
