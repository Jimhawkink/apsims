'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiSearch, FiShield, FiKey, FiUserCheck, FiEye, FiEyeOff } from 'react-icons/fi';

type UserRole = 'admin' | 'principal' | 'bursar' | 'accountant' | 'receptionist' | 'teacher';

interface SystemUser {
    id?: number; username: string; password_hash: string; full_name: string; email: string;
    phone: string; role: UserRole; user_type: string; is_active: boolean;
    permissions: Record<string, boolean>;
}

const ROLES: { key: UserRole; label: string; icon: string; color: string; desc: string }[] = [
    { key: 'admin', label: 'Admin', icon: '🔑', color: '#ef4444', desc: 'Full system access' },
    { key: 'principal', label: 'Principal', icon: '🎓', color: '#8b5cf6', desc: 'School management' },
    { key: 'bursar', label: 'Bursar', icon: '💰', color: '#22c55e', desc: 'Fees & finance' },
    { key: 'accountant', label: 'Accountant', icon: '📊', color: '#3b82f6', desc: 'Accounts & reports' },
    { key: 'receptionist', label: 'Receptionist', icon: '📋', color: '#f59e0b', desc: 'Student intake & records' },
    { key: 'teacher', label: 'Teacher', icon: '👨‍🏫', color: '#06b6d4', desc: 'Class & exams' },
];

const ALL_PERMISSIONS = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'students', label: 'Students', icon: '👨‍🎓' },
    { key: 'staff', label: 'Staff', icon: '👨‍🏫' },
    { key: 'fees', label: 'Fees & Accounts', icon: '💰' },
    { key: 'exams', label: 'Exams & Results', icon: '📝' },
    { key: 'attendance', label: 'Attendance', icon: '📋' },
    { key: 'payroll', label: 'Payroll', icon: '🏦' },
    { key: 'expenses', label: 'Expenses', icon: '💸' },
    { key: 'income', label: 'Income', icon: '💹' },
    { key: 'assets', label: 'Assets', icon: '🏗️' },
    { key: 'reports', label: 'Reports', icon: '📈' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
    { key: 'users', label: 'User Management', icon: '🔑' },
];

const DEFAULT_PERMS: Record<UserRole, string[]> = {
    admin: ALL_PERMISSIONS.map(p => p.key),
    principal: ALL_PERMISSIONS.map(p => p.key),
    bursar: ['dashboard', 'students', 'fees', 'payroll', 'expenses', 'income', 'reports'],
    accountant: ['dashboard', 'fees', 'payroll', 'expenses', 'income', 'reports'],
    receptionist: ['dashboard', 'students', 'attendance'],
    teacher: ['dashboard', 'students', 'exams', 'attendance'],
};

const defaultUser: SystemUser = {
    username: '', password_hash: '', full_name: '', email: '', phone: '',
    role: 'teacher', user_type: 'teacher', is_active: true,
    permissions: {},
};

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPermsModal, setShowPermsModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<SystemUser>({ ...defaultUser });
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [permsUser, setPermsUser] = useState<any>(null);
    const [perms, setPerms] = useState<Record<string, boolean>>({});

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('school_users').select('*').order('full_name');
        setUsers(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const filtered = users.filter(u =>
        `${u.full_name} ${u.username} ${u.role}`.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => {
        setEditId(null);
        setFormData({ ...defaultUser });
        setPassword('');
        setShowModal(true);
    };

    const openEdit = (u: any) => {
        setEditId(u.id);
        setFormData({ ...defaultUser, ...u, permissions: u.permissions || {} });
        setPassword('');
        setShowModal(true);
    };

    const openPerms = (u: any) => {
        setPermsUser(u);
        const current = u.permissions || {};
        // If no permissions set, use defaults for role
        const rolePerms = DEFAULT_PERMS[u.role as UserRole] || [];
        const p: Record<string, boolean> = {};
        ALL_PERMISSIONS.forEach(perm => {
            p[perm.key] = current[perm.key] !== undefined ? current[perm.key] : rolePerms.includes(perm.key);
        });
        setPerms(p);
        setShowPermsModal(true);
    };

    const handleSave = async () => {
        if (!formData.username || !formData.full_name) { toast.error('Username and full name are required'); return; }
        if (!editId && !password) { toast.error('Password is required for new users'); return; }

        const rolePerms = DEFAULT_PERMS[formData.role] || [];
        const permObj: Record<string, boolean> = {};
        ALL_PERMISSIONS.forEach(p => { permObj[p.key] = rolePerms.includes(p.key); });

        const payload: any = {
            username: formData.username.toLowerCase().trim(),
            full_name: formData.full_name,
            email: formData.email || null,
            phone: formData.phone || null,
            role: formData.role,
            user_type: formData.role,
            is_active: formData.is_active,
            permissions: editId ? (formData.permissions || permObj) : permObj,
        };

        if (password) {
            try {
                const bcrypt = (await import('bcryptjs')).default;
                payload.password_hash = await bcrypt.hash(password, 10);
            } catch {
                payload.password_hash = password;
            }
        }

        let error;
        if (editId) {
            ({ error } = await supabase.from('school_users').update(payload).eq('id', editId));
        } else {
            ({ error } = await supabase.from('school_users').insert([payload]));
        }
        if (error) { toast.error(error.message || 'Failed to save user'); return; }
        toast.success(editId ? 'User updated ✅' : 'User created ✅');
        setShowModal(false); fetchUsers();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this user? This cannot be undone.')) return;
        const { error } = await supabase.from('school_users').delete().eq('id', id);
        if (error) { toast.error('Cannot delete this user'); return; }
        toast.success('User removed'); fetchUsers();
    };

    const toggleActive = async (u: any) => {
        const { error } = await supabase.from('school_users').update({ is_active: !u.is_active }).eq('id', u.id);
        if (error) { toast.error('Failed to update'); return; }
        toast.success(u.is_active ? 'User deactivated' : 'User activated');
        fetchUsers();
    };

    const savePerms = async () => {
        if (!permsUser) return;
        const { error } = await supabase.from('school_users').update({ permissions: perms }).eq('id', permsUser.id);
        if (error) { toast.error('Failed to save permissions'); return; }
        toast.success('Permissions updated ✅');
        setShowPermsModal(false); fetchUsers();
    };

    const roleInfo = (role: string) => ROLES.find(r => r.key === role) || ROLES[5];

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🔑 User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">{users.length} users • Create accounts, assign roles & manage permissions</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 text-sm"><FiPlus size={16} /> Create User</button>
            </div>

            {/* Role Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {ROLES.map(r => {
                    const count = users.filter(u => u.role === r.key).length;
                    return (
                        <div key={r.key} className="bg-white rounded-2xl border border-gray-200 p-4 text-center hover:shadow-md transition-all">
                            <div className="text-2xl mb-1">{r.icon}</div>
                            <p className="text-lg font-bold text-gray-800">{count}</p>
                            <p className="text-xs font-semibold" style={{ color: r.color }}>{r.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                    className="input-modern pl-10 py-2.5 text-sm" />
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="spinner" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400"><span className="text-4xl mb-3 block">🔑</span><p className="font-medium">No users found</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table-modern">
                                <thead><tr><th>#</th><th>User</th><th>Username</th><th>Role</th><th>Email</th><th>Phone</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filtered.map((u, i) => {
                                        const r = roleInfo(u.role);
                                        return (
                                            <tr key={u.id}>
                                                <td className="text-xs text-gray-400">{i + 1}</td>
                                                <td className="font-semibold">{u.full_name}</td>
                                                <td className="font-bold text-blue-600">{u.username}</td>
                                                <td>
                                                    <span className="badge" style={{ background: `${r.color}15`, color: r.color }}>
                                                        {r.icon} {r.label}
                                                    </span>
                                                </td>
                                                <td className="text-sm">{u.email || '-'}</td>
                                                <td className="text-sm">{u.phone || '-'}</td>
                                                <td>
                                                    <button onClick={() => toggleActive(u)} className={`badge cursor-pointer ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                        {u.is_active ? '✅ Active' : '❌ Inactive'}
                                                    </button>
                                                </td>
                                                <td className="text-xs text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-KE') : 'Never'}</td>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openPerms(u)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Permissions"><FiShield size={14} /></button>
                                                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="Edit"><FiEdit2 size={14} /></button>
                                                        <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit User Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content w-full max-w-xl mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-800">{editId ? '✏️ Edit User' : '➕ Create New User'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* Role Selection */}
                            <div>
                                <label className="lbl">User Role *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ROLES.map(r => (
                                        <button key={r.key} onClick={() => setFormData({ ...formData, role: r.key, user_type: r.key })}
                                            className={`p-3 rounded-xl text-center transition-all border-2 ${formData.role === r.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <div className="text-xl mb-0.5">{r.icon}</div>
                                            <p className="text-xs font-bold" style={{ color: formData.role === r.key ? r.color : '#64748b' }}>{r.label}</p>
                                            <p className="text-[10px] text-gray-400">{r.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="lbl">Full Name *</label><input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                <div><label className="lbl">Username *</label><input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" placeholder="e.g. jdoe" /></div>
                                <div><label className="lbl">Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                <div><label className="lbl">Phone</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-modern pl-4 py-2.5 text-sm" /></div>
                                <div className="col-span-2">
                                    <label className="lbl">{editId ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                                    <div className="relative">
                                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input-modern pl-4 pr-10 py-2.5 text-sm" placeholder="Enter password" />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="lbl mb-0">Account Active</label>
                                <button onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${formData.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                                <span className={`text-xs font-semibold ${formData.is_active ? 'text-green-600' : 'text-gray-400'}`}>{formData.is_active ? 'Active' : 'Inactive'}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                                <strong>💡 Default permissions</strong> will be assigned based on the selected role. You can customize them later using the 🛡️ permissions button.
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button onClick={() => setShowModal(false)} className="btn-outline text-sm">Cancel</button>
                                <button onClick={handleSave} className="btn-primary flex items-center gap-2 text-sm"><FiSave size={14} /> {editId ? 'Update User' : 'Create User'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions Modal */}
            {showPermsModal && permsUser && (
                <div className="modal-overlay" onClick={() => setShowPermsModal(false)}>
                    <div className="modal-content w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">🛡️ Manage Permissions</h3>
                                <p className="text-sm text-gray-500">{permsUser.full_name} ({ROLES.find(r => r.key === permsUser.role)?.label || permsUser.role})</p>
                            </div>
                            <button onClick={() => setShowPermsModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>

                        {permsUser.role === 'admin' && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 mb-4">
                                ⚠️ Admin users have full access to all modules. Permissions below are for reference.
                            </div>
                        )}

                        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                            {ALL_PERMISSIONS.map(perm => (
                                <div key={perm.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${perms[perm.key] ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{perm.icon}</span>
                                        <span className="text-sm font-semibold text-gray-700">{perm.label}</span>
                                    </div>
                                    <button onClick={() => setPerms({ ...perms, [perm.key]: !perms[perm.key] })}
                                        className={`w-11 h-6 rounded-full transition-all relative ${perms[perm.key] ? 'bg-green-500' : 'bg-gray-300'}`}
                                        disabled={permsUser.role === 'admin'}>
                                        <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md absolute top-0.5 transition-all ${perms[perm.key] ? 'left-5.5' : 'left-0.5'}`} style={{ width: 18, height: 18, left: perms[perm.key] ? 22 : 2 }} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 justify-between pt-4 mt-4 border-t border-gray-100">
                            <div className="flex gap-2">
                                <button onClick={() => { const all: Record<string, boolean> = {}; ALL_PERMISSIONS.forEach(p => { all[p.key] = true; }); setPerms(all); }}
                                    className="btn-outline text-xs">Grant All</button>
                                <button onClick={() => { const none: Record<string, boolean> = {}; ALL_PERMISSIONS.forEach(p => { none[p.key] = false; }); setPerms(none); }}
                                    className="btn-outline text-xs">Revoke All</button>
                                <button onClick={() => { const def: Record<string, boolean> = {}; const dp = DEFAULT_PERMS[permsUser.role as UserRole] || []; ALL_PERMISSIONS.forEach(p => { def[p.key] = dp.includes(p.key); }); setPerms(def); }}
                                    className="btn-outline text-xs">Reset to Default</button>
                            </div>
                            <button onClick={savePerms} className="btn-primary flex items-center gap-2 text-sm"><FiSave size={14} /> Save Permissions</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
