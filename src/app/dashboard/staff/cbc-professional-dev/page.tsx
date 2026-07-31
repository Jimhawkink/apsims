'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiTrendingUp, FiPlus, FiSearch, FiSave, FiTrash2, FiEdit2, FiX,
    FiChevronRight, FiChevronLeft, FiDownload, FiRefreshCw, FiUser,
    FiUsers, FiBook, FiCalendar, FiBarChart2, FiStar, FiCheckCircle,
    FiAlertCircle, FiActivity, FiFilter, FiFileText, FiAward,
    FiChevronUp, FiChevronDown, FiPrinter, FiClock, FiZap, FiGrid,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CPDCategory = 'workshop' | 'training' | 'webinar' | 'conference' | 'peer_learning' | 'self_study' | 'mentoring' | 'research';
type CPDStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
type SortDir = 'asc' | 'desc';

interface CPDEntry {
    id: string;
    teacher_name: string;
    teacher_id?: string;
    category: CPDCategory;
    title: string;
    provider: string;
    description?: string;
    cbc_focus_area: string;
    learning_areas_covered: string[];
    start_date: string;
    end_date?: string;
    hours: number;
    cost?: number;
    certificate_no?: string;
    impact_rating: 1 | 2 | 3 | 4 | 5;
    reflection?: string;
    action_plan?: string;
    status: CPDStatus;
    year: number;
    term?: string;
    created_at: string;
}

const CATEGORIES: Record<CPDCategory, { label: string; icon: string; color: string; bg: string }> = {
    workshop:      { label: 'Workshop',       icon: '🏫', color: '#2563EB', bg: '#EFF6FF' },
    training:      { label: 'Training',       icon: '📚', color: '#059669', bg: '#ECFDF5' },
    webinar:       { label: 'Webinar',        icon: '💻', color: '#7C3AED', bg: '#F5F3FF' },
    conference:    { label: 'Conference',     icon: '🎤', color: '#D97706', bg: '#FFFBEB' },
    peer_learning: { label: 'Peer Learning',  icon: '🤝', color: '#0891B2', bg: '#ECFEFF' },
    self_study:    { label: 'Self Study',     icon: '📖', color: '#65A30D', bg: '#F7FEE7' },
    mentoring:     { label: 'Mentoring',      icon: '👨‍🏫', color: '#9333EA', bg: '#FAF5FF' },
    research:      { label: 'Research',       icon: '🔬', color: '#DC2626', bg: '#FEF2F2' },
};

const STATUS_INFO: Record<CPDStatus, { label: string; color: string; bg: string }> = {
    planned:     { label: 'Planned',     color: '#D97706', bg: '#FFFBEB' },
    in_progress: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
    completed:   { label: 'Completed',   color: '#059669', bg: '#ECFDF5' },
    cancelled:   { label: 'Cancelled',   color: '#DC2626', bg: '#FEF2F2' },
};

const CBC_FOCUS_AREAS = [
    'CBC Competency-Based Assessment', 'SBA Task Design & Marking', 'Portfolio Evidence Collection',
    'Differentiated Instruction', 'CBC Strand-Based Teaching', 'Formative Assessment Strategies',
    'Learner-Centred Pedagogy', 'KICD CBC Curriculum Framework', 'Digital Integration in CBC',
    'Inclusive Education in CBC', 'CBC Parent Engagement', 'JSS Pathway Guidance',
    'CBC Report Writing', 'Cross-Curricular Learning', 'CBC Rubric Design',
];

const LEARNING_AREAS = [
    'Literacy Activities', 'Kiswahili', 'English', 'Mathematics Activities',
    'Environmental Activities', 'Pre-Technical Studies', 'Agriculture',
    'Social Studies', 'Business Studies', 'ICT', 'Creative Arts',
    'Physical Education', 'Religious Education', 'All Learning Areas',
];

const DEMO_ENTRIES: CPDEntry[] = [
    { id:'c1', teacher_name:'Ms. Akinyi Odhiambo', category:'workshop', title:'CBC Competency-Based Assessment Masterclass', provider:'Kenya Institute of Curriculum Development (KICD)', description:'Intensive 3-day workshop on designing and delivering effective CBC assessments aligned to the national curriculum framework.', cbc_focus_area:'CBC Competency-Based Assessment', learning_areas_covered:['Mathematics Activities','English'], start_date:'2025-03-10', end_date:'2025-03-12', hours:24, cost:5000, certificate_no:'KICD/CPD/2025/0147', impact_rating:5, reflection:'This workshop transformed my understanding of formative assessment. I now design tasks that truly measure competency rather than recall. My students engagement has improved dramatically.', action_plan:'Redesign all end-of-strand assessments using EE/ME/AE/BE rubrics. Share templates with department by April 2025.', status:'completed', year:2025, term:'Term 1', created_at: new Date().toISOString() },
    { id:'c2', teacher_name:'Mr. Otieno Wycliffe', category:'training', title:'SBA Task Design & Authentic Assessment', provider:'TSC CBC Professional Development Programme', description:'Online training covering the design of authentic SBA tasks, portfolio evidence collection, and HOD approval workflows.', cbc_focus_area:'SBA Task Design & Marking', learning_areas_covered:['Pre-Technical Studies','ICT'], start_date:'2025-04-05', end_date:'2025-04-06', hours:16, cost:0, certificate_no:'TSC/SBA/2025/0089', impact_rating:4, reflection:'Excellent practical guidance on authentic tasks. The portfolio checklist provided is now being used by all teachers in my department.', action_plan:'Implement portfolio folders for each Grade 7-9 student by May 2025. Train 3 junior teachers on SBA marking.', status:'completed', year:2025, term:'Term 2', created_at: new Date().toISOString() },
    { id:'c3', teacher_name:'Ms. Chebet Faith', category:'webinar', title:'Differentiated Learning in CBC Classrooms', provider:'CEMASTEA — Centre for Mathematics, Science & Technology Education', description:'Live webinar on practical strategies for differentiating instruction to meet diverse learner needs within the CBC framework.', cbc_focus_area:'Differentiated Instruction', learning_areas_covered:['All Learning Areas'], start_date:'2025-05-20', end_date:'2025-05-20', hours:3, cost:0, impact_rating:3, reflection:'Good overview but needed more subject-specific examples. Will supplement with peer observation sessions.', action_plan:'Plan peer observation cycle for Term 3. Focus on differentiation strategies in creative arts.', status:'completed', year:2025, term:'Term 2', created_at: new Date().toISOString() },
    { id:'c4', teacher_name:'Mr. Kamau James', category:'conference', title:'National CBC Teachers Conference 2025', provider:'Kenya National Union of Teachers (KNUT) & MOE', description:'Annual national conference bringing together CBC practitioners from across Kenya to share best practices and policy updates.', cbc_focus_area:'KICD CBC Curriculum Framework', learning_areas_covered:['All Learning Areas'], start_date:'2025-07-14', end_date:'2025-07-16', hours:20, cost:8500, certificate_no:'KNUT/CBC/CONF/2025/0234', impact_rating:5, reflection:'Inspiring presentations from leading CBC schools. Connected with HODs from Nairobi and Mombasa who are implementing innovative portfolio systems. Bringing back 5 key strategies.', action_plan:'Present conference takeaways to school management. Propose CBC innovation pilot for Grade 8. Draft new school CBC policy by August 2025.', status:'completed', year:2025, term:'Term 2', created_at: new Date().toISOString() },
    { id:'c5', teacher_name:'Mrs. Wangari Njeri', category:'peer_learning', title:'CBC Assessment Peer Review Circle — Term 2', provider:'Internal (School-Based Professional Learning Community)', description:'Monthly peer review sessions where teachers observe each other\'s CBC lesson delivery and provide structured feedback.', cbc_focus_area:'Formative Assessment Strategies', learning_areas_covered:['Kiswahili','English','Literacy Activities'], start_date:'2025-06-01', end_date:'2025-06-30', hours:8, cost:0, impact_rating:4, reflection:'Peer observations were incredibly valuable. Seeing colleagues use EE/ME descriptors effectively has helped me refine my own practice. Collaborative marking is now standard in our department.', action_plan:'Continue circle in Term 3. Expand to include Grade 4-6 teachers. Create shared CBC resource folder on school drive.', status:'completed', year:2025, term:'Term 2', created_at: new Date().toISOString() },
    { id:'c6', teacher_name:'Mr. Mwangi Brian', category:'self_study', title:'CBC Learner-Centred Pedagogy — Self-Directed Learning', provider:'KICD Online Resources & Open University Kenya', description:'Self-directed study programme covering learner-centred teaching approaches within the CBC framework, including project-based learning and inquiry-based activities.', cbc_focus_area:'Learner-Centred Pedagogy', learning_areas_covered:['Agriculture','Environmental Activities'], start_date:'2025-07-01', end_date:'2025-07-31', hours:20, cost:0, impact_rating:3, reflection:'The reading was comprehensive. Applied project-based learning approach in school garden project with Grade 6.', action_plan:'Design 2 project-based learning units for Term 3 Agriculture. Document learning outcomes using CBC competency levels.', status:'in_progress', year:2025, term:'Term 3', created_at: new Date().toISOString() },
    { id:'c7', teacher_name:'Ms. Akinyi Odhiambo', category:'mentoring', title:'HOD Mentoring Programme — CBC Leadership', provider:'CEMASTEA HOD Development Initiative', description:'One-on-one mentoring sessions with experienced HOD on leading CBC curriculum delivery within a department.', cbc_focus_area:'CBC Strand-Based Teaching', learning_areas_covered:['Mathematics Activities'], start_date:'2025-08-01', end_date: undefined, hours:12, cost:0, impact_rating:4, reflection:'', action_plan:'Apply leadership coaching techniques in department meetings. Set clear CBC delivery targets for each teacher.', status:'in_progress', year:2025, term:'Term 3', created_at: new Date().toISOString() },
    { id:'c8', teacher_name:'Mr. Otieno Wycliffe', category:'research', title:'CBC Action Research — Technology Integration in Grade 7', provider:'Kenyatta University Continuing Education', description:'Formal action research project on the integration of digital tools in CBC lesson delivery for Grade 7 Pre-Technical Studies.', cbc_focus_area:'Digital Integration in CBC', learning_areas_covered:['Pre-Technical Studies','ICT'], start_date:'2025-09-01', end_date: undefined, hours:40, cost:3000, impact_rating:0 as any, reflection:'', action_plan:'', status:'planned', year:2025, term:'Term 3', created_at: new Date().toISOString() },
];

const PAGE_SIZE = 15;

// ── Ultra Pagination Component ──────────────────────────────────────────────
function UltraPagination({ page, totalPages, total, pageSize, onPage }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
            <span className="text-xs text-gray-500">
                Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> records
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(1)} disabled={page === 1}
                    className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors font-medium" title="First">«</button>
                <button onClick={() => onPage(page - 1)} disabled={page === 1}
                    className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                    <FiChevronLeft size={12} />
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`e${i}`} className="px-2 py-1.5 text-xs text-gray-400">…</span>
                    ) : (
                        <button key={p} onClick={() => onPage(p as number)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all border ${page === p ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300'}`}>
                            {p}
                        </button>
                    )
                )}
                <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
                    className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                    <FiChevronRight size={12} />
                </button>
                <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
                    className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors font-medium" title="Last">»</button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Go to page:</span>
                <input type="number" min={1} max={totalPages} defaultValue={page} key={page}
                    onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value); if (v >= 1 && v <= totalPages) onPage(v); } }}
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
        </div>
    );
}

// ── Sort Icon ────────────────────────────────────────────────────────────────
function SortIcon({ field, sortKey, sortDir }: { field: string; sortKey: string; sortDir: SortDir }) {
    if (sortKey !== field) return <FiChevronDown size={11} className="opacity-25 ml-0.5" />;
    return sortDir === 'asc' ? <FiChevronUp size={11} className="text-indigo-500 ml-0.5" /> : <FiChevronDown size={11} className="text-indigo-500 ml-0.5" />;
}

export default function CBCProfessionalDevPage() {
    const [entries, setEntries] = useState<CPDEntry[]>(DEMO_ENTRIES);
    const [dbReady, setDbReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [fCategory, setFCategory] = useState<CPDCategory | ''>('');
    const [fStatus, setFStatus] = useState<CPDStatus | ''>('');
    const [fYear, setFYear] = useState(String(new Date().getFullYear()));
    const [fTerm, setFTerm] = useState('');
    const [fTeacher, setFTeacher] = useState('');
    const [sortKey, setSortKey] = useState('start_date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const [tab, setTab] = useState<'log' | 'analytics' | 'certificates'>('log');
    const [showModal, setShowModal] = useState(false);
    const [editEntry, setEditEntry] = useState<CPDEntry | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const emptyForm: Omit<CPDEntry, 'id' | 'created_at'> = {
        teacher_name: '', teacher_id: '', category: 'workshop', title: '', provider: '',
        description: '', cbc_focus_area: CBC_FOCUS_AREAS[0], learning_areas_covered: [],
        start_date: new Date().toISOString().slice(0, 10), end_date: '',
        hours: 8, cost: 0, certificate_no: '', impact_rating: 3,
        reflection: '', action_plan: '', status: 'planned',
        year: new Date().getFullYear(), term: 'Term 2',
    };
    const [form, setForm] = useState(emptyForm);

    // Toggle sort
    const toggleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
        setPage(1);
    };

    // Filter + sort
    const filtered = useMemo(() => {
        let rows = entries.filter(e =>
            (!search || `${e.teacher_name} ${e.title} ${e.provider} ${e.cbc_focus_area}`.toLowerCase().includes(search.toLowerCase()))
            && (!fCategory || e.category === fCategory)
            && (!fStatus || e.status === fStatus)
            && (!fYear || String(e.year) === fYear)
            && (!fTerm || e.term === fTerm)
            && (!fTeacher || e.teacher_name.toLowerCase().includes(fTeacher.toLowerCase()))
        );
        rows = [...rows].sort((a, b) => {
            let av: any = (a as any)[sortKey];
            let bv: any = (b as any)[sortKey];
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return rows;
    }, [entries, search, fCategory, fStatus, fYear, fTerm, fTeacher, sortKey, sortDir]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Stats
    const stats = useMemo(() => {
        const completed = entries.filter(e => e.status === 'completed');
        const totalHours = completed.reduce((a, b) => a + b.hours, 0);
        const totalCost = completed.reduce((a, b) => a + (b.cost || 0), 0);
        const avgImpact = completed.length ? (completed.reduce((a, b) => a + b.impact_rating, 0) / completed.length).toFixed(1) : '0';
        const certificates = entries.filter(e => e.certificate_no).length;
        const teachers = new Set(entries.map(e => e.teacher_name)).size;
        const planned = entries.filter(e => e.status === 'planned' || e.status === 'in_progress').length;
        return { total: entries.length, completed: completed.length, totalHours, totalCost, avgImpact, certificates, teachers, planned };
    }, [entries]);

    // Analytics
    const categoryStats = useMemo(() => {
        const map: Record<string, { hours: number; count: number; completed: number }> = {};
        entries.forEach(e => {
            if (!map[e.category]) map[e.category] = { hours: 0, count: 0, completed: 0 };
            map[e.category].count++;
            map[e.category].hours += e.hours;
            if (e.status === 'completed') map[e.category].completed++;
        });
        return Object.entries(map).map(([cat, d]) => ({ cat: cat as CPDCategory, ...d })).sort((a, b) => b.hours - a.hours);
    }, [entries]);

    const teacherStats = useMemo(() => {
        const map: Record<string, { hours: number; count: number; cost: number }> = {};
        entries.filter(e => e.status === 'completed').forEach(e => {
            if (!map[e.teacher_name]) map[e.teacher_name] = { hours: 0, count: 0, cost: 0 };
            map[e.teacher_name].hours += e.hours;
            map[e.teacher_name].count++;
            map[e.teacher_name].cost += e.cost || 0;
        });
        return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.hours - a.hours);
    }, [entries]);

    function saveEntry() {
        if (!form.teacher_name || !form.title) { toast.error('Teacher name and activity title required'); return; }
        if (editEntry) {
            setEntries(p => p.map(e => e.id === editEntry.id ? { ...e, ...form } : e));
            toast.success('CPD entry updated!');
        } else {
            const n: CPDEntry = { ...form, id: `cpd-${Date.now()}`, created_at: new Date().toISOString() };
            setEntries(p => [n, ...p]);
            toast.success('CPD activity logged!');
        }
        setShowModal(false); setEditEntry(null); setForm(emptyForm);
    }

    function deleteEntry(id: string) {
        if (!confirm('Delete this CPD record?')) return;
        setEntries(p => p.filter(e => e.id !== id));
        toast.success('Deleted');
    }

    function openEdit(e: CPDEntry) {
        setEditEntry(e);
        setForm({ teacher_name: e.teacher_name, teacher_id: e.teacher_id, category: e.category, title: e.title, provider: e.provider, description: e.description, cbc_focus_area: e.cbc_focus_area, learning_areas_covered: e.learning_areas_covered, start_date: e.start_date, end_date: e.end_date || '', hours: e.hours, cost: e.cost || 0, certificate_no: e.certificate_no || '', impact_rating: e.impact_rating, reflection: e.reflection || '', action_plan: e.action_plan || '', status: e.status, year: e.year, term: e.term || '' });
        setShowModal(true);
    }

    // ── Print ─────────────────────────────────────────────────────────────
    function handlePrint() {
        const printContent = document.getElementById('cpd-print-area');
        if (!printContent) return;
        const win = window.open('', '_blank', 'width=1200,height=800');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>CBC CPD Log — APSIMS</title>
        <style>
            @page { margin: 15mm; size: A4 landscape; }
            * { box-sizing: border-box; }
            body { font-family: 'Calibri', Arial, sans-serif; font-size: 9pt; color: #1e293b; margin: 0; }
            .print-header { background: #1e1b4b; color: white; padding: 12px 16px; margin-bottom: 12px; border-radius: 4px; }
            .print-header h1 { margin: 0; font-size: 18pt; font-weight: 800; }
            .print-header p { margin: 2px 0 0; font-size: 9pt; opacity: 0.8; }
            .kpi-row { display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; margin-bottom: 10px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; text-align: center; }
            .kpi-card .val { font-size: 14pt; font-weight: 800; color: #1e1b4b; }
            .kpi-card .lbl { font-size: 7pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; font-size: 8pt; }
            thead tr { background: #1e1b4b; color: white; }
            thead th { padding: 6px 8px; text-align: left; font-weight: 700; font-size: 8pt; }
            tbody tr:nth-child(even) { background: #f1f5f9; }
            tbody tr:nth-child(odd) { background: white; }
            tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 7pt; font-weight: 700; }
            .comp { font-weight: 800; font-size: 9pt; }
            .footer { margin-top: 10px; font-size: 7pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 6px; }
            tr { page-break-inside: avoid; }
        </style></head><body>
        <div class="print-header">
            <h1>📈 CBC Professional Development Log</h1>
            <p>APSIMS — Alpha Premier School Information Management System &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })} &nbsp;|&nbsp; ${filtered.length} records shown</p>
        </div>
        <div class="kpi-row">
            <div class="kpi-card"><div class="val">${stats.total}</div><div class="lbl">Total Activities</div></div>
            <div class="kpi-card"><div class="val">${stats.completed}</div><div class="lbl">Completed</div></div>
            <div class="kpi-card"><div class="val">${stats.totalHours}h</div><div class="lbl">CPD Hours</div></div>
            <div class="kpi-card"><div class="val">KES ${stats.totalCost.toLocaleString()}</div><div class="lbl">Total Cost</div></div>
            <div class="kpi-card"><div class="val">${stats.avgImpact}/5</div><div class="lbl">Avg Impact</div></div>
            <div class="kpi-card"><div class="val">${stats.certificates}</div><div class="lbl">Certificates</div></div>
        </div>
        <table>
            <thead><tr>
                <th>#</th><th>Teacher</th><th>Activity Title</th><th>Category</th>
                <th>CBC Focus Area</th><th>Provider</th><th>Dates</th>
                <th>Hours</th><th>Cost (KES)</th><th>Impact</th><th>Status</th><th>Certificate</th>
            </tr></thead>
            <tbody>
            ${filtered.map((e, i) => `<tr>
                <td style="text-align:center;font-weight:700">${i + 1}</td>
                <td style="font-weight:700">${e.teacher_name}</td>
                <td>${e.title}</td>
                <td><span class="badge" style="background:${CATEGORIES[e.category].bg};color:${CATEGORIES[e.category].color}">${CATEGORIES[e.category].icon} ${CATEGORIES[e.category].label}</span></td>
                <td style="font-size:7.5pt">${e.cbc_focus_area}</td>
                <td style="font-size:7.5pt">${e.provider}</td>
                <td style="font-size:7.5pt">${e.start_date}${e.end_date ? ' – ' + e.end_date : ''}</td>
                <td style="text-align:center;font-weight:700">${e.hours}h</td>
                <td style="text-align:right">${e.cost ? e.cost.toLocaleString() : '—'}</td>
                <td style="text-align:center"><span class="comp" style="color:${e.impact_rating >= 4 ? '#059669' : e.impact_rating >= 3 ? '#2563EB' : '#D97706'}">${e.impact_rating > 0 ? '★'.repeat(e.impact_rating) : '—'}</span></td>
                <td><span class="badge" style="background:${STATUS_INFO[e.status].bg};color:${STATUS_INFO[e.status].color}">${STATUS_INFO[e.status].label}</span></td>
                <td style="font-size:7pt;color:#6366f1">${e.certificate_no || '—'}</td>
            </tr>`).join('')}
            </tbody>
        </table>
        <div class="footer">APSIMS — Alpha Premier School Information Management System | CBC Professional Development Register | Confidential</div>
        </body></html>`);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 500);
    }

    // ── Premium ExcelJS Export (matches Vote-Heads pattern) ───────────────
    const exportExcel = async () => {
        const toastId = toast.loading('Generating premium Excel report...');
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            wb.creator = 'APSIMS'; wb.created = new Date();

            const today = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });

            const C = {
                NAVY: '0F2044', NAVY2: '1E3A5F', AMBER: 'F59E0B',
                INDIGO: '6366F1', GREEN: '10B981', RED: 'DC2626',
                PURPLE: '7C3AED', TEAL: '0891B2', ORANGE: 'D97706',
                SLATE: 'E2E8F0', ALT: 'EEF2FF', CREAM: 'FFFBEB',
                GREEN_LT: 'D1FAE5', BLUE_LT: 'DBEAFE', YEL_LT: 'FEF3C7',
                WHITE: 'FFFFFF', GRAY: '94A3B8',
            };

            const fill = (hex: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF' + hex } });
            const fnt  = (color: string, sz = 10, bold = false, italic = false) => ({ name: 'Calibri', color: { argb: 'FF' + color }, size: sz, bold, italic });
            const aln  = (h: any, v: any = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });
            const thin  = (c = 'CBD5E1') => ({ style: 'thin'   as const, color: { argb: 'FF' + c } });
            const thick = (c = '0F2044') => ({ style: 'medium' as const, color: { argb: 'FF' + c } });
            const bdrT  = () => ({ top: thin(), bottom: thin(), left: thin(), right: thin() });
            const bdrM  = () => ({ top: thick(), bottom: thick(), left: thick(), right: thick() });
            const sc = (cell: any, bg: string | undefined, fg: string, sz: number, bold: boolean, italic: boolean, ha: any, brd: 'T' | 'M' | undefined, val?: any, fmt?: string) => {
                if (val !== undefined) cell.value = val;
                if (bg) cell.fill = fill(bg);
                cell.font = fnt(fg, sz, bold, italic);
                cell.alignment = aln(ha);
                if (brd === 'T') cell.border = bdrT();
                if (brd === 'M') cell.border = bdrM();
                if (fmt) cell.numFmt = fmt;
            };

            // ══ SHEET 1: FULL CPD LOG ══════════════════════════════════════
            const ws1 = wb.addWorksheet('CBC CPD Log', {
                pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
                properties: { tabColor: { argb: 'FF' + C.INDIGO } },
            });
            ws1.columns = [
                { width: 5 }, { width: 22 }, { width: 32 }, { width: 16 }, { width: 26 },
                { width: 26 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 12 },
                { width: 12 }, { width: 16 },
            ];

            // Row 1 — Brand banner
            ws1.mergeCells('A1:L1'); ws1.getRow(1).height = 34;
            const r1 = ws1.getCell('A1');
            r1.value = 'APSIMS  •  ALPHA PREMIER SCHOOL INFORMATION MANAGEMENT SYSTEM';
            r1.fill = fill(C.NAVY); r1.font = fnt(C.WHITE, 16, true); r1.alignment = aln('center'); r1.border = bdrM();

            // Row 2 — Title
            ws1.mergeCells('A2:L2'); ws1.getRow(2).height = 42;
            const r2 = ws1.getCell('A2');
            r2.value = 'CBC PROFESSIONAL DEVELOPMENT LOG — TEACHER CPD REGISTER';
            r2.fill = fill(C.INDIGO); r2.font = fnt(C.WHITE, 22, true); r2.alignment = aln('center'); r2.border = bdrM();

            // Row 3 — Meta
            ws1.mergeCells('A3:L3'); ws1.getRow(3).height = 18;
            sc(ws1.getCell('A3'), C.SLATE, '475569', 9, false, true, 'center', 'T',
                `Generated: ${today}   |   Total Records: ${filtered.length}   |   Filters Applied: ${[fTeacher, fCategory, fStatus, fYear, fTerm].filter(Boolean).join(', ') || 'None'}`);

            ws1.getRow(4).height = 10;

            // KPI cards row 5-7
            const kpis = [
                { rngs: ['A5:B5','A6:B6','A7:B7'], col: C.INDIGO, lbl: 'TOTAL ACTIVITIES',    val: String(stats.total),                           sub: `${stats.completed} completed` },
                { rngs: ['C5:D5','C6:D6','C7:D7'], col: C.GREEN,  lbl: 'CPD HOURS EARNED',    val: `${stats.totalHours} Hours`,                    sub: `Completed activities` },
                { rngs: ['E5:F5','E6:F6','E7:F7'], col: C.AMBER,  lbl: 'TOTAL CPD COST',      val: `KES ${stats.totalCost.toLocaleString()}`,       sub: `School investment` },
                { rngs: ['G5:H5','G6:H6','G7:H7'], col: C.PURPLE, lbl: 'AVG IMPACT RATING',   val: `${stats.avgImpact} / 5`,                       sub: `Teacher self-assessment` },
                { rngs: ['I5:J5','I6:J6','I7:J7'], col: C.TEAL,   lbl: 'TEACHERS TRAINED',    val: String(stats.teachers),                         sub: `Unique participants` },
                { rngs: ['K5:L5','K6:L6','K7:L7'], col: C.GREEN,  lbl: 'CERTIFICATES EARNED', val: String(stats.certificates),                     sub: `Verified credentials` },
            ];
            ws1.getRow(5).height = 20; ws1.getRow(6).height = 40; ws1.getRow(7).height = 18;
            for (const k of kpis) {
                k.rngs.forEach(r => ws1.mergeCells(r));
                const [a0, a1, a2] = k.rngs.map(r => ws1.getCell(r.split(':')[0]));
                a0.value = k.lbl; a0.fill = fill(k.col); a0.font = fnt(C.WHITE, 9, true);  a0.alignment = aln('center'); a0.border = bdrM();
                a1.value = k.val; a1.fill = fill(k.col); a1.font = fnt(C.WHITE, 20, true); a1.alignment = aln('center'); a1.border = bdrM();
                a2.value = k.sub; a2.fill = fill(k.col); a2.font = fnt(C.WHITE, 9, false); a2.alignment = aln('center'); a2.border = bdrM();
            }

            ws1.getRow(8).height = 10;

            // Section label
            ws1.mergeCells('A9:L9'); ws1.getRow(9).height = 22;
            sc(ws1.getCell('A9'), C.CREAM, C.NAVY, 12, true, false, 'left', 'T', 'DETAILED CPD ACTIVITY LOG');

            // Table headers
            ws1.getRow(10).height = 26;
            ['#', 'Teacher Name', 'Activity Title', 'Category', 'CBC Focus Area',
             'Provider / Institution', 'Start Date', 'End Date', 'Hours', 'Cost (KES)',
             'Impact ★', 'Status'].forEach((h, i) => {
                const cell = ws1.getCell(10, i + 1);
                cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 9, true);
                cell.alignment = aln('center'); cell.border = bdrM();
            });

            let dr = 11;
            for (let i = 0; i < filtered.length; i++) {
                const e = filtered[i];
                const bg = i % 2 === 0 ? C.ALT : C.WHITE;
                const statusBg = e.status === 'completed' ? C.GREEN_LT : e.status === 'in_progress' ? C.BLUE_LT : e.status === 'planned' ? C.YEL_LT : 'FEE2E2';
                const statusFg = e.status === 'completed' ? '065F46' : e.status === 'in_progress' ? '1D4ED8' : e.status === 'planned' ? '92400E' : '991B1B';
                ws1.getRow(dr).height = 18;
                sc(ws1.getCell(dr, 1),  bg, C.NAVY,  10, true,  false, 'center', 'T', i + 1);
                sc(ws1.getCell(dr, 2),  bg, C.NAVY,  10, true,  false, 'left',   'T', e.teacher_name);
                sc(ws1.getCell(dr, 3),  bg, '334155',10, false, false, 'left',   'T', e.title);
                sc(ws1.getCell(dr, 4),  bg, C.INDIGO, 9, false, false, 'center', 'T', CATEGORIES[e.category].label);
                sc(ws1.getCell(dr, 5),  bg, '334155', 9, false, false, 'left',   'T', e.cbc_focus_area);
                sc(ws1.getCell(dr, 6),  bg, '475569', 9, false, true,  'left',   'T', e.provider);
                sc(ws1.getCell(dr, 7),  bg, C.NAVY,  10, false, false, 'center', 'T', e.start_date);
                sc(ws1.getCell(dr, 8),  bg, '475569', 9, false, false, 'center', 'T', e.end_date || '—');
                sc(ws1.getCell(dr, 9),  bg, C.NAVY,  10, true,  false, 'center', 'T', e.hours, '0');
                sc(ws1.getCell(dr, 10), bg, C.NAVY,  10, false, false, 'right',  'T', e.cost || 0, '#,##0');
                sc(ws1.getCell(dr, 11), bg, e.impact_rating >= 4 ? '059669' : e.impact_rating >= 3 ? '2563EB' : 'D97706', 10, true, false, 'center', 'T', e.impact_rating > 0 ? '★'.repeat(e.impact_rating) + ` (${e.impact_rating}/5)` : '—');
                sc(ws1.getCell(dr, 12), statusBg, statusFg, 9, true, false, 'center', 'T', STATUS_INFO[e.status].label);
                dr++;
            }

            // Totals row
            ws1.mergeCells(`A${dr}:H${dr}`); ws1.getRow(dr).height = 24;
            for (let c = 1; c <= 8; c++) { ws1.getCell(dr, c).fill = fill(C.NAVY); ws1.getCell(dr, c).border = bdrM(); }
            sc(ws1.getCell(dr, 8), C.NAVY, C.WHITE, 11, true, false, 'right', 'M', 'TOTALS →');
            sc(ws1.getCell(dr, 9),  C.NAVY, C.AMBER, 13, true, false, 'center', 'M', stats.totalHours, '0"h"');
            sc(ws1.getCell(dr, 10), C.NAVY, C.AMBER, 13, true, false, 'right',  'M', stats.totalCost, '#,##0');
            sc(ws1.getCell(dr, 11), C.NAVY, C.WHITE, 10, false,false, 'center', 'M', `Avg: ${stats.avgImpact}/5`);
            sc(ws1.getCell(dr, 12), C.NAVY, C.WHITE, 10, true, false, 'center', 'M', `${filtered.length} activities`);
            dr += 2;

            // ══ SHEET 2: TEACHER SUMMARY ════════════════════════════════════
            const ws2 = wb.addWorksheet('Teacher Summary', { properties: { tabColor: { argb: 'FF' + C.GREEN } } });
            ws2.columns = [{ width: 5 }, { width: 28 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 16 }];

            ws2.mergeCells('A1:F1'); ws2.getRow(1).height = 32;
            const s2h = ws2.getCell('A1');
            s2h.value = 'APSIMS — CPD TEACHER SUMMARY REPORT';
            s2h.fill = fill(C.NAVY); s2h.font = fnt(C.WHITE, 16, true); s2h.alignment = aln('center'); s2h.border = bdrM();

            ws2.mergeCells('A2:F2'); ws2.getRow(2).height = 16;
            sc(ws2.getCell('A2'), C.SLATE, '475569', 9, false, true, 'center', 'T', `Completed Activities Only   |   Generated: ${today}`);

            ws2.getRow(3).height = 10;
            ws2.getRow(4).height = 24;
            ['#', 'Teacher Name', 'Activities (Done)', 'Total Hours', 'Total Cost (KES)', 'Avg Impact'].forEach((h, i) => {
                const cell = ws2.getCell(4, i + 1);
                cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 10, true);
                cell.alignment = aln('center'); cell.border = bdrM();
            });

            let t2r = 5;
            teacherStats.forEach((t, i) => {
                const bg = i % 2 === 0 ? C.ALT : C.WHITE;
                ws2.getRow(t2r).height = 18;
                sc(ws2.getCell(t2r, 1), bg, C.NAVY,   10, true,  false, 'center', 'T', i + 1);
                sc(ws2.getCell(t2r, 2), bg, C.NAVY,   10, true,  false, 'left',   'T', t.name);
                sc(ws2.getCell(t2r, 3), bg, C.INDIGO, 10, false, false, 'center', 'T', t.count);
                sc(ws2.getCell(t2r, 4), bg, C.GREEN,  10, true,  false, 'center', 'T', t.hours, '0"h"');
                sc(ws2.getCell(t2r, 5), bg, C.NAVY,   10, false, false, 'right',  'T', t.cost, '#,##0');
                sc(ws2.getCell(t2r, 6), bg, C.AMBER,   9, false, false, 'center', 'T', '—');
                t2r++;
            });
            ws2.mergeCells(`A${t2r}:B${t2r}`); ws2.getRow(t2r).height = 24;
            for (let c = 1; c <= 2; c++) { ws2.getCell(t2r, c).fill = fill(C.NAVY); ws2.getCell(t2r, c).border = bdrM(); }
            sc(ws2.getCell(t2r, 2), C.NAVY, C.WHITE, 11, true, false, 'right', 'M', 'TOTALS');
            sc(ws2.getCell(t2r, 3), C.NAVY, C.AMBER, 13, true, false, 'center', 'M', stats.completed);
            sc(ws2.getCell(t2r, 4), C.NAVY, C.AMBER, 13, true, false, 'center', 'M', stats.totalHours, '0"h"');
            sc(ws2.getCell(t2r, 5), C.NAVY, C.AMBER, 13, true, false, 'right',  'M', stats.totalCost, '#,##0');
            sc(ws2.getCell(t2r, 6), C.NAVY, C.WHITE, 10, true, false, 'center', 'M', `${stats.avgImpact}/5`);

            // ══ SHEET 3: CATEGORY BREAKDOWN ═════════════════════════════════
            const ws3 = wb.addWorksheet('Category Breakdown', { properties: { tabColor: { argb: 'FF' + C.AMBER } } });
            ws3.columns = [{ width: 5 }, { width: 22 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 20 }];

            ws3.mergeCells('A1:F1'); ws3.getRow(1).height = 32;
            const s3h = ws3.getCell('A1');
            s3h.value = 'APSIMS — CPD CATEGORY BREAKDOWN';
            s3h.fill = fill(C.NAVY); s3h.font = fnt(C.WHITE, 16, true); s3h.alignment = aln('center'); s3h.border = bdrM();

            ws3.getRow(2).height = 16;
            sc(ws3.getCell('A2'), C.SLATE, '475569', 9, false, true, 'center', 'T', today);
            ws3.mergeCells('A2:F2');

            ws3.getRow(3).height = 10;
            ws3.getRow(4).height = 24;
            ['#', 'Category', 'Total Activities', 'Completed', 'Total Hours', '% of Total Hours'].forEach((h, i) => {
                const cell = ws3.getCell(4, i + 1);
                cell.value = h; cell.fill = fill(C.NAVY2); cell.font = fnt(C.WHITE, 10, true);
                cell.alignment = aln('center'); cell.border = bdrM();
            });

            let c3r = 5;
            const maxH = Math.max(...categoryStats.map(c => c.hours), 1);
            categoryStats.forEach((c, i) => {
                const bg = i % 2 === 0 ? C.ALT : C.WHITE;
                const pct = stats.totalHours > 0 ? (c.hours / stats.totalHours * 100).toFixed(1) : '0.0';
                const bars = '█'.repeat(Math.round(c.hours / maxH * 15)) + '░'.repeat(15 - Math.round(c.hours / maxH * 15));
                ws3.getRow(c3r).height = 18;
                sc(ws3.getCell(c3r, 1), bg, C.NAVY,   10, true,  false, 'center', 'T', i + 1);
                sc(ws3.getCell(c3r, 2), bg, C.NAVY,   10, true,  false, 'left',   'T', `${CATEGORIES[c.cat].icon} ${CATEGORIES[c.cat].label}`);
                sc(ws3.getCell(c3r, 3), bg, C.INDIGO, 10, false, false, 'center', 'T', c.count);
                sc(ws3.getCell(c3r, 4), bg, C.GREEN,  10, false, false, 'center', 'T', c.completed);
                sc(ws3.getCell(c3r, 5), bg, C.NAVY,   10, true,  false, 'center', 'T', c.hours, '0"h"');
                sc(ws3.getCell(c3r, 6), bg, C.AMBER,   9, true,  false, 'left',   'T', `${bars}  ${pct}%`);
                c3r++;
            });

            // Footer
            ws3.mergeCells(`A${c3r + 1}:F${c3r + 1}`);
            sc(ws3.getCell(`A${c3r + 1}`), undefined, C.GRAY, 8, false, true, 'left', undefined,
                'Report generated by APSIMS — Alpha Premier School Information Management System. For official use only. Confidential.');

            // Download
            const buffer = await wb.xlsx.writeBuffer();
            const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link   = document.createElement('a');
            link.href    = URL.createObjectURL(blob);
            link.download = `APSIMS_CBC_CPD_Log_${fYear || 'All'}.xlsx`;
            link.click();
            toast.dismiss(toastId);
            toast.success('✅ Premium Excel CPD report exported — 3 worksheets!');
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error('Export failed: ' + err.message);
        }
    };

    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(135deg,#f5f3ff 0%,#eff6ff 50%,#f0fdf4 100%)' }}>
            <Toaster position="top-right" />

            {/* ═══ HERO HEADER ═══ */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#4c1d95 40%,#065f46 100%)' }} className="px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-purple-300 text-xs mb-4">
                        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                        <FiChevronRight size={12} />
                        <Link href="/dashboard/staff" className="hover:text-white transition-colors">Staff</Link>
                        <FiChevronRight size={12} />
                        <span className="text-white font-medium">📈 CBC Professional Development Log</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <span className="text-4xl">📈</span> CBC Teacher Professional Development Log
                            </h1>
                            <p className="text-purple-200 text-sm max-w-2xl">Track every workshop, training, conference & CPD activity — build Kenya's strongest CBC-ready teaching team</p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={handlePrint}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
                                <FiPrinter size={15} /> Print
                            </button>
                            <button onClick={exportExcel}
                                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all">
                                <FiDownload size={15} /> Export Excel
                            </button>
                            <button onClick={() => { setForm(emptyForm); setEditEntry(null); setShowModal(true); }}
                                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg transition-all">
                                <FiPlus size={15} /> Log CPD Activity
                            </button>
                        </div>
                    </div>

                    {/* KPI Bar */}
                    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mt-6">
                        {[
                            { label: 'Total Activities', value: stats.total,                    icon: '📋', color: 'text-purple-200' },
                            { label: 'Completed',        value: stats.completed,                icon: '✅', color: 'text-emerald-300' },
                            { label: 'In Progress',      value: stats.planned,                  icon: '🔄', color: 'text-blue-300' },
                            { label: 'CPD Hours',        value: `${stats.totalHours}h`,         icon: '⏱️', color: 'text-yellow-300' },
                            { label: 'Total Cost',       value: `KES ${stats.totalCost.toLocaleString()}`, icon: '💰', color: 'text-orange-300' },
                            { label: 'Avg Impact',       value: `${stats.avgImpact}/5`,         icon: '⭐', color: 'text-amber-300' },
                            { label: 'Teachers',         value: stats.teachers,                 icon: '👩‍🏫', color: 'text-teal-300' },
                            { label: 'Certificates',     value: stats.certificates,             icon: '🏆', color: 'text-green-300' },
                        ].map(k => (
                            <div key={k.label} className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center border border-white/10">
                                <div className="text-lg mb-0.5">{k.icon}</div>
                                <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
                                <div className="text-purple-300 text-[9px] leading-tight">{k.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 space-y-5">
                {/* Tabs */}
                <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
                    {[
                        { key: 'log',          label: '📋 CPD Log' },
                        { key: 'analytics',    label: '📊 Analytics' },
                        { key: 'certificates', label: '🏆 Certificates' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ═══ LOG TAB ═══ */}
                {tab === 'log' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                <div className="relative col-span-2">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        placeholder="Search teacher, title, provider, focus area..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <input value={fTeacher} onChange={e => { setFTeacher(e.target.value); setPage(1); }}
                                    placeholder="Filter by teacher..." className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
                                <select value={fCategory} onChange={e => { setFCategory(e.target.value as any); setPage(1); }}
                                    className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">All Categories</option>
                                    {(Object.keys(CATEGORIES) as CPDCategory[]).map(k => <option key={k} value={k}>{CATEGORIES[k].icon} {CATEGORIES[k].label}</option>)}
                                </select>
                                <select value={fStatus} onChange={e => { setFStatus(e.target.value as any); setPage(1); }}
                                    className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                                    <option value="">All Statuses</option>
                                    {(Object.keys(STATUS_INFO) as CPDStatus[]).map(k => <option key={k} value={k}>{STATUS_INFO[k].label}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <select value={fTerm} onChange={e => { setFTerm(e.target.value); setPage(1); }}
                                        className="flex-1 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="">All Terms</option>
                                        {['Term 1','Term 2','Term 3'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                    <select value={fYear} onChange={e => { setFYear(e.target.value); setPage(1); }}
                                        className="flex-1 border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                                        {['2025','2024','2023'].map(y => <option key={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                                <span><strong className="text-purple-700">{filtered.length}</strong> records found • Page {page} of {totalPages || 1}</span>
                                <button onClick={() => { setSearch(''); setFCategory(''); setFStatus(''); setFTeacher(''); setFTerm(''); setPage(1); }}
                                    className="flex items-center gap-1 text-gray-400 hover:text-purple-600 transition-colors">
                                    <FiRefreshCw size={11} /> Clear Filters
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div id="cpd-print-area" className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white">
                                        <tr>
                                            {[
                                                { key:'#',            label:'#',              w:'w-10' },
                                                { key:'teacher_name', label:'Teacher',         w:'w-36' },
                                                { key:'title',        label:'Activity Title',  w:'w-56' },
                                                { key:'category',     label:'Category',        w:'w-28' },
                                                { key:'cbc_focus_area',label:'CBC Focus Area', w:'w-44' },
                                                { key:'start_date',   label:'Date',            w:'w-24' },
                                                { key:'hours',        label:'Hours',           w:'w-16' },
                                                { key:'impact_rating',label:'Impact',          w:'w-20' },
                                                { key:'status',       label:'Status',          w:'w-24' },
                                                { key:'actions',      label:'',                w:'w-20' },
                                            ].map(col => (
                                                <th key={col.key}
                                                    className={`text-left px-3 py-3 text-xs font-semibold ${col.key !== 'actions' && col.key !== '#' ? 'cursor-pointer hover:bg-white/10 select-none' : ''} ${col.w}`}
                                                    onClick={() => col.key !== 'actions' && col.key !== '#' && toggleSort(col.key)}>
                                                    <div className="flex items-center gap-0.5">
                                                        {col.label}
                                                        {col.key !== 'actions' && col.key !== '#' && <SortIcon field={col.key} sortKey={sortKey} sortDir={sortDir} />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paged.length === 0 ? (
                                            <tr><td colSpan={10} className="text-center py-20 text-gray-400">
                                                <div className="text-4xl mb-2">📋</div>
                                                <div className="font-medium">No CPD records found</div>
                                                <div className="text-xs mt-1">Log your first professional development activity above</div>
                                            </td></tr>
                                        ) : paged.map((e, i) => {
                                            const cat = CATEGORIES[e.category];
                                            const st = STATUS_INFO[e.status];
                                            const isExpanded = expandedId === e.id;
                                            const rowIdx = (page - 1) * PAGE_SIZE + i;
                                            return (
                                                <>
                                                <tr key={e.id}
                                                    className={`border-b border-gray-100 transition-colors ${isExpanded ? 'bg-purple-50' : rowIdx % 2 === 0 ? 'bg-white hover:bg-purple-50/30' : 'bg-slate-50/50 hover:bg-purple-50/30'}`}>
                                                    <td className="px-3 py-3 text-xs font-bold text-gray-500 text-center">{rowIdx + 1}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                {e.teacher_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-800 leading-tight">{e.teacher_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <p className="text-xs font-semibold text-gray-900 leading-tight">{e.title}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{e.provider}</p>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="text-[10px] px-2 py-1 rounded-full font-semibold" style={{ background: cat.bg, color: cat.color }}>
                                                            {cat.icon} {cat.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-[10px] text-gray-600 max-w-[160px]">
                                                        <span className="line-clamp-2">{e.cbc_focus_area}</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-[11px] text-gray-600 whitespace-nowrap">
                                                        {fmtDate(e.start_date)}
                                                        {e.end_date && <><br /><span className="text-gray-400">→ {fmtDate(e.end_date)}</span></>}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className="text-sm font-bold text-indigo-700">{e.hours}h</span>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {e.impact_rating > 0 ? (
                                                            <div>
                                                                <div className="text-amber-500 text-xs">{'★'.repeat(e.impact_rating)}{'☆'.repeat(5 - e.impact_rating)}</div>
                                                                <div className="text-[9px] text-gray-400">{e.impact_rating}/5</div>
                                                            </div>
                                                        ) : <span className="text-gray-300 text-xs">—</span>}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="text-[10px] px-2 py-1 rounded-full font-semibold" style={{ background: st.bg, color: st.color }}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex gap-1 items-center">
                                                            <button onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                title="Expand details">
                                                                {isExpanded ? <FiChevronUp size={12}/> : <FiChevronDown size={12}/>}
                                                            </button>
                                                            <button onClick={() => openEdit(e)}
                                                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                                <FiEdit2 size={12}/>
                                                            </button>
                                                            <button onClick={() => deleteEntry(e.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                                <FiTrash2 size={12}/>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {/* Expanded Detail Row */}
                                                {isExpanded && (
                                                    <tr key={`${e.id}-exp`} className="bg-purple-50 border-b border-purple-100">
                                                        <td colSpan={10} className="px-4 py-4">
                                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                                {e.description && (
                                                                    <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                                                                        <p className="text-[10px] font-bold text-purple-700 uppercase mb-1.5">📝 Description</p>
                                                                        <p className="text-xs text-gray-700 leading-relaxed">{e.description}</p>
                                                                    </div>
                                                                )}
                                                                {e.reflection && (
                                                                    <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                                                                        <p className="text-[10px] font-bold text-blue-700 uppercase mb-1.5">💭 Teacher Reflection</p>
                                                                        <p className="text-xs text-gray-700 leading-relaxed">{e.reflection}</p>
                                                                    </div>
                                                                )}
                                                                {e.action_plan && (
                                                                    <div className="bg-white rounded-lg p-3 border border-emerald-100 shadow-sm">
                                                                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1.5">🎯 Action Plan</p>
                                                                        <p className="text-xs text-gray-700 leading-relaxed">{e.action_plan}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-4 mt-3 text-[10px] text-gray-500">
                                                                {e.certificate_no && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-indigo-100 text-indigo-700 font-mono">🏆 Cert: {e.certificate_no}</span>}
                                                                {e.cost && e.cost > 0 && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-100 text-amber-700">💰 Cost: KES {e.cost.toLocaleString()}</span>}
                                                                {e.learning_areas_covered.length > 0 && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-green-100 text-green-700">📚 Areas: {e.learning_areas_covered.join(', ')}</span>}
                                                                {e.term && <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-100 text-gray-600">📅 {e.term} {e.year}</span>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Ultra Pagination */}
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                                <UltraPagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ ANALYTICS TAB ═══ */}
                {tab === 'analytics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Category breakdown */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiBarChart2 className="text-purple-600"/> CPD Hours by Category
                            </h2>
                            <div className="space-y-3">
                                {categoryStats.map(c => {
                                    const cat = CATEGORIES[c.cat];
                                    const pct = stats.totalHours > 0 ? (c.hours / stats.totalHours * 100) : 0;
                                    return (
                                        <div key={c.cat}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-medium text-gray-700 flex items-center gap-1">{cat.icon} {cat.label}</span>
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <span>{c.count} activities</span>
                                                    <span className="font-bold" style={{ color: cat.color }}>{c.hours}h ({pct.toFixed(0)}%)</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cat.color }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400 w-10 text-right">{c.completed}/{c.count} done</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Teacher leaderboard */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiAward className="text-amber-500"/> Teacher CPD Leaderboard (Completed)
                            </h2>
                            <div className="space-y-2">
                                {teacherStats.slice(0, 8).map((t, i) => (
                                    <div key={t.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 border border-gray-100">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p>
                                            <p className="text-[10px] text-gray-400">{t.count} activities</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-purple-700">{t.hours}h</div>
                                            {t.cost > 0 && <div className="text-[9px] text-gray-400">KES {t.cost.toLocaleString()}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status pie */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiActivity className="text-purple-600"/> Activities by Status
                            </h2>
                            {(Object.keys(STATUS_INFO) as CPDStatus[]).map(k => {
                                const cnt = entries.filter(e => e.status === k).length;
                                const pct = entries.length ? (cnt / entries.length * 100) : 0;
                                const s = STATUS_INFO[k];
                                return (
                                    <div key={k} className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-gray-700">{s.label}</span>
                                            <span className="font-bold" style={{ color: s.color }}>{cnt} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div className="bg-gray-100 rounded-full h-2.5">
                                            <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Quick links */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-5">
                            <h2 className="font-bold text-gray-800 mb-3 text-sm">🔗 Quick Links — CBC Teacher Tools</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { href: '/dashboard/staff/cbc-observation-log', label: 'Teacher Observation Log', icon: '👁️' },
                                    { href: '/dashboard/exams/cbc-formative', label: 'Formative Tracker', icon: '📅' },
                                    { href: '/dashboard/exams/sba-manager', label: 'SBA Manager', icon: '📋' },
                                    { href: '/dashboard/hr-payroll/staff', label: 'Staff Directory', icon: '👥' },
                                    { href: '/dashboard/settings/cbc-config', label: 'CBC Config Builder', icon: '⚙️' },
                                    { href: '/dashboard/communication/cbc-templates', label: 'CBC SMS Templates', icon: '📲' },
                                ].map(l => (
                                    <Link key={l.href} href={l.href}
                                        className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-700 border border-purple-100 transition-all shadow-sm">
                                        <span>{l.icon}</span> {l.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ CERTIFICATES TAB ═══ */}
                {tab === 'certificates' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <FiAward className="text-amber-500"/> Certificate Register ({entries.filter(e => e.certificate_no).length} certificates)
                            </h2>
                            <button onClick={handlePrint}
                                className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                                <FiPrinter size={12}/> Print Certificate List
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-amber-700 to-orange-700 text-white">
                                    <tr>
                                        {['#','Teacher','Activity Title','Category','Provider','Certificate No.','Date Completed','Hours'].map(h => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.filter(e => e.certificate_no).map((e, i) => {
                                        const cat = CATEGORIES[e.category];
                                        return (
                                            <tr key={e.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'} hover:bg-amber-50/50 transition-colors`}>
                                                <td className="px-4 py-3 text-xs font-bold text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-3 font-semibold text-gray-800 text-xs">{e.teacher_name}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px]">
                                                    <p className="font-medium leading-tight">{e.title}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: cat.bg, color: cat.color }}>
                                                        {cat.icon} {cat.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500 italic">{e.provider}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                                        🏆 {e.certificate_no}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(e.end_date || e.start_date)}</td>
                                                <td className="px-4 py-3 text-center text-sm font-bold text-purple-700">{e.hours}h</td>
                                            </tr>
                                        );
                                    })}
                                    {entries.filter(e => e.certificate_no).length === 0 && (
                                        <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                                            <div className="text-4xl mb-2">🏆</div>
                                            <p>No certificates recorded yet. Add certificate numbers when logging activities.</p>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ LOG CPD MODAL ═══ */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="text-xl">📈</span> {editEntry ? 'Edit' : 'Log New'} CPD Activity
                            </h2>
                            <button onClick={() => { setShowModal(false); setEditEntry(null); setForm(emptyForm); }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher Name *</label>
                                    <input value={form.teacher_name} onChange={e => setForm(p=>({...p,teacher_name:e.target.value}))}
                                        placeholder="e.g. Ms. Akinyi Odhiambo"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                                    <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value as CPDCategory}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                        {(Object.keys(CATEGORIES) as CPDCategory[]).map(k => <option key={k} value={k}>{CATEGORIES[k].icon} {CATEGORIES[k].label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Activity Title *</label>
                                <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
                                    placeholder="e.g. CBC Competency-Based Assessment Masterclass"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Provider / Institution *</label>
                                <input value={form.provider} onChange={e => setForm(p=>({...p,provider:e.target.value}))}
                                    placeholder="e.g. Kenya Institute of Curriculum Development (KICD)"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">CBC Focus Area *</label>
                                <select value={form.cbc_focus_area} onChange={e => setForm(p=>({...p,cbc_focus_area:e.target.value}))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                    {CBC_FOCUS_AREAS.map(a => <option key={a}>{a}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date *</label>
                                    <input type="date" value={form.start_date} onChange={e => setForm(p=>({...p,start_date:e.target.value}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm(p=>({...p,end_date:e.target.value}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">CPD Hours *</label>
                                    <input type="number" min={0.5} step={0.5} value={form.hours} onChange={e => setForm(p=>({...p,hours:Number(e.target.value)}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cost (KES)</label>
                                    <input type="number" min={0} value={form.cost} onChange={e => setForm(p=>({...p,cost:Number(e.target.value)}))}
                                        placeholder="0 if free"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Certificate Number</label>
                                    <input value={form.certificate_no} onChange={e => setForm(p=>({...p,certificate_no:e.target.value}))}
                                        placeholder="e.g. KICD/CPD/2025/0147"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                                    <select value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value as CPDStatus}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                        {(Object.keys(STATUS_INFO) as CPDStatus[]).map(k => <option key={k} value={k}>{STATUS_INFO[k].label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Term</label>
                                    <select value={form.term} onChange={e => setForm(p=>({...p,term:e.target.value}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                        <option value="">Select Term</option>
                                        {['Term 1','Term 2','Term 3'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                                    <select value={form.year} onChange={e => setForm(p=>({...p,year:Number(e.target.value)}))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                        {[2025,2024,2023].map(y => <option key={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                                    rows={2} placeholder="Brief description of what this CPD activity covered..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Impact Rating (1–5 stars)</label>
                                <div className="flex gap-2">
                                    {[1,2,3,4,5].map(n => (
                                        <button key={n} type="button"
                                            onClick={() => setForm(p=>({...p,impact_rating:n as any}))}
                                            className={`w-10 h-10 rounded-xl text-lg transition-all ${n <= form.impact_rating ? 'bg-amber-400 text-white shadow' : 'bg-gray-100 text-gray-300 hover:bg-amber-100'}`}>
                                            ★
                                        </button>
                                    ))}
                                    <span className="ml-2 text-xs text-gray-500 self-center">{form.impact_rating}/5 — {['','Very Low','Low','Moderate','High','Transformational'][form.impact_rating]}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">💭 Teacher Reflection (What did you learn? How will it change your practice?)</label>
                                <textarea value={form.reflection} onChange={e => setForm(p=>({...p,reflection:e.target.value}))}
                                    rows={3} placeholder="Reflect on what you learned and how it will impact your CBC teaching..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">🎯 Action Plan (What will you do differently? By when?)</label>
                                <textarea value={form.action_plan} onChange={e => setForm(p=>({...p,action_plan:e.target.value}))}
                                    rows={3} placeholder="Specific actions you will take to apply this learning in your classroom..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                            <button onClick={() => { setShowModal(false); setEditEntry(null); setForm(emptyForm); }}
                                className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                            <button onClick={saveEntry}
                                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-purple-900/20">
                                <FiSave size={14}/> {editEntry ? 'Update CPD Entry' : 'Save CPD Activity'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
