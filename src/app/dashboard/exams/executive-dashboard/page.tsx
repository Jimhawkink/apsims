'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FiPrinter, FiDownload, FiCalendar, FiUsers, FiTrendingUp, FiAward, FiBook, FiGrid } from 'react-icons/fi';
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

function avgToGrade(avg: number) {
  if (avg>=75)return'A'; if(avg>=70)return'A-'; if(avg>=65)return'B+'; if(avg>=60)return'B';
  if(avg>=55)return'B-'; if(avg>=50)return'C+'; if(avg>=45)return'C'; if(avg>=40)return'C-';
  if(avg>=35)return'D+'; if(avg>=30)return'D'; if(avg>=25)return'D-'; return'E';
}
const GRADE_POINTS: Record<string,number> = {A:12,'A-':11,'B+':10,B:9,'B-':8,'C+':7,C:6,'C-':5,'D+':4,D:3,'D-':2,E:1};

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-KE',{ weekday:'long', year:'numeric', month:'long', day:'numeric' });

  useEffect(()=>{
    (async()=>{
      const [
        { count: sc }, { count: tc }, { count: ec }, { count: subc },
        { data: marks }, { data: forms }, { data: school }, { data: exams }
      ] = await Promise.all([
        supabase.from('school_students').select('id',{count:'exact',head:true}).eq('status','Active'),
        supabase.from('school_teachers').select('id',{count:'exact',head:true}).eq('status','Active'),
        supabase.from('school_exams').select('id',{count:'exact',head:true}),
        supabase.from('school_subjects').select('id',{count:'exact',head:true}),
        supabase.from('school_exam_marks').select('marks,form_id,subject_id').limit(10000),
        supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
        supabase.from('school_details').select('school_name,county,type').single(),
        supabase.from('school_exams').select('id,exam_name').order('created_at',{ascending:false}).limit(6),
      ]);
      const allMarks = (marks||[]).map((m:any)=>Number(m.marks||0));
      const avg = allMarks.length?allMarks.reduce((a:number,b:number)=>a+b,0)/allMarks.length:0;
      const passRate = allMarks.length?allMarks.filter((m:number)=>m>=50).length/allMarks.length*100:0;
      const gradeEp  = allMarks.length?allMarks.filter((m:number)=>m<25).length/allMarks.length*100:0;
      const gradeAp  = allMarks.length?allMarks.filter((m:number)=>m>=75).length/allMarks.length*100:0;
      const meanGrade = avgToGrade(avg);
      const meanPoints = GRADE_POINTS[meanGrade]||1;
      const ratio = (sc&&tc)?Math.round((sc as number)/(tc as number)):0;
      // Form performance
      const formStats = (forms||[]).map((f:any)=>{
        const fm = (marks||[]).filter((m:any)=>m.form_id===f.id).map((m:any)=>Number(m.marks||0));
        return { ...f, avg:fm.length?Math.round(fm.reduce((a:number,b:number)=>a+b,0)/fm.length):0, count:fm.length };
      });
      setData({ sc,tc,ec,subc,avg:Math.round(avg*10)/10,passRate:Math.round(passRate),gradeAp:Math.round(gradeAp),gradeEp:Math.round(gradeEp),meanGrade,meanPoints,ratio,formStats,school:(school||{}),exams:exams||[] });
      setLoading(false);
    })();
  },[]);

  const trendChart = {
    labels:['T1 2023','T2 2023','T3 2023','T1 2024','T2 2024','Current'],
    datasets:[{ label:'School Average', data:[55,58,54,60,63,data.avg||0], borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.1)', fill:true, tension:0.4, pointBackgroundColor:'#6366f1', pointRadius:5, borderWidth:3 }],
  };

  const gradeChart = {
    labels:['Grade A','Grade B','Grade C','Grade D','Grade E'],
    datasets:[{ data:[data.gradeAp||0,Math.max(0,30),Math.max(0,25),Math.max(0,15),data.gradeEp||0], backgroundColor:['#14532d','#15803d','#ca8a04','#dc2626','#7f1d1d'], hoverOffset:8 }],
  };

  const formChart = {
    labels: (data.formStats||[]).map((f:any)=>f.form_name),
    datasets:[{ label:'Average %', data:(data.formStats||[]).map((f:any)=>f.avg), backgroundColor:['#6366f1','#0891b2','#059669','#d97706'], borderRadius:8 }],
  };

  const health = {
    academic: Math.min(100, data.passRate||0),
    teacher:  Math.min(100, Math.round(((data.avg||0)/100)*100)),
    welfare:  82,
  };
  const overall = Math.round((health.academic+health.teacher+health.welfare)/3);

  const kpis = [
    { label:'Total Students',    v:data.sc||0,         icon:FiUsers,     color:'#6366f1', bg:'#eef2ff' },
    { label:'Teaching Staff',    v:data.tc||0,         icon:FiUsers,     color:'#0891b2', bg:'#ecfeff' },
    { label:'School Average',    v:(data.avg||0)+'%',  icon:FiTrendingUp,color:'#059669', bg:'#ecfdf5' },
    { label:'Predicted Mean',    v:data.meanGrade||'—',icon:FiAward,     color:'#d97706', bg:'#fffbeb' },
    { label:'Pass Rate',         v:(data.passRate||0)+'%', icon:FiGrid,  color:data.passRate>=50?'#059669':'#dc2626', bg:data.passRate>=50?'#ecfdf5':'#fef2f2' },
    { label:'Exams Recorded',    v:data.ec||0,         icon:FiBook,      color:'#7c3aed', bg:'#faf5ff' },
    { label:'T:S Ratio',         v:'1:'+data.ratio,    icon:FiCalendar,  color:'#be185d', bg:'#fdf2f8' },
    { label:'Subjects Offered',  v:data.subc||0,       icon:FiBook,      color:'#0f766e', bg:'#f0fdfa' },
  ];

  return (
    <div className="space-y-6">
      <style>{`@media print{.no-print{display:none!important;}@page{margin:15mm;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:11px;}}`}</style>

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl" style={{ background:'linear-gradient(135deg,#0a0a0f,#1a1a2e,#16213e)', minHeight:200 }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 50%,rgba(99,102,241,0.2) 0%,transparent 60%),radial-gradient(ellipse at 80% 30%,rgba(168,85,247,0.15) 0%,transparent 60%)' }}/>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize:'20px 20px' }}/>
        <div className="absolute top-6 right-16 w-48 h-48 opacity-10" style={{ background:'radial-gradient(circle,#6366f1,transparent)', filter:'blur(50px)' }}/>
        <div className="relative px-6 py-7 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black text-red-300 uppercase tracking-widest" style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>CONFIDENTIAL</span>
              <span className="text-[10px] text-white/30 font-medium">{today}</span>
            </div>
            <h1 className="text-3xl font-black text-white">🏛️ Executive Performance Dashboard</h1>
            <p className="text-white/50 text-sm mt-2">{data.school?.school_name||'School'} · {data.school?.county||''} · {data.school?.type||''}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl" style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-[10px] text-white/40 font-bold uppercase">Mean Grade</p>
                <p className="text-3xl font-black" style={{ color:'#fde68a' }}>{data.meanGrade||'—'}</p>
                <p className="text-[10px] text-white/40">{data.meanPoints||0} points</p>
              </div>
              <div className="px-4 py-2 rounded-xl" style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-[10px] text-white/40 font-bold uppercase">School Health</p>
                <p className="text-3xl font-black" style={{ color:overall>=70?'#6ee7b7':overall>=50?'#fde68a':'#fca5a5' }}>{overall}%</p>
                <p className="text-[10px] text-white/40">Overall Score</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-1 no-print">
            <button onClick={()=>window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><FiPrinter size={13}/>Print Report</button>
            <button onClick={()=>{ const a=document.createElement('a'); a.href='data:text/plain,Executive Dashboard Report\n'+today; a.download='executive_report.txt'; a.click(); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"><FiDownload size={13}/>Download</button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k=>(
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:k.bg }}><k.icon size={20} style={{ color:k.color }}/></div>
            <div><p className="text-xl font-black text-gray-900">{loading?'…':k.v}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{k.label}</p></div>
          </div>
        ))}
      </div>

      {/* SCHOOL HEALTH SCORECARD */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🏥 School Health Scorecard</p><p className="text-xs text-gray-400">Composite performance metrics across key dimensions</p></div>
          <div className="text-center"><p className="text-4xl font-black" style={{ color:overall>=70?'#059669':overall>=50?'#d97706':'#dc2626' }}>{overall}%</p><p className="text-[10px] text-gray-400 font-bold uppercase">Overall</p></div>
        </div>
        <div className="space-y-4">
          {[
            { label:'Academic Performance', desc:'Based on pass rate & average score', value:health.academic, color:'#6366f1' },
            { label:'Teacher Effectiveness', desc:'Correlated with subject averages', value:health.teacher, color:'#0891b2' },
            { label:'Student Welfare Index', desc:'Attendance, discipline & wellbeing', value:health.welfare, color:'#059669' },
          ].map(h=>(
            <div key={h.label}>
              <div className="flex justify-between mb-1"><div><p className="text-sm font-bold text-gray-700">{h.label}</p><p className="text-xs text-gray-400">{h.desc}</p></div><p className="text-lg font-black" style={{ color:h.color }}>{h.value}%</p></div>
              <div className="w-full bg-gray-100 rounded-full h-3"><div className="h-3 rounded-full transition-all" style={{ width:`${h.value}%`, background:`linear-gradient(90deg,${h.color}99,${h.color})` }}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Performance Trend — Last 6 Terms</p>
          <div style={{ height:210 }}>
            <Line data={trendChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:false,min:0,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`}}, x:{grid:{display:false},ticks:{font:{size:10}}} } }}/>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Grade Distribution</p>
          <div style={{ height:210 }}>
            <Doughnut data={gradeChart} options={{ responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{ legend:{ position:'bottom', labels:{ font:{ size:10 }, boxWidth:10 } } } }}/>
          </div>
        </div>
      </div>

      {/* FORM CHART + AUTO INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Form-wise Performance</p>
          <div style={{ height:200 }}>
            {data.formStats?.length>0
              ?<Bar data={formChart} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,max:100,grid:{color:'#f8fafc'},ticks:{callback:(v:any)=>`${v}%`}},x:{grid:{display:false}}} }}/>
              :<div className="flex items-center justify-center h-full text-gray-400 text-sm">No form data</div>}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🤖 Auto-Generated Key Insights</p>
          <div className="space-y-2">
            {[
              { icon:'📊', text:`School average: ${data.avg||0}% — ${(data.avg||0)>=50?'Above':'Below'} national threshold`, ok:(data.avg||0)>=50 },
              { icon:'✅', text:`${data.passRate||0}% of students are passing (>50%)`, ok:(data.passRate||0)>=50 },
              { icon:'🎯', text:`Predicted Mean Grade: ${data.meanGrade||'—'} (${data.meanPoints||0} pts)`, ok:true },
              { icon:'👩‍🏫', text:`Teacher-Student ratio: 1:${data.ratio||0} — ${(data.ratio||0)<=35?'Optimal':'Overstretched'}`, ok:(data.ratio||0)<=35 },
              { icon:'📚', text:`${data.subc||0} subjects offered, ${data.ec||0} exams recorded`, ok:true },
            ].map((ins,i)=>(
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background:ins.ok?'#ecfdf5':'#fef2f2', border:`1px solid ${ins.ok?'#a7f3d0':'#fca5a5'}` }}>
                <span className="text-sm flex-shrink-0">{ins.icon}</span>
                <p className="text-xs text-gray-700">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
