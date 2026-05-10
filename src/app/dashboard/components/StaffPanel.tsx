'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Doughnut } from 'react-chartjs-2';

export default function StaffPanel() {
  const [data, setData] = useState<any>({ staff: [], payroll: [], leaves: [] });
  const [loading, setLoading] = useState(true);
  const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    (async () => {
      const [{ data: staff }, { data: payroll }, { data: leaves }] = await Promise.all([
        supabase.from('school_teachers').select('*'),
        supabase.from('school_payroll').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('school_leave_requests').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      setData({ staff: staff || [], payroll: payroll || [], leaves: leaves || [] });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Loading staff data...</div>;

  const teaching = data.staff.filter((s: any) => s.staff_type !== 'Non-Teaching');
  const nonTeaching = data.staff.filter((s: any) => s.staff_type === 'Non-Teaching');
  const active = data.staff.filter((s: any) => s.is_active !== false);
  const totalPayroll = data.payroll.reduce((s: number, p: any) => s + Number(p.net_pay || 0), 0);
  const pendingLeaves = data.leaves.filter((l: any) => l.status === 'Pending').length;

  // Gender distribution
  const male = data.staff.filter((s: any) => s.gender === 'Male').length;
  const female = data.staff.filter((s: any) => s.gender === 'Female').length;
  const genderChart = {
    labels: ['Male', 'Female'],
    datasets: [{ data: [male, female], backgroundColor: ['#3b82f6', '#ec4899'], borderWidth: 0 }],
  };

  // Staff type distribution
  const typeChart = {
    labels: ['Teaching', 'Non-Teaching'],
    datasets: [{ data: [teaching.length, nonTeaching.length], backgroundColor: ['#8b5cf6', '#f59e0b'], borderWidth: 0 }],
  };

  const dOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } };

  return (
    <div className="space-y-4 ultra-animate">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Total Staff', value: data.staff.length, icon: '👥', color: '#6366f1' },
          { label: 'Teaching', value: teaching.length, icon: '👨‍🏫', color: '#3b82f6' },
          { label: 'Non-Teaching', value: nonTeaching.length, icon: '🛠️', color: '#f59e0b' },
          { label: 'Active', value: active.length, icon: '✅', color: '#10b981' },
          { label: 'Payroll Total', value: fmt(totalPayroll), icon: '💰', color: '#8b5cf6' },
          { label: 'Pending Leaves', value: pendingLeaves, icon: '📋', color: '#ef4444' },
        ].map((c, i) => (
          <div key={i} className="ultra-card">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: c.color }} />
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-[9px] text-gray-400 uppercase font-semibold">{c.label}</span></div>
            <p className="text-[18px] font-bold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">👤 Gender Distribution</h3>
          <div style={{ height: 150 }}><Doughnut data={genderChart} options={dOpts} /></div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500" />Male: {male}</span>
            <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-pink-500" />Female: {female}</span>
          </div>
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📊 Staff Type</h3>
          <div style={{ height: 150 }}><Doughnut data={typeChart} options={dOpts} /></div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500" />Teaching: {teaching.length}</span>
            <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />Non-Teaching: {nonTeaching.length}</span>
          </div>
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📋 Leave Requests</h3>
          {data.leaves.length === 0 ? <div className="text-center py-8 text-gray-400 text-[11px]">No leave requests</div> : (
            <div className="space-y-2">{data.leaves.slice(0, 5).map((l: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <div><p className="text-[11px] font-medium text-gray-700">{l.teacher_name || 'Staff'}</p><p className="text-[9px] text-gray-400">{l.leave_type || 'Personal'}</p></div>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : l.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>{l.status}</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>

      <div className="ultra-panel">
        <h3 className="text-[12px] font-semibold text-gray-700 mb-3">👨‍🏫 Staff Directory</h3>
        <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Gender</th><th>Status</th></tr></thead><tbody>
          {data.staff.slice(0, 10).map((s: any, i: number) => (
            <tr key={i}><td className="font-medium text-[11px]">{s.first_name} {s.last_name}</td>
              <td className="text-[10px] text-gray-500">{s.staff_type || 'Teaching'}</td>
              <td className="text-[10px] font-mono text-gray-400">{s.phone || '—'}</td>
              <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${s.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-500'}`}>{s.gender || 'N/A'}</span></td>
              <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${s.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{s.is_active !== false ? 'Active' : 'Inactive'}</span></td></tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}
