'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiUsers, FiUserPlus, FiSearch, FiEdit2, FiTrash2,
    FiX, FiPhone, FiMail, FiBriefcase, FiEye,
    FiChevronLeft, FiChevronRight, FiRefreshCw, FiSave,
    FiAward, FiCheckCircle,
} from 'react-icons/fi';

type StaffType = 'teacher' | 'support' | 'subordinate';

interface StaffMember {
    id: number; staff_no?: string; tsc_number?: string;
    first_name: string; last_name: string;
    email?: string; phone?: string; gender: string;
    id_number?: string; qualification?: string;
    department?: string; designation?: string; role?: string;
    basic_salary: number; status: string;
    date_of_employment?: string; date_hired?: string; employment_date?: string;
    contract_type?: string; bank_name?: string; bank_account?: string;
    kra_pin?: string; nhif_no?: string; nssf_no?: string;
    emergency_contact_name?: string; emergency_contact_phone?: string;
    notes?: string; created_at: string;
    _type: StaffType; _typeLabel: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n || 0);

const emptyForm = {
    first_name: '', last_name: '', email: '', phone: '', gender: 'Male',
    id_number: '', qualification: '', department: '', designation: '', role: '',
    basic_salary: 0, status: 'Active', staff_no: '', tsc_number: '',
    date_of_employment: '', contract_type: 'Permanent',
    bank_name: '', bank_account: '', kra_pin: '', nhif_no: '', nssf_no: '',
    emergency_contact_name: '', emergency_contact_phone: '', notes: '',
};

const TYPE_CONFIG: Record<StaffType, { label: string; color: string; bg: string; border: string }> = {
    teacher:     { label: 'TSC Teacher',     color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
    support:     { label: 'Support Teacher', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
    subordinate: { label: 'Support Staff',   color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
};

const AVATAR_PALETTE = ['#4f46e5','#0284c7','#d97706','#059669','#db2777','#7c3aed','#dc2626','#0d9488'];
const avatarColor = (name: string) => AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

export default function StaffDirectoryPage() {
    const [allStaff, setAllStaff]     = useState<StaffMember[]>([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [filterType, setFilterType] = useState<'all' | StaffType>('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [page, setPage]             = useState(1);
    const perPage = 12;

    const [showModal,  setShowModal]  = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [editingId,  setEditingId]  = useState<number | null>(null);
    const [editingType, setEditingType] = useState<StaffType>('teacher');
    const [newStaffType, setNewStaffType] = useState<StaffType>('teacher');
    const [form, setForm]             = useState({ ...emptyForm });
    const [saving, setSaving]         = useState(false);
    const [viewStaff, setViewStaff]   = useState<StaffMember | null>(null);
    const [step, setStep]             = useState(1);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes, subRes] = await Promise.all([
                supabase.from('school_teachers').select('*').order('first_name'),
                supabase.from('school_support_teachers').select('*').order('first_name'),
                supabase.from('school_subordinate_staff').select('*').order('first_name'),
            ]);
            const toMember = (arr: any[], type: StaffType, label: string): StaffMember[] =>
                (arr || []).map(t => ({ ...t, basic_salary: Number(t.basic_salary || 0), _type: type, _typeLabel: label }));
            setAllStaff([
                ...toMember(tRes.data || [], 'teacher', 'TSC Teacher'),
                ...toMember(sRes.data || [], 'support', 'Support Teacher'),
                ...toMember(subRes.data || [], 'subordinate', 'Support Staff'),
            ]);
        } catch { toast.error('Failed to load staff'); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    const getTable = (t: StaffType) =>
        t === 'teacher' ? 'school_teachers' : t === 'support' ? 'school_support_teachers' : 'school_subordinate_staff';

    const filtered = allStaff.filter(s => {
        const q = search.toLowerCase();
        const matchQ = !q || [s.first_name, s.last_name, s.email, s.phone, s.tsc_number, s.staff_no, s.department].some(v => v && v.toLowerCase().includes(q));
        return matchQ && (filterType === 'all' || s._type === filterType) && (filterStatus === 'all' || s.status === filterStatus);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

    const openAdd = () => { setForm({ ...emptyForm }); setEditingId(null); setNewStaffType('teacher'); setStep(1); setShowModal(true); };
    const openEdit = (s: StaffMember) => {
        setForm({
            first_name: s.first_name || '', last_name: s.last_name || '', email: s.email || '',
            phone: s.phone || '', gender: s.gender || 'Male', id_number: s.id_number || '',
            qualification: s.qualification || '', department: s.department || '', designation: s.designation || '',
            role: s.role || '', basic_salary: s.basic_salary || 0, status: s.status || 'Active',
            staff_no: s.staff_no || '', tsc_number: s.tsc_number || '',
            date_of_employment: s.employment_date || s.date_hired || '', contract_type: s.contract_type || 'Permanent',
            bank_name: s.bank_name || '', bank_account: s.bank_account || '', kra_pin: s.kra_pin || '',
            nhif_no: s.nhif_no || '', nssf_no: s.nssf_no || '',
            emergency_contact_name: s.emergency_contact_name || '', emergency_contact_phone: s.emergency_contact_phone || '',
            notes: s.notes || '',
        });
        setEditingId(s.id); setEditingType(s._type); setNewStaffType(s._type); setStep(1); setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('First and Last name are required'); return; }
        setSaving(true);
        try {
            const payload: Record<string, any> = {
                first_name: form.first_name.trim(), last_name: form.last_name.trim(),
                email: form.email || null, phone: form.phone || null, gender: form.gender,
                status: form.status, basic_salary: Number(form.basic_salary) || 0,
                staff_no: form.staff_no || null, id_number: form.id_number || null,
                qualification: form.qualification || null, notes: form.notes || null,
                emergency_contact_name: form.emergency_contact_name || null,
                emergency_contact_phone: form.emergency_contact_phone || null,
                bank_name: form.bank_name || null, bank_account: form.bank_account || null,
                kra_pin: form.kra_pin || null, nhif_no: form.nhif_no || null, nssf_no: form.nssf_no || null,
            };
            if (newStaffType === 'teacher') {
                payload.tsc_number = form.tsc_number || null;
                payload.department = form.department || null;
                payload.designation = form.designation || null;
                payload.employment_date = form.date_of_employment || null;
            } else if (newStaffType === 'support') {
                payload.contract_type = form.contract_type || 'Contract';
                payload.date_hired = form.date_of_employment || null;
                payload.department = form.department || null;
                payload.designation = form.designation || null;
            } else {
                payload.role = form.role || null;
                payload.department = form.department || null;
                payload.date_hired = form.date_of_employment || null;
            }
            let error;
            if (editingId && editingType === newStaffType) {
                ({ error } = await supabase.from(getTable(newStaffType)).update(payload).eq('id', editingId));
            } else {
                ({ error } = await supabase.from(getTable(newStaffType)).insert([payload]));
            }
            if (error) throw error;
            toast.success(editingId ? 'Staff updated successfully' : 'Staff added successfully');
            setShowModal(false); fetchStaff();
        } catch (e: any) { toast.error(e.message || 'Failed to save'); }
        setSaving(false);
    };

    const handleDelete = async (s: StaffMember) => {
        if (!confirm('Delete ' + s.first_name + ' ' + s.last_name + '? This cannot be undone.')) return;
        const { error } = await supabase.from(getTable(s._type)).delete().eq('id', s.id);
        if (error) toast.error(error.message);
        else { toast.success('Staff deleted'); fetchStaff(); }
    };

    const inp = (field: keyof typeof emptyForm, val: string | number) => setForm(f => ({ ...f, [field]: val }));

    // ── LIGHT THEME TOKENS ──────────────────────────────────────────────────
    const font = "'Inter','Segoe UI',sans-serif";
    const inputSt: React.CSSProperties = {
        width: '100%', background: '#fff', border: '1.5px solid #e2e8f0',
        borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e293b',
        fontFamily: font, outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    };
    const labelSt: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
    const fgSt: React.CSSProperties = { marginBottom: 14 };

    const stats = [
        { label: 'Total Staff',   value: allStaff.length,                             color: '#4f46e5', icon: FiUsers },
        { label: 'TSC Teachers',  value: allStaff.filter(s => s._type === 'teacher').length, color: '#7c3aed', icon: FiAward },
        { label: 'Support Staff', value: allStaff.filter(s => s._type !== 'teacher').length, color: '#0284c7', icon: FiBriefcase },
        { label: 'Active',        value: allStaff.filter(s => s.status === 'Active').length,  color: '#059669', icon: FiCheckCircle },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: font, color: '#1e293b', padding: '28px 32px' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}>
                        <FiUsers size={22} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>Staff Directory</h1>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Manage all teaching and non-teaching staff</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => fetchStaff()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 12, fontWeight: 700, color: '#64748b', cursor: 'pointer', fontFamily: font, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <FiRefreshCw size={13} /> Refresh
                    </button>
                    <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: font, boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
                        <FiUserPlus size={15} /> Add Staff
                    </button>
                </div>
            </div>

            {/* ── STATS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <s.icon size={20} color={s.color} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
                            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FILTERS ── */}
            <div style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 16, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <FiSearch size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, TSC, phone..." style={{ ...inputSt, paddingLeft: 36, margin: 0 }} />
                </div>
                {(['all','teacher','support','subordinate'] as const).map(t => (
                    <button key={t} onClick={() => { setFilterType(t); setPage(1); }} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: filterType === t ? '2px solid #4f46e5' : '1.5px solid #e2e8f0', background: filterType === t ? '#eef2ff' : '#fff', color: filterType === t ? '#4f46e5' : '#64748b', cursor: 'pointer', fontFamily: font, transition: 'all 0.15s' }}>
                        {t === 'all' ? 'All Staff' : t === 'teacher' ? 'TSC Teachers' : t === 'support' ? 'Support Teachers' : 'Support Staff'}
                    </button>
                ))}
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ ...inputSt, width: 'auto', margin: 0, padding: '8px 14px' }}>
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                </select>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{filtered.length} records</span>
            </div>

            {/* ── TABLE ── */}
            <div style={{ background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                        <FiRefreshCw size={28} style={{ marginBottom: 12 }} />
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Loading staff...</p>
                    </div>
                ) : paginated.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                        <FiUsers size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#64748b' }}>No staff found</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                                {['Staff Member','Type','Department / Role','Contact','Salary','Status','Actions'].map(h => (
                                    <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(s => {
                                const cfg = TYPE_CONFIG[s._type];
                                const ac  = avatarColor(s.first_name);
                                const initials = (s.first_name[0] || '') + (s.last_name[0] || '');
                                return (
                                    <tr key={s.id + s._type} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.12s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 12, background: ac + '18', border: '1.5px solid ' + ac + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: ac, flexShrink: 0 }}>
                                                    {initials.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.first_name} {s.last_name}</p>
                                                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{s.tsc_number ? 'TSC: ' + s.tsc_number : s.staff_no ? '#' + s.staff_no : s.email || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: '1px solid ' + cfg.border }}>{cfg.label}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.department || s.designation || s.role || '—'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}><FiPhone size={11} color="#94a3b8" />{s.phone}</div>}
                                            {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8', marginTop: 2 }}><FiMail size={11} />{s.email}</div>}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#4f46e5' }}>{fmt(s.basic_salary)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.status === 'Active' ? '#d1fae5' : s.status === 'On Leave' ? '#fef3c7' : '#fee2e2', color: s.status === 'Active' ? '#059669' : s.status === 'On Leave' ? '#d97706' : '#dc2626', border: '1px solid ' + (s.status === 'Active' ? '#a7f3d0' : s.status === 'On Leave' ? '#fde68a' : '#fca5a5') }}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button title="View Details" onClick={() => { setViewStaff(s); setShowDetail(true); }} style={{ width: 32, height: 32, borderRadius: 9, background: '#eef2ff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}><FiEye size={14} /></button>
                                                <button title="Edit" onClick={() => openEdit(s)} style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><FiEdit2 size={14} /></button>
                                                <button title="Delete" onClick={() => handleDelete(s)} style={{ width: 32, height: 32, borderRadius: 9, background: '#fee2e2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}><FiTrash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', color: '#64748b', cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: font, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <FiChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', color: '#64748b', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: font, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        Next <FiChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* ── ADD / EDIT MODAL ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', border: '1.5px solid #f1f5f9' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '24px 28px 20px', borderBottom: '1.5px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                                        <FiUserPlus size={19} color="#fff" />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{editingId ? 'Edit Staff Record' : 'Add New Staff'}</h2>
                                        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Step {step} of 3 — {step === 1 ? 'Personal Info' : step === 2 ? 'Employment Details' : 'Banking & Emergency'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FiX size={16} />
                                </button>
                            </div>
                            {/* Step progress bar */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
                                {[1,2,3].map(n => (
                                    <div key={n} onClick={() => setStep(n)} style={{ flex: 1, height: 5, borderRadius: 5, background: n <= step ? 'linear-gradient(90deg,#4f46e5,#7c3aed)' : '#f1f5f9', cursor: 'pointer', transition: 'all 0.25s', boxShadow: n <= step ? '0 2px 8px rgba(79,70,229,0.3)' : 'none' }} />
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '24px 28px 28px' }}>
                            {/* Staff Type (add only) */}
                            {!editingId && (
                                <div style={fgSt}>
                                    <label style={labelSt}>Staff Type</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {(['teacher','support','subordinate'] as StaffType[]).map(t => {
                                            const cfg = TYPE_CONFIG[t];
                                            return (
                                                <button key={t} onClick={() => setNewStaffType(t)} style={{ flex: 1, padding: '11px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, border: newStaffType === t ? '2px solid ' + cfg.color : '1.5px solid #e2e8f0', background: newStaffType === t ? cfg.bg : '#f8fafc', color: newStaffType === t ? cfg.color : '#64748b', cursor: 'pointer', fontFamily: font, transition: 'all 0.15s' }}>
                                                    {cfg.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 1 */}
                            {step === 1 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div style={fgSt}><label style={labelSt}>First Name *</label><input style={inputSt} value={form.first_name} onChange={e => inp('first_name', e.target.value)} placeholder="John" /></div>
                                    <div style={fgSt}><label style={labelSt}>Last Name *</label><input style={inputSt} value={form.last_name} onChange={e => inp('last_name', e.target.value)} placeholder="Kamau" /></div>
                                    <div style={fgSt}><label style={labelSt}>Email Address</label><input style={inputSt} type="email" value={form.email} onChange={e => inp('email', e.target.value)} placeholder="john@school.ac.ke" /></div>
                                    <div style={fgSt}><label style={labelSt}>Phone Number</label><input style={inputSt} value={form.phone} onChange={e => inp('phone', e.target.value)} placeholder="07XX XXX XXX" /></div>
                                    <div style={fgSt}>
                                        <label style={labelSt}>Gender</label>
                                        <select style={inputSt} value={form.gender} onChange={e => inp('gender', e.target.value)}>
                                            <option>Male</option><option>Female</option><option>Other</option>
                                        </select>
                                    </div>
                                    <div style={fgSt}><label style={labelSt}>National ID No.</label><input style={inputSt} value={form.id_number} onChange={e => inp('id_number', e.target.value)} placeholder="12345678" /></div>
                                    <div style={fgSt}><label style={labelSt}>Staff No.</label><input style={inputSt} value={form.staff_no} onChange={e => inp('staff_no', e.target.value)} placeholder="STF-001" /></div>
                                    <div style={fgSt}><label style={labelSt}>Qualification</label><input style={inputSt} value={form.qualification} onChange={e => inp('qualification', e.target.value)} placeholder="B.Ed" /></div>
                                </div>
                            )}

                            {/* STEP 2 */}
                            {step === 2 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    {newStaffType === 'teacher' && <div style={fgSt}><label style={labelSt}>TSC Number</label><input style={inputSt} value={form.tsc_number} onChange={e => inp('tsc_number', e.target.value)} placeholder="TSC/123456" /></div>}
                                    <div style={fgSt}><label style={labelSt}>Department</label><input style={inputSt} value={form.department} onChange={e => inp('department', e.target.value)} placeholder="Mathematics" /></div>
                                    <div style={fgSt}><label style={labelSt}>Designation</label><input style={inputSt} value={form.designation} onChange={e => inp('designation', e.target.value)} placeholder="Class Teacher" /></div>
                                    {newStaffType === 'support' && (
                                        <div style={fgSt}>
                                            <label style={labelSt}>Contract Type</label>
                                            <select style={inputSt} value={form.contract_type} onChange={e => inp('contract_type', e.target.value)}>
                                                <option>Permanent</option><option>Contract</option><option>Part-Time</option><option>Casual</option>
                                            </select>
                                        </div>
                                    )}
                                    {newStaffType === 'subordinate' && <div style={fgSt}><label style={labelSt}>Role</label><input style={inputSt} value={form.role} onChange={e => inp('role', e.target.value)} placeholder="Security Guard" /></div>}
                                    <div style={fgSt}><label style={labelSt}>Date of Employment</label><input style={inputSt} type="date" value={form.date_of_employment} onChange={e => inp('date_of_employment', e.target.value)} /></div>
                                    <div style={fgSt}><label style={labelSt}>Basic Salary (KES)</label><input style={inputSt} type="number" value={form.basic_salary} onChange={e => inp('basic_salary', Number(e.target.value))} placeholder="25000" /></div>
                                    <div style={fgSt}>
                                        <label style={labelSt}>Status</label>
                                        <select style={inputSt} value={form.status} onChange={e => inp('status', e.target.value)}>
                                            <option>Active</option><option>Inactive</option><option>On Leave</option><option>Terminated</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3 */}
                            {step === 3 && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div style={fgSt}><label style={labelSt}>Bank Name</label><input style={inputSt} value={form.bank_name} onChange={e => inp('bank_name', e.target.value)} placeholder="Equity Bank" /></div>
                                        <div style={fgSt}><label style={labelSt}>Account Number</label><input style={inputSt} value={form.bank_account} onChange={e => inp('bank_account', e.target.value)} placeholder="0123456789" /></div>
                                        <div style={fgSt}><label style={labelSt}>KRA PIN</label><input style={inputSt} value={form.kra_pin} onChange={e => inp('kra_pin', e.target.value)} placeholder="A123456789B" /></div>
                                        <div style={fgSt}><label style={labelSt}>NHIF No.</label><input style={inputSt} value={form.nhif_no} onChange={e => inp('nhif_no', e.target.value)} placeholder="123456" /></div>
                                        <div style={fgSt}><label style={labelSt}>NSSF No.</label><input style={inputSt} value={form.nssf_no} onChange={e => inp('nssf_no', e.target.value)} placeholder="123456" /></div>
                                        <div style={fgSt}><label style={labelSt}>Emergency Contact Name</label><input style={inputSt} value={form.emergency_contact_name} onChange={e => inp('emergency_contact_name', e.target.value)} placeholder="Jane Kamau" /></div>
                                        <div style={fgSt}><label style={labelSt}>Emergency Phone</label><input style={inputSt} value={form.emergency_contact_phone} onChange={e => inp('emergency_contact_phone', e.target.value)} placeholder="07XX XXX XXX" /></div>
                                    </div>
                                    <div style={fgSt}><label style={labelSt}>Notes</label><textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => inp('notes', e.target.value)} placeholder="Any additional notes..." /></div>
                                </>
                            )}

                            {/* Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 10 }}>
                                <button onClick={() => step > 1 ? setStep(s => s - 1) : setShowModal(false)} style={{ padding: '11px 22px', borderRadius: 12, background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
                                    {step > 1 ? 'Back' : 'Cancel'}
                                </button>
                                {step < 3 ? (
                                    <button onClick={() => setStep(s => s + 1)} style={{ padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font, boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>
                                        Next Step
                                    </button>
                                ) : (
                                    <button onClick={handleSave} disabled={saving} style={{ padding: '11px 28px', borderRadius: 12, background: saving ? '#c7d2fe' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>
                                        <FiSave size={14} />{saving ? 'Saving...' : editingId ? 'Update Staff' : 'Save Staff'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DETAIL MODAL ── */}
            {showDetail && viewStaff && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 540, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.18)', border: '1.5px solid #f1f5f9' }}>
                        <div style={{ padding: '28px 28px 20px', borderBottom: '1.5px solid #f1f5f9', position: 'relative' }}>
                            <button onClick={() => setShowDetail(false)} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiX size={16} /></button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 62, height: 62, borderRadius: 18, background: avatarColor(viewStaff.first_name) + '18', border: '2px solid ' + avatarColor(viewStaff.first_name) + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: avatarColor(viewStaff.first_name) }}>
                                    {(viewStaff.first_name[0] + viewStaff.last_name[0]).toUpperCase()}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{viewStaff.first_name} {viewStaff.last_name}</h2>
                                    <span style={{ padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: TYPE_CONFIG[viewStaff._type].bg, color: TYPE_CONFIG[viewStaff._type].color, border: '1px solid ' + TYPE_CONFIG[viewStaff._type].border }}>{TYPE_CONFIG[viewStaff._type].label}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: '20px 28px 28px' }}>
                            {([
                                ['Staff No.', viewStaff.staff_no], ['TSC Number', viewStaff.tsc_number],
                                ['Phone', viewStaff.phone], ['Email', viewStaff.email],
                                ['Gender', viewStaff.gender], ['ID Number', viewStaff.id_number],
                                ['Qualification', viewStaff.qualification], ['Designation', viewStaff.designation],
                                ['Department', viewStaff.department], ['Basic Salary', viewStaff.basic_salary ? fmt(viewStaff.basic_salary) : null],
                                ['Status', viewStaff.status], ['KRA PIN', viewStaff.kra_pin],
                                ['NHIF No.', viewStaff.nhif_no], ['NSSF No.', viewStaff.nssf_no],
                                ['Bank', viewStaff.bank_name], ['Account No.', viewStaff.bank_account],
                                ['Emergency Contact', viewStaff.emergency_contact_name], ['Emergency Phone', viewStaff.emergency_contact_phone],
                            ] as [string, any][]).filter(([, v]) => v).map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                                    <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{value}</span>
                                </div>
                            ))}
                            {viewStaff.notes && (
                                <div style={{ marginTop: 16, padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12 }}>
                                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</p>
                                    <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>{viewStaff.notes}</p>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button onClick={() => { setShowDetail(false); openEdit(viewStaff); }} style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#fef3c7', border: '1.5px solid #fde68a', color: '#d97706', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <FiEdit2 size={14} /> Edit Staff
                                </button>
                                <button onClick={() => { setShowDetail(false); handleDelete(viewStaff); }} style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#fee2e2', border: '1.5px solid #fca5a5', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <FiTrash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
