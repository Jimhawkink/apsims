import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { FeeReminderEmail } from '@/emails/FeeReminder';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/email/send-reminder
 * Sends fee reminder emails to parent(s) with outstanding balances
 * Body: { studentId } OR { studentIds: number[] } for bulk sending
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const studentIds: number[] = body.studentIds || (body.studentId ? [body.studentId] : []);

        if (!studentIds.length) {
            return NextResponse.json({ error: 'Provide studentId or studentIds[]' }, { status: 400 });
        }

        // Fetch school settings
        const { data: settingsRows } = await supabase
            .from('school_settings')
            .select('key, value')
            .in('key', ['school_name', 'school_phone', 'school_email', 'mpesa_paybill', 'mpesa_account']);
        const settings = (settingsRows || []).reduce((acc: Record<string, string>, s) => {
            acc[s.key] = s.value; return acc;
        }, {});

        // Get current term
        const { data: term } = await supabase
            .from('school_terms')
            .select('id, term_name')
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        const results: { studentId: number; status: string; email?: string; error?: string }[] = [];

        for (const studentId of studentIds) {
            try {
                // Fetch student
                const { data: student } = await supabase
                    .from('school_students')
                    .select('id, full_name, admission_no, form_id, guardian_name, guardian_email, school_forms(name)')
                    .eq('id', studentId)
                    .single();

                if (!student || !student.guardian_email) {
                    results.push({ studentId, status: 'skipped', error: 'No email on file' });
                    continue;
                }

                // Calculate balance
                const [{ data: payments }, { data: feeStructure }] = await Promise.all([
                    supabase.from('school_fee_payments').select('amount').eq('student_id', studentId),
                    supabase.from('school_fee_structures').select('amount').eq('form_id', student.form_id),
                ]);

                const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
                const totalDue = (feeStructure || []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
                const balance = Math.max(0, totalDue - totalPaid);

                if (balance === 0) {
                    results.push({ studentId, status: 'skipped', error: 'Fully paid' });
                    continue;
                }

                // Calculate due date (end of current month + 2 weeks)
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);
                const dueDateStr = dueDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

                const html = renderToStaticMarkup(
                    React.createElement(FeeReminderEmail, {
                        schoolName: settings.school_name || 'School',
                        parentName: student.guardian_name || 'Parent/Guardian',
                        studentName: student.full_name,
                        admissionNo: student.admission_no || '',
                        className: (student.school_forms as any)?.name || '',
                        termName: term?.term_name || 'Current Term',
                        balance,
                        dueDate: dueDateStr,
                        schoolPhone: settings.school_phone,
                        paybillNo: settings.mpesa_paybill,
                        accountNo: settings.mpesa_account || student.admission_no,
                    })
                );

                const { error } = await resend.emails.send({
                    from: `${settings.school_name || 'School'} <fees@${process.env.RESEND_DOMAIN || 'apsims.vercel.app'}>`,
                    to: [student.guardian_email],
                    subject: `Fee Reminder — ${student.full_name} | Balance: KES ${balance.toLocaleString()}`,
                    html,
                });

                if (error) {
                    results.push({ studentId, status: 'failed', error: error.message });
                } else {
                    results.push({ studentId, status: 'sent', email: student.guardian_email });
                }
            } catch (err: any) {
                results.push({ studentId, status: 'error', error: err.message });
            }
        }

        const sent = results.filter(r => r.status === 'sent').length;
        const failed = results.filter(r => r.status !== 'sent').length;

        return NextResponse.json({ success: true, sent, failed, results });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
