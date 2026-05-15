'use client';
import { FiTrash2, FiPhone, FiCheckCircle, FiShield } from 'react-icons/fi';

export default function EmergencyTab({ contacts, students, onDelete }: any) {
  const getSt = (id: number) => students.find((s: any) => s.id === id);
  const primary = contacts.filter((c: any) => c.is_primary);
  const canAuth = contacts.filter((c: any) => c.can_authorize_treatment);
  const noContact = students.filter((s: any) => !contacts.find((c: any) => c.student_id === s.id));

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Total Contacts', v: contacts.length, e: '📞', c: '#2563eb', bg: 'from-blue-50 to-indigo-50' },
          { l: 'Primary Contacts', v: primary.length, e: '⭐', c: '#7c3aed', bg: 'from-purple-50 to-violet-50' },
          { l: 'Can Authorize', v: canAuth.length, e: '✅', c: '#059669', bg: 'from-emerald-50 to-green-50' },
          { l: 'No Contact Set', v: noContact.length, e: '🚨', c: '#ef4444', bg: 'from-red-50 to-rose-50' },
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

      {/* No-Contact Alert */}
      {noContact.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🚨</span>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Students Without Emergency Contacts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {noContact.slice(0, 15).map((s: any) => (
              <span key={s.id} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-red-700 border border-red-200 shadow-sm">
                {s.last_name}, {s.first_name}
              </span>
            ))}
            {noContact.length > 15 && <span className="text-[10px] text-red-500 font-bold self-center">+{noContact.length - 15} more</span>}
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: 12 }}>
            <thead>
              <tr>{['Student', 'Contact', 'Phone', 'Relationship', 'Priority', 'Auth', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {contacts.map((c: any) => {
                const st = getSt(c.student_id);
                return (
                  <tr key={c.id} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all group" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-900 text-xs">{st ? `${st.last_name}, ${st.first_name}` : '—'}</p>
                      <p className="text-[10px] text-gray-400">{st?.admission_number || ''}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-xs">{c.contact_name}</p>
                        {c.is_primary && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-200">⭐ PRIMARY</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <a href={`tel:${c.phone}`} className="text-blue-600 font-bold hover:underline flex items-center gap-1.5 text-xs">
                        <FiPhone size={10} />{c.phone}
                      </a>
                      {c.alt_phone && <p className="text-[10px] text-gray-400 mt-0.5">{c.alt_phone}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200">{c.relationship || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[10px] font-bold shadow-sm ${c.escalation_order === 1 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>{c.escalation_order}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {c.can_authorize_treatment ? <FiCheckCircle size={16} className="text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => onDelete(c.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><FiTrash2 size={11} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {contacts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🆘</span>
            <p className="text-sm font-bold">No emergency contacts yet</p>
            <p className="text-xs mt-1">Click "🆘 Emergency Contact" to add one</p>
          </div>
        )}
      </div>
    </div>
  );
}
