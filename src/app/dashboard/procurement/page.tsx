'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiTruck, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiX, FiSave,
    FiDownload, FiCheck, FiStar, FiFileText, FiDollarSign,
    FiShoppingCart, FiAlertTriangle, FiPrinter, FiEye,
    FiClock, FiCheckCircle, FiXCircle, FiArrowRight, FiCopy,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const CATEGORIES = ['General', 'Stationery', 'Food & Kitchen', 'Cleaning', 'Laboratory', 'Uniforms', 'Construction', 'IT & Electronics', 'Fuel & Energy', 'Medical', 'Furniture', 'Transport', 'Textbooks', 'Sports'];
const UNITS = ['Pieces', 'Reams', 'Boxes', 'Kg', 'Litres', 'Metres', 'Pairs', 'Sets', 'Cartons', 'Bags', 'Rolls', 'Packets'];
const PAY_METHODS = ['Bank Transfer', 'Cheque', 'Cash', 'M-Pesa', 'RTGS', 'EFT'];
type Tab = 'suppliers' | 'orders' | 'invoices' | 'payments' | 'statements';

/* ─── auto-number helpers ─────────────────────────── */
const genPONumber = (count: number) => `LPO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
const genINVNumber = (count: number) => `SINV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
const genPAYNumber = (count: number) => `PV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

export default function ProcurementPage() {
    const [tab, setTab] = useState<Tab>('orders');
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [poItems, setPoItems] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [printingPO, setPrintingPO] = useState<any>(null);
    const [printingInv, setPrintingInv] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Modals
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showPOModal, setShowPOModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showViewPO, setShowViewPO] = useState<any>(null);
    const [editing, setEditing] = useState<any>(null);

    // Forms
    const emptySupplier = { supplier_name: '', contact_person: '', phone: '', email: '', kra_pin: '', bank_name: '', bank_account: '', bank_branch: '', address: '', category: 'General', payment_terms: 'Net 30', notes: '', status: 'Active' };
    const emptyPO = { supplier_id: '', order_date: new Date().toISOString().split('T')[0], delivery_date: '', payment_terms: 'Net 30', category: 'General', notes: '', items: [{ item_description: '', quantity: 1, unit: 'Pieces', unit_price: 0 }] };
    const freshInvoice = () => ({ invoice_number: genINVNumber(invoices.length), supplier_id: '', po_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', subtotal: '', vat_amount: '0', total_amount: '', category: 'General', description: '', notes: '' });
    const freshPayment = () => ({ payment_number: genPAYNumber(payments.length), supplier_id: '', invoice_id: '', payment_date: new Date().toISOString().split('T')[0], amount: '', payment_method: 'Bank Transfer', reference_number: '', notes: '' });

    const [supForm, setSupForm] = useState(emptySupplier);
    const [poForm, setPoForm] = useState<any>(emptyPO);
    const [invForm, setInvForm] = useState<any>(freshInvoice());
    const [payForm, setPayForm] = useState<any>(freshPayment());

    /* ─── fetch ─────────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [sRes, oRes, piRes, iRes, pRes, scRes] = await Promise.all([
            supabase.from('school_suppliers').select('*').order('supplier_name'),
            supabase.from('school_purchase_orders').select('*').order('created_at', { ascending: false }),
            supabase.from('school_po_items').select('*'),
            supabase.from('school_supplier_invoices').select('*').order('created_at', { ascending: false }),
            supabase.from('school_supplier_payments').select('*').order('created_at', { ascending: false }),
            supabase.from('school_details').select('*').maybeSingle(),
        ]);
        setSuppliers(sRes.data || []);
        setOrders(oRes.data || []);
        setPoItems(piRes.data || []);
        setInvoices(iRes.data || []);
        setPayments(pRes.data || []);
        setSchoolInfo(scRes.data || {});
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ─── derived stats ─────────────────────────────── */
    const activeSuppliers = suppliers.filter(s => s.status === 'Active').length;
    const openOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length;
    const totalOrderValue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.grand_total || 0), 0);
    const unpaidInvoices = invoices.filter(i => !['Paid', 'Voided'].includes(i.status));
    const totalOwed = unpaidInvoices.reduce((s, i) => s + Number(i.balance || i.total_amount || 0), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const overdueInvoices = invoices.filter(i => i.status !== 'Paid' && i.due_date && new Date(i.due_date) < new Date());
    const getSupplier = (id: any) => suppliers.find(s => s.id === Number(id));

    /* ─── SUPPLIER save ─────────────────────────────── */
    const saveSupplier = async () => {
        if (!supForm.supplier_name.trim()) { toast.error('Supplier name required'); return; }
        setSaving(true);
        const { error } = editing
            ? await supabase.from('school_suppliers').update(supForm).eq('id', editing.id)
            : await supabase.from('school_suppliers').insert([supForm]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(editing ? 'Supplier updated ✅' : 'Supplier added ✅');
        setShowSupplierModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    /* ─── PO save ───────────────────────────────────── */
    const savePO = async () => {
        if (!poForm.supplier_id || poForm.items.filter((i: any) => i.item_description).length === 0) {
            toast.error('Select supplier and add at least one item'); return;
        }
        setSaving(true);
        const subtotal = poForm.items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
        const vat = Math.round(subtotal * 0.16 * 100) / 100;
        const grandTotal = Math.round((subtotal + vat) * 100) / 100;
        const poNumber = genPONumber(orders.length);

        const { data: po, error } = await supabase.from('school_purchase_orders').insert([{
            po_number: poNumber, supplier_id: Number(poForm.supplier_id),
            order_date: poForm.order_date, delivery_date: poForm.delivery_date || null,
            subtotal_amount: subtotal, vat_amount: vat, total_amount: subtotal,
            grand_total: grandTotal, payment_terms: poForm.payment_terms,
            category: poForm.category, notes: poForm.notes, status: 'Draft', created_by: 'Admin',
        }]).select().single();

        if (error || !po) { toast.error('Failed to create PO: ' + (error?.message || '')); setSaving(false); return; }

        const rows = poForm.items
            .filter((i: any) => i.item_description.trim())
            .map((i: any) => ({
                po_id: po.id, item_description: i.item_description,
                quantity: Number(i.quantity || 1), unit: i.unit || 'Pieces',
                unit_price: Number(i.unit_price || 0),
                total_price: Number(i.quantity || 1) * Number(i.unit_price || 0),
            }));
        if (rows.length > 0) await supabase.from('school_po_items').insert(rows);

        toast.success(`✅ ${poNumber} created!`);
        setShowPOModal(false); setPoForm(emptyPO); setSaving(false); fetchAll();
    };

    /* ─── LPO → auto-fill invoice ──────────────────── */
    const onSelectPO = (poId: string) => {
        const po = orders.find(o => String(o.id) === poId);
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

    /* ─── INVOICE save ──────────────────────────────── */
    const saveInvoice = async () => {
        if (!invForm.invoice_number || !invForm.supplier_id || !invForm.total_amount) {
            toast.error('Invoice #, supplier, and total amount are required'); return;
        }
        setSaving(true);
        // ✅ Duplicate invoice number check
        const { data: existing } = await supabase
            .from('school_supplier_invoices')
            .select('id, invoice_number')
            .eq('invoice_number', invForm.invoice_number)
            .maybeSingle();
        if (existing) {
            toast.error(`⚠️ Invoice ${invForm.invoice_number} already exists! Edit or void the existing one.`);
            setSaving(false); return;
        }
        // ✅ Duplicate PO check — prevent recording 2nd invoice for same LPO
        if (invForm.po_id) {
            const { data: poInv } = await supabase
                .from('school_supplier_invoices')
                .select('id, invoice_number')
                .eq('po_id', Number(invForm.po_id))
                .maybeSingle();
            if (poInv) {
                toast.error(`⚠️ LPO already has invoice ${poInv.invoice_number}. Edit that invoice instead.`);
                setSaving(false); return;
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
            total_amount: total, balance: total,
            amount_paid: 0, status: 'Pending',
            category: invForm.category,
            description: invForm.description,
            notes: invForm.notes, created_by: 'Admin',
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success('✅ Invoice recorded!');
        setShowInvoiceModal(false); setInvForm(freshInvoice()); setSaving(false); fetchAll();
    };

    /* ─── PAYMENT save ──────────────────────────────── */
    const savePayment = async () => {
        if (!payForm.supplier_id || !payForm.amount) { toast.error('Supplier and amount required'); return; }
        setSaving(true);
        const { error } = await supabase.from('school_supplier_payments').insert([{
            payment_number: payForm.payment_number,
            supplier_id: Number(payForm.supplier_id),
            invoice_id: payForm.invoice_id ? Number(payForm.invoice_id) : null,
            payment_date: payForm.payment_date, amount: Number(payForm.amount),
            payment_method: payForm.payment_method,
            reference_number: payForm.reference_number,
            notes: payForm.notes, created_by: 'Admin',
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        if (payForm.invoice_id) {
            const inv = invoices.find(i => i.id === Number(payForm.invoice_id));
            if (inv) {
                const newPaid = Number(inv.amount_paid || 0) + Number(payForm.amount);
                const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
                await supabase.from('school_supplier_invoices').update({
                    amount_paid: newPaid, balance: newBalance,
                    status: newBalance <= 0 ? 'Paid' : 'Partial',
                }).eq('id', inv.id);
            }
        }
        toast.success('✅ Payment recorded!');
        setShowPaymentModal(false); setPayForm(freshPayment()); setSaving(false); fetchAll();
    };

    /* ─── approvePO ─────────────────────────────────── */
    const approvePO = async (po: any) => {
        await supabase.from('school_purchase_orders').update({ status: 'Approved', approved_by: 'Admin', approved_at: new Date().toISOString() }).eq('id', po.id);
        toast.success(`${po.po_number} approved ✅`); fetchAll();
    };

    /* ─── PO line items helpers ─────────────────────── */
    const addItem = () => setPoForm((f: any) => ({ ...f, items: [...f.items, { item_description: '', quantity: 1, unit: 'Pieces', unit_price: 0 }] }));
    const removeItem = (idx: number) => setPoForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }));
    const updateItem = (idx: number, field: string, val: any) => setPoForm((f: any) => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: val }; return { ...f, items }; });
    const poSubtotal = poForm.items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
    const poVAT = Math.round(poSubtotal * 0.16 * 100) / 100;

    /* ─── PRINT LPO ─────────────────────────────────── */
    const printLPO = (po: any) => {
        const items = poItems.filter(i => i.po_id === po.id);
        const supplier = getSupplier(po.supplier_id);
        const content = `
<!DOCTYPE html><html><head><title>${po.po_number}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:24px;color:#1e293b;font-size:13px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1e40af;}
  .school-name{font-size:20px;font-weight:900;color:#1e40af;margin:0;}
  .school-sub{font-size:11px;color:#64748b;margin:2px 0;}
  .po-badge{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:12px 20px;border-radius:12px;text-align:right;}
  .po-badge .po-num{font-size:18px;font-weight:900;letter-spacing:1px;}
  .po-badge .po-label{font-size:10px;opacity:0.8;text-transform:uppercase;}
  .section{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
  .info-box h4{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;margin:0 0 8px;}
  .info-box p{margin:3px 0;font-size:12px;font-weight:600;}
  table{width:100%;border-collapse:collapse;margin:16px 0;}
  thead tr{background:#1e40af;color:#fff;}
  th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;}
  td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;}
  tr:nth-child(even) td{background:#f8fafc;}
  .total-row td{font-weight:900;border-top:2px solid #1e40af;background:#eff6ff!important;font-size:13px;}
  .grand-row td{font-weight:900;background:#1e40af!important;color:#fff!important;font-size:14px;}
  .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;text-align:center;}
  .sign-box{border-top:2px solid #334155;padding-top:8px;}
  .sign-label{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;}
  .approved{background:#dcfce7;color:#166534;}
  .draft{background:#fef9c3;color:#854d0e;}
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;font-weight:900;color:rgba(30,64,175,0.05);pointer-events:none;white-space:nowrap;}
  @media print{body{padding:0;}.watermark{display:block;}}
</style></head><body>
<div class="watermark">OFFICIAL LPO</div>
<div class="header">
  <div>
    <p class="school-name">${schoolInfo?.school_name || 'APSIMS School'}</p>
    <p class="school-sub">${schoolInfo?.address || ''}</p>
    <p class="school-sub">📞 ${schoolInfo?.phone || ''} · ✉️ ${schoolInfo?.email || ''}</p>
    <p class="school-sub">KRA PIN: ${schoolInfo?.kra_pin || 'N/A'} · NEMIS: ${schoolInfo?.nemis_code || 'N/A'}</p>
  </div>
  <div class="po-badge">
    <div class="po-label">Local Purchase Order</div>
    <div class="po-num">${po.po_number}</div>
    <div class="po-label" style="margin-top:4px">Status: <span class="badge ${po.status === 'Approved' ? 'approved' : 'draft'}">${po.status}</span></div>
  </div>
</div>

<div class="section">
  <div class="info-box">
    <h4>🏢 Supplier Details</h4>
    <p style="font-size:14px;color:#1e40af;font-weight:900;">${supplier?.supplier_name || '—'}</p>
    <p>👤 ${supplier?.contact_person || '—'}</p>
    <p>📞 ${supplier?.phone || '—'}</p>
    <p>✉️ ${supplier?.email || '—'}</p>
    <p>KRA PIN: ${supplier?.kra_pin || '—'}</p>
  </div>
  <div class="info-box">
    <h4>📋 Order Details</h4>
    <p><strong>Order Date:</strong> ${fmtDate(po.order_date)}</p>
    <p><strong>Delivery Date:</strong> ${fmtDate(po.delivery_date) || 'On Delivery'}</p>
    <p><strong>Payment Terms:</strong> ${po.payment_terms || 'Net 30'}</p>
    <p><strong>Category:</strong> ${po.category || 'General'}</p>
    <p><strong>Approved By:</strong> ${po.approved_by || 'Pending'}</p>
  </div>
</div>

<table>
  <thead><tr>
    <th>#</th><th>Description of Goods/Services</th><th>Qty</th><th>Unit</th>
    <th style="text-align:right">Unit Price (KES)</th><th style="text-align:right">Total (KES)</th>
  </tr></thead>
  <tbody>
    ${items.map((it, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${it.item_description}</td>
      <td style="text-align:center">${it.quantity}</td>
      <td>${it.unit || 'Pcs'}</td>
      <td style="text-align:right">${Number(it.unit_price || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      <td style="text-align:right;font-weight:700">${Number((it.total_price || it.quantity * it.unit_price) || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="total-row"><td colspan="5" style="text-align:right">Subtotal (excl. VAT)</td><td style="text-align:right">${Number(po.subtotal_amount || po.total_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>
    <tr class="total-row"><td colspan="5" style="text-align:right">VAT @ 16%</td><td style="text-align:right">${Number(po.vat_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>
    <tr class="grand-row"><td colspan="5" style="text-align:right">GRAND TOTAL</td><td style="text-align:right">${Number(po.grand_total || po.total_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>
  </tfoot>
</table>

${po.notes ? `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px;margin:8px 0;font-size:12px;"><strong>📝 Notes:</strong> ${po.notes}</div>` : ''}

<div class="footer">
  <div class="sign-box"><p class="sign-label">Prepared By</p><p style="font-size:10px;color:#64748b;margin-top:4px">${po.created_by || 'Admin'}</p></div>
  <div class="sign-box"><p class="sign-label">Approved By</p><p style="font-size:10px;color:#64748b;margin-top:4px">${po.approved_by || '_______________'}</p></div>
  <div class="sign-box"><p class="sign-label">Supplier Confirmation</p><p style="font-size:10px;color:#64748b;margin-top:4px">Stamp & Signature</p></div>
</div>

<p style="text-align:center;margin-top:24px;font-size:10px;color:#94a3b8;">Generated by APSIMS · ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
        const w = window.open('', '_blank');
        w?.document.write(content); w?.document.close();
    };

    /* ─── PRINT INVOICE ─────────────────────────────── */
    const printInvoice = (inv: any) => {
        const supplier = getSupplier(inv.supplier_id);
        const po = inv.po_id ? orders.find(o => o.id === inv.po_id) : null;
        const content = `
<!DOCTYPE html><html><head><title>${inv.invoice_number}</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:24px;color:#1e293b;font-size:13px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #d97706;}
  .school-name{font-size:20px;font-weight:900;color:#d97706;margin:0;}
  .inv-badge{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:12px 20px;border-radius:12px;text-align:right;}
  .inv-badge .inv-num{font-size:18px;font-weight:900;}
  .section{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
  .info-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;}
  .info-box h4{font-size:10px;text-transform:uppercase;color:#92400e;font-weight:700;margin:0 0 8px;}
  .info-box p{margin:3px 0;font-size:12px;font-weight:600;}
  .summary-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;}
  .grand-total{background:#d97706;color:#fff;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
  .grand-total .label{font-size:13px;font-weight:700;}
  .grand-total .amount{font-size:22px;font-weight:900;}
  .status-paid{background:#dcfce7;color:#166534;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;}
  .status-pending{background:#fef9c3;color:#854d0e;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;}
  .status-partial{background:#dbeafe;color:#1e40af;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;}
  .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:center;}
  .sign-box{border-top:2px solid #334155;padding-top:8px;}
  .sign-label{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;}
  @media print{body{padding:0;}}
</style></head><body>
<div class="header">
  <div>
    <p class="school-name">${schoolInfo?.school_name || 'APSIMS School'}</p>
    <p style="font-size:11px;color:#64748b;margin:2px 0">${schoolInfo?.address || ''}</p>
    <p style="font-size:11px;color:#64748b;margin:2px 0">📞 ${schoolInfo?.phone || ''} · ✉️ ${schoolInfo?.email || ''}</p>
  </div>
  <div class="inv-badge">
    <div style="font-size:10px;opacity:0.8;text-transform:uppercase;">Supplier Invoice Record</div>
    <div class="inv-num">${inv.invoice_number}</div>
    <div style="margin-top:4px"><span class="status-${inv.status.toLowerCase()}">${inv.status}</span></div>
  </div>
</div>

<div class="section">
  <div class="info-box">
    <h4>🏢 Supplier</h4>
    <p style="font-size:14px;color:#92400e;font-weight:900;">${supplier?.supplier_name || '—'}</p>
    <p>👤 ${supplier?.contact_person || '—'}</p>
    <p>📞 ${supplier?.phone || '—'}</p>
    <p>KRA PIN: ${supplier?.kra_pin || '—'}</p>
  </div>
  <div class="info-box">
    <h4>📋 Invoice Details</h4>
    <p><strong>Invoice Date:</strong> ${fmtDate(inv.invoice_date)}</p>
    <p><strong>Due Date:</strong> ${fmtDate(inv.due_date) || 'N/A'}</p>
    <p><strong>LPO Reference:</strong> ${po?.po_number || 'N/A'}</p>
    <p><strong>Category:</strong> ${inv.category || 'General'}</p>
    <p><strong>Description:</strong> ${inv.description || '—'}</p>
  </div>
</div>

<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
  <h4 style="font-size:10px;text-transform:uppercase;color:#64748b;margin:0 0 12px;">💰 Payment Summary</h4>
  <div class="summary-row"><span>Subtotal (excl. VAT)</span><span style="font-weight:700">${fmt(inv.subtotal || inv.total_amount)}</span></div>
  <div class="summary-row"><span>VAT (16%)</span><span style="font-weight:700">${fmt(inv.vat_amount)}</span></div>
  <div class="summary-row"><span>Total Invoice Amount</span><span style="font-weight:900;font-size:15px">${fmt(inv.total_amount)}</span></div>
  <div class="summary-row"><span>Amount Paid</span><span style="font-weight:700;color:#22c55e">${fmt(inv.amount_paid)}</span></div>
  <div class="grand-total">
    <span class="label">BALANCE DUE</span>
    <span class="amount">${fmt(inv.balance)}</span>
  </div>
</div>

${inv.notes ? `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px;margin:12px 0;font-size:12px;"><strong>📝 Notes:</strong> ${inv.notes}</div>` : ''}

<div class="footer">
  <div class="sign-box"><p class="sign-label">Received By</p><p style="font-size:10px;color:#64748b;margin-top:4px">${inv.created_by || '_______________'}</p></div>
  <div class="sign-box"><p class="sign-label">Authorized Signature</p><p style="font-size:10px;color:#64748b;margin-top:4px">Principal / Bursar</p></div>
</div>

<p style="text-align:center;margin-top:24px;font-size:10px;color:#94a3b8;">Generated by APSIMS · ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
        const w = window.open('', '_blank');
        w?.document.write(content); w?.document.close();
    };

    /* ─── STATUS helpers ────────────────────────────── */
    const statusColor: Record<string, string> = {
        Draft: 'bg-gray-100 text-gray-600', Approved: 'bg-blue-100 text-blue-700',
        Sent: 'bg-indigo-100 text-indigo-700', Partial: 'bg-amber-100 text-amber-700',
        Delivered: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700',
        Pending: 'bg-amber-100 text-amber-700', Paid: 'bg-green-100 text-green-700',
        Overdue: 'bg-red-100 text-red-700', Voided: 'bg-gray-100 text-gray-400',
    };

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-blue-200 outline-none transition";
    const tabs = [
        { k: 'orders', l: '📋 Purchase Orders', count: orders.length },
        { k: 'invoices', l: '🧾 Supplier Invoices', count: invoices.length },
        { k: 'payments', l: '💳 Payments', count: payments.length },
        { k: 'statements', l: '📊 Supplier Statements', count: suppliers.length },
        { k: 'suppliers', l: '🏢 Suppliers', count: suppliers.length },
    ];

    /* ─── per-supplier statement helper ─────────────── */
    const getSupplierStatement = (supplierId: number) => {
        const supOrders = orders.filter(o => o.supplier_id === supplierId && o.status !== 'Cancelled');
        const supInvoices = invoices.filter(i => i.supplier_id === supplierId);
        const supPayments = payments.filter(p => p.supplier_id === supplierId);
        const totalInvoiced = supInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const totalPaid = supPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const balance = totalInvoiced - totalPaid;
        return { supOrders, supInvoices, supPayments, totalInvoiced, totalPaid, balance };
    };

    const poHasInvoice = (poId: number) => invoices.find(i => i.po_id === poId);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>🏢</div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-blue-200 animate-ping opacity-30" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading Procurement…</p>
        </div>
    );

    return (
        <div className="space-y-5">

            {/* ════ PREMIUM HERO ════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0c4a6e 0%,#075985 40%,#0369a1 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#38bdf8,transparent)', transform: 'translate(30%,-30%)' }} />
                <div className="relative px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl p-3" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                <FiTruck className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    🏢 Procurement & Suppliers
                                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)' }}>ULTRA</span>
                                </h1>
                                <p className="text-blue-300 text-xs mt-0.5">Supplier Directory · LPOs · Invoices · Payments · Full Audit Trail</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => { setSupForm(emptySupplier); setEditing(null); setShowSupplierModal(true); }} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-500/80 hover:bg-blue-500 flex items-center gap-1.5 transition border border-blue-400/30">
                                <FiPlus size={12} /> Supplier
                            </button>
                            <button onClick={() => { setPoForm(emptyPO); setShowPOModal(true); }} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                                <FiShoppingCart size={12} /> New LPO
                            </button>
                            <button onClick={() => { setInvForm(freshInvoice()); setShowInvoiceModal(true); }} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                <FiFileText size={12} /> Record Invoice
                            </button>
                            <button onClick={() => { setPayForm(freshPayment()); setShowPaymentModal(true); }} className="px-3 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                <FiDollarSign size={12} /> Pay Supplier
                            </button>
                            <button onClick={fetchAll} className="p-2 rounded-xl text-white hover:bg-white/10 transition">
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-white/10">
                        {[
                            { label: 'Active Suppliers', value: activeSuppliers, icon: '🏢', color: '#3b82f6' },
                            { label: 'Open LPOs', value: openOrders, icon: '📋', color: '#06b6d4' },
                            { label: 'Order Value', value: fmt(totalOrderValue), icon: '🛒', color: '#8b5cf6' },
                            { label: 'Unpaid Invoices', value: unpaidInvoices.length, icon: '🧾', color: '#f59e0b', pulse: unpaidInvoices.length > 0 },
                            { label: 'Total Owed', value: fmt(totalOwed), icon: '⚠️', color: '#ef4444', pulse: totalOwed > 0 },
                            { label: 'Total Paid', value: fmt(totalPaid), icon: '✅', color: '#22c55e' },
                        ].map((card: any, i) => (
                            <div key={i} className={`rounded-xl p-3 transition-all hover:scale-[1.03] cursor-default ${card.pulse ? 'animate-pulse' : ''}`}
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-sm">{card.icon}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{card.label}</span>
                                </div>
                                <p className="text-lg font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overdue alert */}
            {overdueInvoices.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50">
                    <FiAlertTriangle className="text-red-500 flex-shrink-0" size={16} />
                    <p className="text-sm font-bold text-red-700">⚠️ {overdueInvoices.length} overdue invoice(s) — {fmt(overdueInvoices.reduce((s, i) => s + Number(i.balance || 0), 0))} outstanding</p>
                </div>
            )}

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
                    {tabs.map(t => (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                            style={tab === t.k
                                ? { background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(59,130,246,0.4)' }
                                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                            {t.l} <span className="text-[10px] font-bold opacity-60">({t.count})</span>
                        </button>
                    ))}
                </div>
                <div className="relative min-w-[260px]">
                    <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 outline-none bg-white" />
                </div>
            </div>

            {/* ════ PURCHASE ORDERS ════ */}
            {tab === 'orders' && (
                <div className="space-y-3">
                    {orders.filter(o => !search || o.po_number?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                            <span className="text-5xl block mb-3">📋</span>
                            <p className="text-sm font-bold text-gray-600">No Purchase Orders yet</p>
                            <button onClick={() => { setPoForm(emptyPO); setShowPOModal(true); }}
                                className="mt-4 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                                <FiPlus size={12} className="inline mr-1" /> Create First LPO
                            </button>
                        </div>
                    ) : orders.filter(o => !search || o.po_number?.toLowerCase().includes(search.toLowerCase())).map(po => {
                        const supplier = getSupplier(po.supplier_id);
                        const items = poItems.filter(i => i.po_id === po.id);
                        return (
                            <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>LPO</div>
                                        <div>
                                            <p className="text-sm font-extrabold text-gray-800">{po.po_number}</p>
                                            <p className="text-[10px] text-gray-400">{supplier?.supplier_name || 'Unknown'} · {fmtDate(po.order_date)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColor[po.status] || 'bg-gray-100 text-gray-600'}`}>{po.status}</span>
                                        <p className="text-lg font-black text-blue-600">{fmt(po.grand_total || po.total_amount)}</p>
                                        {po.status === 'Draft' && (
                                            <button onClick={() => approvePO(po)} className="px-3 py-1.5 text-[10px] font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-1 transition">
                                                <FiCheck size={10} /> Approve
                                            </button>
                                        )}
                                        <button onClick={() => printLPO(po)} className="px-3 py-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition">
                                            <FiPrinter size={10} /> Print LPO
                                        </button>
                                        {(() => {
                                            const existingInv = poHasInvoice(po.id);
                                            if (existingInv) {
                                                return (
                                                    <span className="px-3 py-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-center gap-1" title={`Invoice ${existingInv.invoice_number} already recorded`}>
                                                        <FiCheckCircle size={10} /> {existingInv.invoice_number}
                                                    </span>
                                                );
                                            }
                                            return (
                                                <button onClick={() => { setInvForm({ ...freshInvoice(), po_id: String(po.id), supplier_id: String(po.supplier_id), total_amount: String(po.grand_total || po.total_amount || ''), vat_amount: String(po.vat_amount || '0'), subtotal: String(po.subtotal_amount || po.total_amount || ''), description: `Invoice for ${po.po_number}` }); setShowInvoiceModal(true); }}
                                                    className="px-3 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition">
                                                    <FiArrowRight size={10} /> Record Invoice
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {items.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead><tr className="bg-gray-50">
                                                <th className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase text-left w-8">#</th>
                                                <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-left">Description</th>
                                                <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-20">Qty</th>
                                                <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-28">Unit Price</th>
                                                <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-right w-28">Total</th>
                                            </tr></thead>
                                            <tbody>
                                                {items.map((it, idx) => (
                                                    <tr key={it.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                                                        <td className="px-5 py-2 text-xs text-gray-400">{idx + 1}</td>
                                                        <td className="px-3 py-2 text-xs font-medium text-gray-700">{it.item_description}</td>
                                                        <td className="px-3 py-2 text-xs text-gray-500 text-right">{it.quantity} {it.unit}</td>
                                                        <td className="px-3 py-2 text-xs text-gray-500 text-right">{fmt(it.unit_price)}</td>
                                                        <td className="px-3 py-2 text-xs font-bold text-gray-800 text-right">{fmt(it.total_price || it.quantity * it.unit_price)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-blue-50 border-t-2 border-blue-200">
                                                    <td colSpan={3} />
                                                    <td className="px-3 py-2 text-xs font-bold text-blue-700 text-right">VAT 16%:</td>
                                                    <td className="px-3 py-2 text-xs font-bold text-blue-700 text-right">{fmt(po.vat_amount)}</td>
                                                </tr>
                                                <tr className="bg-blue-100">
                                                    <td colSpan={3} />
                                                    <td className="px-3 py-2 text-sm font-black text-blue-800 text-right">Grand Total:</td>
                                                    <td className="px-3 py-2 text-sm font-black text-blue-800 text-right">{fmt(po.grand_total)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ════ SUPPLIER STATEMENTS ════ */}
            {tab === 'statements' && (
                <div className="space-y-3">
                    {suppliers.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                            <span className="text-4xl block mb-2">📊</span>
                            <p className="text-sm font-bold text-gray-600">No suppliers found — add suppliers first</p>
                        </div>
                    ) : suppliers.filter(s => !search || s.supplier_name?.toLowerCase().includes(search.toLowerCase())).map(sup => {
                        const { supOrders, supInvoices, supPayments, totalInvoiced, totalPaid, balance } = getSupplierStatement(sup.id);
                        const isCreditor = balance > 0;
                        return (
                            <div key={sup.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Supplier header */}
                                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
                                            {sup.supplier_name?.charAt(0)?.toUpperCase() || 'S'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-extrabold text-gray-800">{sup.supplier_name}</p>
                                            <p className="text-[10px] text-gray-400">{sup.phone || '—'} · {sup.category || 'General'} · {sup.payment_terms || 'Net 30'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">LPOs</p>
                                            <p className="text-lg font-black text-blue-600">{supOrders.length}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Invoiced</p>
                                            <p className="text-sm font-black text-gray-700">{fmt(totalInvoiced)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Paid</p>
                                            <p className="text-sm font-black text-green-600">{fmt(totalPaid)}</p>
                                        </div>
                                        <div className="text-center px-3 py-1.5 rounded-xl" style={{ background: isCreditor ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isCreditor ? '#fecaca' : '#bbf7d0'}` }}>
                                            <p className="text-[9px] font-bold uppercase" style={{ color: isCreditor ? '#dc2626' : '#16a34a' }}>Balance Due</p>
                                            <p className="text-base font-black" style={{ color: isCreditor ? '#dc2626' : '#16a34a' }}>{fmt(balance)}</p>
                                        </div>
                                        {isCreditor && (
                                            <button onClick={() => { setPayForm({ ...freshPayment(), supplier_id: String(sup.id) }); setShowPaymentModal(true); }}
                                                className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                💳 Pay Now
                                            </button>
                                        )}
                                        <button onClick={() => {
                                            const s = getSupplierStatement(sup.id);
                                            const w = window.open('', '_blank');
                                            w?.document.write(`<!DOCTYPE html><html><head><title>Statement - ${sup.supplier_name}</title>
<style>body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b;font-size:12px;}
.h{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #1e40af;}
.hn{font-size:18px;font-weight:900;color:#1e40af;}table{width:100%;border-collapse:collapse;margin:12px 0;}
th{background:#1e40af;color:#fff;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;}tr:nth-child(even)td{background:#f8fafc;}
.total-row td{font-weight:900;background:#eff6ff;border-top:2px solid #1e40af;}
.balance-box{background:${balance>0?'#fef2f2':'#f0fdf4'};border:2px solid ${balance>0?'#fca5a5':'#86efac'};border-radius:12px;padding:16px;margin:16px 0;display:flex;justify-content:space-between;align-items:center;}
</style></head><body>
<div class='h'><div><p class='hn'>${schoolInfo?.school_name||'APSIMS School'}</p><p style='font-size:11px;color:#64748b'>${schoolInfo?.address||''}</p></div>
<div style='text-align:right'><p style='font-size:10px;text-transform:uppercase;color:#64748b'>Supplier Statement</p>
<p style='font-size:14px;font-weight:900'>${sup.supplier_name}</p><p style='font-size:11px;color:#64748b'>${sup.phone||''}</p>
<p style='font-size:10px;color:#94a3b8'>Generated: ${new Date().toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric'})}</p></div></div>
<h3 style='font-size:11px;text-transform:uppercase;color:#64748b;margin:16px 0 4px'>Invoices</h3>
<table><thead><tr><th>#</th><th>Invoice No</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>
${s.supInvoices.map((inv,i)=>`<tr><td>${i+1}</td><td style='font-family:monospace;font-weight:700'>${inv.invoice_number}</td><td>${inv.invoice_date?new Date(inv.invoice_date).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td><td>${inv.due_date?new Date(inv.due_date).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td><td style='text-align:right'>${Number(inv.total_amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td><td style='text-align:right;color:#16a34a'>${Number(inv.amount_paid||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td><td style='text-align:right;font-weight:700;color:${Number(inv.balance||0)>0?'#dc2626':'#16a34a'}'>${Number(inv.balance||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td><td>${inv.status}</td></tr>`).join('')}
<tr class='total-row'><td colspan='4' style='text-align:right'>TOTALS</td><td style='text-align:right'>${s.totalInvoiced.toLocaleString('en-KE',{minimumFractionDigits:2})}</td><td style='text-align:right;color:#16a34a'>${s.totalPaid.toLocaleString('en-KE',{minimumFractionDigits:2})}</td><td style='text-align:right;color:${balance>0?'#dc2626':'#16a34a'};font-size:14px'>${balance.toLocaleString('en-KE',{minimumFractionDigits:2})}</td><td></td></tr>
</tbody></table>
<h3 style='font-size:11px;text-transform:uppercase;color:#64748b;margin:16px 0 4px'>Payments Made</h3>
<table><thead><tr><th>#</th><th>Payment No</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>
${s.supPayments.map((p,i)=>`<tr><td>${i+1}</td><td style='font-family:monospace'>${p.payment_number||'—'}</td><td>${p.payment_date?new Date(p.payment_date).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td><td>${p.payment_method||'—'}</td><td>${p.reference_number||'—'}</td><td style='text-align:right;font-weight:700;color:#16a34a'>${Number(p.amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td></tr>`).join('')}
</tbody></table>
<div class='balance-box'><div><p style='font-size:10px;font-weight:700;text-transform:uppercase;color:${balance>0?'#dc2626':'#16a34a'}'>Current Balance Due to Supplier</p><p style='font-size:11px;color:#64748b'>As of ${new Date().toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric'})}</p></div><p style='font-size:28px;font-weight:900;color:${balance>0?'#dc2626':'#16a34a'}'>KES ${balance.toLocaleString('en-KE',{minimumFractionDigits:2})}</p></div>
<p style='text-align:center;margin-top:24px;font-size:10px;color:#94a3b8'>Generated by APSIMS Procurement System</p>
<script>window.onload=()=>{window.print();}<\/script></body></html>`);
                                            w?.document.close();
                                        }} className="p-2 rounded-lg hover:bg-blue-50 transition" title="Print Statement">
                                            <FiPrinter size={14} className="text-blue-600" />
                                        </button>
                                    </div>
                                </div>

                                {/* Invoice rows */}
                                {supInvoices.length > 0 && (
                                    <div className="overflow-x-auto border-t border-gray-100">
                                        <table className="w-full">
                                            <thead><tr className="bg-gray-50">
                                                {['Invoice #', 'Date', 'Due', 'LPO', 'Total', 'Paid', 'Balance', 'Status', 'Action'].map(h => (
                                                    <th key={h} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase text-left whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr></thead>
                                            <tbody>
                                                {supInvoices.map(inv => {
                                                    const po = inv.po_id ? orders.find((o: any) => o.id === inv.po_id) : null;
                                                    const isOverdue = inv.status !== 'Paid' && inv.due_date && new Date(inv.due_date) < new Date();
                                                    return (
                                                        <tr key={inv.id} className={`border-t border-gray-100 hover:bg-gray-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                                                            <td className="px-3 py-2 text-xs font-mono font-bold text-indigo-600">{inv.invoice_number}</td>
                                                            <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(inv.invoice_date)}</td>
                                                            <td className="px-3 py-2 text-xs" style={{ color: isOverdue ? '#ef4444' : '#6b7280' }}>{fmtDate(inv.due_date)}</td>
                                                            <td className="px-3 py-2 text-xs font-mono text-blue-600">{po?.po_number || '—'}</td>
                                                            <td className="px-3 py-2 text-xs font-bold text-gray-700">{fmt(inv.total_amount)}</td>
                                                            <td className="px-3 py-2 text-xs font-bold text-green-600">{fmt(inv.amount_paid)}</td>
                                                            <td className="px-3 py-2 text-xs font-black" style={{ color: Number(inv.balance) > 0 ? '#dc2626' : '#16a34a' }}>{fmt(inv.balance)}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[isOverdue ? 'Overdue' : inv.status] || 'bg-gray-100 text-gray-500'}`}>
                                                                    {isOverdue ? 'Overdue' : inv.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                {inv.status !== 'Paid' && (
                                                                    <button onClick={() => { setPayForm({ ...freshPayment(), supplier_id: String(sup.id), invoice_id: String(inv.id), amount: String(inv.balance || inv.total_amount) }); setShowPaymentModal(true); }}
                                                                        className="px-2 py-1 text-[10px] font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                                        💳 Pay
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="border-t-2 border-blue-200 bg-blue-50">
                                                    <td colSpan={4} className="px-3 py-2 text-xs font-bold text-blue-700 text-right">SUPPLIER TOTAL</td>
                                                    <td className="px-3 py-2 text-sm font-black text-gray-800">{fmt(totalInvoiced)}</td>
                                                    <td className="px-3 py-2 text-sm font-black text-green-600">{fmt(totalPaid)}</td>
                                                    <td className="px-3 py-2 text-sm font-black" style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(balance)}</td>
                                                    <td colSpan={2} />
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {supInvoices.length === 0 && (
                                    <div className="px-5 py-4 text-xs text-gray-400 border-t border-gray-100">No invoices recorded for this supplier yet.</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ════ INVOICES ════ */}
            {tab === 'invoices' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['Invoice #', 'Supplier', 'LPO Ref', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {invoices.filter(i => !search || i.invoice_number?.toLowerCase().includes(search.toLowerCase()) || getSupplier(i.supplier_id)?.supplier_name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                                        <span className="text-4xl block mb-2">🧾</span>
                                        <p className="text-sm">No invoices yet</p>
                                    </td></tr>
                                ) : invoices.filter(i => !search || i.invoice_number?.toLowerCase().includes(search.toLowerCase())).map(inv => {
                                    const isOverdue = inv.status !== 'Paid' && inv.due_date && new Date(inv.due_date) < new Date();
                                    const po = inv.po_id ? orders.find(o => o.id === inv.po_id) : null;
                                    return (
                                        <tr key={inv.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/40' : ''}`}>
                                            <td className="px-3 py-2.5 text-sm font-bold text-indigo-600 font-mono">{inv.invoice_number}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{getSupplier(inv.supplier_id)?.supplier_name || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono text-blue-600">{po?.po_number || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-500">{fmtDate(inv.invoice_date)}</td>
                                            <td className="px-3 py-2.5 text-xs" style={{ color: isOverdue ? '#ef4444' : '#6b7280' }}>{fmtDate(inv.due_date)}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{fmt(inv.total_amount)}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(inv.amount_paid)}</td>
                                            <td className="px-3 py-2.5 text-sm font-black" style={{ color: Number(inv.balance) > 0 ? '#ef4444' : '#22c55e' }}>{fmt(inv.balance)}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[isOverdue ? 'Overdue' : inv.status] || 'bg-gray-100 text-gray-500'}`}>
                                                    {isOverdue ? 'Overdue' : inv.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 flex items-center gap-1.5">
                                                <button onClick={() => printInvoice(inv)} className="p-1.5 rounded-lg hover:bg-amber-50 transition" title="Print Invoice">
                                                    <FiPrinter size={13} className="text-amber-600" />
                                                </button>
                                                {inv.status !== 'Paid' && inv.status !== 'Voided' && (
                                                    <button onClick={() => {
                                                        setPayForm({ ...freshPayment(), supplier_id: String(inv.supplier_id), invoice_id: String(inv.id), amount: String(inv.balance || inv.total_amount) });
                                                        setShowPaymentModal(true);
                                                    }} className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                        💳 Pay
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ PAYMENTS ════ */}
            {tab === 'payments' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Payment #', 'Date', 'Supplier', 'Invoice', 'Amount', 'Method', 'Reference'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">💳</span><p className="text-sm">No payments yet</p></td></tr>
                                ) : payments.filter(p => !search || getSupplier(p.supplier_id)?.supplier_name?.toLowerCase().includes(search.toLowerCase())).map((p, i) => {
                                    const inv = p.invoice_id ? invoices.find(iv => iv.id === p.invoice_id) : null;
                                    return (
                                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono font-bold text-indigo-600">{p.payment_number || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs text-gray-600">{fmtDate(p.payment_date)}</td>
                                            <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{getSupplier(p.supplier_id)?.supplier_name || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono text-indigo-600">{inv?.invoice_number || '—'}</td>
                                            <td className="px-3 py-2.5 text-sm font-bold text-green-600">{fmt(p.amount)}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{p.payment_method}</span></td>
                                            <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{p.reference_number || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ SUPPLIERS ════ */}
            {tab === 'suppliers' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                {['#', 'Supplier', 'Contact', 'Phone', 'Email', 'KRA PIN', 'Category', 'Terms', 'Rating', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-500 uppercase text-left whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {suppliers.filter(s => !search || s.supplier_name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                                    <tr><td colSpan={11} className="text-center py-16 text-gray-400"><span className="text-4xl block mb-2">🏢</span><p className="text-sm">No suppliers yet</p></td></tr>
                                ) : suppliers.filter(s => !search || s.supplier_name?.toLowerCase().includes(search.toLowerCase())).map((s, i) => (
                                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                                        <td className="px-3 py-2.5 text-sm font-bold text-gray-800">{s.supplier_name}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{s.contact_person || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-gray-600">{s.phone || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-blue-600">{s.email || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{s.kra_pin || '—'}</td>
                                        <td className="px-3 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s.category}</span></td>
                                        <td className="px-3 py-2.5 text-xs text-gray-500">{s.payment_terms || '—'}</td>
                                        <td className="px-3 py-2.5"><div className="flex gap-0.5">{[1,2,3,4,5].map(n => <FiStar key={n} size={10} className={n <= (s.rating || 3) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}</div></td>
                                        <td className="px-3 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span></td>
                                        <td className="px-3 py-2.5">
                                            <button onClick={() => { setEditing(s); setSupForm({ ...emptySupplier, ...s }); setShowSupplierModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-50">
                                                <FiEdit2 size={12} className="text-blue-500" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ SUPPLIER MODAL ════ */}
            {showSupplierModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowSupplierModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiTruck /> {editing ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                            <button onClick={() => setShowSupplierModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Supplier Name *</label><input value={supForm.supplier_name} onChange={e => setSupForm({ ...supForm, supplier_name: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Contact Person</label><input value={supForm.contact_person} onChange={e => setSupForm({ ...supForm, contact_person: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Phone</label><input value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} className={inputCls} placeholder="0712345678" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Email</label><input value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">KRA PIN</label><input value={supForm.kra_pin} onChange={e => setSupForm({ ...supForm, kra_pin: e.target.value })} className={inputCls} placeholder="P0123456789X" /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Bank Name</label><input value={supForm.bank_name} onChange={e => setSupForm({ ...supForm, bank_name: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Account No.</label><input value={supForm.bank_account} onChange={e => setSupForm({ ...supForm, bank_account: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category</label><select value={supForm.category} onChange={e => setSupForm({ ...supForm, category: e.target.value })} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Payment Terms</label><select value={supForm.payment_terms} onChange={e => setSupForm({ ...supForm, payment_terms: e.target.value })} className={inputCls}>
                                    {['Net 7','Net 14','Net 30','Net 60','COD','Prepaid'].map(t => <option key={t}>{t}</option>)}
                                </select></div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Address</label><textarea value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} className={inputCls} rows={2} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={saveSupplier} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
                                {saving ? 'Saving…' : editing ? 'Update Supplier' : 'Add Supplier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ LPO MODAL ════ */}
            {showPOModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPOModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiShoppingCart /> Create Local Purchase Order (LPO)</h3>
                            <button onClick={() => setShowPOModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Supplier *</label>
                                    <select value={poForm.supplier_id} onChange={e => setPoForm({ ...poForm, supplier_id: e.target.value })} className={inputCls}>
                                        <option value="">Select Supplier…</option>
                                        {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Order Date</label><input type="date" value={poForm.order_date} onChange={e => setPoForm({ ...poForm, order_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Expected Delivery</label><input type="date" value={poForm.delivery_date} onChange={e => setPoForm({ ...poForm, delivery_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Payment Terms</label>
                                    <select value={poForm.payment_terms} onChange={e => setPoForm({ ...poForm, payment_terms: e.target.value })} className={inputCls}>
                                        {['Net 7','Net 14','Net 30','Net 60','COD','Prepaid'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category</label>
                                    <select value={poForm.category} onChange={e => setPoForm({ ...poForm, category: e.target.value })} className={inputCls}>
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Line Items */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Order Items</label>
                                    <button onClick={addItem} className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 transition"><FiPlus size={11} /> Add Item</button>
                                </div>
                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                    <table className="w-full">
                                        <thead><tr className="bg-gray-50">
                                            <th className="px-3 py-2 text-[10px] text-left font-bold text-gray-400 uppercase">Description</th>
                                            <th className="px-2 py-2 text-[10px] text-center font-bold text-gray-400 uppercase w-20">Qty</th>
                                            <th className="px-2 py-2 text-[10px] text-center font-bold text-gray-400 uppercase w-24">Unit</th>
                                            <th className="px-2 py-2 text-[10px] text-right font-bold text-gray-400 uppercase w-28">Unit Price</th>
                                            <th className="px-2 py-2 text-[10px] text-right font-bold text-gray-400 uppercase w-28">Total</th>
                                            <th className="w-8" />
                                        </tr></thead>
                                        <tbody>
                                            {poForm.items.map((item: any, idx: number) => (
                                                <tr key={idx} className="border-t border-gray-100">
                                                    <td className="px-2 py-1.5"><input value={item.item_description} onChange={e => updateItem(idx, 'item_description', e.target.value)} placeholder="Item description…" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" /></td>
                                                    <td className="px-1 py-1.5"><input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-cyan-200" min="1" /></td>
                                                    <td className="px-1 py-1.5"><select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200">{UNITS.map(u => <option key={u}>{u}</option>)}</select></td>
                                                    <td className="px-1 py-1.5"><input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-cyan-200" min="0" /></td>
                                                    <td className="px-2 py-1.5 text-right text-sm font-bold text-green-600">{fmt(Number(item.quantity || 0) * Number(item.unit_price || 0))}</td>
                                                    <td className="px-1 py-1.5 text-center">{poForm.items.length > 1 && <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600"><FiX size={13} /></button>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="bg-cyan-50 px-4 py-2.5 border-t border-cyan-200 flex items-center justify-between">
                                        <span className="text-xs text-cyan-700">Subtotal: <strong>{fmt(poSubtotal)}</strong> | VAT 16%: <strong>{fmt(poVAT)}</strong></span>
                                        <span className="text-base font-black text-cyan-800">Total: {fmt(poSubtotal + poVAT)}</span>
                                    </div>
                                </div>
                            </div>

                            <textarea value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Delivery instructions / notes…" rows={2} className={inputCls} />
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowPOModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={savePO} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}>
                                {saving ? 'Creating…' : '📋 Create LPO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ INVOICE MODAL ════ */}
            {showInvoiceModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiFileText /> Record Supplier Invoice</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            {/* Auto-generated invoice number */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-amber-700 uppercase">Invoice Number (auto-generated)</p>
                                    <p className="text-lg font-black text-amber-800 font-mono">{invForm.invoice_number}</p>
                                </div>
                                <button onClick={() => setInvForm((f: any) => ({ ...f, invoice_number: genINVNumber(invoices.length + Math.floor(Math.random() * 10)) }))}
                                    className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 transition" title="Regenerate">
                                    <FiRefreshCw size={13} className="text-amber-700" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Link to PO — auto-fills total, supplier, vat */}
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">🔗 Link to LPO (auto-fills amounts)</label>
                                    <select value={invForm.po_id} onChange={e => onSelectPO(e.target.value)} className={inputCls}>
                                        <option value="">— No LPO (manual entry) —</option>
                                        {orders.filter(o => o.status !== 'Cancelled').map(o => {
                                            const sup = getSupplier(o.supplier_id);
                                            return <option key={o.id} value={String(o.id)}>{o.po_number} — {sup?.supplier_name} — {fmt(o.grand_total)}</option>;
                                        })}
                                    </select>
                                    {invForm.po_id && (
                                        <p className="text-[10px] text-green-600 font-bold mt-1">✅ Amounts auto-filled from selected LPO</p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Supplier *</label>
                                    <select value={invForm.supplier_id} onChange={e => setInvForm({ ...invForm, supplier_id: e.target.value })} className={inputCls}>
                                        <option value="">Select Supplier…</option>
                                        {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Invoice Date</label><input type="date" value={invForm.invoice_date} onChange={e => setInvForm({ ...invForm, invoice_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Due Date</label><input type="date" value={invForm.due_date} onChange={e => setInvForm({ ...invForm, due_date: e.target.value })} className={inputCls} /></div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Subtotal (excl. VAT) *</label>
                                    <input type="number" value={invForm.subtotal} onChange={e => setInvForm({ ...invForm, subtotal: e.target.value })} className={inputCls} placeholder="0" min="0" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">VAT Amount</label>
                                    <input type="number" value={invForm.vat_amount} onChange={e => setInvForm({ ...invForm, vat_amount: e.target.value })} className={inputCls} placeholder="0" min="0" />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Total Amount (incl. VAT) *</label>
                                    <div className="relative">
                                        <input type="number" value={invForm.total_amount} onChange={e => setInvForm({ ...invForm, total_amount: e.target.value })} className={`${inputCls} text-lg font-bold text-green-700 border-green-300 focus:ring-green-200`} placeholder="0" min="0" />
                                        <span className="absolute right-3 top-3 text-xs font-bold text-green-600">KES</span>
                                    </div>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category</label><select value={invForm.category} onChange={e => setInvForm({ ...invForm, category: e.target.value })} className={inputCls}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description</label><input value={invForm.description} onChange={e => setInvForm({ ...invForm, description: e.target.value })} className={inputCls} placeholder="Brief description…" /></div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes</label><textarea value={invForm.notes} onChange={e => setInvForm({ ...invForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={saveInvoice} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
                                {saving ? 'Saving…' : '🧾 Record Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ PAYMENT MODAL ════ */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
                            <h3 className="text-base font-extrabold text-white flex items-center gap-2"><FiDollarSign /> Pay Supplier</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-white/70 hover:text-white"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            {/* Payment number */}
                            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-[10px] font-bold text-green-700 uppercase">Payment Voucher No.</p>
                                <p className="text-base font-black text-green-800 font-mono">{payForm.payment_number}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Supplier *</label>
                                    <select value={payForm.supplier_id} onChange={e => setPayForm({ ...payForm, supplier_id: e.target.value })} className={inputCls}>
                                        <option value="">Select Supplier…</option>
                                        {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Link to Invoice (optional)</label>
                                    <select value={payForm.invoice_id} onChange={e => {
                                        const inv = invoices.find(i => String(i.id) === e.target.value);
                                        setPayForm({ ...payForm, invoice_id: e.target.value, amount: inv ? String(inv.balance || inv.total_amount) : payForm.amount, supplier_id: inv ? String(inv.supplier_id) : payForm.supplier_id });
                                    }} className={inputCls}>
                                        <option value="">— No specific invoice —</option>
                                        {invoices.filter(i => i.status !== 'Paid' && i.status !== 'Voided').map(i => <option key={i.id} value={String(i.id)}>{i.invoice_number} — Balance: {fmt(i.balance)}</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Payment Date</label><input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} className={inputCls} /></div>
                                <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Method</label>
                                    <select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} className={inputCls}>
                                        {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Amount (KES) *</label>
                                    <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className={`${inputCls} text-lg font-bold text-green-700`} placeholder="0" min="0" />
                                </div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Reference / Cheque No.</label><input value={payForm.reference_number} onChange={e => setPayForm({ ...payForm, reference_number: e.target.value })} className={inputCls} placeholder="Bank ref, cheque no…" /></div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Notes</label><textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} className={inputCls} rows={2} /></div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-2">
                            <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                            <button onClick={savePayment} disabled={saving} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
                                {saving ? 'Saving…' : '💳 Record Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
