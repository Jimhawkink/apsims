'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiBox, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
  FiDownload, FiAlertCircle, FiMinus, FiTruck, FiShoppingCart,
  FiCheckCircle, FiFilter, FiPrinter, FiArrowRight, FiClock,
  FiCheck, FiXCircle, FiList, FiShield, FiEye, FiSliders,
  FiMapPin, FiTag, FiPhone, FiLayers, FiDollarSign, FiActivity,
  FiChevronLeft, FiChevronRight, FiTrendingUp
} from 'react-icons/fi';
import { exportUltraStoresExcel } from '@/components/stores/UltraStoresExport';

/* ══════════════════════════════════════════════════════════════
   FORMATTERS & CATEGORY DEFINITIONS
══════════════════════════════════════════════════════════════ */
const fmtKES = (n: any) => `KES ${Math.round(Number(n || 0)).toLocaleString('en-KE')}`;
const fmtKESM = (n: any) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(v).toLocaleString('en-KE')}`;
};
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d: string) => (d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const CATEGORIES = [
  'Kitchen Provisions', 'Cleaning Supplies', 'Stationery', 'Laboratory',
  'Sports', 'Uniforms', 'Toiletries', 'Maintenance', 'Office',
  'First Aid', 'Electrical', 'Furniture', 'Fuel', 'Other',
];
const UNITS = ['Kgs', 'Litres', 'Pieces', 'Packets', 'Boxes', 'Reams', 'Rolls', 'Pairs', 'Sets', 'Dozens', 'Bags', 'Trays', 'Crates', 'Cartons', 'Bottles', 'Tins', 'Bundles'];
const DEPARTMENTS = ['Principal Office', 'Deputy Principal Office', 'Boarding', 'Kitchen', 'Library', 'Laboratory', 'Sports', 'Accounts', 'Security', 'Grounds', 'Medical', 'Administration'];
const ISSUE_TO_TYPES = ['Staff', 'Student', 'Kitchen', 'Office', 'Department', 'Visitor', 'Other'];
const CAT_PREFIX: Record<string, string> = {
  'Kitchen Provisions': 'KIT', 'Cleaning Supplies': 'CLN', 'Stationery': 'STA',
  'Laboratory': 'LAB', 'Sports': 'SPT', 'Uniforms': 'UNF', 'Toiletries': 'TOI',
  'Maintenance': 'MNT', 'Office': 'OFF', 'First Aid': 'FAD', 'Electrical': 'ELC',
  'Furniture': 'FUR', 'Fuel': 'FUL', 'Other': 'OTH',
};

const genItemCode = (category: string, existingItems: any[]) => {
  const pfx = CAT_PREFIX[category] || 'STR';
  const count = existingItems.filter((i) => (i.item_code || '').startsWith(pfx)).length + 1;
  return `${pfx}-${String(count).padStart(5, '0')}`;
};

/* ══════════════════════════════════════════════════════════════
   HIGH-RESOLUTION VECTOR SVG BARCODE GENERATOR
══════════════════════════════════════════════════════════════ */
function SvgBarcode({ code, width = 120, height = 24 }: { code: string; width?: number; height?: number }) {
  const chars = (code || 'STR-00001').toUpperCase();
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

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; color: string; border: string; icon: any }> = {
    Pending: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: <FiClock size={10} /> },
    Verified: { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', icon: <FiEye size={10} /> },
    Approved: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', icon: <FiCheckCircle size={10} /> },
    Rejected: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: <FiXCircle size={10} /> },
    Issued: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', icon: <FiBox size={10} /> },
    Cancelled: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', icon: <FiX size={10} /> },
    Authorized: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', icon: <FiCheck size={10} /> },
    Received: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', icon: <FiTruck size={10} /> },
    Variance: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: <FiAlertCircle size={10} /> },
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', icon: null };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {s.icon} {status}
    </span>
  );
};

export type StoresTab = 'inventory' | 'kitchen' | 'issue' | 'approvals' | 'grn' | 'low' | 'audit' | 'board';

export default function UltraStoresPage() {
  const [tab, setTab] = useState<StoresTab>('inventory');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [issuances, setIssuances] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [procInvoices, setProcInvoices] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>({
    school_name: "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    school_motto: 'Excellence in Education',
    registration_number: '2566',
    postal_address: 'P.O. Box 112 Bomet',
    county: 'Bomet',
  });

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [issueStatusFilter, setIssueStatusFilter] = useState('All');
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [userPerms, setUserPerms] = useState<Record<string, boolean>>({});

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'qty' | 'value'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    const stored = localStorage.getItem('school_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUserRole(u.role?.toLowerCase() || 'admin');
        setUserPerms(u.permissions || {});
      } catch {}
    }
  }, []);

  const isSuperAdmin = ['super-admin', 'superadmin', 'super_admin', 'admin', 'principal'].includes(userRole);
  const canAddItem = isSuperAdmin || userPerms['stores_add_item'];
  const canReceiveStock = isSuperAdmin || userPerms['stores_receive_stock'];
  const canViewAudit = isSuperAdmin || userPerms['stores_audit'];

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState<any>(null);
  const [showGRNAuthModal, setShowGRNAuthModal] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);

  // Forms
  const emptyItem = {
    item_name: '',
    item_code: '',
    category: 'Kitchen Provisions',
    unit: 'Kgs',
    quantity: 0,
    reorder_level: 10,
    unit_price: 0,
    location: '',
    supplier_id: '',
    supplier: '',
    notes: '',
    is_kitchen: false,
  };
  const emptyIssue = {
    item_id: 0,
    issued_to: '',
    issued_to_type: 'Kitchen',
    department: 'Kitchen',
    quantity: 1,
    purpose: '',
    notes: '',
    requested_by: '',
  };
  const emptyGRN = {
    item_id: 0,
    quantity: 0,
    supplier_id: '',
    invoice_ref: '',
    proc_invoice_id: '',
    unit_cost: 0,
    notes: '',
    received_by: 'Store Keeper',
    grn_number: '',
    delivery_date: new Date().toISOString().split('T')[0],
  };

  const [itemForm, setItemForm] = useState(emptyItem);
  const [issueForm, setIssueForm] = useState(emptyIssue);
  const [grnForm, setGrnForm] = useState(emptyGRN);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [grnAuthBy, setGrnAuthBy] = useState('');
  const [grnAuthRole, setGrnAuthRole] = useState('Principal');
  const [grnAuthNotes, setGrnAuthNotes] = useState('');

  /* ══════════════════════════════════════════════════════════════
     FETCH ALL DATABASE TABLES
  ══════════════════════════════════════════════════════════════ */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, isRes, gRes, supRes, invRes, scRes, auditRes] = await Promise.all([
        supabase.from('school_store_items').select('*').order('item_name'),
        supabase.from('school_store_issuances').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('school_store_purchases').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('school_suppliers').select('id,supplier_name,phone,category,status').order('supplier_name'),
        supabase.from('school_supplier_invoices').select('id,invoice_number,supplier_id,total_amount,balance,status,due_date').order('created_at', { ascending: false }),
        supabase.from('school_details').select('*').neq('section', 'primary').limit(1).maybeSingle(),
        supabase.from('school_store_audit_log').select('*').order('created_at', { ascending: false }).limit(300),
      ]);

      setItems(iRes.data || []);
      setIssuances(isRes.data || []);
      setGrns(gRes.data || []);
      setSuppliers(supRes.data || []);
      setProcInvoices(invRes.data || []);
      if (scRes.data) setSchoolInfo(scRes.data);
      setAuditLogs(auditRes.data || []);
    } catch (err: any) {
      console.error('Failed to sync stores database:', err);
      toast.error('Store database sync failed');
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
    toast.success('Stores inventory synchronized with Live DB! ⚡');
  };

  /* ══════════════════════════════════════════════════════════════
     DERIVED STATS & KPIS
  ══════════════════════════════════════════════════════════════ */
  const kitchenItems = useMemo(() => items.filter((i) => i.category === 'Kitchen Provisions' || i.is_kitchen), [items]);
  const lowStockItems = useMemo(() => items.filter((i) => i.quantity <= (i.reorder_level || 5)), [items]);
  const totalValue = useMemo(() => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0), [items]);
  const kitchenValue = useMemo(() => kitchenItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0), [kitchenItems]);
  const pendingIssuances = useMemo(() => issuances.filter((i) => i.status === 'Pending' || i.status === 'Verified'), [issuances]);
  const pendingGRNs = useMemo(() => grns.filter((g) => g.status === 'Pending'), [grns]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.status === 'Active' || !s.status), [suppliers]);

  /* ══════════════════════════════════════════════════════════════
     LOW STOCK WHATSAPP ALERT DISPATCH
  ══════════════════════════════════════════════════════════════ */
  const sendLowStockAlert = async () => {
    if (lowStockItems.length === 0) {
      toast('✅ All stock levels are healthy — nothing to alert!');
      return;
    }
    const lines = lowStockItems
      .slice(0, 10)
      .map((i: any) => `• ${i.item_name}: ${i.quantity} ${i.unit || 'units'} (min buffer: ${i.reorder_level || 5})`)
      .join('\n');
    const msg = `🚨 LOW STOCK ALERT — ${schoolInfo.school_name || 'AlphaSchool'}\n\n${lines}${
      lowStockItems.length > 10 ? `\n...and ${lowStockItems.length - 10} more items` : ''
    }\n\nPlease arrange urgent replenishment.\nGenerated: ${new Date().toLocaleString('en-KE')}`;

    await supabase.from('school_store_audit_log').insert([
      {
        action_type: 'LOW_STOCK_ALERT',
        record_ref: 'System',
        description: `Low stock alert generated for ${lowStockItems.length} items`,
        actor: 'Store Keeper',
        actor_role: 'Stores System',
      },
    ]);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success(`📱 WhatsApp dispatch opened — ${lowStockItems.length} low-stock items queued!`);
  };

  /* ══════════════════════════════════════════════════════════════
     FILTERED & SORTED DATA
  ══════════════════════════════════════════════════════════════ */
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (tab === 'kitchen' && i.category !== 'Kitchen Provisions' && !i.is_kitchen) return false;
      if (filterCat !== 'All' && i.category !== filterCat) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (i.item_name || '').toLowerCase().includes(q) ||
          (i.item_code || '').toLowerCase().includes(q) ||
          (i.location || '').toLowerCase().includes(q) ||
          (i.supplier || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, tab, filterCat, search]);

  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let vA: any, vB: any;
      if (sortBy === 'name') {
        vA = a.item_name?.toLowerCase() || '';
        vB = b.item_name?.toLowerCase() || '';
      } else if (sortBy === 'code') {
        vA = a.item_code?.toLowerCase() || '';
        vB = b.item_code?.toLowerCase() || '';
      } else if (sortBy === 'qty') {
        vA = a.quantity || 0;
        vB = b.quantity || 0;
      } else {
        vA = (a.quantity || 0) * (a.unit_price || 0);
        vB = (b.quantity || 0) * (b.unit_price || 0);
      }

      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredItems, sortBy, sortAsc]);

  const paginatedItems = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      items: sortedItems.slice(start, start + pageSize),
      totalPages,
      currentPage: safePage,
      totalCount: sortedItems.length,
    };
  }, [sortedItems, currentPage]);

  const filteredIssuances = useMemo(() => {
    return issuances.filter((i) => {
      if (issueStatusFilter !== 'All' && i.status !== issueStatusFilter) return false;
      return true;
    });
  }, [issuances, issueStatusFilter]);

  /* ══════════════════════════════════════════════════════════════
     AUDIT LOG HELPER
  ══════════════════════════════════════════════════════════════ */
  const logAudit = async (actionType: string, recordRef: string, description: string, actor: string, actorRole = 'Store Keeper') => {
    await supabase.from('school_store_audit_log').insert([{ action_type: actionType, record_ref: recordRef, description, actor, actor_role: actorRole }]);
  };

  /* ══════════════════════════════════════════════════════════════
     SAVE / UPDATE ITEM
  ══════════════════════════════════════════════════════════════ */
  const saveItem = async () => {
    if (!itemForm.item_name.trim()) {
      toast.error('Item name is required');
      return;
    }
    setSaving(true);
    const sup = suppliers.find((s) => String(s.id) === String(itemForm.supplier_id));
    const payload = {
      ...itemForm,
      supplier: sup?.supplier_name || itemForm.supplier || '',
      is_kitchen: itemForm.category === 'Kitchen Provisions' || itemForm.is_kitchen,
    };
    const { error } = editing
      ? await supabase.from('school_store_items').update(payload).eq('id', editing.id)
      : await supabase.from('school_store_items').insert([payload]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    await logAudit(
      editing ? 'ITEM_UPDATED' : 'ITEM_ADDED',
      payload.item_code || payload.item_name,
      `${editing ? 'Updated' : 'Added'} store item: ${payload.item_name}`,
      'Store Keeper'
    );
    toast.success(editing ? '✅ Item updated in store catalog!' : '✅ New item added to inventory!');
    setShowItemModal(false);
    setEditing(null);
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     REQUEST ISSUANCE (STORE KEEPER -> BURSAR -> PRINCIPAL)
  ══════════════════════════════════════════════════════════════ */
  const submitIssuanceRequest = async () => {
    if (!issueForm.item_id || !issueForm.issued_to.trim() || issueForm.quantity < 1) {
      toast.error('Fill all required fields');
      return;
    }
    if (!issueForm.requested_by.trim()) {
      toast.error('Enter your name (Requested By)');
      return;
    }
    const item = items.find((i) => i.id === issueForm.item_id);
    if (!item) {
      toast.error('Select a valid item');
      return;
    }
    if (item.quantity < issueForm.quantity) {
      toast.error(`⚠️ Insufficient stock. Available on hand: ${item.quantity} ${item.unit}`);
      return;
    }
    setSaving(true);
    const issYear = new Date().getFullYear();
    const issNum = `ISS-${issYear}-${String(issuances.length + 1).padStart(5, '0')}`;
    const totalVal = issueForm.quantity * (item.unit_price || 0);

    const { error } = await supabase.from('school_store_issuances').insert([
      {
        issuance_number: issNum,
        item_id: issueForm.item_id,
        item_name: item.item_name,
        item_code: item.item_code || null,
        quantity: issueForm.quantity,
        unit: item.unit,
        unit_price: item.unit_price || 0,
        total_value: totalVal,
        issued_to: issueForm.issued_to,
        issued_to_type: issueForm.issued_to_type,
        department: issueForm.department || null,
        purpose: issueForm.purpose || null,
        notes: issueForm.notes || null,
        requested_by: issueForm.requested_by,
        status: 'Pending',
        approval_required_from: 'Bursar',
        academic_year: issYear,
      },
    ]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const { data: newIss } = await supabase.from('school_store_issuances').select('id').eq('issuance_number', issNum).maybeSingle();
    if (newIss) {
      await supabase.from('school_store_issuance_approvals').insert([
        {
          issuance_id: newIss.id,
          action: 'Requested',
          action_by: issueForm.requested_by,
          action_by_role: 'Store Keeper',
          notes: `Request for ${issueForm.quantity} ${item.unit} of ${item.item_name}`,
        },
      ]);
    }
    await logAudit(
      'ISSUANCE_REQUESTED',
      issNum,
      `Issuance requested: ${issueForm.quantity} ${item.unit} of ${item.item_name} to ${issueForm.issued_to}`,
      issueForm.requested_by,
      'Store Keeper'
    );
    toast.success(`✅ Issuance request ${issNum} submitted — awaiting Bursar verification`);
    setShowIssueModal(false);
    setIssueForm(emptyIssue);
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     VERIFY ISSUANCE (BURSAR)
  ══════════════════════════════════════════════════════════════ */
  const verifyIssuance = async (iss: any) => {
    if (!confirm('Verify this issuance? It will be forwarded to the Principal for approval.')) return;
    const verifiedBy = prompt('Enter your name (Bursar):');
    if (!verifiedBy) return;
    setSaving(true);
    const { error } = await supabase
      .from('school_store_issuances')
      .update({
        status: 'Verified',
        approval_required_from: 'Principal',
        updated_at: new Date().toISOString(),
      })
      .eq('id', iss.id);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    await supabase.from('school_store_issuance_approvals').insert([
      { issuance_id: iss.id, action: 'Verified', action_by: verifiedBy, action_by_role: 'Bursar', notes: 'Verified by Bursar' },
    ]);
    await logAudit('ISSUANCE_VERIFIED', iss.issuance_number, `Issuance VERIFIED by ${verifiedBy}. Item: ${iss.item_name}`, verifiedBy, 'Bursar');
    toast.success(`✅ Issuance ${iss.issuance_number} VERIFIED — awaiting Principal approval`);
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     APPROVE ISSUANCE (PRINCIPAL)
  ══════════════════════════════════════════════════════════════ */
  const approveIssuance = async () => {
    if (!approvedBy.trim()) {
      toast.error('Enter approver name');
      return;
    }
    const iss = showApproveModal;
    setSaving(true);
    const { error } = await supabase
      .from('school_store_issuances')
      .update({
        status: 'Approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', iss.id);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    await supabase.from('school_store_issuance_approvals').insert([
      { issuance_id: iss.id, action: 'Approved', action_by: approvedBy, action_by_role: 'Principal', notes: approveNotes || null },
    ]);
    await logAudit(
      'ISSUANCE_APPROVED',
      iss.issuance_number,
      `Issuance APPROVED by ${approvedBy}. Item: ${iss.item_name}, Qty: ${iss.quantity}`,
      approvedBy,
      'Principal'
    );
    toast.success(`✅ Issuance ${iss.issuance_number} APPROVED — Store Keeper can now issue`);
    setShowApproveModal(null);
    setApprovedBy('');
    setApproveNotes('');
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     REJECT ISSUANCE
  ══════════════════════════════════════════════════════════════ */
  const rejectIssuance = async () => {
    if (!rejectReason.trim()) {
      toast.error('Enter rejection reason');
      return;
    }
    if (!approvedBy.trim()) {
      toast.error('Enter your name');
      return;
    }
    const iss = showRejectModal;
    setSaving(true);
    const { error } = await supabase
      .from('school_store_issuances')
      .update({
        status: 'Rejected',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', iss.id);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    await supabase.from('school_store_issuance_approvals').insert([
      { issuance_id: iss.id, action: 'Rejected', action_by: approvedBy, action_by_role: 'Principal', notes: rejectReason },
    ]);
    await logAudit('ISSUANCE_REJECTED', iss.issuance_number, `Issuance REJECTED by ${approvedBy}. Reason: ${rejectReason}`, approvedBy, 'Principal');
    toast.success(`Issuance ${iss.issuance_number} rejected`);
    setShowRejectModal(null);
    setRejectReason('');
    setApprovedBy('');
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     CONFIRM ISSUE & DEDUCT STOCK (STORE KEEPER)
  ══════════════════════════════════════════════════════════════ */
  const confirmIssue = async (iss: any) => {
    if (iss.status !== 'Approved') {
      toast.error('Issuance must be Approved first by Principal');
      return;
    }
    const item = items.find((i) => i.id === iss.item_id);
    if (!item || item.quantity < iss.quantity) {
      toast.error(`⚠️ Insufficient stock. Current available: ${item?.quantity || 0}`);
      return;
    }
    if (!confirm(`Confirm issuing ${iss.quantity} ${iss.unit || item.unit} of ${iss.item_name} to ${iss.issued_to}?\n\nThis will deduct stock immediately.`)) return;

    setSaving(true);
    const issuedBy = prompt('Enter your name (Store Keeper):');
    if (!issuedBy) {
      setSaving(false);
      return;
    }
    await supabase
      .from('school_store_issuances')
      .update({ status: 'Issued', issued_by: issuedBy, issued_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', iss.id);
    await supabase
      .from('school_store_items')
      .update({ quantity: item.quantity - iss.quantity, total_issued: (item.total_issued || 0) + iss.quantity })
      .eq('id', item.id);
    await supabase.from('school_store_issuance_approvals').insert([
      { issuance_id: iss.id, action: 'Issued', action_by: issuedBy, action_by_role: 'Store Keeper', notes: `Issued ${iss.quantity} ${iss.unit} to ${iss.issued_to}` },
    ]);
    await logAudit(
      'ISSUANCE_COMPLETED',
      iss.issuance_number,
      `Stock ISSUED: ${iss.quantity} ${iss.unit || item.unit} of ${iss.item_name} to ${iss.issued_to} by ${issuedBy}`,
      issuedBy,
      'Store Keeper'
    );
    toast.success(`✅ ${iss.quantity} ${iss.unit || item.unit} of ${iss.item_name} issued to ${iss.issued_to}`);
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     RECORD GOODS RECEIVED NOTE (GRN)
  ══════════════════════════════════════════════════════════════ */
  const receiveStock = async () => {
    if (!grnForm.item_id || grnForm.quantity <= 0) {
      toast.error('Select item and enter quantity received');
      return;
    }
    if (!grnForm.received_by.trim()) {
      toast.error('Enter store keeper name');
      return;
    }
    const item = items.find((i) => i.id === grnForm.item_id);
    if (!item) return;

    if (grnForm.invoice_ref.trim()) {
      const { data: existing } = await supabase.from('school_store_purchases').select('id').eq('invoice_ref', grnForm.invoice_ref.trim()).maybeSingle();
      if (existing) {
        toast.error(`⚠️ Invoice ${grnForm.invoice_ref} already recorded!`);
        return;
      }
    }
    setSaving(true);
    const sup = suppliers.find((s) => String(s.id) === String(grnForm.supplier_id));
    const procInv = procInvoices.find((i) => String(i.id) === String(grnForm.proc_invoice_id));
    const unitCost = Number(grnForm.unit_cost) || Number(item.unit_price) || 0;
    const qty = Number(grnForm.quantity);
    const totalCost = qty * unitCost;
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}`;

    const { error } = await supabase.from('school_store_purchases').insert([
      {
        item_id: grnForm.item_id,
        item_name: item.item_name,
        item_code: item.item_code || null,
        quantity: qty,
        unit: item.unit,
        supplier_id: grnForm.supplier_id || null,
        supplier: sup?.supplier_name || '',
        invoice_ref: grnForm.invoice_ref || procInv?.invoice_number || null,
        unit_cost: unitCost,
        total_cost: totalCost,
        grn_number: grnNumber,
        delivery_date: grnForm.delivery_date,
        received_by: grnForm.received_by,
        notes: grnForm.notes || null,
        status: 'Authorized',
        authorized_by: grnForm.received_by,
        authorized_by_role: 'Store Keeper',
        authorized_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const newQty = (Number(item.quantity) || 0) + qty;
    const updatePayload: any = { quantity: newQty };
    if (unitCost > 0) updatePayload.unit_price = unitCost;
    await supabase.from('school_store_items').update(updatePayload).eq('id', item.id);

    await logAudit(
      'GRN_RECEIVED',
      grnNumber,
      `Stock received: ${qty} ${item.unit} of ${item.item_name} from ${sup?.supplier_name || 'supplier'}. New qty: ${newQty}`,
      grnForm.received_by,
      'Store Keeper'
    );
    toast.success(`✅ GRN ${grnNumber} recorded — ${qty} ${item.unit} added to stock! Balance: ${newQty} ${item.unit}`);
    setShowGRNModal(false);
    setGrnForm(emptyGRN);
    setSaving(false);
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     DELETE ITEM
  ══════════════════════════════════════════════════════════════ */
  const deleteItem = async (id: number) => {
    if (!confirm('Delete this store item? This cannot be undone.')) return;
    await supabase.from('school_store_items').delete().eq('id', id);
    toast.success('Item deleted from stores');
    fetchAll();
  };

  /* ══════════════════════════════════════════════════════════════
     EXCEL EXPORT WORKBOOK
  ══════════════════════════════════════════════════════════════ */
  const handleExportExcel = async () => {
    try {
      toast.loading('Compiling Enterprise Stores & Kitchen Workbook...', { id: 'stores-export' });
      await exportUltraStoresExcel({
        schoolName: schoolInfo.school_name,
        schoolMotto: schoolInfo.school_motto,
        schoolRegNo: schoolInfo.registration_number || '2566',
        schoolPostal: schoolInfo.postal_address || 'P.O. Box 112 Bomet',
        academicYear: new Date().getFullYear(),
        items: items.map((i) => ({
          id: i.id,
          item_code: i.item_code || `STR-${i.id}`,
          item_name: i.item_name,
          category: i.category,
          unit: i.unit,
          quantity: i.quantity,
          reorder_level: i.reorder_level,
          unit_price: i.unit_price,
          stock_value: (i.quantity || 0) * (i.unit_price || 0),
          location: i.location,
          supplier: i.supplier,
          is_kitchen: i.is_kitchen,
        })),
        kitchenItems: kitchenItems.map((i) => ({
          id: i.id,
          item_code: i.item_code || `KIT-${i.id}`,
          item_name: i.item_name,
          category: i.category,
          unit: i.unit,
          quantity: i.quantity,
          reorder_level: i.reorder_level,
          unit_price: i.unit_price,
          stock_value: (i.quantity || 0) * (i.unit_price || 0),
          location: i.location,
          supplier: i.supplier,
          is_kitchen: true,
        })),
        issuances: issuances.map((is) => ({
          id: is.id,
          issuance_number: is.issuance_number,
          item_name: is.item_name,
          item_code: is.item_code,
          quantity: is.quantity,
          unit: is.unit,
          unit_price: is.unit_price,
          total_value: is.total_value,
          issued_to: is.issued_to,
          issued_to_type: is.issued_to_type,
          department: is.department,
          purpose: is.purpose,
          requested_by: is.requested_by,
          status: is.status,
          approved_by: is.approved_by,
          issued_by: is.issued_by,
          created_at: is.created_at,
        })),
        grns: grns.map((g) => ({
          id: g.id,
          grn_number: g.grn_number,
          item_name: g.item_name,
          quantity: g.quantity,
          unit: g.unit,
          unit_cost: g.unit_cost,
          total_cost: g.total_cost,
          supplier: g.supplier,
          invoice_ref: g.invoice_ref,
          delivery_date: g.delivery_date,
          received_by: g.received_by,
          status: g.status,
          authorized_by: g.authorized_by,
        })),
        lowStockItems: lowStockItems.map((i) => ({
          id: i.id,
          item_code: i.item_code || `STR-${i.id}`,
          item_name: i.item_name,
          category: i.category,
          unit: i.unit,
          quantity: i.quantity,
          reorder_level: i.reorder_level,
          unit_price: i.unit_price,
          stock_value: (i.quantity || 0) * (i.unit_price || 0),
          location: i.location,
          supplier: i.supplier,
          is_kitchen: i.is_kitchen,
        })),
      });
      toast.success('Multi-Sheet Stores Workbook Downloaded! 📊', { id: 'stores-export' });
    } catch (err: any) {
      console.error('Stores export error:', err);
      toast.error('Export failed: ' + err.message, { id: 'stores-export' });
    }
  };

  /* ══════════════════════════════════════════════════════════════
     ALL TABS DEFINITION
  ══════════════════════════════════════════════════════════════ */
  const TABS = [
    { id: 'inventory', label: '📦 Master Stock', badge: `${items.length}` },
    { id: 'kitchen', label: '🍳 Kitchen Rations', badge: `${kitchenItems.length}` },
    { id: 'issue', label: '📤 Issuances', badge: `${issuances.length}` },
    { id: 'approvals', label: '🔐 Approvals', badge: `${pendingIssuances.length}`, alert: pendingIssuances.length > 0 },
    ...(canReceiveStock ? [{ id: 'grn', label: '📥 GRN Delivery', badge: `${grns.length}`, alert: pendingGRNs.length > 0 }] : []),
    { id: 'low', label: '⚠️ Low Stock', badge: `${lowStockItems.length}`, alert: lowStockItems.length > 0 },
    ...(canViewAudit ? [{ id: 'audit', label: '📋 Audit Trail', badge: `${auditLogs.length}` }] : []),
    { id: 'board', label: '📑 BoM Inspection', badge: 'Certified' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-gradient-to-br from-amber-600 to-orange-700 text-white">
            📦
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-amber-400 animate-ping opacity-30" />
        </div>
        <p className="text-sm font-black text-slate-800 tracking-tight">Compiling Ultra Stores & Kitchen Logistics Engine…</p>
        <p className="text-xs text-slate-500 font-medium">Synchronizing inventory balances, food rations, GRNs, and approvals</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 pb-12 overflow-x-hidden">
      <Toaster position="top-right" />

      {/* ══════════════════════════════════════════════════════════════
          TOP EXECUTIVE BANNER & SCHOOL BRANDING BADGE
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative overflow-hidden w-full min-w-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-50/60 via-orange-50/20 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full min-w-0">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 via-orange-600 to-stone-800 flex items-center justify-center text-white shadow-md shrink-0">
              <FiBox size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md truncate max-w-xs">
                  {schoolInfo.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  MoE Reg: {schoolInfo.registration_number || '2566'}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE STORES & RATIONS ENGINE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex flex-wrap items-center gap-2">
                <span>Ultra Stores & Food Logistics Manager</span>
                <span className="text-xs font-black bg-gradient-to-r from-amber-600 to-orange-700 text-white px-2 py-0.5 rounded-md shadow-2xs">
                  SUPER PREMIUM
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                Centralized campus inventory, kitchen rations, GRN receiving, multi-tier approvals workflow, and BoM food inspection audit.
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
            {canAddItem && (
              <button
                onClick={() => {
                  setItemForm({ ...emptyItem, item_code: genItemCode('Kitchen Provisions', items) });
                  setEditing(null);
                  setShowItemModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <FiPlus size={13} /> Add Item
              </button>
            )}
            {canReceiveStock && (
              <button
                onClick={() => {
                  setGrnForm({ ...emptyGRN, grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` });
                  setShowGRNModal(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5"
              >
                <FiTruck size={13} /> Receive GRN
              </button>
            )}
            <button
              onClick={() => {
                setIssueForm(emptyIssue);
                setShowIssueModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1.5"
            >
              <FiMinus size={13} /> Request Issue
            </button>
            {lowStockItems.length > 0 && (
              <button
                onClick={sendLowStockAlert}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-2xs animate-pulse"
              >
                <FiPhone size={13} /> Low Stock Alert ({lowStockItems.length})
              </button>
            )}
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
            <FiSliders size={11} /> Filter Category:
          </span>
          <button
            onClick={() => {
              setFilterCat('All');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filterCat === 'All' ? 'bg-amber-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Stores Stock</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
              {items.length}
            </span>
          </button>
          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            const isSel = filterCat === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setFilterCat(isSel ? 'All' : cat);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  isSel ? 'ring-2 border-amber-500 bg-amber-50 text-amber-900' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate max-w-[100px]">{cat}</span>
                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-slate-100 text-slate-700">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LOW-PROFILE COMPACT EXECUTIVE STORES HUD CARDS (8 CARDS)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 w-full min-w-0">
        {[
          {
            label: 'Total Stock Value',
            value: fmtKESM(totalValue),
            sub: `${items.length} Registered Items`,
            color: '#15803d',
            bg: '#f0fdf4',
            bd: '#bbf7d0',
            icon: <FiDollarSign className="text-emerald-700" size={13} />,
          },
          {
            label: 'Kitchen Provisions',
            value: fmtKESM(kitchenValue),
            sub: `${kitchenItems.length} Food Rations`,
            color: '#c2410c',
            bg: '#fff7ed',
            bd: '#fed7aa',
            icon: <FiBox className="text-orange-700" size={13} />,
          },
          {
            label: 'Pending Approvals',
            value: String(pendingIssuances.length),
            sub: 'Principal / Bursar Queue',
            color: pendingIssuances.length > 0 ? '#b91c1c' : '#15803d',
            bg: pendingIssuances.length > 0 ? '#fef2f2' : '#f0fdf4',
            bd: pendingIssuances.length > 0 ? '#fecaca' : '#bbf7d0',
            icon: <FiShield className={pendingIssuances.length > 0 ? 'text-rose-700' : 'text-emerald-700'} size={13} />,
          },
          {
            label: 'Pending GRNs',
            value: String(pendingGRNs.length),
            sub: 'Inwards Deliveries',
            color: '#0369a1',
            bg: '#f0f9ff',
            bd: '#bae6fd',
            icon: <FiTruck className="text-sky-700" size={13} />,
          },
          {
            label: 'Low Stock Buffer',
            value: String(lowStockItems.length),
            sub: 'Below Reorder Limit',
            color: lowStockItems.length > 0 ? '#dc2626' : '#15803d',
            bg: lowStockItems.length > 0 ? '#fef2f2' : '#f0fdf4',
            bd: lowStockItems.length > 0 ? '#fecaca' : '#bbf7d0',
            icon: <FiAlertCircle className={lowStockItems.length > 0 ? 'text-rose-700' : 'text-emerald-700'} size={13} />,
          },
          {
            label: 'Total Issuances',
            value: String(issuances.length),
            sub: `${issuances.filter((i) => i.status === 'Issued').length} Completed`,
            color: '#4f46e5',
            bg: '#eef2ff',
            bd: '#c7d2fe',
            icon: <FiMinus className="text-indigo-700" size={13} />,
          },
          {
            label: 'Goods Inwards',
            value: String(grns.length),
            sub: `${grns.reduce((s, g) => s + (Number(g.quantity) || 0), 0)} Units Received`,
            color: '#7c3aed',
            bg: '#faf5ff',
            bd: '#ddd6fe',
            icon: <FiShoppingCart className="text-purple-700" size={13} />,
          },
          {
            label: 'Active Suppliers',
            value: String(activeSuppliers.length),
            sub: 'Verified Vendors',
            color: '#334155',
            bg: '#f8fafc',
            bd: '#e2e8f0',
            icon: <FiCheckCircle className="text-slate-700" size={13} />,
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
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 w-full min-w-0">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as StoresTab);
                setCurrentPage(1);
              }}
              className={`px-2 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 truncate relative ${
                isActive ? 'bg-amber-800 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="truncate">{t.label}</span>
              {t.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                    isActive ? 'bg-amber-900 text-amber-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.badge}
                </span>
              )}
              {t.alert && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-ping" />
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 & 2: MASTER INVENTORY & KITCHEN PROVISIONS
      ══════════════════════════════════════════════════════════════ */}
      {(tab === 'inventory' || tab === 'kitchen') && (
        <div className="space-y-3 w-full min-w-0">
          {/* Controls Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search item name, code, bin, supplier..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
                />
              </div>

              {/* Sorting Pills */}
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <span>Sort:</span>
                <button
                  onClick={() => {
                    if (sortBy === 'qty') setSortAsc(!sortAsc);
                    else { setSortBy('qty'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded border ${sortBy === 'qty' ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold' : 'bg-slate-50 border-slate-200'}`}
                >
                  Quantity {sortBy === 'qty' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
                <button
                  onClick={() => {
                    if (sortBy === 'value') setSortAsc(!sortAsc);
                    else { setSortBy('value'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded border ${sortBy === 'value' ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold' : 'bg-slate-50 border-slate-200'}`}
                >
                  Stock Value {sortBy === 'value' ? (sortAsc ? '↑' : '↓') : ''}
                </button>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 self-end sm:self-auto shrink-0">
              Showing {paginatedItems.items.length} of {paginatedItems.totalCount} items
            </div>
          </div>

          {/* Master Cons Datagrid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Description & Barcode</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Stock Value</th>
                    <th className="py-2.5 px-3 text-center">Reorder Buffer</th>
                    <th className="py-2.5 px-3">Storage Location</th>
                    <th className="py-2.5 px-3 text-center">Health</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedItems.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="text-3xl mb-1">📦</div>
                        <p className="font-bold text-slate-700">No store items found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Item" to register new provisions</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.items.map((item) => {
                      const isLow = item.quantity <= (item.reorder_level || 5);
                      const isKitchen = item.category === 'Kitchen Provisions' || item.is_kitchen;
                      const stockVal = (item.quantity || 0) * (item.unit_price || 0);

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/70 transition-colors ${isLow ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-800 text-[11px] whitespace-nowrap">
                            {item.item_code || `STR-${String(item.id).padStart(5, '0')}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0">{isKitchen ? '🍳' : '📦'}</span>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-[180px]">{item.item_name}</p>
                                <div className="mt-0.5">
                                  <SvgBarcode code={item.item_code || `STR-${item.id}`} width={100} height={16} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono">
                            <span className={`text-sm font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                              {item.quantity}
                            </span>{' '}
                            <span className="text-[10px] text-slate-500 font-semibold">{item.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {fmtKES(item.unit_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {fmtKES(stockVal)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {item.reorder_level || 5} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-semibold whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <FiMapPin size={10} className="text-slate-400" /> {item.location || 'Store Room A'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isLow ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                ⚠️ REORDER
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✅ ADEQUATE
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setIssueForm({ ...emptyIssue, item_id: item.id });
                                  setShowIssueModal(true);
                                }}
                                title="Request Issue"
                                className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                              >
                                <FiMinus size={11} />
                              </button>
                              <button
                                onClick={() => {
                                  setGrnForm({
                                    ...emptyGRN,
                                    item_id: item.id,
                                    unit_cost: item.unit_price,
                                    supplier_id: item.supplier_id || '',
                                    grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}`,
                                  });
                                  setShowGRNModal(true);
                                }}
                                title="Receive GRN Stock"
                                className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                              >
                                <FiTruck size={11} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditing(item);
                                  setItemForm({ ...emptyItem, ...item });
                                  setShowItemModal(true);
                                }}
                                title="Edit Item"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition"
                              >
                                <FiEdit2 size={11} />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                title="Delete Item"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              >
                                <FiTrash2 size={11} />
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

            {/* Pagination bar */}
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-500 font-medium">
                Page {paginatedItems.currentPage} of {paginatedItems.totalPages} ({paginatedItems.totalCount} items)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={paginatedItems.currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <FiChevronLeft size={13} />
                </button>
                <button
                  disabled={paginatedItems.currentPage >= paginatedItems.totalPages}
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
          TAB 3: STOCK ISSUANCES & REQUISITIONS
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'issue' && (
        <div className="space-y-3 w-full min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Status Filter:</span>
              {['All', 'Pending', 'Verified', 'Approved', 'Issued', 'Rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setIssueStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    issueStatusFilter === s ? 'bg-blue-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s} {s !== 'All' && `(${issuances.filter((i) => i.status === s).length})`}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setIssueForm(emptyIssue);
                setShowIssueModal(true);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 transition flex items-center gap-1.5"
            >
              <FiPlus size={12} /> New Requisition
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">ISS Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty Issued</th>
                    <th className="py-2.5 px-3 text-right">Value (KES)</th>
                    <th className="py-2.5 px-3">Issued To</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Approved By</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredIssuances.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="text-3xl mb-1">📤</div>
                        <p className="font-bold text-slate-700">No stock issuances found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredIssuances.map((is) => (
                      <tr key={is.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                          {is.issuance_number}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {fmtDate(is.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 truncate max-w-[180px]">
                          {is.item_name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-800 whitespace-nowrap">
                          {is.quantity} {is.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {fmtKES(is.total_value)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-semibold whitespace-nowrap">
                          {is.issued_to}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {is.department || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {statusBadge(is.status || 'Pending')}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-800 font-semibold whitespace-nowrap text-[11px]">
                          {is.approved_by || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {is.status === 'Approved' && (
                              <button
                                onClick={() => confirmIssue(is)}
                                className="px-2 py-1 rounded bg-blue-900 text-white font-bold text-[10px] hover:bg-blue-800 transition"
                              >
                                Issue Stock
                              </button>
                            )}
                            <button
                              onClick={() => setShowViewModal(is)}
                              className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              title="View Details"
                            >
                              <FiEye size={12} />
                            </button>
                          </div>
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
          TAB 4: EXECUTIVE APPROVALS COCKPIT (PRINCIPAL / BURSAR)
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'approvals' && (
        <div className="space-y-3 w-full min-w-0">
          {pendingIssuances.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-amber-900">
              <FiAlertCircle size={15} className="text-amber-700 shrink-0" />
              <span>
                🔐 {pendingIssuances.length} issuance requisition(s) currently awaiting Bursar verification or Principal approval.
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <FiShield size={14} /> Executive Requisition Approvals Queue
              </h3>
              <span className="text-[10px] font-mono text-blue-200">{issuances.length} Total Registered Requests</span>
            </div>

            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">ISS Ref</th>
                    <th className="py-2.5 px-3">Date Requested</th>
                    <th className="py-2.5 px-3">Item Requested</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Value (KES)</th>
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Recipient / Dept</th>
                    <th className="py-2.5 px-3">Stated Purpose</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {issuances.map((is) => (
                    <tr key={is.id} className={`hover:bg-slate-50/70 transition-colors ${is.status === 'Pending' || is.status === 'Verified' ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {is.issuance_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {fmtDateTime(is.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {is.item_name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-800 whitespace-nowrap">
                        {is.quantity} {is.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {fmtKES(is.total_value)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {is.requested_by || 'Store Keeper'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {is.issued_to} ({is.department || '—'})
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[160px]">
                        {is.purpose || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {statusBadge(is.status || 'Pending')}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {is.status === 'Pending' ? (
                          <button
                            onClick={() => verifyIssuance(is)}
                            className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold text-[10px] transition"
                          >
                            👁️ Bursar Verify
                          </button>
                        ) : is.status === 'Verified' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setShowApproveModal(is);
                                setApprovedBy('');
                                setApproveNotes('');
                              }}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold text-[10px] transition flex items-center gap-1"
                            >
                              <FiCheck size={11} /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setShowRejectModal(is);
                                setRejectReason('');
                                setApprovedBy('');
                              }}
                              className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-[10px] transition flex items-center gap-1"
                            >
                              <FiX size={11} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            {is.status === 'Approved' ? `Approved by ${is.approved_by}` : is.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 5: GOODS RECEIVED NOTES (GRN) INWARDS
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'grn' && (
        <div className="space-y-3 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <FiTruck className="text-emerald-700" /> Goods Received Notes & Supplier Inwards Ledger
              </h3>
              <button
                onClick={() => {
                  setGrnForm({ ...emptyGRN, grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` });
                  setShowGRNModal(true);
                }}
                className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition flex items-center gap-1.5"
              >
                <FiPlus size={12} /> New Delivery
              </button>
            </div>

            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">GRN No.</th>
                    <th className="py-2.5 px-3">Delivery Date</th>
                    <th className="py-2.5 px-3">Item Received</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Inwards</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Invoice / LPO Ref</th>
                    <th className="py-2.5 px-3">Store Receiver</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {grns.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {g.grn_number}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {fmtDate(g.delivery_date)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {g.item_name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 whitespace-nowrap">
                        +{g.quantity} {g.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {fmtKES(g.unit_cost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {fmtKES(g.total_cost)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold whitespace-nowrap">
                        {g.supplier || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700 whitespace-nowrap">
                        {g.invoice_ref || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {g.received_by || 'Store Keeper'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {statusBadge(g.status || 'Authorized')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 6: LOW STOCK & REORDER STUDIO
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'low' && (
        <div className="space-y-4 w-full min-w-0">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">🚨</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-rose-950 uppercase tracking-wider truncate">
                  Critical Stock Shortage & Replenishment Calculator
                </p>
                <p className="text-[10px] text-rose-700 truncate">
                  {lowStockItems.length} items below minimum safety threshold. Instant WhatsApp restocking notice available.
                </p>
              </div>
            </div>

            <button
              onClick={sendLowStockAlert}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
            >
              <FiPhone size={13} /> Send WhatsApp Alert
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-rose-50/60 border-b border-rose-200 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-center">Reorder Buffer</th>
                    <th className="py-2.5 px-3 text-center">Deficit</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Replenishment Cost</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="text-3xl mb-1">✅</div>
                        <p className="font-bold text-slate-700">All campus store stock levels are healthy!</p>
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((item) => {
                      const deficit = Math.max(0, (item.reorder_level || 5) - item.quantity);
                      return (
                        <tr key={item.id} className="hover:bg-rose-50/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-rose-700 whitespace-nowrap">
                            {item.item_code}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {item.item_name}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{item.category}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-rose-700 text-sm whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {item.reorder_level || 5} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-800 whitespace-nowrap">
                            -{deficit} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            {fmtKES(item.unit_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                            {fmtKES(deficit * (item.unit_price || 0))}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setGrnForm({
                                  ...emptyGRN,
                                  item_id: item.id,
                                  supplier_id: item.supplier_id || '',
                                  unit_cost: item.unit_price,
                                  grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}`,
                                });
                                setShowGRNModal(true);
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-[10px] transition"
                            >
                              📥 Restock Now
                            </button>
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
          TAB 7: IMMUTABLE AUDIT TRAIL
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'audit' && (
        <div className="space-y-3 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden w-full min-w-0">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <FiList size={14} /> Immutable Stores Audit Log ({auditLogs.length} Events)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Real-Time Event Stream</span>
            </div>

            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Action</th>
                    <th className="py-2.5 px-3">Document Reference</th>
                    <th className="py-2.5 px-3">Event Details</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">System Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {fmtDateTime(log.created_at)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {log.record_ref || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 max-w-[260px] truncate">
                        {log.description}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {log.actor || 'Store Keeper'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {log.actor_role || 'Store Keeper'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 8: BOM CERTIFIED STORES & RATIONS AUDIT REPORT
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'board' && (
        <div className="space-y-4 w-full min-w-0 print-area">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 shadow-md w-full min-w-0" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
            <div className="text-center border-b-2 border-amber-900 pb-4 mb-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">
                {schoolInfo.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
              </h2>
              <p className="text-xs text-slate-600 italic mt-0.5">
                "{schoolInfo.school_motto || 'Excellence in Education'}" • MoE Registration: {schoolInfo.registration_number || '2566'} • {schoolInfo.postal_address || 'P.O. Box 112 Bomet'}
              </p>
              <h3 className="text-base font-bold text-amber-900 uppercase mt-2 tracking-wide">
                ANNUAL STORES & FOOD PROVISIONS AUDIT DOSSIER
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Financial Cycle: {new Date().getFullYear()} — Certified on {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'sans-serif' }}>
                  Stores Stock Valuation
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Total Registered Items:</span><span className="font-bold">{items.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Kitchen Provisions Count:</span><span className="font-bold">{kitchenItems.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Kitchen Provisions Valuation:</span><span className="font-bold text-amber-900">{fmtKES(kitchenValue)}</span></div>
                  <div className="flex justify-between pt-1 border-t"><span className="text-slate-700 font-bold">Total Campus Stock Valuation:</span><span className="font-bold text-emerald-700">{fmtKES(totalValue)}</span></div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" style={{ fontFamily: 'sans-serif' }}>
                  Logistics & Issuance Audit
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Completed Store Issuances:</span><span className="font-bold text-emerald-700">{issuances.filter((i) => i.status === 'Issued').length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Authorized Inwards Deliveries:</span><span className="font-bold text-blue-700">{grns.length}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Pending Requisitions:</span><span className="font-bold text-amber-700">{pendingIssuances.length}</span></div>
                  <div className="flex justify-between pt-1 border-t"><span className="text-slate-700 font-bold">Items Requiring Restocking:</span><span className="font-bold text-rose-700">{lowStockItems.length}</span></div>
                </div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2" style={{ fontFamily: 'sans-serif' }}>
              Master Store Inventory Schedule
            </h4>
            <div className="w-full min-w-0 overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Code</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Item Description</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">Category</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center">Available Stock</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-right">Unit Price (KES)</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-right">Total Value (KES)</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center">Storage Bin</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="border border-slate-300 px-3 py-1.5 font-mono">{i.item_code}</td>
                      <td className="border border-slate-300 px-3 py-1.5 font-bold">{i.item_name}</td>
                      <td className="border border-slate-300 px-3 py-1.5">{i.category}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center font-mono">{i.quantity} {i.unit}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">{fmtKES(i.unit_price)}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold text-emerald-800">{fmtKES(i.quantity * i.unit_price)}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center">{i.location || 'Store Room A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs" style={{ fontFamily: 'sans-serif' }}>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">Store Keeper / Cateress</p>
                <p className="text-[10px] text-slate-400">Signature & Official Stamp</p>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">School Bursar</p>
                <p className="text-[10px] text-slate-400">Signature & Verification Date</p>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <p className="font-bold text-slate-900">Principal / Secretary to BoM</p>
                <p className="text-[10px] text-slate-400">Approval Stamp & Date</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT STORE ITEM
      ══════════════════════════════════════════════════════════════ */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FiBox className="text-amber-700" /> {editing ? 'Edit Store Item' : 'Add Store Inventory Item'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Item Description *</label>
                <input
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                  placeholder="e.g. Maize Flour Grade 1 (90 Kgs)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Item Code</label>
                  <input
                    value={itemForm.item_code}
                    onChange={(e) => setItemForm({ ...itemForm, item_code: e.target.value })}
                    placeholder="e.g. KIT-00001"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm((f) => ({
                        ...f,
                        category: e.target.value,
                        item_code: editing ? f.item_code : genItemCode(e.target.value, items),
                      }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit of Measure</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.reorder_level}
                    onChange={(e) => setItemForm({ ...itemForm, reorder_level: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Price (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.unit_price}
                    onChange={(e) => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Storage Bin / Room</label>
                  <input
                    value={itemForm.location}
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    placeholder="e.g. Store Room A"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier / Vendor</label>
                <select
                  value={itemForm.supplier_id}
                  onChange={(e) => setItemForm({ ...itemForm, supplier_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">— Select Vendor —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Instructions</label>
                <textarea
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Expiry terms, storage constraints..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={saveItem}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs bg-amber-800 hover:bg-amber-900 disabled:opacity-60 transition shadow-2xs"
              >
                {saving ? 'Processing…' : editing ? 'Update Store Item' : 'Save Inventory Item'}
              </button>
              <button
                onClick={() => setShowItemModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: REQUEST STORE ISSUANCE
      ══════════════════════════════════════════════════════════════ */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-900 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <FiMinus /> Request Store Issuance
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-blue-200 hover:text-white">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Item *</label>
                <select
                  value={issueForm.item_id}
                  onChange={(e) => setIssueForm({ ...issueForm, item_id: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={0}>Select item from stock…</option>
                  {items
                    .filter((i) => i.quantity > 0)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.item_name} ({i.quantity} {i.unit} available)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recipient Name *</label>
                  <input
                    value={issueForm.issued_to}
                    onChange={(e) => setIssueForm({ ...issueForm, issued_to: e.target.value })}
                    placeholder="e.g. Jane Langat"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Requested *</label>
                  <input
                    type="number"
                    min="1"
                    value={issueForm.quantity}
                    onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={issueForm.department}
                    onChange={(e) => setIssueForm({ ...issueForm, department: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recipient Category</label>
                  <select
                    value={issueForm.issued_to_type}
                    onChange={(e) => setIssueForm({ ...issueForm, issued_to_type: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ISSUE_TO_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Purpose / Stated Reason *</label>
                <input
                  value={issueForm.purpose}
                  onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })}
                  placeholder="e.g. Daily student supper preparation..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Requested By (Store Officer) *</label>
                <input
                  value={issueForm.requested_by}
                  onChange={(e) => setIssueForm({ ...issueForm, requested_by: e.target.value })}
                  placeholder="Your full name"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={submitIssuanceRequest}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs bg-blue-900 hover:bg-blue-800 disabled:opacity-60 transition shadow-2xs"
              >
                {saving ? 'Submitting…' : 'Submit Requisition for Approval'}
              </button>
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: RECEIVE GOODS RECEIVED NOTE (GRN)
      ══════════════════════════════════════════════════════════════ */}
      {showGRNModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <FiTruck /> Record Goods Received (GRN)
              </h3>
              <button onClick={() => setShowGRNModal(false)} className="text-emerald-200 hover:text-white">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">GRN Voucher Code</span>
                <span className="font-mono font-bold text-xs text-emerald-900">{grnForm.grn_number}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Delivered Item *</label>
                <select
                  value={grnForm.item_id}
                  onChange={(e) => {
                    const item = items.find((i) => i.id === Number(e.target.value));
                    setGrnForm({
                      ...grnForm,
                      item_id: Number(e.target.value),
                      unit_cost: item?.unit_price || 0,
                      supplier_id: item?.supplier_id || '',
                    });
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={0}>Select item from catalog…</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.item_name} (Current: {i.quantity} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    min="1"
                    value={grnForm.quantity}
                    onChange={(e) => setGrnForm({ ...grnForm, quantity: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit Cost (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={grnForm.unit_cost}
                    onChange={(e) => setGrnForm({ ...grnForm, unit_cost: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Date</label>
                  <input
                    type="date"
                    value={grnForm.delivery_date}
                    onChange={(e) => setGrnForm({ ...grnForm, delivery_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Received By</label>
                  <input
                    value={grnForm.received_by}
                    onChange={(e) => setGrnForm({ ...grnForm, received_by: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier / Vendor</label>
                <select
                  value={grnForm.supplier_id}
                  onChange={(e) => setGrnForm({ ...grnForm, supplier_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">— Select Vendor —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier Invoice / LPO Ref</label>
                <input
                  value={grnForm.invoice_ref}
                  onChange={(e) => setGrnForm({ ...grnForm, invoice_ref: e.target.value })}
                  placeholder="e.g. SINV-2026-00001"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 px-6 pb-6">
              <button
                onClick={receiveStock}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 transition shadow-2xs"
              >
                {saving ? 'Processing…' : 'Record GRN & Update Stock'}
              </button>
              <button
                onClick={() => setShowGRNModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: APPROVE REQUISITION
      ══════════════════════════════════════════════════════════════ */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl mb-2">
                <FiCheckCircle />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Approve Stock Issuance</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {showApproveModal.issuance_number}: {showApproveModal.quantity} {showApproveModal.unit} of{' '}
                <strong>{showApproveModal.item_name}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Approved By (Principal Name) *</label>
              <input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Full Name"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Remarks (Optional)</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                rows={2}
                placeholder="Approval conditions..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={approveIssuance}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 transition shadow-2xs"
              >
                {saving ? 'Approving…' : 'Confirm Approval'}
              </button>
              <button
                onClick={() => setShowApproveModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: REJECT REQUISITION
      ══════════════════════════════════════════════════════════════ */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto text-xl mb-2">
                <FiXCircle />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Reject Stock Issuance</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {showRejectModal.issuance_number}: {showRejectModal.quantity} {showRejectModal.unit} of{' '}
                <strong>{showRejectModal.item_name}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Your Name *</label>
              <input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Full Name"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Rejection *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="State reason for rejecting this requisition..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={rejectIssuance}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition shadow-2xs"
              >
                {saving ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
              <button
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: VIEW ISSUANCE DETAILS
      ══════════════════════════════════════════════════════════════ */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-mono font-bold text-xs text-indigo-700">{showViewModal.issuance_number}</span>
              {statusBadge(showViewModal.status)}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Item Name</span>
                <span className="font-bold text-slate-900">{showViewModal.item_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Quantity</span>
                <span className="font-mono font-bold text-amber-800">{showViewModal.quantity} {showViewModal.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Total Value</span>
                <span className="font-mono font-bold text-emerald-700">{fmtKES(showViewModal.total_value)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Recipient</span>
                <span className="font-semibold text-slate-800">{showViewModal.issued_to}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Department</span>
                <span className="text-slate-700">{showViewModal.department || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Purpose</span>
                <span className="text-slate-700">{showViewModal.purpose || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Requested By</span>
                <span className="text-slate-700">{showViewModal.requested_by || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Approved By</span>
                <span className="text-emerald-700 font-bold">{showViewModal.approved_by || '—'}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowViewModal(null)}
                className="w-full py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
