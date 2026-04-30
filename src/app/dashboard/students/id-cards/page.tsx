'use client';
import { useState } from 'react';
import {
    FiCreditCard, FiUsers, FiLayout, FiAlertTriangle, FiSmartphone,
    FiEye, FiTruck, FiClock
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
const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: 'students', label: 'Student Cards', icon: FiCreditCard },
    { id: 'staff', label: 'Staff Cards', icon: FiUsers },
    { id: 'templates', label: 'Templates', icon: FiLayout },
    { id: 'lost', label: 'Lost Cards', icon: FiAlertTriangle },
    { id: 'digital', label: 'Digital / WhatsApp', icon: FiSmartphone },
    { id: 'visitors', label: 'Visitor Cards', icon: FiEye },
    { id: 'buspass', label: 'Bus Pass', icon: FiTruck },
    { id: 'expiry', label: 'Card Expiry', icon: FiClock },
];

export default function IDCardsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('students');
    const data = useIdCardData();

    if (data.loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-in">
            <style jsx global>{`
                @media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } @page { margin: 5mm; } }
            `}</style>

            {/* Header */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiCreditCard className="text-indigo-500" /> Ultra ID Cards
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Students, Staff, Visitors, Bus Pass — Templates, QR, Barcode, Digital & more</p>
                </div>
                <div className="flex gap-2">
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                        {data.issuedCards.filter((c: any) => c.status === 'Active').length} Active
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">
                        {data.lostCards.filter((c: any) => c.status === 'Reported').length} Lost
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                        {data.students.length + data.staff.length} People
                    </span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="no-print bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <Icon size={14} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'students' && <StudentCardsTab data={data} />}
            {activeTab === 'staff' && <StaffCardsTab data={data} />}
            {activeTab === 'templates' && <TemplatesTab data={data} />}
            {activeTab === 'lost' && <LostCardsTab data={data} />}
            {activeTab === 'digital' && <DigitalTab data={data} />}
            {activeTab === 'visitors' && <VisitorsTab data={data} />}
            {activeTab === 'buspass' && <BusPassTab data={data} />}
            {activeTab === 'expiry' && <ExpiryTab data={data} />}
        </div>
    );
}
