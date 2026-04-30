import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword, isBcryptHash } from '@/lib/auth';

function getServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET: Fetch portal users ───
export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_portal_users')
    .select('*, school_students(id, first_name, last_name, admission_number), school_teachers(id, first_name, last_name, tsc_number)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Strip password_hash from response
  const safe = (data || []).map((u: any) => { const { password_hash, ...rest } = u; return rest; });
  return NextResponse.json({ data: safe });
}

// ─── POST: Create portal user ───
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { user_type, linked_student_id, linked_teacher_id, username, full_name, email, phone, is_active, password } = body;
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }
  if (user_type !== 'teacher' && !linked_student_id) {
    return NextResponse.json({ error: 'Linked student is required for parent/student users' }, { status: 400 });
  }

  // Hash password with bcrypt
  const password_hash = await hashPassword(password.trim());

  const supabase = getServiceClient();
  const insertData: any = {
    user_type,
    linked_student_id: linked_student_id || null,
    linked_teacher_id: linked_teacher_id || null,
    username: username.trim(),
    full_name: full_name?.trim() || null,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    is_active: is_active !== false,
    password_hash,
  };

  const { data, error } = await supabase.from('school_portal_users').insert([insertData]).select().single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { password_hash: _, ...safe } = data;
  return NextResponse.json({ data: safe }, { status: 201 });
}

// ─── PUT: Update portal user ───
export async function PUT(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { id, user_type, linked_student_id, linked_teacher_id, username, full_name, email, phone, is_active, password } = body;
  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  const updateData: any = {
    user_type,
    linked_student_id: linked_student_id || null,
    linked_teacher_id: linked_teacher_id || null,
    username: username?.trim(),
    full_name: full_name?.trim() || null,
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    is_active: is_active !== false,
  };

  // Only hash & update password if a new one is provided
  if (password?.trim()) {
    updateData.password_hash = await hashPassword(password.trim());
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.from('school_portal_users').update(updateData).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { password_hash: _, ...safe } = data;
  return NextResponse.json({ data: safe });
}

// ─── DELETE: Remove portal user ───
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

  const supabase = getServiceClient();
  const { error } = await supabase.from('school_portal_users').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
