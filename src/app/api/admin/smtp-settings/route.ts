export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET — read current SMTP settings (password masked)
export async function GET() {
  const sb = svc();
  const { data } = await sb.from('school_details')
    .select('smtp_host, smtp_port, smtp_user, smtp_from_name, smtp_from_email, smtp_enabled')
    .limit(1).single();
  return NextResponse.json({ data: data || {} });
}

// POST — save SMTP settings
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, smtp_enabled } = body;

  if (!smtp_user || !smtp_pass) {
    return NextResponse.json({ error: 'Email (Gmail) and App Password are required' }, { status: 400 });
  }

  const sb = svc();

  // Upsert to school_details
  const payload: any = {
    smtp_host: smtp_host || 'smtp.gmail.com',
    smtp_port: Number(smtp_port) || 587,
    smtp_user: smtp_user.trim(),
    smtp_from_name: smtp_from_name || 'APSIMS Admissions',
    smtp_from_email: smtp_from_email || smtp_user.trim(),
    smtp_enabled: smtp_enabled !== false,
    updated_at: new Date().toISOString(),
  };

  // Only update password if provided (non-empty)
  if (smtp_pass && smtp_pass.trim()) {
    payload.smtp_pass = smtp_pass.trim();
  }

  // Check if school_details row exists
  const { data: existing } = await sb.from('school_details').select('id').limit(1).single();

  let error;
  if (existing?.id) {
    ({ error } = await sb.from('school_details').update(payload).eq('id', existing.id));
  } else {
    ({ error } = await sb.from('school_details').insert([payload]));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PUT — test SMTP by sending a test email
export async function PUT(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, test_to } = body;

  if (!smtp_user || !smtp_pass || !test_to) {
    return NextResponse.json({ error: 'Missing SMTP credentials or test recipient email' }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host || 'smtp.gmail.com',
      port: Number(smtp_port) || 587,
      secure: Number(smtp_port) === 465,
      auth: { user: smtp_user, pass: smtp_pass },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"${smtp_from_name || 'APSIMS'}" <${smtp_user}>`,
      to: test_to,
      subject: '✅ APSIMS SMTP Test — Working!',
      html: `
        <div style="max-width:400px;margin:40px auto;background:#fff;border-radius:16px;
          overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);font-family:Arial,sans-serif;">
          <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:24px;text-align:center;">
            <p style="margin:0;font-size:32px;">✅</p>
            <h2 style="margin:8px 0 0;color:#fff;font-size:18px;">SMTP Test Successful!</h2>
          </div>
          <div style="padding:24px;">
            <p style="color:#374151;font-size:14px;line-height:1.7;">
              Your Gmail SMTP is correctly configured in APSIMS.<br><br>
              <strong>Server:</strong> ${smtp_host || 'smtp.gmail.com'}:${smtp_port || 587}<br>
              <strong>From:</strong> ${smtp_user}<br><br>
              OTP verification emails will now be delivered reliably to applicants. ✉️
            </p>
          </div>
          <div style="background:#f0fdf4;padding:12px 24px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:11px;color:#6b7280;">APSIMS School Management System</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: `Test email sent to ${test_to}` });
  } catch (err: any) {
    return NextResponse.json({ error: `SMTP test failed: ${err?.message || err}` }, { status: 500 });
  }
}
