'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiX, FiEdit2, FiDownload, FiSearch } from 'react-icons/fi';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Alumni {
  id: number;
  student_id?: number;
  full_name: string;
  graduation_year: number;
  current_occupation: string;
  employer_university?: string;
  city_county?: string;
  email?: string;
  phone?: string;
  school_students?: { id: number; first_name: string; last_name: string; admission_number?: string; admission_no?: string };
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number?: string;
  admission_no?: string;
}

const OCCUPATIONS = ['University', 'Employed', 'Self-Employed', 'Unemployed', 'Unknown'];
const OCC_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#94a3b8'];

// ─── Alumni Form Modal ────────────────────────────────────────────────────────

function AlumniModal({
  mode, alumni, students, onClose, onSaved,
}: {
  mode: 'add' | 'edit';
  alumni?: Alumni;
  students: Student[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    student_id: alumni?.student_id || 0,
    full_name: alumni?.full_name || '',
    graduation_year: alumni?.graduation_year || new Date().getFullYear(),
    current_occupation: alumni?.current_occupation || 'Unknown',
    employer_university: alumni?.employer_university || '',
    city_county: alumni?.city_county || '',
    email: alumni?.email || '',
    phone: alumni?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');

  const inp = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all';
  const lbl = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1';

  const filteredStudents = q.trim()
    ? students.filter((s) => `${s.first_name} ${s.last_name} ${s.admission_number || s.admission_no || ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30)
    : [];

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Full name is required');
    if (!form.graduation_year) return toast.error('Graduation year is required');
    setSaving(true);
    try {
      const url = mode === 'add' ? '/api/alumni' : `/api/alumni/${alumni!.id}`;
      const method = mode === 'add' ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save');
      toast.success(mode === 'add' ? 'Alumni record added ✅' : 'Alumni record updated ✅');
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🎓</div>
            <div>
              <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Add Alumni Record' : 'Edit Alumni Record'}</h2>
              <p className="text-xs text-white/70">{mode === 'add' ? 'Link a graduated student' : 'Update alumni information'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {mode === 'add' && (
            <div>
              <label className={lbl}>Link to Student (Optional)</label>
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student by name or admission no…" className={inp} />
              {filteredStudents.length > 0 && (
                <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredStudents.map((s) => (
                    <div key={s.id} className="px-4 py-2 cursor-pointer hover:bg-indigo-50 text-sm"
                      onClick={() => { setForm({ ...form, student_id: s.id, full_name: `${s.first_name} ${s.last_name}` }); setQ(''); }}>
                      <span className="font-semibold">{s.first_name} {s.last_name}</span>
                      <span className="text-gray-400 ml-2 text-xs">({s.admission_number || s.admission_no || '-'})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div><label className={lbl}>Full Name *</label><input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Jane Wanjiku Mwangi" className={inp} /></div>
          <div><label className={lbl}>Graduation Year *</label><input type="number" value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: Number(e.target.value) })} min={2000} max={2099} className={inp} /></div>
          <div>
            <label className={lbl}>Current Occupation</label>
            <select value={form.current_occupation} onChange={(e) => setForm({ ...form, current_occupation: e.target.value })} className={inp}>
              {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Employer / University</label><input type="text" value={form.employer_university} onChange={(e) => setForm({ ...form, employer_university: e.target.value })} placeholder="e.g. University of Nairobi" className={inp} /></div>
          <div><label className={lbl}>City / County</label><input type="text" value={form.city_county} onChange={(e) => setForm({ ...form, city_county: e.target.value })} placeholder="e.g. Nairobi" className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" className={inp} /></div>
            <div><label className={lbl}>Phone</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712345678" className={inp} /></div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiPlus size={14} />}
            {mode === 'add' ? 'Add Alumni' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlumniPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterOccupation, setFilterOccupation] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAlumni, setEditAlumni] = useState<Alumni | null>(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((j) => { if (j.user) setUserRole(j.user.role || ''); }).catch(() => {});
    supabase.from('school_students').select('id, first_name, last_name, admission_number, admission_no').eq('status', 'Active').order('first_name')
      .then(({ data }) => setStudents(data || []));
  }, []);

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set('year', filterYear);
      if (filterOccupation) params.set('occupation', filterOccupation);
      if (search) params.set('search', search);
      const res = await fetch(`/api/alumni?${params}`);
      const result = await res.json();
      setAlumni(result.data || []);
    } catch { toast.error('Failed to load alumni'); } finally { setLoading(false); }
  }, [filterYear, filterOccupation, search]);

  useEffect(() => { fetchAlumni(); }, [fetchAlumni]);

  const handleExportCSV = () => {
    if (alumni.length === 0) return toast.error('No alumni to export');
    const headers = ['full_name', 'graduation_year', 'current_occupation', 'employer_university', 'city_county', 'email', 'phone'];
    const rows = alumni.map((a) => [
      `"${a.full_name}"`, `"${a.graduation_year}"`, `"${a.current_occupation}"`,
      `"${a.employer_university || ''}"`, `"${a.city_county || ''}"`, `"${a.email || ''}"`, `"${a.phone || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Alumni_Export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported ✅');
  };

  // Chart data
  const occupationCounts = OCCUPATIONS.map((occ) => alumni.filter((a) => a.current_occupation === occ).length);
  const chartData = {
    labels: OCCUPATIONS,
    datasets: [{ label: 'Alumni Count', data: occupationCounts, backgroundColor: OCC_COLORS, borderRadius: 8 }],
  };
  const chartOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  const canWrite = ['admin', 'principal'].includes(userRole?.toLowerCase());
  const years = [...new Set(alumni.map((a) => a.graduation_year))].sort((a, b) => b - a);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl px-6 py-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🎓</div>
            <div><h1 className="text-xl font-extrabold">Alumni Tracking</h1><p className="text-sm text-white/70 mt-0.5">Track graduated students and their outcomes</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
              <FiDownload size={14} /> Export CSV
            </button>
            {canWrite && (
              <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition border border-white/30">
                <FiPlus size={16} /> Add Alumni
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Alumni by Occupation</h3>
          {alumni.length > 0 ? <Bar data={chartData} options={chartOptions} height={120} /> : (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">No data yet</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 content-start">
          {OCCUPATIONS.map((occ, i) => (
            <div key={occ} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm border-l-4" style={{ borderLeftColor: OCC_COLORS[i] }}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{occ}</p>
              <p className="text-2xl font-extrabold text-gray-800">{occupationCounts[i]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-400 outline-none" />
        </div>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-400 outline-none">
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterOccupation} onChange={(e) => setFilterOccupation(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-indigo-400 outline-none">
          <option value="">All Occupations</option>
          {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{alumni.length} record{alumni.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Alumni Records</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : alumni.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400"><span className="text-5xl mb-3">🎓</span><p className="text-sm font-semibold">No alumni records found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  {['Name', 'Adm No', 'Grad Year', 'Occupation', 'Employer / University', 'Contact', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumni.map((a) => {
                  const occIdx = OCCUPATIONS.indexOf(a.current_occupation);
                  const occColor = OCC_COLORS[occIdx] || '#94a3b8';
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{a.full_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.school_students ? (a.school_students.admission_number || a.school_students.admission_no || '-') : '-'}</td>
                      <td className="px-4 py-3 text-gray-600 font-bold">{a.graduation_year}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: occColor }}>{a.current_occupation}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{a.employer_university || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{a.phone || a.email || '-'}</td>
                      <td className="px-4 py-3">
                        {canWrite && (
                          <button onClick={() => setEditAlumni(a)} className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1">
                            <FiEdit2 size={11} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && <AlumniModal mode="add" students={students} onClose={() => setShowAddModal(false)} onSaved={fetchAlumni} />}
      {editAlumni && <AlumniModal mode="edit" alumni={editAlumni} students={students} onClose={() => setEditAlumni(null)} onSaved={fetchAlumni} />}
    </div>
  );
}
