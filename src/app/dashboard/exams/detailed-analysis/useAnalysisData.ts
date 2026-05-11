'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface GradeEntry { grade: string; min_score: number; max_score: number; points: number; remarks: string; }

export const GRADE_COLORS: Record<string, string> = {
  'A':'#059669','A-':'#10b981','B+':'#34d399','B':'#3b82f6','B-':'#60a5fa',
  'C+':'#8b5cf6','C':'#a78bfa','C-':'#f59e0b','D+':'#f97316','D':'#ef4444','D-':'#dc2626','E':'#991b1b',
};

export function useAnalysisData() {
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<GradeEntry[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selTerm, setSelTerm] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selSubject, setSelSubject] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [gR,mR,sR,subR,tR,fR,stR,tchR,stchrR,attR] = await Promise.all([
      supabase.from('school_grading_system').select('*').order('points',{ascending:false}),
      supabase.from('school_exam_marks').select('*'),
      supabase.from('school_students').select('*').eq('status','Active'),
      supabase.from('school_subjects').select('*').eq('is_active',true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id',{ascending:false}),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_teachers').select('*').eq('status','Active'),
      supabase.from('school_subject_teachers').select('*'),
      supabase.from('school_attendance').select('*'),
    ]);
    setGrading(gR.data||[]); setMarks(mR.data||[]); setStudents(sR.data||[]);
    setSubjects(subR.data||[]); setTerms(tR.data||[]); setForms(fR.data||[]);
    setStreams(stR.data||[]); setTeachers(tchR.data||[]);
    setSubjectTeachers(stchrR.data||[]); setAttendance(attR.data||[]);
    const cur = (tR.data||[]).find((t:any)=>t.is_current);
    if (cur) setSelTerm(String(cur.id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getGrade = (score: number): GradeEntry => {
    const sorted = [...grading].sort((a,b)=>b.min_score-a.min_score);
    return sorted.find(g=>score>=g.min_score&&score<=g.max_score) || {grade:'E',min_score:0,max_score:29,points:1,remarks:'Very Poor'};
  };

  const termMarks = marks.filter(m=>!selTerm||String(m.term_id)===selTerm);
  const formMarks = termMarks.filter(m=>{
    if(!selForm) return true;
    const student = students.find(s=>s.id===m.student_id);
    return student?.form_id===Number(selForm);
  });

  // KPI computations
  const totalEntries = formMarks.length;
  const allScores = formMarks.map(m=>Number(m.combined_score||m.score||0));
  const schoolMean = allScores.length>0 ? allScores.reduce((a,b)=>a+b,0)/allScores.length : 0;
  const schoolMeanGrade = getGrade(schoolMean);
  const passCount = allScores.filter(s=>s>=30).length;
  const passRate = allScores.length>0 ? (passCount/allScores.length)*100 : 0;
  const highestScore = allScores.length>0 ? Math.max(...allScores) : 0;
  const lowestScore = allScores.length>0 ? Math.min(...allScores) : 0;
  const distinctStudents = new Set(formMarks.map(m=>m.student_id)).size;

  // Grade distribution
  const getGradeDistribution = () => {
    const dist: Record<string,number> = {};
    grading.forEach(g=>{dist[g.grade]=0;});
    const filtered = selSubject ? formMarks.filter(m=>m.subject_id===Number(selSubject)) : formMarks;
    filtered.forEach(m=>{const g=getGrade(Number(m.combined_score||m.score||0));dist[g.grade]=(dist[g.grade]||0)+1;});
    return dist;
  };

  // Subject averages
  const subjectAvgs = subjects.map(sub=>{
    const sm=formMarks.filter(m=>m.subject_id===sub.id);
    const avg=sm.length>0?sm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/sm.length:0;
    const pc=sm.filter(m=>Number(m.combined_score||m.score||0)>=30).length;
    return {name:sub.subject_name,avg,count:sm.length,passRate:sm.length>0?(pc/sm.length)*100:0,failRate:sm.length>0?((sm.length-pc)/sm.length)*100:0};
  }).filter(s=>s.count>0).sort((a,b)=>b.avg-a.avg);

  // Stream comparison
  const streamComparison = streams.map(stream=>{
    const sids=students.filter(s=>s.stream_id===stream.id&&(!selForm||s.form_id===Number(selForm))).map(s=>s.id);
    const sm=formMarks.filter(m=>sids.includes(m.student_id));
    const avg=sm.length>0?sm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/sm.length:0;
    return {name:stream.stream_name,avg,count:sm.length};
  }).filter(s=>s.count>0).sort((a,b)=>b.avg-a.avg);

  // Teacher performance
  const teacherPerformance = subjectTeachers.map(st=>{
    const teacher=teachers.find(t=>t.id===st.teacher_id);
    const subject=subjects.find(s=>s.id===st.subject_id);
    const form=forms.find(f=>f.id===st.form_id);
    const fids=students.filter(s=>s.form_id===st.form_id).map(s=>s.id);
    const tm=formMarks.filter(m=>m.subject_id===st.subject_id&&fids.includes(m.student_id));
    const avg=tm.length>0?tm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/tm.length:0;
    const pr=tm.length>0?tm.filter(m=>Number(m.combined_score||m.score||0)>=30).length/tm.length*100:0;
    return {teacherName:teacher?`${teacher.first_name} ${teacher.last_name}`:'Unknown',subject:subject?.subject_name||'Unknown',form:form?.form_name||'Unknown',avg,count:tm.length,passRate:pr};
  }).filter(t=>t.count>0).sort((a,b)=>b.avg-a.avg);

  // KCSE Prediction
  const getKCSEPredictions = () => {
    if(!selForm) return [];
    return students.filter(s=>s.form_id===Number(selForm)).map(student=>{
      const sm=formMarks.filter(m=>m.student_id===student.id);
      if(sm.length===0) return null;
      const sg:{subject_id:number;points:number;grade:string}[]=[];
      for(const mark of sm){if(!sg.find(x=>x.subject_id===mark.subject_id)){const score=Number(mark.combined_score||mark.score||0);const g=getGrade(score);sg.push({subject_id:mark.subject_id,points:g.points,grade:g.grade});}}
      const maths=sg.find(x=>{const s=subjects.find(s=>s.id===x.subject_id);return s?.subject_name?.toLowerCase().includes('math');});
      const eng=sg.find(x=>{const s=subjects.find(s=>s.id===x.subject_id);return s?.subject_name?.toLowerCase().includes('english');});
      const others=sg.filter(x=>{const s=subjects.find(s=>s.id===x.subject_id);return !s?.subject_name?.toLowerCase().includes('math')&&!s?.subject_name?.toLowerCase().includes('english');}).sort((a,b)=>b.points-a.points).slice(0,5);
      const best7=[maths,eng,...others].filter(Boolean).slice(0,7) as typeof sg;
      const tp=best7.reduce((s,g)=>s+g.points,0);
      const mp=best7.length>0?tp/best7.length:0;
      const pg=getGrade(mp*6.25);
      return {student,totalPoints:tp,meanPoints:Math.round(mp*100)/100,predictedGrade:pg.grade,subjectsCount:best7.length,topSubject:best7.sort((a,b)=>b.points-a.points)[0],weakSubject:best7.sort((a,b)=>a.points-b.points)[0]};
    }).filter(Boolean).sort((a:any,b:any)=>b.meanPoints-a.meanPoints);
  };

  // At-Risk
  const getAtRiskStudents = () => {
    if(!selForm) return [];
    return students.filter(s=>s.form_id===Number(selForm)).map(student=>{
      const sm=formMarks.filter(m=>m.student_id===student.id);
      const avg=sm.length>0?sm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/sm.length:0;
      const failed=new Set(sm.filter(m=>Number(m.combined_score||m.score||0)<30).map(m=>m.subject_id)).size;
      const sa=attendance.filter(a=>a.student_id===student.id);
      const absent=sa.filter(a=>a.status==='Absent').length;
      const total=sa.length||1;
      const attRate=((total-absent)/total)*100;
      const rf:string[]=[];
      if(avg<40) rf.push('Low mean');
      if(failed>=3) rf.push(`${failed} failed`);
      if(attRate<80) rf.push('Poor attendance');
      const rl=rf.length>=3?'Critical':rf.length>=2?'High':rf.length>=1?'Medium':'Low';
      return {student,avgScore:avg,failedSubjects:failed,attendanceRate:attRate,riskFactors:rf,riskLevel:rl};
    }).filter(s=>s.riskLevel!=='Low').sort((a,b)=>{const o:Record<string,number>={Critical:0,High:1,Medium:2};return (o[a.riskLevel]??3)-(o[b.riskLevel]??3);});
  };

  // Gender analysis
  const getGenderAnalysis = () => {
    const male = students.filter(s=>s.gender==='Male');
    const female = students.filter(s=>s.gender==='Female');
    const maleIds = male.map(s=>s.id);
    const femaleIds = female.map(s=>s.id);
    const maleMarks = formMarks.filter(m=>maleIds.includes(m.student_id));
    const femaleMarks = formMarks.filter(m=>femaleIds.includes(m.student_id));
    const maleAvg = maleMarks.length>0?maleMarks.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/maleMarks.length:0;
    const femaleAvg = femaleMarks.length>0?femaleMarks.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/femaleMarks.length:0;
    const malePass = maleMarks.length>0?maleMarks.filter(m=>Number(m.combined_score||m.score||0)>=30).length/maleMarks.length*100:0;
    const femalePass = femaleMarks.length>0?femaleMarks.filter(m=>Number(m.combined_score||m.score||0)>=30).length/femaleMarks.length*100:0;
    // Per subject
    const perSubject = subjects.map(sub=>{
      const mm=maleMarks.filter(m=>m.subject_id===sub.id);
      const fm=femaleMarks.filter(m=>m.subject_id===sub.id);
      const ma=mm.length>0?mm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/mm.length:0;
      const fa=fm.length>0?fm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/fm.length:0;
      return {name:sub.subject_name,maleAvg:ma,femaleAvg:fa,maleCount:mm.length,femaleCount:fm.length,gap:ma-fa};
    }).filter(s=>s.maleCount>0||s.femaleCount>0);
    return {maleCount:male.length,femaleCount:female.length,maleAvg,femaleAvg,malePass,femalePass,perSubject};
  };

  // Quartile analysis
  const getQuartileAnalysis = () => {
    if(!selForm) return {q1:[],q2:[],q3:[],q4:[],median:0};
    const studentAvgs = students.filter(s=>s.form_id===Number(selForm)).map(student=>{
      const sm=formMarks.filter(m=>m.student_id===student.id);
      const avg=sm.length>0?sm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/sm.length:0;
      return {student,avg};
    }).filter(s=>s.avg>0).sort((a,b)=>b.avg-a.avg);
    const n=studentAvgs.length;
    if(n===0) return {q1:[],q2:[],q3:[],q4:[],median:0};
    const q=Math.ceil(n/4);
    return {q1:studentAvgs.slice(0,q),q2:studentAvgs.slice(q,q*2),q3:studentAvgs.slice(q*2,q*3),q4:studentAvgs.slice(q*3),median:studentAvgs[Math.floor(n/2)]?.avg||0};
  };

  // Longitudinal
  const getLongitudinalData = () => {
    if(!selSubject||!selForm) return {labels:[],datasets:[]};
    const subject=subjects.find(s=>s.id===Number(selSubject));
    const fids=students.filter(s=>s.form_id===Number(selForm)).map(s=>s.id);
    const sorted=[...terms].sort((a,b)=>(a.year*10+a.term_number)-(b.year*10+b.term_number));
    const avgs=sorted.map(t=>{
      const tm=marks.filter(m=>m.term_id===t.id&&m.subject_id===Number(selSubject)&&fids.includes(m.student_id));
      const avg=tm.length>0?tm.reduce((a,m)=>a+Number(m.combined_score||m.score||0),0)/tm.length:null;
      return {term:t.term_name+' '+(t.academic_year||t.year),avg};
    }).filter(t=>t.avg!==null);
    return {labels:avgs.map(t=>t.term),datasets:[{label:subject?.subject_name||'Subject',data:avgs.map(t=>Math.round(t.avg!*10)/10),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,0.1)',fill:true,tension:0.4,pointRadius:6,pointBackgroundColor:'#6366f1',borderWidth:3}]};
  };

  return {
    loading,grading,marks,students,subjects,terms,forms,streams,teachers,
    selTerm,setSelTerm,selForm,setSelForm,selSubject,setSelSubject,
    getGrade,formMarks,totalEntries,schoolMean,schoolMeanGrade,passRate,
    highestScore,lowestScore,distinctStudents,
    getGradeDistribution,subjectAvgs,streamComparison,teacherPerformance,
    getKCSEPredictions,getAtRiskStudents,getGenderAnalysis,getQuartileAnalysis,
    getLongitudinalData,
  };
}
