'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiBarChart2, FiDownload, FiRefreshCw, FiAlertTriangle, FiUsers, FiFilter } from 'react-icons/fi';

function KPICard({ label, value, sub, trend, color, emoji }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      {trend !== undefined && <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>{trend >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}{Math.abs(trend)}% vs last term</div>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-gray-600 w-40 flex-shrink-0 truncate font-medium">{label}</p>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-black text-gray-700 w-20 text-right flex-shrink-0">KES {value.toLocaleString()}</span>
    </div>
  );
}

export default function FinanceAnalyticsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'byform'|'defaulters'|'trends'>('overview');
  const [filterForm, setFilterForm] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pR, sR, fR] = await Promise.all([
      supabase.from('fee_payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('school_students').select('*'),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    setPayments(pR.data || []); setStudents(sR.data || []); setForms(fR.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalCollected = useMemo(() => payments.reduce((sum, p) => sum + (p.amount || 0), 0), [payments]);
  const thisMonth = useMemo(() => {
    const m = new Date().getMonth(); const y = new Date().getFullYear();
    return payments.filter(p => { const d = new Date(p.payment_date); return d.getMonth() === m && d.getFullYear() === y; }).reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const byForm = useMemo(() => forms.map(form => {
    const formStudents = students.filter(s => s.form_id === form.id);
    const formPayments = payments.filter(p => formStudents.some(s => s.id === p.student_id));
    const total = formPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    return { form, total, count: formStudents.length, avgPerStudent: formStudents.length ? Math.round(total / formStudents.length) : 0 };
  }).sort((a, b) => b.total - a.total), [forms, students, payments]);

  const maxByForm = useMemo(() => Math.max(...byForm.map(b => b.total), 1), [byForm]);

  const recentPayments = payments.slice(0, 20);

  const exportCSV = () => {
    const rows = [['Date', 'Student', 'Amount', 'Method', 'Reference', 'Term'],
      ...payments.map(p => {
        const s = students.find(st => st.id === p.student_id);
        return [p.payment_date || '', s ? `${s.first_name} ${s.last_name}` : '', p.amount || 0, p.payment_method || '', p.reference_no || '', p.term || ''];
      })];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'finance-analytics.csv'; a.click();
  };

  const COLORS = ['#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0ea5e9', '#8b5cf6'];

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}><FiDollarSign size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        <p className="text-gray-400 text-sm">Loading Finance Analytics…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}><FiDollarSign size={22} className="text-white" /></div>
          <div><h1 className="text-2xl font-extrabold text-gray-900">Finance Analytics Dashboard</h1><p className="text-sm text-gray-500">Revenue Trends · Fee Collection · Form Analysis · Defaulters</p></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
          <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50"><FiDownload size={14} /> Export CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['overview','📊 Overview'],['byform','🏫 By Form'],['defaulters','⚠️ Defaulters'],['trends','📈 Trends']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setActiveTab(k as any)} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === k ? 'text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`} style={activeTab === k ? { background: 'linear-gradient(135deg,#059669,#047857)' } : {}}>{lbl}</button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Collected" value={`KES ${totalCollected.toLocaleString()}`} sub="All time" trend={8} color="#059669" emoji="💰" />
            <KPICard label="This Month" value={`KES ${thisMonth.toLocaleString()}`} sub={new Date().toLocaleString('default',{month:'long',year:'numeric'})} color="#0891b2" emoji="📅" />
            <KPICard label="Total Transactions" value={payments.length} sub="Fee payments recorded" color="#7c3aed" emoji="🧾" />
            <KPICard label="Active Students" value={students.length} sub="Enrolled learners" color="#d97706" emoji="👨‍🎓" />
          </div>
          {/* Recent Payments */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Recent Payments</h3>
              <span className="text-xs text-gray-400">{payments.length} total</span>
            </div>
            <div className="divide-y divide-gray-100">
              {recentPayments.length === 0 ? (
                <div className="p-12 text-center"><p className="text-gray-400 text-sm">No payments recorded yet</p></div>
              ) : recentPayments.map((p, i) => {
                const s = students.find(st => st.id === p.student_id);
                const form = forms.find(f => f.id === s?.form_id);
                return (
                  <div key={p.id || i} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: `linear-gradient(135deg,${COLORS[i % COLORS.length]},${COLORS[(i+1) % COLORS.length]})` }}>{s?.first_name?.[0]||'?'}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-gray-800">{s ? `${s.first_name} ${s.last_name}` : 'Unknown'}</p><p className="text-[10px] text-gray-400">{form?.form_name} · {p.payment_method} · {p.payment_date}</p></div>
                    <p className="text-sm font-black text-green-600 flex-shrink-0">KES {(p.amount || 0).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* By Form */}
      {activeTab === 'byform' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiBarChart2 size={14} className="text-green-500" /> Fee Collection by Form</h3>
          {byForm.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No data yet</p> : (
            <div className="space-y-3">
              {byForm.map((item, i) => (
                <div key={item.form.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">{item.form.form_name}</span>
                    <span className="text-[10px] text-gray-500">{item.count} students · avg KES {item.avgPerStudent.toLocaleString()}</span>
                  </div>
                  <ProgressBar label={item.form.form_name} value={item.total} max={maxByForm} color={COLORS[i % COLORS.length]} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Defaulters */}
      {activeTab === 'defaulters' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <FiAlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-gray-800">Students with No Payments Recorded</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {students.filter(s => !payments.some(p => p.student_id === s.id)).slice(0,50).map(s => {
              const form = forms.find(f => f.id === s.form_id);
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-black">{s.first_name?.[0]||'?'}</div>
                  <div className="flex-1"><p className="text-xs font-bold text-gray-800">{s.first_name} {s.last_name}</p><p className="text-[10px] text-gray-400">{form?.form_name} · {s.admission_no}</p></div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">No payment</span>
                </div>
              );
            })}
            {students.filter(s => !payments.some(p => p.student_id === s.id)).length === 0 && <div className="p-12 text-center"><p className="text-gray-400 text-sm">All students have payments recorded 🎉</p></div>}
          </div>
        </div>
      )}

      {/* Trends */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          {/* Monthly breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Monthly Collection Trend</h3>
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => {
                const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
                const m = d.getMonth(); const y = d.getFullYear();
                const total = payments.filter(p => { const pd = new Date(p.payment_date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((sum, p) => sum + (p.amount || 0), 0);
                const maxTotal = 500000;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <p className="text-[10px] text-gray-500 w-16 flex-shrink-0">{d.toLocaleString('default', { month: 'short', year: '2-digit' })}</p>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min((total/maxTotal)*100,100)}%`, background:'linear-gradient(90deg,#059669,#34d399)' }} /></div>
                    <span className="text-[10px] font-black text-gray-700 w-24 text-right">KES {total.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Payment method breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4">By Payment Method</h3>
            <div className="space-y-2">
              {Object.entries(payments.reduce((acc, p) => { const m = p.payment_method || 'Unknown'; acc[m] = (acc[m]||0) + (p.amount||0); return acc; }, {} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).map(([method, total], i) => (
                <ProgressBar key={method} label={method} value={total as number} max={totalCollected} color={COLORS[i%COLORS.length]} />
              ))}
              {payments.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No payment data yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
