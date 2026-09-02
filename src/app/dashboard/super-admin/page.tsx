'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiRefreshCw,
    FiLock, FiUnlock, FiEye, FiEyeOff, FiShield, FiUsers, FiKey,
    FiCheckCircle, FiAlertTriangle, FiSettings, FiUser, FiClock,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

/* ─── ALL PAGES/PERMISSIONS in APSIMS ─── */
const PAGE_PERMISSIONS = [
    { group:'🏠 Core', items:[
        { key:'dashboard',              label:'Dashboard / Home',            desc:'Main dashboard page' },
        { key:'students',               label:'Students — Full Access',      desc:'Student list, profiles, CRUD' },
        { key:'students_health',        label:'Students — Health/Clinic',    desc:'Clinic, health records' },
        { key:'admissions',             label:'Admissions',                  desc:'Applications, enrolment' },
        { key:'attendance',             label:'Attendance',                  desc:'Take/view attendance' },
        { key:'attendance_biometric',   label:'Attendance — Biometric',      desc:'ZKTeco, scanner' },
        { key:'discipline',             label:'Discipline',                  desc:'Discipline records' },
        { key:'guidance',               label:'Guidance & Counselling',      desc:'Guidance module' },
        { key:'visitors',               label:'Visitors',                    desc:'Visitor log' },
    ]},
    { group:'📚 Exams & Results', items:[
        { key:'exams_marks',            label:'Marks Entry (8-4-4)',         desc:'Enter exam marks — own subjects only if teacher' },
        { key:'exams_cbc_marks',        label:'CBC Marks Entry',             desc:'Enter CBC competency marks' },
        { key:'exams_manage',           label:'Exam Management',             desc:'Create exams, set up terms' },
        { key:'exams_report_cards',     label:'Report Cards',                desc:'View/print report cards' },
        { key:'exams_cbc_report_cards', label:'CBC Report Cards',            desc:'CBC report cards' },
        { key:'exams_analysis',         label:'Analysis — Full',             desc:'All 12-tab analytics' },
        { key:'exams_principal_report', label:'Principal Report',            desc:'Term executive report' },
        { key:'exams_marks_completion', label:'Marks Completion Dashboard',  desc:'Track missing marks' },
        { key:'exams_student_passport', label:'Student Academic Passport',   desc:'Full student journey' },
        { key:'exams_class_teacher',    label:'Class Teacher Dashboard',     desc:'Per-class overview' },
        { key:'exams_cohort_tracker',   label:'Cohort Tracker',              desc:'8-4-4 + CBC tracking' },
        { key:'exams_digital_delivery', label:'Digital Report Delivery',     desc:'Email/SMS report cards' },
        { key:'exams_release_results',  label:'Release Results to Mobile',   desc:'Publish to parent APK' },
        { key:'exams_subject_grading',  label:'Subject Grading Config',      desc:'Grade boundaries per subject' },
        { key:'exams_broadsheet',       label:'Broadsheet',                  desc:'Class broadsheet' },
        { key:'exams_merit_list',       label:'Merit List',                  desc:'Term ranking' },
        { key:'exams_ai_insights',      label:'AI Insights Engine',          desc:'AI-powered analysis' },
        { key:'exams_sba',              label:'SBA Manager',                 desc:'School-based assessments' },
        { key:'exams_question_bank',    label:'Question Bank',               desc:'Exam questions' },
    ]},
    { group:'💰 Finance & Fees', items:[
        { key:'fees',                   label:'Fees — Full Access',          desc:'All fee management' },
        { key:'fees_collect',           label:'Fees — Collect Payments',     desc:'Record payments, receipts' },
        { key:'fees_structure',         label:'Fees — Structure',            desc:'Set fee structures' },
        { key:'fees_reports',           label:'Fees — Reports',              desc:'Financial reports' },
        { key:'fees_mpesa',             label:'Fees — M-Pesa Reconciliation',desc:'M-Pesa matching' },
        { key:'expenses',               label:'Expenses',                    desc:'Record expenses' },
        { key:'income',                 label:'Income',                      desc:'Record income' },
        { key:'payroll',                label:'Payroll',                     desc:'Staff payroll' },
        { key:'budget',                 label:'Budget',                      desc:'Budget management' },
        { key:'capitation',             label:'Capitation',                  desc:'Govt capitation funds' },
        { key:'procurement',            label:'Procurement',                 desc:'Purchase orders, GRN' },
        { key:'stores',                 label:'Stores / Inventory',          desc:'Stock management' },
        { key:'finance_analytics',      label:'Finance Analytics',           desc:'Finance dashboards' },
    ]},
    { group:'👩‍🏫 Staff & HR', items:[
        { key:'staff',                  label:'Staff Management',            desc:'HR, staff records' },
        { key:'teachers',               label:'Teachers',                    desc:'Teacher management' },
        { key:'teachers_appraisal',     label:'Teacher Appraisal',           desc:'Performance appraisal' },
        { key:'teachers_cpd',           label:'Teacher CPD',                 desc:'Professional development' },
        { key:'teachers_leave',         label:'Teacher Leave',               desc:'Leave management' },
        { key:'hr_payroll',             label:'HR & Payroll',                desc:'Full HR module' },
    ]},
    { group:'📡 Communication', items:[
        { key:'communication',          label:'Communication Hub',           desc:'Bulk SMS, email, WhatsApp' },
        { key:'communication_whatsapp', label:'WhatsApp Business',           desc:'WhatsApp API messages' },
        { key:'portals',                label:'Parent Portals',              desc:'Parent/student portal users' },
    ]},
    { group:'📖 Academic', items:[
        { key:'curriculum',             label:'Curriculum',                  desc:'Lesson plans, schemes' },
        { key:'timetable',              label:'Timetable',                   desc:'Class timetable' },
        { key:'library',                label:'Library',                     desc:'Library catalog, checkout' },
        { key:'learning',               label:'E-Learning / LMS',            desc:'Videos, learning content' },
        { key:'cbc_command',            label:'CBC Command Centre',          desc:'CBC management hub' },
        { key:'jss',                    label:'JSS (Junior Secondary)',       desc:'JSS pathways, reports' },
        { key:'remedial',               label:'Remedial',                    desc:'Remedial classes' },
    ]},
    { group:'🏠 Other Modules', items:[
        { key:'hostel',                 label:'Hostel',                      desc:'Hostel management' },
        { key:'transport',              label:'Transport',                   desc:'Bus management' },
        { key:'assets',                 label:'Assets',                      desc:'School assets' },
        { key:'nemis',                  label:'NEMIS',                       desc:'NEMIS export' },
        { key:'knec_compliance',        label:'KNEC Compliance',             desc:'KCSE compliance' },
        { key:'ptm',                    label:'Parent-Teacher Meetings',     desc:'PTM management' },
        { key:'multi_campus',           label:'Multi-Campus',                desc:'Multi-branch management' },
        { key:'website_builder',        label:'Website Builder',             desc:'School website' },
        { key:'academic_calendar',      label:'Academic Calendar',           desc:'Events, holidays' },
        { key:'leave_out',              label:'Leave Out',                   desc:'Student leave passes' },
        { key:'reports',                label:'Reports',                     desc:'Government/general reports' },
        { key:'analytics',              label:'Analytics Dashboard',         desc:'School analytics hub' },
    ]},
    { group:'⚙️ Admin Only', items:[
        { key:'settings',               label:'Settings',                    desc:'System settings' },
        { key:'users',                  label:'User Management',             desc:'⚠️ SUPER ADMIN ONLY' },
        { key:'super_admin',            label:'Super Admin Panel',           desc:'⚠️ SUPER ADMIN ONLY' },
        { key:'backup',                 label:'Backup & Restore',            desc:'⚠️ SUPER ADMIN ONLY' },
        { key:'assign_roles',           label:'Assign User Roles',           desc:'Principal + Admin' },
    ]},
];

const ALL_PERMISSION_KEYS = PAGE_PERMISSIONS.flatMap(g => g.items.map(i => i.key));

const ROLE_PRESETS: Record<string, string[]> = {
    admin:        ALL_PERMISSION_KEYS,
    principal:    ALL_PERMISSION_KEYS.filter(k => !['users','super_admin','backup'].includes(k)).concat(['assign_roles']),
    deputy:       ['dashboard','students','exams_marks','exams_cbc_marks','exams_manage','exams_report_cards','exams_cbc_report_cards','exams_analysis','exams_principal_report','exams_marks_completion','exams_student_passport','exams_class_teacher','exams_cohort_tracker','exams_broadsheet','exams_merit_list','exams_sba','attendance','attendance_biometric','discipline','guidance','communication','curriculum','timetable','academic_calendar','staff','teachers','teachers_appraisal','teachers_cpd','teachers_leave','hr_payroll','reports','analytics'],
    hod:          ['dashboard','exams_marks','exams_cbc_marks','exams_manage','exams_report_cards','exams_cbc_report_cards','exams_analysis','exams_marks_completion','exams_student_passport','exams_class_teacher','exams_cohort_tracker','exams_broadsheet','exams_merit_list','exams_sba','exams_question_bank','exams_release_results','exams_subject_grading','exams_ai_insights','attendance','students','discipline','curriculum','timetable','reports'],
    teacher:      ['dashboard','exams_marks','exams_cbc_marks','exams_report_cards','exams_cbc_report_cards','attendance'],
    bursar:       ['dashboard','fees','fees_collect','fees_structure','fees_reports','fees_mpesa','expenses','income','payroll','budget','capitation','procurement','stores','finance_analytics','reports'],
    accountant:   ['dashboard','fees','fees_reports','expenses','income','finance_analytics','reports'],
    librarian:    ['dashboard','library'],
    nurse:        ['dashboard','students_health'],
    receptionist: ['dashboard','students','admissions','visitors','attendance'],
    hostel:       ['dashboard','hostel'],
};

const ROLES_META = [
    { key:'admin',        label:'Super Admin',     icon:'👑', color:'#dc2626' },
    { key:'principal',    label:'Principal',        icon:'🏛️', color:'#7c3aed' },
    { key:'deputy',       label:'Deputy Principal', icon:'🎓', color:'#4f46e5' },
    { key:'hod',          label:'Head of Dept',     icon:'📚', color:'#0891b2' },
    { key:'teacher',      label:'Teacher',          icon:'👩‍🏫', color:'#059669' },
    { key:'bursar',       label:'Bursar',           icon:'💰', color:'#d97706' },
    { key:'accountant',   label:'Accountant',       icon:'📊', color:'#f59e0b' },
    { key:'librarian',    label:'Librarian',        icon:'📖', color:'#6366f1' },
    { key:'nurse',        label:'Nurse',            icon:'🏥', color:'#ec4899' },
    { key:'receptionist', label:'Receptionist',     icon:'🤝', color:'#0d9488' },
    { key:'hostel',       label:'Hostel Warden',    icon:'🏠', color:'#8b5cf6' },
];

type Tab = 'users'|'roles'|'permissions';

/* ══════════════════════════════════════════════════════════════ */
export default function SuperAdminPage() {
    const [tab, setTab]               = useState<Tab>('users');
    const [users, setUsers]           = useState<any[]>([]);
    const [teachers, setTeachers]     = useState<any[]>([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showModal, setShowModal]   = useState(false);
    const [editUser, setEditUser]     = useState<any>(null);
    const [showPass, setShowPass]     = useState(false);
    const [saving, setSaving]         = useState(false);

    /* User form state */
    const [form, setForm] = useState({
        full_name:'', username:'', email:'', phone:'',
        role:'teacher', is_active:true, teacher_id:'',
        can_assign_roles:false, must_change_pass:false,
    });
    const [password, setPassword]         = useState('');
    const [perms, setPerms]               = useState<Record<string,boolean>>({});

    /* Role editor state */
    const [editRoleKey, setEditRoleKey]   = useState('');
    const [rolePerms, setRolePerms]       = useState<Record<string,boolean>>({});

    /* ─── FETCH ─── */
    const load = useCallback(async () => {
        setLoading(true);
        const [uRes, tRes] = await Promise.all([
            supabase.from('school_users').select('*').order('full_name'),
            supabase.from('school_teachers').select('id,first_name,last_name,teacher_code').order('first_name'),
        ]);
        setUsers(uRes.data || []);
        setTeachers(tRes.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    /* ─── FILTERED USERS ─── */
    const filtered = useMemo(() => users.filter(u => {
        const bySearch = !search || `${u.full_name} ${u.username} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());
        const byRole   = !roleFilter || u.role === roleFilter;
        return bySearch && byRole;
    }), [users, search, roleFilter]);

    /* ─── OPEN MODAL ─── */
    const openAdd = () => {
        setEditUser(null);
        setForm({ full_name:'', username:'', email:'', phone:'', role:'teacher', is_active:true, teacher_id:'', can_assign_roles:false, must_change_pass:false });
        setPassword('');
        setPerms(buildDefaultPerms('teacher'));
        setShowModal(true);
    };

    const openEdit = (u: any) => {
        setEditUser(u);
        setForm({
            full_name: u.full_name || '', username: u.username || '',
            email: u.email || '', phone: u.phone || '',
            role: u.role || 'teacher', is_active: u.is_active !== false,
            teacher_id: u.teacher_id || '', can_assign_roles: u.can_assign_roles || false,
            must_change_pass: u.must_change_pass || false,
        });
        setPassword('');
        const existing = u.page_permissions || u.permissions || {};
        setPerms(buildPermsFromExisting(existing, u.role));
        setShowModal(true);
    };

    const buildDefaultPerms = (role: string) => {
        const preset = ROLE_PRESETS[role] || [];
        const obj: Record<string,boolean> = {};
        ALL_PERMISSION_KEYS.forEach(k => { obj[k] = preset.includes(k); });
        return obj;
    };

    const buildPermsFromExisting = (existing: any, role: string) => {
        const defaults = buildDefaultPerms(role);
        const obj: Record<string,boolean> = { ...defaults };
        Object.keys(existing).forEach(k => { obj[k] = !!existing[k]; });
        return obj;
    };

    const applyRolePreset = (role: string) => {
        setForm(f => ({ ...f, role }));
        setPerms(buildDefaultPerms(role));
    };

    /* ─── SAVE USER ─── */
    const saveUser = async () => {
        if (!form.full_name.trim()) return toast.error('Full name required');
        if (!form.username.trim()) return toast.error('Username required');
        if (!editUser && !password) return toast.error('Password required for new users');

        setSaving(true);

        // Build permissions object
        const pagePermissions: Record<string,boolean> = {};
        ALL_PERMISSION_KEYS.forEach(k => { pagePermissions[k] = !!perms[k]; });

        const payload: any = {
            full_name:          form.full_name.trim(),
            username:           form.username.trim().toLowerCase(),
            email:              form.email || null,
            phone:              form.phone || null,
            role:               form.role,
            user_type:          form.role,
            is_active:          form.is_active,
            teacher_id:         form.teacher_id ? Number(form.teacher_id) : null,
            can_assign_roles:   form.can_assign_roles,
            must_change_pass:   form.must_change_pass,
            page_permissions:   pagePermissions,
            permissions:        pagePermissions, // keep legacy column too
        };

        if (password) {
            // Simple hash placeholder — server should bcrypt this, or use existing pattern
            payload.password_hash = password; // your login API handles bcrypt comparison
        }

        let error;
        if (editUser) {
            const res = await supabase.from('school_users').update(payload).eq('id', editUser.id);
            error = res.error;
        } else {
            const res = await supabase.from('school_users').insert(payload);
            error = res.error;
        }

        setSaving(false);
        if (error) { toast.error('Save failed: ' + error.message); return; }
        toast.success(editUser ? '✅ User updated!' : '✅ User created!');
        setShowModal(false);
        load();
    };

    /* ─── DELETE USER ─── */
    const deleteUser = async (u: any) => {
        if (u.role === 'admin') return toast.error('Cannot delete Super Admin');
        if (!confirm(`Delete user "${u.full_name}"? This cannot be undone.`)) return;
        await supabase.from('school_users').delete().eq('id', u.id);
        toast.success('User deleted');
        load();
    };

    /* ─── TOGGLE ACTIVE ─── */
    const toggleActive = async (u: any) => {
        if (u.role === 'admin') return toast.error('Cannot deactivate Super Admin');
        await supabase.from('school_users').update({ is_active: !u.is_active }).eq('id', u.id);
        toast.success(u.is_active ? 'User deactivated' : 'User activated');
        load();
    };

    /* ─── ROLE EDITOR ─── */
    const openRoleEditor = (roleKey: string) => {
        setEditRoleKey(roleKey);
        const preset = ROLE_PRESETS[roleKey] || [];
        const obj: Record<string,boolean> = {};
        ALL_PERMISSION_KEYS.forEach(k => { obj[k] = preset.includes(k); });
        setRolePerms(obj);
        setTab('permissions');
    };

    const saveRolePermissions = async () => {
        if (!editRoleKey) return;
        // Update ALL users with this role to use new permissions
        const pagePermissions: Record<string,boolean> = {};
        ALL_PERMISSION_KEYS.forEach(k => { pagePermissions[k] = !!rolePerms[k]; });

        const { error } = await supabase.from('school_users')
            .update({ page_permissions: pagePermissions, permissions: pagePermissions })
            .eq('role', editRoleKey);

        if (error) { toast.error('Failed: ' + error.message); return; }
        toast.success(`✅ Permissions updated for all ${editRoleKey} users!`);
    };

    const roleMeta = (role: string) => ROLES_META.find(r => r.key === role) || { label: role, icon:'👤', color:'#6b7280' };

    const tabBtn = (key: Tab, label: string, icon: any) => (
        <button onClick={() => setTab(key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${tab === key ? 'bg-red-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:bg-red-50'}`}>
            {icon}{label}
        </button>
    );

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"/></div>;

    return (
        <div className="space-y-6 pb-16">
            {/* ═══ HEADER ═══ */}
            <div className="rounded-2xl p-6 text-white" style={{ background:'linear-gradient(135deg,#7f1d1d,#dc2626,#b91c1c)' }}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2">👑 Super Admin — User Management & Roles</h1>
                        <p className="text-sm text-white/70 mt-1">⚠️ This page is visible to Super Admin only. Assign roles, set permissions, link teachers to accounts.</p>
                    </div>
                    <button onClick={load} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 self-start"><FiRefreshCw size={14}/></button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                    {ROLES_META.slice(0,5).map(r => {
                        const count = users.filter(u => u.role === r.key).length;
                        return (
                            <div key={r.key} className="bg-white/10 rounded-xl p-3 text-center">
                                <p className="text-sm">{r.icon}</p>
                                <p className="text-xl font-black text-white">{count}</p>
                                <p className="text-[10px] text-white/60 uppercase font-bold">{r.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ TABS ═══ */}
            <div className="flex gap-2 flex-wrap">
                {tabBtn('users',       '👥 Users',            <FiUsers size={11}/>)}
                {tabBtn('roles',       '🎭 Roles & Defaults', <FiShield size={11}/>)}
                {tabBtn('permissions', '🔑 Edit Permissions',  <FiKey size={11}/>)}
            </div>

            {/* ══════ USERS TAB ══════ */}
            {tab === 'users' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 max-w-xs">
                            <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={13}/>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300"/>
                        </div>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300">
                            <option value="">— All Roles —</option>
                            {ROLES_META.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
                        </select>
                        <button onClick={openAdd} className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-1.5 shadow ml-auto">
                            <FiPlus size={11}/> Add User
                        </button>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    {['User','Username','Role','Teacher Link','Email/Phone','Status','Last Login','Permissions','Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(u => {
                                    const rm = roleMeta(u.role);
                                    const linkedTeacher = teachers.find(t => t.id === u.teacher_id);
                                    const permCount = Object.values(u.page_permissions || u.permissions || {}).filter(Boolean).length;
                                    return (
                                        <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: rm.color }}>
                                                        {rm.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-xs">{u.full_name}</p>
                                                        {u.must_change_pass && <p className="text-[9px] text-amber-600 font-bold">⚠️ Must change password</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.username}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background:`${rm.color}20`, color: rm.color }}>
                                                    {rm.icon} {rm.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                {linkedTeacher ? `${linkedTeacher.first_name} ${linkedTeacher.last_name}` : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                <p>{u.email || '—'}</p>
                                                <p className="text-[10px]">{u.phone || ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button onClick={() => toggleActive(u)}
                                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                    {u.is_active ? '✅ Active' : '❌ Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-[10px] text-gray-400">
                                                {u.last_login ? new Date(u.last_login).toLocaleDateString('en-KE') : 'Never'}
                                                {u.login_count > 0 && <p>{u.login_count} logins</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{permCount}/{ALL_PERMISSION_KEYS.length} pages</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition"><FiEdit2 size={12}/></button>
                                                    {u.role !== 'admin' && (
                                                        <button onClick={() => deleteUser(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"><FiTrash2 size={12}/></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="py-12 text-center text-gray-400">
                                <FiUsers size={36} className="mx-auto mb-3 text-gray-200"/>
                                <p>No users found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════ ROLES TAB ══════ */}
            {tab === 'roles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ROLES_META.map(r => {
                        const count = users.filter(u => u.role === r.key).length;
                        const preset = ROLE_PRESETS[r.key] || [];
                        return (
                            <div key={r.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{r.icon}</span>
                                        <div>
                                            <p className="font-black text-gray-800">{r.label}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">{r.key} role · {count} user{count !== 1?'s':''}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background:`${r.color}20`, color:r.color }}>
                                        {preset.length} pages
                                    </span>
                                </div>

                                {/* Permission preview */}
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {preset.slice(0,8).map(k => {
                                        const item = PAGE_PERMISSIONS.flatMap(g => g.items).find(i => i.key === k);
                                        return <span key={k} className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item?.label || k}</span>;
                                    })}
                                    {preset.length > 8 && <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">+{preset.length - 8} more</span>}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => openRoleEditor(r.key)}
                                        className="flex-1 px-3 py-2 text-xs font-bold text-white rounded-xl transition"
                                        style={{ background: r.color }}>
                                        ✏️ Edit Permissions
                                    </button>
                                    <button onClick={() => { setRoleFilter(r.key); setTab('users'); }}
                                        className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition border border-gray-200">
                                        👥 View Users
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════ PERMISSIONS EDITOR TAB ══════ */}
            {tab === 'permissions' && (
                <div className="space-y-4">
                    {/* Role selector */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <p className="font-black text-gray-700 text-sm">Editing permissions for:</p>
                        {ROLES_META.map(r => (
                            <button key={r.key} onClick={() => openRoleEditor(r.key)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${editRoleKey === r.key ? 'text-white shadow' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                style={editRoleKey === r.key ? { background: r.color } : {}}>
                                {r.icon} {r.label}
                            </button>
                        ))}
                    </div>

                    {!editRoleKey ? (
                        <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
                            <FiKey size={36} className="text-gray-200 mx-auto mb-3"/>
                            <p className="text-gray-400 font-bold">Select a role above to edit its permissions</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-black text-red-800">Editing: {roleMeta(editRoleKey).icon} {roleMeta(editRoleKey).label}</p>
                                    <p className="text-xs text-red-600 mt-0.5">Changes apply to ALL users with this role</p>
                                </div>
                                <button onClick={saveRolePermissions}
                                    className="px-5 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-2 shadow">
                                    <FiSave size={13}/> Save & Apply to All {roleMeta(editRoleKey).label}s
                                </button>
                            </div>

                            {PAGE_PERMISSIONS.map(group => (
                                <div key={group.group} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                                        <p className="font-black text-gray-800 text-sm">{group.group}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                const next = { ...rolePerms };
                                                group.items.forEach(i => { next[i.key] = true; });
                                                setRolePerms(next);
                                            }} className="text-[10px] font-bold text-blue-600 hover:underline">All On</button>
                                            <button onClick={() => {
                                                const next = { ...rolePerms };
                                                group.items.forEach(i => { next[i.key] = false; });
                                                setRolePerms(next);
                                            }} className="text-[10px] font-bold text-gray-400 hover:underline">All Off</button>
                                        </div>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {group.items.map(item => (
                                            <label key={item.key} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" checked={!!rolePerms[item.key]}
                                                    onChange={e => setRolePerms(p => ({ ...p, [item.key]: e.target.checked }))}
                                                    className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"/>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-gray-800">{item.label}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                                                </div>
                                                <code className="text-[9px] text-gray-300 font-mono mt-0.5">{item.key}</code>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════ ADD/EDIT USER MODAL ══════ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl my-4">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <p className="font-black text-gray-800 text-lg">{editUser ? '✏️ Edit User' : '➕ Add New User'}</p>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><FiX size={16}/></button>
                        </div>

                        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Basic Info */}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">👤 Basic Information</p>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label:'Full Name *', key:'full_name', type:'text', placeholder:'e.g. John Kamau' },
                                        { label:'Username *', key:'username', type:'text', placeholder:'e.g. jkamau' },
                                        { label:'Email', key:'email', type:'email', placeholder:'email@school.ac.ke' },
                                        { label:'Phone', key:'phone', type:'tel', placeholder:'07XXXXXXXX' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{f.label}</label>
                                            <input type={f.type} value={(form as any)[f.key]} placeholder={f.placeholder}
                                                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300"/>
                                        </div>
                                    ))}
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                                    <div className="relative">
                                        <input type={showPass ? 'text' : 'password'} value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder={editUser ? 'Enter to change password…' : 'Set password…'}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 pr-10"/>
                                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-gray-400">
                                            {showPass ? <FiEyeOff size={13}/> : <FiEye size={13}/>}
                                        </button>
                                    </div>
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Role *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ROLES_META.map(r => (
                                            <button key={r.key} onClick={() => applyRolePreset(r.key)}
                                                className={`px-3 py-2 text-xs font-bold rounded-xl text-left transition border-2 ${form.role === r.key ? 'border-red-400 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                                style={form.role === r.key ? { background: r.color, borderColor: r.color } : {}}>
                                                {r.icon} {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Teacher link (only for teacher role) */}
                                {form.role === 'teacher' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Link to Teacher Record</label>
                                        <select value={form.teacher_id} onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300">
                                            <option value="">— Not linked —</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.teacher_code || 'No code'})</option>)}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">Linking restricts marks entry to this teacher&apos;s assigned subjects only</p>
                                    </div>
                                )}

                                {/* Flags */}
                                <div className="space-y-2">
                                    {[
                                        { key:'is_active', label:'Account Active', desc:'Inactive users cannot login' },
                                        { key:'can_assign_roles', label:'Can Assign Roles', desc:'Allow this user to manage other users\' roles' },
                                        { key:'must_change_pass', label:'Must Change Password on Next Login', desc:'' },
                                    ].map(f => (
                                        <label key={f.key} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                                            <input type="checkbox" checked={!!(form as any)[f.key]}
                                                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.checked }))}
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"/>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">{f.label}</p>
                                                {f.desc && <p className="text-[10px] text-gray-400">{f.desc}</p>}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Permissions */}
                            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                                <div className="flex items-center justify-between sticky top-0 bg-white py-1 z-10">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🔑 Page Permissions</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => { const obj: Record<string,boolean> = {}; ALL_PERMISSION_KEYS.forEach(k => { obj[k] = true; }); setPerms(obj); }}
                                            className="text-[10px] font-bold text-blue-600 hover:underline">All On</button>
                                        <button onClick={() => { const obj: Record<string,boolean> = {}; ALL_PERMISSION_KEYS.forEach(k => { obj[k] = false; }); setPerms(obj); }}
                                            className="text-[10px] font-bold text-gray-400 hover:underline">All Off</button>
                                        <button onClick={() => setPerms(buildDefaultPerms(form.role))}
                                            className="text-[10px] font-bold text-red-600 hover:underline">Reset to Role Default</button>
                                    </div>
                                </div>
                                {PAGE_PERMISSIONS.map(group => (
                                    <div key={group.group} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-500 uppercase mb-2">{group.group}</p>
                                        <div className="space-y-1">
                                            {group.items.map(item => (
                                                <label key={item.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                                                    <input type="checkbox" checked={!!perms[item.key]}
                                                        onChange={e => setPerms(p => ({ ...p, [item.key]: e.target.checked }))}
                                                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"/>
                                                    <span className="text-xs text-gray-700 font-medium">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition border border-gray-200">
                                Cancel
                            </button>
                            <button onClick={saveUser} disabled={saving}
                                className="px-6 py-2.5 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-2 shadow disabled:opacity-50">
                                <FiSave size={13}/> {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
