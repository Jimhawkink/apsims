'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { processStudentAllMarks, computeKNECMeanGrade, getSubjectGrade, vsNational, GRADE_ORDER } from '@/lib/knec-grading';
import { FiPrinter, FiDownload, FiRefreshCw, FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiUsers, FiBook } from 'react-icons/fi';

export default function PrincipalReportPage() {
    const [data, setData] = useState<any>({});
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [school, setSchool] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, mRes, gRes, tRes, fRes, stRes, schRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status','Active'),
            supabase.from('school_subjects').select('*').eq('is_active',true),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points',{ascending:false}),
            supabase.from('school_terms').select('*').order('id',{ascending:false}),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*'),
            supabase.from('school_settings').select('*').limit(1).maybeSingle(),
        ]);
        const cur = (tRes.data||[]).find((t:any)=>t.is_current);
        if(cur) setSelTerm(String(cur.id));
        setTerms(tRes.data||[]); setForms(fRes.data||[]);
        setSchool(schRes.data||{});
        setData({ students: sRes.data||[], subjects: subRes.data||[], marks: mRes.data||[], grading: gRes.data||[], streams: stRes.data||[] });
        setLoading(false);
    }, []);

    useEffect(()=>{load();},[load]);

    const report = useMemo(()=>{
        if(!data.students||!selTerm) return null;
        const { students, subjects, marks, grading, streams } = data;
        const termMarks = marks.filter((m:any)=>String(m.term_id)===selTerm && (!selForm||String(students.find((s:any)=>s.id===m.student_id)?.form_id)===selForm));
        const termStudents = students.filter((s:any)=>!selForm||String(s.form_id)===selForm);

        // Per-student results with CORRECT KNEC mean grade
        const studentResults = termStudents.map((student:any)=>{
            const sm = termMarks.filter((m:any)=>m.student_id===student.id);
            if(!sm.length) return null;
            const processed = processStudentAllMarks(sm, subjects, grading);
            const mean = computeKNECMeanGrade(processed);
            const avg = processed.reduce((a:number,r:any)=>a+r.score,0)/(processed.length||1);
            return { student, processed, mean, avg };
        }).filter(Boolean) as any[];

        // School overview
        const allScores = termMarks.map((m:any)=>Number(m.score));
        const schoolAvg = allScores.length ? allScores.reduce((a:number,b:number)=>a+b,0)/allScores.length : 0;
        const passCount = allScores.filter((s:number)=>s>=50).length;
        const aCount = allScores.filter((s:number)=>s>=75).length;
        const eCount = allScores.filter((s:number)=>s<25).length;

        // Grade distribution
        const gradeDist: Record<string,number> = {};
        GRADE_ORDER.forEach(g=>{gradeDist[g]=0;});
        studentResults.forEach((r:any)=>{ if(r.mean.meanGrade) gradeDist[r.mean.meanGrade]=(gradeDist[r.mean.meanGrade]||0)+1; });

        // Subject analysis with vs national
        const subjectStats = subjects.map((sub:any)=>{
            const sm = termMarks.filter((m:any)=>m.subject_id===sub.id);
            if(!sm.length) return null;
            const scores = sm.map((m:any)=>Number(m.score));
            const avg = scores.reduce((a:number,b:number)=>a+b,0)/scores.length;
            const pass = scores.filter((s:number)=>s>=50).length;
            const national = vsNational(sub.subject_name, avg);
            return { ...sub, avg, passRate:(pass/scores.length)*100, count:scores.length, national, grade: getSubjectGrade(avg,grading) };
        }).filter(Boolean).sort((a:any,b:any)=>b.avg-a.avg) as any[];

        // Top 10 students by mean grade
        const topStudents = [...studentResults].sort((a:any,b:any)=>{
            const ai = GRADE_ORDER.indexOf(a.mean.meanGrade), bi = GRADE_ORDER.indexOf(b.mean.meanGrade);
            return ai-bi || b.mean.totalPoints-a.mean.totalPoints;
        }).slice(0,10);

        // At-risk students
        const atRisk = studentResults.filter((r:any)=>r.avg<40||GRADE_ORDER.indexOf(r.mean.meanGrade)>=8).slice(0,10);

        // Form breakdown
        const formStats = forms.map((form:any)=>{
            const fs = termStudents.filter((s:any)=>s.form_id===form.id);
            const fm = termMarks.filter((m:any)=>fs.some((s:any)=>s.id===m.student_id));
            if(!fm.length) return null;
            const scores = fm.map((m:any)=>Number(m.score));
            const avg = scores.reduce((a:number,b:number)=>a+b,0)/scores.length;
            const pass = scores.filter((s:number)=>s>=50).length;
            return { form, avg, passRate:(pass/scores.length)*100, count:fs.length, grade:getSubjectGrade(avg,grading) };
        }).filter(Boolean) as any[];

        // Stream breakdown
        const streamStats = streams.map((stream:any)=>{
            const ss = termStudents.filter((s:any)=>s.stream_id===stream.id&&(!selForm||String(s.form_id)===selForm));
            const sm2 = termMarks.filter((m:any)=>ss.some((s:any)=>s.id===m.student_id));
            if(!sm2.length) return null;
            const scores = sm2.map((m:any)=>Number(m.score));
            const avg = scores.reduce((a:number,b:number)=>a+b,0)/scores.length;
            const pass = scores.filter((s:number)=>s>=50).length;
            return { stream, avg, passRate:(pass/scores.length)*100, count:ss.length };
        }).filter(Boolean).sort((a:any,b:any)=>b.avg-a.avg) as any[];

        return { schoolAvg, passCount, passRate:(passCount/Math.max(allScores.length,1))*100, aCount, eCount, gradeDist, subjectStats, topStudents, atRisk, formStats, streamStats, totalStudents:termStudents.length, totalEntries:allScores.length };
    }, [data, selTerm, selForm, forms, subjects]);

    const termName = terms.find(t=>String(t.id)===selTerm)?.term_name||'';
    const formName = selForm ? forms.find(f=>String(f.id)===selForm)?.form_name||'' : 'All Forms';
    const gc = (g:string)=>({A:'#059669','A-':'#10b981','B+':'#0ea5e9',B:'#3b82f6','B-':'#6366f1','C+':'#8b5cf6',C:'#a78bfa','C-':'#f59e0b','D+':'#f97316',D:'#ef4444','D-':'#dc2626',E:'#991b1b'}[g]||'#94a3b8');

    if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"/></div>;

    return (
        <div style={{minHeight:'100vh',background:'#f8fafc',padding:'24px'}}>
            {/* Controls */}
            <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:20,flexWrap:'wrap'}}>
                <div style={{fontWeight:900,fontSize:20,color:'#1e293b',flex:1}}>📋 Principal&apos;s Academic Report</div>
                <select value={selTerm} onChange={e=>setSelTerm(e.target.value)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,fontWeight:700}}>
                    {terms.map((t:any)=><option key={t.id} value={t.id}>{t.term_name}</option>)}
                </select>
                <select value={selForm} onChange={e=>setSelForm(e.target.value)} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,fontWeight:700}}>
                    <option value="">All Forms</option>
                    {forms.map((f:any)=><option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',fontSize:13}}>
                    <FiPrinter size={15}/> Print Report
                </button>
            </div>

            {/* PRINTABLE REPORT AREA */}
            <div id="principal-report" style={{background:'#fff',borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,0.10)',overflow:'hidden'}}>
                {/* Official Header */}
                <div style={{background:'linear-gradient(135deg,#1e3a5f,#2563eb)',padding:'32px 40px',color:'#fff',textAlign:'center'}}>
                    <div style={{fontSize:11,letterSpacing:3,opacity:0.8,marginBottom:4}}>REPUBLIC OF KENYA — MINISTRY OF EDUCATION</div>
                    <div style={{fontSize:26,fontWeight:900,marginBottom:4}}>{school.school_name||'SCHOOL NAME'}</div>
                    <div style={{fontSize:13,opacity:0.85}}>{school.school_address||'P.O. Box — County, Kenya'} · Tel: {school.phone||'—'}</div>
                    <div style={{marginTop:16,fontSize:18,fontWeight:700,background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'8px 24px',display:'inline-block'}}>
                        END-OF-TERM ACADEMIC PERFORMANCE REPORT
                    </div>
                    <div style={{marginTop:8,fontSize:14,opacity:0.9}}>{termName} · {formName}</div>
                </div>

                {report && (<>
                {/* Executive Summary */}
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>I. EXECUTIVE SUMMARY</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:16}}>
                        {[
                            { label:'Total Candidates', value:report.totalStudents, color:'#2563eb' },
                            { label:'School Average', value:`${report.schoolAvg.toFixed(1)}%`, color:'#7c3aed' },
                            { label:'Pass Rate (≥50%)', value:`${report.passRate.toFixed(1)}%`, color:'#059669' },
                            { label:'A Grade Entries', value:report.aCount, color:'#065f46' },
                            { label:'E Grade Entries', value:report.eCount, color:'#dc2626' },
                        ].map((s,i)=>(
                            <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:10,padding:'16px 8px',border:'1px solid #e2e8f0'}}>
                                <div style={{fontSize:22,fontWeight:900,color:s.color}}>{s.value}</div>
                                <div style={{fontSize:11,color:'#64748b',marginTop:4}}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grade Distribution */}
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>II. GRADE DISTRIBUTION (KNEC MEAN GRADES)</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {GRADE_ORDER.map(g=>{
                            const cnt = report.gradeDist[g]||0;
                            const pct = report.totalStudents>0 ? (cnt/report.totalStudents*100).toFixed(1) : '0.0';
                            return (
                                <div key={g} style={{textAlign:'center',minWidth:60}}>
                                    <div style={{height:60,background:'#f1f5f9',borderRadius:'8px 8px 0 0',display:'flex',alignItems:'flex-end',justifyContent:'center',overflow:'hidden'}}>
                                        <div style={{width:'100%',background:gc(g),height:`${Math.max(4,(cnt/(report.totalStudents||1))*100)}%`,transition:'height 0.3s'}}/>
                                    </div>
                                    <div style={{background:gc(g),color:'#fff',fontWeight:900,fontSize:13,padding:'3px 0',borderRadius:'0 0 8px 8px'}}>{g}</div>
                                    <div style={{fontSize:12,fontWeight:700,color:'#1e293b',marginTop:4}}>{cnt}</div>
                                    <div style={{fontSize:10,color:'#94a3b8'}}>{pct}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Subject Performance Table */}
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>III. SUBJECT PERFORMANCE ANALYSIS</div>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                        <thead>
                            <tr style={{background:'#1e3a5f',color:'#fff'}}>
                                {['#','Subject','Entries','School Avg','Grade','Pass Rate','National Avg','Gap','Status'].map(h=>(
                                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,letterSpacing:0.5}}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {report.subjectStats.map((sub:any,i:number)=>(
                                <tr key={sub.id} style={{background:i%2===0?'#fff':'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
                                    <td style={{padding:'8px 12px',color:'#94a3b8',fontSize:11}}>{i+1}</td>
                                    <td style={{padding:'8px 12px',fontWeight:700,color:'#1e293b'}}>{sub.subject_name}</td>
                                    <td style={{padding:'8px 12px',color:'#64748b'}}>{sub.count}</td>
                                    <td style={{padding:'8px 12px',fontWeight:700}}>{sub.avg.toFixed(1)}%</td>
                                    <td style={{padding:'8px 12px'}}>
                                        <span style={{background:gc(sub.grade.grade),color:'#fff',fontWeight:900,fontSize:11,padding:'2px 8px',borderRadius:5}}>{sub.grade.grade}</span>
                                    </td>
                                    <td style={{padding:'8px 12px',color:sub.passRate>=50?'#059669':'#dc2626',fontWeight:700}}>{sub.passRate.toFixed(1)}%</td>
                                    <td style={{padding:'8px 12px',color:'#64748b'}}>{sub.national.national}%</td>
                                    <td style={{padding:'8px 12px'}}>
                                        <span style={{color:sub.national.above?'#059669':'#dc2626',fontWeight:700}}>
                                            {sub.national.above?'+':''}{sub.national.gap}%
                                        </span>
                                    </td>
                                    <td style={{padding:'8px 12px'}}>
                                        <span style={{fontSize:11,fontWeight:700,color:sub.national.above?'#059669':'#dc2626'}}>
                                            {sub.national.above?'▲ Above':'▼ Below'} National
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Form Breakdown */}
                {report.formStats.length>1 && (
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>IV. FORM-BY-FORM PERFORMANCE</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                        {report.formStats.map((fs:any)=>(
                            <div key={fs.form.id} style={{background:'#f8fafc',borderRadius:10,padding:16,border:'1px solid #e2e8f0',textAlign:'center'}}>
                                <div style={{fontSize:14,fontWeight:900,color:'#1e293b'}}>{fs.form.form_name}</div>
                                <div style={{fontSize:22,fontWeight:900,color:'#2563eb',marginTop:6}}>{fs.avg.toFixed(1)}%</div>
                                <div style={{marginTop:4}}>
                                    <span style={{background:gc(fs.grade.grade),color:'#fff',fontWeight:900,fontSize:12,padding:'2px 10px',borderRadius:6}}>{fs.grade.grade}</span>
                                </div>
                                <div style={{fontSize:12,color:'#64748b',marginTop:6}}>Pass: {fs.passRate.toFixed(1)}% · {fs.count} students</div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* Stream Comparison */}
                {report.streamStats.length>1 && (
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>V. STREAM COMPARISON</div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                        {report.streamStats.map((ss:any,i:number)=>(
                            <div key={ss.stream.id} style={{background:i===0?'#eff6ff':'#f8fafc',border:i===0?'2px solid #3b82f6':'1px solid #e2e8f0',borderRadius:10,padding:'12px 20px',minWidth:140,textAlign:'center'}}>
                                {i===0&&<div style={{fontSize:10,color:'#2563eb',fontWeight:800,letterSpacing:1,marginBottom:4}}>🏆 TOP STREAM</div>}
                                <div style={{fontWeight:800,color:'#1e293b'}}>{ss.stream.stream_name}</div>
                                <div style={{fontSize:18,fontWeight:900,color:i===0?'#2563eb':'#475569'}}>{ss.avg.toFixed(1)}%</div>
                                <div style={{fontSize:11,color:'#64748b'}}>Pass {ss.passRate.toFixed(0)}% · {ss.count} students</div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* Top 10 Students */}
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>VI. TOP 10 STUDENTS (BY KNEC MEAN GRADE)</div>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                        <thead>
                            <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                                {['Rank','Student Name','Adm No','Mean Grade','Points','Average Score'].map(h=>(
                                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'#64748b',letterSpacing:0.5}}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {report.topStudents.map((r:any,i:number)=>(
                                <tr key={r.student.id} style={{borderBottom:'1px solid #f1f5f9',background:i===0?'#fefce8':'#fff'}}>
                                    <td style={{padding:'8px 12px',fontWeight:900,color:i===0?'#d97706':'#64748b'}}>
                                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                                    </td>
                                    <td style={{padding:'8px 12px',fontWeight:700,color:'#1e293b'}}>{r.student.first_name} {r.student.last_name}</td>
                                    <td style={{padding:'8px 12px',color:'#64748b',fontSize:12}}>{r.student.admission_number||r.student.admission_no}</td>
                                    <td style={{padding:'8px 12px'}}>
                                        <span style={{background:gc(r.mean.meanGrade),color:'#fff',fontWeight:900,fontSize:12,padding:'3px 10px',borderRadius:6}}>{r.mean.meanGrade}</span>
                                    </td>
                                    <td style={{padding:'8px 12px',fontWeight:700,color:'#7c3aed'}}>{r.mean.totalPoints}</td>
                                    <td style={{padding:'8px 12px',color:'#475569'}}>{r.avg.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* At-Risk Students */}
                {report.atRisk.length>0 && (
                <div style={{padding:'24px 40px',borderBottom:'2px solid #f1f5f9'}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#64748b',letterSpacing:1,marginBottom:16}}>VII. AT-RISK STUDENTS — URGENT INTERVENTION REQUIRED</div>
                    <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#991b1b',fontWeight:700}}>
                        ⚠️ The following {report.atRisk.length} students require immediate HOD and Counsellor attention
                    </div>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                        <thead>
                            <tr style={{background:'#fef2f2',borderBottom:'1px solid #fca5a5'}}>
                                {['Student','Adm No','Mean Grade','Average','Action Required'].map(h=>(
                                    <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'#991b1b'}}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {report.atRisk.map((r:any)=>(
                                <tr key={r.student.id} style={{borderBottom:'1px solid #fee2e2'}}>
                                    <td style={{padding:'8px 12px',fontWeight:700}}>{r.student.first_name} {r.student.last_name}</td>
                                    <td style={{padding:'8px 12px',color:'#64748b',fontSize:12}}>{r.student.admission_number||r.student.admission_no}</td>
                                    <td style={{padding:'8px 12px'}}>
                                        <span style={{background:gc(r.mean.meanGrade),color:'#fff',fontWeight:900,fontSize:12,padding:'2px 8px',borderRadius:5}}>{r.mean.meanGrade}</span>
                                    </td>
                                    <td style={{padding:'8px 12px',color:'#dc2626',fontWeight:700}}>{r.avg.toFixed(1)}%</td>
                                    <td style={{padding:'8px 12px',fontSize:12,color:'#dc2626'}}>Schedule parent meeting · Extra tuition</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}

                {/* Signature Block */}
                <div style={{padding:'32px 40px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:40}}>
                    {['Class Teacher','Head of Academics','Principal'].map(role=>(
                        <div key={role} style={{textAlign:'center'}}>
                            <div style={{borderTop:'2px solid #1e3a5f',paddingTop:8,marginTop:48}}>
                                <div style={{fontWeight:800,fontSize:12,color:'#1e3a5f'}}>{role}</div>
                                <div style={{fontSize:11,color:'#64748b'}}>Name: _______________________</div>
                                <div style={{fontSize:11,color:'#64748b'}}>Date: ________________________</div>
                                <div style={{fontSize:11,color:'#64748b'}}>Stamp: _______________________</div>
                            </div>
                        </div>
                    ))}
                </div>
                </>)}
            </div>
        </div>
    );
}
