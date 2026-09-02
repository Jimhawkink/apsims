'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiBox, FiRefreshCw, FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
    FiDownload, FiAlertCircle, FiMinus, FiTruck, FiShoppingCart,
    FiCheckCircle, FiFilter, FiPrinter, FiArrowRight, FiClock,
    FiCheck, FiXCircle, FiList, FiShield, FiEye,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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

type Tab = 'inventory' | 'kitchen' | 'issue' | 'approvals' | 'grn' | 'low' | 'audit';

const genItemCode = (category: string, existingItems: any[]) => {
    const pfx = CAT_PREFIX[category] || 'STR';
    const count = existingItems.filter(i => (i.item_code || '').startsWith(pfx)).length + 1;
    return `${pfx}-${String(count).padStart(5, '0')}`;
};

const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; icon: string }> = {
        'Pending':    { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
        'Approved':   { bg: '#d1fae5', color: '#065f46', icon: '✅' },
        'Rejected':   { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
        'Issued':     { bg: '#dbeafe', color: '#1e40af', icon: '📤' },
        'Cancelled':  { bg: '#f3f4f6', color: '#6b7280', icon: '🚫' },
        'Authorized': { bg: '#d1fae5', color: '#065f46', icon: '✅' },
        'Received':   { bg: '#dbeafe', color: '#1e40af', icon: '📥' },
        'Variance':   { bg: '#fef3c7', color: '#92400e', icon: '⚠️' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#6b7280', icon: '•' };
    return (
        <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {s.icon} {status}
        </span>
    );
};

export default function UltraStoresPage() {
    const [tab, setTab] = useState<Tab>('inventory');
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [issuances, setIssuances] = useState<any[]>([]);
    const [grns, setGrns] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [procInvoices, setProcInvoices] = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('All');
    const [issueStatusFilter, setIssueStatusFilter] = useState('All');
    const [saving, setSaving] = useState(false);

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
        item_name: '', item_code: '', category: 'Kitchen Provisions', unit: 'Kgs',
        quantity: 0, reorder_level: 10, unit_price: 0, location: '',
        supplier_id: '', supplier: '', notes: '', is_kitchen: false,
    };
    const emptyIssue = {
        item_id: 0, issued_to: '', issued_to_type: 'Staff', department: '',
        quantity: 1, purpose: '', notes: '', requested_by: '',
    };
    const emptyGRN = {
        item_id: 0, quantity: 0, supplier_id: '', invoice_ref: '',
        proc_invoice_id: '', unit_cost: 0, notes: '', received_by: 'Store Keeper',
        grn_number: '', delivery_date: new Date().toISOString().split('T')[0],
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

    /* ─── FETCH ALL ─────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [iRes, isRes, gRes, supRes, invRes, scRes, auditRes] = await Promise.all([
            supabase.from('school_store_items').select('*').order('item_name'),
            supabase.from('school_store_issuances').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_store_purchases').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('school_suppliers').select('id,supplier_name,phone,category,status').order('supplier_name'),
            supabase.from('school_supplier_invoices').select('id,invoice_number,supplier_id,total_amount,balance,status,due_date').order('created_at', { ascending: false }),
            supabase.from('school_details').select('*').maybeSingle(),
            supabase.from('school_store_audit_log').select('*').order('created_at', { ascending: false }).limit(300),
        ]);
        setItems(iRes.data || []);
        setIssuances(isRes.data || []);
        setGrns(gRes.data || []);
        setSuppliers(supRes.data || []);
        setProcInvoices(invRes.data || []);
        setSchoolInfo(scRes.data || {});
        setAuditLogs(auditRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ─── DERIVED STATS ─────────────────────────────── */
    const kitchenItems = items.filter(i => i.category === 'Kitchen Provisions' || i.is_kitchen);
    const lowStockItems = items.filter(i => i.quantity <= (i.reorder_level || 5));
    const totalValue = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const pendingIssuances = issuances.filter(i => i.status === 'Pending');
    const pendingGRNs = grns.filter(g => g.status === 'Pending');
    const todayIssues = issuances.filter(i => i.status === 'Issued' && new Date(i.created_at).toDateString() === new Date().toDateString());

    const filteredItems = useMemo(() => items.filter(i => {
        if (tab === 'kitchen' && i.category !== 'Kitchen Provisions' && !i.is_kitchen) return false;
        if (filterCat !== 'All' && i.category !== filterCat) return false;
        if (search) { const q = search.toLowerCase(); return i.item_name.toLowerCase().includes(q) || (i.item_code || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q); }
        return true;
    }), [items, tab, filterCat, search]);

    const filteredIssuances = useMemo(() => issuances.filter(i => {
        if (issueStatusFilter !== 'All' && i.status !== issueStatusFilter) return false;
        return true;
    }), [issuances, issueStatusFilter]);

    /* ─── LOG AUDIT ─────────────────────────────────── */
    const logAudit = async (actionType: string, recordRef: string, description: string, actor: string, actorRole = 'Store Keeper') => {
        await supabase.from('school_store_audit_log').insert([{ action_type: actionType, record_ref: recordRef, description, actor, actor_role: actorRole }]);
    };

    /* ─── SAVE ITEM ─────────────────────────────────── */
    const saveItem = async () => {
        if (!itemForm.item_name.trim()) { toast.error('Item name is required'); return; }
        setSaving(true);
        const sup = suppliers.find(s => String(s.id) === String(itemForm.supplier_id));
        const payload = { ...itemForm, supplier: sup?.supplier_name || itemForm.supplier || '', is_kitchen: itemForm.category === 'Kitchen Provisions' || itemForm.is_kitchen };
        const { error } = editing
            ? await supabase.from('school_store_items').update(payload).eq('id', editing.id)
            : await supabase.from('school_store_items').insert([payload]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await logAudit(editing ? 'ITEM_UPDATED' : 'ITEM_ADDED', payload.item_code || payload.item_name, `${editing ? 'Updated' : 'Added'} store item: ${payload.item_name}`, 'Store Keeper');
        toast.success(editing ? '✅ Item updated!' : '✅ Item added!');
        setShowItemModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    /* ─── REQUEST ISSUANCE (goes to Principal for approval) ─── */
    const submitIssuanceRequest = async () => {
        if (!issueForm.item_id || !issueForm.issued_to.trim() || issueForm.quantity < 1) {
            toast.error('Fill all required fields'); return;
        }
        if (!issueForm.requested_by.trim()) { toast.error('Enter your name (Requested By)'); return; }
        const item = items.find(i => i.id === issueForm.item_id);
        if (!item) { toast.error('Select a valid item'); return; }
        if (item.quantity < issueForm.quantity) { toast.error(`⚠️ Insufficient stock. Available: ${item.quantity} ${item.unit}`); return; }
        setSaving(true);
        const issYear = new Date().getFullYear();
        const issNum = `ISS-${issYear}-${String(issuances.length + 1).padStart(5, '0')}`;
        const totalVal = issueForm.quantity * (item.unit_price || 0);
        const { error } = await supabase.from('school_store_issuances').insert([{
            issuance_number: issNum,
            item_id: issueForm.item_id, item_name: item.item_name, item_code: item.item_code || null,
            quantity: issueForm.quantity, unit: item.unit, unit_price: item.unit_price || 0, total_value: totalVal,
            issued_to: issueForm.issued_to, issued_to_type: issueForm.issued_to_type,
            department: issueForm.department || null, purpose: issueForm.purpose || null,
            notes: issueForm.notes || null, requested_by: issueForm.requested_by,
            status: 'Pending', approval_required_from: 'Principal',
            academic_year: issYear,
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        // Log approval trail
        const { data: newIss } = await supabase.from('school_store_issuances').select('id').eq('issuance_number', issNum).maybeSingle();
        if (newIss) {
            await supabase.from('school_store_issuance_approvals').insert([{ issuance_id: newIss.id, action: 'Requested', action_by: issueForm.requested_by, action_by_role: 'Store Keeper', notes: `Request for ${issueForm.quantity} ${item.unit} of ${item.item_name}` }]);
        }
        await logAudit('ISSUANCE_REQUESTED', issNum, `Issuance requested: ${issueForm.quantity} ${item.unit} of ${item.item_name} to ${issueForm.issued_to}`, issueForm.requested_by, 'Store Keeper');
        toast.success(`✅ Issuance request ${issNum} submitted — awaiting Principal approval`);
        setShowIssueModal(false); setIssueForm(emptyIssue); setSaving(false); fetchAll();
    };

    /* ─── APPROVE ISSUANCE (Principal action) ─────── */
    const approveIssuance = async () => {
        if (!approvedBy.trim()) { toast.error('Enter approver name'); return; }
        const iss = showApproveModal;
        setSaving(true);
        const { error } = await supabase.from('school_store_issuances').update({
            status: 'Approved', approved_by: approvedBy, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', iss.id);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_store_issuance_approvals').insert([{ issuance_id: iss.id, action: 'Approved', action_by: approvedBy, action_by_role: 'Principal', notes: approveNotes || null }]);
        await logAudit('ISSUANCE_APPROVED', iss.issuance_number, `Issuance APPROVED by ${approvedBy}. Item: ${iss.item_name}, Qty: ${iss.quantity}`, approvedBy, 'Principal');
        toast.success(`✅ Issuance ${iss.issuance_number} APPROVED — Store Keeper can now issue`);
        setShowApproveModal(null); setApprovedBy(''); setApproveNotes(''); setSaving(false); fetchAll();
    };

    /* ─── REJECT ISSUANCE (Principal action) ──────── */
    const rejectIssuance = async () => {
        if (!rejectReason.trim()) { toast.error('Enter rejection reason'); return; }
        if (!approvedBy.trim()) { toast.error('Enter your name'); return; }
        const iss = showRejectModal;
        setSaving(true);
        const { error } = await supabase.from('school_store_issuances').update({
            status: 'Rejected', approved_by: approvedBy, approved_at: new Date().toISOString(),
            rejection_reason: rejectReason, updated_at: new Date().toISOString(),
        }).eq('id', iss.id);
        if (error) { toast.error(error.message); setSaving(false); return; }
        await supabase.from('school_store_issuance_approvals').insert([{ issuance_id: iss.id, action: 'Rejected', action_by: approvedBy, action_by_role: 'Principal', notes: rejectReason }]);
        await logAudit('ISSUANCE_REJECTED', iss.issuance_number, `Issuance REJECTED by ${approvedBy}. Reason: ${rejectReason}`, approvedBy, 'Principal');
        toast.success(`Issuance ${iss.issuance_number} rejected`);
        setShowRejectModal(null); setRejectReason(''); setApprovedBy(''); setSaving(false); fetchAll();
    };

    /* ─── CONFIRM ISSUE (Store Keeper — after approval) ─ */
    const confirmIssue = async (iss: any) => {
        if (iss.status !== 'Approved') { toast.error('Issuance must be Approved first by Principal'); return; }
        const item = items.find(i => i.id === iss.item_id);
        if (!item || item.quantity < iss.quantity) { toast.error(`⚠️ Insufficient stock. Current: ${item?.quantity || 0}`); return; }
        if (!confirm(`Confirm issuing ${iss.quantity} ${iss.unit || item.unit} of ${iss.item_name} to ${iss.issued_to}?\n\nThis will deduct stock immediately.`)) return;
        setSaving(true);
        const issuedBy = prompt('Enter your name (Store Keeper):');
        if (!issuedBy) { setSaving(false); return; }
        await supabase.from('school_store_issuances').update({ status: 'Issued', issued_by: issuedBy, issued_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', iss.id);
        await supabase.from('school_store_items').update({ quantity: item.quantity - iss.quantity, total_issued: (item.total_issued || 0) + iss.quantity }).eq('id', item.id);
        await supabase.from('school_store_issuance_approvals').insert([{ issuance_id: iss.id, action: 'Issued', action_by: issuedBy, action_by_role: 'Store Keeper', notes: `Issued ${iss.quantity} ${iss.unit} to ${iss.issued_to}` }]);
        await logAudit('ISSUANCE_COMPLETED', iss.issuance_number, `Stock ISSUED: ${iss.quantity} ${iss.unit || item.unit} of ${iss.item_name} to ${iss.issued_to} by ${issuedBy}`, issuedBy, 'Store Keeper');
        toast.success(`✅ ${iss.quantity} ${iss.unit || item.unit} of ${iss.item_name} issued to ${iss.issued_to}`);
        setSaving(false); fetchAll();
    };

    /* ─── SUBMIT GRN (Store Keeper records delivery) ─── */
    const receiveStock = async () => {
        if (!grnForm.item_id || grnForm.quantity <= 0) { toast.error('Select item and enter quantity received'); return; }
        if (!grnForm.received_by.trim()) { toast.error('Enter store keeper name'); return; }
        const item = items.find(i => i.id === grnForm.item_id);
        if (!item) return;
        if (grnForm.invoice_ref.trim()) {
            const { data: existing } = await supabase.from('school_store_purchases').select('id').eq('invoice_ref', grnForm.invoice_ref.trim()).maybeSingle();
            if (existing) { toast.error(`⚠️ Invoice ${grnForm.invoice_ref} already received!`); return; }
        }
        setSaving(true);
        const sup = suppliers.find(s => String(s.id) === String(grnForm.supplier_id));
        const procInv = procInvoices.find(i => String(i.id) === String(grnForm.proc_invoice_id));
        const unitCost = Number(grnForm.unit_cost) || Number(item.unit_price) || 0;
        const qty = Number(grnForm.quantity);
        const totalCost = qty * unitCost;
        const grnNumber = `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}`;
        // ── 1. Save GRN record as Authorized ──
        const { error } = await supabase.from('school_store_purchases').insert([{
            item_id: grnForm.item_id, item_name: item.item_name, item_code: item.item_code || null,
            quantity: qty, unit: item.unit,
            supplier_id: grnForm.supplier_id || null, supplier: sup?.supplier_name || '',
            invoice_ref: grnForm.invoice_ref || procInv?.invoice_number || null,
            unit_cost: unitCost, total_cost: totalCost, grn_number: grnNumber,
            delivery_date: grnForm.delivery_date,
            received_by: grnForm.received_by, notes: grnForm.notes || null,
            status: 'Authorized',
            authorized_by: grnForm.received_by,
            authorized_by_role: 'Store Keeper',
            authorized_at: new Date().toISOString(),
        }]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        // ── 2. Update stock quantity immediately ──
        const newQty = (Number(item.quantity) || 0) + qty;
        const updatePayload: any = { quantity: newQty };
        if (unitCost > 0) updatePayload.unit_price = unitCost;
        const { error: stockErr } = await supabase.from('school_store_items').update(updatePayload).eq('id', item.id);
        if (stockErr) { toast.error('GRN saved but stock update failed: ' + stockErr.message); setSaving(false); fetchAll(); return; }
        await logAudit('GRN_RECEIVED', grnNumber, `Stock received: ${qty} ${item.unit} of ${item.item_name} from ${sup?.supplier_name || 'supplier'}. New qty: ${newQty}`, grnForm.received_by, 'Store Keeper');
        toast.success(`✅ GRN ${grnNumber} — ${qty} ${item.unit} of ${item.item_name} added to stock! New balance: ${newQty} ${item.unit}`);
        setShowGRNModal(false); setGrnForm(emptyGRN); setSaving(false); fetchAll();
    };

    /* ─── AUTHORIZE GRN (Principal or Deputy Principal) ─── */
    const authorizeGRN = async () => {
        if (!grnAuthBy.trim()) { toast.error('Enter authorizer name'); return; }
        const grn = showGRNAuthModal;
        const item = items.find(i => i.id === grn.item_id);
        setSaving(true);
        await supabase.from('school_store_purchases').update({
            status: 'Authorized', authorized_by: grnAuthBy, authorized_by_role: grnAuthRole,
            authorized_at: new Date().toISOString(), authorization_notes: grnAuthNotes || null,
            updated_at: new Date().toISOString(),
        }).eq('id', grn.id);
        // Add stock immediately upon authorization
        if (item) {
            await supabase.from('school_store_items').update({
                quantity: item.quantity + grn.quantity,
                unit_price: grn.unit_cost || item.unit_price,
                supplier: grn.supplier || item.supplier,
                supplier_id: grn.supplier_id || item.supplier_id,
                last_restocked_at: new Date().toISOString(),
                total_received: (item.total_received || 0) + grn.quantity,
            }).eq('id', item.id);
        }
        await logAudit('GRN_AUTHORIZED', grn.grn_number, `GRN AUTHORIZED by ${grnAuthBy} (${grnAuthRole}). Stock added: ${grn.quantity} of ${grn.item_name}`, grnAuthBy, grnAuthRole);
        toast.success(`✅ GRN ${grn.grn_number} authorized — ${grn.quantity} ${item?.unit || ''} of ${grn.item_name} added to stock!`);
        setShowGRNAuthModal(null); setGrnAuthBy(''); setGrnAuthNotes(''); setSaving(false); fetchAll();
    };

    const deleteItem = async (id: number) => {
        if (!confirm('Delete this store item? This cannot be undone.')) return;
        await supabase.from('school_store_items').delete().eq('id', id);
        toast.success('Deleted'); fetchAll();
    };

    const printGRN = (grn: any) => {
        const item = items.find(i => i.id === grn.item_id);
        const sup = suppliers.find(s => s.id === grn.supplier_id);
        const w = window.open('', '_blank');
        w?.document.write(`<!DOCTYPE html><html><head><title>${grn.grn_number || 'GRN'}</title>
<style>body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b;font-size:13px;}
.h{display:flex;justify-content:space-between;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #16a34a;}
.hn{font-size:18px;font-weight:900;color:#16a34a;}.b{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:16px 0;}
table{width:100%;border-collapse:collapse;margin:12px 0;}td,th{padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;}
th{background:#f8fafc;font-weight:700;text-transform:uppercase;font-size:10px;}
.total{background:#16a34a;color:#fff;font-weight:900;}.footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;}
.sb{border-top:2px solid #334155;padding-top:8px;font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;}
.badge{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:800;display:inline-block;}
</style></head><body>
<div class="h"><div><p class="hn">${schoolInfo?.school_name || 'APSIMS School'}</p>
<p style="font-size:11px;color:#64748b">${schoolInfo?.address || ''} | ${schoolInfo?.phone || ''}</p></div>
<div style="text-align:right"><p style="font-size:10px;text-transform:uppercase;color:#64748b">Goods Received Note</p>
<p style="font-size:20px;font-weight:900;color:#16a34a">${grn.grn_number || 'GRN'}</p>
<p style="font-size:11px">${fmtDate(grn.created_at)}</p>
<span class="badge" style="background:${grn.status==='Authorized'?'#d1fae5':'#fef3c7'};color:${grn.status==='Authorized'?'#065f46':'#92400e'}">${grn.status}</span>
</div></div>
<div class="b"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
<div><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b">Supplier</p>
<p style="font-weight:700">${sup?.supplier_name || grn.supplier || '—'}</p><p style="font-size:12px">${sup?.phone || ''}</p></div>
<div><p style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b">Invoice Reference</p>
<p style="font-weight:700;font-family:monospace">${grn.invoice_ref || '—'}</p>
<p style="font-size:12px">Received by: ${grn.received_by || '—'}</p></div></div></div>
<table><thead><tr><th>Item</th><th>Category</th><th>Qty Received</th><th>Unit</th><th>Unit Cost (KES)</th><th>Total Cost (KES)</th></tr></thead>
<tbody><tr><td>${grn.item_name}</td><td>${item?.category || '—'}</td><td style="text-align:center;font-weight:700">${grn.quantity}</td>
<td>${item?.unit || '—'}</td><td style="text-align:right">${Number(grn.unit_cost||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td>
<td style="text-align:right;font-weight:900">${Number(grn.total_cost||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td></tr>
<tr class="total"><td colspan="5" style="text-align:right">TOTAL VALUE RECEIVED</td>
<td style="text-align:right">KES ${Number(grn.total_cost||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td></tr></tbody></table>
${grn.authorized_by ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;font-size:12px;margin:8px 0"><strong>✅ Authorized by:</strong> ${grn.authorized_by} (${grn.authorized_by_role}) on ${fmtDateTime(grn.authorized_at)}</div>` : ''}
${grn.notes ? `<div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:12px"><strong>Notes:</strong> ${grn.notes}</div>` : ''}
<div class="footer">
<div class="sb">Store Keeper<br/>${grn.received_by || '___________'}</div>
<div class="sb">${grn.authorized_by_role || 'Head of Department'}<br/>${grn.authorized_by || '___________'}</div>
<div class="sb">Principal / Deputy Principal<br/>${grn.authorized_by_role === 'Principal' ? grn.authorized_by : '___________'}</div></div>
<p style="text-align:center;margin-top:24px;font-size:10px;color:#94a3b8">APSIMS · ${new Date().toLocaleDateString('en-KE',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
<script>window.onload=()=>{window.print();}</script></body></html>`);
        w?.document.close();
    };

    const exportCSV = () => {
        const rows = filteredItems.map(i => ({ Code: i.item_code || '', Name: i.item_name, Category: i.category, Qty: i.quantity, Unit: i.unit, Price: i.unit_price, Value: i.quantity * i.unit_price, Reorder: i.reorder_level, Location: i.location || '', Supplier: i.supplier || '' }));
        if (!rows.length) return;
        const h = Object.keys(rows[0]);
        const csv = '\uFEFF' + [h.join(','), ...rows.map(r => h.map(k => `"${(r as any)[k] ?? ''}"`).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `stores_inventory_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    };

    const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 500, background: '#fff', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.05em' };

    const tabs = [
        { k: 'inventory', l: '📦 All Inventory', count: items.length },
        { k: 'kitchen', l: '🍳 Kitchen', count: kitchenItems.length },
        { k: 'issue', l: '📤 Issuances', count: issuances.length },
        { k: 'approvals', l: '🔐 Approvals', count: pendingIssuances.length, alert: pendingIssuances.length > 0 },
        { k: 'grn', l: '📥 GRN / Receive', count: grns.length, alert: pendingGRNs.length > 0 },
        { k: 'low', l: '⚠️ Low Stock', count: lowStockItems.length, alert: lowStockItems.length > 0 },
        { k: 'audit', l: '📋 Audit Trail', count: auditLogs.length },
    ];

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 8px 25px -5px rgba(245,158,11,0.4)' }}>📦</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>Loading Ultra Stores…</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ════ HERO ════ */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg,#78350f 0%,#92400e 40%,#b45309 100%)' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 8px 25px -5px rgba(245,158,11,0.5)' }}>
                                <FiBox color="#fff" size={22} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    📦 Ultra Stores & Kitchen
                                    <span style={{ padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: 'linear-gradient(135deg,#f59e0b,#ea580c)', color: '#fff' }}>ULTRA</span>
                                    {pendingIssuances.length > 0 && <span style={{ padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: '#ef4444', color: '#fff', animation: 'pulse 2s infinite' }}>🔔 {pendingIssuances.length} PENDING</span>}
                                </h1>
                                <p style={{ color: '#fcd34d', fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>Inventory · GRN · Issuances · Principal Approval Workflow · Audit Trail</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button onClick={() => { setItemForm({ ...emptyItem, item_code: genItemCode('Kitchen Provisions', items) }); setEditing(null); setShowItemModal(true); }}
                                style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#fff', background: '#f59e0b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiPlus size={12} /> Add Item
                            </button>
                            <button onClick={() => { setGrnForm({ ...emptyGRN, grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` }); setShowGRNModal(true); }}
                                style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiTruck size={12} /> Receive Stock (GRN)
                            </button>
                            <button onClick={() => { setIssueForm(emptyIssue); setShowIssueModal(true); }}
                                style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#fff', background: '#3b82f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiMinus size={12} /> Request Issue
                            </button>
                            <button onClick={exportCSV} style={{ padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiDownload size={12} /> Export
                            </button>
                            <button onClick={fetchAll} style={{ padding: 8, borderRadius: 12, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}>
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {[
                            { label: 'Total Items', value: items.length, icon: '📦' },
                            { label: 'Stock Value', value: fmt(totalValue), icon: '💰' },
                            { label: 'Kitchen Items', value: kitchenItems.length, icon: '🍳' },
                            { label: 'Pending Approvals', value: pendingIssuances.length, icon: '🔐', pulse: pendingIssuances.length > 0 },
                            { label: 'Pending GRNs', value: pendingGRNs.length, icon: '📥', pulse: pendingGRNs.length > 0 },
                            { label: 'Low Stock', value: lowStockItems.length, icon: '⚠️', pulse: lowStockItems.length > 0 },
                        ].map((c: any, i) => (
                            <div key={i} style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                                </div>
                                <p style={{ fontSize: 20, fontWeight: 900, color: c.pulse ? '#fca5a5' : '#fff', margin: 0 }}>{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tabs.map(t => (
                        <button key={t.k} onClick={() => setTab(t.k as Tab)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative',
                                ...(tab === t.k ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(245,158,11,0.4)' } : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }) }}>
                            {t.l}
                            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>({t.count})</span>
                            {t.alert && <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid #fff' }} />}
                        </button>
                    ))}
                </div>
                {(tab === 'inventory' || tab === 'kitchen') && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ position: 'relative' }}>
                            <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" style={{ ...inputStyle, paddingLeft: 32, width: 200 }} />
                        </div>
                        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={inputStyle}>
                            <option value="All">All Categories</option>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* ════ INVENTORY TABLE ════ */}
            {(tab === 'inventory' || tab === 'kitchen') && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {['#', 'Code', 'Item Name', 'Category', 'Qty', 'Unit', 'Unit Price', 'Stock Value', 'Reorder', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filteredItems.length === 0 ? (
                                    <tr><td colSpan={11} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><div style={{ fontSize: 36, marginBottom: 8 }}>📦</div><p style={{ fontSize: 14, fontWeight: 500 }}>No items found</p></td></tr>
                                ) : filteredItems.map((item, idx) => {
                                    const isLow = item.quantity <= (item.reorder_level || 5);
                                    return (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: isLow ? '#fff5f5' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#b45309' }}>{item.item_code || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                                                {item.item_name}
                                                {(item.category === 'Kitchen Provisions' || item.is_kitchen) && <span style={{ marginLeft: 6, fontSize: 9, background: '#fed7aa', color: '#c2410c', padding: '2px 6px', borderRadius: 20, fontWeight: 700 }}>🍳 KITCHEN</span>}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 20 }}>{item.category}</span></td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 14, fontWeight: 900, color: isLow ? '#ef4444' : '#1f2937' }}>{item.quantity}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{item.unit}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{fmt(item.unit_price)}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#059669' }}>{fmt((item.quantity || 0) * (item.unit_price || 0))}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6b7280' }}>{item.reorder_level || 5}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {isLow
                                                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>⚠️ LOW</span>
                                                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 20 }}>✅ OK</span>}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button onClick={() => { setEditing(item); setItemForm({ ...emptyItem, ...item }); setShowItemModal(true); }} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6' }}><FiEdit2 size={12} /></button>
                                                    <button onClick={() => deleteItem(item.id)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444' }}><FiTrash2 size={12} /></button>
                                                    <button onClick={() => { setIssueForm({ ...emptyIssue, item_id: item.id }); setShowIssueModal(true); }} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fffbeb', color: '#f59e0b' }} title="Request Issue"><FiMinus size={12} /></button>
                                                    <button onClick={() => { setGrnForm({ ...emptyGRN, item_id: item.id, grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` }); setShowGRNModal(true); }} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a' }} title="Receive Stock"><FiTruck size={12} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Showing {filteredItems.length} items</span>
                        <span>Total Value: <strong style={{ color: '#059669' }}>{fmt(filteredItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0))}</strong></span>
                    </div>
                </div>
            )}

            {/* ════ ISSUANCE LOG ════ */}
            {tab === 'issue' && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['All', 'Pending', 'Approved', 'Issued', 'Rejected', 'Cancelled'].map(s => (
                                <button key={s} onClick={() => setIssueStatusFilter(s)}
                                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                                        background: issueStatusFilter === s ? '#3b82f6' : '#f3f4f6',
                                        color: issueStatusFilter === s ? '#fff' : '#6b7280' }}>
                                    {s} {s !== 'All' && `(${issuances.filter(i => i.status === s).length})`}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { setIssueForm(emptyIssue); setShowIssueModal(true); }}
                            style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#fff', background: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                            + Request Issue
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {['#', 'ISS No.', 'Date', 'Item', 'Qty', 'Value', 'Issued To', 'Type', 'Department', 'Status', 'Approved By', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {filteredIssuances.length === 0 ? (
                                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><div style={{ fontSize: 36, marginBottom: 8 }}>📤</div><p style={{ fontSize: 14 }}>No issuances found</p></td></tr>
                                ) : filteredIssuances.map((is, i) => (
                                    <tr key={is.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{is.issuance_number || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{fmtDate(is.created_at)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{is.item_name}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#d97706' }}>{is.quantity} {is.unit}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{fmt(is.total_value)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{is.issued_to}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{is.issued_to_type || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{is.department || '—'}</td>
                                        <td style={{ padding: '10px 12px' }}>{statusBadge(is.status || 'Pending')}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#059669' }}>{is.approved_by || '—'}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {is.status === 'Approved' && (
                                                    <button onClick={() => confirmIssue(is)} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#3b82f6', color: '#fff' }}>
                                                        📤 Issue
                                                    </button>
                                                )}
                                                <button onClick={() => setShowViewModal(is)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280' }}><FiEye size={11} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ APPROVALS TAB (Principal view) ════ */}
            {tab === 'approvals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {pendingIssuances.length > 0 && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiAlertCircle color="#92400e" size={16} />
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>⏳ {pendingIssuances.length} issuance request{pendingIssuances.length > 1 ? 's' : ''} awaiting your approval</p>
                        </div>
                    )}
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiShield color="#fff" size={16} />
                            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>🔐 Principal Approval Dashboard — Issuance Requests</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    {['#', 'ISS No.', 'Date Requested', 'Item', 'Qty', 'Value', 'Requested By', 'Issued To', 'Dept', 'Purpose', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody>
                                    {issuances.length === 0 ? (
                                        <tr><td colSpan={12} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><div style={{ fontSize: 36, marginBottom: 8 }}>✅</div><p style={{ fontSize: 14 }}>No pending approvals</p></td></tr>
                                    ) : issuances.map((is, i) => (
                                        <tr key={is.id} style={{ borderBottom: '1px solid #f3f4f6', background: is.status === 'Pending' ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{is.issuance_number || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{fmtDateTime(is.created_at)}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{is.item_name}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#d97706' }}>{is.quantity} {is.unit}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{fmt(is.total_value)}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#374151' }}>{is.requested_by || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{is.issued_to}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{is.department || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{is.purpose || '—'}</td>
                                            <td style={{ padding: '10px 12px' }}>{statusBadge(is.status || 'Pending')}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                {is.status === 'Pending' ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button onClick={() => { setShowApproveModal(is); setApprovedBy(''); setApproveNotes(''); }}
                                                            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#d1fae5', color: '#065f46', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <FiCheck size={11} /> Approve
                                                        </button>
                                                        <button onClick={() => { setShowRejectModal(is); setRejectReason(''); setApprovedBy(''); }}
                                                            style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <FiX size={11} /> Reject
                                                        </button>
                                                    </div>
                                                ) : is.status === 'Approved' ? (
                                                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>✅ by {is.approved_by}</span>
                                                ) : is.status === 'Rejected' ? (
                                                    <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }} title={is.rejection_reason}>❌ {is.rejection_reason?.slice(0, 20)}</span>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ GRN / GOODS RECEIVED ════ */}
            {tab === 'grn' && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {pendingGRNs.length > 0 && (
                        <div style={{ padding: '10px 16px', background: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiAlertCircle color="#92400e" size={14} />
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: 0 }}>📥 {pendingGRNs.length} GRN(s) awaiting Principal/DP authorization before stock is added</p>
                        </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {['#', 'GRN No.', 'Date', 'Item', 'Qty', 'Unit Cost', 'Total', 'Supplier', 'Invoice Ref', 'Received By', 'Status', 'Authorized By', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {grns.length === 0 ? (
                                    <tr><td colSpan={13} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><div style={{ fontSize: 36, marginBottom: 8 }}>📥</div><p style={{ fontSize: 14 }}>No goods received notes yet</p></td></tr>
                                ) : grns.map((g, i) => (
                                    <tr key={g.id} style={{ borderBottom: '1px solid #f3f4f6', background: g.status === 'Pending' ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{g.grn_number || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{fmtDate(g.created_at)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{g.item_name}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>+{g.quantity}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{fmt(g.unit_cost)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{fmt(g.total_cost)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{g.supplier || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', color: '#6366f1' }}>{g.invoice_ref || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{g.received_by || '—'}</td>
                                        <td style={{ padding: '10px 12px' }}>{statusBadge(g.status || 'Pending')}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#059669', fontWeight: 600 }}>
                                            {g.authorized_by ? `${g.authorized_by} (${g.authorized_by_role})` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {g.status === 'Pending' && (
                                                    <button onClick={() => { setShowGRNAuthModal(g); setGrnAuthBy(''); setGrnAuthNotes(''); setGrnAuthRole('Principal'); }}
                                                        style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#d1fae5', color: '#065f46', whiteSpace: 'nowrap' }}>
                                                        🔐 Authorize
                                                    </button>
                                                )}
                                                <button onClick={() => printGRN(g)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a' }}><FiPrinter size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ LOW STOCK ════ */}
            {tab === 'low' && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {lowStockItems.length > 0 && (
                        <div style={{ padding: '10px 16px', background: '#fee2e2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FiAlertCircle color="#dc2626" size={14} />
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: 0 }}>⚠️ {lowStockItems.length} items below reorder level</p>
                        </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                                {['#', 'Item', 'Category', 'Current', 'Reorder Level', 'Shortfall', 'Supplier', 'Est. Reorder Value', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {lowStockItems.length === 0 ? (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><div style={{ fontSize: 36, marginBottom: 8 }}>✅</div><p style={{ fontSize: 14, fontWeight: 500 }}>All items adequately stocked!</p></td></tr>
                                ) : lowStockItems.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff5f5' : '#fff' }}>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{item.item_name}</td>
                                        <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 20 }}>{item.category}</span></td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{item.quantity}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>{item.reorder_level || 5}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>-{Math.max(0, (item.reorder_level || 5) - item.quantity)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{item.supplier || '—'}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#374151' }}>{fmt(Math.max(0, (item.reorder_level || 5) - item.quantity) * (item.unit_price || 0))}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <button onClick={() => { setGrnForm({ ...emptyGRN, item_id: item.id, supplier_id: item.supplier_id || '', grn_number: `GRN-${new Date().getFullYear()}-${String(grns.length + 1).padStart(5, '0')}` }); setShowGRNModal(true); }}
                                                style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                                                📥 Restock
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ AUDIT TRAIL ════ */}
            {tab === 'audit' && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b' }}>
                        <FiList color="#fff" size={16} />
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>📋 Full Stores Audit Trail</h3>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{auditLogs.length} records</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {['#', 'Date & Time', 'Action', 'Reference', 'Description', 'Actor', 'Role'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {auditLogs.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><div style={{ fontSize: 36, marginBottom: 8 }}>📋</div><p style={{ fontSize: 14 }}>No audit logs yet</p></td></tr>
                                ) : auditLogs.map((log, i) => {
                                    const actionColors: Record<string, string> = {
                                        'ITEM_ADDED': '#d1fae5', 'ITEM_UPDATED': '#dbeafe', 'ITEM_DELETED': '#fee2e2',
                                        'ISSUANCE_REQUESTED': '#fef3c7', 'ISSUANCE_APPROVED': '#d1fae5', 'ISSUANCE_REJECTED': '#fee2e2', 'ISSUANCE_COMPLETED': '#dbeafe',
                                        'GRN_CREATED': '#fef3c7', 'GRN_AUTHORIZED': '#d1fae5', 'GRN_RECEIVED': '#dbeafe',
                                        'VOUCHER_CREATED': '#fef3c7', 'VOUCHER_APPROVED': '#d1fae5', 'VOUCHER_PAID': '#dbeafe',
                                        'INCOME_RECORDED': '#d1fae5', 'LOW_STOCK_ALERT': '#fee2e2',
                                    };
                                    const actionTextColors: Record<string, string> = {
                                        'ITEM_ADDED': '#065f46', 'ITEM_UPDATED': '#1e40af', 'ITEM_DELETED': '#991b1b',
                                        'ISSUANCE_REQUESTED': '#92400e', 'ISSUANCE_APPROVED': '#065f46', 'ISSUANCE_REJECTED': '#991b1b', 'ISSUANCE_COMPLETED': '#1e40af',
                                        'GRN_CREATED': '#92400e', 'GRN_AUTHORIZED': '#065f46', 'GRN_RECEIVED': '#1e40af',
                                        'LOW_STOCK_ALERT': '#991b1b',
                                    };
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: actionColors[log.action_type] || '#f3f4f6', color: actionTextColors[log.action_type] || '#6b7280' }}>
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', color: '#6366f1', fontWeight: 700 }}>{log.record_ref || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151', maxWidth: 300 }}>{log.description}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{log.actor || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{log.actor_role || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════ ADD/EDIT ITEM MODAL ════ */}
            {showItemModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }} onClick={() => setShowItemModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FiBox /> {editing ? 'Edit Store Item' : 'Add New Store Item'}</h3>
                            <button onClick={() => setShowItemModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Item Name *</label>
                                <input value={itemForm.item_name} onChange={e => setItemForm({ ...itemForm, item_name: e.target.value })} style={inputStyle} placeholder="e.g. Maize Flour 2kg" />
                            </div>
                            <div>
                                <label style={labelStyle}>Item Code (auto-generated)</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input value={itemForm.item_code} onChange={e => setItemForm({ ...itemForm, item_code: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace', color: '#b45309' }} placeholder="KIT-00001" />
                                    {!editing && <button onClick={() => setItemForm(f => ({ ...f, item_code: genItemCode(f.category, items) }))} style={{ padding: '0 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fef3c7', color: '#b45309', cursor: 'pointer' }}><FiRefreshCw size={13} /></button>}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Category</label>
                                <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value, item_code: editing ? f.item_code : genItemCode(e.target.value, items) }))} style={inputStyle}>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Quantity</label>
                                <input type="number" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} style={inputStyle} min="0" />
                            </div>
                            <div>
                                <label style={labelStyle}>Unit</label>
                                <select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} style={inputStyle}>
                                    {UNITS.map(u => <option key={u}>{u}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Unit Price (KES)</label>
                                <input type="number" value={itemForm.unit_price} onChange={e => setItemForm({ ...itemForm, unit_price: Number(e.target.value) })} style={inputStyle} min="0" />
                            </div>
                            <div>
                                <label style={labelStyle}>Reorder Level</label>
                                <input type="number" value={itemForm.reorder_level} onChange={e => setItemForm({ ...itemForm, reorder_level: Number(e.target.value) })} style={inputStyle} min="0" />
                            </div>
                            <div>
                                <label style={labelStyle}>Location</label>
                                <input value={itemForm.location} onChange={e => setItemForm({ ...itemForm, location: e.target.value })} style={inputStyle} placeholder="e.g. Store Room A" />
                            </div>
                            <div>
                                <label style={labelStyle}>Supplier</label>
                                <select value={itemForm.supplier_id} onChange={e => setItemForm({ ...itemForm, supplier_id: e.target.value })} style={inputStyle}>
                                    <option value="">— None —</option>
                                    {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Notes</label>
                                <textarea value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowItemModal(false)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={saveItem} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Saving…' : editing ? 'Update Item' : '📦 Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ REQUEST ISSUE MODAL ════ */}
            {showIssueModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }} onClick={() => setShowIssueModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', borderRadius: '20px 20px 0 0' }}>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FiMinus /> Request Store Issuance</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>⚠️ Requires Principal approval before stock is deducted</p>
                            </div>
                            <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px' }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', margin: 0 }}>🔐 Approval Workflow: After submission, the Principal must approve before stock is issued</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Item *</label>
                                <select value={issueForm.item_id} onChange={e => setIssueForm({ ...issueForm, item_id: Number(e.target.value) })} style={inputStyle}>
                                    <option value={0}>Select item…</option>
                                    {items.filter(i => i.quantity > 0).map(i => <option key={i.id} value={i.id}>{i.item_name} — {i.quantity} {i.unit} in stock</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Issued To *</label>
                                    <input value={issueForm.issued_to} onChange={e => setIssueForm({ ...issueForm, issued_to: e.target.value })} style={inputStyle} placeholder="Name of recipient" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Recipient Type</label>
                                    <select value={issueForm.issued_to_type} onChange={e => setIssueForm({ ...issueForm, issued_to_type: e.target.value })} style={inputStyle}>
                                        {ISSUE_TO_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Department</label>
                                    <select value={issueForm.department} onChange={e => setIssueForm({ ...issueForm, department: e.target.value })} style={inputStyle}>
                                        <option value="">Select…</option>
                                        {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Quantity *</label>
                                    <input type="number" value={issueForm.quantity} onChange={e => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })} style={inputStyle} min="1" />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Purpose / Reason *</label>
                                <input value={issueForm.purpose} onChange={e => setIssueForm({ ...issueForm, purpose: e.target.value })} style={inputStyle} placeholder="e.g. Kitchen daily use, Lab practical, Office supplies…" />
                            </div>
                            <div>
                                <label style={labelStyle}>Requested By (Store Keeper Name) *</label>
                                <input value={issueForm.requested_by} onChange={e => setIssueForm({ ...issueForm, requested_by: e.target.value })} style={inputStyle} placeholder="Your full name" />
                            </div>
                            <div>
                                <label style={labelStyle}>Additional Notes</label>
                                <textarea value={issueForm.notes} onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowIssueModal(false)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={submitIssuanceRequest} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Submitting…' : '📤 Submit for Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ APPROVE MODAL ════ */}
            {showApproveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>✅ Approve Issuance Request</h3>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46', margin: '0 0 4px' }}>{showApproveModal.issuance_number}</p>
                                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{showApproveModal.quantity} {showApproveModal.unit} of <strong>{showApproveModal.item_name}</strong> → {showApproveModal.issued_to}</p>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Purpose: {showApproveModal.purpose || '—'}</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Approved By (Principal Name) *</label>
                                <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} style={inputStyle} placeholder="Principal's full name" />
                            </div>
                            <div>
                                <label style={labelStyle}>Approval Notes (optional)</label>
                                <textarea value={approveNotes} onChange={e => setApproveNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Any instructions or conditions…" />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowApproveModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={approveIssuance} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                                {saving ? 'Approving…' : '✅ Approve Issuance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ REJECT MODAL ════ */}
            {showRejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>❌ Reject Issuance Request</h3>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>{showRejectModal.issuance_number}</p>
                                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{showRejectModal.quantity} {showRejectModal.unit} of <strong>{showRejectModal.item_name}</strong></p>
                            </div>
                            <div>
                                <label style={labelStyle}>Your Name (Principal) *</label>
                                <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} style={inputStyle} placeholder="Principal's full name" />
                            </div>
                            <div>
                                <label style={labelStyle}>Rejection Reason *</label>
                                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ ...inputStyle, resize: 'vertical', borderColor: '#fecaca' }} rows={3} placeholder="Explain why this request is rejected…" />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowRejectModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={rejectIssuance} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                                {saving ? 'Rejecting…' : '❌ Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ GRN AUTHORIZATION MODAL ════ */}
            {showGRNAuthModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 480 }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>🔐 Authorize Goods Received Note</h3>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>Only Principal or Deputy Principal can authorize GRNs</p>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 4px' }}>{showGRNAuthModal.grn_number}</p>
                                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{showGRNAuthModal.quantity} units of <strong>{showGRNAuthModal.item_name}</strong></p>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Supplier: {showGRNAuthModal.supplier || '—'} | Invoice: {showGRNAuthModal.invoice_ref || '—'}</p>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: '4px 0 0' }}>Total Cost: {fmt(showGRNAuthModal.total_cost)}</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Authorized By *</label>
                                <input value={grnAuthBy} onChange={e => setGrnAuthBy(e.target.value)} style={inputStyle} placeholder="Full name of authorizer" />
                            </div>
                            <div>
                                <label style={labelStyle}>Role *</label>
                                <select value={grnAuthRole} onChange={e => setGrnAuthRole(e.target.value)} style={inputStyle}>
                                    <option>Principal</option>
                                    <option>Deputy Principal</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Authorization Notes (optional)</label>
                                <textarea value={grnAuthNotes} onChange={e => setGrnAuthNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Any remarks on receipt…" />
                            </div>
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px' }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', margin: 0 }}>⚠️ Upon authorization, {showGRNAuthModal.quantity} units will be immediately added to stock</p>
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowGRNAuthModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={authorizeGRN} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                                {saving ? 'Authorizing…' : '🔐 Authorize & Add to Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ GRN MODAL ════ */}
            {showGRNModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }} onClick={() => setShowGRNModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderRadius: '20px 20px 0 0' }}>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FiTruck /> Goods Received Note (GRN)</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>Stock is updated immediately upon submission</p>
                            </div>
                            <button onClick={() => setShowGRNModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', margin: '0 0 2px' }}>GRN Reference</p>
                                <p style={{ fontSize: 18, fontWeight: 900, color: '#166534', fontFamily: 'monospace', margin: 0 }}>{grnForm.grn_number}</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Item *</label>
                                    <select value={grnForm.item_id} onChange={e => { const item = items.find(i => i.id === Number(e.target.value)); setGrnForm({ ...grnForm, item_id: Number(e.target.value), unit_cost: item?.unit_price || 0, supplier_id: item?.supplier_id || '' }); }} style={inputStyle}>
                                        <option value={0}>Select item…</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.item_name} — Current: {i.quantity} {i.unit}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Qty Received *</label>
                                    <input type="number" value={grnForm.quantity} onChange={e => setGrnForm({ ...grnForm, quantity: Number(e.target.value) })} style={inputStyle} min="1" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Unit Cost (KES)</label>
                                    <input type="number" value={grnForm.unit_cost} onChange={e => setGrnForm({ ...grnForm, unit_cost: Number(e.target.value) })} style={inputStyle} min="0" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Delivery Date</label>
                                    <input type="date" value={grnForm.delivery_date} onChange={e => setGrnForm({ ...grnForm, delivery_date: e.target.value })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Received By (Store Keeper)</label>
                                    <input value={grnForm.received_by} onChange={e => setGrnForm({ ...grnForm, received_by: e.target.value })} style={inputStyle} placeholder="Store keeper name" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Supplier</label>
                                    <select value={grnForm.supplier_id} onChange={e => setGrnForm({ ...grnForm, supplier_id: e.target.value })} style={inputStyle}>
                                        <option value="">— Select Supplier —</option>
                                        {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Link to Procurement Invoice (optional)</label>
                                    <select value={grnForm.proc_invoice_id} onChange={e => { const inv = procInvoices.find(i => String(i.id) === e.target.value); setGrnForm({ ...grnForm, proc_invoice_id: e.target.value, invoice_ref: inv?.invoice_number || grnForm.invoice_ref, supplier_id: inv ? String(inv.supplier_id) : grnForm.supplier_id }); }} style={inputStyle}>
                                        <option value="">— No linked invoice —</option>
                                        {procInvoices.map(i => <option key={i.id} value={String(i.id)}>{i.invoice_number} — {fmt(i.total_amount)} [{i.status}]</option>)}
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Invoice / Delivery Note Reference</label>
                                    <input value={grnForm.invoice_ref} onChange={e => setGrnForm({ ...grnForm, invoice_ref: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="e.g. SINV-2026-00001" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Notes</label>
                                    <input value={grnForm.notes} onChange={e => setGrnForm({ ...grnForm, notes: e.target.value })} style={inputStyle} />
                                </div>
                            </div>
                            {grnForm.quantity > 0 && grnForm.unit_cost > 0 && (
                                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>Total Value Received:</span>
                                    <span style={{ fontSize: 20, fontWeight: 900, color: '#166534' }}>{fmt(grnForm.quantity * grnForm.unit_cost)}</span>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowGRNModal(false)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={receiveStock} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Saving…' : '📥 Record GRN (Pending Auth)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ VIEW ISSUANCE DETAIL MODAL ════ */}
            {showViewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowViewModal(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>📋 Issuance Details</h3>
                            <button onClick={() => setShowViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                ['ISS Number', showViewModal.issuance_number],
                                ['Item', showViewModal.item_name],
                                ['Quantity', `${showViewModal.quantity} ${showViewModal.unit}`],
                                ['Value', fmt(showViewModal.total_value)],
                                ['Issued To', showViewModal.issued_to],
                                ['Type', showViewModal.issued_to_type],
                                ['Department', showViewModal.department || '—'],
                                ['Purpose', showViewModal.purpose || '—'],
                                ['Requested By', showViewModal.requested_by || '—'],
                                ['Requested At', fmtDateTime(showViewModal.created_at)],
                                ['Status', null],
                                ['Approved By', showViewModal.approved_by || '—'],
                                ['Rejection Reason', showViewModal.rejection_reason || '—'],
                                ['Issued By', showViewModal.issued_by || '—'],
                                ['Issued At', showViewModal.issued_at ? fmtDateTime(showViewModal.issued_at) : '—'],
                            ].map(([k, v]) => (
                                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', fontSize: 10 }}>{k}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{k === 'Status' ? statusBadge(showViewModal.status) : v}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowViewModal(null)} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
