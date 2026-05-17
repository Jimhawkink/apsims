'use client';
// ── Shared helpers for Communication Hub sub-components ──────────────────────
// Moved here from page.tsx to avoid Next.js "non-page exports" build error

export const fmt = (n: number) => `KES ${(n || 0).toLocaleString()}`;

export const MESSAGE_TEMPLATES: Record<string, string> = {
    fee_reminder: 'Dear Parent/Guardian of {student_name}, this is a reminder that the school fee balance of KES {balance} is due. Kindly make payment to avoid interruption. Thank you. - {school_name}',
    overdue_notice: 'NOTICE: Dear Parent/Guardian of {student_name}, your fee balance of KES {balance} is overdue. Immediate payment is required to avoid suspension. - {school_name}',
    exam_results: 'Dear Parent/Guardian of {student_name}, exam results for {term} are now available. Please visit the school or parent portal to view. - {school_name}',
    meeting_notice: 'Dear Parent/Guardian, you are invited to a parents meeting on {date} at {time}. Your attendance is highly valued. - {school_name}',
    holiday_notice: 'Dear Parent/Guardian, school will close on {date} for {holiday}. Opening date is {opening_date}. - {school_name}',
    emergency_alert: 'URGENT: Dear Parent/Guardian of {student_name}, please contact the school immediately regarding an urgent matter. Call {phone}. - {school_name}',
    welcome: 'Welcome to {school_name}! Dear Parent/Guardian of {student_name} ({admission_no}), we are delighted to have you join our family. For inquiries, call {phone}.',
    general: 'Dear Parent/Guardian, {message}. Thank you for your continued support. - {school_name}',
};

export const QUICK_TEMPLATES = [
    { label: '💰 Fee Reminder', key: 'fee_reminder', color: '#6366f1' },
    { label: '🚨 Overdue Notice', key: 'overdue_notice', color: '#ef4444' },
    { label: '📝 Exam Results', key: 'exam_results', color: '#10b981' },
    { label: '📅 Meeting Notice', key: 'meeting_notice', color: '#0891b2' },
    { label: '🏖️ Holiday Notice', key: 'holiday_notice', color: '#f59e0b' },
    { label: '🚨 Emergency', key: 'emergency_alert', color: '#dc2626' },
    { label: '👋 Welcome', key: 'welcome', color: '#8b5cf6' },
    { label: '📢 General', key: 'general', color: '#6b7280' },
];

export function StudentAvatar({ name, size = 34 }: { name: string; size?: number }) {
    const initials = (name || '?').split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() || '').join('') || '?';
    const GRADIENTS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0891b2,#06b6d4)',
        'linear-gradient(135deg,#059669,#10b981)', 'linear-gradient(135deg,#d97706,#f59e0b)',
        'linear-gradient(135deg,#dc2626,#ef4444)', 'linear-gradient(135deg,#7c3aed,#a855f7)',
    ];
    const idx = (name || '').charCodeAt(0) % GRADIENTS.length;
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: GRADIENTS[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: size * 0.35, flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
            {initials}
        </div>
    );
}
