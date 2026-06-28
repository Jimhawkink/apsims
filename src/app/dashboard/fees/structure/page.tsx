'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, feeVoteHeads } from '../useFeeData';
import {
  FiGrid, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiDollarSign,
  FiArrowLeft, FiSearch, FiDownload, FiRefreshCw, FiCopy,
  FiTrendingUp, FiFilter, FiChevronUp, FiChevronDown, FiLayers,
  FiPercent, FiCheckSquare, FiAlertTriangle,
} from 'react-icons/fi';

// ─── Sparkline mini-chart ─────────────────────────────────────────
function Spark({ values, color = '#6366f1', h = 32, w = 80 }: { values: number[]; color?: string; h?: number; w?: number }) {
  if (values.length < 2) return <div style={{ width: w, height: h }} />;
  const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - mn) / rng) * (h - 8);
    return `${x},${y}`;
  }).join(' ');
  const fill = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 4) + 2;
    const y = h - 4 - ((v - mn) / rng) * (h - 8);
    return `${x},${y}`;
  });
  const fillPath = `M ${fill[0]} ${fill.slice(1).map(p => 'L ' + p).join(' ')} L ${(values.length - 1) / (values.length - 1) * (w - 4) + 2},${h - 2} L 2,${h - 2} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={fill[fill.length - 1].split(',')[0]} cy={fill[fill.length - 1].split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend, sparkValues, color, bg, border }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  trend?: number; sparkValues?: number[]; color: string; bg: string; border: string;
}) {
  const trendUp = (trend ?? 0) >= 0;
  return (
    <div style={{
      background: '#fff', borderRadius: 20, border: `1.5px solid ${border}`,
      padding: '18px 20px', boxShadow: `0 4px 24px ${color}18`,
      display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: bg, opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 18, marginBottom: 10, border: `1px solid ${border}` }}>
            {icon}
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '4px 0 0', letterSpacing: '-0.5px' }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{sub}</p>}
        </div>
        {sparkValues && sparkValues.length >= 2 && (
          <Spark values={sparkValues} color={color} h={36} w={80} />
        )}
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: trendUp ? '#f0fdf4' : '#fef2f2', width: 'fit-content' }}>
          <span style={{ color: trendUp ? '#10b981' : '#ef4444', fontSize: 11, fontWeight: 700 }}>
            {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>vs last term</span>
        </div>
      )}
    </div>
  );
}

type SortDir = 'asc' | 'desc';
type SortKey = 'category' | 'amount' | 'form_id' | 'term_id' | 'year';

const FORM_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b'];
const FORM_BG    = ['#eef2ff', '#ecfeff', '#f0fdf4', '#fffbeb'];

export default function FeeStructurePage() {
  const { forms, structures, terms, loading, fetchAll, getFormName } = useFeeData();

  // Modal state
  const [showModal, setShowModal]     = useState(false);
  const [editId, setEditId]           = useState<number | null>(null);
  const [form, setForm]               = useState<any>({ category: '', amount: '', term_id: '', form_id: '', description: '', year: new Date().getFullYear() });

  // Grid state
  const [search, setSearch]           = useState('');
  const [filterForm, setFilterForm]   = useState('all');
  const [filterTerm, setFilterTerm]   = useState('all');
  const [filterYear, setFilterYear]   = useState('all');
  const [sortKey, setSortKey]         = useState<SortKey>('category');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [page, setPage]               = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pageSize]                    = useState(15);

  // Tools state
  const [showBulkCopy, setShowBulkCopy]   = useState(false);
  const [showIncModal, setShowIncModal]   = useState(false);
  const [copyFromTerm, setCopyFromTerm]   = useState('');
  const [copyToTerm, setCopyToTerm]       = useState('');
  const [increaseType, setIncreaseType]   = useState<'pct' | 'flat'>('pct');
  const [increaseVal, setIncreaseVal]     = useState('');

  const currentTerm = useMemo(() => terms.find(t => t.is_current), [terms]);

  // ── Set a term as current ──
  const handleSetCurrentTerm = useCallback(async (termId: number) => {
    try {
      // Unset all terms
      await supabase.from('school_terms').update({ is_current: false }).neq('id', 0);
      // Set selected term as current
      await supabase.from('school_terms').update({ is_current: true }).eq('id', termId);
      toast.success('Current term updated! Refreshing...', { icon: '📅' });
      fetchAll();
    } catch (e: any) {
      toast.error('Failed to update term: ' + e.message);
    }
  }, [fetchAll]);

  // All unique years from structures
  const years = useMemo(() => [...new Set(structures.map(s => s.year).filter(Boolean))].sort((a, b) => b - a), [structures]);

  // Sparkline data per form (amount trend across terms)
  const sparkData = useMemo(() => {
    const sorted = [...terms].sort((a, b) => (a.year - b.year) || (a.term_number - b.term_number));
    return forms.map(f => ({
      id: f.id,
      values: sorted.map(t =>
        structures.filter(s => (s.form_id === f.id || !s.form_id) && (s.term_id === t.id || !s.term_id)).reduce((a, b) => a + Number(b.amount || 0), 0)
      ),
    }));
  }, [forms, terms, structures]);

  // Filtered + sorted structures
  const filtered = useMemo(() => {
    let d = structures.filter(s => {
      if (filterForm !== 'all') {
        if (filterForm === 'general' && s.form_id) return false;
        if (filterForm !== 'general' && filterForm !== 'all' && String(s.form_id) !== filterForm) return false;
      }
      if (filterTerm !== 'all' && String(s.term_id) !== filterTerm) return false;
      if (filterYear !== 'all' && String(s.year) !== filterYear) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.category?.toLowerCase().includes(q) && !s.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    d = [...d].sort((a, b) => {
      let va: any = a[sortKey], vb: any = b[sortKey];
      if (sortKey === 'amount') { va = Number(va); vb = Number(vb); }
      else { va = String(va ?? '').toLowerCase(); vb = String(vb ?? '').toLowerCase(); }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return d;
  }, [structures, filterForm, filterTerm, filterYear, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const grandTotal = filtered.reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

  // Reset page on filter change
  useEffect(() => setPage(1), [search, filterForm, filterTerm, filterYear]);

  const openAdd = () => {
    setEditId(null);
    setForm({ category: '', amount: '', term_id: currentTerm?.id || '', form_id: '', description: '', year: new Date().getFullYear() });
    setShowModal(true);
  };
  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ category: item.category, amount: String(item.amount), term_id: item.term_id || '', form_id: item.form_id || '', description: item.description || '', year: item.year || new Date().getFullYear() });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.category?.trim()) { toast.error('Select a fee vote head'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    const payload = {
      category: form.category.trim(), amount: Number(form.amount),
      term_id: form.term_id ? Number(form.term_id) : null,
      form_id: form.form_id ? Number(form.form_id) : null,
      description: form.description || null,
      year: Number(form.year) || new Date().getFullYear(),
    };
    let error;
    if (editId) { ({ error } = await supabase.from('school_fee_structures').update(payload).eq('id', editId)); }
    else { ({ error } = await supabase.from('school_fee_structures').insert([payload])); }
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? '✅ Fee item updated' : '✅ Fee item added');
    setShowModal(false); fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fee item?')) return;
    await supabase.from('school_fee_structures').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const handleDuplicate = async (item: any) => {
    const { id, ...rest } = item;
    const { error } = await supabase.from('school_fee_structures').insert([{ ...rest, description: (rest.description || '') + ' (Copy)' }]);
    if (error) toast.error(error.message); else { toast.success('Duplicated'); fetchAll(); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected items?`)) return;
    await supabase.from('school_fee_structures').delete().in('id', Array.from(selectedIds));
    toast.success(`Deleted ${selectedIds.size} items`);
    setSelectedIds(new Set()); fetchAll();
  };

  const handleBulkCopy = async () => {
    if (!copyFromTerm || !copyToTerm) { toast.error('Select both terms'); return; }
    const src = structures.filter(s => String(s.term_id) === copyFromTerm);
    if (src.length === 0) { toast.error('No items in source term'); return; }
    const payload = src.map(({ id, term_id, ...rest }) => ({ ...rest, term_id: Number(copyToTerm) }));
    const { error } = await supabase.from('school_fee_structures').insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(`✅ Copied ${payload.length} items to target term`); setShowBulkCopy(false); fetchAll(); }
  };

  const handleFeeIncrease = async () => {
    if (!increaseVal || Number(increaseVal) <= 0) { toast.error('Enter increase value'); return; }
    const targets = selectedIds.size > 0 ? paged.filter(s => selectedIds.has(s.id)) : filtered;
    const updates = targets.map(s => {
      const newAmt = increaseType === 'pct'
        ? Math.round(Number(s.amount) * (1 + Number(increaseVal) / 100))
        : Number(s.amount) + Number(increaseVal);
      return supabase.from('school_fee_structures').update({ amount: newAmt }).eq('id', s.id);
    });
    await Promise.all(updates);
    toast.success(`✅ Fee increase applied to ${targets.length} items`);
    setShowIncModal(false); setIncreaseVal(''); fetchAll();
  };

  const handleExportCSV = () => {
    const header = 'Vote Head,Description,Form,Term,Year,Amount';
    const rows = filtered.map(s =>
      `"${s.category}","${s.description || ''}","${s.form_id ? getFormName(s.form_id) : 'All Forms'}","${s.term_id ? terms.find(t => t.id === s.term_id)?.term_name || '' : 'All Terms'}","${s.year || ''}","${s.amount}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fee_structure.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('📥 CSV downloaded');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paged.map(s => s.id)));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Compute KPI stats
  const totalStructures = structures.length;
  const totalAmount = structures.reduce((s, f) => s + Number(f.amount || 0), 0);
  const maxFormTotal = forms.map(f => structures.filter(s => !s.form_id || s.form_id === f.id).reduce((a, b) => a + Number(b.amount || 0), 0));
  const maxForm = forms[maxFormTotal.indexOf(Math.max(...maxFormTotal))]?.form_name || '—';
  const voteHeadCount = [...new Set(structures.map(s => s.category))].length;
  const avgFeePerHead = voteHeadCount > 0 ? Math.round(totalAmount / voteHeadCount) : 0;

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 4, gap: 1, opacity: sortKey === col ? 1 : 0.3 }}>
      <span style={{ fontSize: 7, lineHeight: 1, color: sortKey === col && sortDir === 'asc' ? '#6366f1' : '#94a3b8' }}>▲</span>
      <span style={{ fontSize: 7, lineHeight: 1, color: sortKey === col && sortDir === 'desc' ? '#6366f1' : '#94a3b8' }}>▼</span>
    </span>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Loading fee structures…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 0 40px' }}>

      {/* ═══ HERO HEADER ═══ */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 35%,#312e81 65%,#4338ca 100%)',
        borderRadius: 24, padding: '28px 32px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Animated orbs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', animation: 'orb 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 100, width: 160, height: 160, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', animation: 'orb 8s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '50%', left: '40%', width: 1, height: 200, background: 'rgba(255,255,255,0.04)', transform: 'rotate(30deg)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '1px solid rgba(255,255,255,0.15)' }}>
                📋
              </div>
              <div>
                <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Fee Structure Manager</h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>
                  Define vote heads · Set amounts · Manage all terms & forms
                </p>
              </div>
            </div>
            {/* Quick stats strip */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Items', val: totalStructures },
                { label: 'Vote Heads', val: voteHeadCount },
                { label: 'Forms Configured', val: forms.length },
                { label: 'Current Term', val: currentTerm?.term_name || 'N/A' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{s.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/dashboard/fees" style={{
              padding: '10px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', background: 'rgba(255,255,255,0.07)',
            }}>
              <FiArrowLeft size={13} /> Fee Dashboard
            </Link>
            <button onClick={openAdd} style={{
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
            }}>
              <FiPlus size={15} /> Add Fee Item
            </button>
          </div>
        </div>
      </div>

      {/* ═══ KPI CARDS WITH SPARKLINES ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <KpiCard
          icon={<FiDollarSign size={18} />}
          label="Total Fee Load" value={fmt(totalAmount)}
          sub={`${totalStructures} line items`}
          sparkValues={terms.slice(0, 5).map(t => structures.filter(s => !s.term_id || s.term_id === t.id).reduce((a, b) => a + Number(b.amount || 0), 0))}
          color="#6366f1" bg="#eef2ff" border="#c7d2fe"
        />
        <KpiCard
          icon={<FiLayers size={18} />}
          label="Avg per Vote Head" value={fmt(avgFeePerHead)}
          sub={`${voteHeadCount} vote heads`}
          sparkValues={[...new Set(structures.map(s => s.category))].slice(0, 6).map(c => structures.filter(s => s.category === c).reduce((a, b) => a + Number(b.amount || 0), 0))}
          color="#06b6d4" bg="#ecfeff" border="#a5f3fc"
        />
        <KpiCard
          icon={<FiTrendingUp size={18} />}
          label="Highest Form Total" value={maxForm}
          sub={fmt(Math.max(...maxFormTotal, 0))}
          sparkValues={maxFormTotal}
          color="#10b981" bg="#f0fdf4" border="#a7f3d0"
        />
        <KpiCard
          icon={<FiGrid size={18} />}
          label="Filtered Items" value={String(filtered.length)}
          sub={`${fmt(grandTotal)} total`}
          sparkValues={forms.map(f => filtered.filter(s => s.form_id === f.id).reduce((a, b) => a + Number(b.amount || 0), 0))}
          color="#f59e0b" bg="#fffbeb" border="#fcd34d"
        />
      </div>

      {/* ═══ TERM & ACADEMIC YEAR MANAGEMENT PANEL ═══ */}
      <div style={{
        background: '#fff', borderRadius: 20, border: '2px solid #e0e7ff',
        padding: '20px 24px', boxShadow: '0 4px 24px rgba(99,102,241,0.08)', marginBottom: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', margin: 0 }}>Term &amp; Academic Year</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Click &ldquo;Set Active&rdquo; to change the current term for fees, marks &amp; reports</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '6px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: '#475569' }}>
              Academic Year: <strong>{new Date().getFullYear()}</strong>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 700, color: '#059669' }}>
              Today: {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {terms.map(term => {
            const isCurrent = term.is_current;
            const today = new Date();
            const start = term.start_date ? new Date(term.start_date) : null;
            const end = term.end_date ? new Date(term.end_date) : null;
            const isActive = start && end && today >= start && today <= end;
            const isPast = end && today > end;
            return (
              <div key={term.id} style={{
                borderRadius: 16,
                border: isCurrent ? '2.5px solid #6366f1' : '1.5px solid #e2e8f0',
                padding: '16px 18px',
                background: isCurrent ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : '#fafbff',
                position: 'relative', overflow: 'hidden',
                boxShadow: isCurrent ? '0 4px 20px rgba(99,102,241,0.15)' : 'none',
                transition: 'all 0.2s',
              }}>
                {/* Active glow */}
                {isCurrent && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(99,102,241,0.08)' }} />}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 900, color: isCurrent ? '#4f46e5' : '#1e293b', margin: 0 }}>{term.term_name}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', fontWeight: 600 }}>
                      {term.start_date ? new Date(term.start_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '?'}
                      {' — '}
                      {term.end_date ? new Date(term.end_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                    </p>
                  </div>
                  {/* Status badge */}
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 8,
                    background: isCurrent ? '#6366f1' : isPast ? '#fee2e2' : isActive ? '#dcfce7' : '#f1f5f9',
                    color: isCurrent ? '#fff' : isPast ? '#dc2626' : isActive ? '#16a34a' : '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                  }}>
                    {isCurrent ? '✓ ACTIVE' : isPast ? 'PAST' : isActive ? 'RUNNING' : 'UPCOMING'}
                  </span>
                </div>

                {/* Fee count for this term */}
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px', fontWeight: 500 }}>
                  {structures.filter(s => s.term_id === term.id).length} fee items configured
                  {structures.filter(s => s.term_id === term.id).length > 0 && (
                    <span style={{ color: '#4f46e5', fontWeight: 700 }}>
                      {' · '}{fmt(structures.filter(s => s.term_id === term.id).reduce((a, b) => a + Number(b.amount || 0), 0))}
                    </span>
                  )}
                </p>

                {isCurrent ? (
                  <div style={{ padding: '7px 14px', borderRadius: 10, background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 800, textAlign: 'center' }}>
                    ✓ Currently Active Term
                  </div>
                ) : (
                  <button
                    onClick={() => handleSetCurrentTerm(term.id)}
                    style={{
                      width: '100%', padding: '7px 14px', borderRadius: 10,
                      background: 'transparent', border: '1.5px solid #6366f1',
                      color: '#6366f1', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6366f1'; }}
                  >
                    📅 Set as Active Term
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ FORM TOTALS CARDS WITH TREND BARS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(2, forms.length)},1fr)`, gap: 14 }}>
        {forms.map((f, i) => {
          const total = structures.filter(s => !s.form_id || s.form_id === f.id).reduce((s, st) => s + Number(st.amount || 0), 0);
          const termTotals = sparkData.find(s => s.id === f.id)?.values || [];
          const maxTotal = Math.max(...maxFormTotal, 1);
          const pct = Math.round((total / maxTotal) * 100);
          const col = FORM_COLORS[i % FORM_COLORS.length];
          const bg = FORM_BG[i % FORM_BG.length];
          const itemCount = structures.filter(s => s.form_id === f.id || !s.form_id).length;
          return (
            <div key={f.id} style={{
              background: '#fff', borderRadius: 18, border: `1.5px solid ${col}28`,
              padding: '18px 20px', boxShadow: `0 4px 20px ${col}12`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
              onClick={() => setFilterForm(String(f.id))}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${col}25`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${col}12`; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, fontSize: 14, fontWeight: 900, border: `1.5px solid ${col}40` }}>
                      {f.form_name?.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', margin: 0 }}>{f.form_name}</p>
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{itemCount} items</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: col, margin: 0, letterSpacing: '-0.5px' }}>{fmt(total)}</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>Annual fee load</p>
                </div>
                {termTotals.length >= 2 && <Spark values={termTotals} color={col} h={40} w={70} />}
              </div>
              {/* Progress bar vs max form */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>% of highest form</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${col},${col}aa)`, borderRadius: 99, transition: 'width 1s ease' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ TOOLBAR ═══ */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #f1f5f9', padding: '14px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Left: search + filters */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: 220 }}>
              <FiSearch size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vote heads…"
                style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#fafbff', boxSizing: 'border-box' } as React.CSSProperties}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
            </div>
            {/* Form filter */}
            <select value={filterForm} onChange={e => setFilterForm(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fafbff', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <option value="all">All Forms</option>
              <option value="general">General (All)</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            {/* Term filter */}
            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fafbff', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <option value="all">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
            </select>
            {/* Year filter */}
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fafbff', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {(search || filterForm !== 'all' || filterTerm !== 'all' || filterYear !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterForm('all'); setFilterTerm('all'); setFilterYear('all'); }}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiX size={12} /> Clear
              </button>
            )}
          </div>
          {/* Right: action buttons */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {selectedIds.size > 0 && (
              <>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: 8 }}>{selectedIds.size} selected</span>
                <button onClick={handleBulkDelete}
                  style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiTrash2 size={12} /> Delete
                </button>
                <button onClick={() => setShowIncModal(true)}
                  style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #fcd34d', background: '#fffbeb', color: '#d97706', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FiPercent size={12} /> Increase
                </button>
              </>
            )}
            <button onClick={() => setShowIncModal(true)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiPercent size={12} /> Fee Increase
            </button>
            <button onClick={() => setShowBulkCopy(true)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiCopy size={12} /> Copy Term
            </button>
            <button onClick={handleExportCSV}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiDownload size={12} /> Export
            </button>
            <button onClick={fetchAll}
              style={{ padding: '8px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <FiRefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ ULTRA PREMIUM DATAGRID ═══ */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#64748b', margin: 0 }}>No fee items found</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>Try adjusting your filters or add a new fee item</p>
            <button onClick={openAdd} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FiPlus size={13} /> Add First Fee Item
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: 36 }}>
                      <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0} onChange={toggleSelectAll}
                        style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textAlign: 'left', width: 36 }}>#</th>
                    {[
                      { key: 'category' as SortKey, label: 'Vote Head' },
                      { key: 'form_id' as SortKey, label: 'Form' },
                      { key: 'term_id' as SortKey, label: 'Term' },
                      { key: 'year' as SortKey, label: 'Year' },
                      { key: 'amount' as SortKey, label: 'Amount (KES)' },
                    ].map(col => (
                      <th key={col.key}
                        onClick={() => toggleSort(col.key)}
                        style={{
                          padding: '12px 14px', color: sortKey === col.key ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                          textAlign: col.key === 'amount' ? 'right' : 'left', cursor: 'pointer',
                          userSelect: 'none', whiteSpace: 'nowrap',
                        }}>
                        {col.label}<SortIcon col={col.key} />
                      </th>
                    ))}
                    <th style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, textAlign: 'center', width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item: any, i: number) => {
                    const rowNum = (page - 1) * pageSize + i + 1;
                    const isSelected = selectedIds.has(item.id);
                    const formIdx = forms.findIndex(f => f.id === item.form_id);
                    const col = formIdx >= 0 ? FORM_COLORS[formIdx % FORM_COLORS.length] : '#6366f1';
                    const bg  = formIdx >= 0 ? FORM_BG[formIdx % FORM_BG.length] : '#eef2ff';
                    const termName = item.term_id ? terms.find(t => t.id === item.term_id)?.term_name : null;
                    return (
                      <tr key={item.id} style={{
                        background: isSelected ? 'rgba(99,102,241,0.05)' : i % 2 === 0 ? '#fff' : '#fafbff',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f5f7ff'; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#fafbff'; }}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                            style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: 11, color: '#cbd5e1', fontWeight: 600, textAlign: 'center' }}>{rowNum}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{item.category}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: bg, color: col, border: `1px solid ${col}30` }}>
                            {item.form_id ? getFormName(item.form_id) : 'All Forms'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc30' }}>
                            {termName || 'All Terms'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d30' }}>
                            {item.year || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#059669', letterSpacing: '-0.3px' }}>
                            {fmt(Number(item.amount))}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: 180 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description || <span style={{ color: '#e2e8f0', fontStyle: 'italic' }}>No description</span>}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <button onClick={() => openEdit(item)} title="Edit"
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', transition: 'all 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#eef2ff'; (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                              <FiEdit2 size={12} />
                            </button>
                            <button onClick={() => handleDuplicate(item)} title="Duplicate"
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', transition: 'all 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; (e.currentTarget as HTMLElement).style.borderColor = '#10b981'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                              <FiCopy size={12} />
                            </button>
                            <button onClick={() => handleDelete(item.id)} title="Delete"
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', transition: 'all 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'linear-gradient(135deg,#f8faff,#eef2ff)', borderTop: '2px solid #c7d2fe' }}>
                    <td colSpan={6} style={{ padding: '14px 22px', fontWeight: 800, color: '#4338ca', fontSize: 13 }}>
                      GRAND TOTAL — {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                      {filtered.length !== structures.length && <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginLeft: 8 }}>(filtered)</span>}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: 20, letterSpacing: '-0.5px' }}>
                      {fmt(grandTotal)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontWeight: 500 }}>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setPage(1)} disabled={page === 1}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}>«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${p === page ? '#6366f1' : '#e2e8f0'}`, background: p === page ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}>›</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#cbd5e1' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700 }}>»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ ADD / EDIT MODAL ═══ */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', animation: 'modalUp 0.25s ease-out' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4338ca)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0 }}>
                  {editId ? '✏️ Edit Fee Item' : '➕ Add Fee Item'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0' }}>
                  {editId ? 'Update this fee vote head' : 'Add a new fee vote head to the structure'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Vote Head */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Fee Vote Head *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fafbff', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
                  <option value="">— Select vote head —</option>
                  {feeVoteHeads.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* Amount */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Amount (KES) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94a3b8', fontSize: 15 }}>KES</span>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0"
                    style={{ width: '100%', paddingLeft: 52, paddingRight: 14, paddingTop: 14, paddingBottom: 14, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 22, fontWeight: 900, background: '#fafbff', outline: 'none', boxSizing: 'border-box', color: '#059669' } as React.CSSProperties}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
                </div>
              </div>
              {/* Form / Term / Year row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Form', key: 'form_id', options: [{ id: '', label: 'All Forms' }, ...forms.map(f => ({ id: f.id, label: f.form_name }))] },
                  { label: 'Term', key: 'term_id', options: [{ id: '', label: 'All Terms' }, ...terms.map(t => ({ id: t.id, label: t.term_name }))] },
                ].map(sel => (
                  <div key={sel.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>{sel.label}</label>
                    <select value={form[sel.key]} onChange={e => setForm({ ...form, [sel.key]: e.target.value })}
                      style={{ width: '100%', padding: '10px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fafbff', outline: 'none', fontWeight: 600 }}>
                      {sel.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Year</label>
                  <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}
                    style={{ width: '100%', padding: '10px 10px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fafbff', outline: 'none', fontWeight: 600, boxSizing: 'border-box' } as React.CSSProperties} />
                </div>
              </div>
              {/* Description */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Description (optional)</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Covers full academic year"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fafbff', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafbff', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '10px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave}
                style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e1b4b,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                <FiSave size={14} /> {editId ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BULK COPY TERM MODAL ═══ */}
      {showBulkCopy && (
        <div onClick={() => setShowBulkCopy(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', animation: 'modalUp 0.25s ease-out' }}>
            <div style={{ background: 'linear-gradient(135deg,#064e3b,#047857)', padding: '20px 24px' }}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0 }}>📋 Copy Fee Structure</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '4px 0 0' }}>Duplicate all fee items from one term to another</p>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Copy FROM Term</label>
                <select value={copyFromTerm} onChange={e => setCopyFromTerm(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fafbff', outline: 'none', fontWeight: 600 }}>
                  <option value="">— Select source term —</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                </select>
              </div>
              <div style={{ textAlign: 'center', fontSize: 20 }}>↓</div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Copy TO Term</label>
                <select value={copyToTerm} onChange={e => setCopyToTerm(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fafbff', outline: 'none', fontWeight: 600 }}>
                  <option value="">— Select target term —</option>
                  {terms.filter(t => String(t.id) !== copyFromTerm).map(t => <option key={t.id} value={t.id}>{t.term_name} {t.year}</option>)}
                </select>
              </div>
              {copyFromTerm && (
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #a7f3d0' }}>
                  <p style={{ fontSize: 11, color: '#065f46', fontWeight: 600, margin: 0 }}>
                    ℹ️ Will copy {structures.filter(s => String(s.term_id) === copyFromTerm).length} fee items
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBulkCopy(false)} style={{ padding: '10px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleBulkCopy} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#064e3b,#059669)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCopy size={13} /> Copy Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FEE INCREASE MODAL ═══ */}
      {showIncModal && (
        <div onClick={() => setShowIncModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', animation: 'modalUp 0.25s ease-out' }}>
            <div style={{ background: 'linear-gradient(135deg,#78350f,#d97706)', padding: '20px 24px' }}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0 }}>📈 Apply Fee Increase</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '4px 0 0' }}>
                Apply to {selectedIds.size > 0 ? `${selectedIds.size} selected items` : `all ${filtered.length} filtered items`}
              </p>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'pct', label: '% Percentage', icon: '%' },
                  { key: 'flat', label: 'KES Flat Amount', icon: 'KES' },
                ].map(t => (
                  <button key={t.key} onClick={() => setIncreaseType(t.key as 'pct' | 'flat')}
                    style={{ flex: 1, padding: '12px 10px', borderRadius: 12, border: `2px solid ${increaseType === t.key ? '#d97706' : '#e2e8f0'}`, background: increaseType === t.key ? '#fffbeb' : '#fff', color: increaseType === t.key ? '#d97706' : '#64748b', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                  {increaseType === 'pct' ? 'Percentage Increase (%)' : 'Flat Amount (KES)'}
                </label>
                <input type="number" value={increaseVal} onChange={e => setIncreaseVal(e.target.value)} placeholder={increaseType === 'pct' ? '10' : '500'}
                  style={{ width: '100%', padding: '14px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 22, fontWeight: 900, background: '#fffbeb', outline: 'none', boxSizing: 'border-box', color: '#d97706', textAlign: 'center' } as React.CSSProperties} />
              </div>
              {increaseVal && Number(increaseVal) > 0 && (
                <div style={{ padding: '12px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fcd34d' }}>
                  <p style={{ fontSize: 11, color: '#92400e', fontWeight: 700, margin: 0 }}>
                    ⚠️ This will permanently update {selectedIds.size > 0 ? selectedIds.size : filtered.length} fee items.
                    {increaseType === 'pct' ? ` e.g. KES 10,000 → KES ${(10000 * (1 + Number(increaseVal) / 100)).toLocaleString()}` : ` e.g. KES 10,000 → KES ${(10000 + Number(increaseVal)).toLocaleString()}`}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowIncModal(false)} style={{ padding: '10px 18px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFeeIncrease} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#78350f,#d97706)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiPercent size={13} /> Apply Increase
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes orb { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.1) translate(10px,-10px)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes modalUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}
