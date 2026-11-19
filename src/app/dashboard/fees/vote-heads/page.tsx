'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { exportUltraVoteHeadsExcel } from '@/components/fees/UltraVoteHeadsExport';
import {
  FiZap,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiSearch,
  FiRefreshCw,
  FiGrid,
  FiCopy,
  FiPrinter,
  FiSave,
  FiAlertTriangle,
  FiChevronDown,
  FiDownload,
  FiLayers,
  FiShield,
  FiPieChart,
  FiBookOpen,
  FiCheckCircle,
  FiTrendingUp,
  FiDollarSign,
  FiFilter,
  FiArrowRight,
  FiSliders,
  FiArrowLeft,
} from 'react-icons/fi';

/* ══════════════════════════════════════════════════════════════════════════════
   TYPES & EXECUTIVE PALETTE
   ══════════════════════════════════════════════════════════════════════════════ */
interface VoteHead {
  id: number;
  code: string;
  name: string;
  category: string;
  priority: number;
  is_active: boolean;
  description: string | null;
  color: string | null;
}

interface SchoolForm {
  id: number;
  form_name: string;
  education_system?: string;
}

interface Term {
  id: number;
  term_name: string;
}

type MatrixState = Record<number, Record<number, { dbId: number | null; amount: string; dirty: boolean }>>;

const COLORS = [
  '#4f46e5', '#0891b2', '#16a34a', '#d97706', '#7c3aed',
  '#dc2626', '#db2777', '#ea580c', '#0d9488', '#2563eb',
  '#65a30d', '#b91c1c', '#059669', '#be185d', '#6366f1',
];

const CATEGORIES = [
  'TUITION',
  'BOARDING',
  'OPERATIONS',
  'R_M_I',
  'ACTIVITY',
  'ADMINISTRATION',
  'EXAMINATION',
  'DEVELOPMENT',
  'MEDICAL',
  'OTHER',
];

const EMPTY_VH = {
  code: '',
  name: '',
  category: 'TUITION',
  priority: 2,
  is_active: true,
  description: '',
  color: '#4f46e5',
};

const fmtKES = (n: number) => `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(n || 0).toLocaleString('en-KE')}`;
};

export default function VoteHeadsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // School Details from direct DB
  const [schoolDetails, setSchoolDetails] = useState<any>(null);

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const { data } = await supabase
          .from('school_details')
          .select('*')
          .neq('section', 'primary')
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data) setSchoolDetails(data);
      } catch (err) {
        console.error('Failed to load school details:', err);
      }
    }
    loadSchoolData();
  }, []);

  // Workspace Navigation Tabs
  const [activeTab, setActiveTab] = useState<'heads' | 'matrix' | 'analytics' | 'circular'>('heads');

  /* ── VOTE HEADS state ─────────────────────────────────────────── */
  const [heads, setHeads] = useState<VoteHead[]>([]);
  const [loadingHeads, setLoadingHeads] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'name'>('priority');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formVH, setFormVH] = useState({ ...EMPTY_VH });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ── MATRIX state ─────────────────────────────────────────────── */
  const [forms, setForms] = useState<SchoolForm[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selForm, setSelForm] = useState<number | ''>('');
  const [selYear, setSelYear] = useState<number>(new Date().getFullYear());
  const [matrix, setMatrix] = useState<MatrixState>({});
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [copyFromForm, setCopyFromForm] = useState<number | ''>('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+F
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const hasDirty = useMemo(
    () => Object.values(matrix).some((row) => Object.values(row).some((c) => c.dirty)),
    [matrix]
  );

  /* ── Fetch vote heads ─────────────────────────────────────────── */
  const fetchHeads = useCallback(async () => {
    setLoadingHeads(true);
    const { data, error } = await supabase
      .from('school_vote_heads')
      .select('*')
      .order('priority')
      .order('name');
    if (!error) setHeads(data || []);
    else toast.error('Failed to load vote heads');
    setLoadingHeads(false);
  }, []);

  /* ── Fetch forms and terms ────────────────────────────────────── */
  const fetchFormsTerms = useCallback(async () => {
    const [f, t] = await Promise.all([
      supabase.from('school_forms').select('id,form_name,education_system').order('id'),
      supabase.from('school_terms').select('id,term_name').order('id'),
    ]);
    const formList = f.data || [];
    setForms(formList);
    setTerms(t.data || []);
    if (formList.length > 0 && selForm === '') {
      setSelForm(formList[0].id);
    }
  }, [selForm]);

  useEffect(() => {
    fetchHeads();
    fetchFormsTerms();
  }, [fetchHeads, fetchFormsTerms]);

  /* ── Build blank matrix from vote heads × terms ───────────────── */
  const buildEmptyMatrix = useCallback((vhs: VoteHead[], termList: Term[]): MatrixState => {
    const m: MatrixState = {};
    for (const vh of vhs.filter((h) => h.is_active)) {
      m[vh.id] = {};
      for (const t of termList) {
        m[vh.id][t.id] = { dbId: null, amount: '', dirty: false };
      }
    }
    return m;
  }, []);

  /* ── Load matrix for selected form + year ─────────────────────── */
  const loadMatrix = useCallback(
    async (formId: number, year: number) => {
      if (!formId || heads.length === 0 || terms.length === 0) return;
      setLoadingMatrix(true);
      const base = buildEmptyMatrix(heads, terms);

      const { data, error } = await supabase
        .from('school_fee_structures')
        .select('id, vote_head_id, term_id, amount')
        .eq('form_id', formId)
        .eq('year', year)
        .not('vote_head_id', 'is', null);

      if (error) {
        toast.error('Failed to load fee matrix');
        setLoadingMatrix(false);
        return;
      }

      for (const row of data || []) {
        if (base[row.vote_head_id]?.[row.term_id] !== undefined) {
          base[row.vote_head_id][row.term_id] = {
            dbId: row.id,
            amount: Number(row.amount) > 0 ? String(row.amount) : '',
            dirty: false,
          };
        }
      }
      setMatrix(base);
      setLoadingMatrix(false);
    },
    [heads, terms, buildEmptyMatrix]
  );

  useEffect(() => {
    if (selForm && (activeTab === 'matrix' || activeTab === 'analytics')) {
      loadMatrix(Number(selForm), selYear);
    }
  }, [selForm, selYear, activeTab, loadMatrix]);

  /* ── Cell change ──────────────────────────────────────────────── */
  const onCellChange = (vhId: number, termId: number, val: string) => {
    if (val !== '' && !/^\d*$/.test(val)) return;
    setMatrix((prev) => ({
      ...prev,
      [vhId]: { ...prev[vhId], [termId]: { ...prev[vhId][termId], amount: val, dirty: true } },
    }));
  };

  /* ── Quick Matrix Adjustments ─────────────────────────────────── */
  const handleQuickAdjust = (type: 'round50' | 'add10pct' | 'clearZeroes') => {
    if (!selForm) return;
    setMatrix((prev) => {
      const next: MatrixState = {};
      for (const [vhIdStr, termMap] of Object.entries(prev)) {
        const vhId = Number(vhIdStr);
        next[vhId] = {};
        for (const [termIdStr, cell] of Object.entries(termMap)) {
          const termId = Number(termIdStr);
          let amt = Number(cell.amount || 0);

          if (type === 'round50' && amt > 0) {
            amt = Math.round(amt / 50) * 50;
          } else if (type === 'add10pct' && amt > 0) {
            amt = Math.round(amt * 1.1);
          } else if (type === 'clearZeroes' && amt === 0) {
            amt = 0;
          }

          const newStr = amt > 0 ? String(amt) : '';
          const isDirty = newStr !== cell.amount;
          next[vhId][termId] = {
            ...cell,
            amount: newStr,
            dirty: cell.dirty || isDirty,
          };
        }
      }
      return next;
    });
    toast.success(`Quick adjustment applied! Remember to click Save All Changes.`);
  };

  /* ── Save all dirty cells ─────────────────────────────────────── */
  const saveMatrix = async () => {
    if (!selForm) {
      toast.error('Select a form first');
      return;
    }
    setSavingMatrix(true);
    let saved = 0;
    let errors = 0;

    for (const [vhIdStr, termMap] of Object.entries(matrix)) {
      const vhId = Number(vhIdStr);
      const vh = heads.find((h) => h.id === vhId);
      for (const [termIdStr, cell] of Object.entries(termMap)) {
        if (!cell.dirty) continue;
        const termId = Number(termIdStr);
        const amount = Number(cell.amount) || 0;

        if (cell.dbId) {
          const { error } = await supabase
            .from('school_fee_structures')
            .update({ amount, vote_head_name: vh?.name, category: vh?.category || vh?.name })
            .eq('id', cell.dbId);
          if (error) {
            console.error(error);
            errors++;
          } else {
            setMatrix((p) => ({
              ...p,
              [vhId]: { ...p[vhId], [termId]: { ...p[vhId][termId], dirty: false } },
            }));
            saved++;
          }
        } else if (amount > 0) {
          const { data: ins, error } = await supabase
            .from('school_fee_structures')
            .insert({
              form_id: Number(selForm),
              term_id: termId,
              year: selYear,
              vote_head_id: vhId,
              vote_head_name: vh?.name || '',
              category: vh?.category || vh?.name || '',
              amount,
            })
            .select('id')
            .single();
          if (error) {
            console.error(error);
            errors++;
          } else {
            setMatrix((p) => ({
              ...p,
              [vhId]: {
                ...p[vhId],
                [termId]: { dbId: ins.id, amount: String(amount), dirty: false },
              },
            }));
            saved++;
          }
        } else {
          setMatrix((p) => ({
            ...p,
            [vhId]: { ...p[vhId], [termId]: { ...p[vhId][termId], dirty: false } },
          }));
        }
      }
    }

    setSavingMatrix(false);
    if (errors === 0) toast.success(`Saved ${saved} vote head amount${saved !== 1 ? 's' : ''} to database! ✓`);
    else toast.error(`Saved ${saved}, ${errors} failed — check connection`);
  };

  /* ── Delete entire row from matrix ───────────────────────────── */
  const deleteRowFromMatrix = async (vhId: number) => {
    const row = matrix[vhId];
    if (!row) return;
    const ids = Object.values(row)
      .filter((c) => c.dbId)
      .map((c) => c.dbId!);
    if (ids.length > 0) {
      const { error } = await supabase.from('school_fee_structures').delete().in('id', ids);
      if (error) {
        toast.error('Failed to clear row: ' + error.message);
        return;
      }
    }
    setMatrix((prev) => {
      const u = { ...prev };
      if (u[vhId]) {
        for (const tid of Object.keys(u[vhId])) {
          u[vhId][Number(tid)] = { dbId: null, amount: '', dirty: false };
        }
      }
      return u;
    });
    toast.success('Vote head amounts cleared for this form');
  };

  /* ── Copy structure from another form ────────────────────────── */
  const copyFromOtherForm = async () => {
    if (!copyFromForm || !selForm) return;
    const { data, error } = await supabase
      .from('school_fee_structures')
      .select('vote_head_id, term_id, amount')
      .eq('form_id', Number(copyFromForm))
      .eq('year', selYear)
      .not('vote_head_id', 'is', null);
    if (error) {
      toast.error('Failed to copy: ' + error.message);
      return;
    }
    const base = buildEmptyMatrix(heads, terms);
    for (const row of data || []) {
      if (base[row.vote_head_id]?.[row.term_id] !== undefined) {
        base[row.vote_head_id][row.term_id] = { dbId: null, amount: String(row.amount || ''), dirty: true };
      }
    }
    setMatrix(base);
    setShowCopyModal(false);
    toast('Structure copied into editor! Click "Save All Changes" to persist.', { icon: '📋' });
  };

  /* ── Enterprise Multi-Sheet Excel Export ──────────────────────── */
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const toastId = toast.loading('Generating enterprise Excel workbook with official letterhead...');

      const formNameStr = forms.find((f) => f.id === Number(selForm))?.form_name || 'All Classes';
      const termNamesList = terms.map((t) => t.term_name);

      const matrixRowsList = activeVHsInMatrix.map((vh) => {
        const termAmountsMap: Record<string, number> = {};
        terms.forEach((t) => {
          termAmountsMap[t.term_name] = Number(matrix[vh.id]?.[t.id]?.amount || 0);
        });
        const annualTotal = terms.reduce((s, t) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
        return {
          voteHeadName: vh.name,
          voteHeadCode: vh.code,
          priority: vh.priority,
          termAmounts: termAmountsMap,
          annualTotal,
        };
      });

      await exportUltraVoteHeadsExcel({
        schoolName: schoolDetails?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT",
        schoolMotto: schoolDetails?.school_motto || 'Excellence in Education',
        academicYear: selYear,
        formName: formNameStr,
        voteHeads: heads.map((h) => ({
          id: h.id,
          code: h.code,
          name: h.name,
          category: h.category,
          priority: h.priority,
          is_active: h.is_active,
          description: h.description,
          color: h.color,
        })),
        matrixRows: matrixRowsList,
        termNames: termNamesList,
      });

      toast.success('Official Excel workbook downloaded successfully! ✓', { id: toastId });
    } catch (err: any) {
      console.error('Excel Export Error:', err);
      toast.error('Failed to export Excel: ' + (err?.message || 'Error'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  /* ── Official Print Matrix ─────────────────────────────────────── */
  const printMatrix = () => {
    const formName = forms.find((f) => f.id === Number(selForm))?.form_name || '';
    const activeVHs = heads.filter((h) => h.is_active && matrix[h.id]);
    const schoolName = schoolDetails?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT";
    const schoolMotto = schoolDetails?.school_motto || 'Excellence in Education';

    const rows = activeVHs
      .map((vh) => {
        const cells = terms
          .map((t) => {
            const a = Number(matrix[vh.id]?.[t.id]?.amount || 0);
            return `<td style="text-align:right;padding:7px 10px;border:1px solid #cbd5e1;font-family:monospace;font-size:11px;">${
              a > 0 ? a.toLocaleString() : '—'
            }</td>`;
          })
          .join('');
        const total = terms.reduce((s, t) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
        return `<tr>
          <td style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:700;font-size:11px;">${vh.name}</td>
          <td style="padding:7px 10px;border:1px solid #cbd5e1;font-size:10px;color:#64748b;font-family:monospace;text-align:center;">#${vh.priority}</td>
          ${cells}
          <td style="text-align:right;padding:7px 10px;border:1px solid #cbd5e1;font-weight:800;font-family:monospace;font-size:11px;">KES ${total.toLocaleString()}</td>
        </tr>`;
      })
      .join('');

    const colTotalsHtml = terms
      .map((t) => {
        const s = activeVHs.reduce((sum, vh) => sum + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
        return `<td style="text-align:right;padding:8px 10px;border:1px solid #cbd5e1;font-weight:800;font-family:monospace;font-size:11px;">KES ${s.toLocaleString()}</td>`;
      })
      .join('');

    const grand = activeVHs.reduce(
      (s, vh) => s + terms.reduce((ss, t) => ss + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0),
      0
    );

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Official Fee Structure - ${schoolName}</title><style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; margin: 0; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th { background: #1e3a8a; color: white; padding: 9px 10px; border: 1px solid #1e3a8a; font-size: 11px; text-transform: uppercase; }
      @media print { body { padding: 10px; } }
    </style></head><body>
      <div style="text-align:center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 15px;">
        <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; color: #1e3a8a;">${schoolName}</h2>
        <p style="margin: 3px 0; font-size: 12px; font-style: italic; color: #475569;">"${schoolMotto}"</p>
        <span style="display:inline-block; padding: 2px 10px; border-radius: 99px; background: #e0e7ff; color: #3730a3; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 4px;">
          Ministry of Education · Circular-Compliant Fee Schedule
        </span>
        <h3 style="margin: 10px 0 0; font-size: 14px; font-weight: 800; color: #0f172a;">
          OFFICIAL FEE VOTE HEAD MATRIX FOR THE YEAR ${selYear} — ${formName.toUpperCase()}
        </h3>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left;">Vote Head Category</th>
            <th style="text-align:center; width: 60px;">Priority</th>
            ${terms.map((t) => `<th style="text-align:right;">${t.term_name}</th>`).join('')}
            <th style="text-align:right;">ANNUAL TOTAL</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f1f5f9;font-weight:800;">
            <td colspan="2" style="padding:8px 10px;border:1px solid #cbd5e1;font-size:11px;">SCHEDULE TOTAL</td>
            ${colTotalsHtml}
            <td style="text-align:right;padding:8px 10px;border:1px solid #cbd5e1;font-size:12px;color:#1e3a8a;font-weight:900;">KES ${grand.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top:20px;display:flex;justify-content:space-between;font-size:10px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:10px;">
        <span>Verified by Bursar & Finance Desk · Official Accounting Schedule</span>
        <span>Printed on ${new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}</span>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  /* ── Vote Head CRUD ───────────────────────────────────────────── */
  const openAdd = () => {
    setEditId(null);
    const n = heads.length > 0 ? Math.max(...heads.map((h) => h.priority)) + 1 : 2;
    setFormVH({ ...EMPTY_VH, priority: n });
    setShowModal(true);
  };

  const openEdit = (h: VoteHead) => {
    setEditId(h.id);
    setFormVH({
      code: h.code,
      name: h.name,
      category: h.category,
      priority: h.priority,
      is_active: h.is_active,
      description: h.description || '',
      color: h.color || '#4f46e5',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formVH.name.trim()) {
      toast.error('Vote head name is required');
      return;
    }
    setSaving(true);
    const code = formVH.code.trim()
      ? formVH.code.trim().toUpperCase().replace(/\s+/g, '_')
      : formVH.name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    const payload = {
      code,
      name: formVH.name.trim(),
      category: formVH.category,
      priority: Number(formVH.priority) || 99,
      sort_order: Number(formVH.priority) || 99,
      is_active: formVH.is_active,
      description: formVH.description?.trim() || null,
      color: formVH.color || '#4f46e5',
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('school_vote_heads').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('school_vote_heads').insert([{ ...payload, created_at: new Date().toISOString() }]));
    }

    if (error) {
      toast.error('Save failed: ' + error.message);
    } else {
      toast.success(editId ? 'Vote head updated successfully! ✓' : 'New vote head registered! ✓');
      setShowModal(false);
      fetchHeads();
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('school_vote_heads').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed: ' + error.message);
    } else {
      toast.success('Vote head removed');
      setDeleteId(null);
      fetchHeads();
    }
  };

  const toggleActive = async (h: VoteHead) => {
    await supabase.from('school_vote_heads').update({ is_active: !h.is_active }).eq('id', h.id);
    fetchHeads();
  };

  /* ── Filtered Heads ───────────────────────────────────────────── */
  const filteredHeads = useMemo(() => {
    let list = heads.filter(
      (h) =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.code.toLowerCase().includes(search.toLowerCase()) ||
        (h.category || '').toLowerCase().includes(search.toLowerCase())
    );

    if (categoryFilter !== 'ALL') {
      list = list.filter((h) => (h.category || 'OTHER').toUpperCase() === categoryFilter);
    }

    if (statusFilter === 'ACTIVE') {
      list = list.filter((h) => h.is_active);
    } else if (statusFilter === 'INACTIVE') {
      list = list.filter((h) => !h.is_active);
    }

    if (sortBy === 'priority') {
      list.sort((a, b) => a.priority - b.priority);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [heads, search, categoryFilter, statusFilter, sortBy]);

  /* ── Column / Row Matrix Totals ────────────────────────────────── */
  const activeVHsInMatrix = heads.filter((h) => h.is_active && matrix[h.id]);
  const colTotals: Record<number, number> = {};
  let grandTotal = 0;
  for (const t of terms) {
    colTotals[t.id] = activeVHsInMatrix.reduce(
      (s, vh) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0),
      0
    );
    grandTotal += colTotals[t.id];
  }

  // Distribution Data for Analytics
  const distributionData = useMemo(() => {
    const map: Record<string, number> = {};
    activeVHsInMatrix.forEach((vh) => {
      const rowSum = terms.reduce((s, t) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
      const cat = vh.category || 'General';
      map[cat] = (map[cat] || 0) + rowSum;
    });
    return Object.entries(map).map(([cat, total]) => ({
      category: cat,
      total,
      pct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
    }));
  }, [activeVHsInMatrix, terms, matrix, grandTotal]);

  if (!mounted) {
    return (
      <div className="space-y-4 max-w-[1400px] mx-auto animate-pulse p-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="h-6 w-60 bg-slate-200 rounded"></div>
          <div className="h-8 w-48 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 h-20"></div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-96"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-10 max-w-[1400px] mx-auto text-slate-800">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════
          1. COMPACT EXECUTIVE COMMAND HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black text-lg shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Vote Heads &amp; Fee Matrix Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  🏫 {schoolDetails?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  {heads.filter((h) => h.is_active).length} Active Heads
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                  Auto-Allocation (FIFO)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Hierarchical vote head prioritization · MoE FDSE capitation offsets · Multi-term fee allocation matrix
              </p>
            </div>
          </div>

          {/* Right: Studio Shortcuts & Direct Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/fees"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <FiArrowLeft size={13} />
              <span>Fees Hub</span>
            </Link>

            <Link
              href="/dashboard/fees/payments"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>⚡ Payments</span>
            </Link>

            <Link
              href="/dashboard/fees/structure"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>🏗️ Structure</span>
            </Link>

            <Link
              href="/dashboard/fees/vote-heads/ledger"
              className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>📓 Vote Ledger</span>
            </Link>

            <button
              onClick={() => {
                fetchHeads();
                fetchFormsTerms();
              }}
              disabled={loadingHeads}
              title="Refresh Registry"
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <FiRefreshCw size={14} className={loadingHeads ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ STANDALONE ULTRA-PREMIUM WORKSPACE TAB BAR (MATCHING DASHBOARD/SETTINGS) ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 print:hidden">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap items-center">
            {[
              { id: 'heads', label: 'Vote Heads Registry', icon: '⚡', count: heads.length, badge: '' },
              {
                id: 'matrix',
                label: 'Matrix Studio (Form × Term)',
                icon: '📐',
                count: 0,
                badge: hasDirty ? 'Unsaved ⚠️' : 'Synced ✓',
                badgeBg: hasDirty ? 'bg-amber-100 text-amber-800 font-extrabold animate-pulse' : 'bg-emerald-100 text-emerald-800',
              },
              { id: 'analytics', label: 'Weights & Allocation', icon: '📊', count: 0, badge: 'Breakdown', badgeBg: 'bg-purple-100 text-purple-800' },
              { id: 'circular', label: 'MoE FDSE Circular', icon: '🏛️', count: 0, badge: 'Compliance', badgeBg: 'bg-sky-100 text-sky-800' },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold'
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-black min-w-[18px] text-center ${
                        active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                  {t.badge && !t.count && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        active ? 'bg-white/25 text-white' : t.badgeBg
                      }`}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Download official Microsoft Excel (.xlsx) workbook with registered school letterhead"
            >
              <FiDownload size={13} className="text-emerald-700" />
              <span>{isExportingExcel ? 'Exporting...' : 'Excel Workbook'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. EXECUTIVE FINANCIAL COMMAND HUD (6 Low-Profile Cards)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          {
            label: 'Total Vote Heads',
            value: heads.length,
            sub: `${heads.filter((h) => h.is_active).length} currently active`,
            color: 'text-indigo-700',
            bg: 'bg-indigo-50/70',
            border: 'border-indigo-100',
            icon: <FiLayers size={14} className="text-indigo-600" />,
          },
          {
            label: 'Active Allocations',
            value: heads.filter((h) => h.is_active).length,
            sub: `${heads.length > 0 ? ((heads.filter((h) => h.is_active).length / heads.length) * 100).toFixed(0) : 0}% billing coverage`,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50/70',
            border: 'border-emerald-100',
            icon: <FiCheckCircle size={14} className="text-emerald-600" />,
          },
          {
            label: 'Priority #1 Head',
            value: heads.length ? `#${Math.min(...heads.map((h) => h.priority))}` : '—',
            sub: heads.find((h) => h.priority === 1)?.name || 'Arrears First',
            color: 'text-rose-700',
            bg: 'bg-rose-50/70',
            border: 'border-rose-100',
            icon: <FiZap size={14} className="text-rose-600" />,
          },
          {
            label: 'Annual Matrix Total',
            value: fmtK(grandTotal),
            sub: `${forms.find((f) => f.id === Number(selForm))?.form_name || 'Selected Class'} (${selYear})`,
            color: 'text-amber-700',
            bg: 'bg-amber-50/70',
            border: 'border-amber-100',
            icon: <FiDollarSign size={14} className="text-amber-600" />,
          },
          {
            label: 'Target Classes',
            value: forms.length,
            sub: 'Secondary & CBC forms',
            color: 'text-purple-700',
            bg: 'bg-purple-50/70',
            border: 'border-purple-100',
            icon: <FiBookOpen size={14} className="text-purple-600" />,
          },
          {
            label: 'Subsidized Heads',
            value: heads.filter((h) => h.category === 'TUITION' || h.category === 'OPERATIONS' || h.category === 'R_M_I').length,
            sub: 'MoE FDSE Capitation eligible',
            color: 'text-sky-700',
            bg: 'bg-sky-50/70',
            border: 'border-sky-100',
            icon: <FiShield size={14} className="text-sky-600" />,
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

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: VOTE HEADS REGISTRY & HIERARCHY
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'heads' && (
        <div className="space-y-3.5 fade-in">
          {/* Side-to-Side Cockpit Directly on Top of Vote Heads List */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Left Side: Search + Category Pills + Status Filter */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search vote head name, code, category... (Ctrl+F)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/70 focus:bg-white outline-none transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status Toggle Pills */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 gap-0.5">
                  {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition ${
                        statusFilter === s
                          ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s === 'ALL' ? 'All' : s === 'ACTIVE' ? '✅ Active' : '⏸️ Inactive'}
                    </button>
                  ))}
                </div>

                {/* Category Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right Side: Sort Toggle + Add Vote Head Button */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => setSortBy((prev) => (prev === 'priority' ? 'name' : 'priority'))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Toggle sorting between priority and alphabetical"
                >
                  <FiSliders size={12} />
                  <span>Sort: {sortBy === 'priority' ? 'Priority (#)' : 'Name (A-Z)'}</span>
                </button>

                <button
                  onClick={openAdd}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FiPlus size={14} />
                  <span>Add Vote Head</span>
                </button>
              </div>
            </div>
          </div>

          {/* Explanatory Policy Tip */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-[11px] text-indigo-900 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span>
                <strong>Auto-Distribution Protocol:</strong> During rapid cashier fee intake, learner payments are
                automatically allocated to vote heads in ascending order of priority (<strong>Priority 1</strong> = Arrears
                cleared first, <strong>Priority 2</strong> = Tuition/BES, followed by Activity and Examinations).
              </span>
            </div>
            <button
              onClick={() => setActiveTab('matrix')}
              className="text-xs font-extrabold text-indigo-700 underline hover:text-indigo-900 shrink-0 cursor-pointer"
            >
              Configure Matrix Amounts →
            </button>
          </div>

          {/* Vote Heads List / Datagrid */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            {loadingHeads ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredHeads.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200 text-amber-600">
                  <FiZap size={24} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-800">No Vote Heads Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No fee categories matched your search criteria. Add vote heads like B.E.S, Tuition, M&amp;I, Activity, or
                  Examinations.
                </p>
                <button
                  onClick={openAdd}
                  className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FiPlus size={13} />
                  <span>Create Vote Head</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-2.5 px-3.5 text-center w-20">Priority</th>
                      <th className="py-2.5 px-3">Vote Head Details</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description &amp; Rules</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHeads.map((h) => {
                      const colorHex = h.color || '#4f46e5';
                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !h.is_active ? 'opacity-60 bg-slate-50/40' : ''
                          }`}
                        >
                          {/* Priority Badge */}
                          <td className="py-2.5 px-3.5 text-center">
                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs text-white shadow-2xs font-mono"
                              style={{
                                background: `linear-gradient(135deg, ${colorHex}, ${colorHex}cc)`,
                              }}
                              title={`Collection priority: ${h.priority}`}
                            >
                              #{h.priority}
                            </span>
                          </td>

                          {/* Vote Head Name & Code */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: colorHex }}
                              />
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">{h.name}</div>
                                <code className="text-[10px] font-bold text-slate-400 font-mono">{h.code}</code>
                              </div>
                            </div>
                          </td>

                          {/* Category Tag */}
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {(h.category || 'General').replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                            {h.description || 'Standard institutional vote head allocation'}
                          </td>

                          {/* Active Status Pill */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => toggleActive(h)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                h.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to toggle active status"
                            >
                              {h.is_active ? '✓ Active' : '⏸ Inactive'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEdit(h)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition shadow-2xs cursor-pointer"
                                title="Edit Vote Head"
                              >
                                <FiEdit2 size={12} />
                              </button>
                              <button
                                onClick={() => setDeleteId(h.id)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition shadow-2xs cursor-pointer"
                                title="Delete Vote Head"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: FEE MATRIX STUDIO (FORM × TERM SPREADSHEET)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'matrix' && (
        <div className="space-y-3.5 fade-in">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 flex-wrap">
              {/* Left Side: Form Selector & Academic Year */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Target Form:</label>
                  <select
                    value={selForm}
                    onChange={(e) => setSelForm(e.target.value === '' ? '' : Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="">— Select Form / Class —</option>
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.form_name} ({f.education_system || '8-4-4'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Year:</label>
                  <select
                    value={selYear}
                    onChange={(e) => setSelYear(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Assist Chips */}
                {selForm && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuickAdjust('round50')}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 transition cursor-pointer"
                      title="Round all positive figures to nearest KES 50"
                    >
                      Round 50
                    </button>
                    <button
                      onClick={() => handleQuickAdjust('add10pct')}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 transition cursor-pointer"
                      title="Adjust all values by +10%"
                    >
                      +10%
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side: Copy Structure, Print, & Save Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {selForm && (
                  <button
                    onClick={() => setShowCopyModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FiCopy size={13} />
                    <span>Copy From Form</span>
                  </button>
                )}

                {selForm && (
                  <button
                    onClick={printMatrix}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <FiPrinter size={13} />
                    <span>Print Schedule</span>
                  </button>
                )}

                {selForm && (
                  <button
                    onClick={saveMatrix}
                    disabled={!hasDirty || savingMatrix}
                    className={`px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
                      hasDirty
                        ? 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {savingMatrix ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <FiSave size={13} />
                        <span>Save All Changes</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Unsaved changes notice banner */}
          {hasDirty && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-800 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 font-medium">
                <FiAlertTriangle className="text-amber-600 shrink-0" size={15} />
                <span>
                  You have <strong>unsaved cell modifications</strong> in this fee matrix. Click <strong>Save All Changes</strong> to commit them to the live database.
                </span>
              </div>
              <button
                onClick={saveMatrix}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
              >
                Save Now
              </button>
            </div>
          )}

          {/* Matrix Table */}
          {!selForm ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200 text-amber-600">
                <FiGrid size={28} />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Select a Form to Edit Fee Matrix</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Choose a form or class from the dropdown above to load and edit amounts per vote head per academic term.
              </p>
            </div>
          ) : loadingMatrix ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeVHsInMatrix.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
              <p className="text-sm font-bold text-slate-700">No active vote heads found</p>
              <button
                onClick={() => setActiveTab('heads')}
                className="mt-2 text-xs font-bold text-indigo-600 underline"
              >
                Go to Vote Heads Registry to activate categories
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              {/* Matrix Header Banner */}
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                    Official Fee Schedule — {forms.find((f) => f.id === Number(selForm))?.form_name?.toUpperCase()} · {selYear}
                  </h3>
                  <p className="text-[10px] text-slate-400">Click any cell to edit · Press Enter or Tab to advance to next cell</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Annual Schedule</span>
                  <div className="text-sm font-extrabold font-mono text-emerald-400">{fmtKES(grandTotal)}</div>
                </div>
              </div>

              {/* Editable Matrix Spreadsheet Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-2.5 px-3.5 w-60">Vote Head Category</th>
                      <th className="py-2.5 px-2 text-center w-16">Priority</th>
                      {terms.map((t) => (
                        <th key={t.id} className="py-2.5 px-3 text-right min-w-[120px]">
                          {t.term_name} (KES)
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right">Annual Total</th>
                      <th className="py-2.5 px-2 w-10 text-center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeVHsInMatrix.map((vh, vIdx) => {
                      const rowTotal = terms.reduce((s, t) => s + (Number(matrix[vh.id]?.[t.id]?.amount) || 0), 0);
                      const rowHasDirty = terms.some((t) => matrix[vh.id]?.[t.id]?.dirty);
                      return (
                        <tr
                          key={vh.id}
                          className={`group hover:bg-amber-50/20 transition-colors ${
                            rowHasDirty ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          {/* Vote Head Label */}
                          <td className="py-2 px-3.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-7 rounded-full shrink-0"
                                style={{ backgroundColor: vh.color || '#4f46e5' }}
                              />
                              <div>
                                <div className="font-extrabold text-slate-900 text-xs">{vh.name}</div>
                                <code className="text-[10px] text-slate-400 font-mono">{vh.code}</code>
                              </div>
                              {rowHasDirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1" />
                              )}
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="py-2 px-2 text-center font-mono text-slate-500 font-bold text-[11px]">
                            #{vh.priority}
                          </td>

                          {/* Editable Cells Per Term */}
                          {terms.map((t, tIdx) => {
                            const cell = matrix[vh.id]?.[t.id];
                            if (!cell) {
                              return (
                                <td key={t.id} className="px-3 py-2 text-right text-slate-300">
                                  —
                                </td>
                              );
                            }
                            return (
                              <td key={t.id} className="px-2 py-1.5">
                                <input
                                  id={`matrix-cell-${vIdx}-${tIdx}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={cell.amount}
                                  placeholder="0"
                                  onChange={(e) => onCellChange(vh.id, t.id, e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                      e.preventDefault();
                                      const nextT = tIdx + 1 < terms.length ? tIdx + 1 : 0;
                                      const nextV = tIdx + 1 < terms.length ? vIdx : vIdx + 1;
                                      document.getElementById(`matrix-cell-${nextV}-${nextT}`)?.focus();
                                    }
                                  }}
                                  className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs font-mono font-extrabold border outline-none transition ${
                                    cell.dirty
                                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                                      : 'border-slate-200 bg-slate-50/70 text-slate-800 focus:border-indigo-500 focus:bg-white'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          {/* Row Total */}
                          <td className="py-2 px-3 text-right font-mono font-extrabold text-indigo-700 text-xs">
                            {rowTotal > 0 ? fmtKES(rowTotal) : '—'}
                          </td>

                          {/* Clear Row Button */}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => {
                                if (confirm(`Clear all term amounts for "${vh.name}" in this form?`)) {
                                  deleteRowFromMatrix(vh.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Clear row amounts"
                            >
                              <FiX size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Summary Totals Footer */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <td colSpan={2} className="py-3 px-3.5 uppercase tracking-wider text-[11px] text-slate-200">
                        Total Form Schedule
                      </td>
                      {terms.map((t) => (
                        <td key={t.id} className="py-3 px-3 text-right font-mono text-xs text-emerald-400 font-black">
                          {colTotals[t.id] > 0 ? fmtKES(colTotals[t.id]) : '—'}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400 font-black">
                        {grandTotal > 0 ? fmtKES(grandTotal) : '—'}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Commit Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  {hasDirty ? (
                    <strong className="text-amber-600 font-extrabold">⚠️ Unsaved changes pending commit</strong>
                  ) : (
                    <span>All matrix amounts are saved and synchronized with fee collections.</span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={printMatrix}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiPrinter size={12} />
                    <span>Print Schedule</span>
                  </button>

                  <button
                    onClick={saveMatrix}
                    disabled={!hasDirty || savingMatrix}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FiSave size={12} />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: WEIGHTS & ALLOCATION ANALYTICS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 fade-in">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Vote Head Weight &amp; Share Breakdown
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Relative financial contribution of each vote head category for{' '}
                  {forms.find((f) => f.id === Number(selForm))?.form_name || 'Selected Class'} ({selYear})
                </p>
              </div>
              <div className="text-xs font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                Total: {fmtKES(grandTotal)}
              </div>
            </div>

            {distributionData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No fee structure amounts entered for this form yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {distributionData.map((d) => (
                  <div
                    key={d.category}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 mb-1">
                      <span>{d.category.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-indigo-700">{d.pct.toFixed(1)}%</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden my-2">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, d.pct))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Invoiced Amount:</span>
                      <strong className="text-slate-800">{fmtKES(d.total)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: MOE FDSE CIRCULAR COMPLIANCE
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'circular' && (
        <div className="space-y-4 fade-in">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-black text-lg">
                🏛️
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Ministry of Education — FDSE Capitation Vote Head Reference
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Official Kenyan Ministry guidelines for Free Day Secondary Education (FDSE) capitation disbursements
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 uppercase text-[11px]">Tuition Account (KES 4,144)</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">100% Subsidized</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Reserved strictly for instructional materials, course textbooks, lab chemicals, stationery, internal exams, and curriculum guides.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 uppercase text-[11px]">Operations Account (KES 18,100)</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">Operations &amp; RMI</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Covers repairs &amp; maintenance (RMI), electricity &amp; water, non-teaching staff wages (PE), local transport &amp; travel, co-curricular activities, and contingency.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          COPY FROM FORM MODAL
      ══════════════════════════════════════════════════════════════ */}
      {showCopyModal && (
        <div
          onClick={() => setShowCopyModal(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200"
          >
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
              <FiCopy size={20} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 text-center">Copy Fee Structure</h3>
            <p className="text-xs text-slate-500 text-center mt-1 mb-4">
              Copy configured vote head amounts into{' '}
              <strong>{forms.find((f) => f.id === Number(selForm))?.form_name}</strong>.
            </p>

            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Source Form (Copy From):
              </label>
              <select
                value={copyFromForm}
                onChange={(e) => setCopyFromForm(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none cursor-pointer"
              >
                <option value="">— Select Source Form —</option>
                {forms
                  .filter((f) => f.id !== Number(selForm))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.form_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={copyFromOtherForm}
                disabled={!copyFromForm}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FiCopy size={13} />
                <span>Copy Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ADD / EDIT VOTE HEAD MODAL
      ══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden"
            style={{ maxHeight: '92vh' }}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <FiZap size={16} />
                  <span>{editId ? 'Edit Vote Head' : 'Add New Fee Vote Head'}</span>
                </h3>
                <p className="text-amber-100 text-[10.5px] mt-0.5">
                  {editId ? 'Modify collection priority and accounting classification' : 'Register a new institutional fee category'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <FiX size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Priority Stepper Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                  ⚡ Auto-Distribution Intake Priority
                </label>
                <p className="text-[10px] text-amber-600 mb-2.5">
                  Lower numbers are settled first by the cashier terminal: #1 = Arrears, #2 = Tuition/BES, #3 = Activity.
                </p>

                <div className="flex items-center gap-2.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setFormVH((f) => ({ ...f, priority: Math.max(1, f.priority - 1) }))}
                    className="w-9 h-9 rounded-xl bg-amber-600 text-white text-lg font-black flex items-center justify-center hover:bg-amber-700 cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={formVH.priority}
                    onChange={(e) =>
                      setFormVH((f) => ({ ...f, priority: Math.max(1, Number(e.target.value) || 1) }))
                    }
                    className="w-20 text-center text-xl font-black border border-amber-400 rounded-xl py-1.5 outline-none bg-white text-amber-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setFormVH((f) => ({ ...f, priority: f.priority + 1 }))}
                    className="w-9 h-9 rounded-xl bg-amber-600 text-white text-lg font-black flex items-center justify-center hover:bg-amber-700 cursor-pointer"
                  >
                    +
                  </button>
                  <div className="flex-1 text-[10px] text-amber-800 leading-tight">
                    <strong>#1</strong> = Arrears (First) · <strong>#2</strong> = BES/Tuition · <strong>#99</strong> = Optional
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: '1—Arrears', val: 1 },
                    { label: '2—BES', val: 2 },
                    { label: '3—Activity', val: 3 },
                    { label: '4—Exam', val: 4 },
                    { label: '99—Optional', val: 99 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setFormVH((f) => ({ ...f, priority: p.val }))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        formVH.priority === p.val
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Vote Head Name *
                  </label>
                  <input
                    value={formVH.name}
                    onChange={(e) => setFormVH((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. B.E.S, Tuition, Activity, R&M"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Code (Auto / Custom)
                  </label>
                  <input
                    value={formVH.code}
                    onChange={(e) =>
                      setFormVH((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                      }))
                    }
                    placeholder="e.g. BES, ACTIVITY"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Accounting Category */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Accounting Category
                </label>
                <select
                  value={formVH.category}
                  onChange={(e) => setFormVH((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Identity Colour (Used in Receipts &amp; Charts)
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormVH((f) => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer"
                      style={{
                        backgroundColor: c,
                        borderColor: formVH.color === c ? '#0f172a' : 'transparent',
                        transform: formVH.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Description / Allocation Notes (Optional)
                </label>
                <textarea
                  value={formVH.description || ''}
                  onChange={(e) => setFormVH((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="e.g. Mandatory board-approved tuition fee component"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">Active Status</div>
                  <div className="text-[10px] text-slate-400">
                    Inactive heads are hidden from fee matrix and cashier intake
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormVH((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    formVH.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      formVH.is_active ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={14} />
                    <span>{editId ? 'Update Vote Head' : 'Save Vote Head'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════ */}
      {deleteId && (
        <div
          onClick={() => setDeleteId(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 text-center space-y-3"
          >
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <FiTrash2 size={20} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete Vote Head?</h3>
            <p className="text-xs text-slate-500">
              The vote head definition will be removed from future billing. Existing historical financial ledger records
              will remain intact.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
