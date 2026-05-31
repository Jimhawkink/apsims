'use client';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiDownload, FiPrinter, FiSearch, FiFilter, FiFileText, FiBarChart2,
  FiGrid, FiTrendingUp, FiAward, FiDatabase, FiBookOpen, FiCheckSquare, FiSquare,
  FiChevronLeft, FiChevronRight, FiArrowUp, FiArrowDown, FiRefreshCw,
  FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';

// ─── KCSE Grading Engine (KNEC Standard) ─────────────────────────
const KCSE_GRADES = [
  { grade:'A',  min:80,  max:100, pts:12, color:'#059669', bg:'#d1fae5' },
  { grade:'A-', min:75,  max:79,  pts:11, color:'#10b981', bg:'#d1fae5' },
  { grade:'B+', min:70,  max:74,  pts:10, color:'#0891b2', bg:'#cffafe' },
  { grade:'B',  min:65,  max:69,  pts:9,  color:'#2563eb', bg:'#dbeafe' },
  { grade:'B-', min:60,  max:64,  pts:8,  color:'#4f46e5', bg:'#e0e7ff' },
  { grade:'C+', min:55,  max:59,  pts:7,  color:'#7c3aed', bg:'#ede9fe' },
  { grade:'C',  min:50,  max:54,  pts:6,  color:'#ca8a04', bg:'#fef9c3' },
  { grade:'C-', min:45,  max:49,  pts:5,  color:'#d97706', bg:'#fef3c7' },
  { grade:'D+', min:40,  max:44,  pts:4,  color:'#ea580c', bg:'#ffedd5' },
  { grade:'D',  min:35,  max:39,  pts:3,  color:'#dc2626', bg:'#fee2e2' },
  { grade:'D-', min:30,  max:34,  pts:2,  color:'#b91c1c', bg:'#fecaca' },
  { grade:'E',  min:0,   max:29,  pts:1,  color:'#7f1d1d', bg:'#fca5a5' },
];
const getGrade = (score: number) =>
  KCSE_GRADES.find(g => score >= g.min && score <= g.max) || KCSE_GRADES[KCSE_GRADES.length-1];
const gradeStyle = (grade: string) => {
  const g = KCSE_GRADES.find(x => x.grade === grade);
  return g ? { color: g.color, backgroundColor: g.bg } : { color:'#6b7280', backgroundColor:'#f9fafb' };
};

const EXAM_TYPES = ['CAT 1','CAT 2','Mid-Term','End-Term','Mock','KCSE Trial','Pre-Mock'];
const PAGE_SIZES = [25, 50, 100, 200];
type SortDir = 'asc'|'desc';
type ReportTab = 'marksheet'|'subject-analysis'|'class-analysis'|'progressive'|'report-card'|'merit-list'|'analytics'|'nemis';

const TABS: { key: ReportTab; label: string; emoji: string; badge?: string }[] = [
  { key:'marksheet',        label:'Mark Sheet',       emoji:'📋' },
  { key:'subject-analysis', label:'Subject Analysis', emoji:'📊' },
  { key:'class-analysis',   label:'Class/Form',       emoji:'🏫' },
  { key:'progressive',      label:'Progressive',      emoji:'📈' },
  { key:'report-card',      label:'Report Cards',     emoji:'📄' },
  { key:'merit-list',       label:'Merit List',       emoji:'🏆', badge:'TOP' },
  { key:'analytics',        label:'Analytics',        emoji:'🎯', badge:'NEW' },
  { key:'nemis',            label:'NEMIS Export',     emoji:'🏛️' },
];

// ─── Shared Components ────────────────────────────────────────────
function ScoreCell({ score }: { score: number|null }) {
  if (score === null) return <span className="text-gray-200 text-xs">—</span>;
  const g = getGrade(score);
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <span className="text-xs font-black leading-none" style={{ color: g.color }}>{score}</span>
      <span className="text-[8px] font-bold px-1 rounded-sm leading-none" style={gradeStyle(g.grade)}>{g.grade}</span>
    </div>
  );
}

function Pagination({ page, total, pageSize, onPage, onPageSize }: {
  page:number; total:number; pageSize:number; onPage:(p:number)=>void; onPageSize:(n:number)=>void;
}) {
  const pages = Math.ceil(total/pageSize);
  if (!total) return null;
  const from = (page-1)*pageSize+1, to = Math.min(page*pageSize, total);
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/60">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="font-bold text-gray-700">{from}–{to}</span> of <span className="font-bold text-gray-700">{total}</span>
        <span className="text-gray-300 mx-1">|</span>
        Per page:
        <select value={pageSize} onChange={e=>{onPageSize(Number(e.target.value));onPage(1);}}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white font-bold text-gray-700 outline-none">
          {PAGE_SIZES.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        {[{icon:<FiChevronsLeft size={11}/>,to:1},{icon:<FiChevronLeft size={11}/>,to:page-1}].map((b,i)=>(
          <button key={i} onClick={()=>onPage(b.to)} disabled={page===1}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 disabled:opacity-30 transition-all">
            {b.icon}
          </button>
        ))}
        {Array.from({length:Math.min(5,pages)},(_,i)=>{
          let p=i+1;
          if(pages>5){ if(page<=3) p=i+1; else if(page>=pages-2) p=pages-4+i; else p=page-2+i; }
          return (
            <button key={p} onClick={()=>onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p===page?'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md':'border border-gray-200 text-gray-600 hover:bg-blue-50'}`}>
              {p}
            </button>
          );
        })}
        {[{icon:<FiChevronRight size={11}/>,to:page+1},{icon:<FiChevronsRight size={11}/>,to:pages}].map((b,i)=>(
          <button key={i} onClick={()=>onPage(b.to)} disabled={page>=pages}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 disabled:opacity-30 transition-all">
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function GradeBar({ count, total, grade }: { count:number; total:number; grade:typeof KCSE_GRADES[0] }) {
  const pct = total>0 ? (count/total)*100 : 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-5 h-12 bg-gray-100 rounded overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 rounded transition-all duration-700"
          style={{height:`${pct}%`,backgroundColor:grade.color}}/>
      </div>
      <span className="text-[7px] font-bold" style={{color:grade.color}}>{grade.grade}</span>
      {count>0 && <span className="text-[6px] text-gray-400">{count}</span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
function ReportsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ReportTab>(
    (searchParams.get('tab') as ReportTab) || 'marksheet'
  );
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Raw data
  const [forms, setForms]                     = useState<any[]>([]);
  const [streams, setStreams]                 = useState<any[]>([]);
  const [subjects, setSubjects]               = useState<any[]>([]);
  const [students, setStudents]               = useState<any[]>([]);
  const [exams, setExams]                     = useState<any[]>([]);
  const [marks, setMarks]                     = useState<any[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo]           = useState<any>(null);

  // Filters
  const [selForm, setSelForm]     = useState(0);
  const [selStream, setSelStream] = useState(0);
  const [selExam, setSelExam]     = useState('');
  const [selSubject, setSelSubject] = useState(0);
  const [selStudent, setSelStudent] = useState(0);
  const [selExams, setSelExams]   = useState<string[]>([]);
  const [search, setSearch]       = useState('');
  const [nemisForm, setNemisForm] = useState('');

  // Grid state
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey]   = useState('mean');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');

  const handleSort = (k: string) => {
    setSortKey(prev => { if(prev===k) setSortDir(d=>d==='asc'?'desc':'asc'); else setSortDir('desc'); return k; });
    setPage(1);
  };

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const [fR,sR,subR,stR,mR,stR2,termR,schR] = await Promise.all([
      supabase.from('school_forms').select('*').eq('is_active',true).order('form_level'),
      supabase.from('school_streams').select('*').eq('is_active',true).order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_students').select('*').order('first_name'),
      supabase.from('school_exam_marks').select('*'),
      supabase.from('school_subject_teachers').select('*, school_subjects(subject_name,subject_code), school_teachers(first_name,last_name)'),
      supabase.from('school_terms').select('*').order('id',{ascending:false}),
      supabase.from('school_details').select('*').limit(1).maybeSingle(),
    ]);
    setForms(fR.data||[]);
    setStreams(sR.data||[]);
    setSubjects(subR.data||[]);
    setStudents(stR.data||[]);
    setSubjectTeachers(stR2.data||[]);
    setSchoolInfo(schR.data);

    const rawMarks = mR.data||[];
    const termData = termR.data||[];
    const examMap = new Map<string,any>();
    rawMarks.forEach((m:any)=>{
      const key=`${m.term_id}_${m.exam_type}`;
      if(!examMap.has(key)){
        const t=termData.find((x:any)=>x.id===m.term_id);
        examMap.set(key,{id:key,exam_name:m.exam_type,term:t?.term_name||'',year:t?.year||new Date().getFullYear(),term_id:m.term_id,exam_type:m.exam_type});
      }
    });
    termData.forEach((t:any)=>{
      EXAM_TYPES.forEach(et=>{
        const key=`${t.id}_${et}`;
        if(!examMap.has(key)) examMap.set(key,{id:key,exam_name:et,term:t.term_name,year:t.year,term_id:t.id,exam_type:et});
      });
    });
    setExams(Array.from(examMap.values()));
    setMarks(rawMarks.map((m:any)=>({...m,exam_id:`${m.term_id}_${m.exam_type}`})));
    setLoading(false);
    setRefreshing(false);
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);

  // ── Derived data (all useMemo at top level) ──
  const activeSubs = useMemo(()=>subjects.filter(s=>s.is_active!==false),[subjects]);

  const examSubjects = useMemo(()=>
    selSubject ? activeSubs.filter(s=>s.id===selSubject) : activeSubs
  ,[activeSubs,selSubject]);

  const filteredStudents = useMemo(()=>students.filter(s=>{
    if(s.status!=='Active') return false;
    if(selForm && s.form_id!==selForm) return false;
    if(selStream && s.stream_id!==selStream) return false;
    if(search && !`${s.first_name} ${s.last_name} ${s.admission_number||''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[students,selForm,selStream,search]);

  const examObj = useMemo(()=>exams.find(e=>e.id===selExam),[exams,selExam]);

  // ── MARKSHEET computed data ──
  const marksheetResults = useMemo(()=>{
    if(!selExam) return [];
    return filteredStudents.map(student=>{
      const sm = marks.filter(m=>m.student_id===student.id && m.exam_id===selExam);
      let total=0,count=0,totalPts=0;
      const scores: Record<number,{score:number;grade:string;pts:number}|null>={};
      examSubjects.forEach(sub=>{
        const mark=sm.find(m=>m.subject_id===sub.id);
        if(mark?.score!=null){
          const g=getGrade(mark.score);
          scores[sub.id]={score:mark.score,grade:g.grade,pts:g.pts};
          total+=mark.score; count++; totalPts+=g.pts;
        } else scores[sub.id]=null;
      });
      const mean=count>0?Math.round(total/count):0;
      return {student,scores,total,mean,count,grade:getGrade(mean).grade,pts:getGrade(mean).pts,totalPts};
    });
  },[filteredStudents,selExam,marks,examSubjects]);

  const marksheetSorted = useMemo(()=>{
    const arr=[...marksheetResults];
    arr.sort((a,b)=>{
      if(sortKey==='name') return sortDir==='asc'?a.student.first_name.localeCompare(b.student.first_name):b.student.first_name.localeCompare(a.student.first_name);
      if(sortKey==='adm') return sortDir==='asc'?(a.student.admission_number||'').localeCompare(b.student.admission_number||''):(b.student.admission_number||'').localeCompare(a.student.admission_number||'');
      if(sortKey==='total') return sortDir==='desc'?b.total-a.total:a.total-b.total;
      if(sortKey==='mean') return sortDir==='desc'?b.mean-a.mean:a.mean-b.mean;
      const aS=a.scores[Number(sortKey)]?.score??-1, bS=b.scores[Number(sortKey)]?.score??-1;
      return sortDir==='desc'?bS-aS:aS-bS;
    });
    return arr.map((r,i)=>({...r,rank:i+1}));
  },[marksheetResults,sortKey,sortDir]);

  const marksheetPaged = useMemo(()=>marksheetSorted.slice((page-1)*pageSize,page*pageSize),[marksheetSorted,page,pageSize]);

  const subjectMeans = useMemo(()=>examSubjects.map(sub=>{
    const sm=marks.filter(m=>m.subject_id===sub.id&&m.exam_id===selExam&&m.score!=null);
    const filtered=selForm?sm.filter(m=>students.find(s=>s.id===m.student_id)?.form_id===selForm):sm;
    return filtered.length>0?Math.round(filtered.reduce((s:number,m:any)=>s+m.score,0)/filtered.length):null;
  }),[examSubjects,marks,selExam,selForm,students]);

  const markStats = useMemo(()=>{
    const withMarks=marksheetSorted.filter(r=>r.count>0);
    if(!withMarks.length) return null;
    const overallMean=Math.round(withMarks.reduce((s,r)=>s+r.mean,0)/withMarks.length);
    const passRate=Math.round(withMarks.filter(r=>r.mean>=50).length/withMarks.length*100);
    return {overallMean,passRate,count:withMarks.length,top:withMarks[0]};
  },[marksheetSorted]);

  // ── SUBJECT ANALYSIS computed ──
  const subjectAnalysis = useMemo(()=>{
    if(!selExam) return [];
    return activeSubs.map(sub=>{
      let sm=marks.filter(m=>m.subject_id===sub.id&&m.exam_id===selExam&&m.score!=null);
      if(selForm){ const ids=new Set(students.filter(s=>s.form_id===selForm).map(s=>s.id)); sm=sm.filter(m=>ids.has(m.student_id)); }
      if(selStream){ const ids=new Set(students.filter(s=>s.stream_id===selStream).map(s=>s.id)); sm=sm.filter(m=>ids.has(m.student_id)); }
      const scores=sm.map(m=>m.score as number);
      const mean=scores.length>0?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
      const highest=scores.length>0?Math.max(...scores):0;
      const lowest=scores.length>0?Math.min(...scores):0;
      const gradeDist:Record<string,number>={};
      KCSE_GRADES.forEach(g=>{gradeDist[g.grade]=0;});
      scores.forEach(s=>{gradeDist[getGrade(s).grade]++;});
      const passRate=scores.length>0?Math.round(scores.filter(s=>s>=50).length/scores.length*100):0;
      const teacher=subjectTeachers.find(st=>st.subject_id===sub.id);
      const teacherName=teacher?`${teacher.school_teachers?.first_name||''} ${teacher.school_teachers?.last_name||''}`.trim():'—';
      return {sub,scores,mean,highest,lowest,gradeDist,passRate,teacherName};
    }).filter(d=>d.scores.length>0).sort((a,b)=>b.mean-a.mean);
  },[activeSubs,marks,selExam,selForm,selStream,students,subjectTeachers]);

  // ── MERIT LIST computed ──
  const meritList = useMemo(()=>{
    if(!selExam) return [];
    return filteredStudents.map(student=>{
      const sm=marks.filter(m=>m.student_id===student.id&&m.exam_id===selExam&&m.score!=null);
      if(!sm.length) return null;
      const mean=Math.round(sm.reduce((a,m)=>a+m.score,0)/sm.length);
      const total=sm.reduce((a,m)=>a+m.score,0);
      const g=getGrade(mean);
      return {student,mean,total,count:sm.length,grade:g.grade,pts:g.pts,
        form:forms.find(f=>f.id===student.form_id),
        stream:streams.find(s=>s.id===student.stream_id)};
    }).filter(Boolean).sort((a:any,b:any)=>b.mean-a.mean) as any[];
  },[filteredStudents,selExam,marks,forms,streams]);

  const meritPaged = useMemo(()=>meritList.slice((page-1)*pageSize,page*pageSize),[meritList,page,pageSize]);

  // ── NEMIS data ──
  const nemisStudents = useMemo(()=>students.filter(s=>{
    if(s.status!=='Active') return false;
    if(nemisForm && String(s.form_id)!==nemisForm) return false;
    if(search && !`${s.first_name} ${s.last_name} ${s.admission_number||''} ${s.nemis_number||''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[students,nemisForm,search]);

  const nemisPaged = useMemo(()=>nemisStudents.slice((page-1)*pageSize,page*pageSize),[nemisStudents,page,pageSize]);

  // ── CLASS ANALYSIS computed ──
  const classAnalysis = useMemo(()=>{
    if(!selExam) return [];
    return forms.flatMap(form=>streams.map(stream=>{
      const cls=students.filter(s=>s.form_id===form.id&&s.stream_id===stream.id&&s.status==='Active');
      if(!cls.length) return null;
      const means=cls.map(st=>{
        const sm=marks.filter(m=>m.student_id===st.id&&m.exam_id===selExam&&m.score!=null);
        return sm.length>0?Math.round(sm.reduce((a,m)=>a+m.score,0)/sm.length):null;
      }).filter(m=>m!==null) as number[];
      if(!means.length) return null;
      const classMean=Math.round(means.reduce((a,b)=>a+b,0)/means.length);
      const dist:Record<string,number>={};
      KCSE_GRADES.forEach(g=>{dist[g.grade]=0;});
      means.forEach(m=>{dist[getGrade(m).grade]++;});
      return {form,stream,count:cls.length,marked:means.length,classMean,highest:Math.max(...means),lowest:Math.min(...means),dist};
    })).filter(Boolean) as any[];
  },[selExam,forms,streams,students,marks]);

  // ── PROGRESSIVE computed ──
  const progressiveData = useMemo(()=>{
    const recentExams=exams.slice(0,6);
    return filteredStudents.map(st=>{
      const examMeans=recentExams.map(ex=>{
        const sm=marks.filter(m=>m.student_id===st.id&&m.exam_id===ex.id&&m.score!=null);
        return sm.length>0?Math.round(sm.reduce((a,m)=>a+m.score,0)/sm.length):null;
      });
      const valid=examMeans.filter(m=>m!==null) as number[];
      const trend=valid.length>=2?(valid[valid.length-1]>valid[0]?'↑':'↓'):'—';
      const trendColor=valid.length>=2?(valid[valid.length-1]>valid[0]?'#059669':'#dc2626'):'#9ca3af';
      return {st,examMeans,trend,trendColor,recentExams};
    });
  },[filteredStudents,exams,marks]);

  const progressPaged = useMemo(()=>progressiveData.slice((page-1)*pageSize,page*pageSize),[progressiveData,page,pageSize]);

  // ── REPORT CARDS ──
  const reportStudents = useMemo(()=>{
    if(!selForm||!selExams.length) return [];
    return (selStudent?filteredStudents.filter(s=>s.id===selStudent):filteredStudents);
  },[selForm,selExams,filteredStudents,selStudent]);

  const selectedExamObjs = useMemo(()=>exams.filter(e=>selExams.includes(e.id)),[exams,selExams]);

  // ── ANALYTICS ──
  const analyticsFormData = useMemo(()=>forms.map(form=>{
    const cls=students.filter(s=>s.form_id===form.id&&s.status==='Active');
    const means=selExam?cls.map(st=>{
      const sm=marks.filter(m=>m.student_id===st.id&&m.exam_id===selExam&&m.score!=null);
      return sm.length>0?Math.round(sm.reduce((a,m)=>a+m.score,0)/sm.length):null;
    }).filter(m=>m!==null) as number[]:[];
    const classMean=means.length>0?Math.round(means.reduce((a,b)=>a+b,0)/means.length):0;
    return {form,classMean,studentCount:cls.length,markedCount:means.length};
  }),[forms,students,marks,selExam]);

  const gradeHeatmap = useMemo(()=>{
    if(!selExam) return [];
    return KCSE_GRADES.map(grade=>{
      const formCounts=forms.map(form=>{
        const ids=new Set(students.filter(s=>s.form_id===form.id&&s.status==='Active').map(s=>s.id));
        return marks.filter(m=>m.exam_id===selExam&&m.score!=null&&ids.has(m.student_id)&&getGrade(m.score).grade===grade.grade).length;
      });
      return {grade,formCounts,total:formCounts.reduce((a,b)=>a+b,0)};
    });
  },[forms,students,marks,selExam]);

  // ── Export & Print helpers ──
  const exportCSV = (headers:string[],rows:string[][],filename:string)=>{
    const csv=[headers.join(','),...rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'}));
    a.download=`${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); toast.success('Exported ✓');
  };

  const printArea=(title:string)=>{
    const el=document.getElementById('print-area');
    if(!el) return;
    const w=window.open('','_blank'); if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>@page{size:A4 landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#1a1a1a}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #d1d5db;padding:4px 6px}
    th{background:#1e3a8a;color:white;font-weight:700;text-align:center}
    tr:nth-child(even){background:#f8fafc}.hdr{text-align:center;padding:12px 0 8px;border-bottom:3px solid #1e3a8a;margin-bottom:10px}
    .hdr h1{font-size:18px;color:#1e3a8a;font-weight:900;text-transform:uppercase}
    .hdr p{font-size:10px;color:#6b7280;margin-top:3px}
    @media print{body{font-size:9px}}</style></head><body>
    <div class="hdr"><h1>${schoolInfo?.school_name||'APSIMS School'}</h1>
    <p>${title} &bull; ${new Date().toLocaleDateString('en-KE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
    <p style="font-size:8px;color:#9ca3af;margin-top:2px">Powered by APSIMS &mdash; Kenya #1 School Management System</p></div>
    ${el.innerHTML}</body></html>`);
    w.document.close(); setTimeout(()=>w.print(),600);
  };

  // Reset page when tab/filters change
  useEffect(()=>setPage(1),[activeTab,selForm,selStream,selExam,selSubject,search,nemisForm]);

  // ══════════════════════════════════════════════════════════════
  //  LOADING SCREEN
  // ══════════════════════════════════════════════════════════════
  if(loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f1f5f9'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse"
          style={{background:'linear-gradient(135deg,#1e3a8a,#6366f1)'}}>
          <FiFileText size={28} className="text-white"/>
        </div>
        <p className="font-black text-gray-700 text-lg">Loading Reports & Analytics</p>
        <p className="text-gray-400 text-sm mt-1">Fetching academic data…</p>
        <div className="mt-4 flex gap-1 justify-center">
          {[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  SHARED FILTER BAR
  // ══════════════════════════════════════════════════════════════
  const FilterSelect = ({label,value,onChange,min,children}:{label:string;value:any;onChange:(v:any)=>void;min?:string;children:React.ReactNode})=>(
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        className={`px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none ${min||'min-w-[130px]'}`}>
        {children}
      </select>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  MARK SHEET TAB
  // ══════════════════════════════════════════════════════════════
  const MarkSheetTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect label="Form" value={selForm} onChange={v=>setSelForm(Number(v))}>
            <option value={0}>All Forms</option>
            {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
          </FilterSelect>
          <FilterSelect label="Stream" value={selStream} onChange={v=>setSelStream(Number(v))}>
            <option value={0}>All Streams</option>
            {streams.map(s=><option key={s.id} value={s.id}>{s.stream_name}</option>)}
          </FilterSelect>
          <FilterSelect label="Exam *" value={selExam} onChange={setSelExam} min="min-w-[200px]">
            <option value="">— Select Exam —</option>
            {exams.map(e=><option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
          </FilterSelect>
          <FilterSelect label="Subject" value={selSubject} onChange={v=>setSelSubject(Number(v))} min="min-w-[160px]">
            <option value={0}>All Subjects</option>
            {activeSubs.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}
          </FilterSelect>
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search Student</label>
            <div className="relative">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or Adm No…"
                className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none"/>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={()=>exportCSV(
              ['#','Adm No','Student Name',...examSubjects.map(s=>s.subject_code||s.subject_name),'Total','Mean','Grade','Pts','Rank'],
              marksheetSorted.map((r,i)=>[String(i+1),r.student.admission_number||'-',`${r.student.first_name} ${r.student.last_name}`,...examSubjects.map(sub=>r.scores[sub.id]?.score!=null?String(r.scores[sub.id]!.score):'-'),String(r.total),String(r.mean),r.grade,String(r.pts),String(r.rank)]),
              `marksheet_${examObj?.exam_name||'exam'}_${examObj?.year||''}`
            )} disabled={!selExam}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
              <FiDownload size={13}/> CSV
            </button>
            <button onClick={()=>printArea(`Mark Sheet — ${examObj?.exam_name||''} ${examObj?.term||''} ${examObj?.year||''}`)} disabled={!selExam}
              className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
              <FiPrinter size={13}/> Print
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {selExam && markStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {label:'Students',   val:markStats.count,       sub:`${filteredStudents.length} filtered`,                         icon:'👥', col:'#2563eb', bg:'#eff6ff'},
            {label:'Class Mean', val:markStats.overallMean, sub:`Grade ${getGrade(markStats.overallMean).grade}`,              icon:'📊', col:getGrade(markStats.overallMean).color, bg:getGrade(markStats.overallMean).bg},
            {label:'Pass Rate',  val:`${markStats.passRate}%`, sub:'≥50 marks',                                               icon:'✅', col:markStats.passRate>=70?'#059669':'#ea580c', bg:markStats.passRate>=70?'#d1fae5':'#ffedd5'},
            {label:'Top Score',  val:markStats.top?.mean||0,  sub:`${markStats.top?.student.first_name||''} ${markStats.top?.student.last_name||''}`, icon:'🏆', col:'#7c3aed', bg:'#f5f3ff'},
          ].map((s,i)=>(
            <div key={i} className="rounded-2xl p-4 border" style={{backgroundColor:s.bg,borderColor:`${s.col}22`}}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.icon}</span>
                <p className="text-2xl font-black" style={{color:s.col}}>{s.val}</p>
              </div>
              <p className="text-[10px] font-bold uppercase" style={{color:s.col,opacity:0.7}}>{s.label}</p>
              <p className="text-[9px] text-gray-500 mt-0.5 truncate">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
        <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
          <div>
            <h3 className="font-black text-white text-sm">📋 Mark Sheet {examObj?`— ${examObj.exam_name} (${examObj.term} ${examObj.year})`:''}</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">{marksheetSorted.length} students · {examSubjects.length} subjects · Click column to sort</p>
          </div>
          {marksheetSorted.length>0 && <span className="text-xs text-emerald-400 font-bold bg-emerald-900/40 px-2 py-1 rounded-lg">{marksheetSorted.filter(r=>r.count>0).length} with marks</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{minWidth:Math.max(600,280+examSubjects.length*65)}}>
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-3 py-3 text-[10px] font-bold uppercase text-left sticky left-0 bg-slate-800 z-20 w-8">#</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase text-left sticky left-8 bg-slate-800 z-20 min-w-[90px] cursor-pointer hover:bg-slate-600" onClick={()=>handleSort('adm')}>
                  Adm No {sortKey==='adm'?(sortDir==='asc'?'↑':'↓'):''}
                </th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase text-left sticky bg-slate-800 z-20 min-w-[140px] cursor-pointer hover:bg-slate-600" style={{left:98}} onClick={()=>handleSort('name')}>
                  Student Name {sortKey==='name'?(sortDir==='asc'?'↑':'↓'):''}
                </th>
                {examSubjects.map(sub=>(
                  <th key={sub.id} className="px-1 py-3 text-[9px] font-bold uppercase text-center min-w-[58px] cursor-pointer hover:bg-slate-600 transition-colors"
                    onClick={()=>handleSort(String(sub.id))}>
                    <div className="leading-tight">{sub.subject_code||sub.subject_name?.substring(0,4)||'—'}</div>
                    {sortKey===String(sub.id)&&<div className="text-blue-300">{sortDir==='asc'?'↑':'↓'}</div>}
                  </th>
                ))}
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-center bg-indigo-900 min-w-[42px] cursor-pointer hover:bg-indigo-800" onClick={()=>handleSort('total')}>
                  Tot {sortKey==='total'?(sortDir==='asc'?'↑':'↓'):''}
                </th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-center bg-indigo-900 min-w-[48px] cursor-pointer hover:bg-indigo-800" onClick={()=>handleSort('mean')}>
                  Mean {sortKey==='mean'?(sortDir==='asc'?'↑':'↓'):''}
                </th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-center bg-indigo-900 min-w-[36px]">Grd</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-center bg-indigo-900 min-w-[34px]">Pts</th>
                <th className="px-2 py-3 text-[10px] font-bold uppercase text-center bg-indigo-900 min-w-[36px]">Rank</th>
              </tr>
            </thead>
            <tbody>
              {!selExam?(
                <tr><td colSpan={examSubjects.length+8} className="text-center py-16 text-gray-400">
                  <FiFilter size={30} className="mx-auto mb-3 opacity-30"/>
                  <p className="font-medium">Select a form, stream and exam to load the mark sheet</p>
                </td></tr>
              ):marksheetPaged.length===0?(
                <tr><td colSpan={examSubjects.length+8} className="text-center py-10 text-gray-400">No students match current filters</td></tr>
              ):marksheetPaged.map((r,i)=>{
                const isTop=r.rank<=3&&r.count>0;
                const rowBg=isTop?(r.rank===1?'bg-yellow-50/60':r.rank===2?'bg-gray-50/80':'bg-orange-50/40'):i%2===0?'bg-white':'bg-slate-50/30';
                return (
                  <tr key={r.student.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors border-b border-gray-50`}>
                    <td className={`px-3 py-1.5 sticky left-0 z-10 text-gray-400 font-bold text-center ${rowBg}`}>
                      {r.rank<=3&&r.count>0?['🥇','🥈','🥉'][r.rank-1]:r.rank}
                    </td>
                    <td className={`px-3 py-1.5 sticky left-8 z-10 font-bold text-blue-600 ${rowBg}`}>{r.student.admission_number||'—'}</td>
                    <td className={`px-3 py-1.5 sticky z-10 font-semibold text-gray-800 ${rowBg}`} style={{left:98}}>
                      {r.student.first_name} {r.student.last_name}
                      {r.student.stream_id&&<span className="ml-1 text-[8px] text-gray-400">{streams.find(s=>s.id===r.student.stream_id)?.stream_name}</span>}
                    </td>
                    {examSubjects.map(sub=>(
                      <td key={sub.id} className="px-0.5 py-1 text-center border-l border-gray-50">
                        <ScoreCell score={r.scores[sub.id]?.score??null}/>
                      </td>
                    ))}
                    <td className="px-2 py-1 text-center font-black text-gray-800 bg-indigo-50/40">{r.total||'—'}</td>
                    <td className="px-2 py-1 text-center bg-indigo-50/40">
                      <span className="text-sm font-black" style={{color:getGrade(r.mean).color}}>{r.mean||'—'}</span>
                    </td>
                    <td className="px-1 py-1 text-center bg-indigo-50/40">
                      {r.count>0&&<span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={gradeStyle(r.grade)}>{r.grade}</span>}
                    </td>
                    <td className="px-2 py-1 text-center font-bold text-indigo-600 bg-indigo-50/40">{r.count>0?r.pts:'—'}</td>
                    <td className="px-2 py-1 text-center font-black text-indigo-700 bg-indigo-50/40">{r.count>0?r.rank:'—'}</td>
                  </tr>
                );
              })}
            </tbody>
            {marksheetSorted.length>0&&selExam&&(
              <tfoot>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-200 font-bold text-xs border-t-2 border-gray-300">
                  <td colSpan={3} className="px-3 py-2 sticky left-0 bg-slate-100 z-10 font-black text-gray-700">Subject Mean</td>
                  {subjectMeans.map((mean,i)=>(
                    <td key={i} className="px-0.5 py-2 text-center">
                      {mean!==null?<ScoreCell score={mean}/>:<span className="text-gray-300">—</span>}
                    </td>
                  ))}
                  <td colSpan={5}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination page={page} total={marksheetSorted.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}/>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  SUBJECT ANALYSIS TAB
  // ══════════════════════════════════════════════════════════════
  const SubjectAnalysisTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Exam *" value={selExam} onChange={setSelExam} min="min-w-[210px]">
          <option value="">— Select Exam —</option>
          {exams.map(e=><option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
        </FilterSelect>
        <FilterSelect label="Form" value={selForm} onChange={v=>setSelForm(Number(v))}>
          <option value={0}>All Forms</option>
          {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
        </FilterSelect>
        <FilterSelect label="Stream" value={selStream} onChange={v=>setSelStream(Number(v))}>
          <option value={0}>All Streams</option>
          {streams.map(s=><option key={s.id} value={s.id}>{s.stream_name}</option>)}
        </FilterSelect>
        <div className="flex gap-2 ml-auto">
          <button onClick={()=>exportCSV(
            ['#','Code','Subject','Entries','Mean','Grade','Highest','Lowest','Pass Rate%','Teacher',...KCSE_GRADES.map(g=>`Grade ${g.grade}`)],
            subjectAnalysis.map((d,i)=>[String(i+1),d.sub.subject_code||'',d.sub.subject_name,String(d.scores.length),String(d.mean),getGrade(d.mean).grade,String(d.highest),String(d.lowest),`${d.passRate}%`,d.teacherName,...KCSE_GRADES.map(g=>String(d.gradeDist[g.grade]||0))]),
            `subject_analysis_${examObj?.exam_name||'exam'}_${examObj?.year||''}`
          )} disabled={!selExam} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
            <FiDownload size={13}/> CSV
          </button>
          <button onClick={()=>printArea('Subject Analysis Report')} disabled={!selExam}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
            <FiPrinter size={13}/> Print
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
        <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900">
          <h3 className="font-black text-white text-sm">📊 Subject Analysis Report</h3>
          <p className="text-slate-400 text-[10px] mt-0.5">{subjectAnalysis.length} subjects with entries · Sorted by mean score</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                {['#','Code','Subject','Entries','Mean','Grade','Highest','Lowest','Pass Rate','Grade Distribution','Teacher'].map(h=>(
                  <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!selExam?(
                <tr><td colSpan={11} className="text-center py-16 text-gray-400">
                  <FiBarChart2 size={30} className="mx-auto mb-3 opacity-30"/>
                  <p>Select an exam to view subject analysis</p>
                </td></tr>
              ):subjectAnalysis.map((d,i)=>{
                const g=getGrade(d.mean);
                return (
                  <tr key={d.sub.id} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-slate-50/20'} hover:bg-blue-50/30 transition-colors`}>
                    <td className="px-3 py-2.5 text-gray-400 font-bold">{i+1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-black text-[10px] px-2 py-0.5 rounded-lg" style={{color:g.color,backgroundColor:g.bg}}>
                        {d.sub.subject_code||'—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{d.sub.subject_name}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-600">{d.scores.length}</td>
                    <td className="px-3 py-2.5 text-center bg-indigo-50/30">
                      <span className="text-base font-black" style={{color:g.color}}>{d.mean}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center bg-indigo-50/30">
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={gradeStyle(g.grade)}>{g.grade}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{d.highest}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-red-500">{d.lowest}</td>
                    <td className="px-3 py-2.5 min-w-[110px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${d.passRate}%`,backgroundColor:d.passRate>=70?'#059669':d.passRate>=50?'#f59e0b':'#dc2626'}}/>
                        </div>
                        <span className="text-[10px] font-black w-9 text-right" style={{color:d.passRate>=70?'#059669':d.passRate>=50?'#d97706':'#dc2626'}}>{d.passRate}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-end gap-0.5 h-14">
                        {KCSE_GRADES.slice(0,8).map(g=>(
                          <GradeBar key={g.grade} count={d.gradeDist[g.grade]||0} total={d.scores.length} grade={g}/>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-[10px] whitespace-nowrap">{d.teacherName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  CLASS ANALYSIS TAB
  // ══════════════════════════════════════════════════════════════
  const ClassAnalysisTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Exam *" value={selExam} onChange={setSelExam} min="min-w-[210px]">
          <option value="">— Select Exam —</option>
          {exams.map(e=><option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
        </FilterSelect>
        <div className="flex gap-2 ml-auto">
          <button onClick={()=>exportCSV(
            ['Form','Stream','Students','Marked','Mean','Grade','Highest','Lowest',...KCSE_GRADES.map(g=>g.grade)],
            classAnalysis.map(r=>[r.form.form_name,r.stream.stream_name,String(r.count),String(r.marked),String(r.classMean),getGrade(r.classMean).grade,String(r.highest),String(r.lowest),...KCSE_GRADES.map(g=>String(r.dist[g.grade]||0))]),
            `class_analysis_${examObj?.exam_name||'exam'}`
          )} disabled={!selExam} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
            <FiDownload size={13}/> CSV
          </button>
          <button onClick={()=>printArea('Class/Form Analysis')} disabled={!selExam}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
            <FiPrinter size={13}/> Print
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
        <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900">
          <h3 className="font-black text-white text-sm">🏫 Class / Form Analysis Report</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                {['Form','Stream','Students','Marked','Mean','Grade','Highest','Lowest',...KCSE_GRADES.slice(0,6).map(g=>g.grade)].map(h=>(
                  <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!selExam?(
                <tr><td colSpan={14} className="text-center py-16 text-gray-400">
                  <FiGrid size={30} className="mx-auto mb-3 opacity-30"/>
                  <p>Select an exam to view class analysis</p>
                </td></tr>
              ):classAnalysis.length===0?(
                <tr><td colSpan={14} className="text-center py-10 text-gray-400">No class data available</td></tr>
              ):classAnalysis.map((r,i)=>{
                const g=getGrade(r.classMean);
                return (
                  <tr key={`${r.form.id}-${r.stream.id}`} className={`border-b border-gray-50 ${i%2===0?'bg-white':'bg-slate-50/20'} hover:bg-blue-50/30`}>
                    <td className="px-3 py-2.5 font-bold text-gray-800 text-center">{r.form.form_name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{r.stream.stream_name}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-700">{r.count}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500">{r.marked}</td>
                    <td className="px-3 py-2.5 text-center bg-indigo-50/30">
                      <span className="text-base font-black" style={{color:g.color}}>{r.classMean||'—'}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center bg-indigo-50/30">
                      {r.classMean>0&&<span className="text-xs font-black px-2 py-0.5 rounded-lg" style={gradeStyle(g.grade)}>{g.grade}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{r.highest||'—'}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-red-500">{r.lowest||'—'}</td>
                    {KCSE_GRADES.slice(0,6).map(gx=>(
                      <td key={gx.grade} className="px-2 py-2.5 text-center">
                        {r.dist[gx.grade]>0?<span className="font-bold" style={{color:gx.color}}>{r.dist[gx.grade]}</span>:<span className="text-gray-200">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  MERIT LIST TAB
  // ══════════════════════════════════════════════════════════════
  const MeritListTab = () => (
    <div className="space-y-4">
      {meritList.length>0&&(
        <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{background:'linear-gradient(135deg,#b45309,#d97706,#f59e0b)'}}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 blur-2xl"/>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
              <div>
                <h2 className="text-xl font-black">Merit List</h2>
                <p className="text-amber-100 text-sm">{examObj?.exam_name||'Select exam'} · {meritList.length} students ranked</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[{rank:1,icon:'🥇'},{rank:2,icon:'🥈'},{rank:3,icon:'🥉'}].map(x=>{
                const r=meritList[x.rank-1];
                if(!r) return null;
                return (
                  <div key={x.rank} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="text-2xl mb-1">{x.icon}</div>
                    <p className="font-black text-sm truncate">{r.student.first_name} {r.student.last_name}</p>
                    <p className="text-amber-100 text-xs">{r.student.admission_number} · {r.form?.form_name}</p>
                    <p className="text-2xl font-black mt-1">{r.mean}<span className="text-xs text-amber-200 ml-1">{r.grade}</span></p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Exam *" value={selExam} onChange={setSelExam} min="min-w-[210px]">
          <option value="">— Select Exam —</option>
          {exams.map(e=><option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
        </FilterSelect>
        <FilterSelect label="Form" value={selForm} onChange={v=>setSelForm(Number(v))}>
          <option value={0}>All Forms</option>
          {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
        </FilterSelect>
        <FilterSelect label="Stream" value={selStream} onChange={v=>setSelStream(Number(v))}>
          <option value={0}>All Streams</option>
          {streams.map(s=><option key={s.id} value={s.id}>{s.stream_name}</option>)}
        </FilterSelect>
        <div className="relative">
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search</label>
          <div className="relative">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student…"
              className="pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none"/>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={()=>exportCSV(
            ['Rank','Adm No','Student Name','Form','Stream','Total','Mean','Grade','Points'],
            meritList.map((r,i)=>[String(i+1),r.student.admission_number||'',`${r.student.first_name} ${r.student.last_name}`,r.form?.form_name||'',r.stream?.stream_name||'',String(r.total),String(r.mean),r.grade,String(r.pts)]),
            `merit_list_${examObj?.exam_name||'exam'}_${examObj?.year||''}`
          )} disabled={!selExam} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
            <FiDownload size={13}/> CSV
          </button>
          <button onClick={()=>printArea(`Merit List — ${examObj?.exam_name||''}`)} disabled={!selExam}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
            <FiPrinter size={13}/> Print
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{background:'linear-gradient(135deg,#b45309,#d97706)'}} className="text-white">
                {['Rank','Adm No','Student Name','Form','Stream','Total','Mean %','Grade','Points','Performance'].map(h=>(
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase text-center whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!selExam?(
                <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                  <FiAward size={30} className="mx-auto mb-3 opacity-30"/>
                  <p>Select an exam to generate the merit list</p>
                </td></tr>
              ):meritPaged.map((r,i)=>{
                const globalRank=(page-1)*pageSize+i+1;
                const g=getGrade(r.mean);
                const medal=globalRank===1?'🥇':globalRank===2?'🥈':globalRank===3?'🥉':null;
                return (
                  <tr key={r.student.id} className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${globalRank<=3?'bg-amber-50/20':i%2===0?'bg-white':'bg-slate-50/20'}`}>
                    <td className="px-4 py-3 text-center">
                      {medal?<span className="text-xl">{medal}</span>:<span className="font-black text-gray-500">{globalRank}</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-600">{r.student.admission_number||'—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-800">{r.student.first_name} {r.student.last_name}</div>
                      {r.student.kcpe_marks&&<div className="text-[10px] text-gray-400">KCPE: {r.student.kcpe_marks}</div>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 font-medium">{r.form?.form_name||'—'}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.stream?.stream_name||'—'}</td>
                    <td className="px-4 py-3 text-center font-black text-gray-800">{r.total}</td>
                    <td className="px-4 py-3 text-center"><span className="text-lg font-black" style={{color:g.color}}>{r.mean}</span></td>
                    <td className="px-4 py-3 text-center"><span className="text-sm font-black px-3 py-1 rounded-xl" style={gradeStyle(r.grade)}>{r.grade}</span></td>
                    <td className="px-4 py-3 text-center font-black text-indigo-600">{r.pts}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${r.mean}%`,backgroundColor:g.color}}/>
                        </div>
                        <span className="text-[10px] text-gray-400 w-8 text-right">{r.mean}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={meritList.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}/>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  PROGRESSIVE TAB
  // ══════════════════════════════════════════════════════════════
  const ProgressiveTab = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Form *" value={selForm} onChange={v=>setSelForm(Number(v))}>
          <option value={0}>Select Form</option>
          {forms.map(f=><option key={f.id} value={f.id}>{f.form_name}</option>)}
        </FilterSelect>
        <FilterSelect label="Stream" value={selStream} onChange={v=>setSelStream(Number(v))}>
          <option value={0}>All Streams</option>
          {streams.map(s=><option key={s.id} value={s.id}>{s.stream_name}</option>)}
        </FilterSelect>
        <div className="flex gap-2 ml-auto">
          <button onClick={()=>printArea('Progressive Report')} disabled={!selForm}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
            <FiPrinter size={13}/> Print
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
        <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900">
          <h3 className="font-black text-white text-sm">📈 Progressive Report — Student Performance Over Time</h3>
          <p className="text-slate-400 text-[10px] mt-0.5">Showing last 6 exams · Select form to compare</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-3 py-3 text-[10px] font-bold uppercase text-left w-8 sticky left-0 bg-slate-800 z-10">#</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase text-left sticky bg-slate-800 z-10 min-w-[90px]" style={{left:32}}>Adm No</th>
                <th className="px-3 py-3 text-[10px] font-bold uppercase text-left sticky bg-slate-800 z-10 min-w-[140px]" style={{left:122}}>Student Name</th>
                {exams.slice(0,6).map(ex=>(
                  <th key={ex.id} className="px-3 py-3 text-center min-w-[90px]">
                    <div className="text-[10px] font-bold">{ex.exam_name}</div>
                    <div className="text-[8px] text-slate-400">{ex.term} {ex.year}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[10px] font-bold">Trend</th>
              </tr>
            </thead>
            <tbody>
              {!selForm?(
                <tr><td colSpan={exams.length+4} className="text-center py-16 text-gray-400">
                  <FiTrendingUp size={30} className="mx-auto mb-3 opacity-30"/>
                  <p>Select a form to view student progress over time</p>
                </td></tr>
              ):progressPaged.map(({st,examMeans,trend,trendColor,recentExams},i)=>(
                <tr key={st.id} className={`border-b border-gray-50 hover:bg-blue-50/30 ${i%2===0?'bg-white':'bg-slate-50/20'}`}>
                  <td className={`px-3 py-2 sticky left-0 z-10 text-gray-400 font-bold ${i%2===0?'bg-white':'bg-slate-50'}`}>{(page-1)*pageSize+i+1}</td>
                  <td className={`px-3 py-2 sticky z-10 font-bold text-blue-600 ${i%2===0?'bg-white':'bg-slate-50'}`} style={{left:32}}>{st.admission_number||'—'}</td>
                  <td className={`px-3 py-2 sticky z-10 font-semibold text-gray-800 ${i%2===0?'bg-white':'bg-slate-50'}`} style={{left:122}}>{st.first_name} {st.last_name}</td>
                  {examMeans.map((mean,j)=>(
                    <td key={j} className="px-1 py-1 text-center">
                      {mean!==null?<ScoreCell score={mean}/>:<span className="text-gray-200">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-lg font-black" style={{color:trendColor}}>{trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={progressiveData.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}/>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  ANALYTICS TAB
  // ══════════════════════════════════════════════════════════════
  const AnalyticsTab = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Exam" value={selExam} onChange={setSelExam} min="min-w-[210px]">
          <option value="">— Select Exam —</option>
          {exams.map(e=><option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
        </FilterSelect>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {analyticsFormData.map(fp=>{
          const g=fp.classMean>0?getGrade(fp.classMean):null;
          return (
            <div key={fp.form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-gray-800">{fp.form.form_name}</h3>
                {g&&<span className="text-lg font-black px-2 py-1 rounded-xl" style={gradeStyle(g.grade)}>{g.grade}</span>}
              </div>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-1000" style={{width:`${fp.classMean}%`,backgroundColor:g?.color||'#e5e7eb'}}/>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black" style={{color:g?.color||'#9ca3af'}}>{fp.classMean||'—'}</span>
                <span className="text-xs text-gray-400">{fp.markedCount}/{fp.studentCount} students</span>
              </div>
            </div>
          );
        })}
      </div>
      {selExam&&(
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900">
            <h3 className="font-black text-white text-sm">🎯 Grade Distribution Heatmap — Students per Grade per Form</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Grade</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Range</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Pts</th>
                  {forms.map(f=><th key={f.id} className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">{f.form_name}</th>)}
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-700 uppercase bg-indigo-50">Total</th>
                </tr>
              </thead>
              <tbody>
                {gradeHeatmap.map(({grade,formCounts,total})=>(
                  <tr key={grade.grade} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5"><span className="text-sm font-black px-2.5 py-1 rounded-lg" style={gradeStyle(grade.grade)}>{grade.grade}</span></td>
                    <td className="px-4 py-2.5 text-gray-500">{grade.min}–{grade.max}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-700">{grade.pts}</td>
                    {formCounts.map((count,i)=>(
                      <td key={i} className="px-4 py-2.5 text-center">
                        {count>0?<span className="text-sm font-black px-2 py-0.5 rounded" style={{color:grade.color,backgroundColor:grade.bg}}>{count}</span>:<span className="text-gray-200">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center font-black bg-indigo-50/50">
                      {total>0?<span className="text-gray-800">{total}</span>:<span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  NEMIS TAB
  // ══════════════════════════════════════════════════════════════
  const NEMISTab = () => (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{background:'linear-gradient(135deg,#0f172a,#1e3a8a)'}}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-3xl">🏛️</div>
            <div>
              <h2 className="text-xl font-black">NEMIS Data Export</h2>
              <p className="text-slate-300 text-sm">National Education Management Information System — Ministry of Education Kenya</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {label:'Total Active',    val:students.filter(s=>s.status==='Active').length,              icon:'👥'},
              {label:'NEMIS Registered',val:students.filter(s=>s.nemis_number).length,                  icon:'✅'},
              {label:'Missing NEMIS',   val:students.filter(s=>s.status==='Active'&&!s.nemis_number).length, icon:'⚠️'},
              {label:'Export Ready',    val:nemisStudents.length,                                        icon:'📤'},
            ].map((s,i)=>(
              <div key={i} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                <span className="text-xl">{s.icon}</span>
                <p className="text-2xl font-black mt-1">{s.val}</p>
                <p className="text-[10px] text-slate-300 font-bold uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <FilterSelect label="Form" value={nemisForm} onChange={setNemisForm} min="min-w-[150px]">
          <option value="">All Forms</option>
          {forms.map(f=><option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
        </FilterSelect>
        <div className="relative">
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search</label>
          <div className="relative">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, Adm No, NEMIS…"
              className="pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none"/>
          </div>
        </div>
        <div className="ml-auto">
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">&nbsp;</label>
          <button onClick={()=>exportCSV(
            ['#','NEMIS No','First Name','Middle Name','Last Name','Gender','DOB','Nationality','County','Sub-County','Religion','KCPE Index','KCPE Marks','Adm No','Form','Stream','Year Admitted','Guardian','Guardian Phone','Special Needs'],
            nemisStudents.map((s,i)=>{const form=forms.find(f=>f.id===s.form_id);const stream=streams.find(st=>st.id===s.stream_id);return[String(i+1),s.nemis_number||'',s.first_name||'',s.middle_name||'',s.last_name||'',s.gender||'',s.date_of_birth||'','Kenyan',s.county||'',s.sub_county||'',s.religion||'',s.kcpe_index_number||'',String(s.kcpe_marks||''),s.admission_number||'',form?.form_name||'',stream?.stream_name||'',String(s.year_of_admission||''),s.guardian_name||'',s.guardian_phone||'',s.special_needs||'None'];}),
            `NEMIS_export_${new Date().getFullYear()}`
          )} className="px-5 py-2.5 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-lg"
            style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',boxShadow:'0 4px 15px rgba(37,99,235,0.3)'}}>
            <FiDownload size={14}/> Export NEMIS CSV
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
          <h3 className="font-black text-white text-sm">🏛️ NEMIS Student Register</h3>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-900/40 px-2 py-1 rounded-lg">{nemisStudents.length} students</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                {['#','NEMIS No','Adm No','Student Name','Gender','DOB','KCPE','Form','Stream','Guardian','Phone','Status'].map(h=>(
                  <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nemisPaged.length===0?(
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                  <FiDatabase size={28} className="mx-auto mb-2 opacity-30"/>
                  <p>No students found</p>
                </td></tr>
              ):nemisPaged.map((s,i)=>{
                const form=forms.find(f=>f.id===s.form_id);
                const stream=streams.find(st=>st.id===s.stream_id);
                return (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i%2===0?'bg-white':'bg-slate-50/20'}`}>
                    <td className="px-3 py-2.5 text-gray-400 font-bold">{(page-1)*pageSize+i+1}</td>
                    <td className="px-3 py-2.5">
                      {s.nemis_number
                        ?<span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{s.nemis_number}</span>
                        :<span className="text-red-400 text-[10px] font-bold">⚠️ MISSING</span>}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-blue-600">{s.admission_number||'—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{s.first_name} {s.middle_name?s.middle_name+' ':''}{s.last_name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.gender==='Male'?'bg-blue-100 text-blue-700':'bg-pink-100 text-pink-700'}`}>
                        {s.gender||'—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{s.date_of_birth||'—'}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-700">{s.kcpe_marks||'—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 font-medium">{form?.form_name||'—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{stream?.stream_name||'—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate">{s.guardian_name||'—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 font-mono">{s.guardian_phone||'—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status==='Active'?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={nemisStudents.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}/>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{background:'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 50%,#e8f0fe 100%)'}}>
      {/* Premium Header */}
      <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#0f172a 0%,#1e293b 40%,#1e3a8a 100%)'}}>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 50%,#6366f1 0%,transparent 50%),radial-gradient(circle at 80% 20%,#0891b2 0%,transparent 50%)'}}/>
        <div className="relative z-10 px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>📊</div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Reports & NEMIS Center</h1>
                <p className="text-slate-400 text-sm">Academic analytics · KCSE grading · NEMIS export — Kenya #1</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[
                {v:students.filter(s=>s.status==='Active').length, l:'Active Students'},
                {v:activeSubs.length, l:'Subjects'},
                {v:exams.filter(e=>marks.some(m=>m.exam_id===e.id)).length, l:'Exams with Marks'},
              ].map((s,i)=>(
                <div key={i} className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                  <p className="text-lg font-black text-white">{s.v}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{s.l}</p>
                </div>
              ))}
              <button onClick={fetchAll} disabled={refreshing}
                className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-slate-300 hover:bg-white/20 transition-all disabled:opacity-50">
                <FiRefreshCw size={16} className={refreshing?'animate-spin':''}/>
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-5 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map(tab=>{
              const active=activeTab===tab.key;
              return (
                <button key={tab.key} onClick={()=>{setActiveTab(tab.key);setPage(1);setSearch('');}}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${active?'text-white shadow-lg shadow-indigo-500/30':'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                  style={active?{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}:{}}>
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                  {tab.badge&&<span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${active?'bg-white/20':'bg-amber-500 text-white'}`}>{tab.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab==='marksheet'        && <MarkSheetTab/>}
        {activeTab==='subject-analysis' && <SubjectAnalysisTab/>}
        {activeTab==='class-analysis'   && <ClassAnalysisTab/>}
        {activeTab==='progressive'      && <ProgressiveTab/>}
        {activeTab==='merit-list'       && <MeritListTab/>}
        {activeTab==='analytics'        && <AnalyticsTab/>}
        {activeTab==='nemis'            && <NEMISTab/>}
        {activeTab==='report-card'      && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-xl font-black text-gray-700">Report Cards</h2>
            <p className="text-gray-400 mt-2">Full Zeraki-style report card generator with QR codes, progress charts, and bulk print</p>
            <p className="text-indigo-500 text-sm mt-4 font-medium">🚀 Ultra-premium upgrade in progress</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-gray-500 font-medium">Loading Reports…</p>
        </div>
      </div>
    }>
      <ReportsContent/>
    </Suspense>
  );
}
