export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, auditLog } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/auth/reset-password — validate token and set new password
export async function POST(req: NextRequest) {
  try {
    const { reset_token, new_password, user_id } = await req.json();

    if (!reset_token || !new_password || !user_id) {
      return NextResponse.json({ error: 'Reset token, user ID, and new password are required' }, { status: 400 });
    }

    // Password strength check
    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Find user by id and token
    const { data: user, error } = await supabase
      .from('school_users')
      .select('id, username, full_name, role, reset_token, reset_token_expires')
      .eq('id', user_id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid reset request' }, { status: 400 });
    }

    // Validate token
    if (user.reset_token !== reset_token) {
      await auditLog({
        action: 'password_reset_failed',
        actor_id: user.id,
        actor_name: user.username,
        actor_role: user.role,
        details: { reason: 'invalid_token' },
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown',
      });
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Check expiry
    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash new password with bcrypt
    const hashedPassword = await hashPassword(new_password);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('school_users')
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[reset-password] Failed to update password:', updateError.message);
      return NextResponse.json({ error: 'Failed to reset password. Please try again.' }, { status: 500 });
    }

    // Audit log
    await auditLog({
      action: 'password_reset_success',
      actor_id: user.id,
      actor_name: user.username,
      actor_role: user.role,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err: any) {
    console.error('[reset-password] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
