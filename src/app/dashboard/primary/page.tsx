'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSchoolMode } from '@/contexts/SchoolModeContext';
import {
    FiUsers, FiFileText, FiGrid, FiAward, FiBarChart2,
    FiCalendar, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiBook,
    FiActivity, FiShield
} from 'react-icons/fi';
import Link from 'next/link';

export default function PrimaryDashboard() {
    const { forms, userSection } = useSchoolMode();
    const [stats, setStats]   = useState({ students: 0, presentToday: 0, feeCollected: 0, outstanding: 0 });
    const [terms, setTerms]   = useState<any[]>([]);
    const [currentTerm, setCurrentTerm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        if (forms.length === 0) return;
        const load = async () => {
            setLoading(true);
            const formIds = forms.map(f => f.id);

            const [studRes, termRes, attRes, feeRes] = await Promise.all([
                supabase.from('school_students').select('id', { count: 'exact' }).in('form_id', formIds).eq('status', 'Active'),
                supabase.from('school_terms').select('*').order('id', { ascending: false }).limit(5),
                supabase.from('school_attendance').select('id, status', { count: 'exact' })
                    .in('form_id', formIds)
                    .eq('date', new Date().toISOString().slice(0, 10))
                    .eq('status', 'present'),
                supabase.from('school_fee_payments').select('amount').in('student_id',
                    (await supabase.from('school_students').select('id').in('form_id', formIds)).data?.map((s: any) => s.id) || []
                ),
            ]);

            const termList = termRes.data || [];
            setTerms(termList);
            setCurrentTerm(termList[0] || null);

            const totalFees = (feeRes.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

            setStats({
                students:     studRes.count || 0,
                presentToday: attRes.count || 0,
                feeCollected: totalFees,
                outstanding:  0,
            });
            setLoading(false);
        };
        load();
    }, [forms]);

    const primaryGrades = [
        { label: 'PP 1',    level: -2, color: '#8b5cf6', emoji: '🌱' },
        { label: 'PP 2',    level: -1, color: '#7c3aed', emoji: '🌿' },
        { label: 'Grade 1', level:  1, color: '#2563eb', emoji: '📚' },
        { label: 'Grade 2', level:  2, color: '#0891b2', emoji: '📖' },
        { label: 'Grade 3', level:  3, color: '#059669', emoji: '✏️' },
        { label: 'Grade 4', level:  4, color: '#d97706', emoji: '🔬' },
        { label: 'Grade 5', level:  5, color: '#dc2626', emoji: '🌍' },
        { label: 'Grade 6', level:  6, color: '#b45309', emoji: '🏆' },
    ];

    const quickLinks = [
        { href: '/dashboard/primary/marks',        label: 'Mark Entry',       emoji: '✏️',  color: '#2563eb' },
        { href: '/dashboard/primary/broadsheet',   label: 'Broadsheet',       emoji: '📊',  color: '#059669' },
        { href: '/dashboard/primary/report-cards', label: 'Report Cards',     emoji: '📄',  color: '#7c3aed' },
        { href: '/dashboard/primary/pp-activities',label: 'PP1/PP2 Activities',emoji: '👶', color: '#8b5cf6' },
        { href: '/dashboard/attendance',           label: 'Attendance',       emoji: '📋',  color: '#0891b2' },
        { href: '/dashboard/fees/collect',         label: 'Collect Fees',     emoji: '💳',  color: '#d97706' },
        { href: '/dashboard/students',             label: 'Students',         emoji: '👥',  color: '#dc2626' },
        { href: '/dashboard/exams/kpsea',          label: 'KPSEA Hub',        emoji: '🏆',  color: '#b45309' },
        { href: '/dashboard/primary/analytics',    label: 'Analytics',        emoji: '📈',  color: '#0f766e' },
        { href: '/dashboard/discipline',           label: 'Discipline',       emoji: '🛡️', color: '#6b7280' },
        { href: '/dashboard/communication',        label: 'SMS/WhatsApp',     emoji: '📱',  color: '#059669' },
        { href: '/dashboard/fees/structure',       label: 'Fee Structure',    emoji: '📐',  color: '#2563eb' },
    ];

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: 24 }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 28 }}>🏫</span>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
                            Primary School Dashboard
                        </h1>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                            {currentTerm ? `${currentTerm.term_name} ${currentTerm.year}` : 'All Terms'} •{' '}
                            CBC Competency-Based Curriculum • PP1 → Grade 6
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Active Pupils',   value: loading ? '...' : stats.students.toLocaleString(),  icon: '👥', color: '#2563eb', bg: '#eff6ff' },
                    { label: 'Present Today',   value: loading ? '...' : stats.presentToday.toLocaleString(), icon: '✅', color: '#059669', bg: '#f0fdf4' },
                    { label: 'Classes',         value: forms.length.toString(),                              icon: '🏫', color: '#7c3aed', bg: '#f5f3ff' },
                    { label: 'Fee Collected',   value: loading ? '...' : `KES ${(stats.feeCollected/1000).toFixed(0)}K`, icon: '💰', color: '#d97706', bg: '#fffbeb' },
                ].map(k => (
                    <div key={k.label} style={{ background: '#fff', borderRadius: 14, padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${k.color}18` }}>
                        <div style={{ fontSize: 26, marginBottom: 6 }}>{k.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* CBC Level Badges */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📚 Primary Classes Overview</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {primaryGrades.map(g => {
                        const classForm = forms.find(f => f.form_level === g.level);
                        return (
                            <div key={g.level} style={{
                                background: classForm ? g.color + '15' : '#f1f5f9',
                                border: `1.5px solid ${classForm ? g.color + '40' : '#e2e8f0'}`,
                                borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: classForm ? g.color : '#94a3b8' }}>{g.label}</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>{classForm ? classForm.form_name : 'Not set up'}</div>
                                </div>
                                {classForm && <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, marginLeft: 4 }} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quick Links */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>⚡ Quick Actions</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {quickLinks.map(ql => (
                        <Link key={ql.href} href={ql.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: ql.color + '0e', border: `1.5px solid ${ql.color}30`,
                                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8
                            }}
                                onMouseEnter={e => (e.currentTarget.style.background = ql.color + '20')}
                                onMouseLeave={e => (e.currentTarget.style.background = ql.color + '0e')}
                            >
                                <span style={{ fontSize: 20 }}>{ql.emoji}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: ql.color }}>{ql.label}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* CBC Info Banner */}
            <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', borderRadius: 16, padding: '20px 24px', color: '#fff' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>🇰🇪 Kenya CBC Primary Curriculum</h2>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.9, maxWidth: 600 }}>
                    Assessment uses <strong>EE / ME / AE / BE</strong> rubric levels — no numeric exam scores for Grade 1–6.
                    PP1 &amp; PP2 use play-based activity tracking only.
                    Grade 6 pupils sit <strong>KPSEA</strong> for transition to Junior Secondary.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    {['EE — Exceeds Expectation', 'ME — Meets Expectation', 'AE — Approaches Expectation', 'BE — Below Expectation'].map(l => (
                        <span key={l} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>{l}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
