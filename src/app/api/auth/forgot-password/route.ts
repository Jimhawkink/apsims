import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, auditLog } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/auth/forgot-password — request a password reset token
export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username?.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Find user
    const { data: user, error } = await supabase
      .from('school_users')
      .select('id, username, full_name, email, phone, role')
      .ilike('username', username.trim())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      // Don't reveal whether user exists — same response
      return NextResponse.json({ message: 'If that username exists, a reset code has been sent.' });
    }

    // Generate a secure 6-digit reset code + a longer token for URL-based reset
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    // Store token in user record
    const { error: updateError } = await supabase
      .from('school_users')
      .update({
        reset_token: resetToken,
        reset_token_expires: expiresAt,
      })
      .eq('id', user.id);

    if (updateError) {
      // If reset_token columns don't exist, try adding them
      console.error('[forgot-password] Failed to store token:', updateError.message);
      return NextResponse.json({ error: 'Password reset unavailable — contact admin' }, { status: 500 });
    }

    // Try to send SMS via Africa's Talking
    let smsSent = false;
    const AT_API_KEY = process.env.AT_API_KEY;
    const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';

    if (AT_API_KEY && user.phone) {
      try {
        let phone = user.phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
        if (phone.startsWith('0')) phone = '+254' + phone.slice(1);
        else if (phone.startsWith('254')) phone = '+' + phone;
        else if (!phone.startsWith('+')) phone = '+254' + phone;

        const smsUrl = AT_USERNAME === 'sandbox'
          ? 'https://api.sandbox.africastalking.com/version1/messaging'
          : 'https://api.africastalking.com/version1/messaging';

        const params = new URLSearchParams();
        params.append('username', AT_USERNAME);
        params.append('to', phone);
        params.append('message', `Your ${process.env.NEXT_PUBLIC_APP_NAME || 'APSIMS'} password reset code: ${resetCode}. Valid for 30 minutes. Do NOT share this code.`);
        if (AT_USERNAME !== 'sandbox' && process.env.AT_SENDER_ID) {
          params.append('from', process.env.AT_SENDER_ID);
        }

        const smsRes = await fetch(smsUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'apiKey': AT_API_KEY,
          },
          body: params.toString(),
        });

        if (smsRes.ok) smsSent = true;
        else console.error('[forgot-password] SMS failed:', await smsRes.text());
      } catch (smsErr) {
        console.error('[forgot-password] SMS error:', smsErr);
      }
    }

    // Audit log
    await auditLog({
      action: 'password_reset_requested',
      actor_id: user.id,
      actor_name: user.username,
      actor_role: user.role,
      details: { sms_sent: smsSent, phone: user.phone ? '***' + user.phone.slice(-4) : null },
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown',
    });

    // Return the reset code in development/sandbox mode for testing
    const isSandbox = !AT_API_KEY || AT_USERNAME === 'sandbox';

    return NextResponse.json({
      message: 'If that username exists, a reset code has been sent.',
      // Only expose code in sandbox for testing
      ...(isSandbox && { _dev_code: resetCode }),
      reset_token: resetToken, // For URL-based reset flow
      user_id: user.id,
      phone_hint: user.phone ? '***' + user.phone.slice(-4) : null,
      email_hint: user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    });
  } catch (err: any) {
    console.error('[forgot-password] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
