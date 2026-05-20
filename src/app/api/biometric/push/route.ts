import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ZKTeco / Hikvision / Suprema push mode endpoint
// Authenticated via X-API-Key header — no session required
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');

  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  // Validate API key against active devices
  const { data: device, error: deviceError } = await supabase
    .from('school_biometric_devices')
    .select('id, device_name, status')
    .eq('api_key', apiKey)
    .eq('status', 'Active')
    .maybeSingle();

  if (deviceError || !device) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { device_user_id, punch_time, punch_type, verify_method, temperature, photo_url } = body as Record<string, string | number | null>;

  if (!device_user_id || !punch_time) {
    return NextResponse.json({ error: 'device_user_id and punch_time are required' }, { status: 400 });
  }

  // Insert punch log
  const { data: log, error: logError } = await supabase
    .from('school_biometric_logs')
    .insert([{
      device_id: device.id,
      device_user_id: String(device_user_id),
      punch_time: String(punch_time),
      punch_type: punch_type || 'check_in',
      verify_method: verify_method || 'fingerprint',
      temperature: temperature ?? null,
      photo_url: photo_url ?? null,
      raw_data: body,
      synced_to_attendance: false,
    }])
    .select('id')
    .single();

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  // Update device last_heartbeat_at
  await supabase
    .from('school_biometric_devices')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', device.id);

  return NextResponse.json({ success: true, log_id: log.id }, { status: 201 });
}
