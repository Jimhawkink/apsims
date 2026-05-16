'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUsers, FiUserPlus, FiSearch, FiDownload, FiEdit2, FiTrash2,
    FiX, FiSave, FiPhone, FiMail, FiRefreshCw, FiEye,
    FiChevronLeft, FiChevronRight, FiBriefcase, FiUserCheck,
    FiFilter, FiDollarSign, FiCalendar, FiShield, FiAward,
    FiActivity, FiTrendingUp, FiMapPin, FiBook, FiCheckCircle,
    FiAlertCircle, FiClock, FiHash, FiGrid, FiList, FiStar,
    FiPrinter, FiChevronDown, FiLayers
} from 'react-icons/fi';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
const initials = (s: StaffMember) => `${s.first_name[0] || ''}${s.last_name[0] || ''}`.toUpperCase();
const yrs = (d?: string) => {
    if (!d) return '—';
    const y = Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 24 * 3600 * 1000));
    return `${y} yr${y !== 1 ? 's' : ''}`;
};

const TYPE_CONFIG = {
    teacher: { label: 'TSC Teacher', color: '#3b82f6', bg: '#eff6ff', dot: '#1d4ed8' },
    support: { label: 'Support Teacher', color: '#8b5cf6', bg: '#f5f3ff', dot: '#6d28d9' },
    subordinate: { label: 'Support Staff', color: '#f59e0b', bg: '#fffbeb', dot: '#b45309' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    Active: { color: '#059669', bg: '#d1fae5', icon: FiCheckCircle },
    Inactive: { color: '#6b7280', bg: '#f3f4f6', icon: FiAlertCircle },
    'On Leave': { color: '#f59e0b', bg: '#fef3c7', icon: FiClock },
    Terminated: { color: '#ef4444', bg: '#fee2e2', icon: FiX },
};

const AVATAR_PALETTES = [
    ['#1e3a5f', '#4f8ef7'], ['#3d1d6e', '#a78bfa'],
    ['#1a4731', '#34d399'], ['#5c1a1a', '#f87171'],
    ['#1a3a4f', '#38bdf8'], ['#4a2800', '#fb923c'],
];
const avatarPalette = (id: number) => AVATAR_PALETTES[id % AVATAR_PALETTES.length];

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

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ staff, size = 40 }: { staff: StaffMember; size?: number }) {
    const [bg, fg] = avatarPalette(staff.id);
    return (
        <div style={{ width: size, height: size, background: `linear-gradient(135deg, ${bg}, ${fg})`, borderRadius: size * 0.28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.36, letterSpacing: -0.5 }}>
            {initials(staff)}
        </div>
    );
}

function Badge({ type }: { type: StaffType }) {
    const c = TYPE_CONFIG[type];
    return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}22`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{c.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
    const c = STATUS_CONFIG[status] || STATUS_CONFIG['Inactive'];
    const Icon = c.icon;
    return (
        <span style={{ background: c.bg, color: c.color, borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon size={10} /> {status}
        </span>
    );
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
    return (
        <div className="relative bg-white rounded-2xl border border-gray-100 p-5 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: color }} />
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1">{label}</p>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-0.5 font-semibold">{sub}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
                    <Icon size={18} style={{ color }} />
                </div>
            </div>
        </div>
    );
}

// ─── Staff Card (Grid view) ───────────────────────────────────────────────────
function StaffCard({ staff, onEdit, onDelete, onView }: {
    staff: StaffMember; onEdit: () => void; onDelete: () => void; onView: () => void;
}) {
    const [bg, fg] = avatarPalette(staff.id);
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
            {/* Top banner */}
            <div className="h-12 relative" style={{ background: `linear-gradient(135deg, ${bg}dd, ${fg}aa)` }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
            </div>
            {/* Avatar overlap */}
            <div className="px-4 pb-4 flex-1 flex flex-col">
                <div className="-mt-6 mb-3 flex items-end justify-between">
                    <div className="w-14 h-14 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-black text-lg"
                        style={{ background: `linear-gradient(135deg, ${bg}, ${fg})` }}>
                        {initials(staff)}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onView} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all"><FiEye size={13} /></button>
                        <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all"><FiEdit2 size={13} /></button>
                        <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><FiTrash2 size={13} /></button>
                    </div>
                </div>
                <p className="font-black text-gray-900 text-sm leading-tight">{staff.first_name} {staff.last_name}</p>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{staff.designation || staff.role || staff.department || '—'}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge type={staff._type} />
                    <StatusBadge status={staff.status} />
                </div>
                <div className="mt-3 space-y-1 flex-1">
                    {staff.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><FiPhone size={11} className="text-gray-400" />{staff.phone}</p>}
                    {staff.department && <p className="text-xs text-gray-500 flex items-center gap-1.5"><FiBriefcase size={11} className="text-gray-400" />{staff.department}</p>}
                    {staff.staff_no && <p className="text-xs text-gray-400 flex items-center gap-1.5"><FiHash size={11} />{staff.staff_no}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700">{fmt(staff.basic_salary)}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{yrs(staff.date_of_employment || staff.date_hired || staff.employment_date)}</span>
                </div>
            </div>
        </div>
    );
}

// ─── View Detail Modal ────────────────────────────────────────────────────────
function StaffDetailModal({ staff, onClose, onEdit }: { staff: StaffMember; onClose: () => void; onEdit: () => void }) {
    const [bg, fg] = avatarPalette(staff.id);
    const section = (title: string, icon: any, children: React.ReactNode) => {
        const Icon = icon;
        return (
            <div className="bg-gray-50 rounded-2xl p-4">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Icon size={11} style={{ color: '#6366f1' }} />{title}
                </h4>
                <div className="grid grid-cols-2 gap-2">{children}</div>
            </div>
        );
    };
    const field = (label: string, value?: string | number) => (
        <div key={label}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header banner */}
            <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${bg}, ${fg})` }}>
                <div className="p-5 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl">
                        {initials(staff)}
                    </div>
                    <div className="flex-1 text-white">
                        <p className="font-black text-xl">{staff.first_name} {staff.middle_name || ''} {staff.last_name}</p>
                        <p className="opacity-80 text-sm mt-0.5">{staff.designation || staff.role || staff.department || staff._typeLabel}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">{staff._typeLabel}</span>
                            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">{staff.status}</span>
                        </div>
                    </div>
                    <div className="text-right text-white">
                        <p className="text-xs opacity-60 font-semibold">Basic Salary</p>
                        <p className="text-2xl font-black mt-0.5">{fmt(staff.basic_salary)}</p>
                    </div>
                </div>
            </div>

            {section('Personal Information', FiUsers, <>
                {field('Staff No', staff.staff_no)}
                {field('ID Number', staff.id_number)}
                {field('Gender', staff.gender)}
                {field('Nationality', staff.nationality)}
                {field('County', staff.county)}
                {field('Phone', staff.phone)}
                {field('Email', staff.email)}
                {field('TSC Number', staff.tsc_number)}
            </>)}

            {section('Employment Details', FiBriefcase, <>
                {field('Department', staff.department)}
                {field('Designation', staff.designation || staff.role)}
                {field('Qualification', staff.qualification)}
                {field('Specialization', staff.specialization)}
                {field('Employment Type', staff.employment_type || staff.contract_type)}
                {field('Date Employed', staff.date_of_employment || staff.date_hired || staff.employment_date)}
                {field('Years of Service', yrs(staff.date_of_employment || staff.date_hired || staff.employment_date))}
            </>)}

            {section('Payroll & Banking', FiDollarSign, <>
                {field('Bank Name', staff.bank_name)}
                {field('Bank Account', staff.bank_account)}
                {field('KRA PIN', staff.kra_pin)}
                {field('NHIF No', staff.nhif_no)}
                {field('NSSF No', staff.nssf_no)}
            </>)}

            {section('Emergency Contact', FiShield, <>
                {field('Contact Name', staff.emergency_contact_name)}
                {field('Contact Phone', staff.emergency_contact_phone)}
            </>)}

            {staff.notes && (
                <div className="bg-amber-50 rounded-2xl p-4">
                    <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Notes</p>
                    <p className="text-sm text-amber-900 font-medium">{staff.notes}</p>
                </div>
            )}

            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Close</button>
                <button onClick={onEdit} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black transition-all flex items-center justify-center gap-2">
                    <FiEdit2 size={14} /> Edit Staff
                </button>
            </div>
        </div>
    );
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
    open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'md' | 'lg' | 'xl';
}) {
    if (!open) return null;
    const w = { md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,15,25,0.7)', backdropFilter: 'blur(8px)' }}>
            <div className={`bg-white rounded-3xl shadow-2xl w-full ${w} flex flex-col max-h-[92vh] animate-modal`}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
                    <h2 className="text-base font-black text-gray-900 tracking-tight">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                        <FiX size={15} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

// ─── Staff Form ───────────────────────────────────────────────────────────────
function StaffForm({ form, setForm, staffType, setStaffType, isEdit, onSave, onClose, saving }: {
    form: FormState; setForm: (f: FormState) => void; staffType: StaffType;
    setStaffType: (t: StaffType) => void; isEdit: boolean;
    onSave: () => void; onClose: () => void; saving: boolean;
}) {
    const inp = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all";
    const lbl = "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block";
    const f = (label: string, field: keyof FormState, type: string = 'text', opts?: string[]) => (
        <div key={field}>
            <label className={lbl}>{label}</label>
            {opts ? (
                <select value={form[field] as string} onChange={e => setForm({ ...form, [field]: e.target.value })} className={inp}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                </select>
            ) : (
                <input type={type} value={form[field] as string} onChange={e => setForm({ ...form, [field]: type === 'number' ? Number(e.target.value) : e.target.value })} className={inp} />
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Staff type selector */}
            {!isEdit && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    {(Object.entries(TYPE_CONFIG) as [StaffType, typeof TYPE_CONFIG.teacher][]).map(([key, c]) => (
                        <button key={key} onClick={() => setStaffType(key)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${staffType === key ? 'text-white shadow-lg' : 'text-gray-500 hover:text-gray-700'}`}
                            style={staffType === key ? { background: `linear-gradient(135deg, ${c.dot}, ${c.color})` } : {}}>
                            {c.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Personal */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiUsers size={11} /> Personal Information</p>
                <div className="grid grid-cols-3 gap-3">
                    {f('First Name *', 'first_name')}
                    {f('Middle Name', 'middle_name')}
                    {f('Last Name *', 'last_name')}
                    {f('Gender', 'gender', 'text', ['Male', 'Female'])}
                    {f('ID Number', 'id_number')}
                    {f('Nationality', 'nationality', 'text', ['Kenyan', 'Ugandan', 'Tanzanian', 'Other'])}
                    {f('County', 'county')}
                    {f('Phone', 'phone', 'tel')}
                    {f('Email', 'email', 'email')}
                </div>
            </div>

            {/* Employment */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiBriefcase size={11} /> Employment Details</p>
                <div className="grid grid-cols-3 gap-3">
                    {f('Staff No', 'staff_no')}
                    {staffType === 'teacher' && f('TSC Number', 'tsc_number')}
                    {f('Qualification', 'qualification')}
                    {staffType !== 'subordinate' ? f('Department', 'department') : f('Role / Position', 'role')}
                    {staffType === 'teacher' && f('Designation', 'designation')}
                    {f('Specialization', 'specialization')}
                    {staffType === 'support'
                        ? f('Contract Type', 'contract_type', 'text', ['Contract', 'Part-time', 'Temporary'])
                        : f('Employment Type', 'employment_type', 'text', ['Permanent', 'Contract', 'Intern'])}
                    {f('Date Employed', 'date_of_employment', 'date')}
                    {f('Status', 'status', 'text', ['Active', 'Inactive', 'On Leave', 'Terminated'])}
                </div>
            </div>

            {/* Payroll */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiDollarSign size={11} /> Salary & Banking</p>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={lbl}>Basic Salary (KES)</label>
                        <input type="number" min="0" value={form.basic_salary || ''}
                            onChange={e => setForm({ ...form, basic_salary: Number(e.target.value) })} className={inp} />
                    </div>
                    {f('Bank Name', 'bank_name')}
                    {f('Bank Account No', 'bank_account')}
                    {f('KRA PIN', 'kra_pin')}
                    {f('NHIF No', 'nhif_no')}
                    {f('NSSF No', 'nssf_no')}
                </div>
            </div>

            {/* Emergency */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><FiShield size={11} /> Emergency Contact & Notes</p>
                <div className="grid grid-cols-2 gap-3">
                    {f('Contact Name', 'emergency_contact_name')}
                    {f('Contact Phone', 'emergency_contact_phone', 'tel')}
                </div>
                <div className="mt-3">
                    <label className={lbl}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        rows={2} className={inp + ' resize-none'} placeholder="Any additional notes..." />
                </div>
            </div>

            <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={onSave} disabled={saving}
                    className="flex-[2] py-3 rounded-xl text-white text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiSave size={14} /> {isEdit ? 'Update Staff Member' : 'Add Staff Member'}</>}
                </button>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function StaffDirectoryPage() {
    const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | StaffType>('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterGender, setFilterGender] = useState('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortField, setSortField] = useState<string>('first_name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const perPage = 20;

    // Modals
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
            const teachers: StaffMember[] = (t.data || []).map(r => ({ ...r, basic_salary: Number(r.basic_salary || 0), _type: 'teacher' as StaffType, _typeLabel: 'TSC Teacher' }));
            const support: StaffMember[] = (s.data || []).map(r => ({ ...r, basic_salary: Number(r.basic_salary || 0), _type: 'support' as StaffType, _typeLabel: 'Support Teacher' }));
            const sub2: StaffMember[] = (sub.data || []).map(r => ({ ...r, basic_salary: Number(r.basic_salary || 0), _type: 'subordinate' as StaffType, _typeLabel: 'Support Staff' }));
            setAllStaff([...teachers, ...support, ...sub2]);
        } catch (e) { toast.error('Failed to load staff'); }
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
        if (type === 'teacher') {
            payload.tsc_number = form.tsc_number || null;
            payload.employment_type = form.employment_type;
            payload.date_of_employment = form.date_of_employment || null;
        }
        if (type === 'support') {
            payload.contract_type = form.contract_type;
            payload.date_hired = form.date_of_employment || null;
        }
        if (type === 'subordinate') {
            payload.date_hired = form.date_of_employment || null;
        }

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
            ...filtered.map(s => [
                `${s.first_name} ${s.last_name}`, s._typeLabel, s.staff_no, s.tsc_number,
                s.gender, s.phone, s.email, s.department, s.designation || s.role,
                s.status, s.basic_salary, s.bank_name, s.kra_pin, s.nhif_no, s.nssf_no,
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `staff_register_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const handleSort = (f: string) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
    const SortIcon = ({ f }: { f: string }) => sortField !== f ? null : sortDir === 'asc' ? <FiChevronDown size={11} className="inline ml-0.5" /> : <FiChevronDown size={11} className="inline ml-0.5 rotate-180" />;

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[70vh]">
            <div className="text-center">
                <div className="relative w-14 h-14 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                    <FiUsers className="absolute inset-0 m-auto text-indigo-400" size={18} />
                </div>
                <p className="text-gray-500 font-bold text-sm">Loading Staff Directory...</p>
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                @keyframes modal { from { opacity:0; transform: scale(0.96) translateY(10px); } to { opacity:1; transform:none; } }
                .animate-modal { animation: modal 0.2s ease-out; }
                .sort-th { cursor: pointer; user-select: none; white-space: nowrap; }
                .sort-th:hover { color: #4f46e5; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
            `}</style>

            <div className="space-y-5 pb-12">
                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                <FiUsers className="text-white" size={17} />
                            </span>
                            Staff Directory
                        </h1>
                        <p className="text-xs text-gray-400 font-semibold mt-1 ml-11">TSC Teachers · Support Staff · Subordinates · HR Records</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => fetchStaff()} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-all">
                            <FiRefreshCw size={12} /> Refresh
                        </button>
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-all">
                            <FiDownload size={12} /> Export
                        </button>
                        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><FiList size={14} /></button>
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><FiGrid size={14} /></button>
                        </div>
                        <button onClick={openAdd}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all shadow-lg shadow-indigo-200"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            <FiUserPlus size={13} /> Add Staff
                        </button>
                    </div>
                </div>

                {/* ── Stat Cards ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                    <StatCard label="Total Staff" value={stats.total} icon={FiUsers} color="#6366f1" sub={`${stats.active} Active`} />
                    <StatCard label="TSC Teachers" value={stats.teachers} icon={FiBook} color="#3b82f6" sub={`${stats.support} Support Tchrs`} />
                    <StatCard label="Support Staff" value={stats.subordinate} icon={FiBriefcase} color="#f59e0b" sub={`${stats.female} Female · ${stats.male} Male`} />
                    <StatCard label="Monthly Wage Bill" value={fmt(stats.wageBill)} icon={FiDollarSign} color="#059669" sub="Basic salaries only" />
                </div>

                {/* ── Quick Type Tabs ──────────────────────────────────────────── */}
                <div className="flex gap-2 flex-wrap">
                    {[
                        ['all', 'All Staff', stats.total, '#6366f1'],
                        ['teacher', 'TSC Teachers', stats.teachers, '#3b82f6'],
                        ['support', 'Support Teachers', stats.support, '#8b5cf6'],
                        ['subordinate', 'Support Staff', stats.subordinate, '#f59e0b'],
                    ].map(([v, l, c, col]) => (
                        <button key={v as string} onClick={() => { setFilterType(v as any); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all ${filterType === v ? 'text-white border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            style={filterType === v ? { background: col as string } : {}}>
                            {l as string} <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filterType === v ? 'bg-white/20' : 'bg-gray-100'}`}>{c as number}</span>
                        </button>
                    ))}
                </div>

                {/* ── Filters ──────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-52">
                        <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name, staff no, TSC, email, phone..."
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><FiX size={13} /></button>}
                    </div>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        <option value="all">All Statuses</option>
                        {['Active', 'Inactive', 'On Leave', 'Terminated'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        <option value="all">All Genders</option>
                        <option>Male</option><option>Female</option>
                    </select>
                    <div className="text-xs text-gray-400 font-semibold ml-auto">{filtered.length} of {allStaff.length} staff</div>
                </div>

                {/* ── Grid View ────────────────────────────────────────────────── */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {pageData.length === 0 ? (
                            <div className="col-span-full py-16 text-center text-gray-400">
                                <FiUsers size={36} className="mx-auto mb-3 opacity-30" />
                                <p className="font-bold">No staff found</p>
                            </div>
                        ) : pageData.map(s => (
                            <StaffCard key={`${s._type}-${s.id}`} staff={s}
                                onEdit={() => openEdit(s)} onDelete={() => handleDelete(s)} onView={() => openView(s)} />
                        ))}
                    </div>
                )}

                {/* ── List View ────────────────────────────────────────────────── */}
                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="sort-th px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" onClick={() => handleSort('first_name')}>
                                            Staff Member <SortIcon f="first_name" />
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                        <th className="sort-th px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" onClick={() => handleSort('department')}>
                                            Dept / Role <SortIcon f="department" />
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                                        <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="sort-th px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest" onClick={() => handleSort('basic_salary')}>
                                            Salary <SortIcon f="basic_salary" />
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">IDs</th>
                                        <th className="px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageData.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                                            <FiUsers size={32} className="mx-auto mb-3 opacity-30" />
                                            <p className="font-semibold">No staff found matching your filters</p>
                                        </td></tr>
                                    ) : pageData.map((s, i) => (
                                        <tr key={`${s._type}-${s.id}`}
                                            className={`border-t border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar staff={s} size={36} />
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm leading-tight">{s.first_name} {s.last_name}</p>
                                                        <p className="text-xs text-gray-400 font-semibold">{s.staff_no || s.tsc_number || '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3"><Badge type={s._type} /></td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-semibold text-gray-700">{s.department || s.role || '—'}</p>
                                                <p className="text-xs text-gray-400">{s.designation || s.qualification || ''}</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                {s.phone && <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><FiPhone size={10} className="text-gray-400" /> {s.phone}</p>}
                                                {s.email && <p className="text-xs text-gray-400 truncate max-w-32">{s.email}</p>}
                                            </td>
                                            <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                                            <td className="px-3 py-3 font-black text-emerald-700 text-sm whitespace-nowrap">{fmt(s.basic_salary)}</td>
                                            <td className="px-3 py-3">
                                                {s.kra_pin && <p className="text-[10px] font-bold text-gray-400">KRA: {s.kra_pin}</p>}
                                                {s.nhif_no && <p className="text-[10px] font-bold text-gray-400">NHIF: {s.nhif_no}</p>}
                                                {s.nssf_no && <p className="text-[10px] font-bold text-gray-400">NSSF: {s.nssf_no}</p>}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex gap-1">
                                                    <button onClick={() => openView(s)} title="View" className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all"><FiEye size={13} /></button>
                                                    <button onClick={() => openEdit(s)} title="Edit" className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all"><FiEdit2 size={13} /></button>
                                                    <button onClick={() => handleDelete(s)} title="Delete" className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><FiTrash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Footer summary */}
                                {pageData.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t border-gray-200">
                                            <td colSpan={5} className="px-4 py-2 text-xs font-black text-gray-500">
                                                Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-black text-emerald-700">
                                                {fmt(pageData.reduce((s, r) => s + r.basic_salary, 0))}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all">
                            <FiChevronLeft size={15} />
                        </button>
                        {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                            return (
                                <button key={p} onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-xl text-sm font-black transition-all ${page === p ? 'text-white shadow-lg' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    style={page === p ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}>
                                    {p}
                                </button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-all">
                            <FiChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────────── */}
            <Modal open={showForm} onClose={() => setShowForm(false)}
                title={editingId ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'} size="xl">
                <StaffForm form={form} setForm={setForm} staffType={editingId ? editingType : newStaffType}
                    setStaffType={setNewStaffType} isEdit={!!editingId}
                    onSave={handleSave} onClose={() => setShowForm(false)} saving={saving} />
            </Modal>

            <Modal open={showDetail} onClose={() => setShowDetail(false)} title="👤 Staff Profile" size="lg">
                {viewStaff && (
                    <StaffDetailModal staff={viewStaff} onClose={() => setShowDetail(false)}
                        onEdit={() => { setShowDetail(false); openEdit(viewStaff); }} />
                )}
            </Modal>
        </>
    );
}
