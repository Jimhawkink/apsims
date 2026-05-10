'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { FiUsers, FiDollarSign, FiTrendingUp, FiCalendar, FiBookOpen, FiUserCheck } from 'react-icons/fi';
import UltraCardsSection from './components/UltraCards';
import UltraChartsSection from './components/UltraCharts';
import UltraGridsSection from './components/UltraGrids';
import DashboardTabs, { TabKey } from './components/DashboardTabs';
import FinancePanel from './components/FinancePanel';
import AcademicsPanel from './components/AcademicsPanel';
import StaffPanel from './components/StaffPanel';
import StoresPanel from './components/StoresPanel';
import PortalsPanel from './components/PortalsPanel';
import './components/ultra-dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [stats, setStats] = useState({
        totalStudents: 0, activeStudents: 0, newEnrollments: 0,
        totalStaff: 0, teachingStaff: 0, nonTeachingStaff: 0,
        feesCollected: 0, feesDue: 0, prepayments: 0,
        totalIncome: 0, totalExpenses: 0,
        attendance: { present: 0, absent: 0, late: 0, rate: 0 },
        reportedStudents: 0,
    });
    const [studentsByForm, setStudentsByForm] = useState<{ form: string; male: number; female: number }[]>([]);
    const [feePayments, setFeePayments] = useState<{ month: string; amount: number }[]>([]);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [recentStudents, setRecentStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('Admin');
    const currentYear = new Date().getFullYear();

    const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            if (typeof window !== 'undefined') {
                const u = localStorage.getItem('school_user');
                if (u) { try { setUserName(JSON.parse(u).full_name || 'Admin'); } catch { } }
            }

            // Students
            const { data: allStudents } = await supabase.from('school_students').select('id, first_name, last_name, gender, form_id, status, admission_date, created_at, admission_no, admission_number');
            const students = allStudents || [];
            const active = students.filter(s => s.status === 'Active');
            const thisYear = students.filter(s => {
                const d = s.admission_date || s.created_at;
                return d && new Date(d).getFullYear() === currentYear;
            });

            // Forms for student distribution
            const { data: forms } = await supabase.from('school_forms').select('*').order('form_level');
            const formList = forms || [];
            const dist = formList.map(f => {
                const inForm = students.filter(s => s.form_id === f.id);
                return { form: f.form_name, male: inForm.filter(s => s.gender === 'Male').length, female: inForm.filter(s => s.gender === 'Female').length };
            });
            setStudentsByForm(dist);

            // Staff
            const { data: teachers } = await supabase.from('school_teachers').select('id, staff_type, status');
            const staff = teachers || [];
            const teaching = staff.filter(s => s.staff_type === 'Teaching').length;
            const nonTeaching = staff.filter(s => s.staff_type !== 'Teaching').length;

            // Fee Payments
            const { data: payments } = await supabase.from('school_fee_payments').select('*').order('payment_date', { ascending: false });
            const paymentList = payments || [];
            const totalFees = paymentList.reduce((s, p) => s + Number(p.amount || 0), 0);

            // Fee structure for dues calculation
            const { data: structures } = await supabase.from('school_fee_structures').select('amount');
            const totalStructure = (structures || []).reduce((s, f) => s + Number(f.amount || 0), 0);
            const expectedFees = totalStructure * active.length;
            const feesDue = Math.max(0, expectedFees - totalFees);
            const prepayments = Math.max(0, totalFees - expectedFees);

            // Monthly fee trend (last 6 months)
            const monthlyFees: { month: string; amount: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const month = d.toLocaleString('en', { month: 'short', year: '2-digit' });
                const y = d.getFullYear(); const m = d.getMonth();
                const monthPayments = paymentList.filter(p => {
                    const pd = new Date(p.payment_date);
                    return pd.getFullYear() === y && pd.getMonth() === m;
                });
                monthlyFees.push({ month, amount: monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0) });
            }
            setFeePayments(monthlyFees);
            setRecentPayments(paymentList.slice(0, 8));

            // Recent students
            const recent = [...students].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 8);
            setRecentStudents(recent);

            // Attendance (today)
            const today = new Date().toISOString().split('T')[0];
            const { data: attData } = await supabase.from('school_daily_attendance').select('status').eq('attendance_date', today);
            const att = attData || [];
            const present = att.filter(a => a.status === 'Present').length;
            const absent = att.filter(a => a.status === 'Absent').length;
            const late = att.filter(a => a.status === 'Late').length;
            const attRate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;

            // Reported students (attendance logged this term)
            const { data: termData } = await supabase.from('school_terms').select('*').eq('is_current', true).single();
            let reported = 0;
            if (termData) {
                const { count } = await supabase.from('school_daily_attendance').select('student_id', { count: 'exact', head: true }).gte('attendance_date', termData.start_date).lte('attendance_date', termData.end_date);
                reported = count || 0;
            }

            // Income & Expenses
            const { data: incomeData } = await supabase.from('school_income').select('amount');
            const totalIncome = (incomeData || []).reduce((s, i) => s + Number(i.amount || 0), 0) + totalFees;
            const { data: expenseData } = await supabase.from('school_expenses').select('amount');
            const totalExpenses = (expenseData || []).reduce((s, e) => s + Number(e.amount || 0), 0);

            setStats({
                totalStudents: students.length, activeStudents: active.length, newEnrollments: thisYear.length,
                totalStaff: staff.length, teachingStaff: teaching, nonTeachingStaff: nonTeaching,
                feesCollected: totalFees, feesDue, prepayments,
                totalIncome, totalExpenses,
                attendance: { present, absent, late, rate: attRate },
                reportedStudents: reported,
            });
        } catch (e) { console.error('Dashboard error:', e); }
        setLoading(false);
    }, [currentYear]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
                <div className="spinner mx-auto mb-4" style={{ borderTopColor: '#6366f1', borderColor: '#e2e8f0', width: 40, height: 40, borderWidth: 3 }} />
                <p className="text-gray-500 text-sm">Loading dashboard...</p>
            </div>
        </div>
    );

    // Chart data
    const studentDistChart = {
        labels: studentsByForm.map(s => s.form),
        datasets: [
            { label: 'Male', data: studentsByForm.map(s => s.male), backgroundColor: '#3b82f6', borderRadius: 6, barPercentage: 0.6 },
            { label: 'Female', data: studentsByForm.map(s => s.female), backgroundColor: '#ec4899', borderRadius: 6, barPercentage: 0.6 },
        ],
    };

    const feeTrendChart = {
        labels: feePayments.map(f => f.month),
        datasets: [{
            label: 'Fees Collected',
            data: feePayments.map(f => f.amount),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 5,
        }],
    };

    const attendanceDoughnut = {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [{
            data: [stats.attendance.present, stats.attendance.absent, stats.attendance.late],
            backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
            borderWidth: 0,
        }],
    };

    const feeBreakdownDoughnut = {
        labels: ['Collected', 'Dues', 'Prepayments'],
        datasets: [{
            data: [stats.feesCollected, stats.feesDue, stats.prepayments],
            backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
            borderWidth: 0,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' as const, labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12, weight: 500 as const } } } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom' as const, labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } } },
    };

    return (
        <div className="space-y-4 ultra-animate">
            {/* Ultra Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{greeting}, {userName}! 👋</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — APSIMS Ultra Dashboard</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </span>
                    <span className="text-[9px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        Term 2 · {currentYear}
                    </span>
                </div>
            </div>

            {/* Dashboard Tab Navigation */}
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
                    <UltraCardsSection stats={stats} currentYear={currentYear} fmt={fmt} />
                    <UltraChartsSection studentsByForm={studentsByForm} feePayments={feePayments} stats={stats} fmt={fmt} />
                    <UltraGridsSection recentPayments={recentPayments} recentStudents={recentStudents} stats={stats} fmt={fmt} />
                </>
            )}
            {activeTab === 'finance' && <FinancePanel />}
            {activeTab === 'academics' && <AcademicsPanel />}
            {activeTab === 'staff' && <StaffPanel />}
            {activeTab === 'stores' && <StoresPanel />}
            {activeTab === 'portals' && <PortalsPanel />}

            {/* Footer */}
            <div className="text-center py-3 text-[9px] text-gray-300 font-medium tracking-wide">
                APSIMS v3.0 Ultra · Alpha Plus School Information Management System · © {currentYear}
            </div>
        </div>
    );
}
