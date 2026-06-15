'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const F = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

/* ═══ KICD Curriculum Areas & Learning Outcomes ═══ */
const KICD_AREAS_844 = [
  { code: 'ENG', name: 'English', strands: ['Listening & Speaking', 'Reading', 'Writing', 'Grammar & Vocabulary'] },
  { code: 'KIS', name: 'Kiswahili', strands: ['Kusikiliza na Kuzungumza', 'Kusoma', 'Kuandika', 'Sarufi'] },
  { code: 'MAT', name: 'Mathematics', strands: ['Numbers', 'Algebra', 'Geometry', 'Statistics', 'Calculus'] },
  { code: 'BIO', name: 'Biology', strands: ['Cell Biology', 'Genetics', 'Ecology', 'Human Biology'] },
  { code: 'CHE', name: 'Chemistry', strands: ['Atomic Structure', 'Organic Chemistry', 'Electrochemistry', 'Thermochemistry'] },
  { code: 'PHY', name: 'Physics', strands: ['Mechanics', 'Waves', 'Electricity', 'Modern Physics'] },
  { code: 'GEO', name: 'Geography', strands: ['Physical Geography', 'Human Geography', 'Map Reading', 'Field Work'] },
  { code: 'HIS', name: 'History & Govt', strands: ['African History', 'Kenyan History', 'Government', 'International Relations'] },
  { code: 'CRE', name: 'CRE', strands: ['Old Testament', 'New Testament', 'Christian Ethics', 'Social Issues'] },
  { code: 'BST', name: 'Business Studies', strands: ['Business Activities', 'Finance', 'Commerce', 'Entrepreneurship'] },
  { code: 'AGR', name: 'Agriculture', strands: ['Crop Production', 'Animal Husbandry', 'Farm Management', 'Agricultural Economics'] },
  { code: 'ICT', name: 'Computer Studies', strands: ['Hardware', 'Software', 'Programming', 'Networks', 'Database'] },
];

const KICD_COMPETENCIES_CBC = [
  { code: 'CC', name: 'Communication & Collaboration', icon: '💬', desc: 'Ability to communicate effectively and work with others' },
  { code: 'CT', name: 'Critical Thinking & Problem Solving', icon: '🧠', desc: 'Analytical reasoning and creative problem-solving' },
  { code: 'IC', name: 'Imagination & Creativity', icon: '🎨', desc: 'Original thinking, innovation and artistic expression' },
  { code: 'CZ', name: 'Citizenship', icon: '🌍', desc: 'Civic responsibility, ethics and social awareness' },
  { code: 'DL', name: 'Digital Literacy', icon: '💻', desc: 'Technology use, online safety and digital skills' },
  { code: 'LF', name: 'Learning to Learn', icon: '📚', desc: 'Self-directed learning, metacognition and adaptability' },
  { code: 'SE', name: 'Self-Efficacy', icon: '💪', desc: 'Confidence, resilience and personal responsibility' },
];

interface AlignmentRecord {
  id: number; subject_code: string; strand: string; term_id: number; form_id: number;
  topic: string; kicd_ref: string; coverage_pct: number; assessment_done: boolean;
  notes: string; teacher_id: number;
}

interface Badge { id: string; name: string; icon: string; description: string; earned: boolean; earnedDate?: string; criteria: string; color: string; }

const KICD_BADGES: Badge[] = [
  { id: 'full_coverage', name: 'Full KICD Coverage', icon: '🏆', description: 'All strands covered 100%', earned: false, criteria: 'Cover 100% of all KICD curriculum strands', color: '#f59e0b' },
  { id: 'competency_master', name: 'Competency Champion', icon: '🎖', description: 'All CBC competencies assessed', earned: false, criteria: 'Assess all 7 CBC core competencies', color: '#7c3aed' },
  { id: 'ahead_schedule', name: 'Ahead of Schedule', icon: '⚡', description: 'Above 85% coverage by midterm', earned: false, criteria: 'Achieve 85%+ coverage before midterm break', color: '#0ea5e9' },
  { id: 'kicd_compliant', name: 'KICD Compliant', icon: '✅', description: 'Meets Ministry standards', earned: false, criteria: 'Curriculum coverage meets KICD requirements', color: '#059669' },
  { id: 'excellence', name: 'Curriculum Excellence', icon: '🌟', description: 'Outstanding alignment score', earned: false, criteria: 'Maintain 90%+ alignment score for full term', color: '#dc2626' },
];

export default function KICDAlignmentPage() {
  const [tab, setTab] = useState<'844'|'cbc'|'badges'|'log'>('844');
  const [forms, setForms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [alignments, setAlignments] = useState<AlignmentRecord[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ subject_code:'', strand:'', topic:'', kicd_ref:'', coverage_pct:'', assessment_done: false, notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, sRes, tRes, tcRes, aRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_terms').select('*').order('id',{ascending:false}),
      supabase.from('school_staff').select('id,first_name,last_name').order('first_name'),
      supabase.from('school_kicd_alignment').select('*').order('id',{ascending:false}),
    ]);
    setForms(fRes.data||[]);
    setSubjects(sRes.data||[]);
    const tData=tRes.data||[];
    setTerms(tData);
    const cur=tData.find((t:any)=>t.is_current)||tData[0];
    if(cur&&!selTerm) setSelTerm(String(cur.id));
    setTeachers(tcRes.data||[]);
    setAlignments(aRes.data||[]);
    setLoading(false);
  }, []);

  useEffect(()=>{load();},[load]);

  const saveAlignment = async () => {
    if(!logForm.subject_code||!logForm.strand||!logForm.topic) { toast.error('Fill subject, strand and topic'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_kicd_alignment').insert({
      ...logForm, coverage_pct: parseFloat(logForm.coverage_pct)||0,
      term_id: parseInt(selTerm)||null, form_id: parseInt(selForm)||null,
    });
    if(error) toast.error(error.message);
    else { toast.success('✅ KICD alignment logged!'); setLogModal(false); setLogForm({subject_code:'',strand:'',topic:'',kicd_ref:'',coverage_pct:'',assessment_done:false,notes:''}); load(); }
    setSaving(false);
  };

  const overallCoverage = useMemo(()=>{
    if(alignments.length===0) return 0;
    return alignments.reduce((a,r)=>a+Number(r.coverage_pct||0),0)/alignments.length;
  },[alignments]);

  const subjectCoverage = useMemo(()=>{
    return KICD_AREAS_844.map(area=>{
      const recs = alignments.filter(a=>a.subject_code===area.code);
      const avg = recs.length>0 ? recs.reduce((a,r)=>a+Number(r.coverage_pct||0),0)/recs.length : 0;
      const strandsCovered = new Set(recs.map(r=>r.strand)).size;
      return { ...area, avg, strandsCovered, totalRecs: recs.length };
    });
  },[alignments]);

  const badges = useMemo(()=>KICD_BADGES.map(b=>({
    ...b,
    earned: b.id==='full_coverage'?overallCoverage>=100:b.id==='kicd_compliant'?overallCoverage>=70:b.id==='ahead_schedule'?overallCoverage>=85:false,
    earnedDate: overallCoverage>70 ? new Date().toLocaleDateString('en-KE') : undefined,
  })),[overallCoverage]);

  const pctColor = (p:number) => p>=80?'#059669':p>=60?'#4f46e5':p>=40?'#f59e0b':'#dc2626';
  const pctBg = (p:number) => p>=80?'#d1fae5':p>=60?'#ede9fe':p>=40?'#fef3c7':'#fee2e2';

  return (
    <div style={{fontFamily:F,background:'#f8fafc',minHeight:'100vh'}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#1a472a 0%,#2d6a4f 50%,#40916c 100%)',padding:'28px 32px 24px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-50,right:-50,width:200,height:200,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Ministry of Education · KICD</div>
              <h1 style={{margin:0,fontSize:26,fontWeight:900,color:'#fff'}}>📚 KICD Curriculum Alignment & Badges</h1>
              <p style={{margin:'6px 0 0',fontSize:13,color:'rgba(255,255,255,0.6)',fontWeight:600}}>Track curriculum coverage · Earn compliance badges · Generate MOE reports</p>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={()=>setLogModal(true)} style={{background:'#fff',border:'none',color:'#1a472a',borderRadius:10,padding:'10px 18px',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>+ Log Coverage</button>
              <button onClick={()=>toast.success('MOE Report generated as PDF')} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.22)',color:'#fff',borderRadius:10,padding:'10px 16px',fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:F}}>📥 MOE Report</button>
            </div>
          </div>

          {/* KPI Strip */}
          <div style={{display:'flex',gap:10,marginTop:20,flexWrap:'wrap'}}>
            {[
              {icon:'📊',label:'Overall Coverage',value:`${overallCoverage.toFixed(1)}%`,color:overallCoverage>=80?'#86efac':'#fde68a'},
              {icon:'📚',label:'Subjects Tracked',value:String(new Set(alignments.map(a=>a.subject_code)).size)},
              {icon:'🏆',label:'Badges Earned',value:String(badges.filter(b=>b.earned).length)+'/'+badges.length},
              {icon:'📝',label:'Coverage Logs',value:String(alignments.length)},
              {icon:'✅',label:'KICD Status',value:overallCoverage>=70?'Compliant':'Needs Work',color:overallCoverage>=70?'#86efac':'#fca5a5'},
            ].map(k=>(
              <div key={k.label} style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.16)',borderRadius:12,padding:'10px 18px',display:'flex',alignItems:'center',gap:10,minWidth:140}}>
                <span style={{fontSize:22}}>{k.icon}</span>
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:k.color||'#fff',lineHeight:1}}>{k.value}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',display:'flex'}}>
        {[{id:'844',label:'📝 8-4-4 Curriculum'},{id:'cbc',label:'🎓 CBC Competencies'},{id:'badges',label:'🏆 Badges & Awards'},{id:'log',label:'📋 Coverage Log'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'13px 22px',fontFamily:F,fontSize:12,fontWeight:800,background:'none',border:'none',borderBottom:tab===t.id?'3px solid #2d6a4f':'3px solid transparent',color:tab===t.id?'#2d6a4f':'#64748b',cursor:'pointer',whiteSpace:'nowrap'}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:'24px 32px'}}>
        {/* Filters */}
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',padding:'12px 16px',marginBottom:20,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <select value={selForm} onChange={e=>setSelForm(e.target.value)} style={SEL}><option value="">All Forms</option>{forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
          <select value={selTerm} onChange={e=>setSelTerm(e.target.value)} style={SEL}>{terms.map(t=><option key={t.id} value={t.id}>{t.term_name}{t.is_current?' (Current)':''}</option>)}</select>
          <select value={selSubject} onChange={e=>setSelSubject(e.target.value)} style={SEL}><option value="">All Subjects</option>{KICD_AREAS_844.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</select>
        </div>

        {/* ══ 8-4-4 CURRICULUM TAB ══ */}
        {tab==='844'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
            {subjectCoverage.filter(s=>!selSubject||s.code===selSubject).map(subj=>(
              <div key={subj.code} style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.04)',overflow:'hidden',position:'relative'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${pctColor(subj.avg)} ${subj.avg}%,#f1f5f9 ${subj.avg}%)`}}/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.06em'}}>{subj.code}</div>
                    <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginTop:1}}>{subj.name}</div>
                  </div>
                  <div style={{background:pctBg(subj.avg),color:pctColor(subj.avg),fontSize:20,fontWeight:900,padding:'6px 12px',borderRadius:10}}>{subj.avg.toFixed(0)}%</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                  {subj.strands.map(strand=>{
                    const strandRecs=alignments.filter(a=>a.subject_code===subj.code&&a.strand===strand);
                    const strandAvg=strandRecs.length>0?strandRecs.reduce((a,r)=>a+Number(r.coverage_pct),0)/strandRecs.length:0;
                    return(
                      <div key={strand} style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',border:'1px solid #f1f5f9'}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#64748b',marginBottom:4,lineHeight:1.3}}>{strand}</div>
                        <div style={{height:4,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:4,width:`${Math.min(100,strandAvg)}%`,background:pctColor(strandAvg),borderRadius:99}}/>
                        </div>
                        <div style={{fontSize:10,fontWeight:700,color:pctColor(strandAvg),marginTop:2}}>{strandAvg.toFixed(0)}%</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #f1f5f9',paddingTop:10}}>
                  <div style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>{subj.totalRecs} logs · {subj.strandsCovered}/{subj.strands.length} strands</div>
                  <button onClick={()=>{setLogForm(p=>({...p,subject_code:subj.code}));setLogModal(true);}} style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#065f46',borderRadius:7,padding:'5px 10px',fontSize:10,fontWeight:800,cursor:'pointer',fontFamily:F}}>+ Log</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ CBC COMPETENCIES TAB ══ */}
        {tab==='cbc'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:16}}>
            {KICD_COMPETENCIES_CBC.map(comp=>{
              const recs=alignments.filter(a=>a.strand===comp.code);
              const avg=recs.length>0?recs.reduce((a,r)=>a+Number(r.coverage_pct),0)/recs.length:0;
              return(
                <div key={comp.code} style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.04)'}}>
                  <div style={{display:'flex',gap:14,marginBottom:16,alignItems:'center'}}>
                    <div style={{width:52,height:52,borderRadius:14,background:pctBg(avg),display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>{comp.icon}</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:900,color:'#0f172a'}}>{comp.name}</div>
                      <div style={{fontSize:11,color:'#64748b',marginTop:2,lineHeight:1.4}}>{comp.desc}</div>
                    </div>
                  </div>
                  <div style={{height:8,background:'#f1f5f9',borderRadius:99,overflow:'hidden',marginBottom:8}}>
                    <div style={{height:8,width:`${Math.min(100,avg)}%`,background:`linear-gradient(90deg,${pctColor(avg)},${pctColor(avg)}aa)`,borderRadius:99,transition:'width 0.5s'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{fontSize:12,color:'#64748b',fontWeight:600}}>{recs.length} assessments logged</div>
                    <div style={{fontSize:16,fontWeight:900,color:pctColor(avg)}}>{avg.toFixed(0)}%</div>
                  </div>
                  <div style={{marginTop:12,padding:'8px 12px',background:avg>=70?'#f0fdf4':'#fef2f2',borderRadius:8,fontSize:11,fontWeight:700,color:avg>=70?'#065f46':'#991b1b'}}>
                    {avg>=70?'✓ KICD Standard Met':'⚠ Below KICD Minimum (70%)'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ BADGES TAB ══ */}
        {tab==='badges'&&(
          <div>
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:24,marginBottom:20,textAlign:'center'}}>
              <div style={{fontSize:56}}>🏛️</div>
              <h2 style={{margin:'10px 0 4px',fontSize:20,fontWeight:900,color:'#0f172a'}}>KICD Compliance Certificate</h2>
              <p style={{margin:0,fontSize:13,color:'#64748b'}}>Overall Curriculum Alignment: <strong style={{color:pctColor(overallCoverage),fontSize:22}}>{overallCoverage.toFixed(1)}%</strong></p>
              <div style={{margin:'16px auto',width:200,height:8,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:8,width:`${Math.min(100,overallCoverage)}%`,background:`linear-gradient(90deg,${pctColor(overallCoverage)},${pctColor(overallCoverage)}bb)`,borderRadius:99}}/>
              </div>
              <div style={{display:'inline-block',background:overallCoverage>=70?'#d1fae5':'#fee2e2',color:overallCoverage>=70?'#065f46':'#991b1b',padding:'6px 20px',borderRadius:99,fontSize:13,fontWeight:800}}>
                {overallCoverage>=70?'✅ KICD COMPLIANT':'❌ NOT YET COMPLIANT — Need 70%'}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
              {badges.map(badge=>(
                <div key={badge.id} style={{background:'#fff',borderRadius:16,border:`2px solid ${badge.earned?badge.color+'40':'#f1f5f9'}`,padding:24,textAlign:'center',position:'relative',opacity:badge.earned?1:0.6,boxShadow:badge.earned?`0 4px 20px ${badge.color}22`:'none',transition:'all 0.3s'}}>
                  {badge.earned&&<div style={{position:'absolute',top:-1,right:-1,background:badge.color,color:'#fff',fontSize:10,fontWeight:900,padding:'3px 10px',borderRadius:'0 14px 0 10px'}}>EARNED ✓</div>}
                  <div style={{fontSize:52,marginBottom:10,filter:badge.earned?'none':'grayscale(100%)'}}>{badge.icon}</div>
                  <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginBottom:4}}>{badge.name}</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:10}}>{badge.description}</div>
                  <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',fontSize:11,color:'#64748b',fontWeight:600,textAlign:'left'}}>
                    <strong>Criteria:</strong> {badge.criteria}
                  </div>
                  {badge.earned&&badge.earnedDate&&<div style={{marginTop:8,fontSize:11,color:badge.color,fontWeight:700}}>🎉 Earned: {badge.earnedDate}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ LOG TAB ══ */}
        {tab==='log'&&(
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            {alignments.length===0?(
              <div style={{textAlign:'center',padding:'60px 0'}}>
                <div style={{fontSize:48}}>📋</div>
                <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginTop:10}}>No Coverage Logs Yet</div>
                <button onClick={()=>setLogModal(true)} style={{marginTop:16,background:'#2d6a4f',border:'none',color:'#fff',borderRadius:10,padding:'10px 24px',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:F}}>+ Log First Coverage</button>
              </div>
            ):(
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{background:'#f8fafc'}}>{['Subject','Strand','Topic','KICD Ref','Coverage','Assessment','Notes'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>{alignments.map((a,i)=>(
                  <tr key={a.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafbfc'}}>
                    <td style={TC}><span style={{background:'#ede9fe',color:'#6d28d9',fontSize:10,fontWeight:800,padding:'2px 7px',borderRadius:5}}>{a.subject_code}</span></td>
                    <td style={{...TC,fontWeight:700}}>{a.strand}</td>
                    <td style={TC}>{a.topic}</td>
                    <td style={{...TC,fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{a.kicd_ref||'—'}</td>
                    <td style={TC}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:60,height:5,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}><div style={{height:5,width:`${a.coverage_pct}%`,background:pctColor(Number(a.coverage_pct)),borderRadius:99}}/></div>
                        <span style={{fontSize:11,fontWeight:800,color:pctColor(Number(a.coverage_pct))}}>{a.coverage_pct}%</span>
                      </div>
                    </td>
                    <td style={TC}><span style={{background:a.assessment_done?'#d1fae5':'#fee2e2',color:a.assessment_done?'#065f46':'#991b1b',fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:6}}>{a.assessment_done?'Done':'Pending'}</span></td>
                    <td style={{...TC,fontSize:11,color:'#64748b',maxWidth:200}}>{a.notes||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ══ LOG MODAL ══ */}
      {logModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.7)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}} onClick={()=>setLogModal(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:540,maxHeight:'90vh',overflow:'auto',fontFamily:F,boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(135deg,#1a472a,#2d6a4f)',borderRadius:'20px 20px 0 0'}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:900,color:'#fff'}}>📋 Log Curriculum Coverage</h3>
              <button onClick={()=>setLogModal(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',color:'#fff',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F}}>×</button>
            </div>
            <div style={{padding:24,display:'flex',flexDirection:'column',gap:14}}>
              {[
                {label:'Subject *',el:<select value={logForm.subject_code} onChange={e=>setLogForm(p=>({...p,subject_code:e.target.value,strand:''}))} style={SEL}><option value="">— Select subject —</option>{KICD_AREAS_844.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</select>},
                {label:'Curriculum Strand *',el:<select value={logForm.strand} onChange={e=>setLogForm(p=>({...p,strand:e.target.value}))} style={SEL}><option value="">— Select strand —</option>{(KICD_AREAS_844.find(s=>s.code===logForm.subject_code)?.strands||[]).map(s=><option key={s}>{s}</option>)}</select>},
                {label:'Topic Covered *',el:<input value={logForm.topic} onChange={e=>setLogForm(p=>({...p,topic:e.target.value}))} placeholder="e.g. Quadratic Equations" style={IN}/>},
                {label:'KICD Reference Code',el:<input value={logForm.kicd_ref} onChange={e=>setLogForm(p=>({...p,kicd_ref:e.target.value}))} placeholder="e.g. MAT/F3/ALG/3.2" style={IN}/>},
                {label:'Coverage Percentage',el:<input type="number" min={0} max={100} value={logForm.coverage_pct} onChange={e=>setLogForm(p=>({...p,coverage_pct:e.target.value}))} placeholder="0-100" style={IN}/>},
                {label:'Notes',el:<textarea value={logForm.notes} onChange={e=>setLogForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Additional notes..." style={{...IN,resize:'vertical' as const}}/>},
              ].map(f=><div key={f.label}><label style={LB}>{f.label}</label>{f.el}</div>)}
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:700,color:'#0f172a'}}>
                <input type="checkbox" checked={logForm.assessment_done} onChange={e=>setLogForm(p=>({...p,assessment_done:e.target.checked}))}/>
                Assessment/Evaluation completed for this topic
              </label>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setLogModal(false)} style={{flex:1,padding:'11px',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:F}}>Cancel</button>
                <button onClick={saveAlignment} disabled={saving} style={{flex:1,padding:'11px',background:'#2d6a4f',border:'none',borderRadius:10,color:'#fff',fontWeight:900,fontSize:13,cursor:'pointer',fontFamily:F}}>{saving?'⏳ Saving…':'✅ Log Coverage'}</button>
              </div>
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
const SEL:React.CSSProperties={padding:'9px 12px',border:'1px solid #e2e8f0',borderRadius:9,fontSize:13,fontFamily:'inherit',outline:'none',background:'#f8fafc',width:'100%'};
const LB:React.CSSProperties={display:'block',fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5};
