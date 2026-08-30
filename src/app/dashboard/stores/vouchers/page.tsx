'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiFileText, FiPlus, FiSearch, FiDownload, FiPrinter, FiCheck,
    FiX, FiEye, FiRefreshCw, FiDollarSign, FiClock, FiCheckCircle,
    FiXCircle, FiEdit2, FiSave, FiFilter,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// Convert number to words (for receipt)
function numberToWords(n: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n === 0) return 'Zero';
    const convert = (num: number): string => {
        if (num < 20) return ones[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
        if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
        return convert(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + convert(num % 1000000) : '');
    };
    const [shs, cts] = n.toFixed(2).split('.').map(Number);
    return convert(shs) + ' Shillings' + (cts > 0 ? ' and ' + convert(cts) + ' Cents' : ' Only');
}

const PAYEE_TYPES = ['Supplier', 'Staff', 'Contractor', 'Utility', 'Other'];
const PAY_METHODS = ['Cheque', 'Bank Transfer', 'Cash', 'M-Pesa', 'RTGS', 'EFT'];
const VOTE_HEADS = ['Salaries & Wages', 'Operations', 'Procurement', 'Infrastructure', 'Library & ICT',
    'Extra-curricular', 'Food & Kitchen', 'Maintenance', 'Transport', 'Medical', 'Exam Fees', 'Other'];
const STATUS_TABS = ['All', 'Draft', 'Pending Approval', 'Approved', 'Paid', 'Rejected'];

const statusColors: Record<string, { bg: string; color: string }> = {
    'Draft':            { bg: '#f3f4f6', color: '#6b7280' },
    'Pending Approval': { bg: '#fef3c7', color: '#92400e' },
    'Approved':         { bg: '#d1fae5', color: '#065f46' },
    'Paid':             { bg: '#dbeafe', color: '#1e40af' },
    'Rejected':         { bg: '#fee2e2', color: '#991b1b' },
    'Cancelled':        { bg: '#f3f4f6', color: '#6b7280' },
    'Void':             { bg: '#f9fafb', color: '#9ca3af' },
};

export default function PaymentVouchersPage() {
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState<any>(null);
    const [showApproveModal, setShowApproveModal] = useState<any>(null);
    const [showRejectModal, setShowRejectModal] = useState<any>(null);
    const [showPayModal, setShowPayModal] = useState<any>(null);
    const [editing, setEditing] = useState<any>(null);
    const [printVoucher, setPrintVoucher] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Approval inputs
    const [approvedBy, setApprovedBy] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [payRef, setPayRef] = useState('');

    const emptyForm = {
        voucher_number: '', voucher_date: new Date().toISOString().split('T')[0],
        payee_name: '', payee_type: 'Supplier', description: '', amount: '',
        payment_method: 'Cheque', cheque_number: '', bank_name: '',
        account_number: '', reference_number: '', vote_head: 'Operations',
        po_id: '', supplier_id: '', notes: '', prepared_by: '',
    };
    const [form, setForm] = useState<any>(emptyForm);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [vRes, sRes, oRes, scRes] = await Promise.all([
            supabase.from('school_payment_vouchers').select('*').order('created_at', { ascending: false }),
            supabase.from('school_suppliers').select('id,supplier_name').order('supplier_name'),
            supabase.from('school_purchase_orders').select('id,po_number,supplier_id,total_amount').order('created_at', { ascending: false }),
            supabase.from('school_details').select('*').maybeSingle(),
        ]);
        setVouchers(vRes.data || []);
        setSuppliers(sRes.data || []);
        setOrders(oRes.data || []);
        setSchoolInfo(scRes.data || {});
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const genVoucherNo = () => `PV-${new Date().getFullYear()}-${String(vouchers.length + 1).padStart(5, '0')}`;

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, voucher_number: genVoucherNo() });
        setShowModal(true);
    };

    const filtered = vouchers.filter(v => {
        if (activeTab !== 'All' && v.status !== activeTab) return false;
        if (search) { const q = search.toLowerCase(); return (v.payee_name || '').toLowerCase().includes(q) || (v.voucher_number || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q); }
        return true;
    });

    // Stats
    const totalDraft = vouchers.filter(v => v.status === 'Draft').length;
    const totalPending = vouchers.filter(v => v.status === 'Pending Approval').length;
    const totalApproved = vouchers.filter(v => v.status === 'Approved').length;
    const totalPaid = vouchers.filter(v => v.status === 'Paid').length;
    const totalPaidAmount = vouchers.filter(v => v.status === 'Paid').reduce((s, v) => s + Number(v.amount || 0), 0);

    const saveVoucher = async (status = 'Draft') => {
        if (!form.payee_name.trim()) { toast.error('Payee name is required'); return; }
        if (!form.description.trim()) { toast.error('Description is required'); return; }
        if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
        if (!form.prepared_by.trim()) { toast.error('Enter prepared by name'); return; }
        setSaving(true);
        const payload = {
            ...form, amount: Number(form.amount), status,
            po_id: form.po_id || null, supplier_id: form.supplier_id || null,
            prepared_at: new Date().toISOString(),
        };
        const { error } = editing
            ? await supabase.from('school_payment_vouchers').update(payload).eq('id', editing.id)
            : await supabase.from('school_payment_vouchers').insert([payload]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        toast.success(`✅ Voucher ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}`);
        setShowModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    const approveVoucher = async () => {
        if (!approvedBy.trim()) { toast.error('Enter approver name'); return; }
        setSaving(true);
        await supabase.from('school_payment_vouchers').update({ status: 'Approved', approved_by: approvedBy, approved_at: new Date().toISOString() }).eq('id', showApproveModal.id);
        // Log to audit
        await supabase.from('school_store_audit_log').insert([{ action_type: 'VOUCHER_APPROVED', record_ref: showApproveModal.voucher_number, description: `Payment voucher APPROVED by ${approvedBy}. Payee: ${showApproveModal.payee_name}, Amount: ${showApproveModal.amount}`, actor: approvedBy, actor_role: 'Principal' }]);
        toast.success(`✅ Voucher ${showApproveModal.voucher_number} approved`);
        setShowApproveModal(null); setApprovedBy(''); setSaving(false); fetchAll();
    };

    const rejectVoucher = async () => {
        if (!rejectReason.trim()) { toast.error('Enter rejection reason'); return; }
        if (!approvedBy.trim()) { toast.error('Enter your name'); return; }
        setSaving(true);
        await supabase.from('school_payment_vouchers').update({ status: 'Rejected', approved_by: approvedBy, approved_at: new Date().toISOString(), rejection_reason: rejectReason }).eq('id', showRejectModal.id);
        toast.success('Voucher rejected');
        setShowRejectModal(null); setRejectReason(''); setApprovedBy(''); setSaving(false); fetchAll();
    };

    const markPaid = async () => {
        if (!paidBy.trim()) { toast.error('Enter paid by name'); return; }
        setSaving(true);
        await supabase.from('school_payment_vouchers').update({ status: 'Paid', paid_by: paidBy, paid_at: new Date().toISOString(), reference_number: payRef || showPayModal.reference_number }).eq('id', showPayModal.id);
        await supabase.from('school_store_audit_log').insert([{ action_type: 'VOUCHER_PAID', record_ref: showPayModal.voucher_number, description: `Voucher PAID by ${paidBy}. Amount: KES ${showPayModal.amount}`, actor: paidBy, actor_role: 'Bursar' }]);
        toast.success(`✅ Voucher ${showPayModal.voucher_number} marked as PAID`);
        setShowPayModal(null); setPaidBy(''); setPayRef(''); setSaving(false); fetchAll();
    };

    /* ─── PREMIUM EXCEL EXPORT ─────────────────────── */
    const exportExcel = () => {
        const data = filtered.length > 0 ? filtered : vouchers;
        const headers = ['Voucher No', 'Date', 'Payee Name', 'Payee Type', 'Description', 'Amount (KES)', 'Payment Method', 'Cheque/Ref No', 'Bank', 'Vote Head', 'Status', 'Prepared By', 'Approved By', 'Paid By', 'Paid Date', 'Rejection Reason', 'Notes'];
        const rows = data.map(v => [
            v.voucher_number || '', v.voucher_date || '', v.payee_name || '', v.payee_type || '',
            v.description || '', Number(v.amount || 0).toFixed(2), v.payment_method || '',
            v.cheque_number || v.reference_number || '', v.bank_name || '', v.vote_head || '',
            v.status || '', v.prepared_by || '', v.approved_by || '', v.paid_by || '',
            v.paid_at ? fmtDate(v.paid_at) : '', v.rejection_reason || '', v.notes || '',
        ]);
        const totalRow = ['', '', '', '', 'TOTAL', data.reduce((s, v) => s + Number(v.amount || 0), 0).toFixed(2), '', '', '', '', '', '', '', '', '', '', ''];
        const csv = '\uFEFF' + [headers, ...rows, [], totalRow].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Payment_Vouchers_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('✅ Excel export downloaded');
    };

    /* ─── PRINT PAYMENT VOUCHER (exact format from image) ─── */
    const printPaymentVoucher = (v: any) => {
        const shs = Math.floor(Number(v.amount || 0));
        const cts = Math.round((Number(v.amount || 0) - shs) * 100);
        const words = numberToWords(Number(v.amount || 0));
        const schoolName = schoolInfo?.school_name || 'Alpha School';
        const schoolAddr = schoolInfo?.address || schoolInfo?.town || '';
        const schoolPO = schoolInfo?.po_box || '';
        const w = window.open('', '_blank', 'width=800,height=1000');
        w?.document.write(`<!DOCTYPE html><html><head><title>Payment Voucher - ${v.voucher_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #000; background: #fff; padding: 20px 30px; }
  .school-name { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 2px; }
  .school-addr { text-align: center; font-size: 12px; margin-bottom: 12px; }
  .pv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; border: 1px solid #000; padding: 4px 8px; }
  .pv-header .left, .pv-header .right { font-size: 12px; }
  .paid-to { border: 1px solid #000; border-top: none; padding: 4px 8px; font-size: 12px; margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table th, table td { border: 1px solid #000; padding: 4px 6px; }
  table th { font-weight: bold; text-align: center; background: #f0f0f0; }
  .date-col { width: 80px; }
  .desc-col { width: auto; }
  .subtotal-col { width: 60px; text-align: right; }
  .amount-col { width: 60px; text-align: right; }
  .total-row td { font-weight: bold; text-align: right; }
  .authority { border: 1px solid #000; border-top: none; padding: 4px 8px; font-size: 12px; margin-bottom: 8px; }
  .certify { font-size: 11px; margin: 8px 0 4px; font-style: italic; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; }
  .sig-line { border-bottom: 1px solid #000; min-width: 200px; display: inline-block; }
  .receipt { border: 2px solid #000; margin-top: 16px; padding: 10px; }
  .receipt-title { text-align: center; font-weight: bold; font-size: 14px; text-decoration: underline; margin-bottom: 6px; }
  .receipt-sub { text-align: center; font-size: 11px; margin-bottom: 8px; font-style: italic; }
  .receipt-line { margin: 6px 0; font-size: 12px; }
  .receipt-bottom { text-align: center; font-weight: bold; font-size: 13px; margin-top: 10px; border-top: 1px solid #000; padding-top: 6px; }
  .empty-row td { height: 22px; }
  @media print {
    body { padding: 10px 20px; }
    @page { size: A4; margin: 10mm; }
  }
</style></head><body>
<div class="school-name">${schoolName}</div>
<div class="school-addr">${schoolPO ? 'P.O. Box ' + schoolPO + ', ' : ''}${schoolAddr}</div>

<div class="pv-header">
  <div class="left">Account No. <span style="border-bottom:1px solid #000;display:inline-block;min-width:80px">${v.account_number || ''}</span></div>
  <div class="right"><strong>PAYMENT VOUCHER No.</strong>.............<strong>${v.voucher_number || ''}</strong></div>
</div>

<div class="paid-to">Paid To: <span style="border-bottom:1px solid #000;display:inline-block;min-width:300px;font-weight:bold">${v.payee_name || ''}</span></div>

<table>
  <thead>
    <tr>
      <th class="date-col" rowspan="2">Date</th>
      <th class="desc-col" rowspan="2">Details description of Services</th>
      <th colspan="2">Sub - Total</th>
      <th colspan="2">AMOUNT</th>
    </tr>
    <tr>
      <th class="subtotal-col">Shs.</th>
      <th class="subtotal-col">Cts.</th>
      <th class="amount-col">Shs.</th>
      <th class="amount-col">Cts.</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="date-col">${v.voucher_date ? new Date(v.voucher_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
      <td class="desc-col">${v.description || ''}${v.vote_head ? '<br><small style="color:#444">Vote Head: ' + v.vote_head + '</small>' : ''}</td>
      <td class="subtotal-col"></td>
      <td class="subtotal-col"></td>
      <td class="amount-col" style="text-align:right;font-weight:bold">${shs.toLocaleString('en-KE')}</td>
      <td class="amount-col" style="text-align:right">${String(cts).padStart(2, '0')}</td>
    </tr>
    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
    <tr class="total-row">
      <td colspan="4" style="text-align:right;font-weight:bold;font-size:12px">TOTAL</td>
      <td style="text-align:right;font-weight:bold">${shs.toLocaleString('en-KE')}</td>
      <td style="text-align:right">${String(cts).padStart(2, '0')}</td>
    </tr>
  </tbody>
</table>

<div class="authority">Authority:...<span style="border-bottom:1px solid #000;display:inline-block;min-width:500px">${v.approved_by ? v.approved_by + ' (Principal)' : ''}</span></div>

<div class="certify">I certify that the above account is correct and was incurred under the authority quoted and account paid chargeable to the following Heads</div>

<table>
  <thead>
    <tr>
      <th style="width:50px">LF</th>
      <th>HEAD OF ESTIMATE</th>
      <th colspan="2">AMOUNT</th>
    </tr>
    <tr>
      <th></th>
      <th></th>
      <th style="width:80px">Shs.</th>
      <th style="width:80px">Cts.</th>
    </tr>
  </thead>
  <tbody>
    <tr><td></td><td style="font-weight:bold">${v.vote_head || ''}</td><td style="text-align:right">${shs.toLocaleString('en-KE')}</td><td style="text-align:right">${String(cts).padStart(2, '0')}</td></tr>
    <tr class="empty-row"><td></td><td></td><td></td><td></td></tr>
    <tr class="empty-row"><td></td><td></td><td></td><td></td></tr>
    <tr class="empty-row"><td></td><td></td><td></td><td></td></tr>
    <tr class="total-row">
      <td colspan="2" style="text-align:right;font-weight:bold">TOTAL</td>
      <td style="text-align:right;font-weight:bold">${shs.toLocaleString('en-KE')}</td>
      <td style="text-align:right">${String(cts).padStart(2, '0')}</td>
    </tr>
  </tbody>
</table>

<div class="sig-row" style="margin-top:16px">
  <div>Date:...<span class="sig-line" style="min-width:120px">${v.voucher_date ? new Date(v.voucher_date).toLocaleDateString('en-KE') : ''}</span></div>
  <div>...................................................</div>
  <div>Principal's Signature</div>
</div>
<div style="margin-top:6px;font-size:12px">Cash/Cheque No..........<span style="border-bottom:1px solid #000;display:inline-block;min-width:180px">${v.cheque_number || v.reference_number || ''}</span></div>

<div class="receipt">
  <div class="receipt-title">RECEIPT</div>
  <div class="receipt-sub">(For use only when payment made by cash)</div>
  <div class="receipt-line">Received this...<span class="sig-line" style="min-width:60px"></span>Day of...<span class="sig-line" style="min-width:80px"></span>20...<span class="sig-line" style="min-width:20px"></span>in payment of the above</div>
  <div class="receipt-line">Account the sum of shillings...<span class="sig-line" style="min-width:300px">${words}</span></div>
  <div class="receipt-line">Shs.<span class="sig-line" style="min-width:100px">${shs.toLocaleString('en-KE')}</span>...Cts.<span class="sig-line" style="min-width:50px">${String(cts).padStart(2, '0')}</span></div>
  <div class="receipt-line">Witness to pay...<span class="sig-line" style="min-width:160px"></span>I.D. No.<span class="sig-line" style="min-width:80px"></span>Sign of receipt...<span class="sig-line" style="min-width:100px">${v.paid_by || ''}</span></div>
  <div class="receipt-bottom">Bursar / Accounts Clerk</div>
</div>

<script>window.onload = () => { window.print(); }</script>
</body></html>`);
        w?.document.close();
    };

    const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 500, background: '#fff', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, display: 'block', marginBottom: 4, letterSpacing: '0.05em' };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>📄</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>Loading Payment Vouchers…</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ─── HERO ─── */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 60%,#3b82f6 100%)' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', boxShadow: '0 8px 25px rgba(59,130,246,0.4)' }}>
                                <FiFileText color="#fff" size={22} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
                                    💳 Payment Vouchers
                                    <span style={{ marginLeft: 8, padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: 'linear-gradient(135deg,#60a5fa,#3b82f6)', color: '#fff' }}>ULTRA</span>
                                    {totalPending > 0 && <span style={{ marginLeft: 8, padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: '#ef4444', color: '#fff' }}>🔔 {totalPending} PENDING</span>}
                                </h1>
                                <p style={{ color: '#93c5fd', fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>Create · Approve · Pay · Export PDF & Excel — Official Payment Voucher Format</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={openNew} style={{ padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiPlus size={14} /> New Voucher
                            </button>
                            <button onClick={exportExcel} style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiDownload size={14} /> Excel
                            </button>
                            <button onClick={fetchAll} style={{ padding: 10, borderRadius: 12, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}>
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {[
                            { label: 'Draft', value: totalDraft, icon: '📝', color: '#9ca3af' },
                            { label: 'Pending Approval', value: totalPending, icon: '⏳', color: '#fbbf24', pulse: totalPending > 0 },
                            { label: 'Approved', value: totalApproved, icon: '✅', color: '#34d399' },
                            { label: 'Paid', value: totalPaid, icon: '💰', color: '#60a5fa' },
                            { label: 'Total Paid (KES)', value: fmt(totalPaidAmount), icon: '💳', color: '#34d399' },
                        ].map((c: any, i) => (
                            <div key={i} style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                                </div>
                                <p style={{ fontSize: 18, fontWeight: 900, color: c.pulse ? '#fca5a5' : '#fff', margin: 0 }}>{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── FILTERS + TABS ─── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STATUS_TABS.map(s => (
                        <button key={s} onClick={() => setActiveTab(s)}
                            style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                background: activeTab === s ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
                                color: activeTab === s ? '#fff' : '#6b7280',
                                boxShadow: activeTab === s ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
                                border: activeTab === s ? 'none' : '1px solid #e5e7eb' }}>
                            {s} {s !== 'All' && `(${vouchers.filter(v => v.status === s).length})`}
                        </button>
                    ))}
                </div>
                <div style={{ position: 'relative' }}>
                    <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vouchers…" style={{ ...inputStyle, paddingLeft: 32, width: 220 }} />
                </div>
            </div>

            {/* ─── VOUCHERS TABLE ─── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            {['#', 'Voucher No', 'Date', 'Payee', 'Type', 'Description', 'Amount', 'Method', 'Vote Head', 'Status', 'Prepared By', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
                                    <p style={{ fontSize: 14, fontWeight: 500 }}>No payment vouchers found</p>
                                    <button onClick={openNew} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', cursor: 'pointer' }}>+ Create First Voucher</button>
                                </td></tr>
                            ) : filtered.map((v, i) => {
                                const sc = statusColors[v.status] || { bg: '#f3f4f6', color: '#6b7280' };
                                return (
                                    <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6' }}>{v.voucher_number}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(v.voucher_date)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.payee_name}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{v.payee_type}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: '#1f2937', whiteSpace: 'nowrap' }}>{fmt(v.amount)}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{v.payment_method}</td>
                                        <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{v.vote_head}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: sc.bg, color: sc.color }}>{v.status}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{v.prepared_by}</td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <button onClick={() => setShowViewModal(v)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280' }} title="View"><FiEye size={12} /></button>
                                                {(v.status === 'Draft' || v.status === 'Rejected') && (
                                                    <button onClick={() => { setEditing(v); setForm({ ...emptyForm, ...v, amount: String(v.amount) }); setShowModal(true); }} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6' }} title="Edit"><FiEdit2 size={12} /></button>
                                                )}
                                                {v.status === 'Pending Approval' && (
                                                    <>
                                                        <button onClick={() => { setShowApproveModal(v); setApprovedBy(''); }} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#d1fae5', color: '#065f46' }}><FiCheck size={10} /> Approve</button>
                                                        <button onClick={() => { setShowRejectModal(v); setRejectReason(''); setApprovedBy(''); }} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#fee2e2', color: '#991b1b' }}><FiX size={10} /> Reject</button>
                                                    </>
                                                )}
                                                {v.status === 'Approved' && (
                                                    <button onClick={() => { setShowPayModal(v); setPaidBy(''); setPayRef(''); }} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#dbeafe', color: '#1e40af' }}>💰 Mark Paid</button>
                                                )}
                                                <button onClick={() => printPaymentVoucher(v)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef3c7', color: '#92400e' }} title="Print Voucher"><FiPrinter size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>Showing {filtered.length} of {vouchers.length} vouchers</span>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 700 }}>
                            <span style={{ color: '#6b7280' }}>Total: <span style={{ color: '#1f2937' }}>{fmt(filtered.reduce((s, v) => s + Number(v.amount || 0), 0))}</span></span>
                            <span style={{ color: '#059669' }}>Paid: {fmt(filtered.filter(v => v.status === 'Paid').reduce((s, v) => s + Number(v.amount || 0), 0))}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── CREATE/EDIT MODAL ─── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', borderRadius: '20px 20px 0 0' }}>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>💳 {editing ? 'Edit' : 'New'} Payment Voucher</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>Official school payment document</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>{form.voucher_number}</span>
                                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                            </div>
                        </div>
                        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Voucher Number</label>
                                <input value={form.voucher_number} onChange={e => setForm({ ...form, voucher_number: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Voucher Date</label>
                                <input type="date" value={form.voucher_date} onChange={e => setForm({ ...form, voucher_date: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Payee Name (Paid To) *</label>
                                <input value={form.payee_name} onChange={e => setForm({ ...form, payee_name: e.target.value })} style={inputStyle} placeholder="Name of person/company to be paid" />
                            </div>
                            <div>
                                <label style={labelStyle}>Payee Type</label>
                                <select value={form.payee_type} onChange={e => setForm({ ...form, payee_type: e.target.value })} style={inputStyle}>
                                    {PAYEE_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Link to Supplier (optional)</label>
                                <select value={form.supplier_id} onChange={e => { const s = suppliers.find(s => String(s.id) === e.target.value); setForm({ ...form, supplier_id: e.target.value, payee_name: s ? s.supplier_name : form.payee_name }); }} style={inputStyle}>
                                    <option value="">— Select supplier —</option>
                                    {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.supplier_name}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Details Description of Services *</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Describe what is being paid for…" />
                            </div>
                            <div>
                                <label style={labelStyle}>Amount (KES) *</label>
                                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ ...inputStyle, fontSize: 16, fontWeight: 800, color: '#059669' }} min="0" step="0.01" placeholder="0.00" />
                            </div>
                            <div>
                                <label style={labelStyle}>Vote Head / Budget Line</label>
                                <select value={form.vote_head} onChange={e => setForm({ ...form, vote_head: e.target.value })} style={inputStyle}>
                                    {VOTE_HEADS.map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Payment Method</label>
                                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} style={inputStyle}>
                                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            {form.payment_method === 'Cheque' && (
                                <div>
                                    <label style={labelStyle}>Cheque Number</label>
                                    <input value={form.cheque_number} onChange={e => setForm({ ...form, cheque_number: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="e.g. 001234" />
                                </div>
                            )}
                            <div>
                                <label style={labelStyle}>Bank Name</label>
                                <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} style={inputStyle} placeholder="e.g. KCB, Equity, Co-op" />
                            </div>
                            <div>
                                <label style={labelStyle}>Account Number</label>
                                <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Reference Number</label>
                                <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="Bank ref / M-Pesa code" />
                            </div>
                            <div>
                                <label style={labelStyle}>Link to LPO (optional)</label>
                                <select value={form.po_id} onChange={e => setForm({ ...form, po_id: e.target.value })} style={inputStyle}>
                                    <option value="">— No linked LPO —</option>
                                    {orders.map(o => <option key={o.id} value={String(o.id)}>{o.po_number} — {fmt(o.total_amount)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Prepared By *</label>
                                <input value={form.prepared_by} onChange={e => setForm({ ...form, prepared_by: e.target.value })} style={inputStyle} placeholder="Bursar / Accounts Clerk name" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Notes</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => saveVoucher('Draft')} disabled={saving} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#6b7280', background: '#e5e7eb', border: 'none', borderRadius: 10, cursor: 'pointer' }}>💾 Save Draft</button>
                            <button onClick={() => saveVoucher('Pending Approval')} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Submitting…' : '📤 Submit for Approval'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── VIEW MODAL ─── */}
            {showViewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowViewModal(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>📋 Voucher Details — {showViewModal.voucher_number}</h3>
                            <button onClick={() => setShowViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24 }}>
                            {[
                                ['Voucher No', showViewModal.voucher_number],
                                ['Date', fmtDate(showViewModal.voucher_date)],
                                ['Payee', showViewModal.payee_name],
                                ['Type', showViewModal.payee_type],
                                ['Description', showViewModal.description],
                                ['Amount', fmt(showViewModal.amount)],
                                ['Payment Method', showViewModal.payment_method],
                                ['Cheque/Ref No', showViewModal.cheque_number || showViewModal.reference_number || '—'],
                                ['Bank', showViewModal.bank_name || '—'],
                                ['Vote Head', showViewModal.vote_head || '—'],
                                ['Status', null],
                                ['Prepared By', showViewModal.prepared_by || '—'],
                                ['Approved By', showViewModal.approved_by || '—'],
                                ['Rejection Reason', showViewModal.rejection_reason || '—'],
                                ['Paid By', showViewModal.paid_by || '—'],
                                ['Paid Date', showViewModal.paid_at ? fmtDateTime(showViewModal.paid_at) : '—'],
                                ['Notes', showViewModal.notes || '—'],
                            ].map(([k, v]) => (
                                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', flexShrink: 0, marginRight: 16 }}>{k}</span>
                                    <span style={{ fontSize: 13, fontWeight: k === 'Amount' ? 800 : 500, color: k === 'Amount' ? '#059669' : '#1f2937', textAlign: 'right' }}>
                                        {k === 'Status' ? <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: statusColors[showViewModal.status]?.bg || '#f3f4f6', color: statusColors[showViewModal.status]?.color || '#6b7280' }}>{showViewModal.status}</span> : v}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => printPaymentVoucher(showViewModal)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={13} /> Print Voucher</button>
                            <button onClick={() => setShowViewModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── APPROVE MODAL ─── */}
            {showApproveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>✅ Approve Payment Voucher</h3>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46', margin: '0 0 4px' }}>{showApproveModal.voucher_number}</p>
                                <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>Payee: <strong>{showApproveModal.payee_name}</strong></p>
                                <p style={{ fontSize: 16, fontWeight: 900, color: '#059669', margin: 0 }}>{fmt(showApproveModal.amount)}</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Approved By (Principal Name) *</label>
                                <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} style={inputStyle} placeholder="Principal's full name" />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowApproveModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={approveVoucher} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>✅ Approve</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── REJECT MODAL ─── */}
            {showRejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>❌ Reject Payment Voucher</h3>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}><strong>{showRejectModal.voucher_number}</strong> — {fmt(showRejectModal.amount)}</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Your Name (Principal) *</label>
                                <input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Rejection Reason *</label>
                                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ ...inputStyle, resize: 'vertical', borderColor: '#fecaca' }} rows={3} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRejectModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={rejectVoucher} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>❌ Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MARK PAID MODAL ─── */}
            {showPayModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 440 }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#1e40af,#1d4ed8)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>💰 Mark as Paid</h3>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: '0 0 4px' }}>{showPayModal.voucher_number}</p>
                                <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>Payee: <strong>{showPayModal.payee_name}</strong></p>
                                <p style={{ fontSize: 16, fontWeight: 900, color: '#1e40af', margin: 0 }}>{fmt(showPayModal.amount)}</p>
                            </div>
                            <div>
                                <label style={labelStyle}>Paid By (Bursar Name) *</label>
                                <input value={paidBy} onChange={e => setPaidBy(e.target.value)} style={inputStyle} placeholder="Bursar / Accounts Clerk" />
                            </div>
                            <div>
                                <label style={labelStyle}>Payment Reference (Cheque/Transfer No)</label>
                                <input value={payRef} onChange={e => setPayRef(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="e.g. CHQ001234 or bank ref" />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowPayModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={markPaid} disabled={saving} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#1e40af,#1d4ed8)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>💰 Mark as Paid</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
