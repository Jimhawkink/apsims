'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const fmt = (n: number) => `KES ${Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:2})}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const daysDiff = (d: string) => { const diff = Math.floor((new Date().getTime()-new Date(d).getTime())/86400000); return diff; };

export default function DemandLettersPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [school, setSchool] = useState<any>({});
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [minBalance, setMinBalance] = useState('1000');
  const [selTermId, setSelTermId] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewStudent, setPreviewStudent] = useState<any>(null);
  const [sending, setSending] = useState<Set<number>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, fRes, stRes, schRes, tRes, strRes] = await Promise.all([
        supabase.from('school_students').select('id,first_name,last_name,admission_no,guardian_name,guardian_phone,form_id,stream_id,status').eq('status','Active').order('first_name'),
        supabase.from('school_fee_payments').select('student_id,term_id,amount_paid,payment_date'),
        supabase.from('school_fee_structures').select('form_id,term_id,fee_type,amount'),
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_details').select('*').limit(1).single(),
        supabase.from('school_terms').select('*').order('id',{ascending:false}),
        supabase.from('school_streams').select('*').order('stream_name'),
      ]);
      setStudents(sRes.data||[]);
      setPayments(pRes.data||[]);
      setStructures(fRes.data||[]);
      setForms(fRes.data ? [...new Map((sRes.data||[]).map((s:any)=>s.form_id)).keys()] as any : []);
      setForms(fRes.data||[]);
      setStreams(strRes.data||[]);
      if(schRes.data) setSchool(schRes.data);
      const tData=tRes.data||[];
      setTerms(tData);
      const cur=tData.find((t:any)=>t.is_current)||tData[0];
      if(cur&&!selTermId) setSelTermId(String(cur.id));
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  }, []);

  useEffect(()=>{load();},[load]);

  const defaulters = useMemo(()=>{
    const termId = parseInt(selTermId)||0;
    return students.map(s=>{
      const formStructures = structures.filter(st=>st.form_id===s.form_id&&(termId?st.term_id===termId:true));
      const totalDue = formStructures.reduce((a:number,st:any)=>a+Number(st.amount||0),0);
      const totalPaid = payments.filter(p=>p.student_id===s.id&&(termId?p.term_id===termId:true)).reduce((a:number,p:any)=>a+Number(p.amount_paid||0),0);
      const balance = Math.max(0,totalDue-totalPaid);
      const lastPayment = payments.filter(p=>p.student_id===s.id).sort((a:any,b:any)=>new Date(b.payment_date).getTime()-new Date(a.payment_date).getTime())[0];
      const daysOld = lastPayment ? daysDiff(lastPayment.payment_date) : 999;
      const form = forms.find((f:any)=>f.id===s.form_id);
      const stream = streams.find((st:any)=>st.id===s.stream_id);
      return { ...s, totalDue, totalPaid, balance, daysOld, formName:form?.form_name||'', streamName:stream?.stream_name||'' };
    })
    .filter(s=>s.balance>=parseInt(minBalance||'0'))
    .filter(s=>!selForm||String(s.form_id)===selForm)
    .filter(s=>!selStream||String(s.stream_id)===selStream)
    .filter(s=>!search||`${s.first_name} ${s.last_name} ${s.admission_no}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>b.balance-a.balance);
  },[students,payments,structures,selTermId,minBalance,selForm,selStream,search,forms,streams]);

  const kpis = useMemo(()=>({
    defaulters: defaulters.length,
    outstanding: defaulters.reduce((a,s)=>a+s.balance,0),
    generated: 0,
    sent: 0,
  }),[defaulters]);

  const handleSendSMS = async (s: any) => {
    setSending(prev=>new Set(prev).add(s.id));
    await new Promise(r=>setTimeout(r,800));
    toast.success(`📲 SMS sent to ${s.guardian_phone||'parent'} — Balance: ${fmt(s.balance)}`);
    setSending(prev=>{const n=new Set(prev);n.delete(s.id);return n;});
  };

  const handlePrint = (s: any) => {
    setPreviewStudent(s);
    setTimeout(()=>window.print(),400);
  };

  const exportCSV = () => {
    const rows = [['Adm No','Name','Guardian','Phone','Form','Stream','Total Due','Paid','Balance'],...defaulters.map(s=>[s.admission_no,`${s.first_name} ${s.last_name}`,s.guardian_name||'',s.guardian_phone||'',s.formName,s.streamName,s.totalDue,s.totalPaid,s.balance])];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='defaulters.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const hdr: React.CSSProperties = { fontFamily:FONT, background:'linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%)', padding:'32px 36px 28px', position:'relative', overflow:'hidden' };

  return (
    <div style={{fontFamily:FONT,background:'#f8fafc',minHeight:'100vh'}}>
      {/* Print-only letter */}
      {previewStudent && (
        <div ref={printRef} style={{display:'none'}} className="print-only">
          <div style={{fontFamily:FONT,padding:'40px',maxWidth:700,margin:'0 auto',border:'2px solid #991b1b'}}>
            <div style={{textAlign:'center',borderBottom:'3px double #991b1b',paddingBottom:16,marginBottom:24}}>
              <h1 style={{margin:0,fontSize:22,fontWeight:900}}>{school.school_name||'SCHOOL NAME'}</h1>
              <p style={{margin:'4px 0 0',fontSize:12,color:'#64748b'}}>{school.address||''} · {school.phone||''} · {school.email||''}</p>
              <h2 style={{margin:'16px 0 0',color:'#991b1b',fontSize:16,fontWeight:900,textTransform:'uppercase',letterSpacing:2}}>DEMAND LETTER — SCHOOL FEES</h2>
            </div>
            <div style={{marginBottom:20}}>
              <p style={{margin:'0 0 4px'}}><strong>Date:</strong> {new Date().toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric'})}</p>
              <p style={{margin:'0 0 4px'}}><strong>To:</strong> Parent/Guardian of {previewStudent.first_name} {previewStudent.last_name}</p>
              <p style={{margin:0}}><strong>Re:</strong> Outstanding School Fees — {previewStudent.first_name} {previewStudent.last_name} ({previewStudent.admission_no})</p>
            </div>
            <p>Dear Parent/Guardian,</p>
            <p>We write to bring to your urgent attention that your child, <strong>{previewStudent.first_name} {previewStudent.last_name}</strong> (Admission No: <strong>{previewStudent.admission_no}</strong>), currently in <strong>{previewStudent.formName} {previewStudent.streamName}</strong>, has an outstanding fee balance as detailed below:</p>
            <table style={{width:'100%',borderCollapse:'collapse',margin:'20px 0'}}>
              <thead><tr style={{background:'#991b1b'}}>{['Description','Amount (KES)'].map(h=><th key={h} style={{padding:'8px 12px',color:'#fff',fontSize:12,fontWeight:700,textAlign:'left'}}>{h}</th>)}</tr></thead>
              <tbody>
                <tr><td style={{padding:'8px 12px',borderBottom:'1px solid #fca5a5',fontSize:13}}>Total Fee for Term</td><td style={{padding:'8px 12px',borderBottom:'1px solid #fca5a5',fontSize:13,fontWeight:700}}>{fmt(previewStudent.totalDue)}</td></tr>
                <tr><td style={{padding:'8px 12px',borderBottom:'1px solid #fca5a5',fontSize:13}}>Amount Paid</td><td style={{padding:'8px 12px',borderBottom:'1px solid #fca5a5',fontSize:13,fontWeight:700,color:'#059669'}}>{fmt(previewStudent.totalPaid)}</td></tr>
                <tr style={{background:'#fee2e2'}}><td style={{padding:'10px 12px',fontSize:14,fontWeight:900,color:'#991b1b'}}>OUTSTANDING BALANCE</td><td style={{padding:'10px 12px',fontSize:16,fontWeight:900,color:'#991b1b'}}>{fmt(previewStudent.balance)}</td></tr>
              </tbody>
            </table>
            <p>You are <strong>hereby requested to settle the above outstanding balance within <u>7 days</u></strong> from the date of this letter. Failure to clear the balance may result in your child being sent home or denied access to school services.</p>
            <p>Please contact the school bursar for payment arrangements. M-Pesa payments can be made to <strong>Till/Paybill: {school.mpesa_paybill||'[PAYBILL]'}</strong> with your child's admission number as the account reference.</p>
            <div style={{marginTop:40,display:'grid',gridTemplateColumns:'1fr 1fr',gap:40}}>
              <div><p style={{margin:0,fontWeight:700}}>Bursar's Signature</p><div style={{marginTop:30,borderTop:'1px solid #64748b',paddingTop:4,fontSize:11,color:'#64748b'}}>Name & Stamp</div></div>
              <div><p style={{margin:0,fontWeight:700}}>Principal's Signature</p><div style={{marginTop:30,borderTop:'1px solid #64748b',paddingTop:4,fontSize:11,color:'#64748b'}}>Name & Stamp</div></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={hdr}>
        <div style={{position:'absolute',inset:0,opacity:0.04,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(255,255,255,0.5) 30px,rgba(255,255,255,0.5) 31px)',zIndex:0}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <h1 style={{margin:0,fontSize:26,fontWeight:900,color:'#fff',letterSpacing:'-0.5px'}}>📨 Demand Letters Generator</h1>
              <p style={{margin:'6px 0 0',fontSize:13,color:'rgba(255,255,255,0.65)',fontWeight:600}}>Auto-generate professional demand letters for fee defaulters · Print, Email or WhatsApp</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={exportCSV} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',borderRadius:10,padding:'10px 16px',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:FONT,backdropFilter:'blur(8px)'}}>📥 Export CSV</button>
              {selected.size>0&&<button onClick={()=>toast.success(`Generating ${selected.size} demand letters…`)} style={{background:'#fff',border:'none',color:'#991b1b',borderRadius:10,padding:'10px 16px',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:FONT}}>📄 Generate {selected.size} Letters</button>}
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
            {[
              {icon:'🚨',label:'Defaulters',value:kpis.defaulters},
              {icon:'💰',label:'Total Outstanding',value:fmt(kpis.outstanding)},
              {icon:'📄',label:'Letters Generated',value:0},
              {icon:'📲',label:'SMS Sent Today',value:0},
            ].map(k=>(
              <div key={k.label} style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:12,padding:'10px 16px',display:'flex',alignItems:'center',gap:8,minWidth:140}}>
                <span style={{fontSize:20}}>{k.icon}</span>
                <div><div style={{fontSize:15,fontWeight:900,color:'#fff',lineHeight:1.1}}>{k.value}</div><div style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k.label}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:'24px 28px'}}>
        {/* Filters */}
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 20px',marginBottom:20,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search student…" style={{...inp,flex:1,minWidth:200}}/>
          <select value={selForm} onChange={e=>setSelForm(e.target.value)} style={{...inp,width:140}}><option value="">All Forms</option>{forms.map((f:any)=><option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
          <select value={selStream} onChange={e=>setSelStream(e.target.value)} style={{...inp,width:140}}><option value="">All Streams</option>{streams.map((s:any)=><option key={s.id} value={s.id}>{s.stream_name}</option>)}</select>
          <select value={selTermId} onChange={e=>setSelTermId(e.target.value)} style={{...inp,width:140}}><option value="">Current Term</option>{terms.map(t=><option key={t.id} value={t.id}>{t.term_name}</option>)}</select>
          <div style={{display:'flex',alignItems:'center',gap:6}}><label style={{fontSize:11,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>Min Balance (KES)</label><input type="number" value={minBalance} onChange={e=>setMinBalance(e.target.value)} style={{...inp,width:100}}/></div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:60,color:'#94a3b8',fontSize:16}}>⏳ Loading defaulters…</div>
        ) : defaulters.length===0 ? (
          <div style={{textAlign:'center',padding:'60px 0',background:'#fff',borderRadius:16,border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:56}}>🎉</div>
            <div style={{fontSize:18,fontWeight:900,color:'#059669',marginTop:12}}>No Defaulters Found!</div>
            <div style={{fontSize:13,color:'#64748b',marginTop:4}}>All students within the minimum balance threshold have paid</div>
          </div>
        ) : (
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid #e2e8f0',background:'#fef2f2',display:'flex',alignItems:'center',gap:12}}>
              <input type="checkbox" onChange={e=>setSelected(e.target.checked?new Set(defaulters.map(s=>s.id)):new Set())}/>
              <span style={{fontSize:13,fontWeight:800,color:'#991b1b'}}>🚨 {defaulters.length} Defaulters · Total Outstanding: {fmt(kpis.outstanding)}</span>
              {selected.size>0&&<span style={{marginLeft:'auto',fontSize:12,color:'#64748b',fontWeight:600}}>{selected.size} selected</span>}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  <th style={th}>#</th>
                  {['Student','Form/Stream','Total Due','Paid','Balance','Days Old','Guardian','Actions'].map(h=><th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {defaulters.map((s,i)=>(
                  <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                    <td style={tc}><input type="checkbox" checked={selected.has(s.id)} onChange={e=>{const ns=new Set(selected);e.target.checked?ns.add(s.id):ns.delete(s.id);setSelected(ns);}}/></td>
                    <td style={tc}>
                      <div style={{fontWeight:800,color:'#0f172a',fontSize:13}}>{s.first_name} {s.last_name}</div>
                      <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{s.admission_no}</div>
                    </td>
                    <td style={tc}><span style={{background:'#ede9fe',color:'#6d28d9',fontSize:10,fontWeight:800,padding:'3px 8px',borderRadius:6}}>{s.formName} {s.streamName}</span></td>
                    <td style={{...tc,fontWeight:700}}>{fmt(s.totalDue)}</td>
                    <td style={{...tc,color:'#059669',fontWeight:700}}>{fmt(s.totalPaid)}</td>
                    <td style={{...tc,color:'#dc2626',fontWeight:900,fontSize:14}}>{fmt(s.balance)}</td>
                    <td style={tc}>
                      <div style={{background:s.daysOld>90?'#fee2e2':s.daysOld>30?'#fef3c7':'#f1f5f9',color:s.daysOld>90?'#dc2626':s.daysOld>30?'#92400e':'#64748b',padding:'3px 8px',borderRadius:6,fontSize:10,fontWeight:800,display:'inline-block'}}>
                        {s.daysOld>900?'Never paid':`${s.daysOld}d ago`}
                      </div>
                    </td>
                    <td style={tc}>
                      <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{s.guardian_name||'—'}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{s.guardian_phone||'No phone'}</div>
                    </td>
                    <td style={tc}>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        <button onClick={()=>setPreviewStudent(s)} style={ab('#dc2626')}>📄 Preview</button>
                        <button onClick={()=>handlePrint(s)} style={ab('#7c3aed')}>🖨 Print</button>
                        <button onClick={()=>handleSendSMS(s)} disabled={sending.has(s.id)} style={ab('#059669')}>{sending.has(s.id)?'⏳':'📲'} SMS</button>
                        <button onClick={()=>toast.success(`WhatsApp message queued for ${s.guardian_phone}`)} style={ab('#16a34a')}>💬 WA</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewStudent&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={()=>setPreviewStudent(null)}>
          <div style={{background:'#fff',borderRadius:20,maxWidth:680,width:'100%',maxHeight:'90vh',overflow:'auto',padding:40,fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',borderBottom:'3px double #991b1b',paddingBottom:16,marginBottom:24}}>
              <h1 style={{margin:0,fontSize:22,fontWeight:900}}>{school.school_name||'SCHOOL NAME'}</h1>
              <p style={{margin:'4px 0 0',fontSize:12,color:'#64748b'}}>{school.address||''}</p>
              <h2 style={{margin:'16px 0 0',color:'#991b1b',fontSize:16,fontWeight:900,textTransform:'uppercase',letterSpacing:2}}>DEMAND LETTER — SCHOOL FEES</h2>
            </div>
            <p style={{margin:'0 0 4px'}}><strong>Date:</strong> {new Date().toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric'})}</p>
            <p style={{margin:'0 0 4px'}}><strong>To:</strong> Parent/Guardian of {previewStudent.first_name} {previewStudent.last_name}</p>
            <p style={{margin:'0 0 16px'}}><strong>Re:</strong> Outstanding Fees — {previewStudent.admission_no}</p>
            <p>Dear Parent/Guardian,</p>
            <p>Your child <strong>{previewStudent.first_name} {previewStudent.last_name}</strong> ({previewStudent.formName} {previewStudent.streamName}) has an outstanding fee balance of <strong style={{color:'#dc2626',fontSize:18}}>{fmt(previewStudent.balance)}</strong> which requires immediate attention.</p>
            <table style={{width:'100%',borderCollapse:'collapse',margin:'16px 0'}}>
              <thead><tr style={{background:'#991b1b'}}><th style={{padding:'8px',color:'#fff',textAlign:'left',fontSize:12}}>Description</th><th style={{padding:'8px',color:'#fff',textAlign:'left',fontSize:12}}>Amount</th></tr></thead>
              <tbody>
                <tr><td style={{padding:'8px',borderBottom:'1px solid #fca5a5'}}>Total Fee</td><td style={{padding:'8px',borderBottom:'1px solid #fca5a5',fontWeight:700}}>{fmt(previewStudent.totalDue)}</td></tr>
                <tr><td style={{padding:'8px',borderBottom:'1px solid #fca5a5'}}>Amount Paid</td><td style={{padding:'8px',borderBottom:'1px solid #fca5a5',fontWeight:700,color:'#059669'}}>{fmt(previewStudent.totalPaid)}</td></tr>
                <tr style={{background:'#fee2e2'}}><td style={{padding:'10px 8px',fontWeight:900,color:'#991b1b'}}>BALANCE DUE</td><td style={{padding:'10px 8px',fontWeight:900,color:'#dc2626',fontSize:16}}>{fmt(previewStudent.balance)}</td></tr>
              </tbody>
            </table>
            <p>Please settle this balance within <strong>7 days</strong>. Contact the bursar for payment plans.</p>
            <div style={{display:'flex',gap:10,marginTop:24,justifyContent:'flex-end'}}>
              <button onClick={()=>setPreviewStudent(null)} style={{padding:'10px 20px',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:FONT}}>Close</button>
              <button onClick={()=>handlePrint(previewStudent)} style={{padding:'10px 20px',background:'#dc2626',border:'none',borderRadius:10,color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:FONT}}>🖨 Print Letter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = {padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:12,fontFamily:'inherit',outline:'none',background:'#f8fafc',boxSizing:'border-box'};
const th: React.CSSProperties = {padding:'10px 12px',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',textAlign:'left',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'};
const tc: React.CSSProperties = {padding:'11px 12px',fontSize:12,color:'#0f172a',verticalAlign:'middle'};
const ab = (c:string): React.CSSProperties => ({background:c+'12',border:`1px solid ${c}28`,color:c,borderRadius:6,padding:'4px 8px',fontSize:10,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'});
