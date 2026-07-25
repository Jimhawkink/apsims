'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiZap, FiFilter, FiDownload, FiRefreshCw, FiSearch,
    FiBarChart2, FiTrendingUp, FiAlertTriangle, FiFileText,
    FiArrowLeft, FiChevronUp, FiChevronDown, FiX,
} from 'react-icons/fi';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

// ── Tiny SVG bar chart ────────────────────────────────────────────────
function BarChart({ data, colors }: { data: { label: string; value: number; color: string }[]; colors?: string[] }) {
    if (!data.length) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-2 h-40 w-full">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[9px] font-bold text-gray-500">{fmt(d.value).replace('KES\u00a0', '')}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{
                        height: `${Math.max(4, (d.value / max) * 120)}px`,
                        background: `linear-gradient(180deg, ${d.color}, ${d.color}99)`,
                    }} title={`${d.label}: ${fmt(d.value)}`} />
                    <span className="text-[9px] font-bold text-gray-600 text-center leading-tight w-full truncate">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// ── Tiny SVG donut chart ──────────────────────────────────────────────
function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    let cumulative = 0;
    const r = 60, cx = 70, cy = 70, stroke = 24;
    const paths = slices.filter(s => s.value > 0).map(s => {
        const pct = s.value / total;
        const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
        const endAngle = (cumulative + pct) * 2 * Math.PI - Math.PI / 2;
        cumulative += pct;
        const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
        const large = pct > 0.5 ? 1 : 0;
        return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: s.color, label: s.label, value: s.value, pct };
    });
    return (
        <div className="flex items-center gap-6">
            <svg width={140} height={140} viewBox="0 0 140 140">
                {paths.map((p, i) => (
                    <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={stroke} strokeLinecap="butt">
                        <title>{p.label}: {fmt(p.value)} ({(p.pct * 100).toFixed(1)}%)</title>
                    </path>
                ))}
                <text x={70} y={66} textAnchor="middle" fontSize={10} fontWeight="800" fill="#1e293b">{fmt(total).replace('KES\u00a0', '')}</text>
                <text x={70} y={80} textAnchor="middle" fontSize={8} fill="#64748b">Total</text>
            </svg>
            <div className="flex flex-col gap-1.5">
                {slices.filter(s => s.value > 0).map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-xs text-gray-600 font-medium">{s.label}</span>
                        <span className="text-xs font-bold text-gray-800 ml-auto">{((s.value / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Sparkline ─────────────────────────────────────────────────────────
function Sparkline({ points, color = '#6366f1', h = 40, w = 120 }: { points: number[]; color?: string; h?: number; w?: number }) {
    if (points.length < 2) return <div style={{ width: w, height: h }} />;
    const mn = Math.min(...points), mx = Math.max(...points), rng = mx - mn || 1;
    const pts = points.map((v, i) => {
        const x = (i / (points.length - 1)) * (w - 8) + 4;
        const y = h - 4 - ((v - mn) / rng) * (h - 8);
        return `${x},${y}`;
    }).join(' ');
    const area = points.map((v, i) => {
        const x = (i / (points.length - 1)) * (w - 8) + 4;
        const y = h - 4 - ((v - mn) / rng) * (h - 8);
        return `${x},${y}`;
    });
    const areaPath = `M ${area[0]} ${area.slice(1).map(p => 'L ' + p).join(' ')} L ${(w - 4)},${h - 2} L 4,${h - 2} Z`;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <path d={areaPath} fill={color} fillOpacity={0.12} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
            <circle cx={area[area.length - 1].split(',')[0]} cy={area[area.length - 1].split(',')[1]} r={3} fill={color} />
        </svg>
    );
}

type SortDir = 'asc' | 'desc';

export default function VoteHeadReportsPage() {
    const [loading, setLoading]         = useState(true);
    const [voteHeads, setVoteHeads]     = useState<any[]>([]);
    const [allocations, setAllocations] = useState<any[]>([]);
    const [payments, setPayments]       = useState<any[]>([]);
    const [students, setStudents]       = useState<any[]>([]);
    const [terms, setTerms]             = useState<any[]>([]);
    const [forms, setForms]             = useState<any[]>([]);

    // Filters
    const [receiptFrom, setReceiptFrom] = useState('');
    const [receiptTo, setReceiptTo]     = useState('');
    const [dateFrom, setDateFrom]       = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [dateTo, setDateTo]           = useState(new Date().toISOString().split('T')[0]);
    const [filterVH, setFilterVH]       = useState('all');
    const [filterTerm, setFilterTerm]   = useState('all');
    const [filterForm, setFilterForm]   = useState('all');
    const [searchText, setSearchText]   = useState('');
    const [activeTab, setActiveTab]     = useState<'overview' | 'grid' | 'arrears' | 'trend'>('overview');

    // Grid sort
    const [sortKey, setSortKey]   = useState('payment_date');
    const [sortDir, setSortDir]   = useState<SortDir>('desc');
    const [page, setPage]         = useState(1);
    const PAGE_SIZE = 20;

    // ── Fetch all data ─────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vhRes, allocRes, payRes, stuRes, termRes, formRes] = await Promise.all([
                supabase.from('school_vote_heads').select('*').order('priority'),
                supabase.from('school_fee_payment_allocations')
                    .select('id,payment_id,student_id,vote_head_id,vote_head_code,vote_head_name,allocated_amount,term_id,year')
                    .order('id', { ascending: false })
                    .limit(10000),
                supabase.from('school_fee_payments')
                    .select('id,student_id,amount,payment_date,payment_method,reference_number,receipt_number,term_id,year')
                    .gte('payment_date', dateFrom)
                    .lte('payment_date', dateTo)
                    .order('payment_date', { ascending: false })
                    .limit(10000),
                supabase.from('school_students').select('id,first_name,last_name,admission_no,admission_number,form_id,stream_id').limit(5000),
                supabase.from('school_terms').select('*').order('year,created_at'),
                supabase.from('school_forms').select('*').order('form_level'),
            ]);
            setVoteHeads(vhRes.data || []);
            setAllocations(allocRes.data || []);
            setPayments(payRes.data || []);
            setStudents(stuRes.data || []);
            setTerms(termRes.data || []);
            setForms(formRes.data || []);
        } catch (e: any) { toast.error('Failed to load data: ' + e.message); }
        setLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Helpers ────────────────────────────────────────────────────────
    const getStudent = (id: number) => students.find(s => s.id === id);
    const getFormName = (fid: number) => forms.find(f => f.id === fid)?.form_name || '—';
    const getTerm = (tid: number) => terms.find(t => t.id === tid)?.term_name || '—';

    // ── Apply filters ─────────────────────────────────────────────────
    const filteredPayments = useMemo(() => {
        let pays = payments;
        // Receipt range
        if (receiptFrom.trim()) {
            const fromNum = parseInt(receiptFrom.replace(/\D/g, ''), 10);
            pays = pays.filter(p => parseInt((p.receipt_number || '').replace(/\D/g, ''), 10) >= fromNum);
        }
        if (receiptTo.trim()) {
            const toNum = parseInt(receiptTo.replace(/\D/g, ''), 10);
            pays = pays.filter(p => parseInt((p.receipt_number || '').replace(/\D/g, ''), 10) <= toNum);
        }
        // Term
        if (filterTerm !== 'all') pays = pays.filter(p => String(p.term_id) === filterTerm);
        // Form (student)
        if (filterForm !== 'all') pays = pays.filter(p => {
            const st = getStudent(p.student_id);
            return String(st?.form_id) === filterForm;
        });
        return pays;
    }, [payments, receiptFrom, receiptTo, filterTerm, filterForm]);

    const paymentIds = useMemo(() => new Set(filteredPayments.map(p => p.id)), [filteredPayments]);

    // Allocations filtered to matched payments + vote head filter
    const filteredAllocs = useMemo(() => {
        let allocs = allocations.filter(a => paymentIds.has(a.payment_id));
        if (filterVH !== 'all') allocs = allocs.filter(a => a.vote_head_code === filterVH);
        return allocs;
    }, [allocations, paymentIds, filterVH]);

    // ── Per-vote-head summary ─────────────────────────────────────────
    const vhSummary = useMemo(() => {
        const map: Record<string, { code: string; name: string; color: string; total: number; count: number; payments: number[] }> = {};
        for (const a of filteredAllocs) {
            if (!map[a.vote_head_code]) {
                const vh = voteHeads.find(v => v.code === a.vote_head_code);
                map[a.vote_head_code] = { code: a.vote_head_code, name: a.vote_head_name, color: vh?.color || '#6366f1', total: 0, count: 0, payments: [] };
            }
            map[a.vote_head_code].total += Number(a.allocated_amount || 0);
            map[a.vote_head_code].count++;
            map[a.vote_head_code].payments.push(a.payment_id);
        }
        return Object.values(map).sort((a, b) => {
            const pa = voteHeads.find(v => v.code === a.code)?.priority ?? 99;
            const pb = voteHeads.find(v => v.code === b.code)?.priority ?? 99;
            return pa - pb;
        });
    }, [filteredAllocs, voteHeads]);

    const grandTotal = useMemo(() => vhSummary.reduce((s, v) => s + v.total, 0), [vhSummary]);
    const arrearsTotal = useMemo(() => vhSummary.find(v => v.code.includes('ARREAR'))?.total || 0, [vhSummary]);

    // ── Daily trend (last 30 days) ─────────────────────────────────────
    const dailyTrend = useMemo(() => {
        const map: Record<string, number> = {};
        for (const p of filteredPayments) {
            const d = p.payment_date?.split('T')[0] || '';
            if (d) map[d] = (map[d] || 0) + Number(p.amount || 0);
        }
        const days = Object.keys(map).sort().slice(-30);
        return days.map(d => ({ date: d, amount: map[d] }));
    }, [filteredPayments]);

    // ── Datagrid rows (payment + alloc join) ───────────────────────────
    const gridRows = useMemo(() => {
        const rows: any[] = [];
        for (const p of filteredPayments) {
            const st = getStudent(p.student_id);
            if (searchText) {
                const q = searchText.toLowerCase();
                const match =
                    (p.receipt_number || '').toLowerCase().includes(q) ||
                    `${st?.first_name} ${st?.last_name}`.toLowerCase().includes(q) ||
                    (st?.admission_no || st?.admission_number || '').toLowerCase().includes(q);
                if (!match) continue;
            }
            const pAllocs = filteredAllocs.filter(a => a.payment_id === p.id);
            rows.push({ ...p, student: st, allocs: pAllocs, formName: getFormName(st?.form_id), termName: getTerm(p.term_id) });
        }
        // Sort
        rows.sort((a, b) => {
            let av: any = a[sortKey], bv: any = b[sortKey];
            if (sortKey === 'student') { av = `${a.student?.first_name} ${a.student?.last_name}`; bv = `${b.student?.first_name} ${b.student?.last_name}`; }
            if (sortKey === 'receipt_number') { av = parseInt((a.receipt_number || '').replace(/\D/g, ''), 10); bv = parseInt((b.receipt_number || '').replace(/\D/g, ''), 10); }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return rows;
    }, [filteredPayments, filteredAllocs, searchText, sortKey, sortDir]);

    const paged = gridRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.ceil(gridRows.length / PAGE_SIZE);

    const toggleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };
    const SortIcon = ({ k }: { k: string }) => sortKey === k
        ? (sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />)
        : <FiChevronDown size={12} className="opacity-30" />;

    // ── Arrears analysis ───────────────────────────────────────────────
    const arrearsRows = useMemo(() => {
        // Students with arrears allocations
        const map: Record<number, { student: any; arrears: number; payments: number }> = {};
        for (const a of filteredAllocs) {
            if (!a.vote_head_code.includes('ARREAR')) continue;
            if (!map[a.student_id]) {
                map[a.student_id] = { student: getStudent(a.student_id), arrears: 0, payments: 0 };
            }
            map[a.student_id].arrears += Number(a.allocated_amount || 0);
            map[a.student_id].payments++;
        }
        return Object.values(map).sort((a, b) => b.arrears - a.arrears);
    }, [filteredAllocs]);

    // ── Premium Excel Export ───────────────────────────────────────────
    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();

        // ── Shared style helpers ──────────────────────────────────────────
        const hdrFill   = { patternType: 'solid', fgColor: { rgb: '0F2044' } } as any;
        const kpi1Fill  = { patternType: 'solid', fgColor: { rgb: 'F59E0B' } } as any;
        const kpi2Fill  = { patternType: 'solid', fgColor: { rgb: 'EF4444' } } as any;
        const kpi3Fill  = { patternType: 'solid', fgColor: { rgb: '6366F1' } } as any;
        const kpi4Fill  = { patternType: 'solid', fgColor: { rgb: '10B981' } } as any;
        const subHdrFill= { patternType: 'solid', fgColor: { rgb: '1E3A5F' } } as any;
        const altFill   = { patternType: 'solid', fgColor: { rgb: 'F0F4FF' } } as any;
        const totFill   = { patternType: 'solid', fgColor: { rgb: 'D97706' } } as any;
        const grandFill = { patternType: 'solid', fgColor: { rgb: '0F2044' } } as any;
        const paidFill  = { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } } as any;
        const pendFill  = { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } } as any;
        const clrFill   = { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } } as any;
        const sectionFill = { patternType: 'solid', fgColor: { rgb: 'FFF8E1' } } as any;

        const whtBold   = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
        const whtBold14 = { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 };
        const whtBold18 = { bold: true, color: { rgb: 'FFFFFF' }, sz: 18 };
        const whtSm     = { color: { rgb: 'FFFFFF' }, sz: 9 };
        const darkBold  = { bold: true, color: { rgb: '0F2044' }, sz: 11 };
        const grayItal  = { italic: true, color: { rgb: '64748B' }, sz: 9 };

        const border = {
            top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
            right:  { style: 'thin', color: { rgb: 'CBD5E1' } },
        };
        const thickBorder = {
            top:    { style: 'medium', color: { rgb: '0F2044' } },
            bottom: { style: 'medium', color: { rgb: '0F2044' } },
            left:   { style: 'medium', color: { rgb: '0F2044' } },
            right:  { style: 'medium', color: { rgb: '0F2044' } },
        };

        const cell = (v: any, font?: any, fill?: any, align?: any, fmt?: string, brd?: any): any => ({
            v,
            t: typeof v === 'number' ? 'n' : 's',
            s: {
                font: font || {},
                fill: fill || { patternType: 'none' },
                alignment: align || { vertical: 'center', wrapText: true },
                border: brd || border,
                ...(fmt ? { numFmt: fmt } : {}),
            },
        });
        const numCell = (v: number, fill?: any, bold = false) => cell(
            v, { bold, color: { rgb: bold ? 'FFFFFF' : '0F2044' }, sz: 11 },
            fill || { patternType: 'none' },
            { horizontal: 'right', vertical: 'center' },
            '#,##0', border
        );
        const pctCell = (v: number, fill?: any) => cell(
            v / 100, { bold: true, color: { rgb: '0F2044' }, sz: 10 },
            fill || { patternType: 'none' },
            { horizontal: 'center', vertical: 'center' },
            '0.0%', border
        );
        const hdr = (v: string, fill?: any) => cell(
            v, whtBold, fill || subHdrFill,
            { horizontal: 'center', vertical: 'center', wrapText: true }, undefined, border
        );
        const empty = () => cell('', {}, { patternType: 'none' }, {}, undefined, {});

        const today = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });
        const period = `${dateFrom} to ${dateTo}`;
        const nonArrears = grandTotal - arrearsTotal;
        const arrearsPercent = grandTotal > 0 ? (arrearsTotal / grandTotal * 100).toFixed(1) : '0.0';
        const avgArrears = arrearsRows.length > 0 ? arrearsTotal / arrearsRows.length : 0;

        // ════════════════════════════════════════════════════════════════
        // SHEET 1 — VOTE HEAD REPORT (main)
        // ════════════════════════════════════════════════════════════════
        const ws1Data: any[][] = [];

        // Row 1 — Brand header
        ws1Data.push([
            cell('ALPHASCHOOL  •  APSIMS', whtBold14, hdrFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            ...Array(9).fill(cell('', whtBold14, hdrFill, {}, undefined, thickBorder)),
        ]);
        // Row 2 — Title
        ws1Data.push([
            cell('FEE COLLECTION — VOTE HEAD REPORT', whtBold18, hdrFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            ...Array(9).fill(cell('', {}, hdrFill, {}, undefined, thickBorder)),
        ]);
        // Row 3 — Meta
        ws1Data.push([
            cell(`Reporting Period: ${period}   |   Generated: ${today}   |   Alpha Premier School Information Management System`,
                grayItal, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
                { horizontal: 'center', vertical: 'center' }, undefined, border),
            ...Array(9).fill(cell('', {}, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } }, {}, undefined, border)),
        ]);
        // Row 4 — spacer
        ws1Data.push(Array(10).fill(empty()));

        // Row 5-7 — KPI band (4 colored cards across 10 cols)
        const kpiLabels = ['TOTAL COLLECTED', 'ARREARS CLEARED', 'VOTE HEADS ACTIVE', 'NON-ARREARS COLLECTED'];
        const kpiValues = [grandTotal, arrearsTotal, vhSummary.length, nonArrears];
        const kpiFills  = [kpi1Fill, kpi2Fill, kpi3Fill, kpi4Fill];
        const kpiSubs   = [
            `${filteredPayments.length} payments`,
            `${arrearsRows.length} students paid arrears`,
            `of ${voteHeads.length} total`,
            'Current term fees',
        ];
        // Label row
        ws1Data.push([
            hdr(kpiLabels[0], kpi1Fill), hdr('', kpi1Fill),
            hdr(kpiLabels[1], kpi2Fill), hdr('', kpi2Fill),
            hdr('', kpi2Fill),
            hdr(kpiLabels[2], kpi3Fill), hdr('', kpi3Fill),
            hdr(kpiLabels[3], kpi4Fill), hdr('', kpi4Fill), hdr('', kpi4Fill),
        ]);
        // Value row
        ws1Data.push([
            cell(`KES ${kpiValues[0].toLocaleString()}`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 20 }, kpi1Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi1Fill, {}, undefined, thickBorder),
            cell(`KES ${kpiValues[1].toLocaleString()}`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 20 }, kpi2Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi2Fill, {}, undefined, thickBorder),
            cell('', {}, kpi2Fill, {}, undefined, thickBorder),
            cell(String(kpiValues[2]), { bold: true, color: { rgb: 'FFFFFF' }, sz: 20 }, kpi3Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi3Fill, {}, undefined, thickBorder),
            cell(`KES ${kpiValues[3].toLocaleString()}`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 20 }, kpi4Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi4Fill, {}, undefined, thickBorder),
            cell('', {}, kpi4Fill, {}, undefined, thickBorder),
        ]);
        // Sub row
        ws1Data.push([
            cell(kpiSubs[0], whtSm, kpi1Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi1Fill, {}, undefined, thickBorder),
            cell(kpiSubs[1], whtSm, kpi2Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi2Fill, {}, undefined, thickBorder),
            cell('', {}, kpi2Fill, {}, undefined, thickBorder),
            cell(kpiSubs[2], whtSm, kpi3Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi3Fill, {}, undefined, thickBorder),
            cell(kpiSubs[3], whtSm, kpi4Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi4Fill, {}, undefined, thickBorder),
            cell('', {}, kpi4Fill, {}, undefined, thickBorder),
        ]);
        // Row 8 — spacer
        ws1Data.push(Array(10).fill(empty()));

        // Row 9 — Section label
        ws1Data.push([
            cell('PAYMENT DETAIL — ALL VOTE HEADS', { bold: true, color: { rgb: '0F2044' }, sz: 12 },
                sectionFill, { vertical: 'center' }, undefined, {}),
            ...Array(9).fill(cell('', {}, sectionFill, {}, undefined, {})),
        ]);

        // Row 10 — Table headers
        const COL_HDRS = ['#', 'Student Name', 'Adm No.', 'Form / Grade', 'Vote Head', 'Amount Billed', 'Amount Paid', 'Arrears', 'Receipt No.', 'Status'];
        ws1Data.push(COL_HDRS.map(h => hdr(h, subHdrFill)));

        // Data rows — one row per allocation
        let rowNum = 0;
        let totalBilled = 0, totalPaid = 0, totalArrears = 0;
        for (const p of gridRows) {
            const admNo = p.student?.admission_no || p.student?.admission_number || '—';
            const name  = p.student ? `${p.student.first_name} ${p.student.last_name}` : '—';
            if (p.allocs.length === 0) {
                rowNum++;
                const paid = Number(p.amount || 0);
                const rowFill = rowNum % 2 === 0 ? altFill : { patternType: 'none' };
                ws1Data.push([
                    cell(rowNum, darkBold, rowFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                    cell(name, darkBold, rowFill, { vertical: 'center' }, undefined, border),
                    cell(admNo, { color: { rgb: '2563EB' }, sz: 10 }, rowFill, { vertical: 'center' }, undefined, border),
                    cell(p.formName, {}, rowFill, { vertical: 'center' }, undefined, border),
                    cell('(No allocation)', { italic: true, color: { rgb: '94A3B8' } }, rowFill, { vertical: 'center' }, undefined, border),
                    numCell(0, rowFill), numCell(paid, rowFill), numCell(0, rowFill),
                    cell(p.receipt_number || '—', { color: { rgb: '6366F1' }, sz: 10 }, rowFill, { vertical: 'center' }, undefined, border),
                    cell('Fully Paid', { color: { rgb: '059669' }, bold: true, sz: 10 }, paidFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                ]);
                totalPaid += paid;
            } else {
                for (const a of p.allocs) {
                    rowNum++;
                    const billed  = Number(a.allocated_amount || 0);
                    const paid2   = Number(a.allocated_amount || 0);
                    const arrear  = 0;
                    const isArrear = (a.vote_head_code || '').includes('ARREAR');
                    const rowFill = rowNum % 2 === 0 ? altFill : { patternType: 'none' };
                    const statusText = isArrear ? 'Arrears Cleared' : arrear > 0 ? 'Balance Pending' : 'Fully Paid';
                    const statusFill = isArrear ? clrFill : arrear > 0 ? pendFill : paidFill;
                    const statusColor = isArrear ? '2563EB' : arrear > 0 ? 'D97706' : '059669';
                    ws1Data.push([
                        cell(rowNum, darkBold, rowFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                        cell(name, darkBold, rowFill, { vertical: 'center' }, undefined, border),
                        cell(admNo, { color: { rgb: '2563EB' }, sz: 10 }, rowFill, { vertical: 'center' }, undefined, border),
                        cell(p.formName, {}, rowFill, { vertical: 'center' }, undefined, border),
                        cell(a.vote_head_name || a.vote_head_code, {}, rowFill, { vertical: 'center' }, undefined, border),
                        numCell(billed, rowFill), numCell(paid2, rowFill), numCell(arrear, rowFill),
                        cell(p.receipt_number || '—', { color: { rgb: '6366F1' }, sz: 10 }, rowFill, { vertical: 'center' }, undefined, border),
                        cell(statusText, { color: { rgb: statusColor }, bold: true, sz: 10 }, statusFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                    ]);
                    totalBilled  += billed;
                    totalPaid    += paid2;
                    totalArrears += arrear;
                }
            }
        }

        // Totals row
        ws1Data.push([
            cell('', {}, totFill, {}, undefined, border),
            cell('', {}, totFill, {}, undefined, border),
            cell('', {}, totFill, {}, undefined, border),
            cell('', {}, totFill, {}, undefined, border),
            cell('TOTALS', { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, totFill, { horizontal: 'right', vertical: 'center' }, undefined, border),
            numCell(totalBilled, totFill, true),
            numCell(totalPaid, totFill, true),
            numCell(totalArrears, totFill, true),
            cell('', {}, totFill, {}, undefined, border),
            cell(`${rowNum} line items`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, totFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
        ]);

        ws1Data.push(Array(10).fill(empty()));

        // ── SUMMARY BY VOTE HEAD section ──────────────────────────────
        ws1Data.push([
            cell('SUMMARY BY VOTE HEAD', { bold: true, color: { rgb: '0F2044' }, sz: 12 },
                sectionFill, { vertical: 'center' }, undefined, {}),
            ...Array(9).fill(cell('', {}, sectionFill, {}, undefined, {})),
        ]);
        ws1Data.push([
            hdr('Vote Head', subHdrFill), hdr('Code', subHdrFill),
            hdr('Total Collected', subHdrFill), hdr('# Payments', subHdrFill),
            hdr('% of Grand Total', subHdrFill),
            ...Array(5).fill(empty()),
        ]);
        for (let i = 0; i < vhSummary.length; i++) {
            const v = vhSummary[i];
            const pct = grandTotal > 0 ? v.total / grandTotal * 100 : 0;
            const rowFill = i % 2 === 0 ? altFill : { patternType: 'none' };
            ws1Data.push([
                cell(v.name, darkBold, rowFill, { vertical: 'center' }, undefined, border),
                cell(v.code, { color: { rgb: '6366F1' }, sz: 10 }, rowFill, { vertical: 'center' }, undefined, border),
                numCell(v.total, rowFill),
                cell(v.count, { color: { rgb: '0F2044' }, sz: 10 }, rowFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                pctCell(pct, rowFill),
                ...Array(5).fill(empty()),
            ]);
        }
        // Grand total row
        ws1Data.push([
            cell('GRAND TOTAL', { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 }, grandFill, { vertical: 'center' }, undefined, thickBorder),
            cell('', {}, grandFill, {}, undefined, thickBorder),
            numCell(grandTotal, grandFill, true),
            cell(filteredPayments.length, { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, grandFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('100.0%', { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, grandFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            ...Array(5).fill(cell('', {}, grandFill, {}, undefined, thickBorder)),
        ]);

        ws1Data.push(Array(10).fill(empty()));
        ws1Data.push([
            cell(
                'Note: Report generated by APSIMS — Alpha Premier School Information Management System. All figures in Kenya Shillings (KES).',
                { italic: true, color: { rgb: '94A3B8' }, sz: 8 },
                { patternType: 'none' }, { vertical: 'center' }, undefined, {}
            ),
            ...Array(9).fill(empty()),
        ]);

        const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

        // Merges
        const merges: any[] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },  // Brand header
            { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },  // Title
            { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },  // Meta
            // KPI 1
            { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
            { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
            { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
            // KPI 2
            { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
            { s: { r: 5, c: 2 }, e: { r: 5, c: 4 } },
            { s: { r: 6, c: 2 }, e: { r: 6, c: 4 } },
            // KPI 3
            { s: { r: 4, c: 5 }, e: { r: 4, c: 6 } },
            { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } },
            { s: { r: 6, c: 5 }, e: { r: 6, c: 6 } },
            // KPI 4
            { s: { r: 4, c: 7 }, e: { r: 4, c: 9 } },
            { s: { r: 5, c: 7 }, e: { r: 5, c: 9 } },
            { s: { r: 6, c: 7 }, e: { r: 6, c: 9 } },
        ];
        ws1['!merges'] = merges;
        ws1['!cols'] = [
            { wch: 5 }, { wch: 26 }, { wch: 16 }, { wch: 14 },
            { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
            { wch: 14 }, { wch: 18 },
        ];
        ws1['!rows'] = [
            { hpt: 28 }, { hpt: 36 }, { hpt: 20 }, { hpt: 8 },
            { hpt: 22 }, { hpt: 40 }, { hpt: 20 },
        ];
        XLSX.utils.book_append_sheet(wb, ws1, 'Vote Head Report');

        // ════════════════════════════════════════════════════════════════
        // SHEET 2 — ARREARS ANALYSIS
        // ════════════════════════════════════════════════════════════════
        const ws2Data: any[][] = [];
        ws2Data.push([cell('APSIMS — ARREARS ANALYSIS REPORT', whtBold14, hdrFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder), ...Array(5).fill(cell('', {}, hdrFill, {}, undefined, thickBorder))]);
        ws2Data.push([cell(`Period: ${period}   |   Generated: ${today}`, grayItal, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } }, { horizontal: 'center' }, undefined, border), ...Array(5).fill(cell('', {}, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } }, {}, undefined, border))]);
        ws2Data.push(Array(6).fill(empty()));

        // KPI mini-cards
        ws2Data.push([
            hdr('TOTAL ARREARS PAID', kpi2Fill), hdr('', kpi2Fill),
            hdr('AVG ARREARS PER STUDENT', kpi1Fill), hdr('', kpi1Fill),
            hdr('% OF TOTAL THAT WAS ARREARS', kpi3Fill), hdr('', kpi3Fill),
        ]);
        ws2Data.push([
            cell(`KES ${arrearsTotal.toLocaleString()}`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 }, kpi2Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi2Fill, {}, undefined, thickBorder),
            cell(`KES ${Math.round(avgArrears).toLocaleString()}`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 }, kpi1Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi1Fill, {}, undefined, thickBorder),
            cell(`${arrearsPercent}%`, { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 }, kpi3Fill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            cell('', {}, kpi3Fill, {}, undefined, thickBorder),
        ]);
        ws2Data.push([
            cell(`${arrearsRows.length} students cleared arrears`, whtSm, kpi2Fill, { horizontal: 'center' }, undefined, thickBorder),
            cell('', {}, kpi2Fill, {}, undefined, thickBorder),
            cell(`across ${arrearsRows.length} students`, whtSm, kpi1Fill, { horizontal: 'center' }, undefined, thickBorder),
            cell('', {}, kpi1Fill, {}, undefined, thickBorder),
            cell(`of KES ${grandTotal.toLocaleString()} total`, whtSm, kpi3Fill, { horizontal: 'center' }, undefined, thickBorder),
            cell('', {}, kpi3Fill, {}, undefined, thickBorder),
        ]);
        ws2Data.push(Array(6).fill(empty()));

        ws2Data.push([cell('ARREARS DETAIL — STUDENTS WHO PAID ARREARS', { bold: true, color: { rgb: '0F2044' }, sz: 12 }, sectionFill, { vertical: 'center' }, undefined, {}), ...Array(5).fill(cell('', {}, sectionFill, {}, undefined, {}))]);
        ws2Data.push([
            hdr('#', subHdrFill), hdr('Student Name', subHdrFill),
            hdr('Adm No.', subHdrFill), hdr('Form / Grade', subHdrFill),
            hdr('Arrears Paid (KES)', subHdrFill), hdr('# Payments', subHdrFill),
        ]);

        arrearsRows.forEach((r, i) => {
            const st = r.student;
            const admNo = st?.admission_no || st?.admission_number || '—';
            const formName = getFormName(st?.form_id);
            const rowFill = i % 2 === 0 ? altFill : { patternType: 'none' };
            ws2Data.push([
                cell(i + 1, darkBold, rowFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                cell(st ? `${st.first_name} ${st.last_name}` : '—', darkBold, rowFill, { vertical: 'center' }, undefined, border),
                cell(admNo, { color: { rgb: '2563EB' }, sz: 10 }, rowFill, { vertical: 'center' }, undefined, border),
                cell(formName, {}, rowFill, { vertical: 'center' }, undefined, border),
                numCell(r.arrears, rowFill),
                cell(r.payments, { color: { rgb: '0F2044' }, sz: 10 }, rowFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
            ]);
        });

        // Totals
        ws2Data.push([
            cell('', {}, grandFill, {}, undefined, thickBorder),
            cell('', {}, grandFill, {}, undefined, thickBorder),
            cell('', {}, grandFill, {}, undefined, thickBorder),
            cell('TOTAL ARREARS PAID', { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, grandFill, { horizontal: 'right', vertical: 'center' }, undefined, thickBorder),
            numCell(arrearsTotal, grandFill, true),
            cell('', {}, grandFill, {}, undefined, thickBorder),
        ]);

        const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
        ws2['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
            { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }, { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },
            { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } }, { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } }, { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
            { s: { r: 7, c: 0 }, e: { r: 7, c: 5 } },
        ];
        ws2['!cols'] = [{ wch: 5 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }];
        ws2['!rows'] = [{ hpt: 28 }, { hpt: 18 }, { hpt: 8 }, { hpt: 20 }, { hpt: 36 }, { hpt: 18 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Arrears Analysis');

        // ════════════════════════════════════════════════════════════════
        // SHEET 3 — DAILY TREND
        // ════════════════════════════════════════════════════════════════
        const ws3Data: any[][] = [];
        ws3Data.push([cell('APSIMS — DAILY COLLECTION TREND', whtBold14, hdrFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder), cell('', {}, hdrFill, {}, undefined, thickBorder), cell('', {}, hdrFill, {}, undefined, thickBorder)]);
        ws3Data.push([cell(`Period: ${period}`, grayItal, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } }, { horizontal: 'center' }, undefined, border), cell('', {}, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } }, {}, undefined, border), cell('', {}, { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } }, {}, undefined, border)]);
        ws3Data.push(Array(3).fill(empty()));
        ws3Data.push([hdr('Date', subHdrFill), hdr('Daily Collection (KES)', subHdrFill), hdr('Running Total (KES)', subHdrFill)]);
        let running = 0;
        dailyTrend.forEach((d, i) => {
            running += d.amount;
            const rowFill = i % 2 === 0 ? altFill : { patternType: 'none' };
            ws3Data.push([
                cell(d.date, { color: { rgb: '0F2044' }, sz: 10 }, rowFill, { horizontal: 'center', vertical: 'center' }, undefined, border),
                numCell(d.amount, rowFill),
                numCell(running, rowFill),
            ]);
        });
        ws3Data.push([
            cell('GRAND TOTAL', { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, grandFill, { horizontal: 'center', vertical: 'center' }, undefined, thickBorder),
            numCell(grandTotal, grandFill, true),
            numCell(running, grandFill, true),
        ]);
        const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
        ws3['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        ];
        ws3['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 26 }];
        ws3['!rows'] = [{ hpt: 28 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Daily Trend');

        // ── Write and download ────────────────────────────────────────
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `APSIMS_VoteHead_Report_${dateFrom}_to_${dateTo}.xlsx`;
        a.click();
        toast.success('✅ Premium Excel report exported!');
    };

    const TABS = [
        { key: 'overview', label: 'Overview', icon: FiBarChart2 },
        { key: 'trend', label: 'Trend Chart', icon: FiTrendingUp },
        { key: 'grid', label: 'Data Grid', icon: FiFileText },
        { key: 'arrears', label: 'Arrears Analysis', icon: FiAlertTriangle },
    ] as const;

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Vote Head Reports…</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">

            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/fees" className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all">
                        <FiArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiZap className="text-amber-500" /> Vote Head Reports</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Fee collection breakdown by vote head — arrears, receipts, trends</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all">
                        <FiRefreshCw size={13} /> Refresh
                    </button>
                    <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-md shadow-green-500/20 hover:shadow-green-500/30 transition-all">
                        <FiDownload size={13} /> Export Excel
                    </button>
                </div>
            </div>

            {/* ── FILTER PANEL ── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <FiFilter className="text-amber-500" size={16} />
                    <span className="text-sm font-black text-gray-700 uppercase tracking-wide">Filters</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Date from */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Date From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none" />
                    </div>
                    {/* Date to */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Date To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none" />
                    </div>
                    {/* Receipt from */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Receipt From</label>
                        <input type="text" value={receiptFrom} onChange={e => setReceiptFrom(e.target.value)}
                            placeholder="e.g. RCT001"
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none font-mono" />
                    </div>
                    {/* Receipt to */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Receipt To</label>
                        <input type="text" value={receiptTo} onChange={e => setReceiptTo(e.target.value)}
                            placeholder="e.g. RCT999"
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none font-mono" />
                    </div>
                    {/* Vote head */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Vote Head</label>
                        <select value={filterVH} onChange={e => setFilterVH(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white">
                            <option value="all">All Heads</option>
                            {voteHeads.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
                        </select>
                    </div>
                    {/* Form */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Form</label>
                        <select value={filterForm} onChange={e => setFilterForm(e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white">
                            <option value="all">All Forms</option>
                            {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                        </select>
                    </div>
                </div>
                {/* Clear filters */}
                {(receiptFrom || receiptTo || filterVH !== 'all' || filterForm !== 'all') && (
                    <button onClick={() => { setReceiptFrom(''); setReceiptTo(''); setFilterVH('all'); setFilterForm('all'); }}
                        className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700">
                        <FiX size={12} /> Clear filters
                    </button>
                )}
            </div>

            {/* ── KPI CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
                    <p className="text-amber-100 text-xs font-bold uppercase tracking-wide mb-1">Total Collected</p>
                    <p className="text-2xl font-black">{fmt(grandTotal)}</p>
                    <p className="text-amber-100 text-xs mt-1">{filteredPayments.length} payments</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white">
                    <p className="text-red-100 text-xs font-bold uppercase tracking-wide mb-1">Arrears Cleared</p>
                    <p className="text-2xl font-black">{fmt(arrearsTotal)}</p>
                    <p className="text-red-100 text-xs mt-1">{arrearsRows.length} students paid arrears</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white">
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-wide mb-1">Vote Heads Active</p>
                    <p className="text-2xl font-black">{vhSummary.length}</p>
                    <p className="text-indigo-100 text-xs mt-1">of {voteHeads.length} total</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-wide mb-1">Non-Arrears Collected</p>
                    <p className="text-2xl font-black">{fmt(grandTotal - arrearsTotal)}</p>
                    <p className="text-emerald-100 text-xs mt-1">Current term fees</p>
                </div>
            </div>

            {/* ── TAB BAR ── */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            activeTab === t.key
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                        }`}>
                        <t.icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ════════════════ OVERVIEW TAB ════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-5">
                    {/* Vote head summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vhSummary.map(vh => {
                            const pct = grandTotal > 0 ? (vh.total / grandTotal) * 100 : 0;
                            return (
                                <div key={vh.code} className="bg-white rounded-2xl border-2 border-gray-100 p-4 hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                                                style={{ background: `linear-gradient(135deg, ${vh.color}, ${vh.color}aa)` }}>
                                                {voteHeads.find(v => v.code === vh.code)?.priority || '?'}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-800 text-sm">{vh.name}</p>
                                                <code className="text-xs text-gray-400 font-mono">{vh.code}</code>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-800">{fmt(vh.total)}</p>
                                            <p className="text-xs text-gray-400">{vh.count} entries</p>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all"
                                            style={{ width: `${Math.min(100, pct)}%`, background: vh.color }} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 text-right font-semibold">{pct.toFixed(1)}% of total</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Bar chart */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h3 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
                                <FiBarChart2 className="text-amber-500" size={16} /> Collected Per Vote Head
                            </h3>
                            <BarChart data={vhSummary.map(v => ({ label: v.name, value: v.total, color: v.color }))} />
                        </div>
                        {/* Donut chart */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h3 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
                                <FiZap className="text-amber-500" size={16} /> Distribution %
                            </h3>
                            <DonutChart slices={vhSummary.map(v => ({ label: v.name, value: v.total, color: v.color }))} />
                        </div>
                    </div>

                    {/* Vote head detail table */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-black text-gray-800 text-sm">Vote Head Summary Table</h3>
                            <span className="text-xs text-gray-400">{filteredPayments.length} payments · {filteredAllocs.length} allocation rows</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Priority</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Vote Head</th>
                                        <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Code</th>
                                        <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Amount (KES)</th>
                                        <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Entries</th>
                                        <th className="text-right px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">% Share</th>
                                        <th className="px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">Trend</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {vhSummary.map(vh => {
                                        const pct = grandTotal > 0 ? (vh.total / grandTotal) * 100 : 0;
                                        const priority = voteHeads.find(v => v.code === vh.code)?.priority ?? 99;
                                        return (
                                            <tr key={vh.code} className="hover:bg-amber-50/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs"
                                                        style={{ background: vh.color }}>
                                                        {priority}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-800">{vh.name}</td>
                                                <td className="px-4 py-3"><code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{vh.code}</code></td>
                                                <td className="px-4 py-3 text-right font-black text-gray-800">{fmt(vh.total)}</td>
                                                <td className="px-4 py-3 text-right text-gray-500 font-semibold">{vh.count}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs font-black px-2 py-1 rounded-lg" style={{ background: vh.color + '20', color: vh.color }}>
                                                        {pct.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Sparkline points={dailyTrend.map(d => {
                                                        const total = filteredAllocs
                                                            .filter(a => a.vote_head_code === vh.code)
                                                            .reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
                                                        return total / Math.max(1, dailyTrend.length);
                                                    })} color={vh.color} h={32} w={80} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-amber-50 border-t-2 border-amber-200">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 font-black text-gray-800">GRAND TOTAL</td>
                                        <td className="px-4 py-3 text-right font-black text-amber-700 text-base">{fmt(grandTotal)}</td>
                                        <td className="px-4 py-3 text-right font-black text-gray-600">{filteredAllocs.length}</td>
                                        <td className="px-4 py-3 text-right font-black text-amber-700">100%</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ TREND TAB ════════════════ */}
            {activeTab === 'trend' && (
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
                            <FiTrendingUp className="text-amber-500" size={16} /> Daily Collection Trend
                        </h3>
                        {dailyTrend.length < 2 ? (
                            <p className="text-gray-400 text-sm text-center py-8">Not enough data for trend chart. Widen the date range.</p>
                        ) : (
                            <div className="relative">
                                {/* Y-axis max */}
                                <div className="flex items-end gap-1 h-52 w-full px-2">
                                    {dailyTrend.map((d, i) => {
                                        const max = Math.max(...dailyTrend.map(x => x.amount), 1);
                                        const h = Math.max(4, (d.amount / max) * 180);
                                        return (
                                            <div key={i} className="flex flex-col items-center flex-1 gap-1 group">
                                                <div className="relative flex-1 flex items-end w-full">
                                                    <div className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-amber-500 to-amber-400 group-hover:from-orange-500 group-hover:to-orange-400 transition-all"
                                                        style={{ height: h }} />
                                                    <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 left-1/2 -translate-x-1/2">
                                                        {d.date}<br />{fmt(d.amount)}
                                                    </div>
                                                </div>
                                                {i % Math.max(1, Math.floor(dailyTrend.length / 8)) === 0 && (
                                                    <span className="text-[8px] text-gray-400 font-medium">{d.date.slice(5)}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Per-head trend table */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="font-black text-gray-800 text-sm mb-4">Collection Per Vote Head — Daily Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-3 py-2 font-black text-gray-500 uppercase">Date</th>
                                        <th className="text-right px-3 py-2 font-black text-gray-500 uppercase">Total</th>
                                        {vhSummary.map(vh => (
                                            <th key={vh.code} className="text-right px-3 py-2 font-black uppercase" style={{ color: vh.color }}>{vh.code}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {dailyTrend.slice().reverse().map((d, i) => {
                                        const dayPays = filteredPayments.filter(p => (p.payment_date || '').startsWith(d.date));
                                        const dayAllocsByVH: Record<string, number> = {};
                                        for (const p of dayPays) {
                                            filteredAllocs.filter(a => a.payment_id === p.id).forEach(a => {
                                                dayAllocsByVH[a.vote_head_code] = (dayAllocsByVH[a.vote_head_code] || 0) + Number(a.allocated_amount || 0);
                                            });
                                        }
                                        return (
                                            <tr key={i} className="hover:bg-amber-50/30">
                                                <td className="px-3 py-2 font-semibold text-gray-700">{d.date}</td>
                                                <td className="px-3 py-2 text-right font-black text-gray-800">{fmt(d.amount)}</td>
                                                {vhSummary.map(vh => (
                                                    <td key={vh.code} className="px-3 py-2 text-right font-semibold" style={{ color: dayAllocsByVH[vh.code] ? vh.color : '#d1d5db' }}>
                                                        {dayAllocsByVH[vh.code] ? fmt(dayAllocsByVH[vh.code]) : '—'}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════ DATA GRID TAB ════════════════ */}
            {activeTab === 'grid' && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Search */}
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                            <input value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1); }}
                                placeholder="Search receipt, student, admission number…"
                                className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-400 outline-none" />
                        </div>
                        <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">{gridRows.length} rows</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 sticky top-0">
                                    {[
                                        { key: 'receipt_number', label: 'Receipt #' },
                                        { key: 'payment_date', label: 'Date' },
                                        { key: 'student', label: 'Student' },
                                        { key: 'formName', label: 'Form' },
                                        { key: 'termName', label: 'Term' },
                                        { key: 'payment_method', label: 'Method' },
                                        { key: 'amount', label: 'Total Paid' },
                                    ].map(col => (
                                        <th key={col.key} onClick={() => toggleSort(col.key)}
                                            className="text-left px-3 py-3 font-black text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap">
                                            <span className="flex items-center gap-1">{col.label} <SortIcon k={col.key} /></span>
                                        </th>
                                    ))}
                                    {/* Vote head allocation columns */}
                                    {vhSummary.map(vh => (
                                        <th key={vh.code} className="text-right px-3 py-3 font-black uppercase tracking-wide whitespace-nowrap" style={{ color: vh.color }}>
                                            {vh.code}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paged.length === 0 ? (
                                    <tr><td colSpan={7 + vhSummary.length} className="text-center py-12 text-gray-400">No records match the filters</td></tr>
                                ) : paged.map((r, i) => (
                                    <tr key={r.id} className={`hover:bg-amber-50/20 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                        <td className="px-3 py-2.5">
                                            <code className="font-mono font-bold text-indigo-600 text-xs">{r.receipt_number || `PAY-${r.id}`}</code>
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap">{r.payment_date}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="font-bold text-gray-800">
                                                {r.student ? `${r.student.first_name} ${r.student.last_name}` : '—'}
                                            </div>
                                            <div className="text-gray-400 text-[10px]">{r.student?.admission_no || r.student?.admission_number}</div>
                                        </td>
                                        <td className="px-3 py-2.5 font-medium text-gray-600">{r.formName}</td>
                                        <td className="px-3 py-2.5 text-gray-500">{r.termName}</td>
                                        <td className="px-3 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${
                                                r.payment_method === 'M-Pesa' ? 'bg-emerald-100 text-emerald-700' :
                                                r.payment_method === 'Cash' ? 'bg-green-100 text-green-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>{r.payment_method}</span>
                                        </td>
                                        <td className="px-3 py-2.5 font-black text-gray-800 whitespace-nowrap">{fmt(Number(r.amount))}</td>
                                        {/* Per-vote-head allocation */}
                                        {vhSummary.map(vh => {
                                            const alloc = r.allocs.find((a: any) => a.vote_head_code === vh.code);
                                            const amt = alloc ? Number(alloc.allocated_amount) : 0;
                                            return (
                                                <td key={vh.code} className="px-3 py-2.5 text-right font-semibold whitespace-nowrap"
                                                    style={{ color: amt > 0 ? vh.color : '#d1d5db' }}>
                                                    {amt > 0 ? fmt(amt) : '—'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">Page {page} of {totalPages} · {gridRows.length} total rows</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                                    ← Prev
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                page === p ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}>{p}</button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50">
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════ ARREARS ANALYSIS TAB ════════════════ */}
            {activeTab === 'arrears' && (
                <div className="space-y-5">
                    {/* Arrears KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                            <p className="text-red-600 text-xs font-black uppercase tracking-wide mb-1">Total Arrears Paid</p>
                            <p className="text-2xl font-black text-red-700">{fmt(arrearsTotal)}</p>
                            <p className="text-red-400 text-xs mt-1">{arrearsRows.length} students cleared arrears</p>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                            <p className="text-orange-600 text-xs font-black uppercase tracking-wide mb-1">Avg Arrears Per Student</p>
                            <p className="text-2xl font-black text-orange-700">
                                {fmt(arrearsRows.length > 0 ? arrearsTotal / arrearsRows.length : 0)}
                            </p>
                            <p className="text-orange-400 text-xs mt-1">across {arrearsRows.length} students</p>
                        </div>
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                            <p className="text-amber-600 text-xs font-black uppercase tracking-wide mb-1">% of Total that was Arrears</p>
                            <p className="text-2xl font-black text-amber-700">
                                {grandTotal > 0 ? ((arrearsTotal / grandTotal) * 100).toFixed(1) : '0.0'}%
                            </p>
                            <p className="text-amber-400 text-xs mt-1">of {fmt(grandTotal)} total</p>
                        </div>
                    </div>

                    {/* Arrears bar chart */}
                    {arrearsRows.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-5">
                            <h3 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
                                <FiAlertTriangle className="text-red-500" size={16} /> Top Arrears-Paying Students
                            </h3>
                            <BarChart data={arrearsRows.slice(0, 10).map(r => ({
                                label: r.student ? `${r.student.first_name?.charAt(0)}. ${r.student.last_name}` : '—',
                                value: r.arrears, color: '#ef4444'
                            }))} />
                        </div>
                    )}

                    {/* Arrears detail table */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <h3 className="font-black text-gray-800 text-sm">Arrears Detail — Students Who Paid Arrears</h3>
                        </div>
                        {arrearsRows.length === 0 ? (
                            <div className="text-center py-16">
                                <p className="text-gray-400 font-semibold">No arrears payments found in the selected range</p>
                                <p className="text-gray-400 text-xs mt-1">Widen the date range or check that payments are distributed to the ARREARS vote head</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-red-50 border-b border-red-100">
                                            <th className="text-left px-4 py-3 text-xs font-black text-red-600 uppercase">#</th>
                                            <th className="text-left px-4 py-3 text-xs font-black text-red-600 uppercase">Student</th>
                                            <th className="text-left px-4 py-3 text-xs font-black text-red-600 uppercase">Adm No</th>
                                            <th className="text-left px-4 py-3 text-xs font-black text-red-600 uppercase">Form</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-red-600 uppercase">Arrears Paid</th>
                                            <th className="text-right px-4 py-3 text-xs font-black text-red-600 uppercase">Payments</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {arrearsRows.map((r, i) => (
                                            <tr key={i} className="hover:bg-red-50/30 transition-colors">
                                                <td className="px-4 py-3 text-gray-400 font-bold">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-black text-xs">
                                                            {r.student?.first_name?.charAt(0)}{r.student?.last_name?.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-gray-800">{r.student ? `${r.student.first_name} ${r.student.last_name}` : '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.student?.admission_no || r.student?.admission_number || '—'}</td>
                                                <td className="px-4 py-3 text-gray-600 font-medium">{getFormName(r.student?.form_id)}</td>
                                                <td className="px-4 py-3 text-right font-black text-red-600">{fmt(r.arrears)}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-500">{r.payments}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-red-50 border-t-2 border-red-200">
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 font-black text-red-700">TOTAL ARREARS PAID</td>
                                            <td className="px-4 py-3 text-right font-black text-red-700 text-base">{fmt(arrearsTotal)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
