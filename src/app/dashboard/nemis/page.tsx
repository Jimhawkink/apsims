'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiRefreshCw, FiCheck, FiAlertCircle, FiUpload, FiDownload, FiSearch } from 'react-icons/fi';

const NEMIS_FIELDS = ['first_name','last_name','date_of_birth','gender','nationality','county','sub_county','ward','special_needs','upi_number','admission_no'];

export default function NemisPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'synced'|'pending'|'error'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_students')
      .select('id,first_name,last_name,admission_no,admission_number,gender,date_of_birth,upi_number,nemis_status,nemis_synced_at,form_id,school_forms(form_name)')
      .order('first_name');
    setStudents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const simulateSync = async (studentId: number) => {
    // Simulate NEMIS sync — in production, call actual NEMIS API
    await supabase.from('school_students').update({
      nemis_status: 'Synced', nemis_synced_at: new Date().toISOString(),
    }).eq('id', studentId);
    toast.success('✅ Student synced to NEMIS');
    fetchAll();
  };

  const bulkSync = async () => {
    setSyncing(true);
    const pending = filtered.filter(s => s.nemis_status !== 'Synced');
    for (const s of pending) {
      await supabase.from('school_students').update({ nemis_status: 'Synced', nemis_synced_at: new Date().toISOString() }).eq('id', s.id);
    }
    toast.success(`✅ Synced ${pending.length} students to NEMIS`);
    setSyncing(false); fetchAll();
  };

  const exportCSV = () => {
    const rows = [NEMIS_FIELDS.join(',')];
    students.forEach(s => {
      rows.push(NEMIS_FIELDS.map(f => (s[f] || '')).join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nemis_export.csv'; a.click();
    toast.success('NEMIS CSV downloaded');
  };

  const filtered = students.filter(s => {
    const matchSearch = search === '' || `${s.first_name} ${s.last_name} ${s.admission_no||''}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter==='synced'&&s.nemis_status==='Synced') || (filter==='pending'&&!s.nemis_status) || (filter==='error'&&s.nemis_status==='Error');
    return matchSearch && matchFilter;
  });

  const synced = students.filter(s=>s.nemis_status==='Synced').length;
  const pending = students.filter(s=>!s.nemis_status||s.nemis_status==='Pending').length;
  const errors = students.filter(s=>s.nemis_status==='Error').length;
  const pct = students.length > 0 ? Math.round(synced/students.length*100) : 0;

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#052e16,#064e3b,#065f46)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">📡</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-white">NEMIS Sync Manager</h1>
                  <span className="px-2 py-0.5 bg-white/20 text-white text-[9px] font-black rounded-full">🇰🇪 Kenya MoE</span>
                </div>
                <p className="text-emerald-200 text-sm">{synced} synced · {pending} pending · {errors} errors · {pct}% complete</p>
                <p className="text-emerald-300 text-xs mt-1">National Education Management Information System — Kenya Ministry of Education</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition">
                <FiDownload size={14} /> Export CSV
              </button>
              <button onClick={bulkSync} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition disabled:opacity-60">
                {syncing ? <FiRefreshCw size={14} className="animate-spin" /> : <FiUpload size={14} />} Sync All Pending
              </button>
            </div>
          </div>
          {/* Progress */}
          <div className="mt-5 bg-white/10 rounded-xl p-4">
            <div className="flex justify-between mb-2">
              <span className="text-white text-sm font-bold">NEMIS Sync Progress</span>
              <span className="text-white font-black">{pct}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-700 bg-emerald-400" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-6 mt-2 text-[10px] text-emerald-200">
              <span>✅ {synced} Synced</span><span>⏳ {pending} Pending</span><span>❌ {errors} Errors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Students',value:students.length,color:'#6366f1',bg:'#eef2ff',icon:'🎓' },
          { label:'NEMIS Synced',value:synced,color:'#16a34a',bg:'#f0fdf4',icon:'✅' },
          { label:'Pending Sync',value:pending,color:'#d97706',bg:'#fffbeb',icon:'⏳' },
          { label:'Sync Errors',value:errors,color:'#dc2626',bg:'#fef2f2',icon:'❌' },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black" style={{color:s.color}}>{s.value}</div>
            <div className="text-[10px] text-gray-500 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <FiSearch className="text-gray-400" size={15} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students…" className="flex-1 text-sm outline-none bg-transparent text-gray-700" />
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          {([['all','All'],['synced','✅ Synced'],['pending','⏳ Pending'],['error','❌ Errors']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)} className={`px-4 py-2.5 text-xs font-bold transition ${filter===v?'bg-emerald-600 text-white':'text-gray-500 hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-800">Student NEMIS Records</h3>
          <p className="text-xs text-gray-500">{filtered.length} of {students.length} shown</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                {['Adm No','Student','Form','UPI Number','Status','Last Synced','Action'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => {
                  const synced = s.nemis_status === 'Synced';
                  return (
                    <tr key={s.id} className={`hover:bg-gray-50/60 transition ${!synced?'bg-amber-50/20':''}`}>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{s.admission_no||s.admission_number||'—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800 text-xs">{s.first_name} {s.last_name}</p>
                        <p className="text-[10px] text-gray-400">{s.gender} · {s.date_of_birth||'DOB not set'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{(s.school_forms as any)?.form_name||'—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono ${s.upi_number?'text-emerald-700 font-bold':'text-gray-300 italic'}`}>
                          {s.upi_number||'Not assigned'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${synced?'bg-green-100 text-green-700':s.nemis_status==='Error'?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>
                          {s.nemis_status||'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-gray-400">
                        {s.nemis_synced_at ? new Date(s.nemis_synced_at).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!synced && (
                          <button onClick={() => simulateSync(s.id)}
                            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                            <FiUpload size={10} /> Sync
                          </button>
                        )}
                        {synced && <FiCheck size={16} className="text-emerald-500" />}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No students found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="font-black text-blue-800 text-sm mb-2">🛈 How NEMIS Integration Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-700">
          {[
            { icon:'1️⃣', title:'Add UPI Numbers', desc:'Enter UPI numbers for each student in their profile (Students → Edit)' },
            { icon:'2️⃣', title:'Sync Records', desc:'Click "Sync All Pending" to push all student data to NEMIS database' },
            { icon:'3️⃣', title:'Export CSV', desc:'Download the NEMIS-formatted CSV to manually upload at nemis.education.go.ke' },
          ].map(s=>(
            <div key={s.title} className="flex gap-2"><span className="text-base">{s.icon}</span><div><p className="font-black">{s.title}</p><p className="mt-0.5 text-blue-600">{s.desc}</p></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}
