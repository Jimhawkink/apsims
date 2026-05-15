'use client';
import { FiTrash2, FiPhone, FiAlertTriangle, FiCheckCircle, FiClock, FiExternalLink, FiDownload } from 'react-icons/fi';

export default function VisitsTab({ visits, students, allergies, onDelete }: any) {
  const getSt = (id: number) => students.find((s: any) => s.id === id);
  const now = new Date();
  const thisMonth = visits.filter((v: any) => { const d = new Date(v.visit_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const thisWeek = visits.filter((v: any) => { const d = new Date(v.visit_date); const diff = (now.getTime() - d.getTime()) / 86400000; return diff <= 7; });

  // Frequent visitors
  const countMap: any = {};
  visits.forEach((v: any) => { countMap[v.student_id] = (countMap[v.student_id] || 0) + 1; });
  const frequentIds = Object.keys(countMap).filter(k => countMap[k] >= 3).map(Number);

  // Top complaints
  const compMap: any = {};
  visits.forEach((v: any) => { const c = (v.complaint || '').split(',')[0]?.trim(); if (c) compMap[c] = (compMap[c] || 0) + 1; });
  const topComplaints = Object.entries(compMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6);

  // CSV export
  const exportCSV = () => {
    const rows = [['Date', 'Student', 'Adm No', 'Complaint', 'Diagnosis', 'Treatment', 'Temp', 'Attended By', 'Referred To']];
    visits.forEach((v: any) => { const s = getSt(v.student_id); rows.push([new Date(v.visit_date).toLocaleDateString(), s ? `${s.last_name} ${s.first_name}` : '-', s?.admission_number || '-', v.complaint || '', v.diagnosis || '', v.treatment || '', v.temperature || '', v.attended_by || '', v.referred_to || '']); });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `clinic_visits_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Mini Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'This Week', v: thisWeek.length, e: '📅', c: '#0891b2', bg: 'from-cyan-50 to-teal-50' },
          { l: 'This Month', v: thisMonth.length, e: '📊', c: '#2563eb', bg: 'from-blue-50 to-indigo-50' },
          { l: 'Frequent Visitors', v: frequentIds.length, e: '⚠️', c: '#f59e0b', bg: 'from-amber-50 to-yellow-50' },
          { l: 'Total Visits', v: visits.length, e: '🏥', c: '#059669', bg: 'from-emerald-50 to-green-50' },
        ].map((cd, i) => (
          <div key={i} className={`bg-gradient-to-br ${cd.bg} rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-default`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{cd.l}</p>
              <span className="text-lg group-hover:scale-110 transition-transform">{cd.e}</span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: cd.c }}>{cd.v}</p>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.08]" style={{ background: cd.c }} />
          </div>
        ))}
      </div>

      {/* Top Complaints */}
      {topComplaints.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">🔥 Top Complaints</p>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all">
              <FiDownload size={10} /> Export CSV
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {topComplaints.map(([comp, count]: any) => (
              <span key={comp} className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
                {comp} <span className="text-teal-600 ml-1">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Visits Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>{['Date', 'Student', 'Complaint', 'Diagnosis', 'Treatment', 'Temp', 'Status', 'By', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {visits.slice(0, 50).map((v: any) => {
                const st = getSt(v.student_id);
                const isFrequent = frequentIds.includes(v.student_id);
                const highTemp = v.temperature && v.temperature >= 38;
                const isReferred = !!v.referred_to;
                return (
                  <tr key={v.id} className="hover:bg-gradient-to-r hover:from-teal-50/30 hover:to-transparent transition-all group" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-4 py-3 text-xs font-bold text-gray-600 whitespace-nowrap">{new Date(v.visit_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-xs">{st ? `${st.last_name}, ${st.first_name}` : '—'}</p>
                        {isFrequent && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-50 text-red-600 border border-red-200 flex items-center gap-0.5"><FiAlertTriangle size={7} /> Frequent</span>}
                      </div>
                      <p className="text-[10px] text-gray-400">{st?.admission_number || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700" style={{ maxWidth: 200 }}><p className="line-clamp-2 text-xs">{v.complaint}</p></td>
                    <td className="px-4 py-3 text-gray-600 text-xs" style={{ maxWidth: 160 }}>{v.diagnosis || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs" style={{ maxWidth: 160 }}>{v.treatment || '—'}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {v.temperature ? <span className={`px-2 py-0.5 rounded-full font-bold ${highTemp ? 'bg-red-50 text-red-700 border border-red-200' : 'text-gray-500'}`}>{highTemp && '🔥 '}{v.temperature}°C</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isReferred ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"><FiExternalLink size={9} /> Referred</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200"><FiCheckCircle size={9} /> Treated</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{v.attended_by || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => onDelete(v.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><FiTrash2 size={11} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visits.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🏥</span>
            <p className="text-sm font-bold">No clinic visits yet</p>
            <p className="text-xs mt-1">Click "🩺 Clinic Visit" to record one</p>
          </div>
        )}
      </div>
    </div>
  );
}
