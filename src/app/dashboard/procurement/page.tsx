'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiTruck, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiX, FiSave,
  FiDownload, FiCheck, FiStar, FiFileText, FiDollarSign,
  FiShoppingCart, FiAlertTriangle, FiPrinter, FiEye,
  FiClock, FiCheckCircle, FiXCircle, FiArrowRight, FiCopy,
  FiBarChart2, FiFilter, FiPackage, FiAlertCircle, FiActivity,
  FiLayers, FiShield, FiTag, FiPhone, FiMail, FiCalendar,
  FiChevronDown, FiChevronUp, FiShare2, FiExternalLink, FiSliders,
  FiTrendingUp, FiCheckSquare, FiAward, FiFilePlus
} from 'react-icons/fi';
import { exportUltraProcurementExcel } from '@/components/procurement/UltraProcurementExport';

/* ══════════════════════════════════════════════════════════════
   FORMATTERS & CATEGORY DEFINITIONS
══════════════════════════════════════════════════════════════ */
const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n: any) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `KES ${(v / 1_000).toFixed(1)}K`;
  return `KES ${Math.round(v).toLocaleString('en-KE')}`;
};
const fmtN = (n: any) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d: string) => (d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const daysSince = (d: string) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0);
const daysUntil = (d: string) => (d ? Math.floor((new Date(d).getTime() - Date.now()) / 86400000) : 0);

const CATEGORIES = [
  'General', 'Food & Kitchen', 'Stationery', 'Cleaning', 'Laboratory',
  'Uniforms', 'Construction', 'IT & Electronics', 'Fuel & Energy',
  'Medical', 'Furniture', 'Transport', 'Textbooks', 'Sports', 'Maintenance'
];
const UNITS = ['Pieces', 'Reams', 'Boxes', 'Kg', 'Litres', 'Metres', 'Pairs', 'Sets', 'Cartons', 'Bags', 'Rolls', 'Packets', 'Dozens', 'Bottles'];
const PAY_METHODS = ['Bank Transfer', 'Cheque', 'M-Pesa', 'EFT', 'RTGS', 'Cash'];
const PAY_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 60', 'COD', 'Prepaid'];

export type ProcurementTab = 'orders' | 'invoices' | 'payments' | 'statements' | 'suppliers' | 'tenders' | 'analytics' | 'dossier';

const genPONumber = (count: number) => `LPO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
const genINVNumber = (count: number) => `SINV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
const genPAYNumber = (count: number) => `PV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

/* ══════════════════════════════════════════════════════════════
   HIGH-RESOLUTION VECTOR SVG BARCODE GENERATOR
══════════════════════════════════════════════════════════════ */
function SvgBarcode({ code, width = 110, height = 22 }: { code: string; width?: number; height?: number }) {
  const chars = (code || 'LPO-00001').toUpperCase();
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
            fill="#1e293b"
          />
        ) : null
      )}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   STATUS BADGE COMPONENT
══════════════════════════════════════════════════════════════ */
const statusBadge = (s: string) => {
  const map: Record<string, { bg: string; color: string; border: string; icon: any }> = {
    Draft: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: <FiClock size={10} /> },
    Approved: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', icon: <FiCheck size={10} /> },
    Sent: { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe', icon: <FiShare2 size={10} /> },
    Partial: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: <FiSliders size={10} /> },
    Delivered: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', icon: <FiCheckCircle size={10} /> },
    Cancelled: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: <FiXCircle size={10} /> },
    Pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: <FiClock size={10} /> },
    Paid: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', icon: <FiCheckCircle size={10} /> },
    Overdue: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: <FiAlertTriangle size={10} /> },
    Voided: { bg: '#f3f4f6', color: '#9ca3af', border: '#e5e7eb', icon: <FiX size={10} /> },
    Active: { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', icon: <FiCheck size={10} /> },
    Inactive: { bg: '#f3f4f6', color: '#9ca3af', border: '#e5e7eb', icon: <FiX size={10} /> },
  };
  const c = map[s] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', icon: null };
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shadow-xs"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}
    >
      {c.icon} {s}
    </span>
  );
};

export default function ProcurementPage() {
  const [tab, setTab] = useState<ProcurementTab>('orders');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>({});
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [itemSearches, setItemSearches] = useState<string[]>(['']);
  const [itemDropdownOpen, setItemDropdownOpen] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals & View States
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewPO, setShowViewPO] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [expandedPoId, setExpandedPoId] = useState<number | null>(null);

  // Forms
  const emptySupplier = {
    supplier_name: '', contact_person: '', phone: '', email: '',
    kra_pin: '', bank_name: '', bank_account: '', bank_branch: '',
    address: '', category: 'General', payment_terms: 'Net 30', notes: '', status: 'Active'
  };
  const emptyPO = {
    supplier_id: '', order_date: new Date().toISOString().split('T')[0],
    delivery_date: '', payment_terms: 'Net 30', category: 'General', notes: '',
    items: [{ item_description: '', quantity: 1, unit: 'Pieces', unit_price: 0 }]
  };
  const freshInvoice = () => ({
    invoice_number: genINVNumber(invoices.length),
    supplier_id: '', po_id: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', subtotal: '', vat_amount: '0', total_amount: '',
    category: 'General', description: '', notes: '', supplier_invoice_ref: ''
  });
  const freshPayment = () => ({
    payment_number: genPAYNumber(payments.length),
    supplier_id: '', invoice_id: '', payment_date: new Date().toISOString().split('T')[0],
    amount: '', payment_method: 'Bank Transfer', reference_number: '',
    bank_name: '', notes: ''
  });

  const [supForm, setSupForm] = useState(emptySupplier);
  const [poForm, setPoForm] = useState<any>(emptyPO);
  const [invForm, setInvForm] = useState<any>(freshInvoice());
  const [payForm, setPayForm] = useState<any>(freshPayment());

  // Interactive 3-Bid PPADA Calculator State
  const [tenderItem, setTenderItem] = useState('Bulk Cooking Oil & Dry Cereals');
  const [tenderQty, setTenderQty] = useState(50);
  const [bid1, setBid1] = useState({ name: 'Fresh Suppliers Ltd', unitPrice: 4200, warranty: '1 Year', compliant: true });
  const [bid2, setBid2] = useState({ name: 'Apex Grains & Millers', unitPrice: 4500, warranty: '6 Months', compliant: true });
  const [bid3, setBid3] = useState({ name: 'Rift Valley Wholesalers', unitPrice: 3950, warranty: '1 Year', compliant: true });

  /* ── Fetch Data ─────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [sRes, oRes, piRes, iRes, pRes, scRes, siRes] = await Promise.all([
        supabase.from('school_suppliers').select('*').order('supplier_name'),
        supabase.from('school_purchase_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('school_po_items').select('*'),
        supabase.from('school_supplier_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('school_supplier_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('school_details').select('*').maybeSingle(),
        supabase.from('school_store_items').select('id,item_name,item_code,category,unit,unit_price').eq('is_active', true).order('item_name'),
      ]);

      setSuppliers(sRes.data || []);
      setOrders(oRes.data || []);
      setPoItems(piRes.data || []);
      setInvoices(iRes.data || []);
      setPayments(pRes.data || []);
      setSchoolInfo(scRes.data || {});
      setStoreItems(siRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load procurement matrix: ' + (err?.message || ''));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── Derived Stats & Intelligence ─────────────────────── */
  const getSupplier = (id: any) => suppliers.find((s) => s.id === Number(id));
  const poHasInvoice = (poId: number) => invoices.find((i) => i.po_id === poId);

  const activeSuppliers = suppliers.filter((s) => s.status === 'Active').length;
  const openOrders = orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length;
  const totalOrderValue = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.grand_total || 0), 0);
  const deliveredOrderValue = orders.filter((o) => o.status === 'Delivered').reduce((s, o) => s + Number(o.grand_total || 0), 0);
  const unpaidInvoices = invoices.filter((i) => !['Paid', 'Voided'].includes(i.status));
  const totalOwed = unpaidInvoices.reduce((s, i) => s + Number(i.balance || i.total_amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const overdueInvoices = invoices.filter((i) => i.status !== 'Paid' && i.due_date && new Date(i.due_date) < new Date());
  const avgOrderValue = orders.length ? totalOrderValue / orders.length : 0;
  const thisMonthPay = payments.filter((p) => {
    const d = new Date(p.payment_date);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, p) => s + Number(p.amount || 0), 0);

  /* ── Filtered Sets ─────────────────────────────────────── */
  const filteredOrders = useMemo(() => orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (catFilter !== 'All' && o.category !== catFilter) return false;
    if (dateFrom && (o.order_date || o.created_at?.split('T')[0]) < dateFrom) return false;
    if (dateTo && (o.order_date || o.created_at?.split('T')[0]) > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (o.po_number || '').toLowerCase().includes(q) ||
        (getSupplier(o.supplier_id)?.supplier_name || '').toLowerCase().includes(q) ||
        (o.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [orders, statusFilter, catFilter, dateFrom, dateTo, search, suppliers]);

  const filteredInvoices = useMemo(() => invoices.filter((i) => {
    const isOverdue = i.status !== 'Paid' && i.due_date && new Date(i.due_date) < new Date();
    const effStatus = isOverdue ? 'Overdue' : i.status;
    if (statusFilter !== 'All' && effStatus !== statusFilter) return false;
    if (catFilter !== 'All' && i.category !== catFilter) return false;
    if (dateFrom && i.invoice_date < dateFrom) return false;
    if (dateTo && i.invoice_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (getSupplier(i.supplier_id)?.supplier_name || '').toLowerCase().includes(q) ||
        (i.supplier_invoice_ref || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [invoices, statusFilter, catFilter, dateFrom, dateTo, search, suppliers]);

  const filteredPayments = useMemo(() => payments.filter((p) => {
    if (dateFrom && p.payment_date < dateFrom) return false;
    if (dateTo && p.payment_date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (getSupplier(p.supplier_id)?.supplier_name || '').toLowerCase().includes(q) ||
        (p.payment_number || '').toLowerCase().includes(q) ||
        (p.reference_number || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [payments, dateFrom, dateTo, search, suppliers]);

  const filteredSuppliers = useMemo(() => suppliers.filter((s) => {
    if (statusFilter !== 'All' && s.status !== statusFilter) return false;
    if (catFilter !== 'All' && s.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (s.supplier_name || '').toLowerCase().includes(q) ||
        (s.contact_person || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    return true;
  }), [suppliers, statusFilter, catFilter, search]);

  /* ── Supplier Statement Intelligence ───────────────────── */
  const getSupplierStatement = (supplierId: number) => {
    const supOrders = orders.filter((o) => o.supplier_id === supplierId && o.status !== 'Cancelled');
    const supInvoices = invoices.filter((i) => i.supplier_id === supplierId);
    const supPayments = payments.filter((p) => p.supplier_id === supplierId);
    const totalInvoiced = supInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const totalPaidS = supPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = totalInvoiced - totalPaidS;

    const now = new Date();
    const aging = { current: 0, d30: 0, d60: 0, d90plus: 0 };
    supInvoices.filter((i) => i.status !== 'Paid' && i.status !== 'Voided').forEach((i) => {
      const days = i.due_date ? Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000) : 0;
      const bal = Number(i.balance || 0);
      if (days <= 0) aging.current += bal;
      else if (days <= 30) aging.d30 += bal;
      else if (days <= 60) aging.d60 += bal;
      else aging.d90plus += bal;
    });

    return { supOrders, supInvoices, supPayments, totalInvoiced, totalPaid: totalPaidS, balance, aging };
  };

  /* ── Supplier Rating Update ────────────────────────────── */
  const updateSupplierRating = async (supplierId: number, rating: number) => {
    const { error } = await supabase.from('school_suppliers').update({ rating }).eq('id', supplierId);
    if (!error) {
      setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? { ...s, rating } : s)));
      toast.success(`Supplier rating updated to ${rating} ★`);
    } else {
      toast.error('Failed to update rating');
    }
  };

  /* ── CRUD Operations ───────────────────────────────────── */
  const saveSupplier = async () => {
    if (!supForm.supplier_name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSaving(true);
    const { error } = editingSupplier
      ? await supabase.from('school_suppliers').update(supForm).eq('id', editingSupplier.id)
      : await supabase.from('school_suppliers').insert([supForm]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success(editingSupplier ? 'Supplier profile updated ✅' : 'New supplier registered ✅');
    setShowSupplierModal(false);
    setEditingSupplier(null);
    setSaving(false);
    fetchAll();
  };

  const savePO = async () => {
    if (!poForm.supplier_id || poForm.items.filter((i: any) => i.item_description).length === 0) {
      toast.error('Please select a supplier and add at least one line item');
      return;
    }
    setSaving(true);
    const subtotal = poForm.items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
    const vat = Math.round(subtotal * 0.16 * 100) / 100;
    const grandTotal = Math.round((subtotal + vat) * 100) / 100;
    const poNumber = genPONumber(orders.length);

    const { data: po, error } = await supabase.from('school_purchase_orders').insert([{
      po_number: poNumber,
      supplier_id: Number(poForm.supplier_id),
      order_date: poForm.order_date,
      delivery_date: poForm.delivery_date || null,
      subtotal_amount: subtotal,
      vat_amount: vat,
      total_amount: subtotal,
      grand_total: grandTotal,
      payment_terms: poForm.payment_terms,
      category: poForm.category,
      notes: poForm.notes,
      status: 'Draft',
      created_by: 'Admin',
    }]).select().single();

    if (error || !po) {
      toast.error('Failed to create LPO: ' + (error?.message || ''));
      setSaving(false);
      return;
    }

    const rows = poForm.items.filter((i: any) => i.item_description.trim()).map((i: any) => ({
      po_id: po.id,
      item_description: i.item_description,
      quantity: Number(i.quantity || 1),
      unit: i.unit || 'Pieces',
      unit_price: Number(i.unit_price || 0),
      total_price: Number(i.quantity || 1) * Number(i.unit_price || 0),
    }));

    if (rows.length > 0) {
      await supabase.from('school_po_items').insert(rows);
    }

    toast.success(`✅ ${poNumber} created successfully!`);
    setShowPOModal(false);
    setPoForm(emptyPO);
    setSaving(false);
    fetchAll();
  };

  const approvePO = async (po: any) => {
    await supabase.from('school_purchase_orders').update({
      status: 'Approved',
      approved_by: 'Admin',
      approved_at: new Date().toISOString()
    }).eq('id', po.id);
    toast.success(`${po.po_number} authorized by Principal ✅`);
    fetchAll();
  };

  const sendPO = async (po: any) => {
    await supabase.from('school_purchase_orders').update({ status: 'Sent' }).eq('id', po.id);
    toast.success(`${po.po_number} marked as Dispatched to Vendor`);
    fetchAll();
  };

  const deliverPO = async (po: any) => {
    if (!confirm(`Confirm Delivery for ${po.po_number}?\n\nThis will:\n1. Mark LPO as DELIVERED\n2. Automatically increment inventory balances in School Stores\n3. Create official Goods Received Note (GRN) records\n4. Update central audit trail\n\nProceed?`)) return;

    const { error: poErr } = await supabase.from('school_purchase_orders')
      .update({ status: 'Delivered', delivered_at: new Date().toISOString() })
      .eq('id', po.id);
    if (poErr) {
      toast.error('Failed to update LPO: ' + poErr.message);
      return;
    }

    const thisPoItems = poItems.filter((i: any) => i.po_id === po.id);
    if (thisPoItems.length === 0) {
      toast.success(`✅ ${po.po_number} marked as DELIVERED`);
      fetchAll();
      return;
    }

    const supplier = getSupplier(po.supplier_id);
    const grnYear = new Date().getFullYear();
    let stockUpdateCount = 0;
    let errors: string[] = [];

    for (const item of thisPoItems) {
      const { data: storeMatches } = await supabase
        .from('school_store_items')
        .select('id, item_name, quantity, unit_price')
        .ilike('item_name', `%${item.item_description.trim()}%`)
        .limit(1);

      const storeItem = storeMatches?.[0];
      if (storeItem) {
        const newQty = (Number(storeItem.quantity) || 0) + Number(item.quantity);
        const { error: stockErr } = await supabase
          .from('school_store_items')
          .update({ quantity: newQty })
          .eq('id', storeItem.id);
        if (stockErr) {
          errors.push(`Store update failed for ${item.item_description}: ${stockErr.message}`);
          continue;
        }
        stockUpdateCount++;

        const grnNumber = `GRN-${grnYear}-${po.po_number}-${stockUpdateCount}`;
        await supabase.from('school_store_purchases').insert([{
          item_id: storeItem.id,
          item_name: storeItem.item_name,
          quantity: Number(item.quantity),
          unit: item.unit || 'Pieces',
          unit_cost: Number(item.unit_price) || 0,
          total_cost: Number(item.quantity) * Number(item.unit_price || 0),
          grn_number: grnNumber,
          supplier_id: po.supplier_id || null,
          supplier: supplier?.supplier_name || '',
          invoice_ref: po.po_number,
          delivery_date: new Date().toISOString().split('T')[0],
          received_by: 'Procurement Officer',
          status: 'Authorized',
          authorized_by: 'Principal',
          authorized_by_role: 'Administration',
          authorized_at: new Date().toISOString(),
          notes: `Auto-generated GRN from delivered LPO ${po.po_number}`,
        }]);
      } else {
        errors.push(`⚠️ "${item.item_description}" not found in stores repository — please register it under Stores`);
      }
    }

    try {
      await supabase.from('school_store_audit_log').insert([{
        action_type: 'LPO_DELIVERED',
        record_ref: po.po_number,
        description: `LPO ${po.po_number} DELIVERED. ${stockUpdateCount} item(s) stock updated. Vendor: ${supplier?.supplier_name || ''}. Value: KES ${fmtN(po.grand_total)}`,
        actor: 'Admin',
        actor_role: 'Procurement Officer',
      }]);
    } catch (_) {}

    if (errors.length > 0) toast.error(errors.join('\n'));
    if (stockUpdateCount > 0) {
      toast.success(`✅ ${po.po_number} DELIVERED — ${stockUpdateCount} items inventory increased in Stores!`);
    } else if (errors.length === 0) {
      toast.success(`✅ ${po.po_number} marked as DELIVERED`);
    }
    fetchAll();
  };

  const syncStockFromPO = async (po: any) => {
    if (!confirm(`Force-sync stock balance for ${po.po_number}?\nThis increments stock quantities in Stores for all items in this LPO.`)) return;
    const thisPoItems = poItems.filter((i: any) => i.po_id === po.id);
    if (thisPoItems.length === 0) {
      toast.error('No items found for this LPO');
      return;
    }
    const supplier = getSupplier(po.supplier_id);
    const grnYear = new Date().getFullYear();
    let stockUpdateCount = 0;
    let errors: string[] = [];

    for (const item of thisPoItems) {
      const { data: storeMatches } = await supabase
        .from('school_store_items')
        .select('id, item_name, quantity, unit_price')
        .ilike('item_name', `%${item.item_description.trim()}%`)
        .limit(1);
      const storeItem = storeMatches?.[0];
      if (storeItem) {
        const newQty = (Number(storeItem.quantity) || 0) + Number(item.quantity);
        const { error: stockErr } = await supabase
          .from('school_store_items')
          .update({ quantity: newQty })
          .eq('id', storeItem.id);
        if (stockErr) {
          errors.push(`Sync failed for ${item.item_description}: ${stockErr.message}`);
          continue;
        }
        stockUpdateCount++;
        const grnNumber = `GRN-${grnYear}-${po.po_number}-SYNC-${stockUpdateCount}`;
        await supabase.from('school_store_purchases').insert([{
          item_id: storeItem.id,
          item_name: storeItem.item_name,
          quantity: Number(item.quantity),
          unit: item.unit || 'Pieces',
          unit_cost: Number(item.unit_price) || 0,
          total_cost: Number(item.quantity) * Number(item.unit_price || 0),
          grn_number: grnNumber,
          supplier_id: po.supplier_id || null,
          supplier: supplier?.supplier_name || '',
          invoice_ref: po.po_number,
          delivery_date: new Date().toISOString().split('T')[0],
          received_by: 'Procurement Officer',
          status: 'Authorized',
          authorized_by: 'System',
          authorized_by_role: 'Procurement',
          authorized_at: new Date().toISOString(),
          notes: `Synced from delivered LPO ${po.po_number}`,
        }]);
      } else {
        errors.push(`"${item.item_description}" not found in store register`);
      }
    }
    if (errors.length > 0) toast.error(errors.join('\n'));
    if (stockUpdateCount > 0) toast.success(`✅ Stock synced — ${stockUpdateCount} item(s) updated in Stores from ${po.po_number}!`);
    fetchAll();
  };

  const cancelPO = async (po: any) => {
    if (!confirm(`Cancel ${po.po_number}? This action is irreversible.`)) return;
    await supabase.from('school_purchase_orders').update({ status: 'Cancelled' }).eq('id', po.id);
    toast.success(`${po.po_number} cancelled`);
    fetchAll();
  };

  const onSelectPO = (poId: string) => {
    const po = orders.find((o) => String(o.id) === poId);
    if (po) {
      setInvForm((f: any) => ({
        ...f,
        po_id: poId,
        supplier_id: String(po.supplier_id),
        total_amount: String(po.grand_total || po.total_amount || ''),
        vat_amount: String(po.vat_amount || '0'),
        subtotal: String(po.subtotal_amount || po.total_amount || ''),
        description: `Invoice for ${po.po_number}`,
      }));
    } else {
      setInvForm((f: any) => ({ ...f, po_id: poId }));
    }
  };

  const saveInvoice = async () => {
    if (!invForm.invoice_number || !invForm.supplier_id || !invForm.total_amount) {
      toast.error('Invoice #, supplier, and total amount are required');
      return;
    }
    setSaving(true);
    const { data: existing } = await supabase
      .from('school_supplier_invoices')
      .select('id,invoice_number')
      .eq('invoice_number', invForm.invoice_number)
      .maybeSingle();

    if (existing) {
      toast.error(`⚠️ Invoice ${invForm.invoice_number} already exists!`);
      setSaving(false);
      return;
    }

    if (invForm.po_id) {
      const { data: poInv } = await supabase
        .from('school_supplier_invoices')
        .select('id,invoice_number')
        .eq('po_id', Number(invForm.po_id))
        .maybeSingle();
      if (poInv) {
        toast.error(`⚠️ LPO already linked to invoice ${poInv.invoice_number}.`);
        setSaving(false);
        return;
      }
    }

    const total = Number(invForm.total_amount);
    const { error } = await supabase.from('school_supplier_invoices').insert([{
      invoice_number: invForm.invoice_number,
      supplier_id: Number(invForm.supplier_id),
      po_id: invForm.po_id ? Number(invForm.po_id) : null,
      invoice_date: invForm.invoice_date,
      due_date: invForm.due_date || null,
      subtotal: Number(invForm.subtotal || total),
      vat_amount: Number(invForm.vat_amount || 0),
      total_amount: total,
      balance: total,
      amount_paid: 0,
      status: 'Pending',
      supplier_invoice_ref: invForm.supplier_invoice_ref || null,
      category: invForm.category,
      description: invForm.description,
      notes: invForm.notes,
      created_by: 'Admin',
    }]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success('✅ Invoice recorded successfully!');
    setShowInvoiceModal(false);
    setInvForm(freshInvoice());
    setSaving(false);
    fetchAll();
  };

  const voidInvoice = async (inv: any) => {
    if (!confirm(`Void invoice ${inv.invoice_number}? The outstanding balance will be cleared.`)) return;
    await supabase.from('school_supplier_invoices').update({ status: 'Voided', balance: 0 }).eq('id', inv.id);
    toast.success('Invoice marked as voided');
    fetchAll();
  };

  const savePayment = async () => {
    if (!payForm.supplier_id || !payForm.amount) {
      toast.error('Supplier and payment amount are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('school_supplier_payments').insert([{
      payment_number: payForm.payment_number,
      supplier_id: Number(payForm.supplier_id),
      invoice_id: payForm.invoice_id ? Number(payForm.invoice_id) : null,
      payment_date: payForm.payment_date,
      amount: Number(payForm.amount),
      payment_method: payForm.payment_method,
      reference_number: payForm.reference_number,
      bank_name: payForm.bank_name || null,
      notes: payForm.notes,
      created_by: 'Bursar',
    }]);

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    if (payForm.invoice_id) {
      const inv = invoices.find((i) => i.id === Number(payForm.invoice_id));
      if (inv) {
        const newPaid = Number(inv.amount_paid || 0) + Number(payForm.amount);
        const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
        await supabase
          .from('school_supplier_invoices')
          .update({
            amount_paid: newPaid,
            balance: newBalance,
            status: newBalance <= 0 ? 'Paid' : 'Partial',
          })
          .eq('id', inv.id);
      }
    }

    try {
      await supabase.from('school_store_audit_log').insert([{
        action_type: 'SUPPLIER_PAYMENT',
        record_ref: payForm.payment_number,
        description: `Disbursement of KES ${payForm.amount} to ${getSupplier(payForm.supplier_id)?.supplier_name || 'vendor'} via ${payForm.payment_method}`,
        actor: 'Admin',
        actor_role: 'Bursar',
      }]);
    } catch (_) {}

    toast.success('✅ Payment voucher recorded!');
    setShowPaymentModal(false);
    setPayForm(freshPayment());
    setSaving(false);
    fetchAll();
  };

  /* ── Line Items Helper ─────────────────────────────────── */
  const addItem = () => {
    setPoForm((f: any) => ({
      ...f,
      items: [...f.items, { item_description: '', quantity: 1, unit: 'Pieces', unit_price: 0 }]
    }));
    setItemSearches((s) => [...s, '']);
  };

  const removeItem = (idx: number) => {
    setPoForm((f: any) => ({
      ...f,
      items: f.items.filter((_: any, i: number) => i !== idx)
    }));
    setItemSearches((s) => s.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: any) => {
    setPoForm((f: any) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      return { ...f, items };
    });
  };

  const poSubtotal = poForm.items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
  const poVAT = Math.round(poSubtotal * 0.16 * 100) / 100;

  /* ── Analytics Aggregates ──────────────────────────────── */
  const categorySpend = useMemo(() => {
    const map: Record<string, number> = {};
    orders.filter((o) => o.status !== 'Cancelled').forEach((o) => {
      const k = o.category || 'General';
      map[k] = (map[k] || 0) + Number(o.grand_total || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const monthlySpend = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      const d = new Date(p.payment_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[k] = (map[k] || 0) + Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [payments]);

  /* ── Printable Documents ───────────────────────────────── */
  const printLPO = (po: any) => {
    const items = poItems.filter((i) => i.po_id === po.id);
    const supplier = getSupplier(po.supplier_id);
    const w = window.open('', '_blank');
    w?.document.write(`<!DOCTYPE html><html><head><title>LPO - ${po.po_number}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1e293b;font-size:12px;background:#fff;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #1e3a8a;}
  .school-title{font-size:22px;font-weight:900;color:#1e3a8a;letter-spacing:-0.5px;}
  .school-meta{font-size:10.5px;color:#64748b;margin-top:2px;}
  .badge{background:#1e3a8a;color:#fff;padding:12px 20px;border-radius:12px;text-align:right;}
  .badge-title{font-size:18px;font-weight:900;letter-spacing:1px;}
  .badge-sub{font-size:9.5px;opacity:0.8;text-transform:uppercase;margin-top:2px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px;}
  .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;}
  .card-h{font-size:9px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:6px;}
  .card-val{font-size:12px;font-weight:700;color:#0f172a;}
  table{width:100%;border-collapse:collapse;margin:16px 0;}
  thead th{background:#1e3a8a;color:#fff;padding:9px 12px;font-size:10px;text-transform:uppercase;text-align:left;font-weight:800;}
  tbody td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:11.5px;}
  tbody tr:nth-child(even){background:#f8fafc;}
  .total-row td{background:#1e3a8a;color:#fff;font-weight:900;font-size:13px;}
  .vat-row td{background:#eff6ff;color:#1e40af;font-weight:800;}
  .footer{margin-top:32px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;}
  .sign-slot{border-top:1.5px solid #334155;padding-top:6px;font-size:10px;color:#64748b;text-align:center;font-weight:700;}
  .watermark{position:fixed;top:45%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;font-weight:900;color:rgba(30,58,138,0.04);pointer-events:none;}
  @media print{@page{size:A4;margin:10mm;}}
</style></head><body>
<div class="watermark">ST. CATHERINE TEGAT</div>
<div class="header">
  <div>
    <div class="school-title">${schoolInfo?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}</div>
    <div class="school-meta">Ministry of Education Reg: 2566 | TSC School Code: BMT-088</div>
    <div class="school-meta">${schoolInfo?.address || 'P.O. Box 45 - 20400, Bomet, Kenya'} | Tel: ${schoolInfo?.phone || '+254 720 000 000'}</div>
  </div>
  <div class="badge">
    <div class="badge-sub">LOCAL PURCHASE ORDER</div>
    <div class="badge-title">${po.po_number}</div>
    <div style="font-size:10px;margin-top:4px;">Status: <strong>${po.status}</strong></div>
  </div>
</div>
<div class="grid">
  <div class="card">
    <div class="card-h">SUPPLIER CREDENTIALS</div>
    <div class="card-val" style="font-size:14px;color:#1e3a8a;">${supplier?.supplier_name || 'Vendor'}</div>
    <div style="font-size:11px;color:#475569;margin-top:2px;">Contact: ${supplier?.contact_person || '—'}</div>
    <div style="font-size:11px;color:#475569;">Tel: ${supplier?.phone || '—'} | Email: ${supplier?.email || '—'}</div>
    <div style="font-size:10px;color:#64748b;margin-top:3px;">KRA PIN: ${supplier?.kra_pin || 'Not Provided'}</div>
  </div>
  <div class="card">
    <div class="card-h">ORDER PROCUREMENT SPECIFICATIONS</div>
    <div style="font-size:11px;">Order Date: <strong>${fmtDate(po.order_date)}</strong></div>
    <div style="font-size:11px;">Delivery Date: <strong>${po.delivery_date ? fmtDate(po.delivery_date) : 'Immediate / Open'}</strong></div>
    <div style="font-size:11px;">Payment Terms: <strong>${po.payment_terms || 'Net 30'}</strong></div>
    <div style="font-size:11px;">Category: <strong>${po.category || 'General'}</strong></div>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th style="width:36px;text-align:center;">#</th>
      <th>Item / Provision Description</th>
      <th style="width:80px;text-align:center;">Quantity</th>
      <th style="width:70px;text-align:center;">Unit</th>
      <th style="width:110px;text-align:right;">Unit Price (KES)</th>
      <th style="width:130px;text-align:right;">Line Total (KES)</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((it, idx) => `<tr>
      <td style="text-align:center;color:#64748b;">${idx + 1}</td>
      <td style="font-weight:700;">${it.item_description}</td>
      <td style="text-align:center;font-weight:700;">${it.quantity}</td>
      <td style="text-align:center;color:#64748b;">${it.unit || 'Pcs'}</td>
      <td style="text-align:right;">${fmtN(it.unit_price)}</td>
      <td style="text-align:right;font-weight:800;">${fmtN(it.total_price || it.quantity * it.unit_price)}</td>
    </tr>`).join('')}
    <tr class="vat-row">
      <td colspan="5" style="text-align:right;font-weight:800;">SUBTOTAL (EXCL. VAT)</td>
      <td style="text-align:right;font-weight:800;">KES ${fmtN(po.subtotal_amount || po.total_amount)}</td>
    </tr>
    <tr class="vat-row">
      <td colspan="5" style="text-align:right;font-weight:800;">VALUE ADDED TAX (VAT @ 16%)</td>
      <td style="text-align:right;font-weight:800;">KES ${fmtN(po.vat_amount)}</td>
    </tr>
    <tr class="total-row">
      <td colspan="5" style="text-align:right;">GRAND TOTAL PAYABLE</td>
      <td style="text-align:right;">KES ${fmtN(po.grand_total)}</td>
    </tr>
  </tbody>
</table>
${po.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;font-size:11px;color:#92400e;margin-top:10px;"><strong>Order Notes:</strong> ${po.notes}</div>` : ''}
<div class="footer">
  <div>
    <div style="height:36px;"></div>
    <div class="sign-slot">Prepared By (Procurement Officer)</div>
  </div>
  <div>
    <div style="height:36px;"></div>
    <div class="sign-slot">Verified & Vouched (Bursar)</div>
  </div>
  <div>
    <div style="height:36px;"></div>
    <div class="sign-slot">Authorized (Principal / Secretary BoM)</div>
  </div>
</div>
<div style="margin-top:24px;text-align:center;font-size:9.5px;color:#94a3b8;">
  Generated by APSIMS School Enterprise System · Date: ${fmtDateTime(new Date().toISOString())} · Official Government Compliant LPO
</div>
<script>window.onload=()=>{window.print();}</script></body></html>`);
    w?.document.close();
  };

  const printStatement = (sup: any) => {
    const st = getSupplierStatement(sup.id);
    const { balance, aging } = st;
    const w = window.open('', '_blank');
    w?.document.write(`<!DOCTYPE html><html><head><title>Statement - ${sup.supplier_name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1e293b;font-size:12px;background:#fff;}
  .header{display:flex;justify-content:space-between;border-bottom:3px solid #1e3a8a;padding-bottom:14px;margin-bottom:20px;}
  .school-title{font-size:20px;font-weight:900;color:#1e3a8a;}
  .aging-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}
  .aging-box{border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center;}
  table{width:100%;border-collapse:collapse;margin:14px 0;}
  thead th{background:#1e3a8a;color:#fff;padding:8px 10px;font-size:10px;text-transform:uppercase;text-align:left;}
  tbody td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;}
  tbody tr:nth-child(even){background:#f8fafc;}
  .total-row td{background:#eff6ff;color:#1e40af;font-weight:900;font-size:12px;}
  .bal-card{background:${balance > 0 ? '#fef2f2' : '#f0fdf4'};border:2px solid ${balance > 0 ? '#fca5a5' : '#86efac'};border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;margin:18px 0;}
  @media print{@page{size:A4;margin:8mm;}}
</style></head><body>
<div class="header">
  <div>
    <div class="school-title">${schoolInfo?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}</div>
    <div style="font-size:11px;color:#64748b;">${schoolInfo?.address || 'P.O. Box 45 - 20400, Bomet'} | MoE Reg: 2566</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">CREDITOR ACCOUNT STATEMENT</div>
    <div style="font-size:16px;font-weight:900;color:#1e3a8a;">${sup.supplier_name}</div>
    <div style="font-size:11px;color:#64748b;">${sup.phone || ''} · KRA PIN: ${sup.kra_pin || '—'}</div>
    <div style="font-size:10px;color:#94a3b8;">Statement As Of: ${fmtDate(new Date().toISOString())}</div>
  </div>
</div>
<div class="aging-grid">
  <div class="aging-box" style="background:#f0f9ff;border-color:#bae6fd;"><div style="font-size:9px;font-weight:800;color:#0369a1;text-transform:uppercase;">Current (0-30d)</div><div style="font-size:16px;font-weight:900;color:#0369a1;margin-top:2px;">KES ${fmtN(aging.current)}</div></div>
  <div class="aging-box" style="background:#fffbeb;border-color:#fde68a;"><div style="font-size:9px;font-weight:800;color:#92400e;text-transform:uppercase;">31–60 Days</div><div style="font-size:16px;font-weight:900;color:#d97706;margin-top:2px;">KES ${fmtN(aging.d30)}</div></div>
  <div class="aging-box" style="background:#fff7ed;border-color:#fed7aa;"><div style="font-size:9px;font-weight:800;color:#9a3412;text-transform:uppercase;">61–90 Days</div><div style="font-size:16px;font-weight:900;color:#ea580c;margin-top:2px;">KES ${fmtN(aging.d60)}</div></div>
  <div class="aging-box" style="background:#fef2f2;border-color:#fecaca;"><div style="font-size:9px;font-weight:800;color:#991b1b;text-transform:uppercase;">90+ Days</div><div style="font-size:16px;font-weight:900;color:#dc2626;margin-top:2px;">KES ${fmtN(aging.d90plus)}</div></div>
</div>
<div style="font-size:12px;font-weight:800;color:#1e3a8a;margin-top:16px;text-transform:uppercase;">1. Invoices Billed</div>
<table>
  <thead><tr><th>#</th><th>Invoice No</th><th>Date</th><th>Due Date</th><th>Total Amount</th><th>Amount Paid</th><th>Balance</th><th>Status</th></tr></thead>
  <tbody>
    ${st.supInvoices.map((inv, idx) => `<tr>
      <td>${idx + 1}</td>
      <td style="font-family:monospace;font-weight:700;">${inv.invoice_number}</td>
      <td>${fmtDate(inv.invoice_date)}</td>
      <td>${fmtDate(inv.due_date)}</td>
      <td style="text-align:right;">KES ${fmtN(inv.total_amount)}</td>
      <td style="text-align:right;color:#059669;">KES ${fmtN(inv.amount_paid)}</td>
      <td style="text-align:right;font-weight:800;color:${Number(inv.balance) > 0 ? '#dc2626' : '#059669'};">KES ${fmtN(inv.balance)}</td>
      <td>${inv.status}</td>
    </tr>`).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right;">TOTALS</td><td style="text-align:right;">KES ${fmtN(st.totalInvoiced)}</td><td style="text-align:right;color:#059669;">KES ${fmtN(st.totalPaid)}</td><td style="text-align:right;color:${balance > 0 ? '#dc2626' : '#059669'};">KES ${fmtN(balance)}</td><td></td></tr>
  </tbody>
</table>
<div style="font-size:12px;font-weight:800;color:#1e3a8a;margin-top:16px;text-transform:uppercase;">2. Disbursements & Settlements</div>
<table>
  <thead><tr><th>#</th><th>Payment Ref</th><th>Date</th><th>Method</th><th>Bank Reference</th><th style="text-align:right;">Amount Settled</th></tr></thead>
  <tbody>
    ${st.supPayments.map((p, idx) => `<tr>
      <td>${idx + 1}</td>
      <td style="font-family:monospace;">${p.payment_number}</td>
      <td>${fmtDate(p.payment_date)}</td>
      <td>${p.payment_method}</td>
      <td>${p.reference_number || '—'}</td>
      <td style="text-align:right;font-weight:800;color:#059669;">KES ${fmtN(p.amount)}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="bal-card">
  <div>
    <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:${balance > 0 ? '#dc2626' : '#059669'};">Net Outstanding Balance Due to Vendor</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px;">Certified by School Bursar & Financial Oversight Committee</div>
  </div>
  <div style="font-size:24px;font-weight:900;color:${balance > 0 ? '#dc2626' : '#059669'};">KES ${fmtN(balance)}</div>
</div>
<script>window.onload=()=>{window.print();}</script></body></html>`);
    w?.document.close();
  };

  /* ── Excel Workbook Exporter ───────────────────────────── */
  const handleExportExcel = async () => {
    toast.loading('Generating multi-sheet Excel workbook…', { id: 'excel-export' });
    try {
      await exportUltraProcurementExcel({
        schoolName: schoolInfo?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT",
        schoolMotto: "Excellence in Discipline & Academic Integrity",
        schoolRegNo: "MoE Reg: 2566 | Bomet County",
        schoolPostal: schoolInfo?.address || "P.O. Box 45 - 20400, Bomet",
        orders: orders.map((o) => ({
          id: o.id,
          po_number: o.po_number,
          order_date: o.order_date,
          delivery_date: o.delivery_date,
          supplier_name: getSupplier(o.supplier_id)?.supplier_name || '—',
          category: o.category || 'General',
          payment_terms: o.payment_terms || 'Net 30',
          subtotal: Number(o.subtotal_amount || o.total_amount || 0),
          vat_amount: Number(o.vat_amount || 0),
          grand_total: Number(o.grand_total || 0),
          status: o.status,
          item_count: poItems.filter((i) => i.po_id === o.id).length,
          created_by: o.created_by,
          approved_by: o.approved_by,
          notes: o.notes,
        })),
        invoices: invoices.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          supplier_invoice_ref: inv.supplier_invoice_ref,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date,
          supplier_name: getSupplier(inv.supplier_id)?.supplier_name || '—',
          po_number: orders.find((o) => o.id === inv.po_id)?.po_number || '—',
          category: inv.category || 'General',
          subtotal: Number(inv.subtotal || 0),
          vat_amount: Number(inv.vat_amount || 0),
          total_amount: Number(inv.total_amount || 0),
          amount_paid: Number(inv.amount_paid || 0),
          balance: Number(inv.balance || 0),
          status: inv.status,
          days_overdue: inv.due_date && new Date(inv.due_date) < new Date() ? Math.abs(daysUntil(inv.due_date)) : 0,
        })),
        payments: payments.map((p) => ({
          id: p.id,
          payment_number: p.payment_number,
          payment_date: p.payment_date,
          supplier_name: getSupplier(p.supplier_id)?.supplier_name || '—',
          invoice_number: invoices.find((iv) => iv.id === p.invoice_id)?.invoice_number || '—',
          amount: Number(p.amount || 0),
          payment_method: p.payment_method,
          reference_number: p.reference_number,
          bank_name: p.bank_name,
          notes: p.notes,
        })),
        suppliers: suppliers.map((s) => {
          const st = getSupplierStatement(s.id);
          return {
            id: s.id,
            supplier_name: s.supplier_name,
            contact_person: s.contact_person,
            phone: s.phone,
            email: s.email,
            kra_pin: s.kra_pin,
            category: s.category || 'General',
            payment_terms: s.payment_terms || 'Net 30',
            bank_name: s.bank_name,
            bank_account: s.bank_account,
            bank_branch: s.bank_branch,
            address: s.address,
            rating: s.rating || 5,
            status: s.status,
            total_orders: st.supOrders.length,
            total_invoiced: st.totalInvoiced,
            total_paid: st.totalPaid,
            balance_due: st.balance,
          };
        }),
      });
      toast.success('Procurement Excel workbook exported successfully! ✅', { id: 'excel-export' });
    } catch (err: any) {
      toast.error('Failed to export Excel: ' + (err?.message || ''), { id: 'excel-export' });
    }
  };

  /* ── UI Styles ─────────────────────────────────────────── */
  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition";
  const lblCls = "text-[10px] font-extrabold text-slate-500 uppercase block mb-1 tracking-wider";

  const tabsConfig = [
    { k: 'orders', l: 'Purchase Orders', icon: <FiShoppingCart size={13} />, count: orders.length },
    { k: 'invoices', l: 'Invoices & Payables', icon: <FiFileText size={13} />, count: invoices.length },
    { k: 'payments', l: 'Payment Vouchers', icon: <FiDollarSign size={13} />, count: payments.length },
    { k: 'statements', l: 'Supplier Accounts', icon: <FiLayers size={13} />, count: suppliers.length },
    { k: 'suppliers', l: 'Vendor Register', icon: <FiTruck size={13} />, count: suppliers.length },
    { k: 'tenders', l: 'PPADA 3-Bids', icon: <FiAward size={13} />, count: 0 },
    { k: 'analytics', l: 'Spend Analytics', icon: <FiBarChart2 size={13} />, count: 0 },
    { k: 'dossier', l: 'BoM Dossier', icon: <FiShield size={13} />, count: 0 },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl bg-gradient-to-tr from-sky-900 to-indigo-600">
            🏢
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-sky-400 animate-ping opacity-30" />
        </div>
        <p className="text-sm font-bold text-slate-600">Loading Procurement Intelligence Hub…</p>
        <p className="text-xs text-slate-400">Synchronizing LPOs, Invoices, and Store Registries</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-12">

      {/* ════ FLOATING SCHOOL BRANDING ISLAND ════ */}
      <div className="w-full min-w-0 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-800 to-indigo-900 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
              <FiShield size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
                  {schoolInfo?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-sky-800 border border-sky-200">
                  MoE Reg: 2566
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Procurement Directorate
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Public Secondary School · Bomet County · Official Government PPADA Compliant System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Ledger Connected
            </span>
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="p-2 rounded-xl text-slate-600 hover:text-sky-600 hover:bg-slate-100 border border-slate-200 transition"
              title="Refresh"
            >
              <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ════ ULTRA EXECUTIVE COMMAND DECK ════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 text-white shadow-xl border border-sky-900/40 p-5 sm:p-6 min-w-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-900/40 shrink-0">
                <FiTruck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    Procurement & Supply Chain Management
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white tracking-widest uppercase">
                    ULTRA
                  </span>
                  {overdueInvoices.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                      <FiAlertTriangle size={10} /> {overdueInvoices.length} OVERDUE
                    </span>
                  )}
                </div>
                <p className="text-xs text-sky-200/80 font-medium mt-0.5">
                  Local Purchase Orders · Supplier Invoices · Payment Vouchers · Creditor Aging · PPADA Bids · Multi-Sheet ExcelJS
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => {
                  setPoForm(emptyPO);
                  setItemSearches(['']);
                  setItemDropdownOpen(null);
                  setShowPOModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-md shadow-sky-900/40 flex items-center gap-1.5 transition"
              >
                <FiPlus size={13} /> New LPO
              </button>
              <button
                onClick={() => {
                  setSupForm(emptySupplier);
                  setEditingSupplier(null);
                  setShowSupplierModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1.5 transition backdrop-blur-md"
              >
                <FiTruck size={13} /> Add Supplier
              </button>
              <button
                onClick={() => {
                  setInvForm(freshInvoice());
                  setShowInvoiceModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-md shadow-amber-900/30 flex items-center gap-1.5 transition"
              >
                <FiFileText size={13} /> Record Invoice
              </button>
              <button
                onClick={() => {
                  setPayForm(freshPayment());
                  setShowPaymentModal(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition"
              >
                <FiDollarSign size={13} /> Record Payment
              </button>
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-600/40 flex items-center gap-1.5 transition"
                title="Download 5-Sheet Excel Workbook"
              >
                <FiDownload size={13} /> ExcelJS
              </button>
            </div>
          </div>

          {/* ════ 8 EXECUTIVE HUD METRIC CARDS ════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-3 border-t border-white/10">
            {[
              {
                label: 'Total LPO Spend',
                value: fmtShort(totalOrderValue),
                sub: `${orders.length} Orders`,
                icon: <FiShoppingCart className="text-sky-400" size={14} />,
                accent: 'text-sky-300',
              },
              {
                label: 'Active Vendors',
                value: activeSuppliers,
                sub: `${suppliers.length} Total Registered`,
                icon: <FiTruck className="text-indigo-400" size={14} />,
                accent: 'text-indigo-300',
              },
              {
                label: 'Open In Pipeline',
                value: openOrders,
                sub: 'Draft / Approved / Sent',
                icon: <FiClock className="text-amber-400" size={14} />,
                accent: 'text-amber-300',
              },
              {
                label: 'Delivered (Stores)',
                value: fmtShort(deliveredOrderValue),
                sub: `${orders.filter((o) => o.status === 'Delivered').length} GRNs Synced`,
                icon: <FiCheckCircle className="text-emerald-400" size={14} />,
                accent: 'text-emerald-300',
              },
              {
                label: 'Billed Invoices',
                value: fmtShort(invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)),
                sub: `${invoices.length} Invoices`,
                icon: <FiFileText className="text-purple-400" size={14} />,
                accent: 'text-purple-300',
              },
              {
                label: 'Disbursed',
                value: fmtShort(totalPaid),
                sub: `${payments.length} Payments`,
                icon: <FiCheckSquare className="text-teal-400" size={14} />,
                accent: 'text-teal-300',
              },
              {
                label: 'Accounts Payable',
                value: fmtShort(totalOwed),
                sub: `${unpaidInvoices.length} Unpaid`,
                icon: <FiAlertCircle className="text-rose-400" size={14} />,
                accent: 'text-rose-300',
              },
              {
                label: 'Overdue Bills',
                value: overdueInvoices.length,
                sub: fmtShort(overdueInvoices.reduce((s, i) => s + Number(i.balance || 0), 0)),
                icon: <FiAlertTriangle className="text-red-400" size={14} />,
                accent: overdueInvoices.length > 0 ? 'text-red-400 font-extrabold' : 'text-slate-400',
                pulse: overdueInvoices.length > 0,
              },
            ].map((c, i) => (
              <div
                key={i}
                className={`rounded-xl p-2.5 bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col justify-between transition-all hover:bg-white/10 ${
                  c.pulse ? 'ring-1 ring-rose-500/80 bg-rose-950/20' : ''
                }`}
              >
                <div className="flex items-center justify-between text-white/60 mb-1">
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider">{c.label}</span>
                  {c.icon}
                </div>
                <div>
                  <div className={`text-base font-black ${c.accent} leading-tight`}>{c.value}</div>
                  <div className="text-[9.5px] text-white/50 truncate mt-0.5">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ OVERDUE INVOICE ALERT STRIP ════ */}
      {overdueInvoices.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
              <FiAlertTriangle size={16} />
            </div>
            <div>
              <div className="text-xs font-black">
                {overdueInvoices.length} Supplier Invoice(s) Overdue for Payment — Outstanding: {fmt(overdueInvoices.reduce((s, i) => s + Number(i.balance || 0), 0))}
              </div>
              <div className="text-[11px] text-rose-700">
                Invoices: {overdueInvoices.map((i) => `${i.invoice_number} (${getSupplier(i.supplier_id)?.supplier_name || 'Vendor'})`).join(', ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTab('invoices');
                setStatusFilter('Overdue');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition"
            >
              Filter Overdue Invoices
            </button>
          </div>
        </div>
      )}

      {/* ════ RESPONSIVE 8-TAB SELECTOR (GRID WRAP TO PREVENT SCREEN BLOWOUT) ════ */}
      <div className="w-full min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 w-full min-w-0">
          {tabsConfig.map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => {
                  setTab(t.k as ProcurementTab);
                  setStatusFilter('All');
                  setCatFilter('All');
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? 'bg-gradient-to-r from-sky-800 to-indigo-900 text-white border-transparent shadow-md'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.l}</span>
                {t.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════ UNIFIED CONTROL & SEARCH BAR ════ */}
      <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order #, vendor name, invoice ref, category…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition"
            />
          </div>

          {/* Status filter */}
          {(tab === 'orders' || tab === 'invoices' || tab === 'suppliers') && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700 outline-none"
            >
              <option value="All">All Statuses</option>
              {tab === 'orders' && ['Draft', 'Approved', 'Sent', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
              {tab === 'invoices' && ['Pending', 'Partial', 'Paid', 'Overdue', 'Voided'].map((s) => <option key={s}>{s}</option>)}
              {tab === 'suppliers' && ['Active', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
            </select>
          )}

          {/* Category filter */}
          {(tab === 'orders' || tab === 'invoices' || tab === 'suppliers') && (
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white text-slate-700 outline-none"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}

          {/* Date range filters */}
          {tab !== 'suppliers' && tab !== 'analytics' && tab !== 'tenders' && tab !== 'dossier' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-bold">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none"
              />
              <span className="text-[11px] text-slate-500 font-bold">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 outline-none"
              />
            </div>
          )}

          {(dateFrom || dateTo || search || statusFilter !== 'All' || catFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('All');
                setCatFilter('All');
                setDateFrom('');
                setDateTo('');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1"
            >
              <FiX size={12} /> Clear Filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1"
            >
              <FiDownload size={12} /> Excel Report
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         TAB 1: LOCAL PURCHASE ORDERS (LPO REGISTER)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div className="space-y-3 min-w-0">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <span className="text-4xl block mb-2">📋</span>
              <p className="text-sm font-bold text-slate-700">No purchase orders found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or create a new LPO.</p>
              <button
                onClick={() => {
                  setPoForm(emptyPO);
                  setItemSearches(['']);
                  setShowPOModal(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 shadow-md"
              >
                <FiPlus size={12} className="inline mr-1" /> Create First LPO
              </button>
            </div>
          ) : (
            filteredOrders.map((po) => {
              const supplier = getSupplier(po.supplier_id);
              const items = poItems.filter((i) => i.po_id === po.id);
              const days = daysSince(po.order_date);
              const hasInv = poHasInvoice(po.id);
              const isExpanded = expandedPoId === po.id;

              return (
                <div
                  key={po.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                >
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 min-w-0">
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-800 to-indigo-900 flex flex-col items-center justify-center text-white shrink-0 shadow-md">
                        <span className="text-[10px] font-black uppercase tracking-wider">LPO</span>
                        <FiShoppingCart size={13} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900 font-mono tracking-tight">{po.po_number}</span>
                          {statusBadge(po.status)}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            {po.category || 'General'}
                          </span>
                          {days > 14 && po.status === 'Draft' && (
                            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              ⏰ {days}d pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                          <span className="font-bold text-slate-700">{supplier?.supplier_name || 'Vendor'}</span>
                          <span>•</span>
                          <span>Order Date: {fmtDate(po.order_date)}</span>
                          {po.delivery_date && (
                            <>
                              <span>•</span>
                              <span className="text-sky-700 font-semibold">Delivery Due: {fmtDate(po.delivery_date)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{items.length} item(s)</span>
                        </div>
                      </div>
                    </div>

                    {/* Barcode & Valuation & Actions */}
                    <div className="flex items-center gap-3 flex-wrap lg:justify-end shrink-0">
                      <div className="hidden sm:flex flex-col items-end pr-2 border-r border-slate-200">
                        <SvgBarcode code={po.po_number} width={100} height={20} />
                        <span className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{po.po_number}</span>
                      </div>

                      <div className="text-right pr-2">
                        <div className="text-base font-black text-slate-900">{fmt(po.grand_total || po.total_amount)}</div>
                        <div className="text-[10px] font-medium text-slate-400">VAT: {fmt(po.vat_amount)}</div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {po.status === 'Draft' && (
                          <button
                            onClick={() => approvePO(po)}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 transition shadow-xs"
                          >
                            <FiCheck size={12} /> Approve
                          </button>
                        )}
                        {po.status === 'Approved' && (
                          <button
                            onClick={() => sendPO(po)}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1 transition shadow-xs"
                          >
                            <FiShare2 size={12} /> Mark Sent
                          </button>
                        )}
                        {(po.status === 'Approved' || po.status === 'Sent') && (
                          <button
                            onClick={() => deliverPO(po)}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1 transition shadow-xs"
                          >
                            <FiPackage size={12} /> Mark Delivered
                          </button>
                        )}
                        {po.status === 'Delivered' && (
                          <button
                            onClick={() => syncStockFromPO(po)}
                            className="px-2 py-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl flex items-center gap-1 transition"
                            title="Sync quantities to school stores inventory"
                          >
                            <FiRefreshCw size={11} /> Sync Stock
                          </button>
                        )}
                        {po.status !== 'Cancelled' && po.status !== 'Delivered' && (
                          <button
                            onClick={() => cancelPO(po)}
                            className="px-2 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1 transition"
                          >
                            <FiX size={11} /> Cancel
                          </button>
                        )}
                        <button
                          onClick={() => printLPO(po)}
                          className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-1 transition"
                          title="Print MoE standard LPO"
                        >
                          <FiPrinter size={12} /> Print
                        </button>
                        {hasInv ? (
                          <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1">
                            <FiCheckCircle size={11} /> {hasInv.invoice_number}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setInvForm({
                                ...freshInvoice(),
                                po_id: String(po.id),
                                supplier_id: String(po.supplier_id),
                                total_amount: String(po.grand_total || po.total_amount || ''),
                                vat_amount: String(po.vat_amount || '0'),
                                subtotal: String(po.subtotal_amount || po.total_amount || ''),
                                description: `Invoice for ${po.po_number}`,
                              });
                              setShowInvoiceModal(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1 transition"
                          >
                            <FiFilePlus size={12} /> Bill Invoice
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          title="View line items"
                        >
                          {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Line Items Matrix */}
                  {isExpanded && items.length > 0 && (
                    <div className="w-full min-w-0 bg-slate-50/50 p-4 border-t border-slate-100">
                      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-[10px] font-extrabold uppercase">
                              <th className="px-3 py-2 text-left w-10">#</th>
                              <th className="px-3 py-2 text-left">Description of Goods / Services</th>
                              <th className="px-3 py-2 text-center w-20">Quantity</th>
                              <th className="px-3 py-2 text-center w-20">Unit</th>
                              <th className="px-3 py-2 text-right w-28">Unit Price</th>
                              <th className="px-3 py-2 text-right w-32">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((it, idx) => (
                              <tr key={it.id || idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 font-bold text-slate-800">{it.item_description}</td>
                                <td className="px-3 py-2 text-center font-black text-slate-700">{it.quantity}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{it.unit || 'Pieces'}</td>
                                <td className="px-3 py-2 text-right text-slate-600 font-mono">{fmt(it.unit_price)}</td>
                                <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">
                                  {fmt(it.total_price || it.quantity * it.unit_price)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-sky-50/60 font-bold text-sky-900">
                              <td colSpan={4} />
                              <td className="px-3 py-2 text-right text-xs">VAT @ 16%:</td>
                              <td className="px-3 py-2 text-right text-xs font-mono">{fmt(po.vat_amount)}</td>
                            </tr>
                            <tr className="bg-sky-100 font-black text-sky-950">
                              <td colSpan={4} />
                              <td className="px-3 py-2 text-right text-sm">Grand Total:</td>
                              <td className="px-3 py-2 text-right text-sm font-mono">{fmt(po.grand_total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {po.notes && (
                        <div className="mt-2 text-[11px] text-slate-600 bg-amber-50/50 border border-amber-200/60 rounded-xl p-2.5">
                          <span className="font-bold text-amber-900">Notes: </span>{po.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 2: SUPPLIER INVOICES & PAYABLES REGISTER
      ══════════════════════════════════════════════════════════ */}
      {tab === 'invoices' && (
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[10px] font-extrabold uppercase">
                  <th className="px-3.5 py-3 text-left">Invoice #</th>
                  <th className="px-3 py-3 text-left">Supplier Ref</th>
                  <th className="px-3.5 py-3 text-left">Supplier Name</th>
                  <th className="px-3 py-3 text-left">LPO Ref</th>
                  <th className="px-3 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-left">Due Date</th>
                  <th className="px-3 py-3 text-right">Total (KES)</th>
                  <th className="px-3 py-3 text-right">Paid (KES)</th>
                  <th className="px-3 py-3 text-right">Balance (KES)</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <FiFileText size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-bold">No supplier invoices found</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isOverdue = inv.status !== 'Paid' && inv.due_date && new Date(inv.due_date) < new Date();
                    const po = inv.po_id ? orders.find((o) => o.id === inv.po_id) : null;
                    const daysOD = isOverdue ? Math.abs(daysUntil(inv.due_date)) : 0;
                    const sup = getSupplier(inv.supplier_id);

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}
                      >
                        <td className="px-3.5 py-2.5 font-bold font-mono text-indigo-700">{inv.invoice_number}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500">{inv.supplier_invoice_ref || '—'}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{sup?.supplier_name || 'Vendor'}</td>
                        <td className="px-3 py-2.5 font-mono text-sky-600 font-bold">{po?.po_number || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500">{fmtDate(inv.invoice_date)}</td>
                        <td className="px-3 py-2.5">
                          <span className={isOverdue ? 'text-rose-600 font-black' : 'text-slate-600'}>
                            {fmtDate(inv.due_date)}
                            {isOverdue && <span className="ml-1 text-[9px] font-black text-rose-500">({daysOD}d overdue)</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{fmt(inv.total_amount)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{fmt(inv.amount_paid)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-black ${Number(inv.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {fmt(inv.balance)}
                        </td>
                        <td className="px-3 py-2.5 text-center">{statusBadge(isOverdue ? 'Overdue' : inv.status)}</td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status !== 'Paid' && inv.status !== 'Voided' && (
                              <button
                                onClick={() => {
                                  setPayForm({
                                    ...freshPayment(),
                                    supplier_id: String(inv.supplier_id),
                                    invoice_id: String(inv.id),
                                    amount: String(inv.balance || inv.total_amount),
                                  });
                                  setShowPaymentModal(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 rounded-xl shadow-xs"
                              >
                                💳 Settle
                              </button>
                            )}
                            {inv.status !== 'Paid' && (
                              <button
                                onClick={() => voidInvoice(inv)}
                                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                                title="Void invoice"
                              >
                                Void
                              </button>
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
          {filteredInvoices.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center text-xs font-bold gap-3">
              <span className="text-slate-500">{filteredInvoices.length} supplier invoices</span>
              <div className="flex items-center gap-6">
                <span className="text-slate-800">Total Billed: {fmt(filteredInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0))}</span>
                <span className="text-emerald-700">Settled: {fmt(filteredInvoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0))}</span>
                <span className="text-rose-600 font-black">Outstanding Balance: {fmt(filteredInvoices.reduce((s, i) => s + Number(i.balance || 0), 0))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 3: PAYMENT VOUCHERS & DISBURSEMENTS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'payments' && (
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-xs min-w-[850px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[10px] font-extrabold uppercase">
                  <th className="px-3.5 py-3 text-left w-12">#</th>
                  <th className="px-3 py-3 text-left">Voucher #</th>
                  <th className="px-3 py-3 text-left">Disbursement Date</th>
                  <th className="px-3.5 py-3 text-left">Supplier Beneficiary</th>
                  <th className="px-3 py-3 text-left">Linked Invoice</th>
                  <th className="px-3 py-3 text-right">Amount (KES)</th>
                  <th className="px-3 py-3 text-center">Payment Method</th>
                  <th className="px-3 py-3 text-left">Reference / Cheque #</th>
                  <th className="px-3 py-3 text-left">Bank Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <FiDollarSign size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-bold">No payment vouchers recorded</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, idx) => {
                    const sup = getSupplier(p.supplier_id);
                    const inv = p.invoice_id ? invoices.find((iv) => iv.id === p.invoice_id) : null;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-indigo-700">{p.payment_number || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600">{fmtDate(p.payment_date)}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{sup?.supplier_name || 'Vendor'}</td>
                        <td className="px-3 py-2.5 font-mono text-indigo-600">{inv?.invoice_number || 'Direct Payment'}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-700">{fmt(p.amount)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{p.reference_number || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500">{p.bank_name || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredPayments.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs font-bold">
              <span className="text-slate-500">{filteredPayments.length} payment vouchers issued</span>
              <span className="text-emerald-700 text-sm">
                Total Disbursements Settled: {fmt(filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 4: SUPPLIER ACCOUNTS & CREDITOR AGING
      ══════════════════════════════════════════════════════════ */}
      {tab === 'statements' && (
        <div className="space-y-4 min-w-0">
          {suppliers.map((sup) => {
            const { supOrders, supInvoices, supPayments, totalInvoiced, totalPaid: tPaid, balance, aging } = getSupplierStatement(sup.id);
            const isCreditor = balance > 0;

            return (
              <div
                key={sup.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-800 to-indigo-900 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                      {sup.supplier_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900 tracking-tight">{sup.supplier_name}</span>
                        {statusBadge(sup.status)}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {sup.phone || 'No Phone'} • KRA PIN: {sup.kra_pin || '—'} • Terms: {sup.payment_terms || 'Net 30'} • Category: {sup.category || 'General'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <div className="text-[9px] font-extrabold uppercase text-slate-400">LPOs Issued</div>
                      <div className="text-sm font-black text-sky-700">{supOrders.length}</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <div className="text-[9px] font-extrabold uppercase text-slate-400">Total Invoiced</div>
                      <div className="text-sm font-black text-slate-800">{fmt(totalInvoiced)}</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <div className="text-[9px] font-extrabold uppercase text-slate-400">Disbursed</div>
                      <div className="text-sm font-black text-emerald-700">{fmt(tPaid)}</div>
                    </div>
                    <div
                      className={`text-center px-3.5 py-1.5 rounded-xl border ${
                        isCreditor ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="text-[9px] font-black uppercase">Net Outstanding</div>
                      <div className="text-base font-black">{fmt(balance)}</div>
                    </div>
                    {isCreditor && (
                      <button
                        onClick={() => {
                          setPayForm({
                            ...freshPayment(),
                            supplier_id: String(sup.id),
                            amount: String(balance),
                          });
                          setShowPaymentModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 rounded-xl shadow-xs"
                      >
                        💳 Pay Balance
                      </button>
                    )}
                    <button
                      onClick={() => printStatement(sup)}
                      className="p-2 rounded-xl text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition"
                      title="Print official statement"
                    >
                      <FiPrinter size={14} />
                    </button>
                  </div>
                </div>

                {/* 4-Tier Aging Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 border-b border-slate-200 text-center">
                  <div className="p-3 bg-sky-50/50">
                    <div className="text-[9px] font-extrabold text-sky-800 uppercase">Current (0–30 Days)</div>
                    <div className="text-sm font-black text-sky-900 mt-0.5">{fmt(aging.current)}</div>
                  </div>
                  <div className="p-3 bg-amber-50/50">
                    <div className="text-[9px] font-extrabold text-amber-800 uppercase">31–60 Days</div>
                    <div className="text-sm font-black text-amber-900 mt-0.5">{fmt(aging.d30)}</div>
                  </div>
                  <div className="p-3 bg-orange-50/50">
                    <div className="text-[9px] font-extrabold text-orange-800 uppercase">61–90 Days</div>
                    <div className="text-sm font-black text-orange-900 mt-0.5">{fmt(aging.d60)}</div>
                  </div>
                  <div className="p-3 bg-rose-50/50">
                    <div className="text-[9px] font-extrabold text-rose-800 uppercase">90+ Days Overdue</div>
                    <div className="text-sm font-black text-rose-900 mt-0.5">{fmt(aging.d90plus)}</div>
                  </div>
                </div>

                {/* Mini Invoices Table */}
                {supInvoices.length > 0 && (
                  <div className="w-full min-w-0 overflow-x-auto p-4 bg-slate-50/30">
                    <table className="w-full text-xs min-w-[700px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase border-b border-slate-200">
                          <th className="px-3 py-2 text-left">Invoice #</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Due Date</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-right">Settled</th>
                          <th className="px-3 py-2 text-right">Balance Due</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supInvoices.map((inv) => {
                          const isOverdue = inv.status !== 'Paid' && inv.due_date && new Date(inv.due_date) < new Date();
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono font-bold text-indigo-700">{inv.invoice_number}</td>
                              <td className="px-3 py-2 text-slate-500">{fmtDate(inv.invoice_date)}</td>
                              <td className={`px-3 py-2 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{fmtDate(inv.due_date)}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{fmt(inv.total_amount)}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{fmt(inv.amount_paid)}</td>
                              <td className={`px-3 py-2 text-right font-mono font-black ${Number(inv.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {fmt(inv.balance)}
                              </td>
                              <td className="px-3 py-2 text-center">{statusBadge(isOverdue ? 'Overdue' : inv.status)}</td>
                              <td className="px-3 py-2 text-right">
                                {inv.status !== 'Paid' && (
                                  <button
                                    onClick={() => {
                                      setPayForm({
                                        ...freshPayment(),
                                        supplier_id: String(sup.id),
                                        invoice_id: String(inv.id),
                                        amount: String(inv.balance || inv.total_amount),
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                  >
                                    Pay
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
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 5: VETTED VENDOR REGISTER & RATINGS
      ══════════════════════════════════════════════════════════ */}
      {tab === 'suppliers' && (
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full text-xs min-w-[950px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[10px] font-extrabold uppercase">
                  <th className="px-3.5 py-3 text-left w-12">#</th>
                  <th className="px-3.5 py-3 text-left">Supplier Identity</th>
                  <th className="px-3 py-3 text-left">Contact Person</th>
                  <th className="px-3 py-3 text-left">Phone & Email</th>
                  <th className="px-3 py-3 text-left">KRA PIN</th>
                  <th className="px-3 py-3 text-left">Category</th>
                  <th className="px-3 py-3 text-left">Payment Terms</th>
                  <th className="px-3 py-3 text-center">Quality Rating</th>
                  <th className="px-3 py-3 text-right">Total Invoiced</th>
                  <th className="px-3 py-3 text-right">Balance Due</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      <FiTruck size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-bold">No suppliers registered</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s, idx) => {
                    const st = getSupplierStatement(s.id);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-800 to-indigo-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {s.supplier_name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{s.supplier_name}</div>
                              <div className="text-[10px] text-slate-400">{s.bank_name || 'No Bank Recorded'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 font-medium">{s.contact_person || '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="text-slate-800 font-medium">{s.phone || '—'}</div>
                          <div className="text-[10px] text-sky-600">{s.email || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{s.kra_pin || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {s.category || 'General'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{s.payment_terms || 'Net 30'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="inline-flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => updateSupplierRating(s.id, star)}
                                className="text-amber-400 hover:scale-125 transition-transform"
                                title={`Rate ${star} Stars`}
                              >
                                <FiStar
                                  size={11}
                                  className={star <= (s.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                />
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">{fmt(st.totalInvoiced)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-black ${st.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {fmt(st.balance)}
                        </td>
                        <td className="px-3 py-2.5 text-center">{statusBadge(s.status)}</td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingSupplier(s);
                                setSupForm({ ...emptySupplier, ...s });
                                setShowSupplierModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-slate-100"
                              title="Edit Supplier"
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              onClick={() => printStatement(s)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                              title="Print Statement"
                            >
                              <FiPrinter size={13} />
                            </button>
                            {s.phone && (
                              <a
                                href={`https://wa.me/254${s.phone.replace(/^0/, '').replace(/\s+/g, '')}?text=${encodeURIComponent(
                                  `Hello ${s.supplier_name}, this is St. Catherine Girl's School Tegat Procurement Office.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                                title="WhatsApp Supplier"
                              >
                                <FiPhone size={13} />
                              </a>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 6: PPADA 3-BIDS & COMPARATIVE EVALUATION
      ══════════════════════════════════════════════════════════ */}
      {tab === 'tenders' && (
        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FiAward className="text-amber-500" /> PPADA 3-Bid Comparative Analysis Engine
                </h3>
                <p className="text-xs text-slate-500">
                  Compliant with Public Procurement and Asset Disposal Act (PPADA Section 106 - Request for Quotations)
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Threshold: KES 50,000 – KES 1,000,000
              </span>
            </div>

            {/* Requisition Item Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className={lblCls}>Item / Requisition Scope</label>
                <input
                  value={tenderItem}
                  onChange={(e) => setTenderItem(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={lblCls}>Requisition Quantity</label>
                <input
                  type="number"
                  value={tenderQty}
                  onChange={(e) => setTenderQty(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* 3 Quotations Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {[
                { bid: bid1, setBid: setBid1, num: '1', title: 'Quotation A' },
                { bid: bid2, setBid: setBid2, num: '2', title: 'Quotation B' },
                { bid: bid3, setBid: setBid3, num: '3', title: 'Quotation C' },
              ].map(({ bid, setBid, num, title }) => {
                const total = bid.unitPrice * tenderQty;
                const isLowest = total <= (bid1.unitPrice * tenderQty) && total <= (bid2.unitPrice * tenderQty) && total <= (bid3.unitPrice * tenderQty);

                return (
                  <div
                    key={num}
                    className={`rounded-2xl border p-4 space-y-3 relative transition-all ${
                      isLowest
                        ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {isLowest && (
                      <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-600 text-white shadow-xs">
                        Recommended Bidder (Lowest Responsive)
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400">{title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        Bidder #{num}
                      </span>
                    </div>

                    <div>
                      <label className={lblCls}>Bidder / Supplier Name</label>
                      <input
                        value={bid.name}
                        onChange={(e) => setBid({ ...bid, name: e.target.value })}
                        className={inputCls}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={lblCls}>Unit Price (KES)</label>
                        <input
                          type="number"
                          value={bid.unitPrice}
                          onChange={(e) => setBid({ ...bid, unitPrice: Number(e.target.value) })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={lblCls}>Warranty / Terms</label>
                        <input
                          value={bid.warranty}
                          onChange={(e) => setBid({ ...bid, warranty: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Evaluated Total:</span>
                        <div className="text-base font-black text-slate-900">{fmt(total)}</div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bid.compliant}
                          onChange={(e) => setBid({ ...bid, compliant: e.target.checked })}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        PPADA Compliant
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Evaluation Recommendation Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                  Procurement Committee Determination
                </span>
                <div className="text-sm font-extrabold mt-0.5">
                  Recommendation: Award contract to{' '}
                  <span className="text-emerald-400 underline font-black">
                    {[bid1, bid2, bid3].sort((a, b) => a.unitPrice - b.unitPrice)[0].name}
                  </span>{' '}
                  at {fmt([bid1, bid2, bid3].sort((a, b) => a.unitPrice - b.unitPrice)[0].unitPrice * tenderQty)}
                </div>
              </div>
              <button
                onClick={() => {
                  const winner = [bid1, bid2, bid3].sort((a, b) => a.unitPrice - b.unitPrice)[0];
                  setPoForm({
                    ...emptyPO,
                    category: 'Food & Kitchen',
                    notes: `Awarded via PPADA 3-Bid evaluation: ${winner.name} (${tenderItem})`,
                    items: [{ item_description: tenderItem, quantity: tenderQty, unit: 'Pieces', unit_price: winner.unitPrice }]
                  });
                  setShowPOModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-slate-900 bg-white hover:bg-sky-50 transition shadow-md shrink-0"
              >
                Draft LPO for Lowest Bidder →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 7: SPEND ANALYTICS & VELOCITY
      ══════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4 min-w-0">
          {/* Category Spend Distribution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-sky-600" /> Procurement Spend by Category
            </h3>
            <div className="space-y-3">
              {categorySpend.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No expenditure recorded yet</p>
              ) : (
                categorySpend.map(([cat, val], idx) => {
                  const pct = totalOrderValue > 0 ? (val / totalOrderValue) * 100 : 0;
                  const palette = ['#0284c7', '#4f46e5', '#059669', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#475569'];
                  const color = palette[idx % palette.length];

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{cat}</span>
                        <span className="font-mono font-black text-slate-900">{fmt(val)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Monthly Payment Velocity */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-emerald-600" /> Monthly Disbursements Flow (Last 12 Months)
            </h3>
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-[500px] flex items-end gap-3 h-48 pt-6 pb-2 border-b border-slate-200">
                {monthlySpend.length === 0 ? (
                  <p className="text-xs text-slate-400 m-auto">No disbursement history</p>
                ) : (
                  monthlySpend.map(([mo, val]) => {
                    const maxVal = Math.max(...monthlySpend.map(([, v]) => v), 1);
                    const hPct = Math.max(12, (val / maxVal) * 100);

                    return (
                      <div key={mo} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          {fmtShort(val)}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all group-hover:opacity-90"
                          style={{ height: `${hPct}%` }}
                        />
                        <span className="text-[10px] font-bold text-slate-600 truncate mt-1">{mo}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 8: BoM PROCUREMENT DOSSIER (PRINT READY)
      ══════════════════════════════════════════════════════════ */}
      {tab === 'dossier' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
            <div>
              <div className="text-xl font-black text-slate-900 uppercase">
                {schoolInfo?.school_name || "ST. CATHERINE GIRL'S SCHOOL TEGAT"}
              </div>
              <div className="text-xs text-slate-500">
                Board of Management (BoM) · Statutory Procurement Audit Dossier
              </div>
              <div className="text-[11px] text-slate-400">
                MoE Reg: 2566 · Financial Year 2026/2027 · Generated: {fmtDateTime(new Date().toISOString())}
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 transition self-start sm:self-auto shadow-md"
            >
              <FiPrinter size={13} /> Print Executive Dossier
            </button>
          </div>

          {/* Dossier Financial Audit Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Commitments (LPO)</div>
              <div className="text-lg font-black text-slate-900 mt-1">{fmt(totalOrderValue)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{orders.length} approved orders</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Goods Received (Stores)</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{fmt(deliveredOrderValue)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Physical store fulfillment</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Disbursed Settlements</div>
              <div className="text-lg font-black text-sky-700 mt-1">{fmt(totalPaid)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{payments.length} audited payment vouchers</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Creditor Liabilities</div>
              <div className="text-lg font-black text-rose-600 mt-1">{fmt(totalOwed)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Accounts payable due</div>
            </div>
          </div>

          {/* Major Suppliers Ledger */}
          <div className="space-y-2">
            <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Primary Supplier Ledger & Compliance Standing
            </div>
            <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">
                    <th className="px-3 py-2 text-left">Vendor Name</th>
                    <th className="px-3 py-2 text-left">KRA PIN</th>
                    <th className="px-3 py-2 text-center">LPOs Issued</th>
                    <th className="px-3 py-2 text-right">Invoiced (KES)</th>
                    <th className="px-3 py-2 text-right">Settled (KES)</th>
                    <th className="px-3 py-2 text-right">Balance Due (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => {
                    const st = getSupplierStatement(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="px-3 py-2 font-bold text-slate-900">{s.supplier_name}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{s.kra_pin || '—'}</td>
                        <td className="px-3 py-2 text-center font-bold text-sky-700">{st.supOrders.length}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-800">{fmt(st.totalInvoiced)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700">{fmt(st.totalPaid)}</td>
                        <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{fmt(st.balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Certification Block */}
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <div className="text-xs font-bold text-slate-800 mt-2">Bursar / Accounts Clerk</div>
              <div className="text-[10px] text-slate-400">Financial Verification</div>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <div className="text-xs font-bold text-slate-800 mt-2">Principal / Accounting Officer</div>
              <div className="text-[10px] text-slate-400">Authorization & Internal Audit</div>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400"></div>
              <div className="text-xs font-bold text-slate-800 mt-2">Chairperson, BoM Tender Committee</div>
              <div className="text-[10px] text-slate-400">Board Governance Oversight</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         MODAL: ADD / EDIT SUPPLIER
      ══════════════════════════════════════════════════════════ */}
      {showSupplierModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowSupplierModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-sky-900 to-indigo-900 text-white">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FiTruck /> {editingSupplier ? 'Edit Supplier Profile' : 'Register New Vendor'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-white/70 hover:text-white">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={lblCls}>Supplier / Business Name *</label>
                <input
                  value={supForm.supplier_name}
                  onChange={(e) => setSupForm({ ...supForm, supplier_name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Apex Hardware & Timber"
                />
              </div>
              <div>
                <label className={lblCls}>Contact Person</label>
                <input
                  value={supForm.contact_person}
                  onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. John Koech"
                />
              </div>
              <div>
                <label className={lblCls}>Phone Number</label>
                <input
                  value={supForm.phone}
                  onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                  className={inputCls}
                  placeholder="0720 000 000"
                />
              </div>
              <div>
                <label className={lblCls}>Email Address</label>
                <input
                  value={supForm.email}
                  onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                  className={inputCls}
                  placeholder="info@vendor.co.ke"
                />
              </div>
              <div>
                <label className={lblCls}>KRA PIN</label>
                <input
                  value={supForm.kra_pin}
                  onChange={(e) => setSupForm({ ...supForm, kra_pin: e.target.value })}
                  className={inputCls}
                  placeholder="P051234567Z"
                />
              </div>
              <div>
                <label className={lblCls}>Bank Name</label>
                <input
                  value={supForm.bank_name}
                  onChange={(e) => setSupForm({ ...supForm, bank_name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. KCB Bank"
                />
              </div>
              <div>
                <label className={lblCls}>Account Number</label>
                <input
                  value={supForm.bank_account}
                  onChange={(e) => setSupForm({ ...supForm, bank_account: e.target.value })}
                  className={inputCls}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className={lblCls}>Bank Branch</label>
                <input
                  value={supForm.bank_branch}
                  onChange={(e) => setSupForm({ ...supForm, bank_branch: e.target.value })}
                  className={inputCls}
                  placeholder="Bomet Branch"
                />
              </div>
              <div>
                <label className={lblCls}>Category</label>
                <select
                  value={supForm.category}
                  onChange={(e) => setSupForm({ ...supForm, category: e.target.value })}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lblCls}>Payment Terms</label>
                <select
                  value={supForm.payment_terms}
                  onChange={(e) => setSupForm({ ...supForm, payment_terms: e.target.value })}
                  className={inputCls}
                >
                  {PAY_TERMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lblCls}>Status</label>
                <select
                  value={supForm.status}
                  onChange={(e) => setSupForm({ ...supForm, status: e.target.value })}
                  className={inputCls}
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Physical Postal Address</label>
                <textarea
                  value={supForm.address}
                  onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                  className={inputCls}
                  rows={2}
                  placeholder="P.O. Box ... Town"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={saveSupplier}
                disabled={saving}
                className="px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         MODAL: CREATE LOCAL PURCHASE ORDER (LPO)
      ══════════════════════════════════════════════════════════ */}
      {showPOModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowPOModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-sky-900 to-indigo-900 text-white">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FiShoppingCart /> Issue Local Purchase Order (LPO)
              </h3>
              <button onClick={() => setShowPOModal(false)} className="text-white/70 hover:text-white">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className={lblCls}>Select Supplier *</label>
                  <select
                    value={poForm.supplier_id}
                    onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select Vendor…</option>
                    {suppliers.filter((s) => s.status === 'Active').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplier_name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lblCls}>Order Date</label>
                  <input
                    type="date"
                    value={poForm.order_date}
                    onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={lblCls}>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poForm.delivery_date}
                    onChange={(e) => setPoForm({ ...poForm, delivery_date: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={lblCls}>Payment Terms</label>
                  <select
                    value={poForm.payment_terms}
                    onChange={(e) => setPoForm({ ...poForm, payment_terms: e.target.value })}
                    className={inputCls}
                  >
                    {PAY_TERMS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lblCls}>Category</label>
                  <select
                    value={poForm.category}
                    onChange={(e) => setPoForm({ ...poForm, category: e.target.value })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Order Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lblCls}>Line Items Requisition *</label>
                  <button
                    onClick={addItem}
                    className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                  >
                    <FiPlus size={12} /> Add Another Item
                  </button>
                </div>

                <div className="space-y-2">
                  {poForm.items.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                    >
                      {/* Searchable Store Item Lookup */}
                      <div className="col-span-12 sm:col-span-5 relative">
                        <input
                          value={itemSearches[idx] ?? it.item_description}
                          onChange={(e) => {
                            const v = e.target.value;
                            setItemSearches((s) => {
                              const a = [...s];
                              a[idx] = v;
                              return a;
                            });
                            updateItem(idx, 'item_description', v);
                            setItemDropdownOpen(idx);
                          }}
                          onFocus={() => setItemDropdownOpen(idx)}
                          onBlur={() => setTimeout(() => setItemDropdownOpen(null), 250)}
                          className={inputCls}
                          placeholder="Search registered store item…"
                          autoComplete="off"
                        />
                        {itemDropdownOpen === idx && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                            {storeItems.filter((s) =>
                              !itemSearches[idx] ||
                              s.item_name.toLowerCase().includes((itemSearches[idx] || '').toLowerCase()) ||
                              (s.item_code || '').toLowerCase().includes((itemSearches[idx] || '').toLowerCase())
                            ).length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">No matches in store</div>
                            ) : (
                              storeItems.filter((s) =>
                                !itemSearches[idx] ||
                                s.item_name.toLowerCase().includes((itemSearches[idx] || '').toLowerCase()) ||
                                (s.item_code || '').toLowerCase().includes((itemSearches[idx] || '').toLowerCase())
                              ).map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={() => {
                                    updateItem(idx, 'item_description', s.item_name);
                                    updateItem(idx, 'unit', s.unit || 'Pieces');
                                    updateItem(idx, 'unit_price', s.unit_price || 0);
                                    setItemSearches((a) => {
                                      const n = [...a];
                                      n[idx] = s.item_name;
                                      return n;
                                    });
                                    setItemDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 border-b last:border-0 border-slate-100 flex items-center justify-between gap-2"
                                >
                                  <span className="font-bold text-slate-800">{s.item_name}</span>
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    {s.item_code} • {s.unit} • KES {Number(s.unit_price || 0).toLocaleString()}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className={inputCls}
                          min="1"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          value={it.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className={inputCls}
                        >
                          {UNITS.map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          className={inputCls}
                          min="0"
                          step="0.01"
                          placeholder="Price"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {poForm.items.length > 1 && (
                          <button
                            onClick={() => removeItem(idx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 transition"
                          >
                            <FiX size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals & VAT Preview */}
                <div className="mt-3 p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex flex-wrap justify-end gap-6 text-xs font-bold text-slate-700">
                  <span>Subtotal: {fmt(poSubtotal)}</span>
                  <span className="text-sky-800">VAT (16%): {fmt(poVAT)}</span>
                  <span className="text-sm font-black text-indigo-900">Grand Total: {fmt(poSubtotal + poVAT)}</span>
                </div>
              </div>

              <div>
                <label className={lblCls}>Order Notes / Instructions</label>
                <textarea
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className={inputCls}
                  rows={2}
                  placeholder="e.g. Deliver to School Central Store Room A by 10 AM"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowPOModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={savePO}
                disabled={saving}
                className="px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Creating LPO…' : '✅ Issue Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         MODAL: RECORD SUPPLIER INVOICE
      ══════════════════════════════════════════════════════════ */}
      {showInvoiceModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-amber-600 to-amber-700 text-white">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FiFileText /> Record Supplier Invoice
              </h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-white/70 hover:text-white">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lblCls}>Internal Invoice # *</label>
                <input
                  value={invForm.invoice_number}
                  onChange={(e) => setInvForm({ ...invForm, invoice_number: e.target.value })}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={lblCls}>Supplier Invoice Ref</label>
                <input
                  value={invForm.supplier_invoice_ref}
                  onChange={(e) => setInvForm({ ...invForm, supplier_invoice_ref: e.target.value })}
                  className={`${inputCls} font-mono`}
                  placeholder="Vendor's receipt/tax invoice #"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Supplier Name *</label>
                <select
                  value={invForm.supplier_id}
                  onChange={(e) => setInvForm({ ...invForm, supplier_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select Vendor…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Link to LPO (Optional)</label>
                <select
                  value={invForm.po_id}
                  onChange={(e) => onSelectPO(e.target.value)}
                  className={inputCls}
                >
                  <option value="">No linked LPO</option>
                  {orders.filter((o) => o.status !== 'Cancelled').map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.po_number} — {getSupplier(o.supplier_id)?.supplier_name} ({fmt(o.grand_total)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lblCls}>Invoice Date</label>
                <input
                  type="date"
                  value={invForm.invoice_date}
                  onChange={(e) => setInvForm({ ...invForm, invoice_date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={lblCls}>Due Date</label>
                <input
                  type="date"
                  value={invForm.due_date}
                  onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={lblCls}>Subtotal (KES)</label>
                <input
                  type="number"
                  value={invForm.subtotal}
                  onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })}
                  className={inputCls}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className={lblCls}>VAT Amount (KES)</label>
                <input
                  type="number"
                  value={invForm.vat_amount}
                  onChange={(e) => setInvForm({ ...invForm, vat_amount: e.target.value })}
                  className={inputCls}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Total Payable Amount (KES) *</label>
                <input
                  type="number"
                  value={invForm.total_amount}
                  onChange={(e) => setInvForm({ ...invForm, total_amount: e.target.value })}
                  className={`${inputCls} text-sm font-black text-amber-800`}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Description / Notes</label>
                <input
                  value={invForm.description}
                  onChange={(e) => setInvForm({ ...invForm, description: e.target.value })}
                  className={inputCls}
                  placeholder="Brief note on delivered provisions"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={saveInvoice}
                disabled={saving}
                className="px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md bg-gradient-to-r from-amber-600 to-amber-700 hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Recording…' : '🧾 Record Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         MODAL: RECORD SUPPLIER PAYMENT
      ══════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FiDollarSign /> Settle Supplier Payment Voucher
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-white/70 hover:text-white">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lblCls}>Payment Voucher #</label>
                <input
                  value={payForm.payment_number}
                  onChange={(e) => setPayForm({ ...payForm, payment_number: e.target.value })}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={lblCls}>Disbursement Date</label>
                <input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Supplier Beneficiary *</label>
                <select
                  value={payForm.supplier_id}
                  onChange={(e) => setPayForm({ ...payForm, supplier_id: e.target.value, invoice_id: '' })}
                  className={inputCls}
                >
                  <option value="">Select Vendor…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Link to Outstanding Invoice (Optional)</label>
                <select
                  value={payForm.invoice_id}
                  onChange={(e) => {
                    const invId = e.target.value;
                    const matched = invoices.find((i) => String(i.id) === invId);
                    setPayForm({
                      ...payForm,
                      invoice_id: invId,
                      amount: matched ? String(matched.balance || '') : payForm.amount,
                    });
                  }}
                  className={inputCls}
                >
                  <option value="">No linked invoice (Direct payment)</option>
                  {invoices
                    .filter((i) => String(i.supplier_id) === payForm.supplier_id && i.status !== 'Paid' && i.status !== 'Voided')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoice_number} — Due Balance: {fmt(i.balance)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Payment Amount (KES) *</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className={`${inputCls} text-sm font-black text-emerald-800`}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={lblCls}>Payment Method</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  className={inputCls}
                >
                  {PAY_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={lblCls}>Cheque / Bank Reference #</label>
                <input
                  value={payForm.reference_number}
                  onChange={(e) => setPayForm({ ...payForm, reference_number: e.target.value })}
                  className={`${inputCls} font-mono`}
                  placeholder="e.g. CHQ-99120"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Bank / Disbursement Account</label>
                <input
                  value={payForm.bank_name}
                  onChange={(e) => setPayForm({ ...payForm, bank_name: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. KCB Operations Account"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={lblCls}>Disbursement Notes</label>
                <input
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Settlement for Term 1 maize delivery"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={savePayment}
                disabled={saving}
                className="px-6 py-2 text-xs font-bold text-white rounded-xl shadow-md bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Recording…' : '✅ Disburse Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
