'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { computeWeightedMark, vsNational, getSubjectGrade, NATIONAL_AVG_2023, computeRiskScore } from '@/lib/knec-grading';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default function NationalReadinessPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, mRes, gRes, tRes, fRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status','Active'),
            supabase.from('school_subjects').select('*').eq('is_active',true),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points',{ascending:false}),
            supabase.from('school_terms').select('*').order('id',{ascending:false}),
            supabase.from('school_forms').select('*').order('form_level'),
        ]);
        setStudents(sRes.data||[]); setSubjects(subRes.data||[]);
        setMarks(mRes.data||[]); setGrading(gRes.data||[]);
        setTerms(tRes.data||[]); setForms(fRes.data||[]);
        const cur = (tRes.data||[]).find((t:any)=>t.is_current);
        if(cur) setSelTerm(String(cur.id));
        const f4 = (fRes.data||[]).find((f:any)=>f.form_level===4);
        if(f4) setSelForm(String(f4.id));
        setLoading(false);
    },[]);

    useEffect(()=>{load();},[load]);

    const analysis = useMemo(()=>{
        if(!subjects.length||!selTerm) return null;
        const termStudents = students.filter(s=>!selForm||String(s.form_id)===selForm);
        const termMarks = marks.filter(m=>String(m.term_id)===selTerm&&termStudents.some(s=>s.id===m.student_id));

        const subjectStats = subjects.map(sub=>{
            const sm = termMarks.filter(m=>m.subject_id===sub.id);
            if(!sm.length) return null;
            // Group by student and compute weighted mark
            const byStudent = new Map<number,any[]>();
            sm.forEach(m=>{ if(!byStudent.has(m.student_id)) byStudent.set(m.student_id,[]); byStudent.get(m.student_id)!.push(m); });
            const weightedScores: number[] = [];
            byStudent.forEach(sMarks=>{
                const w = computeWeightedMark(sMarks.map(m=>({examType:m.exam_type,score:m.score,outOf:m.out_of||100})));
                weightedScores.push(w);
            });
            const avg = weightedScores.reduce((a,b)=>a+b,0)/weightedScores.length;
            const nat = vsNational(sub.subject_name, avg);
            const grade = getSubjectGrade(avg, grading);
            const passRate = (weightedScores.filter(s=>s>=50).length/weightedScores.length)*100;
            const aRate = (weightedScores.filter(s=>s>=75).length/weightedScores.length)*100;
            const eRate = (weightedScores.filter(s=>s<25).length/weightedScores.length)*100;
            const readinessScore = Math.min(100, Math.round(
                (avg/100)*40 + (passRate/100)*30 + (nat.above?15:0) + (aRate/100)*15
            ));
            return { ...sub, avg, nat, grade, passRate, aRate, eRate, count:weightedScores.length, readinessScore };
        }).filter(Boolean).sort((a:any,b:any)=>b.readinessScore-a.readinessScore) as any[];

        const overallAvg = subjectStats.length ? subjectStats.reduce((a,s)=>a+s.avg,0)/subjectStats.length : 0;
        const nationalAvg = 50;
        const aboveNational = subjectStats.filter(s=>s.nat.above).length;
        const belowNational = subjectStats.filter(s=>!s.nat.above).length;
        const overallReadiness = subjectStats.length ? Math.round(subjectStats.reduce((a,s)=>a+s.readinessScore,0)/subjectStats.length) : 0;
        return { subjectStats, overallAvg, aboveNational, belowNational, overallReadiness, totalSubjects:subjectStats.length };
    },[subjects,marks,students,grading,selTerm,selForm]);

    if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"/></div>;

    const readColor = (r:number)=> r>=75?'#059669':r>=50?'#d97706':'#dc2626';
    const readLabel = (r:number)=> r>=75?'🟢 Ready':r>=50?'🟡 Approaching':'🔴 Not Ready';

    return (
        <div style={{minHeight:'100vh',background:'#f0f9ff',padding:24}}>
            <div style={{background:'linear-gradient(135deg,#065f46,#059669)',borderRadius:16,padding:'24px 32px',marginBottom:24,color:'#fff'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                    <div>
                        <h1 style={{fontSize:22,fontWeight:900,margin:0}}>🏅 National Exam Readiness Report</h1>
                        <p style={{margin:'4px 0 0',opacity:0.85,fontSize:13}}>School performance vs KNEC National Averages 2023 · CAT-weighted marks</p>
                    </div>
                    <div style={{display:'flex',gap:10}}>
                        <select value={selTerm} onChange={e=>setSelTerm(e.target.value)} style={{padding:'8px 14px',borderRadius:8,border:'none',background:'rgba(255,255,255,0.2)',color:'#fff',fontWeight:700,fontSize:13}}>
                            {terms.map((t:any)=><option key={t.id} value={t.id} style={{color:'#1e293b'}}>{t.term_name}</option>)}
                        </select>
                        <select value={selForm} onChange={e=>setSelForm(e.target.value)} style={{padding:'8px 14px',borderRadius:8,border:'none',background:'rgba(255,255,255,0.2)',color:'#fff',fontWeight:700,fontSize:13}}>
                            <option value="" style={{color:'#1e293b'}}>All Forms</option>
                            {forms.map((f:any)=><option key={f.id} value={f.id} style={{color:'#1e293b'}}>{f.form_name}</option>)}
                        </select>
                    </div>
                </div>
                {analysis && (
                    <div style={{display:'flex',gap:20,marginTop:20,flexWrap:'wrap'}}>
                        {[
                            {label:'Overall Readiness',value:`${analysis.overallReadiness}%`,sub:readLabel(analysis.overallReadiness)},
                            {label:'School Average',value:`${analysis.overallAvg.toFixed(1)}%`,sub:'CAT-weighted'},
                            {label:'Above National',value:`${analysis.aboveNational}`,sub:`of ${analysis.totalSubjects} subjects`},
                            {label:'Below National',value:`${analysis.belowNational}`,sub:'need improvement'},
                        ].map((s,i)=>(
                            <div key={i} style={{background:'rgba(255,255,255,0.15)',borderRadius:10,padding:'12px 20px',minWidth:140}}>
                                <div style={{fontSize:22,fontWeight:900}}>{s.value}</div>
                                <div style={{fontSize:12,fontWeight:700,opacity:0.9}}>{s.label}</div>
                                <div style={{fontSize:11,opacity:0.75}}>{s.sub}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {analysis && (<>
            {/* Readiness Gauge */}
            <div style={{background:'#fff',borderRadius:12,padding:24,marginBottom:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <div style={{fontWeight:800,fontSize:14,color:'#1e293b',marginBottom:16}}>Overall School Readiness Score</div>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                    <div style={{flex:1,background:'#f1f5f9',borderRadius:999,height:20,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${analysis.overallReadiness}%`,background:`linear-gradient(90deg,#dc2626,#d97706,#059669)`,borderRadius:999,transition:'width 1s ease'}}/>
                    </div>
                    <div style={{fontSize:24,fontWeight:900,color:readColor(analysis.overallReadiness),minWidth:60}}>{analysis.overallReadiness}%</div>
                    <div style={{fontSize:13,fontWeight:700,color:readColor(analysis.overallReadiness)}}>{readLabel(analysis.overallReadiness)}</div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#94a3b8',marginTop:4}}>
                    <span>0% — Not Ready</span><span>50% — Approaching</span><span>75%+ — Ready</span>
                </div>
            </div>

            {/* Subject Cards */}
            <div style={{display:'grid',gap:12}}>
                {analysis.subjectStats.map((sub:any,i:number)=>(
                    <div key={sub.id} style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',border:`1.5px solid ${sub.nat.above?'#86efac':'#fca5a5'}`}}>
                        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                            <div style={{fontSize:13,fontWeight:900,color:'#64748b',minWidth:28}}>#{i+1}</div>
                            <div style={{flex:1}}>
                                <div style={{fontWeight:800,fontSize:15,color:'#1e293b'}}>{sub.subject_name}</div>
                                <div style={{display:'flex',gap:12,marginTop:6,flexWrap:'wrap'}}>
                                    <span style={{fontSize:12,color:'#64748b'}}>School Avg: <strong style={{color:'#1e293b'}}>{sub.avg.toFixed(1)}%</strong></span>
                                    <span style={{fontSize:12,color:'#64748b'}}>National: <strong style={{color:'#64748b'}}>{sub.nat.national}%</strong></span>
                                    <span style={{fontSize:12,color:'#64748b'}}>Pass Rate: <strong style={{color:sub.passRate>=50?'#059669':'#dc2626'}}>{sub.passRate.toFixed(1)}%</strong></span>
                                    <span style={{fontSize:12,color:'#64748b'}}>A Rate: <strong style={{color:'#2563eb'}}>{sub.aRate.toFixed(1)}%</strong></span>
                                    <span style={{fontSize:12,color:'#64748b'}}>E Rate: <strong style={{color:'#dc2626'}}>{sub.eRate.toFixed(1)}%</strong></span>
                                </div>
                            </div>
                            {/* Gap indicator */}
                            <div style={{textAlign:'center',minWidth:80}}>
                                <div style={{fontSize:18,fontWeight:900,color:sub.nat.above?'#059669':'#dc2626'}}>
                                    {sub.nat.above?'+':''}{sub.nat.gap}%
                                </div>
                                <div style={{fontSize:11,color:'#64748b'}}>vs National</div>
                                <div style={{fontSize:11,fontWeight:700,color:sub.nat.above?'#059669':'#dc2626'}}>{sub.nat.above?'▲ Above':'▼ Below'}</div>
                            </div>
                            {/* Readiness score */}
                            <div style={{textAlign:'center',minWidth:90}}>
                                <div style={{fontSize:18,fontWeight:900,color:readColor(sub.readinessScore)}}>{sub.readinessScore}%</div>
                                <div style={{fontSize:11,color:'#64748b'}}>Readiness</div>
                                <div style={{fontSize:11,fontWeight:700,color:readColor(sub.readinessScore)}}>{readLabel(sub.readinessScore)}</div>
                            </div>
                            {/* Grade badge */}
                            <div style={{background:({A:'#059669','A-':'#10b981','B+':'#0ea5e9',B:'#3b82f6','B-':'#6366f1','C+':'#8b5cf6',C:'#a78bfa','C-':'#f59e0b','D+':'#f97316',D:'#ef4444','D-':'#dc2626',E:'#991b1b'} as any)[sub.grade.grade]||'#94a3b8',color:'#fff',borderRadius:8,padding:'6px 14px',fontWeight:900,fontSize:16}}>
                                {sub.grade.grade}
                            </div>
                        </div>
                        {/* Progress bar: School vs National */}
                        <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                            <div>
                                <div style={{fontSize:10,color:'#64748b',marginBottom:3}}>School Average</div>
                                <div style={{background:'#f1f5f9',borderRadius:999,height:8}}>
                                    <div style={{height:'100%',width:`${sub.avg}%`,background:'#3b82f6',borderRadius:999}}/>
                                </div>
                            </div>
                            <div>
                                <div style={{fontSize:10,color:'#64748b',marginBottom:3}}>National Average</div>
                                <div style={{background:'#f1f5f9',borderRadius:999,height:8}}>
                                    <div style={{height:'100%',width:`${sub.nat.national}%`,background:'#94a3b8',borderRadius:999}}/>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            </>)}
        </div>
    );
}
