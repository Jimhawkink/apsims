'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    FiUser, FiSearch, FiPrinter, FiMail, FiPhone, FiMapPin, FiCalendar,
    FiBookOpen, FiAward, FiFileText, FiHeart, FiShield, FiTrendingUp,
    FiActivity, FiDollarSign, FiAlertTriangle, FiCheckCircle, FiClock,
    FiEdit2, FiDownload, FiRefreshCw, FiFilter, FiGrid, FiList,
    FiChevronDown, FiChevronUp, FiStar, FiInfo, FiEye, FiHome, FiBell,
    FiBarChart2, FiUsers, FiLayers, FiZap, FiX, FiMoreVertical,
    FiArrowUp, FiArrowDown, FiMinus, FiChevronRight, FiGlobe, FiFlag
} from 'react-icons/fi';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale
} from 'chart.js';
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2';
import EmergencyContactsSection from '@/components/EmergencyContactsSection';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale
);

/* ─────────── TYPES ─────────── */
interface Student {
    id: number; admission_number: string; admission_no?: string;
    first_name: string; last_name: string; other_name?: string; middle_name?: string;
    gender: string; date_of_birth?: string; form_id?: number; stream_id?: number;
    status: string; guardian_name?: string; guardian_phone?: string;
    guardian_email?: string; guardian_relationship?: string; guardian_id_no?: string;
    guardian_occupation?: string; emergency_contact_name?: string;
    emergency_contact_phone?: string; county?: string; sub_county?: string;
    photo_url?: string; medical_info?: string; special_needs?: string;
    nemis_no?: string; religion?: string; blood_group?: string;
    nationality?: string; previous_school?: string; kcpe_marks?: number;
    admission_date?: string; card_status?: string;
    promotion_eligible?: string; village?: string;
}

type TabKey = 'overview' | 'academic' | 'financial' | 'discipline' | 'guardian' | 'health' | 'attendance' | 'activity';

/* ─────────── HELPERS ─────────── */
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const calcAge = (dob?: string) => {
    if (!dob) return '—';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs';
};

const GRADE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    'A': { bg: '#dcfce7', text: '#15803d', ring: '#22c55e' },
    'A-': { bg: '#dcfce7', text: '#16a34a', ring: '#4ade80' },
    'B+': { bg: '#dbeafe', text: '#1d4ed8', ring: '#3b82f6' },
    'B': { bg: '#dbeafe', text: '#2563eb', ring: '#60a5fa' },
    'B-': { bg: '#ede9fe', text: '#6d28d9', ring: '#8b5cf6' },
    'C+': { bg: '#ede9fe', text: '#7c3aed', ring: '#a78bfa' },
    'C': { bg: '#fef3c7', text: '#d97706', ring: '#f59e0b' },
    'C-': { bg: '#fef3c7', text: '#b45309', ring: '#fbbf24' },
    'D+': { bg: '#ffedd5', text: '#c2410c', ring: '#f97316' },
    'D': { bg: '#fee2e2', text: '#dc2626', ring: '#ef4444' },
    'D-': { bg: '#fee2e2', text: '#b91c1c', ring: '#f87171' },
    'E': { bg: '#fecaca', text: '#991b1b', ring: '#dc2626' },
};

const TERM_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

/* ─────────── STAT CARD ─────────── */
function StatCard({ icon, label, value, sub, color = '#6366f1', trend }: {
    icon: React.ReactNode; label: string; value: string | number;
    sub?: string; color?: string; trend?: 'up' | 'down' | 'flat';
}) {
    return (
        <div style={{
            background: '#fff', borderRadius: 16, padding: '18px 20px',
            border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <div style={{
                position: 'absolute', top: 0, right: 0, width: 80, height: 80,
                background: color + '12', borderRadius: '0 16px 0 80px'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10, background: color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: color, fontSize: 17
                }}>{icon}</div>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                {trend === 'up' && <FiArrowUp size={10} color="#22c55e" />}
                {trend === 'down' && <FiArrowDown size={10} color="#ef4444" />}
                {trend === 'flat' && <FiMinus size={10} color="#94a3b8" />}
                {sub}
            </div>}
        </div>
    );
}

/* ─────────── INFO ROW ─────────── */
function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 160, flexShrink: 0 }}>
                {icon && <span style={{ color: '#cbd5e1', fontSize: 13 }}>{icon}</span>}
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em' }}>{label}</span>
            </div>
            <span style={{ fontSize: 13, color: '#334155', fontWeight: 500, flex: 1 }}>{value || '—'}</span>
        </div>
    );
}

/* ─────────── BADGE ─────────── */
function Badge({ label, color = '#6366f1' }: { label: string; color?: string }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
            background: color + '15', color: color, borderRadius: 99,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.03em'
        }}>{label}</span>
    );
}

/* ─────────── SECTION TITLE ─────────── */
function SectionTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#6366f1', fontSize: 16 }}>{icon}</span>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h3>
            </div>
            {action}
        </div>
    );
}

/* ─────────── TIMELINE EVENT ─────────── */
function TimelineEvent({ title, sub, date, color = '#6366f1', icon }: {
    title: string; sub?: string; date?: string; color?: string; icon?: React.ReactNode;
}) {
    return (
        <div style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 10, background: color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: color, fontSize: 14
                }}>{icon}</div>
                <div style={{ flex: 1, width: 1, background: '#f1f5f9', minHeight: 16 }} />
            </div>
            <div style={{ flex: 1, paddingBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{title}</div>
                {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
                {date && <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4, fontFamily: 'monospace' }}>{date}</div>}
            </div>
        </div>
    );
}

/* ─────────── EMPTY STATE ─────────── */
function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', color: '#cbd5e1' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{msg}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function StudentProfilePage() {
    /* ── State ── */
    const [students, setStudents] = useState<Student[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [grading, setGrading] = useState<any[]>([]);
    const [fees, setFees] = useState<any[]>([]);
    const [feeStructures, setFeeStructures] = useState<any[]>([]);
    const [discipline, setDiscipline] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [health, setHealth] = useState<any | null>(null);
    const [examTypes, setExamTypes] = useState<any[]>([]);
    const [rankings, setRankings] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [clubMembers, setClubMembers] = useState<any[]>([]);
    const [demandLetters, setDemandLetters] = useState<any[]>([]);
    const [leaveOuts, setLeaveOuts] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selStudent, setSelStudent] = useState<Student | null>(null);
    const [tab, setTab] = useState<TabKey>('overview');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [showFilters, setShowFilters] = useState(false);
    const [printMode, setPrintMode] = useState(false);
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [expandedSubject, setExpandedSubject] = useState<number | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);

    /* ── Fetch ── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, f, st, m, g, fe, fs, d, a, t, et, r, cl, cm, dl, lo, hr] = await Promise.all([
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_exam_marks').select('*'),
            supabase.from('school_grading_system').select('*').order('min_score', { ascending: false }),
            supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('school_fee_structures').select('*'),
            supabase.from('school_discipline_records').select('*').order('incident_date', { ascending: false }),
            supabase.from('school_daily_attendance').select('*'),
            supabase.from('school_terms').select('*').order('year', { ascending: false }),
            supabase.from('school_exam_types').select('*'),
            supabase.from('school_student_rankings').select('*'),
            supabase.from('school_clubs').select('*'),
            supabase.from('school_club_members').select('*'),
            supabase.from('school_demand_letters').select('*').order('created_at', { ascending: false }),
            supabase.from('school_leave_outs').select('*').order('time_left', { ascending: false }),
            supabase.from('school_health_records').select('*'),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);
        setMarks(m.data || []);
        setGrading(g.data || []);
        setFees(fe.data || []);
        setFeeStructures(fs.data || []);
        setDiscipline(d.data || []);
        setAttendance(a.data || []);
        setTerms(t.data || []);
        setExamTypes(et.data || []);
        setRankings(r.data || []);
        setClubs(cl.data || []);
        setClubMembers(cm.data || []);
        setDemandLetters(dl.data || []);
        setLeaveOuts(lo.data || []);
        const allHealth = hr.data || [];
        if (allHealth.length) setHealth(allHealth[0]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── Derived ── */
    const getFormName = (id?: number) => id ? forms.find(f => f.id === id)?.form_name || '—' : '—';
    const getStreamName = (id?: number) => id ? streams.find(s => s.id === id)?.stream_name || '—' : '—';
    const getTermName = (id: number) => terms.find(t => t.id === id)?.term_name || `Term ${id}`;
    const getExamName = (id: number) => examTypes.find(e => e.id === id)?.exam_name || `Exam ${id}`;

    const getGrade = (score: number) => {
        if (!score && score !== 0) return { grade: '—', points: 0, remarks: '—' };
        const sorted = [...grading].sort((a, b) => b.min_score - a.min_score);
        return sorted.find(g => score >= g.min_score && score <= g.max_score) || { grade: 'E', points: 1, remarks: 'Below Min' };
    };

    const filtered = students.filter(s => {
        const q = search.toLowerCase();
        const nameMatch = `${s.first_name} ${s.last_name} ${s.other_name || ''} ${s.admission_no || s.admission_number}`.toLowerCase().includes(q);
        const formMatch = !filterForm || String(s.form_id) === filterForm;
        const statusMatch = !filterStatus || s.status === filterStatus;
        return nameMatch && formMatch && statusMatch;
    });

    /* ── Selected Student Data ── */
    const studentMarks = selStudent ? marks.filter(m => m.student_id === selStudent.id) : [];
    const studentFees = selStudent ? fees.filter(f => f.student_id === selStudent.id) : [];
    const studentDisc = selStudent ? discipline.filter(d => d.student_id === selStudent.id) : [];
    const studentAttendance = selStudent ? attendance.filter(a => a.student_id === selStudent.id) : [];
    const studentDemands = selStudent ? demandLetters.filter(d => d.student_id === selStudent.id) : [];
    const studentLeaves = selStudent ? leaveOuts.filter(l => l.student_id === selStudent.id) : [];
    const studentClubs = selStudent ? clubMembers.filter(c => c.student_id === selStudent.id).map(c => clubs.find(cl => cl.id === c.club_id)).filter(Boolean) : [];
    const studentHealth = selStudent ? health : null;
    const studentRankings = selStudent ? rankings.filter(r => r.student_id === selStudent.id) : [];

    const avgScore = studentMarks.length > 0
        ? studentMarks.reduce((a, m) => a + Number(m.score || 0), 0) / studentMarks.length
        : 0;
    const meanGrade = getGrade(avgScore);
    const totalPaid = studentFees.reduce((a, f) => a + Number(f.amount || 0), 0);

    /* Fee balance */
    const currentTermFeeStructure = feeStructures.filter(fs => fs.form_id === selStudent?.form_id);
    const totalFeeExpected = currentTermFeeStructure.reduce((a, f) => a + Number(f.amount || 0), 0);
    const feeBalance = totalFeeExpected - totalPaid;

    /* Attendance stats */
    const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
    const attendancePct = studentAttendance.length > 0
        ? Math.round((presentDays / studentAttendance.length) * 100) : 0;

    /* Best ranking */
    const bestRank = studentRankings.reduce((best: any, r) => {
        if (!best || r.class_position < best.class_position) return r;
        return best;
    }, null);

    /* Marks by term for chart */
    const termIds = Array.from(new Set(studentMarks.map(m => m.term_id))).filter(Boolean);
    const termAvgData = termIds.map(tid => {
        const tMarks = studentMarks.filter(m => m.term_id === tid);
        return { termId: tid, avg: tMarks.reduce((a, m) => a + Number(m.score || 0), 0) / tMarks.length };
    });

    /* Marks by subject */
    const subjectIds = Array.from(new Set(studentMarks.map(m => m.subject_id))).filter(Boolean);

    /* Subject performance radar data */
    const radarSubjects = subjectIds.slice(0, 8);
    const radarScores = radarSubjects.map(sid => {
        const sMarks = studentMarks.filter(m => m.subject_id === sid);
        return sMarks.length ? Math.round(sMarks.reduce((a, m) => a + Number(m.score || 0), 0) / sMarks.length) : 0;
    });

    /* Fee payments bar chart */
    const feeByMonth = studentFees.reduce((acc: Record<string, number>, f) => {
        if (!f.payment_date) return acc;
        const key = new Date(f.payment_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        acc[key] = (acc[key] || 0) + Number(f.amount || 0);
        return acc;
    }, {});

    /* ── Print ── */
    const handlePrint = () => {
        window.print();
    };

    /* ── Tabs config ── */
    const TABS: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
        { key: 'overview', label: 'Overview', icon: <FiGrid size={14} /> },
        { key: 'academic', label: 'Academic', icon: <FiBookOpen size={14} />, badge: studentMarks.length },
        { key: 'financial', label: 'Financial', icon: <FiDollarSign size={14} />, badge: studentDemands.length || undefined },
        { key: 'discipline', label: 'Discipline', icon: <FiShield size={14} />, badge: studentDisc.length || undefined },
        { key: 'guardian', label: 'Guardian', icon: <FiUsers size={14} /> },
        { key: 'health', label: 'Health', icon: <FiHeart size={14} /> },
        { key: 'attendance', label: 'Attendance', icon: <FiCalendar size={14} /> },
        { key: 'activity', label: 'Activity', icon: <FiActivity size={14} /> },
    ];

    /* ─────── LOADING ─────── */
    if (loading) return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60vh', gap: 16
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
                animation: 'spin 0.8s linear infinite'
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Loading student data…</p>
        </div>
    );

    /* ═══════════ RENDER ═══════════ */
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" }}>

            {/* ── Page Header ── */}
            <div style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
                padding: '28px 32px 80px', position: 'relative', overflow: 'hidden'
            }}>
                {/* Decorative circles */}
                {[...Array(3)].map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute', borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.08)',
                        width: `${(i + 1) * 220}px`, height: `${(i + 1) * 220}px`,
                        top: `${-50 - i * 40}px`, right: `${-60 - i * 40}px`
                    }} />
                ))}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                                }}><FiUsers size={18} /></div>
                                <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                                    Student Profiles
                                </h1>
                            </div>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
                                360° comprehensive view — Academic · Financial · Health · Discipline
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={fetchAll} style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600
                            }}>
                                <FiRefreshCw size={13} /> Refresh
                            </button>
                            {selStudent && (
                                <button onClick={handlePrint} style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: 10, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600
                                }}>
                                    <FiPrinter size={13} /> Print Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 24, marginTop: 20, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Total Students', value: students.length, icon: <FiUsers size={14} /> },
                            { label: 'Active', value: students.filter(s => s.status === 'Active').length, icon: <FiCheckCircle size={14} /> },
                            { label: 'Forms', value: forms.length, icon: <FiLayers size={14} /> },
                            { label: 'Shown', value: filtered.length, icon: <FiEye size={14} /> },
                        ].map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', display: 'flex' }}>{s.icon}</div>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{s.value}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>{s.label.toUpperCase()}</div>
                                </div>
                                {i < 3 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.15)', marginLeft: 8 }} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 24px', marginTop: -48, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

                    {/* ════════════════════════════════
                        LEFT: STUDENT LIST
                    ════════════════════════════════ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {/* Search & filters card */}
                        <div style={{
                            background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden'
                        }}>
                            <div style={{ padding: '16px 16px 12px' }}>
                                {/* Search */}
                                <div style={{ position: 'relative', marginBottom: 10 }}>
                                    <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={15} />
                                    <input
                                        ref={searchRef}
                                        type="text" value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by name or admission no…"
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            paddingLeft: 36, paddingRight: 36, paddingTop: 9, paddingBottom: 9,
                                            border: '1.5px solid #e2e8f0', borderRadius: 12,
                                            fontSize: 13, outline: 'none', color: '#334155',
                                            background: '#f8fafc', transition: 'border-color 0.15s'
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    {search && (
                                        <button onClick={() => setSearch('')} style={{
                                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex'
                                        }}><FiX size={14} /></button>
                                    )}
                                </div>

                                {/* Filter row */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select
                                        value={filterForm}
                                        onChange={e => setFilterForm(e.target.value)}
                                        style={{
                                            flex: 1, padding: '7px 10px', border: '1.5px solid #e2e8f0',
                                            borderRadius: 10, fontSize: 12, color: '#334155',
                                            background: '#f8fafc', outline: 'none', cursor: 'pointer'
                                        }}>
                                        <option value="">All Forms</option>
                                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                    </select>
                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        style={{
                                            flex: 1, padding: '7px 10px', border: '1.5px solid #e2e8f0',
                                            borderRadius: 10, fontSize: 12, color: '#334155',
                                            background: '#f8fafc', outline: 'none', cursor: 'pointer'
                                        }}>
                                        <option value="">All Status</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Graduated">Graduated</option>
                                    </select>
                                    <button
                                        onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                                        style={{
                                            padding: '7px 10px', border: '1.5px solid #e2e8f0',
                                            borderRadius: 10, background: '#f8fafc', cursor: 'pointer',
                                            color: '#6366f1', display: 'flex', alignItems: 'center'
                                        }}>
                                        {viewMode === 'list' ? <FiGrid size={14} /> : <FiList size={14} />}
                                    </button>
                                </div>

                                {/* Count */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                                        {filtered.length} of {students.length} students
                                    </span>
                                    {(filterForm || filterStatus) && (
                                        <button onClick={() => { setFilterForm(''); setFilterStatus(''); }}
                                            style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Student List */}
                            <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', borderTop: '1px solid #f1f5f9' }}>
                                {filtered.length === 0 ? (
                                    <EmptyState icon={<FiSearch />} msg="No students match your search" />
                                ) : filtered.map((s, idx) => {
                                    const initials = `${s.first_name?.charAt(0) || ''}${s.last_name?.charAt(0) || ''}`;
                                    const avatarBg = s.gender === 'Male'
                                        ? `linear-gradient(135deg, #6366f1, #818cf8)`
                                        : `linear-gradient(135deg, #ec4899, #f472b6)`;
                                    const isSelected = selStudent?.id === s.id;
                                    const sMarks = marks.filter(m => m.student_id === s.id);
                                    const sAvg = sMarks.length ? sMarks.reduce((a, m) => a + Number(m.score || 0), 0) / sMarks.length : 0;
                                    const sGrade = getGrade(sAvg);
                                    const gradeInfo = GRADE_COLORS[sGrade.grade] || { bg: '#f1f5f9', text: '#64748b', ring: '#94a3b8' };

                                    return (
                                        <button key={s.id}
                                            onClick={() => { setSelStudent(s); setTab('overview'); }}
                                            style={{
                                                width: '100%', textAlign: 'left',
                                                padding: '12px 16px',
                                                background: isSelected
                                                    ? 'linear-gradient(90deg, #eef2ff, #f5f3ff)'
                                                    : (idx % 2 === 0 ? '#fff' : '#fafbff'),
                                                borderTop: 'none',
                                                borderRight: 'none',
                                                borderBottom: '1px solid #f1f5f9',
                                                borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                                                cursor: 'pointer', transition: 'all 0.15s', display: 'block'
                                            }}
                                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                                            onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? '#fff' : '#fafbff'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 12,
                                                    background: avatarBg, flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontWeight: 800, fontSize: 13,
                                                    boxShadow: isSelected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none'
                                                }}>{initials}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#4338ca' : '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {s.first_name} {s.last_name}
                                                        </p>
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 800, padding: '2px 6px',
                                                            borderRadius: 6, background: gradeInfo.bg, color: gradeInfo.text, flexShrink: 0
                                                        }}>{sGrade.grade !== '—' ? sGrade.grade : '?'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                                        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{s.admission_no || s.admission_number}</span>
                                                        <span style={{ color: '#e2e8f0' }}>•</span>
                                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{getFormName(s.form_id)}</span>
                                                        {s.stream_id && <>
                                                            <span style={{ color: '#e2e8f0' }}>•</span>
                                                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{getStreamName(s.stream_id)}</span>
                                                        </>}
                                                        <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: s.status === 'Active' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════
                        RIGHT: DETAIL PANEL
                    ════════════════════════════════ */}
                    <div>
                        {!selStudent ? (
                            /* Placeholder */
                            <div style={{
                                background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                padding: '80px 40px', textAlign: 'center',
                                minHeight: 500
                            }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: 24,
                                    background: 'linear-gradient(135deg, #eef2ff, #ede9fe)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 20, fontSize: 36, color: '#6366f1'
                                }}><FiUser /></div>
                                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>Select a Student</h2>
                                <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 320, lineHeight: 1.6, margin: '0 0 24px' }}>
                                    Choose a student from the list to view their comprehensive 360° profile
                                </p>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {['Academic Records', 'Fee Payments', 'Discipline', 'Health Info', 'Attendance'].map(t => (
                                        <span key={t} style={{
                                            padding: '6px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
                                            borderRadius: 99, fontSize: 12, color: '#64748b', fontWeight: 600
                                        }}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                {/* ── Profile Hero Card ── */}
                                <div style={{
                                    background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden'
                                }}>
                                    {/* Hero banner */}
                                    <div style={{
                                        background: selStudent.gender === 'Male'
                                            ? 'linear-gradient(135deg, #312e81, #4f46e5)'
                                            : 'linear-gradient(135deg, #831843, #db2777)',
                                        padding: '24px 24px 56px', position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                {/* Avatar */}
                                                {selStudent.photo_url ? (
                                                    <img src={selStudent.photo_url} alt="Photo"
                                                        style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }} />
                                                ) : (
                                                    <div style={{
                                                        width: 72, height: 72, borderRadius: 18,
                                                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#fff', fontWeight: 900, fontSize: 26,
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        letterSpacing: '-1px'
                                                    }}>
                                                        {selStudent.first_name?.charAt(0)}{selStudent.last_name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                                                        {selStudent.first_name} {selStudent.other_name || selStudent.middle_name ? (selStudent.other_name || selStudent.middle_name) + ' ' : ''}{selStudent.last_name}
                                                    </h2>
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'monospace' }}>
                                                            {selStudent.admission_no || selStudent.admission_number}
                                                        </span>
                                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>
                                                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                                                            {getFormName(selStudent.form_id)} {getStreamName(selStudent.stream_id)}
                                                        </span>
                                                        {selStudent.nemis_no && <>
                                                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>
                                                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>NEMIS: {selStudent.nemis_no}</span>
                                                        </>}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Status badges */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                                    background: selStudent.status === 'Active' ? '#22c55e' : '#ef4444', color: '#fff'
                                                }}>{selStudent.status}</span>
                                                {selStudent.gender && (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                                                        background: 'rgba(255,255,255,0.2)', color: '#fff'
                                                    }}>{selStudent.gender}</span>
                                                )}
                                                {selStudent.card_status === 'Active' && (
                                                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: '#0ea5e9', color: '#fff' }}>
                                                        🪪 ID Card Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick stats row */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
                                        background: '#fff', marginTop: -36, position: 'relative',
                                        margin: '-36px 20px 0', borderRadius: 16, border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden'
                                    }}>
                                        {[
                                            { label: 'Mean Grade', value: meanGrade.grade || '—', sub: `${avgScore.toFixed(1)}%`, color: GRADE_COLORS[meanGrade.grade]?.text || '#64748b' },
                                            { label: 'Attendance', value: `${attendancePct}%`, sub: `${presentDays}/${studentAttendance.length} days`, color: attendancePct >= 80 ? '#16a34a' : attendancePct >= 60 ? '#d97706' : '#dc2626' },
                                            { label: 'Fee Paid', value: fmt(totalPaid), sub: feeBalance > 0 ? `Bal: ${fmt(feeBalance)}` : 'Cleared', color: feeBalance > 0 ? '#dc2626' : '#16a34a' },
                                            { label: 'Best Rank', value: bestRank ? `#${bestRank.class_position}` : '—', sub: bestRank ? `of ${bestRank.total_students}` : 'No ranking', color: '#6366f1' },
                                            { label: 'Discipline', value: studentDisc.length === 0 ? '✅ Clean' : `${studentDisc.length} cases`, sub: studentDisc.filter(d => d.severity === 'Major').length > 0 ? 'Major incidents' : 'Minor only', color: studentDisc.length === 0 ? '#16a34a' : studentDisc.filter(d => d.severity === 'Major').length > 0 ? '#dc2626' : '#d97706' },
                                        ].map((stat, i) => (
                                            <div key={i} style={{
                                                padding: '14px 12px', textAlign: 'center',
                                                borderRight: i < 4 ? '1px solid #f1f5f9' : 'none'
                                            }}>
                                                <div style={{ fontSize: 15, fontWeight: 800, color: stat.color, lineHeight: 1.2 }}>{stat.value}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', marginTop: 3 }}>{stat.label}</div>
                                                <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>{stat.sub}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ height: 20 }} />
                                </div>

                                {/* ── Tabs ── */}
                                <div style={{
                                    background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
                                    padding: '6px', display: 'flex', gap: 4, flexWrap: 'wrap',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                }}>
                                    {TABS.map(t => (
                                        <button key={t.key}
                                            onClick={() => setTab(t.key)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                padding: '8px 14px', borderRadius: 10, border: 'none',
                                                background: tab === t.key
                                                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                                    : 'transparent',
                                                color: tab === t.key ? '#fff' : '#64748b',
                                                fontSize: 12, fontWeight: tab === t.key ? 700 : 600,
                                                cursor: 'pointer', transition: 'all 0.15s', position: 'relative'
                                            }}>
                                            {t.icon}
                                            {t.label}
                                            {t.badge != null && t.badge > 0 && (
                                                <span style={{
                                                    minWidth: 18, height: 18, borderRadius: 99, padding: '0 4px',
                                                    background: tab === t.key ? 'rgba(255,255,255,0.3)' : '#ef4444',
                                                    color: '#fff', fontSize: 10, fontWeight: 800,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>{t.badge}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* ══════════════════════════════════
                                    OVERVIEW TAB
                                ══════════════════════════════════ */}
                                {tab === 'overview' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {/* Personal Info */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', gridColumn: '1 / -1' }}>
                                            <SectionTitle icon={<FiUser />} title="Personal Information" />
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                                                <InfoRow label="Full Name" value={`${selStudent.first_name} ${selStudent.other_name || selStudent.middle_name || ''} ${selStudent.last_name}`.trim()} icon={<FiUser />} />
                                                <InfoRow label="Date of Birth" value={fmtDate(selStudent.date_of_birth)} icon={<FiCalendar />} />
                                                <InfoRow label="Age" value={calcAge(selStudent.date_of_birth)} icon={<FiClock />} />
                                                <InfoRow label="Gender" value={selStudent.gender} icon={<FiUser />} />
                                                <InfoRow label="Admission No." value={selStudent.admission_no || selStudent.admission_number} icon={<FiFileText />} />
                                                <InfoRow label="Admission Date" value={fmtDate(selStudent.admission_date)} icon={<FiCalendar />} />
                                                <InfoRow label="Form / Class" value={`${getFormName(selStudent.form_id)} ${getStreamName(selStudent.stream_id)}`} icon={<FiBookOpen />} />
                                                <InfoRow label="KCPE Marks" value={selStudent.kcpe_marks ? `${selStudent.kcpe_marks}/500` : '—'} icon={<FiAward />} />
                                                <InfoRow label="County" value={selStudent.county} icon={<FiMapPin />} />
                                                <InfoRow label="Sub-County" value={selStudent.sub_county} icon={<FiMapPin />} />
                                                <InfoRow label="Village" value={selStudent.village} icon={<FiHome />} />
                                                <InfoRow label="Religion" value={selStudent.religion} icon={<FiStar />} />
                                                <InfoRow label="Nationality" value={selStudent.nationality || 'Kenyan'} icon={<FiGlobe />} />
                                                <InfoRow label="NEMIS No." value={selStudent.nemis_no} icon={<FiFileText />} />
                                                <InfoRow label="Blood Group" value={selStudent.blood_group} icon={<FiHeart />} />
                                                <InfoRow label="Previous School" value={selStudent.previous_school} icon={<FiBookOpen />} />
                                                {selStudent.special_needs && <InfoRow label="Special Needs" value={selStudent.special_needs} icon={<FiInfo />} />}
                                            </div>
                                        </div>

                                        {/* Academic snapshot */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiBarChart2 />} title="Academic Snapshot" />
                                            {termAvgData.length === 0 ? (
                                                <EmptyState icon={<FiBookOpen />} msg="No marks recorded yet" />
                                            ) : (
                                                <div>
                                                    <div style={{ height: 180 }}>
                                                        <Line
                                                            data={{
                                                                labels: termAvgData.map(t => getTermName(t.termId)),
                                                                datasets: [{
                                                                    label: 'Average Score',
                                                                    data: termAvgData.map(t => Math.round(t.avg)),
                                                                    borderColor: '#6366f1', backgroundColor: '#6366f120',
                                                                    borderWidth: 2.5, pointRadius: 5,
                                                                    pointBackgroundColor: '#6366f1',
                                                                    pointBorderColor: '#fff', pointBorderWidth: 2,
                                                                    tension: 0.4, fill: true
                                                                }]
                                                            }}
                                                            options={{
                                                                responsive: true, maintainAspectRatio: false,
                                                                plugins: { legend: { display: false } },
                                                                scales: {
                                                                    y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                                                                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: GRADE_COLORS[meanGrade.grade]?.text || '#64748b' }}>{meanGrade.grade || '—'}</div>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>MEAN GRADE</div>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{avgScore.toFixed(1)}%</div>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>AVG SCORE</div>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{studentMarks.length}</div>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>ASSESSMENTS</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial snapshot */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiDollarSign />} title="Fee Status" />
                                            {/* Donut */}
                                            {totalPaid > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                                    <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                                                        <Doughnut
                                                            data={{
                                                                labels: ['Paid', 'Balance'],
                                                                datasets: [{
                                                                    data: [totalPaid, Math.max(0, feeBalance)],
                                                                    backgroundColor: ['#22c55e', '#fee2e2'],
                                                                    borderWidth: 0
                                                                }]
                                                            }}
                                                            options={{
                                                                responsive: true, maintainAspectRatio: true,
                                                                cutout: '72%',
                                                                plugins: { legend: { display: false } }
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ marginBottom: 10 }}>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total Paid</div>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{fmt(totalPaid)}</div>
                                                        </div>
                                                        {feeBalance > 0 && (
                                                            <div style={{ marginBottom: 10 }}>
                                                                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Balance</div>
                                                                <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{fmt(feeBalance)}</div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Payments</div>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{studentFees.length}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : <EmptyState icon={<FiDollarSign />} msg="No payments recorded" />}

                                            {/* Demand letters */}
                                            {studentDemands.length > 0 && (
                                                <div style={{ marginTop: 12, padding: '10px 12px', background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <FiAlertTriangle size={13} color="#ea580c" />
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ea580c' }}>
                                                            {studentDemands.length} demand letter{studentDemands.length > 1 ? 's' : ''} issued
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Clubs & Activities */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiStar />} title="Clubs & Activities" />
                                            {studentClubs.length === 0 ? (
                                                <EmptyState icon={<FiUsers />} msg="Not in any clubs" />
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                    {studentClubs.map((club: any, i: number) => (
                                                        <div key={i} style={{
                                                            padding: '8px 14px', background: '#eef2ff', borderRadius: 10,
                                                            fontSize: 12, fontWeight: 700, color: '#4338ca'
                                                        }}>
                                                            🎯 {club.club_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Promotion status */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', gridColumn: '1 / -1' }}>
                                            <SectionTitle icon={<FiTrendingUp />} title="Promotion & Clearance" />
                                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                {[
                                                    { label: 'Promotion Status', value: selStudent.promotion_eligible || 'Pending', color: selStudent.promotion_eligible === 'Eligible' ? '#22c55e' : selStudent.promotion_eligible === 'Not Eligible' ? '#ef4444' : '#f59e0b' },
                                                    { label: 'Card Status', value: selStudent.card_status || 'Not Issued', color: selStudent.card_status === 'Active' ? '#22c55e' : '#94a3b8' },
                                                ].map((item, i) => (
                                                    <div key={i} style={{ padding: '12px 20px', background: '#f8fafc', borderRadius: 12, minWidth: 160 }}>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                                                        <div style={{ fontSize: 16, fontWeight: 800, color: item.color }}>{item.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    ACADEMIC TAB
                                ══════════════════════════════════ */}
                                {tab === 'academic' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Filter by term */}
                                        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Filter by Term:</span>
                                            <button onClick={() => setSelectedTerm(null)} style={{
                                                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                background: selectedTerm === null ? '#6366f1' : '#f1f5f9', color: selectedTerm === null ? '#fff' : '#64748b'
                                            }}>All Terms</button>
                                            {terms.slice(0, 8).map(t => (
                                                <button key={t.id} onClick={() => setSelectedTerm(t.id)} style={{
                                                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                                    background: selectedTerm === t.id ? '#6366f1' : '#f1f5f9', color: selectedTerm === t.id ? '#fff' : '#64748b'
                                                }}>{t.term_name} {t.year}</button>
                                            ))}
                                        </div>

                                        {/* Performance chart */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiBarChart2 />} title="Performance Across Terms" />
                                            {termAvgData.length === 0 ? (
                                                <EmptyState icon={<FiBarChart2 />} msg="No performance data" />
                                            ) : (
                                                <div style={{ height: 220 }}>
                                                    <Bar
                                                        data={{
                                                            labels: termAvgData.map(t => getTermName(t.termId)),
                                                            datasets: [{
                                                                label: 'Average %',
                                                                data: termAvgData.map(t => Math.round(t.avg)),
                                                                backgroundColor: termAvgData.map((t, i) => TERM_PALETTE[i % TERM_PALETTE.length] + 'cc'),
                                                                borderColor: termAvgData.map((t, i) => TERM_PALETTE[i % TERM_PALETTE.length]),
                                                                borderWidth: 2, borderRadius: 8,
                                                            }]
                                                        }}
                                                        options={{
                                                            responsive: true, maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                y: { min: 0, max: 100, grid: { color: '#f8fafc' }, ticks: { font: { size: 10 } } },
                                                                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Subject radar */}
                                        {radarSubjects.length >= 3 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <SectionTitle icon={<FiActivity />} title="Subject Competency Radar" />
                                                <div style={{ height: 280 }}>
                                                    <Radar
                                                        data={{
                                                            labels: radarSubjects.map(sid => {
                                                                const marks_for = studentMarks.filter(m => m.subject_id === sid);
                                                                return `Sub ${sid}`;
                                                            }),
                                                            datasets: [{
                                                                label: 'Score %',
                                                                data: radarScores,
                                                                borderColor: '#6366f1',
                                                                backgroundColor: '#6366f118',
                                                                borderWidth: 2,
                                                                pointBackgroundColor: '#6366f1',
                                                                pointRadius: 4,
                                                            }]
                                                        }}
                                                        options={{
                                                            responsive: true, maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                r: {
                                                                    min: 0, max: 100,
                                                                    ticks: { font: { size: 9 }, stepSize: 20 },
                                                                    pointLabels: { font: { size: 10 } },
                                                                    grid: { color: '#f1f5f9' }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Marks table */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <SectionTitle icon={<FiFileText />} title={`Assessment Records (${(selectedTerm ? studentMarks.filter(m => m.term_id === selectedTerm) : studentMarks).length})`} />
                                            </div>
                                            {studentMarks.length === 0 ? (
                                                <EmptyState icon={<FiBookOpen />} msg="No assessments recorded" />
                                            ) : (
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                        <thead>
                                                            <tr style={{ background: '#f8fafc' }}>
                                                                {['#', 'Term', 'Exam Type', 'Subject', 'Score', 'Grade', 'Remarks'].map((h, i) => (
                                                                    <th key={h} style={{
                                                                        padding: '10px 14px', textAlign: i >= 4 ? 'center' : 'left',
                                                                        fontSize: 11, fontWeight: 700, color: '#94a3b8',
                                                                        letterSpacing: '0.05em', textTransform: 'uppercase',
                                                                        borderBottom: '1px solid #f1f5f9'
                                                                    }}>{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(selectedTerm ? studentMarks.filter(m => m.term_id === selectedTerm) : studentMarks)
                                                                .map((m, i) => {
                                                                    const g = getGrade(Number(m.score));
                                                                    const gColor = GRADE_COLORS[g.grade] || { bg: '#f1f5f9', text: '#64748b' };
                                                                    return (
                                                                        <tr key={m.id || i} style={{ borderBottom: '1px solid #f8fafc' }}
                                                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
                                                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                                                                        >
                                                                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: 11 }}>{i + 1}</td>
                                                                            <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{getTermName(m.term_id)}</td>
                                                                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>{m.exam_type || getExamName(m.exam_type_id)}</td>
                                                                            <td style={{ padding: '10px 14px', color: '#334155' }}>Subject {m.subject_id}</td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                                                    <div style={{
                                                                                        height: 4, width: 60, borderRadius: 4,
                                                                                        background: '#f1f5f9', overflow: 'hidden'
                                                                                    }}>
                                                                                        <div style={{
                                                                                            height: '100%', borderRadius: 4,
                                                                                            width: `${Math.min(100, Number(m.score))}%`,
                                                                                            background: gColor.ring || '#6366f1'
                                                                                        }} />
                                                                                    </div>
                                                                                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{m.score}%</span>
                                                                                </div>
                                                                            </td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                                <span style={{
                                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                                    width: 32, height: 24, borderRadius: 6,
                                                                                    background: gColor.bg, color: gColor.text, fontWeight: 800, fontSize: 12
                                                                                }}>{g.grade}</span>
                                                                            </td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>{g.remarks}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Rankings */}
                                        {studentRankings.length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <SectionTitle icon={<FiAward />} title="Class Rankings" />
                                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                    {studentRankings.map((r, i) => (
                                                        <div key={i} style={{
                                                            flex: '1 1 200px', padding: '14px 16px',
                                                            background: '#fafbff', borderRadius: 12, border: '1px solid #e2e8f0'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{getTermName(r.term_id)}</span>
                                                                <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 800 }}>{r.mean_grade || '—'}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 12 }}>
                                                                <div>
                                                                    <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>#{r.class_position}</div>
                                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Class rank</div>
                                                                </div>
                                                                {r.stream_position && (
                                                                    <div>
                                                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#6366f1' }}>#{r.stream_position}</div>
                                                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>Stream rank</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                                                                Mean: {Number(r.mean_score || 0).toFixed(1)}% | {r.total_students} students
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    FINANCIAL TAB
                                ══════════════════════════════════ */}
                                {tab === 'financial' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Summary cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                            <StatCard icon={<FiCheckCircle />} label="Total Paid" value={fmt(totalPaid)} color="#22c55e" sub={`${studentFees.length} payments`} />
                                            <StatCard icon={<FiAlertTriangle />} label="Balance Due" value={feeBalance > 0 ? fmt(feeBalance) : 'Cleared'} color={feeBalance > 0 ? '#ef4444' : '#22c55e'} sub={feeBalance > 0 ? 'Outstanding' : '✓ Fully paid'} />
                                            <StatCard icon={<FiFileText />} label="Demand Letters" value={studentDemands.length} color={studentDemands.length > 0 ? '#f59e0b' : '#22c55e'} sub={studentDemands.length > 0 ? 'Action required' : 'None issued'} />
                                        </div>

                                        {/* Payment trend chart */}
                                        {Object.keys(feeByMonth).length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <SectionTitle icon={<FiBarChart2 />} title="Payment History by Month" />
                                                <div style={{ height: 200 }}>
                                                    <Bar
                                                        data={{
                                                            labels: Object.keys(feeByMonth),
                                                            datasets: [{
                                                                label: 'KES',
                                                                data: Object.values(feeByMonth),
                                                                backgroundColor: '#22c55ecc',
                                                                borderColor: '#16a34a',
                                                                borderWidth: 1.5, borderRadius: 6,
                                                            }]
                                                        }}
                                                        options={{
                                                            responsive: true, maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                y: { grid: { color: '#f8fafc' }, ticks: { font: { size: 10 }, callback: (v) => `${(Number(v) / 1000).toFixed(0)}k` } },
                                                                x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Payments table */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                <SectionTitle icon={<FiDollarSign />} title={`Payment Transactions (${studentFees.length})`} />
                                            </div>
                                            {studentFees.length === 0 ? (
                                                <EmptyState icon={<FiDollarSign />} msg="No payments recorded" />
                                            ) : (
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8fafc' }}>
                                                            {['#', 'Date', 'Receipt No.', 'Method', 'Amount', 'Term'].map((h, i) => (
                                                                <th key={h} style={{
                                                                    padding: '10px 14px', textAlign: i === 4 ? 'right' : 'left',
                                                                    fontSize: 11, fontWeight: 700, color: '#94a3b8',
                                                                    letterSpacing: '0.05em', textTransform: 'uppercase',
                                                                    borderBottom: '1px solid #f1f5f9'
                                                                }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {studentFees.map((f, i) => (
                                                            <tr key={f.id || i} style={{ borderBottom: '1px solid #f8fafc' }}
                                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbff'}
                                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                                                <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: 11 }}>{i + 1}</td>
                                                                <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{fmtDate(f.payment_date)}</td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{f.receipt_number || '—'}</span>
                                                                </td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <Badge label={f.payment_method || 'Cash'} color={f.payment_method === 'M-Pesa' ? '#22c55e' : f.payment_method === 'Bank' ? '#3b82f6' : '#64748b'} />
                                                                </td>
                                                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#16a34a', fontSize: 14 }}>{fmt(Number(f.amount))}</td>
                                                                <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 11 }}>{f.term_id ? getTermName(f.term_id) : '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                                            <td colSpan={4} style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>TOTAL</td>
                                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: 16 }}>{fmt(totalPaid)}</td>
                                                            <td />
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            )}
                                        </div>

                                        {/* Demand Letters */}
                                        {studentDemands.length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <SectionTitle icon={<FiAlertTriangle />} title={`Demand Letters (${studentDemands.length})`} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {studentDemands.map((dl, i) => (
                                                        <div key={i} style={{
                                                            padding: '14px 16px', background: '#fff7ed', borderRadius: 12,
                                                            border: '1px solid #fed7aa', borderLeft: '4px solid #ea580c'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>{dl.subject || dl.letter_type}</span>
                                                                <span style={{ fontSize: 11, color: '#cb6a14' }}>{fmtDate(dl.created_at)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <Badge label={dl.letter_type || 'Notice'} color="#ea580c" />
                                                                {dl.amount_owed > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Owed: {fmt(dl.amount_owed)}</span>}
                                                                <Badge label={dl.status} color={dl.status === 'Sent' ? '#22c55e' : '#94a3b8'} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    DISCIPLINE TAB
                                ══════════════════════════════════ */}
                                {tab === 'discipline' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Summary */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                            {[
                                                { label: 'Total Cases', value: studentDisc.length, color: '#6366f1' },
                                                { label: 'Major', value: studentDisc.filter(d => d.severity === 'Major').length, color: '#ef4444' },
                                                { label: 'Minor', value: studentDisc.filter(d => d.severity === 'Minor').length, color: '#f59e0b' },
                                                { label: 'Resolved', value: studentDisc.filter(d => d.status === 'Resolved').length, color: '#22c55e' },
                                            ].map((s, i) => (
                                                <div key={i} style={{
                                                    padding: '16px', background: '#fff', borderRadius: 14,
                                                    border: '1px solid #e2e8f0', textAlign: 'center',
                                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                                }}>
                                                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>{s.label.toUpperCase()}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {studentDisc.length === 0 ? (
                                            <div style={{
                                                background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0',
                                                padding: 40, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                            }}>
                                                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Clean Record</h3>
                                                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No discipline incidents recorded for this student.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {studentDisc.map((d, i) => {
                                                    const sColor = d.severity === 'Major' ? '#ef4444' : d.severity === 'Minor' ? '#f59e0b' : '#6366f1';
                                                    return (
                                                        <div key={d.id || i} style={{
                                                            background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
                                                            borderLeft: `4px solid ${sColor}`, padding: '18px 20px',
                                                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                    <Badge label={d.severity || 'Unknown'} color={sColor} />
                                                                    <Badge label={d.category || 'General'} color="#6366f1" />
                                                                    <Badge label={d.status || 'Open'} color={d.status === 'Resolved' ? '#22c55e' : d.status === 'Closed' ? '#94a3b8' : '#ef4444'} />
                                                                </div>
                                                                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{fmtDate(d.incident_date)}</span>
                                                            </div>
                                                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.5 }}>{d.description}</p>
                                                            {d.action_taken && (
                                                                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
                                                                    <strong style={{ color: '#475569' }}>Action taken:</strong> {d.action_details || d.action_taken}
                                                                </div>
                                                            )}
                                                            {d.counseling_notes && (
                                                                <div style={{ padding: '8px 12px', background: '#fafbff', borderRadius: 8, fontSize: 12, color: '#64748b', marginTop: 6 }}>
                                                                    <strong style={{ color: '#475569' }}>Counseling notes:</strong> {d.counseling_notes}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
                                                                {d.reported_by && <span>Reported by: {d.reported_by}</span>}
                                                                {d.parent_notified && <span style={{ color: '#22c55e' }}>✓ Parent notified</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Leave outs */}
                                        {studentLeaves.length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <SectionTitle icon={<FiClock />} title={`Leave Out Records (${studentLeaves.length})`} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {studentLeaves.map((l, i) => (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9'
                                                        }}>
                                                            <div>
                                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{l.reason}</div>
                                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{l.reason_details}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{l.time_left ? new Date(l.time_left).toLocaleString('en-GB') : '—'}</div>
                                                                <Badge label={l.status || 'Out'} color={l.status === 'Returned' ? '#22c55e' : '#f59e0b'} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    GUARDIAN TAB
                                ══════════════════════════════════ */}
                                {tab === 'guardian' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiUsers />} title="Primary Guardian / Parent" />
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                                                background: 'linear-gradient(135deg, #eef2ff, #ede9fe)',
                                                borderRadius: 14, marginBottom: 20
                                            }}>
                                                <div style={{
                                                    width: 56, height: 56, borderRadius: 16, background: '#6366f1',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontSize: 22
                                                }}>👤</div>
                                                <div>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{selStudent.guardian_name || '—'}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selStudent.guardian_relationship || 'Guardian'}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                                                <InfoRow label="Phone" value={selStudent.guardian_phone} icon={<FiPhone />} />
                                                <InfoRow label="Email" value={selStudent.guardian_email} icon={<FiMail />} />
                                                <InfoRow label="ID Number" value={selStudent.guardian_id_no} icon={<FiFileText />} />
                                                <InfoRow label="Occupation" value={selStudent.guardian_occupation} icon={<FiBell />} />
                                                <InfoRow label="Emergency Contact" value={selStudent.emergency_contact_name} icon={<FiAlertTriangle />} />
                                                <InfoRow label="Emergency Phone" value={selStudent.emergency_contact_phone} icon={<FiPhone />} />
                                            </div>
                                        </div>

                                        {/* Emergency contacts component */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiAlertTriangle />} title="Emergency Contacts" />
                                            <EmergencyContactsSection studentId={selStudent.id} canWrite={true} />
                                        </div>
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    HEALTH TAB
                                ══════════════════════════════════ */}
                                {tab === 'health' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {!studentHealth ? (
                                            <div style={{
                                                background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0',
                                                padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                            }}>
                                                <SectionTitle icon={<FiHeart />} title="Health Record" />
                                                <EmptyState icon={<FiHeart />} msg="No health record on file" />
                                            </div>
                                        ) : (
                                            <>
                                                {/* Vitals */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                                    {[
                                                        { label: 'Blood Group', value: studentHealth.blood_group || selStudent.blood_group || '—', icon: '🩸', color: '#ef4444' },
                                                        { label: 'Height', value: studentHealth.height_cm ? `${studentHealth.height_cm} cm` : '—', icon: '📏', color: '#6366f1' },
                                                        { label: 'Weight', value: studentHealth.weight_kg ? `${studentHealth.weight_kg} kg` : '—', icon: '⚖️', color: '#0ea5e9' },
                                                        { label: 'Genotype', value: studentHealth.genotype || '—', icon: '🧬', color: '#22c55e' },
                                                    ].map((v, i) => (
                                                        <div key={i} style={{
                                                            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                                                            padding: '16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                                        }}>
                                                            <div style={{ fontSize: 28, marginBottom: 8 }}>{v.icon}</div>
                                                            <div style={{ fontSize: 18, fontWeight: 800, color: v.color }}>{v.value}</div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{v.label}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                    <SectionTitle icon={<FiHeart />} title="Medical Information" />
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                                                        <InfoRow label="Vision (Left)" value={studentHealth.vision_left} icon={<FiEye />} />
                                                        <InfoRow label="Vision (Right)" value={studentHealth.vision_right} icon={<FiEye />} />
                                                        <InfoRow label="Hearing" value={studentHealth.hearing} icon={<FiInfo />} />
                                                        <InfoRow label="Dental Notes" value={studentHealth.dental_notes} icon={<FiInfo />} />
                                                    </div>
                                                    {studentHealth.chronic_conditions && (
                                                        <div style={{ padding: '12px 16px', background: '#fff7ed', borderRadius: 10, marginTop: 12, border: '1px solid #fed7aa' }}>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', marginBottom: 4 }}>CHRONIC CONDITIONS</div>
                                                            <p style={{ margin: 0, fontSize: 13, color: '#9a3412' }}>{studentHealth.chronic_conditions}</p>
                                                        </div>
                                                    )}
                                                    {(studentHealth.allergies || selStudent.medical_info) && (
                                                        <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 10, marginTop: 10, border: '1px solid #fecaca' }}>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>ALLERGIES / MEDICAL NOTES</div>
                                                            <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{studentHealth.allergies || selStudent.medical_info}</p>
                                                        </div>
                                                    )}
                                                    {studentHealth.current_medications && (
                                                        <div style={{ padding: '12px 16px', background: '#f0f9ff', borderRadius: 10, marginTop: 10, border: '1px solid #bae6fd' }}>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>CURRENT MEDICATIONS</div>
                                                            <p style={{ margin: 0, fontSize: 13, color: '#0c4a6e' }}>{studentHealth.current_medications}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    ATTENDANCE TAB
                                ══════════════════════════════════ */}
                                {tab === 'attendance' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                            <StatCard icon={<FiCheckCircle />} label="Present Days" value={presentDays} color="#22c55e" sub={`${attendancePct}% rate`} />
                                            <StatCard icon={<FiX />} label="Absent Days" value={studentAttendance.filter(a => a.status === 'Absent').length} color="#ef4444" />
                                            <StatCard icon={<FiClock />} label="Late Arrivals" value={studentAttendance.filter(a => a.status === 'Late').length} color="#f59e0b" />
                                            <StatCard icon={<FiCalendar />} label="Total Records" value={studentAttendance.length} color="#6366f1" />
                                        </div>

                                        {/* Attendance rate visual */}
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiActivity />} title="Attendance Rate" />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                                <div style={{ position: 'relative', width: 140, height: 140 }}>
                                                    <Doughnut
                                                        data={{
                                                            datasets: [{
                                                                data: [attendancePct, 100 - attendancePct],
                                                                backgroundColor: [
                                                                    attendancePct >= 80 ? '#22c55e' : attendancePct >= 60 ? '#f59e0b' : '#ef4444',
                                                                    '#f1f5f9'
                                                                ],
                                                                borderWidth: 0
                                                            }]
                                                        }}
                                                        options={{
                                                            responsive: true, maintainAspectRatio: true,
                                                            cutout: '76%', plugins: { legend: { display: false } }
                                                        }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute', inset: 0, display: 'flex',
                                                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>{attendancePct}%</div>
                                                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>RATE</div>
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>ATTENDANCE BREAKDOWN</div>
                                                        {[
                                                            { label: 'Present', count: presentDays, color: '#22c55e' },
                                                            { label: 'Absent', count: studentAttendance.filter(a => a.status === 'Absent').length, color: '#ef4444' },
                                                            { label: 'Late', count: studentAttendance.filter(a => a.status === 'Late').length, color: '#f59e0b' },
                                                        ].map(item => (
                                                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                                                                <span style={{ fontSize: 12, color: '#334155', flex: 1 }}>{item.label}</span>
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.count} days</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{
                                                        padding: '10px 14px', borderRadius: 10,
                                                        background: attendancePct >= 80 ? '#dcfce7' : attendancePct >= 60 ? '#fef3c7' : '#fee2e2',
                                                        border: `1px solid ${attendancePct >= 80 ? '#bbf7d0' : attendancePct >= 60 ? '#fde68a' : '#fecaca'}`
                                                    }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: attendancePct >= 80 ? '#16a34a' : attendancePct >= 60 ? '#d97706' : '#dc2626' }}>
                                                            {attendancePct >= 80 ? '✅ Excellent Attendance' : attendancePct >= 60 ? '⚠️ Attendance Needs Improvement' : '🚨 Critical: Very Low Attendance'}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                                            {attendancePct >= 80 ? 'Student maintains great attendance records.' : `Student needs to improve attendance by ${80 - attendancePct}% to reach the 80% threshold.`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attendance log table */}
                                        {studentAttendance.length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                    <SectionTitle icon={<FiCalendar />} title="Recent Attendance Log" />
                                                </div>
                                                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                        <thead style={{ position: 'sticky', top: 0 }}>
                                                            <tr style={{ background: '#f8fafc' }}>
                                                                {['Date', 'Status', 'Term', 'Recorded By'].map((h) => (
                                                                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentAttendance.slice(0, 60).map((a, i) => (
                                                                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#64748b' }}>{fmtDate(a.attendance_date)}</td>
                                                                    <td style={{ padding: '8px 14px' }}>
                                                                        <span style={{
                                                                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                                            background: a.status === 'Present' ? '#dcfce7' : a.status === 'Absent' ? '#fee2e2' : '#fef3c7',
                                                                            color: a.status === 'Present' ? '#15803d' : a.status === 'Absent' ? '#dc2626' : '#d97706'
                                                                        }}>{a.status}</span>
                                                                    </td>
                                                                    <td style={{ padding: '8px 14px', color: '#94a3b8' }}>{a.term_id ? getTermName(a.term_id) : '—'}</td>
                                                                    <td style={{ padding: '8px 14px', color: '#94a3b8' }}>{a.recorded_by || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ══════════════════════════════════
                                    ACTIVITY TAB
                                ══════════════════════════════════ */}
                                {tab === 'activity' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                            <SectionTitle icon={<FiActivity />} title="Student Activity Timeline" />
                                            <div style={{ paddingLeft: 8 }}>
                                                {studentFees.slice(0, 3).map((f, i) => (
                                                    <TimelineEvent key={`fee-${i}`}
                                                        title={`Fee Payment — ${fmt(Number(f.amount))}`}
                                                        sub={`${f.payment_method || 'Cash'} · Receipt: ${f.receipt_number || '—'}`}
                                                        date={fmtDate(f.payment_date)}
                                                        color="#22c55e" icon={<FiDollarSign size={14} />}
                                                    />
                                                ))}
                                                {studentDisc.slice(0, 3).map((d, i) => (
                                                    <TimelineEvent key={`disc-${i}`}
                                                        title={`Discipline: ${d.category || 'Incident'}`}
                                                        sub={d.description?.substring(0, 60) + (d.description?.length > 60 ? '…' : '')}
                                                        date={fmtDate(d.incident_date)}
                                                        color="#ef4444" icon={<FiShield size={14} />}
                                                    />
                                                ))}
                                                {studentLeaves.slice(0, 3).map((l, i) => (
                                                    <TimelineEvent key={`leave-${i}`}
                                                        title={`Leave Out — ${l.reason}`}
                                                        sub={l.reason_details || 'No details'}
                                                        date={l.time_left ? new Date(l.time_left).toLocaleString('en-GB') : '—'}
                                                        color="#f59e0b" icon={<FiClock size={14} />}
                                                    />
                                                ))}
                                                {studentDemands.slice(0, 3).map((d, i) => (
                                                    <TimelineEvent key={`dl-${i}`}
                                                        title={`Demand Letter — ${d.letter_type}`}
                                                        sub={d.subject}
                                                        date={fmtDate(d.created_at)}
                                                        color="#ea580c" icon={<FiAlertTriangle size={14} />}
                                                    />
                                                ))}
                                                {studentFees.length === 0 && studentDisc.length === 0 && studentLeaves.length === 0 && studentDemands.length === 0 && (
                                                    <EmptyState icon={<FiActivity />} msg="No activity recorded yet" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Clubs detail */}
                                        {studentClubs.length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                                <SectionTitle icon={<FiStar />} title="Clubs & Organizations" />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {studentClubs.map((club: any, i: number) => (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '12px 16px', background: '#fafbff', borderRadius: 10, border: '1px solid #e2e8f0'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                <div style={{
                                                                    width: 36, height: 36, borderRadius: 10, background: '#eef2ff',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                                                                }}>🎯</div>
                                                                <div>
                                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{club.club_name}</div>
                                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{club.club_type || 'Club'}</div>
                                                                </div>
                                                            </div>
                                                            <Badge label="Member" color="#6366f1" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                button:focus { outline: 2px solid #6366f1; outline-offset: 2px; }
                @media print {
                    body * { visibility: hidden !important; }
                    .print-area, .print-area * { visibility: visible !important; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                }
            `}</style>
        </div>
    );
}
