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

    // ── Premium Excel Export (ExcelJS) ─────────────────────────────────────────
    const exportExcel = async () => {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        wb.creator = 'APSIMS';
        wb.created = new Date();

        const today = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });
        const period = `${dateFrom} to ${dateTo}`;
        const nonArrears = grandTotal - arrearsTotal;
        const arrearsPercent = grandTotal > 0 ? (arrearsTotal / grandTotal * 100).toFixed(1) : '0.0';
        const avgArrears = arrearsRows.length > 0 ? arrearsTotal / arrearsRows.length : 0;

        // Colour palette
        const C = {
            NAVY: '0F2044', NAVY2: '1E3A5F', AMBER: 'F59E0B', RED: 'DC2626',
            INDIGO: '6366F1', GREEN: '10B981', ORANGE: 'D97706', SLATE: 'E2E8F0',
            BLUE_LT: 'DBEAFE', GREEN_LT: 'D1FAE5', YEL_LT: 'FEF3C7',
            ALT: 'EEF2FF', CREAM: 'FFFBEB', WHITE: 'FFFFFF',
        };

        const fill = (hex: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + hex } });
        const fnt  = (color: string, sz = 10, bold = false, italic = false) => ({ name: 'Calibri', color: { argb: 'FF' + color }, size: sz, bold, italic });
        const aln  = (h: any, v: any = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });
        const thin  = (c = 'CBD5E1') => ({ style: 'thin'   as const, color: { argb: 'FF' + c } });
        const thick = (c = '0F2044') => ({ style: 'medium' as const, color: { argb: 'FF' + c } });
        const bdrT  = () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() });
        const bdrM  = () => ({ top: thick(), bottom: thick(), left: thick(), right: thick() });

        // Style a single cell
        const sc = (cell: ExcelJS.Cell, bg: string | undefined, fg: string, sz: number,
                    bold: boolean, italic: boolean, ha: any,
                    brd: 'T' | 'M' | undefined, val?: any, fmt?: string) => {
            if (val !== undefined) cell.value = val;
            if (bg) cell.fill = fill(bg);
            cell.font      = fnt(fg, sz, bold, italic);
            cell.alignment = aln(ha);
            if (brd === 'T') cell.border = bdrT();
            if (brd === 'M') cell.border = bdrM();
            if (fmt) cell.numFmt = fmt;
        };

        // ===================== SHEET 1 — VOTE HEAD REPORT =====================
        const ws1 = wb.addWorksheet('Vote Head Report', {
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
            properties: { tabColor: { argb: 'FF' + C.AMBER } },
        });
        ws1.columns = [
            { width: 5 }, { width: 28 }, { width: 17 }, { width: 14 }, { width: 24 },
            { width: 16 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 20 },
        ];

        // Row 1 — Brand banner
        ws1.mergeCells('A1:J1'); ws1.getRow(1).height = 34;
        const r1c = ws1.getCell('A1');
        r1c.value = 'ALPHASCHOOL  •  APSIMS';
        r1c.fill = fill(C.NAVY); r1c.font = fnt(C.WHITE, 18, true); r1c.alignment = aln('center'); r1c.border = bdrM();

        // Row 2 — Title
        ws1.mergeCells('A2:J2'); ws1.getRow(2).height = 44;
        const r2c = ws1.getCell('A2');
        r2c.value = 'FEE COLLECTION — VOTE HEAD REPORT';
        r2c.fill = fill(C.NAVY); r2c.font = fnt(C.WHITE, 26, true); r2c.alignment = aln('center'); r2c.border = bdrM();

        // Row 3 — Meta info
        ws1.mergeCells('A3:J3'); ws1.getRow(3).height = 20;
        sc(ws1.getCell('A3'), C.SLATE, '475569', 9, false, true, 'center', 'T',
            `Reporting Period: ${period}   |   Generated: ${today}   |   Alpha Premier School Information Management System`);

        ws1.getRow(4).height = 10; // spacer

        // Rows 5-7 — 4 KPI cards
        const kpis = [
            { rngs: ['A5:B5','A6:B6','A7:B7'], col: C.AMBER,  lbl: 'TOTAL COLLECTED',      val: `KES ${grandTotal.toLocaleString()}`,     sub: `${filteredPayments.length} payments` },
            { rngs: ['C5:E5','C6:E6','C7:E7'], col: C.RED,    lbl: 'ARREARS CLEARED',       val: `KES ${arrearsTotal.toLocaleString()}`,   sub: `${arrearsRows.length} students paid arrears` },
            { rngs: ['F5:G5','F6:G6','F7:G7'], col: C.INDIGO, lbl: 'VOTE HEADS ACTIVE',     val: String(vhSummary.length),                sub: `of ${voteHeads.length} total` },
            { rngs: ['H5:J5','H6:J6','H7:J7'], col: C.GREEN,  lbl: 'NON-ARREARS COLLECTED', val: `KES ${nonArrears.toLocaleString()}`,      sub: 'Current term fees' },
        ];
        ws1.getRow(5).height = 22; ws1.getRow(6).height = 46; ws1.getRow(7).height = 20;
        for (const k of kpis) {
            k.rngs.forEach(rng => ws1.mergeCells(rng));
            const [a0, a1, a2] = k.rngs.map(rng => ws1.getCell(rng.split(':')[0]));
            a0.value = k.lbl; a0.fill = fill(k.col); a0.font = fnt(C.WHITE, 10, true); a0.alignment = aln('center'); a0.border = bdrM();
            a1.value = k.val; a1.fill = fill(k.col); a1.font = fnt(C.WHITE, 24, true); a1.alignment = aln('center'); a1.border = bdrM();
            a2.value = k.sub; a2.fill = fill(k.col); a2.font = fnt(C.WHITE, 9);        a2.alignment = aln('center'); a2.border = bdrM();
        }

        ws1.getRow(8).height = 10; // spacer

        // Row 9 — section label
        ws1.mergeCells('A9:J9'); ws1.getRow(9).height = 24;
        sc(ws1.getCell('A9'), C.CREAM, C.NAVY, 13, true, false, 'left', 'T', 'PAYMENT DETAIL — ALL VOTE HEADS');

        // Row 10 — table headers
        ws1.getRow(10).height = 28;
        ['#', 'Student Name', 'Adm No.', 'Form / Grade', 'Vote Head', 'Amount Billed', 'Amount Paid', 'Arrears', 'Receipt No.', 'Status']
            .forEach((h, i) => {
                const cell = ws1.getCell(10, i + 1);
                cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 10, true);
                cell.alignment = aln('center'); cell.border = bdrM();
            });

        // Data rows — one per allocation line
        let dr = 11; let totBilled = 0; let totPaid = 0;
        for (const p of gridRows) {
            const admNo = p.student?.admission_no || p.student?.admission_number || '—';
            const name  = p.student ? `${p.student.first_name} ${p.student.last_name}` : '—';
            const src = p.allocs.length > 0 ? p.allocs : [null];
            for (const a of src) {
                ws1.getRow(dr).height = 18;
                const isArr = a && (a.vote_head_code || '').toUpperCase().includes('ARREAR');
                const amt   = a ? Number(a.allocated_amount || 0) : Number(p.amount || 0);
                const vhNm  = a ? (a.vote_head_name || a.vote_head_code) : '(No allocation)';
                const sTxt  = isArr ? 'Arrears Cleared' : amt > 0 ? 'Fully Paid' : 'Balance Pending';
                const sBg   = isArr ? C.BLUE_LT  : amt > 0 ? C.GREEN_LT  : C.YEL_LT;
                const sFg   = isArr ? '1D4ED8'   : amt > 0 ? '065F46'    : '92400E';
                const rbg   = dr % 2 === 0 ? C.ALT : C.WHITE;

                sc(ws1.getCell(dr, 1),  rbg,  C.NAVY,    10, true,  false,  'center', 'T', dr - 10);
                sc(ws1.getCell(dr, 2),  rbg,  C.NAVY,    10, true,  false,  'left',   'T', name);
                sc(ws1.getCell(dr, 3),  rbg,  '2563EB',   9, false, false,  'left',   'T', admNo);
                sc(ws1.getCell(dr, 4),  rbg,  '334155',  10, false, false,  'center', 'T', p.formName);
                sc(ws1.getCell(dr, 5),  rbg,  a ? '334155' : '94A3B8', 10, false, !a, 'left', 'T', vhNm);
                sc(ws1.getCell(dr, 6),  rbg,  C.NAVY,    10, false, false,  'right',  'T', a ? amt : 0, '#,##0');
                sc(ws1.getCell(dr, 7),  rbg,  C.NAVY,    10, false, false,  'right',  'T', amt, '#,##0');
                sc(ws1.getCell(dr, 8),  rbg,  '64748B',  10, false, false,  'right',  'T', 0, '#,##0');
                sc(ws1.getCell(dr, 9),  rbg,  C.INDIGO,   9, false, false,  'center', 'T', p.receipt_number || '—');
                sc(ws1.getCell(dr, 10), sBg,  sFg,        9, true,  false,  'center', 'T', sTxt);

                totBilled += a ? amt : 0; totPaid += amt; dr++;
            }
        }

        // Totals row
        ws1.mergeCells(`A${dr}:D${dr}`); ws1.getRow(dr).height = 24;
        for (let c = 1; c <= 4; c++) { ws1.getCell(dr, c).fill = fill(C.ORANGE); ws1.getCell(dr, c).border = bdrM(); }
        sc(ws1.getCell(dr, 5),  C.ORANGE, C.WHITE, 12, true, false, 'right',  'M', 'TOTALS');
        sc(ws1.getCell(dr, 6),  C.ORANGE, C.WHITE, 12, true, false, 'right',  'M', totBilled, '#,##0');
        sc(ws1.getCell(dr, 7),  C.ORANGE, C.WHITE, 12, true, false, 'right',  'M', totPaid,   '#,##0');
        sc(ws1.getCell(dr, 8),  C.ORANGE, C.WHITE, 12, true, false, 'right',  'M', 0, '#,##0');
        sc(ws1.getCell(dr, 9),  C.ORANGE, C.WHITE, 10, false,false, 'center', 'M');
        sc(ws1.getCell(dr, 10), C.ORANGE, C.WHITE, 10, true, false, 'center', 'M', `${dr - 11} line items`);
        dr += 2;

        // Summary section header
        ws1.mergeCells(`A${dr}:J${dr}`); ws1.getRow(dr).height = 24;
        sc(ws1.getCell(`A${dr}`), C.CREAM, C.NAVY, 13, true, false, 'left', 'T', 'SUMMARY BY VOTE HEAD');
        dr++;

        ws1.getRow(dr).height = 26;
        ['Vote Head', 'Code', 'Total Collected (KES)', '# Payments', '% of Grand Total', '', '', '', '', '']
            .forEach((h, i) => {
                const cell = ws1.getCell(dr, i + 1);
                cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 10, true);
                cell.alignment = aln('center'); cell.border = bdrM();
            });
        dr++;

        for (let i = 0; i < vhSummary.length; i++) {
            const v = vhSummary[i];
            const pct = grandTotal > 0 ? v.total / grandTotal : 0;
            const bg  = i % 2 === 0 ? C.ALT : C.WHITE;
            const bars = '█'.repeat(Math.round(pct * 20)) + '░'.repeat(20 - Math.round(pct * 20));
            ws1.getRow(dr).height = 18;
            sc(ws1.getCell(dr, 1), bg, C.NAVY,   10, true,  false, 'left',   'T', v.name);
            sc(ws1.getCell(dr, 2), bg, C.INDIGO,  9, false, false, 'center', 'T', v.code);
            sc(ws1.getCell(dr, 3), bg, C.NAVY,   10, false, false, 'right',  'T', v.total, '#,##0');
            sc(ws1.getCell(dr, 4), bg, '334155', 10, false, false, 'center', 'T', v.count);
            sc(ws1.getCell(dr, 5), bg, C.AMBER,   9, true,  false, 'left',   'T', `${bars}  ${(pct * 100).toFixed(1)}%`);
            for (let c = 6; c <= 10; c++) { ws1.getCell(dr, c).fill = fill(bg); ws1.getCell(dr, c).border = bdrT(); }
            dr++;
        }

        // Grand total summary row
        ws1.getRow(dr).height = 26;
        sc(ws1.getCell(dr, 1), C.NAVY, C.WHITE,  13, true, false, 'left',   'M', 'GRAND TOTAL');
        sc(ws1.getCell(dr, 2), C.NAVY, C.WHITE,  13, true, false, 'center', 'M');
        sc(ws1.getCell(dr, 3), C.NAVY, C.AMBER,  14, true, false, 'right',  'M', grandTotal, '#,##0');
        sc(ws1.getCell(dr, 4), C.NAVY, C.WHITE,  11, true, false, 'center', 'M', filteredPayments.length);
        sc(ws1.getCell(dr, 5), C.NAVY, C.AMBER,  13, true, false, 'center', 'M', '100.0%');
        for (let c = 6; c <= 10; c++) { ws1.getCell(dr, c).fill = fill(C.NAVY); ws1.getCell(dr, c).border = bdrM(); }
        dr += 2;

        // Footer note
        ws1.mergeCells(`A${dr}:J${dr}`);
        sc(ws1.getCell(`A${dr}`), undefined, '94A3B8', 8, false, true, 'left', undefined,
            'Report generated by APSIMS — Alpha Premier School Information Management System. All figures in Kenya Shillings (KES). Confidential.');

        // ===================== SHEET 2 — ARREARS ANALYSIS =====================
        const ws2 = wb.addWorksheet('Arrears Analysis', { properties: { tabColor: { argb: 'FF' + C.RED } } });
        ws2.columns = [{ width: 5 }, { width: 28 }, { width: 17 }, { width: 16 }, { width: 22 }, { width: 14 }];

        ws2.mergeCells('A1:F1'); ws2.getRow(1).height = 34;
        const s2h = ws2.getCell('A1');
        s2h.value = 'APSIMS — ARREARS ANALYSIS REPORT';
        s2h.fill = fill(C.NAVY); s2h.font = fnt(C.WHITE, 18, true); s2h.alignment = aln('center'); s2h.border = bdrM();

        ws2.mergeCells('A2:F2'); ws2.getRow(2).height = 18;
        sc(ws2.getCell('A2'), C.SLATE, '475569', 9, false, true, 'center', 'T', `Period: ${period}   |   Generated: ${today}`);
        ws2.getRow(3).height = 12;

        const arrKPIs = [
            { rngs: ['A4:B4','A5:B5','A6:B6'], col: C.RED,    lbl: 'TOTAL ARREARS PAID',          val: `KES ${arrearsTotal.toLocaleString()}`,          sub: `${arrearsRows.length} students cleared arrears` },
            { rngs: ['C4:D4','C5:D5','C6:D6'], col: C.AMBER,  lbl: 'AVG ARREARS PER STUDENT',     val: `KES ${Math.round(avgArrears).toLocaleString()}`, sub: `across ${arrearsRows.length} students` },
            { rngs: ['E4:F4','E5:F5','E6:F6'], col: C.INDIGO, lbl: '% OF TOTAL THAT WAS ARREARS', val: `${arrearsPercent}%`,                             sub: `of KES ${grandTotal.toLocaleString()} total` },
        ];
        ws2.getRow(4).height = 22; ws2.getRow(5).height = 42; ws2.getRow(6).height = 20;
        for (const k of arrKPIs) {
            k.rngs.forEach(rng => ws2.mergeCells(rng));
            const [a0, a1, a2] = k.rngs.map(rng => ws2.getCell(rng.split(':')[0]));
            a0.value = k.lbl; a0.fill = fill(k.col); a0.font = fnt(C.WHITE, 10, true); a0.alignment = aln('center'); a0.border = bdrM();
            a1.value = k.val; a1.fill = fill(k.col); a1.font = fnt(C.WHITE, 22, true); a1.alignment = aln('center'); a1.border = bdrM();
            a2.value = k.sub; a2.fill = fill(k.col); a2.font = fnt(C.WHITE, 9);        a2.alignment = aln('center'); a2.border = bdrM();
        }
        ws2.getRow(7).height = 12;

        ws2.mergeCells('A8:F8'); ws2.getRow(8).height = 22;
        sc(ws2.getCell('A8'), C.CREAM, C.NAVY, 13, true, false, 'left', 'T', 'ARREARS DETAIL — STUDENTS WHO PAID ARREARS');

        ws2.getRow(9).height = 26;
        ['#', 'Student Name', 'Adm No.', 'Form / Grade', 'Arrears Paid (KES)', '# Payments'].forEach((h, i) => {
            const cell = ws2.getCell(9, i + 1);
            cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 10, true);
            cell.alignment = aln('center'); cell.border = bdrM();
        });

        let a2r = 10;
        for (let i = 0; i < arrearsRows.length; i++) {
            const ar = arrearsRows[i]; const st = ar.student;
            const bg = i % 2 === 0 ? C.ALT : C.WHITE;
            ws2.getRow(a2r).height = 18;
            sc(ws2.getCell(a2r, 1), bg, C.NAVY,   10, true,  false, 'center', 'T', i + 1);
            sc(ws2.getCell(a2r, 2), bg, C.NAVY,   10, true,  false, 'left',   'T', st ? `${st.first_name} ${st.last_name}` : '—');
            sc(ws2.getCell(a2r, 3), bg, '2563EB',  9, false, false, 'left',   'T', st?.admission_no || st?.admission_number || '—');
            sc(ws2.getCell(a2r, 4), bg, '334155', 10, false, false, 'center', 'T', getFormName(st?.form_id));
            sc(ws2.getCell(a2r, 5), bg, C.RED,    10, true,  false, 'right',  'T', ar.arrears, '#,##0');
            sc(ws2.getCell(a2r, 6), bg, C.NAVY,   10, false, false, 'center', 'T', ar.payments);
            a2r++;
        }
        ws2.mergeCells(`A${a2r}:D${a2r}`); ws2.getRow(a2r).height = 26;
        for (let c = 1; c <= 4; c++) { ws2.getCell(a2r, c).fill = fill(C.NAVY); ws2.getCell(a2r, c).border = bdrM(); }
        sc(ws2.getCell(a2r, 4), C.NAVY, C.WHITE,  12, true, false, 'right',  'M', 'TOTAL ARREARS PAID');
        sc(ws2.getCell(a2r, 5), C.NAVY, C.AMBER,  16, true, false, 'right',  'M', arrearsTotal, '#,##0');
        sc(ws2.getCell(a2r, 6), C.NAVY, C.WHITE,  10, false, false, 'center', 'M');

        // ===================== SHEET 3 — DAILY TREND =====================
        const ws3 = wb.addWorksheet('Daily Trend', { properties: { tabColor: { argb: 'FF' + C.GREEN } } });
        ws3.columns = [{ width: 18 }, { width: 28 }, { width: 28 }];

        ws3.mergeCells('A1:C1'); ws3.getRow(1).height = 34;
        const s3h = ws3.getCell('A1');
        s3h.value = 'APSIMS — DAILY COLLECTION TREND';
        s3h.fill = fill(C.NAVY); s3h.font = fnt(C.WHITE, 18, true); s3h.alignment = aln('center'); s3h.border = bdrM();

        ws3.mergeCells('A2:C2'); ws3.getRow(2).height = 18;
        sc(ws3.getCell('A2'), C.SLATE, '475569', 9, false, true, 'center', 'T', `Period: ${period}   |   Generated: ${today}`);
        ws3.getRow(3).height = 10;

        ws3.getRow(4).height = 26;
        ['Date', 'Daily Collection (KES)', 'Running Total (KES)'].forEach((h, i) => {
            const cell = ws3.getCell(4, i + 1);
            cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 11, true);
            cell.alignment = aln('center'); cell.border = bdrM();
        });

        let d3r = 5; let run3 = 0;
        for (let i = 0; i < dailyTrend.length; i++) {
            const d = dailyTrend[i]; run3 += d.amount;
            const bg = i % 2 === 0 ? C.ALT : C.WHITE;
            ws3.getRow(d3r).height = 18;
            sc(ws3.getCell(d3r, 1), bg, C.NAVY,   10, false, false, 'center', 'T', d.date);
            sc(ws3.getCell(d3r, 2), bg, C.NAVY,   10, false, false, 'right',  'T', d.amount, '#,##0');
            sc(ws3.getCell(d3r, 3), bg, C.GREEN,  10, true,  false, 'right',  'T', run3, '#,##0');
            d3r++;
        }
        ws3.getRow(d3r).height = 26;
        sc(ws3.getCell(d3r, 1), C.NAVY, C.WHITE,  12, true, false, 'center', 'M', 'GRAND TOTAL');
        sc(ws3.getCell(d3r, 2), C.NAVY, C.AMBER,  14, true, false, 'right',  'M', grandTotal, '#,##0');
        sc(ws3.getCell(d3r, 3), C.NAVY, C.GREEN,  14, true, false, 'right',  'M', run3, '#,##0');

        // Download
        const buffer = await wb.xlsx.writeBuffer();
        const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link   = document.createElement('a');
        link.href    = URL.createObjectURL(blob);
        link.download = `APSIMS_VoteHead_Report_${dateFrom}_to_${dateTo}.xlsx`;
        link.click();
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
