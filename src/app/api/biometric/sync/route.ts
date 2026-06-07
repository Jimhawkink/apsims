export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { determineAttendanceStatus } from '@/lib/biometric-types';

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (!['admin', 'principal'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const startTime = Date.now();
  let processed = 0, created = 0, updated = 0, skipped = 0, errors = 0;

  // Fetch all unsynced logs
  const { data: logs, error: logsError } = await supabase
    .from('school_biometric_logs')
    .select('*')
    .eq('synced_to_attendance', false)
    .order('punch_time', { ascending: true });

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });
  if (!logs || logs.length === 0) {
    return NextResponse.json({ processed: 0, created: 0, updated: 0, skipped: 0, errors: 0, duration_ms: Date.now() - startTime });
  }

  for (const log of logs) {
    processed++;
    try {
      if (!log.device_user_id) { skipped++; continue; }

      // Look up student via device_user_id in active enrollments
      const { data: enrollment } = await supabase
        .from('school_biometric_enrollments')
        .select('student_id')
        .eq('device_user_id', log.device_user_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!enrollment) {
        // Unmatched — note in raw_data, do not create attendance
        await supabase
          .from('school_biometric_logs')
          .update({ raw_data: { ...(log.raw_data || {}), note: 'unmatched_enrollment' } })
          .eq('id', log.id);
        skipped++;
        continue;
      }

      const attendanceDate = log.punch_time.split('T')[0];
      const status = determineAttendanceStatus(log.punch_time);

      // Upsert attendance record
      const { data: attendance, error: attError } = await supabase
        .from('school_daily_attendance')
        .upsert(
          [{
            student_id: enrollment.student_id,
            attendance_date: attendanceDate,
            status,
            marked_by: 'biometric',
          }],
          { onConflict: 'student_id,attendance_date' }
        )
        .select('id')
        .single();

      if (attError) { errors++; continue; }

      // Mark log as synced
      await supabase
        .from('school_biometric_logs')
        .update({
          synced_to_attendance: true,
          attendance_record_id: attendance.id,
          student_id: enrollment.student_id,
        })
        .eq('id', log.id);

      created++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    processed,
    created,
    updated,
    skipped,
    errors,
    duration_ms: Date.now() - startTime,
  });
}
