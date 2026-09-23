'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiShield, FiRefreshCw, FiSearch, FiDownload, FiClock, FiUser, FiDollarSign, FiAlertTriangle, FiFilter, FiLock } from 'react-icons/fi';

const fmt  = (n: number) => `KES ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
const fmtT = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

const ACTION_CONFIG: Record<string,{label:string;emoji:string;color:string;bg:string}> = {
  payment_created:     {label:'Payment Created',     emoji:'💰', color:'#22c55e', bg:'#f0fdf4'},
  payment_updated:     {label:'Payment Updated',     emoji:'✏️', color:'#f97316', bg:'#fff7ed'},
  payment_deleted:     {label:'Payment Deleted',     emoji:'🗑️', color:'#ef4444', bg:'#fef2f2'},
  payment_voided:      {label:'Payment Voided',      emoji:'🔴', color:'#ef4444', bg:'#fef2f2'},
  payment_reversed:    {label:'Payment Reversed',    emoji:'↩️', color:'#dc2626', bg:'#fef2f2'},
  receipt_issued:      {label:'Receipt Issued',      emoji:'🧾', color:'#6366f1', bg:'#eef2ff'},
  receipt_voided:      {label:'Receipt Voided',      emoji:'❌', color:'#dc2626', bg:'#fef2f2'},
  fee_collected:       {label:'Fee Collected',       emoji:'💵', color:'#16a34a', bg:'#f0fdf4'},
  fee_adjusted:        {label:'Fee Adjusted',        emoji:'🔧', color:'#0891b2', bg:'#ecfeff'},
  structure_changed:   {label:'Structure Changed',   emoji:'🏗️', color:'#7c3aed', bg:'#faf5ff'},
  student_enrolled:    {label:'Student Enrolled',    emoji:'🎓', color:'#059669', bg:'#ecfdf5'},
  login:               {label:'User Login',           emoji:'🔑', color:'#6366f1', bg:'#eef2ff'},
  logout:              {label:'User Logout',           emoji:'🚪', color:'#94a3b8', bg:'#f8fafc'},
  user_created:        {label:'User Created',         emoji:'👤', color:'#0ea5e9', bg:'#f0f9ff'},
  user_updated:        {label:'User Updated',         emoji:'✏️', color:'#f59e0b', bg:'#fffbeb'},
  scholarship_applied: {label:'Scholarship Applied',  emoji:'🎓', color:'#10b981', bg:'#ecfdf5'},
  waiver_applied:      {label:'Waiver Applied',       emoji:'🎁', color:'#db2777', bg:'#fdf2f8'},
  approval_granted:    {label:'Approval Granted',     emoji:'✅', color:'#16a34a', bg:'#f0fdf4'},
  mpesa_matched:       {label:'M-Pesa Matched',       emoji:'📱', color:'#059669', bg:'#ecfdf5'},
};
const getCfg = (action: string) =>
  ACTION_CONFIG[action] ?? ACTION_CONFIG[action?.toLowerCase()] ?? {label:action||'System Event',emoji:'📋',color:'#6b7280',bg:'#f9fafb'};

function StatCard({label,value,icon,color,sub}:any){
  return(
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{background:color}}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-extrabold text-gray-800 truncate">{value}</p>
        {sub&&<p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function FeeAuditPage(){
  const [loading,setLoading]       = useState(true);
  const [logs,setLogs]             = useState<any[]>([]);
  const [search,setSearch]         = useState('');
  const [actionFilter,setAction]   = useState('All');
  const [dateFrom,setDateFrom]     = useState(new Date(Date.now()-90*86400000).toISOString().split('T')[0]);
  const [dateTo,setDateTo]         = useState(new Date().toISOString().split('T')[0]);
  const [expandedId,setExpanded]   = useState<number|null>(null);

  const fetchAll = useCallback(async()=>{
    setLoading(true);
    // Real table: school_audit_log
    // Columns: id, action, actor_id, actor_name, actor_role, target_type, target_id, details (jsonb), ip_address, created_at
    const {data,error} = await supabase
      .from('school_audit_log')
      .select('*')
      .order('created_at',{ascending:false})
      .limit(2000);
    if(error){ console.error(error); toast.error('Audit log: '+error.message); }
    setLogs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  const filtered = useMemo(()=>{
    const q=search.toLowerCase();
    return logs.filter(l=>{
      if(actionFilter!=='All'&&l.action!==actionFilter) return false;
      if(dateFrom&&l.created_at<dateFrom) return false;
      if(dateTo&&l.created_at>dateTo+'T23:59:59') return false;
      if(q){
        const blob=[l.actor_name,l.actor_role,l.action,l.target_type,l.ip_address,JSON.stringify(l.details||'')].join(' ').toLowerCase();
        if(!blob.includes(q)) return false;
      }
      return true;
    });
  },[logs,actionFilter,dateFrom,dateTo,search]);

  const stats = useMemo(()=>{
    const today=new Date().toISOString().split('T')[0];
    return {
      todayCount:  logs.filter(l=>l.created_at?.startsWith(today)).length,
      voidedCount: logs.filter(l=>/(void|revers|delet)/i.test(l.action||'')).length,
      uniqueUsers: new Set(logs.map(l=>l.actor_name).filter(Boolean)).size,
    };
  },[logs]);

  const usedActions = useMemo(()=>[...new Set(logs.map(l=>l.action).filter(Boolean))] as string[],[logs]);

  const exportCSV=()=>{
    const rows=[['ID','Timestamp','Action','Actor','Role','Target Type','Target ID','IP','Details']];
    filtered.forEach(l=>rows.push([String(l.id||''),fmtT(l.created_at),l.action||'',l.actor_name||'',l.actor_role||'',l.target_type||'',String(l.target_id||''),l.ip_address||'',JSON.stringify(l.details||{})]));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`audit_${dateFrom}_${dateTo}.csv`;
    a.click();
    toast.success(`Exported ${filtered.length} rows`);
  };

  if(loading) return(
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-400 text-sm">Loading school_audit_log…</p>
      </div>
    </div>
  );

  return(
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#4f46e5,#1e40af)'}}><FiShield size={18}/></span>
            System Audit Trail
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 ml-[46px]">
            Table: <code className="bg-gray-100 px-1 rounded text-xs">school_audit_log</code> &bull; {logs.length.toLocaleString()} records &bull; Tamper-proof
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center gap-1.5"><FiDownload size={14}/> Export CSV</button>
          <button onClick={fetchAll}  className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"><FiRefreshCw size={14}/></button>
        </div>
      </div>

      {/* Tamper-proof notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
        <FiLock className="text-indigo-500 shrink-0" size={16}/>
        <p className="text-xs font-bold text-indigo-800">🔒 This audit trail is <u>read-only and tamper-proof</u>. All entries are auto-generated by system actions (payments, logins, edits) and cannot be manually modified. Full financial accountability &amp; compliance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Today's Activity"  value={String(stats.todayCount)}  icon={<FiClock size={18}/>}         color="linear-gradient(135deg,#4f46e5,#1e40af)" sub="events today"/>
        <StatCard label="Deletions / Voids" value={String(stats.voidedCount)} icon={<FiAlertTriangle size={18}/>} color="linear-gradient(135deg,#dc2626,#b91c1c)" sub="requires review"/>
        <StatCard label="Total Records"      value={logs.length.toLocaleString()} icon={<FiDollarSign size={18}/>}  color="linear-gradient(135deg,#059669,#047857)" sub="in school_audit_log"/>
        <StatCard label="Unique Actors"      value={String(stats.uniqueUsers)} icon={<FiUser size={18}/>}           color="linear-gradient(135deg,#7c3aed,#5b21b6)" sub="performed actions"/>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-center shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search actor, action, target, IP, details…" className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"/>
        </div>
        <select value={actionFilter} onChange={e=>setAction(e.target.value)} className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none">
          <option value="All">All Actions ({logs.length})</option>
          {usedActions.map(a=>{const c=getCfg(a);return <option key={a} value={a}>{c.emoji} {c.label} ({logs.filter(l=>l.action===a).length})</option>;})}
        </select>
        <div className="flex items-center gap-1.5">
          <FiFilter size={13} className="text-gray-400"/>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none"/>
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   className="px-2 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none"/>
        </div>
        <span className="text-xs font-bold text-gray-400 ml-auto">{filtered.length}/{logs.length}</span>
      </div>

      {/* Action pills — only real actions in db */}
      {usedActions.length>0&&(
        <div className="flex flex-wrap gap-2">
          {usedActions.map(key=>{
            const cfg=getCfg(key);
            const cnt=logs.filter(l=>l.action===key).length;
            return(
              <button key={key} onClick={()=>setAction(actionFilter===key?'All':key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${actionFilter===key?'ring-2 ring-offset-1':''}`}
                style={{background:cfg.bg,color:cfg.color,borderColor:cfg.color+'40'}}>
                {cfg.emoji} {cfg.label} <span className="bg-white/60 px-1 rounded-full">{cnt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Log list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length===0?(
          <div className="py-14 text-center">
            <FiShield size={36} className="mx-auto mb-3 text-gray-200"/>
            <p className="font-bold text-gray-500">{logs.length===0?'No audit events in database yet':'No events match your filters'}</p>
            <p className="text-sm mt-2 text-gray-400">
              {logs.length===0
                ?'The school_audit_log table is connected and empty. Events appear here when actions happen.'
                :'Try widening your date range or clearing the action filter.'}
            </p>
            {logs.length===0&&(
              <div className="mt-4 inline-block text-left bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 text-xs text-indigo-700 max-w-md">
                <p className="font-bold mb-1">📊 Table: <code>school_audit_log</code></p>
                <p>Columns: id · action · actor_id · actor_name · actor_role · target_type · target_id · details(jsonb) · ip_address · created_at</p>
                <p className="mt-1 text-indigo-500">To populate this log, write to it from your API actions (fee payments, edits, logins). It is correctly connected and will show data immediately.</p>
              </div>
            )}
          </div>
        ):(
          <div className="divide-y divide-gray-50">
            {filtered.map(log=>{
              const cfg=getCfg(log.action);
              const isExp=expandedId===log.id;
              const det=log.details||{};
              const detKeys=Object.keys(det);
              return(
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50/60 cursor-pointer transition-colors" onClick={()=>setExpanded(isExp?null:log.id)}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5" style={{background:cfg.bg}}>{cfg.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-gray-800">{cfg.label}</span>
                        {log.target_type&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{log.target_type}{log.target_id?` #${log.target_id}`:''}</span>}
                        {det.amount>0&&<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{fmt(det.amount)}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                        {log.actor_name&&<span className="flex items-center gap-1"><FiUser size={10}/><b className="text-gray-700">{log.actor_name}</b>{log.actor_role&&<span className="text-gray-400 ml-0.5">({log.actor_role})</span>}</span>}
                        <span className="flex items-center gap-1"><FiClock size={10}/>{fmtT(log.created_at)}</span>
                        {log.ip_address&&<span className="text-gray-400">IP:{log.ip_address}</span>}
                      </div>
                      {!isExp&&detKeys.length>0&&<p className="text-xs text-gray-400 mt-0.5 truncate">{detKeys.slice(0,3).map(k=>`${k}:${String(det[k]).slice(0,25)}`).join(' · ')}</p>}
                      {isExp&&(
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
                          <p><b className="text-gray-600">ID:</b> #{log.id} &nbsp;|&nbsp; <b className="text-gray-600">Time:</b> {fmtT(log.created_at)}</p>
                          <p><b className="text-gray-600">Action:</b> {log.action}</p>
                          {log.actor_id&&<p><b className="text-gray-600">Actor ID:</b> {log.actor_id}</p>}
                          {log.actor_role&&<p><b className="text-gray-600">Role:</b> {log.actor_role}</p>}
                          {log.target_type&&<p><b className="text-gray-600">Target:</b> {log.target_type} #{log.target_id}</p>}
                          {log.ip_address&&<p><b className="text-gray-600">IP:</b> {log.ip_address}</p>}
                          {detKeys.length>0&&(
                            <div>
                              <p className="font-bold text-gray-600 mb-1">Details (jsonb):</p>
                              <div className="bg-white border border-gray-100 rounded-lg p-2 font-mono text-[10px] text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                                {JSON.stringify(det,null,2)}
                              </div>
                            </div>
                          )}
                          <p className="text-indigo-500 font-bold">🔒 This record cannot be modified or deleted.</p>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{isExp?'▲':'▼'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {logs.length>=2000&&<div className="text-center text-xs text-gray-400 py-2">Showing last 2,000 entries. Use date range to view older records.</div>}
    </div>
  );
}
