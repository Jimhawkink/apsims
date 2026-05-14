'use client';
import { useState, useMemo } from 'react';
import {
    FiCreditCard, FiUsers, FiLayout, FiAlertTriangle, FiSmartphone,
    FiEye, FiTruck, FiClock, FiZap, FiActivity
} from 'react-icons/fi';
import { useIdCardData } from './useIdCardData';
import StudentCardsTab from './StudentCardsTab';
import StaffCardsTab from './StaffCardsTab';
import TemplatesTab from './TemplatesTab';
import LostCardsTab from './LostCardsTab';
import DigitalTab from './DigitalTab';
import VisitorsTab from './VisitorsTab';
import BusPassTab from './BusPassTab';
import ExpiryTab from './ExpiryTab';

type TabId = 'students' | 'staff' | 'templates' | 'lost' | 'digital' | 'visitors' | 'buspass' | 'expiry';
const TABS: { id: TabId; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'students', label: 'Student Cards', icon: FiCreditCard, color: '#4f46e5', desc: 'Issue & print student ID cards' },
    { id: 'staff', label: 'Staff Cards', icon: FiUsers, color: '#dc2626', desc: 'Issue staff identification cards' },
    { id: 'templates', label: 'Templates', icon: FiLayout, color: '#7c3aed', desc: 'Design card templates' },
    { id: 'lost', label: 'Lost Cards', icon: FiAlertTriangle, color: '#d97706', desc: 'Report & replace lost cards' },
    { id: 'digital', label: 'Digital / WhatsApp', icon: FiSmartphone, color: '#059669', desc: 'Digital card delivery' },
    { id: 'visitors', label: 'Visitor Cards', icon: FiEye, color: '#0891b2', desc: 'Temporary visitor passes' },
    { id: 'buspass', label: 'Bus Pass', icon: FiTruck, color: '#ea580c', desc: 'Transport pass management' },
    { id: 'expiry', label: 'Card Expiry', icon: FiClock, color: '#be185d', desc: 'Track expiring cards' },
];

export default function IDCardsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('students');
    const [tabTransition, setTabTransition] = useState(false);
    const data = useIdCardData();

    const kpis = useMemo(() => {
        if (data.loading) return null;
        const activeCards = data.issuedCards.filter((c: any) => c.status === 'Active').length;
        const lostCount = data.lostCards.filter((c: any) => c.status === 'Reported').length;
        const totalPeople = data.students.length + data.staff.length;
        const templates = data.templates.length;
        const visitors = data.visitorCards.length;
        const busPasses = data.busPasses.filter((b: any) => b.status === 'Active').length;
        const expiring = data.issuedCards.filter((c: any) => { const exp = new Date(c.expiry_date); const now = new Date(); return c.status === 'Active' && exp.getTime() - now.getTime() < 30 * 86400000; }).length;
        const coverage = totalPeople > 0 ? ((activeCards / totalPeople) * 100).toFixed(0) : '0';
        return { activeCards, lostCount, totalPeople, templates, visitors, busPasses, expiring, coverage };
    }, [data]);

    const handleTabChange = (tab: TabId) => {
        if (tab === activeTab) return;
        setTabTransition(true);
        setTimeout(() => { setActiveTab(tab); setTabTransition(false); }, 150);
    };

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                    <FiCreditCard className="absolute inset-0 m-auto text-indigo-500" size={20} />
                </div>
                <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading ID Card System...</p>
            </div>
        </div>
    );

    const activeTabData = TABS.find(t => t.id === activeTab)!;

    return (
        <div className="space-y-5 animate-fade-in">
            <style jsx global>{`
                @media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } @page { margin: 5mm; } }
            `}</style>

            {/* ─── Ultra Premium Header ─── */}
            <div className="no-print relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #4f46e5 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <div className="relative p-5 flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            <FiCreditCard className="text-white" size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                                Ultra ID Card System
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-sm">ULTRA</span>
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5 max-w-lg">
                                Students, Staff, Visitors, Bus Pass — Templates, QR, Barcode, Digital & WhatsApp delivery
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Coverage</p>
                            <p className="text-sm font-extrabold text-indigo-700">{kpis?.coverage}%</p>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="text-right">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── KPI Command Strip ─── */}
                {kpis && (
                    <div className="border-t border-gray-100 px-5 py-3 grid grid-cols-4 lg:grid-cols-8 gap-3">
                        {[
                            { label: 'Active Cards', value: kpis.activeCards, icon: FiCreditCard, color: '#4f46e5', bg: '#eef2ff' },
                            { label: 'Total People', value: kpis.totalPeople, icon: FiUsers, color: '#7c3aed', bg: '#f3f0ff' },
                            { label: 'Lost Reports', value: kpis.lostCount, icon: FiAlertTriangle, color: '#d97706', bg: '#fffbeb', alert: kpis.lostCount > 0 },
                            { label: 'Templates', value: kpis.templates, icon: FiLayout, color: '#059669', bg: '#ecfdf5' },
                            { label: 'Visitors', value: kpis.visitors, icon: FiEye, color: '#0891b2', bg: '#ecfeff' },
                            { label: 'Bus Passes', value: kpis.busPasses, icon: FiTruck, color: '#ea580c', bg: '#fff7ed' },
                            { label: 'Expiring', value: kpis.expiring, icon: FiClock, color: '#be185d', bg: '#fdf2f8', alert: kpis.expiring > 0 },
                            { label: 'Coverage', value: `${kpis.coverage}%`, icon: FiActivity, color: '#4f46e5', bg: '#eef2ff' },
                        ].map((kpi, i) => (
                            <button key={i} onClick={() => handleTabChange(TABS[i]?.id || 'students')}
                                className="relative group text-left p-2.5 rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer border border-transparent hover:border-gray-200"
                                style={{ backgroundColor: kpi.bg }}>
                                {kpi.alert && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse border-2 border-white" />}
                                <div className="flex items-center gap-1.5">
                                    <kpi.icon size={12} style={{ color: kpi.color }} />
                                    <span className="text-[10px] font-semibold text-gray-500 truncate">{kpi.label}</span>
                                </div>
                                <p className="text-lg font-extrabold mt-0.5" style={{ color: kpi.color }}>{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Ultra Tab Navigation ─── */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const badgeCount = tab.id === 'lost' && kpis ? kpis.lostCount : tab.id === 'expiry' && kpis ? kpis.expiring : 0;
                    return (
                        <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                            className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 group"
                            style={isActive ? { background: `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)`, color: 'white', boxShadow: `0 4px 12px ${tab.color}40` } : {}}>
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
            <div className="no-print flex items-center gap-3 px-1">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: activeTabData.color }} />
                <div>
                    <h2 className="text-sm font-bold text-gray-800">{activeTabData.label}</h2>
                    <p className="text-[11px] text-gray-400">{activeTabData.desc}</p>
                </div>
            </div>

            {/* ─── Tab Content with Transition ─── */}
            <div className={`transition-all duration-200 ${tabTransition ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                {activeTab === 'students' && <StudentCardsTab data={data} />}
                {activeTab === 'staff' && <StaffCardsTab data={data} />}
                {activeTab === 'templates' && <TemplatesTab data={data} />}
                {activeTab === 'lost' && <LostCardsTab data={data} />}
                {activeTab === 'digital' && <DigitalTab data={data} />}
                {activeTab === 'visitors' && <VisitorsTab data={data} />}
                {activeTab === 'buspass' && <BusPassTab data={data} />}
                {activeTab === 'expiry' && <ExpiryTab data={data} />}
            </div>
        </div>
    );
}
