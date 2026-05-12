'use client';

import Link from 'next/link';
import {
    FiUsers, FiUserPlus, FiTrendingUp, FiCreditCard,
    FiCheckCircle, FiHome, FiTruck, FiShield
} from 'react-icons/fi';

const modules = [
    {
        href: '/dashboard/students/profile',
        label: 'Student profiles',
        desc: 'Full records',
        icon: FiUsers,
        color: '#3b82f6',
        bg: '#eff6ff',
        borderColor: '#bfdbfe',
        emoji: '👤',
    },
    {
        href: '/dashboard/students/admissions',
        label: 'Admissions',
        desc: 'Enrolment stats',
        icon: FiUserPlus,
        color: '#10b981',
        bg: '#ecfdf5',
        borderColor: '#a7f3d0',
        emoji: '🎓',
    },
    {
        href: '/dashboard/students/promotion',
        label: 'Promotion',
        desc: 'Class promotion',
        icon: FiTrendingUp,
        color: '#f59e0b',
        bg: '#fffbeb',
        borderColor: '#fde68a',
        emoji: '⬆️',
    },
    {
        href: '/dashboard/students/id-cards',
        label: 'ID cards',
        desc: 'Generate cards',
        icon: FiCreditCard,
        color: '#8b5cf6',
        bg: '#f5f3ff',
        borderColor: '#ddd6fe',
        emoji: '🪪',
    },
    {
        href: '/dashboard/students/clearance',
        label: 'Clearance',
        desc: 'End of year',
        icon: FiCheckCircle,
        color: '#64748b',
        bg: '#f8fafc',
        borderColor: '#cbd5e1',
        emoji: '✅',
    },
    {
        href: '/dashboard/hostel',
        label: 'Hostel',
        desc: 'Bed allocation',
        icon: FiHome,
        color: '#0891b2',
        bg: '#ecfeff',
        borderColor: '#a5f3fc',
        emoji: '🏠',
    },
    {
        href: '/dashboard/transport',
        label: 'Transport',
        desc: 'Bus passes',
        icon: FiTruck,
        color: '#0d9488',
        bg: '#f0fdfa',
        borderColor: '#99f6e4',
        emoji: '🚌',
    },
    {
        href: '/dashboard/discipline',
        label: 'Discipline',
        desc: 'Incident log',
        icon: FiShield,
        color: '#dc2626',
        bg: '#fef2f2',
        borderColor: '#fecaca',
        emoji: '🛡️',
    },
];

export default function StudentModuleShortcuts() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {modules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                    <Link
                        key={i}
                        href={mod.href}
                        className="group rounded-2xl border p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center relative overflow-hidden"
                        style={{
                            background: mod.bg,
                            borderColor: mod.borderColor,
                        }}
                    >
                        {/* Glow effect on hover */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl"
                            style={{ background: `radial-gradient(circle at center, ${mod.color}, transparent 70%)` }}
                        />

                        <div
                            className="w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center relative z-10 transition-transform group-hover:scale-110 duration-300"
                            style={{ background: `${mod.color}15` }}
                        >
                            <Icon size={18} style={{ color: mod.color }} />
                        </div>
                        <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 relative z-10">{mod.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 relative z-10">{mod.desc}</p>
                    </Link>
                );
            })}
        </div>
    );
}
