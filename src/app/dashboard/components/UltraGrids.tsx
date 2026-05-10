'use client';

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Active': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Inactive': 'bg-red-50 text-red-500 border-red-200',
    'Male': 'bg-blue-50 text-blue-600 border-blue-200',
    'Female': 'bg-pink-50 text-pink-500 border-pink-200',
    'Cash': 'bg-gray-50 text-gray-600 border-gray-200',
    'M-Pesa': 'bg-green-50 text-green-600 border-green-200',
    'Bank': 'bg-blue-50 text-blue-600 border-blue-200',
    'Cheque': 'bg-purple-50 text-purple-600 border-purple-200',
  };
  const cls = map[status] || 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${cls}`}>{status}</span>;
}

export default function UltraGridsSection({ recentPayments, recentStudents, stats, fmt }: {
  recentPayments: any[]; recentStudents: any[]; stats: any;
  fmt: (n: number) => string;
}) {
  return (
    <>
      <div className="ultra-section-label">Data Intelligence — Super Grids</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Fee Payments Grid */}
        <div className="ultra-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-gray-700">💳 Recent Fee Payments</h3>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">{recentPayments.length} records</span>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-[11px]">No payments recorded yet</div>
          ) : (
            <div className="overflow-x-auto ultra-table-wrap">
              <table className="ultra-grid">
                <thead><tr>
                  <th>#</th><th>Date</th><th>Student</th><th>Amount</th><th>Method</th><th>Receipt</th>
                </tr></thead>
                <tbody>
                  {recentPayments.map((p, i) => (
                    <tr key={p.id} className="group">
                      <td className="text-gray-300 text-[10px]">{i + 1}</td>
                      <td className="text-[11px]">{new Date(p.payment_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td className="font-medium text-blue-600 text-[11px]">{String(p.student_id).slice(0, 8)}</td>
                      <td className="font-bold text-emerald-600 text-[11px] font-mono">{fmt(Number(p.amount))}</td>
                      <td><StatusChip status={p.payment_method || 'Cash'} /></td>
                      <td className="text-[10px] text-gray-400 font-mono">{p.receipt_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Enrollments Grid */}
        <div className="ultra-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-gray-700">🆕 Recent Enrollments</h3>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-600">{stats.newEnrollments} this year</span>
          </div>
          {recentStudents.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-[11px]">No students enrolled yet</div>
          ) : (
            <div className="overflow-x-auto ultra-table-wrap">
              <table className="ultra-grid">
                <thead><tr>
                  <th style={{width:10}}></th><th>Adm No</th><th>Name</th><th>Gender</th><th>Status</th>
                </tr></thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={s.id} className="group">
                      <td><div className={`w-[3px] h-5 rounded-sm ${s.status === 'Active' ? 'bg-emerald-400' : 'bg-red-400'}`} /></td>
                      <td className="font-mono font-bold text-blue-600 text-[11px]">{s.admission_no || s.admission_number || '—'}</td>
                      <td className="font-medium text-gray-700 text-[11px]">{s.first_name} {s.last_name}</td>
                      <td><StatusChip status={s.gender || 'N/A'} /></td>
                      <td><StatusChip status={s.status || 'Active'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="ultra-section-label">Quick Actions</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'Add Student', icon: '👨‍🎓', href: '/dashboard/students', color: '#22c55e' },
          { label: 'Collect Fee', icon: '💰', href: '/dashboard/fees', color: '#8b5cf6' },
          { label: 'Attendance', icon: '📋', href: '/dashboard/attendance', color: '#f59e0b' },
          { label: 'Exam Entry', icon: '📝', href: '/dashboard/exams', color: '#3b82f6' },
          { label: 'Staff', icon: '👨‍🏫', href: '/dashboard/staff', color: '#ec4899' },
          { label: 'Reports', icon: '📊', href: '/dashboard/reports', color: '#06b6d4' },
          { label: 'Settings', icon: '⚙️', href: '/dashboard/settings', color: '#6366f1' },
          { label: 'Users', icon: '🔑', href: '/dashboard/users', color: '#ef4444' },
        ].map((link, i) => (
          <a key={i} href={link.href}
            className="ultra-action-btn group"
          >
            <div className="text-xl mb-1.5 group-hover:scale-110 transition-transform">{link.icon}</div>
            <span className="text-[9px] font-semibold text-gray-500 group-hover:text-gray-700 leading-tight">{link.label}</span>
          </a>
        ))}
      </div>
    </>
  );
}
