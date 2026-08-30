'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiTrendingUp, FiPlus, FiSearch, FiDownload, FiRefreshCw,
    FiCheckCircle, FiEdit2, FiTrash2, FiX, FiFilter, FiDollarSign,
    FiPrinter, FiEye, FiCheck, FiBarChart2,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtShort = (n: any) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const INCOME_TYPES = [
    'Capitation Grant', 'NG-CDF Bursary', 'County Bursary', 'National Bursary',
    'Tuition Fees', 'Boarding Fees', 'Activity Fees', 'Exam Fees',
    'Admission Fees', 'Transport Fees', 'Uniform Sales', 'Book Sales',
    'Canteen/Tuckshop', 'Hire of Facilities', 'Donations', 'Development Fund',
    'HELB Loan', 'Government Grant', 'Sports Fund', 'Library Fund', 'Other',
];
const PAY_METHODS = ['Bank Transfer', 'Cheque', 'Cash', 'M-Pesa', 'RTGS', 'EFT', 'Banker\'s Draft'];
const VOTE_HEADS = ['Tuition', 'Boarding', 'Government Grants', 'Bursaries', 'Donations', 'Development', 'Operations', 'Other'];

const TYPE_GROUPS: Record<string, string[]> = {
    'All': [],
    'Government Grants': ['Capitation Grant', 'Government Grant', 'HELB Loan'],
    'Bursaries': ['NG-CDF Bursary', 'County Bursary', 'National Bursary'],
    'Fees': ['Tuition Fees', 'Boarding Fees', 'Activity Fees', 'Exam Fees', 'Admission Fees', 'Transport Fees'],
    'Sales & Services': ['Uniform Sales', 'Book Sales', 'Canteen/Tuckshop', 'Hire of Facilities'],
    'Donations & Dev': ['Donations', 'Development Fund', 'Sports Fund', 'Library Fund'],
    'Other': ['Other'],
};

export default function IncomeTrackingPage() {
    const [records, setRecords] = useState<any[]>([]);
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeGroup, setActiveGroup] = useState('All');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState<any>(null);
    const [editing, setEditing] = useState<any>(null);

    const emptyForm: any = {
        receipt_number: '', income_date: new Date().toISOString().split('T')[0],
        income_type: 'Capitation Grant', source: '', description: '',
        amount: '', payment_method: 'Bank Transfer', reference_number: '',
        bank_name: '', vote_head: 'Government Grants', received_by: '',
        verified_by: '', academic_year: new Date().getFullYear(), notes: '',
    };
    const [form, setForm] = useState<any>(emptyForm);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [rRes, scRes] = await Promise.all([
            supabase.from('school_income_records').select('*').order('income_date', { ascending: false }),
            supabase.from('school_details').select('*').maybeSingle(),
        ]);
        setRecords(rRes.data || []);
        setSchoolInfo(scRes.data || {});
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const genReceiptNo = () => `RCP-${new Date().getFullYear()}-${String(records.length + 1).padStart(5, '0')}`;

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, receipt_number: genReceiptNo() });
        setShowModal(true);
    };

    /* ─── FILTERED RECORDS ─── */
    const filtered = useMemo(() => records.filter(r => {
        if (activeGroup !== 'All' && !TYPE_GROUPS[activeGroup]?.includes(r.income_type)) return false;
        if (typeFilter !== 'All' && r.income_type !== typeFilter) return false;
        if (dateFrom && r.income_date < dateFrom) return false;
        if (dateTo && r.income_date > dateTo) return false;
        if (search) {
            const q = search.toLowerCase();
            return (r.receipt_number || '').toLowerCase().includes(q) ||
                (r.income_type || '').toLowerCase().includes(q) ||
                (r.source || '').toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q);
        }
        return true;
    }), [records, activeGroup, typeFilter, dateFrom, dateTo, search]);

    /* ─── STATS ─── */
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const totalYear = records.filter(r => new Date(r.income_date).getFullYear() === thisYear).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalMonth = records.filter(r => { const d = new Date(r.income_date); return d.getFullYear() === thisYear && d.getMonth() === thisMonth; }).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalReconciled = records.filter(r => r.is_reconciled).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalUnreconciled = records.filter(r => !r.is_reconciled).reduce((s, r) => s + Number(r.amount || 0), 0);
    const countUnreconciled = records.filter(r => !r.is_reconciled).length;

    /* ─── SUMMARY BY TYPE ─── */
    const summaryByType = useMemo(() => {
        const map: Record<string, { count: number; amount: number }> = {};
        filtered.forEach(r => {
            if (!map[r.income_type]) map[r.income_type] = { count: 0, amount: 0 };
            map[r.income_type].count++;
            map[r.income_type].amount += Number(r.amount || 0);
        });
        return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
    }, [filtered]);

    const totalFiltered = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

    /* ─── SAVE ─── */
    const saveRecord = async () => {
        if (!form.income_type) { toast.error('Select income type'); return; }
        if (!form.source.trim()) { toast.error('Enter source of income'); return; }
        if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
        if (!form.received_by.trim()) { toast.error('Enter received by name'); return; }
        setSaving(true);
        const payload = { ...form, amount: Number(form.amount), is_reconciled: false };
        const { error } = editing
            ? await supabase.from('school_income_records').update(payload).eq('id', editing.id)
            : await supabase.from('school_income_records').insert([payload]);
        if (error) { toast.error(error.message); setSaving(false); return; }
        // Log audit
        await supabase.from('school_store_audit_log').insert([{ action_type: 'INCOME_RECORDED', record_ref: form.receipt_number, description: `Income recorded: ${form.income_type} — ${fmt(form.amount)} from ${form.source}`, actor: form.received_by, actor_role: 'Bursar' }]);
        toast.success(`✅ Income ${editing ? 'updated' : 'recorded'} — ${form.receipt_number}`);
        setShowModal(false); setEditing(null); setSaving(false); fetchAll();
    };

    /* ─── MARK RECONCILED ─── */
    const markReconciled = async (r: any) => {
        if (r.is_reconciled) { toast('Already reconciled'); return; }
        await supabase.from('school_income_records').update({ is_reconciled: true, reconciled_at: new Date().toISOString() }).eq('id', r.id);
        toast.success(`✅ ${r.receipt_number} marked as reconciled`);
        fetchAll();
    };

    /* ─── DELETE ─── */
    const deleteRecord = async (r: any) => {
        if (!confirm(`Delete income record ${r.receipt_number}? This cannot be undone.`)) return;
        await supabase.from('school_income_records').delete().eq('id', r.id);
        toast.success('Deleted'); fetchAll();
    };

    /* ─── PREMIUM EXCEL EXPORT ─── */
    const exportExcel = () => {
        const data = filtered.length > 0 ? filtered : records;
        const headers = ['Receipt No', 'Date', 'Income Type', 'Source', 'Description', 'Amount (KES)', 'Payment Method', 'Reference No', 'Bank', 'Vote Head', 'Reconciled', 'Received By', 'Verified By', 'Academic Year', 'Notes', 'Created At'];
        const rows = data.map(r => [
            r.receipt_number || '', r.income_date || '', r.income_type || '', r.source || '',
            r.description || '', Number(r.amount || 0).toFixed(2), r.payment_method || '',
            r.reference_number || '', r.bank_name || '', r.vote_head || '',
            r.is_reconciled ? 'YES' : 'NO', r.received_by || '', r.verified_by || '',
            r.academic_year || '', r.notes || '', fmtDateTime(r.created_at),
        ]);
        // Summary rows
        const summaryRows = [
            [], ['SUMMARY BY INCOME TYPE', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ['Type', '', '', '', '', 'Count', 'Total (KES)', '', '', '', '', '', '', '', '', ''],
            ...summaryByType.map(([type, stats]) => [type, '', '', '', '', String(stats.count), stats.amount.toFixed(2), '', '', '', '', '', '', '', '', '']),
            [], ['', '', '', '', '', '', 'GRAND TOTAL', data.reduce((s, r) => s + Number(r.amount || 0), 0).toFixed(2), '', '', '', '', '', '', '', ''],
        ];
        const allRows = [headers, ...rows, ...summaryRows];
        const csv = '\uFEFF' + allRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `Income_Register_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success('✅ Premium Excel export downloaded');
    };

    /* ─── PRINT INCOME REGISTER (PDF) ─── */
    const printRegister = () => {
        const schoolName = schoolInfo?.school_name || 'Alpha School';
        const schoolAddr = schoolInfo?.address || '';
        const w = window.open('', '_blank', 'width=1000,height=800');
        w?.document.write(`<!DOCTYPE html><html><head><title>Income Register</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#111; background:#fff; padding:20px; }
.header { text-align:center; margin-bottom:16px; border-bottom:3px solid #065f46; padding-bottom:12px; }
.school-name { font-size:20px; font-weight:900; color:#065f46; }
.school-addr { font-size:11px; color:#444; margin-top:2px; }
.report-title { font-size:14px; font-weight:800; margin-top:8px; text-transform:uppercase; letter-spacing:1px; }
.filters { font-size:10px; color:#666; margin-top:4px; }
.kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:14px 0; }
.kpi { border:2px solid #065f46; border-radius:8px; padding:10px; text-align:center; }
.kpi-label { font-size:9px; font-weight:700; text-transform:uppercase; color:#065f46; }
.kpi-val { font-size:16px; font-weight:900; color:#1f2937; margin-top:4px; }
table { width:100%; border-collapse:collapse; font-size:10px; margin-top:14px; }
thead tr { background:#065f46; color:#fff; }
th { padding:8px 6px; text-align:left; font-weight:700; font-size:9px; text-transform:uppercase; white-space:nowrap; }
td { padding:7px 6px; border-bottom:1px solid #e5e7eb; }
tr:nth-child(even) td { background:#f0fdf4; }
.recon-yes { color:#065f46; font-weight:700; }
.recon-no { color:#dc2626; font-weight:700; }
.total-row td { background:#d1fae5; font-weight:900; border-top:2px solid #065f46; }
.summary { margin-top:20px; }
.summary table { margin-top:8px; }
.summary thead tr { background:#1e3a5f; }
.footer { margin-top:20px; border-top:2px solid #065f46; padding-top:10px; display:flex; justify-content:space-between; font-size:10px; color:#666; }
@media print { @page { size:A4 landscape; margin:8mm; } }
</style></head><body>
<div class="header">
  <div class="school-name">${schoolName}</div>
  <div class="school-addr">${schoolAddr}</div>
  <div class="report-title">📊 Income Register — ${dateFrom || 'All Dates'}${dateTo ? ' to ' + dateTo : ''}</div>
  <div class="filters">Type: ${typeFilter} | Group: ${activeGroup} | Generated: ${new Date().toLocaleString('en-KE')}</div>
</div>
<div class="kpi-row">
  <div class="kpi"><div class="kpi-label">Total Records</div><div class="kpi-val">${filtered.length}</div></div>
  <div class="kpi"><div class="kpi-label">Total Income</div><div class="kpi-val">KES ${fmtShort(totalFiltered)}</div></div>
  <div class="kpi"><div class="kpi-label">This Year</div><div class="kpi-val">KES ${fmtShort(totalYear)}</div></div>
  <div class="kpi"><div class="kpi-label">Unreconciled</div><div class="kpi-val">${countUnreconciled} (KES ${fmtShort(totalUnreconciled)})</div></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>Receipt No</th><th>Date</th><th>Type</th><th>Source</th><th>Description</th>
    <th>Amount (KES)</th><th>Method</th><th>Reference</th><th>Vote Head</th><th>Reconciled</th><th>Received By</th>
  </tr></thead>
  <tbody>
    ${filtered.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td style="font-family:monospace;font-weight:700">${r.receipt_number || ''}</td>
      <td>${fmtDate(r.income_date)}</td>
      <td style="font-weight:600">${r.income_type || ''}</td>
      <td>${r.source || ''}</td>
      <td>${r.description || ''}</td>
      <td style="text-align:right;font-weight:700">${fmtShort(r.amount)}</td>
      <td>${r.payment_method || ''}</td>
      <td style="font-family:monospace">${r.reference_number || ''}</td>
      <td>${r.vote_head || ''}</td>
      <td class="${r.is_reconciled ? 'recon-yes' : 'recon-no'}">${r.is_reconciled ? '✓ YES' : '✗ NO'}</td>
      <td>${r.received_by || ''}</td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="6" style="text-align:right">GRAND TOTAL</td>
      <td style="text-align:right">KES ${fmtShort(totalFiltered)}</td>
      <td colspan="5"></td>
    </tr>
  </tbody>
</table>
<div class="summary">
  <div style="font-size:12px;font-weight:800;margin-bottom:6px">📊 Summary by Income Type</div>
  <table>
    <thead><tr><th>Income Type</th><th>No. of Records</th><th>Total Amount (KES)</th><th>% of Total</th></tr></thead>
    <tbody>
      ${summaryByType.map(([type, stats]) => `<tr>
        <td style="font-weight:600">${type}</td>
        <td style="text-align:center">${stats.count}</td>
        <td style="text-align:right;font-weight:700">KES ${fmtShort(stats.amount)}</td>
        <td style="text-align:center">${totalFiltered > 0 ? ((stats.amount / totalFiltered) * 100).toFixed(1) : 0}%</td>
      </tr>`).join('')}
      <tr class="total-row"><td>TOTAL</td><td style="text-align:center">${filtered.length}</td><td style="text-align:right">KES ${fmtShort(totalFiltered)}</td><td style="text-align:center">100%</td></tr>
    </tbody>
  </table>
</div>
<div class="footer">
  <div>Prepared by: _______________________________</div>
  <div>Verified by: _______________________________</div>
  <div>Date: ${new Date().toLocaleDateString('en-KE')}</div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
        w?.document.close();
    };

    const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13, fontWeight: 500, background: '#fff', outline: 'none', boxSizing: 'border-box' };
    const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, display: 'block', marginBottom: 4, letterSpacing: '0.05em' };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'linear-gradient(135deg,#059669,#047857)' }}>💰</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>Loading Income Register…</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ─── HERO ─── */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#34d399,#10b981)', boxShadow: '0 8px 25px rgba(16,185,129,0.4)' }}>
                                <FiTrendingUp color="#fff" size={22} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
                                    💰 Income Tracking Register
                                    <span style={{ marginLeft: 8, padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: 'linear-gradient(135deg,#34d399,#10b981)', color: '#fff' }}>ULTRA</span>
                                    {countUnreconciled > 0 && <span style={{ marginLeft: 8, padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: '#f59e0b', color: '#fff' }}>⚡ {countUnreconciled} UNRECONCILED</span>}
                                </h1>
                                <p style={{ color: '#6ee7b7', fontSize: 12, margin: '2px 0 0', fontWeight: 500 }}>Track all school income · Capitation · Fees · Bursaries · Donations · Premium PDF & Excel</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={openNew} style={{ padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiPlus size={14} /> Record Income
                            </button>
                            <button onClick={exportExcel} style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiDownload size={14} /> Excel
                            </button>
                            <button onClick={printRegister} style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FiPrinter size={14} /> Print PDF
                            </button>
                            <button onClick={fetchAll} style={{ padding: 10, borderRadius: 12, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer' }}>
                                <FiRefreshCw size={14} />
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {[
                            { label: 'Total This Year', value: fmt(totalYear), icon: '📅' },
                            { label: 'Total This Month', value: fmt(totalMonth), icon: '🗓️' },
                            { label: 'Reconciled', value: fmt(totalReconciled), icon: '✅' },
                            { label: 'Unreconciled', value: fmt(totalUnreconciled), icon: '⚡', pulse: countUnreconciled > 0 },
                            { label: 'Total Records', value: records.length, icon: '📋' },
                        ].map((c: any, i) => (
                            <div key={i} style={{ borderRadius: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{c.label}</span>
                                </div>
                                <p style={{ fontSize: 17, fontWeight: 900, color: c.pulse ? '#fca5a5' : '#fff', margin: 0 }}>{c.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── FILTERS ROW ─── */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…" style={{ ...inputStyle, paddingLeft: 32 }} />
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
                        <option value="All">All Types</option>
                        {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ ...labelStyle, whiteSpace: 'nowrap', marginBottom: 0 }}>From:</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 160 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ ...labelStyle, whiteSpace: 'nowrap', marginBottom: 0 }}>To:</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputStyle, width: 160 }} />
                    </div>
                    {(dateFrom || dateTo || search || typeFilter !== 'All') && (
                        <button onClick={() => { setSearch(''); setTypeFilter('All'); setDateFrom(''); setDateTo(''); }} style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiX size={12} /> Clear
                        </button>
                    )}
                </div>
                {/* Group Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.keys(TYPE_GROUPS).map(g => (
                        <button key={g} onClick={() => setActiveGroup(g)}
                            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                                background: activeGroup === g ? 'linear-gradient(135deg,#059669,#047857)' : '#f3f4f6',
                                color: activeGroup === g ? '#fff' : '#6b7280',
                                boxShadow: activeGroup === g ? '0 4px 12px rgba(5,150,105,0.3)' : 'none' }}>
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── MAIN TABLE ─── */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            {['#', 'Receipt No', 'Date', 'Income Type', 'Source', 'Description', 'Amount', 'Method', 'Reference', 'Vote Head', 'Reconciled', 'Received By', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
                                    <p style={{ fontSize: 14, fontWeight: 500 }}>No income records found</p>
                                    <button onClick={openNew} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', cursor: 'pointer' }}>+ Record First Income</button>
                                </td></tr>
                            ) : filtered.map((r, i) => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: r.is_reconciled ? (i % 2 === 0 ? '#fff' : '#fafafa') : '#fffbeb' }}>
                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{r.receipt_number}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(r.income_date)}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#d1fae5', color: '#065f46' }}>{r.income_type}</span>
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 900, color: '#059669', whiteSpace: 'nowrap' }}>{fmt(r.amount)}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{r.payment_method}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#6366f1' }}>{r.reference_number || '—'}</td>
                                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>{r.vote_head || '—'}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        {r.is_reconciled
                                            ? <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: '#d1fae5', color: '#065f46' }}>✅ Reconciled</span>
                                            : <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e' }}>⚡ Pending</span>}
                                    </td>
                                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>{r.received_by}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => setShowViewModal(r)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280' }} title="View"><FiEye size={11} /></button>
                                            <button onClick={() => { setEditing(r); setForm({ ...emptyForm, ...r, amount: String(r.amount) }); setShowModal(true); }} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6' }} title="Edit"><FiEdit2 size={11} /></button>
                                            {!r.is_reconciled && (
                                                <button onClick={() => markReconciled(r)} style={{ padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#d1fae5', color: '#065f46' }} title="Mark Reconciled"><FiCheck size={11} /></button>
                                            )}
                                            <button onClick={() => deleteRecord(r)} style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444' }} title="Delete"><FiTrash2 size={11} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{filtered.length} records shown</span>
                        <div style={{ display: 'flex', gap: 20, fontSize: 13, fontWeight: 700 }}>
                            <span style={{ color: '#059669' }}>Total: <strong style={{ fontSize: 15 }}>{fmt(totalFiltered)}</strong></span>
                            <span style={{ color: '#065f46' }}>Reconciled: {fmt(filtered.filter(r => r.is_reconciled).reduce((s, r) => s + Number(r.amount || 0), 0))}</span>
                            <span style={{ color: '#92400e' }}>Unreconciled: {fmt(filtered.filter(r => !r.is_reconciled).reduce((s, r) => s + Number(r.amount || 0), 0))}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── SUMMARY BY TYPE ─── */}
            {summaryByType.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#064e3b,#065f46)' }}>
                        <FiBarChart2 color="#fff" size={16} />
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>📊 Income Summary by Type</h3>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>For current filter</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                {['#', 'Income Type', 'No. of Records', 'Total Amount', '% of Total', 'Bar'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {summaryByType.map(([type, stats], i) => {
                                    const pct = totalFiltered > 0 ? (stats.amount / totalFiltered) * 100 : 0;
                                    const barColors = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
                                    const color = barColors[i % barColors.length];
                                    return (
                                        <tr key={type} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#9ca3af' }}>{i + 1}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{type}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'center', fontWeight: 600, color: '#374151' }}>{stats.count}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 900, color: '#059669' }}>{fmt(stats.amount)}</td>
                                            <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: color }}>{pct.toFixed(1)}%</td>
                                            <td style={{ padding: '10px 14px', width: 200 }}>
                                                <div style={{ background: '#f3f4f6', borderRadius: 20, height: 12, overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 20, transition: 'width 0.5s ease' }} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #059669' }}>
                                    <td colSpan={2} style={{ padding: '12px 14px', fontSize: 13, fontWeight: 900, color: '#065f46' }}>GRAND TOTAL</td>
                                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 900, color: '#065f46', textAlign: 'center' }}>{filtered.length}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 16, fontWeight: 900, color: '#059669' }}>{fmt(totalFiltered)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 900, color: '#059669' }}>100%</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── CREATE/EDIT MODAL ─── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: '20px 20px 0 0' }}>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>💰 {editing ? 'Edit' : 'Record New'} Income</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>Receipt: {form.receipt_number}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Receipt Number</label>
                                <input value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace', color: '#059669', fontWeight: 700 }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Income Date</label>
                                <input type="date" value={form.income_date} onChange={e => setForm({ ...form, income_date: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Income Type *</label>
                                <select value={form.income_type} onChange={e => setForm({ ...form, income_type: e.target.value })} style={inputStyle}>
                                    {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Vote Head</label>
                                <select value={form.vote_head} onChange={e => setForm({ ...form, vote_head: e.target.value })} style={inputStyle}>
                                    {VOTE_HEADS.map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Source *</label>
                                <input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={inputStyle} placeholder="e.g. Ministry of Education, Parent John Doe, County Government" />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Details of this income…" />
                            </div>
                            <div>
                                <label style={labelStyle}>Amount (KES) *</label>
                                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={{ ...inputStyle, fontSize: 16, fontWeight: 800, color: '#059669' }} min="0" step="0.01" placeholder="0.00" />
                            </div>
                            <div>
                                <label style={labelStyle}>Payment Method</label>
                                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} style={inputStyle}>
                                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Reference No. (Bank/M-Pesa/Cheque)</label>
                                <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="e.g. MPESA123, CHQ001" />
                            </div>
                            <div>
                                <label style={labelStyle}>Bank Name</label>
                                <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} style={inputStyle} placeholder="e.g. KCB, Equity, Co-op" />
                            </div>
                            <div>
                                <label style={labelStyle}>Received By *</label>
                                <input value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })} style={inputStyle} placeholder="Bursar / Accounts Clerk" />
                            </div>
                            <div>
                                <label style={labelStyle}>Verified By</label>
                                <input value={form.verified_by} onChange={e => setForm({ ...form, verified_by: e.target.value })} style={inputStyle} placeholder="Principal / HoD name" />
                            </div>
                            <div>
                                <label style={labelStyle}>Academic Year</label>
                                <input type="number" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: Number(e.target.value) })} style={inputStyle} min="2020" max="2040" />
                            </div>
                            <div>
                                <label style={labelStyle}>Notes</label>
                                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={saveRecord} disabled={saving} style={{ padding: '10px 24px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Saving…' : editing ? '💾 Update Record' : '💰 Record Income'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── VIEW MODAL ─── */}
            {showViewModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowViewModal(null)}>
                    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 25px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#064e3b,#065f46)', borderRadius: '20px 20px 0 0' }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>💰 Income Details — {showViewModal.receipt_number}</h3>
                            <button onClick={() => setShowViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}><FiX /></button>
                        </div>
                        <div style={{ padding: 24 }}>
                            {[
                                ['Receipt No', showViewModal.receipt_number],
                                ['Date', fmtDate(showViewModal.income_date)],
                                ['Income Type', showViewModal.income_type],
                                ['Source', showViewModal.source],
                                ['Description', showViewModal.description || '—'],
                                ['Amount', fmt(showViewModal.amount)],
                                ['Method', showViewModal.payment_method],
                                ['Reference', showViewModal.reference_number || '—'],
                                ['Bank', showViewModal.bank_name || '—'],
                                ['Vote Head', showViewModal.vote_head || '—'],
                                ['Reconciled', showViewModal.is_reconciled ? '✅ Yes — ' + fmtDateTime(showViewModal.reconciled_at) : '⏳ Not yet'],
                                ['Received By', showViewModal.received_by],
                                ['Verified By', showViewModal.verified_by || '—'],
                                ['Academic Year', showViewModal.academic_year || '—'],
                                ['Notes', showViewModal.notes || '—'],
                                ['Recorded At', fmtDateTime(showViewModal.created_at)],
                            ].map(([k, v]) => (
                                <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', flexShrink: 0, marginRight: 16 }}>{k}</span>
                                    <span style={{ fontSize: 13, fontWeight: k === 'Amount' ? 900 : 500, color: k === 'Amount' ? '#059669' : '#1f2937', textAlign: 'right' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            {!showViewModal.is_reconciled && <button onClick={() => { markReconciled(showViewModal); setShowViewModal(null); }} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#065f46', background: '#d1fae5', border: 'none', borderRadius: 10, cursor: 'pointer' }}>✅ Mark Reconciled</button>}
                            <button onClick={() => setShowViewModal(null)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
