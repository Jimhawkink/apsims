'use client';
import { FiEdit2, FiSearch, FiX, FiChevronLeft, FiChevronRight, FiPhone } from 'react-icons/fi';

const G = { purple: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' };

export default function RecordsTab({ students, records, allergies, contacts, search, setSearch, page, setPage, openRecordModal }: any) {
  const filtered = search ? students.filter((s: any) => `${s.last_name}${s.first_name}${s.admission_number}`.toLowerCase().includes(search.toLowerCase())) : students;
  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const paged = filtered.slice((page - 1) * 12, page * 12);
  const getRec = (sid: number) => records.find((r: any) => r.student_id === sid);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, admission number…"
              className="w-full pl-11 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
            {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><FiX size={14} /></button>}
          </div>
          <p className="text-xs font-bold text-gray-400">{filtered.length} students</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>{['#', 'Student', 'Blood', 'BMI', 'Allergies', 'Conditions', 'Emergency', '⚙️'].map((h, i) => (
                <th key={i} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {paged.map((st: any, idx: number) => {
                const rec = getRec(st.id);
                const stuA = allergies.filter((a: any) => a.student_id === st.id);
                const stuC = contacts.filter((c: any) => c.student_id === st.id).sort((a: any, b: any) => a.escalation_order - b.escalation_order);
                const bmi = rec?.height_cm && rec?.weight_kg ? (rec.weight_kg / Math.pow(rec.height_cm / 100, 2)).toFixed(1) : null;
                return (
                  <tr key={st.id} className="hover:bg-gradient-to-r hover:from-teal-50/30 hover:to-transparent transition-all group" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-4 py-3.5 text-center font-bold text-gray-300">{(page - 1) * 12 + idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ background: G.purple }}>
                          {(st.first_name?.[0] || '') + (st.last_name?.[0] || '')}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{st.last_name}, {st.first_name}</p>
                          <p className="text-[10px] text-gray-400">{st.admission_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {rec?.blood_group ? <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 shadow-sm">🩸 {rec.blood_group}</span> : <span className="text-gray-300 text-[10px]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {bmi ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${Number(bmi) < 18.5 ? 'bg-amber-50 text-amber-700' : Number(bmi) > 25 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>{bmi}</span> : <span className="text-gray-300 text-[10px]">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {stuA.length > 0 ? <div className="flex flex-wrap gap-1">{stuA.slice(0, 3).map((a: any) => (
                        <span key={a.id} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${a.severity === 'severe' || a.severity === 'life_threatening' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{a.allergen}</span>
                      ))}{stuA.length > 3 && <span className="text-[9px] text-gray-400">+{stuA.length - 3}</span>}</div> : <span className="text-green-500 text-[10px] font-bold">✅ None</span>}
                    </td>
                    <td className="px-4 py-3.5"><p className="text-[10px] font-bold text-gray-700 line-clamp-2" style={{ maxWidth: 160 }}>{rec?.chronic_conditions || '—'}</p></td>
                    <td className="px-4 py-3.5">
                      {stuC[0] ? <div><p className="text-[10px] font-bold text-blue-700">{stuC[0].contact_name}</p><a href={`tel:${stuC[0].phone}`} className="text-[9px] text-blue-500 hover:underline flex items-center gap-1"><FiPhone size={8} />{stuC[0].phone}</a></div> : <span className="text-gray-300 text-[10px]">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => openRecordModal(st.id)} className="p-2 rounded-xl transition-all hover:scale-110 opacity-60 group-hover:opacity-100" style={{ background: '#ddd6fe', color: '#6d28d9' }}><FiEdit2 size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 12 && (
          <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400 font-bold">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all"><FiChevronLeft size={14} /></button>
              <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all"><FiChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
