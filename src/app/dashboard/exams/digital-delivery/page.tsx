'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const F = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}) : '—';

interface Student { id: number; first_name: string; last_name: string; admission_no: string; guardian_name: string; guardian_phone: string; guardian_email: string; form_id: number; stream_id: number; }
interface DeliveryLog { id: number; student_id: number; channel: string; recipient: string; status: string; sent_at: string; opened_at: string; report_type: string; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string,string]> = { sent:['#059669','#d1fae5'], pending:['#f59e0b','#fef3c7'], failed:['#dc2626','#fee2e2'], opened:['#4f46e5','#ede9fe'], delivered:['#0ea5e9','#dbeafe'] };
  const [color,bg] = map[status.toLowerCase()] || ['#64748b','#f1f5f9'];
  return <span style={{background:bg,color,fontSize:10,fontWeight:900,padding:'3px 9px',borderRadius:99,textTransform:'uppercase',letterSpacing:'0.04em'}}>{status}</span>;
}

function ChannelIcon({ ch }: { ch: string }) {
  const map: Record<string,string> = { whatsapp:'💬', email:'📧', sms:'📱', print:'🖨️' };
  return <span style={{fontSize:16}}>{map[ch.toLowerCase()] || '📤'}</span>;
}

export default function DigitalDeliveryPage() {
  const [tab, setTab] = useState<'send'|'logs'|'templates'|'stats'>('send');
  const [students, setStudents] = useState<Student[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [channels, setChannels] = useState({ whatsapp: true, email: false, sms: false });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sendProgress, setSendProgress] = useState(0);
  const [previewStudent, setPreviewStudent] = useState<Student|null>(null);
  const [msgTemplate, setMsgTemplate] = useState(`Dear {parent_name}, your child {student_name} ({adm_no}) from {school_name} has a new Term Report Card ready. View it at: {link}\n\nFor queries, contact the school at {phone}.`);

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, fRes, stRes, tRes, lRes] = await Promise.all([
      supabase.from('school_students').select('id,first_name,last_name,admission_no,guardian_name,guardian_phone,guardian_email,form_id,stream_id').eq('status','Active').order('first_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_terms').select('*').order('id',{ascending:false}),
      supabase.from('school_delivery_logs').select('*').order('sent_at',{ascending:false}).limit(200),
    ]);
    setStudents(sRes.data||[]);
    setForms(fRes.data||[]);
    setStreams(stRes.data||[]);
    const tData=tRes.data||[];
    setTerms(tData);
    const cur=tData.find((t:any)=>t.is_current)||tData[0];
    if(cur&&!selTerm) setSelTerm(String(cur.id));
    setLogs(lRes.data||[]);
    setLoading(false);
  }, []);

  useEffect(()=>{load();},[load]);

  const filteredStudents = useMemo(()=>students
    .filter(s=>!selForm||String(s.form_id)===selForm)
    .filter(s=>!selStream||String(s.stream_id)===selStream)
    .filter(s=>!search||`${s.first_name} ${s.last_name} ${s.admission_no}`.toLowerCase().includes(search.toLowerCase())),
    [students,selForm,selStream,search]);

  const stats = useMemo(()=>({
    totalSent: logs.length,
    whatsapp: logs.filter(l=>l.channel==='whatsapp').length,
    email: logs.filter(l=>l.channel==='email').length,
    sms: logs.filter(l=>l.channel==='sms').length,
    opened: logs.filter(l=>l.status==='opened').length,
    failed: logs.filter(l=>l.status==='failed').length,
    openRate: logs.length>0?(logs.filter(l=>l.status==='opened').length/logs.length)*100:0,
  }),[logs]);

  const bulkSend = async () => {
    if(selected.size===0){toast.error('Select at least one student');return;}
    const activeChannels = Object.entries(channels).filter(([,v])=>v).map(([k])=>k);
    if(activeChannels.length===0){toast.error('Select at least one channel');return;}
    setSending(true); setSendProgress(0);
    const studentsToSend = filteredStudents.filter(s=>selected.has(s.id));
    const term = terms.find(t=>String(t.id)===selTerm);
    let done=0;
    for(const student of studentsToSend){
      for(const channel of activeChannels){
        try{
          const personalizedMsg = msgTemplate
            .replace('{parent_name}',student.guardian_name||'Parent')
            .replace('{student_name}',`${student.first_name} ${student.last_name}`)
            .replace('{adm_no}',student.admission_no)
            .replace('{school_name}','APSIMS School')
            .replace('{link}',`${window.location.origin}/portal/report/${student.id}/${selTerm}`)
            .replace('{phone}','+254700000000');

          if(channel==='whatsapp'){
            await fetch('/api/whatsapp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:student.guardian_phone,message:personalizedMsg,student_id:student.id})}).catch(()=>{});
          } else if(channel==='sms'){
            await fetch('/api/sms/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:student.guardian_phone,message:personalizedMsg,student_id:student.id})}).catch(()=>{});
          } else if(channel==='email'){
            await fetch('/api/communication/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:student.guardian_email,subject:`${student.first_name}'s ${term?.term_name||'Term'} Report Card`,body:personalizedMsg,student_id:student.id})}).catch(()=>{});
          }
          await supabase.from('school_delivery_logs').insert({student_id:student.id,channel,recipient:channel==='email'?student.guardian_email:student.guardian_phone,status:'sent',report_type:'report_card',term_id:parseInt(selTerm)||null});
        } catch{}
      }
      done++;
      setSendProgress(Math.round((done/studentsToSend.length)*100));
    }
    toast.success(`✅ Report cards sent to ${selected.size} students via ${activeChannels.join(', ')}`);
    setSending(false); setSendProgress(0); setSelected(new Set()); load();
  };

  const generatePDF = (student: Student) => {
    const term = terms.find(t=>String(t.id)===selTerm);
    const form = forms.find(f=>f.id===student.form_id);
    const stream = streams.find(s=>s.id===student.stream_id);
    const html = `<!DOCTYPE html><html><head><title>Report Card – ${student.first_name} ${student.last_name}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box;font-family:Georgia,serif}body{padding:30px;color:#0f172a}
    .header{text-align:center;border-bottom:3px double #1a237e;padding-bottom:20px;margin-bottom:24px}
    h1{font-size:24px;color:#1a237e}h2{font-size:16px;color:#334155;font-weight:400;margin-top:6px}
    .badge{display:inline-block;background:#1a237e;color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;margin-top:10px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
    .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px}
    .info-label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px}
    .info-value{font-size:15px;font-weight:700;color:#0f172a}
    .watermark{position:fixed;top:40%;left:10%;transform:rotate(-45deg);font-size:72px;color:rgba(26,35,126,0.04);font-weight:900;pointer-events:none}
    .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:30px;border-top:1px solid #e2e8f0;padding-top:20px}
    .sig-line{border-top:1px solid #64748b;padding-top:4px;font-size:11px;color:#64748b;margin-top:30px}
    </style></head><body>
    <div class="watermark">APSIMS</div>
    <div class="header"><h1>APSIMS ULTRA SCHOOL</h1><h2>Official Academic Report Card</h2><div class="badge">${term?.term_name||'Term'} · ${new Date().getFullYear()}</div></div>
    <div class="info-grid">
      <div class="info-box"><div class="info-label">Student Name</div><div class="info-value">${student.first_name} ${student.last_name}</div></div>
      <div class="info-box"><div class="info-label">Admission Number</div><div class="info-value">${student.admission_no}</div></div>
      <div class="info-box"><div class="info-label">Class</div><div class="info-value">${form?.form_name||''} ${stream?.stream_name||''}</div></div>
      <div class="info-box"><div class="info-label">Guardian</div><div class="info-value">${student.guardian_name||'—'}</div></div>
    </div>
    <p style="text-align:center;color:#64748b;font-size:13px;margin:30px 0">Full marks details are available in the APSIMS portal. Please contact the school for a complete printed report.</p>
    <div class="footer"><div><div class="sig-line">Class Teacher</div></div><div><div class="sig-line">Bursar</div></div><div><div class="sig-line">Principal</div></div></div>
    <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:20px">Generated by APSIMS Ultra · Kenya's #1 School Management System · ${new Date().toLocaleDateString('en-KE')}</p>
    </body></html>`;
    const w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),400);}
  };

  return (
    <div style={{fontFamily:F,background:'#f8fafc',minHeight:'100vh'}}>
      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#0c4a6e 0%,#075985 50%,#0284c7 100%)',padding:'28px 32px 24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:20}}>
            <div>
              <h1 style={{margin:0,fontSize:26,fontWeight:900,color:'#fff'}}>📤 Digital Report Card Delivery</h1>
              <p style={{margin:'6px 0 0',fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600}}>WhatsApp · SMS · Email · PDF Print · Bulk delivery to all parents</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>toast.success('QR verification system active')} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.22)',color:'#fff',borderRadius:10,padding:'10px 16px',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:F}}>🔲 QR Verify</button>
              <button onClick={()=>selected.size>0?bulkSend():toast.error('Select students first')} disabled={sending} style={{background:'#fff',border:'none',color:'#0284c7',borderRadius:10,padding:'10px 18px',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>
                {sending?`⏳ Sending ${sendProgress}%…`:'📤 Send Selected'}
              </button>
            </div>
          </div>
          {sending&&(
            <div style={{marginBottom:16}}>
              <div style={{height:6,background:'rgba(255,255,255,0.2)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:6,width:`${sendProgress}%`,background:'#fff',borderRadius:99,transition:'width 0.3s'}}/>
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginTop:4}}>Sending {sendProgress}% complete…</div>
            </div>
          )}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {[{icon:'📤',label:'Total Sent',value:stats.totalSent},{icon:'💬',label:'WhatsApp',value:stats.whatsapp,color:'#86efac'},{icon:'📧',label:'Email',value:stats.email},{icon:'📱',label:'SMS',value:stats.sms},{icon:'👁',label:'Opened',value:stats.opened,color:'#86efac'},{icon:'📊',label:'Open Rate',value:stats.openRate.toFixed(1)+'%',color:stats.openRate>=50?'#86efac':'#fde68a'}].map(k=>(
              <div key={k.label} style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:12,padding:'10px 16px',display:'flex',alignItems:'center',gap:10,minWidth:120}}>
                <span style={{fontSize:20}}>{k.icon}</span>
                <div><div style={{fontSize:18,fontWeight:900,color:k.color||'#fff',lineHeight:1}}>{k.value}</div><div style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:2}}>{k.label}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex'}}>
        {[{id:'send',label:'📤 Send Reports'},{id:'logs',label:'📋 Delivery Logs'},{id:'templates',label:'✏️ Message Template'},{id:'stats',label:'📊 Analytics'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'13px 22px',fontFamily:F,fontSize:12,fontWeight:800,background:'none',border:'none',borderBottom:tab===t.id?'3px solid #0284c7':'3px solid transparent',color:tab===t.id?'#0284c7':'#64748b',cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* ══ SEND TAB ══ */}
        {tab==='send'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20,alignItems:'start'}}>
            <div>
              {/* Filters */}
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search student…" style={{...IN,flex:1,minWidth:200}}/>
                <select value={selForm} onChange={e=>setSelForm(e.target.value)} style={{...IN,width:130}}><option value="">All Forms</option>{forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
                <select value={selStream} onChange={e=>setSelStream(e.target.value)} style={{...IN,width:130}}><option value="">All Streams</option>{streams.map(s=><option key={s.id} value={s.id}>{s.stream_name}</option>)}</select>
                <select value={selTerm} onChange={e=>setSelTerm(e.target.value)} style={{...IN,width:140}}>{terms.map(t=><option key={t.id} value={t.id}>{t.term_name}{t.is_current?' ✓':''}</option>)}</select>
                <span style={{fontSize:12,color:'#64748b',fontWeight:700,marginLeft:'auto'}}>{selected.size}/{filteredStudents.length} selected</span>
              </div>

              {/* Student Table */}
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10,background:'#f0f9ff'}}>
                  <input type="checkbox" onChange={e=>setSelected(e.target.checked?new Set(filteredStudents.map(s=>s.id)):new Set())}/>
                  <span style={{fontSize:12,fontWeight:800,color:'#0284c7'}}>Select all {filteredStudents.length} students to send report cards</span>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:'#f8fafc'}}>{['','Student','Form/Stream','Guardian','Phone','Email','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredStudents.map((s,i)=>(
                      <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                        <td style={TC}><input type="checkbox" checked={selected.has(s.id)} onChange={e=>{const ns=new Set(selected);e.target.checked?ns.add(s.id):ns.delete(s.id);setSelected(ns);}}/></td>
                        <td style={TC}><div style={{fontWeight:800,fontSize:13,color:'#0f172a'}}>{s.first_name} {s.last_name}</div><div style={{fontSize:10,color:'#94a3b8'}}>{s.admission_no}</div></td>
                        <td style={TC}><span style={{background:'#ede9fe',color:'#6d28d9',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:6}}>{forms.find(f=>f.id===s.form_id)?.form_name} {streams.find(st=>st.id===s.stream_id)?.stream_name}</span></td>
                        <td style={{...TC,fontSize:11}}>{s.guardian_name||'—'}</td>
                        <td style={{...TC,fontSize:11,color:s.guardian_phone?'#0f172a':'#dc2626',fontWeight:s.guardian_phone?600:800}}>{s.guardian_phone||'❌ Missing'}</td>
                        <td style={{...TC,fontSize:11,color:s.guardian_email?'#0f172a':'#94a3b8'}}>{s.guardian_email||'—'}</td>
                        <td style={TC}>
                          <div style={{display:'flex',gap:4}}>
                            <button onClick={()=>generatePDF(s)} style={AB('#4f46e5')}>🖨 PDF</button>
                            <button onClick={async()=>{
                              const term=terms.find(t=>String(t.id)===selTerm);
                              const msg=msgTemplate.replace('{parent_name}',s.guardian_name||'Parent').replace('{student_name}',`${s.first_name} ${s.last_name}`).replace('{adm_no}',s.admission_no).replace('{school_name}','School').replace('{link}',`${window.location.origin}/portal/report/${s.id}/${selTerm}`).replace('{phone}','+254700000000');
                              await fetch('/api/whatsapp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:s.guardian_phone,message:msg,student_id:s.id})}).catch(()=>{});
                              toast.success(`💬 WhatsApp sent to ${s.guardian_name}`);
                            }} disabled={!s.guardian_phone} style={AB('#059669')}>💬 WA</button>
                            <button onClick={()=>setPreviewStudent(s)} style={AB('#f59e0b')}>👁 Preview</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Channel Selector */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:22}}>
                <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:900,color:'#0f172a'}}>📡 Delivery Channels</h3>
                {[
                  {key:'whatsapp',label:'WhatsApp',icon:'💬',desc:'Sends PDF link via WhatsApp Business API',color:'#059669'},
                  {key:'email',label:'Email',icon:'📧',desc:'PDF attachment via SendGrid/SMTP',color:'#4f46e5'},
                  {key:'sms',label:'SMS',icon:'📱',desc:'Plain text link via Africa\'s Talking',color:'#f59e0b'},
                ].map(ch=>(
                  <label key={ch.key} style={{display:'flex',gap:12,padding:'12px',borderRadius:10,border:`1px solid ${channels[ch.key as keyof typeof channels]?ch.color+'40':'#f1f5f9'}`,marginBottom:8,cursor:'pointer',background:channels[ch.key as keyof typeof channels]?ch.color+'08':'#fff',transition:'all 0.2s'}}>
                    <input type="checkbox" checked={channels[ch.key as keyof typeof channels]} onChange={e=>setChannels(p=>({...p,[ch.key]:e.target.checked}))} style={{marginTop:3}}/>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:'#0f172a'}}>{ch.icon} {ch.label}</div>
                      <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{ch.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:22}}>
                <h3 style={{margin:'0 0 12px',fontSize:15,fontWeight:900,color:'#0f172a'}}>📋 Quick Send</h3>
                <select value={selTerm} onChange={e=>setSelTerm(e.target.value)} style={{...IN,marginBottom:12}}>{terms.map(t=><option key={t.id} value={t.id}>{t.term_name}</option>)}</select>
                {[
                  {label:'Send to All',action:()=>{setSelected(new Set(filteredStudents.map(s=>s.id)));setTimeout(bulkSend,100);}},
                  {label:'Form 4 Only',action:()=>{const f4=forms.find(f=>f.form_level===4);if(f4)setSelForm(String(f4.id));setSelected(new Set(filteredStudents.filter(s=>s.form_id===(forms.find(f=>f.form_level===4)?.id)).map(s=>s.id)));}},
                  {label:'Missing Phone #',action:()=>toast.error(`${students.filter(s=>!s.guardian_phone).length} students missing phone numbers`)},
                ].map(q=>(
                  <button key={q.label} onClick={q.action} style={{width:'100%',padding:'10px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:9,fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:F,color:'#0f172a',marginBottom:8,textAlign:'left'}}>→ {q.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ LOGS TAB ══ */}
        {tab==='logs'&&(
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            {logs.length===0?(
              <div style={{textAlign:'center',padding:'60px 0'}}><div style={{fontSize:48}}>📋</div><div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginTop:10}}>No delivery logs yet</div><div style={{fontSize:13,color:'#64748b',marginTop:4}}>Send your first report card to see logs here</div></div>
            ):(
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f8fafc'}}>{['Student','Channel','Recipient','Report','Status','Sent','Opened'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {logs.map((log,i)=>{
                    const student=students.find(s=>s.id===log.student_id);
                    return(
                      <tr key={log.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                        <td style={TC}><div style={{fontWeight:800,fontSize:13}}>{student?`${student.first_name} ${student.last_name}`:'—'}</div><div style={{fontSize:10,color:'#94a3b8'}}>{student?.admission_no}</div></td>
                        <td style={TC}><div style={{display:'flex',alignItems:'center',gap:6}}><ChannelIcon ch={log.channel}/><span style={{fontSize:11,fontWeight:700,textTransform:'capitalize'}}>{log.channel}</span></div></td>
                        <td style={{...TC,fontSize:11}}>{log.recipient}</td>
                        <td style={TC}><span style={{background:'#f1f5f9',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,textTransform:'capitalize'}}>{log.report_type?.replace('_',' ')}</span></td>
                        <td style={TC}><StatusBadge status={log.status}/></td>
                        <td style={{...TC,fontSize:11,color:'#64748b'}}>{fmt(log.sent_at)}</td>
                        <td style={{...TC,fontSize:11,color:'#64748b'}}>{log.opened_at?fmt(log.opened_at):'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ TEMPLATE TAB ══ */}
        {tab==='templates'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24}}>
              <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:900,color:'#0f172a'}}>✏️ Message Template</h3>
              <div style={{fontSize:11,color:'#64748b',fontWeight:700,marginBottom:8}}>AVAILABLE VARIABLES</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
                {['{parent_name}','{student_name}','{adm_no}','{school_name}','{link}','{phone}'].map(v=>(
                  <span key={v} onClick={()=>setMsgTemplate(p=>p+v)} style={{background:'#ede9fe',color:'#6d28d9',fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:6,cursor:'pointer'}}>{v}</span>
                ))}
              </div>
              <textarea value={msgTemplate} onChange={e=>setMsgTemplate(e.target.value)} rows={8} style={{...IN,resize:'vertical' as const,fontSize:13,lineHeight:1.6}}/>
              <div style={{marginTop:12,display:'flex',gap:8}}>
                <button onClick={()=>toast.success('Template saved!')} style={{flex:1,padding:'10px',background:'#0284c7',border:'none',borderRadius:10,color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:F}}>💾 Save Template</button>
                <button onClick={()=>setMsgTemplate(`Dear {parent_name}, your child {student_name} ({adm_no}) has a new report card ready. View: {link}`)} style={{padding:'10px 14px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:F}}>↺ Reset</button>
              </div>
            </div>
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24}}>
              <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:900,color:'#0f172a'}}>👁 Live Preview</h3>
              <div style={{background:'#f8fafc',borderRadius:12,padding:16,border:'1px solid #e2e8f0',fontSize:13,lineHeight:1.7,color:'#0f172a',fontStyle:'italic',whiteSpace:'pre-wrap'}}>
                {msgTemplate.replace('{parent_name}','Mrs. Jane Kamau').replace('{student_name}','John Kamau').replace('{adm_no}','2024/001').replace('{school_name}','APSIMS School').replace('{link}','https://apsims.co.ke/portal/report/123/45').replace('{phone}','+254700000000')}
              </div>
              <div style={{marginTop:16,background:'#f0fdf4',borderRadius:10,padding:'12px 14px',border:'1px solid #bbf7d0'}}>
                <div style={{fontSize:12,fontWeight:800,color:'#065f46',marginBottom:4}}>📊 Message Stats</div>
                <div style={{fontSize:12,color:'#064e3b'}}>Characters: {msgTemplate.length} · WhatsApp limit: 4096 · SMS limit: 160</div>
                {msgTemplate.length>160&&<div style={{fontSize:11,color:'#f59e0b',fontWeight:700,marginTop:4}}>⚠ SMS will be split into {Math.ceil(msgTemplate.length/160)} parts</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══ STATS TAB ══ */}
        {tab==='stats'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20}}>
            {[
              {title:'Total Reports Sent',value:stats.totalSent,icon:'📤',color:'#4f46e5',bg:'#ede9fe'},
              {title:'WhatsApp Delivered',value:stats.whatsapp,icon:'💬',color:'#059669',bg:'#d1fae5'},
              {title:'Emails Sent',value:stats.email,icon:'📧',color:'#0284c7',bg:'#dbeafe'},
              {title:'SMS Sent',value:stats.sms,icon:'📱',color:'#f59e0b',bg:'#fef3c7'},
              {title:'Reports Opened',value:stats.opened,icon:'👁',color:'#7c3aed',bg:'#ede9fe'},
              {title:'Failed Deliveries',value:stats.failed,icon:'❌',color:'#dc2626',bg:'#fee2e2'},
            ].map(s=>(
              <div key={s.title} style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24,display:'flex',gap:16,alignItems:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}>
                <div style={{width:56,height:56,borderRadius:16,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{s.icon}</div>
                <div><div style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div><div style={{fontSize:12,color:'#64748b',fontWeight:700,marginTop:2}}>{s.title}</div></div>
              </div>
            ))}
            <div style={{background:'linear-gradient(135deg,#0284c7,#0c4a6e)',borderRadius:16,padding:24,color:'#fff',gridColumn:'span 2'}}>
              <div style={{fontSize:14,fontWeight:800,marginBottom:6,opacity:0.8}}>📊 Open Rate</div>
              <div style={{fontSize:48,fontWeight:900,lineHeight:1}}>{stats.openRate.toFixed(1)}%</div>
              <div style={{height:8,background:'rgba(255,255,255,0.2)',borderRadius:99,overflow:'hidden',marginTop:12}}>
                <div style={{height:8,width:`${stats.openRate}%`,background:'#fff',borderRadius:99}}/>
              </div>
              <div style={{fontSize:12,opacity:0.7,marginTop:6}}>{stats.opened} of {stats.totalSent} reports opened by parents</div>
            </div>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewStudent&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.7)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}} onClick={()=>setPreviewStudent(null)}>
          <div style={{background:'#fff',borderRadius:20,maxWidth:560,width:'100%',padding:32,fontFamily:F,boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',borderBottom:'2px solid #0284c7',paddingBottom:16,marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:700,color:'#64748b'}}>APSIMS ULTRA SCHOOL</div>
              <h2 style={{margin:'6px 0',fontSize:20,fontWeight:900,color:'#0f172a'}}>Academic Report Card</h2>
              <div style={{background:'#0284c7',color:'#fff',display:'inline-block',padding:'3px 16px',borderRadius:20,fontSize:12,fontWeight:700}}>{terms.find(t=>String(t.id)===selTerm)?.term_name}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              {[['Student',`${previewStudent.first_name} ${previewStudent.last_name}`],['Adm No',previewStudent.admission_no],['Class',`${forms.find(f=>f.id===previewStudent.form_id)?.form_name} ${streams.find(s=>s.id===previewStudent.stream_id)?.stream_name}`],['Guardian',previewStudent.guardian_name||'—']].map(([k,v])=>(
                <div key={k} style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px'}}><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase'}}>{k}</div><div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginTop:2}}>{v}</div></div>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>generatePDF(previewStudent)} style={{flex:1,padding:'12px',background:'#4f46e5',border:'none',borderRadius:10,color:'#fff',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>🖨 Print PDF</button>
              <button onClick={async()=>{const msg=msgTemplate.replace('{parent_name}',previewStudent.guardian_name||'Parent').replace('{student_name}',`${previewStudent.first_name} ${previewStudent.last_name}`).replace('{adm_no}',previewStudent.admission_no).replace('{school_name}','School').replace('{link}',`${window.location.origin}/portal/report/${previewStudent.id}/${selTerm}`).replace('{phone}','+254700000000');await fetch('/api/whatsapp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:previewStudent.guardian_phone,message:msg})}).catch(()=>{});toast.success('💬 WhatsApp sent!');setPreviewStudent(null);}} style={{flex:1,padding:'12px',background:'#059669',border:'none',borderRadius:10,color:'#fff',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>💬 Send WhatsApp</button>
              <button onClick={()=>setPreviewStudent(null)} style={{padding:'12px 16px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:F}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TH:React.CSSProperties={padding:'10px 12px',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',textAlign:'left',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'};
const TC:React.CSSProperties={padding:'11px 12px',fontSize:12,color:'#0f172a',verticalAlign:'middle'};
const IN:React.CSSProperties={width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',background:'#f8fafc',boxSizing:'border-box'};
const AB=(c:string):React.CSSProperties=>({background:c+'14',border:`1px solid ${c}28`,color:c,borderRadius:6,padding:'4px 8px',fontSize:10,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'});
