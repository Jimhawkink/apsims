// APSIMS Ultra Dashboard Charts
const COLORS = {
  accent:'#6c5ce7',accent2:'#a78bfa',green:'#10b981',green2:'#34d399',
  red:'#ef4444',red2:'#f87171',amber:'#f59e0b',amber2:'#fbbf24',
  blue:'#3b82f6',blue2:'#60a5fa',pink:'#ec4899',cyan:'#06b6d4',
  gray:'#6b7280',bg:'rgba(255,255,255,.04)',grid:'rgba(255,255,255,.06)'
};
const baseOpts = {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#1e2a44',titleColor:'#e8eaf0',bodyColor:'#8b95b0',borderColor:'rgba(99,115,155,.3)',borderWidth:1,cornerRadius:8,padding:10,titleFont:{size:11,weight:'600'},bodyFont:{size:10}}},animation:{duration:1200,easing:'easeOutQuart'}};

function gradient(ctx,c1,c2,h){const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,c1);g.addColorStop(1,c2);return g;}

document.addEventListener('DOMContentLoaded',()=>{
// 1. FEE COLLECTION TREND - Gradient Bar
const c1=document.getElementById('feeCollectionChart');
if(c1){const ctx=c1.getContext('2d');
new Chart(c1,{type:'bar',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[
{label:'Collected',data:[580,720,810,650,890,550],backgroundColor:[gradient(ctx,'#10b981','#064e3b',200),gradient(ctx,'#10b981','#064e3b',200),gradient(ctx,'#10b981','#064e3b',200),gradient(ctx,'#10b981','#064e3b',200),gradient(ctx,'#10b981','#064e3b',200),gradient(ctx,'#10b981','#064e3b',200)],borderRadius:6,borderSkipped:false,barPercentage:.6},
{label:'Target',data:[700,700,800,700,900,700],backgroundColor:'rgba(255,255,255,.06)',borderRadius:6,borderSkipped:false,barPercentage:.6}
]},options:{...baseOpts,scales:{x:{grid:{display:false},ticks:{color:'#5a6580',font:{size:10}}},y:{grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9},callback:v=>'Ksh '+v+'K'},beginAtZero:true}}}});}

// 2. ENROLLMENT BY FORM - Horizontal gradient bars
const c2=document.getElementById('enrollmentChart');
if(c2){new Chart(c2,{type:'bar',data:{labels:['Form 1','Form 2','Form 3','Form 4'],datasets:[
{label:'Boys',data:[178,165,158,148],backgroundColor:'rgba(59,130,246,.7)',borderRadius:4,borderSkipped:false},
{label:'Girls',data:[164,153,146,136],backgroundColor:'rgba(236,72,153,.6)',borderRadius:4,borderSkipped:false}
]},options:{...baseOpts,indexAxis:'y',plugins:{...baseOpts.plugins,legend:{display:true,position:'top',labels:{color:'#8b95b0',font:{size:9},boxWidth:8,padding:10}}},scales:{x:{stacked:true,grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9}}},y:{stacked:true,grid:{display:false},ticks:{color:'#8b95b0',font:{size:10}}}}}});}

// 3. ATTENDANCE 7-DAY TREND - Area + Line
const c3=document.getElementById('attendanceChart');
if(c3){const ctx=c3.getContext('2d');const gf=gradient(ctx,'rgba(236,72,153,.25)','rgba(236,72,153,0)',200);
new Chart(c3,{type:'line',data:{labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],datasets:[{label:'Attendance %',data:[93,95,91,97,88,null,null],borderColor:COLORS.pink,backgroundColor:gf,borderWidth:2.5,pointRadius:4,pointBackgroundColor:COLORS.pink,pointBorderColor:'#131b2e',pointBorderWidth:2,tension:.4,fill:true,spanGaps:false}]},options:{...baseOpts,scales:{x:{grid:{display:false},ticks:{color:'#5a6580',font:{size:10}}},y:{min:80,max:100,grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9},callback:v=>v+'%'}}}}});}

// 4. SUBJECT PERFORMANCE - Radar
const c4=document.getElementById('subjectRadar');
if(c4){new Chart(c4,{type:'radar',data:{labels:['English','Maths','Sciences','History','Geography','Business','Kiswahili'],datasets:[
{label:'This Term',data:[68,62,70,65,72,74,67],borderColor:COLORS.blue,backgroundColor:'rgba(59,130,246,.12)',borderWidth:2,pointRadius:3,pointBackgroundColor:COLORS.blue},
{label:'Last Term',data:[64,58,66,63,68,70,65],borderColor:COLORS.accent,backgroundColor:'rgba(108,92,231,.08)',borderWidth:1.5,pointRadius:2,pointBackgroundColor:COLORS.accent,borderDash:[4,4]}
]},options:{...baseOpts,plugins:{...baseOpts.plugins,legend:{display:true,position:'top',labels:{color:'#8b95b0',font:{size:9},boxWidth:8,padding:10}}},scales:{r:{min:40,max:100,ticks:{color:'#5a6580',font:{size:8},stepSize:20,backdropColor:'transparent'},grid:{color:'rgba(255,255,255,.06)'},pointLabels:{color:'#8b95b0',font:{size:10}}}}}});}

// 5. FEE PAYMENT METHOD - Doughnut
const c5=document.getElementById('feeMethodChart');
if(c5){new Chart(c5,{type:'doughnut',data:{labels:['M-Pesa','Bank Transfer','Cash','Cheque'],datasets:[{data:[68,18,10,4],backgroundColor:[COLORS.green,COLORS.blue,COLORS.gray,'#8b5cf6'],borderWidth:0,hoverOffset:6}]},options:{...baseOpts,cutout:'72%'}});}

// 6. REVENUE vs EXPENDITURE - Multi-line
const c6=document.getElementById('revenueExpenseChart');
if(c6){const ctx=c6.getContext('2d');const gRev=gradient(ctx,'rgba(16,185,129,.2)','rgba(16,185,129,0)',200);const gExp=gradient(ctx,'rgba(239,68,68,.15)','rgba(239,68,68,0)',200);
new Chart(c6,{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun'],datasets:[
{label:'Revenue (Ksh K)',data:[780,920,1010,850,1090,750],borderColor:COLORS.green,backgroundColor:gRev,borderWidth:2.5,pointRadius:4,pointBackgroundColor:COLORS.green,pointBorderColor:'#131b2e',pointBorderWidth:2,tension:.4,fill:true},
{label:'Expenditure (Ksh K)',data:[420,480,520,510,560,480],borderColor:COLORS.red,backgroundColor:gExp,borderWidth:2,pointRadius:3,pointBackgroundColor:COLORS.red,pointBorderColor:'#131b2e',pointBorderWidth:2,tension:.4,fill:true,borderDash:[5,3]}
]},options:{...baseOpts,plugins:{...baseOpts.plugins,legend:{display:true,position:'top',labels:{color:'#8b95b0',font:{size:9},boxWidth:8,padding:12}}},scales:{x:{grid:{display:false},ticks:{color:'#5a6580',font:{size:10}}},y:{grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9},callback:v=>'Ksh '+v+'K'}}}}});}

// 7. TERM COMPARISON - Grouped Bar
const c7=document.getElementById('termCompareChart');
if(c7){new Chart(c7,{type:'bar',data:{labels:['Eng','Math','Sci','Hist','Geo','Biz','Kisw'],datasets:[
{label:'Term 1',data:[62,58,64,61,66,68,63],backgroundColor:'rgba(108,92,231,.6)',borderRadius:4,barPercentage:.5},
{label:'Term 2',data:[68,62,70,65,72,74,67],backgroundColor:'rgba(59,130,246,.7)',borderRadius:4,barPercentage:.5}
]},options:{...baseOpts,plugins:{...baseOpts.plugins,legend:{display:true,position:'top',labels:{color:'#8b95b0',font:{size:9},boxWidth:8}}},scales:{x:{grid:{display:false},ticks:{color:'#5a6580',font:{size:9}}},y:{min:40,max:90,grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9}}}}}});}

// 8. STUDENT ENROLLMENT TREND - Area
const c8=document.getElementById('enrollTrendChart');
if(c8){const ctx=c8.getContext('2d');const g=gradient(ctx,'rgba(108,92,231,.3)','rgba(108,92,231,0)',200);
new Chart(c8,{type:'line',data:{labels:['2020','2021','2022','2023','2024','2025'],datasets:[{label:'Total Students',data:[890,960,1040,1120,1195,1248],borderColor:COLORS.accent,backgroundColor:g,borderWidth:2.5,pointRadius:5,pointBackgroundColor:COLORS.accent,pointBorderColor:'#131b2e',pointBorderWidth:2,tension:.4,fill:true}]},options:{...baseOpts,scales:{x:{grid:{display:false},ticks:{color:'#5a6580',font:{size:10}}},y:{grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9}}}}}});}

// 9. FEE COLLECTION GAUGE - Doughnut as gauge
const c9=document.getElementById('feeGauge');
if(c9){new Chart(c9,{type:'doughnut',data:{labels:['Collected','Remaining'],datasets:[{data:[83,17],backgroundColor:[COLORS.green,'rgba(255,255,255,.06)'],borderWidth:0}]},options:{...baseOpts,cutout:'80%',rotation:-90,circumference:180,plugins:{...baseOpts.plugins,tooltip:{enabled:false}}}});}

// 10. DAILY ATTENDANCE HEATMAP-STYLE WEEKLY BAR
const c10=document.getElementById('weeklyAttendanceBar');
if(c10){new Chart(c10,{type:'bar',data:{labels:['Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8','Wk9','Wk10'],datasets:[{label:'Attendance %',data:[94,92,96,93,95,91,97,94,96,93],backgroundColor:function(ctx){const v=ctx.raw;return v>=95?COLORS.green:v>=90?COLORS.amber:COLORS.red;},borderRadius:4,borderSkipped:false,barPercentage:.65}]},options:{...baseOpts,scales:{x:{grid:{display:false},ticks:{color:'#5a6580',font:{size:9}}},y:{min:85,max:100,grid:{color:COLORS.grid},ticks:{color:'#5a6580',font:{size:9},callback:v=>v+'%'}}}}});}
});
