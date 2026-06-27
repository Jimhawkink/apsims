import * as React from 'react';

interface FeeReceiptEmailProps {
    schoolName: string;
    schoolLogo?: string;
    studentName: string;
    admissionNo: string;
    className: string;
    parentName: string;
    parentEmail?: string;
    amount: number;
    paymentMethod: string;
    receiptNo: string;
    paymentDate: string;
    mpesaCode?: string;
    termName: string;
    balance: number;
    schoolPhone?: string;
    schoolEmail?: string;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export function FeeReceiptEmail({
    schoolName,
    studentName,
    admissionNo,
    className,
    parentName,
    amount,
    paymentMethod,
    receiptNo,
    paymentDate,
    mpesaCode,
    termName,
    balance,
    schoolPhone,
    schoolEmail,
}: FeeReceiptEmailProps) {
    const methodColor =
        paymentMethod?.toLowerCase() === 'mpesa' ? '#10b981' :
        paymentMethod?.toLowerCase() === 'cash' ? '#f59e0b' : '#2563eb';

    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Fee Receipt - {receiptNo}</title>
            </head>
            <body style={{ margin: 0, padding: 0, backgroundColor: '#f1f5f9', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#f1f5f9', padding: '32px 16px' }}>
                    <tr>
                        <td align="center">
                            <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: '600px', width: '100%' }}>

                                {/* Header */}
                                <tr>
                                    <td style={{
                                        background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
                                        borderRadius: '20px 20px 0 0',
                                        padding: '36px 40px',
                                        textAlign: 'center',
                                    }}>
                                        <div style={{
                                            width: '64px', height: '64px', borderRadius: '20px',
                                            backgroundColor: 'rgba(255,255,255,0.15)',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '32px', marginBottom: '16px',
                                            border: '2px solid rgba(255,255,255,0.25)',
                                        }}>🏫</div>
                                        <h1 style={{ color: '#ffffff', margin: 0, fontSize: '22px', fontWeight: 900 }}>
                                            {schoolName}
                                        </h1>
                                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: '13px' }}>
                                            Official Fee Receipt
                                        </p>
                                    </td>
                                </tr>

                                {/* Receipt badge */}
                                <tr>
                                    <td style={{ backgroundColor: '#ffffff', padding: '0 40px' }}>
                                        <div style={{
                                            margin: '-18px auto 0',
                                            backgroundColor: '#ecfdf5',
                                            border: '2px solid #6ee7b7',
                                            borderRadius: '14px',
                                            padding: '16px 24px',
                                            textAlign: 'center',
                                            maxWidth: '280px',
                                        }}>
                                            <div style={{ fontSize: '28px', fontWeight: 900, color: '#065f46' }}>
                                                {fmt(amount)}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
                                                ✅ Payment Confirmed
                                            </div>
                                        </div>
                                    </td>
                                </tr>

                                {/* Body */}
                                <tr>
                                    <td style={{ backgroundColor: '#ffffff', padding: '32px 40px' }}>

                                        {/* Greeting */}
                                        <p style={{ color: '#374151', fontSize: '15px', margin: '0 0 24px', lineHeight: '1.6' }}>
                                            Dear <strong>{parentName}</strong>,<br />
                                            We confirm receipt of payment for <strong>{studentName}</strong>. Below are the details:
                                        </p>

                                        {/* Receipt Details */}
                                        <table width="100%" cellPadding={0} cellSpacing={0} style={{
                                            backgroundColor: '#f8fafc', borderRadius: '14px',
                                            border: '1px solid #e2e8f0', marginBottom: '24px',
                                        }}>
                                            {[
                                                { label: 'Receipt No.', value: receiptNo, bold: true },
                                                { label: 'Student Name', value: studentName },
                                                { label: 'Admission No.', value: admissionNo },
                                                { label: 'Class', value: className },
                                                { label: 'Term', value: termName },
                                                { label: 'Payment Date', value: paymentDate },
                                                { label: 'Payment Method', value: paymentMethod?.toUpperCase(), color: methodColor },
                                                ...(mpesaCode ? [{ label: 'M-Pesa Code', value: mpesaCode, bold: true }] : []),
                                            ].map((row, i) => (
                                                <tr key={i} style={{ borderBottom: i < 7 ? '1px solid #e2e8f0' : 'none' }}>
                                                    <td style={{ padding: '12px 20px', fontSize: '13px', color: '#64748b', fontWeight: 600, width: '40%' }}>
                                                        {row.label}
                                                    </td>
                                                    <td style={{ padding: '12px 20px', fontSize: '13px', color: (row as any).color || '#0f172a', fontWeight: (row as any).bold ? 800 : 500 }}>
                                                        {row.value}
                                                    </td>
                                                </tr>
                                            ))}
                                        </table>

                                        {/* Amount & Balance */}
                                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '28px' }}>
                                            <tr>
                                                <td width="48%" style={{
                                                    backgroundColor: '#ecfdf5', borderRadius: '14px',
                                                    padding: '18px', textAlign: 'center',
                                                    border: '1px solid #6ee7b7',
                                                }}>
                                                    <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount Paid</div>
                                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '6px' }}>{fmt(amount)}</div>
                                                </td>
                                                <td width="4%" />
                                                <td width="48%" style={{
                                                    backgroundColor: balance > 0 ? '#fef3c7' : '#ecfdf5',
                                                    borderRadius: '14px', padding: '18px', textAlign: 'center',
                                                    border: `1px solid ${balance > 0 ? '#fcd34d' : '#6ee7b7'}`,
                                                }}>
                                                    <div style={{ fontSize: '11px', color: balance > 0 ? '#92400e' : '#065f46', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {balance > 0 ? 'Balance Due' : 'Fully Paid'}
                                                    </div>
                                                    <div style={{ fontSize: '22px', fontWeight: 900, color: balance > 0 ? '#d97706' : '#059669', marginTop: '6px' }}>
                                                        {balance > 0 ? fmt(balance) : '✅ KES 0'}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                        {/* Balance warning */}
                                        {balance > 0 && (
                                            <div style={{
                                                backgroundColor: '#fef3c7', border: '1px solid #fcd34d',
                                                borderRadius: '12px', padding: '14px 18px', marginBottom: '24px',
                                            }}>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
                                                    ⚠️ Outstanding balance of <strong>{fmt(balance)}</strong> remains. Please clear it before end of term to avoid inconvenience.
                                                </p>
                                            </div>
                                        )}

                                        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 4px', lineHeight: '1.6' }}>
                                            Thank you for your payment. If you have any questions, please contact us:
                                        </p>
                                        {schoolPhone && (
                                            <p style={{ color: '#2563eb', fontSize: '13px', margin: '0', fontWeight: 600 }}>
                                                📞 {schoolPhone}
                                                {schoolEmail && ` · ✉️ ${schoolEmail}`}
                                            </p>
                                        )}
                                    </td>
                                </tr>

                                {/* Footer */}
                                <tr>
                                    <td style={{
                                        backgroundColor: '#f8fafc', borderRadius: '0 0 20px 20px',
                                        padding: '20px 40px', textAlign: 'center',
                                        borderTop: '1px solid #e2e8f0',
                                    }}>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
                                            This is an automated receipt from {schoolName}.<br />
                                            Powered by <strong>APSIMS</strong> — Hawkinsoft Solutions · Kenya's #1 School Management System
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    );
}
