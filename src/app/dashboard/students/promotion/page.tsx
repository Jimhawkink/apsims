'use client';

import { useState } from 'react';
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
    FiShield, FiAward, FiCalendar
} from 'react-icons/fi';

type TabId = 'promotion' | 'eligibility' | 'rules' | 'history' | 'clearance' | 'approvals' | 'alumni' | 'academic-years';

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'promotion', label: 'Promotion', icon: FiTrendingUp },
    { id: 'eligibility', label: 'Eligibility', icon: FiCheck },
    { id: 'rules', label: 'Rules Engine', icon: FiSettings },
    { id: 'history', label: 'History & Rollback', icon: FiClock },
    { id: 'clearance', label: 'Clearance', icon: FiClipboard },
    { id: 'approvals', label: 'Approvals', icon: FiShield },
    { id: 'alumni', label: 'Alumni', icon: FiAward },
    { id: 'academic-years', label: 'Academic Years', icon: FiCalendar },
];

export default function PromotionPage() {
    const [activeTab, setActiveTab] = useState<TabId>('promotion');
    const data = usePromotionData();

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-purple-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
        </div>
    );

    const currentAY = data.getCurrentAcademicYear();

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiTrendingUp className="text-purple-500" /> Student Promotion
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Ultra promotion engine — rules, eligibility, clearance, approvals, alumni & more</p>
                </div>
                <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                    AY: {currentAY?.year_name || 'Not Set'}
                </span>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${isActive ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <Icon size={14} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'promotion' && <PromotionTab data={data} />}
            {activeTab === 'eligibility' && <EligibilityTab data={data} />}
            {activeTab === 'rules' && <RulesTab data={data} />}
            {activeTab === 'history' && <HistoryTab data={data} />}
            {activeTab === 'clearance' && <ClearanceTab data={data} />}
            {activeTab === 'approvals' && <ApprovalsTab data={data} />}
            {activeTab === 'alumni' && <AlumniTab data={data} />}
            {activeTab === 'academic-years' && <AcademicYearsTab data={data} />}
        </div>
    );
}
