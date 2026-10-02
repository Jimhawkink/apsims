'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiTrendingDown, FiAlertTriangle, FiUsers, FiDollarSign, FiRefreshCw, FiActivity, FiBarChart2 } from 'react-icons/fi';

function RiskBadge({ level }: { level: string }) {
  const cfg = level === 'High' ? { color: '#dc2626', bg: '#fef2f2' } : level === 'Medium' ? { color: '#d97706', bg: '#fffbeb' } : { color: '#16a34a', bg: '#f0fdf4' };
  return <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={cfg}>{level} Risk</span>;
}

export default function AnalyticsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dropout'|'fee'|'academic'|'teacher'>('dropout');
  const currentYear = new Date().getFullYear();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sR, pR, aR, mR, fR] = await Promise.all([
      supabase.from('school_students').select('id,first_name,last_name,form_id,status,admission_date').eq('status','Active'),
      supabase.from('school_fee_payments').select('student_id,amount,payment_date'),
      supabase.from('school_daily_attendance').select('student_id,status,attendance_date').gte('attendance_date',`${currentYear}-01-01`),
      supabase.from('school_exam_marks').select('student_id,marks,subject_id,form_id').order('created_at',{ascending:false}).limit(3000),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    setStudents(sR.data||[]); setPayments(pR.data||[]);
    setAttendance(aR.data||[]); setMarks(mR.data||[]); setForms(fR.data||[]);
    setLoading(false);
  }, [currentYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── COMPUTE DROPOUT RISK ──
  const dropoutRisk = students.map(s => {
    const sAtt = attendance.filter(a => a.student_id === s.id);
    const absences = sAtt.filter(a => a.status === 'Absent').length;
    const total = sAtt.length;
    const attPct = total > 0 ? Math.round((sAtt.filter(a=>a.status==='Present').length/total)*100) : 100;
    const sMarks = marks.filter(m => m.student_id === s.id);
    const avgMark = sMarks.length > 0 ? Math.round(sMarks.reduce((sum,m)=>sum+Number(m.marks||0),0)/sMarks.length) : null;
    const sPay = payments.filter(p => p.student_id === s.id);
    const feesPaid = sPay.reduce((sum,p)=>sum+Number(p.amount||0),0);
    // Risk score: absence heavy weight + low marks + zero fees
    let risk = 0;
    if (attPct < 60) risk += 40; else if (attPct < 75) risk += 20; else if (attPct < 85) risk += 10;
    if (avgMark !== null) { if (avgMark < 30) risk += 30; else if (avgMark < 50) risk += 15; }
    if (feesPaid === 0) risk += 30; else if (feesPaid < 5000) risk += 15;
    const level = risk >= 55 ? 'High' : risk >= 30 ? 'Medium' : 'Low';
    const form = forms.find(f=>f.id===s.form_id);
    return { ...s, attPct, avgMark, feesPaid, riskScore: risk, level, form: form?.form_name||'—', absences };
  }).sort((a,b) => b.riskScore - a.riskScore);

  const highRisk = dropoutRisk.filter(s=>s.level==='High');
  const medRisk = dropoutRisk.filter(s=>s.level==='Medium');

  // ── FEE DEFAULT PREDICTION ──
  const feeDefault = students.map(s => {
    const sPay = payments.filter(p=>p.student_id===s.id);
    const totalPaid = sPay.reduce((sum,p)=>sum+Number(p.amount||0),0);
    const lastPay = sPay.sort((a,b)=>new Date(b.payment_date).getTime()-new Date(a.payment_date).getTime())[0];
    const daysSincePayment = lastPay ? Math.floor((Date.now()-new Date(lastPay.payment_date).getTime())/86400000) : 999;
    const sAtt = attendance.filter(a=>a.student_id===s.id);
    const attPct = sAtt.length > 0 ? Math.round((sAtt.filter(a=>a.status==='Present').length/sAtt.length)*100) : 100;
    let risk = 0;
    if (totalPaid === 0) risk = 90;
    else if (daysSincePayment > 90) risk += 40;
    else if (daysSincePayment > 60) risk += 25;
    else if (daysSincePayment > 30) risk += 10;
    if (attPct < 70) risk += 20;
    const level = risk >= 60 ? 'High' : risk >= 30 ? 'Medium' : 'Low';
    const form = forms.find(f=>f.id===s.form_id);
    return { ...s, totalPaid, daysSincePayment, feeRisk: risk, level, form: form?.form_name||'—' };
  }).filter(s=>s.level!=='Low').sort((a,b)=>b.feeRisk-a.feeRisk).slice(0,20);

  // ── ACADEMIC TRAJECTORY ──
  const academicTraj = students.map(s => {
    const sMarks = marks.filter(m=>m.student_id===s.id);
    const avg = sMarks.length > 0 ? Math.round(sMarks.reduce((sum,m)=>sum+Number(m.marks||0),0)/sMarks.length) : 0;
    const form = forms.find(f=>f.id===s.form_id);
    const trajectory = avg >= 65 ? '🎓 University Bound' : avg >= 50 ? '📋 Polytechnic/College' : avg >= 35 ? '⚠️ Needs Intensive Support' : '❌ At Risk — Intervention Needed';
    const level = avg >= 65 ? 'Low' : avg >= 50 ? 'Low' : avg >= 35 ? 'Medium' : 'High';
    return { ...s, avg, trajectory, level, form: form?.form_name||'—' };
  }).filter(s=>s.avg>0).sort((a,b)=>a.avg-b.avg);

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#312e81)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">🧠</div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Predictive Analytics</h1>
                <p className="text-indigo-300 text-sm">Early warning system · {highRisk.length} students at HIGH risk · Data-driven insights</p>
                <p className="text-indigo-400 text-xs mt-1">Analysing {students.length} students · {payments.length} payments · {attendance.length} attendance records</p>
              </div>
            </div>
            <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition">
              <FiRefreshCw size={14} className={loading?'animate-spin':''} /> Refresh Analysis
            </button>
          </div>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'High Dropout Risk', value: highRisk.length, color: '#ef4444', icon: '🚨' },
              { label: 'Medium Risk', value: medRisk.length, color: '#f59e0b', icon: '⚠️' },
              { label: 'Fee Defaulters (Predicted)', value: feeDefault.filter(s=>s.level==='High').length, color: '#ef4444', icon: '💳' },
              { label: 'Needs Intervention', value: academicTraj.filter(s=>s.avg<35).length, color: '#d97706', icon: '📚' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xl">{s.icon}</div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-indigo-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm flex-wrap">
        {([['dropout','🚨 Dropout Risk'],['fee','💳 Fee Default'],['academic','📚 Academic Trajectory']] as const).map(([v,l])=>(
          <button key={v} onClick={() => setActiveTab(v)}
            className={`flex-1 py-2.5 text-sm font-bold transition ${activeTab===v?'bg-indigo-700 text-white':'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : activeTab === 'dropout' ? (
        <div className="space-y-4">
          {highRisk.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-black text-red-800">{highRisk.length} students at HIGH dropout risk — immediate action required</p>
                <p className="text-xs text-red-600 mt-0.5">These students show poor attendance + low marks + unpaid fees. Call parents NOW.</p>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-black text-gray-800">Student Dropout Risk Analysis</h3>
              <p className="text-xs text-gray-500">Ranked by risk score (attendance 40% + marks 30% + fees 30%)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Student','Form','Attendance','Avg Mark','Fees Paid','Risk Score','Risk Level','Action'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dropoutRisk.slice(0,30).map((s,i)=>(
                    <tr key={s.id} className={`hover:bg-gray-50/60 transition ${s.level==='High'?'bg-red-50/30':''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: s.level==='High'?'#dc2626':s.level==='Medium'?'#d97706':'#16a34a' }}>{s.first_name.charAt(0)}</div>
                          <p className="font-bold text-gray-800 text-xs">{s.first_name} {s.last_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.form}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full" style={{ width:`${s.attPct}%`, background:s.attPct>=80?'#22c55e':s.attPct>=60?'#f59e0b':'#ef4444' }} />
                          </div>
                          <span className="text-xs font-bold" style={{color:s.attPct>=80?'#16a34a':s.attPct>=60?'#d97706':'#dc2626'}}>{s.attPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{color:s.avgMark&&s.avgMark>=50?'#16a34a':s.avgMark&&s.avgMark>=35?'#d97706':'#dc2626'}}>{s.avgMark!==null?`${s.avgMark}%`:'—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">KES {s.feesPaid.toLocaleString()}</td>
                      <td className="px-4 py-3"><div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-1.5 rounded-full bg-red-400" style={{width:`${s.riskScore}%`}} /></div></td>
                      <td className="px-4 py-3"><RiskBadge level={s.level} /></td>
                      <td className="px-4 py-3">
                        {s.level==='High'&&<span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">📞 Call Parent</span>}
                        {s.level==='Medium'&&<span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⚠️ Monitor</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'fee' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">Predicted Fee Defaulters</h3><p className="text-xs text-gray-500">Based on payment history, days since last payment, and attendance</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">{['Student','Form','Total Paid','Days Since Payment','Default Risk','Action'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {feeDefault.length===0?<tr><td colSpan={6} className="text-center py-10 text-gray-400">No fee default predictions — great!</td></tr>
                :feeDefault.map(s=>(
                  <tr key={s.id} className={`hover:bg-gray-50/60 transition ${s.level==='High'?'bg-amber-50/30':''}`}>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-black">{s.first_name.charAt(0)}</div><p className="font-bold text-gray-800 text-xs">{s.first_name} {s.last_name}</p></div></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.form}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">KES {s.totalPaid.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold ${s.daysSincePayment>60?'text-red-600':s.daysSincePayment>30?'text-amber-600':'text-green-600'}`}>{s.daysSincePayment===999?'Never paid':`${s.daysSincePayment} days`}</span></td>
                    <td className="px-4 py-3"><RiskBadge level={s.level} /></td>
                    <td className="px-4 py-3"><span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">📱 Send Reminder</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b"><h3 className="font-black text-gray-800">Academic Trajectory</h3><p className="text-xs text-gray-500">Projected outcomes based on current exam performance</p></div>
          <div className="divide-y divide-gray-50">
            {academicTraj.slice(0,25).map(s=>(
              <div key={s.id} className="px-5 py-3 flex items-center gap-4 hover:bg-indigo-50/20 transition">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: s.avg>=65?'#16a34a':s.avg>=50?'#2563eb':s.avg>=35?'#d97706':'#dc2626' }}>{s.first_name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{s.first_name} {s.last_name} <span className="text-gray-400 text-xs">· {s.form}</span></p>
                  <p className="text-xs mt-0.5">{s.trajectory}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black" style={{color:s.avg>=65?'#16a34a':s.avg>=50?'#2563eb':s.avg>=35?'#d97706':'#dc2626'}}>{s.avg}%</p>
                  <RiskBadge level={s.level} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
