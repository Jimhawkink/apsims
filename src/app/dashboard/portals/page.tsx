'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiCheck, FiUser, FiUsers, FiBell, FiLogIn, FiLock, FiEye, FiEyeOff, FiSend, FiCopy, FiShield, FiZap, FiPhone } from 'react-icons/fi';
const G={blue:'linear-gradient(135deg,#2563eb,#3b82f6)',green:'linear-gradient(135deg,#059669,#0d9488)',amber:'linear-gradient(135deg,#f59e0b,#d97706)',purple:'linear-gradient(135deg,#7c3aed,#8b5cf6)',red:'linear-gradient(135deg,#ef4444,#dc2626)'};
const typeEmoji:any={info:'📢',fee:'💰',result:'📊',attendance:'📋',health:'🏥',general:'🔔'};

// Searchable student picker — handles thousands of students without freezing
function StudentPicker({students,value,onChange}:{students:any[],value:number,onChange:(id:number)=>void}) {
  const [q,setQ]=useState('');
  const [open,setOpen]=useState(false);
  const selected=students.find(s=>s.id===value);
  const filtered=q.trim().length>0
    ?students.filter(s=>{
        const name=`${s.last_name} ${s.first_name} ${s.admission_number}`.toLowerCase();
        return name.includes(q.toLowerCase());
      }).slice(0,50)
    :[];
  return(
    <div className="relative">
      <div
        className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm cursor-pointer flex items-center justify-between hover:border-green-400 transition-all"
        onClick={()=>setOpen(o=>!o)}
      >
        <span className={selected?'text-gray-900 font-semibold':'text-gray-400'}>
          {selected?`${selected.last_name}, ${selected.first_name} (${selected.admission_number})${selected.school_forms?.form_name?` — ${selected.school_forms.form_name}`:''}` :'🔍 Type to search student…'}
        </span>
        <span className="text-gray-400 text-xs">{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={q}
              onChange={e=>setQ(e.target.value)}
              placeholder="Type name or admission number…"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {q.trim().length===0&&(
              <div className="px-4 py-3 text-xs text-gray-400 text-center">Start typing to search from {students.length} students</div>
            )}
            {q.trim().length>0&&filtered.length===0&&(
              <div className="px-4 py-3 text-xs text-gray-400 text-center">No students found for "{q}"</div>
            )}
            {filtered.map(s=>(
              <div
                key={s.id}
                className={`px-4 py-2.5 cursor-pointer hover:bg-green-50 text-sm transition-colors ${value===s.id?'bg-green-50 font-bold text-green-700':''}`}
                onClick={()=>{onChange(s.id);setOpen(false);setQ('');}}
              >
                <span className="font-semibold">{s.last_name}, {s.first_name}</span>
                <span className="text-gray-400 ml-2 text-xs">({s.admission_number})</span>
                {s.school_forms?.form_name&&<span className="text-gray-400 ml-1 text-xs">— {s.school_forms.form_name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalsPage() {
  const [loading,setLoading]=useState(true),[portalUsers,setPortalUsers]=useState<any[]>([]),
    [notifications,setNotifications]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),
    [teachers,setTeachers]=useState<any[]>([]),
    [saving,setSaving]=useState(false),[search,setSearch]=useState(''),[page,setPage]=useState(1),
    [tab,setTab]=useState<'users'|'notifications'>('users'),[showModal,setShowModal]=useState(''),[editItem,setEditItem]=useState<any>(null);
  const [uForm,setUForm]=useState({user_type:'parent',linked_student_id:0,linked_teacher_id:0,username:'',full_name:'',email:'',phone:'',is_active:true,password:'',auto_password:true});
  const [showPw,setShowPw]=useState(false),[generatedPw,setGeneratedPw]=useState('');
  const [nForm,setNForm]=useState({portal_user_id:0,title:'',message:'',type:'info',student_id:0});
  const [studentSearch,setStudentSearch]=useState('');

  const fetchAll=useCallback(async()=>{
    setLoading(true);
    // Fetch all students using pagination (Supabase caps at 1000 per request)
    const fetchAllStudents = async () => {
      const allStudents: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('school_students')
          .select('id,first_name,last_name,admission_number,form_id,school_forms(form_name)')
          .eq('status','Active')
          .order('last_name')
          .range(from, from + pageSize - 1);
        if (error || !data || data.length === 0) break;
        allStudents.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allStudents;
    };
    const[u,n,s,t]=await Promise.all([
      fetch('/api/portal-users').then(r=>r.json()).then(j=>j.data||[]),
      supabase.from('school_portal_notifications').select('*').order('created_at',{ascending:false}).limit(50),
      fetchAllStudents(),
      supabase.from('school_teachers').select('id,first_name,last_name,tsc_number').order('last_name').limit(500)
    ]);
    setPortalUsers(u);setNotifications(n.data||[]);setStudents(s);setTeachers(t.data||[]);setLoading(false);
  },[]);
  useEffect(()=>{fetchAll()},[fetchAll]);

  const filtered=useMemo(()=>{if(!search)return portalUsers;const q=search.toLowerCase();return portalUsers.filter(u=>u.username?.toLowerCase().includes(q)||u.full_name?.toLowerCase().includes(q))},[portalUsers,search]);
  const tp=Math.max(1,Math.ceil(filtered.length/10)),paged=filtered.slice((page-1)*10,page*10);

  const generatePassword=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';let pw='';for(let i=0;i<10;i++)pw+=chars[Math.floor(Math.random()*chars.length)];return pw};
  const copyCreds=(u:string,p:string)=>{navigator.clipboard.writeText(`Portal Login\nUsername: ${u}\nPassword: ${p}`);toast.success('📋 Credentials copied to clipboard!',{icon:'✅'})};
  const saveUser=async()=>{if(!uForm.username.trim())return toast.error('🚫 Username is required!',{icon:'⚠️'});if(uForm.user_type==='teacher'&&!uForm.linked_teacher_id)return toast.error('🚫 Select a teacher to link!',{icon:'⚠️'});if(uForm.user_type!=='teacher'&&uForm.user_type!=='principal'&&uForm.user_type!=='bursar'&&!uForm.linked_student_id)return toast.error('🚫 Select a student to link!',{icon:'⚠️'});setSaving(true);try{const pw=uForm.auto_password?generatePassword():uForm.password.trim();if(!pw&&!editItem?.id){setSaving(false);return toast.error('🔑 Password is required!',{icon:'⚠️'})}const payload:any={user_type:uForm.user_type,linked_student_id:uForm.user_type==='parent'||uForm.user_type==='student'?uForm.linked_student_id:null,linked_teacher_id:uForm.user_type==='teacher'?uForm.linked_teacher_id:null,username:uForm.username.trim(),full_name:uForm.full_name.trim()||null,email:uForm.email.trim()||null,phone:uForm.phone.trim()||null,is_active:uForm.is_active,password:pw||undefined};let res;if(editItem?.id){payload.id=editItem.id;res=await fetch('/api/portal-users',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}else{res=await fetch('/api/portal-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}const result=await res.json();if(!res.ok)throw new Error(result.error||'Save failed');if(!editItem?.id){setGeneratedPw(pw);toast.success('🎉 Portal user created!',{duration:5000,icon:'✅'});toast.success(`🔑 Login: ${uForm.username} / ${pw}`,{duration:15000,icon:'📋'})}else toast.success('✨ Portal user updated!',{icon:'✅'});setShowModal('');fetchAll()}catch(e:any){toast.error(`💥 ${e.message}`,{icon:'❌'})}setSaving(false)};

  const saveNotification=async()=>{if(!nForm.title.trim())return toast.error('🚫 Title is required!',{icon:'⚠️'});setSaving(true);const{error}=await supabase.from('school_portal_notifications').insert([{portal_user_id:nForm.portal_user_id||null,title:nForm.title.trim(),message:nForm.message.trim()||null,type:nForm.type,student_id:nForm.student_id||null}]);if(error)toast.error(`💥 ${error.message}`,{icon:'❌'});else{toast.success('🔔 Notification sent successfully!',{icon:'✅'});setShowModal('');fetchAll()}setSaving(false)};

  const toggleUser=async(u:any)=>{const res=await fetch('/api/portal-users/toggle',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:u.id,is_active:!u.is_active})});if(res.ok){toast.success(u.is_active?'🔒 User deactivated':'✅ User activated',{icon:u.is_active?'🔇':'🔔'});fetchAll()}};
  const delUser=async(id:number)=>{if(!confirm('⚠️ Delete this portal user permanently?'))return;const res=await fetch(`/api/portal-users?id=${id}`,{method:'DELETE'});if(res.ok){toast.success('🗑️ Portal user deleted!',{icon:'✅'});fetchAll()}};

  if(loading)return(<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:G.green}}>👨‍👩‍👧</div><p className="text-sm font-bold text-gray-500">Loading Portals…</p></div>);

  return(<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-extrabold text-gray-900" style={{fontFamily:'Outfit,sans-serif',letterSpacing:'-0.03em'}}>👨‍👩‍👧 Portal User Management</h1><p className="text-sm text-gray-500 mt-1">{portalUsers.length} users · {portalUsers.filter(u=>u.is_active).length} active · {notifications.filter(n=>!n.is_read).length} unread</p></div><div className="flex items-center gap-2 flex-wrap"><button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-green-600 transition"><FiRefreshCw size={15}/></button><button onClick={()=>{setUForm({user_type:'parent',linked_student_id:0,linked_teacher_id:0,username:'',full_name:'',email:'',phone:'',is_active:true,password:'',auto_password:true});setEditItem(null);setShowModal('user')}} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{background:G.green}}>👤 Add User</button><button onClick={()=>{setNForm({portal_user_id:0,title:'',message:'',type:'info',student_id:0});setShowModal('notify')}} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{background:'#eff6ff',color:'#1d4ed8',border:'none',cursor:'pointer'}}>🔔 Send Notification</button></div></div>

    <div className="grid grid-cols-2 lg:grid-cols-8 gap-3">{[{l:'Portal Users',v:portalUsers.length,e:'👤',c:'#059669'},{l:'Principal',v:portalUsers.filter(u=>u.user_type==='principal').length,e:'👑',c:'#dc2626'},{l:'Bursars',v:portalUsers.filter(u=>u.user_type==='bursar').length,e:'🏦',c:'#0891b2'},{l:'Parents',v:portalUsers.filter(u=>u.user_type==='parent').length,e:'👨‍👩‍👧',c:'#2563eb'},{l:'Students',v:portalUsers.filter(u=>u.user_type==='student').length,e:'👨‍🎓',c:'#7c3aed'},{l:'Teachers',v:portalUsers.filter(u=>u.user_type==='teacher').length,e:'👨‍🏫',c:'#d97706'},{l:'Active',v:portalUsers.filter(u=>u.is_active).length,e:'✅',c:'#059669'},{l:'Unread Alerts',v:notifications.filter(n=>!n.is_read).length,e:'🔔',c:'#f59e0b'}].map((cd,i)=>(<div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{borderLeftWidth:4,borderLeftColor:cd.c}}><div className="flex items-center justify-between mb-2"><p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{cd.l}</p><span className="text-xl">{cd.e}</span></div><p className="text-xl font-extrabold text-gray-900">{cd.v}</p><div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{background:cd.c}}/></div>))}</div>

    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">{[{k:'users',l:'👤 Users'},{k:'notifications',l:'🔔 Notifications'}].map(t=>(<button key={t.k} onClick={()=>setTab(t.k as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab===t.k?'bg-white shadow text-green-700':'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>))}</div>

    {tab==='users'&&<><div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-[220px]"><FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search users…" className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-300"/>{search&&<button onClick={()=>{setSearch('');setPage(1)}} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14}/></button>}</div></div></div>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['#','User','Type','Linked To','Phone','Email','Status','Last Login','⚙️'].map((h,i)=><th key={i} className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
    <tbody>{paged.map((u,idx)=>(<tr key={u.id} style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>(e.currentTarget as HTMLTableRowElement).style.background='#fafbff'} onMouseLeave={e=>(e.currentTarget as HTMLTableRowElement).style.background=''}><td className="px-3 py-3 text-center font-bold text-gray-400">{(page-1)*10+idx+1}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{background:u.user_type==='principal'?G.red:u.user_type==='bursar'?'linear-gradient(135deg,#0891b2,#0e7490)':u.user_type==='parent'?G.blue:u.user_type==='teacher'?G.amber:G.purple}}>{u.user_type==='principal'?'👑':u.user_type==='bursar'?'🏦':u.user_type==='parent'?'P':u.user_type==='teacher'?'T':'S'}</div><div><p className="font-bold text-gray-900">{u.full_name||u.username}</p><p className="text-[10px] text-gray-400">@{u.username}</p></div></div></td><td className="px-3 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.user_type==='principal'?'bg-red-50 text-red-700':u.user_type==='bursar'?'bg-cyan-50 text-cyan-700':u.user_type==='parent'?'bg-blue-50 text-blue-700':u.user_type==='teacher'?'bg-amber-50 text-amber-700':'bg-purple-50 text-purple-700'}`}>{u.user_type==='principal'?'👑 Principal':u.user_type==='bursar'?'🏦 Bursar':u.user_type==='parent'?'👨‍👩‍👧 Parent':u.user_type==='teacher'?'👨‍🏫 Teacher':'👨‍🎓 Student'}</span></td><td className="px-3 py-3 text-gray-700">{u.user_type==='principal'?<span className="text-[10px] font-bold text-red-600">🏫 School Admin</span>:u.user_type==='teacher'?(u.school_teachers?`${u.school_teachers.last_name}, ${u.school_teachers.first_name}`:'-'):(u.school_students?`${u.school_students.last_name}, ${u.school_students.first_name}`:'-')}</td><td className="px-3 py-3 text-gray-600">{u.phone||'-'}</td><td className="px-3 py-3 text-gray-600">{u.email||'-'}</td><td className="px-3 py-3"><button onClick={()=>toggleUser(u)} className="flex items-center gap-1">{u.is_active?<><FiCheck size={12} className="text-green-500"/><span className="text-[10px] font-bold text-green-600">Active</span></>:<><FiX size={12} className="text-red-400"/><span className="text-[10px] font-bold text-red-400">Off</span></>}</button></td><td className="px-3 py-3 text-[10px] text-gray-400">{u.last_login?new Date(u.last_login).toLocaleDateString():'Never'}</td><td className="px-3 py-3"><div className="flex items-center gap-1"><button onClick={()=>{setEditItem(u);setUForm({user_type:u.user_type,linked_student_id:u.linked_student_id||0,linked_teacher_id:u.linked_teacher_id||0,username:u.username,full_name:u.full_name||'',email:u.email||'',phone:u.phone||'',is_active:u.is_active,password:'',auto_password:true});setShowModal('user')}} className="p-2 rounded-xl transition hover:scale-110" style={{background:'#ddd6fe',color:'#6d28d9'}}><FiEdit2 size={12}/></button><button onClick={()=>delUser(u.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500"><FiTrash2 size={11}/></button></div></td></tr>))}</tbody></table></div>
    {filtered.length>10&&<div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between"><p className="text-xs text-gray-400">Page {page} of {tp}</p><div className="flex items-center gap-1.5"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14}/></button><button onClick={()=>setPage(p=>Math.min(tp,p+1))} disabled={page===tp} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14}/></button></div></div>}</div></>}

    {tab==='notifications'&&<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse" style={{fontSize:12}}><thead><tr>{['Date','Title','Type','Message','Read','User'].map((h,i)=><th key={i} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{background:'#f8fafc',color:'#475569',borderBottom:'2px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
    <tbody>{notifications.slice(0,30).map(n=>(<tr key={n.id} style={{borderBottom:'1px solid #f1f5f9'}}><td className="px-4 py-3 text-xs font-bold text-gray-600">{new Date(n.created_at).toLocaleDateString()}</td><td className="px-4 py-3 font-bold text-gray-900">{n.title}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${n.type==='fee'?'bg-amber-50 text-amber-700':n.type==='result'?'bg-green-50 text-green-700':n.type==='health'?'bg-red-50 text-red-700':'bg-blue-50 text-blue-700'}`}>{n.type}</span></td><td className="px-4 py-3 text-gray-600" style={{maxWidth:300}}><p className="line-clamp-2">{n.message||'-'}</p></td><td className="px-4 py-3">{n.is_read?<FiCheck size={12} className="text-green-500"/>:<span className="text-[10px] font-bold text-amber-600">Unread</span>}</td><td className="px-4 py-3 text-xs text-gray-500">{n.portal_user_id||'Broadcast'}</td></tr>))}</tbody></table></div></div>}

    {/* ═══════════════ USER MODAL ═══════════════ */}
    {showModal==='user'&&(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal('')}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col animate-[fadeIn_0.2s_ease-out]" style={{maxHeight:'92vh'}} onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div className="relative px-7 py-6 overflow-hidden" style={{background:G.green}}>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"/>
            <div className="absolute -left-4 -bottom-8 w-24 h-24 rounded-full bg-white/5"/>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-lg backdrop-blur-sm">{editItem?'✏️':'👤'}</div>
                <div><h2 className="text-xl font-extrabold text-white">{editItem?'Edit':'Add New'} Portal User</h2><p className="text-xs text-white/70 mt-0.5">{editItem?'Update portal access credentials':'Create login for parent, student or teacher'}</p></div>
              </div>
              <button onClick={()=>setShowModal('')} className="p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all backdrop-blur-sm"><FiX size={18}/></button>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 space-y-5 overflow-y-auto flex-1">
            {/* User Type & Student */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiUsers size={11}/> User Type</label>
                <select value={uForm.user_type} onChange={e=>setUForm({...uForm,user_type:e.target.value})} className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all cursor-pointer">
                  <option value="principal">👑 Principal</option>
                  <option value="bursar">🏦 Bursar</option>
                  <option value="parent">👨‍👩‍👧 Parent</option>
                  <option value="student">👨‍🎓 Student</option>
                  <option value="teacher">👨‍🏫 Teacher</option>
                </select>
              </div>
              <div>
                {uForm.user_type==='principal'||uForm.user_type==='bursar'?(
                  <>
                    <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiShield size={11}/> Access Level</label>
                    <div className={`w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${uForm.user_type==='bursar'?'bg-cyan-50/80 border border-cyan-200 text-cyan-700':'bg-red-50/80 border border-red-200 text-red-700'}`}>
                      <span>{uForm.user_type==='bursar'?'🏦':'👑'}</span> {uForm.user_type==='bursar'?'Bursar — Finance & Stores Access':'Principal — Full School Access'}
                    </div>
                    {uForm.user_type==='principal'&&<p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1">⚠️ Only ONE principal account should exist per school</p>}
                    {uForm.user_type==='bursar'&&<p className="text-[10px] text-cyan-600 mt-1.5 flex items-center gap-1">🏦 Bursar accesses Finance, Fees, Expenses, Income & Stores</p>}
                  </>
                ):uForm.user_type==='teacher'?(
                  <>
                    <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiUser size={11}/> Linked Teacher *</label>
                    <select value={uForm.linked_teacher_id} onChange={e=>setUForm({...uForm,linked_teacher_id:Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all cursor-pointer">
                      <option value={0}>🔍 Select Teacher…</option>
                      {teachers.map(t=><option key={t.id} value={t.id}>{t.last_name}, {t.first_name} ({t.tsc_number})</option>)}
                    </select>
                  </>
                ):(
                  <>
                    <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiUser size={11}/> Linked Student *</label>
                    <StudentPicker
                      students={students}
                      value={uForm.linked_student_id}
                      onChange={(id)=>setUForm({...uForm,linked_student_id:id})}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiLogIn size={11}/> Username *</label>
              <input value={uForm.username} onChange={e=>setUForm({...uForm,username:e.target.value})} placeholder="e.g. parent.john2024" className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"/>
            </div>

            {/* Password Section */}
            <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/50 rounded-2xl p-4 border border-amber-200/60">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5"><FiShield size={12}/> 🔑 Login Password</label>
                <button type="button" onClick={()=>setUForm({...uForm,auto_password:!uForm.auto_password})} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${uForm.auto_password?'bg-green-100 text-green-700 border border-green-300':'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  {uForm.auto_password?'⚡ Auto-Generate':'✏️ Manual'}
                </button>
              </div>
              {uForm.auto_password?(
                <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-amber-200/80">
                  <FiZap className="text-amber-500 shrink-0" size={16}/>
                  <p className="text-xs text-gray-600 flex-1">A secure <span className="font-bold text-amber-700">10-character</span> password will be auto-generated and shown after creation</p>
                </div>
              ):(
                <div className="relative">
                  <input type={showPw?'text':'password'} value={uForm.password} onChange={e=>setUForm({...uForm,password:e.target.value})} placeholder="Enter password manually…" className="w-full px-4 py-3 pr-11 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"/>
                  <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-600 transition">{showPw?<FiEyeOff size={16}/>:<FiEye size={16}/>}</button>
                </div>
              )}
              {editItem&&<p className="text-[10px] text-amber-600/70 mt-2 flex items-center gap-1"><FiLock size={10}/> Leave blank to keep current password unchanged</p>}
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">📝 Full Name</label>
                <input value={uForm.full_name} onChange={e=>setUForm({...uForm,full_name:e.target.value})} placeholder="John Doe" className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"/>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiPhone size={11}/> Phone</label>
                <input value={uForm.phone} onChange={e=>setUForm({...uForm,phone:e.target.value})} placeholder="0712 345 678" className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"/>
              </div>
            </div>

            {/* Email & Active Toggle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiBell size={11}/> Email</label>
                <input value={uForm.email} onChange={e=>setUForm({...uForm,email:e.target.value})} placeholder="user@email.com" className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"/>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">🟢 Account Status</label>
                <button type="button" onClick={()=>setUForm({...uForm,is_active:!uForm.is_active})} className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${uForm.is_active?'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100':'bg-red-50 text-red-600 border-2 border-red-300 hover:bg-red-100'}`}>
                  {uForm.is_active?<><FiCheck size={14}/> Active</>:<><FiX size={14}/> Inactive</>}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <button onClick={()=>setShowModal('')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">Cancel</button>
            <button onClick={saveUser} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-all flex items-center gap-2" style={{background:G.green}}>
              {saving?<div className="spinner" style={{width:16,height:16}}/>:<FiSave size={14}/>}
              {editItem?'💾 Update User':'🚀 Create User'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ═══════════════ NOTIFICATION MODAL ═══════════════ */}
    {showModal==='notify'&&(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowModal('')}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]" onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div className="relative px-7 py-6 overflow-hidden" style={{background:G.blue}}>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10"/>
            <div className="absolute -left-4 -bottom-8 w-24 h-24 rounded-full bg-white/5"/>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-lg backdrop-blur-sm">🔔</div>
                <div><h2 className="text-xl font-extrabold text-white">Send Notification</h2><p className="text-xs text-white/70 mt-0.5">Alert parents or students instantly</p></div>
              </div>
              <button onClick={()=>setShowModal('')} className="p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all backdrop-blur-sm"><FiX size={18}/></button>
            </div>
          </div>

          {/* Body */}
          <div className="p-7 space-y-5">
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiUsers size={11}/> 🎯 Target User</label>
              <select value={nForm.portal_user_id} onChange={e=>setNForm({...nForm,portal_user_id:Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer">
                <option value={0}>📢 All Users (Broadcast)</option>
                {portalUsers.filter(u=>u.is_active).map(u=><option key={u.id} value={u.id}>{u.full_name||u.username} ({u.user_type})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiBell size={11}/> 📌 Title *</label>
              <input value={nForm.title} onChange={e=>setNForm({...nForm,title:e.target.value})} placeholder="e.g. Fee Reminder, Exam Results…" className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"/>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">🏷️ Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['info','fee','result','attendance','health','general'].map(t=>(
                  <button key={t} type="button" onClick={()=>setNForm({...nForm,type:t})} className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${nForm.type===t?'bg-blue-50 text-blue-700 border-blue-300 shadow-sm':'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                    {typeEmoji[t]||'📢'} {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider flex items-center gap-1"><FiSend size={11}/> 💬 Message</label>
              <textarea value={nForm.message} onChange={e=>setNForm({...nForm,message:e.target.value})} rows={3} placeholder="Write your notification message…" className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"/>
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <button onClick={()=>setShowModal('')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">Cancel</button>
            <button onClick={saveNotification} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-all flex items-center gap-2" style={{background:G.blue}}>
              {saving?<div className="spinner" style={{width:16,height:16}}/>:<FiSend size={14}/>}
              🚀 Send Notification
            </button>
          </div>
        </div>
      </div>
    )}
  </div>);
}
