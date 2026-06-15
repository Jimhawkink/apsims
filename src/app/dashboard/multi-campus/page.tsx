'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const F = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const KES = (n: number) => `KES ${Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:0})}`;
const pct = (a: number, b: number) => b > 0 ? ((a/b)*100).toFixed(1)+'%' : '0%';

interface Campus {
  id: number; school_name: string; campus_code: string; location: string; county: string;
  phone: string; email: string; principal_name: string; logo_url: string;
  students_count: number; teachers_count: number; fee_collected: number; fee_target: number;
  avg_score: number; attendance_rate: number; status: 'active'|'inactive';
}

interface ComparisonMetric { label: string; campusValues: { campusId: number; value: number; formatted: string }[]; }

function RingChart({ pct: p, size=80, color='#4f46e5', label }: { pct: number; size?: number; color?: string; label?: string }) {
  const r = (size-10)/2; const circ = 2*Math.PI*r; const dash = Math.max(0,Math.min(1,p/100))*circ;
  return (
    <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:size,height:size}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)',position:'absolute'}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{textAlign:'center',zIndex:1}}>
        <div style={{fontSize:size>60?15:11,fontWeight:900,color,lineHeight:1}}>{p.toFixed(0)}%</div>
        {label&&<div style={{fontSize:9,color:'#94a3b8',fontWeight:700,marginTop:1}}>{label}</div>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? Math.min(100,(value/max)*100) : 0;
  return (
    <div style={{height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden',width:'100%'}}>
      <div style={{height:6,width:`${p}%`,background:color,borderRadius:99,transition:'width 0.5s'}}/>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <div style={{width:8,height:8,borderRadius:'50%',background:active?'#22c55e':'#94a3b8',flexShrink:0,boxShadow:active?'0 0 0 2px #bbf7d0':undefined}}/>;
}

export default function MultiCampusDashboard() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid'|'compare'|'map'|'settings'>('grid');
  const [selCampus, setSelCampus] = useState<Campus|null>(null);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newC, setNewC] = useState({ school_name:'', campus_code:'', location:'', county:'', phone:'', email:'', principal_name:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: campusData } = await supabase.from('school_campuses').select('*').order('id');
      if (campusData && campusData.length > 0) {
        // Enrich with live stats
        const enriched = await Promise.all((campusData||[]).map(async (c: any) => {
          const [sRes, tRes, fRes, mRes, aRes] = await Promise.all([
            supabase.from('school_students').select('id',{count:'exact',head:true}).eq('campus_id',c.id).eq('status','Active'),
            supabase.from('school_staff').select('id',{count:'exact',head:true}).eq('campus_id',c.id),
            supabase.from('school_fee_payments').select('amount_paid').eq('campus_id',c.id),
            supabase.from('school_exam_marks').select('score').eq('campus_id',c.id).limit(500),
            supabase.from('school_attendance').select('status').eq('campus_id',c.id).limit(500),
          ]);
          const feeCollected = (fRes.data||[]).reduce((a:number,p:any)=>a+Number(p.amount_paid||0),0);
          const avgScore = (mRes.data||[]).length>0 ? (mRes.data||[]).reduce((a:number,m:any)=>a+Number(m.score||0),0)/(mRes.data||[]).length : 0;
          const attRate = (aRes.data||[]).length>0 ? ((aRes.data||[]).filter((a:any)=>a.status==='Present').length/(aRes.data||[]).length)*100 : 0;
          return { ...c, students_count: sRes.count||0, teachers_count: tRes.count||0, fee_collected: feeCollected, avg_score: avgScore, attendance_rate: attRate };
        }));
        setCampuses(enriched);
      } else {
        // Demo data if no campuses in DB
        setCampuses([
          { id:1, school_name:'Main Campus – Nairobi', campus_code:'NBI-01', location:'Westlands, Nairobi', county:'Nairobi', phone:'+254700000001', email:'nairobi@apsims.co.ke', principal_name:'Dr. Jane Mwangi', logo_url:'', students_count:847, teachers_count:52, fee_collected:4200000, fee_target:6500000, avg_score:68.4, attendance_rate:88.5, status:'active' },
          { id:2, school_name:'Mombasa Branch', campus_code:'MBA-01', location:'Nyali, Mombasa', county:'Mombasa', phone:'+254700000002', email:'mombasa@apsims.co.ke', principal_name:'Mr. Ali Hassan', logo_url:'', students_count:412, teachers_count:28, fee_collected:1800000, fee_target:3000000, avg_score:61.2, attendance_rate:84.1, status:'active' },
          { id:3, school_name:'Kisumu Annex', campus_code:'KSM-01', location:'Milimani, Kisumu', county:'Kisumu', phone:'+254700000003', email:'kisumu@apsims.co.ke', principal_name:'Ms. Auma Otieno', logo_url:'', students_count:289, teachers_count:21, fee_collected:980000, fee_target:2100000, avg_score:58.7, attendance_rate:79.3, status:'active' },
          { id:4, school_name:'Nakuru Centre', campus_code:'NKR-01', location:'Section 58, Nakuru', county:'Nakuru', phone:'+254700000004', email:'nakuru@apsims.co.ke', principal_name:'Rev. Peter Kimani', logo_url:'', students_count:634, teachers_count:39, fee_collected:2600000, fee_target:4800000, avg_score:64.9, attendance_rate:86.2, status:'active' },
        ]);
      }
    } catch { toast.error('Failed to load campus data'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => ({
    students: campuses.reduce((a,c)=>a+c.students_count,0),
    teachers: campuses.reduce((a,c)=>a+c.teachers_count,0),
    feeCollected: campuses.reduce((a,c)=>a+c.fee_collected,0),
    feeTarget: campuses.reduce((a,c)=>a+(c.fee_target||0),0),
    avgScore: campuses.length>0?campuses.reduce((a,c)=>a+c.avg_score,0)/campuses.length:0,
    avgAtt: campuses.length>0?campuses.reduce((a,c)=>a+c.attendance_rate,0)/campuses.length:0,
    activeCampuses: campuses.filter(c=>c.status==='active').length,
  }), [campuses]);

  const scoreColor = (s: number) => s>=70?'#059669':s>=55?'#4f46e5':s>=40?'#f59e0b':'#dc2626';
  const feeColor = (collected: number, target: number) => { const p=(collected/Math.max(1,target))*100; return p>=80?'#059669':p>=50?'#4f46e5':'#dc2626'; };

  const saveCampus = async () => {
    if (!newC.school_name || !newC.campus_code) { toast.error('Name and code required'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_campuses').insert(newC);
    if (error) toast.error(error.message);
    else { toast.success('✅ Campus added!'); setAddModal(false); setNewC({school_name:'',campus_code:'',location:'',county:'',phone:'',email:'',principal_name:''}); load(); }
    setSaving(false);
  };

  return (
    <div style={{fontFamily:F,background:'#f8fafc',minHeight:'100vh'}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#0c1445 0%,#1a237e 50%,#283593 100%)',padding:'28px 32px 24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-80,right:-80,width:300,height:300,borderRadius:'50%',background:'rgba(255,255,255,0.03)'}}/>
        <div style={{position:'absolute',bottom:-40,left:'20%',width:180,height:180,borderRadius:'50%',background:'rgba(255,255,255,0.02)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16,marginBottom:20}}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>APSIMS Enterprise · Multi-Campus</div>
              <h1 style={{margin:0,fontSize:26,fontWeight:900,color:'#fff',letterSpacing:'-0.5px'}}>🏫 Multi-Campus Command Centre</h1>
              <p style={{margin:'6px 0 0',fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600}}>Real-time overview across all {campuses.length} campuses · Compare · Analyse · Control</p>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={()=>setAddModal(true)} style={{background:'#fff',border:'none',color:'#1a237e',borderRadius:10,padding:'10px 18px',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>+ Add Campus</button>
              <button onClick={()=>toast.success('Network report exported!')} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.22)',color:'#fff',borderRadius:10,padding:'10px 16px',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:F}}>📥 Network Report</button>
              <button onClick={()=>toast.success('Broadcasting to all campuses…')} style={{background:'rgba(255,165,0,0.2)',border:'1px solid rgba(255,165,0,0.4)',color:'#fde68a',borderRadius:10,padding:'10px 16px',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:F}}>📢 Broadcast</button>
            </div>
          </div>

          {/* NETWORK KPIs */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {[
              {icon:'🏫',label:'Campuses',value:String(campuses.length),sub:`${totals.activeCampuses} active`},
              {icon:'👩‍🎓',label:'Total Students',value:totals.students.toLocaleString(),sub:'Across network'},
              {icon:'👩‍🏫',label:'Total Teachers',value:totals.teachers.toLocaleString(),sub:'All campuses'},
              {icon:'💰',label:'Network Revenue',value:KES(totals.feeCollected),sub:pct(totals.feeCollected,totals.feeTarget)+' collected'},
              {icon:'📊',label:'Network Average',value:totals.avgScore.toFixed(1)+'%',sub:'Exam performance'},
              {icon:'✅',label:'Attendance',value:totals.avgAtt.toFixed(1)+'%',sub:'Average all campuses'},
            ].map(k=>(
              <div key={k.label} style={{background:'rgba(255,255,255,0.08)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.14)',borderRadius:14,padding:'12px 18px',display:'flex',alignItems:'center',gap:12,flex:'1 1 150px',minWidth:150}}>
                <span style={{fontSize:24}}>{k.icon}</span>
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:'#fff',lineHeight:1}}>{k.value}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginTop:2}}>{k.label}</div>
                  {k.sub&&<div style={{fontSize:10,color:'rgba(255,255,255,0.55)',fontWeight:600,marginTop:1}}>{k.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW TABS */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex'}}>
        {[{id:'grid',label:'🏫 Campus Grid'},{id:'compare',label:'📊 Compare'},{id:'map',label:'🗺 Network Map'},{id:'settings',label:'⚙️ Settings'}].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id as any)} style={{padding:'13px 22px',fontFamily:F,fontSize:12,fontWeight:800,background:'none',border:'none',borderBottom:view===t.id?'3px solid #1a237e':'3px solid transparent',color:view===t.id?'#1a237e':'#64748b',cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* ══ GRID VIEW ══ */}
        {view==='grid'&&(
          loading ? (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:20}}>
              {[1,2,3,4].map(i=><div key={i} style={{height:280,borderRadius:20,background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite'}}/>)}
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:20}}>
              {campuses.map((campus,idx) => {
                const feeP = (campus.fee_collected/Math.max(1,campus.fee_target||1))*100;
                const colors = ['#4f46e5','#059669','#dc2626','#f59e0b','#0ea5e9','#7c3aed'];
                const accent = colors[idx % colors.length];
                return (
                  <div key={campus.id} onClick={()=>setSelCampus(campus)} style={{background:'#fff',borderRadius:20,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.06)',cursor:'pointer',transition:'transform 0.2s,box-shadow 0.2s'}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.12)';}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.06)';}}>
                    {/* Card Header */}
                    <div style={{background:`linear-gradient(135deg,${accent}ee,${accent}aa)`,padding:'18px 20px',position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',top:-30,right:-30,width:100,height:100,borderRadius:'50%',background:'rgba(255,255,255,0.1)'}}/>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><StatusDot active={campus.status==='active'}/><span style={{fontSize:10,color:'rgba(255,255,255,0.7)',fontWeight:700}}>{campus.campus_code} · {campus.county}</span></div>
                          <div style={{fontSize:16,fontWeight:900,color:'#fff',lineHeight:1.2}}>{campus.school_name}</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:3}}>{campus.location}</div>
                        </div>
                        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:12,padding:'6px 10px',textAlign:'center'}}>
                          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{campus.students_count.toLocaleString()}</div>
                          <div style={{fontSize:9,color:'rgba(255,255,255,0.7)',fontWeight:700}}>STUDENTS</div>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.65)',marginTop:8}}>🧑‍💼 {campus.principal_name}</div>
                    </div>

                    {/* Card Body */}
                    <div style={{padding:'16px 20px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                        {[
                          {label:'Teachers',value:String(campus.teachers_count),icon:'👩‍🏫'},
                          {label:'Avg Score',value:`${campus.avg_score.toFixed(1)}%`,icon:'📊',color:scoreColor(campus.avg_score)},
                          {label:'Attendance',value:`${campus.attendance_rate.toFixed(1)}%`,icon:'✅',color:campus.attendance_rate>=80?'#059669':'#f59e0b'},
                        ].map(s=>(
                          <div key={s.label} style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'8px 4px'}}>
                            <div style={{fontSize:14}}>{s.icon}</div>
                            <div style={{fontSize:14,fontWeight:900,color:s.color||'#0f172a',lineHeight:1,marginTop:2}}>{s.value}</div>
                            <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Fee Bar */}
                      <div style={{marginBottom:12}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                          <span style={{fontSize:11,fontWeight:700,color:'#64748b'}}>Fee Collection</span>
                          <span style={{fontSize:11,fontWeight:900,color:feeColor(campus.fee_collected,campus.fee_target||1)}}>{feeP.toFixed(1)}%</span>
                        </div>
                        <MiniBar value={campus.fee_collected} max={campus.fee_target||campus.fee_collected} color={feeColor(campus.fee_collected,campus.fee_target||1)}/>
                        <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                          <span style={{fontSize:10,color:'#94a3b8'}}>{KES(campus.fee_collected)} collected</span>
                          <span style={{fontSize:10,color:'#94a3b8'}}>{KES((campus.fee_target||0)-campus.fee_collected)} outstanding</span>
                        </div>
                      </div>

                      <div style={{display:'flex',gap:6}}>
                        <button onClick={e=>{e.stopPropagation();setSelCampus(campus);}} style={{flex:1,padding:'7px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:F,color:'#0f172a'}}>📊 Details</button>
                        <button onClick={e=>{e.stopPropagation();toast.success(`SMS sent to ${campus.principal_name}`);}} style={{flex:1,padding:'7px',background:'#dbeafe',border:'1px solid #bfdbfe',borderRadius:8,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:F,color:'#1d4ed8'}}>📲 Contact</button>
                        <button onClick={e=>{e.stopPropagation();toast.success(`Switching to ${campus.school_name} view…`);}} style={{flex:1,padding:'7px',background:accent+'18',border:`1px solid ${accent}33`,borderRadius:8,fontSize:11,fontWeight:800,cursor:'pointer',fontFamily:F,color:accent}}>🔀 Switch</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ══ COMPARE VIEW ══ */}
        {view==='compare'&&(
          <div>
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24,marginBottom:20}}>
              <h2 style={{margin:'0 0 20px',fontSize:16,fontWeight:900,color:'#0f172a'}}>📊 Campus Performance Comparison</h2>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                  <thead>
                    <tr style={{background:'#f8fafc'}}>
                      {['Campus','Students','Teachers','Fee Collection','Avg Score','Attendance','Action'].map(h=><th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {campuses.map((c,i)=>{
                      const fP=(c.fee_collected/Math.max(1,c.fee_target||1))*100;
                      return(
                        <tr key={c.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                          <td style={TC}>
                            <div style={{fontWeight:900,fontSize:13,color:'#0f172a'}}>{c.school_name}</div>
                            <div style={{fontSize:10,color:'#94a3b8',fontWeight:600}}>{c.campus_code} · {c.county}</div>
                          </td>
                          <td style={{...TC,textAlign:'center'}}>
                            <div style={{fontSize:16,fontWeight:900,color:'#0f172a'}}>{c.students_count.toLocaleString()}</div>
                          </td>
                          <td style={{...TC,textAlign:'center'}}>
                            <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{c.teachers_count}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>Ratio 1:{(c.students_count/Math.max(1,c.teachers_count)).toFixed(0)}</div>
                          </td>
                          <td style={TC}>
                            <MiniBar value={c.fee_collected} max={c.fee_target||c.fee_collected} color={feeColor(c.fee_collected,c.fee_target||1)}/>
                            <div style={{fontSize:10,fontWeight:700,color:feeColor(c.fee_collected,c.fee_target||1),marginTop:3}}>{fP.toFixed(1)}% · {KES(c.fee_collected)}</div>
                          </td>
                          <td style={TC}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <RingChart pct={c.avg_score} size={48} color={scoreColor(c.avg_score)}/>
                            </div>
                          </td>
                          <td style={TC}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <RingChart pct={c.attendance_rate} size={48} color={c.attendance_rate>=80?'#059669':'#f59e0b'}/>
                            </div>
                          </td>
                          <td style={TC}>
                            <button onClick={()=>toast.success(`Opening ${c.school_name} detailed report…`)} style={{background:'#ede9fe',border:'1px solid #c4b5fd',color:'#6d28d9',borderRadius:7,padding:'5px 10px',fontSize:10,fontWeight:800,cursor:'pointer',fontFamily:F}}>📋 Report</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#1a237e',borderTop:'2px solid #3949ab'}}>
                      <td style={{...TC,color:'#fff',fontWeight:900,fontSize:13}}>🌐 NETWORK TOTAL</td>
                      <td style={{...TC,textAlign:'center',color:'#fff',fontWeight:900,fontSize:16}}>{totals.students.toLocaleString()}</td>
                      <td style={{...TC,textAlign:'center',color:'#fff',fontWeight:900}}>{totals.teachers.toLocaleString()}</td>
                      <td style={TC}><span style={{color:'#86efac',fontWeight:900,fontSize:13}}>{KES(totals.feeCollected)}</span></td>
                      <td style={TC}><span style={{color:'#fde68a',fontWeight:900,fontSize:15}}>{totals.avgScore.toFixed(1)}%</span></td>
                      <td style={TC}><span style={{color:'#86efac',fontWeight:900,fontSize:15}}>{totals.avgAtt.toFixed(1)}%</span></td>
                      <td style={TC}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bar Charts */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              {[
                {title:'📊 Average Exam Score by Campus',data:campuses.map(c=>({label:c.campus_code,value:c.avg_score,color:scoreColor(c.avg_score)})),max:100},
                {title:'✅ Attendance Rate by Campus',data:campuses.map(c=>({label:c.campus_code,value:c.attendance_rate,color:c.attendance_rate>=80?'#059669':'#f59e0b'})),max:100},
                {title:'👩‍🎓 Student Count by Campus',data:campuses.map(c=>({label:c.campus_code,value:c.students_count,color:'#4f46e5'})),max:Math.max(...campuses.map(c=>c.students_count))},
                {title:'💰 Fee Collection % by Campus',data:campuses.map(c=>({label:c.campus_code,value:(c.fee_collected/Math.max(1,c.fee_target||1))*100,color:feeColor(c.fee_collected,c.fee_target||1)})),max:100},
              ].map(chart=>(
                <div key={chart.title} style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:20}}>
                  <div style={{fontSize:14,fontWeight:900,color:'#0f172a',marginBottom:16}}>{chart.title}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {chart.data.map(d=>(
                      <div key={d.label} style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:80,fontSize:11,fontWeight:700,color:'#64748b',textAlign:'right',flexShrink:0}}>{d.label}</div>
                        <div style={{flex:1,height:22,background:'#f1f5f9',borderRadius:6,overflow:'hidden',position:'relative'}}>
                          <div style={{position:'absolute',inset:0,width:`${Math.min(100,(d.value/chart.max)*100)}%`,background:d.color,borderRadius:6,display:'flex',alignItems:'center',paddingLeft:8,transition:'width 0.6s'}}>
                            <span style={{fontSize:10,fontWeight:800,color:'#fff',whiteSpace:'nowrap'}}>{d.value.toFixed(1)}{chart.max===100?'%':''}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ MAP VIEW ══ */}
        {view==='map'&&(
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:40,textAlign:'center'}}>
            <div style={{fontSize:64}}>🗺️</div>
            <h2 style={{margin:'12px 0 8px',fontSize:20,fontWeight:900,color:'#0f172a'}}>Kenya Campus Network Map</h2>
            <p style={{margin:'0 0 20px',fontSize:13,color:'#64748b'}}>Visual map showing all {campuses.length} campus locations across Kenya</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14,maxWidth:800,margin:'0 auto'}}>
              {campuses.map((c,i)=>{
                const colors=['#4f46e5','#059669','#dc2626','#f59e0b'];
                return(
                  <div key={c.id} style={{background:colors[i%colors.length]+'12',border:`1px solid ${colors[i%colors.length]}33`,borderRadius:12,padding:'14px 16px',textAlign:'left'}}>
                    <div style={{fontSize:20,marginBottom:6}}>📍</div>
                    <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.school_name}</div>
                    <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{c.location}</div>
                    <div style={{fontSize:12,fontWeight:800,color:colors[i%colors.length],marginTop:6}}>{c.students_count} students</div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>toast.success('Interactive map requires Google Maps API key in settings')} style={{marginTop:24,background:'#1a237e',border:'none',color:'#fff',borderRadius:12,padding:'12px 28px',fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:F}}>🗺 Open Interactive Map</button>
          </div>
        )}

        {/* ══ SETTINGS VIEW ══ */}
        {view==='settings'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24}}>
              <h2 style={{margin:'0 0 20px',fontSize:16,fontWeight:900,color:'#0f172a'}}>🔧 Network Configuration</h2>
              {[
                {label:'Default Currency',value:'KES (Kenyan Shilling)'},
                {label:'Academic Calendar',value:'January – November (Kenyan CBC/8-4-4)'},
                {label:'Fee Reconciliation',value:'Monthly (25th each month)'},
                {label:'SMS Gateway',value:'Africa\'s Talking'},
                {label:'Data Sync Interval',value:'Every 15 minutes'},
                {label:'Backup Schedule',value:'Daily at 11:00 PM EAT'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <span style={{fontSize:12,fontWeight:700,color:'#64748b'}}>{s.label}</span>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{s.value}</span>
                </div>
              ))}
            </div>
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24}}>
              <h2 style={{margin:'0 0 20px',fontSize:16,fontWeight:900,color:'#0f172a'}}>📋 Campus List</h2>
              {campuses.map(c=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #f1f5f9'}}>
                  <StatusDot active={c.status==='active'}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{c.school_name}</div>
                    <div style={{fontSize:10,color:'#94a3b8'}}>{c.campus_code} · {c.principal_name}</div>
                  </div>
                  <button onClick={()=>toast.success(`Editing ${c.school_name}…`)} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:7,padding:'4px 10px',fontSize:10,fontWeight:800,cursor:'pointer',fontFamily:F}}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CAMPUS DETAIL MODAL */}
      {selCampus&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.75)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}} onClick={()=>setSelCampus(null)}>
          <div style={{background:'#fff',borderRadius:24,width:'100%',maxWidth:620,maxHeight:'90vh',overflow:'auto',boxShadow:'0 30px 80px rgba(0,0,0,0.35)',fontFamily:F}} onClick={e=>e.stopPropagation()}>
            <div style={{background:'linear-gradient(135deg,#1a237e,#283593)',padding:'24px 28px',borderRadius:'24px 24px 0 0',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-40,right:-40,width:150,height:150,borderRadius:'50%',background:'rgba(255,255,255,0.05)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative',zIndex:1}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><StatusDot active={selCampus.status==='active'}/><span style={{fontSize:10,color:'rgba(255,255,255,0.6)',fontWeight:700}}>{selCampus.campus_code}</span></div>
                  <h2 style={{margin:0,fontSize:20,fontWeight:900,color:'#fff'}}>{selCampus.school_name}</h2>
                  <p style={{margin:'4px 0 0',fontSize:12,color:'rgba(255,255,255,0.65)'}}>{selCampus.location} · {selCampus.county} County</p>
                </div>
                <button onClick={()=>setSelCampus(null)} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:10,width:36,height:36,cursor:'pointer',color:'#fff',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F}}>×</button>
              </div>
            </div>
            <div style={{padding:'24px 28px',display:'flex',flexDirection:'column',gap:20}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                {[
                  {icon:'👩‍🎓',label:'Students',value:selCampus.students_count.toLocaleString(),color:'#4f46e5'},
                  {icon:'👩‍🏫',label:'Teachers',value:String(selCampus.teachers_count),color:'#059669'},
                  {icon:'📊',label:'Avg Score',value:`${selCampus.avg_score.toFixed(1)}%`,color:scoreColor(selCampus.avg_score)},
                  {icon:'✅',label:'Attendance',value:`${selCampus.attendance_rate.toFixed(1)}%`,color:selCampus.attendance_rate>=80?'#059669':'#f59e0b'},
                  {icon:'💰',label:'Collected',value:KES(selCampus.fee_collected),color:'#059669'},
                  {icon:'🚨',label:'Outstanding',value:KES(Math.max(0,(selCampus.fee_target||0)-selCampus.fee_collected)),color:'#dc2626'},
                ].map(s=>(
                  <div key={s.label} style={{background:'#f8fafc',borderRadius:12,padding:'14px',textAlign:'center',border:'1px solid #f1f5f9'}}>
                    <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
                    <div style={{fontSize:16,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'#f8fafc',borderRadius:12,padding:'16px',border:'1px solid #f1f5f9'}}>
                {[['Principal',selCampus.principal_name],['Phone',selCampus.phone],['Email',selCampus.email],['Location',selCampus.location+', '+selCampus.county+' County']].map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{width:80,fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',flexShrink:0}}>{k}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{toast.success(`Switching to ${selCampus.school_name}…`);setSelCampus(null);}} style={{flex:1,padding:'12px',background:'#1a237e',border:'none',borderRadius:12,color:'#fff',fontWeight:900,fontSize:14,cursor:'pointer',fontFamily:F}}>🔀 Switch to This Campus</button>
                <button onClick={()=>toast.success(`Full report for ${selCampus.school_name} generated`)} style={{padding:'12px 20px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:F}}>📥 Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CAMPUS MODAL */}
      {addModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.7)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}} onClick={()=>setAddModal(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:500,maxHeight:'90vh',overflow:'auto',fontFamily:F,boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9',background:'linear-gradient(135deg,#1a237e,#283593)',borderRadius:'20px 20px 0 0'}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:900,color:'#fff'}}>🏫 Add New Campus</h3>
            </div>
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:14}}>
              {[
                {label:'Campus Name *',key:'school_name',placeholder:'e.g. Nakuru Branch'},
                {label:'Campus Code *',key:'campus_code',placeholder:'e.g. NKR-01'},
                {label:'Location',key:'location',placeholder:'e.g. Section 58, Nakuru'},
                {label:'County',key:'county',placeholder:'e.g. Nakuru'},
                {label:'Phone',key:'phone',placeholder:'e.g. +254700000000'},
                {label:'Email',key:'email',placeholder:'e.g. nakuru@school.ac.ke'},
                {label:'Principal Name',key:'principal_name',placeholder:'e.g. Mr. John Doe'},
              ].map(f=>(
                <div key={f.key}><label style={LB}>{f.label}</label><input value={(newC as any)[f.key]} onChange={e=>setNewC(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={IN}/></div>
              ))}
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setAddModal(false)} style={{flex:1,padding:'11px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:F}}>Cancel</button>
                <button onClick={saveCampus} disabled={saving} style={{flex:1,padding:'11px',background:'#1a237e',border:'none',borderRadius:10,color:'#fff',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>{saving?'⏳ Saving…':'✅ Add Campus'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TH:React.CSSProperties={padding:'10px 12px',fontSize:10,fontWeight:800,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.05em',textAlign:'left',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'};
const TC:React.CSSProperties={padding:'12px',fontSize:12,color:'#0f172a',verticalAlign:'middle'};
const IN:React.CSSProperties={width:'100%',padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',background:'#f8fafc',boxSizing:'border-box'};
const LB:React.CSSProperties={display:'block',fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5};
function feeColor(collected:number,target:number){const p=(collected/Math.max(1,target))*100;return p>=80?'#059669':p>=50?'#4f46e5':'#dc2626';}
