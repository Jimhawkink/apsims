'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useFeeData, fmt, useVoteHeads } from '../useFeeData';
import { exportUltraStructureExcel } from '@/components/fees/UltraStructureExport';
import { UltraStructureCharts } from '@/components/fees/UltraStructureCharts';
import { printOfficialFeeCircular } from '@/components/fees/UltraFeeStructurePrint';

import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiDollarSign,
  FiArrowLeft,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiCopy,
  FiTrendingUp,
  FiFilter,
  FiLayers,
  FiPercent,
  FiPrinter,
  FiCalendar,
  FiCheck,
  FiFileText,
  FiSliders,
} from 'react-icons/fi';

// ── Curriculum Track Categorizer ───────────────────────────────────────────
function getCurriculumTrack(formName: string): { track: string; badgeColor: string; bg: string; border: string } {
  const f = formName.toLowerCase();
  if (f.includes('grade 10') || f.includes('grade 11') || f.includes('grade 12') || f.includes('senior')) {
    return { track: 'CBC Senior', badgeColor: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' };
  }
  if (f.includes('form 1') || f.includes('form 2') || f.includes('form 3') || f.includes('form 4')) {
    return { track: '8-4-4 High', badgeColor: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  }
  if (f.includes('grade 7') || f.includes('grade 8') || f.includes('grade 9') || f.includes('jss')) {
    return { track: 'JSS (CBC)', badgeColor: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
  }
  if (f.includes('grade 1') || f.includes('grade 2') || f.includes('grade 3') || f.includes('grade 4') || f.includes('grade 5') || f.includes('grade 6')) {
    return { track: 'Primary CBC', badgeColor: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  }
  if (f.includes('pp 1') || f.includes('pp 2') || f.includes('pp1') || f.includes('pp2') || f.includes('playgroup')) {
    return { track: 'Pre-Primary', badgeColor: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' };
  }
  return { track: 'General (All)', badgeColor: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
}

type TabType = 'ledger' | 'matrix' | 'cloning' | 'circular';
type SortKey = 'category' | 'amount' | 'form_id' | 'term_id' | 'year';
type SortDir = 'asc' | 'desc';

export default function UltraFeeStructurePage() {
  const { forms, structures, terms, loading, fetchAll, getFormName } = useFeeData();
  const { voteHeadNames } = useVoteHeads();

  // School live settings from DB
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('ledger');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formState, setFormState] = useState<any>({
    category: '',
    amount: '',
    term_id: '',
    form_id: '',
    description: '',
    year: new Date().getFullYear(),
  });

  // Grid filter states
  const [search, setSearch] = useState('');
  const [curriculumFilter, setCurriculumFilter] = useState<'all' | 'cbc_senior' | '844' | 'jss' | 'primary' | 'preprimary' | 'general'>('all');
  const [filterForm, setFilterForm] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination (Default reduced to 10 rows per page to prevent UI lag)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Tools states
  const [showBulkCopy, setShowBulkCopy] = useState(false);
  const [showIncModal, setShowIncModal] = useState(false);
  const [copyFromTerm, setCopyFromTerm] = useState('');
  const [copyToTerm, setCopyToTerm] = useState('');
  const [copyInflationPct, setCopyInflationPct] = useState('0');
  const [increaseType, setIncreaseType] = useState<'pct' | 'flat'>('pct');
  const [increaseVal, setIncreaseVal] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Matrix Tab State
  const [matrixSelectedForm, setMatrixSelectedForm] = useState<string>('all');

  // Fetch school details
  useEffect(() => {
    async function loadSchoolData() {
      try {
        const [detRes, setRes] = await Promise.all([
          supabase
            .from('school_details')
            .select('*')
            .neq('section', 'primary')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase.from('school_settings').select('*').limit(1).maybeSingle(),
        ]);
        if (detRes.data) setSchoolDetails(detRes.data);
        if (setRes.data) setSchoolSettings(setRes.data);
      } catch (err) {
        console.error('Failed to load school details:', err);
      } finally {
        setLoadingSchool(false);
      }
    }
    loadSchoolData();
  }, []);

  const registeredSchoolName = useMemo(() => {
    return schoolDetails?.school_name || schoolSettings?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT";
  }, [schoolDetails, schoolSettings]);

  const currentTerm = useMemo(() => terms.find((t) => t.is_current), [terms]);

  // Set term as active current
  const handleSetCurrentTerm = useCallback(
    async (termId: number) => {
      try {
        await supabase.from('school_terms').update({ is_current: false }).neq('id', 0);
        await supabase.from('school_terms').update({ is_current: true }).eq('id', termId);
        toast.success('Active school term updated!', { icon: '📅' });
        fetchAll();
      } catch (e: any) {
        toast.error('Failed to update term: ' + e.message);
      }
    },
    [fetchAll]
  );

  // All unique academic years
  const years = useMemo(() => {
    return [...new Set(structures.map((s) => s.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
  }, [structures]);

  // All unique vote head categories
  const categories = useMemo(() => {
    return [...new Set(structures.map((s) => s.category).filter(Boolean))].sort();
  }, [structures]);

  // ── FILTERED DATA ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = structures.filter((s) => {
      // Curriculum track filter
      if (curriculumFilter !== 'all') {
        const fName = s.form_id ? getFormName(s.form_id) : 'General';
        const { track } = getCurriculumTrack(fName);
        if (curriculumFilter === 'cbc_senior' && track !== 'CBC Senior') return false;
        if (curriculumFilter === '844' && track !== '8-4-4 High') return false;
        if (curriculumFilter === 'jss' && track !== 'JSS (CBC)') return false;
        if (curriculumFilter === 'primary' && track !== 'Primary CBC') return false;
        if (curriculumFilter === 'preprimary' && track !== 'Pre-Primary') return false;
        if (curriculumFilter === 'general' && track !== 'General (All)') return false;
      }

      // Specific Form filter
      if (filterForm !== 'all') {
        if (filterForm === 'general' && s.form_id) return false;
        if (filterForm !== 'general' && String(s.form_id) !== filterForm) return false;
      }

      // Term filter
      if (filterTerm !== 'all' && String(s.term_id) !== filterTerm) return false;

      // Year filter
      if (filterYear !== 'all' && String(s.year) !== filterYear) return false;

      // Category filter
      if (filterCategory !== 'all' && s.category !== filterCategory) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const fName = s.form_id ? getFormName(s.form_id).toLowerCase() : 'all forms';
        const cat = (s.category || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        if (!cat.includes(q) && !desc.includes(q) && !fName.includes(q)) return false;
      }
      return true;
    });

    // Sorting
    d = [...d].sort((a, b) => {
      let va: any = a[sortKey];
      let vb: any = b[sortKey];
      if (sortKey === 'amount') {
        va = Number(va || 0);
        vb = Number(vb || 0);
      } else {
        va = String(va ?? '').toLowerCase();
        vb = String(vb ?? '').toLowerCase();
      }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return d;
  }, [structures, curriculumFilter, filterForm, filterTerm, filterYear, filterCategory, search, sortKey, sortDir, getFormName]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paged = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, curriculumFilter, filterForm, filterTerm, filterYear, filterCategory, pageSize]);

  // ── METRICS FOR CHARTS & KPIS ──────────────────────────────────────────────
  const totalAmount = useMemo(() => structures.reduce((s, f) => s + Number(f.amount || 0), 0), [structures]);
  const filteredTotal = useMemo(() => filtered.reduce((s, f) => s + Number(f.amount || 0), 0), [filtered]);
  const distinctCategories = useMemo(() => [...new Set(structures.map((s) => s.category))], [structures]);
  const avgFeePerVoteHead = distinctCategories.length > 0 ? Math.round(totalAmount / distinctCategories.length) : 0;

  // Chart 1: Vote Head breakdown metrics
  const voteHeadChartMetrics = useMemo(() => {
    const palette = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed', '#ec4899', '#0d9488'];
    const map = new Map<string, number>();
    structures.forEach((s) => {
      const cat = s.category || 'Tuition';
      map.set(cat, (map.get(cat) || 0) + Number(s.amount || 0));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const grand = totalAmount || 1;
    return sorted.map(([name, amount], i) => ({
      name,
      amount,
      pct: (amount / grand) * 100,
      color: palette[i % palette.length],
    }));
  }, [structures, totalAmount]);

  // Chart 2: Form progression metrics
  const formProgressionMetrics = useMemo(() => {
    return forms.map((f) => {
      const annualAmount = structures
        .filter((s) => s.form_id === f.id || !s.form_id)
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);
      const { track } = getCurriculumTrack(f.form_name);
      return {
        name: f.form_name,
        track,
        annualAmount,
      };
    });
  }, [forms, structures]);

  // Matrix rows calculation (for Tab 2 & Excel export)
  const matrixData = useMemo(() => {
    const term1Obj = terms.find((t) => t.term_name?.toLowerCase().includes('term 1') || t.term_number === 1);
    const term2Obj = terms.find((t) => t.term_name?.toLowerCase().includes('term 2') || t.term_number === 2);
    const term3Obj = terms.find((t) => t.term_name?.toLowerCase().includes('term 3') || t.term_number === 3);

    return forms.map((f) => {
      const fStructures = structures.filter((s) => s.form_id === f.id || !s.form_id);
      const t1 = fStructures.filter((s) => s.term_id === term1Obj?.id).reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const t2 = fStructures.filter((s) => s.term_id === term2Obj?.id).reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const t3 = fStructures.filter((s) => s.term_id === term3Obj?.id).reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const annual = fStructures.reduce((acc, s) => acc + Number(s.amount || 0), 0);
      const { track } = getCurriculumTrack(f.form_name);
      return {
        formId: f.id,
        formName: f.form_name,
        curriculumTrack: track,
        term1Amount: t1,
        term2Amount: t2,
        term3Amount: t3,
        annualTotal: annual,
      };
    });
  }, [forms, structures, terms]);

  // Matrix items for selected form
  const selectedFormMatrixItems = useMemo(() => {
    const term1Obj = terms.find((t) => t.term_name?.toLowerCase().includes('term 1') || t.term_number === 1);
    const term2Obj = terms.find((t) => t.term_name?.toLowerCase().includes('term 2') || t.term_number === 2);
    const term3Obj = terms.find((t) => t.term_name?.toLowerCase().includes('term 3') || t.term_number === 3);

    const targetFormId = matrixSelectedForm !== 'all' ? Number(matrixSelectedForm) : null;
    const items = structures.filter((s) => (targetFormId ? s.form_id === targetFormId || !s.form_id : true));

    const catMap = new Map<string, { term1: number; term2: number; term3: number; annual: number; desc: string }>();
    items.forEach((s) => {
      const cat = s.category || 'Tuition';
      const cur = catMap.get(cat) || { term1: 0, term2: 0, term3: 0, annual: 0, desc: s.description || '' };
      const amt = Number(s.amount || 0);
      if (s.term_id === term1Obj?.id) cur.term1 += amt;
      else if (s.term_id === term2Obj?.id) cur.term2 += amt;
      else if (s.term_id === term3Obj?.id) cur.term3 += amt;
      else {
        // general term / all terms
        cur.term1 += amt / 3;
        cur.term2 += amt / 3;
        cur.term3 += amt / 3;
      }
      cur.annual += amt;
      catMap.set(cat, cur);
    });

    return Array.from(catMap.entries()).map(([category, val]) => ({
      category,
      description: val.desc,
      term1: val.term1,
      term2: val.term2,
      term3: val.term3,
      annual: val.annual,
    }));
  }, [structures, terms, matrixSelectedForm]);

  // ── HANDLERS ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setFormState({
      category: voteHeadNames[0] || 'Tuition',
      amount: '',
      term_id: currentTerm?.id || '',
      form_id: '',
      description: '',
      year: new Date().getFullYear(),
    });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setFormState({
      category: item.category,
      amount: String(item.amount),
      term_id: item.term_id || '',
      form_id: item.form_id || '',
      description: item.description || '',
      year: item.year || new Date().getFullYear(),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formState.category?.trim()) {
      toast.error('Select a fee vote head');
      return;
    }
    if (!formState.amount || Number(formState.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const payload = {
      category: formState.category.trim(),
      amount: Number(formState.amount),
      term_id: formState.term_id ? Number(formState.term_id) : null,
      form_id: formState.form_id ? Number(formState.form_id) : null,
      description: formState.description || null,
      year: Number(formState.year) || new Date().getFullYear(),
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('school_fee_structures').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('school_fee_structures').insert([payload]));
    }

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editId ? '✅ Fee item updated' : '✅ Fee item added');
    setShowModal(false);
    fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fee item?')) return;
    const { error } = await supabase.from('school_fee_structures').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Fee item deleted');
      fetchAll();
    }
  };

  const handleDuplicate = async (item: any) => {
    const { id, created_at, updated_at, ...rest } = item;
    const { error } = await supabase.from('school_fee_structures').insert([
      {
        ...rest,
        description: (rest.description || '') + ' (Copy)',
      },
    ]);
    if (error) toast.error(error.message);
    else {
      toast.success('Fee item duplicated');
      fetchAll();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected fee items?`)) return;
    const { error } = await supabase.from('school_fee_structures').delete().in('id', Array.from(selectedIds));
    if (error) toast.error(error.message);
    else {
      toast.success(`Deleted ${selectedIds.size} fee items`);
      setSelectedIds(new Set());
      fetchAll();
    }
  };

  const handleBulkCopy = async () => {
    if (!copyFromTerm || !copyToTerm) {
      toast.error('Select both source and target terms');
      return;
    }
    const src = structures.filter((s) => String(s.term_id) === copyFromTerm);
    if (src.length === 0) {
      toast.error('No fee items found in source term');
      return;
    }

    const inflationFactor = 1 + (Number(copyInflationPct) || 0) / 100;
    const payload = src.map(({ id, created_at, updated_at, term_id, amount, ...rest }) => ({
      ...rest,
      term_id: Number(copyToTerm),
      amount: Math.round(Number(amount) * inflationFactor),
    }));

    const { error } = await supabase.from('school_fee_structures').insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(`✅ Cloned ${payload.length} fee items to target term with ${copyInflationPct}% adjustment!`);
      setShowBulkCopy(false);
      fetchAll();
    }
  };

  const handleFeeIncrease = async () => {
    if (!increaseVal || Number(increaseVal) <= 0) {
      toast.error('Enter a valid increase value');
      return;
    }
    const targets = selectedIds.size > 0 ? structures.filter((s) => selectedIds.has(s.id)) : filtered;
    if (targets.length === 0) {
      toast.error('No items to update');
      return;
    }

    const updates = targets.map((s) => {
      const newAmt =
        increaseType === 'pct'
          ? Math.round(Number(s.amount) * (1 + Number(increaseVal) / 100))
          : Number(s.amount) + Number(increaseVal);
      return supabase.from('school_fee_structures').update({ amount: newAmt }).eq('id', s.id);
    });

    await Promise.all(updates);
    toast.success(`✅ Updated ${targets.length} items with ${increaseType === 'pct' ? `${increaseVal}%` : `KES ${increaseVal}`} adjustment`);
    setShowIncModal(false);
    setIncreaseVal('');
    fetchAll();
  };

  // ── TRIGGER MULTI-SHEET EXCEL EXPORT (EXCELJS) ─────────────────────────────
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      toast.loading('Generating enterprise multi-sheet fee schedule...', { id: 'excel-export' });

      const exportItems = filtered.map((s, idx) => {
        const formObj = forms.find((f) => f.id === s.form_id);
        const fName = formObj ? formObj.form_name : 'All Forms (General)';
        const { track } = getCurriculumTrack(fName);
        const termObj = terms.find((t) => t.id === s.term_id);
        return {
          index: idx + 1,
          category: s.category || 'Tuition',
          formName: fName,
          curriculumTrack: track,
          termName: termObj ? termObj.term_name : 'All Terms',
          year: s.year || new Date().getFullYear(),
          description: s.description || '—',
          amount: Number(s.amount) || 0,
        };
      });

      const voteHeadSummaries = voteHeadChartMetrics.map((vh) => ({
        category: vh.name,
        itemCount: structures.filter((s) => s.category === vh.name).length,
        totalAmount: vh.amount,
        pctOfTotal: vh.pct / 100,
      }));

      await exportUltraStructureExcel({
        schoolName: registeredSchoolName,
        schoolAddress: schoolDetails?.postal_address || 'P.O. Box 000, Kenya',
        schoolPhone: schoolDetails?.phone1 || '+254 700 000 000',
        schoolEmail: schoolDetails?.email || 'finance@school.ac.ke',
        academicYear: filterYear !== 'all' ? filterYear : new Date().getFullYear(),
        structures: exportItems,
        matrixRows: matrixData,
        voteHeadSummaries,
      });

      toast.success('📥 Enterprise Fee Structure Workbook downloaded!', { id: 'excel-export' });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to export Excel: ' + (err.message || 'Unknown error'), { id: 'excel-export' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── TRIGGER PRINT OFFICIAL CIRCULAR ────────────────────────────────────────
  const handlePrintCircular = () => {
    const selectedFormObj = forms.find((f) => String(f.id) === matrixSelectedForm);
    const formName = selectedFormObj ? selectedFormObj.form_name : 'All Classes (Composite Schedule)';
    const { track } = getCurriculumTrack(formName);

    const t1Sum = selectedFormMatrixItems.reduce((acc, it) => acc + it.term1, 0);
    const t2Sum = selectedFormMatrixItems.reduce((acc, it) => acc + it.term2, 0);
    const t3Sum = selectedFormMatrixItems.reduce((acc, it) => acc + it.term3, 0);
    const gAnnual = selectedFormMatrixItems.reduce((acc, it) => acc + it.annual, 0);

    printOfficialFeeCircular({
      schoolName: registeredSchoolName,
      motto: schoolDetails?.motto || 'In God We Excel',
      postalAddress: schoolDetails?.postal_address,
      physicalAddress: schoolDetails?.physical_address,
      county: schoolDetails?.county,
      phone: schoolDetails?.phone1,
      email: schoolDetails?.email,
      principalName: schoolDetails?.principal_name || 'Mr. Jim (Principal)',
      bankName: schoolDetails?.bank_name || 'KCB Bank',
      bankAccountName: schoolDetails?.bank_account_name || registeredSchoolName,
      bankAccountNumber: schoolDetails?.bank_account_number || '45625825215',
      bankBranch: schoolDetails?.bank_branch || 'BOMET',
      mpesaPaybill: schoolDetails?.mpesa_paybill,
      academicYear: new Date().getFullYear(),
      formName,
      curriculumTrack: track,
      items: selectedFormMatrixItems,
      totalTerm1: t1Sum,
      totalTerm2: t2Sum,
      totalTerm3: t3Sum,
      grandAnnual: gAnnual,
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length && paged.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (loading || loadingSchool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading fee structures & school parameters…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-10 max-w-[1400px] mx-auto text-slate-800">
      {/* ═══ COMPACT EXECUTIVE COMMAND HEADER (Light Theme) ═══ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg shrink-0">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Fee Structure &amp; Vote Heads
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {registeredSchoolName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {currentTerm?.term_name || 'Term 3'} · {new Date().getFullYear()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Official MoE vote heads · Cohort schedules · Termly breakdown · Multi-sheet Excel
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/fees"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition flex items-center gap-1.5"
            >
              <FiArrowLeft size={13} /> Hub
            </Link>

            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Download 4-Sheet Enterprise Excel Workbook with Registered School Header"
            >
              <FiDownload size={13} className="text-emerald-700" />
              <span>{isExportingExcel ? 'Exporting...' : 'Excel Sheet'}</span>
            </button>

            <button
              onClick={handlePrintCircular}
              className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              title="Print Official Approved School Fee Circular"
            >
              <FiPrinter size={13} className="text-blue-700" />
              <span>Fee Circular</span>
            </button>

            <button
              onClick={openAdd}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs"
            >
              <FiPlus size={14} />
              <span>Add Vote Item</span>
            </button>

            <button
              onClick={fetchAll}
              title="Refresh Live DB Data"
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            >
              <FiRefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ COMPACT PREMIUM KPI HUD (Strictly Low Profile & Elegant) ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          {
            label: 'Total Fee Load',
            value: fmt(totalAmount),
            sub: `${structures.length} line items`,
            color: 'text-indigo-700',
            bg: 'bg-indigo-50/70',
            border: 'border-indigo-100',
            icon: <FiDollarSign size={14} className="text-indigo-600" />,
          },
          {
            label: 'Vote Heads',
            value: String(distinctCategories.length),
            sub: 'Active categories',
            color: 'text-sky-700',
            bg: 'bg-sky-50/70',
            border: 'border-sky-100',
            icon: <FiLayers size={14} className="text-sky-600" />,
          },
          {
            label: 'Class Cohorts',
            value: String(forms.length),
            sub: 'Configured levels',
            color: 'text-emerald-700',
            bg: 'bg-emerald-50/70',
            border: 'border-emerald-100',
            icon: <FiGrid size={14} className="text-emerald-600" />,
          },
          {
            label: 'Active Term',
            value: currentTerm?.term_name || 'Term 3',
            sub: 'Academic session',
            color: 'text-amber-700',
            bg: 'bg-amber-50/70',
            border: 'border-amber-100',
            icon: <FiCalendar size={14} className="text-amber-600" />,
          },
          {
            label: 'Avg / Vote Head',
            value: fmt(avgFeePerVoteHead),
            sub: 'Mean allocation',
            color: 'text-purple-700',
            bg: 'bg-purple-50/70',
            border: 'border-purple-100',
            icon: <FiTrendingUp size={14} className="text-purple-600" />,
          },
          {
            label: 'Filtered Subtotal',
            value: fmt(filteredTotal),
            sub: `${filtered.length} matching rows`,
            color: 'text-rose-700',
            bg: 'bg-rose-50/70',
            border: 'border-rose-100',
            icon: <FiSliders size={14} className="text-rose-600" />,
          },
        ].map((k, i) => (
          <div
            key={i}
            className={`bg-white border ${k.border} rounded-xl p-2.5 shadow-2xs flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</span>
              <div className={`w-6 h-6 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                {k.icon}
              </div>
            </div>
            <div className="mt-1">
              <p className={`text-sm font-extrabold font-mono ${k.color} tracking-tight`}>{k.value}</p>
              <p className="text-[9.5px] text-slate-400 font-medium truncate">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ SIDE-BY-SIDE ANALYTICS SVG CHARTS ═══ */}
      <UltraStructureCharts
        voteHeadMetrics={voteHeadChartMetrics}
        formProgressionMetrics={formProgressionMetrics}
        totalAnnualBudget={totalAmount}
      />

      {/* ═══ 4-TAB EXECUTIVE WORKSPACE BAR ═══ */}
      <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
        {[
          { id: 'ledger' as TabType, label: 'Vote Heads Ledger', icon: FiLayers, count: filtered.length },
          { id: 'matrix' as TabType, label: 'Annual & Termly Matrix', icon: FiGrid },
          { id: 'cloning' as TabType, label: 'Cohort Cloning & Adjuster', icon: FiCopy },
          { id: 'circular' as TabType, label: 'Official Circular & Notice', icon: FiFileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: VOTE HEADS LEDGER & DATAGRID
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          {/* Dual-Track Curriculum Pill Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Curriculum:
            </span>
            {[
              { id: 'all', label: 'All Levels' },
              { id: 'cbc_senior', label: 'CBC Senior (G10–12)' },
              { id: '844', label: '8-4-4 High (F1–4)' },
              { id: 'jss', label: 'JSS (G7–9)' },
              { id: 'primary', label: 'Primary CBC (G1–6)' },
              { id: 'preprimary', label: 'Pre-Primary (PP1–2)' },
              { id: 'general', label: 'General / School-Wide' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCurriculumFilter(c.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition ${
                  curriculumFilter === c.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative min-w-[180px] max-w-[260px] flex-1">
                <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vote head, class..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              {/* Form Select */}
              <select
                value={filterForm}
                onChange={(e) => setFilterForm(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">All Classes</option>
                <option value="general">School-wide (General)</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.form_name}
                  </option>
                ))}
              </select>

              {/* Term Select */}
              <select
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">All Terms</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.term_name} {t.year}
                  </option>
                ))}
              </select>

              {/* Category Select */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="all">All Vote Heads</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {(search || curriculumFilter !== 'all' || filterForm !== 'all' || filterTerm !== 'all' || filterCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCurriculumFilter('all');
                    setFilterForm('all');
                    setFilterTerm('all');
                    setFilterCategory('all');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 flex items-center gap-1"
                >
                  <FiX size={12} /> Clear
                </button>
              )}
            </div>

            {/* Right: Batch Controls & Page Size */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                  <span className="text-[11px] font-bold text-indigo-700 font-mono">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                  >
                    <FiTrash2 size={11} /> Delete
                  </button>
                  <button
                    onClick={() => setShowIncModal(true)}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                  >
                    <FiPercent size={11} /> Adjust
                  </button>
                </div>
              )}

              {/* Rows per page selector (10, 25, 50, 100) */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="py-1 px-1.5 rounded border border-slate-200 bg-white font-semibold text-slate-700 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Grid Table (Compact, Reduced 10 Rows) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-bold text-slate-600">No fee structure items found</p>
                <p className="text-xs text-slate-400 mt-1">Adjust filters or click &ldquo;Add Vote Item&rdquo; to create one</p>
                <button
                  onClick={openAdd}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1"
                >
                  <FiPlus size={12} /> Add Fee Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === paged.length && paged.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 text-center w-8">#</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none"
                        onClick={() => toggleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Vote Head Category</span>
                          {sortKey === 'category' && (sortDir === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none"
                        onClick={() => toggleSort('form_id')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Class / Form</span>
                          {sortKey === 'form_id' && (sortDir === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th className="py-2.5 px-3">Curriculum Track</th>
                      <th
                        className="py-2.5 px-3 cursor-pointer select-none"
                        onClick={() => toggleSort('term_id')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Academic Term</span>
                          {sortKey === 'term_id' && (sortDir === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 text-right cursor-pointer select-none"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Amount (KES)</span>
                          {sortKey === 'amount' && (sortDir === 'asc' ? '▲' : '▼')}
                        </div>
                      </th>
                      <th className="py-2.5 px-3">Description / Purpose</th>
                      <th className="py-2.5 px-3 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paged.map((s, i) => {
                      const rowNum = (page - 1) * pageSize + i + 1;
                      const isSelected = selectedIds.has(s.id);
                      const fObj = forms.find((f) => f.id === s.form_id);
                      const fName = fObj ? fObj.form_name : 'All Forms';
                      const { track, badgeColor, bg, border } = getCurriculumTrack(fName);
                      const tObj = terms.find((t) => t.id === s.term_id);

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors hover:bg-slate-50/80 ${
                            isSelected ? 'bg-indigo-50/40' : i % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(s.id)}
                              className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center text-[10px] font-mono text-slate-400">
                            {rowNum}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background:
                                    s.category === 'Tuition'
                                      ? '#4f46e5'
                                      : s.category === 'Boarding'
                                      ? '#0284c7'
                                      : s.category?.includes('Exam')
                                      ? '#059669'
                                      : '#d97706',
                                }}
                              />
                              <span className="font-bold text-slate-800 text-xs">{s.category}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {s.form_id ? (
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {fName}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                School-wide
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                              style={{ color: badgeColor, background: bg, border: `1px solid ${border}` }}
                            >
                              {track}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-semibold text-slate-600">
                              {tObj ? tObj.term_name : 'All Terms'} {s.year ? `(${s.year})` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-bold font-mono text-emerald-700 text-xs">
                              {fmt(Number(s.amount))}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[200px] truncate">
                            {s.description || <span className="italic text-slate-300">No notes</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(s)}
                                title="Edit Item"
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              >
                                <FiEdit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(s)}
                                title="Duplicate Item"
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              >
                                <FiCopy size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                title="Delete Item"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 border-t border-slate-200 text-xs font-bold">
                      <td colSpan={6} className="py-2.5 px-3 text-slate-600 uppercase text-[10px] tracking-wider">
                        Page Subtotal ({paged.length} items) · Filtered Total: {fmt(filteredTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800 text-sm">
                        {fmt(paged.reduce((acc, it) => acc + Number(it.amount || 0), 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 font-semibold"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: ANNUAL & TERMLY MATRIX STUDIO
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'matrix' && (
        <div className="space-y-3">
          {/* Top Bar for Matrix: Form Selector & Print */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Select Class Focus:</span>
              <select
                value={matrixSelectedForm}
                onChange={(e) => setMatrixSelectedForm(e.target.value)}
                className="py-1 px-3 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="all">Composite (All Classes Combined)</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.form_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintCircular}
                className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <FiPrinter size={13} />
                <span>Print Schedule Voucher</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  {matrixSelectedForm === 'all'
                    ? 'Composite School Fee Matrix (Terms 1, 2, 3)'
                    : `${forms.find((f) => String(f.id) === matrixSelectedForm)?.form_name || 'Class'} Termly Fee Breakdown`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Vote-head by term distribution matching Kenyan MoE capitation &amp; BOM budget structures
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-4">Vote Head / Category</th>
                    <th className="py-2.5 px-3 text-right">Term 1 (KES)</th>
                    <th className="py-2.5 px-3 text-right">Term 2 (KES)</th>
                    <th className="py-2.5 px-3 text-right">Term 3 (KES)</th>
                    <th className="py-2.5 px-4 text-right">Total Annual (KES)</th>
                    <th className="py-2.5 px-3 text-right">% Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedFormMatrixItems.map((item, i) => {
                    const grand = selectedFormMatrixItems.reduce((acc, it) => acc + it.annual, 0) || 1;
                    const pct = (item.annual / grand) * 100;
                    return (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{i + 1}</td>
                        <td className="py-2 px-4 font-bold text-slate-800">{item.category}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.term1 > 0 ? fmt(item.term1) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.term2 > 0 ? fmt(item.term2) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.term3 > 0 ? fmt(item.term3) : '—'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700">
                          {fmt(item.annual)}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-500">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50/50 border-t-2 border-indigo-200 text-xs font-bold">
                    <td colSpan={2} className="py-3 px-4 text-indigo-900 uppercase">
                      Grand Annual Total:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {fmt(selectedFormMatrixItems.reduce((acc, it) => acc + it.term1, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {fmt(selectedFormMatrixItems.reduce((acc, it) => acc + it.term2, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {fmt(selectedFormMatrixItems.reduce((acc, it) => acc + it.term3, 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                      {fmt(selectedFormMatrixItems.reduce((acc, it) => acc + it.annual, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-700">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: COHORT CLONING & ADJUSTER
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cloning' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Term-to-Term Cloning Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Clone Structure Between Terms
              </h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Duplicate an entire term&apos;s vote heads into the next term with an optional inflation or percentage adjustment.
            </p>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Source Term (Copy From)
                </label>
                <select
                  value={copyFromTerm}
                  onChange={(e) => setCopyFromTerm(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="">— Select Source Term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.term_name} {t.year} ({structures.filter((s) => s.term_id === t.id).length} items)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Term (Copy To)
                </label>
                <select
                  value={copyToTerm}
                  onChange={(e) => setCopyToTerm(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="">— Select Target Term —</option>
                  {terms
                    .filter((t) => String(t.id) !== copyFromTerm)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name} {t.year}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Inflation / Fee Adjustment (%)
                </label>
                <input
                  type="number"
                  value={copyInflationPct}
                  onChange={(e) => setCopyInflationPct(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>

              <button
                onClick={handleBulkCopy}
                className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <FiCopy size={13} />
                <span>Execute Term Cloning</span>
              </button>
            </div>
          </div>

          {/* Active Session Term Switcher Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Academic Session &amp; Active Term
              </h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Set which term is designated active in the live database for fee obligations, arrears, and receipt printing.
            </p>

            <div className="space-y-2">
              {terms.map((t) => {
                const isCurrent = t.is_current;
                return (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-indigo-50/70 border-indigo-200'
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{t.term_name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                            CURRENT ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Year: {t.year} · {structures.filter((s) => s.term_id === t.id).length} configured items
                      </p>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleSetCurrentTerm(t.id)}
                        className="px-2.5 py-1 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold transition"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: OFFICIAL FEE CIRCULAR PREVIEW & NOTICE
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'circular' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Official Ministry of Education Fee Notice Preview
              </h3>
              <p className="text-[11px] text-slate-500">
                School Letterhead with live banking instructions and BOM authorization
              </p>
            </div>
            <button
              onClick={handlePrintCircular}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <FiPrinter size={13} />
              <span>Print A4 Circular</span>
            </button>
          </div>

          {/* Letterhead Preview Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-[800px] mx-auto text-xs space-y-4">
            {/* Header */}
            <div className="text-center border-b-2 border-indigo-900 pb-3">
              <h2 className="text-base font-black text-indigo-950 uppercase tracking-wider">
                {registeredSchoolName}
              </h2>
              {schoolDetails?.motto && (
                <p className="text-[11px] italic text-slate-500 mt-0.5">&ldquo;{schoolDetails.motto}&rdquo;</p>
              )}
              <p className="text-[10px] text-slate-500 mt-1">
                {schoolDetails?.postal_address || 'P.O. Box 12123'} · {schoolDetails?.physical_address || 'SILIBWET TOWN'} · {schoolDetails?.county || 'Bomet'} County
              </p>
              <span className="inline-block mt-2 px-3 py-0.5 rounded bg-indigo-900 text-white font-extrabold text-[10px] uppercase tracking-wider">
                OFFICIAL APPROVED FEES SCHEDULE — ACADEMIC YEAR {new Date().getFullYear()}
              </span>
            </div>

            {/* Meta */}
            <div className="flex justify-between text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium">
              <div>
                Target Cohort: <strong className="text-indigo-950">All School Classes Composite</strong>
              </div>
              <div>
                Principal: <strong className="text-indigo-950">{schoolDetails?.principal_name || 'Mr. Jim'}</strong>
              </div>
            </div>

            {/* Mini Table Preview */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-indigo-950 text-white text-[9.5px] uppercase">
                    <th className="py-1.5 px-2">#</th>
                    <th className="py-1.5 px-3">Vote Head / Category</th>
                    <th className="py-1.5 px-2 text-right">Term 1</th>
                    <th className="py-1.5 px-2 text-right">Term 2</th>
                    <th className="py-1.5 px-2 text-right">Term 3</th>
                    <th className="py-1.5 px-2 text-right">Total Annual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedFormMatrixItems.slice(0, 8).map((it, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="py-1.5 px-2 font-mono text-[10px]">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{it.category}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{it.term1 > 0 ? fmt(it.term1) : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{it.term2 > 0 ? fmt(it.term2) : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{it.term3 > 0 ? fmt(it.term3) : '—'}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-indigo-900">{fmt(it.annual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Banking Details Box */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-[10.5px] text-blue-950">
              <p className="font-extrabold uppercase text-blue-900 mb-1">Approved Payment Options:</p>
              <p>
                Bank: <strong>{schoolDetails?.bank_name || 'KCB Bank'}</strong> | A/C: <strong>{schoolDetails?.bank_account_number || '45625825215'}</strong> | Name: <strong>{schoolDetails?.bank_account_name || registeredSchoolName}</strong>
              </p>
              <p className="text-rose-700 font-semibold mt-1">
                Notice: Strictly no cash transactions accepted at school premises.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[10px] text-slate-600">
              <div>
                <div className="border border-dashed border-slate-300 h-10 rounded flex items-center justify-center font-bold text-slate-400">
                  OFFICIAL STAMP
                </div>
              </div>
              <div>
                <div className="border-t border-slate-800 pt-1 font-bold mt-6">Senior Bursar</div>
              </div>
              <div>
                <div className="border-t border-slate-800 pt-1 font-bold mt-6">{schoolDetails?.principal_name || 'Principal'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD / EDIT FEE ITEM MODAL ═══ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-xl overflow-hidden"
          >
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold">{editId ? 'Edit Fee Vote Item' : 'Add Fee Vote Item'}</h3>
                <p className="text-[11px] text-indigo-100 mt-0.5">Configure vote category, form allocation and amount</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Vote Head Category *
                </label>
                <select
                  value={formState.category}
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="">— Select Vote Head —</option>
                  {voteHeadNames.length > 0
                    ? voteHeadNames.map((name) => <option key={name}>{name}</option>)
                    : ['Tuition', 'Boarding', 'Exam Levies', 'Activity / Sports', 'Repairs & Maintenance', 'Medical'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Amount (KES) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">KES</span>
                  <input
                    type="number"
                    value={formState.amount}
                    onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                    placeholder="0"
                    className="w-full pl-12 pr-3 py-2 text-base font-extrabold font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-emerald-700 bg-emerald-50/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Class / Form
                  </label>
                  <select
                    value={formState.form_id}
                    onChange={(e) => setFormState({ ...formState, form_id: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="">All Forms (General)</option>
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.form_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Academic Term
                  </label>
                  <select
                    value={formState.term_id}
                    onChange={(e) => setFormState({ ...formState, term_id: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="">All Terms</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Description / Purpose (Optional)
                </label>
                <input
                  type="text"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="e.g. Approved by BOM for Academic year"
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <FiSave size={13} />
                <span>{editId ? 'Update Item' : 'Save Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FEE INCREASE MODAL ═══ */}
      {showIncModal && (
        <div
          onClick={() => setShowIncModal(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-xl overflow-hidden text-xs"
          >
            <div className="bg-amber-600 p-4 text-white">
              <h3 className="text-sm font-extrabold">Batch Fee Adjustment</h3>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Apply inflation adjustment to {selectedIds.size > 0 ? `${selectedIds.size} selected items` : `all ${filtered.length} filtered items`}
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setIncreaseType('pct')}
                  className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                    increaseType === 'pct'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  % Percentage
                </button>
                <button
                  onClick={() => setIncreaseType('flat')}
                  className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                    increaseType === 'flat'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  Flat KES
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Adjustment Value ({increaseType === 'pct' ? '%' : 'KES'})
                </label>
                <input
                  type="number"
                  value={increaseVal}
                  onChange={(e) => setIncreaseVal(e.target.value)}
                  placeholder={increaseType === 'pct' ? '5' : '1000'}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-base font-bold text-center"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowIncModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleFeeIncrease}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
