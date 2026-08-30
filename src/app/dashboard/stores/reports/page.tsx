'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiBarChart2, FiDownload, FiPrinter, FiRefreshCw, FiFilter,
    FiFileText, FiPackage, FiTrendingUp, FiAlertCircle, FiDollarSign,
    FiShoppingCart, FiList, FiUsers, FiShield, FiActivity,
} from 'react-icons/fi';

const fmt = (n: any) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const fmtN = (n: any) => Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const REPORTS = [
    { id: 'stock-valuation',     icon: '📦', label: 'Stock Valuation',        color: '#b45309' },
    { id: 'issuances-dept',      icon: '📤', label: 'Issuances by Department', color: '#1e40af' },
    { id: 'issuances-person',    icon: '👤', label: 'Issuances by Person',     color: '#7c3aed' },
    { id: 'grn-purchases',       icon: '📥', label: 'GRN & Purchases',         color: '#065f46' },
    { id: 'payment-vouchers',    icon: '💳', label: 'Payment Vouchers',        color: '#1e3a5f' },
    { id: 'income-register',     icon: '💰', label: 'Income Register',         color: '#047857' },
    { id: 'income-vs-expense',   icon: '⚖️', label: 'Income vs Expenditure',   color: '#dc2626' },
    { id: 'low-stock',           icon: '⚠️', label: 'Low Stock Alert',         color: '#dc2626' },
    { id: 'supplier-spending',   icon: '🏭', label: 'Supplier Spending',       color: '#374151' },
    { id: 'audit-trail',         icon: '📋', label: 'Audit Trail',             color: '#1f2937' },
];

const exportCSV = (headers: string[], rows: any[][], filename: string) => {
    const allRows = [headers, ...rows];
    const csv = '\uFEFF' + allRows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
};

const printReport = (title: string, schoolName: string, subtitleHtml: string, tableHtml: string, summaryHtml = '') => {
    const w = window.open('', '_blank', 'width=1100,height=900');
    w?.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:#111; background:#fff; padding:24px; }
.header { text-align:center; margin-bottom:18px; padding-bottom:12px; border-bottom:3px solid #1e3a5f; }
.school-name { font-size:22px; font-weight:900; color:#1e3a5f; }
.report-title { font-size:15px; font-weight:800; margin-top:6px; text-transform:uppercase; letter-spacing:1px; color:#374151; }
.subtitle { font-size:10px; color:#6b7280; margin-top:4px; }
table { width:100%; border-collapse:collapse; margin:14px 0; font-size:10px; }
thead tr { background:#1e3a5f; color:#fff; }
th { padding:8px 7px; text-align:left; font-weight:700; font-size:9px; text-transform:uppercase; white-space:nowrap; }
td { padding:7px; border-bottom:1px solid #e5e7eb; }
tr:nth-child(even) td { background:#f8fafc; }
.total-row td { background:#e0f2fe; font-weight:900; border-top:2px solid #1e3a5f; font-size:11px; }
.badge { padding:2px 6px; border-radius:12px; font-size:9px; font-weight:800; }
.kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; margin:12px 0; }
.kpi { border:2px solid #1e3a5f; border-radius:8px; padding:12px; text-align:center; }
.kpi-label { font-size:9px; font-weight:700; text-transform:uppercase; color:#1e3a5f; }
.kpi-val { font-size:18px; font-weight:900; color:#111; margin-top:4px; }
.section-title { font-size:13px; font-weight:800; margin:16px 0 6px; color:#1e3a5f; text-transform:uppercase; letter-spacing:0.5px; }
.footer { margin-top:24px; border-top:2px solid #1e3a5f; padding-top:12px; display:flex; justify-content:space-between; font-size:10px; color:#666; }
@media print { @page { size:A4 landscape; margin:8mm; } body { padding:10px; } }
</style></head><body>
<div class="header">
  <div class="school-name">${schoolName}</div>
  <div class="report-title">${title}</div>
  <div class="subtitle">${subtitleHtml} | Generated: ${new Date().toLocaleString('en-KE')}</div>
</div>
${tableHtml}
${summaryHtml}
<div class="footer">
  <div>Prepared by: _______________________________</div>
  <div>Authorized by: _______________________________</div>
  <div>Date: ${new Date().toLocaleDateString('en-KE')}</div>
</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w?.document.close();
};

export default function StoresReportsPage() {
    const [activeReport, setActiveReport] = useState('stock-valuation');
    const [data, setData] = useState<any>({});
    const [schoolInfo, setSchoolInfo] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');

    useEffect(() => {
        supabase.from('school_details').select('*').maybeSingle().then(({ data: d }) => setSchoolInfo(d || {}));
    }, []);

    const loadReport = useCallback(async () => {
        setLoading(true);
        const sn = schoolInfo?.school_name || 'Alpha School';
        let q: any;
        const from = dateFrom || '2020-01-01';
        const to = dateTo || '2099-12-31';

        if (activeReport === 'stock-valuation') {
            const { data: items } = await supabase.from('school_store_items').select('*').eq('is_active', true).order('category');
            setData({ items: items || [], schoolName: sn });
        }
        else if (activeReport === 'issuances-dept') {
            q = supabase.from('school_store_issuances').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59').order('department');
            if (statusFilter !== 'All') q = q.eq('status', statusFilter);
            const { data: iss } = await q;
            setData({ issuances: iss || [], schoolName: sn });
        }
        else if (activeReport === 'issuances-person') {
            q = supabase.from('school_store_issuances').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59').order('issued_to');
            const { data: iss } = await q;
            setData({ issuances: iss || [], schoolName: sn });
        }
        else if (activeReport === 'grn-purchases') {
            const { data: grns } = await supabase.from('school_store_purchases').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59').order('created_at', { ascending: false });
            setData({ grns: grns || [], schoolName: sn });
        }
        else if (activeReport === 'payment-vouchers') {
            q = supabase.from('school_payment_vouchers').select('*').gte('voucher_date', from).lte('voucher_date', to).order('voucher_date', { ascending: false });
            if (statusFilter !== 'All') q = q.eq('status', statusFilter);
            const { data: vou } = await q;
            setData({ vouchers: vou || [], schoolName: sn });
        }
        else if (activeReport === 'income-register') {
            q = supabase.from('school_income_records').select('*').gte('income_date', from).lte('income_date', to).order('income_date', { ascending: false });
            if (typeFilter !== 'All') q = q.eq('income_type', typeFilter);
            const { data: inc } = await q;
            setData({ income: inc || [], schoolName: sn });
        }
        else if (activeReport === 'income-vs-expense') {
            const [incRes, pvRes] = await Promise.all([
                supabase.from('school_income_records').select('*').gte('income_date', from).lte('income_date', to),
                supabase.from('school_payment_vouchers').select('*').eq('status', 'Paid').gte('voucher_date', from).lte('voucher_date', to),
            ]);
            setData({ income: incRes.data || [], vouchers: pvRes.data || [], schoolName: sn });
        }
        else if (activeReport === 'low-stock') {
            const { data: items } = await supabase.from('school_store_items').select('*');
            const low = (items || []).filter((i: any) => i.quantity <= (i.reorder_level || 5));
            setData({ items: low, schoolName: sn });
        }
        else if (activeReport === 'supplier-spending') {
            const { data: grns } = await supabase.from('school_store_purchases').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59');
            // Group by supplier
            const map: Record<string, { count: number; qty: number; total: number; last: string }> = {};
            (grns || []).forEach((g: any) => {
                const sup = g.supplier || 'Unknown';
                if (!map[sup]) map[sup] = { count: 0, qty: 0, total: 0, last: '' };
                map[sup].count++;
                map[sup].qty += Number(g.quantity || 0);
                map[sup].total += Number(g.total_cost || 0);
                if (!map[sup].last || g.created_at > map[sup].last) map[sup].last = g.created_at;
            });
            setData({ suppliers: Object.entries(map).sort((a, b) => b[1].total - a[1].total), schoolName: sn });
        }
        else if (activeReport === 'audit-trail') {
            const { data: logs } = await supabase.from('school_store_audit_log').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59').order('created_at', { ascending: false }).limit(500);
            setData({ logs: logs || [], schoolName: sn });
        }
        setLoading(false);
    }, [activeReport, dateFrom, dateTo, statusFilter, typeFilter, schoolInfo]);

    useEffect(() => { loadReport(); }, [activeReport]);

    const inp: React.CSSProperties = { padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff', outline: 'none' };
    const sn = schoolInfo?.school_name || 'Alpha School';

    /* ─── RENDER REPORT CONTENT ─── */
    const renderReport = () => {
        if (loading) return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📊</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#6b7280' }}>Loading report data…</p>
            </div>
        );

        // ─── STOCK VALUATION ───
        if (activeReport === 'stock-valuation') {
            const items: any[] = data.items || [];
            const totalValue = items.reduce((s: number, i: any) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
            const lowStock = items.filter((i: any) => i.quantity <= (i.reorder_level || 5));
            const headers = ['#', 'Code', 'Item Name', 'Category', 'Unit', 'Qty', 'Unit Price (KES)', 'Total Value (KES)', 'Reorder Level', 'Status', 'Location', 'Supplier'];
            const rows = items.map((i: any, idx: number) => [idx + 1, i.item_code || '', i.item_name, i.category, i.unit, i.quantity, fmtN(i.unit_price), fmtN((i.quantity || 0) * (i.unit_price || 0)), i.reorder_level || 5, i.quantity <= (i.reorder_level || 5) ? 'LOW STOCK' : 'OK', i.location || '', i.supplier || '']);
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                        {[{ l: 'Total Items', v: items.length, c: '#1e3a5f' }, { l: 'Total Stock Value', v: fmt(totalValue), c: '#059669' }, { l: 'Low Stock Items', v: lowStock.length, c: '#dc2626', pulse: lowStock.length > 0 }, { l: 'Avg Item Value', v: fmt(items.length ? totalValue / items.length : 0), c: '#7c3aed' }].map((k: any, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `2px solid ${k.c}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: k.c, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: k.pulse ? '#dc2626' : '#1f2937' }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Stock_Valuation')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#065f46', background: '#d1fae5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => {
                            const kpiHtml = `<div class="kpi-row"><div class="kpi"><div class="kpi-label">Total Items</div><div class="kpi-val">${items.length}</div></div><div class="kpi"><div class="kpi-label">Total Value</div><div class="kpi-val">KES ${fmtN(totalValue)}</div></div><div class="kpi"><div class="kpi-label">Low Stock</div><div class="kpi-val">${lowStock.length}</div></div></div>`;
                            const tableHtml = kpiHtml + `<table><thead><tr>${['#', 'Code', 'Item', 'Category', 'Unit', 'Qty', 'Unit Price', 'Total Value', 'Reorder', 'Status', 'Supplier'].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${items.map((i: any, idx: number) => `<tr><td>${idx + 1}</td><td style="font-family:monospace">${i.item_code || ''}</td><td style="font-weight:700">${i.item_name}</td><td>${i.category}</td><td>${i.unit}</td><td style="text-align:center;font-weight:900;color:${i.quantity <= (i.reorder_level || 5) ? '#dc2626' : '#059669'}">${i.quantity}</td><td style="text-align:right">${fmtN(i.unit_price)}</td><td style="text-align:right;font-weight:700">${fmtN((i.quantity || 0) * (i.unit_price || 0))}</td><td style="text-align:center">${i.reorder_level || 5}</td><td><span class="badge" style="background:${i.quantity <= (i.reorder_level || 5) ? '#fee2e2' : '#d1fae5'};color:${i.quantity <= (i.reorder_level || 5) ? '#dc2626' : '#059669'}">${i.quantity <= (i.reorder_level || 5) ? '⚠️ LOW' : '✅ OK'}</span></td><td>${i.supplier || '—'}</td></tr>`).join('')}<tr class="total-row"><td colspan="7" style="text-align:right">GRAND TOTAL VALUE</td><td style="text-align:right">KES ${fmtN(totalValue)}</td><td colspan="3"></td></tr></tbody></table>`;
                            printReport('Stock Valuation Report', sn, `All Active Items | ${new Date().toLocaleDateString('en-KE')}`, tableHtml);
                        }} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#1e3a5f' }}>
                                    {['#', 'Code', 'Item Name', 'Category', 'Unit', 'Qty', 'Unit Price', 'Total Value', 'Reorder', 'Status', 'Location', 'Supplier'].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {items.length === 0 ? <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No items. Click Load Report.</td></tr>
                                        : items.map((i: any, idx: number) => {
                                            const isLow = i.quantity <= (i.reorder_level || 5);
                                            return (
                                                <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6', background: isLow ? '#fff5f5' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#b45309' }}>{i.item_code || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{i.item_name}</td>
                                                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 20 }}>{i.category}</span></td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.unit}</td>
                                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 15, fontWeight: 900, color: isLow ? '#dc2626' : '#1f2937' }}>{i.quantity}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#374151', textAlign: 'right' }}>{fmt(i.unit_price)}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt((i.quantity || 0) * (i.unit_price || 0))}</td>
                                                    <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 12, color: '#6b7280' }}>{i.reorder_level || 5}</td>
                                                    <td style={{ padding: '9px 12px' }}>{isLow ? <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: '#fee2e2', color: '#dc2626' }}>⚠️ LOW</span> : <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: '#d1fae5', color: '#059669' }}>✅ OK</span>}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.location || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.supplier || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    {items.length > 0 && <tr style={{ background: '#e0f2fe', borderTop: '2px solid #1e3a5f' }}>
                                        <td colSpan={7} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#1e3a5f', textAlign: 'right' }}>GRAND TOTAL VALUE</td>
                                        <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt(totalValue)}</td>
                                        <td colSpan={4} />
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── ISSUANCES BY DEPARTMENT ───
        if (activeReport === 'issuances-dept' || activeReport === 'issuances-person') {
            const issuances: any[] = data.issuances || [];
            const groupKey = activeReport === 'issuances-dept' ? 'department' : 'issued_to';
            const groupLabel = activeReport === 'issuances-dept' ? 'Department' : 'Person';
            const totalQty = issuances.reduce((s: number, i: any) => s + Number(i.quantity || 0), 0);
            const totalVal = issuances.reduce((s: number, i: any) => s + Number(i.total_value || 0), 0);
            const pendingCount = issuances.filter((i: any) => i.status === 'Pending').length;
            // Group
            const groupMap: Record<string, { count: number; qty: number; val: number }> = {};
            issuances.forEach((i: any) => { const k = i[groupKey] || 'Unspecified'; if (!groupMap[k]) groupMap[k] = { count: 0, qty: 0, val: 0 }; groupMap[k].count++; groupMap[k].qty += Number(i.quantity || 0); groupMap[k].val += Number(i.total_value || 0); });
            const headers = ['#', 'ISS No', 'Date', 'Item', 'Qty', 'Unit', 'Value (KES)', 'Issued To', groupLabel, 'Purpose', 'Status', 'Requested By', 'Approved By'];
            const rows = issuances.map((i: any, idx: number) => [idx + 1, i.issuance_number || '', fmtDate(i.created_at), i.item_name, i.quantity, i.unit || '', fmtN(i.total_value), i.issued_to, i[groupKey] || '', i.purpose || '', i.status, i.requested_by || '', i.approved_by || '']);
            const statusColors: Record<string, string> = { Pending: '#fef3c7', Approved: '#d1fae5', Issued: '#dbeafe', Rejected: '#fee2e2' };
            const statusTextColors: Record<string, string> = { Pending: '#92400e', Approved: '#065f46', Issued: '#1e40af', Rejected: '#991b1b' };
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
                        {[{ l: 'Total Issuances', v: issuances.length, c: '#1e40af' }, { l: 'Total Qty Issued', v: totalQty, c: '#7c3aed' }, { l: 'Total Value', v: fmt(totalVal), c: '#059669' }, { l: 'Pending Approval', v: pendingCount, c: '#dc2626', pulse: pendingCount > 0 }].map((k: any, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `2px solid ${k.c}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: k.c, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: k.pulse ? '#dc2626' : '#1f2937' }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                    {Object.keys(groupMap).length > 0 && (
                        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a5f', marginBottom: 10 }}>📊 Summary by {groupLabel}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {Object.entries(groupMap).sort((a, b) => b[1].val - a[1].val).map(([grp, stats]) => (
                                    <div key={grp} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 120 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f' }}>{grp}</div>
                                        <div style={{ fontSize: 16, fontWeight: 900, color: '#1d4ed8' }}>{stats.count}</div>
                                        <div style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>{fmt(stats.val)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, `Issuances_by_${groupLabel}`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1e40af', background: '#dbeafe', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => {
                            const tableHtml = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${issuances.map((i: any, idx: number) => `<tr><td>${idx + 1}</td><td style="font-family:monospace;font-weight:700">${i.issuance_number || ''}</td><td>${fmtDate(i.created_at)}</td><td style="font-weight:700">${i.item_name}</td><td style="text-align:center">${i.quantity}</td><td>${i.unit || ''}</td><td style="text-align:right;font-weight:700">${fmtN(i.total_value)}</td><td>${i.issued_to}</td><td>${i[groupKey] || ''}</td><td>${i.purpose || ''}</td><td><span class="badge" style="background:${statusColors[i.status] || '#f3f4f6'};color:${statusTextColors[i.status] || '#6b7280'}">${i.status}</span></td><td>${i.requested_by || ''}</td><td>${i.approved_by || ''}</td></tr>`).join('')}<tr class="total-row"><td colspan="5" style="text-align:right">TOTALS</td><td></td><td style="text-align:right">KES ${fmtN(totalVal)}</td><td colspan="6"></td></tr></tbody></table>`;
                            printReport(`Issuances by ${groupLabel} Report`, sn, `Period: ${dateFrom || 'All'} to ${dateTo || 'All'} | Status: ${statusFilter}`, tableHtml);
                        }} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#1e40af' }}>
                                    {headers.map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {issuances.length === 0 ? <tr><td colSpan={13} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No issuances. Click Load Report.</td></tr>
                                        : issuances.map((i: any, idx: number) => (
                                            <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{i.issuance_number || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(i.created_at)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{i.item_name}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 900, color: '#1e40af', textAlign: 'center' }}>{i.quantity}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.unit}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#059669', textAlign: 'right' }}>{fmt(i.total_value)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, color: '#374151' }}>{i.issued_to}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i[groupKey] || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.purpose || '—'}</td>
                                                <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: statusColors[i.status] || '#f3f4f6', color: statusTextColors[i.status] || '#6b7280' }}>{i.status}</span></td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.requested_by || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#059669' }}>{i.approved_by || '—'}</td>
                                            </tr>
                                        ))}
                                    {issuances.length > 0 && <tr style={{ background: '#e0f2fe', borderTop: '2px solid #1e40af' }}>
                                        <td colSpan={4} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#1e40af', textAlign: 'right' }}>TOTALS</td>
                                        <td style={{ padding: '12px', fontSize: 14, fontWeight: 900, color: '#1e40af', textAlign: 'center' }}>{totalQty}</td>
                                        <td />
                                        <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt(totalVal)}</td>
                                        <td colSpan={6} />
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── GRN / PURCHASES ───
        if (activeReport === 'grn-purchases') {
            const grns: any[] = data.grns || [];
            const totalQty = grns.reduce((s: number, g: any) => s + Number(g.quantity || 0), 0);
            const totalCost = grns.reduce((s: number, g: any) => s + Number(g.total_cost || 0), 0);
            const pendingAuth = grns.filter((g: any) => g.status === 'Pending').length;
            const headers = ['#', 'GRN No', 'Date', 'Item', 'Qty', 'Unit Cost (KES)', 'Total Cost (KES)', 'Supplier', 'Invoice Ref', 'Status', 'Received By', 'Authorized By', 'Auth Role'];
            const rows = grns.map((g: any, idx: number) => [idx + 1, g.grn_number || '', fmtDate(g.created_at), g.item_name, g.quantity, fmtN(g.unit_cost), fmtN(g.total_cost), g.supplier || '', g.invoice_ref || '', g.status, g.received_by || '', g.authorized_by || '', g.authorized_by_role || '']);
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
                        {[{ l: 'Total GRNs', v: grns.length, c: '#065f46' }, { l: 'Total Qty Received', v: totalQty, c: '#1e40af' }, { l: 'Total Cost', v: fmt(totalCost), c: '#059669' }, { l: 'Pending Auth', v: pendingAuth, c: '#dc2626', pulse: pendingAuth > 0 }].map((k: any, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `2px solid ${k.c}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: k.c, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: k.pulse ? '#dc2626' : '#1f2937' }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'GRN_Purchases')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#065f46', background: '#d1fae5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('GRN & Purchases Report', sn, `Period: ${dateFrom || 'All'} to ${dateTo || 'All'}`, `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${grns.map((g: any, idx: number) => `<tr><td>${idx + 1}</td><td style="font-family:monospace;font-weight:700">${g.grn_number || ''}</td><td>${fmtDate(g.created_at)}</td><td style="font-weight:700">${g.item_name}</td><td style="text-align:center">${g.quantity}</td><td style="text-align:right">${fmtN(g.unit_cost)}</td><td style="text-align:right;font-weight:700">${fmtN(g.total_cost)}</td><td>${g.supplier || ''}</td><td style="font-family:monospace">${g.invoice_ref || ''}</td><td>${g.status}</td><td>${g.received_by || ''}</td><td>${g.authorized_by || ''}</td><td>${g.authorized_by_role || ''}</td></tr>`).join('')}<tr class="total-row"><td colspan="6" style="text-align:right">TOTALS</td><td style="text-align:right">KES ${fmtN(totalCost)}</td><td colspan="6"></td></tr></tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#065f46' }}>
                                    {headers.map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {grns.length === 0 ? <tr><td colSpan={13} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No GRNs. Click Load Report.</td></tr>
                                        : grns.map((g: any, idx: number) => {
                                            const isPending = g.status === 'Pending';
                                            return (
                                                <tr key={g.id} style={{ borderBottom: '1px solid #f3f4f6', background: isPending ? '#fffbeb' : idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>{g.grn_number || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(g.created_at)}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{g.item_name}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 900, color: '#059669', textAlign: 'center' }}>+{g.quantity}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right' }}>{fmt(g.unit_cost)}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 900, color: '#1f2937', textAlign: 'right' }}>{fmt(g.total_cost)}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#374151' }}>{g.supplier || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', color: '#6366f1' }}>{g.invoice_ref || '—'}</td>
                                                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: g.status === 'Authorized' ? '#d1fae5' : g.status === 'Pending' ? '#fef3c7' : '#dbeafe', color: g.status === 'Authorized' ? '#065f46' : g.status === 'Pending' ? '#92400e' : '#1e40af' }}>{g.status}</span></td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{g.received_by || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#059669', fontWeight: 600 }}>{g.authorized_by || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{g.authorized_by_role || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    {grns.length > 0 && <tr style={{ background: '#d1fae5', borderTop: '2px solid #065f46' }}>
                                        <td colSpan={4} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#065f46', textAlign: 'right' }}>TOTALS</td>
                                        <td style={{ padding: '12px', fontSize: 14, fontWeight: 900, color: '#059669', textAlign: 'center' }}>{totalQty}</td>
                                        <td />
                                        <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt(totalCost)}</td>
                                        <td colSpan={6} />
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── PAYMENT VOUCHERS ───
        if (activeReport === 'payment-vouchers') {
            const vouchers: any[] = data.vouchers || [];
            const totalAmt = vouchers.reduce((s: number, v: any) => s + Number(v.amount || 0), 0);
            const totalPaid = vouchers.filter((v: any) => v.status === 'Paid').reduce((s: number, v: any) => s + Number(v.amount || 0), 0);
            const headers = ['#', 'Voucher No', 'Date', 'Payee', 'Type', 'Description', 'Amount (KES)', 'Method', 'Vote Head', 'Status', 'Prepared By', 'Approved By', 'Paid By'];
            const rows = vouchers.map((v: any, idx: number) => [idx + 1, v.voucher_number || '', v.voucher_date || '', v.payee_name, v.payee_type, v.description, fmtN(v.amount), v.payment_method || '', v.vote_head || '', v.status, v.prepared_by || '', v.approved_by || '', v.paid_by || '']);
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
                        {[{ l: 'Total Vouchers', v: vouchers.length, c: '#1e3a5f' }, { l: 'Total Amount', v: fmt(totalAmt), c: '#7c3aed' }, { l: 'Paid Amount', v: fmt(totalPaid), c: '#059669' }, { l: 'Pending', v: vouchers.filter((v: any) => v.status === 'Pending Approval').length, c: '#dc2626' }].map((k: any, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `2px solid ${k.c}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: k.c, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#1f2937' }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Payment_Vouchers')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1e3a5f', background: '#dbeafe', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('Payment Vouchers Report', sn, `Period: ${dateFrom || 'All'} | Status: ${statusFilter}`, `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${vouchers.map((v: any, idx: number) => `<tr><td>${idx + 1}</td><td style="font-family:monospace;font-weight:700">${v.voucher_number || ''}</td><td>${v.voucher_date || ''}</td><td style="font-weight:700">${v.payee_name}</td><td>${v.payee_type}</td><td>${v.description}</td><td style="text-align:right;font-weight:700">${fmtN(v.amount)}</td><td>${v.payment_method || ''}</td><td>${v.vote_head || ''}</td><td>${v.status}</td><td>${v.prepared_by || ''}</td><td>${v.approved_by || ''}</td><td>${v.paid_by || ''}</td></tr>`).join('')}<tr class="total-row"><td colspan="6" style="text-align:right">TOTAL</td><td style="text-align:right">KES ${fmtN(totalAmt)}</td><td colspan="6"></td></tr></tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#1e3a5f' }}>
                                    {headers.map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {vouchers.length === 0 ? <tr><td colSpan={13} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No vouchers. Click Load Report.</td></tr>
                                        : vouchers.map((v: any, idx: number) => (
                                            <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#3b82f6' }}>{v.voucher_number}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(v.voucher_date)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{v.payee_name}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{v.payee_type}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 14, fontWeight: 900, color: '#1f2937', textAlign: 'right' }}>{fmt(v.amount)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{v.payment_method}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{v.vote_head}</td>
                                                <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: v.status === 'Paid' ? '#dbeafe' : v.status === 'Approved' ? '#d1fae5' : v.status === 'Pending Approval' ? '#fef3c7' : '#f3f4f6', color: v.status === 'Paid' ? '#1e40af' : v.status === 'Approved' ? '#065f46' : v.status === 'Pending Approval' ? '#92400e' : '#6b7280' }}>{v.status}</span></td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{v.prepared_by}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#059669' }}>{v.approved_by || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#1e40af' }}>{v.paid_by || '—'}</td>
                                            </tr>
                                        ))}
                                    {vouchers.length > 0 && <tr style={{ background: '#e0f2fe', borderTop: '2px solid #1e3a5f' }}>
                                        <td colSpan={6} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#1e3a5f', textAlign: 'right' }}>GRAND TOTAL</td>
                                        <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#1e3a5f', textAlign: 'right' }}>{fmt(totalAmt)}</td>
                                        <td colSpan={6} />
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── INCOME REGISTER ───
        if (activeReport === 'income-register') {
            const income: any[] = data.income || [];
            const total = income.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            const reconciled = income.filter((r: any) => r.is_reconciled).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            const headers = ['#', 'Receipt No', 'Date', 'Type', 'Source', 'Amount (KES)', 'Method', 'Reference', 'Vote Head', 'Reconciled', 'Received By'];
            const rows = income.map((r: any, idx: number) => [idx + 1, r.receipt_number || '', r.income_date || '', r.income_type, r.source, fmtN(r.amount), r.payment_method || '', r.reference_number || '', r.vote_head || '', r.is_reconciled ? 'YES' : 'NO', r.received_by || '']);
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
                        {[{ l: 'Total Records', v: income.length, c: '#065f46' }, { l: 'Total Income', v: fmt(total), c: '#059669' }, { l: 'Reconciled', v: fmt(reconciled), c: '#1e40af' }, { l: 'Unreconciled', v: fmt(total - reconciled), c: '#dc2626' }].map((k: any, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `2px solid ${k.c}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: k.c, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#1f2937' }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Income_Register')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#065f46', background: '#d1fae5', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('Income Register Report', sn, `Period: ${dateFrom || 'All'} to ${dateTo || 'All'} | Type: ${typeFilter}`, `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${income.map((r: any, idx: number) => `<tr><td>${idx + 1}</td><td style="font-family:monospace;font-weight:700">${r.receipt_number || ''}</td><td>${r.income_date || ''}</td><td style="font-weight:700">${r.income_type}</td><td>${r.source}</td><td style="text-align:right;font-weight:700">${fmtN(r.amount)}</td><td>${r.payment_method || ''}</td><td>${r.reference_number || ''}</td><td>${r.vote_head || ''}</td><td style="color:${r.is_reconciled ? '#059669' : '#dc2626'};font-weight:700">${r.is_reconciled ? '✓ YES' : '✗ NO'}</td><td>${r.received_by || ''}</td></tr>`).join('')}<tr class="total-row"><td colspan="5" style="text-align:right">TOTAL</td><td style="text-align:right">KES ${fmtN(total)}</td><td colspan="5"></td></tr></tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#065f46' }}>
                                    {headers.map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {income.length === 0 ? <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No income. Click Load Report.</td></tr>
                                        : income.map((r: any, idx: number) => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: r.is_reconciled ? (idx % 2 === 0 ? '#fff' : '#fafafa') : '#fffbeb' }}>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{r.receipt_number}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDate(r.income_date)}</td>
                                                <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', background: '#d1fae5', color: '#065f46', borderRadius: 20 }}>{r.income_type}</span></td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{r.source}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 14, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt(r.amount)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{r.payment_method}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', color: '#6366f1' }}>{r.reference_number || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{r.vote_head || '—'}</td>
                                                <td style={{ padding: '9px 12px' }}>{r.is_reconciled ? <span style={{ fontSize: 10, fontWeight: 800, color: '#065f46', background: '#d1fae5', padding: '3px 8px', borderRadius: 20 }}>✅ YES</span> : <span style={{ fontSize: 10, fontWeight: 800, color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: 20 }}>⏳ NO</span>}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{r.received_by}</td>
                                            </tr>
                                        ))}
                                    {income.length > 0 && <tr style={{ background: '#d1fae5', borderTop: '2px solid #065f46' }}>
                                        <td colSpan={5} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#065f46', textAlign: 'right' }}>GRAND TOTAL</td>
                                        <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt(total)}</td>
                                        <td colSpan={5} />
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── INCOME VS EXPENDITURE ───
        if (activeReport === 'income-vs-expense') {
            const income: any[] = data.income || [];
            const vouchers: any[] = data.vouchers || [];
            const totalIncome = income.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
            const totalExpense = vouchers.reduce((s: number, v: any) => s + Number(v.amount || 0), 0);
            const surplus = totalIncome - totalExpense;
            // Group by vote head
            const voteMap: Record<string, { income: number; expense: number }> = {};
            income.forEach((r: any) => { const k = r.vote_head || 'General'; if (!voteMap[k]) voteMap[k] = { income: 0, expense: 0 }; voteMap[k].income += Number(r.amount || 0); });
            vouchers.forEach((v: any) => { const k = v.vote_head || 'General'; if (!voteMap[k]) voteMap[k] = { income: 0, expense: 0 }; voteMap[k].expense += Number(v.amount || 0); });
            const headers = ['Vote Head / Category', 'Total Income (KES)', 'Total Expenditure (KES)', 'Net Surplus/Deficit (KES)'];
            const rows = Object.entries(voteMap).map(([k, v]) => [k, fmtN(v.income), fmtN(v.expense), fmtN(v.income - v.expense)]);
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                        <div style={{ background: '#d1fae5', borderRadius: 14, padding: '20px', textAlign: 'center', border: '2px solid #059669' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginBottom: 6 }}>📈 Total Income</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>{fmt(totalIncome)}</div>
                            <div style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>{income.length} records</div>
                        </div>
                        <div style={{ background: '#fee2e2', borderRadius: 14, padding: '20px', textAlign: 'center', border: '2px solid #dc2626' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: 6 }}>📉 Total Expenditure</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#dc2626' }}>{fmt(totalExpense)}</div>
                            <div style={{ fontSize: 11, color: '#991b1b', marginTop: 4 }}>{vouchers.length} paid vouchers</div>
                        </div>
                        <div style={{ background: surplus >= 0 ? '#dbeafe' : '#fef3c7', borderRadius: 14, padding: '20px', textAlign: 'center', border: `2px solid ${surplus >= 0 ? '#1e40af' : '#92400e'}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: surplus >= 0 ? '#1e40af' : '#92400e', textTransform: 'uppercase', marginBottom: 6 }}>{surplus >= 0 ? '⚖️ Surplus' : '⚠️ Deficit'}</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: surplus >= 0 ? '#1e40af' : '#dc2626' }}>{fmt(Math.abs(surplus))}</div>
                            <div style={{ fontSize: 11, color: surplus >= 0 ? '#1e40af' : '#dc2626', marginTop: 4 }}>{surplus >= 0 ? 'In surplus' : 'In deficit'}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Income_vs_Expenditure')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('Income vs Expenditure Report', sn, `Period: ${dateFrom || 'All'} to ${dateTo || 'All'}`, `<div class="kpi-row"><div class="kpi"><div class="kpi-label">Total Income</div><div class="kpi-val" style="color:#059669">KES ${fmtN(totalIncome)}</div></div><div class="kpi"><div class="kpi-label">Total Expenditure</div><div class="kpi-val" style="color:#dc2626">KES ${fmtN(totalExpense)}</div></div><div class="kpi"><div class="kpi-label">${surplus >= 0 ? 'Surplus' : 'Deficit'}</div><div class="kpi-val" style="color:${surplus >= 0 ? '#1e40af' : '#dc2626'}">KES ${fmtN(Math.abs(surplus))}</div></div></div><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${Object.entries(voteMap).map(([k, v]) => `<tr><td style="font-weight:700">${k}</td><td style="text-align:right;color:#059669;font-weight:700">${fmtN(v.income)}</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmtN(v.expense)}</td><td style="text-align:right;font-weight:900;color:${v.income - v.expense >= 0 ? '#1e40af' : '#dc2626'}">${fmtN(v.income - v.expense)}</td></tr>`).join('')}<tr class="total-row"><td>GRAND TOTAL</td><td style="text-align:right">KES ${fmtN(totalIncome)}</td><td style="text-align:right">KES ${fmtN(totalExpense)}</td><td style="text-align:right">KES ${fmtN(surplus)}</td></tr></tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#1e293b' }}>
                                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'left' }}>Vote Head / Category</th>
                                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#34d399', textAlign: 'right' }}>Income (KES)</th>
                                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#f87171', textAlign: 'right' }}>Expenditure (KES)</th>
                                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#60a5fa', textAlign: 'right' }}>Net (KES)</th>
                                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#f3f4f6', textAlign: 'center' }}>Balance Bar</th>
                            </tr></thead>
                            <tbody>
                                {Object.entries(voteMap).length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No data. Click Load Report.</td></tr>
                                    : Object.entries(voteMap).map(([k, v], i) => {
                                        const net = v.income - v.expense;
                                        const maxVal = Math.max(v.income, v.expense, 1);
                                        return (
                                            <tr key={k} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{k}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 900, color: '#059669', textAlign: 'right' }}>{fmt(v.income)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 900, color: '#dc2626', textAlign: 'right' }}>{fmt(v.expense)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 900, color: net >= 0 ? '#1e40af' : '#dc2626', textAlign: 'right' }}>{net >= 0 ? '+' : ''}{fmt(net)}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        <div style={{ flex: 1, height: 10, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden' }}>
                                                            <div style={{ width: `${(v.income / maxVal) * 100}%`, height: '100%', background: '#10b981', borderRadius: 20 }} />
                                                        </div>
                                                        <div style={{ flex: 1, height: 10, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden' }}>
                                                            <div style={{ width: `${(v.expense / maxVal) * 100}%`, height: '100%', background: '#ef4444', borderRadius: 20 }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                <tr style={{ background: '#1e293b' }}>
                                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 900, color: '#fff' }}>GRAND TOTAL</td>
                                    <td style={{ padding: '14px 16px', fontSize: 16, fontWeight: 900, color: '#34d399', textAlign: 'right' }}>{fmt(totalIncome)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: 16, fontWeight: 900, color: '#f87171', textAlign: 'right' }}>{fmt(totalExpense)}</td>
                                    <td style={{ padding: '14px 16px', fontSize: 16, fontWeight: 900, color: surplus >= 0 ? '#60a5fa' : '#f87171', textAlign: 'right' }}>{fmt(surplus)}</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // ─── LOW STOCK ───
        if (activeReport === 'low-stock') {
            const items: any[] = data.items || [];
            const totalReorderVal = items.reduce((s: number, i: any) => s + Math.max(0, (i.reorder_level || 5) - i.quantity) * (i.unit_price || 0), 0);
            const headers = ['#', 'Code', 'Item Name', 'Category', 'Current Qty', 'Reorder Level', 'Shortage', 'Unit Price (KES)', 'Est. Reorder Cost (KES)', 'Supplier', 'Location'];
            const rows = items.map((i: any, idx: number) => [idx + 1, i.item_code || '', i.item_name, i.category, i.quantity, i.reorder_level || 5, Math.max(0, (i.reorder_level || 5) - i.quantity), fmtN(i.unit_price), fmtN(Math.max(0, (i.reorder_level || 5) - i.quantity) * (i.unit_price || 0)), i.supplier || '', i.location || '']);
            return (
                <div>
                    <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 32 }}>⚠️</span>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#dc2626' }}>{items.length} items below reorder level</div>
                            <div style={{ fontSize: 13, color: '#991b1b', marginTop: 2 }}>Estimated total reorder cost: <strong>{fmt(totalReorderVal)}</strong></div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Low_Stock_Alert')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('Low Stock Alert Report', sn, `Items below reorder level | ${new Date().toLocaleDateString('en-KE')}`, `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${items.map((i: any, idx: number) => `<tr style="background:#fff5f5"><td>${idx + 1}</td><td style="font-family:monospace">${i.item_code || ''}</td><td style="font-weight:900;color:#dc2626">${i.item_name}</td><td>${i.category}</td><td style="text-align:center;font-weight:900;color:#dc2626;font-size:14px">${i.quantity}</td><td style="text-align:center">${i.reorder_level || 5}</td><td style="text-align:center;font-weight:900;color:#dc2626">-${Math.max(0, (i.reorder_level || 5) - i.quantity)}</td><td style="text-align:right">${fmtN(i.unit_price)}</td><td style="text-align:right;font-weight:700">${fmtN(Math.max(0, (i.reorder_level || 5) - i.quantity) * (i.unit_price || 0))}</td><td>${i.supplier || ''}</td><td>${i.location || ''}</td></tr>`).join('')}<tr class="total-row"><td colspan="8" style="text-align:right">TOTAL EST. REORDER COST</td><td style="text-align:right">KES ${fmtN(totalReorderVal)}</td><td colspan="2"></td></tr></tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #dc2626', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#dc2626' }}>
                                    {['#', 'Code', 'Item Name', 'Category', 'Current', 'Reorder Level', 'Shortage', 'Unit Price', 'Est. Reorder Cost', 'Supplier', 'Location'].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {items.length === 0 ? <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40 }}><span style={{ fontSize: 30 }}>✅</span><br />All items adequately stocked!</td></tr>
                                        : items.map((i: any, idx: number) => (
                                            <tr key={i.id} style={{ borderBottom: '1px solid #fecaca', background: '#fff5f5' }}>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#b45309' }}>{i.item_code || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 900, color: '#dc2626' }}>{i.item_name}</td>
                                                <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 20 }}>{i.category}</span></td>
                                                <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{i.quantity}</td>
                                                <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 14, color: '#6b7280' }}>{i.reorder_level || 5}</td>
                                                <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 16, fontWeight: 900, color: '#dc2626' }}>-{Math.max(0, (i.reorder_level || 5) - i.quantity)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right' }}>{fmt(i.unit_price)}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 900, color: '#dc2626', textAlign: 'right' }}>{fmt(Math.max(0, (i.reorder_level || 5) - i.quantity) * (i.unit_price || 0))}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.supplier || '—'}</td>
                                                <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{i.location || '—'}</td>
                                            </tr>
                                        ))}
                                    {items.length > 0 && <tr style={{ background: '#fee2e2', borderTop: '2px solid #dc2626' }}>
                                        <td colSpan={8} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#dc2626', textAlign: 'right' }}>TOTAL EST. REORDER COST</td>
                                        <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#dc2626', textAlign: 'right' }}>{fmt(totalReorderVal)}</td>
                                        <td colSpan={2} />
                                    </tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        // ─── SUPPLIER SPENDING ───
        if (activeReport === 'supplier-spending') {
            const suppliers: [string, any][] = data.suppliers || [];
            const grandTotal = suppliers.reduce((s: number, [, v]: any) => s + v.total, 0);
            const headers = ['#', 'Supplier', 'No. of GRNs', 'Total Qty Received', 'Total Spent (KES)', '% of Total', 'Last Delivery'];
            const rows = suppliers.map(([sup, v]: any, idx: number) => [idx + 1, sup, v.count, v.qty, fmtN(v.total), grandTotal > 0 ? ((v.total / grandTotal) * 100).toFixed(1) + '%' : '0%', fmtDate(v.last)]);
            return (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
                        {[{ l: 'Total Suppliers', v: suppliers.length, c: '#374151' }, { l: 'Total Spent', v: fmt(grandTotal), c: '#dc2626' }].map((k: any, i) => (
                            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: `2px solid ${k.c}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: k.c, textTransform: 'uppercase', marginBottom: 4 }}>{k.l}</div>
                                <div style={{ fontSize: 22, fontWeight: 900, color: '#1f2937' }}>{k.v}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Supplier_Spending')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#374151', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('Supplier Spending Report', sn, `Period: ${dateFrom || 'All'} to ${dateTo || 'All'}`, `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${suppliers.map(([sup, v]: any, idx: number) => `<tr><td>${idx + 1}</td><td style="font-weight:700">${sup}</td><td style="text-align:center">${v.count}</td><td style="text-align:center">${v.qty}</td><td style="text-align:right;font-weight:700">${fmtN(v.total)}</td><td style="text-align:center">${grandTotal > 0 ? ((v.total / grandTotal) * 100).toFixed(1) : 0}%</td><td>${fmtDate(v.last)}</td></tr>`).join('')}<tr class="total-row"><td colspan="4" style="text-align:right">TOTAL</td><td style="text-align:right">KES ${fmtN(grandTotal)}</td><td colspan="2"></td></tr></tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#374151' }}>
                                {headers.concat(['Spend Bar']).map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {suppliers.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No data. Click Load Report.</td></tr>
                                    : suppliers.map(([sup, v]: any, idx: number) => {
                                        const pct = grandTotal > 0 ? (v.total / grandTotal) * 100 : 0;
                                        const barColors = ['#dc2626', '#ea580c', '#d97706', '#059669', '#1e40af', '#7c3aed'];
                                        const color = barColors[idx % barColors.length];
                                        return (
                                            <tr key={sup} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                <td style={{ padding: '11px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                <td style={{ padding: '11px 12px', fontSize: 14, fontWeight: 800, color: '#1f2937' }}>{sup}</td>
                                                <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 700, color: '#374151', textAlign: 'center' }}>{v.count}</td>
                                                <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 700, color: '#374151', textAlign: 'center' }}>{v.qty}</td>
                                                <td style={{ padding: '11px 12px', fontSize: 15, fontWeight: 900, color: '#dc2626', textAlign: 'right' }}>{fmt(v.total)}</td>
                                                <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 700, color, textAlign: 'center' }}>{pct.toFixed(1)}%</td>
                                                <td style={{ padding: '11px 12px', fontSize: 12, color: '#6b7280' }}>{fmtDate(v.last)}</td>
                                                <td style={{ padding: '11px 12px', width: 180 }}>
                                                    <div style={{ background: '#f3f4f6', borderRadius: 20, height: 14, overflow: 'hidden' }}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 20 }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                {suppliers.length > 0 && <tr style={{ background: '#374151' }}>
                                    <td colSpan={4} style={{ padding: '12px', fontSize: 13, fontWeight: 900, color: '#fff', textAlign: 'right' }}>GRAND TOTAL</td>
                                    <td style={{ padding: '12px', fontSize: 15, fontWeight: 900, color: '#f87171', textAlign: 'right' }}>{fmt(grandTotal)}</td>
                                    <td colSpan={3} />
                                </tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        // ─── AUDIT TRAIL ───
        if (activeReport === 'audit-trail') {
            const logs: any[] = data.logs || [];
            const actionColors: Record<string, { bg: string; color: string }> = {
                'ITEM_ADDED': { bg: '#d1fae5', color: '#065f46' }, 'ITEM_UPDATED': { bg: '#dbeafe', color: '#1e40af' }, 'ITEM_DELETED': { bg: '#fee2e2', color: '#991b1b' },
                'ISSUANCE_REQUESTED': { bg: '#fef3c7', color: '#92400e' }, 'ISSUANCE_APPROVED': { bg: '#d1fae5', color: '#065f46' }, 'ISSUANCE_REJECTED': { bg: '#fee2e2', color: '#991b1b' }, 'ISSUANCE_COMPLETED': { bg: '#dbeafe', color: '#1e40af' },
                'GRN_CREATED': { bg: '#fef3c7', color: '#92400e' }, 'GRN_AUTHORIZED': { bg: '#d1fae5', color: '#065f46' },
                'VOUCHER_CREATED': { bg: '#fef3c7', color: '#92400e' }, 'VOUCHER_APPROVED': { bg: '#d1fae5', color: '#065f46' }, 'VOUCHER_PAID': { bg: '#dbeafe', color: '#1e40af' },
                'INCOME_RECORDED': { bg: '#d1fae5', color: '#065f46' }, 'LOW_STOCK_ALERT': { bg: '#fee2e2', color: '#991b1b' },
            };
            const headers = ['#', 'Date & Time', 'Action Type', 'Reference', 'Description', 'Actor', 'Role'];
            const rows = logs.map((l: any, idx: number) => [idx + 1, fmtDateTime(l.created_at), l.action_type, l.record_ref || '', l.description || '', l.actor || '', l.actor_role || '']);
            return (
                <div>
                    <div style={{ background: '#1e293b', borderRadius: 14, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FiActivity color="#fff" size={16} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Full Stores Activity Audit Trail — {logs.length} records</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button onClick={() => exportCSV(headers, rows, 'Audit_Trail')} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1f2937', background: '#e5e7eb', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiDownload size={12} /> Export Excel</button>
                        <button onClick={() => printReport('Stores Audit Trail Report', sn, `Period: ${dateFrom || 'All'} to ${dateTo || 'All'}`, `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${logs.map((l: any, idx: number) => `<tr><td>${idx + 1}</td><td style="white-space:nowrap">${fmtDateTime(l.created_at)}</td><td style="font-weight:800">${l.action_type}</td><td style="font-family:monospace">${l.record_ref || ''}</td><td>${l.description || ''}</td><td style="font-weight:700">${l.actor || ''}</td><td>${l.actor_role || ''}</td></tr>`).join('')}</tbody></table>`)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><FiPrinter size={12} /> Print PDF</button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: '#1e293b' }}>
                                    {headers.map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                    {logs.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No logs. Click Load Report.</td></tr>
                                        : logs.map((l: any, idx: number) => {
                                            const ac = actionColors[l.action_type] || { bg: '#f3f4f6', color: '#6b7280' };
                                            return (
                                                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#9ca3af' }}>{idx + 1}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                                                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: ac.bg, color: ac.color, whiteSpace: 'nowrap' }}>{l.action_type}</span></td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{l.record_ref || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#374151', maxWidth: 320 }}>{l.description}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{l.actor || '—'}</td>
                                                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#6b7280' }}>{l.actor_role || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }
        return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Select a report from the left panel</div>;
    };

    const active = REPORTS.find(r => r.id === activeReport);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* ─── HERO ─── */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'linear-gradient(135deg,#111827 0%,#1f2937 60%,#374151 100%)', marginBottom: 20 }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 8px 25px rgba(99,102,241,0.4)' }}>
                        <FiBarChart2 color="#fff" size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>
                            📊 Stores & Finance Reports
                            <span style={{ marginLeft: 8, padding: '2px 10px', fontSize: 9, fontWeight: 900, borderRadius: 20, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff' }}>10 REPORTS</span>
                        </h1>
                        <p style={{ color: '#9ca3af', fontSize: 12, margin: '2px 0 0' }}>Stock · Issuances · GRN · Vouchers · Income · Audit — All with PDF Print & Excel Export</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* ─── LEFT SIDEBAR ─── */}
                <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'sticky', top: 20 }}>
                    <div style={{ padding: '12px 14px', background: '#1e293b', borderBottom: '1px solid #374151' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0 }}>Select Report</p>
                    </div>
                    {REPORTS.map(r => (
                        <button key={r.id} onClick={() => setActiveReport(r.id)}
                            style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f3f4f6', transition: 'all 0.15s',
                                background: activeReport === r.id ? r.color : '#fff',
                                color: activeReport === r.id ? '#fff' : '#374151' }}>
                            <span style={{ fontSize: 18 }}>{r.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{r.label}</span>
                        </button>
                    ))}
                </div>

                {/* ─── RIGHT CONTENT ─── */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Filter Bar */}
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 20 }}>{active?.icon}</span>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1f2937' }}>{active?.label}</div>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>Filters: Date range, Status, Type</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                {(activeReport !== 'stock-valuation' && activeReport !== 'low-stock') && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>From:</span>
                                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>To:</span>
                                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                                        </div>
                                    </>
                                )}
                                {(activeReport === 'issuances-dept' || activeReport === 'issuances-person' || activeReport === 'payment-vouchers') && (
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }}>
                                        <option value="All">All Statuses</option>
                                        {['Pending', 'Approved', 'Issued', 'Rejected', 'Paid', 'Draft'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                )}
                                {activeReport === 'income-register' && (
                                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }}>
                                        <option value="All">All Types</option>
                                        {['Capitation Grant', 'NG-CDF Bursary', 'County Bursary', 'Tuition Fees', 'Boarding Fees', 'Activity Fees', 'Exam Fees', 'Donations', 'Other'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                )}
                                <button onClick={loadReport} disabled={loading}
                                    style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#fff', background: loading ? '#9ca3af' : `linear-gradient(135deg,${active?.color || '#1e3a5f'},${active?.color || '#1e3a5f'})`, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                                    {loading ? <><FiRefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</> : <><FiFilter size={13} /> Load Report</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Report Content */}
                    {renderReport()}
                </div>
            </div>
        </div>
    );
}
