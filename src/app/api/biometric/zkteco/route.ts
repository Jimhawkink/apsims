/**
 * ZKTeco ADMS Push Receiver
 * Configure your ZKTeco device with:
 *   Server URL: https://apsims.vercel.app/api/biometric/zkteco
 *   Port: 443
 *
 * This endpoint handles:
 *  - GET  /iclock/cdata       → heartbeat / device handshake
 *  - POST /iclock/cdata       → attendance log push
 *  - GET  /iclock/getrequest  → command polling
 *  - POST /iclock/devicecmd   → device command response
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Parse ZKTeco ATTLOG line ──────────────────────────────────────────────────
// Format: PIN\tDate\tTime\tStatus\tVerify\tWorkCode\tReserved
function parseAttLog(line: string) {
  const parts = line.trim().split('\t');
  if (parts.length < 3) return null;
  const [pin, date, time, status = '0', verify = '0'] = parts;
  if (!pin || !date || !time) return null;
  const punchTime = new Date(`${date}T${time}`);
  if (isNaN(punchTime.getTime())) return null;
  return {
    pin: pin.trim(),
    punchTime: punchTime.toISOString(),
    punchDate: date,
    punchTimeStr: time,
    status: parseInt(status, 10),       // 0=in, 1=out, 4=OT-in, 5=OT-out
    verifyType: parseInt(verify, 10),   // 0=pw, 1=fingerprint, 4=face
  };
}

// ── Verify type label ─────────────────────────────────────────────────────────
function verifyLabel(v: number) {
  if (v === 1) return 'Fingerprint';
  if (v === 4) return 'Face';
  if (v === 15) return 'Face+Fingerprint';
  if (v === 2) return 'Card/RFID';
  return 'PIN';
}

// ── Match PIN to student/staff and mark attendance ────────────────────────────
async function processPin(supabase: any, log: NonNullable<ReturnType<typeof parseAttLog>>, deviceSn: string) {
  const { pin, punchTime, punchDate, status, verifyType } = log;

  // 1. Save raw biometric log always
  await supabase.from('school_biometric_logs').insert({
    device_sn: deviceSn,
    pin,
    punch_time: punchTime,
    status,
    verify_type: verifyType,
    verify_label: verifyLabel(verifyType),
    punch_direction: status === 0 || status === 4 ? 'IN' : 'OUT',
  });

  // 2. Try match as student (admission_no)
  const { data: student } = await supabase
    .from('school_students')
    .select('id, first_name, last_name, form_id, stream_id, admission_no, admission_number')
    .or(`admission_no.eq.${pin},admission_number.eq.${pin}`)
    .maybeSingle();

  if (student) {
    // Determine session from punch time
    const hour = new Date(punchTime).getHours();
    const session = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    const attendStatus = status === 0 ? 'Present' : 'Present'; // Always Present when scan detected

    // Check if already has an attendance record today
    const { data: existing } = await supabase
      .from('school_attendance')
      .select('id, status')
      .eq('student_id', student.id)
      .eq('attendance_date', punchDate)
      .eq('session', session)
      .maybeSingle();

    if (existing) {
      await supabase.from('school_attendance')
        .update({ status: attendStatus, notes: `Biometric (${verifyLabel(verifyType)}) — ZKTeco ${deviceSn}` })
        .eq('id', existing.id);
    } else {
      await supabase.from('school_attendance').insert({
        student_id: student.id,
        attendance_date: punchDate,
        session,
        status: attendStatus,
        form_id: student.form_id,
        stream_id: student.stream_id,
        notes: `Biometric (${verifyLabel(verifyType)}) — ZKTeco ${deviceSn}`,
      });
    }

    // Update biometric log with match
    await supabase.from('school_biometric_logs')
      .update({ matched_type: 'student', matched_id: student.id, matched_name: `${student.first_name} ${student.last_name}`, processed: true })
      .eq('pin', pin).eq('punch_time', punchTime);

    return { matched: true, type: 'student', name: `${student.first_name} ${student.last_name}` };
  }

  // 3. Try match as staff (staff_no) — check all staff tables
  const [tRes, supRes, subRes] = await Promise.all([
    supabase.from('school_teachers').select('id, first_name, last_name, staff_no').eq('staff_no', pin).maybeSingle(),
    supabase.from('school_support_teachers').select('id, first_name, last_name, staff_no').eq('staff_no', pin).maybeSingle(),
    supabase.from('school_subordinate_staff').select('id, first_name, last_name, staff_no').eq('staff_no', pin).maybeSingle(),
  ]);

  const staff = tRes.data || supRes.data || subRes.data;
  const staffType = tRes.data ? 'teacher' : supRes.data ? 'support' : subRes.data ? 'subordinate' : null;

  if (staff && staffType) {
    const timeStr = new Date(punchTime).toTimeString().slice(0, 5); // HH:MM
    const { data: existing } = await supabase
      .from('school_staff_attendance')
      .select('id')
      .eq('staff_type', staffType).eq('staff_id', staff.id).eq('attendance_date', punchDate)
      .maybeSingle();

    const payload = {
      staff_type: staffType, staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      attendance_date: punchDate, status: 'Present',
      time_in: status === 0 ? timeStr : undefined,
      time_out: status === 1 ? timeStr : undefined,
      notes: `Biometric (${verifyLabel(verifyType)}) — ZKTeco ${deviceSn}`,
    };

    if (existing) {
      await supabase.from('school_staff_attendance').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('school_staff_attendance').insert([payload]);
    }

    await supabase.from('school_biometric_logs')
      .update({ matched_type: 'staff', matched_id: staff.id, matched_name: `${staff.first_name} ${staff.last_name}`, processed: true })
      .eq('pin', pin).eq('punch_time', punchTime);

    return { matched: true, type: 'staff', name: `${staff.first_name} ${staff.last_name}` };
  }

  return { matched: false };
}

// ── GET — Heartbeat & device handshake ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sn = url.searchParams.get('SN') || 'UNKNOWN';

  // Log heartbeat
  const supabase = svc();
  await supabase.from('school_biometric_logs').insert({
    device_sn: sn, pin: '__HEARTBEAT__', punch_time: new Date().toISOString(),
    status: -1, verify_type: -1, verify_label: 'Heartbeat', punch_direction: 'PING',
  }).select();

  // ZKTeco ADMS handshake response
  return new NextResponse(`GET OPTION FROM: ${sn}\nATTLOGStamp=9999\nOPERLOGStamp=9999\nATTPHOTOStamp=9999\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=TransData AttLog OpLog\nTimeZone=3\nRealtime=1\nEncrypt=None\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-cache' },
  });
}

// ── POST — Attendance log push ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const sn = url.searchParams.get('SN') || 'UNKNOWN';
  const table = url.searchParams.get('table') || '';
  const body = await req.text();
  const supabase = svc();

  if (table === 'ATTLOG') {
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    let processed = 0;
    for (const line of lines) {
      const log = parseAttLog(line);
      if (!log) continue;
      await processPin(supabase, log, sn);
      processed++;
    }
    return new NextResponse(`OK: ${processed}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  return new NextResponse('OK: 0', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
