'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { processStudentAllMarks, computeKNECMeanGrade, getQualifyingCourses, GRADE_ORDER } from '@/lib/knec-grading';
import { FiSearch, FiAward, FiBook, FiCheckCircle, FiXCircle, FiStar, FiTrendingUp, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { HiAcademicCap } from 'react-icons/hi2';

const FACULTY_COLORS: Record<string, string> = {
    'Medicine': '#dc2626', 'Pharmacy': '#7c3aed', 'Health Sciences': '#0891b2',
    'Engineering': '#2563eb', 'ICT': '#059669', 'Pure Sciences': '#0284c7',
    'Education': '#d97706', 'Business': '#16a34a', 'Economics': '#15803d',
    'Law': '#9333ea', 'Agriculture': '#65a30d', 'Arts': '#f59e0b',
    'Environment': '#0f766e', 'Media': '#db2777', 'Social Sciences': '#7c3aed',
};

export default function UniversityPredictorPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [selTerm, setSelTerm] = useState('');
    const [selForm, setSelForm] = useState('');
    const [selStudent, setSelStudent] = useState('');
    const [search, setSearch] = useState('');
    const [facFilter, setFacFilter] = useState('All');
    const [showOnly, setShowOnly] = useState<'all'|'qualifying'|'close'>('all');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const [sRes, subRes, mRes, gRes, tRes, fRes] = await Promise.all([
            supabase.from('school_students').select('*').eq('status','Active').order('first_name'),
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
        // Default to Form 4
        const f4 = (fRes.data||[]).find((f:any)=>f.form_level===4);
        if(f4) setSelForm(String(f4.id));
        setLoading(false);
    }, []);

    useEffect(()=>{load();},[load]);

    const filteredStudents = useMemo(()=> students.filter(s=>
        (!selForm||String(s.form_id)===selForm) &&
        (!search||(s.first_name+' '+s.last_name).toLowerCase().includes(search.toLowerCase()))
    ), [students, selForm, search]);

    const selectedStudent = useMemo(()=>
        selStudent ? students.find(s=>String(s.id)===selStudent) : filteredStudents[0],
        [selStudent, students, filteredStudents]);

    const studentResults = useMemo(()=>{
        if(!selectedStudent) return [];
        const sm = marks.filter(m=>
            m.student_id===selectedStudent.id &&
            (!selTerm||String(m.term_id)===selTerm)
        );
        return processStudentAllMarks(sm, subjects, grading);
    }, [selectedStudent, marks, subjects, grading, selTerm]);

    const meanGradeResult = useMemo(()=>computeKNECMeanGrade(studentResults), [studentResults]);

    const courses = useMemo(()=>{
        const all = getQualifyingCourses(studentResults, meanGradeResult.meanGrade);
        return all.filter(c=>{
            if(facFilter!=='All' && c.course.faculty!==facFilter) return false;
            if(showOnly==='qualifying') return c.qualifies;
            if(showOnly==='close') return !c.qualifies && c.gap <= 1.5;
            return true;
        });
    }, [studentResults, meanGradeResult, facFilter, showOnly]);

    const qualifyingCount = useMemo(()=>courses.filter(c=>c.qualifies).length,[courses]);
    const faculties = ['All',...Array.from(new Set(courses.map(c=>c.course.faculty)))];

    const gc = (g:string)=>({A:'#059669','A-':'#10b981','B+':'#0ea5e9',B:'#3b82f6','B-':'#6366f1','C+':'#8b5cf6',C:'#a78bfa','C-':'#f59e0b','D+':'#f97316',D:'#ef4444','D-':'#dc2626',E:'#991b1b'}[g]||'#94a3b8');

    if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"/></div>;

    return (
        <div style={{minHeight:'100vh',background:'#f0f9ff',padding:'24px'}}>
            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#1e40af,#7c3aed)',borderRadius:16,padding:'24px 32px',marginBottom:24,color:'#fff'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                    <HiAcademicCap size={32}/>
                    <div>
                        <h1 style={{fontSize:24,fontWeight:900,margin:0}}>🎓 University Cutoff Predictor</h1>
                        <p style={{margin:0,opacity:0.85,fontSize:14}}>KUCCPS 2024 — Based on student KCSE performance · Defeats every SMS in Kenya</p>
                    </div>
                </div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:16}}>
                    <select value={selTerm} onChange={e=>setSelTerm(e.target.value)}
                        style={{padding:'8px 14px',borderRadius:8,border:'none',background:'rgba(255,255,255,0.2)',color:'#fff',fontWeight:700,fontSize:13}}>
                        {terms.map((t:any)=><option key={t.id} value={t.id} style={{color:'#1e293b'}}>{t.term_name}</option>)}
                    </select>
                    <select value={selForm} onChange={e=>setSelForm(e.target.value)}
                        style={{padding:'8px 14px',borderRadius:8,border:'none',background:'rgba(255,255,255,0.2)',color:'#fff',fontWeight:700,fontSize:13}}>
                        <option value="" style={{color:'#1e293b'}}>All Forms</option>
                        {forms.map((f:any)=><option key={f.id} value={f.id} style={{color:'#1e293b'}}>{f.form_name}</option>)}
                    </select>
                </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:20}}>
                {/* Student List */}
                <div style={{background:'#fff',borderRadius:12,padding:16,boxShadow:'0 2px 12px rgba(0,0,0,0.08)',height:'fit-content'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                        <FiSearch size={16} color="#64748b"/>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…"
                            style={{border:'none',outline:'none',fontSize:13,flex:1,background:'transparent'}}/>
                    </div>
                    <div style={{maxHeight:600,overflowY:'auto'}}>
                        {filteredStudents.map(s=>{
                            const isSel = selectedStudent?.id===s.id;
                            return (
                                <div key={s.id} onClick={()=>setSelStudent(String(s.id))}
                                    style={{padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:4,
                                        background:isSel?'#eff6ff':'transparent',
                                        border:isSel?'1.5px solid #3b82f6':'1.5px solid transparent'}}>
                                    <div style={{fontWeight:700,fontSize:13,color:isSel?'#2563eb':'#1e293b'}}>{s.first_name} {s.last_name}</div>
                                    <div style={{fontSize:11,color:'#64748b'}}>{s.admission_number||s.admission_no||'—'}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div>
                    {selectedStudent ? (<>
                        {/* Student Card */}
                        <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.08)',marginBottom:20}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                                <div>
                                    <h2 style={{fontSize:20,fontWeight:900,margin:0,color:'#1e293b'}}>{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                                    <div style={{fontSize:13,color:'#64748b',marginTop:2}}>{selectedStudent.admission_number||selectedStudent.admission_no} · {forms.find((f:any)=>f.id===selectedStudent.form_id)?.form_name}</div>
                                </div>
                                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:28,fontWeight:900,color:gc(meanGradeResult.meanGrade)}}>{meanGradeResult.meanGrade}</div>
                                        <div style={{fontSize:11,color:'#64748b'}}>KNEC Mean Grade</div>
                                    </div>
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:24,fontWeight:900,color:'#7c3aed'}}>{meanGradeResult.totalPoints}</div>
                                        <div style={{fontSize:11,color:'#64748b'}}>Total Points</div>
                                    </div>
                                    <div style={{textAlign:'center'}}>
                                        <div style={{fontSize:24,fontWeight:900,color:'#059669'}}>{qualifyingCount}</div>
                                        <div style={{fontSize:11,color:'#64748b'}}>Courses Qualify</div>
                                    </div>
                                    {!meanGradeResult.isValid && (
                                        <div style={{background:'#fef3c7',border:'1px solid #fcd34d',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#92400e'}}>
                                            ⚠️ {!meanGradeResult.hasEnglish?'No English marks. ':''}{!meanGradeResult.hasKiswahili?'No Kiswahili marks.':''}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Best 7 subjects */}
                            {meanGradeResult.best7.length>0 && (
                                <div style={{marginTop:16}}>
                                    <div style={{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:8}}>BEST 7 SUBJECTS (KCSE COUNTING)</div>
                                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                        {meanGradeResult.best7.map(r=>(
                                            <div key={r.subjectId} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'6px 12px',fontSize:12}}>
                                                <span style={{fontWeight:700,color:'#1e293b'}}>{r.subjectName}</span>
                                                <span style={{marginLeft:6,background:gc(r.grade),color:'#fff',borderRadius:4,padding:'1px 6px',fontSize:11,fontWeight:900}}>{r.grade}</span>
                                                <span style={{marginLeft:4,color:'#64748b'}}>{r.points}pts · {r.score.toFixed(0)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filters */}
                        <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                            <div style={{display:'flex',gap:6}}>
                                {(['all','qualifying','close'] as const).map(v=>(
                                    <button key={v} onClick={()=>setShowOnly(v)}
                                        style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
                                            background:showOnly===v?'#3b82f6':'#fff',color:showOnly===v?'#fff':'#475569',
                                            border:showOnly===v?'none':'1px solid #e2e8f0'}}>
                                        {v==='all'?'All Courses':v==='qualifying'?'✅ Qualifying':'🔶 Almost There'}
                                    </button>
                                ))}
                            </div>
                            <select value={facFilter} onChange={e=>setFacFilter(e.target.value)}
                                style={{padding:'6px 12px',borderRadius:8,fontSize:12,border:'1px solid #e2e8f0',background:'#fff'}}>
                                {faculties.map(f=><option key={f}>{f}</option>)}
                            </select>
                        </div>

                        {/* Course Cards */}
                        <div style={{display:'grid',gap:12}}>
                            {courses.map(({course,clusterPts,qualifies,gap},i)=>{
                                const facColor = FACULTY_COLORS[course.faculty]||'#64748b';
                                return (
                                    <div key={i} style={{background:'#fff',borderRadius:12,padding:16,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
                                        border:`1.5px solid ${qualifies?'#86efac':'#fca5a5'}`}}>
                                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                                            <div style={{flex:1}}>
                                                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                                                    {qualifies
                                                        ? <FiCheckCircle size={16} color="#16a34a"/>
                                                        : <FiXCircle size={16} color="#dc2626"/>}
                                                    <span style={{fontWeight:800,fontSize:14,color:'#1e293b'}}>{course.course}</span>
                                                    <span style={{background:facColor+'22',color:facColor,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:6}}>{course.faculty}</span>
                                                </div>
                                                <div style={{fontSize:12,color:'#64748b',marginLeft:24}}>{course.university}</div>
                                                {course.required && (
                                                    <div style={{fontSize:11,color:'#92400e',background:'#fef3c7',borderRadius:6,padding:'2px 8px',display:'inline-block',marginLeft:24,marginTop:4}}>
                                                        Required: {course.required.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{display:'flex',gap:16,textAlign:'center',flexShrink:0}}>
                                                <div>
                                                    <div style={{fontSize:16,fontWeight:900,color:qualifies?'#059669':'#dc2626'}}>{clusterPts.toFixed(1)}</div>
                                                    <div style={{fontSize:10,color:'#64748b'}}>Your Cluster</div>
                                                    <div style={{fontSize:10,color:'#94a3b8'}}>Min: {course.minClusterPts}</div>
                                                </div>
                                                <div>
                                                    <div style={{fontSize:16,fontWeight:900,color:gc(course.minMeanGrade)}}>{course.minMeanGrade}</div>
                                                    <div style={{fontSize:10,color:'#64748b'}}>Min Grade</div>
                                                    <div style={{fontSize:10,color:'#94a3b8'}}>Yours: {meanGradeResult.meanGrade}</div>
                                                </div>
                                                {!qualifies && (
                                                    <div style={{background:'#fef2f2',borderRadius:8,padding:'6px 10px',textAlign:'center'}}>
                                                        <div style={{fontSize:13,fontWeight:900,color:'#dc2626'}}>+{gap.toFixed(1)}</div>
                                                        <div style={{fontSize:10,color:'#64748b'}}>pts needed</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Cluster subjects */}
                                        <div style={{marginTop:10,marginLeft:24,display:'flex',gap:6,flexWrap:'wrap'}}>
                                            {course.cluster.map((sub,j)=>(
                                                <span key={j} style={{fontSize:11,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:'2px 8px',color:'#475569'}}>
                                                    {j===0?'2×':''}{sub}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>) : (
                        <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>
                            <HiAcademicCap size={48} style={{margin:'0 auto 12px'}}/>
                            <div style={{fontSize:16,fontWeight:700}}>Select a student to see university predictions</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
