'use client';

import { useEffect } from 'react';

const PAGE_ICONS: Record<string, { icon: string; title: string }> = {
    '/dashboard': { icon: '/icon-dashboard.svg', title: 'Dashboard - APSIMS' },
    '/dashboard/fees': { icon: '/icon-fees.svg', title: 'Fees - APSIMS' },
    '/dashboard/fees/collect': { icon: '/icon-fees.svg', title: 'Fee Collection - APSIMS' },
    '/dashboard/fees/outstanding': { icon: '/icon-fees.svg', title: 'Outstanding Fees - APSIMS' },
    '/dashboard/fees/payments': { icon: '/icon-fees.svg', title: 'Fee Payments - APSIMS' },
    '/dashboard/fees/statements': { icon: '/icon-fees.svg', title: 'Fee Statements - APSIMS' },
    '/dashboard/fees/structure': { icon: '/icon-fees.svg', title: 'Fee Structure - APSIMS' },
    '/dashboard/exams': { icon: '/icon-exams.svg', title: 'Exams - APSIMS' },
    '/dashboard/exams/marks': { icon: '/icon-exams.svg', title: 'Mark Entry - APSIMS' },
    '/dashboard/exams/broadsheet': { icon: '/icon-exams.svg', title: 'Broadsheet - APSIMS' },
    '/dashboard/exams/merit-list': { icon: '/icon-exams.svg', title: 'Merit List - APSIMS' },
    '/dashboard/exams/report-cards': { icon: '/icon-exams.svg', title: 'Report Cards - APSIMS' },
    '/dashboard/exams/analysis': { icon: '/icon-exams.svg', title: 'Performance Analysis - APSIMS' },
    '/dashboard/exams/manage': { icon: '/icon-exams.svg', title: 'Exam Manager - APSIMS' },
    '/dashboard/exams/question-bank': { icon: '/icon-exams.svg', title: 'Question Bank - APSIMS' },
    '/dashboard/exams/paper-generator': { icon: '/icon-exams.svg', title: 'Paper Generator - APSIMS' },
    '/dashboard/exams/ai-generate': { icon: '/icon-exams.svg', title: 'AI Question Gen - APSIMS' },
    '/dashboard/exams/digital-delivery': { icon: '/icon-exams.svg', title: 'Digital Report Cards - APSIMS' },
    '/dashboard/exams/weighted': { icon: '/icon-exams.svg', title: 'Weighted Exam Config - APSIMS' },
    '/dashboard/exams/ultra-report-cards': { icon: '/icon-exams.svg', title: 'Ultra Report Cards - APSIMS' },
    '/dashboard/exams/detailed-analysis': { icon: '/icon-exams.svg', title: 'Detailed Exam Analysis - APSIMS' },
    '/dashboard/fees/combined-sms': { icon: '/icon-fees.svg', title: 'Fee+Results SMS - APSIMS' },
    '/dashboard/fees/structure-improvements': { icon: '/icon-fees.svg', title: 'Fee Structure & Waivers - APSIMS' },
    '/dashboard/fees/invoices-demand': { icon: '/icon-fees.svg', title: 'Invoices & Demand Letters - APSIMS' },
    '/dashboard/discipline': { icon: '/icon-discipline.svg', title: 'Discipline - APSIMS' },
    '/dashboard/attendance': { icon: '/icon-attendance.svg', title: 'Attendance - APSIMS' },
    '/dashboard/attendance/staff': { icon: '/icon-attendance.svg', title: 'Staff Attendance - APSIMS' },
    '/dashboard/students': { icon: '/icon-students.svg', title: 'Students - APSIMS' },
    '/dashboard/students/admissions': { icon: '/icon-students.svg', title: 'Admissions - APSIMS' },
    '/dashboard/students/profile': { icon: '/icon-students.svg', title: 'Student Profiles - APSIMS' },
    '/dashboard/students/promotion': { icon: '/icon-students.svg', title: 'Promotion - APSIMS' },
    '/dashboard/students/id-cards': { icon: '/icon-students.svg', title: 'ID Cards - APSIMS' },
    '/dashboard/students/health': { icon: '/icon-students.svg', title: 'Health Records - APSIMS' },
    '/dashboard/staff': { icon: '/icon-staff.svg', title: 'Staff - APSIMS' },
    '/dashboard/timetable': { icon: '/icon-timetable.svg', title: 'Timetable - APSIMS' },
    '/dashboard/payroll': { icon: '/icon-payroll.svg', title: 'Payroll - APSIMS' },
    '/dashboard/hr-payroll': { icon: '/icon-payroll.svg', title: 'HR & Payroll - APSIMS' },
    '/dashboard/reports': { icon: '/icon-reports.svg', title: 'Reports - APSIMS' },
    '/dashboard/settings': { icon: '/icon-settings.svg', title: 'Settings - APSIMS' },
    '/dashboard/leave-out': { icon: '/icon-attendance.svg', title: 'Leave Out - APSIMS' },
    '/dashboard/curriculum': { icon: '/icon-exams.svg', title: 'Curriculum - APSIMS' },
    '/dashboard/schemes': { icon: '/icon-exams.svg', title: 'Schemes of Work - APSIMS' },
    '/dashboard/subjects': { icon: '/icon-exams.svg', title: 'Subjects - APSIMS' },
    '/dashboard/remedial': { icon: '/icon-exams.svg', title: 'Remedial Programs - APSIMS' },
    '/dashboard/communication': { icon: '/icon-staff.svg', title: 'Communication - APSIMS' },
    '/dashboard/expenses': { icon: '/icon-fees.svg', title: 'Expenses - APSIMS' },
    '/dashboard/income': { icon: '/icon-fees.svg', title: 'Income - APSIMS' },
    '/dashboard/stores': { icon: '/icon-settings.svg', title: 'Stores - APSIMS' },
    '/dashboard/library-inventory': { icon: '/icon-exams.svg', title: 'Library - APSIMS' },
    '/dashboard/rim-paper': { icon: '/icon-exams.svg', title: 'RIM Paper - APSIMS' },
    '/dashboard/portals': { icon: '/icon-settings.svg', title: 'Portals - APSIMS' },
    '/dashboard/users': { icon: '/icon-staff.svg', title: 'Users - APSIMS' },
    '/dashboard/super-admin': { icon: '/icon-settings.svg', title: 'Super Admin - APSIMS' },
    '/dashboard/assets': { icon: '/icon-settings.svg', title: 'Assets - APSIMS' },
};

export function usePageIcon(pathname?: string) {
    useEffect(() => {
        const path = pathname || window.location.pathname;

        // Find the best matching route (longest prefix match)
        let bestMatch = '';
        for (const route of Object.keys(PAGE_ICONS)) {
            if (path === route || path.startsWith(route + '/')) {
                if (route.length > bestMatch.length) {
                    bestMatch = route;
                }
            }
        }

        const config = bestMatch ? PAGE_ICONS[bestMatch] : null;

        if (config) {
            // Update favicon
            const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (existingLink) {
                existingLink.href = config.icon;
            } else {
                const link = document.createElement('link');
                link.rel = 'icon';
                link.type = 'image/svg+xml';
                link.href = config.icon;
                document.head.appendChild(link);
            }
            // Update title
            document.title = config.title;
        } else {
            // Reset to default
            const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (existingLink) {
                existingLink.href = '/favicon.svg';
            }
            document.title = 'APSIMS - School Management System';
        }
    }, [pathname]);
}
