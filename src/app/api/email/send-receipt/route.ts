import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FeeReceiptEmail } from '@/emails/FeeReceipt';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/email/send-receipt
 * Sends a beautiful HTML fee receipt to parent email
 * Body: { paymentId } OR full payment details object
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        let emailData = body;

        // If paymentId given, fetch from Supabase
        if (body.paymentId) {
            const { data: payment, error } = await supabase
                .from('school_fee_payments')
                .select(`
                    id, amount, payment_method, payment_date, receipt_no, mpesa_code,
                    student_id, student_name,
                    school_students!inner(
                        id, full_name, admission_no, form_id,
                        guardian_name, guardian_email, guardian_phone,
                        school_forms(name)
                    )
                `)
                .eq('id', body.paymentId)
                .single();

            if (error || !payment) {
                return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
            }

            const student = (payment as any).school_students;
            const parentEmail = student?.guardian_email || body.email;

            if (!parentEmail) {
                return NextResponse.json({ error: 'No parent email on file' }, { status: 400 });
            }

            // Fetch school settings
            const { data: settings } = await supabase
                .from('school_settings')
                .select('key, value')
                .in('key', ['school_name', 'school_phone', 'school_email']);

            const settingsMap = (settings || []).reduce((acc: Record<string, string>, s) => {
                acc[s.key] = s.value;
                return acc;
            }, {});

            // Fetch current term
            const { data: term } = await supabase
                .from('school_terms')
                .select('term_name')
                .lte('start_date', new Date().toISOString())
                .gte('end_date', new Date().toISOString())
                .single();

            // Calculate balance
            const { data: allPayments } = await supabase
                .from('school_fee_payments')
                .select('amount')
                .eq('student_id', payment.student_id);

            const { data: feeStructure } = await supabase
                .from('school_fee_structures')
                .select('amount')
                .eq('form_id', student?.form_id);

            const totalPaid = (allPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
            const totalDue = (feeStructure || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
            const balance = Math.max(0, totalDue - totalPaid);

            emailData = {
                to: parentEmail,
                schoolName: settingsMap.school_name || 'School',
                parentName: student?.guardian_name || 'Parent/Guardian',
                studentName: student?.full_name || payment.student_name,
                admissionNo: student?.admission_no || '',
                className: (student?.school_forms as any)?.name || '',
                amount: Number(payment.amount),
                paymentMethod: payment.payment_method,
                receiptNo: payment.receipt_no || `RCP-${payment.id}`,
                paymentDate: new Date(payment.payment_date).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric'
                }),
                mpesaCode: payment.mpesa_code,
                termName: term?.term_name || 'Current Term',
                balance,
                schoolPhone: settingsMap.school_phone,
                schoolEmail: settingsMap.school_email,
            };
        }

        // Validate required fields
        const { to, studentName, amount, receiptNo } = emailData;
        if (!to || !studentName || !amount || !receiptNo) {
            return NextResponse.json({ error: 'Missing required fields: to, studentName, amount, receiptNo' }, { status: 400 });
        }

        // Render email HTML
        const html = renderToStaticMarkup(
            React.createElement(FeeReceiptEmail, emailData)
        );

        // Send via Resend
        const { data, error } = await resend.emails.send({
            from: `${emailData.schoolName || 'APSIMS School'} <receipts@${process.env.RESEND_DOMAIN || 'apsims.vercel.app'}>`,
            to: [to],
            subject: `Fee Receipt ${receiptNo} — ${studentName}`,
            html,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log email send to audit
        await supabase.from('school_audit_log').insert([{
            action: 'email_receipt_sent',
            details: { to, receiptNo, studentName, amount },
            created_at: new Date().toISOString(),
        }]);

        return NextResponse.json({ success: true, emailId: data?.id });
    } catch (err: any) {
        console.error('Email send error:', err);
        return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
    }
}
