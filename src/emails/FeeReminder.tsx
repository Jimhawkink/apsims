import * as React from 'react';

interface FeeReminderEmailProps {
    schoolName: string;
    parentName: string;
    studentName: string;
    admissionNo: string;
    className: string;
    termName: string;
    balance: number;
    dueDate: string;
    schoolPhone?: string;
    paybillNo?: string;
    accountNo?: string;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export function FeeReminderEmail({
    schoolName, parentName, studentName, admissionNo,
    className, termName, balance, dueDate,
    schoolPhone, paybillNo, accountNo,
}: FeeReminderEmailProps) {
    const isUrgent = balance > 20000;
    const accentColor = isUrgent ? '#ef4444' : '#f59e0b';
    const accentBg = isUrgent ? '#fef2f2' : '#fef3c7';
    const accentBorder = isUrgent ? '#fca5a5' : '#fcd34d';

    return (
        <html>
            <head><meta charSet="utf-8" /><title>Fee Reminder - {schoolName}</title></head>
            <body style={{ margin: 0, padding: 0, backgroundColor: '#f1f5f9', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#f1f5f9', padding: '32px 16px' }}>
                    <tr><td align="center">
                        <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: '600px', width: '100%' }}>

                            {/* Header */}
                            <tr>
                                <td style={{
                                    background: isUrgent
                                        ? 'linear-gradient(135deg, #dc2626 0%, #9f1239 100%)'
                                        : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                                    borderRadius: '20px 20px 0 0', padding: '36px 40px', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isUrgent ? '🚨' : '⚠️'}</div>
                                    <h1 style={{ color: '#fff', margin: 0, fontSize: '22px', fontWeight: 900 }}>{schoolName}</h1>
                                    <p style={{ color: 'rgba(255,255,255,0.85)', margin: '6px 0 0', fontSize: '13px', fontWeight: 600 }}>
                                        {isUrgent ? 'URGENT: ' : ''}Fee Payment Reminder
                                    </p>
                                </td>
                            </tr>

                            {/* Body */}
                            <tr>
                                <td style={{ backgroundColor: '#ffffff', padding: '36px 40px' }}>
                                    <p style={{ color: '#374151', fontSize: '15px', margin: '0 0 20px', lineHeight: '1.6' }}>
                                        Dear <strong>{parentName}</strong>,
                                    </p>
                                    <p style={{ color: '#374151', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.7' }}>
                                        This is a friendly reminder that the school fees for your child <strong>{studentName}</strong> ({admissionNo})
                                        in <strong>{className}</strong> for <strong>{termName}</strong> are outstanding.
                                    </p>

                                    {/* Balance Box */}
                                    <div style={{
                                        backgroundColor: accentBg, border: `2px solid ${accentBorder}`,
                                        borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '28px',
                                    }}>
                                        <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>
                                            Outstanding Balance
                                        </div>
                                        <div style={{ fontSize: '36px', fontWeight: 900, color: accentColor }}>
                                            {fmt(balance)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                                            Due by: <strong style={{ color: accentColor }}>{dueDate}</strong>
                                        </div>
                                    </div>

                                    {/* Payment methods */}
                                    {(paybillNo || schoolPhone) && (
                                        <>
                                            <p style={{ color: '#374151', fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>
                                                💳 Payment Options:
                                            </p>
                                            <table width="100%" cellPadding={0} cellSpacing={0} style={{
                                                backgroundColor: '#f0fdf4', borderRadius: '14px',
                                                border: '1px solid #86efac', marginBottom: '24px',
                                            }}>
                                                {paybillNo && (
                                                    <tr>
                                                        <td style={{ padding: '12px 20px', borderBottom: '1px solid #bbf7d0' }}>
                                                            <div style={{ fontSize: '13px', color: '#166534', fontWeight: 800 }}>📱 M-Pesa Paybill</div>
                                                            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                                                                Paybill: <strong>{paybillNo}</strong>
                                                                {accountNo && <> · Account: <strong>{accountNo || admissionNo}</strong></>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {schoolPhone && (
                                                    <tr>
                                                        <td style={{ padding: '12px 20px' }}>
                                                            <div style={{ fontSize: '13px', color: '#166534', fontWeight: 800 }}>📞 Call/WhatsApp</div>
                                                            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>{schoolPhone}</div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </table>
                                        </>
                                    )}

                                    <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                                        Prompt payment ensures your child continues to access all school services without interruption.
                                        If you have already made payment, please disregard this reminder.
                                    </p>
                                </td>
                            </tr>

                            {/* Footer */}
                            <tr>
                                <td style={{
                                    backgroundColor: '#f8fafc', borderRadius: '0 0 20px 20px',
                                    padding: '18px 40px', textAlign: 'center', borderTop: '1px solid #e2e8f0',
                                }}>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                                        {schoolName} · Powered by <strong>APSIMS</strong> — Hawkinsoft Solutions
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td></tr>
                </table>
            </body>
        </html>
    );
}
