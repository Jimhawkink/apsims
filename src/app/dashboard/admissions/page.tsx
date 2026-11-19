'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiCheck,
  FiX,
  FiClock,
  FiUserPlus,
  FiDownload,
  FiPrinter,
  FiPhone,
  FiMail,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiMapPin,
  FiBook,
  FiAward,
  FiFileText,
  FiSliders,
  FiShare2,
  FiCheckSquare,
  FiSquare,
  FiTrash2,
  FiExternalLink,
} from 'react-icons/fi';

import {
  UltraAdmissionsHeader,
  ONLINE_APPLY_URL,
  ONLINE_STATUS_URL,
} from '@/components/admissions/UltraAdmissionsHeader';
import { UltraAdmissionsFunnel } from '@/components/admissions/UltraAdmissionsFunnel';
import { UltraAdmissionsImportModal } from '@/components/admissions/UltraAdmissionsImportModal';
import { UltraCallingLetterModal } from '@/components/admissions/UltraCallingLetterModal';
import { UltraAdmissionsPosterModal } from '@/components/admissions/UltraAdmissionsPosterModal';
import { UltraAdmissionDetailModal } from '@/components/admissions/UltraAdmissionDetailModal';
import { UltraAdmitStudentModal } from '@/components/admissions/UltraAdmitStudentModal';
import { UltraAdmissionsActionModal } from '@/components/admissions/UltraAdmissionsActionModal';
import {
  exportAdmissionsWorkbook,
  ExportApplication,
} from '@/components/admissions/UltraAdmissionsExport';

export default function OnlineAdmissionsAdminPage() {
  const [apps, setApps] = useState<ExportApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streamCounts, setStreamCounts] = useState<Record<string, number>>({});

  // Filtering & Sorting State
  const [curriculumTrack, setCurriculumTrack] = useState<'all' | 'cbc-senior' | '8-4-4' | 'jss' | 'primary'>('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [formFilter, setFormFilter] = useState('');
  const [kcpeMeritFilter, setKcpeMeritFilter] = useState('all');
  const [docFilter, setDocFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'student_first_name' | 'kcpe_total_marks' | 'form_applied_for'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals State
  const [detailApp, setDetailApp] = useState<ExportApplication | null>(null);
  const [actionModal, setActionModal] = useState<{ app: ExportApplication; action: string } | null>(null);
  const [admitApp, setAdmitApp] = useState<ExportApplication | null>(null);
  const [callingLetterApp, setCallingLetterApp] = useState<ExportApplication | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);

  /* ── 1. Fetch Live Data ─────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: appData, error: appErr }, { data: stData }, { data: fmData }, { data: stuStreams }] =
        await Promise.all([
          supabase
            .from('school_admission_applications')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase.from('school_streams').select('*').order('stream_name'),
          supabase.from('school_forms').select('*').order('form_level'),
          supabase.from('school_students').select('stream_id').eq('status', 'Active'),
        ]);

      if (appErr) throw appErr;

      // Build stream count map
      const countMap: Record<string, number> = {};
      (stuStreams || []).forEach((s: any) => {
        if (s.stream_id) {
          countMap[String(s.stream_id)] = (countMap[String(s.stream_id)] || 0) + 1;
        }
      });

      setStreamCounts(countMap);
      setApps(appData || []);
      setStreams(stData || []);
      setForms(fmData || []);
    } catch (err: any) {
      toast.error(`Error loading admissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── 2. Filter & Sort Logic ─────────────────────────────────────────────── */
  const filteredApps = useMemo(() => {
    let result = [...apps];

    // Curriculum Track filter
    if (curriculumTrack === 'cbc-senior') {
      result = result.filter((a) => [10, 11, 12].includes(Number(a.form_applied_for)));
    } else if (curriculumTrack === '8-4-4') {
      result = result.filter((a) => [1, 2, 3, 4].includes(Number(a.form_applied_for)));
    } else if (curriculumTrack === 'jss') {
      result = result.filter((a) => [7, 8, 9].includes(Number(a.form_applied_for)));
    } else if (curriculumTrack === 'primary') {
      result = result.filter((a) => {
        const lvl = Number(a.form_applied_for);
        return lvl <= 6 || lvl < 1;
      });
    }

    // Status filter
    if (statusFilter === 'Admitted') {
      result = result.filter((a) => !!a.converted_student_id);
    } else if (statusFilter !== 'All') {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Specific Form filter
    if (formFilter) {
      result = result.filter((a) => String(a.form_applied_for) === formFilter);
    }

    // KCPE Merit bracket filter
    if (kcpeMeritFilter === '350+') {
      result = result.filter((a) => (a.kcpe_total_marks || 0) >= 350);
    } else if (kcpeMeritFilter === '300-349') {
      result = result.filter((a) => (a.kcpe_total_marks || 0) >= 300 && (a.kcpe_total_marks || 0) < 350);
    } else if (kcpeMeritFilter === '250-299') {
      result = result.filter((a) => (a.kcpe_total_marks || 0) >= 250 && (a.kcpe_total_marks || 0) < 300);
    } else if (kcpeMeritFilter === '<250') {
      result = result.filter((a) => (a.kcpe_total_marks || 0) < 250);
    }

    // Documents completion filter
    if (docFilter === 'complete') {
      result = result.filter((a) => a.birth_cert_url && a.kcpe_slip_url);
    } else if (docFilter === 'pending') {
      result = result.filter((a) => !a.birth_cert_url || !a.kcpe_slip_url);
    }

    // Date range
    if (dateFrom) {
      result = result.filter((a) => new Date(a.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter((a) => new Date(a.created_at) <= new Date(dateTo + 'T23:59:59'));
    }

    // Live search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) =>
        [
          a.student_first_name,
          a.student_middle_name,
          a.student_last_name,
          a.reference_number,
          a.guardian_phone,
          a.guardian_email,
          a.guardian_full_name,
          a.guardian_national_id,
          a.kcpe_index_number,
          a.previous_school,
          a.county,
        ].some((f) => f?.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((x, y) => {
      let vx: any = x[sortField];
      let vy: any = y[sortField];
      if (typeof vx === 'string') vx = vx.toLowerCase();
      if (typeof vy === 'string') vy = vy.toLowerCase();
      if (vx < vy) return sortAsc ? -1 : 1;
      if (vx > vy) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    apps,
    curriculumTrack,
    statusFilter,
    formFilter,
    kcpeMeritFilter,
    docFilter,
    dateFrom,
    dateTo,
    search,
    sortField,
    sortAsc,
  ]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / PAGE_SIZE));
  const pagedApps = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredApps.slice(start, start + PAGE_SIZE);
  }, [filteredApps, page]);

  // Overall Funnel counts
  const funnelCounts = useMemo(
    () => ({
      total: apps.length,
      new: apps.filter((a) => a.status === 'Submitted').length,
      review: apps.filter((a) => a.status === 'Under Review').length,
      approved: apps.filter((a) => a.status === 'Approved').length,
      rejected: apps.filter((a) => a.status === 'Rejected').length,
      waitlist: apps.filter((a) => a.status === 'Waitlisted').length,
      admitted: apps.filter((a) => !!a.converted_student_id).length,
    }),
    [apps]
  );

  /* ── 3. Batch Selection Handlers ────────────────────────────────────────── */
  const handleToggleSelectAll = () => {
    if (selectedIds.length === pagedApps.length && pagedApps.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedApps.map((a) => a.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('school_admission_applications')
        .update({
          status: 'Approved',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`✓ Approved ${selectedIds.length} applications!`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      toast.error(`Batch approve failed: ${err.message}`);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('school_admission_applications')
        .update({
          status: 'Rejected',
          review_notes: 'Batch rejected by admissions committee.',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`Marked ${selectedIds.length} applications as Rejected.`);
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      toast.error(`Batch reject failed: ${err.message}`);
    }
  };

  const handleExportSelected = () => {
    const toExport = apps.filter((a) => selectedIds.includes(a.id));
    if (toExport.length === 0) {
      toast.error('Select at least 1 application to export.');
      return;
    }
    exportAdmissionsWorkbook(toExport);
  };

  /* ── 4. Formatting Helpers ──────────────────────────────────────────────── */
  const formDisplay = (v?: number | string) => {
    const n = Number(v);
    if (n === 10) return { label: 'Grade 10 (CBC)', track: 'CBC Senior', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (n === 11) return { label: 'Grade 11 (CBC)', track: 'CBC Senior', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (n === 12) return { label: 'Grade 12 (CBC)', track: 'CBC Senior', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (n >= 7 && n <= 9) return { label: `Grade ${n} (JSS)`, track: 'CBC JSS', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (n >= 1 && n <= 4) return { label: `Form ${n}`, track: '8-4-4', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: `Form/Grade ${v || '—'}`, track: 'Intake', color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  const meritBadge = (marks?: number) => {
    if (!marks) return <span className="text-slate-400 font-mono">—</span>;
    if (marks >= 350) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
          ★ {marks}
        </span>
      );
    }
    if (marks >= 300) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          ✓ {marks}
        </span>
      );
    }
    if (marks >= 250) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
          {marks}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {marks}
      </span>
    );
  };

  const statusBadge = (status: string, isAdmitted: boolean) => {
    if (isAdmitted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          🎓 Admitted
        </span>
      );
    }
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Approved
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            🔍 Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            ✕ Rejected
          </span>
        );
      case 'Waitlisted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            ⏳ Waitlist
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            📥 Submitted
          </span>
        );
    }
  };

  const calcAge = (dob?: string) => {
    if (!dob) return '—';
    const d = new Date(dob);
    const n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a > 0 ? `${a}y` : '—';
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── 1. Top Executive Command Header & Link Dock ── */}
      <UltraAdmissionsHeader
        totalCount={apps.length}
        newCount={funnelCounts.new}
        loading={loading}
        onRefresh={loadData}
        onExportExcel={() => exportAdmissionsWorkbook(filteredApps)}
        onOpenImport={() => setIsImportOpen(true)}
        onPrintRegister={() => window.print()}
        onOpenQRPoster={() => setIsPosterOpen(true)}
      />

      {/* ── 2. Admissions Funnel HUD (6 KPI Cards) ── */}
      <UltraAdmissionsFunnel
        counts={funnelCounts}
        activeStatus={statusFilter}
        onSelectStatus={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
      />

      {/* ── 3. Dual-Track Curriculum Switcher & Filter Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
        
        {/* Curriculum Track Switcher Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Curriculum Track:</span>
            {[
              { id: 'all', label: 'All Curriculums', count: apps.length },
              { id: 'cbc-senior', label: '🇰🇪 CBC Senior School (Grades 10–12)', count: apps.filter((a) => [10, 11, 12].includes(Number(a.form_applied_for))).length },
              { id: '8-4-4', label: '📘 8-4-4 Secondary (Forms 1–4)', count: apps.filter((a) => [1, 2, 3, 4].includes(Number(a.form_applied_for))).length },
              { id: 'jss', label: '🎓 Junior Secondary (Grades 7–9)', count: apps.filter((a) => [7, 8, 9].includes(Number(a.form_applied_for))).length },
              { id: 'primary', label: '🎒 Primary CBC', count: apps.filter((a) => Number(a.form_applied_for) <= 6).length },
            ].map((trk) => (
              <button
                key={trk.id}
                onClick={() => {
                  setCurriculumTrack(trk.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  curriculumTrack === trk.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                }`}
              >
                <span>{trk.label}</span>
                <span className="ml-1.5 text-[10px] opacity-70">({trk.count})</span>
              </button>
            ))}
          </div>

          <div className="text-xs font-mono font-bold text-slate-500">
            Showing {filteredApps.length} of {apps.length}
          </div>
        </div>

        {/* Multi-Dimensional Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
          
          {/* Live Search */}
          <div className="md:col-span-4 relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, ref no, phone, KCPE index, county..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Form / Grade Filter */}
          <div className="md:col-span-2">
            <select
              value={formFilter}
              onChange={(e) => {
                setFormFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="">All Form / Grades</option>
              <optgroup label="8-4-4 Secondary">
                <option value="1">Form 1</option>
                <option value="2">Form 2</option>
                <option value="3">Form 3</option>
                <option value="4">Form 4</option>
              </optgroup>
              <optgroup label="CBC Senior School">
                <option value="10">Grade 10 (Senior CBC)</option>
                <option value="11">Grade 11 (Senior CBC)</option>
                <option value="12">Grade 12 (Senior CBC)</option>
              </optgroup>
              <optgroup label="CBC Junior Secondary">
                <option value="7">Grade 7 (JSS)</option>
                <option value="8">Grade 8 (JSS)</option>
                <option value="9">Grade 9 (JSS)</option>
              </optgroup>
            </select>
          </div>

          {/* KCPE Merit Filter */}
          <div className="md:col-span-2">
            <select
              value={kcpeMeritFilter}
              onChange={(e) => {
                setKcpeMeritFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="all">All KCPE Scores</option>
              <option value="350+">★ 350+ Marks (Honors)</option>
              <option value="300-349">✓ 300–349 Marks</option>
              <option value="250-299">250–299 Marks</option>
              <option value="<250">&lt; 250 Marks</option>
            </select>
          </div>

          {/* Documents Filter */}
          <div className="md:col-span-2">
            <select
              value={docFilter}
              onChange={(e) => {
                setDocFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
            >
              <option value="all">All Documents</option>
              <option value="complete">✓ Complete (Birth + Slip)</option>
              <option value="pending">⚠️ Pending Documents</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-2 flex items-center justify-end">
            {(search || formFilter || kcpeMeritFilter !== 'all' || docFilter !== 'all' || dateFrom || dateTo || statusFilter !== 'All' || curriculumTrack !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFormFilter('');
                  setKcpeMeritFilter('all');
                  setDocFilter('all');
                  setDateFrom('');
                  setDateTo('');
                  setStatusFilter('All');
                  setCurriculumTrack('all');
                  setPage(1);
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Clear Filters
              </button>
            )}
          </div>

        </div>

      </div>

      {/* ── 4. Batch Actions Bar (Appears when items are checked) ── */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-3 px-5 rounded-2xl shadow-lg flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black">
              {selectedIds.length} application{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBatchApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <FiCheck size={13} />
              <span>Approve Selected</span>
            </button>

            <button
              onClick={handleBatchReject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 transition"
            >
              <FiX size={13} />
              <span>Reject Selected</span>
            </button>

            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white/20 hover:bg-white/30 transition"
            >
              <FiDownload size={13} />
              <span>Export Selected</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs font-bold text-indigo-200 hover:text-white"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Super Ultra-Premium Applications Datagrid ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/90 text-slate-600 font-bold">
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={pagedApps.length > 0 && selectedIds.length === pagedApps.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 w-12 text-center text-[10px] uppercase tracking-wider text-slate-400">#</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Ref Number</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Applicant Details</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Target Curriculum</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Merit (KCPE)</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Guardian Contact</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 text-center">Docs</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-500 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedApps.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm font-bold text-slate-700">No applications found</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust your filters or share the online admission link with prospective students.</p>
                  </td>
                </tr>
              ) : (
                pagedApps.map((a, idx) => {
                  const seqNumber = (page - 1) * PAGE_SIZE + idx + 1;
                  const isChecked = selectedIds.includes(a.id);
                  const fullName = [a.student_first_name, a.student_middle_name, a.student_last_name].filter(Boolean).join(' ');
                  const cur = formDisplay(a.form_applied_for);
                  const isAdmitted = !!a.converted_student_id;

                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors duration-100 hover:bg-slate-50/80 ${
                        isChecked ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(a.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Sequence */}
                      <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-400 font-bold">
                        {seqNumber}
                      </td>

                      {/* Ref Number */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDetailApp(a)}
                            className="font-mono text-xs font-black text-blue-600 hover:underline hover:text-blue-800"
                            title="View Full Dossier"
                          >
                            {a.reference_number || `ADM-${a.id}`}
                          </button>
                        </div>
                        {a.county && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {a.county} County
                          </span>
                        )}
                      </td>

                      {/* Applicant Details */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs ${
                              a.gender === 'Female'
                                ? 'bg-gradient-to-tr from-purple-600 to-pink-500'
                                : 'bg-gradient-to-tr from-blue-600 to-indigo-500'
                            }`}
                          >
                            {(a.student_first_name || 'A')[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{fullName}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              <span>{a.gender || '—'}</span>
                              <span className="mx-1">•</span>
                              <span>{calcAge(a.date_of_birth)}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Target Curriculum */}
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${cur.color}`}>
                          {cur.label}
                        </span>
                      </td>

                      {/* Academic Merit */}
                      <td className="px-3 py-3">
                        <div>
                          {meritBadge(a.kcpe_total_marks)}
                          {a.previous_school && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5" title={a.previous_school}>
                              {a.previous_school}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Guardian Contact */}
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-bold text-slate-800 truncate max-w-[130px]" title={a.guardian_full_name}>
                            {a.guardian_full_name || '—'}
                          </p>
                          {a.guardian_phone && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <a
                                href={`tel:${a.guardian_phone}`}
                                className="text-[10px] font-mono text-slate-500 hover:text-blue-600 flex items-center gap-1"
                              >
                                <FiPhone size={10} />
                                <span>{a.guardian_phone}</span>
                              </a>
                              <a
                                href={`https://wa.me/${a.guardian_phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-emerald-600 hover:text-emerald-700 font-bold"
                                title="Chat on WhatsApp"
                              >
                                WA
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Document Vault Status */}
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1 text-xs">
                          <span title={a.photo_url ? 'Passport Photo attached' : 'Photo missing'} className={a.photo_url ? 'opacity-100' : 'opacity-25 grayscale'}>
                            📸
                          </span>
                          <span title={a.birth_cert_url ? 'Birth Certificate attached' : 'Birth Cert missing'} className={a.birth_cert_url ? 'opacity-100' : 'opacity-25 grayscale'}>
                            📜
                          </span>
                          <span title={a.kcpe_slip_url ? 'KCPE Slip attached' : 'KCPE Slip missing'} className={a.kcpe_slip_url ? 'opacity-100' : 'opacity-25 grayscale'}>
                            🏆
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        {statusBadge(a.status, isAdmitted)}
                      </td>

                      {/* Submission Date */}
                      <td className="px-3 py-3 text-[11px] font-mono text-slate-400">
                        {formatDate(a.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Full Dossier */}
                          <button
                            onClick={() => setDetailApp(a)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            title="View Full Candidate Dossier"
                          >
                            <FiEye size={12} />
                          </button>

                          {/* Print Calling Letter */}
                          <button
                            onClick={() => setCallingLetterApp(a)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            title="Print Official Calling Letter (PDF)"
                          >
                            <FiPrinter size={12} />
                          </button>

                          {/* Review Decision */}
                          {!isAdmitted && (
                            <>
                              <button
                                onClick={() => setActionModal({ app: a, action: 'Approved' })}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                title="Approve Application"
                              >
                                <FiCheck size={12} />
                              </button>

                              {a.status === 'Approved' && (
                                <button
                                  onClick={() => setAdmitApp(a)}
                                  className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs hover:opacity-90 transition"
                                  title="Admit Student & Assign Class"
                                >
                                  <FiUserPlus size={12} />
                                </button>
                              )}

                              <button
                                onClick={() => setActionModal({ app: a, action: 'Rejected' })}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                                title="Reject Application"
                              >
                                <FiX size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="p-3.5 px-5 bg-slate-50/80 border-t border-slate-200/90 flex items-center justify-between text-xs text-slate-500">
          <p>
            Showing Page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({filteredApps.length} total entries)
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <FiChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono font-bold text-slate-800">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 6. Full Modals Suite ── */}

      {/* Candidate Dossier Modal */}
      {detailApp && (
        <UltraAdmissionDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onAction={(app, action) => {
            setDetailApp(null);
            setActionModal({ app, action });
          }}
          onConvert={(app) => {
            setDetailApp(null);
            setAdmitApp(app);
          }}
          onPrintCallingLetter={(app) => {
            setDetailApp(null);
            setCallingLetterApp(app);
          }}
        />
      )}

      {/* Status Decision Modal */}
      {actionModal && (
        <UltraAdmissionsActionModal
          app={actionModal.app}
          action={actionModal.action}
          isOpen={true}
          onClose={() => setActionModal(null)}
          onSuccess={loadData}
        />
      )}

      {/* Admit Student to Class Placement Modal */}
      {admitApp && (
        <UltraAdmitStudentModal
          app={admitApp}
          isOpen={true}
          onClose={() => setAdmitApp(null)}
          onSuccess={loadData}
          forms={forms}
          streams={streams}
          streamCounts={streamCounts}
        />
      )}

      {/* Calling Letter & Ministry Admission Offer Printable Modal */}
      {callingLetterApp && (
        <UltraCallingLetterModal
          app={callingLetterApp}
          isOpen={true}
          onClose={() => setCallingLetterApp(null)}
        />
      )}

      {/* Bulk Excel/CSV Importer Modal */}
      <UltraAdmissionsImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadData}
      />

      {/* Admissions QR Code Noticeboard Poster Modal */}
      <UltraAdmissionsPosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
      />

    </div>
  );
}
