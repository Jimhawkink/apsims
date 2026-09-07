'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { processStudentAllMarks, computeKNECMeanGrade, getSubjectGrade } from '@/lib/knec-grading';
import { FiSearch, FiPrinter, FiDownload, FiAward, FiTrendingUp } from 'react-icons/fi';
import { HiAcademicCap } from 'react-icons/hi2';

const GC = (g:string)=>({A:'#059669','A-':'#10b981','B+':'#0ea5e9',B:'#3b82f6','B-':'#6366f1','C+':'#8b5cf6',C:'#a78bfa','C-':'#f59e0b','D+':'#f97316',D:'#ef4444','D-':'#dc2626',E:'#991b1b'} as any)[g]||'#94a3b8';

export default function StudentPassportPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selStudent, setSelStudent] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [school, setSchool] = useState<any>({});

    const load = useCallback(async()=>{
        setLoading(true);
        const [sRes,subRes,mRes,gRes,tRes,fRes,schRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status','Active').order('first_name'),
            supabase.from('school_subjects').select('*').eq('is_active',true),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('points',{ascending:false}),
            supabase.from('school_terms').select('*').order('id',{ascending:false}),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_settings').select('*').limit(1).maybeSingle(),
        ]);
        setStudents(sRes.data||[]); setSubjects(subRes.data||[]);
        setMarks(mRes.data||[]); setGrading(gRes.data||[]);
        setTerms(tRes.data||[]); setForms(fRes.data||[]);
        setSchool(schRes.data||{});
        setLoading(false);
    },[]);

    useEffect(()=>{load();},[load]);

    const student = useMemo(()=>students.find(s=>String(s.id)===selStudent),[students,selStudent]);
    const filtered = useMemo(()=>students.filter(s=>
        !search||(s.first_name+' '+s.last_name).toLowerCase().includes(search.toLowerCase())||
        (s.admission_number||s.admission_no||'').includes(search)
    ),[students,search]);

    // Build complete academic history per term
    const history = useMemo(()=>{
        if(!student) return [];
        const studentMarks = marks.filter(m=>m.student_id===student.id);
        return [...terms].reverse().map(term=>{
            const tm = studentMarks.filter(m=>String(m.term_id)===String(term.id));
            if(!tm.length) return null;
            const processed = processStudentAllMarks(tm, subjects, grading);
            const mean = computeKNECMeanGrade(processed);
            const avg = processed.reduce((a:number,r:any)=>a+r.score,0)/(processed.length||1);
            const form = forms.find(f=>String(f.id)===String(student.form_id));
            return { term, processed, mean, avg, form };
        }).filter(Boolean) as any[];
    },[student,marks,subjects,grading,terms,forms]);

    // Overall best performance
    const bestTerm = useMemo(()=>history.length?history.reduce((a:any,b:any)=>b.mean.totalPoints>a.mean.totalPoints?b:a):null,[history]);
    const latestMean = history.length?history[history.length-1].mean:null;

    if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"/></div>;

    return (
        <div style={{minHeight:'100vh',background:'#f8fafc',padding:24}}>
            <div style={{display:'flex',gap:20}}>
                {/* Student selector */}
                <div style={{width:260,flexShrink:0}}>
                    <div style={{background:'#fff',borderRadius:12,padding:16,boxShadow:'0 2px 12px rgba(0,0,0,0.08)'}}>
                        <div style={{fontWeight:800,fontSize:13,color:'#1e293b',marginBottom:12}}>📚 Select Student</div>
                        <div style={{display:'flex',gap:8,background:'#f8fafc',borderRadius:8,padding:'6px 10px',marginBottom:12,border:'1px solid #e2e8f0'}}>
                            <FiSearch size={14} color="#94a3b8"/>
                            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or Adm No…" style={{border:'none',outline:'none',fontSize:12,flex:1,background:'transparent'}}/>
                        </div>
                        <div style={{maxHeight:600,overflowY:'auto'}}>
                            {filtered.map(s=>{
                                const isSel = String(s.id)===selStudent;
                                return <div key={s.id} onClick={()=>setSelStudent(String(s.id))} style={{padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:3,background:isSel?'#eff6ff':'transparent',border:isSel?'1.5px solid #3b82f6':'1.5px solid transparent'}}>
                                    <div style={{fontWeight:700,fontSize:12,color:isSel?'#2563eb':'#1e293b'}}>{s.first_name} {s.last_name}</div>
                                    <div style={{fontSize:10,color:'#94a3b8'}}>{s.admission_number||s.admission_no}</div>
                                </div>;
                            })}
                        </div>
                    </div>
                </div>

                {/* Passport */}
                <div style={{flex:1}}>
                    {student ? (
                        <div id="passport">
                            {/* Passport Header */}
                            <div style={{background:'linear-gradient(135deg,#1e3a5f,#7c3aed)',borderRadius:16,padding:'28px 36px',color:'#fff',marginBottom:20}}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:20}}>
                                        <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,border:'3px solid rgba(255,255,255,0.4)'}}>
                                            {student.first_name?.[0]}{student.last_name?.[0]}
                                        </div>
                                        <div>
                                            <div style={{fontSize:22,fontWeight:900}}>{student.first_name} {student.last_name}</div>
                                            <div style={{opacity:0.85,fontSize:13,marginTop:3}}>Adm: {student.admission_number||student.admission_no||'—'} · {forms.find(f=>f.id===student.form_id)?.form_name}</div>
                                            <div style={{opacity:0.75,fontSize:12}}>{school.school_name||'School'}</div>
                                        </div>
                                    </div>
                                    <div style={{display:'flex',gap:16,alignItems:'center'}}>
                                        {latestMean && <div style={{textAlign:'center',background:'rgba(255,255,255,0.15)',borderRadius:12,padding:'12px 20px'}}>
                                            <div style={{fontSize:30,fontWeight:900}}>{latestMean.meanGrade}</div>
                                            <div style={{fontSize:11,opacity:0.8}}>Current Mean</div>
                                        </div>}
                                        {bestTerm && <div style={{textAlign:'center',background:'rgba(255,255,255,0.15)',borderRadius:12,padding:'12px 20px'}}>
                                            <div style={{fontSize:30,fontWeight:900}}>{bestTerm.mean.totalPoints}</div>
                                            <div style={{fontSize:11,opacity:0.8}}>Best Points</div>
                                        </div>}
                                        <button onClick={()=>window.print()} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'10px 16px',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:13}}>
                                            <FiPrinter size={15}/> Print
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Term-by-term history */}
                            {history.map((h:any,hi:number)=>(
                                <div key={h.term.id} style={{background:'#fff',borderRadius:12,marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
                                    {/* Term header */}
                                    <div style={{background:hi===history.length-1?'#eff6ff':'#f8fafc',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #e2e8f0'}}>
                                        <div style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{h.term.term_name}</div>
                                        <div style={{display:'flex',gap:16,alignItems:'center'}}>
                                            <span style={{fontSize:12,color:'#64748b'}}>Average: <strong>{h.avg.toFixed(1)}%</strong></span>
                                            <span style={{fontSize:12,color:'#64748b'}}>Points: <strong style={{color:'#7c3aed'}}>{h.mean.totalPoints}</strong></span>
                                            <span style={{background:GC(h.mean.meanGrade),color:'#fff',fontWeight:900,fontSize:13,padding:'3px 12px',borderRadius:6}}>{h.mean.meanGrade}</span>
                                            {hi===history.length-1&&<span style={{fontSize:11,background:'#dbeafe',color:'#2563eb',padding:'2px 8px',borderRadius:6,fontWeight:700}}>Latest</span>}
                                            {h.mean.totalPoints===bestTerm?.mean.totalPoints&&<span style={{fontSize:11,background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:6,fontWeight:700}}>🏆 Best</span>}
                                        </div>
                                    </div>
                                    {/* Subject table */}
                                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                                        <thead>
                                            <tr style={{background:'#f8fafc'}}>
                                                {['Subject','CAT Avg','End Term','Weighted Score','Grade','Points','In Best 7?'].map(h=>(
                                                    <th key={h} style={{padding:'7px 12px',textAlign:'left',fontSize:10,color:'#64748b',fontWeight:700,letterSpacing:0.4}}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {h.processed.map((r:any,ri:number)=>{
                                                const inBest7 = h.mean.best7.some((b:any)=>b.subjectId===r.subjectId);
                                                return (
                                                    <tr key={r.subjectId} style={{borderBottom:'1px solid #f1f5f9',background:inBest7?'#fafffe':'#fff'}}>
                                                        <td style={{padding:'7px 12px',fontWeight:700,color:'#1e293b'}}>{r.subjectName}</td>
                                                        <td style={{padding:'7px 12px',color:'#64748b'}}>{r.catAvg!=null?`${r.catAvg.toFixed(1)}%`:'—'}</td>
                                                        <td style={{padding:'7px 12px',color:'#64748b'}}>{r.endTermScore!=null?`${r.endTermScore}%`:'—'}</td>
                                                        <td style={{padding:'7px 12px',fontWeight:700,color:'#1e293b'}}>{r.score.toFixed(1)}%</td>
                                                        <td style={{padding:'7px 12px'}}>
                                                            <span style={{background:GC(r.grade),color:'#fff',fontWeight:900,fontSize:11,padding:'2px 8px',borderRadius:5}}>{r.grade}</span>
                                                        </td>
                                                        <td style={{padding:'7px 12px',fontWeight:700,color:'#7c3aed'}}>{r.points}</td>
                                                        <td style={{padding:'7px 12px'}}>
                                                            {inBest7 ? <span style={{color:'#059669',fontWeight:700,fontSize:11}}>✅ Yes</span>
                                                                : <span style={{color:'#94a3b8',fontSize:11}}>No</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {/* Best 7 summary */}
                                    <div style={{padding:'8px 20px',background:'#f0fdf4',borderTop:'1px solid #bbf7d0',display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                                        <span style={{fontSize:11,fontWeight:700,color:'#166534'}}>Best 7:</span>
                                        {h.mean.best7.map((b:any)=>(
                                            <span key={b.subjectId} style={{fontSize:11,background:'#dcfce7',color:'#166534',padding:'2px 8px',borderRadius:5,fontWeight:600}}>{b.subjectName} ({b.grade}·{b.points}pts)</span>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Summary footer */}
                            {history.length>1 && (
                                <div style={{background:'linear-gradient(135deg,#1e3a5f,#7c3aed)',borderRadius:12,padding:24,color:'#fff',marginTop:8}}>
                                    <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>📊 Academic Journey Summary</div>
                                    <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                                        {history.map((h:any)=>(
                                            <div key={h.term.id} style={{textAlign:'center'}}>
                                                <div style={{fontSize:11,opacity:0.8,marginBottom:4}}>{h.term.term_name}</div>
                                                <div style={{fontSize:20,fontWeight:900,color:GC(h.mean.meanGrade)}}>{h.mean.meanGrade}</div>
                                                <div style={{fontSize:11,opacity:0.75}}>{h.avg.toFixed(0)}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{textAlign:'center',padding:80,color:'#94a3b8',background:'#fff',borderRadius:16,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                            <HiAcademicCap size={52} style={{margin:'0 auto 12px'}}/>
                            <div style={{fontSize:16,fontWeight:700}}>Select a student to view their Academic Passport</div>
                            <div style={{fontSize:13,marginTop:6}}>Full Form 1–4 history · KNEC correct grades · Printable PDF</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
