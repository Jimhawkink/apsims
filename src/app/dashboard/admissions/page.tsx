'use client';
/**
 * APSIMS Online Admissions Admin Panel
 * Super Premium — Full application management
 * Features:
 *  • View all online applications (Submitted / Under Review / Approved / Rejected / Waitlisted)
 *  • View full applicant details & documents
 *  • Approve / Reject / Waitlist / Under Review with notes
 *  • Convert Approved → school_students (full normal admission process)
 *  • Stats dashboard, export CSV/Excel, print
 *  • Pagination, search, date range filter
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiSearch, FiRefreshCw, FiEye, FiCheck, FiX, FiClock,
  FiUsers, FiUserPlus, FiUserCheck, FiDownload, FiPrinter,
  FiFilter, FiAlertCircle, FiPhone, FiMail, FiBook,
  FiCalendar, FiAward, FiChevronLeft, FiChevronRight, FiStar,
} from 'react-icons/fi';

interface Application {
  id: number;
  reference_number: string;
  student_first_name: string;
  student_middle_name?: string;
  student_last_name: string;
  date_of_birth: string;
  gender: string;
  previous_school?: string;
  kcpe_index_number?: string;
  kcpe_total_marks?: number;
  guardian_full_name: string;
  guardian_phone: string;
  guardian_email?: string;
  guardian_national_id?: string;
  form_applied_for: number;
  status: string;
  review_notes?: string;
  submitted_at: string;
  updated_at?: string;
  converted_student_id?: number;
}

const STATUSES = ['All', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Waitlisted'];

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Submitted':    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '📥' },
  'Under Review': { bg: '#fefce8', text: '#a16207', border: '#fde68a', icon: '🔍' },
  'Approved':     { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: '✅' },
  'Rejected':     { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: '❌' },
  'Waitlisted':   { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', icon: '⏳' },
};

const formLabel = (v: number | string) => {
  const n = Number(v);
  if (n === 10) return 'Grade 10 (CBC)';
  if (n === 11) return 'Grade 11 (CBC)';
  if (n === 12) return 'Grade 12 (CBC)';
  if (n >= 1 && n <= 4) return `Form ${n}`;
  return `Form ${v}`;
};

function age(dob: string) {
  if (!dob) return '—';
  const d = new Date(dob); const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return `${a} yrs`;
}

const PAGE_SIZE = 20;

export default function OnlineAdmissionsAdminPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filtered, setFiltered] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Application | null>(null);
  const [actionModal, setActionModal] = useState<{ app: Application; action: string } | null>(null);
  const [convertModal, setConvertModal] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [convertForm, setConvertForm] = useState({ stream_id: '', admission_number: '', reporting_date: '' });
  const [streams, setStreams] = useState<any[]>([]);
  const [forms, setForms]   = useState<any[]>([]);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('school_admission_applications')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (!error) setApplications(data || []);
    else toast.error('Failed to load applications: ' + error.message);

    const [fRes, sRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
    ]);
    setForms(fRes.data || []);
    setStreams(sRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filter ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let list = [...applications];
    if (statusFilter !== 'All') list = list.filter(a => a.status === statusFilter);
    if (formFilter) list = list.filter(a => String(a.form_applied_for) === formFilter);
    if (dateFrom) list = list.filter(a => a.submitted_at >= dateFrom);
    if (dateTo)   list = list.filter(a => a.submitted_at <= dateTo + 'T23:59:59');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        `${a.student_first_name} ${a.student_last_name} ${a.reference_number} ${a.guardian_phone} ${a.guardian_full_name} ${a.kcpe_index_number || ''}`.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
    setPage(1);
  }, [applications, statusFilter, search, formFilter, dateFrom, dateTo]);

  // ── Stats ──────────────────────────────────────────────────────────────────────
  const stats = {
    total:       applications.length,
    submitted:   applications.filter(a => a.status === 'Submitted').length,
    under_review:applications.filter(a => a.status === 'Under Review').length,
    approved:    applications.filter(a => a.status === 'Approved').length,
    rejected:    applications.filter(a => a.status === 'Rejected').length,
    waitlisted:  applications.filter(a => a.status === 'Waitlisted').length,
    converted:   applications.filter(a => a.converted_student_id).length,
  };

  // ── Update status ─────────────────────────────────────────────────────────────
  const updateStatus = async () => {
    if (!actionModal) return;
    setSaving(true);
    const { error } = await supabase
      .from('school_admission_applications')
      .update({
        status: actionModal.action,
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionModal.app.id);
    if (!error) {
      toast.success(`Application ${actionModal.action}!`);
      setActionModal(null);
      setReviewNotes('');
      await load();
    } else toast.error(error.message);
    setSaving(false);
  };

  // ── Convert to student ────────────────────────────────────────────────────────
  const convertToStudent = async () => {
    if (!convertModal) return;
    if (convertModal.converted_student_id) { toast.error('Already converted to a student!'); return; }
    if (!convertForm.admission_number.trim()) { toast.error('Enter an admission number'); return; }
    setSaving(true);

    const formId = forms.find(f => f.form_level === convertModal.form_applied_for)?.id || null;

    const payload: any = {
      first_name:          convertModal.student_first_name,
      middle_name:         convertModal.student_middle_name || null,
      last_name:           convertModal.student_last_name,
      date_of_birth:       convertModal.date_of_birth,
      gender:              convertModal.gender,
      admission_number:    convertForm.admission_number.trim(),
      admission_no:        convertForm.admission_number.trim(),
      form_id:             formId,
      stream_id:           convertForm.stream_id ? Number(convertForm.stream_id) : null,
      guardian_name:       convertModal.guardian_full_name,
      guardian_phone:      convertModal.guardian_phone,
      guardian_email:      convertModal.guardian_email || null,
      guardian_national_id:convertModal.guardian_national_id || null,
      previous_school:     convertModal.previous_school || null,
      kcpe_index_number:   convertModal.kcpe_index_number || null,
      kcpe_marks:          convertModal.kcpe_total_marks || null,
      reporting_date:      convertForm.reporting_date || null,
      status:              'Active',
      created_at:          new Date().toISOString(),
    };

    const { data: newStudent, error: insErr } = await supabase
      .from('school_students')
      .insert([payload])
      .select()
      .single();

    if (insErr) { toast.error('Failed to create student: ' + insErr.message); setSaving(false); return; }

    // Mark application as converted
    await supabase.from('school_admission_applications')
      .update({ converted_student_id: newStudent.id, status: 'Approved' })
      .eq('id', convertModal.id);

    toast.success(`✅ ${convertModal.student_first_name} ${convertModal.student_last_name} admitted! Admission No: ${convertForm.admission_number}`);
    setConvertModal(null);
    setConvertForm({ stream_id: '', admission_number: '', reporting_date: '' });
    await load();
    setSaving(false);
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Ref No','Name','Gender','DOB','Age','KCPE Index','KCPE Marks','Form Applied','Guardian','Phone','Email','Status','Submitted','Converted'];
    const rows = filtered.map(a => [
      a.reference_number,
      `${a.student_first_name} ${a.student_middle_name || ''} ${a.student_last_name}`.trim(),
      a.gender, a.date_of_birth, age(a.date_of_birth),
      a.kcpe_index_number || '', a.kcpe_total_marks || '',
      formLabel(a.form_applied_for),
      a.guardian_full_name, a.guardian_phone, a.guardian_email || '',
      a.status, new Date(a.submitted_at).toLocaleDateString('en-KE'),
      a.converted_student_id ? 'Yes' : 'No',
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Online_Admissions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported!');
  };

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6 space-y-5">
      {/* ── HEADER ── */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8,#3b82f6)' }}>
        <div className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">📋</div>
            <div>
              <h1 className="text-white font-black text-2xl">Online Admissions</h1>
              <p className="text-blue-200 text-sm mt-0.5">Admin Panel · Review · Approve · Admit Students</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/20">
              <FiRefreshCw size={13} />Refresh
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/20">
              <FiDownload size={13} />Export CSV
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-sm font-bold hover:bg-white/20">
              <FiPrinter size={13} />Print
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 sm:grid-cols-7 border-t border-white/10">
          {[
            { label: 'Total', val: stats.total, color: 'text-white' },
            { label: '📥 New', val: stats.submitted, color: 'text-blue-200' },
            { label: '🔍 Review', val: stats.under_review, color: 'text-yellow-300' },
            { label: '✅ Approved', val: stats.approved, color: 'text-green-300' },
            { label: '❌ Rejected', val: stats.rejected, color: 'text-red-300' },
            { label: '⏳ Waitlisted', val: stats.waitlisted, color: 'text-purple-300' },
            { label: '🎓 Admitted', val: stats.converted, color: 'text-emerald-300' },
          ].map((k, i) => (
            <div key={i} className="p-3 text-center border-r border-white/10 last:border-r-0">
              <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
              <p className="text-[10px] text-white/60 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATUS TABS ── */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-gray-200 shadow-sm overflow-x-auto">
        {STATUSES.map(s => {
          const ss = STATUS_STYLE[s];
          const count = s === 'All' ? applications.length : applications.filter(a => a.status === s).length;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${statusFilter === s ? 'shadow-sm text-gray-900 bg-gray-100' : 'text-gray-500 hover:bg-gray-50'}`}
              style={statusFilter === s && ss ? { background: ss.bg, color: ss.text, border: `1.5px solid ${ss.border}` } : {}}>
              {ss?.icon || '📋'} {s}
              <span className="bg-white/80 px-1.5 py-0.5 rounded-full text-[9px] font-black">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ref no, phone, KCPE index…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" />
        </div>
        <select value={formFilter} onChange={e => setFormFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400">
          <option value="">All Forms</option>
          {[1,2,3,4,10,11,12].map(f => <option key={f} value={f}>{formLabel(f)}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        <span className="text-gray-400 text-xs">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        <button onClick={() => { setSearch(''); setFormFilter(''); setDateFrom(''); setDateTo(''); setStatusFilter('All'); }}
          className="px-3 py-2.5 text-xs text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold">
          Clear
        </button>
        <p className="text-xs text-gray-400 ml-auto">{filtered.length} application{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                {['#','Ref No','Student Name','Gender','Age','Form','KCPE Marks','Guardian','Phone','Status','Submitted','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-20 text-gray-400">
                  <FiRefreshCw className="animate-spin mx-auto mb-2" size={20} />Loading applications…
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-20 text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="font-semibold">No applications found</p>
                  <p className="text-xs mt-1">Try changing the filters or status tab</p>
                </td></tr>
              ) : paged.map((a, i) => {
                const ss = STATUS_STYLE[a.status] || STATUS_STYLE['Submitted'];
                const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{rowNum}</td>
                    <td className="px-4 py-3">
                      <span className="font-black text-blue-700 text-xs font-mono">{a.reference_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: a.gender === 'Female' ? 'linear-gradient(135deg,#ec4899,#db2777)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
                          {(a.student_first_name[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm whitespace-nowrap">
                            {a.student_first_name} {a.student_middle_name || ''} {a.student_last_name}
                          </p>
                          {a.converted_student_id && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">🎓 ADMITTED</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.gender}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{age(a.date_of_birth)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{formLabel(a.form_applied_for)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{a.kcpe_total_marks || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-32 truncate">{a.guardian_full_name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{a.guardian_phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border"
                        style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}>
                        {ss.icon} {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(a.submitted_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* View */}
                        <button onClick={() => setSelected(a)} title="View details"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                          <FiEye size={12} />
                        </button>
                        {/* Under Review */}
                        {a.status !== 'Under Review' && !a.converted_student_id && (
                          <button onClick={() => { setActionModal({ app: a, action: 'Under Review' }); setReviewNotes(''); }}
                            title="Mark Under Review" className="p-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100">
                            <FiClock size={12} />
                          </button>
                        )}
                        {/* Approve */}
                        {a.status !== 'Approved' && !a.converted_student_id && (
                          <button onClick={() => { setActionModal({ app: a, action: 'Approved' }); setReviewNotes(''); }}
                            title="Approve" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
                            <FiCheck size={12} />
                          </button>
                        )}
                        {/* Reject */}
                        {a.status !== 'Rejected' && !a.converted_student_id && (
                          <button onClick={() => { setActionModal({ app: a, action: 'Rejected' }); setReviewNotes(''); }}
                            title="Reject" className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                            <FiX size={12} />
                          </button>
                        )}
                        {/* Waitlist */}
                        {a.status !== 'Waitlisted' && !a.converted_student_id && (
                          <button onClick={() => { setActionModal({ app: a, action: 'Waitlisted' }); setReviewNotes(''); }}
                            title="Waitlist" className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100">
                            <FiStar size={12} />
                          </button>
                        )}
                        {/* Convert to Student */}
                        {a.status === 'Approved' && !a.converted_student_id && (
                          <button onClick={() => {
                            setConvertModal(a);
                            // Auto-generate admission number
                            const yr = new Date().getFullYear();
                            setConvertForm({ stream_id: '', admission_number: `ADM${yr}-${a.id}`, reporting_date: '' });
                          }}
                            title="Admit Student" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-black">
                            <FiUserPlus size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing <strong>{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)}</strong> of <strong>{filtered.length}</strong>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                <FiChevronLeft size={13} />
              </button>
              {Array.from({length: Math.min(totalPages,7)}, (_,i) => {
                const pg = totalPages<=7 ? i+1 : page<=4 ? i+1 : page>=totalPages-3 ? totalPages-6+i : page-3+i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-black ${pg===page ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    style={pg===page ? {background:'linear-gradient(135deg,#1d4ed8,#3b82f6)'} : {}}>{pg}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                <FiChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
           VIEW DETAILS MODAL
      ══════════════════════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between"
              style={{background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">📋</div>
                <div>
                  <p className="text-white font-black text-base">{selected.student_first_name} {selected.student_middle_name || ''} {selected.student_last_name}</p>
                  <p className="text-blue-200 text-xs">{selected.reference_number}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Status badge */}
              <div className="flex items-center gap-3 flex-wrap">
                {(() => { const ss = STATUS_STYLE[selected.status] || STATUS_STYLE['Submitted'];
                  return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black border" style={{background:ss.bg,color:ss.text,borderColor:ss.border}}>{ss.icon} {selected.status}</span>;
                })()}
                {selected.converted_student_id && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black bg-emerald-100 text-emerald-700 border border-emerald-300">🎓 ADMITTED (Student ID: {selected.converted_student_id})</span>
                )}
              </div>

              {/* Student Info */}
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-3">🎓 Student Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Full Name', `${selected.student_first_name} ${selected.student_middle_name||''} ${selected.student_last_name}`.trim()],
                    ['Gender', selected.gender],
                    ['Date of Birth', selected.date_of_birth ? new Date(selected.date_of_birth).toLocaleDateString('en-KE') : '—'],
                    ['Age', age(selected.date_of_birth)],
                    ['Form Applied For', formLabel(selected.form_applied_for)],
                    ['Previous School', selected.previous_school || '—'],
                    ['KCPE Index No.', selected.kcpe_index_number || '—'],
                    ['KCPE Total Marks', selected.kcpe_total_marks ? `${selected.kcpe_total_marks} / 500` : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guardian Info */}
              <div className="bg-indigo-50 rounded-2xl p-4">
                <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-3">👪 Parent / Guardian Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Full Name', selected.guardian_full_name],
                    ['National ID', selected.guardian_national_id || '—'],
                    ['Phone', selected.guardian_phone],
                    ['Email', selected.guardian_email || '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              {selected.review_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-xs font-black text-amber-700 uppercase mb-1">📝 Review Notes</p>
                  <p className="text-sm text-amber-800">{selected.review_notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="font-bold text-gray-500">Submitted</p>
                  <p>{new Date(selected.submitted_at).toLocaleString('en-KE')}</p>
                </div>
                {selected.updated_at && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-bold text-gray-500">Last Updated</p>
                    <p>{new Date(selected.updated_at).toLocaleString('en-KE')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t bg-gray-50 flex gap-2 flex-wrap">
              {!selected.converted_student_id && (
                <>
                  {['Under Review','Approved','Rejected','Waitlisted'].map(act => {
                    const ss = STATUS_STYLE[act];
                    return (
                      <button key={act} onClick={() => { setActionModal({app:selected,action:act}); setSelected(null); setReviewNotes(''); }}
                        className="px-3 py-2 rounded-xl text-xs font-black border transition-all"
                        style={{background:ss.bg,color:ss.text,borderColor:ss.border}}>
                        {ss.icon} {act}
                      </button>
                    );
                  })}
                  {selected.status === 'Approved' && (
                    <button onClick={() => { setConvertModal(selected); setSelected(null); setConvertForm({stream_id:'',admission_number:`ADM${new Date().getFullYear()}-${selected.id}`,reporting_date:''}); }}
                      className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700">
                      🎓 Admit Student
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setSelected(null)} className="ml-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
           ACTION MODAL (Approve / Reject / Waitlist / Under Review)
      ══════════════════════════════════════════════════════════ */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            {(() => { const ss = STATUS_STYLE[actionModal.action]; return (
            <>
              <div className="p-5 border-b rounded-t-3xl" style={{background:ss.bg}}>
                <p className="font-black text-lg" style={{color:ss.text}}>{ss.icon} {actionModal.action} Application</p>
                <p className="text-sm mt-0.5" style={{color:ss.text}}>
                  {actionModal.app.student_first_name} {actionModal.app.student_last_name} · {actionModal.app.reference_number}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-3 rounded-xl bg-gray-50 text-xs text-gray-600">
                  {actionModal.action === 'Approved' && '✅ Approving this application allows it to be converted to a student record. The applicant will be notified.'}
                  {actionModal.action === 'Rejected' && '❌ Rejecting will notify the applicant with your reason. Please provide a clear reason below.'}
                  {actionModal.action === 'Waitlisted' && '⏳ Waitlisting keeps the application on hold. The applicant will be notified they are on the waitlist.'}
                  {actionModal.action === 'Under Review' && '🔍 Mark as Under Review to indicate your team is actively reviewing this application.'}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-1.5">
                    Review Notes {actionModal.action === 'Rejected' ? '(required — reason for rejection)' : '(optional)'}
                  </label>
                  <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={4}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"
                    placeholder={actionModal.action === 'Rejected' ? 'e.g. KCPE marks below our minimum requirement of 250. Applicant is advised to reapply next year.' : 'Optional internal notes…'} />
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={updateStatus} disabled={saving || (actionModal.action==='Rejected' && !reviewNotes.trim())}
                  className="flex-1 py-3 font-black text-white rounded-2xl disabled:opacity-60 transition-all"
                  style={{background:actionModal.action==='Approved'?'linear-gradient(135deg,#059669,#047857)':actionModal.action==='Rejected'?'linear-gradient(135deg,#dc2626,#b91c1c)':actionModal.action==='Waitlisted'?'linear-gradient(135deg,#7c3aed,#6d28d9)':'linear-gradient(135deg,#d97706,#b45309)'}}>
                  {saving ? 'Saving…' : `Confirm ${actionModal.action}`}
                </button>
                <button onClick={() => setActionModal(null)} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
              </div>
            </>
            );})()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
           CONVERT TO STUDENT MODAL (Full Admission)
      ══════════════════════════════════════════════════════════ */}
      {convertModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b" style={{background:'linear-gradient(135deg,#064e3b,#059669)'}}>
              <p className="text-white font-black text-lg">🎓 Admit Student — Final Step</p>
              <p className="text-emerald-200 text-sm mt-0.5">
                {convertModal.student_first_name} {convertModal.student_last_name} · {convertModal.reference_number}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800">
                ✅ This will create a <strong>school_students</strong> record and permanently admit this student into the school system. All application data will be copied across automatically.
              </div>

              {/* Pre-filled from application */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Pre-filled from Application</p>
                {[
                  ['Name', `${convertModal.student_first_name} ${convertModal.student_middle_name||''} ${convertModal.student_last_name}`.trim()],
                  ['Gender', convertModal.gender],
                  ['Date of Birth', convertModal.date_of_birth ? new Date(convertModal.date_of_birth).toLocaleDateString('en-KE') : '—'],
                  ['Form', formLabel(convertModal.form_applied_for)],
                  ['KCPE Marks', convertModal.kcpe_total_marks ? `${convertModal.kcpe_total_marks}/500` : '—'],
                  ['Guardian', convertModal.guardian_full_name],
                  ['Guardian Phone', convertModal.guardian_phone],
                ].map(([l,v]) => (
                  <div key={l} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold">{l}</span>
                    <span className="font-bold text-gray-800">{v}</span>
                  </div>
                ))}
              </div>

              {/* Fields to fill */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1">Admission Number * <span className="text-gray-400 font-normal">(auto-generated, editable)</span></label>
                <input value={convertForm.admission_number} onChange={e => setConvertForm(p=>({...p,admission_number:e.target.value}))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 font-mono font-black"
                  placeholder="e.g. ADM2026-001" />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-600 mb-1">Stream / Class <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={convertForm.stream_id} onChange={e => setConvertForm(p=>({...p,stream_id:e.target.value}))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400">
                  <option value="">— Select Stream —</option>
                  {streams.filter(s => {
                    const form = forms.find(f => f.form_level === convertModal.form_applied_for);
                    return form ? s.form_id === form.id : true;
                  }).map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-600 mb-1">Reporting Date <span className="text-gray-400 font-normal">(when student should report)</span></label>
                <input type="date" value={convertForm.reporting_date} onChange={e => setConvertForm(p=>({...p,reporting_date:e.target.value}))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div className="p-5 border-t flex gap-3">
              <button onClick={convertToStudent} disabled={saving || !convertForm.admission_number.trim()}
                className="flex-1 py-3 font-black text-white rounded-2xl disabled:opacity-60"
                style={{background:'linear-gradient(135deg,#059669,#047857)'}}>
                {saving ? '⏳ Admitting…' : '🎓 Admit Student — Save to Database'}
              </button>
              <button onClick={() => setConvertModal(null)} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
