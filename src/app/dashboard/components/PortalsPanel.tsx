'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Doughnut } from 'react-chartjs-2';

export default function PortalsPanel() {
  const [data, setData] = useState<any>({ users: [], students: [], teachers: [], visits: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: users }, { data: students }, { data: teachers }, { data: visits }] = await Promise.all([
        supabase.from('school_users').select('*').order('created_at', { ascending: false }),
        supabase.from('school_portal_users').select('*').order('created_at', { ascending: false }),
        supabase.from('school_teachers').select('id, first_name, last_name, phone, is_active'),
        supabase.from('school_visitors').select('*').order('visit_date', { ascending: false }).limit(20),
      ]);
      setData({ users: users || [], students: students || [], teachers: teachers || [], visits: visits || [] });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Loading portal data...</div>;

  const adminUsers = data.users.filter((u: any) => u.role === 'Admin' || u.role === 'admin');
  const teacherPortal = data.students.filter((u: any) => u.role === 'teacher');
  const parentPortal = data.students.filter((u: any) => u.role === 'parent');
  const studentPortal = data.students.filter((u: any) => u.role === 'student');
  const activeUsers = data.users.filter((u: any) => u.is_active !== false);
  const totalPortalUsers = data.students.length;

  // Role distribution
  const roles: Record<string, number> = {};
  data.users.forEach((u: any) => { const r = u.role || 'User'; roles[r] = (roles[r] || 0) + 1; });
  data.students.forEach((u: any) => { const r = u.role || 'portal'; roles[r] = (roles[r] || 0) + 1; });
  const roleColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const roleChart = {
    labels: Object.keys(roles),
    datasets: [{ data: Object.values(roles), backgroundColor: roleColors.slice(0, Object.keys(roles).length), borderWidth: 0 }],
  };

  const dOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } };

  return (
    <div className="space-y-4 ultra-animate">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Admin Users', value: data.users.length, icon: '🔑', color: '#6366f1' },
          { label: 'Active Admins', value: activeUsers.length, icon: '✅', color: '#10b981' },
          { label: 'Portal Users', value: totalPortalUsers, icon: '👥', color: '#3b82f6' },
          { label: 'Teacher Portal', value: teacherPortal.length, icon: '👨‍🏫', color: '#8b5cf6' },
          { label: 'Parent Portal', value: parentPortal.length, icon: '👨‍👩‍👧', color: '#ec4899' },
          { label: 'Student Portal', value: studentPortal.length, icon: '🎓', color: '#f59e0b' },
        ].map((c, i) => (
          <div key={i} className="ultra-card">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: c.color }} />
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-[9px] text-gray-400 uppercase font-semibold">{c.label}</span></div>
            <p className="text-[22px] font-bold text-gray-800">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">🔐 User Roles Distribution</h3>
          <div style={{ height: 160 }}>{Object.keys(roles).length > 0 ? <Doughnut data={roleChart} options={dOpts} /> : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No data</div>}</div>
          <div className="mt-2 space-y-1">{Object.entries(roles).map(([r, v], i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: roleColors[i % roleColors.length] }} /><span className="text-gray-400 flex-1 capitalize">{r}</span><span className="font-semibold">{v}</span></div>
          ))}</div>
        </div>

        <div className="ultra-panel lg:col-span-2">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">🔑 Admin Users</h3>
          <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th></tr></thead><tbody>
            {data.users.slice(0, 8).map((u: any, i: number) => (
              <tr key={i}><td className="font-medium text-[11px]">{u.full_name || u.name || u.username}</td>
                <td className="text-[10px] font-mono text-gray-400">{u.username}</td>
                <td><span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">{u.role || 'Admin'}</span></td>
                <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${u.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{u.is_active !== false ? 'Active' : 'Inactive'}</span></td></tr>
            ))}
          </tbody></table></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">📱 Portal Users (Teachers/Parents/Students)</h3>
          {data.students.length === 0 ? <div className="text-center py-8 text-gray-400 text-[11px]">No portal users yet</div> : (
            <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Last Login</th></tr></thead><tbody>
              {data.students.slice(0, 8).map((u: any, i: number) => (
                <tr key={i}><td className="font-mono font-medium text-[11px] text-blue-600">{u.username}</td>
                  <td><span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 capitalize">{u.role || 'user'}</span></td>
                  <td><span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${u.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{u.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-[10px] text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : 'Never'}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
        <div className="ultra-panel">
          <h3 className="text-[12px] font-semibold text-gray-700 mb-3">🚶 Recent Visitors</h3>
          {data.visits.length === 0 ? <div className="text-center py-8 text-gray-400 text-[11px]">No visitor records</div> : (
            <div className="ultra-table-wrap"><table className="ultra-grid"><thead><tr><th>Name</th><th>Purpose</th><th>Date</th></tr></thead><tbody>
              {data.visits.slice(0, 8).map((v: any, i: number) => (
                <tr key={i}><td className="font-medium text-[11px]">{v.visitor_name}</td><td className="text-[10px] text-gray-400">{v.purpose || '—'}</td>
                  <td className="text-[10px] text-gray-400">{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' }) : '—'}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}
