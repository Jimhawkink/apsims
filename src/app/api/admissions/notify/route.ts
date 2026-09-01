export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

async function getSmtpConfig() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.SMTP_FROM_NAME || 'APSIMS Admissions',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb.from('school_details')
      .select('smtp_host,smtp_port,smtp_user,smtp_pass,smtp_from_name,smtp_from_email,smtp_enabled')
      .limit(1).maybeSingle();
    if (data?.smtp_user && data?.smtp_pass && data?.smtp_enabled !== false) {
      return {
        host: data.smtp_host || 'smtp.gmail.com',
        port: Number(data.smtp_port) || 587,
        user: data.smtp_user, pass: data.smtp_pass,
        fromName: data.smtp_from_name || 'APSIMS Admissions',
        fromEmail: data.smtp_from_email || data.smtp_user,
      };
    }
  } catch {}
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  'Approved':     '#15803d',
  'Rejected':     '#b91c1c',
  'Under Review': '#d97706',
  'Waitlisted':   '#7c3aed',
};
const STATUS_BG: Record<string, string> = {
  'Approved':     '#f0fdf4',
  'Rejected':     '#fef2f2',
  'Under Review': '#fefce8',
  'Waitlisted':   '#faf5ff',
};
const STATUS_ICON: Record<string, string> = {
  'Approved':     '✅',
  'Rejected':     '❌',
  'Under Review': '🔍',
  'Waitlisted':   '⏳',
};
const STATUS_MSG: Record<string, string> = {
  'Approved':     'Congratulations! Your application has been <strong>APPROVED</strong>. Please visit the school with original documents to complete the admission process.',
  'Rejected':     'We regret to inform you that your application has been <strong>REJECTED</strong>. Please see the notes below for the reason.',
  'Under Review': 'Your application is currently <strong>UNDER REVIEW</strong> by our admissions team. We will notify you of the outcome soon.',
  'Waitlisted':   'Your application has been <strong>WAITLISTED</strong>. You will be contacted if a place becomes available.',
};

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { to_email, to_name, student_name, reference_number, status, notes, school_name } = body;

  if (!to_email || !status || !reference_number) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const smtp = await getSmtpConfig();
  if (!smtp) {
    return NextResponse.json({ error: 'SMTP not configured. Please set SMTP_USER and SMTP_PASS in Vercel environment variables.' }, { status: 503 });
  }

  const color  = STATUS_COLORS[status] || '#1d4ed8';
  const bg     = STATUS_BG[status] || '#eff6ff';
  const icon   = STATUS_ICON[status] || '📋';
  const msg    = STATUS_MSG[status] || `Your application status has been updated to <strong>${status}</strong>.`;
  const sName  = school_name || 'APSIMS School';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Application Update — ${sName}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;">
  <div style="max-width:580px;margin:32px auto;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f766e,#0891b2);padding:32px 32px 24px;text-align:center;">
      <div style="width:60px;height:60px;background:rgba(255,255,255,0.15);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;">${icon}</div>
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.02em;">${sName}</h1>
      <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;">Online Admissions — Application Update</p>
    </div>

    <!-- Status Banner -->
    <div style="background:${bg};border-left:4px solid ${color};padding:20px 28px;margin:0;">
      <p style="margin:0;font-size:18px;font-weight:800;color:${color};">${icon} Application ${status}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#374151;line-height:1.6;">${msg}</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:28px 32px;">
      <p style="color:#374151;font-size:14px;margin:0 0 20px;">Dear <strong>${to_name || 'Guardian'}</strong>,</p>
      <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.6;">
        We are writing to inform you about the status of the admission application for <strong>${student_name}</strong>.
      </p>

      <!-- Reference Card -->
      <div style="background:linear-gradient(135deg,#f0fdf4,#ecfeff);border:2px solid #99f6e4;border-radius:14px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#0d9488;letter-spacing:0.1em;text-transform:uppercase;">Reference Number</p>
        <p style="margin:0;font-size:24px;font-weight:900;color:#0f766e;letter-spacing:0.05em;font-family:monospace;">${reference_number}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">Keep this safe for tracking your application</p>
      </div>

      <!-- Details Grid -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;width:40%;">Student Name</td>
          <td style="padding:10px 0;font-size:13px;font-weight:600;color:#111827;">${student_name}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;">Status</td>
          <td style="padding:10px 0;">
            <span style="background:${bg};color:${color};border:1px solid ${color}40;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;">${icon} ${status}</span>
          </td>
        </tr>
        ${notes ? `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 0;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;vertical-align:top;">Notes</td>
          <td style="padding:10px 0;font-size:13px;color:#374151;line-height:1.6;">${notes}</td>
        </tr>` : ''}
      </table>

      ${status === 'Approved' ? `
      <!-- Next Steps -->
      <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;">📋 Next Steps</p>
        <div style="font-size:13px;color:#166534;line-height:1.8;">
          <p style="margin:4px 0;">1. Visit the school office to complete enrollment</p>
          <p style="margin:4px 0;">2. Bring <strong>original documents</strong>: Birth Certificate, KCPE Certificate, Transfer Letter</p>
          <p style="margin:4px 0;">3. Bring <strong>4 passport-size photos</strong></p>
          <p style="margin:4px 0;">4. Pay the required school fees as advised</p>
        </div>
      </div>` : ''}

      <!-- Track Button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://apsims.vercel.app/admissions/status" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0891b2);color:#fff;font-weight:800;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          📍 Track Application Status
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #f1f5f9;padding-top:16px;margin:0;">
        If you have questions, contact the school admissions office.<br/>
        Please do not reply to this email directly.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} ${sName} · Powered by APSIMS</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: to_email,
      subject: `${icon} Application ${status} — ${sName} (Ref: ${reference_number})`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[NOTIFY] Email error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
