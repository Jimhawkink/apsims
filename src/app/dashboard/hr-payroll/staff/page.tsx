'use client';

// ════════════════════════════════════════════════════════════════════════════
//  ALPHA STAFF DIRECTORY — ULTRA PREMIUM EDITION
//  Design System: Obsidian · Luxury HR · Beats Zeraki
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUsers, FiUserPlus, FiSearch, FiDownload, FiEdit2, FiTrash2,
    FiX, FiSave, FiPhone, FiMail, FiRefreshCw, FiEye,
    FiChevronLeft, FiChevronRight, FiBriefcase, FiUserCheck,
    FiFilter, FiDollarSign, FiCalendar, FiShield, FiAward,
    FiActivity, FiTrendingUp, FiMapPin, FiBook, FiCheckCircle,
    FiAlertCircle, FiClock, FiHash, FiGrid, FiList, FiStar,
    FiPrinter, FiChevronDown, FiLayers, FiZap, FiBarChart2,
    FiMoreVertical, FiSliders, FiCheck, FiInfo,
} from 'react-icons/fi';
import { HiSparkles, HiAcademicCap } from 'react-icons/hi2';

// ─── Types ───────────────────────────────────────────────────────────────────
type StaffType = 'teacher' | 'support' | 'subordinate';
type ViewMode = 'grid' | 'list';

interface StaffMember {
    id: number; staff_no?: string; tsc_number?: string;
    first_name: string; last_name: string; middle_name?: string;
    email?: string; phone?: string; gender: string;
    id_number?: string; qualification?: string;
    department?: string; designation?: string; role?: string;
    basic_salary: number; status: string;
    date_of_employment?: string; date_hired?: string; employment_date?: string;
    employment_type?: string; contract_type?: string;
    bank_name?: string; bank_account?: string; kra_pin?: string;
    nhif_no?: string; nssf_no?: string;
    emergency_contact_name?: string; emergency_contact_phone?: string;
    county?: string; nationality?: string; specialization?: string;
    notes?: string; created_at: string;
    _type: StaffType; _typeLabel: string;
}

interface FormState {
    first_name: string; last_name: string; middle_name: string;
    email: string; phone: string; gender: string;
    id_number: string; qualification: string;
    department: string; designation: string; role: string;
    basic_salary: number; status: string; staff_no: string;
    tsc_number: string; date_of_employment: string;
    employment_type: string; contract_type: string;
    bank_name: string; bank_account: string; kra_pin: string;
    nhif_no: string; nssf_no: string; specialization: string;
    county: string; nationality: string;
    emergency_contact_name: string; emergency_contact_phone: string; notes: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const TOKENS = {
    teacher: { label: 'TSC Teacher', gradient: 'linear-gradient(135deg,#1e40af,#3b82f6)', pill: '#dbeafe', pillText: '#1d4ed8', glow: '#3b82f620', dot: '#3b82f6' },
    support: { label: 'Support Teacher', gradient: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', pill: '#ede9fe', pillText: '#6d28d9', glow: '#8b5cf620', dot: '#8b5cf6' },
    subordinate: { label: 'Support Staff', gradient: 'linear-gradient(135deg,#92400e,#f59e0b)', pill: '#fef3c7', pillText: '#92400e', glow: '#f59e0b20', dot: '#f59e0b' },
};

const STATUS_META: Record<string, { color: string; bg: string; border: string; icon: any; glyph: string }> = {
    'Active': { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', icon: FiCheckCircle, glyph: '●' },
    'Inactive': { color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', icon: FiAlertCircle, glyph: '○' },
    'On Leave': { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: FiClock, glyph: '◐' },
    'Terminated': { color: '#dc2626', bg: '#fff1f2', border: '#fca5a5', icon: FiX, glyph: '✕' },
};

// 12 rich avatar palettes — dark bg + vivid fg for initials contrast
const PALETTES = [
    ['#0f2044', '#60a5fa'], ['#1a0a38', '#c084fc'], ['#0a2e1a', '#4ade80'],
    ['#2d0a0a', '#f87171'], ['#0a1f2e', '#38bdf8'], ['#2d1a00', '#fb923c'],
    ['#1a1a2e', '#818cf8'], ['#0e2f2f', '#2dd4bf'], ['#2e1a2e', '#e879f9'],
    ['#1f2e0a', '#a3e635'], ['#2e2a0a', '#facc15'], ['#0a2233', '#67e8f9'],
];
const pal = (id: number) => PALETTES[id % PALETTES.length];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
const initials = (s: StaffMember) => `${(s.first_name[0] || '')}${(s.last_name[0] || '')}`.toUpperCase();
const fullName = (s: StaffMember) => [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
const yrs = (d?: string) => {
    if (!d) return '—';
    const y = Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000));
    return y < 1 ? '< 1 yr' : `${y} yr${y !== 1 ? 's' : ''}`;
};
const emptyForm: FormState = {
    first_name: '', last_name: '', middle_name: '', email: '', phone: '',
    gender: 'Male', id_number: '', qualification: '', department: '',
    designation: '', role: '', basic_salary: 0, status: 'Active',
    staff_no: '', tsc_number: '', date_of_employment: '',
    employment_type: 'Permanent', contract_type: 'Contract',
    bank_name: '', bank_account: '', kra_pin: '', nhif_no: '', nssf_no: '',
    specialization: '', county: '', nationality: 'Kenyan',
    emergency_contact_name: '', emergency_contact_phone: '', notes: '',
};

// ════════════════════════════════════════════════════════════════════════════
//  PRIMITIVE COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

/** Rich avatar with shimmer ring */
function Avatar({ staff, size = 42 }: { staff: StaffMember; size?: number }) {
    const [bg, fg] = pal(staff.id);
    const fs = Math.round(size * 0.36);
    const r = Math.round(size * 0.3);
    return (
        <div style={{
            width: size, height: size, borderRadius: r, flexShrink: 0,
            background: `linear-gradient(145deg,${bg},${fg}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: fg, fontWeight: 900, fontSize: fs, letterSpacing: -0.5,
            fontFamily: "'DM Mono','Courier New',monospace",
            boxShadow: `0 0 0 2px ${fg}30, 0 2px 8px ${bg}60`,
        }}>
            {initials(staff)}
        </div>
    );
}

/** Type pill */
function TypePill({ type }: { type: StaffType }) {
    const t = TOKENS[type];
    return (
        <span style={{
            background: t.pill, color: t.pillText, fontSize: 10, fontWeight: 800,
            padding: '3px 10px', borderRadius: 99, letterSpacing: '0.04em',
            border: `1px solid ${t.pillText}22`, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap',
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.dot, display: 'inline-block' }} />
            {t.label}
        </span>
    );
}

/** Status pill */
function StatusPill({ status }: { status: string }) {
    const m = STATUS_META[status] || STATUS_META['Inactive'];
    const Icon = m.icon;
    return (
        <span style={{
            background: m.bg, color: m.color, fontSize: 10, fontWeight: 800,
            padding: '3px 9px', borderRadius: 99, letterSpacing: '0.03em',
            border: `1px solid ${m.border}`, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
            <Icon size={9} /> {status}
        </span>
    );
}

/** Ultra stat card — animated number reveal, shimmer accent, micro-chart suggestion */
function UltraStatCard({ label, value, icon: Icon, color, sub, accent, index = 0 }: {
    label: string; value: string | number; icon: any; color: string;
    sub?: string; accent?: string; index?: number;
}) {
    return (
        <div style={{
            background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9',
            padding: '20px 22px', position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: 4,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            animationDelay: `${index * 60}ms`,
        }}
            className="alpha-stat-card"
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${color}18, 0 2px 8px rgba(0,0,0,0.06)`;
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)';
            }}
        >
            {/* Accent blob */}
            <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                borderRadius: '50%', background: color, opacity: 0.06, pointerEvents: 'none',
            }} />
            {/* Top bar accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg,${color},${color}88,transparent)`,
                borderRadius: '20px 20px 0 0',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '6px 0 0', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
                    {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: '5px 0 0', fontWeight: 600 }}>{sub}</p>}
                </div>
                <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 2,
                }}>
                    <Icon size={18} style={{ color }} />
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  ULTRA STAFF CARD (Grid view)
// ════════════════════════════════════════════════════════════════════════════
function UltraStaffCard({ staff, onEdit, onDelete, onView }: {
    staff: StaffMember; onEdit: () => void; onDelete: () => void; onView: () => void;
}) {
    const [bg, fg] = pal(staff.id);
    const tok = TOKENS[staff._type];
    const sm = STATUS_META[staff.status] || STATUS_META['Inactive'];
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: '#fff', borderRadius: 22, border: '1px solid #e8edf4',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: hovered
                    ? `0 12px 40px ${fg}22, 0 4px 12px rgba(0,0,0,0.06)`
                    : '0 1px 4px rgba(0,0,0,0.04)',
                transform: hovered ? 'translateY(-3px)' : 'none',
                transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)',
            }}
        >
            {/* ── Banner ── */}
            <div style={{
                height: 56, position: 'relative', overflow: 'hidden',
                background: `linear-gradient(135deg,${bg},${fg}88)`,
            }}>
                {/* Dot pattern */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }} xmlns="http://www.w3.org/2000/svg">
                    <pattern id={`dp-${staff.id}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.2" fill="#fff" />
                    </pattern>
                    <rect width="100%" height="100%" fill={`url(#dp-${staff.id})`} />
                </svg>
                {/* Status dot top-right */}
                <div style={{
                    position: 'absolute', top: 10, right: 12,
                    width: 8, height: 8, borderRadius: '50%',
                    background: sm.color, boxShadow: `0 0 0 2px #fff`,
                }} />
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '0 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Avatar row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -22, marginBottom: 10 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 15, flexShrink: 0,
                        background: `linear-gradient(145deg,${bg},${fg})`,
                        border: '3px solid #fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: fg, fontWeight: 900, fontSize: 17,
                        letterSpacing: -0.5, fontFamily: "'DM Mono','Courier New',monospace",
                        boxShadow: `0 4px 12px ${bg}60`,
                    }}>
                        {initials(staff)}
                    </div>

                    {/* Action buttons — visible on hover */}
                    <div style={{
                        display: 'flex', gap: 5, opacity: hovered ? 1 : 0,
                        transform: hovered ? 'translateY(0)' : 'translateY(4px)',
                        transition: 'all 0.2s',
                    }}>
                        {[
                            { icon: FiEye, color: '#3b82f6', bg: '#eff6ff', fn: onView, title: 'View' },
                            { icon: FiEdit2, color: '#6366f1', bg: '#eef2ff', fn: onEdit, title: 'Edit' },
                            { icon: FiTrash2, color: '#ef4444', bg: '#fff1f2', fn: onDelete, title: 'Delete' },
                        ].map(({ icon: Ic, color, bg: ibg, fn, title }) => (
                            <button key={title} onClick={fn} title={title} style={{
                                width: 30, height: 30, borderRadius: 9,
                                background: ibg, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color, transition: 'transform 0.15s',
                            }}
                                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
                                onMouseLeave={e => (e.currentTarget.style.transform = '')}
                            >
                                <Ic size={13} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Name + role */}
                <p style={{ fontWeight: 900, fontSize: 14, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    {staff.first_name} {staff.last_name}
                </p>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, margin: '3px 0 8px' }}>
                    {staff.designation || staff.role || staff.department || tok.label}
                </p>

                {/* Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    <TypePill type={staff._type} />
                    <StatusPill status={staff.status} />
                </div>

                {/* Info rows */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {staff.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiPhone size={10} color="#94a3b8" />
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{staff.phone}</span>
                        </div>
                    )}
                    {staff.department && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiBriefcase size={10} color="#94a3b8" />
                            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{staff.department}</span>
                        </div>
                    )}
                    {(staff.staff_no || staff.tsc_number) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiHash size={10} color="#94a3b8" />
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, fontFamily: "'DM Mono','Courier New',monospace" }}>
                                {staff.staff_no || staff.tsc_number}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer: salary + tenure */}
                <div style={{
                    marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <span style={{
                        fontSize: 13, fontWeight: 900, color: '#059669',
                        fontFamily: "'DM Mono','Courier New',monospace",
                        letterSpacing: '-0.02em',
                    }}>
                        {fmt(staff.basic_salary)}
                    </span>
                    <span style={{
                        fontSize: 10, color: '#94a3b8', fontWeight: 700,
                        background: '#f8fafc', borderRadius: 6, padding: '2px 8px',
                    }}>
                        {yrs(staff.date_of_employment || staff.date_hired || staff.employment_date)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  MODAL WRAPPER — frosted glass, cinematic backdrop
// ════════════════════════════════════════════════════════════════════════════
function Modal({ open, onClose, title, children, size = 'md' }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl';
}) {
    if (!open) return null;
    const maxW = { md: 560, lg: 720, xl: 960 }[size];
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, background: 'rgba(2,6,23,0.75)',
            backdropFilter: 'blur(12px)',
        }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: '#fff', borderRadius: 28, width: '100%', maxWidth: maxW,
                display: 'flex', flexDirection: 'column', maxHeight: '93vh',
                boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
                animation: 'alphModalIn 0.24s cubic-bezier(.34,1.56,.64,1)',
                border: '1px solid rgba(255,255,255,0.12)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px 18px', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        {title}
                    </h2>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: '50%', border: 'none',
                        background: '#f1f5f9', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: '#64748b',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => { (e.currentTarget.style.background = '#fee2e2'); (e.currentTarget.style.color = '#dc2626'); }}
                        onMouseLeave={e => { (e.currentTarget.style.background = '#f1f5f9'); (e.currentTarget.style.color = '#64748b'); }}
                    >
                        <FiX size={14} />
                    </button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 24px' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  STAFF DETAIL MODAL — luxury profile card
// ════════════════════════════════════════════════════════════════════════════
function StaffDetailModal({ staff, onClose, onEdit }: {
    staff: StaffMember; onClose: () => void; onEdit: () => void;
}) {
    const [bg, fg] = pal(staff.id);
    const tok = TOKENS[staff._type];

    const Section = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
        <div style={{
            background: '#fafbfc', border: '1px solid #f1f5f9',
            borderRadius: 18, padding: '16px 18px', marginBottom: 14,
        }}>
            <p style={{
                margin: '0 0 12px', fontSize: 10, fontWeight: 900, color,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                <span style={{ width: 16, height: 2, borderRadius: 1, background: color, display: 'inline-block' }} />
                {title}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                {children}
            </div>
        </div>
    );

    const Field = ({ label, value }: { label: string; value?: string | number }) => (
        <div>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: value ? '#1e293b' : '#cbd5e1' }}>
                {value || '—'}
            </p>
        </div>
    );

    return (
        <div>
            {/* Hero banner */}
            <div style={{
                borderRadius: 20, overflow: 'hidden', marginBottom: 18,
                background: `linear-gradient(135deg,${bg},${fg}99)`,
                padding: '22px 22px 20px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{
                        width: 68, height: 68, borderRadius: 18,
                        background: 'rgba(255,255,255,0.18)',
                        border: '2px solid rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: -1,
                        fontFamily: "'DM Mono','Courier New',monospace",
                        flexShrink: 0,
                    }}>
                        {initials(staff)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                            {fullName(staff)}
                        </p>
                        <p style={{ margin: '3px 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}>
                            {staff.designation || staff.role || staff.department || tok.label}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[staff._typeLabel, staff.status].map(tag => (
                                <span key={tag} style={{
                                    background: 'rgba(255,255,255,0.2)', color: '#fff',
                                    fontSize: 10, fontWeight: 800, padding: '3px 10px',
                                    borderRadius: 99, letterSpacing: '0.04em',
                                    border: '1px solid rgba(255,255,255,0.25)',
                                }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', color: '#fff' }}>
                        <p style={{ margin: 0, fontSize: 10, opacity: 0.65, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Basic Salary</p>
                        <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', fontFamily: "'DM Mono','Courier New',monospace" }}>
                            {fmt(staff.basic_salary)}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.6, fontWeight: 600 }}>
                            {yrs(staff.date_of_employment || staff.date_hired || staff.employment_date)} service
                        </p>
                    </div>
                </div>
            </div>

            <Section title="Personal Information" color="#6366f1">
                <Field label="Staff No" value={staff.staff_no} />
                <Field label="ID Number" value={staff.id_number} />
                <Field label="Gender" value={staff.gender} />
                <Field label="Nationality" value={staff.nationality} />
                <Field label="County" value={staff.county} />
                <Field label="TSC Number" value={staff.tsc_number} />
                <Field label="Phone" value={staff.phone} />
                <Field label="Email" value={staff.email} />
            </Section>

            <Section title="Employment Details" color="#059669">
                <Field label="Department" value={staff.department} />
                <Field label="Designation" value={staff.designation || staff.role} />
                <Field label="Qualification" value={staff.qualification} />
                <Field label="Specialization" value={staff.specialization} />
                <Field label="Employment Type" value={staff.employment_type || staff.contract_type} />
                <Field label="Date Employed" value={staff.date_of_employment || staff.date_hired || staff.employment_date} />
            </Section>

            <Section title="Payroll & Banking" color="#0ea5e9">
                <Field label="Bank Name" value={staff.bank_name} />
                <Field label="Bank Account" value={staff.bank_account} />
                <Field label="KRA PIN" value={staff.kra_pin} />
                <Field label="NHIF No" value={staff.nhif_no} />
                <Field label="NSSF No" value={staff.nssf_no} />
            </Section>

            <Section title="Emergency Contact" color="#f59e0b">
                <Field label="Contact Name" value={staff.emergency_contact_name} />
                <Field label="Contact Phone" value={staff.emergency_contact_phone} />
            </Section>

            {staff.notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 900, color: '#b45309', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notes</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#78350f', fontWeight: 600, lineHeight: 1.5 }}>{staff.notes}</p>
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={onClose} style={{
                    flex: 1, padding: '12px 0', borderRadius: 14, border: '1.5px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800,
                    color: '#475569', transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                    Close
                </button>
                <button onClick={onEdit} style={{
                    flex: 2, padding: '12px 0', borderRadius: 14, border: 'none',
                    background: tok.gradient, cursor: 'pointer', fontSize: 13, fontWeight: 900,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 7, fontFamily: 'inherit', boxShadow: `0 4px 16px ${TOKENS[staff._type].dot}40`,
                }}>
                    <FiEdit2 size={13} /> Edit Staff Member
                </button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  STAFF FORM — ultra input system
// ════════════════════════════════════════════════════════════════════════════
function StaffForm({ form, setForm, staffType, setStaffType, isEdit, onSave, onClose, saving }: {
    form: FormState; setForm: (f: FormState) => void; staffType: StaffType;
    setStaffType: (t: StaffType) => void; isEdit: boolean;
    onSave: () => void; onClose: () => void; saving: boolean;
}) {
    const inp: React.CSSProperties = {
        width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0',
        borderRadius: 12, padding: '10px 13px', fontSize: 13, fontWeight: 600,
        color: '#1e293b', outline: 'none', fontFamily: 'inherit',
        transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
    };
    const lbl: React.CSSProperties = {
        fontSize: 9, fontWeight: 900, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        display: 'block', marginBottom: 5,
    };

    const SecHead = ({ label, color }: { label: string; color: string }) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: color }} />
            <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
        </div>
    );

    const F = (label: string, field: keyof FormState, type = 'text', opts?: string[]) => (
        <div key={field as string}>
            <label style={lbl}>{label}</label>
            {opts ? (
                <select value={form[field] as string} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    style={inp}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #6366f115'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                >
                    {opts.map(o => <option key={o}>{o}</option>)}
                </select>
            ) : (
                <input type={type} value={form[field] as string}
                    onChange={e => setForm({ ...form, [field]: type === 'number' ? Number(e.target.value) : e.target.value })}
                    style={inp}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #6366f115'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
            )}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Staff type selector */}
            {!isEdit && (
                <div style={{ background: '#f1f5f9', borderRadius: 16, padding: 5, display: 'flex', gap: 4 }}>
                    {(Object.entries(TOKENS) as [StaffType, typeof TOKENS.teacher][]).map(([key, t]) => (
                        <button key={key} onClick={() => setStaffType(key)} style={{
                            flex: 1, padding: '10px 8px', borderRadius: 12, border: 'none',
                            cursor: 'pointer', fontSize: 11, fontWeight: 900,
                            transition: 'all 0.2s',
                            background: staffType === key ? t.gradient : 'transparent',
                            color: staffType === key ? '#fff' : '#64748b',
                            boxShadow: staffType === key ? `0 4px 12px ${t.dot}40` : 'none',
                            fontFamily: 'inherit',
                        }}>
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Personal */}
            <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 18, padding: '16px 18px' }}>
                <SecHead label="Personal Information" color="#6366f1" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {F('First Name *', 'first_name')}
                    {F('Middle Name', 'middle_name')}
                    {F('Last Name *', 'last_name')}
                    {F('Gender', 'gender', 'text', ['Male', 'Female'])}
                    {F('ID Number', 'id_number')}
                    {F('Nationality', 'nationality', 'text', ['Kenyan', 'Ugandan', 'Tanzanian', 'Other'])}
                    {F('County', 'county')}
                    {F('Phone', 'phone', 'tel')}
                    {F('Email', 'email', 'email')}
                </div>
            </div>

            {/* Employment */}
            <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 18, padding: '16px 18px' }}>
                <SecHead label="Employment Details" color="#059669" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {F('Staff No', 'staff_no')}
                    {staffType === 'teacher' && F('TSC Number', 'tsc_number')}
                    {F('Qualification', 'qualification')}
                    {staffType !== 'subordinate' ? F('Department', 'department') : F('Role / Position', 'role')}
                    {staffType === 'teacher' && F('Designation', 'designation')}
                    {F('Specialization', 'specialization')}
                    {staffType === 'support'
                        ? F('Contract Type', 'contract_type', 'text', ['Contract', 'Part-time', 'Temporary'])
                        : F('Employment Type', 'employment_type', 'text', ['Permanent', 'Contract', 'Intern'])}
                    {F('Date Employed', 'date_of_employment', 'date')}
                    {F('Status', 'status', 'text', ['Active', 'Inactive', 'On Leave', 'Terminated'])}
                </div>
            </div>

            {/* Payroll */}
            <div style={{ background: '#fafbfc', border: '1px solid #f1f5f9', borderRadius: 18, padding: '16px 18px' }}>
                <SecHead label="Salary & Banking" color="#0ea5e9" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                        <label style={lbl}>Basic Salary (KES)</label>
                        <input type="number" min="0" value={form.basic_salary || ''}
                            onChange={e => setForm({ ...form, basic_salary: Number(e.target.value) })}
                            style={inp}
                            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #6366f115'; }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                    {F('Bank Name', 'bank_name')}
                    {F('Bank Account No', 'bank_account')}
                    {F('KRA PIN', 'kra_pin')}
                    {F('NHIF No', 'nhif_no')}
                    {F('NSSF No', 'nssf_no')}
                </div>
            </div>

            {/* Emergency */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 18, padding: '16px 18px' }}>
                <SecHead label="Emergency Contact & Notes" color="#d97706" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {F('Contact Name', 'emergency_contact_name')}
                    {F('Contact Phone', 'emergency_contact_phone', 'tel')}
                </div>
                <div>
                    <label style={lbl}>Notes</label>
                    <textarea value={form.notes} rows={2}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        placeholder="Any additional notes..."
                        style={{ ...inp, resize: 'none' }}
                        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#6366f1'; }}
                        onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#e2e8f0'; }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{
                    flex: 1, padding: '13px 0', borderRadius: 14,
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#475569',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                    Cancel
                </button>
                <button onClick={onSave} disabled={saving} style={{
                    flex: 2, padding: '13px 0', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 900, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
                    boxShadow: '0 4px 16px #6366f140', transition: 'all 0.15s',
                }}>
                    {saving ? (
                        <>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'alphSpin 0.7s linear infinite' }} />
                            Saving…
                        </>
                    ) : (
                        <><FiSave size={14} /> {isEdit ? 'Update Staff Member' : 'Add Staff Member'}</>
                    )}
                </button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function StaffDirectoryPage() {
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | StaffType>('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterGender, setFilterGender] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortField, setSortField] = useState('first_name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const perPage = 20;

    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingType, setEditingType] = useState<StaffType>('teacher');
    const [newStaffType, setNewStaffType] = useState<StaffType>('teacher');
    const [form, setForm] = useState<FormState>({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const [t, s, sub] = await Promise.all([
                supabase.from('school_teachers').select('*').order('first_name'),
                supabase.from('school_support_teachers').select('*').order('first_name'),
                supabase.from('school_subordinate_staff').select('*').order('first_name'),
            ]);
            const merge = (data: any[], type: StaffType, label: string): StaffMember[] =>
                (data || []).map(r => ({ ...r, basic_salary: Number(r.basic_salary || 0), _type: type, _typeLabel: label }));
            setAllStaff([
                ...merge(t.data || [], 'teacher', 'TSC Teacher'),
                ...merge(s.data || [], 'support', 'Support Teacher'),
                ...merge(sub.data || [], 'subordinate', 'Support Staff'),
            ]);
        } catch { toast.error('Failed to load staff'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total: allStaff.length,
        active: allStaff.filter(s => s.status === 'Active').length,
        teachers: allStaff.filter(s => s._type === 'teacher').length,
        support: allStaff.filter(s => s._type === 'support').length,
        subordinate: allStaff.filter(s => s._type === 'subordinate').length,
        male: allStaff.filter(s => s.gender === 'Male').length,
        female: allStaff.filter(s => s.gender === 'Female').length,
        wageBill: allStaff.reduce((sum, s) => sum + s.basic_salary, 0),
        onLeave: allStaff.filter(s => s.status === 'On Leave').length,
    }), [allStaff]);

    // ── Filter + Sort ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let r = allStaff.filter(s => {
            if (filterType !== 'all' && s._type !== filterType) return false;
            if (filterStatus !== 'all' && s.status !== filterStatus) return false;
            if (filterGender !== 'all' && s.gender !== filterGender) return false;
            if (search) {
                const q = search.toLowerCase();
                return [s.first_name, s.last_name, s.staff_no, s.email, s.phone, s.department, s.tsc_number, s.id_number]
                    .some(v => v?.toLowerCase().includes(q));
            }
            return true;
        });
        r.sort((a: any, b: any) => {
            const av = a[sortField] ?? ''; const bv = b[sortField] ?? '';
            if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
            return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
        return r;
    }, [allStaff, filterType, filterStatus, filterGender, search, sortField, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const pageData = filtered.slice((page - 1) * perPage, page * perPage);

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const openAdd = () => { setEditingId(null); setNewStaffType('teacher'); setForm({ ...emptyForm }); setShowForm(true); };
    const openEdit = (s: StaffMember) => {
        setEditingId(s.id); setEditingType(s._type); setNewStaffType(s._type);
        setForm({
            first_name: s.first_name, last_name: s.last_name, middle_name: s.middle_name || '',
            email: s.email || '', phone: s.phone || '', gender: s.gender,
            id_number: s.id_number || '', qualification: s.qualification || '',
            department: s.department || '', designation: s.designation || '',
            role: s.role || '', basic_salary: s.basic_salary, status: s.status,
            staff_no: s.staff_no || '', tsc_number: s.tsc_number || '',
            date_of_employment: s.date_of_employment || s.date_hired || s.employment_date || '',
            employment_type: s.employment_type || 'Permanent',
            contract_type: s.contract_type || 'Contract',
            bank_name: s.bank_name || '', bank_account: s.bank_account || '',
            kra_pin: s.kra_pin || '', nhif_no: s.nhif_no || '', nssf_no: s.nssf_no || '',
            specialization: s.specialization || '',
            county: s.county || '', nationality: s.nationality || 'Kenyan',
            emergency_contact_name: s.emergency_contact_name || '',
            emergency_contact_phone: s.emergency_contact_phone || '', notes: s.notes || '',
        });
        setShowForm(true);
    };
    const openView = (s: StaffMember) => { setViewStaff(s); setShowDetail(true); };

    const handleDelete = async (s: StaffMember) => {
        if (!confirm(`Delete ${s.first_name} ${s.last_name}? This cannot be undone.`)) return;
        const table = s._type === 'teacher' ? 'school_teachers' : s._type === 'support' ? 'school_support_teachers' : 'school_subordinate_staff';
        const { error } = await supabase.from(table).delete().eq('id', s.id);
        if (error) toast.error('Delete failed: ' + error.message);
        else { toast.success('Staff member deleted'); fetchStaff(); }
    };

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) return toast.error('First and last name are required');
        setSaving(true);
        const type = editingId ? editingType : newStaffType;
        const table = type === 'teacher' ? 'school_teachers' : type === 'support' ? 'school_support_teachers' : 'school_subordinate_staff';
        const payload: any = {
            first_name: form.first_name.trim(), last_name: form.last_name.trim(),
            middle_name: form.middle_name || null, email: form.email || null,
            phone: form.phone || null, gender: form.gender,
            id_number: form.id_number || null, qualification: form.qualification || null,
            department: form.department || null, designation: form.designation || null,
            role: form.role || null, basic_salary: form.basic_salary,
            status: form.status, staff_no: form.staff_no || null,
            bank_name: form.bank_name || null, bank_account: form.bank_account || null,
            kra_pin: form.kra_pin || null, nhif_no: form.nhif_no || null,
            nssf_no: form.nssf_no || null, notes: form.notes || null,
            emergency_contact_name: form.emergency_contact_name || null,
            emergency_contact_phone: form.emergency_contact_phone || null,
            county: form.county || null, nationality: form.nationality || null,
            specialization: form.specialization || null,
        };
        if (type === 'teacher') { payload.tsc_number = form.tsc_number || null; payload.employment_type = form.employment_type; payload.date_of_employment = form.date_of_employment || null; }
        if (type === 'support') { payload.contract_type = form.contract_type; payload.date_hired = form.date_of_employment || null; }
        if (type === 'subordinate') { payload.date_hired = form.date_of_employment || null; }

        const { error } = editingId
            ? await supabase.from(table).update(payload).eq('id', editingId)
            : await supabase.from(table).insert(payload);
        setSaving(false);
        if (error) toast.error('Save failed: ' + error.message);
        else { toast.success(editingId ? 'Staff updated!' : 'Staff added!'); setShowForm(false); fetchStaff(); }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const rows = [
            ['Name', 'Type', 'Staff No', 'TSC No', 'Gender', 'Phone', 'Email', 'Department', 'Designation', 'Status', 'Basic Salary', 'Bank', 'KRA PIN', 'NHIF', 'NSSF'],
            ...filtered.map(s => [`${s.first_name} ${s.last_name}`, s._typeLabel, s.staff_no, s.tsc_number, s.gender, s.phone, s.email, s.department, s.designation || s.role, s.status, s.basic_salary, s.bank_name, s.kra_pin, s.nhif_no, s.nssf_no]),
        ];
        const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `staff_register_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const handleSort = (f: string) => {
        if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(f); setSortDir('asc'); }
    };
    const SortIcon = ({ f }: { f: string }) => {
        if (sortField !== f) return <span style={{ opacity: 0.25, marginLeft: 3 }}>↕</span>;
        return <span style={{ marginLeft: 3, color: '#6366f1' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    // ── Loading State ─────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 16px' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #f1f5f9' }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#6366f1', animation: 'alphSpin 0.8s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#a78bfa', animation: 'alphSpin 1.2s linear infinite reverse' }} />
                </div>
                <p style={{ fontWeight: 900, fontSize: 13, color: '#475569', margin: 0, letterSpacing: '-0.01em' }}>Loading Staff Directory…</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 600 }}>Alpha School ERP</p>
            </div>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <style>{`
                @keyframes alphModalIn { from { opacity:0; transform:scale(0.95) translateY(12px); } to { opacity:1; transform:none; } }
                @keyframes alphSpin    { to { transform:rotate(360deg); } }
                @keyframes alphFadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
                .alpha-stat-card { animation: alphFadeUp 0.35s ease both; }
                .alpha-row:hover td { background: #f8f7ff !important; }
                .alpha-sort:hover { color: #6366f1 !important; cursor: pointer; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
                .alpha-tab-btn:hover { background: #f1f5f9 !important; }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>

                {/* ════════════════════════════════════════
                    HEADER — cinematic title bar
                ════════════════════════════════════════ */}
                <div style={{
                    background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)',
                    borderRadius: 24, padding: '22px 28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 14,
                    boxShadow: '0 8px 32px rgba(15,23,42,0.25)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Background grid */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                        <pattern id="hgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#fff" strokeWidth="0.5" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#hgrid)" />
                    </svg>
                    {/* Glow orb */}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,#6366f160,transparent 70%)', pointerEvents: 'none' }} />

                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 16px #6366f150',
                            }}>
                                <FiUsers size={20} color="#fff" />
                            </div>
                            <div>
                                <h1 style={{
                                    margin: 0, fontSize: 22, fontWeight: 900, color: '#fff',
                                    letterSpacing: '-0.04em', lineHeight: 1,
                                }}>
                                    Staff Directory
                                </h1>
                                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                    TSC Teachers · Support Staff · Subordinates · HR Records
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
                        {/* View toggle */}
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, gap: 3 }}>
                            {(['list', 'grid'] as ViewMode[]).map(v => (
                                <button key={v} onClick={() => setViewMode(v)} style={{
                                    padding: '7px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                    background: viewMode === v ? 'rgba(255,255,255,0.15)' : 'transparent',
                                    color: viewMode === v ? '#fff' : 'rgba(255,255,255,0.45)',
                                    transition: 'all 0.15s', display: 'flex', alignItems: 'center',
                                }}>
                                    {v === 'list' ? <FiList size={14} /> : <FiGrid size={14} />}
                                </button>
                            ))}
                        </div>

                        <button onClick={fetchStaff} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '9px 14px', borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                            transition: 'all 0.15s',
                        }}>
                            <FiRefreshCw size={13} /> Refresh
                        </button>

                        <button onClick={exportCSV} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '9px 14px', borderRadius: 12,
                            border: '1px solid rgba(99,102,241,0.5)',
                            background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                            transition: 'all 0.15s',
                        }}>
                            <FiDownload size={13} /> Export
                        </button>

                        <button onClick={openAdd} style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '10px 18px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 900,
                            fontFamily: 'inherit', boxShadow: '0 4px 16px #6366f140',
                            transition: 'all 0.15s',
                        }}>
                            <FiUserPlus size={14} /> Add Staff
                        </button>
                    </div>
                </div>

                {/* ════════════════════════════════════════
                    ULTRA STAT CARDS
                ════════════════════════════════════════ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                    <UltraStatCard index={0} label="Total Staff" value={stats.total} icon={FiUsers} color="#6366f1" sub={`${stats.active} Active · ${stats.onLeave} On Leave`} />
                    <UltraStatCard index={1} label="TSC Teachers" value={stats.teachers} icon={HiAcademicCap} color="#3b82f6" sub={`${stats.support} Support Teachers`} />
                    <UltraStatCard index={2} label="Support Staff" value={stats.subordinate} icon={FiBriefcase} color="#f59e0b" sub={`${stats.female}♀ · ${stats.male}♂`} />
                    <UltraStatCard index={3} label="Monthly Wage Bill" value={fmt(stats.wageBill)} icon={FiTrendingUp} color="#059669" sub="Basic salaries only" />
                </div>

                {/* ════════════════════════════════════════
                    TYPE FILTER TABS — premium pill row
                ════════════════════════════════════════ */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {([
                        ['all', 'All Staff', stats.total, '#6366f1', 'linear-gradient(135deg,#6366f1,#8b5cf6)'],
                        ['teacher', 'TSC Teachers', stats.teachers, '#3b82f6', 'linear-gradient(135deg,#1e40af,#3b82f6)'],
                        ['support', 'Support Teachers', stats.support, '#8b5cf6', 'linear-gradient(135deg,#5b21b6,#8b5cf6)'],
                        ['subordinate', 'Support Staff', stats.subordinate, '#f59e0b', 'linear-gradient(135deg,#92400e,#f59e0b)'],
                    ] as [string, string, number, string, string][]).map(([v, label, count, col, grad]) => {
                        const active = filterType === v;
                        return (
                            <button key={v} className="alpha-tab-btn" onClick={() => { setFilterType(v as any); setPage(1); }} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '9px 16px', borderRadius: 14,
                                border: active ? 'none' : '1.5px solid #e8edf4',
                                background: active ? grad : '#fff',
                                color: active ? '#fff' : '#475569',
                                cursor: 'pointer', fontSize: 12, fontWeight: 900,
                                fontFamily: 'inherit', transition: 'all 0.2s',
                                boxShadow: active ? `0 4px 14px ${col}40` : '0 1px 3px rgba(0,0,0,0.04)',
                                transform: active ? 'translateY(-1px)' : 'none',
                            }}>
                                {label}
                                <span style={{
                                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 900,
                                    background: active ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                    color: active ? '#fff' : '#64748b',
                                    minWidth: 22, textAlign: 'center',
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>
                        {filtered.length} of {allStaff.length} staff
                    </div>
                </div>

                {/* ════════════════════════════════════════
                    SEARCH & FILTER BAR
                ════════════════════════════════════════ */}
                <div style={{
                    background: '#fff', borderRadius: 18, border: '1px solid #f1f5f9',
                    padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center',
                    flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                        <FiSearch size={13} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search by name, staff no, TSC, email, phone…"
                            style={{
                                width: '100%', paddingLeft: 36, paddingRight: search ? 34 : 12,
                                paddingTop: 10, paddingBottom: 10,
                                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                                borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#1e293b',
                                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                                transition: 'border-color 0.15s, box-shadow 0.15s',
                            }}
                            onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #6366f115'; }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} style={{
                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                                display: 'flex', alignItems: 'center',
                            }}>
                                <FiX size={13} />
                            </button>
                        )}
                    </div>

                    {/* Dropdowns */}
                    {[
                        { val: filterStatus, set: setFilterStatus, opts: [['all', 'All Statuses'], ['Active', 'Active'], ['Inactive', 'Inactive'], ['On Leave', 'On Leave'], ['Terminated', 'Terminated']] },
                        { val: filterGender, set: setFilterGender, opts: [['all', 'All Genders'], ['Male', 'Male'], ['Female', 'Female']] },
                    ].map(({ val, set, opts }, i) => (
                        <select key={i} value={val} onChange={e => { set(e.target.value); setPage(1); }}
                            style={{
                                padding: '10px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
                                borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#475569',
                                outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
                                transition: 'border-color 0.15s',
                            }}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        >
                            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    ))}
                </div>

                {/* ════════════════════════════════════════
                    GRID VIEW
                ════════════════════════════════════════ */}
                {viewMode === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 16 }}>
                        {pageData.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                <FiUsers size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                                <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>No staff found</p>
                            </div>
                        ) : pageData.map(s => (
                            <UltraStaffCard key={`${s._type}-${s.id}`} staff={s}
                                onEdit={() => openEdit(s)} onDelete={() => handleDelete(s)} onView={() => openView(s)} />
                        ))}
                    </div>
                )}

                {/* ════════════════════════════════════════
                    LIST VIEW — ultra table
                ════════════════════════════════════════ */}
                {viewMode === 'list' && (
                    <div style={{
                        background: '#fff', borderRadius: 22, border: '1px solid #f1f5f9',
                        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(to right,#fafbfc,#f8fafc)', borderBottom: '2px solid #f1f5f9' }}>
                                        {[
                                            { label: 'Staff Member', f: 'first_name', w: 220 },
                                            { label: 'Type', f: '', w: 130 },
                                            { label: 'Dept / Role', f: 'department', w: 150 },
                                            { label: 'Contact', f: '', w: 160 },
                                            { label: 'Status', f: '', w: 100 },
                                            { label: 'Salary', f: 'basic_salary', w: 120 },
                                            { label: 'IDs', f: '', w: 120 },
                                            { label: '', f: '', w: 90 },
                                        ].map(({ label, f, w }) => (
                                            <th key={label} className={f ? 'alpha-sort' : ''}
                                                onClick={f ? () => handleSort(f) : undefined}
                                                style={{
                                                    padding: '13px 14px', textAlign: 'left',
                                                    fontSize: 9, fontWeight: 900, color: '#94a3b8',
                                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                                    userSelect: 'none', whiteSpace: 'nowrap',
                                                    minWidth: w, cursor: f ? 'pointer' : 'default',
                                                    transition: 'color 0.15s',
                                                }}>
                                                {label}{f && <SortIcon f={f} />}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageData.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
                                            <FiUsers size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
                                            <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>No staff found matching your filters</p>
                                        </td></tr>
                                    ) : pageData.map((s, i) => {
                                        const [bg, fg] = pal(s.id);
                                        return (
                                            <tr key={`${s._type}-${s.id}`} className="alpha-row"
                                                style={{ borderTop: '1px solid #f8fafc', transition: 'background 0.12s' }}>
                                                {/* Name + avatar */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{
                                                            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                                                            background: `linear-gradient(145deg,${bg},${fg})`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: fg, fontWeight: 900, fontSize: 13,
                                                            letterSpacing: -0.5, fontFamily: "'DM Mono','Courier New',monospace",
                                                        }}>
                                                            {initials(s)}
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontWeight: 900, fontSize: 13, color: '#0f172a', lineHeight: 1.2 }}>
                                                                {s.first_name} {s.last_name}
                                                            </p>
                                                            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 700, fontFamily: "'DM Mono','Courier New',monospace" }}>
                                                                {s.staff_no || s.tsc_number || '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <TypePill type={s._type} />
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#334155' }}>{s.department || s.role || '—'}</p>
                                                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{s.designation || s.qualification || ''}</p>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    {s.phone && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                                            <FiPhone size={10} color="#94a3b8" />
                                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{s.phone}</span>
                                                        </div>
                                                    )}
                                                    {s.email && <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</p>}
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <StatusPill status={s.status} />
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 900, color: '#059669', fontFamily: "'DM Mono','Courier New',monospace", whiteSpace: 'nowrap' }}>
                                                        {fmt(s.basic_salary)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    {s.kra_pin && <p style={{ margin: '0 0 1px', fontSize: 9, fontWeight: 800, color: '#94a3b8', fontFamily: "'DM Mono','Courier New',monospace" }}>KRA: {s.kra_pin}</p>}
                                                    {s.nhif_no && <p style={{ margin: '0 0 1px', fontSize: 9, fontWeight: 800, color: '#94a3b8', fontFamily: "'DM Mono','Courier New',monospace" }}>NHIF: {s.nhif_no}</p>}
                                                    {s.nssf_no && <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#94a3b8', fontFamily: "'DM Mono','Courier New',monospace" }}>NSSF: {s.nssf_no}</p>}
                                                </td>
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ display: 'flex', gap: 5 }}>
                                                        {[
                                                            { icon: FiEye, color: '#3b82f6', bg: '#eff6ff', fn: () => openView(s), title: 'View' },
                                                            { icon: FiEdit2, color: '#6366f1', bg: '#eef2ff', fn: () => openEdit(s), title: 'Edit' },
                                                            { icon: FiTrash2, color: '#ef4444', bg: '#fff1f2', fn: () => handleDelete(s), title: 'Delete' },
                                                        ].map(({ icon: Ic, color, bg: ibg, fn, title }) => (
                                                            <button key={title} onClick={fn} title={title} style={{
                                                                width: 30, height: 30, borderRadius: 9, border: 'none',
                                                                background: ibg, cursor: 'pointer', color,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                transition: 'transform 0.12s',
                                                            }}
                                                                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                                                                onMouseLeave={e => (e.currentTarget.style.transform = '')}
                                                            >
                                                                <Ic size={12} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {pageData.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: 'linear-gradient(to right,#fafbfc,#f8fafc)', borderTop: '2px solid #f1f5f9' }}>
                                            <td colSpan={5} style={{ padding: '11px 14px', fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                                                Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length} staff members
                                            </td>
                                            <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 900, color: '#059669', fontFamily: "'DM Mono','Courier New',monospace", whiteSpace: 'nowrap' }}>
                                                {fmt(pageData.reduce((s, r) => s + r.basic_salary, 0))}
                                            </td>
                                            <td colSpan={2} style={{ padding: '11px 14px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>
                                                Page subtotal
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════
                    PAGINATION
                ════════════════════════════════════════ */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            style={{
                                width: 36, height: 36, borderRadius: 11, border: '1.5px solid #e2e8f0',
                                background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#64748b', opacity: page === 1 ? 0.4 : 1, transition: 'all 0.15s',
                            }}>
                            <FiChevronLeft size={14} />
                        </button>

                        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                            const active = page === p;
                            return (
                                <button key={p} onClick={() => setPage(p)} style={{
                                    width: 36, height: 36, borderRadius: 11,
                                    border: active ? 'none' : '1.5px solid #e2e8f0',
                                    background: active ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#fff',
                                    color: active ? '#fff' : '#475569',
                                    cursor: 'pointer', fontSize: 13, fontWeight: 900,
                                    transition: 'all 0.2s',
                                    boxShadow: active ? '0 4px 12px #6366f140' : 'none',
                                    fontFamily: 'inherit',
                                }}>
                                    {p}
                                </button>
                            );
                        })}

                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            style={{
                                width: 36, height: 36, borderRadius: 11, border: '1.5px solid #e2e8f0',
                                background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#64748b', opacity: page === totalPages ? 0.4 : 1, transition: 'all 0.15s',
                            }}>
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div style={{ paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700 }}>Alpha HR Engine · AlphaSchool ERP v2</span>
                    <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700 }}>{new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span>
                </div>
            </div>

            {/* ════════════════════════════════════════
                MODALS
            ════════════════════════════════════════ */}
            <Modal open={showForm} onClose={() => setShowForm(false)}
                title={editingId ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'} size="xl">
                <StaffForm
                    form={form} setForm={setForm}
                    staffType={editingId ? editingType : newStaffType}
                    setStaffType={setNewStaffType} isEdit={!!editingId}
                    onSave={handleSave} onClose={() => setShowForm(false)} saving={saving}
                />
            </Modal>

            <Modal open={showDetail} onClose={() => setShowDetail(false)} title="👤 Staff Profile" size="lg">
                {viewStaff && (
                    <StaffDetailModal staff={viewStaff}
                        onClose={() => setShowDetail(false)}
                        onEdit={() => { setShowDetail(false); openEdit(viewStaff); }}
                    />
                )}
            </Modal>
        </>
    );
}
