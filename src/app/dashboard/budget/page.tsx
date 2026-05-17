'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { FiPlus, FiDownload, FiEdit2, FiTrash2, FiTrendingUp, FiTrendingDown, FiSearch, FiFilter, FiRefreshCw, FiBarChart2, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiX, FiChevronDown, FiChevronUp, FiEye } from 'react-icons/fi';
import { HiOutlineSparkles, HiOutlineCurrencyDollar } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

const HEADS = [
  'Salaries & Wages', 'Operations', 'Procurement', 'Infrastructure',
  'Library & ICT', 'Extra-Curricular', 'Boarding', 'Transport',
  'Medical', 'Utilities', 'Maintenance', 'Other',
];
const CATEGORIES = ['Recurrent', 'Capital', 'Operations', 'Personnel'];

const CAT_COLORS: Record<string, string> = {
  Recurrent: '#6366f1', Capital: '#f59e0b', Operations: '#10b981', Personnel: '#3b82f6',
};

const STATUS_THRESHOLDS = {
  safe: 80,
  warning: 90,
  danger: 100,
};

type BudgetVote = {
  id: number;
  vote_head: string;
  category: string;
  budget_amount: number;
  actual_amount: number;
  academic_year: number;
  notes: string;
};

type SortKey = 'vote_head' | 'category' | 'budget_amount' | 'actual_amount' | 'pct';
type SortDir = 'asc' | 'desc';

/* ─── Excel Export ─────────────────────────────────────────────── */
function exportToExcel(votes: BudgetVote[], year: number) {
  const wb = XLSX.utils.book_new();

  /* ── Summary KPI Sheet ── */
  const totalBudget = votes.reduce((s, v) => s + Number(v.budget_amount), 0);
  const totalActual = votes.reduce((s, v) => s + Number(v.actual_amount), 0);
  const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const variance = totalBudget - totalActual;

  const summaryData = [
    ['', '', '', '', '', ''],
    ['', `SCHOOL BUDGET REPORT — ACADEMIC YEAR ${year}`, '', '', '', ''],
    ['', `Generated: ${new Date().toLocaleString('en-KE')}`, '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', 'KEY PERFORMANCE INDICATORS', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', 'Metric', 'Value', 'Status', '', ''],
    ['', 'Total Budget Allocation', totalBudget, 'Approved', '', ''],
    ['', 'Total Actual Expenditure', totalActual, utilization > 100 ? 'OVER BUDGET' : utilization > 90 ? 'Near Limit' : 'On Track', '', ''],
    ['', 'Budget Utilization (%)', utilization / 100, '', '', ''],
    ['', 'Budget Variance (Remaining)', variance, variance >= 0 ? 'Surplus' : 'Deficit', '', ''],
    ['', 'Total Vote Heads', votes.length, '', '', ''],
    ['', '', '', '', '', ''],
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

  /* column widths */
  summaryWs['!cols'] = [{ wch: 4 }, { wch: 40 }, { wch: 22 }, { wch: 18 }, { wch: 6 }, { wch: 6 }];

  /* merge title */
  summaryWs['!merges'] = [
    { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 5 } },
  ];

  XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary');

  /* ── Detailed Breakdown Sheet ── */
  const headers = [
    'No.', 'Vote Head', 'Category', 'Budget Amount (KES)', 'Actual Spend (KES)',
    'Variance (KES)', 'Utilization %', 'Status', 'Notes',
  ];

  const rows = votes.map((v, i) => {
    const pct = Number(v.budget_amount) > 0
      ? (Number(v.actual_amount) / Number(v.budget_amount)) * 100
      : 0;
    const diff = Number(v.budget_amount) - Number(v.actual_amount);
    const status = pct > 100 ? 'OVER BUDGET' : pct > 90 ? 'Near Limit' : pct > 80 ? 'Moderate' : 'On Track';
    return [i + 1, v.vote_head, v.category, Number(v.budget_amount), Number(v.actual_amount), diff, pct / 100, status, v.notes || ''];
  });

  // Totals row
  const totalsRow = [
    '', 'GRAND TOTALS', '', totalBudget, totalActual, variance, utilization / 100, '', '',
  ];

  const detailWs = XLSX.utils.aoa_to_sheet([headers, ...rows, [], totalsRow]);

  detailWs['!cols'] = [
    { wch: 5 }, { wch: 30 }, { wch: 14 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 30 },
  ];

  // Format currency columns (D, E, F = indices 3,4,5) and % column (G = index 6)
  const range = XLSX.utils.decode_range(detailWs['!ref'] || 'A1');
  for (let R = 1; R <= range.e.r; R++) {
    for (const col of [3, 4, 5]) {
      const cell = detailWs[XLSX.utils.encode_cell({ r: R, c: col })];
      if (cell && typeof cell.v === 'number') {
        cell.z = '#,##0';
      }
    }
    const pctCell = detailWs[XLSX.utils.encode_cell({ r: R, c: 6 })];
    if (pctCell && typeof pctCell.v === 'number') {
      pctCell.z = '0.0%';
    }
  }

  XLSX.utils.book_append_sheet(wb, detailWs, 'Budget Breakdown');

  /* ── Category Analysis Sheet ── */
  const byCategory: Record<string, { budget: number; actual: number; count: number }> = {};
  for (const v of votes) {
    if (!byCategory[v.category]) byCategory[v.category] = { budget: 0, actual: 0, count: 0 };
    byCategory[v.category].budget += Number(v.budget_amount);
    byCategory[v.category].actual += Number(v.actual_amount);
    byCategory[v.category].count += 1;
  }

  const catHeaders = ['Category', 'Vote Heads', 'Total Budget (KES)', 'Total Actual (KES)', 'Variance (KES)', 'Utilization %', 'Budget Share %'];
  const catRows = Object.entries(byCategory).map(([cat, d]) => [
    cat, d.count, d.budget, d.actual, d.budget - d.actual,
    totalBudget > 0 ? (d.actual / d.budget) : 0,
    totalBudget > 0 ? d.budget / totalBudget : 0,
  ]);

  const catWs = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
  catWs['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];

  const catRange = XLSX.utils.decode_range(catWs['!ref'] || 'A1');
  for (let R = 1; R <= catRange.e.r; R++) {
    for (const col of [2, 3, 4]) {
      const cell = catWs[XLSX.utils.encode_cell({ r: R, c: col })];
      if (cell && typeof cell.v === 'number') cell.z = '#,##0';
    }
    for (const col of [5, 6]) {
      const cell = catWs[XLSX.utils.encode_cell({ r: R, c: col })];
      if (cell && typeof cell.v === 'number') cell.z = '0.0%';
    }
  }

  XLSX.utils.book_append_sheet(wb, catWs, 'Category Analysis');

  XLSX.writeFile(wb, `School_Budget_Report_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast.success('Premium Excel report exported successfully!');
}

/* ─── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ pct }: { pct: number }) {
  if (pct > 100) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-700 border border-red-200">
      <FiAlertCircle size={9} /> OVER BUDGET
    </span>
  );
  if (pct > 90) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200">
      <FiAlertTriangle size={9} /> NEAR LIMIT
    </span>
  );
  if (pct > 80) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-200">
      <FiTrendingUp size={9} /> MODERATE
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
      <FiCheckCircle size={9} /> ON TRACK
    </span>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────────── */
function ProgressBar({ pct }: { pct: number }) {
  const color = pct > 100 ? '#ef4444' : pct > 90 ? '#f59e0b' : pct > 80 ? '#3b82f6' : '#10b981';
  const width = Math.min(pct, 100);
  return (
    <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
      />
      {pct > 100 && (
        <div className="absolute inset-0 bg-red-400/20 animate-pulse rounded-full" />
      )}
    </div>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, color, icon, trend }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral' }) {
  return (
    <div
      className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${color}08, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between mb-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shadow-md" style={{ background: color }}>
          {icon}
        </div>
      </div>
      <p className="relative text-2xl font-black text-gray-900 leading-none mb-1">{value}</p>
      {sub && (
        <p className="relative text-[10px] text-gray-400 font-semibold mt-1 flex items-center gap-1">
          {trend === 'up' && <FiTrendingUp className="text-emerald-500" size={10} />}
          {trend === 'down' && <FiTrendingDown className="text-red-500" size={10} />}
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function BudgetPage() {
  const [votes, setVotes] = useState<BudgetVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState<BudgetVote | null>(null);
  const [form, setForm] = useState({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('budget_amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [saving, setSaving] = useState(false);

  const year = new Date().getFullYear();
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── RLS-safe fetch & mutations ────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_budget_votes')
        .select('*')
        .eq('academic_year', year)
        .order('budget_amount', { ascending: false });
      if (error) throw error;
      setVotes(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleSave = async () => {
    if (!form.vote_head || !form.budget_amount) return toast.error('Vote head and budget amount are required');
    setSaving(true);
    try {
      /* Get current user for tenant_id — fixes RLS policy violation */
      const { data: { user } } = await supabase.auth.getUser();

      const payload: any = {
        vote_head: form.vote_head,
        category: form.category,
        budget_amount: Number(form.budget_amount),
        actual_amount: Number(form.actual_amount || 0),
        academic_year: year,
        notes: form.notes,
      };

      /* Only set tenant_id on insert, not update (schema default handles it) */
      if (!editId && user) {
        payload.tenant_id = user.id;
      }

      const { error } = editId
        ? await supabase.from('school_budget_votes').update(payload).eq('id', editId)
        : await supabase.from('school_budget_votes').insert([payload]);

      if (error) throw error;

      toast.success(editId ? '✅ Budget vote updated!' : '✅ Budget vote added!');
      setShowModal(false);
      setEditId(null);
      setForm({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' });
      await fetchAll();
    } catch (err: any) {
      /* Friendly message for RLS errors */
      if (err.message?.includes('row-level security') || err.code === '42501') {
        toast.error('Permission denied. Please ensure you are logged in as an authorized user.');
      } else {
        toast.error(err.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: BudgetVote) => {
    setForm({
      vote_head: v.vote_head,
      category: v.category,
      budget_amount: String(v.budget_amount),
      actual_amount: String(v.actual_amount),
      notes: v.notes || '',
    });
    setEditId(v.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this budget vote? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('school_budget_votes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Vote head deleted');
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  /* ── Derived Data ─────────────────────────────────────────────── */
  const totalBudget = votes.reduce((s, v) => s + Number(v.budget_amount || 0), 0);
  const totalActual = votes.reduce((s, v) => s + Number(v.actual_amount || 0), 0);
  const utilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;
  const variance = totalBudget - totalActual;
  const overBudgetCount = votes.filter(v => Number(v.budget_amount) > 0 && (Number(v.actual_amount) / Number(v.budget_amount)) * 100 > 100).length;
  const atRiskCount = votes.filter(v => { const p = Number(v.budget_amount) > 0 ? (Number(v.actual_amount) / Number(v.budget_amount)) * 100 : 0; return p > 80 && p <= 100; }).length;

  /* ── Sort & Filter ─────────────────────────────────────────────── */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredVotes = votes
    .filter(v => {
      const q = searchQ.toLowerCase();
      const matchQ = !q || v.vote_head.toLowerCase().includes(q) || v.category.toLowerCase().includes(q) || (v.notes || '').toLowerCase().includes(q);
      const matchCat = filterCat === 'All' || v.category === filterCat;
      const pct = Number(v.budget_amount) > 0 ? (Number(v.actual_amount) / Number(v.budget_amount)) * 100 : 0;
      const matchStatus = filterStatus === 'All' ||
        (filterStatus === 'Over Budget' && pct > 100) ||
        (filterStatus === 'At Risk' && pct > 80 && pct <= 100) ||
        (filterStatus === 'On Track' && pct <= 80);
      return matchQ && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sortKey === 'vote_head') { av = a.vote_head; bv = b.vote_head; }
      else if (sortKey === 'category') { av = a.category; bv = b.category; }
      else if (sortKey === 'pct') {
        av = Number(a.budget_amount) > 0 ? Number(a.actual_amount) / Number(a.budget_amount) : 0;
        bv = Number(b.budget_amount) > 0 ? Number(b.actual_amount) / Number(b.budget_amount) : 0;
      } else {
        av = Number(a[sortKey]); bv = Number(b[sortKey]);
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
    });

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 opacity-50 group-hover:opacity-100">
      {sortKey === col ? (sortDir === 'asc' ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />) : <FiChevronDown size={11} />}
    </span>
  );

  /* ── Loading State ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-72 gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-gray-700">Loading Budget Data</p>
        <p className="text-xs text-gray-400 mt-0.5">Fetching {year} financial records…</p>
      </div>
    </div>
  );

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-12">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <FiBarChart2 className="text-white" size={16} />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Budget vs Actual</h1>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">{year}</span>
          </div>
          <p className="text-xs text-gray-400 ml-10">Real-time budget allocation, expenditure & variance tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-all disabled:opacity-50"
          >
            <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => exportToExcel(votes, year)}
            disabled={votes.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 shadow-sm transition-all disabled:opacity-40"
          >
            <FiDownload size={13} />
            Export Excel
          </button>
          <button
            onClick={() => { setEditId(null); setForm({ vote_head: '', category: 'Operations', budget_amount: '', actual_amount: '0', notes: '' }); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <FiPlus size={14} /> Add Vote Head
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Budget"
          value={fmtShort(totalBudget)}
          sub={`${votes.length} vote heads`}
          color="#6366f1"
          icon={<HiOutlineCurrencyDollar size={16} />}
        />
        <KpiCard
          label="Actual Spend"
          value={fmtShort(totalActual)}
          sub={`${utilization}% utilized`}
          color="#3b82f6"
          icon={<FiTrendingUp size={15} />}
          trend={utilization > 90 ? 'up' : 'neutral'}
        />
        <KpiCard
          label="Budget Variance"
          value={fmtShort(Math.abs(variance))}
          sub={variance >= 0 ? 'Surplus remaining' : 'Deficit exceeded'}
          color={variance >= 0 ? '#10b981' : '#ef4444'}
          icon={variance >= 0 ? <FiCheckCircle size={15} /> : <FiAlertCircle size={15} />}
          trend={variance >= 0 ? 'neutral' : 'down'}
        />
        <KpiCard
          label="Risk Overview"
          value={`${overBudgetCount} over`}
          sub={`${atRiskCount} near limit · ${votes.length - overBudgetCount - atRiskCount} safe`}
          color={overBudgetCount > 0 ? '#ef4444' : atRiskCount > 0 ? '#f59e0b' : '#10b981'}
          icon={<FiAlertTriangle size={15} />}
        />
      </div>

      {/* ── Overall Utilization Bar ── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-black text-gray-700">Overall Budget Utilization</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{fmt(totalActual)} spent of {fmt(totalBudget)} allocated</p>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-black ${utilization > 100 ? 'text-red-600' : utilization > 90 ? 'text-amber-600' : utilization > 80 ? 'text-blue-600' : 'text-emerald-600'}`}>
              {utilization}%
            </span>
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(utilization, 100)}%`,
              background: utilization > 100 ? '#ef4444' : utilization > 90 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : utilization > 80 ? 'linear-gradient(90deg,#3b82f6,#6366f1)' : 'linear-gradient(90deg,#10b981,#3b82f6)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[9px] font-bold text-gray-300">
          <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
        </div>
      </div>

      {/* ── Category Breakdown Mini Chart ── */}
      {votes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => {
            const catVotes = votes.filter(v => v.category === cat);
            if (!catVotes.length) return null;
            const catBudget = catVotes.reduce((s, v) => s + Number(v.budget_amount), 0);
            const catActual = catVotes.reduce((s, v) => s + Number(v.actual_amount), 0);
            const catPct = catBudget > 0 ? Math.round((catActual / catBudget) * 100) : 0;
            const color = CAT_COLORS[cat] || '#6366f1';
            return (
              <div key={cat} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{cat}</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: color + '20', color }}>{catVotes.length} heads</span>
                </div>
                <p className="text-sm font-black text-gray-800 mb-2">{fmtShort(catBudget)}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(catPct, 100)}%`, background: color }} />
                </div>
                <p className="text-[9px] text-gray-400 font-semibold">{catPct}% utilized</p>
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}

      {/* ── Data Grid ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-gray-800">Vote Head Registry</h3>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              {filteredVotes.length} / {votes.length}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                ref={searchRef}
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search vote heads…"
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-full sm:w-44 transition-all"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX size={11} />
                </button>
              )}
            </div>
            {/* Category filter */}
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-indigo-400 bg-white text-gray-700 font-semibold"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-indigo-400 bg-white text-gray-700 font-semibold"
            >
              <option value="All">All Status</option>
              <option value="Over Budget">Over Budget</option>
              <option value="At Risk">At Risk</option>
              <option value="On Track">On Track</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  { key: 'vote_head', label: 'Vote Head' },
                  { key: 'category', label: 'Category' },
                  { key: 'budget_amount', label: 'Budget' },
                  { key: 'actual_amount', label: 'Actual Spend' },
                  { key: null, label: 'Progress' },
                  { key: 'pct', label: '% Used' },
                  { key: null, label: 'Variance' },
                  { key: null, label: 'Status' },
                  { key: null, label: 'Actions' },
                ].map((h) => (
                  <th
                    key={h.label}
                    onClick={h.key ? () => handleSort(h.key as SortKey) : undefined}
                    className={`px-4 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap ${h.key ? 'cursor-pointer hover:text-gray-700 group select-none' : ''}`}
                  >
                    <span className="flex items-center">
                      {h.label}
                      {h.key && <SortIcon col={h.key as SortKey} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredVotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <FiBarChart2 className="text-gray-300" size={24} />
                      </div>
                      <p className="text-sm font-bold text-gray-400">
                        {searchQ || filterCat !== 'All' || filterStatus !== 'All' ? 'No results match your filters' : 'No budget votes yet'}
                      </p>
                      <p className="text-xs text-gray-300">
                        {searchQ || filterCat !== 'All' || filterStatus !== 'All' ? 'Try adjusting your search or filters' : 'Click "Add Vote Head" to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredVotes.map((v) => {
                const pct = Number(v.budget_amount) > 0 ? Math.round((Number(v.actual_amount) / Number(v.budget_amount)) * 100) : 0;
                const diff = Number(v.budget_amount) - Number(v.actual_amount);
                const catColor = CAT_COLORS[v.category] || '#6366f1';
                return (
                  <tr key={v.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: catColor }} />
                        <div>
                          <p className="text-xs font-black text-gray-900">{v.vote_head}</p>
                          {v.notes && <p className="text-[9px] text-gray-400 mt-0.5 truncate max-w-[140px]">{v.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[9px] font-black px-2 py-1 rounded-md" style={{ background: catColor + '15', color: catColor }}>
                        {v.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-gray-700 tabular-nums">{fmt(v.budget_amount)}</td>
                    <td className="px-4 py-3.5 text-xs font-black text-gray-900 tabular-nums">{fmt(v.actual_amount)}</td>
                    <td className="px-4 py-3.5 w-32">
                      <ProgressBar pct={pct} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-black tabular-nums ${pct > 100 ? 'text-red-600' : pct > 90 ? 'text-amber-600' : pct > 80 ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-xs font-black tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {diff >= 0 ? '+' : ''}{fmt(diff)}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge pct={pct} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedVote(v); setShowDetailModal(true); }}
                          title="View Details"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        >
                          <FiEye size={13} />
                        </button>
                        <button
                          onClick={() => handleEdit(v)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredVotes.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-[10px] font-black text-gray-600 uppercase tracking-wider" colSpan={2}>
                    Grand Totals ({filteredVotes.length} vote heads)
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-gray-800 tabular-nums">
                    {fmt(filteredVotes.reduce((s, v) => s + Number(v.budget_amount), 0))}
                  </td>
                  <td className="px-4 py-3 text-xs font-black text-gray-800 tabular-nums">
                    {fmt(filteredVotes.reduce((s, v) => s + Number(v.actual_amount), 0))}
                  </td>
                  <td className="px-4 py-3 w-32">
                    <ProgressBar pct={utilization} />
                  </td>
                  <td className={`px-4 py-3 text-xs font-black ${utilization > 100 ? 'text-red-600' : utilization > 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {utilization}%
                  </td>
                  <td className={`px-4 py-3 text-xs font-black tabular-nums ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {variance >= 0 ? '+' : ''}{fmt(variance)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-700">
              <div>
                <h3 className="text-base font-black text-white">{editId ? 'Edit Budget Vote' : 'Add Vote Head'}</h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">Academic Year {year}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
                <FiX size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Vote Head */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Vote Head *</label>
                <select
                  value={form.vote_head}
                  onChange={e => setForm({ ...form, vote_head: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-gray-50 font-semibold text-gray-800"
                >
                  <option value="">— Select Vote Head —</option>
                  {HEADS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-gray-50 font-semibold text-gray-800"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                {/* Budget Amount */}
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Budget (KES) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                    <input
                      type="number"
                      value={form.budget_amount}
                      onChange={e => setForm({ ...form, budget_amount: e.target.value })}
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-gray-50 font-bold text-gray-800"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Actual Spent */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Actual Spent (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KES</span>
                  <input
                    type="number"
                    value={form.actual_amount}
                    onChange={e => setForm({ ...form, actual_amount: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-gray-50 font-bold text-gray-800"
                    placeholder="0"
                    min="0"
                  />
                </div>
                {/* Live preview */}
                {form.budget_amount && Number(form.budget_amount) > 0 && (
                  <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-gray-500">
                      <span>Live Utilization Preview</span>
                      <span className={`font-black ${Number(form.actual_amount) / Number(form.budget_amount) > 1 ? 'text-red-600' : 'text-indigo-600'}`}>
                        {Math.round((Number(form.actual_amount || 0) / Number(form.budget_amount)) * 100)}%
                      </span>
                    </div>
                    <ProgressBar pct={Math.round((Number(form.actual_amount || 0) / Number(form.budget_amount)) * 100)} />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-gray-50 text-gray-700 resize-none"
                  placeholder="Optional notes or remarks…"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.vote_head || !form.budget_amount}
                className="flex items-center gap-2 px-6 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                ) : (
                  <><HiOutlineSparkles size={14} /> {editId ? 'Update Vote' : 'Add Vote'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail View Modal ── */}
      {showDetailModal && selectedVote && (() => {
        const v = selectedVote;
        const pct = Number(v.budget_amount) > 0 ? Math.round((Number(v.actual_amount) / Number(v.budget_amount)) * 100) : 0;
        const diff = Number(v.budget_amount) - Number(v.actual_amount);
        const catColor = CAT_COLORS[v.category] || '#6366f1';
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between" style={{ borderTopWidth: 4, borderTopColor: catColor }}>
                <div>
                  <h3 className="text-base font-black text-gray-900">{v.vote_head}</h3>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded mt-1 inline-block" style={{ background: catColor + '15', color: catColor }}>{v.category}</span>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all">
                  <FiX size={15} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Budget Allocated', val: fmt(v.budget_amount), color: '#6366f1' },
                    { label: 'Actual Spent', val: fmt(v.actual_amount), color: '#3b82f6' },
                    { label: 'Variance', val: `${diff >= 0 ? '+' : ''}${fmt(diff)}`, color: diff >= 0 ? '#10b981' : '#ef4444' },
                    { label: 'Utilization', val: `${pct}%`, color: pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#10b981' },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-sm font-black" style={{ color: item.color }}>{item.val}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                    <span>Expenditure Progress</span><span>{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} />
                </div>
                <StatusBadge pct={pct} />
                {v.notes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-xs text-gray-700">{v.notes}</p>
                  </div>
                )}
              </div>
              <div className="px-6 pb-5 flex gap-2">
                <button onClick={() => { setShowDetailModal(false); handleEdit(v); }} className="flex-1 py-2 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all">
                  Edit This Vote
                </button>
                <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
