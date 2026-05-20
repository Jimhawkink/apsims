import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('school_biometric_devices')
    .select('*')
    .neq('status', 'Disabled')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  if (!body.device_name) return NextResponse.json({ error: 'device_name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('school_biometric_devices')
    .insert([{ ...body, updated_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ device: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { id, ...updates } = body;
  const { data, error } = await supabase
    .from('school_biometric_devices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ device: data });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('school_biometric_devices')
    .update({ status: 'Disabled', updated_at: new Date().toISOString() })
    .eq('id', body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
