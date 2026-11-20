'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  LineElement, PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDownload, FiRefreshCw,
  FiPackage, FiAlertTriangle, FiCheckCircle, FiTool, FiMapPin,
  FiCalendar, FiBarChart2, FiFilter, FiChevronLeft, FiChevronRight,
  FiTag, FiPrinter, FiActivity, FiDollarSign, FiShield, FiAward,
  FiExternalLink, FiSliders, FiEye, FiArchive, FiCheck, FiLayers
} from 'react-icons/fi';
import { exportUltraAssetsExcel } from '@/components/assets/UltraAssetsExport';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & METRIC HELPERS
══════════════════════════════════════════════════════════════ */
const ASSET_CATEGORIES = [
  { name: 'Furniture & Fittings', emoji: '🪑', color: '#b45309', bg: '#fef3c7', depRate: 12.5, lifeYears: 8 },
  { name: 'ICT Equipment', emoji: '💻', color: '#1d4ed8', bg: '#eff6ff', depRate: 33.3, lifeYears: 3 },
  { name: 'Laboratory Equipment', emoji: '🔬', color: '#0891b2', bg: '#e0f2fe', depRate: 20.0, lifeYears: 5 },
  { name: 'Sports Equipment', emoji: '⚽', color: '#16a34a', bg: '#f0fdf4', depRate: 25.0, lifeYears: 4 },
  { name: 'Kitchen & Catering', emoji: '🍳', color: '#dc2626', bg: '#fef2f2', depRate: 15.0, lifeYears: 7 },
  { name: 'Library Books & Media', emoji: '📚', color: '#7c3aed', bg: '#f5f3ff', depRate: 10.0, lifeYears: 10 },
  { name: 'Vehicles & Transport', emoji: '🚌', color: '#0f766e', bg: '#f0fdfa', depRate: 25.0, lifeYears: 4 },
  { name: 'Musical Instruments', emoji: '🎸', color: '#ec4899', bg: '#fdf2f8', depRate: 15.0, lifeYears: 7 },
  { name: 'Classroom Equipment', emoji: '🖊️', color: '#6366f1', bg: '#eef2ff', depRate: 20.0, lifeYears: 5 },
  { name: 'Security Equipment', emoji: '🛡️', color: '#374151', bg: '#f3f4f6', depRate: 20.0, lifeYears: 5 },
  { name: 'Medical Equipment', emoji: '🏥', color: '#059669', bg: '#ecfdf5', depRate: 15.0, lifeYears: 7 },
  { name: 'Other Assets', emoji: '📦', color: '#6b7280', bg: '#f9fafb', depRate: 20.0, lifeYears: 5 },
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Condemned'];
const STATUSES = ['Active', 'In Service', 'Under Maintenance', 'Disposed', 'Lost/Stolen', 'Donated'];

const fmtKES = (n: any) => `KES ${Math.round(Number(n || 0)).toLocaleString('en-KE')}`;
const fmtKESM = (n: any) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(v).toLocaleString('en-KE')}`;
};
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const CONDITION_CFG: Record<string, { color: string; bg: string; bd: string }> = {
  Excellent: { color: '#16a34a', bg: '#f0fdf4', bd: '#bbf7d0' },
  Good: { color: '#2563eb', bg: '#eff6ff', bd: '#bfdbfe' },
  Fair: { color: '#d97706', bg: '#fffbeb', bd: '#fde68a' },
  Poor: { color: '#dc2626', bg: '#fef2f2', bd: '#fecaca' },
  Condemned: { color: '#374151', bg: '#f3f4f6', bd: '#e5e7eb' },
};

const STATUS_CFG: Record<string, { color: string; bg: string; bd: string }> = {
  Active: { color: '#16a34a', bg: '#f0fdf4', bd: '#bbf7d0' },
  'In Service': { color: '#0284c7', bg: '#f0f9ff', bd: '#bae6fd' },
  'Under Maintenance': { color: '#d97706', bg: '#fffbeb', bd: '#fde68a' },
  Disposed: { color: '#6b7280', bg: '#f3f4f6', bd: '#e5e7eb' },
  'Lost/Stolen': { color: '#dc2626', bg: '#fef2f2', bd: '#fecaca' },
  Donated: { color: '#7c3aed', bg: '#f5f3ff', bd: '#ddd6fe' },
};

/* ══════════════════════════════════════════════════════════════
   HIGH-RESOLUTION VECTOR SVG BARCODE GENERATOR
══════════════════════════════════════════════════════════════ */
function SvgBarcode({ code, width = 160, height = 36 }: { code: string; width?: number; height?: number }) {
  const chars = (code || 'AST-0001').toUpperCase();
  const bars: boolean[] = [true, false, true];
  for (let i = 0; i < chars.length; i++) {
    const c = chars.charCodeAt(i);
    for (let b = 0; b < 6; b++) {
      bars.push(((c >> b) & 1) === 1);
      bars.push(false);
    }
  }
  bars.push(true, false, true, true);

  const barWidth = width / bars.length;
  return (
    <svg width={width} height={height} className="overflow-hidden">
      {bars.map((isBlack, idx) =>
        isBlack ? (
          <rect
            key={idx}
            x={idx * barWidth}
            y={0}
            width={barWidth * 0.9}
            height={height}
            fill="#0f172a"
          />
        ) : null
      )}
    </svg>
  );
}

type ActiveTab = 'assets' | 'maintenance' | 'depreciation' | 'tags' | 'disposal' | 'board';

export default function UltraAssetManagerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('assets');
  const [assets, setAssets] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // School Identity
  const [schoolDetails, setSchoolDetails] = useState<any>({
    school_name: "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    school_motto: 'Excellence in Education',
    registration_number: '2566',
    postal_address: 'P.O. Box 112 Bomet',
    county: 'Bomet',
  });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagAsset, setTagAsset] = useState<any>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterCondition, setFilterCondition] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'cost' | 'bookValue' | 'depRate'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const pageSize = 10;

  // Forms
  const emptyForm = {
    asset_name: '',
    asset_code: '',
    category: 'Furniture & Fittings',
    description: '',
    location: '',
    assigned_to: '',
    serial_number: '',
    quantity: 1,
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    current_value: '',
    condition: 'Good',
    status: 'Active',
    warranty_expiry: '',
    supplier: '',
    depreciation_rate: 20,
    useful_life_years: 5,
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const emptyMaint = {
    asset_id: 0,
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_type: 'Routine',
    description: '',
    cost: '',
    technician: '',
    next_maintenance: '',
    status: 'Completed',
  };
  const [maintForm, setMaintForm] = useState(emptyMaint);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ══════════════════════════════════════════════════════════════
     DATABASE FETCH (Unified school_assets & school_assets_ultra)
  ══════════════════════════════════════════════════════════════ */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aR, uR, mR, dR] = await Promise.all([
        supabase.from('school_assets').select('*').order('id', { ascending: false }),
        supabase.from('school_assets_ultra').select('*').order('id', { ascending: false }),
        supabase.from('school_asset_maintenance').select('*').order('maintenance_date', { ascending: false }).limit(60),
        supabase.from('school_details').select('*').neq('section', 'primary').limit(1).maybeSingle(),
      ]);

      if (dR.data) setSchoolDetails(dR.data);

      const list1 = aR.data || [];
      const list2 = uR.data || [];

      // Deduplicate by code or name
      const map = new Map<string, any>();
      list1.forEach((a) => {
        const key = (a.asset_code || a.asset_name || `AST-${a.id}`).toLowerCase().trim();
        map.set(key, { ...a, sourceTable: 'school_assets' });
      });
      list2.forEach((a) => {
        const key = (a.asset_code || a.asset_name || `ULT-${a.id}`).toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { ...a, sourceTable: 'school_assets_ultra' });
        }
      });

      const unifiedAssets = Array.from(map.values()).map((a) => {
        const catCfg = ASSET_CATEGORIES.find((c) => c.name.toLowerCase() === (a.category || '').toLowerCase()) || ASSET_CATEGORIES[0];
        const cost = Number(a.purchase_price) || 0;
        const depRate = Number(a.depreciation_rate || catCfg.depRate || 20) / 100;
        const pDate = a.purchase_date ? new Date(a.purchase_date) : new Date();
        const yearsInService = Math.max(0, (Date.now() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        const bookValue = cost > 0 ? Math.max(0, cost * Math.pow(1 - depRate, yearsInService)) : Number(a.current_value) || 0;
        const accDep = Math.max(0, cost - bookValue);

        return {
          ...a,
          category: a.category || catCfg.name,
          quantity: Number(a.quantity) || 1,
          purchase_price: cost,
          current_value: Number(a.current_value) || Math.round(bookValue),
          book_value: Math.round(bookValue),
          accumulated_depreciation: Math.round(accDep),
          depreciation_rate: Number(a.depreciation_rate || catCfg.depRate),
          useful_life_years: Number(a.useful_life_years || catCfg.lifeYears),
          yearsInService: Number(yearsInService.toFixed(1)),
        };
      });

      setAssets(unifiedAssets);
      setMaintenance(mR.data || []);
    } catch (err: any) {
      console.error('Asset fetch exception:', err);
      toast.error('Failed to sync asset registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast.success('Asset registry synchronized with Live DB! ⚡');
  };

  /* ══════════════════════════════════════════════════════════════
     SAVE & UPDATE ASSET
  ══════════════════════════════════════════════════════════════ */
  const saveAsset = async () => {
    if (!form.asset_name.trim()) {
      toast.error('Please enter asset name');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        asset_name: form.asset_name.trim(),
        asset_code: form.asset_code.trim() || `AST-${Date.now().toString().slice(-4)}`,
        category: form.category,
        location: form.location,
        assigned_to: form.assigned_to,
        serial_number: form.serial_number,
        quantity: Number(form.quantity) || 1,
        purchase_date: form.purchase_date || null,
        purchase_price: Number(form.purchase_price) || 0,
        current_value: Number(form.current_value) || Number(form.purchase_price) || 0,
        condition: form.condition,
        status: form.status,
        warranty_expiry: form.warranty_expiry || null,
        supplier: form.supplier,
        depreciation_rate: Number(form.depreciation_rate) || 20,
        useful_life_years: Number(form.useful_life_years) || 5,
        notes: form.notes,
      };

      if (editId) {
        await Promise.all([
          supabase.from('school_assets').update(payload).eq('id', editId),
          supabase.from('school_assets_ultra').update(payload).eq('id', editId),
        ]);
        toast.success('Asset updated successfully! ✅');
      } else {
        const { error: err1 } = await supabase.from('school_assets').insert([payload]);
        if (err1) {
          await supabase.from('school_assets_ultra').insert([payload]);
        }
        toast.success('New capital asset registered! 📦');
      }

      setShowModal(false);
      setForm(emptyForm);
      setEditId(null);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     SAVE MAINTENANCE RECORD
  ══════════════════════════════════════════════════════════════ */
  const saveMaint = async () => {
    if (!maintForm.asset_id || !maintForm.description.trim()) {
      toast.error('Please select asset and enter description');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...maintForm,
        cost: Number(maintForm.cost) || 0,
      };
      const { error } = await supabase.from('school_asset_maintenance').insert([payload]);
      if (error) throw error;

      if (maintForm.status === 'Completed') {
        await supabase.from('school_assets').update({ status: 'Active', condition: 'Good' }).eq('id', maintForm.asset_id);
      }

      toast.success('Maintenance record logged! 🔧');
      setShowMaintModal(false);
      setMaintForm(emptyMaint);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record maintenance');
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════════════
     DELETE / CONDEMN ASSET
  ══════════════════════════════════════════════════════════════ */
  const deleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to remove this asset record from registry?')) return;
    try {
      await Promise.all([
        supabase.from('school_assets').delete().eq('id', id),
        supabase.from('school_assets_ultra').delete().eq('id', id),
      ]);
      toast.success('Asset record removed from live registry');
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete asset');
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await Promise.all([
        supabase.from('school_assets').update({ status }).eq('id', id),
        supabase.from('school_assets_ultra').update({ status }).eq('id', id),
      ]);
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(`Asset marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  /* ══════════════════════════════════════════════════════════════
     EXECUTIVE KPIS & CALCULATIONS
  ══════════════════════════════════════════════════════════════ */
  const totalPurchaseValue = useMemo(() => {
    return assets.reduce((s, a) => s + (Number(a.purchase_price) || 0) * (Number(a.quantity) || 1), 0);
  }, [assets]);

  const totalBookValue = useMemo(() => {
    return assets.reduce((s, a) => s + (Number(a.book_value) || 0) * (Number(a.quantity) || 1), 0);
  }, [assets]);

  const totalDepreciation = Math.max(0, totalPurchaseValue - totalBookValue);
  const totalUnits = assets.reduce((s, a) => s + (Number(a.quantity) || 1), 0);
  const activeCount = assets.filter((a) => (a.status || 'Active').toLowerCase() === 'active').length;
  const maintenanceCount = assets.filter((a) => (a.status || '').toLowerCase().includes('maintenance') || (a.condition || '').toLowerCase() === 'poor').length;
  const condemnedCount = assets.filter((a) => (a.status || '').toLowerCase() === 'disposed' || (a.condition || '').toLowerCase() === 'condemned').length;

  /* ══════════════════════════════════════════════════════════════
     CATEGORY VALUATION BREAKDOWN FOR CHARTS
  ══════════════════════════════════════════════════════════════ */
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; bookValue: number; color: string }>();
    ASSET_CATEGORIES.forEach((c) => {
      map.set(c.name, { count: 0, cost: 0, bookValue: 0, color: c.color });
    });

    assets.forEach((a) => {
      const cat = a.category || 'Other Assets';
      const existing = map.get(cat) || { count: 0, cost: 0, bookValue: 0, color: '#64748b' };
      existing.count += (Number(a.quantity) || 1);
      existing.cost += (Number(a.purchase_price) || 0) * (Number(a.quantity) || 1);
      existing.bookValue += (Number(a.book_value) || 0) * (Number(a.quantity) || 1);
      map.set(cat, existing);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.cost - a.cost);
  }, [assets]);

  /* ══════════════════════════════════════════════════════════════
     FILTERED, SORTED & PAGINATED DATA
  ══════════════════════════════════════════════════════════════ */
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchCat = filterCat === 'All' || a.category === filterCat;
      const matchCond = filterCondition === 'All' || a.condition === filterCondition;
      const matchStatus = filterStatus === 'All' || a.status === filterStatus;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (a.asset_name || '').toLowerCase().includes(q) ||
        (a.asset_code || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        (a.serial_number || '').toLowerCase().includes(q) ||
        (a.assigned_to || '').toLowerCase().includes(q);
      return matchCat && matchCond && matchStatus && matchSearch;
    });
  }, [assets, filterCat, filterCondition, filterStatus, search]);

  const sortedAssets = useMemo(() => {
    const list = [...filteredAssets];
    list.sort((a, b) => {
      let vA: any, vB: any;
      if (sortBy === 'name') {
        vA = a.asset_name?.toLowerCase() || '';
        vB = b.asset_name?.toLowerCase() || '';
      } else if (sortBy === 'code') {
        vA = a.asset_code?.toLowerCase() || '';
        vB = b.asset_code?.toLowerCase() || '';
      } else if (sortBy === 'cost') {
        vA = a.purchase_price || 0;
        vB = b.purchase_price || 0;
      } else if (sortBy === 'bookValue') {
        vA = a.book_value || 0;
        vB = b.book_value || 0;
      } else {
        vA = a.depreciation_rate || 0;
        vB = b.depreciation_rate || 0;
      }

      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredAssets, sortBy, sortAsc]);

  const paginatedAssets = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(sortedAssets.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: sortedAssets.slice(start, start + pageSize),
      totalPages,
      currentPage: safePage,
      totalCount: sortedAssets.length,
    };
  }, [sortedAssets, currentPage]);

  /* ══════════════════════════════════════════════════════════════
     EXCEL EXPORT HANDLER
  ══════════════════════════════════════════════════════════════ */
  const handleExportExcel = async () => {
    try {
      toast.loading('Compiling Enterprise Assets Workbook...', { id: 'assets-export' });
      await exportUltraAssetsExcel({
        schoolName: schoolDetails.school_name,
        schoolMotto: schoolDetails.school_motto,
        schoolRegNo: schoolDetails.registration_number || '2566',
        schoolPostal: schoolDetails.postal_address || 'P.O. Box 112 Bomet',
        academicYear: new Date().getFullYear(),
        assets: assets.map((a) => ({
          id: a.id,
          asset_name: a.asset_name,
          asset_code: a.asset_code,
          category: a.category,
          location: a.location,
          assigned_to: a.assigned_to,
          serial_number: a.serial_number,
          quantity: a.quantity,
          purchase_date: a.purchase_date,
          purchase_price: a.purchase_price,
          current_value: a.current_value,
          book_value: a.book_value,
          accumulated_depreciation: a.accumulated_depreciation,
          depreciation_rate: a.depreciation_rate,
          useful_life_years: a.useful_life_years,
          condition: a.condition,
          status: a.status,
          supplier: a.supplier,
          warranty_expiry: a.warranty_expiry,
          notes: a.notes,
        })),
        maintenance: maintenance.map((m) => {
          const matchA = assets.find((a) => a.id === m.asset_id);
          return {
            id: m.id,
            asset_name: matchA?.asset_name || 'School Asset',
            asset_code: matchA?.asset_code || `AST-${m.asset_id}`,
            maintenance_date: m.maintenance_date,
            maintenance_type: m.maintenance_type,
            description: m.description,
            cost: Number(m.cost) || 0,
            technician: m.technician,
            next_maintenance: m.next_maintenance,
            status: m.status,
          };
        }),
      });
      toast.success('Multi-Sheet Asset Register Downloaded! 📊', { id: 'assets-export' });
    } catch (err: any) {
      console.error('Asset export error:', err);
      toast.error('Export failed: ' + err.message, { id: 'assets-export' });
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 pb-12 overflow-x-hidden">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════
          TOP EXECUTIVE HEADER & SCHOOL BRANDING BADGE
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden w-full min-w-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-50/60 via-orange-50/20 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full min-w-0">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 via-orange-600 to-stone-800 flex items-center justify-center text-white shadow-md shrink-0">
              <FiPackage size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md truncate max-w-xs">
                  {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  MoE Reg: {schoolDetails.registration_number || '2566'}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> CAPITAL ASSET INTELLIGENCE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                <span>Ultra Institutional Asset Manager</span>
                <span className="text-xs font-black bg-gradient-to-r from-amber-600 to-orange-700 text-white px-2 py-0.5 rounded-md shadow-2xs">
                  SUPER PREMIUM
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                Automated MoE depreciation schedules, barcode tagging, routine servicing journals, and capital balance sheet valuations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <FiDownload size={13} /> Export 5-Sheet Excel
            </button>
            <button
              onClick={() => {
                setShowMaintModal(true);
                setMaintForm(emptyMaint);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all flex items-center gap-1.5"
            >
              <FiTool size={13} /> Log Maintenance
            </button>
            <button
              onClick={() => {
                setForm(emptyForm);
                setEditId(null);
                setShowModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <FiPlus size={13} /> Register Asset
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>

        {/* Category Wrap Filter Chips */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 w-full min-w-0 pb-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <FiSliders size={11} /> Category:
          </span>
          <button
            onClick={() => {
              setFilterCat('All');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterCat === 'All' ? 'bg-blue-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Categories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
              {assets.length}
            </span>
          </button>
          {ASSET_CATEGORIES.map((c) => {
            const count = assets.filter((a) => a.category === c.name).length;
            const isSel = filterCat === c.name;
            return (
              <button
                key={c.name}
                onClick={() => {
                  setFilterCat(isSel ? 'All' : c.name);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  isSel ? 'ring-2 border-amber-400 bg-amber-50 text-amber-900' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{c.emoji}</span>
                <span className="truncate max-w-[90px]">{c.name.split(' ')[0]}</span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-slate-100 text-slate-700">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LOW-PROFILE COMPACT EXECUTIVE ASSET HUD CARDS (8 CARDS)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 w-full min-w-0">
        {[
          {
            label: 'Total Acquisition',
            value: fmtKESM(totalPurchaseValue),
            sub: `${assets.length} Registered Items`,
            color: '#1e3a8a',
            bg: '#eff6ff',
            bd: '#bfdbfe',
            icon: <FiDollarSign className="text-blue-700" size={13} />,
          },
          {
            label: 'Net Book Value',
            value: fmtKESM(totalBookValue),
            sub: 'MoE Standard Depreciated',
            color: '#15803d',
            bg: '#f0fdf4',
            bd: '#bbf7d0',
            icon: <FiCheckCircle className="text-emerald-700" size={13} />,
          },
          {
            label: 'Total Units',
            value: String(totalUnits),
            sub: 'Physical Inventory',
            color: '#7c3aed',
            bg: '#faf5ff',
            bd: '#ddd6fe',
            icon: <FiPackage className="text-purple-700" size={13} />,
          },
          {
            label: 'Active In-Service',
            value: String(activeCount),
            sub: `${Math.round((activeCount / Math.max(1, assets.length)) * 100)}% Operational`,
            color: '#0369a1',
            bg: '#f0f9ff',
            bd: '#bae6fd',
            icon: <FiShield className="text-sky-700" size={13} />,
          },
          {
            label: 'Attention Due',
            value: String(maintenanceCount),
            sub: 'Poor Condition / Repair',
            color: maintenanceCount > 0 ? '#b91c1c' : '#15803d',
            bg: maintenanceCount > 0 ? '#fef2f2' : '#f0fdf4',
            bd: maintenanceCount > 0 ? '#fecaca' : '#bbf7d0',
            icon: <FiAlertTriangle className={maintenanceCount > 0 ? 'text-rose-700' : 'text-emerald-700'} size={13} />,
          },
          {
            label: 'Depreciation Reserve',
            value: fmtKESM(totalDepreciation),
            sub: 'Accumulated Amortization',
            color: '#d97706',
            bg: '#fffbeb',
            bd: '#fde68a',
            icon: <FiActivity className="text-amber-700" size={13} />,
          },
          {
            label: 'Service Records',
            value: String(maintenance.length),
            sub: 'Logged Inspections',
            color: '#4f46e5',
            bg: '#eef2ff',
            bd: '#c7d2fe',
            icon: <FiTool className="text-indigo-700" size={13} />,
          },
          {
            label: 'Disposed / Scrap',
            value: String(condemnedCount),
            sub: 'Condemned Units',
            color: '#475569',
            bg: '#f8fafc',
            bd: '#e2e8f0',
            icon: <FiArchive className="text-slate-700" size={13} />,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-2.5 border shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs min-w-0 overflow-hidden"
            style={{ borderColor: card.bd }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider truncate mr-1">
                {card.label}
              </span>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{ background: card.bg }}
              >
                {card.icon}
              </div>
            </div>
            <div className="mt-1 min-w-0">
              <p className="text-sm font-black font-mono tracking-tight truncate" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="text-[9px] text-slate-400 font-medium truncate mt-0.2">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STANDALONE ULTRA TAB BAR (Responsive Grid Layout, No Overflow)
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 w-full min-w-0">
        {[
          { id: 'assets', label: '📦 Master Register', badge: `${assets.length}` },
          { id: 'maintenance', label: '🔧 Service Log', badge: `${maintenance.length}` },
          { id: 'depreciation', label: '📉 Valuation & Dep', badge: 'MoE' },
          { id: 'tags', label: '🏷️ Barcode Tags', badge: 'Print' },
          { id: 'disposal', label: '🗑️ Disposals', badge: `${condemnedCount}` },
          { id: 'board', label: '📑 Certified Audit', badge: 'MoE' },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 truncate ${
                isActive ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{t.label}</span>
              {t.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                  isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: MASTER ASSET REGISTER DATAGRID
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'assets' && (
        <div className="space-y-3 w-full min-w-0">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search code, name, location, serial..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <select
                value={filterCondition}
                onChange={(e) => {
                  setFilterCondition(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-slate-600 outline-none"
              >
                <option value="All">All Conditions</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-semibold text-slate-600 outline-none"
              >
                <option value="All">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {/* Sorting Pills */}
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>Sort:</span>
                <button
                  onClick={() => {
                    if (sortBy === 'cost') setSortAsc(!sortAsc);
                    else { setSortBy('cost'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded border ${sortBy === 'cost' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  Cost {sortBy === 'cost' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  onClick={() => {
                    if (sortBy === 'bookValue') setSortAsc(!sortAsc);
                    else { setSortBy('bookValue'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded border ${sortBy === 'bookValue' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  Book Value {sortBy === 'bookValue' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 self-end sm:self-auto shrink-0">
              Showing {paginatedAssets.items.length} of {paginatedAssets.totalCount} items
            </div>
          </div>

          {/* Compact Master Datagrid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Asset Code</th>
                    <th className="py-2.5 px-3">Asset Name & Details</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Location / Custodian</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                    <th className="py-2.5 px-3 text-right">Net Book Value</th>
                    <th className="py-2.5 px-3 text-center">Condition</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {paginatedAssets.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="text-3xl mb-1">📦</div>
                        <p className="font-bold text-slate-700">No assets found matching current filters</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "Register Asset" to add capital equipment</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAssets.items.map((a) => {
                      const catCfg = ASSET_CATEGORIES.find((c) => c.name === a.category) || ASSET_CATEGORIES[0];
                      const condCfg = CONDITION_CFG[a.condition] || CONDITION_CFG.Good;
                      const statCfg = STATUS_CFG[a.status] || STATUS_CFG.Active;

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-700 text-[11px] whitespace-nowrap">
                            {a.asset_code || `AST-${String(a.id).padStart(4, '0')}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0">{catCfg.emoji}</span>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate max-w-[180px]">{a.asset_name}</p>
                                {a.serial_number && (
                                  <span className="text-[9px] text-slate-400 font-mono block">
                                    S/N: {a.serial_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className="text-[9.5px] font-bold px-2 py-0.5 rounded"
                              style={{ background: catCfg.bg, color: catCfg.color }}
                            >
                              {a.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-slate-700 font-semibold flex items-center gap-1">
                              <FiMapPin size={10} className="text-slate-400" /> {a.location || 'Main Store'}
                            </span>
                            {a.assigned_to && (
                              <span className="text-[9px] text-slate-400 block ml-3">
                                To: {a.assigned_to}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                            {a.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {fmtKES(a.purchase_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {fmtKES(a.book_value)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className="text-[9px] font-black px-2 py-0.5 rounded-full border"
                              style={{ background: condCfg.bg, color: condCfg.color, borderColor: condCfg.bd }}
                            >
                              {a.condition || 'Good'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <select
                              value={a.status || 'Active'}
                              onChange={(e) => updateStatus(a.id, e.target.value)}
                              className="text-[10px] font-bold border rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
                              style={{ background: statCfg.bg, color: statCfg.color, borderColor: statCfg.bd }}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setTagAsset(a);
                                  setShowTagModal(true);
                                }}
                                title="Print Barcode Tag"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                              >
                                <FiTag size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAsset(a);
                                  setMaintForm({ ...emptyMaint, asset_id: a.id });
                                  setShowMaintModal(true);
                                }}
                                title="Log Maintenance"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
                              >
                                <FiTool size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  setForm({
                                    asset_name: a.asset_name,
                                    asset_code: a.asset_code || '',
                                    category: a.category,
                                    description: a.description || '',
                                    location: a.location || '',
                                    assigned_to: a.assigned_to || '',
                                    serial_number: a.serial_number || '',
                                    quantity: a.quantity || 1,
                                    purchase_date: a.purchase_date || '',
                                    purchase_price: a.purchase_price || '',
                                    current_value: a.current_value || '',
                                    condition: a.condition || 'Good',
                                    status: a.status || 'Active',
                                    warranty_expiry: a.warranty_expiry || '',
                                    supplier: a.supplier || '',
                                    depreciation_rate: a.depreciation_rate || 20,
                                    useful_life_years: a.useful_life_years || 5,
                                    notes: a.notes || '',
                                  });
                                  setEditId(a.id);
                                  setShowModal(true);
                                }}
                                title="Edit Asset"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                              >
                                <FiEdit2 size={12} />
                              </button>
                              <button
                                onClick={() => deleteAsset(a.id)}
                                title="Delete"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination */}
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500 font-medium">
                Page {paginatedAssets.currentPage} of {paginatedAssets.totalPages} ({paginatedAssets.totalCount} items)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={paginatedAssets.currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <FiChevronLeft size={13} />
                </button>
                <button
                  disabled={paginatedAssets.currentPage >= paginatedAssets.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <FiChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: MAINTENANCE & SERVICE LOG
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'maintenance' && (
        <div className="space-y-3 w-full min-w-0">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">🔧</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-amber-950 uppercase tracking-wider truncate">
                  Preventative Maintenance & Repair Log
                </p>
                <p className="text-[10px] text-amber-700 truncate">
                  Track routine maintenance, calibration, technician costs, and scheduled inspection cycles for all school equipment.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMaintModal(true);
                setMaintForm(emptyMaint);
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
            >
              <FiPlus size={13} /> Log New Service
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date Serviced</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">Service Type</th>
                    <th className="py-2.5 px-3">Description of Work</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                    <th className="py-2.5 px-3">Technician / Vendor</th>
                    <th className="py-2.5 px-3">Next Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {maintenance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="text-3xl mb-1">🔧</div>
                        <p className="font-bold text-slate-700">No maintenance events recorded yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "Log New Service" to record inspections</p>
                      </td>
                    </tr>
                  ) : (
                    maintenance.map((m) => {
                      const matchA = assets.find((a) => a.id === m.asset_id);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {fmtDate(m.maintenance_date)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {matchA?.asset_name || `Asset #${m.asset_id}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                              {m.maintenance_type || 'Routine'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-[220px]">
                            {m.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {fmtKES(m.cost)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {m.technician || 'Internal Staff'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {fmtDate(m.next_maintenance)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              {m.status || 'Completed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: MOE DEPRECIATION ENGINE & VALUATION
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'depreciation' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Historical Cost</span>
              <p className="text-xl font-black font-mono text-slate-900 mt-1">{fmtKES(totalPurchaseValue)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Original purchase / acquisition investment</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Accumulated Depreciation</span>
              <p className="text-xl font-black font-mono text-rose-600 mt-1">{fmtKES(totalDepreciation)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Total write-down using MoE rates</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Net Book Value</span>
              <p className="text-xl font-black font-mono text-emerald-700 mt-1">{fmtKES(totalBookValue)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Carrying value for balance sheet</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                MoE Standard Depreciation Schedule ({assets.length} Assets)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Reducing Balance & Straight-Line Formula</span>
            </div>

            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Asset Code</th>
                    <th className="py-2.5 px-3">Asset Name</th>
                    <th className="py-2.5 px-3 text-right">Cost (KES)</th>
                    <th className="py-2.5 px-3 text-center">Annual Rate</th>
                    <th className="py-2.5 px-3 text-center">Useful Life</th>
                    <th className="py-2.5 px-3 text-center">Years in Service</th>
                    <th className="py-2.5 px-3 text-right">Acc. Depreciation</th>
                    <th className="py-2.5 px-3 text-right">Net Book Value</th>
                    <th className="py-2.5 px-3">Depreciation Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {assets.map((a) => {
                    const cost = a.purchase_price || 0;
                    const depPct = cost > 0 ? Math.min(100, Math.round((a.accumulated_depreciation / cost) * 100)) : 0;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">{a.asset_code}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">{a.asset_name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{fmtKES(cost)}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700 whitespace-nowrap">{a.depreciation_rate}%</td>
                        <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">{a.useful_life_years} yrs</td>
                        <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">{a.yearsInService} yrs</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">{fmtKES(a.accumulated_depreciation)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">{fmtKES(a.book_value)}</td>
                        <td className="py-2.5 px-3 w-40 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${depPct}%`,
                                  background: depPct >= 80 ? '#dc2626' : depPct >= 50 ? '#d97706' : '#16a34a',
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 w-8 text-right">{depPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: BARCODE & QR TAG GENERATOR STUDIO
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'tags' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">🏷️</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-sky-950 uppercase tracking-wider truncate">
                  Asset Tag & QR Label Generation Studio
                </p>
                <p className="text-[10px] text-sky-700 truncate">
                  Generate print-ready physical asset tags formatted with school registration barcodes, serials, and room locations.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 transition flex items-center gap-1.5 shrink-0"
            >
              <FiPrinter size={13} /> Print Tag Sheet
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full min-w-0">
            {assets.slice(0, 12).map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition min-w-0"
              >
                <div>
                  <div className="flex items-start justify-between border-b border-slate-100 pb-2 mb-2">
                    <div>
                      <p className="text-[9px] font-black uppercase text-blue-900 tracking-wider truncate max-w-[150px]">
                        {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                      </p>
                      <p className="text-[8px] text-slate-400">Reg: {schoolDetails.registration_number || '2566'}</p>
                    </div>
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                      {a.asset_code || `AST-${a.id}`}
                    </span>
                  </div>

                  <p className="text-xs font-black text-slate-800 truncate">{a.asset_name}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 mt-2">
                    <div>Location: <strong className="text-slate-700">{a.location || 'Store'}</strong></div>
                    <div>Category: <strong className="text-slate-700">{a.category.split(' ')[0]}</strong></div>
                    <div>Purchased: <strong className="text-slate-700">{a.purchase_date || '—'}</strong></div>
                    <div>Status: <strong className="text-emerald-700">{a.status || 'Active'}</strong></div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="overflow-hidden">
                    <SvgBarcode code={a.asset_code || `AST-${a.id}`} width={130} height={26} />
                  </div>
                  <button
                    onClick={() => {
                      setTagAsset(a);
                      setShowTagModal(true);
                    }}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 shrink-0 ml-2"
                  >
                    View Badge <FiEye size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 5: DISPOSALS & WRITE-OFFS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'disposal' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">🗑️</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-rose-950 uppercase tracking-wider truncate">
                  Condemned, Disposed & Written-Off Assets Register
                </p>
                <p className="text-[10px] text-rose-700 truncate">
                  Permanent institutional audit log of retired, scrapped, lost, or donated assets in accordance with MoE disposal procedures.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-lg shrink-0">
              {condemnedCount} Retired Assets
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Asset Code</th>
                    <th className="py-2.5 px-3">Asset Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Historical Cost</th>
                    <th className="py-2.5 px-3 text-center">Disposal Status</th>
                    <th className="py-2.5 px-3">Condition at Retirement</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {assets.filter((a) => a.status === 'Disposed' || a.status === 'Lost/Stolen' || a.condition === 'Condemned').length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="text-3xl mb-1">✨</div>
                        <p className="font-bold text-slate-700">No assets currently condemned or disposed</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">All registered capital equipment is active and accounted for</p>
                      </td>
                    </tr>
                  ) : (
                    assets
                      .filter((a) => a.status === 'Disposed' || a.status === 'Lost/Stolen' || a.condition === 'Condemned')
                      .map((a) => (
                        <tr key={a.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-600 whitespace-nowrap">{a.asset_code}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700 line-through whitespace-nowrap">{a.asset_name}</td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{a.category}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{fmtKES(a.purchase_price)}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{a.condition}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => updateStatus(a.id, 'Active')}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                            >
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 6: CERTIFIED BOARD ASSET AUDIT REPORT
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'board' && (
        <div className="space-y-4 w-full min-w-0 print-area">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 shadow-md w-full min-w-0" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
            <div className="text-center border-b-2 border-blue-900 pb-4 mb-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">
                {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
              </h2>
              <p className="text-xs text-slate-600 italic mt-0.5">
                "{schoolDetails.school_motto || 'Excellence in Education'}" • MoE Registration: {schoolDetails.registration_number || '2566'} • {schoolDetails.postal_address || 'P.O. Box 112 Bomet'}
              </p>
              <h3 className="text-base font-bold text-blue-900 uppercase mt-2 tracking-wide">
                ANNUAL CAPITAL ASSET INVENTORY & AUDIT REPORT
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Financial Year: {new Date().getFullYear()} — Generated on {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'sans-serif' }}>
                  Capital Valuation Summary
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Total Registered Items:</span><span className="font-bold">{assets.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Total Physical Units:</span><span className="font-bold">{totalUnits}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Total Historical Acquisition Cost:</span><span className="font-bold text-slate-900">{fmtKES(totalPurchaseValue)}</span></div>
                  <div className="flex justify-between pt-1 border-t"><span className="text-slate-700 font-bold">Current Net Book Value:</span><span className="font-bold text-emerald-700">{fmtKES(totalBookValue)}</span></div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'sans-serif' }}>
                  Operational Asset Health
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Active Operational Equipment:</span><span className="font-bold text-emerald-700">{activeCount}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">In Repair / Attention Due:</span><span className="font-bold text-amber-700">{maintenanceCount}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Condemned / Retired:</span><span className="font-bold text-rose-700">{condemnedCount}</span></div>
                  <div className="flex justify-between pt-1 border-t"><span className="text-slate-700 font-bold">Accumulated Depreciation:</span><span className="font-bold text-rose-700">{fmtKES(totalDepreciation)}</span></div>
                </div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2" style={{ fontFamily: 'sans-serif' }}>
              Master Asset Inventory Ledger
            </h4>
            <div className="w-full min-w-0 overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Code</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Asset Name</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Category</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Location</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center">Qty</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-right">Cost (KES)</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-right">Book Value (KES)</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id}>
                      <td className="border border-slate-300 px-3 py-1.5 font-mono">{a.asset_code}</td>
                      <td className="border border-slate-300 px-3 py-1.5 font-bold">{a.asset_name}</td>
                      <td className="border border-slate-300 px-3 py-1.5">{a.category}</td>
                      <td className="border border-slate-300 px-3 py-1.5">{a.location || '—'}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{a.quantity}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">{fmtKES(a.purchase_price)}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold text-emerald-700">{fmtKES(a.book_value)}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-200" style={{ fontFamily: 'sans-serif' }}>
              <span>Certified Accurate by Principal & Board of Governors</span>
              <span>Generated by APSIMS Ultra Asset Suite</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT ASSET
      ══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FiPackage className="text-amber-600" /> {editId ? 'Edit Asset Record' : 'Register Capital Asset'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Asset Name *</label>
                  <input
                    value={form.asset_name}
                    onChange={(e) => setForm((f) => ({ ...f, asset_name: e.target.value }))}
                    placeholder="e.g. Science Lab Compound Microscope Model X-40"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Asset Code</label>
                  <input
                    value={form.asset_code}
                    onChange={(e) => setForm((f) => ({ ...f, asset_code: e.target.value }))}
                    placeholder="e.g. LAB-001"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Location / Room</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Science Lab 2"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Custodian / Assigned To</label>
                  <input
                    value={form.assigned_to}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                    placeholder="e.g. HOD Science"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Serial Number</label>
                  <input
                    value={form.serial_number}
                    onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                    placeholder="e.g. SN-8829-441"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) || 1 }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Acquisition Cost (KES)</label>
                  <input
                    type="number"
                    value={form.purchase_price}
                    onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Supplier / Vendor</label>
                  <input
                    value={form.supplier}
                    onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                    placeholder="e.g. Science Equipment Ltd"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Additional Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="Warranty details, calibration notes..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={saveAsset}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs bg-blue-900 hover:bg-blue-800 disabled:opacity-60 transition shadow-2xs"
              >
                {saving ? 'Processing…' : editId ? 'Update Asset' : 'Save Capital Asset'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: LOG MAINTENANCE RECORD
      ══════════════════════════════════════════════════════════════ */}
      {showMaintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                <FiTool className="text-amber-700" /> Log Maintenance Record
              </h3>
              <button onClick={() => setShowMaintModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Asset *</label>
                <select
                  value={maintForm.asset_id}
                  onChange={(e) => setMaintForm((f) => ({ ...f, asset_id: Number(e.target.value) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value={0}>Select asset to service…</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_name} ({a.asset_code || `AST-${a.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Service Date</label>
                  <input
                    type="date"
                    value={maintForm.maintenance_date}
                    onChange={(e) => setMaintForm((f) => ({ ...f, maintenance_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Service Type</label>
                  <select
                    value={maintForm.maintenance_type}
                    onChange={(e) => setMaintForm((f) => ({ ...f, maintenance_type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {['Routine', 'Repair', 'Overhaul', 'Inspection', 'Calibration', 'Battery Replacement'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Work Description *</label>
                <textarea
                  value={maintForm.description}
                  onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Details of servicing performed, parts replaced, diagnostic findings..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Service Cost (KES)</label>
                  <input
                    type="number"
                    value={maintForm.cost}
                    onChange={(e) => setMaintForm((f) => ({ ...f, cost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Technician / Vendor</label>
                  <input
                    type="text"
                    value={maintForm.technician}
                    onChange={(e) => setMaintForm((f) => ({ ...f, technician: e.target.value }))}
                    placeholder="Name / Company"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Next Scheduled Inspection</label>
                <input
                  type="date"
                  value={maintForm.next_maintenance}
                  onChange={(e) => setMaintForm((f) => ({ ...f, next_maintenance: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={saveMaint}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs bg-amber-700 hover:bg-amber-800 disabled:opacity-60 transition shadow-2xs"
              >
                {saving ? 'Saving…' : 'Record Maintenance'}
              </button>
              <button
                onClick={() => setShowMaintModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: PRINT ASSET TAG BADGE
      ══════════════════════════════════════════════════════════════ */}
      {showTagModal && tagAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="border-2 border-dashed border-blue-800 rounded-xl p-4 bg-slate-50/50">
              <p className="text-[10px] font-black uppercase text-blue-900 tracking-wider">
                {schoolDetails.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
              </p>
              <p className="text-[8px] text-slate-500 italic">Official Capital Property • MoE Reg: {schoolDetails.registration_number || '2566'}</p>

              <div className="my-3 py-2.5 bg-white rounded-lg border border-slate-200 flex flex-col items-center">
                <span className="font-mono text-xl font-black text-slate-900 tracking-widest">
                  {tagAsset.asset_code || `AST-${tagAsset.id}`}
                </span>
                <div className="mt-1 overflow-hidden">
                  <SvgBarcode code={tagAsset.asset_code || `AST-${tagAsset.id}`} width={180} height={36} />
                </div>
              </div>

              <p className="text-xs font-black text-slate-800">{tagAsset.asset_name}</p>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between px-2">
                <span>Room: <strong className="text-slate-700">{tagAsset.location || 'Store'}</strong></span>
                <span>Date: <strong className="text-slate-700">{tagAsset.purchase_date || '—'}</strong></span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <FiPrinter size={13} /> Print Tag
              </button>
              <button
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
