'use client';

import { useState, useMemo, useEffect } from 'react';
import { usePromotionData } from './usePromotionData';
import PromotionTab from './PromotionTab';
import EligibilityTab from './EligibilityTab';
import RulesTab from './RulesTab';
import HistoryTab from './HistoryTab';
import ClearanceTab from './ClearanceTab';
import ApprovalsTab from './ApprovalsTab';
import AlumniTab from './AlumniTab';
import AcademicYearsTab from './AcademicYearsTab';
import {
    FiTrendingUp, FiCheck, FiSettings, FiClock, FiClipboard,
    FiShield, FiAward, FiCalendar, FiUsers, FiActivity,
    FiArrowUpRight, FiArrowDownRight, FiZap, FiLayers
} from 'react-icons/fi';

type TabId = 'promotion' | 'eligibility' | 'rules' | 'history' | 'clearance' | 'approvals' | 'alumni' | 'academic-years';

const TABS: { id: TabId; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'promotion', label: 'Promotion', icon: FiTrendingUp, color: '#8b5cf6', desc: 'Promote & graduate students' },
    { id: 'eligibility', label: 'Eligibility', icon: FiCheck, color: '#22c55e', desc: 'Check student eligibility' },
    { id: 'rules', label: 'Rules Engine', icon: FiSettings, color: '#f59e0b', desc: 'Configure promotion rules' },
    { id: 'history', label: 'History & Rollback', icon: FiClock, color: '#3b82f6', desc: 'View audit trail' },
    { id: 'clearance', label: 'Clearance', icon: FiClipboard, color: '#06b6d4', desc: 'Department clearance' },
    { id: 'approvals', label: 'Approvals', icon: FiShield, color: '#ec4899', desc: 'Pending approvals' },
    { id: 'alumni', label: 'Alumni', icon: FiAward, color: '#10b981', desc: 'Graduate network' },
    { id: 'academic-years', label: 'Academic Years', icon: FiCalendar, color: '#6366f1', desc: 'Year management' },
];

export default function PromotionPage() {
    const [activeTab, setActiveTab] = useState<TabId>('promotion');
    const [tabTransition, setTabTransition] = useState(false);
    const data = usePromotionData();

    // KPI calculations
    const kpis = useMemo(() => {
        if (data.loading) return null;
        const activeStudents = data.students.filter((s: any) => s.status === 'Active').length;
        const eligibleStudents = data.students.filter((s: any) => s.promotion_eligible === 'Eligible').length;
        const pendingApprovals = data.approvals.filter((a: any) => a.status === 'Pending').length;
        const totalPromotions = data.history.filter((h: any) => h.action_type === 'Promotion' && !h.reversed_at).length;
        const totalGraduated = data.alumniList.length;
        const activeRules = data.rules.filter((r: any) => r.is_active !== false).length;
        const pendingClearance = data.clearanceForms.filter((c: any) => !c.all_cleared).length;
        const eligRate = activeStudents > 0 ? ((eligibleStudents / activeStudents) * 100).toFixed(1) : '0';
        return {
            activeStudents, eligibleStudents, pendingApprovals, totalPromotions,
            totalGraduated, activeRules, pendingClearance, eligRate
        };
    }, [data]);

    const handleTabChange = (tab: TabId) => {
        if (tab === activeTab) return;
        setTabTransition(true);
        setTimeout(() => {
            setActiveTab(tab);
            setTabTransition(false);
        }, 150);
    };

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
                    <FiZap className="absolute inset-0 m-auto text-purple-500" size={20} />
                </div>
                <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading Promotion Engine...</p>
            </div>
        </div>
    );

    const currentAY = data.getCurrentAcademicYear();
    const activeTabData = TABS.find(t => t.id === activeTab)!;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ─── Ultra Premium Header ─── */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #8b5cf6 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                            <FiTrendingUp className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                Student Promotion Engine
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full shadow-sm">ULTRA</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5 max-w-lg">
                                Advanced promotion pipeline with rules-based eligibility, multi-department clearance, approval workflows, alumni tracking & real-time analytics
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Academic Year</p>
                            <p className="text-sm font-extrabold text-purple-700">{currentAY?.year_name || 'Not Set'}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="text-right">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── KPI Command Strip ─── */}
                {kpis && (
                    <div className="border-t border-gray-100 px-5 py-3 grid grid-cols-4 lg:grid-cols-8 gap-3">
                        {[
                            { label: 'Active Students', value: kpis.activeStudents, icon: FiUsers, color: '#8b5cf6', bg: '#f3f0ff' },
                            { label: 'Eligible', value: kpis.eligibleStudents, icon: FiCheck, color: '#22c55e', bg: '#f0fdf4', suffix: ` (${kpis.eligRate}%)` },
                            { label: 'Promoted', value: kpis.totalPromotions, icon: FiArrowUpRight, color: '#3b82f6', bg: '#eff6ff' },
                            { label: 'Graduated', value: kpis.totalGraduated, icon: FiAward, color: '#f59e0b', bg: '#fffbeb' },
                            { label: 'Active Rules', value: kpis.activeRules, icon: FiSettings, color: '#6366f1', bg: '#eef2ff' },
                            { label: 'Pending Clear.', value: kpis.pendingClearance, icon: FiClipboard, color: '#06b6d4', bg: '#ecfeff' },
                            { label: 'Pending Apprvl', value: kpis.pendingApprovals, icon: FiShield, color: '#ec4899', bg: '#fdf2f8', alert: kpis.pendingApprovals > 0 },
                            { label: 'Acad. Years', value: data.academicYears.length, icon: FiCalendar, color: '#10b981', bg: '#ecfdf5' },
                        ].map((kpi, i) => (
                            <button key={i} onClick={() => handleTabChange(TABS[i]?.id || 'promotion')}
                                className="relative group text-left p-2.5 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer border border-transparent hover:border-gray-200"
                                style={{ backgroundColor: kpi.bg }}>
                                {kpi.alert && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-white" />}
                                <div className="flex items-center gap-1.5">
                                    <kpi.icon size={12} style={{ color: kpi.color }} />
                                    <span className="text-[10px] font-semibold text-gray-500 truncate">{kpi.label}</span>
                                </div>
                                <p className="text-lg font-extrabold mt-0.5" style={{ color: kpi.color }}>
                                    {kpi.value.toLocaleString()}<span className="text-[10px] font-semibold text-gray-400">{kpi.suffix || ''}</span>
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Ultra Tab Navigation ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const badgeCount = tab.id === 'approvals' && kpis ? kpis.pendingApprovals : 0;
                    return (
                        <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                            className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 group"
                            style={isActive ? {
                                background: `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)`,
                                color: 'white',
                                boxShadow: `0 4px 12px ${tab.color}40`,
                            } : {}}>
                            {!isActive && <div className="absolute inset-0 rounded-xl bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            <Icon size={14} className={`relative z-10 ${isActive ? '' : 'text-gray-500 group-hover:text-gray-700'}`} />
                            <span className={`relative z-10 ${isActive ? '' : 'text-gray-600 group-hover:text-gray-800'}`}>{tab.label}</span>
                            {badgeCount > 0 && (
                                <span className={`relative z-10 ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>{badgeCount}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ─── Active Tab Info Bar ─── */}
            <div className="flex items-center gap-3 px-1">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: activeTabData.color }} />
                <div>
                    <h2 className="text-sm font-bold text-gray-800">{activeTabData.label}</h2>
                    <p className="text-[11px] text-gray-400">{activeTabData.desc}</p>
                </div>
            </div>

            {/* ─── Tab Content with Transition ─── */}
            <div className={`transition-all duration-200 ${tabTransition ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                {activeTab === 'promotion' && <PromotionTab data={data} />}
                {activeTab === 'eligibility' && <EligibilityTab data={data} />}
                {activeTab === 'rules' && <RulesTab data={data} />}
                {activeTab === 'history' && <HistoryTab data={data} />}
                {activeTab === 'clearance' && <ClearanceTab data={data} />}
                {activeTab === 'approvals' && <ApprovalsTab data={data} />}
                {activeTab === 'alumni' && <AlumniTab data={data} />}
                {activeTab === 'academic-years' && <AcademicYearsTab data={data} />}
            </div>
        </div>
    );
}
